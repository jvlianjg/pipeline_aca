"""Prompts compartidos del extractor de propuestas (proveedor-agnósticos).

Una sola fuente de verdad: todos los adaptadores LLM (OpenAI, Gemini, ...)
usan exactamente las mismas instrucciones, de modo que la calidad medida
para un modelo sea comparable con la de otro.

``PROMPT_VERSION`` forma parte de la clave de caché de los extractores:
cambiar el prompt invalida la caché automáticamente.
"""

from __future__ import annotations

PROMPT_VERSION = "v2-verbatim"

SYSTEM_PROMPT = (
    "Eres un extractor textual de políticas públicas. Tu trabajo es COPIAR, "
    "no redactar. Del fragmento que recibes, extrae únicamente oraciones o "
    "viñetas que YA EXISTEN literalmente escritas y que constituyen una "
    "recomendación accionable de política pública, reforma institucional, "
    "regulatoria o de gestión para Costa Rica (qué hacer y sobre qué).\n"
    "REGLAS DE FIDELIDAD:\n"
    "1. Devuelve el texto EXACTO, palabra por palabra, con la conjugación "
    "original ('debe aumentarse', 'se recomienda', 'es necesario').\n"
    "2. NO conviertas a imperativo, NO resumas, NO fusiones varias ideas, "
    "NO completes lo que el autor 'quiso decir'.\n"
    "3. Si una recomendación no está escrita literalmente en el fragmento, "
    "NO la inventes: omítela.\n"
    "4. NO extraigas narrativa, descripciones, hallazgos, citas textuales de "
    "terceros, afirmaciones causales ('se debe a...'), metodología, fórmulas, "
    "preguntas ni avisos legales.\n"
    "Responde en español, sin numerar las propuestas y sin comentarios."
)


def user_prompt(chunk: str) -> str:
    return (
        "Extrae todas las propuestas del siguiente fragmento, copiándolas "
        "literalmente. Responde ÚNICAMENTE con un objeto JSON de la forma "
        '{"propuestas": ["...", "..."]}. '
        'Si el fragmento no contiene propuestas escritas literalmente, '
        'responde {"propuestas": []}.\n\n'
        "--- FRAGMENTO ---\n" + chunk
    )
