import { createFileRoute } from "@tanstack/react-router";
import { setResponseHeader } from "@tanstack/react-start/server";
import { clearSessionCookie } from "../../login/-session";

/* BLOCO 1 — Registra o endpoint que encerra a sessão do usuário. */
export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      /* BLOCO 2 — Expira o cookie de sessão e devolve confirmação da saída. */
      POST: async () => {
        setResponseHeader("Set-Cookie", clearSessionCookie());
        return Response.json({ ok: true });
      },
    },
  },
});
