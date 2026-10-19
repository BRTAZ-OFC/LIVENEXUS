import express, { type Request, type Response, type NextFunction } from "express";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createUser,
  authenticateUser,
  usernameExists,
  listUsers,
  updateUser,
  deleteUser,
  getUserById,
} from "./dashboard/admin/banco/-crud.js";
import {
  PlataformasJohnson,
  listAllPlataformas,
} from "./dashboard/admin/banco/Plataformas_Johnson.js";
import {
  createChannelChallenge,
  verifyChannelChallenge,
} from "./dashboard/conexao/Connection_channel-verify.js";
import {
  listAvaliacoes,
  createAvaliacao,
  updateAvaliacao,
  deleteAvaliacao,
} from "./dashboard/admin/banco/-avaliacao-crud.js";
import {
  getJsonTableDefinitions,
  listJsonTableRecords,
  createJsonTableRecord,
  updateJsonTableRecord,
  deleteJsonTableRecord,
} from "./dashboard/admin/banco/-json-tables-crud.js";
import {
  createSessionToken,
  createSessionCookie,
  clearSessionCookie,
  readSession,
} from "./dashboard/login/session.js";

/* Configure SESSION_SECRET na hospedagem para preservar as sessões entre reinicializações. */
const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret || sessionSecret.length < 32) {
  process.env["SESSION_SECRET"] = randomBytes(32).toString("hex");
}

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, "dist");

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

const app = express();
const isApiOnly = process.argv.includes("--api-only");
const isDevServer =
  !isApiOnly && (process.argv.includes("--dev") || process.env["NODE_ENV"] === "development");

if (isDevServer) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

interface SessionData {
  user_id?: string;
  user?: string;
  role?: string;
}

function sendAdminDenied(res: Response) {
  return res.status(403).json({
    ok: false,
    message: "Acesso permitido somente para administradores.",
  });
}

function requireAdmin(req: Request, res: Response): SessionData | null {
  const session = readSession(req) as SessionData | null;
  if (session?.role !== "admin") {
    sendAdminDenied(res);
    return null;
  }
  return session;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/* Cadastro e login. O CRUD JSON nunca é importado pelo frontend. */
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const user = await createUser({
      user: req.body?.["user"],
      password: req.body?.["password"],
    });
    return res.json({ ok: true, user, message: "Conta criada com sucesso." });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: errorMessage(error, "Não foi possível criar a conta."),
    });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req.body?.["user"], req.body?.["password"]);
    if (!user) {
      return res.json({ ok: false, message: "Usuário ou senha incorretos." });
    }
    const token = createSessionToken(user);
    res.setHeader("Set-Cookie", createSessionCookie(user));
    return res.json({ ok: true, user, token, message: "Login validado com sucesso." });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: errorMessage(error, "Erro interno ao processar o login."),
    });
  }
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.json({ ok: true });
});

/* Verifica se um nome de usuário já está em uso. */
app.get("/api/check-username", async (req: Request, res: Response) => {
  const username = String(req.query["user"] ?? "").trim();
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({
      ok: false,
      exists: false,
      message: "O usuário deve ter entre 3 e 32 caracteres.",
    });
  }
  try {
    const exists = await usernameExists(username);
    return res.json({ ok: true, exists });
  } catch {
    return res.status(500).json({
      ok: false,
      message: "Não foi possível verificar o nome de usuário.",
    });
  }
});

/* API pública de avaliações. */
app.get("/api/avaliacoes", async (_req: Request, res: Response) => {
  try {
    const avaliacoes = await listAvaliacoes();
    return res.set(NO_CACHE).json({ ok: true, avaliacoes });
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        message: errorMessage(error, "Não foi possível carregar as avaliações."),
      });
  }
});

app.post("/api/avaliacoes", async (req: Request, res: Response) => {
  try {
    const { nome, nota, mensagem } = req.body ?? {};
    const avaliacao = await createAvaliacao({ nome, nota, mensagem });
    return res.set(NO_CACHE).json({
      ok: true,
      avaliacao,
      message: "Avaliação enviada com sucesso!",
    });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({
        ok: false,
        message: errorMessage(error, "Não foi possível enviar a avaliação."),
      });
  }
});

/* CRUD JSON de usuários, reservado a administradores. */
app.get("/api/database/users", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const users = await listUsers();
    return res.set(NO_CACHE).json({ ok: true, users });
  } catch {
    return res.status(500).set(NO_CACHE).json({
      ok: false,
      message: "Não foi possível carregar a tabela de usuários.",
    });
  }
});

app.patch("/api/database/users", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const userId = typeof req.body?.["user_id"] === "string" ? req.body["user_id"] : "";
    const supplied = req.body?.["changes"] as Record<string, unknown> | undefined;
    if (!userId || !supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Dados de edição inválidos." });
    }
    const changes: Record<string, unknown> = {};
    if (Object.hasOwn(supplied, "user")) changes["user"] = supplied["user"];
    if (Object.hasOwn(supplied, "role")) changes["role"] = supplied["role"];
    if (Object.hasOwn(supplied, "imagen")) changes["imagen"] = supplied["imagen"];
    if (Object.keys(changes).length === 0) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Nenhum campo editável foi enviado." });
    }
    const user = await updateUser(userId, changes);
    return res.set(NO_CACHE).json({ ok: true, user });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível salvar as alterações.");
    const status = message === "Usuário não encontrado." ? 404 : 400;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

app.delete("/api/database/users", async (req: Request, res: Response) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  try {
    const userId = typeof req.body?.["user_id"] === "string" ? req.body["user_id"] : "";
    if (!userId) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "ID do usuário não fornecido." });
    }
    if (session["user_id"] === userId) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Não é permitido excluir o usuário atualmente autenticado." });
    }
    const deleted = await deleteUser(userId);
    if (!deleted) {
      return res.status(404).set(NO_CACHE).json({ ok: false, message: "Usuário não encontrado." });
    }
    return res.set(NO_CACHE).json({ ok: true, message: "Usuário excluído com sucesso." });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({ ok: false, message: errorMessage(error, "Não foi possível excluir o usuário.") });
  }
});

/* CRUD JSON de avaliações, reservado a administradores. */
app.get("/api/database/avaliacoes", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const avaliacoes = await listAvaliacoes();
    return res.set(NO_CACHE).json({ ok: true, avaliacoes });
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        message: errorMessage(error, "Não foi possível carregar as avaliações."),
      });
  }
});

app.patch("/api/database/avaliacoes", async (req: Request, res: Response) => {
  const session = requireAdmin(req, res);
  if (!session) return;
  try {
    const avaliacaoId =
      typeof req.body?.["avaliacao_id"] === "string" ? req.body["avaliacao_id"] : "";
    const supplied = req.body?.["changes"] as Record<string, unknown> | undefined;
    if (!avaliacaoId || !supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Dados de edição inválidos." });
    }
    const changes: Record<string, unknown> = {};
    if (Object.hasOwn(supplied, "nome")) changes["nome"] = supplied["nome"];
    if (Object.hasOwn(supplied, "nota")) changes["nota"] = supplied["nota"];
    if (Object.hasOwn(supplied, "mensagem")) changes["mensagem"] = supplied["mensagem"];
    if (Object.hasOwn(supplied, "resposta_admin"))
      changes["resposta_admin"] = supplied["resposta_admin"];
    if (Object.keys(changes).length === 0) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Nenhum campo editável foi enviado." });
    }
    const avaliacao = await updateAvaliacao(avaliacaoId, changes, session.role || null);
    return res.set(NO_CACHE).json({ ok: true, avaliacao });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível salvar as alterações.");
    const status = message === "Avaliação não encontrada." ? 404 : 400;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

app.delete("/api/database/avaliacoes", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const avaliacaoId =
      typeof req.body?.["avaliacao_id"] === "string" ? req.body["avaliacao_id"] : "";
    if (!avaliacaoId) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "ID da avaliação não fornecido." });
    }
    const deleted = await deleteAvaliacao(avaliacaoId);
    if (!deleted) {
      return res
        .status(404)
        .set(NO_CACHE)
        .json({ ok: false, message: "Avaliação não encontrada." });
    }
    return res.set(NO_CACHE).json({ ok: true, message: "Avaliação excluída com sucesso." });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({ ok: false, message: errorMessage(error, "Não foi possível excluir a avaliação.") });
  }
});

/* CRUD JSON de plataformas, reservado a administradores. */
app.get("/api/database/plataformas", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const plataformas = await listAllPlataformas();
    return res.set(NO_CACHE).json({ ok: true, plataformas });
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        message: errorMessage(error, "Não foi possível carregar as plataformas."),
      });
  }
});

app.patch("/api/database/plataformas", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const userId = typeof req.body?.["user_id"] === "string" ? req.body["user_id"] : "";
    const supplied = req.body?.["changes"] as Record<string, unknown> | undefined;
    if (!userId || !supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Dados de edição inválidos." });
    }
    const id = typeof supplied["id"] === "string" ? supplied["id"] : "";
    const plataforma = await PlataformasJohnson.update(userId, id, supplied);
    return res.set(NO_CACHE).json({ ok: true, plataforma });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({
        ok: false,
        message: errorMessage(error, "Não foi possível atualizar a plataforma."),
      });
  }
});

app.delete("/api/database/plataformas", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const userId = typeof req.body?.["user_id"] === "string" ? req.body["user_id"] : "";
    if (!userId) {
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "ID do usuário não fornecido." });
    }
    const deleted = await PlataformasJohnson.delete(userId);
    if (!deleted) {
      return res.status(404).set(NO_CACHE).json({ ok: false, message: "Registro não encontrado." });
    }
    return res.set(NO_CACHE).json({ ok: true, message: "Plataforma excluída com sucesso." });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({
        ok: false,
        message: errorMessage(error, "Não foi possível excluir a plataforma."),
      });
  }
});

/* Conexões de plataformas: o user_id vem da sessão e é validado no JSON de usuários. */
async function getAuthenticatedJsonUser(req: Request, res: Response) {
  const session = readSession(req) as SessionData | null;
  const headerUserId = req.headers["x-user-id"];
  const queryUserId = req.query["user_id"];
  const bodyUserId = req.body?.["user_id"];
  const candidate =
    typeof queryUserId === "string" && queryUserId.trim()
      ? queryUserId.trim()
      : typeof headerUserId === "string" && headerUserId.trim()
        ? headerUserId.trim()
        : typeof bodyUserId === "string" && bodyUserId.trim()
          ? bodyUserId.trim()
          : null;

  let targetUserId = session?.user_id;

  if (session?.role === "admin" && candidate) {
    targetUserId = candidate;
  } else if (!targetUserId && candidate) {
    targetUserId = candidate;
  }

  if (!targetUserId) {
    res.status(401).set(NO_CACHE).json({ ok: false, error: "Autenticação necessária." });
    return null;
  }

  const user = await getUserById(targetUserId);
  if (!user) {
    res
      .status(401)
      .set(NO_CACHE)
      .json({ ok: false, error: "A conta deste usuário não foi encontrada." });
    return null;
  }
  return user;
}

app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    return res.set(NO_CACHE).json({
      ok: true,
      user: {
        user_id: user.user_id,
        user: user.user,
        role: user.role,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        error: errorMessage(error, "Falha ao obter dados do usuário."),
      });
  }
});

app.post("/api/channel-verify/challenge", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    const challenge = await createChannelChallenge(
      user.user_id,
      req.body?.platform,
      req.body?.channelIdentifier,
    );
    return res
      .status(201)
      .set(NO_CACHE)
      .json({ ok: true, ...challenge });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({
        ok: false,
        error: errorMessage(error, "Não foi possível gerar o código de verificação."),
      });
  }
});

app.post("/api/channel-verify/verify", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    const result = await verifyChannelChallenge(user.user_id, req.body?.challengeId);
    return res.set(NO_CACHE).json({ ok: true, ...result });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível verificar a bio.");
    const status =
      /não encontrado|expirou|não pertence|gere um código|não encontrado na bio|indisponível/i.test(
        message,
      )
        ? 400
        : 502;
    return res.status(status).set(NO_CACHE).json({ ok: false, error: message });
  }
});

app.get("/api/plataformas", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    const id = typeof req.query["id"] === "string" ? req.query["id"] : "";
    const plataformas = id
      ? await PlataformasJohnson.get(user.user_id, id)
      : await PlataformasJohnson.list(user.user_id);
    if (id && !plataformas) {
      return res.status(404).set(NO_CACHE).json({ ok: false, error: "Plataforma não encontrada." });
    }
    return res.set(NO_CACHE).json({
      ok: true,
      ...(id ? { plataforma: plataformas } : { plataformas }),
    });
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        error: errorMessage(error, "Não foi possível carregar as conexões."),
      });
  }
});

app.post("/api/plataformas", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    const requestedStatus = String(req.body?.status ?? "")
      .trim()
      .toLowerCase();
    const directVerified =
      requestedStatus === "verified" ||
      ["twitch_status", "kick_status", "youtube_status"].some(
        (field) =>
          String(req.body?.[field] ?? "")
            .trim()
            .toLowerCase() === "verified",
      );
    if (directVerified) {
      return res.status(403).set(NO_CACHE).json({
        ok: false,
        error: "A conexão só pode ser marcada como verificada após validar o código na bio.",
      });
    }
    const existing = await PlataformasJohnson.list(user.user_id);
    const first = existing[0];
    const plataforma = first
      ? await PlataformasJohnson.update(user.user_id, first.id, req.body ?? {})
      : await PlataformasJohnson.create(user.user_id, req.body ?? {});
    return res
      .status(existing.length ? 200 : 201)
      .set(NO_CACHE)
      .json({
        ok: true,
        plataforma,
        plataformas: [plataforma],
      });
  } catch (error) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({
        ok: false,
        error: errorMessage(error, "Não foi possível salvar a conexão."),
      });
  }
});

app.patch("/api/plataformas", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    const requestedStatus = String(req.body?.status ?? "")
      .trim()
      .toLowerCase();
    const directVerified =
      requestedStatus === "verified" ||
      ["twitch_status", "kick_status", "youtube_status"].some(
        (field) =>
          String(req.body?.[field] ?? "")
            .trim()
            .toLowerCase() === "verified",
      );
    if (directVerified) {
      return res.status(403).set(NO_CACHE).json({
        ok: false,
        error: "A conexão só pode ser marcada como verificada após validar o código na bio.",
      });
    }
    const existing = await PlataformasJohnson.list(user.user_id);
    const id = typeof req.query["id"] === "string" ? req.query["id"] : existing[0]?.id;
    if (!id) {
      return res.status(404).set(NO_CACHE).json({ ok: false, error: "Plataforma não encontrada." });
    }
    const plataforma = await PlataformasJohnson.update(user.user_id, id, req.body ?? {});
    return res.set(NO_CACHE).json({ ok: true, plataforma, plataformas: [plataforma] });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível atualizar a conexão.");
    const status =
      message === "Não é permitido alterar o identificador principal do registro." ? 400 : 500;
    return res.status(status).set(NO_CACHE).json({ ok: false, error: message });
  }
});

app.delete("/api/plataformas", async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedJsonUser(req, res);
    if (!user) return;
    const existing = await PlataformasJohnson.list(user.user_id);
    if (!existing.length) {
      return res.status(404).set(NO_CACHE).json({ ok: false, error: "Plataforma não encontrada." });
    }
    const id = typeof req.query["id"] === "string" ? req.query["id"] : existing[0]?.id;
    const deleted = await PlataformasJohnson.delete(user.user_id, id);
    if (!deleted) {
      return res.status(404).set(NO_CACHE).json({ ok: false, error: "Plataforma não encontrada." });
    }
    return res.set(NO_CACHE).json({ ok: true });
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        error: errorMessage(error, "Não foi possível remover a conexão."),
      });
  }
});

/* CRUD administrativo genérico das tabelas JSON que não possuem CRUD específico. */
app.get("/api/database/json-tables", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const definitions = getJsonTableDefinitions();
    const tables = await Promise.all(definitions.map(async (definition) => ({
      ...definition,
      count: (await listJsonTableRecords(definition.id)).length,
    })));
    return res.set(NO_CACHE).json({ ok: true, tables });
  } catch (error) {
    return res.status(500).set(NO_CACHE).json({
      ok: false,
      message: errorMessage(error, "Não foi possível listar as tabelas JSON."),
    });
  }
});

app.get("/api/database/json-tables/:tableId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const tableId = String(req.params["tableId"] ?? "");
    const rows = await listJsonTableRecords(tableId);
    return res.set(NO_CACHE).json({ ok: true, tableId, rows });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível abrir a tabela JSON.");
    return res.status(/não permitida/i.test(message) ? 404 : 500).set(NO_CACHE).json({ ok: false, message });
  }
});

app.post("/api/database/json-tables/:tableId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const tableId = String(req.params["tableId"] ?? "");
    const row = await createJsonTableRecord(tableId, req.body?.record);
    return res.status(201).set(NO_CACHE).json({ ok: true, row });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível criar o registro JSON.");
    const status = /não permitida/i.test(message) ? 404 : /não existe em usuario.json|obrigatório|já existe|inválido|informe o user_id/i.test(message) ? 400 : 500;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

app.patch("/api/database/json-tables/:tableId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const tableId = String(req.params["tableId"] ?? "");
    const rowKey = String(req.body?.rowKey ?? "");
    const row = await updateJsonTableRecord(tableId, rowKey, req.body?.record);
    return res.set(NO_CACHE).json({ ok: true, row });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível atualizar o registro JSON.");
    const status = /não permitida|não encontrado|incompatível/i.test(message) ? 404 : /não existe em usuario.json|obrigatório|inválido|não é permitido/i.test(message) ? 400 : 500;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

app.delete("/api/database/json-tables/:tableId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const tableId = String(req.params["tableId"] ?? "");
    const rowKey = String(req.body?.rowKey ?? "");
    const deleted = await deleteJsonTableRecord(tableId, rowKey);
    if (!deleted) return res.status(404).set(NO_CACHE).json({ ok: false, message: "Registro não encontrado." });
    return res.set(NO_CACHE).json({ ok: true });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível excluir o registro JSON.");
    const status = /não permitida|não encontrado|incompatível/i.test(message) ? 404 : /não existe em usuario.json|obrigatório|inválido/i.test(message) ? 400 : 500;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

/* Bootstrap do chat ao vivo do YouTube para usuários autenticados. */
app.get("/api/admin/lab/youtube-test1/bootstrap", async (req: Request, res: Response) => {
  const session = readSession(req) as SessionData | null;
  if (!session) {
    return res
      .status(401)
      .set(NO_CACHE)
      .json({ ok: false, error: "Faça login para conectar o YouTube." });
  }

  const identifier = String(req.query["identifier"] ?? "").trim();
  if (!identifier) {
    return res
      .status(400)
      .set(NO_CACHE)
      .json({ ok: false, error: "Informe o canal ou vídeo do YouTube." });
  }

  try {
    const { resolveYouTubeLiveBootstrap } =
      await import("./dashboard/conexao/Admin_youtubeTest1Bootstrap.js");
    const result = await resolveYouTubeLiveBootstrap(identifier);
    return res.set(NO_CACHE).json(result);
  } catch (error) {
    return res
      .status(500)
      .set(NO_CACHE)
      .json({
        ok: false,
        error: errorMessage(error, "Falha ao preparar o chat do YouTube."),
      });
  }
});

/* API desconhecida retorna JSON em vez da página HTML. */
app.all(/^\/api(?:\/.*)?$/, (req: Request, res: Response) => {
  console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
  return res.status(404).set(NO_CACHE).json({
    ok: false,
    message: "Endpoint da API não encontrado.",
    method: req.method,
    endpoint: req.originalUrl,
  });
});

if (!isDevServer && !isApiOnly) {
  app.use(express.static(distDir));
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(resolve(distDir, "index.html"));
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[LiveNexus] Erro no servidor:", error);
  if (!res.headersSent) {
    res.status(500).json({ ok: false, message: "Erro interno do servidor." });
  }
});

const port = isApiOnly ? 3001 : Number(process.env["PORT"] || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log("LiveNexus server listening on port " + port);
});
