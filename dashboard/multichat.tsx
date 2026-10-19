import { useEffect, useState } from "react";
import { connectTwitch } from "./configuracao/Config_twitchChat";
import { connectKick } from "./configuracao/Config_kickChat";
import { connectYouTube } from "./configuracao/Config_youtubeLive";
import { RadioTower, Radio, Youtube, Wifi, WifiOff, MessageSquare } from "lucide-react";

export type ChatPlatform = "Twitch" | "Kick" | "YouTube";
export type MultiChatMessage = {
  id: string;
  platform: ChatPlatform;
  author: string;
  text: string;
  roles: string[];
  timestamp: number;
  eventType?: string | null;
};
export type PlatformState = { status: string; detail: string; viewers: number | null; meta: string };
export type MultiChatSnapshot = {
  channels: Record<ChatPlatform, string>;
  statuses: Record<ChatPlatform, PlatformState>;
  messages: MultiChatMessage[];
};
type ConnectorHandle = { disconnect: () => void };

const PLATFORMS: ChatPlatform[] = ["Twitch", "Kick", "YouTube"];
const initialStatus = (): Record<ChatPlatform, PlatformState> => ({
  Twitch: { status: "idle", detail: "Desconectado", viewers: null, meta: "" },
  Kick: { status: "idle", detail: "Desconectado", viewers: null, meta: "" },
  YouTube: { status: "idle", detail: "Desconectado", viewers: null, meta: "" },
});
const platformIcons = { Twitch: RadioTower, Kick: Radio, YouTube: Youtube };
const placeholders: Record<ChatPlatform, string> = {
  Twitch: "Canal da Twitch (ex.: gaules)",
  Kick: "Canal do Kick (ex.: xqc)",
  YouTube: "@canal, URL ou ID do vídeo",
};
let snapshot: MultiChatSnapshot = {
  channels: { Twitch: "", Kick: "", YouTube: "" },
  statuses: initialStatus(),
  messages: [],
};
const listeners = new Set<(value: MultiChatSnapshot) => void>();
const ttsListeners = new Set<(message: MultiChatMessage) => void>();
const pendingTts: MultiChatMessage[] = [];
const handles: Partial<Record<ChatPlatform, ConnectorHandle>> = {};

function notify() { listeners.forEach((listener) => listener(snapshot)); }
function patchPlatform(platform: ChatPlatform, patch: Partial<PlatformState>) {
  snapshot = { ...snapshot, statuses: { ...snapshot.statuses, [platform]: { ...snapshot.statuses[platform], ...patch } } };
  notify();
}
export function getMultiChatSnapshot() { return snapshot; }
export function subscribeMultiChat(listener: (value: MultiChatSnapshot) => void) {
  listeners.add(listener);
  listener(snapshot);
  return () => { listeners.delete(listener); };
}
export function useMultiChatSnapshot() {
  const [value, setValue] = useState(snapshot);
  useEffect(() => subscribeMultiChat(setValue), []);
  return value;
}
export function setMultiChatChannel(platform: ChatPlatform, channel: string) {
  snapshot = { ...snapshot, channels: { ...snapshot.channels, [platform]: channel } };
  notify();
}
export function subscribeTtsMessages(listener: (message: MultiChatMessage) => void) {
  ttsListeners.add(listener);
  while (pendingTts.length) listener(pendingTts.shift()!);
  return () => { ttsListeners.delete(listener); };
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
  patchPlatform(platform, { status: "connecting", detail: "Conectando ao canal…", viewers: null, meta: "" });
  const onMessage = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const raw = payload as Record<string, unknown>;
    const text = String(raw.text ?? raw.message ?? raw.content ?? "").trim();
    if (!text) return;
    const message: MultiChatMessage = {
      id: String(raw.id ?? `${platform}-${String(raw.timestamp ?? Date.now())}-${Math.random().toString(36).slice(2, 8)}`),
      platform,
      author: String(raw.author ?? raw.username ?? platform),
      text: text.slice(0, 1000),
      roles: Array.isArray(raw.roles) ? raw.roles.map(String) : [],
      timestamp: typeof raw.timestamp === "number" ? raw.timestamp : Date.now(),
      eventType: typeof raw.eventType === "string" ? raw.eventType : null,
    };
    snapshot = { ...snapshot, messages: [message, ...snapshot.messages].slice(0, 300) };
    notify();
    publishTts(message);
  };
  const onStatus = (next: string, detail?: string) => {
    patchPlatform(platform, { status: String(next || "unknown"), detail: detail || String(next || "Status atualizado") });
  };
  const onMeta = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const meta = raw as Record<string, unknown>;
    const details = meta.meta && typeof meta.meta === "object" ? meta.meta as Record<string, unknown> : meta;
    patchPlatform(platform, {
      viewers: typeof meta.viewers === "number" ? meta.viewers : snapshot.statuses[platform].viewers,
      meta: String(details.title ?? details.channelName ?? (meta.offline ? "Live offline" : "")),
    });
  };
  try {
    const handle = platform === "Twitch"
      ? connectTwitch(channel, onMessage, onStatus, onMeta)
      : platform === "Kick"
        ? connectKick(channel, onMessage, onStatus, onMeta)
        : connectYouTube(channel, onMessage, onStatus, onMeta);
    handles[platform] = handle;
  } catch (error) {
    handles[platform] = undefined;
    patchPlatform(platform, { status: "error", detail: error instanceof Error ? error.message : "Falha ao iniciar a conexão." });
  }
}
export function disconnectMultiChatPlatform(platform: ChatPlatform) {
  try { handles[platform]?.disconnect(); } catch {}
  handles[platform] = undefined;
  patchPlatform(platform, { status: "idle", detail: "Desconectado", viewers: null, meta: "" });
}
export function disconnectAllMultiChat() { PLATFORMS.forEach(disconnectMultiChatPlatform); }

export default function MultiChatPanel() {
  const state = useMultiChatSnapshot();
  return (
    <section className="dash-chat-panel">
      <header className="dash-panel-header">
        <div><h2>Chat ao vivo</h2><p>Multichat unificado · Twitch, Kick e YouTube</p></div>
        <span className="text-[10px] text-slate-400">{state.messages.length} mensagens</span>
      </header>
      <div className="dash-chat-toolbar">
        <span className={`dash-chat-status-dot ${PLATFORMS.some((p) => ["connected", "open"].includes(state.statuses[p].status.toLowerCase())) ? "is-connected" : ""}`} />
        {PLATFORMS.filter((p) => ["connected", "open"].includes(state.statuses[p].status.toLowerCase())).length} de 3 plataformas conectadas
        <span className="dash-chat-demo-label">Ao vivo</span>
      </div>
      <div className="dash-chat-messages" role="log" aria-label="Mensagens reais do multichat">
        {state.messages.length === 0 ? (
          <div className="dash-chat-empty"><MessageSquare /><strong>Nenhuma mensagem recebida</strong><span>As mensagens aparecerão aqui quando o administrador conectar os canais no Painel Admin.</span></div>
        ) : state.messages.map((message) => (
          <article key={message.id} className="flex gap-2 border-b border-white/5 px-3 py-2.5 text-xs">
            <time className="shrink-0 text-[10px] text-slate-500">{new Date(message.timestamp).toLocaleTimeString("pt-BR")}</time>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-semibold text-violet-300">{message.author}<span className="ml-1 font-normal text-slate-500">· {message.platform}</span></p>
              <p className="break-words text-slate-200">{message.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
