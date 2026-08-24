"""Capa de abstracción de IA: interfaz común para embeddings y extracción.

El sistema es híbrido:
  - Por defecto funciona 100% en local con `sentence-transformers`.
  - Si se configura un proveedor comercial (p. ej. OpenAI) en `.env`, se usa ese.

Toda llamada externa pasa por estas interfaces, de modo que cambiar de proveedor
no requiere tocar la lógica de índices ni el pipeline.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class Embedder(ABC):
    """Interfaz para obtener embeddings vectoriales de textos."""

    #: Dimensión de los vectores que produce (se rellena al instanciar).
    dim: int = 0

    @abstractmethod
    def embed(self, texts: list[str]) -> np.ndarray:
        """Devuelve una matriz (n_texts, dim) normalizada (norma L2 = 1)."""
        raise NotImplementedError


class ProposalExtractor(ABC):
    """Interfaz para extraer propuestas de un texto.

    La implementación por defecto es heurística (local, sin API).  La
    implementación basada en LLM se activa solo si hay proveedor configurado.
    """

    @abstractmethod
    def extract(self, text: str, max_proposals: int) -> list[str]:
        """Devuelve una lista de textos de propuestas (frases/oraciones)."""
        raise NotImplementedError


def get_embedder() -> Embedder:
    """Factory: devuelve el embedder configurado (local por defecto)."""
    from .. import config

    if config.LLM_PROVIDER == "openai" and config.is_commercial_enabled():
        try:
            from . import openai_adapter

            return openai_adapter.OpenAIEmbedder(model=config.EMBEDDING_MODEL)
        except Exception as exc:  # pragma: no cover - fallback defensivo
            from ..utils import logger

            logger.warning(
                "No se pudo inicializar el embedder comercial (%s). "
                "Se usarán embeddings locales.", exc
            )

    from . import local

    return local.LocalEmbedder(model=config.EMBEDDING_MODEL)


def get_proposal_extractor() -> ProposalExtractor:
    """Factory: extractor LLM si hay proveedor comercial; heurística si no.

    Si el extractor LLM se activa, la heurística queda como fallback por
    documento ante fallos de API (ver ``src/extraction/proposals.py``).
    """
    from .. import config

    if config.is_commercial_enabled():
        try:
            if config.LLM_PROVIDER == "gemini":
                from .gemini_extractor import GeminiProposalExtractor

                return GeminiProposalExtractor(
                    model=config.PROPOSAL_MODEL, rpm=config.GEMINI_RPM
                )
            if config.LLM_PROVIDER == "anthropic":
                from .anthropic_extractor import AnthropicProposalExtractor

                return AnthropicProposalExtractor(model=config.PROPOSAL_MODEL)
            from .openai_extractor import OpenAIProposalExtractor

            return OpenAIProposalExtractor(model=config.PROPOSAL_MODEL)
        except Exception as exc:  # pragma: no cover - fallback defensivo
            from ..utils import logger

            logger.warning(
                "No se pudo inicializar el extractor LLM (%s). "
                "Se usa el extractor heurístico local.", exc
            )

    from . import local

    return local.HeuristicProposalExtractor()
