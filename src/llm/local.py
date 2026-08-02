"""Implementación local (sin API) de la capa de IA.

Embeddings con `sentence-transformers` (modelo multilingüe) y extracción de
propuestas heurística basada en patrones léxicos del español.
"""

from __future__ import annotations

import re

import numpy as np

from ..utils import logger, normalize_text, strip_accents
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

# Bullet inicial: número, viñeta o guión.
_BULLET_RE = re.compile(r"^\s*(?:[\u2022\-*]|\d+[.)]|\(?[ivxlcdm]+\)?)\s+", re.IGNORECASE)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?;:])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])")


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]


def _looks_like_proposal(sentence: str) -> bool:
    stripped = sentence.strip()
    if len(stripped) < 30:
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
         cumplan `_looks_like_proposal`.
      3. Deduplica por similitud textual (normalizada, sin tildes) y recorta
         a `max_proposals` según la prioridad acumulada.
    """

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
                priority_spans.append((idx, idx + len(h) + 1200))
                start = idx + len(h)

        def in_priority(pos: int) -> bool:
            return any(a <= pos < b for a, b in priority_spans)

        # 2) Recolectar candidatas con su puntuación de prioridad.
        candidates: list[tuple[int, str]] = []  # (score, sentence)
        for sentence in _split_sentences(text):
            pos = text.find(sentence)
            if _looks_like_proposal(sentence):
                score = 2 if in_priority(pos) else 1
                candidates.append((score, sentence))

        # 3) Deduplicar por similitud textual y recortar.
        seen_keys: set[str] = set()
        unique: list[tuple[int, str]] = []
        for score, sentence in sorted(candidates, key=lambda x: -x[0]):
            key = strip_accents(sentence).lower()[:120]
            if key in seen_keys:
                continue
            # Similaridad trivial contra lo ya aceptado (subcadena densa).
            if any(key[:40] in strip_accents(s).lower() for _, s in unique):
                continue
            seen_keys.add(key)
            unique.append((score, sentence))
            if len(unique) >= max_proposals:
                break

        logger.info("Propuestas extraídas (heurística): %d", len(unique))
        return [s for _, s in unique]
