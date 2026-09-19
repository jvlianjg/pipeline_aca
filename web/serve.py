"""Backend Flask del Sistema de Inteligencia ACA.

Sirve los datos reales del pipeline (``data/processed/``) y los datos de
ejemplo (``web/mock/``) como JSON, además de los archivos estáticos del
frontend en ``web/static/``.

Uso::

    python web/serve.py            # → http://localhost:5000
    python -m web.serve            # también funciona

Los datos reales se cargan una sola vez al arrancar (cache en memoria).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from flask import Flask, jsonify, send_from_directory

# Asegurar que la raíz del proyecto está en el path para importar src.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import PDF_DIR, PROCESSED_DIR, III, ICI  # noqa: E402

WEB_DIR = Path(__file__).resolve().parent
STATIC_DIR = WEB_DIR / "static"
MOCK_DIR = WEB_DIR / "mock"

app = Flask(__name__, static_folder=None)


# ────────────────────────────────────────────────────────────
#  Cache de datos reales (cargados al arranque)
# ────────────────────────────────────────────────────────────

_cache: dict = {}

#: Artefactos que alimentan la caché de datos reales: si alguno cambia en
#: disco (p. ej. tras re-ejecutar el pipeline), la caché se invalida sola.
_REAL_FILES = ("documents.parquet", "proposals.parquet", "iii_matrix.npz")


def _real_files_sig() -> tuple:
    sig = []
    for name in _REAL_FILES:
        p = PROCESSED_DIR / name
        sig.append(p.stat().st_mtime_ns if p.exists() else None)
    return tuple(sig)


def _load_real() -> dict:
    """Carga los artefactos reales del pipeline en memoria."""
    docs = pd.read_parquet(PROCESSED_DIR / "documents.parquet")
    props = pd.read_parquet(PROCESSED_DIR / "proposals.parquet")
    npz = np.load(PROCESSED_DIR / "iii_matrix.npz", allow_pickle=True)
    doc_ids = [str(d) for d in npz["doc_ids"]]
    return {
        "docs": docs,
        "props": props,
        "doc_ids": doc_ids,
        "matriz": npz["matriz"],
        "alineacion": npz["alineacion"],
        "coincidencia": npz["coincidencia"],
        "temporalidad": npz["temporalidad"],
        "iii_medio": npz["iii_medio"],
        "_sig": _real_files_sig(),
    }


def _get_real() -> dict:
    if not _cache or _cache["real"].get("_sig") != _real_files_sig():
        _cache["real"] = _load_real()
    return _cache["real"]


def _load_mock(name: str) -> dict:
    path = MOCK_DIR / f"{name}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _doc_filename(doc_id: str) -> str:
    """Resuelve el filename legible de un doc_id."""
    real = _get_real()
    row = real["docs"][real["docs"]["doc_id"] == doc_id]
    if not row.empty:
        return str(row.iloc[0]["filename"])
    return doc_id


# ────────────────────────────────────────────────────────────
#  Endpoints de datos reales
# ────────────────────────────────────────────────────────────

@app.route("/api/documents")
def api_documents():
    """Lista los 29 documentos reales con todos sus campos."""
    real = _get_real()
    docs = real["docs"].copy()
    docs = docs.sort_values("iii_medio", ascending=False)
    return jsonify(docs.to_dict(orient="records"))


@app.route("/api/document/<path:doc_id>")
def api_document(doc_id: str):
    """Detalle de un documento: metadatos + propuestas reales + III medio."""
    real = _get_real()
    row = real["docs"][real["docs"]["doc_id"] == doc_id]
    if row.empty:
        return jsonify({"error": "documento no encontrado"}), 404
    doc = row.iloc[0].to_dict()

    # Propuestas reales del documento.
    props = real["props"][real["props"]["doc_id"] == doc_id].sort_values("idx")
    doc["propuestas"] = props["text"].tolist()

    # III medio (del parquet o de la matriz).
    doc["iii_medio"] = float(doc.get("iii_medio") or 0)
    return jsonify(doc)


@app.route("/api/proposals/<path:doc_id>")
def api_proposals(doc_id):
    """Propuestas reales de un documento, con verificación literal."""
    real = _get_real()
    props = real["props"][real["props"]["doc_id"] == doc_id].sort_values("idx")
    tiene_verificacion = "estado" in props.columns
    propuestas = [
        {
            "text": str(r["text"]),
            "estado": str(r.get("estado", "")) if tiene_verificacion else "",
            "cobertura": float(r.get("cobertura", 0) or 0) if tiene_verificacion else 0.0,
            "evidencia": str(r.get("evidencia", "") or "") if tiene_verificacion else "",
        }
        for _, r in props.iterrows()
    ]
    lit = sum(1 for p in propuestas if p["estado"] == "literal")
    return jsonify({
        "doc_id": doc_id,
        "filename": _doc_filename(doc_id),
        "total": int(len(props)),
        "literales": lit,
        "propuestas": propuestas,
    })


@app.route("/api/policy-link/<path:doc_id>")
def api_policy_link(doc_id):
    """Vínculos reales publicación×política, ordenados por III (desc)."""
    path = PROCESSED_DIR / "policy_links.json"
    if not path.exists():
        return jsonify([])
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return jsonify([])
    por_pol = data.get("links", {}).get(doc_id, {})
    out = []
    for pid, link in sorted(por_pol.items(), key=lambda kv: -kv[1].get("iii", 0)):
        meta = data.get("politicas", {}).get(pid, {})
        out.append({**meta, **link})
    return jsonify(out)


@app.route("/api/ranking")
def api_ranking():
    """Ranking real de documentos por III medio (desc), con metadatos completos."""
    real = _get_real()
    docs = real["docs"].set_index("doc_id")
    doc_ids = real["doc_ids"]
    iii_medio = real["iii_medio"]
    out = []
    for d, v in sorted(zip(doc_ids, iii_medio), key=lambda x: -x[1]):
        row = docs.loc[d] if d in docs.index else None
        out.append({
            "doc_id": d,
            "filename": _doc_filename(d),
            "fecha": str(row["fecha"]) if row is not None else "",
            "n_pages": int(row["n_pages"]) if row is not None else 0,
            "n_propuestas": int(row["n_propuestas"]) if row is not None else 0,
            "iii_medio": float(v),
            "iii_pct": round(float(v) * 100, 1),
        })
    return jsonify(out)


@app.route("/api/matrix/<component>")
def api_matrix(component: str):
    """Matriz III o uno de sus sub-componentes (29×29, real).

    component ∈ {iii, alineacion, coincidencia, temporalidad}.
    """
    real = _get_real()
    key_map = {
        "iii": "matriz",
        "alineacion": "alineacion",
        "coincidencia": "coincidencia",
        "temporalidad": "temporalidad",
    }
    key = key_map.get(component)
    if key is None:
        return jsonify({"error": f"componente inválido: {component}"}), 400

    matrix = real[key]
    doc_ids = real["doc_ids"]
    # Truncar etiquetas para legibilidad del heatmap.
    labels = [_short_label(_doc_filename(d)) for d in doc_ids]
    return jsonify({
        "component": component,
        "doc_ids": doc_ids,
        "labels": labels,
        "matrix": matrix.tolist(),
        "max": float(matrix.max()),
        "mean": float(matrix[matrix > 0].mean()) if (matrix > 0).any() else 0.0,
    })


@app.route("/api/pairs")
def api_pairs():
    """Top pares documento-documentación por III (real), off-diagonal, top N."""
    real = _get_real()
    doc_ids = real["doc_ids"]
    matriz = real["matriz"]
    n = len(doc_ids)
    pairs = []
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            pairs.append({
                "fuente": doc_ids[i],
                "fuente_file": _doc_filename(doc_ids[i]),
                "blanco": doc_ids[j],
                "blanco_file": _doc_filename(doc_ids[j]),
                "iii": float(matriz[i, j]),
            })
    pairs.sort(key=lambda p: -p["iii"])
    return jsonify(pairs[:20])


# ────────────────────────────────────────────────────────────
#  Endpoints de datos de ejemplo (mock)
# ────────────────────────────────────────────────────────────

@app.route("/api/overview")
def api_overview():
    return jsonify(_load_mock("overview"))


@app.route("/api/iii-evolution")
def api_iii_evolution():
    ts = _load_mock("time_series")
    return jsonify({
        "months": ts["months"],
        "values": ts["iii"],
    })


@app.route("/api/ici-channels")
def api_ici_channels():
    ts = _load_mock("time_series")
    return jsonify({
        "months": ts["months"],
        "ici_politico": ts["ici_politico"],
        "ici_medios": ts["ici_medios"],
    })


@app.route("/api/topics")
def api_topics():
    return jsonify(_load_mock("topics"))


@app.route("/api/influence-distribution")
def api_influence_distribution():
    overview = _load_mock("overview")
    return jsonify({
        "politico": overview["pct_politico"],
        "medios": overview["pct_medios"],
        "n_interacciones": overview["n_interacciones"],
    })


@app.route("/api/recent-matches")
def api_recent_matches():
    return jsonify(_load_mock("policies"))


@app.route("/api/ici-results")
def api_ici_results():
    return jsonify(_load_mock("ici_results"))


@app.route("/api/ici-records")
def api_ici_records():
    return jsonify(_load_mock("ici_records"))


@app.route("/api/catalogos")
def api_catalogos():
    """Catálogos: autores reales (metadatos PDF) e instituciones del plan ICI."""
    return jsonify(_load_mock("catalogos"))


@app.route("/api/config")
def api_config():
    """Parámetros operativos del sistema (reales)."""
    return jsonify({
        "iii": {
            "w_alineacion": III.w_alineacion,
            "w_coincidencia": III.w_coincidencia,
            "w_temporalidad": III.w_temporalidad,
            "ventana_meses": III.ventana_meses,
            "temporalidad_asimetrica": III.temporalidad_asimetrica,
        },
        "ici": {
            "alpha_politico": ICI.alpha_politico,
            "alpha_medios": round(1 - ICI.alpha_politico, 2),
        },
        "embedding_model": "paraphrase-multilingual-MiniLM-L12-v2",
        "embedding_dim": 384,
        "n_docs": len(_get_real()["doc_ids"]),
    })


# ────────────────────────────────────────────────────────────
#  Servir el frontend estático y los PDFs del corpus
# ────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename: str):
    return send_from_directory(STATIC_DIR, filename)


@app.route("/pdf/<path:filename>")
def pdf_file(filename: str):
    """PDFs originales del corpus, para revisar propuestas lado a lado."""
    return send_from_directory(PDF_DIR, filename)


# ────────────────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────────────────

def _short_label(filename: str, maxlen: int = 28) -> str:
    """Acorta un filename para etiquetas de heatmap."""
    name = filename.replace(".pdf", "").replace("_", " ")
    if len(name) > maxlen:
        name = name[: maxlen - 1] + "…"
    return name


# ────────────────────────────────────────────────────────────
#  Arranque
# ────────────────────────────────────────────────────────────

def main() -> None:
    # Precargar datos reales para validar que todo está en orden.
    real = _get_real()
    print(f"ACA Intelligence System · backend listo")
    print(f"  Documentos reales cargados: {len(real['doc_ids'])}")
    print(f"  Propuestas reales:          {len(real['props'])}")
    print(f"  Datos de ejemplo en:        {MOCK_DIR}")
    print()
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()
