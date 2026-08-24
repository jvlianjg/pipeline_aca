"""Extracción de texto y metadatos (especialmente la fecha de publicación) de los PDFs.

Estrategia:
  - Motor primario: PyMuPDF (`fitz`), rápido y robusto.
  - Fallback: pdfplumber si PyMuPDF falla o devuelve texto vacío.
  - Detección de fecha: metadatos del PDF → regex sobre las primeras páginas →
    regex sobre el nombre de archivo.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from ..utils import logger, normalize_text, garbage_ratio

# Proporción de caracteres raros a partir de la cual se considera que el texto
# de un motor está corrupto y vale la pena probar el otro.
_MAX_TEXT_GARBAGE = 0.02

# ────────────────────────────────────────────────────────────
#  Modelo de datos de un documento extraído
# ────────────────────────────────────────────────────────────


@dataclass
class ExtractedDoc:
    doc_id: str
    filename: str
    text: str
    n_pages: int
    fecha: date | None = None
    fecha_origen: str = ""  # "metadata" | "texto" | "archivo" | "desconocida"
    raw_meta: dict = field(default_factory=dict)

    def resumen(self) -> str:
        """Primeros ~1500 caracteres normalizados, como representación de doc."""
        return normalize_text(self.text)[:1500]


# ────────────────────────────────────────────────────────────
#  Extracción de texto
# ────────────────────────────────────────────────────────────


def _extract_with_pymupdf(path: Path) -> tuple[str, int, dict]:
    import fitz  # PyMuPDF

    meta: dict = {}
    pages_text: list[str] = []
    with fitz.open(path) as doc:
        meta = dict(doc.metadata or {})
        for page in doc:
            pages_text.append(page.get_text("text"))
    return normalize_text("\n".join(pages_text)), len(pages_text), meta


def _extract_with_pdfplumber(path: Path) -> tuple[str, int]:
    import pdfplumber

    pages_text: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages_text.append(page.extract_text() or "")
    return normalize_text("\n".join(pages_text)), len(pages_text)


def extract_text(path: Path) -> tuple[str, int, dict]:
    """Devuelve (texto, n_paginas, metadatos).

    Estrategia: PyMuPDF primero; si falla, devuelve texto vacío o contiene una
    proporción alta de caracteres corruptos (fuentes con ToUnicode dañado),
    prueba pdfplumber y se queda con la versión más limpia.
    """
    meta: dict = {}
    best: tuple[str, int] = ("", 0)
    best_garbage = 1.0

    try:
        text, n, meta = _extract_with_pymupdf(path)
        best, best_garbage = (text, n), garbage_ratio(text)
        if text.strip() and best_garbage <= _MAX_TEXT_GARBAGE:
            return text, n, meta
        logger.warning(
            "PyMuPDF: texto vacío o corrupto (%.1f%% raros) en %s; probando pdfplumber.",
            100 * best_garbage, path.name,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("PyMuPDF falló en %s (%s); probando pdfplumber.", path.name, exc)

    try:
        text, n = _extract_with_pdfplumber(path)
        g = garbage_ratio(text)
        if len(text) > len(best[0]) * 0.5 and g < best_garbage:
            logger.info(
                "pdfplumber mejora la extracción de %s (%.1f%% → %.1f%% chars raros).",
                path.name, 100 * best_garbage, 100 * g,
            )
            # Conserva la metadata de PyMuPDF (pdfplumber no la devuelve y la
            # fecha de publicación depende de ella).
            return text, n, meta
        if not best[0].strip():
            return text, n, {}
    except Exception as exc:  # noqa: BLE001
        logger.error("pdfplumber también falló en %s: %s", path.name, exc)

    return best[0], best[1], meta


# ────────────────────────────────────────────────────────────
#  Detección de fecha de publicación
# ────────────────────────────────────────────────────────────

# Formatos comunes: "12 de marzo de 2021", "marzo 2021", "2021", "2021-03-12".
_FULL_DATE_RE = re.compile(
    r"\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|"
    r"agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b",
    re.IGNORECASE,
)
_MONTH_YEAR_RE = re.compile(
    r"\b(enero|febrero|marzo|abril|mayo|junio|julio|"
    r"agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b",
    re.IGNORECASE,
)
_YEAR_RE = re.compile(r"\b(20\d{2})\b")
_ISO_RE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")

_MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11,
    "diciembre": 12,
}


def _from_metadata(meta: dict) -> date | None:
    for key in ("creationDate", "modDate", "creation-date"):
        val = meta.get(key)
        if not val:
            continue
        # PDF date: "D:20210315120000-06'00'"  o  "2021-03-15"
        m = re.search(r"(\d{4})(\d{2})(\d{2})", str(val))
        if m:
            y, mo, d = (int(x) for x in m.groups())
            if 1900 < y < 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                try:
                    return date(y, mo, d)
                except ValueError:
                    continue
        m = _ISO_RE.search(str(val))
        if m:
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                continue
    return None


def _from_text(text: str) -> date | None:
    head = text[:6000]  # la fecha suele ir en portada/creditos
    m = _FULL_DATE_RE.search(head)
    if m:
        d, month, y = m.groups()
        try:
            return date(int(y), _MONTHS[month.lower()], int(d))
        except (KeyError, ValueError):
            pass
    m = _MONTH_YEAR_RE.search(head)
    if m:
        month, y = m.groups()
        try:
            return date(int(y), _MONTHS[month.lower()], 1)
        except (KeyError, ValueError):
            pass
    m = _ISO_RE.search(head)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    m = _YEAR_RE.search(head)
    if m:
        try:
            return date(int(m.group(1)), 1, 1)
        except ValueError:
            pass
    return None


def _from_filename(filename: str) -> date | None:
    m = _YEAR_RE.search(filename)
    if m:
        try:
            return date(int(m.group(1)), 1, 1)
        except ValueError:
            return None
    return None


def detect_date(meta: dict, text: str, filename: str) -> tuple[date | None, str]:
    """Cadena de prioridad: metadata → texto → nombre de archivo."""
    d = _from_metadata(meta)
    if d:
        return d, "metadata"
    d = _from_text(text)
    if d:
        return d, "texto"
    d = _from_filename(filename)
    if d:
        return d, "archivo"
    return None, "desconocida"


# ────────────────────────────────────────────────────────────
#  API pública
# ────────────────────────────────────────────────────────────


def extract_document(path: Path) -> ExtractedDoc:
    from ..config import doc_id_from_filename

    path = Path(path)
    logger.info("Extrayendo: %s", path.name)
    text, n_pages, meta = extract_text(path)
    fecha, fecha_origen = detect_date(meta, text, path.name)
    if fecha:
        logger.info("  → fecha %s (origen: %s)", fecha.isoformat(), fecha_origen)
    else:
        logger.warning("  → no se pudo determinar fecha para %s", path.name)
    return ExtractedDoc(
        doc_id=doc_id_from_filename(path.name),
        filename=path.name,
        text=text,
        n_pages=n_pages,
        fecha=fecha,
        fecha_origen=fecha_origen,
        raw_meta=meta,
    )
