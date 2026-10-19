import { createHmac, timingSafeEqual } from "node:crypto";

/* BLOCO 1 — Nome do cookie e duração máxima de uma sessão autenticada. */
const COOKIE_NAME = "livenexus_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type Session = {
  user_id: string;
  role: "user" | "admin";
  exp: number;
};

/* BLOCO 2 — Lê e valida o segredo privado usado para assinar sessões. */
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error(
      "Erro de configuração: a variável de ambiente SESSION_SECRET não está configurada.",
    );
  }
  if (value.length < 32) {
    throw new Error(
      "Erro de configuração: SESSION_SECRET precisa estar configurada com pelo menos 32 caracteres.",
    );
  }
  return value;
}

/* BLOCO 3 — Gera a assinatura criptográfica HMAC-SHA256 do token. */
function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/* BLOCO 4 — Monta o token com ID do usuário, papel e horário de expiração. */
export function createSessionToken(user: { user_id: string; role?: string }) {
  if (user.role !== "admin" && user.role !== "user") {
    throw new Error("Papel de usuário inválido.");
  }
  const session: Session = {
    user_id: user.user_id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

/* BLOCO 5 — Define o cookie HttpOnly da sessão autenticada. */
export function createSessionCookie(user: { user_id: string; role?: string }) {
  const value = createSessionToken(user);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${SESSION_TTL_SECONDS}`;
}

/* BLOCO 6 — Confere assinatura, formato, papel e vencimento do token. */
export function parseToken(value: string): Session | null {
  try {
    const separator = value.lastIndexOf(".");
    if (separator < 1) return null;
    const payload = value.slice(0, separator);
    const supplied = Buffer.from(value.slice(separator + 1));
    const expected = Buffer.from(signature(payload));
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (
      !session.user_id ||
      (session.role !== "admin" && session.role !== "user") ||
      session.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return session;
  } catch {
    return null;
  }
}

/* BLOCO 7 — Recupera a sessão por Bearer token ou cookie de autenticação. */
export function readSession(request: Request): Session | null {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const parsed = parseToken(authHeader.slice(7).trim());
      if (parsed) return parsed;
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const entry = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_NAME}=`));
    if (entry) {
      const value = entry.slice(COOKIE_NAME.length + 1);
      const parsed = parseToken(value);
      if (parsed) return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/* BLOCO 8 — Expira o cookie e padroniza a resposta para acesso de admin. */
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function adminOnlyResponse() {
  return Response.json(
    { ok: false, message: "Acesso permitido somente para administradores." },
    { status: 403 },
  );
}
