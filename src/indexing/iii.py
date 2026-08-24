"""Índice de Impacto de Ideas (III).

Implementa la fórmula definida en docs/metodologia.md:

    III(f,b) = w1·Alineación + w2·Coincidencia + w3·Temporalidad

Alineación y Coincidencia se calculan como similitudes coseno en crudo y se
reescalan de forma **empírica** (min-max sobre los pares fuera de la diagonal
del corpus en cuestión): los cosenos reales de este modelo viven en ~[0.1, 0.9],
de modo que el reescalado teórico (cos+1)/2 comprimía todo el índice hacia un
rango estrecho y sin poder de discriminación. El reescalado empírico hace que
el valor sea relativo al corpus: 1 = par más alineado/coincidente del corpus,
0 = par menos alineado/coincidente.

La temporalidad es **asimétrica** por defecto: un blanco anterior a la fuente
recibe 0 (la influencia hacia el pasado es causalmente imposible).

Todas las funciones están vectorizadas con NumPy.
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
    """Reescala la similitud coseno [-1, 1] al rango [0, 1].

    Solo se usa para cálculos de par único sin contexto de corpus; la matriz
    III usa reescalado empírico (ver ``_rescale_empirical``).
    """
    return (np.asarray(cos_value, dtype=np.float32) + 1.0) / 2.0


def _rescale_empirical(matrix: np.ndarray) -> tuple[np.ndarray, tuple[float, float]]:
    """Reescala una matriz al [0, 1] con el min/max empírico de los pares
    fuera de la diagonal.

    Devuelve (matriz_reescalada, (min, max)) recortada a [0, 1]. Si el rango
    es degenerado (max ≈ min), devuelve ceros.
    """
    n = matrix.shape[0]
    off = ~np.eye(n, dtype=bool)
    vals = matrix[off]
    lo, hi = float(vals.min()), float(vals.max())
    if hi - lo < 1e-12:
        return np.zeros_like(matrix), (lo, hi)
    scaled = np.clip((matrix - lo) / (hi - lo), 0.0, 1.0)
    return scaled.astype(np.float32), (lo, hi)


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
    """Similitud coseno en crudo entre el embedding de documento fuente y blanco.

    Recibe embeddings de documento (uno por cada parte). Si hay varios
    vectores por documento (p. ej. por fragmentos), se promedian antes.
    El reescalado al [0, 1] se hace a nivel de matriz (empírico).
    """
    vf = _doc_vector(emb_f)
    vb = _doc_vector(emb_b)
    if vf is None or vb is None:
        return 0.0
    return float(np.dot(vf, vb))


def coincidencia_propuestas(
    emb_prop_f: np.ndarray, emb_prop_b: np.ndarray
) -> float:
    """Media de los máximos: para cada propuesta de f, su mejor coincidencia en b.

    Implementa la agregación descrita en metodología.md §2.3. Devuelve el
    coseno en crudo; el reescalado al [0, 1] se hace a nivel de matriz.
    """
    if emb_prop_f.size == 0 or emb_prop_b.size == 0:
        return 0.0
    pf = _safe_unit(emb_prop_f)
    pb = _safe_unit(emb_prop_b)
    # Matriz de similitud (n_f, n_b) coseno = producto escalar (ya normalizados).
    sim = pf @ pb.T  # en [-1, 1]
    # Mejor coincidencia por propuesta de f.
    best_per_f = sim.max(axis=1) if pb.shape[0] else np.zeros(pf.shape[0])
    return float(np.mean(best_per_f))


def temporalidad(
    fecha_f: date | None,
    fecha_b: date | None,
    ventana_meses: int | None = None,
    asimetrica: bool | None = None,
) -> float:
    """Decaimiento lineal dentro de la ventana W (36 meses por defecto).

    Con ``asimetrica=True`` (por defecto), un blanco anterior a la fuente
    recibe 0: la influencia solo puede ir de lo anterior a lo posterior.
    Devuelve 0 si alguna fecha falta o la distancia excede la ventana.
    """
    f, b = safe_date(fecha_f), safe_date(fecha_b)
    if f is None or b is None:
        return 0.0
    W = ventana_meses if ventana_meses is not None else III.ventana_meses
    if asimetrica is None:
        asimetrica = III.temporalidad_asimetrica
    delta = months_between(f, b)  # meses de f a b; negativo => b es anterior
    if asimetrica and delta < 0:
        return 0.0
    delta = abs(delta)
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
    """Calcula el III de una fuente sobre un blanco (par único).

    Como no hay contexto de corpus, usa el reescalado teórico (cos+1)/2;
    el cálculo canónico (con reescalado empírico) es ``compute_iii_matrix``.

    Devuelve (iii, descomposición) donde la descomposición contiene cada
    componente por separado para inspección/dashboard.
    """
    cfg = config or III
    ali = float(cosine_to_01(alineacion_tematica(emb_doc_f, emb_doc_b)))
    coin = float(cosine_to_01(coincidencia_propuestas(emb_prop_f, emb_prop_b)))
    temp = temporalidad(
        fecha_f, fecha_b, cfg.ventana_meses, asimetrica=cfg.temporalidad_asimetrica
    )
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
    Alineación y Coincidencia se reescalan empíricamente (min-max fuera de la
    diagonal), y el dict incluye las escalas usadas como
    ``escala_alineacion``/``escala_coincidencia`` ((min, max) en crudo).
    La diagonal se anula.
    """
    cfg = config or III
    n = len(docs)
    A_raw = np.zeros((n, n), dtype=np.float32)
    C_raw = np.zeros_like(A_raw)
    T = np.zeros_like(A_raw)

    # Pre-normaliza vectores de documento una sola vez.
    doc_vecs = np.vstack([_doc_vector(d.emb_doc) for d in docs])  # (n, dim)

    for i, fi in enumerate(docs):
        for j, bj in enumerate(docs):
            if i == j:
                continue
            A_raw[i, j] = float(np.dot(doc_vecs[i], doc_vecs[j]))
            C_raw[i, j] = coincidencia_propuestas(fi.emb_prop, bj.emb_prop)
            T[i, j] = temporalidad(
                fi.fecha, bj.fecha, cfg.ventana_meses, asimetrica=cfg.temporalidad_asimetrica
            )

    A, escala_a = _rescale_empirical(A_raw)
    C, escala_c = _rescale_empirical(C_raw)
    M = (
        cfg.w_alineacion * A
        + cfg.w_coincidencia * C
        + cfg.w_temporalidad * T
    ).astype(np.float32)
    np.fill_diagonal(M, 0.0)
    np.fill_diagonal(A, 0.0)
    np.fill_diagonal(C, 0.0)

    logger.info(
        "Matriz III calculada: %dx%d | alineación cruda [%.3f, %.3f] → [0, 1] | "
        "coincidencia cruda [%.3f, %.3f] → [0, 1] | temporalidad asimétrica=%s",
        n, n, *escala_a, *escala_c, cfg.temporalidad_asimetrica,
    )
    return M, {
        "alineacion": A,
        "coincidencia": C,
        "temporalidad": T,
        "escala_alineacion": np.asarray(escala_a, dtype=np.float32),
        "escala_coincidencia": np.asarray(escala_c, dtype=np.float32),
    }


def mean_iii_per_doc(matriz: np.ndarray) -> np.ndarray:
    """III medio por fila (excluyendo la diagonal): potencial de influencia
    de cada documento **como fuente**. Sirve para ranking."""
    n = matriz.shape[0]
    if n <= 1:
        return np.zeros(n, dtype=np.float32)
    total = matriz.sum(axis=1)
    return total / (n - 1)
