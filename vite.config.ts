import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/* Vite integrado ao servidor HTTP do Express, seguindo o padrão do BACKUP01. */
export default defineConfig(() => ({
  root: rootDir,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env["API_URL"] || "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
}));
