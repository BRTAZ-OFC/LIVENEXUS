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
    // O AI Studio pode desativar o HMR durante alterações automatizadas.
    hmr: process.env["DISABLE_HMR"] !== "true",
    watch: process.env["DISABLE_HMR"] === "true" ? null : {},
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
}));
