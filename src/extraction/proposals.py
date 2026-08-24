"""Extracción de propuestas: puente entre la capa de IA y los documentos."""

from __future__ import annotations

from dataclasses import dataclass

from ..config import III
from ..llm.base import get_proposal_extractor
from ..llm.local import HeuristicProposalExtractor
from ..utils import logger


@dataclass
class Proposal:
    doc_id: str
    idx: int  # ordinal de la propuesta dentro del documento (tras filtrado)
    text: str


def extract_proposals(doc_id: str, text: str) -> list[Proposal]:
    """Extrae propuestas de un documento usando el extractor configurado.

    El extractor LLM (si está activo) ya aplica los límites de longitud, el
    filtro de texto corrupto, la deduplicación y el tope por documento; este
    filtro de longitud es solo una red de seguridad. Si el LLM falla para un
    documento (API, rate limit), ese documento cae a la heurística local sin
    tumbar el pipeline.
    """
    extractor = get_proposal_extractor()
    try:
        raw = extractor.extract(text, max_proposals=III.max_propuestas_por_doc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Extractor falló para %s (%s); se usa la heurística.", doc_id, exc)
        raw = HeuristicProposalExtractor().extract(
            text, max_proposals=III.max_propuestas_por_doc
        )
    lo, hi = III.propuesta_min_chars, III.propuesta_max_chars
    kept = [p for p in raw if lo <= len(p) <= hi]
    return [Proposal(doc_id=doc_id, idx=i, text=t) for i, t in enumerate(kept)]
