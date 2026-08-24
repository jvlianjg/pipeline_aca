"""Smoke test del extractor LLM con un cliente OpenAI simulado.

No requiere API key ni el paquete `openai`: se inyecta un cliente falso que
ejerce fragmentación, parseo JSON, filtros, dedup, caché y reintentos.

Uso:  python tests/test_openai_extractor.py
"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.llm import openai_extractor as oe
from src.llm.openai_extractor import OpenAIProposalExtractor

# Caché aislada para que las corridas del test no colisionen entre sí ni con
# la caché real del proyecto.
oe.LLM_PROPS_DIR = Path(tempfile.mkdtemp(prefix="llm_props_test_"))


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeChoice:
    def __init__(self, content):
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]


class FakeClient:
    """Cliente con la forma openai.OpenAI: client.chat.completions.create(...)."""

    def __init__(self, payload):
        self._payload = payload
        self.calls = 0
        outer = self

        class _Completions:
            def create(self, **kwargs):
                outer.calls += 1
                return FakeResponse(
                    json.dumps({"propuestas": outer._payload}, ensure_ascii=False)
                )

        class _Chat:
            completions = _Completions()

        self.chat = _Chat()


def test_todo():
    ex = OpenAIProposalExtractor(model="fake-model")

    # 1) Respuesta con ruido: duplicado, demasiado corta, corrupta y una real.
    fake = FakeClient([
        "Se recomienda crear un fondo nacional de residuos con aportes presupuestarios.",
        "Se recomienda crear un fondo nacional de residuos con aportes presupuestarios.",  # dup exacto
        "Corto.",                                          # < min_chars
        "Debe őŅÁä¿ĈÁÁĩŉőÁ... invertir.",                  # texto corrupto
    ])
    ex._client = fake
    texto = "x" * 100 + " Se recomienda crear un fondo nacional de residuos con aportes presupuestarios."
    res = ex.extract(texto, max_proposals=40)
    assert len(res) == 1, res
    assert "fondo nacional" in res[0]
    print("1. filtros (dup/corta/corrupta) OK —", res[0][:60])

    # 2) La caché evita una segunda llamada.
    calls_antes = fake.calls
    res2 = ex.extract(texto, max_proposals=40)
    assert res2 == res and fake.calls == calls_antes, "no usó la caché"
    print("2. caché OK (0 llamadas extra)")

    # 3) Cambiar el modelo invalida la caché.
    ex2 = OpenAIProposalExtractor(model="otro-modelo")
    fake2 = FakeClient(["Se propone fortalecer la supervisión financiera del sistema bancario costarricense."])
    ex2._client = fake2
    res3 = ex2.extract(texto, max_proposals=40)
    assert len(res3) == 1 and fake2.calls == 1
    print("3. caché por modelo OK")

    # 4) Fragmentación: texto largo ⇒ varias llamadas; tope MAX_CHUNKS.
    ex3 = OpenAIProposalExtractor(model="m3")
    ex3.CHUNK_CHARS = 1000
    ex3.CHUNK_OVERLAP = 100
    fake3 = FakeClient([])
    ex3._client = fake3
    # ~96k chars con paso efectivo de 900 chars/fragmento ⇒ >60 fragmentos ⇒ tope.
    largo = ("palabra " * 12000) + " Se debe fortalecer la institucionalidad fiscal del país con reglas claras."
    ex3.extract(largo, max_proposals=40)
    esperado = ex3.MAX_CHUNKS
    assert fake3.calls == esperado, (fake3.calls, esperado)
    print(f"4. fragmentación OK ({fake3.calls} fragmentos, tope {esperado})")

    # 5) Respuesta no-JSON no tumba la extracción.
    ex4 = OpenAIProposalExtractor(model="m4")
    class ClienteRoto:
        class chat:
            class completions:
                @staticmethod
                def create(**kw):
                    return FakeResponse("esto no es json")

    ex4._client = ClienteRoto()
    res5 = ex4.extract("texto de prueba suficientemente largo " * 5, 40)
    assert res5 == []
    print("5. JSON inválido tolerado OK")

    # 6) Fallo persistente ⇒ excepción (el pipeline cae a la heurística).
    class ClienteQueFallla:
        class chat:
            class completions:
                @staticmethod
                def create(**kw):
                    raise RuntimeError("api down")

    ex5 = OpenAIProposalExtractor(model="m5")
    ex5.MAX_RETRIES = 0
    ex5._client = ClienteQueFallla()
    try:
        ex5.extract("texto de prueba " * 10, 40)
        raise AssertionError("debía lanzar")
    except RuntimeError as e:
        assert "api down" in str(e)
    print("6. fallo persistente propaga OK (pipeline usaría heurística)")

    # 7) Fallback en proposals.py.
    import src.llm.base as base
    original = base.get_proposal_extractor
    class Explota:
        def extract(self, *a, **k):
            raise RuntimeError("boom")
    base.get_proposal_extractor = lambda: Explota()
    try:
        from src.extraction.proposals import extract_proposals
        props = extract_proposals("doc_test", "Se recomienda crear un sistema nacional de métricas de productividad. " * 3)
        assert props and "sistema nacional" in props[0].text
        print(f"7. fallback heurístico OK ({len(props)} propuestas)")
    finally:
        base.get_proposal_extractor = original

    print("\nTODO OK")


if __name__ == "__main__":
    test_todo()
