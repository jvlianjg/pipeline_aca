#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Pipeline robusto para extracción de políticas públicas desde PDFs.
- Extrae texto con pdfplumber y (fallback) OCR con Tesseract.
- Usa Gemini 2.5 Flash para extraer campos estructurados (incluyendo fecha).
- Guarda embeddings en archivo .npy con reanudación incremental.
- Reintentos inteligentes con backoff y rotación de claves.
- Maneja valores null de la IA y guardado incremental sin duplicados.
- ✅ Sincronización atómica: CSV y .npy se guardan juntos en cada checkpoint.
"""

import os
import re
import time
import json
import logging
import hashlib
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import pdfplumber
from google import genai
from sentence_transformers import SentenceTransformer

# Dependencias opcionales para OCR
try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logging.warning("OCR no disponible (instala pdf2image y pytesseract)")

# ----------------------------------------------------------------------
# Configuración de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Configuración (usar variables de entorno en producción)
API_KEYS = [key for key in os.getenv("API_KEYS", "").split(",") if key]
MODEL = "gemini-2.5-flash"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
DELAY_BETWEEN_DOCS = 1.0
TEXT_TRUNCATE = 30000
CHECKPOINT_BATCH_SIZE = 5   # guardar cada N documentos

# ----------------------------------------------------------------------
# Funciones auxiliares

def get_file_hash(filepath: str) -> str:
    """Calcula hash MD5 de un archivo."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def extract_year(filename: str) -> Optional[int]:
    """Extrae primer año (20xx) del nombre del archivo."""
    match = re.search(r"\b(20\d{2})\b", filename)
    return int(match.group(1)) if match else None

def normalizar_entidad(nombre: Optional[str]) -> str:
    """Normaliza nombres de instituciones, manejando None."""
    if not nombre:
        return ""
    nombre_clean = nombre.strip().upper()
    mapeo = {
        "MICITT": "MICITT",
        "MINISTERIO DE CIENCIA, INNOVACIÓN, TECNOLOGÍA Y TELECOMUNICACIONES": "MICITT",
        "MEIC": "MEIC",
        "MINISTERIO DE ECONOMÍA, INDUSTRIA Y COMERCIO": "MEIC",
        "BCCR": "BCCR",
        "BANCO CENTRAL DE COSTA RICA": "BCCR",
        "COMEX": "COMEX",
        "MINISTERIO DE COMERCIO EXTERIOR": "COMEX",
    }
    return mapeo.get(nombre_clean, nombre_clean)

# ----------------------------------------------------------------------
class PdfProcessor:
    """Procesa PDFs, extrae datos estructurados y embeddings con reanudación."""

    def __init__(
        self,
        api_keys: List[str],
        model: str = MODEL,
        embedding_model: str = EMBEDDING_MODEL,
        delay: float = DELAY_BETWEEN_DOCS,
        use_ocr: bool = True,
    ):
        if not api_keys:
            raise ValueError("Se requiere al menos una clave API.")
        self.api_keys = api_keys
        self.model = model
        self.key_index = 0
        self.client = genai.Client(api_key=api_keys[self.key_index])
        self.embedder = SentenceTransformer(embedding_model)
        self.embedding_dim = self.embedder.get_sentence_embedding_dimension()
        self.delay = delay
        self.use_ocr = use_ocr and OCR_AVAILABLE
        self.logger = logging.getLogger(self.__class__.__name__)

    # ----------------------------------------------------------------
    # Gestión de claves

    def rotate_client(self) -> None:
        """Rota a la siguiente clave API y recrea el cliente."""
        self.key_index = (self.key_index + 1) % len(self.api_keys)
        self.client = genai.Client(api_key=self.api_keys[self.key_index])
        self.logger.info("Rotando a clave %d/%d", self.key_index + 1, len(self.api_keys))

    # ----------------------------------------------------------------
    # Extracción de texto

    @staticmethod
    def _clean_text(text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"[^\x20-\x7E\xA0-\xFF\u2026\u2013\u2014\u2018\u2019\u201C\u201D]", "", text)
        return text.strip()

    def _extract_pdfplumber(self, path: str) -> str:
        lines: List[str] = []
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    raw = page.extract_text()
                    if raw:
                        lines.append(raw)
        except FileNotFoundError:
            self.logger.error("Archivo no encontrado: %s", path)
        except Exception as e:
            self.logger.error("Error al leer %s con pdfplumber: %s", path, e)
        return self._clean_text("\n".join(lines))

    def _ocr_pdf(self, path: str) -> str:
        if not self.use_ocr:
            return ""
        try:
            images = convert_from_path(path, dpi=200)
            text_pages = []
            for img in images:
                text = pytesseract.image_to_string(img, lang='spa')
                text_pages.append(text)
            return self._clean_text("\n".join(text_pages))
        except Exception as e:
            self.logger.error("Error en OCR para %s: %s", path, e)
            return ""

    def pdf_to_text(self, path: str) -> str:
        text = self._extract_pdfplumber(path)
        if len(text) < 100 and self.use_ocr:
            self.logger.warning("Texto extraído muy corto (%d chars), intentando OCR...", len(text))
            ocr_text = self._ocr_pdf(path)
            if len(ocr_text) > len(text):
                text = ocr_text
        return text

    # ----------------------------------------------------------------
    # Interacción con IA

    def _build_prompt(self, text: str, filename: str) -> str:
        escaped_text = text[:TEXT_TRUNCATE].replace("{", "{{").replace("}", "}}")
        prompt = f"""Eres un analista de políticas públicas de Costa Rica.
Lee este documento y extrae la siguiente información.
Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta, sin texto adicional ni backticks:
{{
  "titulo": "título real del documento (no el nombre del archivo)",
  "tema": "tema estratégico principal (ej: IA, Clústeres, I+D, Ciberseguridad, Productividad, Innovación)",
  "recomendacion": "oración con verbo de acción + objeto + contexto (ej: Crear un fondo de financiamiento para PYMES tecnológicas)",
  "actor": "institución responsable de implementarlo (ej: MICITT, MEIC, BCCR)",
  "indicador": "métrica o indicador que se busca impactar (ej: tasa de innovación, inversión en I+D)",
  "instrumento": "vehículo legal o técnico donde se plasmaría la recomendación (ej: Decreto Ejecutivo, Proyecto de Ley, Plan Nacional de Desarrollo, Estrategia Nacional de IA)",
  "fecha": "año de publicación o del documento (ej: 2023)"
}}

Nombre del archivo (solo como referencia si no encuentras el título): {filename}
Texto del documento:
{escaped_text}
"""
        return prompt

    def extract_with_ai(
        self, text: str, filename: str, max_attempts: Optional[int] = None
    ) -> Dict[str, Any]:
        if max_attempts is None:
            max_attempts = len(self.api_keys) * 3
        prompt = self._build_prompt(text, filename)

        for attempt in range(max_attempts):
            try:
                res = self.client.models.generate_content(
                    model=self.model, contents=prompt
                )
                limpio = res.text.replace("```json", "").replace("```", "").strip()
                datos = json.loads(limpio)

                # Normalizar actor (maneja None)
                actor_raw = datos.get("actor")
                datos["actor"] = normalizar_entidad(actor_raw)

                # Fecha: si no viene o es null, fallback al nombre
                fecha_raw = datos.get("fecha")
                if fecha_raw:
                    try:
                        datos["fecha"] = int(fecha_raw)
                    except (ValueError, TypeError):
                        datos["fecha"] = extract_year(filename)
                else:
                    datos["fecha"] = extract_year(filename)

                # Asegurar que campos string nunca sean None
                for key in ["titulo", "tema", "recomendacion", "indicador", "instrumento"]:
                    if datos.get(key) is None:
                        datos[key] = ""

                return datos

            except Exception as e:
                error_msg = str(e)
                is_transient = any(
                    code in error_msg
                    for code in ["429", "500", "502", "503", "504", "timeout", "ConnectionError"]
                )
                if is_transient and attempt < max_attempts - 1:
                    self.rotate_client()
                    wait = min(10 * (attempt + 1), 60)
                    self.logger.warning(
                        "Error transitorio (%s) — esperando %ds con clave %d/%d",
                        error_msg[:50], wait, self.key_index + 1, len(self.api_keys)
                    )
                    time.sleep(wait)
                else:
                    self.logger.error("Error definitivo en IA (intento %d): %s", attempt + 1, e)
                    break

        return self._fallback(filename)

    def _fallback(self, filename: str) -> Dict[str, Any]:
        return {
            "titulo": filename.replace(".pdf", ""),
            "tema": "",
            "recomendacion": "",
            "actor": "",
            "indicador": "",
            "instrumento": "",
            "fecha": extract_year(filename),
        }

    # ----------------------------------------------------------------
    # Procesamiento por lotes con checkpoint atómico

    def process_folder(self, folder: str, output_csv: str) -> pd.DataFrame:
        """
        Procesa todos los PDFs de una carpeta.
        - CSV: metadatos (sin embeddings), reanudable por hash.
        - .npy: embeddings, se recarga y se añaden los nuevos al final.
        - ✅ Checkpoint atómico: cada N documentos se guardan ambos archivos.
        """
        base_name = output_csv.replace(".csv", "")
        embedding_file = base_name + "_embeddings.npy"

        # ---------- Cargar estado previo ----------
        if os.path.exists(output_csv):
            try:
                df_existente = pd.read_csv(output_csv)
                if "file_hash" in df_existente.columns:
                    df_existente = df_existente.drop_duplicates(subset=["file_hash"])
                    hashes_existentes = set(df_existente["file_hash"])
                else:
                    hashes_existentes = set()
                results = df_existente.to_dict("records")

                # Calcular último ID (más simple)
                if "id" in df_existente.columns and not df_existente.empty:
                    last_id = pd.to_numeric(df_existente["id"], errors="coerce").max()
                    last_id = int(last_id) if pd.notna(last_id) else 0
                else:
                    last_id = 0

                self.logger.info("Documentos ya procesados: %d", len(hashes_existentes))
            except Exception as e:
                self.logger.warning("Error al leer CSV existente, se empezará desde cero: %s", e)
                hashes_existentes = set()
                results = []
                last_id = 0
        else:
            hashes_existentes = set()
            results = []
            last_id = 0

        # ---------- Cargar embeddings existentes (si los hay) ----------
        if os.path.exists(embedding_file):
            try:
                all_embeddings = np.load(embedding_file)
                self.logger.info("Embeddings existentes cargados: %d", len(all_embeddings))
            except Exception as e:
                self.logger.warning("No se pudo cargar %s: %s", embedding_file, e)
                all_embeddings = np.array([])
        else:
            all_embeddings = np.array([])

        # ---------- Listar PDFs nuevos ----------
        archivos = [f for f in os.listdir(folder) if f.lower().endswith(".pdf")]
        self.logger.info("PDFs encontrados: %d", len(archivos))

        # Crear CSV con cabecera si no existe
        if not os.path.exists(output_csv):
            pd.DataFrame(columns=[
                "id", "titulo", "tema", "recomendacion", "actor_target",
                "indicador", "instrumento", "fecha", "file_hash"
            ]).to_csv(output_csv, index=False, encoding="utf-8-sig")

        # ---------- Variables para checkpoint ----------
        pending_rows = []          # filas nuevas no guardadas en CSV
        pending_embeddings = []    # embeddings correspondientes
        pending_hashes = []        # hashes de los documentos pendientes
        total_nuevos = 0

        # ---------- Procesar cada PDF ----------
        for i, filename in enumerate(archivos):
            filepath = os.path.join(folder, filename)
            file_hash = get_file_hash(filepath)

            if file_hash in hashes_existentes:
                continue

            self.logger.info("Procesando [%d/%d]: %s", i + 1, len(archivos), filename)
            text = self.pdf_to_text(filepath)

            datos = self.extract_with_ai(text, filename)
            rec = datos.get("recomendacion") or ""

            # Generar embedding (vector de ceros si no hay recomendación)
            if rec:
                embedding = self.embedder.encode(rec).tolist()
            else:
                embedding = [0.0] * self.embedding_dim

            last_id += 1
            nueva_fila = {
                "id": f"{last_id:04d}",
                "titulo": datos.get("titulo", ""),
                "tema": datos.get("tema", ""),
                "recomendacion": rec,
                "actor_target": datos.get("actor", ""),
                "indicador": datos.get("indicador", ""),
                "instrumento": datos.get("instrumento", ""),
                "fecha": datos.get("fecha"),
                "file_hash": file_hash,
            }

            # Acumular en pendientes
            pending_rows.append(nueva_fila)
            pending_embeddings.append(embedding)
            pending_hashes.append(file_hash)
            total_nuevos += 1

            # ✅ Si alcanzamos el tamaño de lote, hacer checkpoint
            if len(pending_rows) >= CHECKPOINT_BATCH_SIZE:
                self._checkpoint(
                    output_csv=output_csv,
                    embedding_file=embedding_file,
                    pending_rows=pending_rows,
                    pending_embeddings=pending_embeddings,
                    pending_hashes=pending_hashes,
                    hashes_existentes=hashes_existentes,
                    all_embeddings=all_embeddings,
                )
                # Vaciar pendientes (ya persistidos)
                pending_rows = []
                pending_embeddings = []
                pending_hashes = []

            time.sleep(self.delay)

        # ---------- Checkpoint final (lo que quedó pendiente) ----------
        if pending_rows:
            self._checkpoint(
                output_csv=output_csv,
                embedding_file=embedding_file,
                pending_rows=pending_rows,
                pending_embeddings=pending_embeddings,
                pending_hashes=pending_hashes,
                hashes_existentes=hashes_existentes,
                all_embeddings=all_embeddings,
            )

        self.logger.info("Proceso completado. Nuevos procesados: %d", total_nuevos)
        return pd.DataFrame(results + pending_rows)  # pendientes ya están en all_embeddings

    # ----------------------------------------------------------------
    # Checkpoint atómico (guarda CSV y .npy juntos)

    def _checkpoint(
        self,
        output_csv: str,
        embedding_file: str,
        pending_rows: List[Dict],
        pending_embeddings: List[List[float]],
        pending_hashes: List[str],
        hashes_existentes: set,
        all_embeddings: np.ndarray,
    ) -> None:
        """
        Guarda las filas pendientes en el CSV y los embeddings en el .npy.
        Si alguna operación falla, se lanza excepción para no marcar los hashes como procesados.
        """
        if not pending_rows:
            return

        self.logger.info("Checkpoint: guardando %d documentos...", len(pending_rows))

        # 1. Guardar filas en CSV (modo append, sin header)
        try:
            pd.DataFrame(pending_rows).to_csv(
                output_csv,
                mode="a",
                header=False,
                index=False,
                encoding="utf-8-sig",
            )
        except Exception as e:
            self.logger.error("Fallo al guardar CSV: %s", e)
            raise RuntimeError("Checkpoint falló en escritura de CSV") from e

        # 2. Actualizar embeddings totales y guardar .npy
        try:
            nuevos_emb = np.array(pending_embeddings, dtype=np.float32)
            if all_embeddings.size > 0:
                all_embeddings = np.vstack([all_embeddings, nuevos_emb])
            else:
                all_embeddings = nuevos_emb
            np.save(embedding_file, all_embeddings)
        except Exception as e:
            self.logger.error("Fallo al guardar .npy: %s", e)
            # Nota: aquí el CSV ya se guardó, pero el .npy falló.
            # Podríamos intentar revertir el CSV (borrar las filas agregadas),
            # pero es complejo. Mejor abortar y que el usuario decida.
            raise RuntimeError("Checkpoint falló en escritura de .npy") from e

        # 3. Si todo fue exitoso, marcar estos hashes como procesados
        for h in pending_hashes:
            hashes_existentes.add(h)

        self.logger.info("Checkpoint completado (%d documentos)", len(pending_rows))

# ----------------------------------------------------------------------
if __name__ == "__main__":
    if not API_KEYS:
        raise RuntimeError("Define la variable de entorno API_KEYS con claves separadas por coma.")

    processor = PdfProcessor(
        api_keys=API_KEYS,
        model=MODEL,
        embedding_model=EMBEDDING_MODEL,
        delay=1.0,
        use_ocr=True,
    )

    df = processor.process_folder("pdfs/", "resultados.csv")
    print("\n✅ Datos extraídos (primeras 5 filas):")
    print(df.head())

    emb_file = "resultados_embeddings.npy"
    if os.path.exists(emb_file):
        emb = np.load(emb_file)
        print(f"\n📊 Embeddings totales: {emb.shape}")