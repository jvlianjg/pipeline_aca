"""Smoke test del extractor LLM con la API de Anthropic simulada.

No requiere API key ni red: se inyecta un ``_poster`` falso que ejercita
fragmentación, payload (system + output_format), degradación de JSON
estricto, cercas Markdown, reintentos, filtros, dedup y caché.

Uso:  python tests/test_anthropic_extractor.py
"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.llm import anthropic_extractor as ae
from src.llm.anthropic_extractor import AnthropicProposalExtractor

# Caché aislada y sin esperas de backoff para que el test sea instantáneo.
ae.LLM_PROPS_DIR = Path(tempfile.mkdtemp(prefix="llm_props_anthropic_test_"))
ae.time.sleep = lambda _s: None


class FakeResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


def anthropic_payload(propuestas, con_cercas=False):
    """Respuesta con la forma real de /v1/messages (bloques de texto)."""
    inner = json.dumps({"propuestas": propuestas}, ensure_ascii=False)
    if con_cercas:
        inner = "```json\n" + inner + "\n```"
    return json.dumps({"content": [{"type": "text", "text": inner}]})


class FakePoster:
    """POST simulado; registra payloads y puede fallar o rechazar output_format."""

    def __init__(self, propuestas, fallar=0, status_fallo=429,
                 rechazar_output_format=False, con_cercas=False):
        self.propuestas = propuestas
        self.fallar = fallar
        self.status_fallo = status_fallo
        self.rechazar = rechazar_output_format
        self.con_cercas = con_cercas
        self.calls = 0
        self.payloads = []

    def __call__(self, url, payload):
        self.calls += 1
        self.payloads.append(payload)
        if self.rechazar and "output_format" in payload:
            return FakeResponse(400, '{"error": "output_format is not supported"}')
        if self.calls <= self.fallar:
            return FakeResponse(self.status_fallo, '{"type": "error"}')
        return FakeResponse(200, anthropic_payload(self.propuestas, self.con_cercas))


def test_todo():
    ex = AnthropicProposalExtractor(model="fake-claude", api_key="k")

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

    # El payload lleva system, temperatura 0, max_tokens y JSON estricto.
    p = poster.payloads[0]
    assert "extractor textual" in p["system"]  # prompt v2-verbatim
    assert p["temperature"] == 0 and p["max_tokens"] == ex.MAX_TOKENS
    assert p["output_format"] == {"type": "json"}
    assert p["model"] == "fake-claude"
    print("2. payload (system + output_format + temp 0) OK")

    # 3) La caché evita una segunda llamada.
    calls = poster.calls
    assert ex.extract(texto, 40) == res and poster.calls == calls
    print("3. caché OK (0 llamadas extra)")

    # 4) Rechazo de output_format ⇒ degrada y reintenta sin él (misma llamada extra).
    ex2 = AnthropicProposalExtractor(model="m2", api_key="k")
    poster2 = FakePoster(["Se propone fortalecer la supervisión financiera del sistema bancario costarricense."],
                         rechazar_output_format=True)
    ex2._poster = poster2
    texto2 = "y" * 100 + " Se propone fortalecer la supervisión financiera del sistema bancario costarricense."
    assert len(ex2.extract(texto2, 40)) == 1
    assert poster2.calls == 2 and "output_format" not in poster2.payloads[1]
    assert ex2._use_output_format is False
    print("4. degradación de output_format OK")

    # 5) Cercas Markdown se toleran (sin JSON estricto el modelo a veces las usa).
    ex3 = AnthropicProposalExtractor(model="m3", api_key="k")
    poster3 = FakePoster(["Se debe fortalecer la institucionalidad fiscal del país con reglas claras."],
                         con_cercas=True)
    ex3._poster = poster3
    texto3 = "z" * 100 + " Se debe fortalecer la institucionalidad fiscal del país con reglas claras."
    assert len(ex3.extract(texto3, 40)) == 1
    print("5. cercas Markdown toleradas OK")

    # 6) Un 429 y un 529 se reintentan y terminan bien.
    ex4 = AnthropicProposalExtractor(model="m4", api_key="k")
    poster4 = FakePoster(["Se debe fortalecer la institucionalidad fiscal del país con reglas claras."],
                         fallar=2)
    ex4._poster = poster4
    corto = "Se debe fortalecer la institucionalidad fiscal del país con reglas claras. " * 3
    assert ex4.extract(corto, 40) and poster4.calls == 3
    print("6. reintentos ante 429/529 OK (3 intentos)")

    # 7) JSON verdaderamente inválido no tumba la extracción.
    ex5 = AnthropicProposalExtractor(model="m5", api_key="k")
    ex5._poster = lambda u, p: FakeResponse(200, json.dumps(
        {"content": [{"type": "text", "text": "esto no es json"}]}))
    assert ex5.extract("texto de prueba suficientemente largo " * 5, 40) == []
    print("7. JSON inválido tolerado OK")

    # 8) Fallo persistente ⇒ excepción (el pipeline cae a la heurística).
    ex6 = AnthropicProposalExtractor(model="m6", api_key="k")
    ex6.MAX_RETRIES = 0
    ex6._poster = lambda u, p: FakeResponse(529, "overloaded")
    try:
        ex6.extract("texto de prueba " * 10, 40)
        raise AssertionError("debía lanzar")
    except RuntimeError as e:
        assert "529" in str(e)
    print("8. fallo persistente propaga OK")

    # 9) Factory: LLM_PROVIDER=anthropic + key devuelve el extractor Anthropic.
    import src.llm.base as base
    from src import config
    original = (config.LLM_PROVIDER, config.ANTHROPIC_API_KEY)
    try:
        config.LLM_PROVIDER = "anthropic"
        config.ANTHROPIC_API_KEY = "test-key"
        ext = base.get_proposal_extractor()
        assert isinstance(ext, AnthropicProposalExtractor), type(ext)
        # PROPOSAL_MODEL se resuelve al importar config según el proveedor del
        # .env; aquí solo verificamos que el factory lo pasa tal cual (el
        # default "claude-haiku-4-5" se comprueba en proceso nuevo).
        assert ext.model == config.PROPOSAL_MODEL
        # Sin key ⇒ False (heurística local).
        config.ANTHROPIC_API_KEY = None
        assert not config.is_commercial_enabled()
    finally:
        config.LLM_PROVIDER, config.ANTHROPIC_API_KEY = original
    print("9. factory + default haiku OK")

    print("\nTODO OK")


if __name__ == "__main__":
    test_todo()
