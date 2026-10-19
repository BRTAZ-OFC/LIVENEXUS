import { useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { channelVerify } from "./Config_channelVerify";
import { channelUrl, hintFor, normalizeChannelInput, placeholderFor } from "./Config_channelCode";

const tutorials = {
  Twitch: [
    "Copie o código Live Nexus.",
    "Abra seu canal da Twitch e entre em editar perfil.",
    "Coloque temporariamente o código na bio pública e salve.",
    "Volte ao Live Nexus e clique em Validar canal.",
  ],
  Kick: [
    "Copie o código Live Nexus.",
    "Abra seu perfil da Kick e edite a bio pública.",
    "Cole o código e salve.",
    "Volte ao Live Nexus e clique em Validar canal.",
  ],
  YouTube: [
    "Copie o código Live Nexus.",
    "Abra as configurações do canal do YouTube.",
    "Cole temporariamente o código na descrição pública do canal e salve.",
    "Volte ao Live Nexus e clique em Validar canal.",
  ],
};

export default function ChannelLinkDialog({ open, onOpenChange, platform, onVerified }) {
  const [step, setStep] = useState("input");
  const [channelInput, setChannelInput] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challengeKey, setChallengeKey] = useState("");
  const [code, setCode] = useState("");
  const [resolvedId, setResolvedId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep("input");
    setChannelInput("");
    setChallengeId("");
    setChallengeKey("");
    setCode("");
    setResolvedId("");
    setError("");
    setCopied(false);
    setLoading(false);
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  async function startLink() {
    setError("");
    const normalized = normalizeChannelInput(platform, channelInput);
    if (!normalized) {
      setError("Informe um nome ou URL de canal válido.");
      return;
    }

    setLoading(true);
    try {
      const result = await channelVerify.challenge(platform, normalized);
      setChallengeId(result.challengeId || "");
      setChallengeKey(result.challengeKey || "");
      setCode(result.verificationCode || "");
      setResolvedId(result.channelIdentifier || normalized);
      setStep("pending");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function reemit() {
    setError("");
    setLoading(true);
    try {
      let result;
      if (challengeKey) {
        try {
          result = await channelVerify.reemit(challengeKey);
        } catch {
          result = await channelVerify.challenge(platform, resolvedId || channelInput);
        }
      } else {
        result = await channelVerify.challenge(platform, resolvedId || channelInput);
      }
      setChallengeId(result.challengeId || "");
      setChallengeKey(result.challengeKey || "");
      setCode(result.verificationCode || "");
      setResolvedId(result.channelIdentifier || resolvedId);
      setStep("pending");
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar outro código.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  async function validate() {
    setError("");
    setStep("verifying");
    setLoading(true);
    try {
      let activeChallengeId = challengeId;
      let activeChallengeKey = challengeKey;
      let activeCode = code;

      if (!activeChallengeId) {
        const challenge = await channelVerify.challenge(platform, resolvedId || channelInput);
        activeChallengeId = challenge.challengeId;
        activeChallengeKey = challenge.challengeKey;
        activeCode = challenge.verificationCode;
        setChallengeId(activeChallengeId || "");
        setChallengeKey(activeChallengeKey || "");
        setCode(activeCode || "");
        setResolvedId(challenge.channelIdentifier || resolvedId);
      }
      if (!activeChallengeId) {
        throw new Error("Não foi possível iniciar a validação. Gere um novo código.");
      }

      const result = await channelVerify.verify(platform, activeChallengeId);
      onVerified?.({
        platform,
        channelIdentifier: result.channelIdentifier || resolvedId,
        channelUrl: result.channelUrl || channelUrl(platform, result.channelIdentifier || resolvedId),
        verifiedAt: result.verifiedAt || Date.now(),
        verificationProof: result.verificationProof,
        challengeKey: result.challengeKey || activeChallengeKey,
        status: "verified",
      });
      setStep("verified");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar o canal.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
    }
  }

  if (!open) return null;
  const steps = tutorials[platform] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="channel-link-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="channel-link-title" className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck size={18} className="text-violet-300" />
              Vincular canal — {platform}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Confirme a propriedade publicando um código temporário na bio.</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </header>

        {step === "input" && (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void startLink(); }}>
            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-200">Nome ou URL do canal</span>
              <input
                value={channelInput}
                onChange={(event) => setChannelInput(event.target.value)}
                placeholder={placeholderFor(platform)}
                autoFocus
                maxLength={300}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/60"
              />
              <span className="block text-[11px] text-slate-500">{hintFor(platform)}</span>
            </label>
            {error && <p role="alert" className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-200"><AlertCircle size={15} className="shrink-0" />{error}</p>}
            <button type="submit" disabled={loading || !channelInput.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Gerando código…" : "Gerar código de vinculação"}
            </button>
          </form>
        )}

        {(step === "pending" || step === "verifying" || step === "error" || step === "verified") && (
          <div className="space-y-4">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Código Live Nexus</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-black/50 px-3 py-2.5 font-mono text-lg font-bold tracking-wider">{code}</code>
                <button type="button" onClick={() => void copyCode()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              {resolvedId && <p className="mt-2 text-[11px] text-slate-400">Canal: <span className="text-white">{resolvedId}</span></p>}
            </div>

            {step !== "verified" && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-2 text-xs font-semibold text-white">Como vincular</h3>
                <ol className="space-y-1.5 text-xs text-slate-300">
                  {steps.map((item, index) => <li key={item} className="flex gap-2"><span className="text-slate-500">{index + 1}.</span><span>{item}</span></li>)}
                </ol>
                <p className="mt-3 text-[11px] text-slate-400">Depois da confirmação, você pode remover o código da bio.</p>
                {resolvedId && channelUrl(platform, resolvedId) && (
                  <a href={channelUrl(platform, resolvedId)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:underline">
                    <ExternalLink size={13} /> Abrir canal
                  </a>
                )}
              </div>
            )}

            {error && <p role="alert" className="flex gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200"><AlertCircle size={15} className="shrink-0" />{error}</p>}

            {step === "verified" ? (
              <div className="space-y-3">
                <p role="status" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-200">
                  <ShieldCheck size={17} /> Canal verificado e salvo no JSON.
                </p>
                <button type="button" onClick={close} className="w-full rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-semibold hover:bg-violet-400">Concluído</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => void validate()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-semibold hover:bg-violet-400 disabled:opacity-50">
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? "Validando…" : "Validar canal"}
                </button>
                <button type="button" onClick={() => void reemit()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50">
                  <RefreshCw size={14} /> Novo código
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
