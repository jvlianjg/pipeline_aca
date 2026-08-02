# ACA · Medición del Impacto de Ideas en Políticas Públicas

Prototipo para cuantificar de forma consistente el impacto de las publicaciones
de la Academia de Centroamérica (ACA) sobre la formulación de políticas públicas
en Costa Rica, mediante dos índices complementarios:

- **III — Índice de Impacto de Ideas:** potencial de influencia (alineación
  temática + coincidencia de propuestas + temporalidad).
- **ICI — Índice de Canales de Influencia:** evidencia observable a través de
  canales políticos y mediáticos (especificado; a la espera de fuentes externas).

La definición formal y operativa está en [`docs/metodologia.md`](docs/metodologia.md).

---

## Requisitos

- Python 3.10+
- Los 30 PDFs en `pdfs_aca/` (ya incluidos en este proyecto)

## Instalación

```bash
pip install -r requirements.txt
```

> El primer arranque descargará el modelo de embeddings local
> (`paraphrase-multilingual-MiniLM-L12-v2`, ~470 MB) automáticamente.

## Configuración (opcional)

Copia `.env.example` a `.env`. Por defecto el sistema funciona **100 % en local**.
Para activar un proveedor comercial de embeddings (OpenAI):

```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
```

## Uso

### 1. Ejecutar el pipeline (extracción → propuestas → embeddings → matriz III)

```bash
python -m src.pipeline
```

Para ignorar la caché y reprocesar todo:

```bash
python -m src.pipeline --force
```

Artefactos generados en `data/processed/`:

| Archivo | Contenido |
|---|---|
| `documents.parquet` | metadatos por publicación + III medio |
| `proposals.parquet` | propuestas extraídas por publicación |
| `iii_matrix.npz` | matriz III (30×30) + componentes + doc_ids |
| `embeddings_doc.npy` | embeddings de documento |
| `embeddings_prop.npz` | embeddings de propuestas por documento |

### 2. Lanzar el dashboard

```bash
streamlit run app/dashboard.py
```

Vistas disponibles:

- **Resumen** — métricas globales y lista de publicaciones.
- **Ranking III** — publicaciones ordenadas por potencial de impacto + top pares.
- **Matriz de similitud** — heatmap publicación-publicación (III o cada componente).
- **Explorador de propuestas** — propuestas por publicación con buscador.
- **Metodología** — resumen de las fórmulas.
- **ICI (próximamente)** — estado y plan de recolección de datos.

## Estructura

```
.
├── pdfs_aca/                 # 30 PDFs fuente
├── docs/metodologia.md       # definición formal de III e ICI
├── src/
│   ├── config.py             # rutas, pesos, ventana temporal (36 m)
│   ├── utils.py              # normalización de texto, helpers temporales
│   ├── extraction/           # texto y propuestas desde PDFs
│   ├── llm/                  # capa híbrida local/comercial
│   ├── indexing/             # III e ICI
│   └── pipeline.py           # orquestación end-to-end
└── app/dashboard.py          # dashboard Streamlit
```

## Alcance del prototipo

- ✅ **III** implementado y ejecutado sobre los 30 PDFs (publicación-publicación,
  como validación de la maquinaria).
- ✅ **ICI** especificado y con interfaz de código lista (`src/indexing/ici.py`),
  testeado con datos sintéticos; pendiente de fuentes externas.
- ✅ IA **híbrida**: local por defecto, comercial enchufable vía `.env`.
- ⏳ III sobre políticas públicas reales (requiere corpus de políticas).
- ⏳ Calibración empírica de pesos y ventana temporal.
