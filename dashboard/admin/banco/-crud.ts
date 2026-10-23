/* LIVENEXUS: Explica as ações usadas para cadastrar, consultar, alterar, excluir e validar usuários. */
/**
 * CRUD server-side para usuários armazenados em JSON.
 * IMPORTANTE: usar somente no servidor Node.js; nunca importar este arquivo no frontend.
 * O campo password contém um hash scrypt (nunca a senha em texto puro).
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withFileQueue, writeJsonAtomically } from "./-json-storage.js";

// BLOCO 1 — Resolve o caminho físico do arquivo JSON de usuários.
const USERS_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "json", "usuario.json");

// BLOCO 2 — Lê usuario.json e valida que o conteúdo é uma lista.
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

// BLOCO 3 — Cria a pasta, quando necessário, e persiste a lista no JSON.
async function writeUsers(users) {
  await writeJsonAtomically(USERS_FILE, users);
}

// BLOCO 4 — Armazena senha como hash scrypt com salt, nunca em texto puro.
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

// BLOCO 5 — Compara a senha enviada ao hash salvo sem comparação insegura de strings.
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

// BLOCO 6 — Lista registros removendo password antes de devolver os dados.
export async function listUsers() {
  return (await readUsers()).map(({ password, ...user }) => user);
}

// BLOCO 7 — Busca um usuário por ID sem revelar sua senha.
export async function getUserById(user_id) {
  const user = (await readUsers()).find((item) => item.user_id === user_id);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// BLOCO 8 — Confere se o nome já existe ignorando espaços externos e maiúsculas.
export async function usernameExists(user) {
  if (typeof user !== "string") return false;
  const normalized = user.trim().toLowerCase();
  if (!normalized) return false;
  return (await readUsers()).some((item) => item.user.toLowerCase() === normalized);
}

// BLOCO 9 — Valida campos, evita nomes duplicados e grava um usuário novo.
export async function createUser({ user, password, imagen = null, role = "user" }) {
  if (typeof user !== "string" || user.trim().length < 3 || user.trim().length > 32) {
    throw new Error("O usuário deve ter entre 3 e 32 caracteres.");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  if (role !== "user" && role !== "admin") {
    throw new Error("O role deve ser user ou admin.");
  }

  return withFileQueue(USERS_FILE, async () => {
    const users = await readUsers();

    if (users.some((item) => item.user.toLowerCase() === user.trim().toLowerCase())) {
      throw new Error("Esse nome de usuário já está em uso.");
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
  });
}

// BLOCO 10 — Valida campos permitidos e atualiza a data de alteração.
export async function updateUser(user_id, changes = {}) {
  return withFileQueue(USERS_FILE, async () => {
    const users = await readUsers();
    const index = users.findIndex((item) => item.user_id === user_id);

    if (index < 0) {
      throw new Error("Usuário não encontrado.");
    }

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
      if (typeof changes.password !== "string" || changes.password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres.");
      }

      next.password = hashPassword(changes.password);
    }

    if (changes.imagen !== undefined) {
      next.imagen = changes.imagen;
    }

    if (changes.role !== undefined) {
      if (changes.role !== "user" && changes.role !== "admin") {
        throw new Error("O role deve ser user ou admin.");
      }

      next.role = changes.role;
    }

    next.data_atualizacao = new Date().toISOString();
    users[index] = next;

    await writeUsers(users);

    const { password, ...safeUser } = next;
    return safeUser;
  });
}

// BLOCO 11 — Remove o registro com proteção contra gravações simultâneas.
export async function deleteUser(user_id) {
  return withFileQueue(USERS_FILE, async () => {
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
  });
}

// BLOCO 12 — Localiza o usuário e verifica a senha para liberar o login.
export async function authenticateUser(user, password) {
  const record = (await readUsers()).find(
    (item) => item.user.toLowerCase() === String(user).trim().toLowerCase(),
  );
  if (!record || !verifyPassword(password, record.password)) return null;
  const { password: ignored, ...safeUser } = record;
  return safeUser;
}
