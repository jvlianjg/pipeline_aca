# Metodología — Medición del Impacto de Ideas en Políticas Públicas (ACA)

**Versión:** 1.0 (prototipo)
**Fecha:** 2026-07-14
**Alcance:** definición formal y operativa de los índices **III** (Índice de Impacto de Ideas) e **ICI** (Índice de Canales de Influencia) y su implementación de referencia.

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

- Se calcula la **similitud coseno** entre el *embedding* del texto completo (o un resumen representativo) de `f` y el de `b`.
- Los *embeddings* provienen de un modelo multilingüe entrenado para lenguas romance (en este prototipo, `paraphrase-multilingual-MiniLM-L12-v2`, ejecutado localmente).
- Se reescala al rango [0, 1]: `(coseno + 1) / 2`.

```
Alineación(f, b) = (cos(emb(f), emb(b)) + 1) / 2
```

### 2.3 Coincidencia de propuestas — `Coincidencia(f, b)`

Mide hasta qué punto las **propuestas concretas** de `f` aparecen recogidas en `b`. Es el componente más fino del III.

1. Se extrae un conjunto de propuestas `P(f) = {p₁, …, pₙ}` y `P(b) = {q₁, …, qₘ}` de cada documento (heurística local: detección de secciones "Propuestas/Recomendaciones", marcadores "se propone / recomendamos / debería" y listas).
2. Se calcula la matriz de similitud coseno entre todas las propuestas de `f` y todas las de `b`.
3. Para cada propuesta `pᵢ` de `f` se toma su **máxima** similitud con las de `b` (la mejor coincidencia).
4. Se agrega como la **media de esos máximos**, reescalada a [0, 1]:

```
Coincidencia(f, b) = meanᵢ [ maxⱼ (cos(emb(pᵢ), emb(qⱼ)) + 1)/2 ]
```

### 2.4 Temporalidad — `Temporalidad(f, b)`

Refleja que la influencia plausible requiere una secuencia temporal coherente: la propuesta debe ser **anterior** (o contemporánea) al blanco, y dentro de una ventana plausible.

- Sea `t_f` y `t_b` las fechas de publicación de `f` y `b`, y `Δ` la diferencia en meses calendario (`Δ = months_between(t_f, t_b)`).
- `W = 36 meses` es la **ventana temporal** acordada para esta fase.
- Fuera del intervalo `[-W, +W]`, `Temporalidad = 0`.

```
                 ⎧ 1 − |Δ|/W          si  |Δ| ≤ W  (y se prefiere t_f ≤ t_b)
Temporalidad =  ⎨
                 ⎩ 0                   si  |Δ| > W
```

**Asimetría opcional (no activada por defecto):** puede penalizarse el caso `t_f > t_b` (la fuente es posterior al blanco, causalmente imposible) con un factor `ρ ≤ 1`. En el prototipo se usa decaimiento simétrico para no descartar pares cercanos cuya fecha exacta sea incierta.

> **Nota operativa:** como hoy no se dispone del corpus de políticas públicas, en el prototipo `b` es otra publicación de ACA. La ventana de 36 meses y la fórmula se aplican igual; al incorporar políticas como blanco, el cálculo no requiere cambios.

### 2.5 Matriz III

Con `n` documentos se construye la matriz `III ∈ [0,1]^(n×n)` donde `III[i,j]` es el impacto potencial de `i` sobre `j`. La diagonal se anula. El **III medio** de una publicación `i` (excluyendo la diagonal) sirve como ranking de potencial de influencia.

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

1. **Comparación publicación-publicación como validación.** Sin corpus de políticas, el III se calcula entre las 30 publicaciones de ACA. Esto valida la maquinaria y permite rankear propuestas, pero **no** mide impacto real sobre políticas hasta disponer del blanco adecuado.
2. **Pesos uniformes.** La asignación `1/3, 1/3, 1/3` es deliberadamente agnóstica; cualquier reajuste requiere evidencia.
3. **Calidad de la extracción de propuestas.** La heurística local puede omitir propuestas implícitas o incluir ruido; el extractor basado en LLM (detrás de la misma interfaz) mejora la precisión cuando se active un proveedor comercial.
4. **Fechas.** La fecha de publicación se obtiene de metadatos del PDF y, en su defecto, de *regex* sobre el texto o nombre de archivo; algunas fechas pueden ser aproximadas (solo año).
5. **Idioma.** Todo el corpus está en español; el modelo de *embeddings* es multilingüe con buen desempeño en lenguas romance.

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
  Alineación   = (cos(emb(f), emb(b)) + 1)/2
  Coincidencia = meanᵢ maxⱼ (cos(emb(pᵢ), emb(qⱼ)) + 1)/2
  Temporalidad = max(0, 1 − |Δmeses|/36)

ICI = 0.6·ICI‑Político + 0.4·ICI‑Medios
```
