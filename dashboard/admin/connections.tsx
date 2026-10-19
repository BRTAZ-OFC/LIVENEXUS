import { useEffect, useRef, useState } from "react";
import { RadioTower, Radio, Youtube, Wifi, WifiOff, Trash2, MessageSquare, Activity } from "lucide-react";
import { connectTwitch } from "../configuracao/Config_twitchChat";
import { connectKick } from "../configuracao/Config_kickChat";
import { connectYouTube } from "../configuracao/Config_youtubeLive";

type Platform = "Twitch" | "Kick" | "YouTube";
type ConnectorHandle = { disconnect: () => void };
type StatusMap = Record<Platform, { status: string; detail: string; viewers: number | null; meta: string }>;
type MessageRow = { platform: Platform; text: string; at: string };

const PLATFORMS: Platform[] = ["Twitch", "Kick", "YouTube"];
const INITIAL_STATUS: StatusMap = {
  Twitch: { status: "idle", detail: "Desconectado", viewers: null, meta: "" },
  Kick: { status: "idle", detail: "Desconectado", viewers: null, meta: "" },
  YouTube: { status: "idle", detail: "Desconectado", viewers: null, meta: "" },
};
const META: Record<Platform, { placeholder: string; color: string; Icon: typeof RadioTower }> = {
  Twitch: { placeholder: "Nome do canal (ex.: gaules)", color: "violet", Icon: RadioTower },
  Kick: { placeholder: "Slug do canal (ex.: xqc)", color: "emerald", Icon: Radio },
  YouTube: { placeholder: "@canal, URL ou ID do vídeo", color: "red", Icon: Youtube },
};

export default function AdminConnectionsPage() {
  const [channels, setChannels] = useState<Record<Platform, string>>({ Twitch: "", Kick: "", YouTube: "" });
  const [status, setStatus] = useState<StatusMap>(INITIAL_STATUS);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const handles = useRef<Partial<Record<Platform, ConnectorHandle>>>({});
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => () => {
    PLATFORMS.forEach((platform) => {
      try { handles.current[platform]?.disconnect(); } catch {}
    });
  }, []);

  function setPlatformStatus(platform: Platform, patch: Partial<StatusMap[Platform]>) {
    setStatus((old) => ({ ...old, [platform]: { ...old[platform], ...patch } }));
  }

  function connect(platform: Platform) {
    const channel = channels[platform].trim();
    if (!channel || handles.current[platform]) return;
    setPlatformStatus(platform, { status: "connecting", detail: "Iniciando conexão…", meta: "" });
    const onMessage = (message: unknown) => {
      let text: string;
      try {
        if (typeof message === "string") text = message;
        else if (message && typeof message === "object") {
          const m = message as Record<string, unknown>;
          text = String(m.text ?? m.message ?? m.content ?? JSON.stringify(message));
        } else text = String(message ?? "");
      } catch { text = "Mensagem recebida"; }
      setMessages((old) => [{ platform, text: text.slice(0, 600), at: new Date().toLocaleTimeString() }, ...old].slice(0, 60));
    };
    const onStatus = (nextStatus: string, detail?: string) => {
      setPlatformStatus(platform, { status: String(nextStatus || "unknown"), detail: detail || String(nextStatus || "Status atualizado") });
      if (["error", "closed", "disconnected", "idle"].includes(String(nextStatus).toLowerCase())) {
        if (String(nextStatus).toLowerCase() !== "idle") handles.current[platform] = undefined;
      }
    };
    const onMeta = (meta: unknown) => {
      if (!meta || typeof meta !== "object") return;
      const m = meta as Record<string, unknown>;
      setPlatformStatus(platform, {
        viewers: typeof m.viewers === "number" ? m.viewers : statusRef.current[platform].viewers,
        meta: String(m.title ?? m.channelName ?? (m.offline ? "Live offline" : "")),
      });
    };
    try {
      const handle = platform === "Twitch"
        ? connectTwitch(channel, onMessage, onStatus, onMeta)
        : platform === "Kick"
          ? connectKick(channel, onMessage, onStatus, onMeta)
          : connectYouTube(channel, onMessage, onStatus, onMeta);
      handles.current[platform] = handle;
      setPlatformStatus(platform, { status: "connecting", detail: "Conector iniciado; aguardando resposta da plataforma." });
    } catch (error) {
      handles.current[platform] = undefined;
      setPlatformStatus(platform, { status: "error", detail: error instanceof Error ? error.message : "Falha ao iniciar o conector." });
    }
  }

  function disconnect(platform: Platform) {
    try { handles.current[platform]?.disconnect(); } catch {}
    handles.current[platform] = undefined;
    setPlatformStatus(platform, { status: "idle", detail: "Desconectado pelo administrador.", viewers: null, meta: "" });
  }

  function clearAll() {
    PLATFORMS.forEach(disconnect);
    setMessages([]);
  }

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Conexões administrativas</h2>
          <p className="mt-1 text-xs text-slate-400">Testes de conexão separados dos futuros vínculos dos usuários. Usa os mesmos conectores do BACKUP01.</p>
        </div>
        <button type="button" onClick={clearAll} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20">
          <Trash2 size={14} /> Limpar conexões e eventos
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const { Icon, color, placeholder } = META[platform];
          const item = status[platform];
          const active = Boolean(handles.current[platform]);
          const dot = item.status.toLowerCase() === "connected" || item.status.toLowerCase() === "open";
          return (
            <article key={platform} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl border ${color === "violet" ? "border-violet-400/30 bg-violet-400/10 text-violet-300" : color === "emerald" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}>
                    <Icon size={19} />
                  </span>
                  <div><h3 className="text-sm font-semibold text-white">{platform}</h3><p className="text-[10px] text-slate-500">Conector de administrador</p></div>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${dot ? "bg-emerald-400" : item.status === "connecting" ? "animate-pulse bg-amber-400" : item.status === "error" ? "bg-red-400" : "bg-slate-600"}`} />
              </div>
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-400">Canal para teste</span>
                <input value={channels[platform]} onChange={(e) => setChannels((old) => ({ ...old, [platform]: e.target.value }))} disabled={active} placeholder={placeholder} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-400/50 disabled:opacity-50" />
              </label>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                <p className={`mt-1 text-xs font-medium ${item.status === "error" ? "text-red-300" : dot ? "text-emerald-300" : item.status === "connecting" ? "text-amber-300" : "text-slate-200"}`}>{item.detail}</p>
                {item.viewers !== null && <p className="mt-1 text-[11px] text-slate-400">Espectadores: {item.viewers}</p>}
                {item.meta && <p className="mt-1 truncate text-[11px] text-slate-400">{item.meta}</p>}
              </div>
              {active ? (
                <button type="button" onClick={() => disconnect(platform)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"><WifiOff size={14} /> Desconectar</button>
              ) : (
                <button type="button" onClick={() => connect(platform)} disabled={!channels[platform].trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"><Wifi size={14} /> Conectar canal de teste</button>
              )}
            </article>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Activity size={15} /> Eventos recebidos</div>
          <span className="text-[10px] text-slate-500">{messages.length} eventos recentes</span>
        </div>
        {messages.length === 0 ? <p className="px-4 py-8 text-center text-xs text-slate-500">Nenhuma mensagem recebida ainda. Conecte um canal para testar o chat.</p> : (
          <div className="max-h-80 divide-y divide-white/5 overflow-y-auto">
            {messages.map((m, i) => <div key={`${m.platform}-${m.at}-${i}`} className="flex gap-3 px-4 py-2.5 text-xs"><span className="w-16 shrink-0 text-slate-500">{m.at}</span><span className="w-14 shrink-0 font-semibold text-violet-300">{m.platform}</span><span className="min-w-0 break-words text-slate-300">{m.text}</span></div>)}
          </div>
        )}
      </section>
    </div>
  );
}
