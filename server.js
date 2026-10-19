import express from "express";
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
} from "./dashboard/admin/banco/-crud.js";
import {
  listAvaliacoes,
  createAvaliacao,
  updateAvaliacao,
  deleteAvaliacao,
} from "./dashboard/admin/banco/-avaliacao-crud.js";
import {
  createSessionToken,
  createSessionCookie,
  clearSessionCookie,
  readSession,
} from "./dashboard/login/session.js";

/* Configure SESSION_SECRET na hospedagem para preservar as sessões entre reinicializações. */
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
}

const app = express();
const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, "dist");
const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

function sendAdminDenied(res) {
  return res.status(403).json({
    ok: false,
    message: "Acesso permitido somente para administradores.",
  });
}

function requireAdmin(req, res) {
  const session = readSession(req);
  if (session?.role !== "admin") {
    sendAdminDenied(res);
    return null;
  }
  return session;
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

/* Cadastro e login. O CRUD JSON nunca é importado pelo frontend. */
app.post("/api/auth/register", async (req, res) => {
  try {
    const user = await createUser({
      user: req.body?.user,
      password: req.body?.password,
    });
    return res.json({ ok: true, user, message: "Conta criada com sucesso." });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: errorMessage(error, "Não foi possível criar a conta."),
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await authenticateUser(req.body?.user, req.body?.password);

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

app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.json({ ok: true });
});

/* Verifica se um nome de usuário já está em uso. */
app.get("/api/check-username", async (req, res) => {
  const username = String(req.query.user ?? "").trim();

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
app.get("/api/avaliacoes", async (_req, res) => {
  try {
    const avaliacoes = await listAvaliacoes();
    return res.set(NO_CACHE).json({ ok: true, avaliacoes });
  } catch (error) {
    return res.status(500).set(NO_CACHE).json({
      ok: false,
      message: errorMessage(error, "Não foi possível carregar as avaliações."),
    });
  }
});

app.post("/api/avaliacoes", async (req, res) => {
  try {
    const { nome, nota, mensagem } = req.body ?? {};
    const avaliacao = await createAvaliacao({ nome, nota, mensagem });

    return res.set(NO_CACHE).json({
      ok: true,
      avaliacao,
      message: "Avaliação enviada com sucesso!",
    });
  } catch (error) {
    return res.status(400).set(NO_CACHE).json({
      ok: false,
      message: errorMessage(error, "Não foi possível enviar a avaliação."),
    });
  }
});

/* CRUD JSON de usuários, reservado a administradores. */
app.get("/api/database/users", async (req, res) => {
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

app.patch("/api/database/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userId = typeof req.body?.user_id === "string" ? req.body.user_id : "";
    const supplied = req.body?.changes;

    if (!userId || !supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "Dados de edição inválidos.",
      });
    }

    const changes = {};
    if (Object.hasOwn(supplied, "user")) changes.user = supplied.user;
    if (Object.hasOwn(supplied, "role")) changes.role = supplied.role;
    if (Object.hasOwn(supplied, "imagen")) changes.imagen = supplied.imagen;

    if (Object.keys(changes).length === 0) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "Nenhum campo editável foi enviado.",
      });
    }

    const user = await updateUser(userId, changes);
    return res.set(NO_CACHE).json({ ok: true, user });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível salvar as alterações.");
    const status = message === "Usuário não encontrado." ? 404 : 400;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

app.delete("/api/database/users", async (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const userId = typeof req.body?.user_id === "string" ? req.body.user_id : "";

    if (!userId) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "ID do usuário não fornecido.",
      });
    }

    if (session.user_id === userId) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "Não é permitido excluir o usuário atualmente autenticado.",
      });
    }

    const deleted = await deleteUser(userId);

    if (!deleted) {
      return res.status(404).set(NO_CACHE).json({
        ok: false,
        message: "Usuário não encontrado.",
      });
    }

    return res.set(NO_CACHE).json({
      ok: true,
      message: "Usuário excluído com sucesso.",
    });
  } catch (error) {
    return res.status(400).set(NO_CACHE).json({
      ok: false,
      message: errorMessage(error, "Não foi possível excluir o usuário."),
    });
  }
});

/* CRUD JSON de avaliações, reservado a administradores. */
app.get("/api/database/avaliacoes", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const avaliacoes = await listAvaliacoes();
    return res.set(NO_CACHE).json({ ok: true, avaliacoes });
  } catch (error) {
    return res.status(500).set(NO_CACHE).json({
      ok: false,
      message: errorMessage(error, "Não foi possível carregar as avaliações."),
    });
  }
});

app.patch("/api/database/avaliacoes", async (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const avaliacaoId =
      typeof req.body?.avaliacao_id === "string" ? req.body.avaliacao_id : "";
    const supplied = req.body?.changes;

    if (!avaliacaoId || !supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "Dados de edição inválidos.",
      });
    }

    const changes = {};
    if (Object.hasOwn(supplied, "nome")) changes.nome = supplied.nome;
    if (Object.hasOwn(supplied, "nota")) changes.nota = supplied.nota;
    if (Object.hasOwn(supplied, "mensagem")) changes.mensagem = supplied.mensagem;
    if (Object.hasOwn(supplied, "resposta_admin")) {
      changes.resposta_admin = supplied.resposta_admin;
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "Nenhum campo editável foi enviado.",
      });
    }

    const avaliacao = await updateAvaliacao(avaliacaoId, changes, session.role);
    return res.set(NO_CACHE).json({ ok: true, avaliacao });
  } catch (error) {
    const message = errorMessage(error, "Não foi possível salvar as alterações.");
    const status = message === "Avaliação não encontrada." ? 404 : 400;
    return res.status(status).set(NO_CACHE).json({ ok: false, message });
  }
});

app.delete("/api/database/avaliacoes", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const avaliacaoId =
      typeof req.body?.avaliacao_id === "string" ? req.body.avaliacao_id : "";

    if (!avaliacaoId) {
      return res.status(400).set(NO_CACHE).json({
        ok: false,
        message: "ID da avaliação não fornecido.",
      });
    }

    const deleted = await deleteAvaliacao(avaliacaoId);

    if (!deleted) {
      return res.status(404).set(NO_CACHE).json({
        ok: false,
        message: "Avaliação não encontrada.",
      });
    }

    return res.set(NO_CACHE).json({
      ok: true,
      message: "Avaliação excluída com sucesso.",
    });
  } catch (error) {
    return res.status(400).set(NO_CACHE).json({
      ok: false,
      message: errorMessage(error, "Não foi possível excluir a avaliação."),
    });
  }
});

/* API desconhecida retorna JSON em vez da página HTML. */
app.all(/^\/api(?:\/.*)?$/, (_req, res) => {
  return res.status(404).json({
    ok: false,
    message: "Endpoint da API não encontrado.",
  });
});

/* Em produção, Express serve o build do Vite como SPA. */
app.use(express.static(distDir));
app.get(/.*/, (_req, res) => {
  res.sendFile(resolve(distDir, "index.html"), (error) => {
    if (error && !res.headersSent) {
      res.status(500).type("text/plain").send(
        "Build do frontend não encontrado. Execute npm run build.",
      );
    }
  });
});

app.use((error, _req, res, _next) => {
  console.error("[LiveNexus] Erro no servidor:", error);
  if (!res.headersSent) {
    res.status(500).json({ ok: false, message: "Erro interno do servidor." });
  }
});

const isDevServer = process.argv.includes("--dev");
const PORT = Number(process.env.PORT || (isDevServer ? 3001 : 3000));

app.listen(PORT, "0.0.0.0", () => {
  console.log("LiveNexus Express server listening on port " + PORT);
});
