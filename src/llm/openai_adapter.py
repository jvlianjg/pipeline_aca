"""Adapter para el proveedor comercial OpenAI (inactivo por defecto).

Solo se activa si `LLM_PROVIDER=openai` y `OPENAI_API_KEY` están en `.env`.
El resto del código lo consume a través de la interfaz `Embedder` sin distinguir
proveedor.
"""

from __future__ import annotations

import numpy as np

from ..utils import logger
from .base import Embedder


class OpenAIEmbedder(Embedder):
    """Embeddings vía la API de OpenAI.

    Modelos recomendados para español: `text-embedding-3-small` (rápido/barato)
    o `text-embedding-3-large`.  Para activarlo, fija en `.env`:
        LLM_PROVIDER=openai
        OPENAI_API_KEY=sk-...
        EMBEDDING_MODEL=text-embedding-3-small
    """

    def __init__(self, model: str = "text-embedding-3-small"):
        self.model_name = model
        self._client = None
        # Dimensión conocida de los modelos text-embedding-3-*.  Se ajusta al
        # primer lote real por si el usuario eligió otro modelo.
        self.dim = 1536

    def _ensure_client(self) -> None:
        if self._client is None:
            from openai import OpenAI
            from .. import config

            if not config.OPENAI_API_KEY:
                raise RuntimeError(
                    "OPENAI_API_KEY no configurada. Añádela a .env o usa LLM_PROVIDER=local."
                )
            self._client = OpenAI(api_key=config.OPENAI_API_KEY)
            logger.info("Cliente OpenAI inicializado (modelo=%s)", self.model_name)

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        self._ensure_client()
        # La API limita el tamaño del lote; procesamos en chunks.
        out: list[list[float]] = []
        batch = 256
        for i in range(0, len(texts), batch):
            chunk = texts[i : i + batch]
            resp = self._client.embeddings.create(model=self.model_name, input=chunk)
            out.extend([d.embedding for d in resp.data])
        mat = np.asarray(out, dtype=np.float32)
        # Normalizar L2 para que coseno = producto escalar.
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        mat /= norms
        self.dim = mat.shape[1]
        return mat
