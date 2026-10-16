import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

type Credentials = {
  user: string;
  password: string;
};

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

export const loginUser = createServerFn({ method: "POST" })
  .validator((data: Credentials) => data)
  .handler(async ({ data }) => {
    const { authenticateUser } = await import("../admin/banco/-crud.js");
    const user = await authenticateUser(data.user, data.password);
    if (!user) {
      return { ok: false as const, message: "Usuário ou senha incorretos." };
    }
    const { createSessionCookie } = await import("./-session");
    setResponseHeader("Set-Cookie", createSessionCookie(user));
    return { ok: true as const, user, message: "Login validado com sucesso." };
  });
