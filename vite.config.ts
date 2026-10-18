import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

function preventJsonReloadPlugin() {
  return {
    name: "prevent-json-reload",
    handleHotUpdate({ file }: { file: string }) {
      if (file.endsWith("usuario.json") || file.includes("/json/") || file.includes("\\json\\")) {
        return [];
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    preventJsonReloadPlugin(),
    tanstackStart({
      srcDirectory: "dashboard",
      router: {
        entry: "../router",
        routesDirectory: ".",
        generatedRouteTree: "../routeTree.gen.ts",
        routeFileIgnorePattern: ".*(\\.json|/json/).*",
      },
      start: { entry: "../start" },
      server: { entry: "../server" },
    }),
    command === "build" ? nitro({ defaultPreset: "node-server" }) : undefined,
    viteReact(),
  ].filter(Boolean),
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
}));
