import { useEffect, useState, type CSSProperties, type ComponentType } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import HorizontalMenu from "../components/HorizontalMenu";
import { FONT_CATEGORIES } from "../fontes/Font_Catalog";
import { loadGoogleFont } from "../fontes/Font_Loader";
import { getWidgetInternalElements, isWidgetFragmentable } from "./Overlay_widgetElements";

type WidgetDefinition = {
  id: string;
  name: string;
  component: ComponentType<{ config?: Record<string, unknown> }>;
  defaultConfig?: Record<string, unknown>;
  implemented?: boolean;
};

type OverlayEditorProps = {
  className?: string;
  height?: number;
  catalog: WidgetDefinition[];
  onAddFragment: (definition: WidgetDefinition, elementKey: string, label: string) => void;
  onAddText: (text: string, fontSize: number, color: string, fontFamily: string) => void;
  onFontChange: (fontFamily: string) => void;
  onTextStyleChange: (patch: { fontSize?: number; color?: string; fontFamily?: string }) => void;
  selectedInstanceWidgetId?: string | null;
  selectedInstanceConfig?: Record<string, unknown> | null;
  onUpdateSelectedConfig: (patch: Record<string, unknown>) => void;
  onSelectWidget: (widgetId: string) => void;
};

const MENUS = ["INICIO", "TEXTO", "ANIMACAO", "IMAGEMS", "ALINHAMENTO", "FORMAS", "EMOJES", "CAMADAS"] as const;
type MenuName = (typeof MENUS)[number];


function getReactHubEmbedUrl(value: string) {
  try {
    const url = new URL(String(value || ""));
    let videoId = "";
    if (url.hostname === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (url.hostname.includes("youtube.com") || url.hostname.includes("youtube-nocookie.com")) {
      videoId = url.searchParams.get("v") || "";
      const parts = url.pathname.split("/").filter(Boolean);
      if (!videoId && parts.length > 1 && ["embed", "shorts", "live"].includes(parts[0])) videoId = parts[1];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? "https://www.youtube.com/embed/" + videoId + "?autoplay=1&rel=0" : "";
  } catch { return ""; }
}

type ReactHubQueueItem = { id?: string; author?: string; url?: string; title?: string; status?: string };

function getReactHubQueueUrl(item: ReactHubQueueItem) {
  for (const value of [item.url, item.title]) {
    const raw = String(value || "").trim();
    const match = raw.match(/https?:\/\/[^\s<>"']+/i);
    if (match?.[0]) return match[0].replace(/[),.;!?\]}]+$/, "");
  }
  return "";
}

const buttonClass = "shrink-0 rounded-md border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white";
const activeButtonClass = "shrink-0 rounded-md border border-violet-400 bg-violet-500/20 px-3 py-1.5 text-xs text-white";

function CommandEditor({ commands, disabled, onChange }: { commands: unknown[]; disabled: boolean; onChange: (commands: Array<{ name: string; description: string }>) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const normalized = commands.map((item) => typeof item === "string" ? { name: item.replace(/^!/, ""), description: "" } : { name: String((item as any)?.name || (item as any)?.command || "").replace(/^!/, ""), description: String((item as any)?.description || (item as any)?.desc || "") });
  function update(index: number, patch: Partial<{ name: string; description: string }>) {
    onChange(normalized.map((item, i) => i === index ? { ...item, ...patch } : item).filter((item) => item.name.trim()));
  }
  return <div className="flex flex-col gap-1.5">
    {normalized.map((command, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-1">
      <input aria-label="Comando" value={command.name} disabled={disabled} onChange={(event) => update(index, { name: event.target.value })} className="h-7 min-w-0 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
      <input aria-label="Descrição do comando" value={command.description} disabled={disabled} onChange={(event) => update(index, { description: event.target.value })} className="h-7 min-w-0 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
      <button type="button" disabled={disabled} onClick={() => onChange(normalized.filter((_, i) => i !== index))} className="rounded border border-red-400/30 px-2 text-xs text-red-200 disabled:opacity-40">×</button>
    </div>)}
    <div className="grid grid-cols-[1fr_1fr_auto] gap-1">
      <input aria-label="Novo comando" placeholder="!comando" value={name} disabled={disabled} onChange={(event) => setName(event.target.value)} className="h-7 min-w-0 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
      <input aria-label="Descrição do novo comando" placeholder="Descrição" value={description} disabled={disabled} onChange={(event) => setDescription(event.target.value)} className="h-7 min-w-0 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
      <button type="button" disabled={disabled || !name.trim()} onClick={() => { onChange([...normalized, { name: name.trim().replace(/^!/, ""), description: description.trim() }]); setName(""); setDescription(""); }} className="rounded border border-violet-400/50 px-2 text-xs text-white disabled:opacity-40">+</button>
    </div>
  </div>;
}


function StringListEditor({ title, items, disabled, onChange, placeholder }: { title: string; items: string[]; disabled: boolean; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  return <div className="rounded border border-white/10 bg-slate-900 p-2">
    <p className="mb-1 text-[11px] font-semibold text-slate-200">{title}</p>
    {items.map((item, index) => <div key={index} className="mb-1 flex gap-1">
      <input aria-label={title} value={item} disabled={disabled} onChange={(event) => onChange(items.map((current, i) => i === index ? event.target.value : current))} className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white disabled:opacity-50" />
      <button type="button" disabled={disabled} onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded border border-red-400/30 px-2 text-xs text-red-200 disabled:opacity-40">×</button>
    </div>)}
    <div className="flex gap-1">
      <input aria-label="Novo item" placeholder={placeholder} value={draft} disabled={disabled} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && draft.trim()) { event.preventDefault(); onChange([...items, draft.trim()]); setDraft(""); } }} className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white disabled:opacity-50" />
      <button type="button" disabled={disabled || !draft.trim()} onClick={() => { onChange([...items, draft.trim()]); setDraft(""); }} className="rounded border border-violet-400/50 px-2 text-xs text-white disabled:opacity-40">Adicionar</button>
    </div>
  </div>;
}

function ScheduleEditor({ schedule, disabled, onChange }: { schedule: Array<{ day?: string; hour?: string; label?: string }>; disabled: boolean; onChange: (schedule: Array<{ day: string; hour: string; label: string }>) => void }) {
  const normalized = schedule.map((item) => ({ day: String(item?.day || ""), hour: String(item?.hour || ""), label: String(item?.label || "") }));
  return <div className="rounded border border-white/10 bg-slate-900 p-2">
    <p className="mb-1 text-[11px] font-semibold text-slate-200">Agenda de Streams</p>
    {normalized.map((item, index) => <div key={index} className="mb-2 grid grid-cols-1 gap-1 rounded border border-white/5 p-1.5">
      <input aria-label="Dia da stream" placeholder="Dia (ex.: Segunda)" value={item.day} disabled={disabled} onChange={(event) => onChange(normalized.map((v, i) => i === index ? { ...v, day: event.target.value } : v))} className="h-7 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
      <div className="flex gap-1"><input aria-label="Horário da stream" placeholder="Horário (ex.: 19:00)" value={item.hour} disabled={disabled} onChange={(event) => onChange(normalized.map((v, i) => i === index ? { ...v, hour: event.target.value } : v))} className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" /><button type="button" disabled={disabled} onClick={() => onChange(normalized.filter((_, i) => i !== index))} className="rounded border border-red-400/30 px-2 text-xs text-red-200">Remover</button></div>
      <input aria-label="Nome da stream" placeholder="Título / conteúdo" value={item.label} disabled={disabled} onChange={(event) => onChange(normalized.map((v, i) => i === index ? { ...v, label: event.target.value } : v))} className="h-7 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
    </div>)}
    <button type="button" disabled={disabled} onClick={() => onChange([...normalized, { day: "", hour: "", label: "" }])} className={buttonClass}>Adicionar horário</button>
  </div>;
}

function PollOptionsEditor({ options, disabled, onChange }: { options: Array<{ text?: string; label?: string }>; disabled: boolean; onChange: (options: Array<{ text: string; label: string }>) => void }) {
  const normalized = options.map((option, i) => ({ text: String(option?.text || ""), label: String(option?.label || String(i + 1)) }));
  return <div className="rounded border border-white/10 bg-slate-900 p-2">
    <p className="mb-1 text-[11px] font-semibold text-slate-200">Opções de voto (!voto número)</p>
    {normalized.map((option, index) => <div key={index} className="mb-1 grid grid-cols-[minmax(0,1fr)_3rem_auto] gap-1">
      <input aria-label="Texto da opção" placeholder="Opção" value={option.text} disabled={disabled} onChange={(event) => onChange(normalized.map((v, i) => i === index ? { ...v, text: event.target.value } : v))} className="h-7 min-w-0 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" />
      <input aria-label="Número da opção" placeholder="#" value={option.label} disabled={disabled} onChange={(event) => onChange(normalized.map((v, i) => i === index ? { ...v, label: event.target.value } : v))} className="h-7 min-w-0 rounded border border-white/10 bg-slate-950 px-1 text-xs text-white" />
      <button type="button" disabled={disabled} onClick={() => onChange(normalized.filter((_, i) => i !== index))} className="rounded border border-red-400/30 px-2 text-xs text-red-200">×</button>
    </div>)}
    <button type="button" disabled={disabled} onClick={() => onChange([...normalized, { text: "", label: String(normalized.length + 1) }])} className={buttonClass}>Adicionar opção</button>
  </div>;
}

export default function Overlay_Editor({
  className = "",
  height = 220,
  catalog,
  onAddFragment,
  onAddText,
  onFontChange,
  onTextStyleChange,
  selectedInstanceWidgetId = null,
  selectedInstanceConfig = null,
  onUpdateSelectedConfig,
  onSelectWidget,
}: OverlayEditorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuName>("INICIO");
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [selectedFontCategory, setSelectedFontCategory] = useState<keyof typeof FONT_CATEGORIES | null>(null);
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [textValue, setTextValue] = useState("Novo texto");
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [reactHubQueue, setReactHubQueue] = useState<ReactHubQueueItem[]>([]);
  const [reactHubPopupOpen, setReactHubPopupOpen] = useState(false);
  const [reactHubSelected, setReactHubSelected] = useState<ReactHubQueueItem | null>(null);
  const panelHeight = `min(${Math.max(190, height)}px, 34vh)`;
  const style: CSSProperties = {
    height: isCollapsed ? "0px" : panelHeight,
    transition: "height 220ms ease",
  };

  useEffect(() => {
    const readQueue = () => {
      try {
        const raw = window.localStorage.getItem("scenario_react_queue");
        const parsed = raw ? JSON.parse(raw) : [];
        setReactHubQueue(Array.isArray(parsed) ? parsed : []);
      } catch { setReactHubQueue([]); }
    };
    readQueue();
    const onStorage = (event: StorageEvent) => { if (event.key === "scenario_react_queue") readQueue(); };
    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("scenario_react_bus");
        channel.onmessage = (event) => { if (event.data?.type === "QUEUE_UPDATED") readQueue(); };
      }
    } catch { /* BroadcastChannel opcional */ }
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(readQueue, 1000);
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(interval); channel?.close(); };
  }, []);

  const availableWidgets = catalog.filter((widget) => widget.implemented !== false);
  const fragmentableWidgets = availableWidgets.filter((widget) => isWidgetFragmentable(widget.id));
  const selectedWidget = availableWidgets.find((widget) => widget.id === (selectedWidgetId || selectedInstanceWidgetId));
  const fragments = selectedWidget && isWidgetFragmentable(selectedWidget.id) ? getWidgetInternalElements(selectedWidget.id) : [];
  const hasSelectedInstance = Boolean(selectedWidget && selectedInstanceWidgetId === selectedWidget.id && selectedInstanceConfig);
  const editableConfig = selectedWidget
    ? { ...(selectedWidget.defaultConfig || {}), ...(hasSelectedInstance ? selectedInstanceConfig || {} : {}) }
    : {};
  const editableEntries = selectedWidget?.id === "react-hub-widget" ? [] : Object.entries(editableConfig).filter(([, value]) =>
    value === null || ["string", "number", "boolean"].includes(typeof value) || Array.isArray(value) || (typeof value === "object" && value !== null)
  );
  // O serviço coloca os envios novos no início. Exiba os quatro mais recentes
  // em ordem de chegada: do mais antigo para o mais novo dentro desse grupo.
  const reactHubRecentQueue = reactHubQueue.slice(0, 4).reverse();
  const reactHubArrivalQueue = [...reactHubQueue].reverse();

  useEffect(() => {
    if (selectedInstanceWidgetId) setSelectedWidgetId(selectedInstanceWidgetId);
  }, [selectedInstanceWidgetId]);

  useEffect(() => {
    if (!selectedFontCategory) return;
    FONT_CATEGORIES[selectedFontCategory].forEach((font) => {
      if (font !== "monospace") loadGoogleFont(font);
    });
  }, [selectedFontCategory]);

  function chooseFont(font: string) {
    setSelectedFont(font);
    if (font !== "monospace") loadGoogleFont(font);
    onFontChange(font);
    onTextStyleChange({ fontFamily: font });
  }

  return (
    <section
      role="region"
      aria-label="Editor de overlay"
      data-overlay-editor
      className={`fixed inset-x-0 bottom-0 z-[80] w-full overflow-visible border-t border-white/15 bg-slate-950 text-slate-100 shadow-2xl ${className}`}
      style={style}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        aria-label={isCollapsed ? "Mostrar editor de overlay" : "Recolher editor de overlay"}
        aria-expanded={!isCollapsed}
        title={isCollapsed ? "Mostrar editor" : "Recolher editor"}
        className="absolute -top-9 right-4 inline-flex h-8 w-10 items-center justify-center rounded-t-md border border-b-0 border-white/15 bg-slate-950 text-slate-200 transition hover:bg-slate-800 hover:text-white"
      >
        {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {!isCollapsed && (
        <div className="flex h-full min-h-0 flex-col gap-1 px-3 pb-2 pt-1.5">
          <HorizontalMenu ariaLabel="Seções do editor de overlay" trackClassName="overflow-x-auto overflow-y-hidden">
            {MENUS.map((menu) => (
              <button
                key={menu}
                type="button"
                onClick={() => setActiveMenu(menu)}
                aria-pressed={activeMenu === menu}
                className={activeMenu === menu ? activeButtonClass : buttonClass}
              >
                {menu}
              </button>
            ))}
          </HorizontalMenu>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {activeMenu === "INICIO" && (
              <div className="grid h-full min-h-0 grid-cols-[minmax(150px,0.9fr)_minmax(160px,1fr)_minmax(220px,1.35fr)] gap-2">
                <section aria-label="Widgets fragmentáveis" className="flex min-h-0 min-w-0 flex-col border-r border-white/10 pr-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Widgets fragmentáveis ({fragmentableWidgets.length})</p>
                  <div className="grid min-h-0 grid-cols-3 grid-rows-5 content-start gap-1 overflow-y-auto pr-1">
                    {fragmentableWidgets.map((widget) => (
                      <button
                        key={widget.id}
                        type="button"
                        onClick={() => { setSelectedWidgetId(widget.id); onSelectWidget(widget.id); }}
                        aria-pressed={(selectedInstanceWidgetId || selectedWidgetId) === widget.id}
                        title={widget.name}
                        className={`min-w-0 overflow-hidden rounded border px-1 py-1 text-[10px] leading-3 transition ${selectedWidgetId === widget.id ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-slate-800/80 text-slate-200 hover:border-violet-400/60 hover:bg-violet-500/20"}`}
                      >
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{widget.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section aria-label="Fragmentos da widget" className="flex min-h-0 min-w-0 flex-col border-r border-white/10 pr-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fragmentos</p>
                  {selectedWidget && fragments.length ? (
                    <div className="flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
                      {fragments.map((fragment) => (
                        <button
                          key={fragment.key}
                          type="button"
                          onClick={() => onAddFragment(selectedWidget, fragment.key, fragment.label)}
                          title={`Adicionar ${fragment.label} ao canvas`}
                          className={buttonClass}
                        >
                          {fragment.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">{selectedWidget ? "Esta widget não possui fragmentos independentes implementados." : "Selecione uma widget na primeira coluna."}</p>
                  )}
                </section>

                <section aria-label="Campos editáveis da widget" className="flex min-h-0 min-w-0 flex-col">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Conteúdo editável</p>
                  {selectedWidget ? (
                    <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
                      {selectedWidget.id !== "react-hub-widget" && !hasSelectedInstance && <p className="rounded border border-amber-400/30 bg-amber-400/5 p-1.5 text-[10px] text-amber-200">Configuração padrão da widget. Selecione uma instância dela no canvas para aplicar e salvar as alterações.</p>}
                      {selectedWidget.id === "react-hub-widget" && (
                        <div className="flex min-h-0 flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-slate-200">Últimos vídeos</p>
                            <button type="button" onClick={() => { setReactHubSelected(reactHubRecentQueue[0] || null); setReactHubPopupOpen(true); }} className={buttonClass}>Abrir popup</button>
                          </div>
                          <div className="grid h-[104px] shrink-0 grid-rows-4 gap-1 overflow-hidden">
                            {reactHubRecentQueue.map((item, index) => (
                              <button key={item.id || getReactHubQueueUrl(item) || index} type="button" onClick={() => { setReactHubSelected(item); setReactHubPopupOpen(true); }} title={getReactHubQueueUrl(item)} className="block min-h-0 w-full overflow-hidden rounded border border-white/5 bg-slate-950 px-2 text-left text-[10px] leading-5 text-cyan-300 underline">
                                <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{index + 1} - {item.author || "Espectador"} = {getReactHubQueueUrl(item)}</span>
                              </button>
                            ))}
                            {Array.from({ length: Math.max(0, 4 - reactHubRecentQueue.length) }, (_, index) => <div key={"empty-" + index} className="rounded border border-white/5 bg-slate-950/50" />)}
                          </div>
                        </div>
                      )}
                      {selectedWidget.id === "manual-death-counter" && (
                        <div className="flex items-center justify-between gap-2 rounded border border-white/10 bg-slate-900 p-2">
                          <span className="text-xs text-slate-200">Mortes</span>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ deathCount: Math.max(0, Number(editableConfig.deathCount || 0) - 1) })} className="h-8 w-8 rounded border border-white/15 text-lg disabled:opacity-40">−</button>
                            <strong className="min-w-8 text-center text-sm tabular-nums">{Number(editableConfig.deathCount || 0)}</strong>
                            <button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ deathCount: Math.max(0, Number(editableConfig.deathCount || 0) + 1) })} className="h-8 w-8 rounded border border-white/15 text-lg disabled:opacity-40">+</button>
                          </div>
                        </div>
                      )}

                      {selectedWidget.id === "twitch-rules" && <StringListEditor title="Regras do Canal" items={Array.isArray(editableConfig.rules) ? editableConfig.rules.map(String) : typeof editableConfig.rules === "string" ? editableConfig.rules.split("\\n").filter(Boolean) : []} disabled={!hasSelectedInstance} placeholder="Digite uma regra" onChange={(rules) => onUpdateSelectedConfig({ rules })} />}
                      {selectedWidget.id === "twitch-schedule" && <ScheduleEditor schedule={Array.isArray(editableConfig.schedule) ? editableConfig.schedule as Array<{ day?: string; hour?: string; label?: string }> : []} disabled={!hasSelectedInstance} onChange={(schedule) => onUpdateSelectedConfig({ schedule })} />}
                      {selectedWidget.id === "twitch-schedule-ticker" && <StringListEditor title="Mensagens do letreiro" items={Array.isArray(editableConfig.news) ? editableConfig.news.map(String) : typeof editableConfig.newsText === "string" && editableConfig.newsText ? [editableConfig.newsText] : typeof editableConfig.text === "string" && editableConfig.text ? [editableConfig.text] : []} disabled={!hasSelectedInstance} placeholder="Digite um aviso" onChange={(news) => onUpdateSelectedConfig({ news, newsText: news.join(" ★ "), text: news.join(" ★ ") })} />}
                      {["twitch-sub-goal", "twitch-bits-goal", "twitch-raid-goal"].includes(selectedWidget.id) && <div className="rounded border border-white/10 bg-slate-900 p-2">
                        <p className="mb-1 text-[11px] font-semibold text-slate-200">{selectedWidget.name}</p>
                        <label className="mb-1 flex flex-col gap-1 text-[10px] text-slate-300">Valor inicial<input type="number" min={0} value={Number(editableConfig.startValue ?? 0)} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ startValue: Math.max(0, Number(event.target.value) || 0) })} className="h-7 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" /></label>
                        <label className="flex flex-col gap-1 text-[10px] text-slate-300">Meta / alvo<input type="number" min={1} value={Number(editableConfig.targetValue ?? (selectedWidget.id === "twitch-bits-goal" ? 2500 : selectedWidget.id === "twitch-raid-goal" ? 5 : 50))} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ targetValue: Math.max(1, Number(event.target.value) || 1) })} className="h-7 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" /></label>
                      </div>}
                      {selectedWidget.id === "twitch-poll" && <div className="flex flex-col gap-1.5">
                        <label className="flex flex-col gap-1 text-[10px] text-slate-300">Pergunta da enquete<input value={String(editableConfig.question ?? "")} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ question: event.target.value })} className="h-7 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white" /></label>
                        <PollOptionsEditor options={Array.isArray(editableConfig.options) ? editableConfig.options as Array<{ text?: string; label?: string }> : []} disabled={!hasSelectedInstance} onChange={(options) => onUpdateSelectedConfig({ options })} />
                        <button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ resetVotes: Date.now() })} className={buttonClass}>Zerar votos</button>
                      </div>}
                      {selectedWidget.id === "twitch-raffle" && <div className="rounded border border-white/10 bg-slate-900 p-2">
                        <p className="mb-1 text-[11px] font-semibold text-slate-200">Sorteio de Chat</p>
                        <p className="mb-2 text-[10px] text-slate-400">Os participantes entram pelo chat usando !entrar. O sorteio usa os participantes conectados; não é uma lista manual.</p>
                        <div className="flex flex-wrap gap-1"><button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ drawTrigger: Date.now() })} className={buttonClass}>Sortear vencedor</button><button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ resetTrigger: Date.now() })} className={buttonClass}>Limpar sorteio</button></div>
                      </div>}
                      {selectedWidget.id === "twitch-commands-list" && (
                        <div className="rounded border border-white/10 bg-slate-900 p-2">
                          <p className="mb-1 text-[11px] text-slate-200">Adicionar comando</p>
                          <CommandEditor
                            commands={Array.isArray(editableConfig.commands) ? editableConfig.commands : typeof editableConfig.commands === "string" ? editableConfig.commands.split(",").map((x) => x.trim()).filter(Boolean) : []}
                            disabled={!hasSelectedInstance}
                            onChange={(commands) => onUpdateSelectedConfig({ commands })}
                          />
                        </div>
                      )}
                      {selectedWidget.id === "manual-pix-widget" && (
                        <div className="rounded border border-white/10 bg-slate-900 p-2">
                          <p className="mb-1 text-[11px] font-semibold text-slate-200">Configuração Pix / QR Code</p>
                          {(["title", "pixKey", "pixName", "pixCity", "pixAmount"] as const).map((key) => (
                            <label key={key} className="mb-1 flex flex-col gap-1 text-[10px] text-slate-300">
                              <span>{{ title: "Título", pixKey: "Chave Pix", pixName: "Nome do recebedor", pixCity: "Cidade", pixAmount: "Valor (opcional)" }[key]}</span>
                              <input type={key === "pixAmount" ? "number" : "text"} value={String(editableConfig[key] ?? "")} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.value })} className="h-7 w-full rounded border border-white/10 bg-slate-950 px-2 text-xs text-white disabled:opacity-50" />
                            </label>
                          ))}
                        </div>
                      )}
                      {selectedWidget.id === "manual-timer" && (
                        <div className="rounded border border-white/10 bg-slate-900 p-2">
                          <label className="flex flex-col gap-1 text-[10px] text-slate-300"><span>Duração (segundos)</span><input type="number" min={0} value={Number(editableConfig.durationSeconds ?? 300)} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ durationSeconds: Math.max(0, Number(event.target.value) || 0), remainingSeconds: Math.max(0, Number(event.target.value) || 0), timerRunning: false, timerEndAt: null })} className="h-7 rounded border border-white/10 bg-slate-950 px-2 text-xs text-white disabled:opacity-50" /></label>
                          <div className="mt-2 flex gap-1"><button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ timerRunning: true, timerEndAt: Date.now() + Math.max(0, Number(editableConfig.remainingSeconds ?? editableConfig.durationSeconds ?? 300)) * 1000 })} className={buttonClass}>Iniciar</button><button type="button" disabled={!hasSelectedInstance} onClick={() => onUpdateSelectedConfig({ timerRunning: false, timerEndAt: null, remainingSeconds: Number(editableConfig.durationSeconds ?? 300) })} className={buttonClass}>Reiniciar</button></div>
                        </div>
                      )}
                      {selectedWidget.id === "manual-clock" && (
                        <label className="flex flex-col gap-1 text-[10px] text-slate-300"><span>Fuso horário (IANA; vazio = local)</span><input type="text" value={String(editableConfig.timeZone ?? "")} disabled={!hasSelectedInstance} placeholder="America/Sao_Paulo" onChange={(event) => onUpdateSelectedConfig({ timeZone: event.target.value })} className="h-7 rounded border border-white/10 bg-slate-900 px-2 text-xs text-white disabled:opacity-50" /></label>
                      )}
                      {editableEntries.length ? editableEntries.filter(([key]) => !(/^(fontFamily|fontSize|color|textColor|textColour|fontWeight|fontStyle|textDecoration|lineHeight|letterSpacing|textAlign)$/i.test(key) ||
                        selectedWidget.id === "manual-death-counter" && key === "deathCount" ||
                        ["twitch-rules", "twitch-schedule", "twitch-schedule-ticker"].includes(selectedWidget.id) && ["rules", "schedule", "news", "newsText", "text"].includes(key) ||
                        ["twitch-sub-goal", "twitch-bits-goal", "twitch-raid-goal"].includes(selectedWidget.id) && ["startValue", "targetValue"].includes(key) ||
                        selectedWidget.id === "twitch-poll" && ["question", "options", "resetVotes"].includes(key) ||
                        selectedWidget.id === "twitch-raffle" && ["drawTrigger", "resetTrigger"].includes(key) ||
                        selectedWidget.id === "twitch-commands-list" && key === "commands" ||
                        selectedWidget.id === "manual-pix-widget" && ["title", "pixKey", "pixName", "pixCity", "pixAmount"].includes(key) ||
                        selectedWidget.id === "manual-timer" && ["durationSeconds", "remainingSeconds", "timerRunning", "timerEndAt"].includes(key) ||
                        selectedWidget.id === "manual-clock" && key === "timeZone"
                      )).map(([key, value]) => {
                        const label = key.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
                        const isColor = typeof value === "string" && /(?:color|colour)$/i.test(key) && /^#[0-9a-f]{6}$/i.test(value);
                        return (
                          <label key={key} className="flex min-w-0 flex-col gap-1 text-[10px] text-slate-300">
                            <span>{label}</span>
                            {typeof value === "boolean" ? (
                              <input type="checkbox" checked={value} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.checked })} className="h-4 w-4 accent-violet-500" />
                            ) : typeof value === "number" ? (
                              <input type="number" value={value} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: Number(event.target.value) })} className="h-7 w-full rounded border border-white/10 bg-slate-900 px-2 text-xs text-white outline-none focus:border-violet-400" />
                            ) : Array.isArray(value) || (typeof value === "object" && value !== null) ? (
                              <textarea
                                value={JSON.stringify(value, null, 2)}
                                disabled={!hasSelectedInstance}
                                onChange={(event) => {
                                  try { onUpdateSelectedConfig({ [key]: JSON.parse(event.target.value) }); } catch { /* Mantém o JSON atual até a entrada ficar válida. */ }
                                }}
                                rows={3}
                                className="w-full rounded border border-white/10 bg-slate-900 p-2 font-mono text-[10px] text-white outline-none focus:border-violet-400"
                              />
                            ) : isColor ? (
                              <div className="flex items-center gap-2">
                                <input type="color" value={value as string} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.value })} className="h-7 w-10 rounded border border-white/10 bg-slate-900 p-1" />
                                <input type="text" value={value as string} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.value })} className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-900 px-2 text-xs text-white outline-none focus:border-violet-400" />
                              </div>
                            ) : (
                              <input type="text" value={String(value ?? "")} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.value })} className="h-7 w-full rounded border border-white/10 bg-slate-900 px-2 text-xs text-white outline-none focus:border-violet-400" />
                            )}
                          </label>
                        );
                      }) : editableEntries.length === 0 && !["react-hub-widget", "manual-death-counter", "twitch-commands-list", "manual-pix-widget", "manual-timer", "manual-clock", "twitch-rules", "twitch-schedule", "twitch-schedule-ticker", "twitch-sub-goal", "twitch-bits-goal", "twitch-raid-goal", "twitch-poll", "twitch-raffle"].includes(selectedWidget.id) ? <p className="text-[11px] text-slate-500">Esta widget não declara campos manuais adicionais. Os dados exibidos são recebidos do runtime da plataforma.</p> : null}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">Selecione uma widget ou um elemento no canvas para carregar seus campos de configuração.</p>
                  )}
                </section>
              </div>
            )}

            {activeMenu === "TEXTO" && (
              <div className="grid h-full min-h-0 min-w-0 grid-cols-[minmax(180px,0.38fr)_minmax(0,0.62fr)] gap-3">
                <div className="flex min-w-0 flex-col justify-start gap-1.5 border-r border-white/10 pr-3">
                  <button
                    type="button"
                    onClick={() => onAddText("Novo texto", fontSize, textColor, selectedFont)}
                    className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-md bg-violet-600 px-2 text-xs font-medium text-white transition hover:bg-violet-500"
                  >
                    <Plus size={14} /> Adicionar caixa de texto
                  </button>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="w-[66px] shrink-0">Tamanho</span>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={fontSize}
                      onChange={(event) => {
                        const nextSize = Math.max(1, Math.min(300, Number(event.target.value) || 1));
                        setFontSize(nextSize);
                        onTextStyleChange({ fontSize: nextSize });
                      }}
                      className="h-7 w-20 rounded-md border border-white/10 bg-slate-900 px-2 text-sm text-white outline-none focus:border-violet-400"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="w-[66px] shrink-0">Coloração</span>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(event) => {
                        const nextColor = event.target.value;
                        setTextColor(nextColor);
                        onTextStyleChange({ color: nextColor });
                      }}
                      aria-label="Cor do texto"
                      className="h-7 w-20 cursor-pointer rounded-md border border-white/10 bg-slate-900 p-1"
                    />
                  </label>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden">
                  <p className="text-[10px] leading-3 text-slate-400">Categorias de fontes</p>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {(Object.keys(FONT_CATEGORIES) as Array<keyof typeof FONT_CATEGORIES>).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedFontCategory(category)}
                        aria-pressed={selectedFontCategory === category}
                        className={selectedFontCategory === category ? "shrink-0 rounded border border-violet-400 bg-violet-500/20 px-1.5 py-0.5 text-[10px] leading-3 text-white" : "shrink-0 rounded border border-white/10 bg-slate-800/80 px-1.5 py-0.5 text-[10px] leading-3 text-slate-200 hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white"}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  {selectedFontCategory && (
                    <div className="min-h-0 min-w-0 border-t border-white/10 pt-1">
                      <p className="mb-0.5 text-[10px] leading-3 text-slate-400">Famílias de fontes</p>
                      <div
                        aria-label="Prévia das famílias de fontes"
                        className="grid min-w-0 grid-cols-8 grid-rows-4 content-start gap-1 overflow-x-hidden overflow-y-auto"
                        style={{ gridAutoRows: "22px", maxHeight: "94px" }}
                      >
                        {FONT_CATEGORIES[selectedFontCategory].map((font) => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => chooseFont(font)}
                            aria-pressed={selectedFont === font}
                            title={font}
                            aria-label={font}
                            style={{ fontFamily: font === "monospace" ? "monospace" : `"${font}", sans-serif` }}
                            className={`h-[22px] min-w-0 overflow-hidden rounded border px-0.5 text-[10px] leading-4 transition ${selectedFont === font ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-slate-800/80 text-slate-200 hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white"}`}
                          >
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{font}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeMenu === "ANIMACAO" && (
              <div className="grid h-full min-h-[150px] grid-cols-3 gap-2">
                <section aria-label="Animações" className="flex min-w-0 flex-col border-r border-white/10 pr-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Animações</p>
                  <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-5 content-start gap-1">
                    {[
                      { id: "cascata", label: "Cascata" },
                      { id: "casanique", label: "Casanique" },
                      { id: "rolar", label: "Rolar" },
                      { id: "encarrilha", label: "Encarrilha" },
                      ...Array.from({ length: 21 }, (_, index) => ({ id: `em-breve-${index + 5}`, label: "" })),
                    ].map((animation) => {
                      const active = String(selectedInstanceConfig?.animationType || "nenhuma") === animation.id;
                      const disabled = !animation.label || !selectedInstanceWidgetId || !selectedInstanceConfig;
                      return (
                        <button
                          key={animation.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => onUpdateSelectedConfig({ animationType: animation.id })}
                          aria-pressed={active}
                          title={animation.label || "Animação ainda não criada"}
                          className={`flex min-h-7 min-w-0 items-center justify-center overflow-hidden rounded border px-1 py-1 text-[10px] leading-3 transition disabled:cursor-default disabled:opacity-20 ${active ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-slate-800/80 text-slate-200 hover:border-violet-400/60 hover:bg-violet-500/20"}`}
                        >
                          {animation.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section aria-label="Efeitos" className="flex min-w-0 flex-col border-r border-white/10 px-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Efeitos</p>
                </section>

                <section aria-label="Tempo e repetição da animação" className="flex min-w-0 flex-col gap-2 pl-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tempo da animação</p>
                  <label className="flex flex-col gap-1 text-[10px] text-slate-300">
                    Intervalo entre letras (ms)
                    <input
                      type="number" min="0" step="100"
                      disabled={!selectedInstanceWidgetId || !selectedInstanceConfig}
                      value={Number(selectedInstanceConfig?.animationDelayMs ?? 1000)}
                      onChange={(event) => onUpdateSelectedConfig({ animationDelayMs: Math.max(0, Number(event.target.value) || 0) })}
                      className="h-7 w-full rounded border border-white/10 bg-slate-950 px-2 text-xs text-white disabled:opacity-40"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-slate-300">
                    Duração de cada letra (ms)
                    <input
                      type="number" min="50" step="50"
                      disabled={!selectedInstanceWidgetId || !selectedInstanceConfig}
                      value={Number(selectedInstanceConfig?.animationDurationMs ?? 650)}
                      onChange={(event) => onUpdateSelectedConfig({ animationDurationMs: Math.max(50, Number(event.target.value) || 650) })}
                      className="h-7 w-full rounded border border-white/10 bg-slate-950 px-2 text-xs text-white disabled:opacity-40"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-300">
                    <input type="checkbox" disabled={!selectedInstanceWidgetId || !selectedInstanceConfig} checked={Boolean(selectedInstanceConfig?.animationInfinite)} onChange={(event) => onUpdateSelectedConfig({ animationInfinite: event.target.checked })} />
                    Repetir infinitamente
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-300">
                    <input type="checkbox" disabled={!selectedInstanceWidgetId || !selectedInstanceConfig} checked={Boolean(selectedInstanceConfig?.animationAlternate)} onChange={(event) => onUpdateSelectedConfig({ animationAlternate: event.target.checked })} />
                    Vai e volta (ex.: sobe e desce)
                  </label>
                  {!selectedInstanceWidgetId && <p className="text-[10px] text-slate-500">Selecione um elemento no canvas.</p>}
                </section>
              </div>
            )}
            {!["INICIO", "TEXTO", "ANIMACAO"].includes(activeMenu) && (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Este menu ficará vazio nesta etapa.
              </div>
            )}
          </div>
        </div>
      )}
    {reactHubPopupOpen && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-3" role="dialog" aria-modal="true" aria-label="Fila de vídeos do React Hub" onClick={() => setReactHubPopupOpen(false)}>
        <div className="flex h-[400px] w-[600px] max-h-[90vh] max-w-[95vw] flex-col rounded-lg border border-white/20 bg-slate-950 p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-white">React Hub — fila de vídeos</p><p className="text-[10px] text-slate-400">Clique em um link na coluna direita para carregar o vídeo.</p></div>
            <button type="button" onClick={() => setReactHubPopupOpen(false)} className="rounded border border-white/20 px-3 py-1 text-xs text-white">Fechar</button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2">
            <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded bg-black">
              {reactHubSelected && getReactHubEmbedUrl(getReactHubQueueUrl(reactHubSelected)) ? <iframe className="h-full min-h-[220px] w-full" src={getReactHubEmbedUrl(getReactHubQueueUrl(reactHubSelected))} title={"Vídeo de " + (reactHubSelected.author || "usuário")} allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <p className="p-4 text-xs text-slate-400">Selecione um link válido do YouTube na coluna ao lado.</p>}
            </div>
            <div className="min-h-0 overflow-y-auto rounded border border-white/10">
              <p className="sticky top-0 border-b border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200">Fila de vídeos</p>
              {reactHubArrivalQueue.map((item, index) => <button key={item.id || getReactHubQueueUrl(item) || index} type="button" onClick={() => setReactHubSelected(item)} title={getReactHubQueueUrl(item)} className={"block w-full border-b border-white/5 px-3 py-2 text-left text-xs hover:bg-white/10 " + (getReactHubQueueUrl(reactHubSelected || {}) === getReactHubQueueUrl(item) ? "bg-blue-950/70" : "")}><span className="break-all text-cyan-300 underline">{index + 1} - {item.author || "Espectador"} = {getReactHubQueueUrl(item)}</span></button>)}
              {!reactHubQueue.length && <p className="p-3 text-xs text-slate-500">A fila está vazia.</p>}
            </div>
          </div>
        </div>
      </div>
    )}
    </section>
  );
}
