import { useEffect, useState } from "react";
import { RadioTower, Radio, Youtube, Wifi, WifiOff, ShieldCheck, Copy } from "lucide-react";
import { channelVerify } from "../configuracao/Config_channelVerify";
import {
  connectMultiChatPlatform,
  disconnectMultiChatPlatform,
  getMultiChatSnapshot,
  setMultiChatChannel,
  useMultiChatSnapshot,
  type ChatPlatform,
} from "../multichat";

const PLATFORMS: ChatPlatform[] = ["Twitch", "Kick", "YouTube"];
type VerificationState = { challengeId: string; code: string; verified: boolean };
const EMPTY: Record<ChatPlatform, VerificationState> = {
  Twitch: { challengeId: "", code: "", verified: false },
  Kick: { challengeId: "", code: "", verified: false },
  YouTube: { challengeId: "", code: "", verified: false },
};

export default function PlatformBioConnections() {
  const state = useMultiChatSnapshot();
  const [channels, setChannels] = useState(getMultiChatSnapshot().channels);
  const [verification, setVerification] = useState(EMPTY);
  const [busy, setBusy] = useState<ChatPlatform | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      try {
        const token = sessionStorage.getItem("livenexus_token");
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch("/api/plataformas", { headers, credentials: "include", cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível carregar as plataformas.");
        const saved = Array.isArray(data.plataformas) ? data.plataformas[0] : null;
        if (!saved || cancelled) return;
        const next = {
          Twitch: typeof saved.twitch === "string" ? saved.twitch : "",
          Kick: typeof saved.kick === "string" ? saved.kick : "",
          YouTube: typeof saved.youtube === "string" ? saved.youtube : "",
        };
        setChannels(next);
        PLATFORMS.forEach((platform) => { if (next[platform]) setMultiChatChannel(platform, next[platform]); });
        setVerification({
          Twitch: { challengeId: "", code: "", verified: String(saved.twitch_status || "").toLowerCase() === "verified" },
          Kick: { challengeId: "", code: "", verified: String(saved.kick_status || "").toLowerCase() === "verified" },
          YouTube: { challengeId: "", code: "", verified: String(saved.youtube_status || "").toLowerCase() === "verified" },
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar plataformas.");
      }
    }
    void loadSaved();
    return () => { cancelled = true; };
  }, []);

  function changeChannel(platform: ChatPlatform, value: string) {
    setChannels((old) => ({ ...old, [platform]: value }));
    setMultiChatChannel(platform, value);
    setVerification((old) => ({ ...old, [platform]: { challengeId: "", code: "", verified: false } }));
    setError("");
    setNotice("");
  }

  async function generateCode(platform: ChatPlatform) {
    const channel = channels[platform].trim();
    if (!channel) return;
    setBusy(platform); setError(""); setNotice("");
    try {
      const result = await channelVerify.challenge(platform, channel);
      setVerification((old) => ({ ...old, [platform]: { challengeId: result.challengeId, code: result.verificationCode, verified: false } }));
      setNotice(`Código gerado para ${platform}. Publique-o na bio ou descrição pública do canal.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o código.");
    } finally { setBusy(""); }
  }

  async function verifyAndConnect(platform: ChatPlatform) {
    const challengeId = verification[platform].challengeId;
    if (!challengeId) { setError("Gere um código primeiro."); return; }
    setBusy(platform); setError(""); setNotice("");
    try {
      const result = await channelVerify.verify(challengeId);
      const channel = String(result.channelIdentifier || channels[platform]).trim();
      setChannels((old) => ({ ...old, [platform]: channel }));
      setMultiChatChannel(platform, channel);
      setVerification((old) => ({ ...old, [platform]: { challengeId: "", code: "", verified: true } }));
      connectMultiChatPlatform(platform);
      setNotice(`Bio de ${platform} verificada. Canal salvo no JSON e conexão iniciada.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível verificar a bio.");
    } finally { setBusy(""); }
  }

  async function connectVerified(platform: ChatPlatform) {
    if (!verification[platform].verified) { setError("Verifique a bio antes de conectar."); return; }
    const channel = channels[platform].trim();
    if (!channel) return;
    setMultiChatChannel(platform, channel);
    connectMultiChatPlatform(platform);
    setNotice(`Conectando ao canal ${platform} verificado.`);
  }

  return (
    <section className="tts-card tts-platform-connections">
      <div className="tts-card-title"><span className="tts-title-icon"><RadioTower /></span><div><h2>Conexões de plataforma</h2><p>Gere um código, publique-o na bio/descrição pública e confirme a propriedade antes de conectar.</p></div></div>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</p>}
      <div className="tts-platform-grid">
        {PLATFORMS.map((platform) => {
          const item = state.statuses[platform];
          const verified = verification[platform].verified;
          const active = ["connected", "open", "connecting", "reconnecting"].includes(item.status.toLowerCase());
          const online = ["connected", "open"].includes(item.status.toLowerCase());
          const Icon = platform === "Twitch" ? RadioTower : platform === "Kick" ? Radio : Youtube;
          const placeholder = platform === "Twitch" ? "Nome do canal (ex.: gaules)" : platform === "Kick" ? "Slug do canal (ex.: xqc)" : "@canal ou URL do canal";
          return <article key={platform} className="tts-platform-card">
            <div className="tts-platform-card-heading"><span className={`tts-platform-icon ${platform.toLowerCase()}`}><Icon size={18} /></span><div><h3>{platform}</h3><p>{verified ? "Bio verificada" : "Vinculação por bio obrigatória"}</p></div><span className={`tts-platform-dot ${online ? "online" : active ? "pending" : item.status === "error" ? "error" : ""}`} /></div>
            <label className="tts-platform-field">Canal
              <input value={channels[platform]} onChange={(event) => changeChannel(platform, event.target.value)} disabled={active || busy === platform} placeholder={placeholder} />
            </label>
            {verification[platform].code && !verified && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
              <p className="text-[11px] text-amber-200">Publique este código na bio/descrição pública:</p>
              <div className="mt-2 flex items-center justify-between gap-2"><code className="font-bold tracking-wider text-white">{verification[platform].code}</code><button type="button" onClick={() => { void navigator.clipboard?.writeText(verification[platform].code); }} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] text-slate-200"><Copy size={12} />Copiar</button></div>
              <p className="mt-2 text-[10px] text-slate-400">O código expira em 30 minutos.</p>
            </div>}
            <div className="tts-platform-status"><span>Status</span><p className={item.status === "error" ? "error" : online ? "online" : active ? "pending" : ""}>{verified && <ShieldCheck size={13} className="inline mr-1" />}{verified ? "Bio verificada" : "Aguardando verificação"} · {item.detail}</p>{item.viewers !== null && <small>Espectadores: {item.viewers}</small>}{item.meta && <small>{item.meta}</small>}</div>
            {!verified && !verification[platform].challengeId && <button type="button" className="tts-platform-action" disabled={!channels[platform].trim() || busy === platform} onClick={() => void generateCode(platform)}>{busy === platform ? "Gerando código…" : "Gerar código de bio"}</button>}
            {!verified && verification[platform].challengeId && <button type="button" className="tts-platform-action" disabled={busy === platform} onClick={() => void verifyAndConnect(platform)}>{busy === platform ? "Verificando…" : "Verificar bio e conectar"}</button>}
            {verified && <button type="button" className={active ? "tts-platform-action disconnect" : "tts-platform-action"} disabled={!channels[platform].trim() || busy === platform} onClick={() => {
              if (active) { disconnectMultiChatPlatform(platform); return; }
              connectVerified(platform);
            }}>{active ? <><WifiOff size={14} />Desconectar</> : <><Wifi size={14} />Conectar canal verificado</>}</button>}
          </article>;
        })}
      </div>
    </section>
  );
}
