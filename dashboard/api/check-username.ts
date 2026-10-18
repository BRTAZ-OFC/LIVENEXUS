import { createFileRoute } from "@tanstack/react-router";

/* BLOCO 1 — Registra o endpoint de verificação de nome de usuário. */
export const Route = createFileRoute("/api/check-username")({
  server: {
    handlers: {
      /* BLOCO 2 — Valida tamanho, consulta a existência no JSON e devolve o resultado. */
      GET: async ({ request }) => {
        const username = new URL(request.url).searchParams.get("user")?.trim() ?? "";
        if (username.length < 3 || username.length > 32) {
          return Response.json(
            { ok: false, exists: false, message: "O usuário deve ter entre 3 e 32 caracteres." },
            { status: 400 },
          );
        }
        try {
          const { usernameExists } = await import("../admin/banco/-crud.js");
          const exists = await usernameExists(username);
          return Response.json({ ok: true, exists });
        } catch {
          return Response.json(
            { ok: false, message: "Não foi possível verificar o nome de usuário." },
            { status: 500 },
          );
        }
      },
    },
  },
});
