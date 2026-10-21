import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "livenexus_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.SESSION_SECRET || "dev-fallback-secret-at-least-32-chars-long-!!!";
  return value;
}

function signature(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(user) {
  if (user.role !== "admin" && user.role !== "user") {
    throw new Error("Papel de usuário inválido.");
  }

  const session = {
    user_id: user.user_id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return payload + "." + signature(payload);
}

export function createSessionCookie(user) {
  const token = createSessionToken(user);
  return (
    COOKIE_NAME +
    "=" +
    token +
    "; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=" +
    SESSION_TTL_SECONDS
  );
}

export function parseToken(value) {
  try {
    const separator = value.lastIndexOf(".");
    if (separator < 1) return null;

    const payload = value.slice(0, separator);
    const supplied = Buffer.from(value.slice(separator + 1));
    const expected = Buffer.from(signature(payload));

    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !session.user_id ||
      (session.role !== "admin" && session.role !== "user") ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function getHeader(source, name) {
  const headers = source && source.headers;

  if (headers && typeof headers.get === "function") {
    return headers.get(name) || "";
  }

  const value = headers && (headers[name.toLowerCase()] ?? headers[name]);
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export function readSession(source) {
  try {
    const authorization = getHeader(source, "authorization");

    if (authorization.startsWith("Bearer ")) {
      const parsed = parseToken(authorization.slice(7).trim());
      if (parsed) return parsed;
    }

    const cookieHeader = getHeader(source, "cookie");
    const entry = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(COOKIE_NAME + "="));

    if (entry) {
      return parseToken(entry.slice(COOKIE_NAME.length + 1));
    }

    return null;
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
