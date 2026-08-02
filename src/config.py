"""Configuración central del sistema ACA de medición del impacto de ideas.

Todos los parámetros operativos (rutas, pesos del III, ventana temporal y modelo
de embeddings) se definen aquí para que el resto del código los consuma sin
valores mágicos repartidos por el pipeline.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Carga variables de entorno desde .env si existe.
load_dotenv()

# ────────────────────────────────────────────────────────────
#  Rutas del proyecto
# ────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PDF_DIR: Path = PROJECT_ROOT / "pdfs_aca"

DATA_DIR: Path = PROJECT_ROOT / "data"
RAW_DIR: Path = DATA_DIR / "raw"
INTERIM_DIR: Path = DATA_DIR / "interim"
PROCESSED_DIR: Path = DATA_DIR / "processed"

for _d in (RAW_DIR, INTERIM_DIR, PROCESSED_DIR):
    _d.mkdir(parents=True, exist_ok=True)


# ────────────────────────────────────────────────────────────
#  Parámetros del Índice de Impacto de Ideas (III)
# ────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class IIIConfig:
    """Pesos y ventana temporal del III.

    Por acuerdo inicial los pesos son uniformes (1/3 cada uno) para evitar
    subjetividad; la ventana temporal es de 36 meses por defecto y debería
    recalibrarse empíricamente cuando se disponga de datos de política.
    """

    w_alineacion: float = 1 / 3
    w_coincidencia: float = 1 / 3
    w_temporalidad: float = 1 / 3

    # Ventana temporal en meses: fuera de [-W, +W] la temporalidad es 0.
    ventana_meses: int = 36

    # Longitud (en caracteres) mínima/máxima de una oración candidata a propuesta.
    propuesta_min_chars: int = 30
    propuesta_max_chars: int = 600

    # Máximo de propuestas a retener por publicación tras deduplicación.
    max_propuestas_por_doc: int = 40


III = IIIConfig()


# ────────────────────────────────────────────────────────────
#  Parámetros del Índice de Canales de Influencia (ICI)
# ────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class ICIConfig:
    """Pesos del ICI. ICI = alpha*ICI_Politico + (1-alpha)*ICI_Medios."""

    alpha_politico: float = 0.6  # peso del componente institucional directo
    # alpha_medios = 1 - alpha_politico  (derivado)


ICI = ICIConfig()


# ────────────────────────────────────────────────────────────
#  Configuración de IA (capa híbrida local/comercial)
# ────────────────────────────────────────────────────────────
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "local").lower().strip()
EMBEDDING_MODEL: str = os.getenv(
    "EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
)
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY") or None


def is_commercial_enabled() -> bool:
    """True si hay proveedor comercial configurado y con API key."""
    return LLM_PROVIDER == "openai" and bool(OPENAI_API_KEY)


# ────────────────────────────────────────────────────────────
#  Utilidades de nomenclatura
# ────────────────────────────────────────────────────────────
def doc_id_from_filename(filename: str) -> str:
    """Convierte un nombre de PDF en un identificador estable (sin extensión)."""
    return Path(filename).stem
