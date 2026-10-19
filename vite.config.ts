import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

/* Vite + React; as APIs são atendidas pelo Express em desenvolvimento. */
export default defineConfig({
  plugins: [tailwindcss(), tsconfigPaths({ projects: ["./tsconfig.json"] }), react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: true } },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: true } },
  },
});
