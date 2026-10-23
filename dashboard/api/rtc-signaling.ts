import type { Express, Request, Response } from "express";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Signal = { id: string; fromRole: string; toRole: string; type: string; data: unknown; timestamp: number };
const queues = new Map<string, Signal[]>();
const MAX_SIGNALS = 200;
const SIGNAL_TTL_MS = 60_000;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };

// Caminho do registro para persistência e discovery
const REGISTRY_PATH = join(process.cwd(), "dashboard", "admin", "banco", "json", "rtc_registry.json");

function getRegistry(): Record<string, { lastActive: number }> {
  try {
    const data = readFileSync(REGISTRY_PATH, "utf-8");
    return JSON.parse(data || "{}");
  } catch {
    return {};
  }
}

function updateRegistry(runtimeId: string) {
  try {
    const registry = getRegistry();
    registry[runtimeId] = { lastActive: Date.now() };
    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  } catch (err) {
    console.error("[RTC Registry] Erro ao salvar:", err);
  }
}

function clean(queue: Signal[]) { const cutoff = Date.now() - SIGNAL_TTL_MS; return queue.filter((signal) => signal.timestamp > cutoff); }

// Endpoint compatível com o cliente RTC copiado de BACKUP01.
export function registerRtcSignalingRoutes(app: Express) {
  // Rota para descoberta de sessões ativas
  app.get("/api/admin/lab/rtc/registry", (_req: Request, res: Response) => {
    res.set(NO_CACHE).json({ ok: true, registry: getRegistry() });
  });

  app.all("/api/admin/lab/rtc/signal", (req: Request, res: Response) => {
    res.set(NO_CACHE).type("application/json");
    const runtimeId = String(req.query["runtimeId"] ?? "").trim();
    if (!runtimeId) return res.status(400).json({ ok: false, error: "runtimeId é obrigatório para signaling." });

    // Registra a atividade da sessão no discovery
    updateRegistry(runtimeId);

    if (req.method === "POST") {
      const body = req.body ?? {};
      const type = String(body.type ?? "").trim();
      if (!type) return res.status(400).json({ ok: false, error: "Tipo de sinal inválido." });
      const queue = clean(queues.get(runtimeId) ?? []);
      const signal: Signal = { id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, fromRole: String(body.fromRole ?? "unknown"), toRole: String(body.toRole ?? "all"), type, data: body.data ?? null, timestamp: Date.now() };
      queue.push(signal); if (queue.length > MAX_SIGNALS) queue.shift(); queues.set(runtimeId, queue);
      return res.json({ ok: true, signalId: signal.id });
    }
    if (req.method === "GET") {
      const role = String(req.query["role"] ?? ""); const since = Number.parseInt(String(req.query["since"] ?? "0"), 10) || 0;
      const queue = clean(queues.get(runtimeId) ?? []); queues.set(runtimeId, queue);
      const signals = queue.filter((signal) => signal.timestamp > since && (!role || signal.toRole === "all" || signal.toRole === role) && (!role || signal.fromRole !== role));
      return res.json({ ok: true, runtimeId, signals, serverTime: Date.now() });
    }
    if (req.method === "DELETE") { 
      queues.delete(runtimeId);
      const registry = getRegistry();
      delete registry[runtimeId];
      writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
      return res.json({ ok: true, message: "Sinais e registro limpos com sucesso." });
    }
    res.set("Allow", "GET, POST, DELETE"); return res.status(405).json({ ok: false, error: "Método não permitido." });
  });
}
