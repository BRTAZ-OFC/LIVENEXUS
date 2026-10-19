import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Filter, Plus, Trash2, RotateCcw } from "lucide-react";
import type { MultiChatMessage, ChatPlatform } from "./multichat";

type MatchType = "exact" | "contains" | "starts" | "ends" | "regex";
type RuleSet = {
  roles: Record<string, boolean>;
  events: Record<string, boolean>;
  content: { messages: boolean; links: boolean; mentions: boolean; commands: boolean };
  links: "allow" | "block" | "remove";
  emotes: "allow" | "remove" | "block_only" | "block_over";
  emoteLimit: number;
  repeatEnabled: boolean;
  repeatMax: number;
  repeatWindowSec: number;
  cooldownEnabled: boolean;
  cooldownSec: number;
  maxChars: number;
  longMessage: "allow" | "block" | "cut";
  bannedWords: string[];
  triggersEnabled: boolean;
  triggers: { id: string; value: string; matchType: MatchType }[];
  queueLimitEnabled: boolean;
  queueMax: number;
  queuePolicy: "reject" | "drop_oldest" | "preserve_priority";
  priorityEnabled: boolean;
  priorities: Record<string, number>;
};
export type TtsFilterConfig = {
  mode: "free" | "custom";
  scope: "shared" | "perPlatform";
  shared: RuleSet;
  perPlatform: Record<ChatPlatform, RuleSet>;
};
type Diagnostic = { id: string; time: number; platform: ChatPlatform; author: string; decision: "ACEITA" | "BLOQUEADA"; reason: string; text: string };
type DiagnosticState = { received: number; accepted: number; blocked: number; dropped: number; reasons: Record<string, number>; events: Diagnostic[] };

const STORAGE_KEY = "livenexus:tts-filters-v1";
const EVENT_KEYS = [
  "twitch_sub", "twitch_resub", "twitch_subgift", "twitch_bits", "twitch_raid", "twitch_announcement",
  "kick_sub", "kick_gift", "kick_raid", "youtube_membership", "youtube_superchat",
  "youtube_supersticker", "youtube_membership_gifting", "youtube_gift_membership_received", "youtube_poll",
];
function defaultRules(): RuleSet {
  return {
    roles: { broadcaster: true, moderator: true, vip: true, subscriber: true, normal: true },
    events: Object.fromEntries(EVENT_KEYS.map((key) => [key, true])),
    content: { messages: true, links: true, mentions: true, commands: true },
    links: "allow", emotes: "allow", emoteLimit: 5,
    repeatEnabled: false, repeatMax: 3, repeatWindowSec: 60,
    cooldownEnabled: false, cooldownSec: 5,
    maxChars: 200, longMessage: "allow",
    bannedWords: [], triggersEnabled: false, triggers: [],
    queueLimitEnabled: false, queueMax: 10, queuePolicy: "reject",
    priorityEnabled: false, priorities: { broadcaster: 5, moderator: 4, vip: 3, subscriber: 2, normal: 1 },
  };
}
function defaultConfig(): TtsFilterConfig {
  return { mode: "free", scope: "shared", shared: defaultRules(), perPlatform: { Twitch: defaultRules(), Kick: defaultRules(), YouTube: defaultRules() } };
}
function loadConfig(): TtsFilterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw);
    const merge = (value: Partial<RuleSet> | undefined): RuleSet => ({
      ...defaultRules(), ...(value || {}),
      roles: { ...defaultRules().roles, ...(value?.roles || {}) },
      events: { ...defaultRules().events, ...(value?.events || {}) },
      content: { ...defaultRules().content, ...(value?.content || {}) },
      priorities: { ...defaultRules().priorities, ...(value?.priorities || {}) },
      bannedWords: Array.isArray(value?.bannedWords) ? value.bannedWords.map(String) : [],
      triggers: Array.isArray(value?.triggers) ? value.triggers : [],
    });
    return {
      mode: parsed.mode === "custom" ? "custom" : "free",
      scope: parsed.scope === "perPlatform" ? "perPlatform" : "shared",
      shared: merge(parsed.shared),
      perPlatform: {
        Twitch: merge(parsed.perPlatform?.Twitch),
        Kick: merge(parsed.perPlatform?.Kick),
        YouTube: merge(parsed.perPlatform?.YouTube),
      },
    };
  } catch { return defaultConfig(); }
}
let config = loadConfig();
const configListeners = new Set<() => void>();
let diag: DiagnosticState = { received: 0, accepted: 0, blocked: 0, dropped: 0, reasons: {}, events: [] };
const diagListeners = new Set<() => void>();
const repeats = new Map<string, { text: string; count: number; firstAt: number }>();
const cooldowns = new Map<string, number>();
function loadFlaggedUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + ":flagged-users");
    const entries = raw ? JSON.parse(raw) : [];
    return new Map<string, { author: string; platform: ChatPlatform; reason: string; blocked: boolean }>(Array.isArray(entries) ? entries : []);
  } catch { return new Map<string, { author: string; platform: ChatPlatform; reason: string; blocked: boolean }>(); }
}
const flaggedUsers = loadFlaggedUsers();
function persistFlaggedUsers() {
  try { localStorage.setItem(STORAGE_KEY + ":flagged-users", JSON.stringify(Array.from(flaggedUsers.entries()))); } catch {}
}

function emitConfig() { configListeners.forEach((fn) => fn()); }
let diagRevision = 0;
function emitDiag() { diagRevision++; diagListeners.forEach((fn) => fn()); }
export function getTtsFilterConfig() { return config; }
export function setTtsFilterConfig(next: TtsFilterConfig) {
  config = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  emitConfig();
}
export function useTtsFilterConfig() { return useSyncExternalStore((fn) => { configListeners.add(fn); return () => configListeners.delete(fn); }, () => config); }
export function getTtsFilterDiagnostics() { return diag; }
export function useTtsFilterDiagnostics() { return useSyncExternalStore((fn) => { diagListeners.add(fn); return () => diagListeners.delete(fn); }, () => diagRevision); }
export function resetTtsFilterDiagnostics() {
  diag = { received: 0, accepted: 0, blocked: 0, dropped: 0, reasons: {}, events: [] };
  emitDiag();
}
function record(message: MultiChatMessage, allowed: boolean, reason: string, text: string) {
  diag.received++;
  if (allowed) diag.accepted++; else { diag.blocked++; diag.reasons[reason] = (diag.reasons[reason] || 0) + 1; }
  diag.events.unshift({ id: message.id, time: Date.now(), platform: message.platform, author: message.author, decision: allowed ? "ACEITA" : "BLOQUEADA", reason, text });
  if (diag.events.length > 100) diag.events.length = 100;
  emitDiag();
}
function roleOf(roles: string[] = []) {
  const normalized = roles.map((role) => role.toLowerCase().replace(/[^a-z]/g, ""));
  if (normalized.some((role) => ["broadcaster", "owner", "streamer"].includes(role))) return "broadcaster";
  if (normalized.some((role) => ["moderator", "mod"].includes(role))) return "moderator";
  if (normalized.includes("vip")) return "vip";
  if (normalized.some((role) => ["subscriber", "sub", "member"].includes(role))) return "subscriber";
  return "normal";
}
function matchesTrigger(text: string, trigger: RuleSet["triggers"][number]) {
  const source = text.toLowerCase().trim();
  const value = trigger.value.toLowerCase().trim();
  if (!value) return false;
  if (trigger.matchType === "exact") return source.split(/\s+/).includes(value) || source === value;
  if (trigger.matchType === "contains") return source.includes(value);
  if (trigger.matchType === "starts") return source.startsWith(value);
  if (trigger.matchType === "ends") return source.endsWith(value);
  try { return new RegExp(trigger.value, "i").test(text); } catch { return false; }
}
function removePlatformEmotes(text: string, platform: ChatPlatform, emotes: unknown) {
  const ranges: { start: number; end: number }[] = [];
  if (platform === "Twitch" && typeof emotes === "string") {
    for (const group of emotes.split("/")) {
      const parts = group.split(":");
      for (const position of (parts[1] || "").split(",")) {
        const start = Number(position.split("-")[0]);
        const end = Number(position.split("-")[1]);
        if (Number.isFinite(start) && Number.isFinite(end)) ranges.push({ start, end });
      }
    }
  } else if (platform === "Kick" && Array.isArray(emotes)) {
    for (const item of emotes as Array<Record<string, unknown>>) {
      if (Array.isArray(item?.positions)) {
        for (const position of item.positions as Array<Record<string, unknown>>) {
          const start = Number(position?.start), end = Number(position?.end);
          if (Number.isFinite(start) && Number.isFinite(end)) ranges.push({ start, end });
        }
      } else {
        const start = Number(item?.start), end = Number(item?.end);
        if (Number.isFinite(start) && Number.isFinite(end)) ranges.push({ start, end });
      }
    }
  }
  let result = text;
  if (ranges.length) {
    let cursor = 0;
    let output = "";
    for (const range of ranges.sort((a, b) => a.start - b.start)) {
      if (range.start < cursor || range.start < 0 || range.end >= text.length) continue;
      output += text.slice(cursor, range.start) + " ";
      cursor = range.end + 1;
    }
    result = output + text.slice(cursor);
  }
  if (platform === "YouTube") result = result.replace(/:[a-zA-Z0-9_]+:/g, " ");
  return result.replace(/\s+/g, " ").trim();
}
const URL_RE = /\bhttps?:\/\/\S+|www\.\S+/gi;
const URL_TEST = /\bhttps?:\/\/\S+|www\.\S+/i;
const MENTION_RE = /@[a-zA-Z0-9_.-]+/g;
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2190-\u21FF\u2B00-\u2BFF\uFE0F]/gu;
export function applyTtsFilters(message: MultiChatMessage): MultiChatMessage | null {
  if (config.mode === "free") { record(message, true, "Modo Livre", message.text); return message; }
  const rules = config.scope === "perPlatform" ? config.perPlatform[message.platform] : config.shared;
  const platform = message.platform;
  const author = message.author || "Anônimo";
  const role = roleOf(message.roles);
  const userKey = platform + ":" + author.toLowerCase();
  const fail = (reason: string): null => { record(message, false, reason, message.text); return null; };
  const manuallyBlocked = flaggedUsers.get(userKey);
  if (manuallyBlocked?.blocked) return fail("Usuário bloqueado manualmente");
  if (!rules.roles[role]) return fail("Cargo não permitido: " + role);
  if (message.eventType) {
    if (rules.events[message.eventType] === false) return fail("Evento desativado: " + message.eventType);
    record(message, true, "Evento permitido", message.text);
    return message;
  }
  if (!rules.content.messages) return fail("Mensagens comuns desativadas");
  let text = message.text;
  if (/^!\s*[a-z]/i.test(text.trim()) && !rules.content.commands) return fail("Comando bloqueado");
  if (URL_TEST.test(text)) {
    if (!rules.content.links || rules.links === "block") return fail("Link bloqueado");
    if (rules.links === "remove") text = text.replace(URL_RE, " ").replace(/\s+/g, " ").trim();
  }
  if (/@[a-zA-Z0-9_.-]+/.test(text)) {
    if (!rules.content.mentions) text = text.replace(MENTION_RE, " ").replace(/\s+/g, " ").trim();
  }
  if (!text.trim()) return fail("Mensagem vazia após filtros");
  if (rules.emotes !== "allow") {
    const withoutPlatformEmotes = removePlatformEmotes(text, platform, message.emotes);
    const matches = text.match(EMOJI_RE) || [];
    const platformEmoteCount = typeof message.emotes === "string"
      ? (message.emotes.match(/\d+:\d+-\d+/g) || []).length
      : Array.isArray(message.emotes) ? message.emotes.length : 0;
    if (rules.emotes === "block_only" && withoutPlatformEmotes.replace(EMOJI_RE, "").trim() === "") return fail("Mensagem contém apenas emotes/emojis");
    if (rules.emotes === "block_over" && matches.length + platformEmoteCount > rules.emoteLimit) return fail("Limite de emotes excedido");
    if (rules.emotes === "remove") text = withoutPlatformEmotes.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
  }
  if (rules.bannedWords.some((word) => word && text.toLowerCase().includes(word.toLowerCase()))) return fail("Palavra proibida");
  if (rules.triggersEnabled && rules.triggers.some((trigger) => matchesTrigger(text, trigger))) return fail("Gatilho bloqueado");
  const now = Date.now();
  const normalized = text.toLowerCase().trim().replace(/\s+/g, " ");
  if (rules.repeatEnabled && rules.repeatMax > 0) {
    const key = userKey + ":" + normalized;
    const previous = repeats.get(key);
    if (previous && now - previous.firstAt <= rules.repeatWindowSec * 1000) {
      previous.count++;
      if (previous.count > rules.repeatMax) {
        flaggedUsers.set(userKey, { author, platform, reason: "Repetição/flood", blocked: flaggedUsers.get(userKey)?.blocked ?? false });
        persistFlaggedUsers();
        return fail("Anti-flood: repetição acima do limite");
      }
    } else repeats.set(key, { text: normalized, count: 1, firstAt: now });
  }
  if (rules.cooldownEnabled && rules.cooldownSec > 0) {
    const last = cooldowns.get(userKey);
    if (last && now - last < rules.cooldownSec * 1000) return fail("Cooldown do usuário");
    cooldowns.set(userKey, now);
  }
  if (URL_TEST.test(message.text) && rules.content.links && rules.links === "allow") {
    flaggedUsers.set(userKey, { author, platform, reason: "Link detectado", blocked: flaggedUsers.get(userKey)?.blocked ?? false });
    persistFlaggedUsers();
  }
  if (rules.maxChars > 0 && text.length > rules.maxChars) {
    if (rules.longMessage === "block") return fail("Limite de caracteres excedido");
    if (rules.longMessage === "cut") text = text.slice(0, rules.maxChars);
  }
  record(message, true, "Aceita", text);
  return { ...message, text };
}
export function getFlaggedUsers() { return Array.from(flaggedUsers.entries()).map(([key, value]) => ({ key, ...value })); }
export function toggleFlaggedUser(key: string) {
  const user = flaggedUsers.get(key);
  if (user) { flaggedUsers.set(key, { ...user, blocked: !user.blocked }); persistFlaggedUsers(); emitDiag(); }
}
export function clearFlaggedUser(key: string) { flaggedUsers.delete(key); persistFlaggedUsers(); emitDiag(); }
export function recordTtsQueueBlock(message: Pick<MultiChatMessage, "id" | "platform" | "author" | "text">, reason: string) {
  diag.blocked++;
  diag.reasons[reason] = (diag.reasons[reason] || 0) + 1;
  diag.events.unshift({ id: message.id + "-queue", time: Date.now(), platform: message.platform, author: message.author, decision: "BLOQUEADA", reason, text: message.text });
  if (diag.events.length > 100) diag.events.length = 100;
  emitDiag();
}
export function recordTtsQueueDrop(message: { id: string | number; platform: ChatPlatform; author: string; text: string }, reason: string) {
  diag.dropped++;
  diag.reasons[reason] = (diag.reasons[reason] || 0) + 1;
  diag.events.unshift({ id: message.id + "-dropped", time: Date.now(), platform: message.platform, author: message.author, decision: "BLOQUEADA", reason, text: message.text });
  if (diag.events.length > 100) diag.events.length = 100;
  emitDiag();
}

const roleLabels: Record<string, string> = { broadcaster: "Streamer/dono", moderator: "Moderador", vip: "VIP", subscriber: "Inscrito/membro", normal: "Usuário comum" };
const eventLabels: Record<string, string> = {
  twitch_sub: "Inscrição Twitch", twitch_resub: "Renovação Twitch", twitch_subgift: "Gift Sub Twitch", twitch_bits: "Bits Twitch", twitch_raid: "Raid Twitch", twitch_announcement: "Anúncio Twitch",
  kick_sub: "Inscrição Kick", kick_gift: "Gift Sub Kick", kick_raid: "Raid Kick",
  youtube_membership: "Novo membro YouTube", youtube_superchat: "Super Chat", youtube_supersticker: "Super Sticker",
  youtube_membership_gifting: "Presente de membresia", youtube_gift_membership_received: "Membresia presente recebida", youtube_poll: "Enquete YouTube",
};
function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return <label className="tts-filter-toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span><b>{label}</b>{description && <small>{description}</small>}</span></label>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="tts-filter-field"><span>{label}</span>{children}</label>;
}
export function TtsFiltersPanel() {
  const cfg = useTtsFilterConfig();
  useTtsFilterDiagnostics();
  const diagState = getTtsFilterDiagnostics();
  const [word, setWord] = useState("");
  const [trigger, setTrigger] = useState("");
  const [triggerType, setTriggerType] = useState<MatchType>("contains");
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [platform, setPlatform] = useState<ChatPlatform>("Twitch");
  const rules = cfg.scope === "perPlatform" ? cfg.perPlatform[platform] : cfg.shared;
  const updateRules = (patch: Partial<RuleSet>) => {
    if (cfg.scope === "perPlatform") setTtsFilterConfig({ ...cfg, perPlatform: { ...cfg.perPlatform, [platform]: { ...rules, ...patch } } });
    else setTtsFilterConfig({ ...cfg, shared: { ...rules, ...patch } });
  };
  const updateNested = (key: "roles" | "events" | "content" | "priorities", name: string, value: boolean | number) => updateRules({ [key]: { ...(rules[key] as Record<string, boolean | number>), [name]: value } } as Partial<RuleSet>);
  const addWord = () => { const value = word.trim(); if (value && !rules.bannedWords.some((v) => v.toLowerCase() === value.toLowerCase())) updateRules({ bannedWords: [...rules.bannedWords, value] }); setWord(""); };
  const addTrigger = () => { const value = trigger.trim(); if (value) updateRules({ triggers: [...rules.triggers, { id: Date.now().toString(36), value, matchType: triggerType }] }); setTrigger(""); };
  return <section className="tts-card tts-filters-card">
    <div className="tts-card-title"><span className="tts-title-icon"><Filter /></span><div><h2>Filtros de leitura</h2><p>Regras aplicadas antes de adicionar mensagens à fila TTS.</p></div></div>
    <div className="tts-filter-top">
      <Field label="Modo"><select value={cfg.mode} onChange={(e) => setTtsFilterConfig({ ...cfg, mode: e.target.value as TtsFilterConfig["mode"] })}><option value="free">Livre — sem bloqueios</option><option value="custom">Personalizado — aplicar filtros</option></select></Field>
      <Field label="Aplicação"><select value={cfg.scope} onChange={(e) => setTtsFilterConfig({ ...cfg, scope: e.target.value as TtsFilterConfig["scope"] })}><option value="shared">Mesmas regras para todas</option><option value="perPlatform">Regras por plataforma</option></select></Field>
      {cfg.scope === "perPlatform" && <Field label="Plataforma"><select value={platform} onChange={(e) => setPlatform(e.target.value as ChatPlatform)}><option>Twitch</option><option>Kick</option><option>YouTube</option></select></Field>}
      <Field label="Preset"><select value={selectedPreset} onChange={(e) => { const next = e.target.value; setSelectedPreset(next); if (next === "free") setTtsFilterConfig(defaultConfig()); else if (next !== "custom") { const nextRules = defaultRules(); if (next === "leve") { nextRules.cooldownEnabled = true; nextRules.cooldownSec = 5; nextRules.links = "remove"; } if (next === "moderado") { nextRules.repeatEnabled = true; nextRules.repeatMax = 3; nextRules.cooldownEnabled = true; nextRules.cooldownSec = 10; nextRules.links = "block"; nextRules.emotes = "remove"; nextRules.longMessage = "cut"; } if (next === "restrito") { nextRules.repeatEnabled = true; nextRules.repeatMax = 2; nextRules.repeatWindowSec = 120; nextRules.cooldownEnabled = true; nextRules.cooldownSec = 30; nextRules.links = "block"; nextRules.emotes = "block_only"; nextRules.longMessage = "block"; nextRules.maxChars = 150; nextRules.queueLimitEnabled = true; nextRules.queueMax = 5; } setTtsFilterConfig(cfg.scope === "perPlatform" ? { ...cfg, mode: "custom", perPlatform: { ...cfg.perPlatform, [platform]: nextRules } } : { ...cfg, mode: "custom", shared: nextRules }); } }}><option value="custom">Sem preset</option><option value="free">Livre</option><option value="leve">Leve</option><option value="moderado">Moderado</option><option value="restrito">Restrito</option></select></Field>
    </div>
    {cfg.mode === "free" && <p className="tts-filter-free">Modo Livre ativo: as mensagens seguem para o TTS sem bloqueios, como no BACKUP01.</p>}
    <div className="tts-filter-grid">
      <div className="tts-filter-group"><h3>Cargos permitidos</h3>{Object.entries(roleLabels).map(([key, label]) => <Toggle key={key} checked={rules.roles[key] !== false} onChange={(v) => updateNested("roles", key, v)} label={label} />)}</div>
      <div className="tts-filter-group"><h3>Conteúdo</h3>
        <Toggle checked={rules.content.messages} onChange={(v) => updateNested("content", "messages", v)} label="Mensagens comuns" />
        <Toggle checked={rules.content.links} onChange={(v) => updateNested("content", "links", v)} label="Links permitidos" />
        <Toggle checked={rules.content.mentions} onChange={(v) => updateNested("content", "mentions", v)} label="Menções permitidas" />
        <Toggle checked={rules.content.commands} onChange={(v) => updateNested("content", "commands", v)} label="Comandos permitidos" />
        <Field label="Política de links"><select value={rules.links} onChange={(e) => updateRules({ links: e.target.value as RuleSet["links"] })}><option value="allow">Permitir</option><option value="block">Bloquear mensagem</option><option value="remove">Remover link</option></select></Field>
        <Field label="Emotes e emojis"><select value={rules.emotes} onChange={(e) => updateRules({ emotes: e.target.value as RuleSet["emotes"] })}><option value="allow">Permitir</option><option value="remove">Remover antes da fala</option><option value="block_only">Bloquear mensagem só de emotes</option><option value="block_over">Bloquear acima do limite</option></select></Field>
        {rules.emotes === "block_over" && <Field label="Máximo de emojis"><input type="number" min={0} max={100} value={rules.emoteLimit} onChange={(e) => updateRules({ emoteLimit: Math.max(0, Number(e.target.value)) })} /></Field>}
      </div>
      <div className="tts-filter-group"><h3>Anti-flood e intervalo</h3>
        <Toggle checked={rules.repeatEnabled} onChange={(v) => updateRules({ repeatEnabled: v })} label="Bloquear repetição" description="Detecta mensagens iguais do mesmo usuário." />
        <Field label="Repetições permitidas"><input type="number" min={1} max={50} value={rules.repeatMax} onChange={(e) => updateRules({ repeatMax: Math.max(1, Number(e.target.value)) })} /></Field>
        <Field label="Janela de repetição (segundos)"><input type="number" min={1} max={3600} value={rules.repeatWindowSec} onChange={(e) => updateRules({ repeatWindowSec: Math.max(1, Number(e.target.value)) })} /></Field>
        <Toggle checked={rules.cooldownEnabled} onChange={(v) => updateRules({ cooldownEnabled: v })} label="Cooldown por usuário" description="Suprime mensagens enviadas em sequência." />
        <Field label="Cooldown (segundos)"><input type="number" min={0} max={300} value={rules.cooldownSec} onChange={(e) => updateRules({ cooldownSec: Math.max(0, Number(e.target.value)) })} /></Field>
      </div>
      <div className="tts-filter-group"><h3>Texto e gatilhos</h3>
        <Field label="Mensagens longas"><select value={rules.longMessage} onChange={(e) => updateRules({ longMessage: e.target.value as RuleSet["longMessage"] })}><option value="allow">Sem bloqueio adicional</option><option value="block">Ignorar acima do limite</option><option value="cut">Cortar no limite</option></select></Field>
        <Field label="Limite de caracteres"><input type="number" min={0} max={2000} value={rules.maxChars} onChange={(e) => updateRules({ maxChars: Math.max(0, Number(e.target.value)) })} /></Field>
        <div className="tts-filter-entry"><input value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWord()} placeholder="Adicionar palavra proibida" /><button onClick={addWord} aria-label="Adicionar palavra"><Plus size={14} /></button></div>
        <div className="tts-filter-chip-list">{rules.bannedWords.map((value) => <span key={value}>{value}<button onClick={() => updateRules({ bannedWords: rules.bannedWords.filter((w) => w !== value) })} aria-label={"Remover " + value}><Trash2 size={12} /></button></span>)}</div>
        <div className="tts-filter-entry"><input value={trigger} onChange={(e) => setTrigger(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTrigger()} placeholder="Adicionar gatilho" /><button onClick={addTrigger} aria-label="Adicionar gatilho"><Plus size={14} /></button></div>
        <Field label="Tipo de correspondência"><select value={triggerType} onChange={(e) => setTriggerType(e.target.value as MatchType)}><option value="exact">Palavra exata</option><option value="contains">Contém trecho</option><option value="starts">Começa com</option><option value="ends">Termina com</option><option value="regex">Expressão regular (regex)</option></select></Field>
        <Toggle checked={rules.triggersEnabled} onChange={(v) => updateRules({ triggersEnabled: v })} label="Ativar gatilhos como bloqueios" />
        <div className="tts-filter-chip-list">{rules.triggers.map((item) => <span key={item.id}>{item.matchType}: {item.value}<button onClick={() => updateRules({ triggers: rules.triggers.filter((v) => v.id !== item.id) })} aria-label="Remover gatilho"><Trash2 size={12} /></button></span>)}</div>
      </div>
      <div className="tts-filter-group"><h3>Eventos</h3>{EVENT_KEYS.map((key) => <Toggle key={key} checked={rules.events[key] !== false} onChange={(v) => updateNested("events", key, v)} label={eventLabels[key] || key} />)}</div>
      <div className="tts-filter-group"><h3>Fila e prioridade</h3>
        <Toggle checked={rules.queueLimitEnabled} onChange={(v) => updateRules({ queueLimitEnabled: v })} label="Limitar fila TTS" />
        <Field label="Máximo na fila"><input type="number" min={1} max={200} value={rules.queueMax} onChange={(e) => updateRules({ queueMax: Math.max(1, Number(e.target.value)) })} /></Field>
        <Field label="Quando a fila encher"><select value={rules.queuePolicy} onChange={(e) => updateRules({ queuePolicy: e.target.value as RuleSet["queuePolicy"] })}><option value="reject">Rejeitar novas</option><option value="drop_oldest">Remover a mais antiga</option><option value="preserve_priority">Preservar prioridade</option></select></Field>
        <Toggle checked={rules.priorityEnabled} onChange={(v) => updateRules({ priorityEnabled: v })} label="Ativar prioridade por cargo" />
        {Object.entries(roleLabels).map(([key, label]) => <Field key={key} label={label}><input type="number" min={1} max={10} value={rules.priorities[key] || 1} onChange={(e) => updateNested("priorities", key, Math.max(1, Number(e.target.value)))} /></Field>)}
      </div>
    </div>
    <div className="tts-filter-diagnostics">
      <div className="tts-filter-diagnostic-heading"><h3>Diagnóstico dos filtros</h3><button onClick={resetTtsFilterDiagnostics}><RotateCcw size={13} /> Limpar diagnóstico</button></div>
      <div className="tts-filter-stats"><span>Recebidas <b>{diagState.received}</b></span><span>Aceitas <b>{diagState.accepted}</b></span><span>Bloqueadas <b>{diagState.blocked}</b></span><span>Descartadas da fila <b>{diagState.dropped}</b></span></div>
      <div className="tts-filter-reasons">{Object.entries(diagState.reasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => <span key={reason}>{reason}: <b>{count}</b></span>)}</div>
      <div className="tts-filter-events">{diagState.events.slice(0, 30).map((event) => <article key={event.id + event.time}><time>{new Date(event.time).toLocaleTimeString("pt-BR")}</time><b className={event.decision === "ACEITA" ? "accepted" : "blocked"}>{event.decision}</b><span>{event.platform} · {event.author}</span><small>{event.reason}</small><p>{event.text}</p></article>)}</div>
      <div className="tts-filter-flagged"><h3>Usuários sinalizados por repetição</h3>{getFlaggedUsers().length === 0 ? <p>Nenhum usuário sinalizado.</p> : getFlaggedUsers().map((user) => <div key={user.key}><label><input type="checkbox" checked={user.blocked} onChange={() => toggleFlaggedUser(user.key)} /> <span>{user.author} · {user.platform}</span></label><small>{user.reason}</small><button onClick={() => clearFlaggedUser(user.key)} aria-label={"Limpar " + user.author}><Trash2 size={12} /></button></div>)}</div>
    </div>
    <p className="tts-filter-footer">Configurações salvas localmente neste navegador. As regras só filtram a leitura TTS; o chat visual continua recebendo as mensagens.</p>
  </section>;
}
