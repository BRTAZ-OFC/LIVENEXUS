import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/* Base do LIVENEXUS-CONSEPT: Vite + React, com proxy para a API Express. */
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: ["localhost", ".run.app"],
    // Ambientes hospedados que não encaminham WebSocket devem manter o HMR desligado.
    // Para habilitá-lo explicitamente em um ambiente compatível, defina ENABLE_HMR=true.
    hmr: process.env["ENABLE_HMR"] === "true" ? {} : false,
    watch: process.env["ENABLE_HMR"] === "true" ? {} : null,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
}));
