/* LIVENEXUS: Explica as mensagens e os caminhos usados para estabelecer a conexão RTC. */
import type { Express, Request, Response } from "express";
import { readSession } from "../login/session.js";
import { rtcIdentityJohnson } from "../admin/banco/-json-tables-crud.js";

type Signal = {
  id: string;
  fromRole: string;
  toRole: string;
  type: string;
  data: unknown;
  timestamp: number;
};
const queues = new Map<string, Signal[]>();
const MAX_SIGNALS = 200;
const SIGNAL_TTL_MS = 60_000;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };

async function updateRegistry(req: Request, runtimeId: string) {
  try {
    const session = readSession(req) as { user_id: string } | null;
    if (!session?.user_id) return;

    const existing = await rtcIdentityJohnson.list();
    const userRecord = existing.find((r: any) => r.user_id === session.user_id);

    const now = new Date().toISOString();
    if (userRecord) {
      // Sempre atualiza o timestamp para confirmar que o usuário está ativo
      await rtcIdentityJohnson.update(userRecord.__rowKey, {
        rtcId: runtimeId,
        updated_at: now,
      });
    } else {
      // Cria um registro único para o usuário, mantendo o runtimeId fixo solicitado
      await rtcIdentityJohnson.create({
        user_id: session.user_id,
        rtcId: runtimeId,
        id: `rtc_user_${session.user_id}`,
        created_at: now,
        updated_at: now,
      });
    }
  } catch (err) {
    console.error("[RTC Registry] Erro ao sincronizar:", err);
  }
}

function clean(queue: Signal[]) {
  const cutoff = Date.now() - SIGNAL_TTL_MS;
  return queue.filter((signal) => signal.timestamp > cutoff);
}

// Endpoint compatível com o cliente RTC copiado de BACKUP01.
export function registerRtcSignalingRoutes(app: Express) {
  // Rota para descoberta de sessões ativas
  app.get("/api/admin/lab/rtc/registry", async (_req: Request, res: Response) => {
    try {
      const records = await rtcIdentityJohnson.list();
      const registry = Object.fromEntries(
        records.map((r: any) => [
          r.rtcId || r.id,
          { user_id: r.user_id, lastActive: r.updated_at },
        ]),
      );
      res.set(NO_CACHE).json({ ok: true, registry });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Falha ao ler registro." });
    }
  });

  app.all("/api/admin/lab/rtc/signal", async (req: Request, res: Response) => {
    res.set(NO_CACHE).type("application/json");
    const runtimeId = String(req.query["runtimeId"] ?? "").trim();
    if (!runtimeId)
      return res.status(400).json({ ok: false, error: "runtimeId é obrigatório para signaling." });

    // Registra a atividade da sessão no discovery (associando ao user_id da sessão)
    await updateRegistry(req, runtimeId);

    if (req.method === "POST") {
      const body = req.body ?? {};
      const type = String(body.type ?? "").trim();
      let queue = clean(queues.get(runtimeId) ?? []);
      if (type === "ready") {
        queue = queue.filter((s) => s.type !== "offer" && s.type !== "answer");
      }
      const signal: Signal = {
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fromRole: String(body.fromRole ?? "unknown"),
        toRole: String(body.toRole ?? "all"),
        type,
        data: body.data ?? null,
        timestamp: Date.now(),
      };
      queue.push(signal);
      if (queue.length > MAX_SIGNALS) queue.shift();
      queues.set(runtimeId, queue);
      console.log(
        `[RTC Signaling] [${runtimeId}] SIGNAL OUT: ${type} from ${signal.fromRole} to ${signal.toRole}`,
      );
      return res.json({ ok: true, signalId: signal.id });
    }
    if (req.method === "GET") {
      const role = String(req.query["role"] ?? "");
      const since = Number.parseInt(String(req.query["since"] ?? "0"), 10) || 0;
      const queue = clean(queues.get(runtimeId) ?? []);
      queues.set(runtimeId, queue);
      const signals = queue.filter(
        (signal) =>
          signal.timestamp >= since &&
          (!role || signal.toRole === "all" || signal.toRole === role) &&
          (!role || signal.fromRole !== role),
      );
      if (signals.length > 0) {
        console.log(
          `[RTC Signaling] [${runtimeId}] POLL IN: ${role} received ${signals.length} signals`,
        );
      }
      return res.json({ ok: true, runtimeId, signals, serverTime: Date.now() });
    }
    if (req.method === "DELETE") {
      queues.delete(runtimeId);
      return res.json({ ok: true, message: "Sinais limpos com sucesso." });
    }
    res.set("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  });
}
