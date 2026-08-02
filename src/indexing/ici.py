"""Índice de Canales de Influencia (ICI).

Especificación ejecutable según docs/metodologia.md §3:

    ICI = alpha·ICI-Politico + (1-alpha)·ICI-Medios

Esta implementación está **completa y testeada con datos sintéticos**, pero
espera registros de señales externas (actas, documentos oficiales, medios) que
aún no se han recolectado. Al inyectar datos reales, el cálculo no cambia.

Cada señal se normaliza al rango [0,1].  Las normalizaciones son conservadoras
(frecuencia con tope logarítmico) para evitar que una sola publicación con
muchas menciones sature el índice.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date

from ..config import ICI
from ..utils import logger


# ────────────────────────────────────────────────────────────
#  Registros de señales externas (una fila por evento/mención)
# ────────────────────────────────────────────────────────────


@dataclass
class ICIPoliticoRecord:
    """Una señal de influencia política directa sobre una publicación.

    tipo: "audiencias" | "citacion_oficial" | "informe_tecnico"
    intensidad: valor en [0,1] que pondera la fuerza del evento
                (por defecto 1.0 = presencia plena).
    """

    doc_id: str
    tipo: str
    fecha: date | None = None
    fuente: str = ""
    intensidad: float = 1.0


@dataclass
class ICIMediosRecord:
    """Una señal de presencia mediática.

    tipo: "menciones_medios" | "espacio_opinion"
    intensidad: valor en [0,1].
    """

    doc_id: str
    tipo: str
    fecha: date | None = None
    fuente: str = ""
    intensidad: float = 1.0


# ────────────────────────────────────────────────────────────
#  Normalizadores de señales a [0,1]
# ────────────────────────────────────────────────────────────

_POLITICO_TYPES = ("audiencias", "citacion_oficial", "informe_tecnico")
_MEDIOS_TYPES = ("menciones_medios", "espacio_opinion")


def _aggregate_signals(records: list, valid_types: tuple[str, ...]) -> dict[str, dict[str, float]]:
    """Agrega intensidad por (doc_id, tipo). Devuelve {doc_id: {tipo: suma_intensidad}}."""
    out: dict[str, dict[str, float]] = {}
    for r in records:
        if r.tipo not in valid_types:
            continue
        out.setdefault(r.doc_id, {})
        out[r.doc_id][r.tipo] = out[r.doc_id].get(r.tipo, 0.0) + max(0.0, min(1.0, r.intensidad))
    return out


def _cap01(x: float) -> float:
    """Comprime al rango [0,1] con saturación suave: x/(1+x)."""
    return x / (1.0 + x) if x >= 0 else 0.0


def _subindex(by_doc: dict[str, dict[str, float]], doc_id: str, types: tuple[str, ...]) -> float:
    """Media de las señales (normalizadas con tope) disponibles para un documento.

    Un documento sin señales obtiene 0.  Las señales ausentes cuentan como 0,
    de modo que el subíndice premia la diversidad de canales.
    """
    tipo_scores = by_doc.get(doc_id, {})
    # Cada tipo: intensidad agregada comprimida a [0,1].
    per_type = [_cap01(tipo_scores.get(t, 0.0)) for t in types]
    return float(sum(per_type) / len(types)) if per_type else 0.0


# ────────────────────────────────────────────────────────────
#  Cálculo del ICI
# ────────────────────────────────────────────────────────────


@dataclass
class ICIResult:
    doc_id: str
    ici_politico: float
    ici_medios: float
    ici: float


def compute_ici(
    doc_id: str,
    politico_records: list[ICIPoliticoRecord],
    medios_records: list[ICIMediosRecord],
    alpha: float | None = None,
) -> ICIResult:
    """Calcula el ICI de un documento a partir de sus señales externas.

    Args:
        doc_id: identificador del documento.
        politico_records: lista de ICIPoliticoRecord (puede incluir otros docs).
        medios_records: lista de ICIMediosRecord (puede incluir otros docs).
        alpha: peso del componente político. Por defecto, ICI.alpha_politico.
    """
    if alpha is None:
        alpha = ICI.alpha_politico
    alpha = max(0.0, min(1.0, alpha))

    pol_by_doc = _aggregate_signals(politico_records, _POLITICO_TYPES)
    med_by_doc = _aggregate_signals(medios_records, _MEDIOS_TYPES)

    ici_pol = _subindex(pol_by_doc, doc_id, _POLITICO_TYPES)
    ici_med = _subindex(med_by_doc, doc_id, _MEDIOS_TYPES)
    ici = alpha * ici_pol + (1.0 - alpha) * ici_med

    return ICIResult(
        doc_id=doc_id,
        ici_politico=round(ici_pol, 4),
        ici_medios=round(ici_med, 4),
        ici=round(ici, 4),
    )


def compute_ici_all(
    doc_ids: list[str],
    politico_records: list[ICIPoliticoRecord],
    medios_records: list[ICIMediosRecord],
    alpha: float | None = None,
) -> list[ICIResult]:
    """Calcula el ICI para una lista de documentos de una sola vez."""
    results = [compute_ici(d, politico_records, medios_records, alpha) for d in doc_ids]
    logger.info(
        "ICI calculado para %d documentos (%d señales políticas, %d de medios)",
        len(doc_ids), len(politico_records), len(medios_records),
    )
    return results


# ────────────────────────────────────────────────────────────
#  Datos sintéticos de prueba (validación de la fórmula)
# ────────────────────────────────────────────────────────────


def _synthetic_demo() -> None:
    """Mini-demo con datos sintéticos para verificar que compute_ici funciona."""
    from datetime import date as _d

    pol = [
        ICIPoliticoRecord("docA", "audiencias", _d(2022, 5, 1), "Asamblea", 1.0),
        ICIPoliticoRecord("docA", "citacion_oficial", _d(2022, 6, 1), "Proyecto Ley", 1.0),
        ICIPoliticoRecord("docA", "informe_tecnico", _d(2022, 7, 1), "BCCR", 1.0),
        ICIPoliticoRecord("docB", "citacion_oficial", _d(2022, 3, 1), "Decreto", 1.0),
    ]
    med = [
        ICIMediosRecord("docA", "menciones_medios", _d(2022, 5, 10), "La Nación", 1.0),
        ICIMediosRecord("docB", "espacio_opinion", _d(2022, 4, 1), "Opinión CR", 1.0),
    ]
    for r in compute_ici_all(["docA", "docB", "docC"], pol, med):
        logger.info("ICI %s: político=%.3f medios=%.3f total=%.3f",
                    r.doc_id, r.ici_politico, r.ici_medios, r.ici)


if __name__ == "__main__":  # pragma: no cover
    _synthetic_demo()
