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
