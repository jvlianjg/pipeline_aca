"""Servidor estático para la app React compilada del mockup ACA.

Sirve los archivos de ``dist/`` (la build de producción de Vite) con el
fallback SPA necesario para que react-router maneje rutas como /analisis.

Uso::

    python web/serve_dist.py            # → http://localhost:5000
"""

from __future__ import annotations

import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote

DIST_DIR = (Path(__file__).resolve().parent.parent
            / "Kimi_Agent_Pregunta antes de responder" / "app" / "dist")

if not DIST_DIR.exists():
    print(f"ERROR: No existe {DIST_DIR}")
    print("Ejecuta primero el build:  bun run vite build")
    print("  (dentro de 'Kimi_Agent_Pregunta antes de responder/app')")
    sys.exit(1)


class SPAHandler(SimpleHTTPRequestHandler):
    """Sirve estáticos; si no existe, devuelve index.html (SPA fallback)."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        # Limpiar query string y decodificar
        path = unquote(self.path.split("?", 1)[0].split("#", 1)[0])
        # Quitar slash inicial para resolver relativo a DIST_DIR
        rel = path.lstrip("/")
        candidate = DIST_DIR / rel

        # Si es un archivo estático que existe, servirlo normal
        if rel and candidate.is_file():
            return super().do_GET()

        # Si parece archivo con extensión pero no existe → 404 real
        if rel and "." in rel.split("/")[-1]:
            self.send_error(404, "Not Found")
            return

        # Cualquier otra ruta (incluida la raíz) → index.html (SPA)
        self.path = "/index.html"
        return super().do_GET()

    def log_message(self, fmt, *args):
        # Log ligero: solo método + ruta + código
        msg = fmt % args
        if '"GET' in msg:
            print(f"  {msg}", flush=True)

    def end_headers(self):
        # Cache corto para estáticos con hash, sin cache para index.html
        if "index.html" in self.path:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main() -> None:
    port = 5000
    host = "127.0.0.1"
    server = HTTPServer((host, port), SPAHandler)
    print("ACA · Sistema de Inteligencia — dashboard del mockup")
    print(f"  Sirviendo: {DIST_DIR}")
    print(f"  URL:       http://{host}:{port}")
    print(f"  Rutas:     /  /analisis  /canales  /auditoria  /configuracion")
    print()
    print("  Ctrl+C para detener.")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDetenido.")
        server.shutdown()


if __name__ == "__main__":
    main()
