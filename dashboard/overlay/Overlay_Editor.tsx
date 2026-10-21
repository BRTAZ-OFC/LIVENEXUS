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
  const panelHeight = `min(${Math.max(190, height)}px, 34vh)`;
  const style: CSSProperties = {
    height: isCollapsed ? "0px" : panelHeight,
    transition: "height 220ms ease",
  };

  const availableWidgets = catalog.filter((widget) => widget.implemented !== false);
  const selectedWidget = availableWidgets.find((widget) => widget.id === (selectedInstanceWidgetId || selectedWidgetId));
  const fragments = selectedWidget && isWidgetFragmentable(selectedWidget.id) ? getWidgetInternalElements(selectedWidget.id) : [];
  const hasSelectedInstance = Boolean(selectedWidget && selectedInstanceWidgetId === selectedWidget.id && selectedInstanceConfig);
  const editableConfig = selectedWidget
    ? { ...(selectedWidget.defaultConfig || {}), ...(hasSelectedInstance ? selectedInstanceConfig || {} : {}) }
    : {};
  const editableEntries = Object.entries(editableConfig).filter(([, value]) =>
    value === null || ["string", "number", "boolean"].includes(typeof value) || Array.isArray(value) || (typeof value === "object" && value !== null)
  );

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
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Widgets</p>
                  <div className="grid min-h-0 grid-cols-3 grid-rows-5 content-start gap-1 overflow-y-auto pr-1">
                    {availableWidgets.map((widget) => (
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
                      {!hasSelectedInstance && <p className="rounded border border-amber-400/30 bg-amber-400/5 p-1.5 text-[10px] text-amber-200">Configuração padrão da widget. Selecione uma instância dela no canvas para aplicar e salvar as alterações.</p>}
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
                      {editableEntries.length ? editableEntries.filter(([key]) => !(
                        selectedWidget.id === "manual-death-counter" && key === "deathCount" ||
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
                                <input type="text" value={value as string} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.value })} className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-slate-900 px-2 text-xs text-white outline-none focus:border-violet-400" />
                              </div>
                            ) : (
                              <input type="text" value={String(value ?? "")} disabled={!hasSelectedInstance} onChange={(event) => onUpdateSelectedConfig({ [key]: event.target.value })} className="h-7 w-full rounded border border-white/10 bg-slate-900 px-2 text-xs text-white outline-none focus:border-violet-400" />
                            )}
                          </label>
                        );
                      }) : editableEntries.length === 0 && !["manual-death-counter", "twitch-commands-list", "manual-pix-widget", "manual-timer", "manual-clock"].includes(selectedWidget.id) ? <p className="text-[11px] text-slate-500">Esta widget não declara campos manuais adicionais. Os dados exibidos são recebidos do runtime da plataforma.</p> : null}
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
            {!["INICIO", "TEXTO"].includes(activeMenu) && (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Este menu ficará vazio nesta etapa.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
