"""Extractor de propuestas basado en LLM (Gemini API de Google).

Se activa con ``.env``: ``LLM_PROVIDER=gemini`` + ``GEMINI_API_KEY``.
Mismo contrato que el extractor OpenAI: mismos prompts (``src/llm/prompts.py``),
mismos filtros de calidad (longitud, texto corrupto, deduplicación) y misma
caché ``sha1(modelo + texto)`` en ``data/interim/llm_props/`` — cambiar de
proveedor o de modelo invalida solo sus propias entradas de caché.

La API se consume por REST (``generateContent``) sin SDK adicional. El pacing
opcional ``GEMINI_RPM`` limita las peticiones por minuto (0 = sin límite, lo
normal en el tier pagado).
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import requests

from ..config import GEMINI_API_KEY, GEMINI_RPM, III, LLM_PROPS_DIR
from ..utils import cut_at_sentence, dedup_proposals, garbage_ratio, logger, normalize_text
from .base import ProposalExtractor
from .prompts import PROMPT_VERSION, SYSTEM_PROMPT, user_prompt

_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
#: Códigos HTTP que merecen reintentos (límites de cuota y errores del servidor).
_RETRYABLE_HTTP = {429, 500, 502, 503, 504}


class GeminiProposalExtractor(ProposalExtractor):
    """Extrae propuestas con Gemini, con caché por documento."""

    #: Tamaño de fragmento y solapamiento (chars) y tope de fragmentos por doc.
    CHUNK_CHARS = 6000
    CHUNK_OVERLAP = 400
    MAX_CHUNKS = 60  # tope de costo: ~360k caracteres por documento
    MAX_RETRIES = 2

    def __init__(self, model: str = "gemini-3.1-flash-lite",
                 api_key: str | None = None, rpm: int | None = None):
        self.model = model
        self.api_key = api_key or GEMINI_API_KEY
        self.rpm = GEMINI_RPM if rpm is None else rpm
        self._last_call = 0.0

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

    # ── Fragmentación (idéntica al extractor OpenAI) ─────────────
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
        last_exc: Exception | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            self._throttle()
            try:
                return self._parse_response(self._generate(chunk))
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt >= self.MAX_RETRIES:
                    break
                wait = 2**attempt
                logger.warning(
                    "Gemini falló (intento %d/%d, %s); reintentando en %ds…",
                    attempt + 1, self.MAX_RETRIES + 1, exc, wait,
                )
                time.sleep(wait)
        raise RuntimeError(f"Extractor Gemini agotó los reintentos: {last_exc}")

    def _generate(self, chunk: str) -> str:
        """Una llamada ``generateContent``; devuelve el texto de la respuesta."""
        payload = {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt(chunk)}]}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
            },
        }
        resp = self._poster(_API_URL.format(model=self.model), payload)
        if resp.status_code != 200:
            detalle = resp.text[:200].replace("\n", " ")
            raise RuntimeError(f"Gemini HTTP {resp.status_code}: {detalle}")
        data = json.loads(resp.text)
        try:
            parts = data["candidates"][0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError) as exc:
            raise RuntimeError(
                f"Respuesta Gemini sin contenido: {str(data)[:200]}"
            ) from exc

    def _poster(self, url: str, payload: dict):
        """POST real; inyectable en pruebas asignando ``extractor._poster``."""
        return requests.post(
            url, json=payload,
            headers={"x-goog-api-key": self.api_key or ""},
            timeout=120,
        )

    def _throttle(self) -> None:
        """Espacia las llamadas según ``rpm`` (0 = sin límite)."""
        if self.rpm <= 0:
            return
        interval = 60.0 / self.rpm
        wait = self._last_call + interval - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last_call = time.monotonic()

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
