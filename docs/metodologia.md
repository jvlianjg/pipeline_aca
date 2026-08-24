# Metodología — Medición del Impacto de Ideas en Políticas Públicas (ACA)

**Versión:** 1.1 (prototipo)
**Fecha:** 2026-08-16
**Alcance:** definición formal y operativa de los índices **III** (Índice de Impacto de Ideas) e **ICI** (Índice de Canales de Influencia) y su implementación de referencia.

> **Cambios en v1.1:** (i) reescalado **empírico** de Alineación y Coincidencia
> (min-max dentro del corpus) en lugar del teórico `(coseno+1)/2`, que comprimía
> el índice en un rango estrecho sin poder de discriminación; (ii) *embedding*
> de documento calculado sobre **fragmentos de todo el cuerpo** (antes: primeros
> 1500 caracteres, dominados por portada e índice); (iii) temporalidad
> **asimétrica activada** por defecto (un blanco anterior a la fuente recibe
> temporalidad 0).

---

## 1. Objetivo

Cuantificar de forma consistente la **influencia potencial** y la **evidencia observable** de impacto de las publicaciones de asociados y *research fellows* de la Academia de Centroamérica (ACA) sobre la formulación de políticas públicas en Costa Rica.

El impacto de las ideas en políticas públicas **no es directamente observable ni binario**: ocurre en contextos complejos y se manifiesta de forma gradual. Por ello se proponen **dos índices complementarios**:

| Índice | Qué mide | Naturaleza |
|---|---|---|
| **III** — Índice de Impacto de Ideas | *Potencial* de influencia de una publicación sobre un blanco (política pública) | Predictivo / comparativo |
| **ICI** — Índice de Canales de Influencia | *Evidencia observable* de influencia a través de canales institucionales y mediáticos | Descriptivo / de seguimiento |

---

## 2. Índice de Impacto de Ideas (III)

### 2.1 Definición

Para una publicación fuente `f` y un blanco `b` (una política pública, o —en el prototipo actual— otra publicación), el III se define como una combinación lineal convexa de tres componentes en el rango [0, 1]:

```
III(f, b) = w₁ · Alineación(f, b)
          + w₂ · Coincidencia(f, b)
          + w₃ · Temporalidad(f, b)
```

con `w₁ + w₂ + w₃ = 1`.

**Pesos iniciales (acordados):** uniformes, `w₁ = w₂ = w₃ = 1/3`, para evitar subjetividad en esta primera fase. Su calibración empírica se describe en §5.

### 2.2 Alineación temática — `Alineación(f, b)`

Mide la similitud semántica global entre el documento fuente y el blanco.

- El *embedding* de cada documento es el promedio (renormalizado) de los
  *embeddings* de **fragmentos de ~600 caracteres muestreados uniformemente a lo
  largo de todo el texto** (hasta 24 por documento). El modelo de *embeddings*
  trunca la entrada a ~128 tokens, de modo que procesar el documento entero de
  una vez solo capturaba portada, créditos e índice.
- Se calcula la **similitud coseno** entre el *embedding* de `f` y el de `b`.
- Los *embeddings* provienen de un modelo multilingüe entrenado para lenguas romance (en este prototipo, `paraphrase-multilingual-MiniLM-L12-v2`, ejecutado localmente).
- Se reescala al rango [0, 1] de forma **empírica**: min-max sobre los pares
  fuera de la diagonal de la matriz del corpus.

```
Alineación(f, b) = (cos(emb(f), emb(b)) − min_corpus) / (max_corpus − min_corpus)
```

**Justificación del reescalado empírico:** los cosenos de este modelo viven en
la práctica en ~[0.1, 0.9], de modo que el reescalado teórico `(cos+1)/2`
acorralaba el componente en ~[0.55, 0.95] y el III resultante apenas
discriminaba (media ≈ 0.66 para pares arbitrarios). Con el min-max empírico, el
valor pasa a ser **relativo al corpus**: 1 = par más alineado del corpus,
0 = par menos alineado. Las escalas crudas (min, max) usadas se guardan en
`iii_matrix.npz` para auditoría.

### 2.3 Coincidencia de propuestas — `Coincidencia(f, b)`

Mide hasta qué punto las **propuestas concretas** de `f` aparecen recogidas en `b`. Es el componente más fino del III.

1. Se extrae un conjunto de propuestas `P(f) = {p₁, …, pₙ}` y `P(b) = {q₁, …, qₘ}` de cada documento (heurística local: detección de secciones "Propuestas/Recomendaciones", marcadores "se propone / recomendamos / debería" y listas).
2. Se calcula la matriz de similitud coseno entre todas las propuestas de `f` y todas las de `b`.
3. Para cada propuesta `pᵢ` de `f` se toma su **máxima** similitud con las de `b` (la mejor coincidencia).
4. Se agrega como la **media de esos máximos**, reescalada con el mismo
   **min-max empírico** de la matriz del corpus que la Alineación.

```
Coincidencia(f, b) = rescale_empírico( meanᵢ maxⱼ cos(emb(pᵢ), emb(qⱼ)) )
```

### 2.4 Temporalidad — `Temporalidad(f, b)`

Refleja que la influencia plausible requiere una secuencia temporal coherente: la propuesta debe ser **anterior** (o contemporánea) al blanco, y dentro de una ventana plausible.

- Sea `t_f` y `t_b` las fechas de publicación de `f` y `b`, y `Δ` la diferencia en meses calendario (`Δ = months_between(t_f, t_b)`; `Δ > 0` significa que el blanco es posterior).
- `W = 36 meses` es la **ventana temporal** acordada para esta fase.
- **Asimetría (activada por defecto desde v1.1):** si `t_b < t_f` (el blanco es
  anterior a la fuente), `Temporalidad = 0`: la influencia hacia el pasado es
  causalmente imposible.

```
                 ⎧ 0                        si  t_b < t_f   (asimetría)
Temporalidad =   ⎨ 1 − Δ/W                  si  0 ≤ Δ ≤ W
                 ⎩ 0                        si  Δ > W
```

> **Nota sobre la fecha incierta:** dado que buena parte de las fechas proviene
> de metadatos de digitalización, la asimetría se aplica de forma **ponderada**
> (la temporalidad aporta ⅓ del III) y no como puerta dura que anule todo el
> índice; así, un error de fecha de unos meses degrada el par sin destruirlo.
> El parámetro es configurable (`temporalidad_asimetrica` en `src/config.py`).

> **Nota operativa:** como hoy no se dispone del corpus de políticas públicas, en el prototipo `b` es otra publicación de ACA. La ventana de 36 meses y la fórmula se aplican igual; al incorporar políticas como blanco, el cálculo no requiere cambios.

### 2.5 Matriz III

Con `n` documentos se construye la matriz `III ∈ [0,1]^(n×n)` donde `III[i,j]` es el impacto potencial de `i` sobre `j` (i = **fuente**, j = **blanco**). La diagonal se anula. El **III medio** de una publicación `i` (media de su fila, excluyendo la diagonal) es su potencial de influencia **como fuente** y sirve como ranking; con la temporalidad asimétrica, las publicaciones más antiguas del corpus tienden a encabezarlo, pues tienen más blancos posteriores disponibles.

---

## 3. Índice de Canales de Influencia (ICI)

El III mide *potencial*; el ICI mide *evidencia observable* de que esa influencia efectivamente se materializó a través de canales concretos. Se descompone en dos subíndices:

```
ICI = α · ICI‑Político + (1 − α) · ICI‑Medios
```

con `α = 0.6` por defecto (se prioriza la evidencia institucional directa sobre la difusión mediática).

### 3.1 ICI‑Político

Captura la interacción **directa** con el proceso de formulación de políticas públicas.

| Señal | Definición operativa | Fuente | Escala |
|---|---|---|---|
| `audiencias` | Participación del autor/publicación en audiencias legislativas o consultas públicas | Asamblea Legislativa (SICOP / sistema de audiencias), ministerios | 0–1 (normalizada por nº de eventos) |
| `citacion_oficial` | Citación explícita del autor o de la publicación en documentos oficiales | Texto de proyectos de ley, dictámenes, votos, decretos | 0–1 (presencia/ausencia + frecuencia) |
| `informe_tecnico` | Uso de datos o análisis de la publicación en informes técnicos oficiales | Informes del BCCR, Hacienda, ministerios, contralorías | 0–1 |

Cada señal se normaliza a [0, 1] (binaria en su versión mínima, o escalada por frecuencia con un tope). El subíndice es la media de las señales disponibles:

```
ICI‑Político = media(s_audiencias, s_citacion, s_informe)
```

### 3.2 ICI‑Medios

Captura la presencia de las ideas en el **debate público**.

| Señal | Definición operativa | Fuente | Escala |
|---|---|---|---|
| `menciones_medios` | Número de menciones del autor/publicación en medios de comunicación | Hemerotecas digitales, APIs de medios, recortes de prensa | 0–1 (log-escalada con tope) |
| `espacio_opinion` | Aparición en espacios de opinión (columnas, editoriales, entrevistas) | Medios escritos, TV, radio, podcasts | 0–1 |

```
ICI‑Medios = media(s_menciones, s_espacio)
```

### 3.3 Estado de implementación

En esta fase **no se dispone de las fuentes externas** necesarias (actas, documentos oficiales, datos de medios). Por ello:

- El ICI está **especificado formalmente** (este documento) y con **interfaz de código y *data classes* listas** (`src/indexing/ici.py`).
- Se incluye `compute_ici()` **testeado con datos sintéticos** para validar la fórmula; al inyectar registros reales, el índice se calcula sin cambios de código.

### 3.4 Plan de recolección de datos (fase siguiente)

1. **Político:** descargar textos de proyectos de ley y dictámenes del sistema de información legislativa de Costa Rica; recopilar informes técnicos del BCCR, Ministerio de Hacienda y Contraloría General de la República.
2. **Medios:** habilitar *scraping*/API de hemerotecas y bases de recortes de prensa de ACA; definir lista cerrada de medios relevantes.
3. **Formato:** un CSV/JSON por señal con `(doc_id, fecha, fuente, intensidad)`.

---

## 4. Supuestos y limitaciones

1. **Comparación publicación-publicación como validación.** Sin corpus de políticas, el III se calcula entre las 24 publicaciones de estudio de ACA. Esto valida la maquinaria y permite rankear propuestas, pero **no** mide impacto real sobre políticas hasta disponer del blanco adecuado. Los 6 libros/ensayos del corpus original (divulgación, obras honorarias y análisis histórico-filosófico) se excluyeron del índice (`pdfs_excluidos/`) tras la validación de extracción: aportaban ruido, no propuestas (ver `docs/validacion_extraccion.md`).
2. **Pesos uniformes.** La asignación `1/3, 1/3, 1/3` es deliberadamente agnóstica; cualquier reajuste requiere evidencia.
3. **Calidad de la extracción de propuestas.** La heurística local (v1.1) incorpora: separación de oraciones que respeta enumeraciones numeradas, filtro de texto corrupto por repertorio español+ASCII (incluidos los tokens `(cid:NN)` de pdfplumber), vetos de ruido sistemático (usos causales/epistémicos de "deber", preguntas retóricas, fórmulas, meta-afirmaciones, copyright), descarte de viñetas sin verbo de acción fuera de secciones, deduplicación por texto normalizado, y aplicación de los límites de longitud antes del tope por documento. **Validación por muestreo estratificado** (3/doc, semilla 42, etiquetado manual; ver `docs/validacion_extraccion.md`): precisión ponderada ≈41 % global — ≈50 % en los estudios de política que hoy componen el corpus. Con la heurística el corpus arroja 685 propuestas (28.5/doc), 0 con texto corrupto. **Extractor LLM activo desde 2026-08-20** (`claude-haiku-4-5` vía `LLM_PROVIDER=anthropic`; adaptadores también para Gemini y OpenAI, prompts compartidos): fragmentos de 6k chars con solapamiento, temperature 0, JSON, caché por documento en `data/interim/llm_props/` y fallback a la heurística ante fallos de API. Corrida sobre el corpus: **845 propuestas** (35.2/doc) en 23 de 24 estudios; la validación por muestreo de esta extracción está en curso (`docs/validacion_extraccion.md`). La extracción de texto compara PyMuPDF y pdfplumber por calidad y conserva los metadatos del motor primario.
4. **Fechas.** La fecha de publicación se obtiene de metadatos del PDF y, en su defecto, de *regex* sobre el texto o nombre de archivo; algunas fechas pueden ser aproximadas (solo año). En el corpus actual el 100 % proviene de metadatos, que en digitalizaciones puede reflejar la fecha de escaneo y no la de publicación; esto afecta directamente al componente de temporalidad.
5. **Idioma.** Todo el corpus está en español; el modelo de *embeddings* es multilingüe con buen desempeño en lenguas romance.
6. **Escala relativa al corpus.** Con el reescalado empírico, los valores de III solo son comparables **dentro** del corpus sobre el que se calculó la matriz; al añadir o quitar documentos, los valores de todos los pares se recalculan.

---

## 5. Calibración empírica (trabajo futuro)

Cuando se disponga de pares `(publicación, política)` con impacto conocido:

1. **Análisis de sensibilidad:** variar `w₁, w₂, w₃` y `W` y observar la estabilidad del ranking.
2. **Ajuste supervisado:** si se obtiene un conjunto etiquetado (p. ej. validación de expertos), ajustar pesos por regresión o máximo impacto.
3. **Ventana temporal:** reestimar `W` a partir de la distribución real de tiempos entre propuesta e implementación (en este prototipo se fija en **36 meses** por acuerdo).
4. **Validación cruzada** del ICI frente a casos de influencia documentada.

---

## 6. Resumen ejecutivo de fórmulas

```
III(f,b) = 1/3·Alineación + 1/3·Coincidencia + 1/3·Temporalidad
  Alineación   = rescale_empírico( cos(emb_doc(f), emb_doc(b)) )
                   emb_doc = promedio de embeddings de fragmentos de todo el cuerpo
  Coincidencia = rescale_empírico( meanᵢ maxⱼ cos(emb(pᵢ), emb(qⱼ)) )
  Temporalidad = 0 si t_b < t_f;  si no, max(0, 1 − Δmeses/36)
  rescale_empírico(x) = (x − min_corpus) / (max_corpus − min_corpus)   [pares fuera de diagonal]

ICI = 0.6·ICI‑Político + 0.4·ICI‑Medios
```
