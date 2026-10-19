import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Clock3, Play, Pause, RotateCcw, SkipForward, Square, Star, Volume2 } from "lucide-react";
import "./css/tts.css";

type TtsSettings = {
  voice: string; rate: number; volume: number; pitch: number; delay: number; maxChars: number; speakInterval: number;
};
const STORAGE_KEY = "livenexus:tts-settings-v1";
const DEFAULTS: TtsSettings = { voice: "", rate: 1, volume: 1, pitch: 1, delay: 0, maxChars: 200, speakInterval: 0 };
const SAMPLES = ["Olá, seja bem-vindo à live!", "Obrigado pela mensagem e por acompanhar a transmissão.", "Atenção, mensagem importante no chat."];

type QueueItem = { id: number; text: string; author: string; tier: "broadcaster" | "moderator" | "vip" | "subscriber" | "normal"; queuedAt: number };
const PRIORITY: Record<QueueItem["tier"], number> = { broadcaster: 1, moderator: 2, vip: 3, subscriber: 3, normal: 4 };
const TTL: Record<QueueItem["tier"], number> = { broadcaster: 120000, moderator: 90000, vip: 45000, subscriber: 45000, normal: 30000 };

function loadSettings(): TtsSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULTS, ...saved };
  } catch { return DEFAULTS; }
}

export default function TTSPage() {
  const [settings, setSettings] = useState<TtsSettings>(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testText, setTestText] = useState(SAMPLES[0]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [notice, setNotice] = useState("Motor local do navegador pronto.");
  const [preset, setPreset] = useState("padrao");
  const queueRef = useRef<QueueItem[]>([]);
  const activeRef = useRef<SpeechSynthesisUtterance | null>(null);
  const idRef = useRef(0);
  const selectionCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  queueRef.current = queue;

  useEffect(() => {
    if (!("speechSynthesis" in window)) { setNotice("Este navegador não oferece suporte a síntese de voz."); return; }
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(synth.getVoices());
    refresh();
    synth.addEventListener?.("voiceschanged", refresh);
    return () => { synth.removeEventListener?.("voiceschanged", refresh); if (timerRef.current) clearTimeout(timerRef.current); synth.cancel(); };
  }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {} }, [settings]);

  const queueByPriority = useMemo(() => {
    const now = Date.now();
    return queue.map((item) => ({ ...item, expired: now - item.queuedAt > TTL[item.tier] }));
  }, [queue]);

  function update<K extends keyof TtsSettings>(key: K, value: TtsSettings[K]) {
    setSettings((old) => ({ ...old, [key]: value }));
  }

  function makeUtterance(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    const s = settingsRef.current;
    const voice = voices.find((v) => v.name === s.voice);
    if (voice) u.voice = voice;
    u.rate = s.rate; u.volume = s.volume; u.pitch = s.pitch;
    return u;
  }

  function speakTest() {
    if (!("speechSynthesis" in window)) { setNotice("Síntese de voz indisponível neste navegador."); return; }
    const text = testText.trim().slice(0, settings.maxChars > 0 ? settings.maxChars : undefined);
    if (!text) { setNotice("Digite um texto para testar."); return; }
    window.speechSynthesis.cancel();
    const u = makeUtterance(text);
    u.onstart = () => { setSpeaking(true); setCurrentText(text); setNotice("Reproduzindo teste de voz."); };
    u.onend = u.onerror = () => { setSpeaking(false); setCurrentText(""); setNotice("Teste finalizado."); };
    activeRef.current = u;
    window.speechSynthesis.speak(u);
  }

  function stopSpeech() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    window.speechSynthesis?.cancel();
    activeRef.current = null;
    setSpeaking(false); setPaused(false); pausedRef.current = false; setCurrentText("");
  }

  function dispatch() {
    if (pausedRef.current || activeRef.current || timerRef.current || !("speechSynthesis" in window)) return;
    const now = Date.now();
    const valid = queueRef.current.filter((item) => now - item.queuedAt <= TTL[item.tier]);
    if (valid.length !== queueRef.current.length) { setQueue(valid); queueRef.current = valid; }
    if (!valid.length) { setSpeaking(false); setCurrentText(""); return; }
    selectionCountRef.current += 1;
    const normalItems = valid.filter((item) => item.tier === "normal");
    const fairnessSlot = selectionCountRef.current % 5 === 0 && normalItems.length > 0;
    const agedNormal = normalItems.find((item) => now - item.queuedAt >= 20000);
    const hasPrivileged = valid.some((item) => PRIORITY[item.tier] < 4);
    const selected = fairnessSlot
      ? normalItems[0]
      : (!hasPrivileged && agedNormal
          ? agedNormal
          : valid.slice().sort((a, b) => PRIORITY[a.tier] - PRIORITY[b.tier] || a.queuedAt - b.queuedAt)[0]);
    setQueue((old) => old.filter((item) => item.id !== selected.id));
    queueRef.current = queueRef.current.filter((item) => item.id !== selected.id);
    const u = makeUtterance(selected.text);
    activeRef.current = u;
    u.onstart = () => { setSpeaking(true); setCurrentText(selected.text); };
    const finish = () => {
      if (activeRef.current !== u) return;
      activeRef.current = null; setSpeaking(false); setCurrentText("");
      const delay = Math.max(settingsRef.current.delay, settingsRef.current.speakInterval);
      if (delay > 0) timerRef.current = setTimeout(() => { timerRef.current = null; dispatch(); }, delay * 1000);
      else setTimeout(dispatch, 0);
    };
    u.onend = finish; u.onerror = finish;
    window.speechSynthesis.speak(u);
  }

  useEffect(() => { if (!paused && !activeRef.current && queue.length) dispatch(); }, [queue, paused]);

  function addDemoMessage(tier: QueueItem["tier"] = "normal") {
    const text = testText.trim().slice(0, settings.maxChars > 0 ? settings.maxChars : undefined);
    if (!text) { setNotice("Digite o texto de teste antes de adicionar à fila."); return; }
    const item = { id: ++idRef.current, text, author: tier === "normal" ? "Teste" : tier, tier, queuedAt: Date.now() } satisfies QueueItem;
    setQueue((old) => {
      let next = [...old, item];
      if (next.length > 200) {
        const discardIndex = next.findIndex((entry) => entry.tier === "normal");
        const fallbackIndex = next.findIndex((entry) => entry.tier === "vip" || entry.tier === "subscriber");
        const index = discardIndex >= 0 ? discardIndex : fallbackIndex >= 0 ? fallbackIndex : next.findIndex((entry) => entry.tier !== "broadcaster" && entry.tier !== "moderator");
        if (index >= 0) next.splice(index, 1);
      }
      queueRef.current = next;
      return next;
    });
    setNotice("Mensagem de teste adicionada à fila.");
  }

  function toggleQueue() {
    if (paused) {
      pausedRef.current = false; setPaused(false);
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
      setNotice("Fila retomada.");
    } else {
      pausedRef.current = true; setPaused(true);
      if (window.speechSynthesis?.speaking) window.speechSynthesis.pause();
      setNotice("Fila pausada.");
    }
  }

  function skipCurrent() {
    const active = activeRef.current;
    if (!active) { setNotice("Não há fala ativa para pular."); return; }
    activeRef.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false); setCurrentText("");
    setNotice("Fala atual pulada.");
    setTimeout(() => { if (!pausedRef.current) dispatch(); }, 0);
  }

  function clearQueue() {
    stopSpeech(); setQueue([]); queueRef.current = [];
    setNotice("Fila e fala atual limpas.");
  }

  function applyPreset(id: string, values: Partial<TtsSettings>) {
    setPreset(id); setSettings((old) => ({ ...old, ...values }));
  }

  return (
    <section className="tts-page">
      <header className="tts-page-heading">
        <div><p className="tts-eyebrow">CENTRAL DE TRANSMISSÃO</p><h1>Voz &amp; TTS</h1><p>Motor de voz local do navegador · sem créditos de API</p></div>
        <span className={speaking ? "tts-status active" : "tts-status"}>{speaking ? "Falando" : paused ? "Fila pausada" : "Pronto"}</span>
      </header>

      <section className="tts-card">
        <div className="tts-card-title"><span className="tts-title-icon"><Volume2 /></span><div><h2>Configurações do motor de voz</h2><p>Escolha a voz e ajuste os parâmetros de leitura</p></div></div>
        <div className="tts-main-grid">
          <div className="tts-input-column">
            <label>Voz do navegador
              <select value={settings.voice} onChange={(e) => update("voice", e.target.value)}>
                <option value="">Padrão do navegador</option>
                {voices.map((v) => <option key={v.name} value={v.name}>{v.lang.toLowerCase().includes("pt") ? "PT · " : ""}{v.name} · {v.lang}</option>)}
              </select>
            </label>
            <label>Texto de teste <span className="tts-char-count">{testText.length} / {settings.maxChars || "sem limite"}</span>
              <textarea rows={4} value={testText} onChange={(e) => setTestText(e.target.value)} maxLength={settings.maxChars > 0 ? settings.maxChars : undefined} placeholder="Digite um texto para testar a voz..." />
            </label>
            <div><span className="tts-label">Amostras rápidas</span><div className="tts-samples">{SAMPLES.map((s) => <button key={s} onClick={() => setTestText(s)}>{s.length > 26 ? s.slice(0, 26) + "…" : s}</button>)}</div></div>
            <div className="tts-actions">
              <button className="primary" onClick={speakTest} disabled={speaking}> <Play size={15} /> Reproduzir teste</button>
              <button onClick={stopSpeech}><Square size={14} /> Parar</button>
              <button onClick={() => { setSettings(DEFAULTS); setPreset("padrao"); stopSpeech(); }}><RotateCcw size={14} /> Padrão</button>
            </div>
          </div>
          <div className="tts-faders">
            <RangeControl label="Velocidade" value={settings.rate} min={0.2} max={3} step={0.05} suffix="x" onChange={(v) => update("rate", v)} />
            <RangeControl label="Volume" value={settings.volume} min={0} max={1} step={0.01} suffix="%" display={Math.round(settings.volume * 100)} onChange={(v) => update("volume", v)} />
            <RangeControl label="Tom" value={settings.pitch} min={0.1} max={2} step={0.05} suffix="" onChange={(v) => update("pitch", v)} />
            <RangeControl label="Delay" value={settings.delay} min={0} max={5} step={0.1} suffix="s" onChange={(v) => update("delay", v)} />
            <RangeControl label="Limite de caracteres" value={settings.maxChars} min={0} max={500} step={5} suffix="" display={settings.maxChars === 0 ? "Ilimitado" : settings.maxChars} onChange={(v) => update("maxChars", v)} />
            <RangeControl label="Intervalo" value={settings.speakInterval} min={0} max={5} step={0.1} suffix="s" onChange={(v) => update("speakInterval", v)} />
          </div>
        </div>
      </section>

      <section className="tts-card">
        <div className="tts-card-title"><span className="tts-title-icon amber"><Star /></span><div><h2>Presets de voz</h2><p>Combinações rápidas de velocidade, tom e volume</p></div></div>
        <div className="tts-presets">
          <button className={preset === "padrao" ? "selected" : ""} onClick={() => applyPreset("padrao", DEFAULTS)}>Padrão <small>1.00x · tom 1.00 · 100%</small></button>
          <button className={preset === "narrador" ? "selected" : ""} onClick={() => applyPreset("narrador", { rate: 0.9, pitch: 0.85, volume: 1 })}>Narrador <small>0.90x · tom 0.85 · 100%</small></button>
          <button className={preset === "rapido" ? "selected" : ""} onClick={() => applyPreset("rapido", { rate: 1.45, pitch: 1.05, volume: 1 })}>Rápido <small>1.45x · tom 1.05 · 100%</small></button>
          <button className={preset === "agudo" ? "selected" : ""} onClick={() => applyPreset("agudo", { rate: 1.1, pitch: 1.6, volume: 1 })}>Agudo <small>1.10x · tom 1.60 · 100%</small></button>
          <button className={preset === "grave" ? "selected" : ""} onClick={() => applyPreset("grave", { rate: 0.85, pitch: 0.55, volume: 1 })}>Grave <small>0.85x · tom 0.55 · 100%</small></button>
        </div>
      </section>

      <section className="tts-card">
        <div className="tts-card-title"><span className="tts-title-icon"><AudioLines /></span><div><h2>Fila geral de leitura</h2><p>Fila local de demonstração; ainda sem mensagens das plataformas conectadas</p></div></div>
        <div className="tts-queue-toolbar">
          <span className="tts-notice">{notice}</span>
          <div><button onClick={toggleQueue}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Retomar fila" : "Pausar fila"}</button><button onClick={skipCurrent}><SkipForward size={14} /> Pular</button><button onClick={clearQueue}><RotateCcw size={14} /> Limpar</button></div>
        </div>
        <div className="tts-now-speaking"><span className={speaking ? "tts-pulse on" : "tts-pulse"} /> <div><small>FALA ATUAL</small><strong>{currentText || "Nenhuma fala em reprodução"}</strong></div></div>
        <div className="tts-queue-add">
          <span>Adicionar teste à fila com prioridade:</span>
          <button onClick={() => addDemoMessage("broadcaster")}>Transmissor</button><button onClick={() => addDemoMessage("moderator")}>Moderador</button><button onClick={() => addDemoMessage("vip")}>VIP</button><button onClick={() => addDemoMessage("normal")}>Normal</button>
        </div>
        <div className="tts-queue-list">
          {queueByPriority.length ? queueByPriority.map((item) => <article key={item.id}><span className={"tts-tier " + item.tier}>{item.tier}</span><strong>{item.author}</strong><p>{item.text}</p><small>{item.expired ? "Expirada — será removida" : "Aguardando"}</small></article>) : <div className="tts-empty">A fila está vazia. Use “Adicionar teste à fila” para validar as prioridades.</div>}
        </div>
      </section>
    </section>
  );
}

function RangeControl({ label, value, min, max, step, suffix, display, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; display?: string | number; onChange: (value: number) => void }) {
  const shown = display ?? (Number.isInteger(value) ? value : value.toFixed(2));
  return <label className="tts-range"><span>{label}</span><strong>{shown}{suffix}</strong><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /><small>{min} <span>{max}{suffix}</span></small></label>;
}
