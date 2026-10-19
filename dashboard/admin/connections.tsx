import { useEffect, useState } from "react";
import { RadioTower, Radio, Youtube, Wifi, WifiOff, Trash2, Activity } from "lucide-react";
import {
  connectMultiChatPlatform,
  disconnectMultiChatPlatform,
  getMultiChatSnapshot,
  setMultiChatChannel,
  subscribeMultiChat,
  useMultiChatSnapshot,
  type ChatPlatform,
} from "../multichat";

const PLATFORMS: ChatPlatform[] = ["Twitch", "Kick", "YouTube"];
const META: Record<ChatPlatform, { placeholder: string; color: string; Icon: typeof RadioTower }> = {
  Twitch: { placeholder: "Nome do canal (ex.: gaules)", color: "violet", Icon: RadioTower },
  Kick: { placeholder: "Slug do canal (ex.: xqc)", color: "emerald", Icon: Radio },
  YouTube: { placeholder: "@canal, URL ou ID do vídeo", color: "red", Icon: Youtube },
};

export default function AdminConnectionsPage() {
  const state = useMultiChatSnapshot();
  const [channels, setChannels] = useState(state.channels);
  const [connectionError, setConnectionError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");

  useEffect(() => {
    const sync = () => setChannels(getMultiChatSnapshot().channels);
    const unsubscribe = subscribeMultiChat(sync);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSavedConnections() {
      try {
        const token = sessionStorage.getItem("livenexus_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const response = await fetch("/api/plataformas", {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.message || "Não foi possível carregar os canais salvos.");
        }
        if (cancelled) return;
        const saved = Array.isArray(data.plataformas) ? data.plataformas[0] : null;
        if (!saved) return;
        if (typeof saved.twitch === "string" && saved.twitch) setMultiChatChannel("Twitch", saved.twitch);
        if (typeof saved.kick === "string" && saved.kick) setMultiChatChannel("Kick", saved.kick);
        if (typeof saved.youtube === "string" && saved.youtube) setMultiChatChannel("YouTube", saved.youtube);
      } catch (error) {
        if (!cancelled) {
          setConnectionError(error instanceof Error ? error.message : "Falha ao carregar conexões salvas.");
        }
      }
    }
    void loadSavedConnections();
    return () => { cancelled = true; };
  }, []);

  function updateChannel(platform: ChatPlatform, value: string) {
    setChannels((old) => ({ ...old, [platform]: value }));
    setMultiChatChannel(platform, value);
    setConnectionError("");
    setConnectionNotice("");
  }

  async function connectPlatform(platform: ChatPlatform) {
    setConnectionError("");
    setConnectionNotice("");
    const channel = channels[platform].trim();
    if (!channel) return;

    try {
      const token = sessionStorage.getItem("livenexus_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch("/api/plataformas", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          channel_id: channel,
          channel_name: channel,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.message || "Não foi possível salvar o canal no JSON do usuário.");
      }
      connectMultiChatPlatform(platform);
      setConnectionNotice(`Canal ${platform} salvo no JSON da conta autenticada.`);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Falha ao salvar a conexão.");
    }
  }

  function clearAll() {
    PLATFORMS.forEach(disconnectMultiChatPlatform);
  }

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Conexões administrativas</h2>
          <p className="mt-1 text-xs text-slate-400">Conectores globais do multichat. Permanecem ativos ao navegar entre as abas da plataforma.</p>
        </div>
        <button type="button" onClick={clearAll} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20">
          <Trash2 size={14} /> Desconectar todas
        </button>
      </header>

      {connectionError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{connectionError}</p>}
      {connectionNotice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{connectionNotice}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const { Icon, color, placeholder } = META[platform];
          const item = state.statuses[platform];
          const active = ["connected", "open", "connecting", "reconnecting"].includes(item.status.toLowerCase());
          const dot = ["connected", "open"].includes(item.status.toLowerCase());
          return (
            <article key={platform} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl border ${color === "violet" ? "border-violet-400/30 bg-violet-400/10 text-violet-300" : color === "emerald" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}>
                    <Icon size={19} />
                  </span>
                  <div><h3 className="text-sm font-semibold text-white">{platform}</h3><p className="text-[10px] text-slate-500">Conector global</p></div>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${dot ? "bg-emerald-400" : item.status.toLowerCase().includes("connect") ? "animate-pulse bg-amber-400" : item.status === "error" ? "bg-red-400" : "bg-slate-600"}`} />
              </div>
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-400">Canal</span>
                <input value={channels[platform]} onChange={(e) => updateChannel(platform, e.target.value)} disabled={active} placeholder={placeholder} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-400/50 disabled:opacity-50" />
              </label>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                <p className={`mt-1 text-xs font-medium ${item.status === "error" ? "text-red-300" : dot ? "text-emerald-300" : active ? "text-amber-300" : "text-slate-200"}`}>{item.detail}</p>
                {item.viewers !== null && <p className="mt-1 text-[11px] text-slate-400">Espectadores: {item.viewers}</p>}
                {item.meta && <p className="mt-1 truncate text-[11px] text-slate-400">{item.meta}</p>}
              </div>
              {active ? (
                <button type="button" onClick={() => disconnectMultiChatPlatform(platform)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"><WifiOff size={14} /> Desconectar</button>
              ) : (
                <button type="button" onClick={() => void connectPlatform(platform)} disabled={!channels[platform].trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"><Wifi size={14} /> Conectar canal</button>
              )}
            </article>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Activity size={15} /> Eventos recebidos</div>
          <span className="text-[10px] text-slate-500">{state.messages.length} mensagens</span>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {state.messages.length === 0 ? <p className="p-5 text-xs text-slate-500">Nenhuma mensagem recebida.</p> : state.messages.slice(0, 60).map((message) => (
            <div key={message.id} className="flex gap-3 px-4 py-3 text-xs">
              <span className="shrink-0 text-slate-500">{new Date(message.timestamp).toLocaleTimeString("pt-BR")}</span>
              <span className="shrink-0 font-semibold text-violet-300">{message.author}</span>
              <span className="shrink-0 text-slate-500">{message.platform}</span>
              <span className="min-w-0 break-words text-slate-300">{message.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
