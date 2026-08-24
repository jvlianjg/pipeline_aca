"""Segundo pase de auditoría: un LLM clasifica cada propuesta extraída.

Taxonomía idéntica al protocolo de validación manual
(``docs/validacion_extraccion.md``):

- **P** = propuesta válida (recomendación accionable de política/gestión).
- **B** = borde (normativo vago, sin acción concreta).
- **N** = ruido (narrativa, hallazgo, cita, metodología, meta-texto).

Las propuestas de cada documento se auditan por lotes con una sola llamada
por lote (~20 propuestas). Caché por documento en ``data/interim/llm_audit/``
con clave sha1(modelo + doc + textos): re-ejecutar no vuelve a pagar y
cambiar las propuestas o el modelo invalida solo lo suyo.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import pandas as pd
import requests

from ..config import ANTHROPIC_API_KEY, AUDIT_MODEL, LLM_AUDIT_DIR
from ..utils import logger

_API_URL = "https://api.anthropic.com/v1/messages"
_API_VERSION = "2023-06-01"
_RETRYABLE_HTTP = {429, 500, 502, 503, 529}

_SYSTEM = (
    "Eres un auditor experto en análisis de políticas públicas. Recibes una lista "
    "numerada de textos extraídos como «propuestas» de un documento de la Academia "
    "de Centroamérica, y debes clasificar cada uno en exactamente una categoría:\n"
    "P = propuesta válida: recomendación accionable de política pública, reforma "
    "institucional, regulatoria o de gestión (qué hacer y sobre qué).\n"
    "B = borde: enunciado normativo o directivo vago, con intención de propuesta "
    "pero sin acción concreta identificable.\n"
    "N = ruido: narrativa, descripción, hallazgo empírico, cita, metodología, "
    "pregunta, meta-texto o cualquier cosa que no sea una recomendación.\n"
    "Responde solo con JSON."
)

_VALID_VEREDICTOS = {"P", "B", "N"}


def _user_prompt(filename: str, textos: list[str]) -> str:
    lista = "\n".join(f"{i}. {t}" for i, t in enumerate(textos, 1))
    return (
        f"Documento: {filename}\n\nPropuestas:\n{lista}\n\n"
        "Clasifica cada una. Responde ÚNICAMENTE con un objeto JSON de la forma "
        '{"resultados": [{"id": 1, "veredicto": "P", "razon": "máximo 12 palabras"}, ...]} '
        "con un resultado por cada id."
    )


class AnthropicAuditor:
    """Clasifica propuestas P/B/N vía la Messages API (REST, sin SDK)."""

    BATCH = 20
    MAX_RETRIES = 2
    MAX_TOKENS = 4096

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or AUDIT_MODEL
        self.api_key = api_key or ANTHROPIC_API_KEY

    # ── API pública ──────────────────────────────────────────────
    def audit_batch(self, filename: str, textos: list[str]) -> list[dict]:
        """Audita un lote; devuelve [{"veredicto","razon"}, ...] alineado."""
        last_exc: Exception | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                return self._parse(self._complete(filename, textos), len(textos))
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt >= self.MAX_RETRIES:
                    break
                wait = 2**attempt
                logger.warning(
                    "Auditor falló (intento %d/%d, %s); reintentando en %ds…",
                    attempt + 1, self.MAX_RETRIES + 1, exc, wait,
                )
                time.sleep(wait)
        raise RuntimeError(f"Auditor agotó los reintentos: {last_exc}")

    # ── Llamada al modelo ────────────────────────────────────────
    def _complete(self, filename: str, textos: list[str]) -> str:
        payload = {
            "model": self.model,
            "max_tokens": self.MAX_TOKENS,
            "temperature": 0,
            "system": _SYSTEM,
            "messages": [{"role": "user",
                          "content": _user_prompt(filename, textos)}],
        }
        resp = self._poster(_API_URL, payload)
        if resp.status_code != 200:
            detalle = resp.text[:200].replace("\n", " ")
            raise RuntimeError(f"Auditor HTTP {resp.status_code}: {detalle}")
        data = json.loads(resp.text)
        try:
            return "".join(
                b.get("text", "") for b in data["content"] if b.get("type") == "text"
            )
        except (KeyError, IndexError) as exc:
            raise RuntimeError(
                f"Respuesta del auditor sin contenido: {str(data)[:200]}"
            ) from exc

    def _poster(self, url: str, payload: dict):
        """POST real; inyectable en pruebas asignando ``auditor._poster``."""
        return requests.post(
            url, json=payload,
            headers={
                "x-api-key": self.api_key or "",
                "anthropic-version": _API_VERSION,
            },
            timeout=120,
        )

    @staticmethod
    def _parse(content: str, n: int) -> list[dict]:
        text = content.strip()
        if text.startswith("```"):
            primera = text.find("\n")
            cierre = text.rfind("```")
            if primera != -1 and cierre > primera:
                text = text[primera + 1:cierre].strip()
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError("respuesta del auditor no es JSON válido") from exc
        items = data.get("resultados", []) if isinstance(data, dict) else data
        por_id = {}
        for it in items:
            if not isinstance(it, dict):
                continue
            try:
                por_id[int(it.get("id"))] = {
                    "veredicto": str(it.get("veredicto", "?")).strip().upper()[:1],
                    "razon": str(it.get("razon", "")).strip(),
                }
            except (TypeError, ValueError):
                continue
        default = {"veredicto": "?", "razon": "sin clasificar"}
        out = []
        for i in range(1, n + 1):
            r = por_id.get(i, default)
            if r["veredicto"] not in _VALID_VEREDICTOS:
                r = {"veredicto": "?", "razon": r["razon"] or "veredicto inválido"}
            out.append(r)
        return out


# ────────────────────────────────────────────────────────────────
#  Orquestación por documento (con caché)
# ────────────────────────────────────────────────────────────────

def _cache_path(model: str, doc_id: str, textos: list[str]) -> Path:
    h = hashlib.sha1()
    h.update(f"{model}::{doc_id}::".encode("utf-8"))
    h.update("\x1e".join(textos).encode("utf-8"))
    return LLM_AUDIT_DIR / f"{h.hexdigest()}.json"


def audit_proposals(proposals: pd.DataFrame, docs: list[dict]) -> pd.DataFrame:
    """Audita todas las propuestas; devuelve doc_id, idx, veredicto, razon."""
    filenames = {d["doc_id"]: d.get("filename", d["doc_id"]) for d in docs}
    auditor = AnthropicAuditor()
    rows: list[dict] = []
    for doc_id, grp in proposals.groupby("doc_id", sort=True):
        grp = grp.sort_values("idx")
        textos = grp["text"].astype(str).tolist()
        idxs = grp["idx"].astype(int).tolist()

        cache = _cache_path(auditor.model, doc_id, textos)
        resultados: list[dict] | None = None
        if cache.exists():
            try:
                resultados = json.loads(cache.read_text(encoding="utf-8"))["resultados"]
            except (json.JSONDecodeError, KeyError, OSError):
                resultados = None

        if resultados is None:
            resultados = []
            for ofs in range(0, len(textos), auditor.BATCH):
                resultados.extend(
                    auditor.audit_batch(filenames.get(doc_id, doc_id),
                                        textos[ofs:ofs + auditor.BATCH])
                )
            try:
                cache.write_text(
                    json.dumps({"model": auditor.model, "resultados": resultados},
                               ensure_ascii=False, indent=1),
                    encoding="utf-8",
                )
            except OSError as exc:  # la caché nunca debe tumbar la auditoría
                logger.warning("No se pudo escribir la caché del auditor: %s", exc)

        for idx, r in zip(idxs, resultados):
            rows.append({"doc_id": doc_id, "idx": idx,
                         "veredicto": r["veredicto"], "razon": r["razon"]})
        logger.info("  auditadas %3d propuestas de %s", len(textos), doc_id[:60])

    return pd.DataFrame(rows, columns=["doc_id", "idx", "veredicto", "razon"])
