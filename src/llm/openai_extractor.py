"""Extractor de propuestas basado en LLM (OpenAI Chat Completions).

Se activa cuando el proveedor comercial está configurado (``.env``:
``LLM_PROVIDER=openai`` + ``OPENAI_API_KEY``). El texto se procesa por
fragmentos con solapamiento, el modelo responde en JSON estricto y los
resultados pasan los mismos filtros de calidad que la heurística (longitud,
texto corrupto, deduplicación normalizada).

Cada extracción se cachea en ``data/interim/llm_props/`` con una clave
``sha1(modelo + texto)``: re-ejecutar el pipeline no repite llamadas, y
cambiar de modelo invalida la caché automáticamente.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from ..config import LLM_PROPS_DIR, III
from ..utils import cut_at_sentence, dedup_proposals, garbage_ratio, logger, normalize_text
from .base import ProposalExtractor
from .prompts import PROMPT_VERSION, SYSTEM_PROMPT as _SYSTEM_PROMPT, user_prompt as _user_prompt


class OpenAIProposalExtractor(ProposalExtractor):
    """Extrae propuestas con un LLM comercial, con caché por documento."""

    #: Tamaño de fragmento y solapamiento (chars) y tope de fragmentos por doc.
    CHUNK_CHARS = 6000
    CHUNK_OVERLAP = 400
    MAX_CHUNKS = 60  # tope de costo: ~360k caracteres por documento
    MAX_RETRIES = 2

    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model
        self._client = None

    # ── Cliente (inyectable para pruebas) ────────────────────────
    def _get_client(self):
        if self._client is None:
            from openai import OpenAI

            from ..config import OPENAI_API_KEY

            self._client = OpenAI(api_key=OPENAI_API_KEY)
        return self._client

    # ── API pública ──────────────────────────────────────────────
    def extract(self, text: str, max_proposals: int = 40) -> list[str]:
        text = normalize_text(text)
        if not text:
            return []

        cache = self._cache_path(text)
        cached = self._load_cache(cache)
        if cached is not None:
            logger.info("Propuestas (LLM %s, caché): %d", self.model, len(cached))
            return cached[:max_proposals]

        proposals: list[str] = []
        for chunk in self._chunks(text):
            proposals.extend(self._extract_chunk(chunk))

        lo, hi = III.propuesta_min_chars, III.propuesta_max_chars
        cleaned = [
            p.strip()
            for p in proposals
            if lo <= len(p.strip()) <= hi and garbage_ratio(p) <= 0.03
        ]
        result = dedup_proposals(cleaned)[:max_proposals]
        self._save_cache(cache, result)
        logger.info("Propuestas extraídas (LLM %s): %d", self.model, len(result))
        return result

    # ── Fragmentación ────────────────────────────────────────────
    def _chunks(self, text: str) -> list[str]:
        chunks: list[str] = []
        start = 0
        n = len(text)
        while start < n and len(chunks) < self.MAX_CHUNKS:
            end = min(start + self.CHUNK_CHARS, n)
            if end < n:
                cut = cut_at_sentence(text, start, end)
                if cut <= start:
                    cut = text.rfind(" ", start, end)
                if cut > start:
                    end = cut
            piece = text[start:end].strip()
            if piece:
                chunks.append(piece)
            if end >= n:
                break
            start = max(end - self.CHUNK_OVERLAP, start + 1)
        return chunks

    # ── Llamada al modelo ────────────────────────────────────────
    def _extract_chunk(self, chunk: str) -> list[str]:
        client = self._get_client()
        last_exc: Exception | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                resp = client.chat.completions.create(
                    model=self.model,
                    temperature=0,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": _user_prompt(chunk)},
                    ],
                )
                return self._parse_response(resp.choices[0].message.content or "")
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt >= self.MAX_RETRIES:
                    break
                wait = 2**attempt
                logger.warning(
                    "LLM falló (intento %d/%d, %s); reintentando en %ds…",
                    attempt + 1, self.MAX_RETRIES + 1, exc, wait,
                )
                time.sleep(wait)
        raise RuntimeError(f"Extractor LLM agotó los reintentos: {last_exc}")

    @staticmethod
    def _parse_response(content: str) -> list[str]:
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            logger.warning("Respuesta del LLM no es JSON válido; se descarta el fragmento.")
            return []
        items = data.get("propuestas", []) if isinstance(data, dict) else data
        if not isinstance(items, list):
            return []
        return [str(p).strip() for p in items if isinstance(p, str) and str(p).strip()]

    # ── Caché por documento (sha1 de modelo + texto) ─────────────
    def _cache_path(self, text: str) -> Path:
        key = hashlib.sha1(
            f"{self.model}::{PROMPT_VERSION}::{text}".encode("utf-8")
        ).hexdigest()
        return LLM_PROPS_DIR / f"{key}.json"

    @staticmethod
    def _load_cache(path: Path) -> list[str] | None:
        if not path.exists():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            return [str(p) for p in payload.get("propuestas", [])]
        except (json.JSONDecodeError, OSError):
            return None

    def _save_cache(self, path: Path, proposals: list[str]) -> None:
        try:
            path.write_text(
                json.dumps({"model": self.model, "propuestas": proposals},
                           ensure_ascii=False, indent=1),
                encoding="utf-8",
            )
        except OSError as exc:  # la caché nunca debe tumbar la extracción
            logger.warning("No se pudo escribir la caché LLM (%s): %s", path.name, exc)
