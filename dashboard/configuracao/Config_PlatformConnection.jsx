import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, Loader2, RadioTower, Trash2 } from "lucide-react";
import { channelVerify } from "./Config_channelVerify";
import ChannelLinkDialog from "./Config_ChannelLinkDialog";

const STYLE = {
  Twitch: "border-violet-400/25 bg-violet-500/10 text-violet-200",
  Kick: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  YouTube: "border-red-400/25 bg-red-500/10 text-red-200",
};

export default function PlatformConnection({ platform }) {
  const [connection, setConnection] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const result = await channelVerify.connections();
      const current = (result.connections || []).find((item) => item.platform === platform);
      setConnection(current || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o vínculo salvo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    channelVerify.connections()
      .then((result) => {
        if (!active) return;
        const current = (result.connections || []).find((item) => item.platform === platform);
        setConnection(current || null);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o vínculo salvo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [platform]);

  async function removeConnection() {
    if (!connection?.verificationProof) {
      setConnection(null);
      return;
    }
    if (!window.confirm("Remover o vínculo verificado da " + platform + "?")) return;

    setWorking(true);
    setError("");
    try {
      await channelVerify.revoke(connection.verificationProof, connection.challengeKey);
      setConnection(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover o vínculo.");
    } finally {
      setWorking(false);
    }
  }

  function handleVerified(data) {
    setConnection({
      ...data,
      platform,
      status: "verified",
    });
    setLinkOpen(false);
    setError("");
  }

  const linked = connection?.status === "verified";

  return (
    <article className="min-w-0 space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl border " + (STYLE[platform] || STYLE.Twitch)}>
            <RadioTower size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{platform}</h3>
            <p className="text-[11px] text-slate-400">
              {loading ? "Carregando vínculo…" : linked ? "Canal verificado" : "Canal não vinculado"}
            </p>
          </div>
        </div>
        {loading ? <Loader2 size={16} className="animate-spin text-slate-500" /> : linked ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Link2 size={17} className="text-slate-500" />}
      </header>

      {linked && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
          <p className="break-words text-xs font-medium text-emerald-100">{connection.channelIdentifier}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Verificado em {connection.verifiedAt ? new Date(connection.verifiedAt).toLocaleString("pt-BR") : "data não informada"}
          </p>
          {connection.channelUrl && <a href={connection.channelUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-violet-300 hover:underline">Abrir canal</a>}
        </div>
      )}

      {error && <p role="alert" className="flex items-start gap-2 text-xs text-red-300"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setLinkOpen(true)} disabled={working || loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50">
          <Link2 size={14} /> {linked ? "Vincular outro canal" : "Vincular canal"}
        </button>
        {linked && (
          <button type="button" onClick={() => void removeConnection()} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50">
            {working ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remover
          </button>
        )}
        {!loading && error && !linked && (
          <button type="button" onClick={() => { setLoading(true); void refresh(); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Tentar novamente</button>
        )}
      </div>

      <ChannelLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        platform={platform}
        onVerified={handleVerified}
      />
    </article>
  );
}
