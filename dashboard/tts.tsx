import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Clock3, Play, Pause, RotateCcw, SkipForward, Square, Star, Volume2 } from "lucide-react";
import "./css/tts.css";
import { playProcessedSpeech, type PlaybackHandle } from "./ttsAudioEngine";
import { subscribeTtsMessages } from "./multichat";

type VoiceEffect = "normal" | "squirrel" | "monster" | "robot" | "radio" | "megaphone" | "alien" | "giant" | "ghost";
type TtsSettings = {
  voice: string; rate: number; volume: number; pitch: number; delay: number; maxChars: number; speakInterval: number;
  effect: VoiceEffect; intensity: number;
};
const VOICE_EFFECTS: { id: VoiceEffect; label: string; description: string; rate: number; pitch: number }[] = [
  { id: "normal", label: "Normal", description: "Voz original", rate: 1, pitch: 1 },
  { id: "squirrel", label: "Esquilo", description: "Aguda e acelerada", rate: 1.25, pitch: 1.85 },
  { id: "monster", label: "Monstro", description: "Grave e lenta", rate: 0.78, pitch: 0.48 },
  { id: "robot", label: "Robô", description: "Tom sintético", rate: 0.92, pitch: 0.72 },
  { id: "radio", label: "Rádio", description: "Voz de transmissão", rate: 0.98, pitch: 0.92 },
  { id: "megaphone", label: "Megafone", description: "Voz projetada", rate: 1, pitch: 0.9 },
  { id: "alien", label: "Alienígena", description: "Tom estranho e oscilante", rate: 1.08, pitch: 1.55 },
  { id: "giant", label: "Gigante", description: "Muito grave e pesada", rate: 0.68, pitch: 0.3 },
  { id: "ghost", label: "Fantasma", description: "Voz lenta e etérea", rate: 0.82, pitch: 1.3 },
];
const STORAGE_KEY = "livenexus:tts-settings-v1";
const DEFAULTS: TtsSettings = { voice: "pt_BR-faber-medium", rate: 1, volume: 1, pitch: 1, delay: 0, maxChars: 200, speakInterval: 0, effect: "normal", intensity: 1 };
const SAMPLES = ["Olá, seja bem-vindo à live!", "Obrigado pela mensagem e por acompanhar a transmissão.", "Atenção, mensagem importante no chat."];

type QueueItem = { id: number; text: string; author: string; tier: "broadcaster" | "moderator" | "vip" | "subscriber" | "normal"; queuedAt: number };
const PRIORITY: Record<QueueItem["tier"], number> = { broadcaster: 1, moderator: 2, vip: 3, subscriber: 3, normal: 4 };
const TTL: Record<QueueItem["tier"], number> = { broadcaster: 120000, moderator: 90000, vip: 45000, subscriber: 45000, normal: 30000 };

function loadSettings(): TtsSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULTS, ...saved, voice: saved.voice || DEFAULTS.voice };
  } catch { return DEFAULTS; }
}

export default function TTSPage() {
  const [settings, setSettings] = useState<TtsSettings>(loadSettings);
  const [engineReady, setEngineReady] = useState(false);
  const [testText, setTestText] = useState(SAMPLES[0]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [notice, setNotice] = useState("O modelo da voz selecionada será carregado na primeira reprodução.");
  const [preset, setPreset] = useState("padrao");
  const [autoReadChat, setAutoReadChat] = useState(true);
  const queueRef = useRef<QueueItem[]>([]);
  const activeRef = useRef<PlaybackHandle | null>(null);
  const playTokenRef = useRef(0);
  const idRef = useRef(0);
  const selectionCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const settingsRef = useRef(settings);
  const autoReadChatRef = useRef(autoReadChat);
  settingsRef.current = settings;
  autoReadChatRef.current = autoReadChat;
  queueRef.current = queue;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      playTokenRef.current += 1;
      activeRef.current?.stop();
    };
  }, []);

  useEffect(() => subscribeTtsMessages((message) => {
    if (!autoReadChatRef.current) return;
    const text = `${message.platform}: ${message.author}: ${message.text}`.trim().slice(0, settingsRef.current.maxChars > 0 ? settingsRef.current.maxChars : 1000);
    if (!text) return;
    const roles = message.roles.map((role) => role.toLowerCase());
    const tier: QueueItem["tier"] = roles.includes("broadcaster") ? "broadcaster"
      : roles.includes("moderator") ? "moderator"
      : roles.includes("vip") ? "vip"
      : roles.includes("subscriber") ? "subscriber" : "normal";
    const item: QueueItem = { id: ++idRef.current, text, author: `${message.author} · ${message.platform}`, tier, queuedAt: Date.now() };
    setQueue((old) => {
      const next = [...old, item];
      if (next.length > 200) {
        const discardIndex = next.findIndex((entry) => entry.tier === "normal");
        if (discardIndex >= 0) next.splice(discardIndex, 1);
        else next.shift();
      }
      queueRef.current = next;
      return next;
    });
    setNotice(`Mensagem recebida do ${message.platform}; adicionada à fila de leitura.`);
  }), []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {} }, [settings]);

  const queueByPriority = useMemo(() => {
    const now = Date.now();
    return queue.map((item) => ({ ...item, expired: now - item.queuedAt > TTL[item.tier] }));
  }, [queue]);

  function update<K extends keyof TtsSettings>(key: K, value: TtsSettings[K]) {
    setSettings((old) => ({ ...old, [key]: value }));
  }

  async function startPlayback(text: string, onFinished: () => void) {
    const token = ++playTokenRef.current;
    let cancelled = false;
    const placeholder: PlaybackHandle = {
      stop: () => { cancelled = true; },
      pause: () => {},
      resume: () => {},
    };
    activeRef.current = placeholder;
    try {
      const handle = await playProcessedSpeech(text, { ...settingsRef.current, voice: settingsRef.current.voice }, {
        onProgress: (message) => setNotice(message),
        onStart: () => {
          if (token !== playTokenRef.current || cancelled) return;
          setSpeaking(true);
          setCurrentText(text);
          setEngineReady(true);
          setNotice("Reproduzindo áudio com efeitos DSP.");
        },
        onEnd: () => {
          if (token !== playTokenRef.current) return;
          activeRef.current = null;
          setSpeaking(false);
          setCurrentText("");
          onFinished();
        },
        onError: (error) => {
          if (token !== playTokenRef.current) return;
          setNotice(`Falha no motor TTS: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        },
      });
      if (cancelled || token !== playTokenRef.current) {
        handle.stop();
        return;
      }
      activeRef.current = handle;
    } catch (error) {
      if (token === playTokenRef.current) {
        activeRef.current = null;
        setSpeaking(false);
        setCurrentText("");
        setNotice(`Não foi possível iniciar o TTS: ${error instanceof Error ? error.message : "verifique a conexão e tente novamente"}`);
      }
    }
  }

  function speakTest() {
    const text = testText.trim().slice(0, settings.maxChars > 0 ? settings.maxChars : undefined);
    if (!text) { setNotice("Digite um texto para testar."); return; }
    stopSpeech();
    void startPlayback(text, () => setNotice("Teste finalizado."));
  }

  function stopSpeech() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    playTokenRef.current += 1;
    activeRef.current?.stop();
    activeRef.current = null;
    setSpeaking(false); setPaused(false); pausedRef.current = false; setCurrentText("");
  }

  function dispatch() {
    if (pausedRef.current || activeRef.current || timerRef.current) return;
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
    if (!selected) return;
    setQueue((old) => old.filter((item) => item.id !== selected.id));
    queueRef.current = queueRef.current.filter((item) => item.id !== selected.id);
    void startPlayback(selected.text, () => {
      const delay = Math.max(settingsRef.current.delay, settingsRef.current.speakInterval);
      if (delay > 0) timerRef.current = setTimeout(() => { timerRef.current = null; dispatch(); }, delay * 1000);
      else setTimeout(dispatch, 0);
    });
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
      activeRef.current?.resume();
      setNotice("Fila retomada.");
    } else {
      pausedRef.current = true; setPaused(true);
      activeRef.current?.pause();
      setNotice("Fila pausada.");
    }
  }

  function skipCurrent() {
    const active = activeRef.current;
    if (!active) { setNotice("Não há fala ativa para pular."); return; }
    playTokenRef.current += 1;
    active.stop();
    activeRef.current = null;
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
            <label>Voz neural
              <select value={settings.voice} onChange={(e) => update("voice", e.target.value)}>
                <option value="pt_BR-dii">Dii · Feminina · Português brasileiro (Piper)</option>
                <option value="pt_BR-faber-medium">Faber · Masculina · Português brasileiro (Piper)</option>
                <option value="pt_BR-edresson-low">Edresson · Masculina · Português brasileiro (Piper · leve)</option>
                <option value="pt_BR-cadu-medium">Cadu · Masculina · Português brasileiro (Piper)</option>
                <option value="pt_BR-jeff-medium">Jeff · Masculina · Português brasileiro (Piper)</option>
              </select>
              <small className="tts-engine-caption">{engineReady ? "Motor neural carregado nesta sessão; ao trocar de voz, o novo modelo será carregado sob demanda." : "A voz selecionada será baixada na primeira reprodução e ficará em cache. Modelos alternativos podem ter cerca de 60 MB."}</small>
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
        <div className="tts-card-title"><span className="tts-title-icon amber"><Star /></span><div><h2>Efeitos de voz do TTS</h2><p>Selecione um personagem e ajuste a intensidade</p></div></div>
        <div className="tts-voice-effects">
          {VOICE_EFFECTS.map((effect) => <button key={effect.id} className={settings.effect === effect.id ? "selected" : ""} onClick={() => update("effect", effect.id)}><strong>{effect.label}</strong><small>{effect.description}</small></button>)}
        </div>
        <div className="tts-effect-intensity"><RangeControl label="Intensidade do efeito" value={settings.intensity} min={0} max={1.5} step={0.05} suffix="x" display={`${Math.round(settings.intensity * 100)}%`} onChange={(v) => update("intensity", v)} /></div>
        <p className="tts-effect-note">Os efeitos são aplicados ao áudio gerado pelo motor neural: filtros de frequência, modulação, compressão, saturação, delay e reverberação. Esquilo, Monstro e Gigante também combinam mudança de velocidade com equalização; não é um algoritmo de pitch-shift independente da velocidade.</p>
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
        <div className="tts-card-title"><span className="tts-title-icon"><AudioLines /></span><div><h2>Fila geral de leitura</h2><p>Mensagens recebidas pelo multichat e testes manuais, ordenadas por prioridade</p></div></div>
        <div className="tts-queue-toolbar">
          <span className="tts-notice">{notice}</span>
          <div><button className={autoReadChat ? "selected" : ""} onClick={() => { setAutoReadChat((enabled) => !enabled); setNotice(autoReadChat ? "Leitura automática do multichat desativada." : "Leitura automática do multichat ativada."); }}><Volume2 size={14} />{autoReadChat ? "Leitura automática ligada" : "Leitura automática desligada"}</button><button onClick={toggleQueue}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Retomar fila" : "Pausar fila"}</button><button onClick={skipCurrent}><SkipForward size={14} /> Pular</button><button onClick={clearQueue}><RotateCcw size={14} /> Limpar</button></div>
        </div>
        <div className="tts-now-speaking"><span className={speaking ? "tts-pulse on" : "tts-pulse"} /> <div><small>FALA ATUAL</small><strong>{currentText || "Nenhuma fala em reprodução"}</strong></div></div>
        <div className="tts-queue-add">
          <span>Adicionar teste à fila com prioridade:</span>
          <button onClick={() => addDemoMessage("broadcaster")}>Transmissor</button><button onClick={() => addDemoMessage("moderator")}>Moderador</button><button onClick={() => addDemoMessage("vip")}>VIP</button><button onClick={() => addDemoMessage("normal")}>Normal</button>
        </div>
        <div className="tts-queue-list">
          {queueByPriority.length ? queueByPriority.map((item) => <article key={item.id}><span className={"tts-tier " + item.tier}>{item.tier}</span><strong>{item.author}</strong><p>{item.text}</p><small>{item.expired ? "Expirada — será removida" : "Aguardando"}</small></article>) : <div className="tts-empty">A fila está vazia. Conecte uma plataforma no Chat ao vivo ou adicione uma mensagem de teste.</div>}
        </div>
      </section>
    </section>
  );
}

function RangeControl({ label, value, min, max, step, suffix, display, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; display?: string | number; onChange: (value: number) => void }) {
  const shown = display ?? (Number.isInteger(value) ? value : value.toFixed(2));
  return <label className="tts-range"><span>{label}</span><strong>{shown}{suffix}</strong><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /><small>{min} <span>{max}{suffix}</span></small></label>;
}
