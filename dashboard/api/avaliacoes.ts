import { createFileRoute } from "@tanstack/react-router";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export const Route = createFileRoute("/api/avaliacoes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { listAvaliacoes } = await import("../admin/banco/-avaliacao-crud.js");
          const avaliacoes = await listAvaliacoes();
          return Response.json({ ok: true, avaliacoes }, { headers: NO_CACHE_HEADERS });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível carregar as avaliações.";
          return Response.json({ ok: false, message }, { status: 500, headers: NO_CACHE_HEADERS });
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const { nome, nota, mensagem } = body;
          const { createAvaliacao } = await import("../admin/banco/-avaliacao-crud.js");
          const avaliacao = await createAvaliacao({ nome, nota, mensagem });
          return Response.json(
            { ok: true, avaliacao, message: "Avaliação enviada com sucesso!" },
            { headers: NO_CACHE_HEADERS },
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível enviar a avaliação.";
          return Response.json({ ok: false, message }, { status: 400, headers: NO_CACHE_HEADERS });
        }
      },
    },
  },
});
