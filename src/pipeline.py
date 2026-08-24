"""Pipeline end-to-end: PDFs → texto → propuestas → embeddings → matriz III.

Uso:
    python -m src.pipeline            # procesa los 30 PDFs y guarda artefactos
    python -m src.pipeline --force    # ignora caché y reprocesa todo

Artefactos generados en data/processed/:
    - documents.parquet     (metadatos por documento)
    - proposals.parquet     (propuestas por documento)
    - iii_matrix.npz        (matriz III + componentes)
    - embeddings_doc.npy    (embeddings de documento)
    - embeddings_prop.npz   (embeddings de propuestas, por doc)
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd

# Permite ejecutar como script (python -m src.pipeline) o directamente.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import INTERIM_DIR, PDF_DIR, PROCESSED_DIR
from src.extraction.pdf_text import extract_document
from src.extraction.proposals import extract_proposals
from src.indexing.iii import DocEmbeddings, compute_iii_matrix, mean_iii_per_doc
from src.llm.base import get_embedder
from src.utils import logger, representative_chunks


# ────────────────────────────────────────────────────────────
#  Etapa 1: extracción (con caché en data/interim)
# ────────────────────────────────────────────────────────────


def _interim_path(doc_id: str) -> Path:
    return INTERIM_DIR / f"{doc_id}.json"


def _load_or_extract(pdf_path: Path, force: bool = False) -> dict:
    doc_id = pdf_path.stem
    cache = _interim_path(doc_id)
    if cache.exists() and not force:
        with cache.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    doc = extract_document(pdf_path)
    payload = {
        "doc_id": doc.doc_id,
        "filename": doc.filename,
        "text": doc.text,
        "n_pages": doc.n_pages,
        "fecha": doc.fecha.isoformat() if doc.fecha else None,
        "fecha_origen": doc.fecha_origen,
        "raw_meta": doc.raw_meta,
    }
    with cache.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)
    logger.info("  → texto cacheado en %s", cache.name)
    return payload


def stage_extract(force: bool = False) -> list[dict]:
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    logger.info("Etapa 1 — Extracción: %d PDFs", len(pdfs))
    docs: list[dict] = []
    for p in pdfs:
        try:
            docs.append(_load_or_extract(p, force))
        except Exception as exc:  # noqa: BLE001
            logger.error("Fallo extrayendo %s: %s", p.name, exc)
    logger.info("  → %d/%d documentos extraídos", len(docs), len(pdfs))
    return docs


# ────────────────────────────────────────────────────────────
#  Etapa 2: propuestas
# ────────────────────────────────────────────────────────────


def stage_proposals(docs: list[dict]) -> pd.DataFrame:
    logger.info("Etapa 2 — Extracción de propuestas")
    rows: list[dict] = []
    for d in docs:
        props = extract_proposals(d["doc_id"], d["text"])
        for p in props:
            rows.append({"doc_id": p.doc_id, "idx": p.idx, "text": p.text})
    df = pd.DataFrame(rows, columns=["doc_id", "idx", "text"])
    logger.info("  → %d propuestas en total (%.1f por documento)",
                len(df), len(df) / max(1, len(docs)))
    return df


# ────────────────────────────────────────────────────────────
#  Etapa 2c: verificación literal (local, determinista)
# ────────────────────────────────────────────────────────────


def stage_verify(docs: list[dict], proposals: pd.DataFrame) -> pd.DataFrame:
    """Compuerta de verificación: cada propuesta se alinea contra el texto
    fuente; las que calzan se corrigen a cita literal y el resto queda
    marcada ``no_verificada`` (probable síntesis del modelo)."""
    if proposals.empty:
        return proposals
    logger.info("Etapa 2c — Verificación literal de propuestas")
    from .extraction.verify import verify_proposals

    out = verify_proposals(docs, proposals)
    lit = int((out["estado"] == "literal").sum())
    logger.info("  → %d/%d propuestas son texto literal del documento (%.0f%%)",
                lit, len(out), lit / max(1, len(out)) * 100)
    return out


# ────────────────────────────────────────────────────────────
#  Etapa 3: embeddings
# ────────────────────────────────────────────────────────────


def stage_embeddings(docs: list[dict], proposals: pd.DataFrame) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    logger.info("Etapa 3 — Embeddings")
    embedder = get_embedder()

    # Embedding de documento: promedio de fragmentos muestreados a lo largo
    # del texto completo (el modelo trunca a ~128 tokens, de modo que usar
    # solo el inicio capturaba portada/índice en vez del contenido sustantivo).
    chunk_lists = [representative_chunks(d["text"] or "") for d in docs]
    sizes = [len(cl) for cl in chunk_lists]
    flat = [c for cl in chunk_lists for c in cl]
    vecs = (
        embedder.embed(flat)
        if flat
        else np.zeros((0, embedder.dim or 384), dtype=np.float32)
    )
    dim = vecs.shape[1] if vecs.size else (embedder.dim or 384)
    emb_doc = np.zeros((len(docs), dim), dtype=np.float32)
    ofs = 0
    for i, k in enumerate(sizes):
        if k:
            emb_doc[i] = vecs[ofs : ofs + k].mean(axis=0)
            ofs += k
    # Renormaliza el promedio de fragmentos a norma L2 = 1.
    norms = np.linalg.norm(emb_doc, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    emb_doc = emb_doc / norms
    logger.info(
        "  → embeddings de documento: %s (media de %.1f fragmentos por doc)",
        emb_doc.shape,
        sum(sizes) / max(1, len(sizes)),
    )

    # Embeddings de propuestas, agrupados por doc_id.
    emb_prop_by_doc: dict[str, np.ndarray] = {}
    for doc_id, grp in proposals.groupby("doc_id"):
        vecs = embedder.embed(grp["text"].tolist())
        emb_prop_by_doc[doc_id] = vecs
    logger.info("  → embeddings de propuestas para %d documentos", len(emb_prop_by_doc))
    return emb_doc, emb_prop_by_doc


# ────────────────────────────────────────────────────────────
#  Etapa 4: matriz III
# ────────────────────────────────────────────────────────────


def _parse_fecha(s: str | None):
    from datetime import date
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def stage_iii(docs: list[dict], emb_doc: np.ndarray, emb_prop_by_doc: dict[str, np.ndarray]):
    logger.info("Etapa 4 — Matriz III")
    doc_embs: list[DocEmbeddings] = []
    for i, d in enumerate(docs):
        doc_embs.append(
            DocEmbeddings(
                doc_id=d["doc_id"],
                fecha=_parse_fecha(d["fecha"]),
                emb_doc=emb_doc[i : i + 1],
                emb_prop=emb_prop_by_doc.get(d["doc_id"], np.zeros((0, emb_doc.shape[1]), dtype=np.float32)),
            )
        )
    matriz, comps = compute_iii_matrix(doc_embs)
    means = mean_iii_per_doc(matriz)
    logger.info("  → III medio por doc: min=%.3f max=%.3f", float(means.min()), float(means.max()))
    return matriz, comps, means


# ────────────────────────────────────────────────────────────
#  Persistencia
# ────────────────────────────────────────────────────────────


def _save_artifacts(
    docs: list[dict],
    proposals: pd.DataFrame,
    emb_doc: np.ndarray,
    emb_prop_by_doc: dict[str, np.ndarray],
    matriz: np.ndarray,
    comps: dict[str, np.ndarray],
    means: np.ndarray,
) -> None:
    logger.info("Guardando artefactos en %s", PROCESSED_DIR)

    # Metadatos de documentos.
    meta = pd.DataFrame(
        [
            {
                "doc_id": d["doc_id"],
                "filename": d["filename"],
                "n_pages": d["n_pages"],
                "fecha": d["fecha"],
                "fecha_origen": d["fecha_origen"],
                "n_chars": len(d["text"] or ""),
            }
            for d in docs
        ]
    )
    # Añade número de propuestas y III medio.
    counts = proposals.groupby("doc_id").size().rename("n_propuestas")
    meta = meta.merge(counts, left_on="doc_id", right_index=True, how="left")
    meta["n_propuestas"] = meta["n_propuestas"].fillna(0).astype(int)
    iii_series = pd.Series(means, index=[d["doc_id"] for d in docs], name="iii_medio")
    meta = meta.merge(iii_series, left_on="doc_id", right_index=True, how="left")
    meta = meta.sort_values("iii_medio", ascending=False).reset_index(drop=True)
    meta.to_parquet(PROCESSED_DIR / "documents.parquet", index=False)

    # Propuestas.
    proposals.to_parquet(PROCESSED_DIR / "proposals.parquet", index=False)

    # Embeddings de documento.
    np.save(PROCESSED_DIR / "embeddings_doc.npy", emb_doc)

    # Embeddings de propuestas por documento (dict -> npz con claves doc_id).
    np.savez(PROCESSED_DIR / "embeddings_prop.npz", **emb_prop_by_doc)

    # Matriz III con índices de doc_id. Se guardan también las escalas
    # crudas (min, max) usadas por el reescalado empírico, para auditoría.
    doc_ids = np.array([d["doc_id"] for d in docs])
    np.savez(
        PROCESSED_DIR / "iii_matrix.npz",
        doc_ids=doc_ids,
        matriz=matriz,
        alineacion=comps["alineacion"],
        coincidencia=comps["coincidencia"],
        temporalidad=comps["temporalidad"],
        escala_alineacion=comps["escala_alineacion"],
        escala_coincidencia=comps["escala_coincidencia"],
        iii_medio=means,
    )
    logger.info("  → artefactos guardados (documents, proposals, embeddings, iii_matrix)")


# ────────────────────────────────────────────────────────────
#  Orquestación
# ────────────────────────────────────────────────────────────


def run(force: bool = False) -> None:
    logger.info("=== Pipeline ACA — Medición del Impacto de Ideas ===")
    docs = stage_extract(force=force)
    if not docs:
        logger.error("No se extrajo ningún documento. Aborta.")
        return
    proposals = stage_proposals(docs)
    proposals = stage_verify(docs, proposals)
    emb_doc, emb_prop_by_doc = stage_embeddings(docs, proposals)
    matriz, comps, means = stage_iii(docs, emb_doc, emb_prop_by_doc)
    _save_artifacts(docs, proposals, emb_doc, emb_prop_by_doc, matriz, comps, means)
    logger.info("=== Pipeline completado ===")


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline ACA de medición de impacto")
    parser.add_argument("--force", action="store_true", help="Ignora caché y reprocesa")
    args = parser.parse_args()
    run(force=args.force)


if __name__ == "__main__":
    main()
