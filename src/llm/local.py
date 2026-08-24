"""Implementación local (sin API) de la capa de IA.

Embeddings con `sentence-transformers` (modelo multilingüe) y extracción de
propuestas heurística basada en patrones léxicos del español.
"""

from __future__ import annotations

import re

import numpy as np

from ..config import III
from ..utils import logger, normalize_text, strip_accents, garbage_ratio, proposal_key
from .base import Embedder, ProposalExtractor


class LocalEmbedder(Embedder):
    """Embeddings locales con sentence-transformers.

    El modelo por defecto (`paraphrase-multilingual-MiniLM-L12-v2`) es ligero y
    funciona bien en español. Los vectores se devuelven normalizados (L2=1) para
    que la similitud coseno sea un simple producto escalar.
    """

    _model = None  # caché a nivel de clase: solo se carga el modelo una vez
    _loaded_name: str | None = None

    def __init__(self, model: str):
        self.model_name = model

    def _ensure_loaded(self) -> None:
        if LocalEmbedder._model is None or LocalEmbedder._loaded_name != self.model_name:
            from sentence_transformers import SentenceTransformer

            logger.info("Cargando modelo de embeddings local: %s", self.model_name)
            LocalEmbedder._model = SentenceTransformer(self.model_name)
            LocalEmbedder._loaded_name = self.model_name
            self.dim = int(self._embedding_dim(LocalEmbedder._model))
        else:
            self.dim = int(self._embedding_dim(LocalEmbedder._model))

    @staticmethod
    def _embedding_dim(model) -> int:
        """Obtiene la dimensión del modelo, compatible con versiones nuevas y viejas."""
        for method_name in ("get_embedding_dimension", "get_sentence_embedding_dimension"):
            method = getattr(model, method_name, None)
            if callable(method):
                try:
                    return int(method())
                except Exception:  # noqa: BLE001
                    continue
        # Último recurso: inferir desde un embedding de prueba.
        return int(model.encode(["probe"], show_progress_bar=False).shape[1])

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim or 384), dtype=np.float32)
        self._ensure_loaded()
        vecs = LocalEmbedder._model.encode(
            texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).astype(np.float32)
        return vecs


# ────────────────────────────────────────────────────────────
#  Extracción heurística de propuestas
# ────────────────────────────────────────────────────────────

# Encabezados de sección que típicamente contienen propuestas/recomendaciones.
_SECTION_HEADERS = [
    "propuestas", "recomendaciones", "propuesta", "recomendacion",
    "conclusiones y recomendaciones", "conclusiones", "lineamientos",
    "sugerencias", "lineas de accion", "acciones",
]

# Marcadores léxicos que introducen una propuesta.
_PROPOSAL_MARKERS = [
    r"\bse\s+(?:deber[ií]a|recomienda|sugiere|propone)\b",
    r"\b(?:deber[ií]amos|recomendamos|sugerimos|proponemos)\b",
    r"\b(?:debe|deben|hay\s+que|es\s+necesario|es\s+preciso)\b",
    r"\b(?:se\s+requiere|urge|resulta\s+indispensable)\b",
    r"\bes\s+imperativo\b",
]
_MARKER_RE = re.compile("|".join(_PROPOSAL_MARKERS), re.IGNORECASE)

# Verbos de acción política: una viñeta fuera de sección de propuestas solo
# cuenta como candidata si además sugiere una acción (filtra índices, tablas
# de contenido y enumeraciones descriptivas).
_ACTION_VERBS = (
    "crear|establecer|fortalecer|mejorar|eliminar|reducir|aumentar|ampliar|"
    "impulsar|promover|fomentar|incentivar|estimular|priorizar|regular|"
    "reformar|modernizar|simplificar|agilizar|financiar|invertir|capacitar|"
    "difundir|coordinar|integrar|implementar|adoptar|permitir|facilitar|"
    "garantizar|asegurar|prohibir|obligar|exigir|estandarizar|digitalizar|"
    "formalizar|incorporar|desarrollar|diseñar|ejecutar|evaluar|monitorear"
)
_ACTION_RE = re.compile(rf"\b(?:{_ACTION_VERBS})\w*\b", re.IGNORECASE)

# Bullet inicial: número, viñeta o guión.
_BULLET_RE = re.compile(r"^\s*(?:[\u2022\-*]|\d+[.)]|\(?[ivxlcdm]+\)?)\s+", re.IGNORECASE)

# Patrones que ANULAN una candidata aunque matchee un marcador: usos causales
# o epistémicos de "deber" (validados con muestreo manual del corpus: ~53% del
# ruido venía de aquí), preguntas retóricas, fórmulas y meta-afirmaciones.
_VETO_RE = re.compile(
    r"\b(?:se\s+)?debe[a-z]*\s+(?:a|al)\b"                                   # "debe a/al", "se debe a/al" (causal)
    r"|\bdebe[a-z]*\s+(?:tenerse|verse|interpretarse|notar(?:se)?|aclarar(?:se)?|anotar(?:se)?|subrayar(?:se)?)\b"  # epistémicos
    r"|\b(?:documento|estudio|informe|cap[ií]tulo|secci[oó]n)\s+se\s+propone\b"  # meta del autor
    r"|\bque\s+se\s+propone\s+(?:utilizar|usar|analizar|estimar|modelar|calibrar)\b"  # metodológico
    r"|\breproducir\s+total\s+o\s+parcialmente\b|\bderechos\s+reservados\b",          # avisos de copyright
    re.IGNORECASE,
)
_FORMULA_RE = re.compile(r"Log\(|=\s*[0-9αβ]|\b\d+\.\d+\.\d+\b")

# Corta tras puntuación seguida de espacio, antes de CUALQUIER carácter no
# blanco. Exigir mayúscula inicial (versión anterior) fusionaba los ítems
# numerados ("… fin de idea. 2. Siguiente …") en mega-oraciones que luego el
# filtro de longitud descartaba.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?;:])\s+(?=\S)")

# Proporción máxima de caracteres raros para aceptar una oración como
# propuesta (texto corrupto por mapeos de fuente dañados).
_MAX_GARBAGE = 0.03


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if len(s.strip()) >= 2]


def _looks_like_proposal(sentence: str) -> bool:
    stripped = sentence.strip()
    if len(stripped) < III.propuesta_min_chars:
        return False
    if garbage_ratio(stripped) > _MAX_GARBAGE:
        return False
    if stripped.endswith("?"):
        return False  # pregunta retórica, no directiva
    if _FORMULA_RE.search(stripped):
        return False  # fórmula/fragmento de ecuación
    if _VETO_RE.search(stripped):
        return False
    if _MARKER_RE.search(stripped):
        return True
    if _BULLET_RE.match(stripped):
        return True
    return False


class HeuristicProposalExtractor(ProposalExtractor):
    """Extrae propuestas combinando detección de secciones + marcadores léxicos.

    Estrategia:
      1. Localiza bloques bajo encabezados de "Propuestas/Recomendaciones/..."
         y eleva la prioridad de las oraciones contenidas.
      2. Recorre el texto completo y marca como candidatas las oraciones que
         cumplan `_looks_like_proposal` (con filtro de texto corrupto). Las
         viñetas fuera de sección requieren además un verbo de acción.
      3. Deduplica por texto normalizado (exacto + prefijo) y recorta a
         `max_proposals` según la prioridad acumulada, aplicando los límites
         de longitud ANTES del recorte para no gastar cupo en candidatas
         que luego se descartarían.
    """

    #: Ventana (chars) tras un encabezado que se considera sección de propuestas.
    SECTION_WINDOW = 2000

    def extract(self, text: str, max_proposals: int = 40) -> list[str]:
        text = normalize_text(text)
        if not text:
            return []

        # 1) Detectar regiones de alta prioridad (secciones).
        lower = strip_accents(text).lower()
        priority_spans: list[tuple[int, int]] = []
        for header in _SECTION_HEADERS:
            h = strip_accents(header).lower()
            start = 0
            while True:
                idx = lower.find(h, start)
                if idx == -1:
                    break
                priority_spans.append((idx, idx + len(h) + self.SECTION_WINDOW))
                start = idx + len(h)

        def in_priority(pos: int) -> bool:
            return any(a <= pos < b for a, b in priority_spans)

        # 2) Recolectar candidatas con su puntuación de prioridad.
        lo, hi = III.propuesta_min_chars, III.propuesta_max_chars
        candidates: list[tuple[int, str]] = []  # (score, sentence)
        cursor = 0  # posición de búsqueda monótona (evita falsas primeras ocurrencias)
        for sentence in _split_sentences(text):
            pos = text.find(sentence, cursor)
            if pos >= 0:
                cursor = pos + len(sentence)
            if not (lo <= len(sentence) <= hi):
                continue
            if not _looks_like_proposal(sentence):
                continue
            if in_priority(pos):
                score = 2
            elif _MARKER_RE.search(sentence):
                score = 2  # marcador léxico explícito: tan bueno como estar en sección
            elif _BULLET_RE.match(sentence) and _ACTION_RE.search(sentence):
                score = 1  # viñeta con verbo de acción fuera de sección
            else:
                continue  # viñeta sin acción (índice/tabla) o ruido
            candidates.append((score, sentence))

        # 3) Deduplicar por texto normalizado y recortar.
        seen_keys: set[str] = set()
        unique: list[tuple[int, str]] = []
        for score, sentence in sorted(candidates, key=lambda x: -x[0]):
            key = proposal_key(sentence)
            if not key or key in seen_keys:
                continue
            # Prefijo normalizado compartido ⇒ casi-duplicado (misma apertura genérica).
            if any(key[:60] in k for k in seen_keys) or any(
                k[:60] in key for k in seen_keys
            ):
                continue
            seen_keys.add(key)
            unique.append((score, sentence))
            if len(unique) >= max_proposals:
                break

        logger.info("Propuestas extraídas (heurística): %d", len(unique))
        return [s for _, s in unique]
