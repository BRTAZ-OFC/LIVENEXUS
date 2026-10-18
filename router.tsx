/* BLOCO 1 — Importa o roteador TanStack e a árvore de rotas gerada. */
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/* BLOCO 2 — Cria o roteador e ativa restauração de rolagem. */
export function createRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  });
}

export const getRouter = createRouter;

/* BLOCO 3 — Informa ao TypeScript qual instância de roteador a aplicação utiliza. */
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
