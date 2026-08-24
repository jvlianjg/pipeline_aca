"""Pulido mecánico de propuestas extraídas (local, determinista).

Ataca tres defectos observados en la revisión manual:

1. **Propuestas pegadas**: el PDF fusiona oraciones y el extractor (que copia
   literal) copia el bloque completo. Se separa por oraciones y cada pieza
   se re-verifica contra el fuente: sobreviven solo las literales.
2. **Basura de cabecera**: "15 Análisis 20/octubre, 2022 …" y títulos de
   sección EN MAYÚSCULAS pegados al inicio se detectan y se retiran.
3. **Propuestas cortadas**: una copia parcial cuya versión completa existe
   en otra propuesta del mismo documento se elimina por contención de
   texto normalizado.
"""

from __future__ import annotations

import re

import pandas as pd

from ..config import III
from ..utils import logger, proposal_key
from .verify import _norm_mapped, verify_one

#: Cabecera de página típica: "15 Análisis 20/octubre, 2022 …"
_PAGE_HEADER_RE = re.compile(
    r"^\s*\d{1,3}\s+(?:An[áa]lisis|Informe|Estudio|Bolet[íi]n)\b"
    r"(?:\s*\d{1,2}\s*/\s*\w+\.?\s*,?\s*\d{0,4})?"  # fecha "20/octubre, 2022"
    r"\s+(?=[A-ZÁÉÍÓÚÜÑa-záéíóú])",
)

#: Título de sección en mayúsculas pegado al inicio de la primera oración:
#: "TRES RECOMENDACIONES DE POLÍTICA ECONÓMICA En esta sección…"
_HEADING_RE = re.compile(r"^([A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9\s\-:,;()]{12,90})(?=[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ])")

#: Separador de oraciones que respeta abreviaturas y enumeraciones comunes.
_SENT_SPLIT_RE = re.compile(r"(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÜÑ¿(i1-9])")


def strip_junk(text: str) -> str:
    """Retira cabeceras de página y títulos pegados al inicio."""
    t = _PAGE_HEADER_RE.sub("", text, count=1)
    m = _HEADING_RE.match(t)
    if m and not m.group(1).rstrip().endswith((".", "!", "?")):
        # El título no termina en puntuación de oración ⇒ iba pegado.
        t = t[m.end(1):].lstrip(" :–—-")
    return t.strip()


def split_glued(text: str) -> list[str]:
    """Separa un bloque pegado en sus oraciones (hasta 4 piezas razonables)."""
    piezas = [p.strip() for p in _SENT_SPLIT_RE.split(text) if len(p.strip()) >= 20]
    if 2 <= len(piezas) <= 4:
        return piezas
    return [text]


def polish_proposals(docs: list[dict], proposals: pd.DataFrame) -> pd.DataFrame:
    """Aplica el pulido a la salida (ya verificada) de ``verify_proposals``."""
    por_doc_texto = {d["doc_id"]: d.get("text") or "" for d in docs}
    lo, hi = III.propuesta_min_chars, III.propuesta_max_chars
    filas: list[dict] = []
    n_strip = n_split = n_contenida = 0

    for doc_id, grp in proposals.groupby("doc_id", sort=True):
        texto = por_doc_texto.get(doc_id, "")
        doc_norm, mapa = _norm_mapped(texto)

        candidatos: list[dict] = []
        for _, r in grp.sort_values("idx").iterrows():
            t0 = str(r["text"])
            t = strip_junk(t0)
            if t != t0:
                n_strip += 1
            piezas = split_glued(t) if len(t) > 160 else [t]
            if len(piezas) > 1:
                n_split += 1
            for pieza in piezas:
                if not (lo <= len(pieza) <= hi):
                    continue
                candidatos.append({
                    "text": pieza,
                    "estado": r["estado"],
                    "cobertura": r["cobertura"],
                    "evidencia": r["evidencia"] if len(piezas) == 1 else "",
                })

        # Contención: descarta copias parciales cuya versión completa existe.
        completos = sorted(candidatos, key=lambda c: -len(c["text"]))
        keys = [proposal_key(c["text"]) for c in completos]
        finales = []
        for i, c in enumerate(completos):
            k = keys[i]
            if any(k in keys[j] for j in range(len(completos)) if j != i):
                n_contenida += 1
                continue
            # re-verifica las piezas que vinieron de una separación
            if not c["evidencia"]:
                res = verify_one(c["text"], doc_norm, mapa, texto)
                c.update(res)
                if res["estado"] == "literal" and lo <= len(res["evidencia"]) <= hi:
                    c["text"] = res["evidencia"]
            finales.append(c)

        for i, c in enumerate(finales):
            filas.append({"doc_id": doc_id, "idx": i, **c})
        logger.info("  pulidas %s: %d propuestas finales", doc_id[:55], len(finales))

    logger.info(
        "  → pulido: %d cabeceras/títulos retirados, %d bloques separados, "
        "%d parciales contenidas eliminadas", n_strip, n_split, n_contenida,
    )
    cols = ["doc_id", "idx", "text", "estado", "cobertura", "evidencia"]
    return pd.DataFrame(filas, columns=cols)
