"""Índice de Impacto de Ideas (III).

Implementa la fórmula definida en docs/metodologia.md:

    III(f,b) = w1·Alineación + w2·Coincidencia + w3·Temporalidad

Todas las funciones están vectorizadas con NumPy. El cálculo es simétrico
respecto al par (f, b) salvo por la temporalidad, que puede ser asimétrica.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import numpy as np

from ..config import III as IIIConfig
from ..config import III
from ..utils import logger, months_between, safe_date


# ────────────────────────────────────────────────────────────
#  Helpers numéricos
# ────────────────────────────────────────────────────────────


def cosine_to_01(cos_value: float | np.ndarray) -> float | np.ndarray:
    """Reescala la similitud coseno [-1, 1] al rango [0, 1]."""
    return (np.asarray(cos_value, dtype=np.float32) + 1.0) / 2.0


def _safe_unit(v: np.ndarray) -> np.ndarray:
    """Normaliza filas a norma L2 = 1 (defensivo: el embedder ya normaliza)."""
    if v.ndim != 2:
        return v
    norms = np.linalg.norm(v, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return v / norms


# ────────────────────────────────────────────────────────────
#  Componentes del III
# ────────────────────────────────────────────────────────────


def alineacion_tematica(emb_f: np.ndarray, emb_b: np.ndarray) -> float:
    """Similitud coseno entre el embedding de documento fuente y blanco.

    Recibe embeddings de documento (uno por cada parte). Si hay varios
    vectores por documento (p. ej. por fragmentos), se promedian antes.
    """
    vf = _doc_vector(emb_f)
    vb = _doc_vector(emb_b)
    if vf is None or vb is None:
        return 0.0
    cos = float(np.dot(vf, vb))
    return float(cosine_to_01(cos))


def coincidencia_propuestas(
    emb_prop_f: np.ndarray, emb_prop_b: np.ndarray
) -> float:
    """Media de los máximos: para cada propuesta de f, su mejor coincidencia en b.

    Implementa la agregación descrita en metodología.md §2.3.
    """
    if emb_prop_f.size == 0 or emb_prop_b.size == 0:
        return 0.0
    pf = _safe_unit(emb_prop_f)
    pb = _safe_unit(emb_prop_b)
    # Matriz de similitud (n_f, n_b) coseno = producto escalar (ya normalizados).
    sim = pf @ pb.T  # en [-1, 1]
    # Mejor coincidencia por propuesta de f.
    best_per_f = sim.max(axis=1) if pb.shape[0] else np.zeros(pf.shape[0])
    # Reescala a [0,1] y promedia.
    return float(np.mean(cosine_to_01(best_per_f)))


def temporalidad(
    fecha_f: date | None, fecha_b: date | None, ventana_meses: int | None = None
) -> float:
    """Decaimiento lineal dentro de la ventana W (36 meses por defecto).

    Devuelve 0 si alguna fecha falta o la distancia excede la ventana.
    """
    f, b = safe_date(fecha_f), safe_date(fecha_b)
    if f is None or b is None:
        return 0.0
    W = ventana_meses if ventana_meses is not None else III.ventana_meses
    delta = abs(months_between(f, b))
    if delta > W:
        return 0.0
    return max(0.0, 1.0 - delta / W)


def compute_iii(
    *,
    emb_doc_f: np.ndarray,
    emb_doc_b: np.ndarray,
    emb_prop_f: np.ndarray,
    emb_prop_b: np.ndarray,
    fecha_f: date | None,
    fecha_b: date | None,
    config: IIIConfig | None = None,
) -> tuple[float, dict]:
    """Calcula el III de una fuente sobre un blanco.

    Devuelve (iii, descomposición) donde la descomposición contiene cada
    componente por separado para inspección/dashboard.
    """
    cfg = config or III
    ali = alineacion_tematica(emb_doc_f, emb_doc_b)
    coin = coincidencia_propuestas(emb_prop_f, emb_prop_b)
    temp = temporalidad(fecha_f, fecha_b, cfg.ventana_meses)
    iii = (
        cfg.w_alineacion * ali
        + cfg.w_coincidencia * coin
        + cfg.w_temporalidad * temp
    )
    return float(iii), {
        "alineacion": ali,
        "coincidencia": coin,
        "temporalidad": temp,
    }


def _doc_vector(emb: np.ndarray) -> np.ndarray | None:
    """Convierte uno o varios vectores de documento en un vector unitario único."""
    if emb is None or emb.size == 0:
        return None
    v = emb.reshape(-1) if emb.ndim == 1 else emb.mean(axis=0)
    return _safe_unit(v.reshape(1, -1))[0]


# ────────────────────────────────────────────────────────────
#  Matriz III sobre un conjunto de documentos
# ────────────────────────────────────────────────────────────


@dataclass
class DocEmbeddings:
    """Embalses precomputados de un documento para el cálculo del III."""

    doc_id: str
    fecha: date | None
    emb_doc: np.ndarray  # vector de documento (1, d)
    emb_prop: np.ndarray  # matriz de propuestas (k, d) o (0, d)


def compute_iii_matrix(docs: list[DocEmbeddings], config: IIIConfig | None = None) -> tuple[np.ndarray, dict]:
    """Calcula la matriz III (n×n) sobre una lista de documentos.

    Devuelve (matriz_iii, descomposiciones) donde `descomposiciones` es un
    dict con matrices por componente: alineacion, coincidencia, temporalidad.
    La diagonal se anula.
    """
    cfg = config or III
    n = len(docs)
    M = np.zeros((n, n), dtype=np.float32)
    A = np.zeros_like(M)
    C = np.zeros_like(M)
    T = np.zeros_like(M)

    # Pre-normaliza vectores de documento una sola vez.
    doc_vecs = np.vstack([_doc_vector(d.emb_doc) for d in docs])  # (n, dim)

    for i, fi in enumerate(docs):
        for j, bj in enumerate(docs):
            if i == j:
                continue
            a = float(cosine_to_01(np.dot(doc_vecs[i], doc_vecs[j])))
            c = coincidencia_propuestas(fi.emb_prop, bj.emb_prop)
            t = temporalidad(fi.fecha, bj.fecha, cfg.ventana_meses)
            A[i, j] = a
            C[i, j] = c
            T[i, j] = t
            M[i, j] = cfg.w_alineacion * a + cfg.w_coincidencia * c + cfg.w_temporalidad * t

    logger.info("Matriz III calculada: %dx%d", n, n)
    return M, {"alineacion": A, "coincidencia": C, "temporalidad": T}


def mean_iii_per_doc(matriz: np.ndarray) -> np.ndarray:
    """III medio por fila (excluyendo la diagonal). Sirve para ranking."""
    n = matriz.shape[0]
    if n <= 1:
        return np.zeros(n, dtype=np.float32)
    total = matriz.sum(axis=1)
    return total / (n - 1)
