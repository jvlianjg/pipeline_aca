"""Generador de datos de ejemplo (mock) para el frontend del Sistema ACA.

Lee los artefactos reales en ``data/processed/`` y los complementa con datos
de ejemplo coherentes para las partes del mockup que aún no tienen datos reales
(políticas vinculadas, ICI, cobertura mediática, serie temporal, temáticas).

El ICI se calcula con la **fórmula real** de ``src/indexing/ici.py`` sobre
registros de ejemplo, de modo que los números respetan la lógica del sistema.

Uso::

    python -m web.data_gen        # desde la raíz del proyecto
    python web/data_gen.py        # también funciona

Los JSON resultantes se guardan en ``web/mock/``.
"""

from __future__ import annotations

import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# Asegurar que la raíz del proyecto está en el path para importar src.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.indexing.ici import (  # noqa: E402
    ICIMediosRecord,
    ICIPoliticoRecord,
    compute_ici_all,
)
from src.config import PROCESSED_DIR, INTERIM_DIR, III, ICI  # noqa: E402

MOCK_DIR = Path(__file__).resolve().parent / "mock"
MOCK_DIR.mkdir(parents=True, exist_ok=True)

# Semilla fija para que los datos de ejemplo sean reproducibles.
RNG = random.Random(42)


# ────────────────────────────────────────────────────────────
#  Carga de datos reales
# ────────────────────────────────────────────────────────────

def _load_real() -> dict:
    """Carga los artefactos reales del pipeline."""
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
    }


# ────────────────────────────────────────────────────────────
#  1. Temáticas (heurística sobre filename + alineación real)
# ────────────────────────────────────────────────────────────

# Palabras clave por temática. Orden matters: la primera coincidencia gana.
_TOPIC_RULES: list[tuple[str, list[str]]] = [
    ("Fiscal y Tributario", ["fiscal", "parafiscal", "cargas-sobre-el-trabajo", "politica-fiscal", "topes", "tasas-de-interes", "reforma-del-sistema-bancario"]),
    ("Empleo y Salarios", ["empleo", "desempleo", "salarial", "productividad", "capital-humano"]),
    ("Competencia y Consumo", ["competencia", "consumidor", "comisiones", "regulacion"]),
    ("Salud", ["salud"]),
    ("Ambiente y Energía", ["circularidad", "reciclaje", "hidrogeno", "encadenamientos", "derrames"]),
    ("Gobernanza y ética", ["integridad", "desinformacion", "embusteras"]),
    ("Educación", ["ina", "brechas"]),
    ("Emprendimiento", ["ecosistema-emprendedor", "accion-humana"]),
    ("Desarrollo y Pobreza", ["pandemia", "bienestar", "propuestas-para-un-mejor", "independencia"]),
    ("Tecnología", ["estudiokas"]),
]


def _topic_of(doc_id: str) -> str:
    key = doc_id.lower()
    for topic, kws in _TOPIC_RULES:
        if any(kw in key for kw in kws):
            return topic
    return "Otros"


def gen_topics(real: dict) -> dict:
    """Agrupa documentos por temática y calcula el III medio real por tema."""
    doc_ids = real["doc_ids"]
    iii_medio = {d: float(v) for d, v in zip(doc_ids, real["iii_medio"])}
    by_topic: dict[str, list[str]] = {}
    for d in doc_ids:
        by_topic.setdefault(_topic_of(d), []).append(d)

    topics = []
    for tema, docs in sorted(by_topic.items(), key=lambda kv: -np.mean([iii_medio[d] for d in kv[1]])):
        avg = float(np.mean([iii_medio[d] for d in docs]))
        topics.append({
            "tema": tema,
            "iii_medio": round(avg, 4),
            "iii_pct": round(avg * 100, 1),
            "n_docs": len(docs),
            "doc_ids": docs,
        })
    return {"topics": topics}


# ────────────────────────────────────────────────────────────
#  2. Serie temporal del III (6 meses, Feb-Jul 2026)
# ────────────────────────────────────────────────────────────

def gen_time_series(real: dict) -> dict:
    """Serie mensual del III medio, con pequeña variación estable alrededor
    del valor real del corpus."""
    base = float(np.mean(real["iii_medio"]))
    months = ["Feb 2026", "Mar 2026", "Abr 2026", "May 2026", "Jun 2026", "Jul 2026"]
    iii_values = []
    ici_pol_values = []
    ici_med_values = []
    for i in range(6):
        v = base + RNG.uniform(-0.015, 0.02) * (i + 1) / 6
        # Banda relativa al valor real del corpus (la escala del III es
        # relativa al corpus tras el reescalado empírico).
        iii_values.append(round(max(0.0, min(1.0, v)), 4))
        ici_pol_values.append(round(0.55 + i * 0.012 + RNG.uniform(-0.01, 0.01), 4))
        ici_med_values.append(round(0.34 + i * 0.008 + RNG.uniform(-0.01, 0.01), 4))

    return {
        "months": months,
        "iii": iii_values,
        "ici_politico": ici_pol_values,
        "ici_medios": ici_med_values,
    }


# ────────────────────────────────────────────────────────────
#  3. Políticas vinculadas (mock coherente con III real)
# ────────────────────────────────────────────────────────────

_POLICY_BANK: list[dict] = [
    {"nombre": "Reforma Ley de Presupuesto Nacional", "institucion": "Ministerio de Hacienda", "n_ley": "Ley 10.080"},
    {"nombre": "Política Nacional de Empleo Juvenil", "institucion": "Ministerio de Trabajo (MTSS)", "n_ley": "Decreto Ejec. 44.117"},
    {"nombre": "Plan Nacional de Salud Pública 2025", "institucion": "Caja Costarricense de Seguro Social", "n_ley": "Acuerdo Junta 9.832"},
    {"nombre": "Estrategia Nacional de Hidrógeno Verde", "institucion": "MINAE", "n_ley": "Decreto Ejec. 44.233"},
    {"nombre": "Reforma al Sistema Bancario Nacional", "institucion": "BCCR", "n_ley": "Ley 9.798"},
    {"nombre": "Ley de Protección al Consumidor Financiero", "institucion": "CONASSIF / SUGEF", "n_ley": "Ley 10.012"},
    {"nombre": "Política de Competencia y Regulación", "institucion": "COPROCOM", "n_ley": "Ley 9.876"},
    {"nombre": "Plan de Transición a Economía Circular", "institucion": "MINAE / MEP", "n_ley": "Decreto Ejec. 44.301"},
    {"nombre": "Reforma a la Ley del INA", "institucion": "INA", "n_ley": "Ley 9.963"},
    {"nombre": "Política Nacional de Vivienda", "institucion": "MIVAH", "n_ley": "Decreto Ejec. 43.988"},
    {"nombre": "Estrategia Digital Nacional", "institucion": "MICITT", "n_ley": "Decreto Ejec. 44.090"},
    {"nombre": "Reforma al Sistema de Capitalización", "institucion": "Ministerio de Hacienda", "n_ley": "Ley 10.045"},
    {"nombre": "Plan de Recuperación Post-Pandemia", "institucion": "Casa Presidencial", "n_ley": "Decreto Ejec. 43.712"},
    {"nombre": "Política de Integridad Pública", "institucion": "Procuraduría de Ética", "n_ley": "Ley 9.910"},
    {"nombre": "Reforma al Régimen de Cargas Sociales", "institucion": "CCSS / MTSS", "n_ley": "Ley 10.021"},
]


def gen_policies(real: dict) -> dict:
    """Vincula políticas mock a documentos reales usando el III real como
    puntaje de coincidencia documento→política (tomamos el III medio del doc)."""
    doc_ids = real["doc_ids"]
    iii_medio = {d: float(v) for d, v in zip(doc_ids, real["iii_medio"])}
    # Umbral de adopción relativo a la distribución real del corpus (tercil
    # superior ⇒ "Total"); la escala del III es relativa al corpus.
    umbral_adopcion = float(np.quantile(list(iii_medio.values()), 2 / 3))

    # Cada política se vincula a 1-3 docs, eligiendo docs con III medio alto.
    matches = []
    used_dates_start = date(2024, 1, 1)
    for pol in _POLICY_BANK:
        n_links = RNG.randint(1, 3)
        linked = RNG.sample(
            sorted(doc_ids, key=lambda d: -iii_medio[d])[:14],
            k=min(n_links, 14),
        )
        for doc_id in linked:
            iii_val = iii_medio[doc_id] + RNG.uniform(-0.05, 0.05)
            iii_val = max(0.0, min(1.0, iii_val))
            adopcion = "Total" if iii_val > umbral_adopcion else "Parcial"
            d = used_dates_start + timedelta(days=RNG.randint(0, 900))
            matches.append({
                "publicacion": doc_id,
                "politica": pol["nombre"],
                "institucion": pol["institucion"],
                "n_ley": pol["n_ley"],
                "iii": round(iii_val, 4),
                "iii_pct": round(iii_val * 100, 1),
                "adopcion": adopcion,
                "fecha": d.isoformat(),
            })

    # Ordenar por III desc y tomar los más relevantes.
    matches.sort(key=lambda m: -m["iii"])
    return {
        "policies": matches,
        "total_unicas": len(_POLICY_BANK),
        "total_vinculos": len(matches),
    }


# ────────────────────────────────────────────────────────────
#  4. ICI — registros mock procesados con la fórmula REAL
# ────────────────────────────────────────────────────────────

# Fuentes realistas por canal.
_POL_SOURCES = {
    "audiencias": ["Asamblea Legislativa", "Consejo de Gobierno", "Comisión Permanente Especial"],
    "citacion_oficial": ["Proyecto de Ley", "Decreto Ejecutivo", "Voto Constitucional", "Reforma Legal"],
    "informe_tecnico": ["BCCR", "Ministerio de Hacienda", "CGR", "MEIC", "MIDEPLAN"],
}
_MED_SOURCES = {
    "menciones_medios": ["La Nación", "La República", "Semanario Universidad", "CRHoy", "Amelia Rueda"],
    "espacio_opinion": ["Columna de Opinión", "Editorial", "Entrevista TV", "Podcast", "Foro Económico"],
}


def gen_ici(real: dict) -> dict:
    """Genera registros ICI de ejemplo y los procesa con ``compute_ici_all``
    (fórmula real de src/indexing/ici.py)."""
    doc_ids = real["doc_ids"]
    iii_medio = {d: float(v) for d, v in zip(doc_ids, real["iii_medio"])}

    politico_records: list[ICIPoliticoRecord] = []
    medios_records: list[ICIMediosRecord] = []

    # Distribuir señales: docs con III alto reciben más influencia.
    ranked = sorted(doc_ids, key=lambda d: -iii_medio[d])
    for rank, doc_id in enumerate(ranked):
        # Probabilidad decreciente con el ranking (docs más influyentes = más señales).
        # La política pesa más (≈62%) que los medios (≈38%), como en el mockup.
        base_prob = max(0.25, 1.0 - rank / len(ranked))
        n_pol = sum(1 for _ in range(6) if RNG.random() < base_prob * 0.75)
        n_med = sum(1 for _ in range(5) if RNG.random() < base_prob * 0.55)

        for _ in range(n_pol):
            tipo = RNG.choice(["audiencias", "citacion_oficial", "informe_tecnico"])
            fuente = RNG.choice(_POL_SOURCES[tipo])
            fecha = date(2022, 1, 1) + timedelta(days=RNG.randint(0, 1500))
            intensidad = round(RNG.uniform(0.5, 1.0), 2)
            politico_records.append(ICIPoliticoRecord(doc_id, tipo, fecha, fuente, intensidad))

        for _ in range(n_med):
            tipo = RNG.choice(["menciones_medios", "espacio_opinion"])
            fuente = RNG.choice(_MED_SOURCES[tipo])
            fecha = date(2022, 1, 1) + timedelta(days=RNG.randint(0, 1500))
            intensidad = round(RNG.uniform(0.5, 1.0), 2)
            medios_records.append(ICIMediosRecord(doc_id, tipo, fecha, fuente, intensidad))

    # Calcular ICI con la fórmula REAL.
    results = compute_ici_all(doc_ids, politico_records, medios_records)

    ici_results = [
        {
            "doc_id": r.doc_id,
            "ici_politico": r.ici_politico,
            "ici_medios": r.ici_medios,
            "ici": r.ici,
            "ici_pct": round(r.ici * 100, 1),
            "iii_medio": round(iii_medio[r.doc_id], 4),
        }
        for r in sorted(results, key=lambda r: -r.ici)
    ]

    # Serializar los registros crudos para inspección (fechas a ISO str).
    records_json = {
        "politico": [
            {"doc_id": r.doc_id, "tipo": r.tipo, "fecha": r.fecha.isoformat() if r.fecha else None,
             "fuente": r.fuente, "intensidad": r.intensidad}
            for r in politico_records
        ],
        "medios": [
            {"doc_id": r.doc_id, "tipo": r.tipo, "fecha": r.fecha.isoformat() if r.fecha else None,
             "fuente": r.fuente, "intensidad": r.intensidad}
            for r in medios_records
        ],
    }

    # Distribución global (como en el mockup: 62% político / 38% medios).
    total_pol = len(politico_records)
    total_med = len(medios_records)
    total = total_pol + total_med

    return {
        "results": ici_results,
        "records": records_json,
        "alpha_politico": ICI.alpha_politico,
        "summary": {
            "total_politico": total_pol,
            "total_medios": total_med,
            "pct_politico": round(100 * total_pol / total, 1) if total else 0,
            "pct_medios": round(100 * total_med / total, 1) if total else 0,
            "ici_global": round(float(np.mean([r.ici for r in results])), 4),
            "ici_politico_global": round(float(np.mean([r.ici_politico for r in results])), 4),
            "ici_medios_global": round(float(np.mean([r.ici_medios for r in results])), 4),
        },
    }


# ────────────────────────────────────────────────────────────
#  5. Overview global (KPIs del dashboard)
# ────────────────────────────────────────────────────────────

def gen_overview(real: dict, policies: dict, ici: dict, ts: dict) -> dict:
    docs = real["docs"]
    iii_mean = float(np.mean(real["iii_medio"]))
    return {
        "iii_promedio": round(iii_mean, 4),
        "iii_promedio_pct": round(iii_mean * 100, 1),
        "iii_variacion": round((ts["iii"][-1] - ts["iii"][0]) * 100, 1),
        "n_publicaciones": len(docs),
        "n_publicaciones_monitoreadas": 142,  # valor del mockup (universo total)
        "n_paginas": int(docs["n_pages"].sum()),
        "n_propuestas": int(real["props"].shape[0]),
        "n_politicas_vinculadas": policies["total_unicas"],
        "n_vinculos": policies["total_vinculos"],
        "ici_global": ici["summary"]["ici_global"],
        "ici_global_pct": round(ici["summary"]["ici_global"] * 100, 1),
        "n_interacciones": ici["summary"]["total_politico"] + ici["summary"]["total_medios"],
        "pct_politico": ici["summary"]["pct_politico"],
        "pct_medios": ici["summary"]["pct_medios"],
        "ventana_meses": III.ventana_meses,
    }


# ────────────────────────────────────────────────────────────
#  6. Catálogos (autores reales de metadatos + instituciones del plan ICI)
# ────────────────────────────────────────────────────────────

# Instituciones del plan de recolección ICI (metodología §3.4) con su sector.
_INSTITUCIONES: list[tuple[str, str]] = [
    ("Asamblea Legislativa", "Legislativo"),
    ("Ministerio de Hacienda", "Fiscal"),
    ("Banco Central de Costa Rica (BCCR)", "Monetario"),
    ("Contraloría General de la República (CGR)", "Control fiscal"),
    ("Caja Costarricense de Seguro Social (CCSS)", "Salud"),
    ("Ministerio de Trabajo y Seguridad Social", "Laboral"),
    ("Ministerio de Ambiente y Energía (MINAE)", "Ambiente"),
    ("Ministerio de Educación Pública (MEP)", "Educación"),
    ("Instituto Nacional de Aprendizaje (INA)", "Educación técnica"),
    ("Ministerio de Vivienda y Asentamientos Humanos", "Vivienda"),
    ("COPROCOM", "Competencia"),
    ("SUGEF / CONASSIF", "Financiero"),
    ("Procuraduría de la Ética Pública", "Ética pública"),
    ("MICITT", "Ciencia y tecnología"),
]


def gen_catalogos(real: dict) -> dict:
    """Autores reales (metadatos de los PDFs en data/interim) e instituciones
    del plan de monitoreo ICI."""
    autores: dict[str, int] = {}
    n_docs = 0
    for p in sorted(INTERIM_DIR.glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        n_docs += 1
        a = ((d.get("raw_meta") or {}).get("author") or "").strip()
        if a:
            autores[a] = autores.get(a, 0) + 1

    return {
        "autores": [
            {"nombre": nombre, "n_docs": n}
            for nombre, n in sorted(autores.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
        "n_docs": n_docs,
        "n_docs_sin_autor": n_docs - sum(autores.values()),
        "instituciones": [
            {"nombre": nombre, "sector": sector} for nombre, sector in _INSTITUCIONES
        ],
    }


# ────────────────────────────────────────────────────────────
#  Orquestación
# ────────────────────────────────────────────────────────────

def _save(name: str, data: dict) -> None:
    path = MOCK_DIR / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {path.name} ({path.stat().st_size:,} bytes)")


def main() -> None:
    print("Generando datos de ejemplo para el frontend ACA…")
    real = _load_real()
    print(f"  Cargados {len(real['doc_ids'])} documentos reales.")

    ts = gen_time_series(real)
    topics = gen_topics(real)
    policies = gen_policies(real)
    ici = gen_ici(real)
    catalogos = gen_catalogos(real)
    overview = gen_overview(real, policies, ici, ts)

    _save("time_series", ts)
    _save("topics", topics)
    _save("policies", policies)
    _save("ici_records", ici["records"])
    _save("ici_results", {"results": ici["results"], "summary": ici["summary"],
                          "alpha_politico": ici["alpha_politico"]})
    _save("overview", overview)
    _save("catalogos", catalogos)

    print(f"\nResumen:")
    print(f"  III promedio real:    {overview['iii_promedio_pct']}%")
    print(f"  ICI global (mock):    {overview['ici_global_pct']}%")
    print(f"  Políticas vinculadas: {overview['n_politicas_vinculadas']}")
    print(f"  Interacciones:        {overview['n_interacciones']} "
          f"({overview['pct_politico']}% político / {overview['pct_medios']}% medios)")
    print(f"\nDatos guardados en {MOCK_DIR}")


if __name__ == "__main__":
    main()
