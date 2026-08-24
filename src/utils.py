"""Utilidades compartidas: normalización de texto, logging y helpers de tiempo."""

from __future__ import annotations

import logging
import re
import unicodedata
from datetime import date, datetime

# Logger único para todo el proyecto.
logger = logging.getLogger("aca_impacto")
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)


# ────────────────────────────────────────────────────────────
#  Normalización de texto
# ────────────────────────────────────────────────────────────
def normalize_text(text: str) -> str:
    """Limpia un texto: colapsa espacios, elimina guiones de salto de línea y
    normaliza espacios en blanco. Conserva tildes (importantes en español)."""
    if not text:
        return ""
    # Une palabras partidas por guión al final de línea: "políti-\nca" -> "política".
    text = re.sub(r"-\s*\n\s*", "", text)
    # Convierte saltos de línea simples (no de párrafo) en espacios.
    text = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    # Colapsa espacios múltiples.
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def strip_accents(text: str) -> str:
    """Quita tildes; útil para búsquedas/matching aproximado."""
    return "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )


# Puntuación y símbolos habituales en texto en español.
_OK_SYMBOLS = set(" .,;:()%$€₡'\"-—–«»“”‘’…•°?!¿¡/+&\n\t")

# Letras y dígitos permitidos: repertorio español + ASCII. Las letras Unicode
# exóticas (ő, Ĉ, ŉ…) son la firma típica del mojibake de fuentes con
# ToUnicode dañado, así que cuentan como basura.
_OK_CHARS = set(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    "áéíóúüñÁÉÍÓÚÜÑ"
) | _OK_SYMBOLS


def garbage_ratio(text: str) -> float:
    """Fracción de caracteres fuera del repertorio esperable (español + ASCII,
    más puntuación común), contando además los tokens ``(cid:NN)`` que emite
    pdfplumber por glifos sin mapear.

    Sirve para detectar texto corrupto por mapeos de fuente rotos: oraciones
    con una proporción alta de caracteres raros no son propuestas válidas
    aunque pasen los filtros léxicos.
    """
    if not text:
        return 0.0
    weird = sum(1 for c in text if c not in _OK_CHARS)
    # Cada token "(cid:NN)" son ~7 caracteres de sopa sin contenido real.
    weird += 7 * text.count("(cid:")
    return weird / len(text)


def proposal_key(sentence: str) -> str:
    """Clave normalizada de una propuesta (sin tildes, solo alfanuméricos
    compactos: "Re-calibrar" y "Recalibrar" deben colisionar)."""
    return re.sub(r"\W+", "", strip_accents(sentence).lower()).strip()


_SENT_END_RE = re.compile(r"[.?!;:][\s\"«“)]")


def cut_at_sentence(text: str, start: int, end: int) -> int:
    """Corte de fragmento preferido en fin de oración dentro de la última
    mitad del rango [start, end); devuelve ``end`` si no hay ninguno."""
    mejor = end
    desde = start + (end - start) // 2
    for m in _SENT_END_RE.finditer(text, desde, end):
        pos = m.end()
        if pos < mejor:
            mejor = pos
    return mejor


def dedup_proposals(sentences: list[str]) -> list[str]:
    """Deduplica propuestas por texto normalizado: exacto y por prefijo
    compartido de 60 caracteres (misma apertura genérica ⇒ casi-duplicado)."""
    seen: set[str] = set()
    out: list[str] = []
    for s in sentences:
        key = proposal_key(s)
        if not key or key in seen:
            continue
        if any(key[:60] in k or k[:60] in key for k in seen):
            continue
        seen.add(key)
        out.append(s)
    return out


def representative_chunks(
    text: str, chunk_chars: int = 600, max_chunks: int = 24
) -> list[str]:
    """Divide el texto en fragmentos por límites de palabra y devuelve hasta
    ``max_chunks`` fragmentos muestreados uniformemente a lo largo del documento.

    El modelo de embeddings trunca la entrada a ~128 tokens (≈500-600
    caracteres), de modo que embedder el documento entero de una vez solo
    captura el principio (portada, créditos, índice). Fragmentar y promediar
    hace que el vector de documento represente el cuerpo sustantivo completo.
    """
    text = normalize_text(text)
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_chars, len(text))
        if end < len(text):
            # Extiende/recorta hasta el último espacio para no cortar palabras.
            cut = text.rfind(" ", start, end)
            if cut > start:
                end = cut
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        start = end

    if len(chunks) <= max_chunks:
        return chunks
    # Muestreo uniforme: conserva inicio, medio y fin del documento.
    step = (len(chunks) - 1) / (max_chunks - 1)
    idx = sorted({round(i * step) for i in range(max_chunks)})
    return [chunks[i] for i in idx]


# ────────────────────────────────────────────────────────────
#  Helpers temporales
# ────────────────────────────────────────────────────────────
def months_between(d1: date, d2: date) -> int:
    """Diferencia en meses calendario entre dos fechas (d2 - d1)."""
    return (d2.year - d1.year) * 12 + (d2.month - d1.month)


def safe_date(value: datetime | date | None) -> date | None:
    """Convierte a date de forma segura."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value
