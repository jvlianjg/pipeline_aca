"""Cápsulas de conocimiento: actor objetivo + meta-métrica + palabras clave.

Completa la Fase 1.1 de la hoja de ruta: cada recomendación (el "qué", ya
extraída y verificada literal) se enriquece con:

- **actor**: la entidad con poder de implementarla (el "quién"), derivada de
  entidades o instrumentos mencionados en la propia propuesta;
- **metrica**: el indicador o resultado que busca impactar (el "para qué");
- **keywords**: 3-5 términos clave visibles para humanos.

Una llamada por documento (lote de propuestas). Caché en
``data/interim/llm_capsules/`` con clave sha1(modelo + versión + textos).
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import requests

from ..config import ANTHROPIC_API_KEY, LLM_CAPSULES_DIR, PROPOSAL_MODEL
from ..utils import logger

_API_URL = "https://api.anthropic.com/v1/messages"
_API_VERSION = "2023-06-01"
_RETRYABLE_HTTP = {429, 500, 502, 503, 529}

CAPSULE_VERSION = "v1"

_SYSTEM = (
    "Eres un analista de políticas públicas costarricenses. Recibes una lista "
    "numerada de recomendaciones extraídas de un documento de la Academia de "
    "Centroamérica y, para cada una, debes devolver:\n"
    '- "actor": la institución u organismo con poder de implementarla (p. ej. '
    "MICITT, MEIC, MINAE, Hacienda, BCCR, Asamblea Legislativa, MIDEPLAN, "
    "COMEX, MTSS, Ministerio de Salud, CNFL, ICE, RECOPE, municipalidades). "
    "Derívalo SOLO de entidades o instrumentos mencionados en la propuesta "
    "(si menciona la Estrategia Nacional de IA, el actor es MICITT). "
    'Si no se puede derivar, responde exactamente "No especificado".\n'
    '- "metrica": el indicador o resultado concreto que la recomendación busca '
    "impactar (p. ej. empleo formal, productividad, inversión en I+D, "
    "emisiones de CO₂). Si no se especifica, responde exactamente "
    '"No especificada".\n'
    '- "keywords": 3 a 5 palabras clave en minúsculas, extraídas o resumidas '
    "de la propuesta.\n"
    "Responde solo con JSON, sin comentarios."
)


def _user_prompt(filename: str, propuestas: list[str]) -> str:
    lista = "\n".join(f"{i}. {t}" for i, t in enumerate(propuestas, 1))
    return (
        f"Documento: {filename}\n\nRecomendaciones:\n{lista}\n\n"
        "Responde ÚNICAMENTE con un objeto JSON de la forma "
        '{"capsulas": [{"id": 1, "actor": "...", "metrica": "...", '
        '"keywords": ["...", "..."]}, ...]} con una cápsula por cada id.'
    )


class CapsuleExtractor:
    """Extrae actor/métrica/keywords por propuesta (Anthropic, REST)."""

    BATCH = 25
    MAX_RETRIES = 2
    MAX_TOKENS = 4096

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or PROPOSAL_MODEL
        self.api_key = api_key or ANTHROPIC_API_KEY

    def extract_batch(self, filename: str, propuestas: list[str]) -> list[dict]:
        last_exc: Exception | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                return self._parse(self._complete(filename, propuestas),
                                   len(propuestas))
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt >= self.MAX_RETRIES:
                    break
                wait = 2**attempt
                logger.warning(
                    "Cápsulas fallaron (intento %d/%d, %s); reintentando en %ds…",
                    attempt + 1, self.MAX_RETRIES + 1, exc, wait,
                )
                time.sleep(wait)
        raise RuntimeError(f"Extractor de cápsulas agotó reintentos: {last_exc}")

    def _complete(self, filename: str, propuestas: list[str]) -> str:
        payload = {
            "model": self.model,
            "max_tokens": self.MAX_TOKENS,
            "temperature": 0,
            "system": _SYSTEM,
            "messages": [
                {"role": "user", "content": _user_prompt(filename, propuestas)}
            ],
        }
        resp = self._poster(_API_URL, payload)
        if resp.status_code != 200:
            detalle = resp.text[:200].replace("\n", " ")
            raise RuntimeError(f"Cápsulas HTTP {resp.status_code}: {detalle}")
        data = json.loads(resp.text)
        try:
            return "".join(
                b.get("text", "") for b in data["content"] if b.get("type") == "text"
            )
        except (KeyError, IndexError) as exc:
            raise RuntimeError(
                f"Respuesta de cápsulas sin contenido: {str(data)[:200]}"
            ) from exc

    def _poster(self, url: str, payload: dict):
        """POST real; inyectable en pruebas asignando ``extractor._poster``."""
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
            raise RuntimeError("respuesta de cápsulas no es JSON válido") from exc
        items = data.get("capsulas", []) if isinstance(data, dict) else data
        por_id: dict[int, dict] = {}
        for it in items:
            if not isinstance(it, dict):
                continue
            try:
                kws = it.get("keywords", [])
                if isinstance(kws, str):
                    kws = [k.strip() for k in kws.split(",") if k.strip()]
                por_id[int(it.get("id"))] = {
                    "actor": str(it.get("actor", "")).strip() or "No especificado",
                    "metrica": str(it.get("metrica", "")).strip() or "No especificada",
                    "keywords": [str(k).strip().lower() for k in kws if str(k).strip()][:5],
                }
            except (TypeError, ValueError):
                continue
        default = {"actor": "No especificado", "metrica": "No especificada",
                   "keywords": []}
        return [por_id.get(i, default) for i in range(1, n + 1)]


def build_capsules(doc_id: str, filename: str,
                   propuestas: list[str]) -> list[dict]:
    """Cápsulas de un documento, con caché por hash de contenidos."""
    ex = CapsuleExtractor()
    h = hashlib.sha1()
    h.update(f"{ex.model}::{CAPSULE_VERSION}::{doc_id}::".encode("utf-8"))
    h.update("\x1e".join(propuestas).encode("utf-8"))
    cache = LLM_CAPSULES_DIR / f"{h.hexdigest()}.json"

    if cache.exists():
        try:
            return json.loads(cache.read_text(encoding="utf-8"))["capsulas"]
        except (json.JSONDecodeError, KeyError, OSError):
            pass

    capsulas: list[dict] = []
    for ofs in range(0, len(propuestas), ex.BATCH):
        capsulas.extend(ex.extract_batch(filename, propuestas[ofs:ofs + ex.BATCH]))
    try:
        cache.write_text(
            json.dumps({"model": ex.model, "version": CAPSULE_VERSION,
                        "capsulas": capsulas}, ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
    except OSError as exc:
        logger.warning("No se pudo escribir la caché de cápsulas: %s", exc)
    return capsulas
