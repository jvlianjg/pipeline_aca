"""III publicación×política con escala empírica del corpus de publicaciones.

Los cosenos crudos del modelo de embeddings tienen un piso alto (dos textos
cualquiera puntúan ~0.5-0.7), igual que ocurría en la matriz pub×pub antes
del reescalado v1.1. Aquí se aplica la misma medicina: la alineación y la
coincidencia crudas contra la política se reescalan con los extremos
empíricos (min, max fuera de diagonal) guardados en ``iii_matrix.npz`` —
la pregunta que responde el valor es "¿cuán parecida es esta publicación a
la política, en la escala en que dos publicaciones del ACA se parecen entre
sí?".

La temporalidad no se reescala: ya es 0-1 por diseño (ventana de 36 meses,
asimétrica: política anterior a la publicación ⇒ 0).
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

from ..config import PROCESSED_DIR, III
from ..utils import logger, representative_chunks

#: Metadatos de las políticas procesadas (por ahora, el piloto NDC).
POLICIAS_META: dict[str, dict] = {
    "CND-2025-2035": {
        "nombre": "Contribución Nacionalmente Determinada 2025-2035",
        "institucion": "MINAE · Dirección de Cambio Climático",
        "fecha": "2025-11-14",
        "tipo": "NDC ante la CMNUCC",
        "pdf": "CND-2025-2035_NDC_CostaRica_MINAE.pdf",
        "umbral_evidencia": 0.55,
    }
}


def _rescale(x: float, extremos) -> float:
    lo, hi = float(extremos[0]), float(extremos[1])
    if hi - lo < 1e-9:
        return 0.0
    return float(np.clip((x - lo) / (hi - lo), 0.0, 1.0))


def _policy_doc_embedding(policy_id: str) -> np.ndarray:
    import fitz  # PyMuPDF

    from ..llm.base import get_embedder

    meta = POLICIAS_META[policy_id]
    pdf = fitz.open(f"pdfs_politicas/{meta['pdf']}")
    texto = "\n".join(pg.get_text() for pg in pdf)
    vec = get_embedder().embed(representative_chunks(texto)).mean(axis=0)
    return vec / np.linalg.norm(vec)


def compute_policy_links(policy_id: str = "CND-2025-2035",
                         n_evidencia: int = 3) -> dict:
    """Calcula el III de cada publicación contra una política y guarda
    ``data/processed/policy_links.json`` con componentes reescalados y
    pares de evidencia (propuesta ACA ↔ medida de la política)."""
    meta = POLICIAS_META[policy_id]
    fecha_pol = pd.Timestamp(meta["fecha"])
    umbral = meta["umbral_evidencia"]

    npz = np.load(PROCESSED_DIR / "iii_matrix.npz", allow_pickle=True)
    doc_ids = [str(d) for d in npz["doc_ids"]]  # orden real de embeddings/filas
    esc_ali = npz["escala_alineacion"]
    esc_coin = npz["escala_coincidencia"]
    emb_doc = np.load(PROCESSED_DIR / "embeddings_doc.npy")
    prop = np.load(PROCESSED_DIR / "embeddings_prop.npz")

    docs = pd.read_parquet(PROCESSED_DIR / "documents.parquet")
    fechas = {r.doc_id: pd.Timestamp(r.fecha) for _, r in docs.iterrows()}
    textos = {
        d: g.sort_values("idx")["text"].tolist()
        for d, g in pd.read_parquet(PROCESSED_DIR / "proposals.parquet").groupby("doc_id")
    }
    medidas = pd.read_parquet(PROCESSED_DIR / "policy_measures.parquet")
    from ..llm.base import get_embedder

    med_emb = get_embedder().embed(medidas["text"].tolist())
    pol_doc = _policy_doc_embedding(policy_id)

    links: dict[str, dict] = {}
    for i, d in enumerate(doc_ids):
        if d not in prop.files or not len(prop[d]) or d not in fechas:
            continue
        sims = prop[d] @ med_emb.T           # (n_prop, n_medidas)
        coin_raw = float(sims.max(axis=1).mean())
        ali_raw = float(emb_doc[i] @ pol_doc)
        meses = (fecha_pol - fechas[d]).days / 30.44
        temp = max(0.0, 1 - meses / III.ventana_meses) if meses > 0 else 0.0

        ali = _rescale(ali_raw, esc_ali)
        coin = _rescale(coin_raw, esc_coin)
        links[d] = {
            "politica": policy_id,
            "meses": round(meses, 1),
            "alineacion": round(ali, 3),
            "coincidencia": round(coin, 3),
            "temporalidad": round(temp, 3),
            "iii": round((ali + coin + temp) / 3, 3),
            "evidencia": [],
        }
        # Pares de evidencia: la mejor medida por propuesta, sin repetir medida.
        mejor_med_por_prop = sims.argmax(axis=1)
        orden = np.argsort(-sims.max(axis=1))
        usadas: set[int] = set()
        for pi in orden:
            mj = int(mejor_med_por_prop[pi])
            if mj in usadas or sims[pi, mj] < umbral:
                continue
            usadas.add(mj)
            links[d]["evidencia"].append({
                "aca": textos[d][int(pi)],
                "politica": str(medidas.iloc[mj]["text"]),
                "cos": round(float(sims[pi, mj]), 2),
            })
            if len(links[d]["evidencia"]) >= n_evidencia:
                break

    payload = {
        "politicas": POLICIAS_META,
        "links": links,
    }
    out = PROCESSED_DIR / "policy_links.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    top = sorted(links.items(), key=lambda kv: -kv[1]["iii"])[:5]
    logger.info("III publicación×política (%s): %s", policy_id,
                ", ".join(f"{d[:30]}={v['iii']:.2f}" for d, v in top))
    return payload
