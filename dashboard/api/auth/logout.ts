import { createFileRoute } from "@tanstack/react-router";
import { setResponseHeader } from "@tanstack/react-start/server";
import { clearSessionCookie } from "../../login/-session";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        setResponseHeader("Set-Cookie", clearSessionCookie());
        return Response.json({ ok: true });
      },
    },
  },
});
