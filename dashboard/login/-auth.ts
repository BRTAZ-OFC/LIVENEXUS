import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

/* BLOCO 1 — Estrutura dos dados enviados às funções seguras de autenticação. */
type Credentials = {
  user: string;
  password: string;
};

/* BLOCO 2 — Cadastro no servidor: grava usuário via CRUD JSON e omite senha no retorno. */
export const registerUser = createServerFn({ method: "POST" })
  .validator((data: Credentials) => data)
  .handler(async ({ data }) => {
    try {
      const { createUser } = await import("../admin/banco/-crud.js");
      const user = await createUser({
        user: data.user,
        password: data.password,
      });
      return { ok: true as const, user, message: "Conta criada com sucesso." };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a conta.";
      return { ok: false as const, message };
    }
  });

/* BLOCO 3 — Login no servidor: valida credenciais, cria token e define cookie de sessão. */
export const loginUser = createServerFn({ method: "POST" })
  .validator((data: Credentials) => data)
  .handler(async ({ data }) => {
    try {
      const { authenticateUser } = await import("../admin/banco/-crud.js");
      const user = await authenticateUser(data.user, data.password);
      if (!user) {
        return { ok: false as const, message: "Usuário ou senha incorretos." };
      }
      const { createSessionCookie, createSessionToken } = await import("./-session");
      const token = createSessionToken(user);
      setResponseHeader("Set-Cookie", createSessionCookie(user));
      return { ok: true as const, user, token, message: "Login validado com sucesso." };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro interno ao processar o login.";
      return { ok: false as const, message };
    }
  });
