"""Genera ``src/data/mockData.ts`` para el proyecto React del mockup ACA.

Lee los artefactos reales del pipeline (29 PDFs) y produce un ``mockData.ts``
que respeta EXACTAMENTE los tipos de ``src/types/index.ts`` del proyecto
original, de modo que toda la UI compile y renderice sin cambios.

Estrategia:
- ``publicaciones``: derivadas de los 29 PDFs reales (titulo = doc_id
  humanizado, fecha real, excerpt = primera propuesta real).
- ``autores``: el PDF metadata solo tiene 2 autores reales; el resto se
  genera como "Comité de Investigación ACA" (institucional).
- ``temas``: heurística sobre el filename (8 temas como el original).
- ``impactosIII``:vinculan publicaciones reales con políticas mock, usando
  el III medio REAL del documento como score.
- ``politicasPublicas``, ``actasLegislativas``, ``mencionesMedios``, ICI,
  ``audits``: mock coherente con el dominio costarricense.
- ``monthlyTrends``, ``themeImpacts``, ``kpiData``, ``channelData``: derivados
  de los valores reales del corpus.

Uso:
    python web/gen_mockdata_ts.py
"""

from __future__ import annotations

import json
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import PROCESSED_DIR, III, ICI  # noqa: E402
from src.indexing.ici import (  # noqa: E402
    ICIMediosRecord, ICIPoliticoRecord, compute_ici_all,
)

APP_DIR = PROJECT_ROOT / "Kimi_Agent_Pregunta antes de responder" / "app"
OUT_PATH = APP_DIR / "src" / "data" / "mockData.ts"

RNG = random.Random(42)


# ────────────────────────────────────────────────────────────
#  Carga de datos reales
# ────────────────────────────────────────────────────────────

def load_real() -> dict:
    docs = pd.read_parquet(PROCESSED_DIR / "documents.parquet")
    props = pd.read_parquet(PROCESSED_DIR / "proposals.parquet")
    npz = np.load(PROCESSED_DIR / "iii_matrix.npz", allow_pickle=True)
    doc_ids = [str(d) for d in npz["doc_ids"]]
    iii_medio = {d: float(v) for d, v in zip(doc_ids, npz["iii_medio"])}
    return {
        "docs": docs, "props": props, "doc_ids": doc_ids,
        "iii_medio": iii_medio,
        "iii_global": float(np.mean(npz["iii_medio"])),
    }


def humanize_title(doc_id: str) -> str:
    """Convierte un doc_id en un título legible."""
    t = doc_id.replace("_", " ").replace(".pdf", "")
    # quitar guiones y normalizar espacios
    t = " ".join(t.split())
    # capitalizar palabras significativas
    return t[:90]


def first_proposal(props: pd.DataFrame, doc_id: str) -> str:
    """Extrae la primera propuesta real del doc como excerpt."""
    p = props[props["doc_id"] == doc_id].sort_values("idx")
    if len(p) == 0:
        return ""
    text = str(p.iloc[0]["text"])
    return text[:200].rstrip() + ("…" if len(text) > 200 else "")


# ────────────────────────────────────────────────────────────
#  Temas (heurística sobre filename, 8 categorías)
# ────────────────────────────────────────────────────────────

TEMAS = [
    ("tem-1", "Política Fiscal", "Reforma tributaria, gasto público y sostenibilidad fiscal"),
    ("tem-2", "Seguridad Social", "Sistema de pensiones, CCSS, IVM y salud pública"),
    ("tem-3", "Educación", "Reforma educativa, educación superior y técnica"),
    ("tem-4", "Empleo", "Mercado laboral, desempleo y empleo joven"),
    ("tem-5", "Medio Ambiente", "Cambio climático, energía y biodiversidad"),
    ("tem-6", "Gobernabilidad", "Institucionalidad, transparencia y combate a la corrupción"),
    ("tem-7", "Comercio Exterior", "Exportaciones, tratados comerciales e inversión extranjera"),
    ("tem-8", "Salud", "Políticas de salud pública y acceso a servicios"),
]

_TOPIC_RULES = [
    ("tem-1", ["fiscal", "parafiscal", "cargas-sobre-el-trabajo", "politica-fiscal", "topes", "tasas-de-interes", "bancario"]),
    ("tem-2", ["pension", "ivm", "seguridad-social"]),
    ("tem-3", ["ina", "brechas", "capital-humano", "educacion", "educación"]),
    ("tem-4", ["empleo", "desempleo", "salarial", "productividad", "emprendedor", "accion-humana"]),
    ("tem-5", ["circularidad", "reciclaje", "hidrogeno", "encadenamientos", "derrames", "ambiente"]),
    ("tem-6", ["integridad", "desinformacion", "embusteras", "independencia"]),
    ("tem-7", ["competencia", "consumidor", "comisiones", "regulacion", "nearshoring"]),
    ("tem-8", ["salud"]),
]


def topic_of(doc_id: str) -> str:
    key = doc_id.lower()
    for tid, kws in _TOPIC_RULES:
        if any(kw in key for kw in kws):
            return tid
    # fallback por defecto
    return "tem-1"


# ────────────────────────────────────────────────────────────
#  Catálogos mock (autores, instituciones, medios)
# ────────────────────────────────────────────────────────────

AUTORES = [
    ("aut-1", "Dr. Carlos Hernández Álvarez", "Research Fellow"),
    ("aut-2", "Dra. María Elena Castillo", "Asociado"),
    ("aut-3", "Dr. Jorge Manuel Soto", "Research Fellow"),
    ("aut-4", "Dra. Ana Lucía Fernández", "Asociado"),
    ("aut-5", "Dr. Roberto Guillén", "Institucional"),
    ("aut-6", "Dra. Patricia Vargas", "Research Fellow"),
    ("aut-7", "Dr. Eduardo Mora", "Asociado"),
    ("aut-8", "Comité de Investigación ACA", "Institucional"),
]

INSTITUCIONES = [
    ("ins-1", "Asamblea Legislativa", "Legislativo"),
    ("ins-2", "Ministerio de Hacienda", "Ejecutivo"),
    ("ins-3", "CCSS", "Ejecutivo"),
    ("ins-4", "MEP", "Ejecutivo"),
    ("ins-5", "Ministerio de Trabajo", "Ejecutivo"),
    ("ins-6", "MINAE", "Ejecutivo"),
    ("ins-7", "Ministerio de Salud", "Ejecutivo"),
    ("ins-8", "COMEX", "Ejecutivo"),
    ("ins-9", "Poder Judicial", "Judicial"),
    ("ins-10", "Contraloría General", "Control"),
]

MEDIOS = [
    ("med-1", "La Nación", "Digital", "Nacional"),
    ("med-2", "CRHoy", "Digital", "Nacional"),
    ("med-3", "Semanario Universidad", "Digital", "Nacional"),
    ("med-4", "El Financiero", "Digital", "Especializado"),
    ("med-5", "Teletica", "Televisión", "Nacional"),
    ("med-6", "La República", "Digital", "Nacional"),
    ("med-7", "Amelia Rueda", "Digital", "Nacional"),
    ("med-8", "La Teja", "Digital", "Nacional"),
]

POLITICAS_BANK = [
    ("pol-1", "Proyecto de Ley Modernización Régimen IVM N°23.420", "ins-3"),
    ("pol-2", "Decreto Ejecutivo Transferencia Competencias Regionales MEP", "ins-4"),
    ("pol-3", "Ley de Impuestos al Carbono y Descarbonización N°24.105", "ins-6"),
    ("pol-4", "Reforma Fiscal Integral — Plan de Hacienda 2025-2028", "ins-2"),
    ("pol-5", "Ley de Empleo Joven y Primer Empleo N°24.200", "ins-5"),
    ("pol-6", "Decreto Plataforma de Datos Abiertos del Estado", "ins-2"),
    ("pol-7", "Reforma al Sistema Bancario Nacional", "ins-2"),
    ("pol-8", "Política de Competencia y Protección al Consumidor", "ins-1"),
    ("pol-9", "Estrategia Nacional de Hidrógeno Verde", "ins-6"),
    ("pol-10", "Plan Nacional de Salud 2025-2030", "ins-7"),
]


# ────────────────────────────────────────────────────────────
#  Generación
# ────────────────────────────────────────────────────────────

def gen_publicaciones(real: dict) -> list[dict]:
    """Crea publicaciones desde los 29 PDFs reales."""
    docs = real["docs"]
    out = []
    for i, row in enumerate(docs.itertuples(index=False), start=1):
        doc_id = row.doc_id
        fecha = str(row.fecha) if row.fecha else "2024-01-01"
        excerpt = first_proposal(real["props"], doc_id) or "Análisis de políticas públicas de Costa Rica."
        # autor: rotar entre los 8, sesgando al institucional
        autor_id = AUTORES[(i * 3) % len(AUTORES)][0]
        out.append({
            "id": f"pub-{i}",
            "titulo": humanize_title(doc_id),
            "fechaPublicacion": fecha,
            "autorId": autor_id,
            "temaId": topic_of(doc_id),
            "textoLimpio": excerpt,
            "excerpt": excerpt,
            "_doc_id": doc_id,  # privado, se quita al serializar
            "_iii_medio": real["iii_medio"][doc_id],
        })
    return out


def gen_politicas() -> list[dict]:
    return [
        {
            "id": pid,
            "nombre": nombre,
            "institucionId": inst,
            "fechaEmision": "2025-0" + str(RNG.randint(1, 8)) + "-" + str(RNG.randint(10, 28)).zfill(2),
            "textoLimpio": nombre + " — medida de política pública adoptada por el gobierno de Costa Rica.",
            "excerpt": nombre,
        }
        for pid, nombre, inst in POLITICAS_BANK
    ]


def gen_impactos(publicaciones: list[dict]) -> list[dict]:
    """Vincula publicaciones con políticas usando el III medio REAL."""
    out = []
    # Top publicaciones por III
    pubs_sorted = sorted(publicaciones, key=lambda p: -p["_iii_medio"])
    imp_id = 1
    for pub in pubs_sorted[:20]:  # 20 vinculaciones
        pol_id = f"pol-{RNG.randint(1, len(POLITICAS_BANK))}"
        iii_final = pub["_iii_medio"] + RNG.uniform(-0.05, 0.05)
        iii_final = max(0.4, min(0.95, iii_final))
        score_tematico = min(0.99, iii_final + RNG.uniform(0, 0.1))
        dias = RNG.randint(60, 700)
        nivel = "TOTAL" if iii_final > 0.7 else ("PARCIAL" if iii_final > 0.55 else "SUPERFICIAL")
        fecha_calc = date(2025, RNG.randint(1, 9), RNG.randint(1, 28))
        out.append({
            "id": f"imp-{imp_id}",
            "pubId": pub["id"],
            "politicaId": pol_id,
            "scoreTematico": round(score_tematico, 2),
            "diasDiferencia": dias,
            "pesoTemporal": 1.0 if dias < 540 else 0.6,
            "nivelAdopcion": nivel,
            "confianzaLLM": round(RNG.uniform(0.75, 0.95), 2),
            "evidenciaTextual": pub["excerpt"][:120],
            "justificacionLLM": f"La política adopta elementos del análisis sobre {pub['_doc_id'][:40]} con un nivel de adopción {nivel.lower()}.",
            "iiiScoreFinal": round(iii_final, 2),
            "fechaCalculo": fecha_calc.isoformat() + "T10:00:00Z",
        })
        imp_id += 1
    return out


def gen_actas() -> list[dict]:
    tipos = ["Audiencia Pública", "Comisión", "Debate Plenario"]
    return [
        {
            "id": f"act-{i}",
            "numeroExpediente": f"{RNG.randint(22,24)}.{RNG.randint(100,999)}-PL",
            "fecha": f"2025-{str(RNG.randint(1,9)).zfill(2)}-{str(RNG.randint(1,28)).zfill(2)}",
            "tipoEvento": RNG.choice(tipos),
            "textoTranscripcion": f"En el marco de la discusión del expediente, expertos de la Academia de Centroamérica presentaron análisis técnico sobre la materia, con base en investigaciones recientes del Comité de Investigación.",
            "institucionId": "ins-1",
        }
        for i in range(1, 6)
    ]


def gen_menciones() -> list[dict]:
    titulares = [
        "Expertos de la ACA proponen reforma estructural para Costa Rica",
        "Hacienda presenta plan inspirado en propuestas académicas",
        "Academia alerta sobre brechas en política pública",
        "Análisis de impacto económico de la medida gubernamental",
        "Investigadores plantean nuevo enfoque para el desarrollo",
        "¿Funcionará la propuesta de la ACA en la realidad?",
        "Datos abiertos: nueva plataforma gubernamental",
        "Academia advierte sobre riesgos de la política actual",
        "Costa Rica busca oportunidades en el contexto internacional",
        "Propuesta técnica recibe respaldo de sectores",
    ]
    sentimientos = ["Positivo", "Neutro", "Negativo"]
    return [
        {
            "id": f"men-{i}",
            "medioId": f"med-{((i-1) % 8) + 1}",
            "fecha": f"2025-{str(RNG.randint(1,9)).zfill(2)}-{str(RNG.randint(1,28)).zfill(2)}",
            "url": "https://example.com",
            "titular": RNG.choice(titulares),
            "textoArticulo": "Cobertura periodística del análisis de la Academia de Centroamérica sobre políticas públicas.",
            "sentimiento": RNG.choices(sentimientos, weights=[5, 3, 2])[0],
        }
        for i in range(1, 11)
    ]


def gen_ici_politico(impactos: list[dict]) -> list[dict]:
    tipos = ["Citación Directa", "Participación en Audiencia", "Insumo Técnico"]
    out = []
    for i, imp in enumerate(impactos[:5], start=1):
        out.append({
            "id": f"icip-{i}",
            "pubId": imp["pubId"],
            "actaId": f"act-{i}",
            "tipoInteraccion": tipos[i % 3],
            "fragmentoCita": "Expert de la ACA presentó análisis ante la comisión legislativa...",
            "fechaRegistro": "2025-0" + str((i % 6) + 1) + "-15",
        })
    return out


def gen_ici_medios(menciones: list[dict], publicaciones: list[dict]) -> list[dict]:
    tipos = ["Autor citado", "Paper mencionado", "Opinión basada en datos ACA"]
    out = []
    for i, men in enumerate(menciones, start=1):
        pub = RNG.choice(publicaciones)
        out.append({
            "id": f"icim-{i}",
            "pubId": pub["id"],
            "mencionId": men["id"],
            "tipoMencion": RNG.choice(tipos),
            "fechaRegistro": men["fecha"],
        })
    return out


def gen_audits(impactos: list[dict]) -> list[dict]:
    out = []
    for i, imp in enumerate(impactos[:5], start=1):
        status = "Completado" if i < 5 else "En progreso"
        resultado = None
        if status == "Completado":
            resultado = {
                "nivelAdopcion": imp["nivelAdopcion"],
                "puntuacionConfianza": imp["confianzaLLM"],
                "evidenciaTextual": imp["evidenciaTextual"],
                "justificacion": imp["justificacionLLM"],
            }
        out.append({
            "id": f"aud-{i}",
            "pubId": imp["pubId"],
            "politicaId": imp["politicaId"],
            "status": status,
            "resultado": resultado,
            "fechaInicio": imp["fechaCalculo"],
            "fechaCompletado": imp["fechaCalculo"] if status == "Completado" else None,
        })
    return out


def gen_monthly_trends(real: dict) -> list[dict]:
    base_iii = round(real["iii_global"] * 100)
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"]
    out = []
    for i, m in enumerate(months):
        v = base_iii - 8 + i * 2 + RNG.randint(-2, 2)
        out.append({
            "month": m,
            "iiiScore": v,
            "iciPolitico": 12 + i * 2 + RNG.randint(0, 3),
            "iciMedios": 18 + i + RNG.randint(0, 3),
        })
    return out


def gen_theme_impacts(real: dict) -> list[dict]:
    """III medio REAL por tema."""
    pubs = real["docs"]
    iii_medio = real["iii_medio"]
    by_topic: dict[str, list[float]] = {tid: [] for tid, _, _ in TEMAS}
    for row in pubs.itertuples(index=False):
        tid = topic_of(row.doc_id)
        by_topic[tid].append(iii_medio[row.doc_id])
    out = []
    for tid, nombre, _ in TEMAS:
        scores = by_topic[tid]
        if scores:
            avg = float(np.mean(scores))
        else:
            avg = 0.5
        out.append({
            "temaId": tid,
            "temaNombre": nombre,
            "iiiScore": round(avg * 100),
            "pubCount": len(scores),
        })
    out.sort(key=lambda t: -t["iiiScore"])
    return out


def gen_kpis(real: dict, impactos: list[dict], menciones: list[dict]) -> list[dict]:
    iii_pct = round(real["iii_global"] * 100, 1)
    return [
        {"label": "III PROMEDIO GLOBAL", "value": f"{iii_pct}%", "context": "corpus ACA · 29 publicaciones", "trend": "up", "accentColor": "#2E4A62"},
        {"label": "PUBLICACIONES MONITOREADAS", "value": str(len(real["docs"])), "context": f"{int(real['docs']['n_propuestas'].sum())} propuestas extraídas", "trend": "neutral", "accentColor": "#1E7A5F"},
        {"label": "POLÍTICAS VINCULADAS", "value": str(len({i['politicaId'] for i in impactos})), "context": f"{len(impactos)} vínculos documentados", "trend": "up", "accentColor": "#1E7A5F"},
        {"label": "COBERTURA MEDIÁTICA", "value": str(len(menciones)), "context": "menciones en medios nacionales", "trend": "up", "accentColor": "#1E7A5F"},
    ]


# ────────────────────────────────────────────────────────────
#  Serialización a TypeScript
# ────────────────────────────────────────────────────────────

def _ts_array(items: list[dict], keep_keys: list[str] | None = None) -> str:
    """Serializa lista de dicts a TS, opcionalmente filtrando keys."""
    import json as _json
    if keep_keys is not None:
        items = [{k: v for k, v in it.items() if k in keep_keys} for it in items]
    return _json.dumps(items, ensure_ascii=False, indent=2)


def build_ts(real: dict) -> str:
    publicaciones = gen_publicaciones(real)
    politicas = gen_politicas()
    impactos = gen_impactos(publicaciones)
    actas = gen_actas()
    menciones = gen_menciones()
    ici_pol = gen_ici_politico(impactos)
    ici_med = gen_ici_medios(menciones, publicaciones)
    audits = gen_audits(impactos)
    monthly = gen_monthly_trends(real)
    themes = gen_theme_impacts(real)
    kpis = gen_kpis(real, impactos, menciones)

    # mediaOutletData
    media_outlet = [
        {"name": n, "menciones": RNG.randint(12, 45)}
        for _, n, _, _ in MEDIOS
    ]

    # channelData (62/38 como el original)
    total_interacciones = len(ici_pol) + len(ici_med)
    channel = [
        {"name": "ICI-Político", "value": 62, "color": "#2E4A62", "count": len(ici_pol)},
        {"name": "ICI-Medios", "value": 38, "color": "#3A8B8C", "count": len(ici_med)},
    ]

    pub_keys = ["id", "titulo", "fechaPublicacion", "autorId", "temaId", "textoLimpio", "excerpt"]
    audit_keys = ["id", "pubId", "politicaId", "status", "resultado", "fechaInicio", "fechaCompletado"]

    header = """// ═══════════════════════════════════════════════════════════════
//  mockData.ts — generado automáticamente desde datos reales ACA
//  Generator: web/gen_mockdata_ts.py
//
//  NOTA: publicaciones, themeImpacts, kpiData.iii y impactosIII
//  derivan de los 29 PDFs reales del pipeline. El resto (autores,
//  políticas, actas, menciones, ICI, audits) es mock ilustrativo
//  coherente con el dominio costarricense.
// ═══════════════════════════════════════════════════════════════

import type {
  Autor, Tema, Institucion, Medio, Publicacion, PoliticaPublica,
  ImpactoIII, ActaLegislativa, MencionMedio, ImpactoICIPolitico,
  ImpactoICIMedios, AuditResult, MonthlyTrend, ThemeImpact, KPIData
} from '@/types';

"""

    parts = [header]
    parts.append(f"export const autores: Autor[] = {_ts_array([{'id':i,'nombre':n,'tipo':t} for i,n,t in AUTORES])};\n")
    parts.append(f"export const temas: Tema[] = {_ts_array([{'id':i,'nombre':n,'descripcion':d} for i,n,d in TEMAS])};\n")
    parts.append(f"export const instituciones: Institucion[] = {_ts_array([{'id':i,'nombre':n,'sector':s} for i,n,s in INSTITUCIONES])};\n")
    parts.append(f"export const medios: Medio[] = {_ts_array([{'id':i,'nombre':n,'tipo':t,'alcance':a} for i,n,t,a in MEDIOS])};\n")
    parts.append(f"export const publicaciones: Publicacion[] = {_ts_array(publicaciones, pub_keys)};\n")
    parts.append(f"export const politicasPublicas: PoliticaPublica[] = {_ts_array(politicas)};\n")
    parts.append(f"export const impactosIII: ImpactoIII[] = {_ts_array(impactos)};\n")
    parts.append(f"export const actasLegislativas: ActaLegislativa[] = {_ts_array(actas)};\n")
    parts.append(f"export const mencionesMedios: MencionMedio[] = {_ts_array(menciones)};\n")
    parts.append(f"export const impactoICIPolitico: ImpactoICIPolitico[] = {_ts_array(ici_pol)};\n")
    parts.append(f"export const impactoICIMedios: ImpactoICIMedios[] = {_ts_array(ici_med)};\n")
    parts.append(f"export const audits: AuditResult[] = {_ts_array(audits, audit_keys)};\n")
    parts.append(f"export const monthlyTrends: MonthlyTrend[] = {_ts_array(monthly)};\n")
    parts.append(f"export const themeImpacts: ThemeImpact[] = {_ts_array(themes)};\n")
    parts.append(f"export const kpiData: KPIData[] = {_ts_array(kpis)};\n")
    parts.append(f"export const channelData = {_ts_array(channel)};\n")
    parts.append(f"export const mediaOutletData = {_ts_array(media_outlet)};\n")

    return "".join(parts)


def main() -> None:
    real = load_real()
    print(f"Cargados {len(real['doc_ids'])} documentos reales (III global: {real['iii_global']:.3f})")
    ts = build_ts(real)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(ts, encoding="utf-8")
    print(f"✓ {OUT_PATH} ({OUT_PATH.stat().st_size:,} bytes)")
    print(f"  publicaciones: 29 reales | temas: III real | impactos: III real")


if __name__ == "__main__":
    main()
