import { createFileRoute } from "@tanstack/react-router";
import { adminOnlyResponse, readSession } from "../../login/-session";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export const Route = createFileRoute("/api/database/avaliacoes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = readSession(request);
        if (session?.role !== "admin") return adminOnlyResponse();
        try {
          const { listAvaliacoes } = await import("../../admin/banco/-avaliacao-crud.js");
          const avaliacoes = await listAvaliacoes();
          return Response.json({ ok: true, avaliacoes }, { headers: NO_CACHE_HEADERS });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível carregar as avaliações.";
          return Response.json({ ok: false, message }, { status: 500, headers: NO_CACHE_HEADERS });
        }
      },
      PATCH: async ({ request }) => {
        const session = readSession(request);
        if (session?.role !== "admin") return adminOnlyResponse();
        try {
          const body = await request.json().catch(() => ({}));
          const avaliacaoId = typeof body.avaliacao_id === "string" ? body.avaliacao_id : "";
          const supplied = body.changes;
          if (
            !avaliacaoId ||
            !supplied ||
            typeof supplied !== "object" ||
            Array.isArray(supplied)
          ) {
            return Response.json(
              { ok: false, message: "Dados de edição inválidos." },
              { status: 400 },
            );
          }

          const changes: Record<string, unknown> = {};
          if (Object.hasOwn(supplied, "nome")) changes.nome = supplied.nome;
          if (Object.hasOwn(supplied, "nota")) changes.nota = supplied.nota;
          if (Object.hasOwn(supplied, "mensagem")) changes.mensagem = supplied.mensagem;
          if (Object.hasOwn(supplied, "resposta_admin"))
            changes.resposta_admin = supplied.resposta_admin;

          if (Object.keys(changes).length === 0) {
            return Response.json(
              { ok: false, message: "Nenhum campo editável foi enviado." },
              { status: 400 },
            );
          }

          const { updateAvaliacao } = await import("../../admin/banco/-avaliacao-crud.js");
          const adminUser = session.role;
          const avaliacao = await updateAvaliacao(avaliacaoId, changes, adminUser);
          return Response.json({ ok: true, avaliacao }, { headers: NO_CACHE_HEADERS });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível salvar as alterações.";
          const status = message === "Avaliação não encontrada." ? 404 : 400;
          return Response.json({ ok: false, message }, { status, headers: NO_CACHE_HEADERS });
        }
      },
      DELETE: async ({ request }) => {
        const session = readSession(request);
        if (session?.role !== "admin") return adminOnlyResponse();
        try {
          const body = await request.json().catch(() => ({}));
          const avaliacaoId = typeof body.avaliacao_id === "string" ? body.avaliacao_id : "";
          if (!avaliacaoId) {
            return Response.json(
              { ok: false, message: "ID da avaliação não fornecido." },
              { status: 400, headers: NO_CACHE_HEADERS },
            );
          }
          const { deleteAvaliacao } = await import("../../admin/banco/-avaliacao-crud.js");
          const deleted = await deleteAvaliacao(avaliacaoId);
          if (!deleted) {
            return Response.json(
              { ok: false, message: "Avaliação não encontrada." },
              { status: 404, headers: NO_CACHE_HEADERS },
            );
          }
          return Response.json(
            { ok: true, message: "Avaliação excluída com sucesso." },
            { headers: NO_CACHE_HEADERS },
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível excluir a avaliação.";
          return Response.json({ ok: false, message }, { status: 400, headers: NO_CACHE_HEADERS });
        }
      },
    },
  },
});
