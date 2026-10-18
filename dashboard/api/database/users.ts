import { createFileRoute } from "@tanstack/react-router";
import { adminOnlyResponse, readSession } from "../../login/-session";

export const Route = createFileRoute("/api/database/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (readSession(request)?.role !== "admin") return adminOnlyResponse();
        try {
          const { listUsers } = await import("../../admin/banco/-crud.js");
          const users = await listUsers();
          return Response.json({ ok: true, users });
        } catch {
          return Response.json(
            { ok: false, message: "Não foi possível carregar a tabela de usuários." },
            { status: 500 },
          );
        }
      },
      PATCH: async ({ request }) => {
        if (readSession(request)?.role !== "admin") return adminOnlyResponse();
        try {
          const body = await request.json();
          const userId = typeof body.user_id === "string" ? body.user_id : "";
          const supplied = body.changes;
          if (!userId || !supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
            return Response.json(
              { ok: false, message: "Dados de edição inválidos." },
              { status: 400 },
            );
          }

          const changes: Record<string, unknown> = {};
          if (Object.hasOwn(supplied, "user")) changes.user = supplied.user;
          if (Object.hasOwn(supplied, "role")) changes.role = supplied.role;
          if (Object.hasOwn(supplied, "imagen")) changes.imagen = supplied.imagen;

          if (Object.keys(changes).length === 0) {
            return Response.json(
              { ok: false, message: "Nenhum campo editável foi enviado." },
              { status: 400 },
            );
          }

          const { updateUser } = await import("../../admin/banco/-crud.js");
          const user = await updateUser(userId, changes);
          return Response.json({ ok: true, user });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível salvar as alterações.";
          const status = message === "Usuário não encontrado." ? 404 : 400;
          return Response.json({ ok: false, message }, { status });
        }
      },
      DELETE: async ({ request }) => {
        const session = readSession(request);
        if (session?.role !== "admin") return adminOnlyResponse();
        try {
          const body = await request.json().catch(() => ({}));
          const userId = typeof body.user_id === "string" ? body.user_id : "";
          if (!userId) {
            return Response.json(
              { ok: false, message: "ID do usuário não fornecido." },
              { status: 400 },
            );
          }
          if (session.user_id === userId) {
            return Response.json(
              {
                ok: false,
                message: "Não é permitido excluir o usuário atualmente autenticado.",
              },
              { status: 400 },
            );
          }
          const { deleteUser } = await import("../../admin/banco/-crud.js");
          const deleted = await deleteUser(userId);
          if (!deleted) {
            return Response.json(
              { ok: false, message: "Usuário não encontrado." },
              { status: 404 },
            );
          }
          return Response.json({ ok: true, message: "Usuário excluído com sucesso." });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível excluir o usuário.";
          return Response.json({ ok: false, message }, { status: 400 });
        }
      },
    },
  },
});
