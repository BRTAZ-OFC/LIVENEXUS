import { useMemo, useState } from "react";

type WidgetDefinition = {
  id: string;
  name: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultConfig?: Record<string, unknown>;
  category?: string;
  implemented?: boolean;
};
type Instance = {
  id?: string;
  widgetId?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  visible?: boolean;
  config?: Record<string, unknown>;
};
type GridSettings = {
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  showSafeAreas?: boolean;
  verticalGuides?: { id: string; x: number }[];
  horizontalGuides?: { id: string; y: number }[];
};
type Background = {
  type?: string;
  color?: string;
  gradient?: string;
  image?: string;
  opacity?: number;
  showBorder?: boolean;
  borderRadius?: string;
};
type Props = {
  catalog: WidgetDefinition[];
  instances: Instance[];
  selectedInstanceId: string | null;
  onSelectInstance: (id: string | null) => void;
  onAddWidget: (widget: WidgetDefinition) => void;
  onUpdateInstance: (id: string, patch: Partial<Instance>) => void;
  onDeleteInstance: (id: string) => void;
  gridSettings: GridSettings;
  onUpdateGridSettings: (patch: Partial<GridSettings>) => void;
  background: Background;
  onUpdateBackground: (patch: Partial<Background>) => void;
};

const TABS = [
  { id: "widget", label: "Widget" },
  { id: "config", label: "Config" },
  { id: "effects", label: "Efeitos" },
  { id: "library", label: "Biblioteca" },
  { id: "layers", label: "Camadas" },
  { id: "guides", label: "Guias" },
  { id: "background", label: "Fundos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const inputClass = "w-full rounded border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-violet-400";
const labelClass = "mb-1 block text-[10px] uppercase tracking-wide text-slate-400";

export default function OverlayEditorSidebar(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("widget");
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const selected = props.instances.find((item, index) =>
    (item.id || `${item.widgetId}-${index}`) === props.selectedInstanceId
  );
  const selectedDefinition = props.catalog.find(item => item.id === selected?.widgetId);
  const widgetOptions = useMemo(
    () => props.catalog.filter(item => item.implemented !== false),
    [props.catalog],
  );
  const patchSelected = (patch: Partial<Instance>) => {
    if (selected?.id) props.onUpdateInstance(selected.id, patch);
  };
  const patchConfig = (patch: Record<string, unknown>) => {
    if (!selected?.id) return;
    props.onUpdateInstance(selected.id, { config: { ...(selected.config || {}), ...patch } });
  };
  const field = (label: string, value: unknown, onChange: (value: string) => void, type = "text") => (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <input className={inputClass} type={type} value={String(value ?? "")} onChange={event => onChange(event.target.value)} />
    </label>
  );

  return (
    <aside className="absolute right-2 top-2 bottom-2 z-[80] flex w-[340px] max-w-[calc(100%_-_16px)] min-w-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-[.18em] text-violet-300">Opção</p>
          <h3 className="text-sm font-semibold">Funções encontradas</h3>
        </div>
        <button type="button" onClick={() => setShowWidgetPicker(value => !value)} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10">
          {showWidgetPicker ? "Fechar seleção" : "Selecionar widget"}
        </button>
      </div>
      <nav aria-label="Ferramentas do editor de overlay" className="grid shrink-0 grid-cols-4 gap-1 border-b border-white/10 p-2">
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}
            className={`rounded-md border px-2 py-2 text-[10px] transition ${activeTab === tab.id ? "border-violet-400/70 bg-violet-500/20 text-white" : "border-white/10 bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>
            {tab.label}
          </button>
        ))}
      </nav>
      {showWidgetPicker && (
        <div className="shrink-0 border-b border-white/10 bg-slate-900/90 p-2">
          <p className="mb-2 text-[10px] text-slate-400">Escolha uma widget para adicionar ao canvas.</p>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {widgetOptions.map(widget => (
              <button key={widget.id} type="button" onClick={() => { props.onAddWidget(widget); setShowWidgetPicker(false); setActiveTab("widget"); }}
                className="block w-full rounded border border-white/5 px-2 py-1.5 text-left text-xs hover:border-violet-400/50 hover:bg-violet-500/10">
                {widget.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeTab === "widget" && (
          !selected || !selectedDefinition ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <div className="text-2xl text-slate-600">＋</div>
              <p className="text-xs font-medium text-slate-300">Nenhuma widget selecionada</p>
              <p className="max-w-52 text-[10px] leading-relaxed text-slate-500">Esta aba fica limpa até você escolher uma widget no submenu.</p>
              <button type="button" onClick={() => setShowWidgetPicker(true)} className="rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500">Abrir widgets</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div><p className="text-[10px] uppercase tracking-wide text-violet-300">Widget selecionada</p><h4 className="mt-1 text-sm font-semibold">{selectedDefinition.name}</h4></div>
              <div className="rounded-lg border border-white/10 bg-slate-900/70 p-2">
                <p className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Componentes</p>
                <p className="text-[10px] leading-relaxed text-slate-400">A widget completa está selecionada. Selecione a camada no canvas para editar suas propriedades.</p>
                <button type="button" onClick={() => setActiveTab("config")} className="mt-2 rounded border border-violet-400/30 px-2 py-1.5 text-[10px] text-violet-200 hover:bg-violet-500/10">Configurar widget</button>
              </div>
            </div>
          )
        )}
        {activeTab === "config" && (
          selected && selectedDefinition ? <div className="space-y-3">
            <h4 className="text-xs font-semibold">{selected.name || selectedDefinition.name}</h4>
            <div className="grid grid-cols-2 gap-2">
              {field("Posição X", selected.x ?? 0, value => patchSelected({ x: Number(value) || 0 }), "number")}
              {field("Posição Y", selected.y ?? 0, value => patchSelected({ y: Number(value) || 0 }), "number")}
              {field("Largura", selected.width ?? selectedDefinition.defaultWidth ?? 280, value => patchSelected({ width: Math.max(40, Number(value) || 40) }), "number")}
              {field("Altura", selected.height ?? selectedDefinition.defaultHeight ?? 120, value => patchSelected({ height: Math.max(20, Number(value) || 20) }), "number")}
            </div>
            {field("Nome da camada", selected.name || selectedDefinition.name, value => patchSelected({ name: value }))}
          </div> : <p className="text-xs text-slate-500">Selecione uma widget no canvas para configurar suas propriedades.</p>
        )}
        {activeTab === "effects" && (
          selected ? <div className="space-y-3">
            <h4 className="text-xs font-semibold">Efeitos visuais</h4>
            {field("Opacidade (%)", selected.config?.opacity ?? 100, value => patchConfig({ opacity: Math.max(0, Math.min(100, Number(value) || 0)) }), "number")}
            {field("Rotação (graus)", selected.config?.rotation ?? 0, value => patchConfig({ rotation: Number(value) || 0 }), "number")}
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(selected.config?.flipH)} onChange={event => patchConfig({ flipH: event.target.checked })}/> Espelhar horizontalmente</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(selected.config?.flipV)} onChange={event => patchConfig({ flipV: event.target.checked })}/> Espelhar verticalmente</label>
          </div> : <p className="text-xs text-slate-500">Selecione uma widget para ajustar efeitos.</p>
        )}
        {activeTab === "library" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold">Biblioteca</h4>
            {field("Pesquisar widgets", libraryQuery, setLibraryQuery)}
            <p className="text-[10px] text-slate-500">Itens do catálogo que correspondem à pesquisa.</p>
            <div className="space-y-1">
              {widgetOptions.filter(widget => widget.name.toLowerCase().includes(libraryQuery.toLowerCase())).map(widget => (
                <button key={widget.id} type="button" onClick={() => props.onAddWidget(widget)} className="w-full rounded border border-white/10 px-2 py-2 text-left text-xs hover:bg-white/5">{widget.name}<span className="float-right text-violet-300">＋</span></button>
              ))}
            </div>
          </div>
        )}
        {activeTab === "layers" && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold">Camadas</h4>
            {props.instances.length === 0 && <p className="text-xs text-slate-500">Nenhuma camada no canvas.</p>}
            {[...props.instances].map((item, index) => {
              const id = item.id || `${item.widgetId}-${index}`;
              const definition = props.catalog.find(widget => widget.id === item.widgetId);
              return <div key={id} className={`flex items-center gap-1 rounded border p-1.5 ${id === props.selectedInstanceId ? "border-violet-400/60 bg-violet-500/10" : "border-white/10"}`}>
                <button type="button" onClick={() => props.onSelectInstance(id)} className="min-w-0 flex-1 truncate text-left text-[10px]">{item.name || definition?.name || item.widgetId}</button>
                <button type="button" title={item.visible === false ? "Mostrar camada" : "Ocultar camada"} onClick={() => item.id && props.onUpdateInstance(item.id, { visible: item.visible === false })} className="px-1 text-[10px] text-slate-300">{item.visible === false ? "Mostrar" : "Ocultar"}</button>
                <button type="button" title="Excluir camada" onClick={() => item.id && props.onDeleteInstance(item.id)} className="px-1 text-[10px] text-rose-300">Excluir</button>
              </div>;
            })}
          </div>
        )}
        {activeTab === "guides" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold">Guias e alinhamento</h4>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(props.gridSettings.showGrid)} onChange={event => props.onUpdateGridSettings({ showGrid: event.target.checked })}/> Exibir grade</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(props.gridSettings.snapToGrid)} onChange={event => props.onUpdateGridSettings({ snapToGrid: event.target.checked })}/> Alinhamento magnético à grade</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(props.gridSettings.showSafeAreas)} onChange={event => props.onUpdateGridSettings({ showSafeAreas: event.target.checked })}/> Área segura</label>
            {field("Tamanho da grade", props.gridSettings.gridSize ?? 20, value => props.onUpdateGridSettings({ gridSize: Math.max(5, Number(value) || 20) }), "number")}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => props.onUpdateGridSettings({ verticalGuides: [...(props.gridSettings.verticalGuides || []), { id: `v-${Date.now()}`, x: 100 }] })} className="rounded border border-white/10 px-2 py-2 text-[10px]">＋ Guia vertical</button>
              <button type="button" onClick={() => props.onUpdateGridSettings({ horizontalGuides: [...(props.gridSettings.horizontalGuides || []), { id: `h-${Date.now()}`, y: 100 }] })} className="rounded border border-white/10 px-2 py-2 text-[10px]">＋ Guia horizontal</button>
            </div>
            <button type="button" onClick={() => props.onUpdateGridSettings({ verticalGuides: [], horizontalGuides: [] })} className="w-full rounded border border-white/10 px-2 py-2 text-[10px] text-slate-300">Limpar guias</button>
          </div>
        )}
        {activeTab === "background" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold">Fundo do canvas</h4>
            <label className="block"><span className={labelClass}>Tipo de fundo</span><select className={inputClass} value={props.background.type || "transparent"} onChange={event => props.onUpdateBackground({ type: event.target.value })}><option value="transparent">Transparente</option><option value="solid">Cor sólida</option><option value="gradient">Gradiente</option><option value="image">Imagem por URL</option></select></label>
            {props.background.type === "solid" && <label className="block"><span className={labelClass}>Cor</span><input className={inputClass} type="color" value={props.background.color || "#020617"} onChange={event => props.onUpdateBackground({ color: event.target.value })}/></label>}
            {props.background.type === "gradient" && field("CSS do gradiente", props.background.gradient || "linear-gradient(135deg, #1e1b4b, #311042)", value => props.onUpdateBackground({ gradient: value }))}
            {props.background.type === "image" && field("URL da imagem", props.background.image || "", value => props.onUpdateBackground({ image: value }))}
            {field("Opacidade (%)", props.background.opacity ?? 100, value => props.onUpdateBackground({ opacity: Math.max(0, Math.min(100, Number(value) || 0)) }), "number")}
          </div>
        )}
      </div>
    </aside>
  );
}
