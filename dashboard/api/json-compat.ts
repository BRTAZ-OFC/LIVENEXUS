import type { Express, Request, Response } from "express";
import {
  getJsonTableDefinitions,
  listJsonTableRecords,
  createJsonTableRecord,
  updateJsonTableRecord,
  deleteJsonTableRecord,
} from "../admin/banco/-json-tables-crud.js";
import { readSession } from "../login/session.js";

type Session = { user_id?: string; role?: string } | null;

const RESOURCE_TABLES: Record<string, string> = {
  "/api/templates": "templates",
  "/api/cenarios": "cenarios",
  "/api/overlays": "overlays",
  "/api/library": "biblioteca",
  "/api/live-sessions": "vods",
  "/api/gallery/general": "galeria",
  "/api/admin/lab/user-gallery": "galeria_usuarios",
};

function sessionOf(req: Request): Session {
  return readSession(req) as Session;
}

function requireUser(req: Request, res: Response): Session {
  const session = sessionOf(req);
  if (!session?.user_id) {
    res.status(401).json({ ok: false, error: "Autenticação necessária." });
    return null;
  }
  return session;
}

function requireAdmin(req: Request, res: Response): Session {
  const session = sessionOf(req);
  if (!session?.user_id || session.role !== "admin") {
    res.status(session?.user_id ? 403 : 401).json({
      ok: false,
      error: session?.user_id ? "Acesso permitido somente para administradores." : "Autenticação necessária.",
    });
    return null;
  }
  return session;
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Falha ao processar a API JSON.";
  const status = /não encontrado|não permitida/i.test(message) ? 404
    : /obrigatório|inválido|não existe|não permitido/i.test(message) ? 400 : 500;
  return res.status(status).json({ ok: false, error: message });
}

export function registerJsonCompatRoutes(app: Express) {
  for (const [route, tableId] of Object.entries(RESOURCE_TABLES)) {
    app.all(route, async (req: Request, res: Response) => {
      const session = requireUser(req, res);
      if (!session) return;
      if (route.startsWith("/api/admin/") && !requireAdmin(req, res)) return;
      try {
        if (req.method === "GET") {
          const rows = await listJsonTableRecords(tableId);
          const visible = tableId === "galeria" ? rows : rows.filter((row) => row.user_id === session.user_id);
          return res.set("Cache-Control", "no-store").json({ ok: true, items: visible });
        }
        if (req.method === "POST") {
          const record = { ...(req.body?.record ?? req.body ?? {}) };
          if (tableId !== "galeria") record.user_id = session.user_id;
          const row = await createJsonTableRecord(tableId, record);
          return res.status(201).json({ ok: true, item: row });
        }
        if (req.method === "PATCH" || req.method === "PUT") {
          const rowKey = String(req.body?.rowKey ?? "");
          const record = req.body?.record ?? req.body?.item;
          if (!rowKey || !record) return res.status(400).json({ ok: false, error: "Informe rowKey e record." });
          const existing = (await listJsonTableRecords(tableId)).find((row) => row.__rowKey === rowKey);
          if (!existing || (tableId !== "galeria" && existing.user_id !== session.user_id)) {
            return res.status(404).json({ ok: false, error: "Registro não encontrado." });
          }
          const updated = await updateJsonTableRecord(tableId, rowKey, { ...record, ...(tableId !== "galeria" ? { user_id: session.user_id } : {}) });
          return res.json({ ok: true, item: updated });
        }
        if (req.method === "DELETE") {
          const rowKey = String(req.body?.rowKey ?? req.query?.rowKey ?? "");
          if (!rowKey) return res.status(400).json({ ok: false, error: "Informe rowKey." });
          const existing = (await listJsonTableRecords(tableId)).find((row) => row.__rowKey === rowKey);
          if (!existing || (tableId !== "galeria" && existing.user_id !== session.user_id)) {
            return res.status(404).json({ ok: false, error: "Registro não encontrado." });
          }
          const deleted = await deleteJsonTableRecord(tableId, rowKey);
          return res.json({ ok: true, deleted });
        }
        res.set("Allow", "GET, POST, PATCH, PUT, DELETE");
        return res.status(405).json({ ok: false, error: "Método não permitido." });
      } catch (error) {
        return sendError(res, error);
      }
    });
  }

  app.get("/api/admin/database-inspect", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    return res.set("Cache-Control", "no-store").json({ ok: true, tables: getJsonTableDefinitions() });
  });

  app.get("/api/admin/database-admin", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const tableId = String(req.query["tableId"] ?? req.query["table"] ?? "");
    if (!tableId) return res.status(400).json({ ok: false, error: "Informe tableId." });
    try {
      return res.set("Cache-Control", "no-store").json({ ok: true, rows: await listJsonTableRecords(tableId) });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.post("/api/admin/database-create", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const tableId = String(req.body?.tableId ?? req.body?.table ?? "");
      const row = await createJsonTableRecord(tableId, req.body?.record ?? req.body?.data);
      return res.status(201).json({ ok: true, row });
    } catch (error) {
      return sendError(res, error);
    }
  });

  app.all("/api/admin/database-record-admin", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const tableId = String(req.body?.tableId ?? req.query["tableId"] ?? "");
      const rowKey = String(req.body?.rowKey ?? req.query["rowKey"] ?? "");
      if (!tableId || !rowKey) return res.status(400).json({ ok: false, error: "Informe tableId e rowKey." });
      if (req.method === "DELETE") {
        const deleted = await deleteJsonTableRecord(tableId, rowKey);
        return res.json({ ok: true, deleted });
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        const row = await updateJsonTableRecord(tableId, rowKey, req.body?.record ?? req.body?.data);
        return res.json({ ok: true, row });
      }
      return res.status(405).json({ ok: false, error: "Método não permitido." });
    } catch (error) {
      return sendError(res, error);
    }
  });
}
