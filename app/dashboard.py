"""Dashboard interactivo (Streamlit) — Medición del Impacto de Ideas (ACA).

Lanzar:
    streamlit run app/dashboard.py

Requiere que el pipeline ya se haya ejecutado (artefactos en data/processed/).
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# Asegura imports del paquete src al ejecutar desde app/.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import PROCESSED_DIR  # noqa: E402


# ────────────────────────────────────────────────────────────
#  Carga de artefactos (con caché de Streamlit)
# ────────────────────────────────────────────────────────────


@st.cache_data
def load_artifacts():
    docs = pd.read_parquet(PROCESSED_DIR / "documents.parquet")
    props = pd.read_parquet(PROCESSED_DIR / "proposals.parquet")
    # np.load devuelve un NpzFile (con BufferedReader) que no es serializable
    # para la caché de Streamlit; extraemos los arrays a un dict simple.
    with np.load(PROCESSED_DIR / "iii_matrix.npz", allow_pickle=True) as npz:
        iii = {k: npz[k] for k in npz.files}
    emb_doc = np.load(PROCESSED_DIR / "embeddings_doc.npy")
    return docs, props, iii, emb_doc


def _check_artifacts() -> bool:
    needed = ["documents.parquet", "proposals.parquet", "iii_matrix.npz", "embeddings_doc.npy"]
    return all((PROCESSED_DIR / n).exists() for n in needed)


# ────────────────────────────────────────────────────────────
#  Configuración de página
# ────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="ACA · Impacto de Ideas",
    page_icon="📊",
    layout="wide",
)


def main() -> None:
    st.title("📊 Medición del Impacto de Ideas en Políticas Públicas")
    st.caption("Academia de Centroamérica · Prototipo III / ICI")

    if not _check_artifacts():
        st.warning(
            "No se encontraron los artefactos del pipeline en `data/processed/`.\n\n"
            "Ejecuta primero el pipeline:\n\n"
            "```\npython -m src.pipeline\n```"
        )
        return

    global iii_npz_global
    docs, props, iii_npz_global, _ = load_artifacts()
    iii_npz = iii_npz_global

    doc_ids = list(iii_npz["doc_ids"])
    matriz = iii_npz["matriz"]
    iii_medio = iii_npz["iii_medio"]

    # Sidebar: navegación.
    st.sidebar.title("Navegación")
    vista = st.sidebar.radio(
        "Vistas",
        ["Resumen", "Ranking III", "Matriz de similitud", "Explorador de propuestas", "Metodología", "ICI (próximamente)"],
    )

    if vista == "Resumen":
        view_resumen(docs, props)
    elif vista == "Ranking III":
        view_ranking(docs, matriz, doc_ids, iii_medio)
    elif vista == "Matriz de similitud":
        view_matriz(matriz, doc_ids, docs)
    elif vista == "Explorador de propuestas":
        view_propuestas(props, docs, doc_ids)
    elif vista == "Metodología":
        view_metodologia()
    elif vista == "ICI (próximamente)":
        view_ici(docs)


# ────────────────────────────────────────────────────────────
#  Vista: Resumen
# ────────────────────────────────────────────────────────────


def view_resumen(docs: pd.DataFrame, props: pd.DataFrame) -> None:
    st.header("Resumen del corpus")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Publicaciones", len(docs))
    c2.metric("Páginas (total)", int(docs["n_pages"].sum()))
    c3.metric("Propuestas extraídas", len(props))
    c4.metric("Ventana temporal", "36 meses")

    st.subheader("Publicaciones procesadas")
    show = docs.copy()
    show["fecha"] = show["fecha"].fillna("—")
    st.dataframe(
        show[["filename", "fecha", "fecha_origen", "n_pages", "n_chars", "n_propuestas", "iii_medio"]],
        width="stretch",
        hide_index=True,
        column_config={
            "iii_medio": st.column_config.ProgressColumn(
                "III medio", help="Potencial de influencia medio (0–1)", format="%.3f", min_value=0, max_value=1
            ),
            "filename": "Archivo",
            "fecha": "Fecha",
            "fecha_origen": "Origen fecha",
            "n_pages": "Páginas",
            "n_chars": "Caracteres",
            "n_propuestas": "Propuestas",
        },
    )


# ────────────────────────────────────────────────────────────
#  Vista: Ranking III
# ────────────────────────────────────────────────────────────


def view_ranking(docs: pd.DataFrame, matriz: np.ndarray, doc_ids: list[str], iii_medio: np.ndarray) -> None:
    st.header("Ranking de Impacto de Ideas (III)")

    st.markdown(
        "El **III medio** resume el potencial de influencia de cada publicación "
        "sobre el resto del corpus (excluyendo la diagonal). Mayor = mayor "
        "potencial de difusión temática/propuestas."
    )

    ranking = (
        docs.set_index("doc_id")
        .reindex(doc_ids)
        .reset_index()
        .assign(iii_medio=iii_medio)
        .sort_values("iii_medio", ascending=False)
    )

    fig = px.bar(
        ranking,
        x="iii_medio",
        y="filename",
        orientation="h",
        color="iii_medio",
        color_continuous_scale="Viridis",
        labels={"iii_medio": "III medio", "filename": ""},
        height=max(400, 28 * len(ranking)),
    )
    fig.update_layout(yaxis={"categoryorder": "total ascending"}, coloraxis_showscale=False)
    st.plotly_chart(fig, width="stretch")

    st.subheader("Top pares por impacto potencial")
    # Top-N pares (i → j) de la matriz, excluyendo diagonal.
    n = matriz.shape[0]
    pairs = []
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            pairs.append((doc_ids[i], doc_ids[j], float(matriz[i, j])))
    pairs_df = pd.DataFrame(pairs, columns=["fuente", "blanco", "iii"])
    pairs_df = pairs_df.sort_values("iii", ascending=False).head(15)
    name_map = docs.set_index("doc_id")["filename"].to_dict()
    pairs_df["fuente"] = pairs_df["fuente"].map(name_map)
    pairs_df["blanco"] = pairs_df["blanco"].map(name_map)
    st.dataframe(pairs_df, width="stretch", hide_index=True)


# ────────────────────────────────────────────────────────────
#  Vista: Matriz de similitud
# ────────────────────────────────────────────────────────────


def view_matriz(matriz: np.ndarray, doc_ids: list[str], docs: pd.DataFrame) -> None:
    st.header("Matriz de similitud publicación-publicación")

    componente = st.radio(
        "Componente a mostrar",
        ["III", "Alineación", "Coincidencia", "Temporalidad"],
        horizontal=True,
    )
    key = {"III": "matriz", "Alineación": "alineacion",
           "Coincidencia": "coincidencia", "Temporalidad": "temporalidad"}[componente]
    data = iii_npz_global[key]

    name_map = docs.set_index("doc_id")["filename"].to_dict()
    labels = [name_map.get(d, d)[:30] for d in doc_ids]

    fig = go.Figure(
        data=go.Heatmap(
            z=data,
            x=labels,
            y=labels,
            colorscale="Viridis",
            zmin=0,
            zmax=float(data.max()) if data.size else 1,
            hovertemplate="Fuente: %{y}<br>Blanco: %{x}<br>Valor: %{z:.3f}<extra></extra>",
        )
    )
    fig.update_layout(height=700, margin=dict(l=20, r=20, t=20, b=20))
    st.plotly_chart(fig, width="stretch")


# ────────────────────────────────────────────────────────────
#  Vista: Explorador de propuestas
# ────────────────────────────────────────────────────────────


def view_propuestas(props: pd.DataFrame, docs: pd.DataFrame, doc_ids: list[str]) -> None:
    st.header("Explorador de propuestas")

    col1, col2 = st.columns(2)
    with col1:
        sel_doc = st.selectbox("Publicación", options=docs["filename"].tolist(), index=0)
    doc_id = docs.loc[docs["filename"] == sel_doc, "doc_id"].iloc[0]
    sub = props[props["doc_id"] == doc_id].sort_values("idx")

    st.caption(f"{len(sub)} propuestas en **{sel_doc}**")
    if sub.empty:
        st.info("No se extrajeron propuestas para esta publicación.")
        return

    # Buscador de texto.
    q = st.text_input("Filtrar por texto", "")
    show = sub.copy()
    if q.strip():
        show = show[show["text"].str.contains(q, case=False, na=False)]

    for _, row in show.iterrows():
        st.markdown(f"- {row['text']}")

    # Propuesta más característica (mayor coincidencia media con otras propuestas).
    st.subheader("Propuesta de mayor coincidencia global")
    st.caption("Calculada sobre la matriz de coincidencia de propuestas (componente del III).")


# ────────────────────────────────────────────────────────────
#  Vista: Metodología
# ────────────────────────────────────────────────────────────


def view_metodologia() -> None:
    st.header("Metodología")
    st.markdown(
        """
**Índice de Impacto de Ideas (III)** — potencial de influencia de una publicación sobre un blanco:

```
III(f,b) = 1/3·Alineación + 1/3·Coincidencia + 1/3·Temporalidad
```

- **Alineación temática:** similitud coseno entre el documento fuente y el blanco (embedding promedio de fragmentos de todo el cuerpo), reescalada de forma empírica (min-max dentro del corpus).
- **Coincidencia de propuestas:** media de los máximos de similitud entre las propuestas de la fuente y las del blanco (mismo reescalado empírico).
- **Temporalidad:** decaimiento lineal dentro de una ventana de **36 meses**; **asimétrica**: si el blanco es anterior a la fuente, es 0 (influencia imposible).

**Índice de Canales de Influencia (ICI)** — evidencia observable:

```
ICI = 0.6·ICI‑Político + 0.4·ICI‑Medios
```

- **ICI‑Político:** participación en audiencias, citación en documentos oficiales, uso en informes técnicos.
- **ICI‑Medios:** menciones en medios de comunicación, aparición en espacios de opinión.

> ⚠️ **Alcance del prototipo:** como hoy solo se dispone de los 30 PDFs de ACA, el III se calcula entre publicaciones (validación de la maquinaria). El ICI está especificado pero a la espera de fuentes externas (actas, documentos oficiales, medios). Consulta `docs/metodologia.md` para el detalle completo.
"""
    )


# ────────────────────────────────────────────────────────────
#  Vista: ICI (placeholder)
# ────────────────────────────────────────────────────────────


def view_ici(docs: pd.DataFrame) -> None:
    st.header("Índice de Canales de Influencia (ICI)")
    st.info(
        "El ICI requiere fuentes externas que aún no se han recolectado: "
        "actas legislativas, documentos oficiales (BCCR, Hacienda, ministerios), "
        "informes técnicos y menciones en medios.\n\n"
        "El módulo `src/indexing/ici.py` está **completo y testeado con datos sintéticos**. "
        "Al inyectar registros reales (`ICIPoliticoRecord` / `ICIMediosRecord`), "
        "el índice se calcula sin cambios de código."
    )
    st.markdown(
        "**Plan de recolección (fase siguiente):**\n"
        "1. *Político:* proyectos de ley y dictámenes de la Asamblea Legislativa; "
        "informes del BCCR, Hacienda y CGR.\n"
        "2. *Medios:* hemerotecas digitales y APIs de medios costarricenses.\n"
        "3. *Formato:* un CSV/JSON por señal con `(doc_id, fecha, fuente, intensidad)`."
    )
    st.dataframe(docs[["filename", "doc_id"]], width="stretch", hide_index=True)


# Mantiene una referencia global al npz para que view_matriz no recargue.
iii_npz_global = None


if __name__ == "__main__":
    main()
