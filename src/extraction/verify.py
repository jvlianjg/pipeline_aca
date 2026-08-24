"""Compuerta de verificación literal de propuestas (local, determinista).

Un LLM extrae propuestas con sesgo a reformular: comprime, reordena o
sintetiza. Esta etapa alinea cada propuesta contra el texto fuente del
documento y la clasifica:

- ``literal``: la propuesta calza (cobertura ≥ umbral) con un pasaje
  compacto del fuente. Se **corrige automáticamente al texto literal**
  (el span fuente) y se guarda como evidencia.
- ``no_verificada``: no hay pasaje que la respalde ⇒ probable síntesis;
  se conserva marcada, fuera de la evidencia textual.

Costo: cero (sin API). Métrica que produce: tasa de literalidad por
documento y por modelo — la medida honesta de calidad de extracción.
"""

from __future__ import annotations

import re
import unicodedata

import pandas as pd
from difflib import SequenceMatcher

from ..config import III
from ..utils import logger, normalize_text, proposal_key, strip_accents

#: Cobertura mínima del texto de la propuesta sobre el span fuente.
COBERTURA_MIN = 0.85
#: El span fuente no puede ser más largo que esto respecto a lo cubierto
#: (evita unir matches dispersos en una "cita" imposible).
COMPACIDAD_MAX = 2.5
#: Longitud máxima razonable del span de evidencia (chars).
EVIDENCIA_MAX_CHARS = 700


def _norm_mapped(text: str) -> tuple[str, list[int]]:
    """Normaliza conservando el mapeo posición-normalizada → original.

    Transformaciones por carácter: minúsculas, tildes fuera, guiones y
    cualquier espacio en blanco como un solo espacio (con colapso de
    corridas, manteniendo el mapa apuntando al carácter original).
    """
    out: list[str] = []
    mapa: list[int] = []
    for i, ch in enumerate(text):
        if ch.isspace():
            rep = " "
        else:
            rep = strip_accents(ch).lower().replace("-", " ").replace("—", " ")
        for c in rep:
            if c == " " and out and out[-1] == " ":
                continue  # colapsa espacios sin romper el mapa
            out.append(c)
            mapa.append(i)
    return "".join(out), mapa


def _matching(doc_norm: str, prop_norm: str) -> tuple[float, int, int]:
    """Cobertura de la propuesta y extremos del span en coords normalizadas.

    Los extremos usan solo bloques significativos (≥4 chars): los matches
    triviales ('re', 'de') estirarían el span a mitad de palabra.
    """
    sm = SequenceMatcher(None, prop_norm, doc_norm, autojunk=False)
    blocks = [b for b in sm.get_matching_blocks() if b.size > 0]
    if not blocks:
        return 0.0, 0, 0
    cubierto = sum(b.size for b in blocks)
    cobertura = cubierto / max(1, len(prop_norm))
    sig = [b for b in blocks if b.size >= 4] or blocks
    ini = sig[0].b
    fin = sig[-1].b + sig[-1].size
    return cobertura, ini, fin


_SENT_ENDS = (". ", "? ", "! ", "\n", ".\n")


def _expandir_a_oracion(texto: str, ini: int, fin: int) -> tuple[int, int]:
    """Expande el span hacia atrás/adelante hasta límites de oración
    (o hasta ~300 chars), para que la evidencia sea una cita legible."""
    atras = []
    for p in _SENT_ENDS:
        a = texto.rfind(p, 0, ini)
        if a >= 0 and ini - a < 300:
            atras.append(a + len(p))
    ni = max(atras) if atras else ini
    adelante = []
    for p in _SENT_ENDS:
        a = texto.find(p, fin)
        if a != -1 and a - fin < 300:
            adelante.append(a + 1)
    nf = min(adelante) if adelante else fin
    return ni, nf


def verify_one(propuesta: str, doc_norm: str, mapa: list[int], texto_orig: str) -> dict:
    """Verifica una propuesta; devuelve estado, cobertura y evidencia."""
    pn, _ = _norm_mapped(propuesta)
    if len(pn) < 10:
        return {"estado": "no_verificada", "cobertura": 0.0, "evidencia": ""}

    cobertura, ini, fin = _matching(doc_norm, pn)
    if cobertura < COBERTURA_MIN:
        return {"estado": "no_verificada", "cobertura": round(cobertura, 3), "evidencia": ""}

    span_len = fin - ini
    if span_len > max(COMPACIDAD_MAX * cobertura * len(pn), len(pn) * COMPACIDAD_MAX):
        # matches dispersos: la "cita" uniría trozos lejanos del documento
        return {"estado": "no_verificada", "cobertura": round(cobertura, 3), "evidencia": ""}

    if ini >= len(mapa) or fin - 1 >= len(mapa) or fin == 0:
        return {"estado": "no_verificada", "cobertura": round(cobertura, 3), "evidencia": ""}
    o_ini, o_fin = mapa[ini], mapa[fin - 1] + 1
    # Ajusta a límites de palabra (un bloque puede empezar en 'calibrar'
    # dentro de 're-calibrar'); los guiones cuentan como parte de la palabra.
    es_palabra = lambda c: c.isalnum() or c in "-–—"
    while o_ini > 0 and es_palabra(texto_orig[o_ini - 1]):
        o_ini -= 1
    while o_fin < len(texto_orig) and es_palabra(texto_orig[o_fin]):
        o_fin += 1
    o_ini, o_fin = _expandir_a_oracion(texto_orig, o_ini, o_fin)
    if o_fin - o_ini > EVIDENCIA_MAX_CHARS:
        return {"estado": "no_verificada", "cobertura": round(cobertura, 3), "evidencia": ""}

    evidencia = normalize_text(texto_orig[o_ini:o_fin])
    return {"estado": "literal", "cobertura": round(cobertura, 3), "evidencia": evidencia}


def verify_proposals(docs: list[dict], proposals: pd.DataFrame) -> pd.DataFrame:
    """Enriquece (y corrige) las propuestas con la verificación literal.

    - estado: ``literal`` | ``no_verificada``
    - cobertura: fracción del texto de la propuesta hallada en el fuente
    - evidencia: span literal del documento (solo si ``literal``)

    Las propuestas ``literal`` cuyo span cae en los límites de longitud se
    reescriben al span exacto (auto-corrección a cita textual); después se
    re-deduplica por documento.
    """
    por_doc_texto = {d["doc_id"]: d.get("text") or "" for d in docs}
    filas: list[dict] = []
    lo, hi = III.propuesta_min_chars, III.propuesta_max_chars

    for doc_id, grp in proposals.groupby("doc_id", sort=True):
        texto = por_doc_texto.get(doc_id, "")
        doc_norm, mapa = _norm_mapped(texto)
        nuevos = []
        for _, r in grp.sort_values("idx").iterrows():
            res = verify_one(str(r["text"]), doc_norm, mapa, texto)
            texto_final = str(r["text"])
            if res["estado"] == "literal" and lo <= len(res["evidencia"]) <= hi:
                texto_final = res["evidencia"]  # auto-corrección a cita literal
            nuevos.append({
                "doc_id": doc_id, "idx": int(r["idx"]), "text": texto_final,
                "estado": res["estado"], "cobertura": res["cobertura"],
                "evidencia": res["evidencia"],
            })
        # re-dedup tras la corrección (dos paráfrasis del mismo pasaje
        # colisionan al convertirse en citas literales)
        nuevos.sort(key=lambda x: (x["estado"] != "literal", x["idx"]))
        vistos: set[str] = set()
        for n in nuevos:
            k = proposal_key(n["text"])
            if not k or k in vistos:
                continue
            vistos.add(k)
            filas.append(n)
        logger.info(
            "  verificadas %s: %d literal / %d no verificada",
            doc_id[:55],
            sum(1 for n in nuevos if n["estado"] == "literal"),
            sum(1 for n in nuevos if n["estado"] != "literal"),
        )

    cols = ["doc_id", "idx", "text", "estado", "cobertura", "evidencia"]
    return pd.DataFrame(filas, columns=cols)
