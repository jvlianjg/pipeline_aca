"""Extracción de propuestas: puente entre la capa de IA y los documentos."""

from __future__ import annotations

from dataclasses import dataclass

from ..config import III
from ..llm.base import get_proposal_extractor


@dataclass
class Proposal:
    doc_id: str
    idx: int  # posición dentro del documento
    text: str


def extract_proposals(doc_id: str, text: str) -> list[Proposal]:
    """Extrae propuestas de un documento usando el extractor configurado."""
    extractor = get_proposal_extractor()
    raw = extractor.extract(text, max_proposals=III.max_propuestas_por_doc)
    # Filtrado por longitud configurable.
    lo, hi = III.propuesta_min_chars, III.propuesta_max_chars
    kept = [p for p in raw if lo <= len(p) <= hi]
    return [Proposal(doc_id=doc_id, idx=i, text=t) for i, t in enumerate(kept)]
