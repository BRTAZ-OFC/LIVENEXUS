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
const META: Record<ChatPlatform, { placeholder: string; Icon: typeof RadioTower }> = {
  Twitch: { placeholder: "Nome do canal (ex.: gaules)", Icon: RadioTower },
  Kick: { placeholder: "Slug do canal (ex.: xqc)", Icon: Radio },
  YouTube: { placeholder: "@canal ou URL do canal", Icon: Youtube },
};

export default function AdminConnectionsPage() {
  const state = useMultiChatSnapshot();
  const [channels, setChannels] = useState(getMultiChatSnapshot().channels);
  const [busy, setBusy] = useState<ChatPlatform | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => setChannels((old) => ({ ...old, ...getMultiChatSnapshot().channels }));
    return subscribeMultiChat(sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      try {
        const token = sessionStorage.getItem("livenexus_token");
        const userId = sessionStorage.getItem("livenexus_user_id");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (userId) headers["X-User-Id"] = userId;
        const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
        const response = await fetch(`/api/plataformas${query}`, {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok) return;
        const saved = Array.isArray(data.plataformas) ? data.plataformas[0] : null;
        if (!saved || cancelled) return;
        const next = {
          Twitch: typeof saved.twitch === "string" ? saved.twitch : "",
          Kick: typeof saved.kick === "string" ? saved.kick : "",
          YouTube: typeof saved.youtube === "string" ? saved.youtube : "",
        };
        setChannels(next);
        PLATFORMS.forEach((platform) => {
          if (next[platform]) setMultiChatChannel(platform, next[platform]);
        });
      } catch {
        // A conexão administrativa não depende da API de vinculação por bio.
      }
    }
    void loadSaved();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateChannel(platform: ChatPlatform, value: string) {
    setChannels((old) => ({ ...old, [platform]: value }));
    setMultiChatChannel(platform, value);
    setError("");
    setNotice("");
  }

  async function toggleConnection(platform: ChatPlatform) {
    const status = state.statuses[platform].status.toLowerCase();
    if (["connected", "open", "connecting", "reconnecting"].includes(status)) {
      disconnectMultiChatPlatform(platform);
      setNotice(`${platform} desconectado.`);
      return;
    }
    const channel = channels[platform].trim();
    if (!channel) {
      setError("Informe o canal antes de conectar.");
      return;
    }
    setBusy(platform);
    setError("");
    setNotice("");
    setMultiChatChannel(platform, channel);
    connectMultiChatPlatform(platform);
    setNotice(`Conexão administrativa de ${platform} iniciada sem exigir vinculação por bio.`);
    try {
      const token = sessionStorage.getItem("livenexus_token");
      const userId = sessionStorage.getItem("livenexus_user_id");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (userId) headers["X-User-Id"] = userId;
      const response = await fetch("/api/plataformas", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          channel_name: channel,
          ...(userId ? { user_id: userId } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok)
        setNotice(
          `Conexão iniciada; não foi possível salvar o canal no JSON: ${data.error || "erro de gravação"}`,
        );
    } catch {
      setNotice("Conexão iniciada. A gravação opcional do canal no JSON não ficou disponível.");
    } finally {
      setBusy("");
    }
  }

  function disconnectAll() {
    PLATFORMS.forEach(disconnectMultiChatPlatform);
    setNotice("Todas as conexões administrativas foram desconectadas.");
  }

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Conexões administrativas</h2>
          <p className="mt-1 text-xs text-slate-400">
            Conexão direta para testes administrativos. Não exige vinculação por bio.
          </p>
        </div>
        <button
          type="button"
          onClick={disconnectAll}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
        >
          <Trash2 size={14} /> Desconectar todas
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200"
        >
          {notice}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const { Icon, placeholder } = META[platform];
          const item = state.statuses[platform];
          const active = ["connected", "open", "connecting", "reconnecting"].includes(
            item.status.toLowerCase(),
          );
          const online = ["connected", "open"].includes(item.status.toLowerCase());
          return (
            <article
              key={platform}
              className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-violet-300">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{platform}</h3>
                    <p className="text-[10px] text-slate-500">Conexão livre</p>
                  </div>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : active ? "animate-pulse bg-amber-400" : item.status === "error" ? "bg-red-400" : "bg-slate-600"}`}
                />
              </div>
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-400">Canal</span>
                <input
                  value={channels[platform]}
                  onChange={(e) => updateChannel(platform, e.target.value)}
                  disabled={active || busy === platform}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-400/50 disabled:opacity-50"
                />
              </label>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <p className="mt-1 text-xs text-slate-200">{item.detail}</p>
                {item.viewers !== null && (
                  <p className="mt-1 text-[11px] text-slate-400">Espectadores: {item.viewers}</p>
                )}
                {item.meta && (
                  <p className="mt-1 truncate text-[11px] text-slate-400">{item.meta}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleConnection(platform)}
                disabled={(!active && !channels[platform].trim()) || busy === platform}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold ${active ? "border border-red-500/30 bg-red-500/10 text-red-300" : "bg-violet-600 text-white hover:bg-violet-500"} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {active ? (
                  <>
                    <WifiOff size={14} />
                    Desconectar
                  </>
                ) : (
                  <>
                    <Wifi size={14} />
                    {busy === platform ? "Conectando…" : "Conectar canal"}
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity size={15} />
            Eventos recebidos
          </div>
          <span className="text-[10px] text-slate-500">{state.messages.length} mensagens</span>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {state.messages.length === 0 ? (
            <p className="p-5 text-xs text-slate-500">Nenhuma mensagem recebida.</p>
          ) : (
            state.messages.slice(0, 60).map((message) => (
              <div key={message.id} className="flex gap-3 px-4 py-3 text-xs">
                <span className="shrink-0 text-slate-500">
                  {new Date(message.timestamp).toLocaleTimeString("pt-BR")}
                </span>
                <span className="shrink-0 font-semibold text-violet-300">{message.author}</span>
                <span className="shrink-0 text-slate-500">{message.platform}</span>
                <span className="min-w-0 break-words text-slate-300">{message.text}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
