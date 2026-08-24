# Validación de la extracción de propuestas

**Fecha:** 2026-08-20
**Objeto:** medir la **precisión** (calidad) del extractor heurístico de propuestas, no solo el volumen.

## Protocolo

- Muestreo estratificado: **3 propuestas al azar por documento**, semilla fija (42), extraídas de `data/processed/proposals.parquet`.
- Etiquetado manual de cada muestra con tres categorías:
  - **P (propuesta):** recomendación o acción de política/institucional relativamente concreta.
  - **B (borde):** enunciado normativo o directivo vago, sin acción concreta.
  - **N (no-propuesta):** narrativa, descriptiva, cita, fórmula, meta-afirmación o ruido.
- Métricas: precisión estricta = P/n; precisión ponderada = (P + 0.5·B)/n.
- Margen de error muestral (n≈88, p≈0.4): ±5 puntos porcentuales aprox.

## Resultados

| Medición | n | P | B | N | Precisión estricta | Precisión ponderada |
|---|---|---|---|---|---|---|
| Ronda 1 (mejoras mecánicas: splitter, filtro de texto corrupto, dedup) | 89 | 25 | 17 | 47 | 28 % | 38 % |
| Ronda 2 (+ vetos de ruido sistemático) | 87 | 25 | 22 | 40 | 29 % | 41 % |

Totales del corpus: 750 → 894 propuestas tras las mejoras mecánicas (recuperación de
oraciones fundidas y documentos hambrientos) → **849** tras los vetos de ruido
(−45 oraciones identificadas como no-propuestas por patrón, incluidas las
contracciones causales "debe al / se debe al").

### Patrones de ruido eliminados por los vetos (verificables en el corpus)

- "se debe a / no se debe a" (construcción causal confundida con directiva): 8+ casos.
- Usos epistémicos: "debe tenerse presente", "debe verse", "se debe notar".
- Preguntas retóricas con viñeta.
- Fórmulas econométricas ("Log(empleo) = …") y números de sección.
- Meta-afirmaciones ("el modelo que se propone utilizar…").
- Avisos de copyright ("La autorización para reproducir…").

### Desglose por tipo de documento (ronda 2)

| Tipo | Muestras | Precisión estricta | Precisión ponderada |
|---|---|---|---|
| Estudios de política (24 docs) | 69 | 36 % | ≈ 50 % |
| Libros/ensayos (6 docs: Integridad 365, Acción Humana Eficaz, Ensayos en honor…, Ideas y personajes…, Realidades embusteras, Denigración moderna…) | 18 | 0 % | ≈ 8 % |

## Conclusiones

1. La precisión ponderada global es **≈41 %** (±5 pp): la heurística léxica tiene un
   techo duro. El ruido restante proviene de (a) verbos deónticos embebidos en
   cláusulas subordinadas descriptivas y (b) documentos que no son de política.
2. Los seis documentos de tipo libro/ensayo aportan casi exclusivamente ruido;
   decidir si deben contribuir propuestas al índice (o solo al componente de
   alineación) es una decisión de curaduría del corpus pendiente.
3. Para subir la precisión de forma significativa se requiere el **extractor
   basado en LLM** (prometido en §4.3 de la metodología) o un **ciclo de
   validación humana**; el léxico por sí solo ya entregó lo que podía.

## Decisiones aplicadas tras la validación (2026-08-20)

- **Curaduría:** los 6 libros/ensayos se movieron a `pdfs_excluidos/` y quedan
  fuera del índice. El corpus pasa de 30 a **24 estudios de política** (685
  propuestas heurísticas). Con ello, la precisión esperable del extractor es la
  medida en la fila "estudios de política": ≈36 % estricta / ≈50 % ponderada.
- **Extractor LLM:** implementado para tres proveedores (`src/llm/anthropic_extractor.py`,
  `src/llm/gemini_extractor.py`, `src/llm/openai_extractor.py`; prompts compartidos
  en `src/llm/prompts.py`), con caché por documento, filtros y fallback a
  heurística. Smoke tests: `python tests/test_anthropic_extractor.py` (etc.).

## Corrida LLM sobre el corpus (2026-08-20, claude-haiku-4-5)

**Ejecutado** con `LLM_PROVIDER=anthropic` sobre los 24 estudios (651 fragmentos,
~30 min, costo estimado ≈$4 una sola vez; re-ejecuciones gratis por caché).

| Métrica | Heurística (24 docs) | LLM Haiku |
|---|---|---|
| Propuestas totales | 685 | **845** (35.2/doc) |
| Documentos con propuestas | 24 | 23 |
| III medio del corpus | 0.471 | **0.509** |

Observaciones de la corrida:

- La API rechaza `output_format` (JSON estricto); el adaptador lo detecta y
  degrada automáticamente (el prompt y el parseo tolerante a cercas Markdown lo
  cubren).
- `El-efecto-de-la-regulacion-sobre-comisiones` quedó en **0 propuestas** por
  decisión del propio modelo (verificado con llamada directa: responde
  `{"propuestas": []}`). Es un estudio de impacto empírico sin sección de
  recomendaciones explícitas; la heurística le fabricaba "propuestas" a partir
  de hallazgos. Punto de vigilancia en el etiquetado: confirmar que no es una
  pérdida por exceso de rigor.
- Tres documentos alcanzaron el tope de 40 propuestas/doc (`III.max_propuestas_por_doc`);
  evaluar subirlo si el etiquetado muestra alta precisión.

**Pendiente:** etiquetado de la muestra estratificada (`docs/muestra_validacion_llm.txt`,
69 propuestas, 3/doc, semilla 42) para medir la precisión de Haiku y compararla
con el ≈50 % ponderado de la heurística en los mismos 24 estudios.

### Re-extracción con prompt v2-verbatim (2026-08-21)

El prompt v1 producía paráfrasis/síntesis: solo 29 % de las 845 propuestas
era substring literal del fuente (verificación por containment), y el peor
documento (Política fiscal 2021) estaba en 1/18. Dos correctivas:

1. **Prompt v2** (`src/llm/prompts.py`, "tu trabajo es COPIAR, no redactar";
   omite recomendaciones no escritas literalmente). Versión incluida en la
   clave de caché de los tres extractores.
2. **Compuerta de verificación local** (`src/extraction/verify.py`,
   determinista y sin costo): alinea cada propuesta contra el texto fuente,
   corrige paráfrasis ligeras a la cita literal original, marca las no
   respaldadas y re-deduplica gemelas.

Resultado de la re-extracción (Haiku, ~$2, piloto previo de 1 doc a $0.05):

| Métrica | v1 | v2 + compuerta |
|---|---|---|
| Propuestas | 845 (826 tras dedup) | **677** |
| Texto literal verificado | 29 % (containment) | **96 %** (649/677) |
| Política fiscal 2021 | 1/18 literal | **15/15 literal** |
| Peor documento | 16 % | **85 %** |

La caída 845→677 es la honestidad del extractor: lo que ya no aparece son
las propuestas sintetizadas que el modelo inventaba al comprender el texto.
Las 28 no verificadas restantes quedan marcadas en la web (panel de revisión
de Análisis) para contraste humano. III medio del corpus: 0.497.

### Segundo pase de auditoría LLM (2026-08-20) — **revertido**

Se ejecutó un auditor automático (`src/llm/auditor.py`, misma API y taxonomía
P/B/N; ~$0.2, resultados conservados abajo como insumo de decisión). A pedido
del propietario **la auditoría se retiró del pipeline y de la web**: los
veredictos no se calculan ni se muestran; la revisión de calidad es manual,
desde el panel "Revisión de propuestas" de Análisis (dropdown + PDF original).
El módulo `src/llm/auditor.py` y su caché quedan inactivos; re-activarlos no
tiene costo adicional gracias a la caché. Resultado medido en su momento:

| Veredicto | n | % |
|---|---|---|
| P (propuesta válida) | 539 | 64 % |
| B (borde) | 272 | 32 % |
| N (ruido) | 34 | 4 % |

Precisión estricta estimada 64 %, ponderada (P + ½B) ≈ **80 %** — frente al
≈36 %/≈50 % de la heurística en el mismo corpus. **Caveat:** el auditor es el
mismo modelo que el extractor (Haiku), por lo que puede compartir sus puntos
ciegos; la cifra es orientativa hasta el contraste humano. Ese contraste se
hace desde la web: la página de Análisis incluye un dropdown de revisión por
publicación con el veredicto y la razón del auditor para cada propuesta.
Documentos con más B+N (candidatos a revisión manual primero): *Reciclaje de
activos públicos* (60 %), *En busca de una productividad inclusiva* (57 %),
*Después de la pandemia* (55 %), *ESTUDIOKAS_IA* (48 %), *Fortaleciendo el
Ecosistema Emprendedor* (48 %).

## Reproducibilidad

El muestreo se regenera con semilla 42 (3/doc) sobre `proposals.parquet`; las
etiquetas de ambas rondas están en el historial de este documento y el código
de vetos en `src/llm/local.py` (`_VETO_RE`, `_FORMULA_RE`, `_MAX_GARBAGE`).
