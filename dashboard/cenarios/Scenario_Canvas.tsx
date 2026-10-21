import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, Check, LoaderCircle, Save, Trash2 } from "lucide-react";
import HorizontalMenu from "../components/HorizontalMenu";
import OverlayWidgetElementRenderer from "../overlay/Overlay_WidgetElementRenderer";
import { TWITCH_WIDGETS_CATALOG } from "../widget/Widget_twitchWidgetsCatalog";

type JsonObject = Record<string, unknown>;
type ScenarioInstance = {
  id?: string;
  widgetId?: string;
  elementKey?: string;
  isFullWidget?: boolean;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  visible?: boolean;
  config?: JsonObject;
};
type CanvasBackground = {
  type?: string;
  color?: string;
  gradient?: string;
  image?: string;
  opacity?: number;
};
type ScenarioConfig = {
  id: string;
  name: string;
  visualizerSize: { width: number; height: number };
  instances: ScenarioInstance[];
  background: CanvasBackground;
};
type ScenarioRecord = Partial<ScenarioConfig> & {
  id?: string;
  user_id?: string;
  __rowKey?: string;
  settings?: unknown;
  config?: unknown;
  data?: unknown;
};
type WidgetDefinition = {
  id: string;
  name: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultConfig?: JsonObject;
  implemented?: boolean;
};
type DragState = {
  instanceId: string;
  mode: "move" | "resize";
  pointerX: number;
  pointerY: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const catalog = TWITCH_WIDGETS_CATALOG as unknown as WidgetDefinition[];

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sourceFor(row: ScenarioRecord): JsonObject {
  if (isObject(row.settings) && Object.keys(row.settings).length) return row.settings;
  if (isObject(row.config) && Object.keys(row.config).length) return row.config;
  if (isObject(row.data) && Object.keys(row.data).length) return row.data;
  return row as JsonObject;
}

function normalizeScenario(row: ScenarioRecord): ScenarioConfig {
  const source = sourceFor(row);
  const backgroundSource = isObject(source.background) ? source.background : {};
  return {
    id: String(row.id ?? source.id ?? ""),
    name: String(source.name ?? row.name ?? "Cenário"),
    visualizerSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    instances: Array.isArray(source.instances) ? source.instances as ScenarioInstance[] : [],
    background: {
      type: String(backgroundSource.type ?? "transparent"),
      color: typeof backgroundSource.color === "string" ? backgroundSource.color : "#07111f",
      gradient: typeof backgroundSource.gradient === "string" ? backgroundSource.gradient : "linear-gradient(135deg, #07111f, #15112c)",
      image: typeof backgroundSource.image === "string" ? backgroundSource.image : "",
      opacity: Math.max(0, Math.min(100, Number(backgroundSource.opacity ?? 100))),
    },
  };
}

function backgroundStyle(background: CanvasBackground): CSSProperties {
  if (background.type === "solid") return { backgroundColor: background.color || "#07111f" };
  if (background.type === "gradient") return { backgroundImage: background.gradient || "linear-gradient(135deg, #07111f, #15112c)" };
  if (background.type === "image" && background.image) {
    return {
      backgroundImage: "url(\"" + background.image.replace(/"/g, "%22") + "\")",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return {
    backgroundColor: "#07111f",
    backgroundImage: "linear-gradient(45deg, rgba(255,255,255,.045) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,.045) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,.045) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.045) 75%)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
  };
}

function messageFrom(payload: unknown, fallback: string) {
  return isObject(payload) && typeof payload.message === "string" ? payload.message : fallback;
}

export default function ScenarioCanvas({
  scenarioId,
  onBack,
}: {
  scenarioId: string;
  onBack: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [scale, setScale] = useState(1);
  const [scenario, setScenario] = useState<ScenarioConfig | null>(null);
  const [rowKey, setRowKey] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadScenario() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/cenarios", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json() as { ok?: boolean; items?: ScenarioRecord[]; error?: string };
        if (!response.ok || !payload.ok || !Array.isArray(payload.items)) {
          throw new Error(payload.error || "Não foi possível carregar os cenários.");
        }
        const row = payload.items.find((item) => String(item.id ?? "") === scenarioId);
        if (!row) throw new Error("Cenário não encontrado para esta conta.");
        if (!cancelled) {
          setScenario(normalizeScenario(row));
          setRowKey(String(row.__rowKey ?? ""));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Erro ao carregar o cenário.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadScenario();
    return () => { cancelled = true; };
  }, [scenarioId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateScale = () => setScale(Math.max(0.01, viewport.clientWidth / CANVAS_WIDTH));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const canvasBackground = useMemo(
    () => backgroundStyle(scenario?.background ?? { type: "transparent" }),
    [scenario?.background],
  );

  function addWidget(definition: WidgetDefinition) {
    if (!scenario) return;
    const index = scenario.instances.length;
    const width = Math.min(CANVAS_WIDTH, definition.defaultWidth || 320);
    const height = Math.min(CANVAS_HEIGHT, definition.defaultHeight || 120);
    const id = "scenario-widget-" + Date.now() + "-" + index;
    const instance: ScenarioInstance = {
      id,
      widgetId: definition.id,
      elementKey: "full_widget",
      isFullWidget: true,
      name: definition.name,
      x: Math.max(0, Math.min(CANVAS_WIDTH - width, 48 + (index % 8) * 32)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT - height, 48 + (index % 8) * 28)),
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: { ...(definition.defaultConfig || {}) },
    };
    setScenario((current) => current ? { ...current, instances: [...current.instances, instance] } : current);
    setSelectedId(id);
    setNotice("");
  }

  function updateInstance(instanceId: string, patch: Partial<ScenarioInstance>) {
    setScenario((current) => current ? ({
      ...current,
      instances: current.instances.map((item, index) =>
        String(item.id ?? (String(item.widgetId) + "-" + index)) === instanceId ? { ...item, ...patch } : item
      ),
    }) : current);
    setNotice("");
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>, instance: ScenarioInstance, index: number, mode: "move" | "resize") {
    const instanceId = String(instance.id ?? (String(instance.widgetId) + "-" + index));
    setSelectedId(instanceId);
    if (mode === "move" && (event.target as HTMLElement).closest("button,input,textarea,select,a,[data-no-widget-drag]")) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      instanceId,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: Number(instance.x) || 0,
      top: Number(instance.y) || 0,
      width: Math.max(1, Number(instance.width) || 320),
      height: Math.max(1, Number(instance.height) || 120),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    const maxZ = Math.max(0, ...(scenario?.instances ?? []).map((item) => Number(item.zIndex) || 0));
    updateInstance(instanceId, { zIndex: maxZ + 1 });
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !(event.buttons & 1)) return;
    const dx = (event.clientX - drag.pointerX) / scale;
    const dy = (event.clientY - drag.pointerY) / scale;
    if (drag.mode === "move") {
      updateInstance(drag.instanceId, {
        x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - drag.width, drag.left + dx))),
        y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - drag.height, drag.top + dy))),
      });
      return;
    }
    updateInstance(drag.instanceId, {
      width: Math.round(Math.max(40, Math.min(CANVAS_WIDTH - drag.left, drag.width + dx))),
      height: Math.round(Math.max(24, Math.min(CANVAS_HEIGHT - drag.top, drag.height + dy))),
    });
  }

  async function saveScenario() {
    if (!scenario || !rowKey || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/cenarios", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          rowKey,
          record: {
            id: scenario.id,
            name: scenario.name,
            visualizerSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
            instances: scenario.instances,
            background: scenario.background,
          },
        }),
      });
      const payload = await response.json() as { ok?: boolean; item?: ScenarioRecord; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Não foi possível salvar o cenário.");
      if (payload.item?.__rowKey) setRowKey(payload.item.__rowKey);
      setNotice("Cenário salvo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar o cenário.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> Carregando canvas 1080p...</div>;
  }

  if (!scenario) {
    return (
      <section className="space-y-4 p-4 sm:p-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><ArrowLeft size={14} /> Voltar aos cenários</button>
        <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-950/20 p-3 text-sm text-rose-200">{error || "Cenário indisponível."}</p>
      </section>
    );
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-300/10 pb-4">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={14} /> Voltar aos cenários</button>
          <h1 className="truncate text-xl font-extrabold text-white sm:text-2xl">{scenario.name}</h1>
          <p className="mt-1 text-[11px] text-slate-400">Canvas independente · resolução lógica 1920 × 1080 (Full HD)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300">
            Fundo
            <select
              value={scenario.background.type || "transparent"}
              onChange={(event) => setScenario((current) => current ? { ...current, background: { ...current.background, type: event.target.value } } : current)}
              className="max-w-28 bg-transparent text-slate-100 outline-none"
            >
              <option value="transparent">Transparente</option>
              <option value="solid">Cor sólida</option>
              <option value="gradient">Gradiente</option>
              <option value="image">Imagem</option>
            </select>
          </label>
          {scenario.background.type === "solid" && (
            <label title="Cor do fundo" className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-2 text-[11px] text-slate-300">
              <input aria-label="Cor do fundo" type="color" value={scenario.background.color || "#07111f"} onChange={(event) => setScenario((current) => current ? { ...current, background: { ...current.background, color: event.target.value } } : current)} className="h-6 w-7 cursor-pointer bg-transparent" />
            </label>
          )}
          {scenario.background.type === "image" && (
            <input aria-label="URL da imagem de fundo" value={scenario.background.image || ""} onChange={(event) => setScenario((current) => current ? { ...current, background: { ...current.background, image: event.target.value } } : current)} placeholder="URL da imagem" className="w-36 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-[11px] text-white" />
          )}
          <button type="button" onClick={() => { if (selectedId) { setScenario((current) => current ? { ...current, instances: current.instances.filter((item, index) => String(item.id ?? (String(item.widgetId) + "-" + index)) !== selectedId) } : current); setSelectedId(null); } }} disabled={!selectedId} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"><Trash2 size={14} /> Excluir selecionado</button>
          <button type="button" onClick={() => void saveScenario()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-50">
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando..." : "Salvar cenário"}
          </button>
        </div>
      </header>

      <div className="w-full min-w-0">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Adicionar elemento ao cenário</p>
        <HorizontalMenu ariaLabel="Widgets do cenário" className="w-full">
          {catalog.filter((widget) => widget.implemented !== false).map((widget) => (
            <button key={widget.id} type="button" onClick={() => addWidget(widget)} title={"Adicionar " + widget.name} className="shrink-0 rounded-md border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/10 hover:text-white">
              {widget.name}
            </button>
          ))}
        </HorizontalMenu>
      </div>

      {notice && <p role="status" className="inline-flex items-center gap-2 self-start rounded-lg border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200"><Check size={13} /> {notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">{error}</p>}

      <div className="w-full min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>Pré-visualização responsiva · proporção 16:9</span>
          <span>{CANVAS_WIDTH} × {CANVAS_HEIGHT} px</span>
        </div>
        <div ref={viewportRef} className="relative aspect-video w-full overflow-hidden border border-cyan-300/20 bg-[#030712] shadow-[0_12px_48px_rgba(0,0,0,0.35)]" aria-label="Canvas do cenário 1920 por 1080">
          <div className="absolute left-0 top-0 origin-top-left overflow-hidden" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: "scale(" + scale + ")", transformOrigin: "top left" }}>
            <div className="absolute inset-0" style={canvasBackground} />
            {scenario.instances.filter((instance) => instance.visible !== false).slice().sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0)).map((instance, index) => {
              const definition = catalog.find((entry) => entry.id === instance.widgetId);
              if (!definition) return null;
              const instanceId = String(instance.id ?? (String(instance.widgetId) + "-" + index));
              const isSelected = selectedId === instanceId;
              const width = Math.max(40, Number(instance.width) || definition.defaultWidth || 320);
              const height = Math.max(24, Number(instance.height) || definition.defaultHeight || 120);
              const widgetConfig = { ...(definition.defaultConfig || {}), ...(instance.config || {}) };
              const transform = [
                widgetConfig.rotation ? "rotate(" + Number(widgetConfig.rotation) + "deg)" : "",
                widgetConfig.flipH ? "scaleX(-1)" : "",
                widgetConfig.flipV ? "scaleY(-1)" : "",
              ].filter(Boolean).join(" ");
              const style: CSSProperties = {
                position: "absolute",
                left: Math.max(0, Number(instance.x) || 0),
                top: Math.max(0, Number(instance.y) || 0),
                width,
                height,
                zIndex: Number(instance.zIndex) || index + 1,
                overflow: "visible",
                opacity: Math.max(0, Math.min(100, Number(widgetConfig.opacity ?? 100))) / 100,
                transform: transform || undefined,
                outline: isSelected ? "2px solid #22d3ee" : "none",
                cursor: "move",
                touchAction: "none",
              };
              return (
                <div
                  key={instanceId}
                  style={style}
                  onPointerDown={(event) => beginDrag(event, instance, index, "move")}
                  onPointerMove={moveDrag}
                  onPointerUp={() => { dragRef.current = null; }}
                  onPointerCancel={() => { dragRef.current = null; }}
                >
                  <div className="h-full w-full overflow-hidden">
                    <OverlayWidgetElementRenderer
                      widgetId={instance.widgetId}
                      elementKey={instance.elementKey || "full_widget"}
                      isFullWidget={instance.isFullWidget !== false}
                      config={widgetConfig}
                      isEditing={false}
                      onUpdateConfig={() => undefined}
                      onFinishEditing={() => undefined}
                      instanceId={instance.id}
                      instanceName={instance.name}
                    />
                  </div>
                  {isSelected && (
                    <div
                      role="separator"
                      aria-label={"Redimensionar " + (instance.name || definition.name)}
                      title="Arraste para redimensionar"
                      className="absolute bottom-0 right-0 z-50 h-4 w-4 cursor-se-resize border border-white bg-cyan-400"
                      style={{ touchAction: "none" }}
                      onPointerDown={(event) => beginDrag(event, instance, index, "resize")}
                    />
                  )}
                </div>
              );
            })}
            {scenario.instances.filter((instance) => instance.visible !== false).length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/10">
                <div className="rounded-xl border border-cyan-300/20 bg-slate-950/70 px-8 py-6 text-center">
                  <p className="text-base font-bold text-white">Canvas 1080p vazio</p>
                  <p className="mt-2 text-sm text-slate-400">Use a barra acima para adicionar widgets.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">As posições são calculadas em 1920 × 1080. A visualização diminui ou aumenta para caber no painel, sem alterar a resolução de trabalho.</p>
      </div>
    </section>
  );
}
