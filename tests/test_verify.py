"""Smoke test de la compuerta de verificación literal (local, sin API).

Uso:  python tests/test_verify.py
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.extraction.verify import verify_one, verify_proposals

DOC = (
    "El sistema de salud presenta problemas de coordinación. "
    "En términos de política económica, re-calibrar las cargas sociales puede "
    "aumentar el empleo formal y eso permite una mayor estabilidad del ingreso. "
    "El consejo fiscal ya existe pero no tiene presupuesto asignado para "
    "funcionar correctamente. Por otra parte, se recomienda crear un sistema "
    "nacional de métricas de productividad con datos abiertos."
)


def _doc_norm():
    from src.extraction.verify import _norm_mapped
    return _norm_mapped(DOC)


def test_todo():
    dn, mapa = _doc_norm()

    # 1) Copia exacta (con mayúscula distinta) ⇒ literal, cobertura 1.
    r = verify_one("Se recomienda crear un sistema nacional de métricas de productividad con datos abiertos.",
                   dn, mapa, DOC)
    assert r["estado"] == "literal" and r["cobertura"] >= 0.99, r
    print("1. copia exacta OK —", r["evidencia"][:60])

    # 2) Paráfrasis ligera ('para' en vez de 'puede', guion) ⇒ literal y
    #    auto-corregida a la conjugación original del documento.
    r = verify_one("Recalibrar las cargas sociales para aumentar el empleo formal",
                   dn, mapa, DOC)
    assert r["estado"] == "literal", r
    assert "puede aumentar" in r["evidencia"], r["evidencia"]
    print("2. paráfrasis ligera corregida a literal OK —", r["evidencia"][:70])

    # 3) Síntesis (inferida de un problema, no escrita) ⇒ no verificada.
    r = verify_one("Dotar al consejo fiscal de presupuesto suficiente para su funcionamiento",
                   dn, mapa, DOC)
    assert r["estado"] == "no_verificada", r
    print("3. síntesis detectada OK —", r["cobertura"])

    # 4) Texto inexistente ⇒ no verificada (las palabras comunes matchean
    #    dispersas, pero la compacidad lo rechaza).
    r = verify_one("Implementar un impuesto al carbono en todo el territorio nacional",
                   dn, mapa, DOC)
    assert r["estado"] == "no_verificada", r
    print("4. texto inexistente OK — cob:", r["cobertura"])

    # 5) Integridad del pipeline: columnas y re-dedup de gemelas.
    docs = [{"doc_id": "d1", "filename": "d1.pdf", "text": DOC}]
    df = pd.DataFrame([
        {"doc_id": "d1", "idx": 0, "text": "Recalibrar las cargas sociales para aumentar el empleo formal"},
        {"doc_id": "d1", "idx": 1, "text": "Re-calibrar las cargas sociales puede aumentar el empleo formal"},
    ])
    out = verify_proposals(docs, df)
    assert list(out.columns) == ["doc_id", "idx", "text", "estado", "cobertura", "evidencia"]
    assert len(out) == 1, out  # las gemelas colisionan tras normalizar
    assert out.iloc[0]["estado"] == "literal"
    print("5. pipeline + dedup de gemelas OK")

    print("\nTODO OK")


if __name__ == "__main__":
    test_todo()
