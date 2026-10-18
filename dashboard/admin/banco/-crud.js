/**
 * CRUD server-side para usuários armazenados em JSON.
 * IMPORTANTE: usar somente no servidor Node.js; nunca importar este arquivo no frontend.
 * O campo password contém um hash scrypt (nunca a senha em texto puro).
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USERS_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "json", "usuario.json");

async function readUsers() {
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("O arquivo usuario.json precisa conter uma lista.");
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeUsers(users) {
  await mkdir(dirname(USERS_FILE), { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o644,
    flush: true,
  });
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const actual = scryptSync(password, parts[1], 64);
    const expected = Buffer.from(parts[2], "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function listUsers() {
  return (await readUsers()).map(({ password, ...user }) => user);
}

export async function getUserById(user_id) {
  const user = (await readUsers()).find((item) => item.user_id === user_id);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export async function usernameExists(user) {
  if (typeof user !== "string") return false;
  const normalized = user.trim().toLowerCase();
  if (!normalized) return false;
  return (await readUsers()).some((item) => item.user.toLowerCase() === normalized);
}

export async function createUser({ user, password, imagen = null, role = "user" }) {
  if (typeof user !== "string" || user.trim().length < 3 || user.trim().length > 32) {
    throw new Error("O usuário deve ter entre 3 e 32 caracteres.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }
  const users = await readUsers();
  if (users.some((item) => item.user.toLowerCase() === user.trim().toLowerCase())) {
    throw new Error("Esse nome de usuário já está em uso.");
  }
  if (role !== "user" && role !== "admin") {
    throw new Error("O role deve ser user ou admin.");
  }
  const now = new Date().toISOString();
  const record = {
    user_id: randomUUID(),
    user: user.trim(),
    role,
    password: hashPassword(password),
    imagen,
    data_criacao: now,
    data_atualizacao: now,
  };
  users.push(record);
  await writeUsers(users);
  const { password: ignored, ...safeUser } = record;
  return safeUser;
}

export async function updateUser(user_id, changes = {}) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.user_id === user_id);
  if (index < 0) throw new Error("Usuário não encontrado.");
  const current = users[index];
  const next = { ...current };
  if (changes.user !== undefined) {
    if (
      typeof changes.user !== "string" ||
      changes.user.trim().length < 3 ||
      changes.user.trim().length > 32
    ) {
      throw new Error("O usuário deve ter entre 3 e 32 caracteres.");
    }
    if (
      users.some(
        (item, i) => i !== index && item.user.toLowerCase() === changes.user.trim().toLowerCase(),
      )
    ) {
      throw new Error("Esse nome de usuário já está em uso.");
    }
    next.user = changes.user.trim();
  }
  if (changes.password !== undefined) {
    if (typeof changes.password !== "string" || changes.password.length < 8)
      throw new Error("A senha deve ter pelo menos 8 caracteres.");
    next.password = hashPassword(changes.password);
  }
  if (changes.imagen !== undefined) next.imagen = changes.imagen;
  if (changes.role !== undefined) {
    if (changes.role !== "user" && changes.role !== "admin")
      throw new Error("O role deve ser user ou admin.");
    next.role = changes.role;
  }
  next.data_atualizacao = new Date().toISOString();
  users[index] = next;
  await writeUsers(users);
  const { password, ...safeUser } = next;
  return safeUser;
}

export async function deleteUser(user_id) {
  const users = await readUsers();
  const targetId = String(user_id ?? "").trim();
  const index = users.findIndex((item) => String(item.user_id ?? "").trim() === targetId);
  if (index < 0) return false;
  if (users[index].role === "admin") {
    const adminCount = users.filter((item) => item.role === "admin").length;
    if (adminCount <= 1) {
      throw new Error("Não é possível excluir o único administrador do sistema.");
    }
  }
  users.splice(index, 1);
  await writeUsers(users);
  return true;
}

export async function authenticateUser(user, password) {
  const record = (await readUsers()).find(
    (item) => item.user.toLowerCase() === String(user).trim().toLowerCase(),
  );
  if (!record || !verifyPassword(password, record.password)) return null;
  const { password: ignored, ...safeUser } = record;
  return safeUser;
}
