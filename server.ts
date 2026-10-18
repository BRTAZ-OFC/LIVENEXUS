/* BLOCO 1 — Gera HTML mínimo para responder a erros inesperados do servidor. */
function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Estamos em Desenvolvimento</title></head>
<body style="font:15px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:1.5rem;color:#fff;background:#090d16">
<main style="max-width:28rem;text-align:center"><h1>Estamos em Desenvolvimento</h1><p>Voltaremos em breve.</p></main>
</body></html>`;
}

/* BLOCO 2 — Define o formato esperado do ponto de entrada TanStack Start. */
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

/* BLOCO 3 — Guarda a importação do servidor para reutilizar a mesma promessa. */
let serverEntryPromise: Promise<ServerEntry> | undefined;

/* BLOCO 4 — Carrega o módulo de servidor sob demanda. */
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (module) => (module.default ?? module) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

/* BLOCO 5 — Encaminha as requisições e devolve resposta de erro em caso de falha. */
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      return await handler.fetch(request, env, ctx);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
