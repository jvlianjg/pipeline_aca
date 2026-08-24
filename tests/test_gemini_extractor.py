"""Smoke test del extractor LLM con la API de Gemini simulada.

No requiere API key ni red: se inyecta un ``_poster`` falso que ejercita
fragmentación, payload (system_instruction + JSON), reintentos, filtros,
dedup y caché.

Uso:  python tests/test_gemini_extractor.py
"""
import json
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.llm import gemini_extractor as ge
from src.llm.gemini_extractor import GeminiProposalExtractor

# Caché aislada y sin esperas de backoff para que el test sea instantáneo.
ge.LLM_PROPS_DIR = Path(tempfile.mkdtemp(prefix="llm_props_gemini_test_"))
ge.time.sleep = lambda _s: None


class FakeResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


def gemini_payload(propuestas):
    """Respuesta con la forma real de generateContent (JSON dentro de parts)."""
    inner = json.dumps({"propuestas": propuestas}, ensure_ascii=False)
    return json.dumps(
        {"candidates": [{"content": {"role": "model",
                                     "parts": [{"text": inner}]}}]}
    )


class FakePoster:
    """POST simulado; registra los payload para inspección y puede fallar N veces."""

    def __init__(self, propuestas, fallar=0, status_fallo=500):
        self.propuestas = propuestas
        self.fallar = fallar
        self.status_fallo = status_fallo
        self.calls = 0
        self.payloads = []

    def __call__(self, url, payload):
        self.calls += 1
        self.payloads.append(payload)
        self.url = url
        if self.calls <= self.fallar:
            return FakeResponse(self.status_fallo, '{"error": "boom"}')
        return FakeResponse(200, gemini_payload(self.propuestas))


def test_todo():
    ex = GeminiProposalExtractor(model="fake-gemini", api_key="k", rpm=0)

    # 1) Filtros: duplicado, corta, corrupta y una real.
    poster = FakePoster([
        "Se recomienda crear un fondo nacional de residuos con aportes presupuestarios.",
        "Se recomienda crear un fondo nacional de residuos con aportes presupuestarios.",  # dup exacto
        "Corto.",                                          # < min_chars
        "Debe őΝÁä¿ĈÁÁĩŉőÁ... invertir.",                  # texto corrupto
    ])
    ex._poster = poster
    texto = "x" * 100 + " Se recomienda crear un fondo nacional de residuos con aportes presupuestarios."
    res = ex.extract(texto, max_proposals=40)
    assert len(res) == 1 and "fondo nacional" in res[0], res
    print("1. filtros (dup/corta/corrupta) OK —", res[0][:60])

    # El payload lleva system_instruction, temperatura 0 y modo JSON.
    p = poster.payloads[0]
    assert "extractor textual" in p["system_instruction"]["parts"][0]["text"]  # v2
    assert p["generationConfig"]["temperature"] == 0
    assert p["generationConfig"]["responseMimeType"] == "application/json"
    assert poster.url.endswith("models/fake-gemini:generateContent")
    print("2. payload (system_instruction + JSON + temp 0) OK")

    # 3) La caché evita una segunda llamada.
    calls = poster.calls
    assert ex.extract(texto, 40) == res and poster.calls == calls
    print("3. caché OK (0 llamadas extra)")

    # 4) Cambiar el modelo invalida la caché.
    ex2 = GeminiProposalExtractor(model="otro-gemini", api_key="k")
    poster2 = FakePoster(["Se propone fortalecer la supervisión financiera del sistema bancario costarricense."])
    ex2._poster = poster2
    assert len(ex2.extract(texto, 40)) == 1 and poster2.calls == 1
    print("4. caché por modelo OK")

    # 5) Fragmentación: texto largo ⇒ varias llamadas; tope MAX_CHUNKS.
    ex3 = GeminiProposalExtractor(model="m3", api_key="k")
    ex3.CHUNK_CHARS = 1000
    ex3.CHUNK_OVERLAP = 100
    poster3 = FakePoster([])
    ex3._poster = poster3
    largo = ("palabra " * 12000) + " Se debe fortalecer la institucionalidad fiscal del país con reglas claras."
    ex3.extract(largo, 40)
    assert poster3.calls == ex3.MAX_CHUNKS, (poster3.calls, ex3.MAX_CHUNKS)
    print(f"5. fragmentación OK ({poster3.calls} fragmentos, tope {ex3.MAX_CHUNKS})")

    # 6) Un 500 y un 429 se reintentan y terminan bien.
    ex4 = GeminiProposalExtractor(model="m4", api_key="k")
    poster4 = FakePoster(["Se debe fortalecer la institucionalidad fiscal del país con reglas claras."], fallar=2)
    ex4._poster = poster4
    # un doc pequeño ⇒ 1 fragmento ⇒ 3 intentos (1 fallo + 2 reintentos) para 2 fallos
    corto = "Se debe fortalecer la institucionalidad fiscal del país con reglas claras. " * 3
    res4 = ex4.extract(corto, 40)
    assert res4 and poster4.calls == 3, poster4.calls
    print("6. reintentos ante 500/429 OK (3 intentos)")

    # 7) JSON inválido no tumba la extracción.
    ex5 = GeminiProposalExtractor(model="m5", api_key="k")
    ex5._poster = lambda u, p: FakeResponse(200, json.dumps(
        {"candidates": [{"content": {"parts": [{"text": "esto no es json"}]}}]}))
    assert ex5.extract("texto de prueba suficientemente largo " * 5, 40) == []
    print("7. JSON inválido tolerado OK")

    # 8) Fallo persistente ⇒ excepción (el pipeline cae a la heurística).
    ex6 = GeminiProposalExtractor(model="m6", api_key="k")
    ex6.MAX_RETRIES = 0
    ex6._poster = lambda u, p: FakeResponse(503, "down")
    try:
        ex6.extract("texto de prueba " * 10, 40)
        raise AssertionError("debía lanzar")
    except RuntimeError as e:
        assert "503" in str(e)
    print("8. fallo persistente propaga OK")

    # 9) Factory: con LLM_PROVIDER=gemini + key devuelve el extractor Gemini.
    import src.llm.base as base
    from src import config
    original = (config.LLM_PROVIDER, config.GEMINI_API_KEY)
    try:
        config.LLM_PROVIDER = "gemini"
        config.GEMINI_API_KEY = "test-key"
        ext = base.get_proposal_extractor()
        assert isinstance(ext, GeminiProposalExtractor), type(ext)
        assert config.is_commercial_enabled()
    finally:
        config.LLM_PROVIDER, config.GEMINI_API_KEY = original
    print("9. factory get_proposal_extractor() OK")

    # 10) Proveedor gemini sin API key ⇒ False (heurística local).
    try:
        config.LLM_PROVIDER = "gemini"
        config.GEMINI_API_KEY = None
        assert not config.is_commercial_enabled()
    finally:
        config.LLM_PROVIDER, config.GEMINI_API_KEY = original
    print("10. proveedor sin key ⇒ False OK")

    print("\nTODO OK")


if __name__ == "__main__":
    test_todo()
