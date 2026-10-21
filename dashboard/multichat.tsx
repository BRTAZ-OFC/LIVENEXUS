import { useEffect, useState } from "react";
import { connectTwitch } from "./configuracao/Config_twitchChat";
import { connectKick } from "./configuracao/Config_kickChat";
import { connectYouTube } from "./configuracao/Config_youtubeLive";
import { MessageSquare, Volume2, VolumeX } from "lucide-react";
import { evaluateTtsFilters } from "./ttsFilters";

export type ChatPlatform = "Twitch" | "Kick" | "YouTube";
export type MultiChatMessage = {
  id: string;
  platform: ChatPlatform;
  author: string;
  text: string;
  roles: string[];
  timestamp: number;
  eventType?: string | null;
  emotes?: unknown;
  eventMeta?: Record<string, unknown> | null;
  authorId?: string | null;
  firstMsg?: boolean;
  ttsAllowed?: boolean;
  ttsFilterReason?: string;
};
export type PlatformState = {
  status: string;
  detail: string;
  viewers: number | null;
  meta: string;
  streamMeta: Record<string, unknown>;
};
export type MultiChatSnapshot = {
  channels: Record<ChatPlatform, string>;
  statuses: Record<ChatPlatform, PlatformState>;
  messages: MultiChatMessage[];
};
type ConnectorHandle = { disconnect: () => void };

const PLATFORMS: ChatPlatform[] = ["Twitch", "Kick", "YouTube"];
const initialStatus = (): Record<ChatPlatform, PlatformState> => ({
  Twitch: { status: "idle", detail: "Desconectado", viewers: null, meta: "", streamMeta: {} },
  Kick: { status: "idle", detail: "Desconectado", viewers: null, meta: "", streamMeta: {} },
  YouTube: { status: "idle", detail: "Desconectado", viewers: null, meta: "", streamMeta: {} },
});
let snapshot: MultiChatSnapshot = {
  channels: { Twitch: "", Kick: "", YouTube: "" },
  statuses: initialStatus(),
  messages: [],
};
const listeners = new Set<(value: MultiChatSnapshot) => void>();
const ttsListeners = new Set<(message: MultiChatMessage) => void>();
const pendingTts: MultiChatMessage[] = [];
const handles: Partial<Record<ChatPlatform, ConnectorHandle>> = {};

function notify() {
  listeners.forEach((listener) => listener(snapshot));
}
function patchPlatform(platform: ChatPlatform, patch: Partial<PlatformState>) {
  snapshot = {
    ...snapshot,
    statuses: { ...snapshot.statuses, [platform]: { ...snapshot.statuses[platform], ...patch } },
  };
  notify();
}
export function getMultiChatSnapshot() {
  return snapshot;
}
export function subscribeMultiChat(listener: (value: MultiChatSnapshot) => void) {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}
export function useMultiChatSnapshot() {
  const [value, setValue] = useState(snapshot);
  useEffect(() => subscribeMultiChat(setValue), []);
  return value;
}

// Assinatura seletiva para telas que só precisam do estado dos canais, não das mensagens.
export function useMultiChatStatusSnapshot() {
  const [value, setValue] = useState(() => ({
    channels: snapshot.channels,
    statuses: snapshot.statuses,
  }));
  useEffect(
    () =>
      subscribeMultiChat((next) => {
        setValue((current) => {
          if (current.channels === next.channels && current.statuses === next.statuses)
            return current;
          return { channels: next.channels, statuses: next.statuses };
        });
      }),
    [],
  );
  return value;
}
export function setMultiChatChannel(platform: ChatPlatform, channel: string) {
  snapshot = { ...snapshot, channels: { ...snapshot.channels, [platform]: channel } };
  notify();
}
export function subscribeTtsMessages(listener: (message: MultiChatMessage) => void) {
  ttsListeners.add(listener);
  while (pendingTts.length) listener(pendingTts.shift()!);
  return () => {
    ttsListeners.delete(listener);
  };
}
function publishTts(message: MultiChatMessage) {
  if (ttsListeners.size) ttsListeners.forEach((listener) => listener(message));
  else {
    pendingTts.push(message);
    if (pendingTts.length > 100) pendingTts.shift();
  }
}
export function connectMultiChatPlatform(platform: ChatPlatform) {
  const channel = snapshot.channels[platform].trim();
  if (!channel || handles[platform]) return;
  patchPlatform(platform, {
    status: "connecting",
    detail: "Conectando ao canal…",
    viewers: null,
    meta: "",
  });
  const onMessage = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const raw = payload as Record<string, unknown>;
    const text = String(raw["text"] ?? raw["message"] ?? raw["content"] ?? "").trim();
    if (!text) return;
    const message: MultiChatMessage = {
      id: String(
        raw["id"] ??
          `${platform}-${String(raw["timestamp"] ?? Date.now())}-${Math.random().toString(36).slice(2, 8)}`,
      ),
      platform,
      author: String(raw["author"] ?? raw["username"] ?? platform),
      text: text.slice(0, 1000),
      roles: Array.isArray(raw["roles"]) ? raw["roles"].map(String) : [],
      timestamp: typeof raw["timestamp"] === "number" ? raw["timestamp"] : Date.now(),
      eventType: typeof raw["eventType"] === "string" ? raw["eventType"] : null,
      emotes: raw["emotes"],
      eventMeta: raw["eventMeta"] && typeof raw["eventMeta"] === "object" ? (raw["eventMeta"] as Record<string, unknown>) : null,
      authorId: typeof raw["authorId"] === "string" ? raw["authorId"] : null,
      firstMsg: raw["firstMsg"] === true,
    };
    const decision = evaluateTtsFilters(message);
    const displayMessage: MultiChatMessage = {
      ...message,
      ttsAllowed: decision.allowed,
      ttsFilterReason: decision.reason,
    };
    snapshot = { ...snapshot, messages: [displayMessage, ...snapshot.messages].slice(0, 300) };
    notify();
    if (decision.message) publishTts(decision.message);
  };
  const onStatus = (next: string, detail?: string) => {
    patchPlatform(platform, {
      status: String(next || "unknown"),
      detail: detail || String(next || "Status atualizado"),
    });
  };
  const onMeta = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const meta = raw as Record<string, unknown>;
    const details =
      meta["meta"] && typeof meta["meta"] === "object"
        ? (meta["meta"] as Record<string, unknown>)
        : meta;
    patchPlatform(platform, {
      viewers:
        typeof meta["viewers"] === "number" ? meta["viewers"] : meta["offline"] ? null : snapshot.statuses[platform].viewers,
      meta: String(
        details["title"] ?? details["channelName"] ?? (meta["offline"] ? "Live offline" : snapshot.statuses[platform].meta),
      ),
      streamMeta: meta["offline"] ? {} : { ...snapshot.statuses[platform].streamMeta, ...details },
    });
  };
  try {
    const handle =
      platform === "Twitch"
        ? connectTwitch(channel, onMessage, onStatus, onMeta)
        : platform === "Kick"
          ? connectKick(channel, onMessage, onStatus, onMeta)
          : connectYouTube(channel, onMessage, onStatus, onMeta);
    handles[platform] = handle;
  } catch (error) {
    delete handles[platform];
    patchPlatform(platform, {
      status: "error",
      detail: error instanceof Error ? error.message : "Falha ao iniciar a conexão.",
    });
  }
}
export function disconnectMultiChatPlatform(platform: ChatPlatform) {
  try {
    handles[platform]?.disconnect();
  } catch {
    /* ignora erro de desconexão */
  }
  delete handles[platform];
  patchPlatform(platform, { status: "idle", detail: "Desconectado", viewers: null, meta: "" });
}
export function disconnectAllMultiChat() {
  PLATFORMS.forEach(disconnectMultiChatPlatform);
}

export default function MultiChatPanel() {
  const state = useMultiChatSnapshot();
  return (
    <section className="dash-chat-panel">
      <header className="dash-panel-header">
        <div>
          <h2>Chat ao vivo</h2>
          <p>Multichat unificado · Twitch, Kick e YouTube</p>
        </div>
        <span className="text-[10px] text-slate-400">{state.messages.length} mensagens</span>
      </header>
      <div className="dash-chat-toolbar">
        <span
          className={`dash-chat-status-dot ${PLATFORMS.some((p) => ["connected", "open"].includes(state.statuses[p].status.toLowerCase())) ? "is-connected" : ""}`}
        />
        {
          PLATFORMS.filter((p) =>
            ["connected", "open"].includes(state.statuses[p].status.toLowerCase()),
          ).length
        }{" "}
        de 3 plataformas conectadas
        <span className="dash-chat-demo-label">Ao vivo</span>
      </div>
      <div className="dash-chat-messages" role="log" aria-label="Mensagens reais do multichat">
        {state.messages.length === 0 ? (
          <div className="dash-chat-empty">
            <MessageSquare />
            <strong>Nenhuma mensagem recebida</strong>
            <span>
              As mensagens aparecerão aqui quando o administrador conectar os canais no Painel
              Admin.
            </span>
          </div>
        ) : (
          state.messages.map((message) => (
            <article
              key={message.id}
              className="flex gap-2 border-b border-white/5 px-3 py-2.5 text-xs"
            >
              <time className="shrink-0 text-[10px] text-slate-500">
                {new Date(message.timestamp).toLocaleTimeString("pt-BR")}
              </time>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[10px] font-semibold text-violet-300">
                  {message.author}
                  <span className="ml-1 font-normal text-slate-500">· {message.platform}</span>
                </p>
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 break-words text-slate-200">{message.text}</p>
                  <span
                    className={
                      message.ttsAllowed === false
                        ? "multichat-tts-status muted"
                        : "multichat-tts-status allowed"
                    }
                    title={
                      message.ttsAllowed === false
                        ? `Silenciada: ${message.ttsFilterReason || "bloqueada pelos filtros"}`
                        : "Liberada para leitura TTS"
                    }
                    aria-label={
                      message.ttsAllowed === false
                        ? "Mensagem silenciada"
                        : "Mensagem liberada para leitura"
                    }
                  >
                    {message.ttsAllowed === false ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
