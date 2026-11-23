import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Permite usar el alias "@/..." (igual que en tsconfig.json) dentro de las pruebas.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
