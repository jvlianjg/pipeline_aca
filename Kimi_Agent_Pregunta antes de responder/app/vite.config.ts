import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
// Nota: el plugin `kimi-plugin-inspect-react` se retiró porque es una
// herramienta de inspección interna de Kimi (no pública en npm, solo útil
// en modo desarrollo). No afecta el resultado visual del build.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
