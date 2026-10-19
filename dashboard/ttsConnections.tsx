import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, LoaderCircle, RadioTower, ShieldCheck, Unplug, Youtube } from "lucide-react";
import { connectMultiChatPlatform, disconnectMultiChatPlatform, getMultiChatSnapshot, setMultiChatChannel, useMultiChatSnapshot, type ChatPlatform } from "./multichat";

type Platform = ChatPlatform;
type PlatformInfo = { label: string; hint: string; placeholder: string; accent: string; Icon: typeof RadioTower };
const PLATFORMS: Platform[] = ["Twitch", "Kick", "YouTube"];
const INFO: Record<Platform, PlatformInfo> = {
  Twitch: { label: "Twitch", hint: "Nome do canal, sem URL", placeholder: "ex.: gaules", accent: "twitch", Icon: RadioTower },
  Kick: { label: "Kick", hint: "Nome/slug do canal", placeholder: "ex.: xqc", accent: "kick", Icon: RadioTower },
  YouTube: { label: "YouTube", hint: "Handle, URL do canal ou ID", placeholder: "ex.: @canal", accent: "youtube", Icon: Youtube },
};
type ConnectionState = { channel: string; code: string; challenge: string; challengeExpiresAt: number; verified: boolean; busy: boolean; message: string };
const CONNECTION_STATE_KEY = "livenexus:tts-bio-state-v1";
const emptyState = (): ConnectionState => ({ channel: "", code: "", challenge: "", challengeExpiresAt: 0, verified: false, busy: false, message: "" });

function loadConnectionItems(): Record<Platform, ConnectionState> {
  let saved: Partial<Record<Platform, Partial<ConnectionState>>> = {};
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CONNECTION_STATE_KEY) || "{}") as Partial<Record<Platform, Partial<ConnectionState>>>;
    saved = parsed && typeof parsed === "object" ? parsed : {};
  } catch {}

  const current = getMultiChatSnapshot();
  return Object.fromEntries(PLATFORMS.map((platform) => {
    let savedChannel = current.channels[platform];
    try { savedChannel = localStorage.getItem(`livenexus:tts-channel:${platform}`) || savedChannel; } catch {}

    const item = saved[platform] || {};
    const expiresAt = Number(item.challengeExpiresAt) || 0;
    const challengeValid = typeof item.code === "string" && !!item.code &&
      typeof item.challenge === "string" && !!item.challenge && expiresAt > Date.now();

    return [platform, {
      ...emptyState(),
      channel: typeof item.channel === "string" ? item.channel : savedChannel,
      code: challengeValid ? item.code! : "",
      challenge: challengeValid ? item.challenge! : "",
      challengeExpiresAt: challengeValid ? expiresAt : 0,
      // A verificação é confirmada novamente pela API; sessionStorage não é autoridade de acesso.
      verified: false,
      busy: false,
      message: !challengeValid && !!item.code && item.verified !== true
        ? "O código expirou. Gere outro código para continuar."
        : typeof item.message === "string" ? item.message : "",
    }];
  })) as Record<Platform, ConnectionState>;
}

export default function TtsConnectionsPanel() {
  const snapshot = useMultiChatSnapshot();
  const [items, setItems] = useState<Record<Platform, ConnectionState>>(loadConnectionItems);
  const itemsRef = useRef(items);
  const [copied, setCopied] = useState(false);

  function patch(platform: Platform, changes: Partial<ConnectionState>) {
    if (typeof changes.channel === "string") {
      try { localStorage.setItem(`livenexus:tts-channel:${platform}`, changes.channel); } catch {}
    }
    const next = {
      ...itemsRef.current,
      [platform]: { ...itemsRef.current[platform], ...changes },
    };
    itemsRef.current = next;
    // Salva sincronamente para que um reload inesperado não apague o código recém-gerado.
    try { sessionStorage.setItem(CONNECTION_STATE_KEY, JSON.stringify(next)); } catch {}
    setItems(next);
  }

  useEffect(() => {
    for (const platform of PLATFORMS) {
      const channel = items[platform].channel.trim();
      if (!channel) continue;
      void fetch("/api/connections/bio/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, channel }),
      }).then(async (response) => {
        const result = await response.json() as { ok?: boolean; verified?: boolean };
        if (response.ok && result.ok && result.verified) patch(platform, { verified: true, message: "Propriedade verificada anteriormente. Você já pode conectar o chat." });
      }).catch(() => {});
    }
  // Initial restoration only: channel changes are handled by the form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestCode(platform: Platform) {
    const item = items[platform];
    if (!item.channel.trim()) { patch(platform, { message: "Informe o canal primeiro." }); return; }
    patch(platform, { busy: true, message: "" });
    try {
      const response = await fetch("/api/connections/bio/challenge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, channel: item.channel.trim() }),
      });
      const result = await response.json() as { ok?: boolean; code?: string; challengeId?: string; expiresInSeconds?: number; message?: string };
      if (!response.ok || !result.ok || !result.code || !result.challengeId) throw new Error(result.message || "Não foi possível gerar o código.");
      patch(platform, { challenge: result.challengeId, code: result.code, challengeExpiresAt: Date.now() + Math.max(1, Number(result.expiresInSeconds) || 1800) * 1000, verified: false, message: "Coloque o código na bio/descrição pública do canal e depois confirme a verificação." });
    } catch (error) {
      patch(platform, { message: error instanceof Error ? error.message : "Falha ao gerar o código." });
    } finally { patch(platform, { busy: false }); }
  }

  async function verify(platform: Platform) {
    const item = items[platform];
    if (!item.challenge) { patch(platform, { message: "Gere um código de verificação primeiro." }); return; }
    patch(platform, { busy: true, message: "" });
    try {
      const response = await fetch("/api/connections/bio/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, channel: item.channel.trim(), challengeId: item.challenge }),
      });
      const result = await response.json() as { ok?: boolean; verified?: boolean; message?: string };
      if (!response.ok || !result.ok || !result.verified) throw new Error(result.message || "Código não encontrado na bio pública.");
      patch(platform, { verified: true, message: "Canal verificado. Você já pode conectar o chat." });
    } catch (error) {
      patch(platform, { message: error instanceof Error ? error.message : "Falha ao verificar a bio." });
    } finally { patch(platform, { busy: false }); }
  }

  function connect(platform: Platform) {
    const item = items[platform];
    if (!item.verified) { patch(platform, { message: "Verifique a propriedade do canal antes de conectar." }); return; }
    setMultiChatChannel(platform, item.channel.trim());
    connectMultiChatPlatform(platform);
    patch(platform, { message: "Solicitação de conexão enviada ao conector." });
  }

  function disconnect(platform: Platform) {
    disconnectMultiChatPlatform(platform);
    patch(platform, { message: "Canal desconectado." });
  }

  return (
    <section className="tts-card tts-connections-panel">
      <div className="tts-card-title">
        <span className="tts-title-icon"><ShieldCheck /></span>
        <div><h2>Conexões de usuário</h2><p>Comprove que você controla o canal usando um código temporário na bio pública.</p></div>
      </div>
      <p className="tts-bio-notice">O código expira em 15 minutos. Remova-o da bio depois da confirmação. A verificação não solicita senha nem token da plataforma.</p>
      <div className="tts-user-connect-grid">
        {PLATFORMS.map((platform) => {
          const info = INFO[platform];
          const item = items[platform];
          const status = snapshot.statuses[platform];
          const active = ["connected", "open", "connecting", "reconnecting"].includes(status.status.toLowerCase());
          const Icon = info.Icon;
          return (
            <article className="tts-user-connect-card" key={platform}>
              <div className="tts-user-connect-heading">
                <span className={`tts-user-connect-icon ${info.accent}`}><Icon size={19} /></span>
                <div><h3>{info.label}</h3><p>{info.hint}</p></div>
                <span className={active ? "tts-user-connect-dot active" : item.verified ? "tts-user-connect-dot verified" : "tts-user-connect-dot"} />
              </div>
              <label className="tts-connection-label">Canal
                <input value={item.channel} placeholder={info.placeholder} disabled={active} onChange={(event) => patch(platform, { channel: event.target.value, verified: false, challenge: "", code: "", challengeExpiresAt: 0, message: "" })} />
              </label>
              {!item.verified ? (
                <>
                  <button type="button" className="tts-connection-primary" disabled={item.busy || !item.channel.trim()} onClick={() => void requestCode(platform)}>
                    {item.busy ? <LoaderCircle size={14} className="tts-spin" /> : <ShieldCheck size={14} />} Gerar código de bio
                  </button>
                  {item.code && <div className="tts-bio-code"><span>{item.code}</span><button type="button" title="Copiar código" onClick={() => { void navigator.clipboard?.writeText(item.code); setCopied(true); }}><Copy size={13} />{copied ? "Copiado" : "Copiar"}</button></div>}
                  {item.code && <button type="button" className="tts-connection-secondary" disabled={item.busy} onClick={() => void verify(platform)}>{item.busy ? <LoaderCircle size={14} className="tts-spin" /> : <CheckCircle2 size={14} />} Confirmar bio</button>}
                </>
              ) : (
                <div className="tts-connection-verified"><CheckCircle2 size={15} /> Propriedade verificada
                  {active ? <button type="button" onClick={() => disconnect(platform)}><Unplug size={13} /> Desconectar</button> : <button type="button" onClick={() => connect(platform)}><RadioTower size={13} /> Conectar chat</button>}
                </div>
              )}
              <p className={item.verified ? "tts-connection-message success" : "tts-connection-message"} role="status">{item.message || status.detail}</p>
            </article>
          );
        })}
      </div>
      <p className="tts-filter-footer">A autenticação por bio comprova controle do perfil público; o recebimento de mensagens depende da disponibilidade do conector da plataforma.</p>
    </section>
  );
}
