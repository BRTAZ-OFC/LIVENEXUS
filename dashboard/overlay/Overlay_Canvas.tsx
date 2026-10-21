import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { Save, Trash2 } from "lucide-react";
import { TWITCH_WIDGETS_CATALOG } from "../widget/Widget_twitchWidgetsCatalog";
import OverlayWidgetElementRenderer from "./Overlay_WidgetElementRenderer";
import HorizontalMenu from "../components/HorizontalMenu";
import Overlay_Editor from "./Overlay_Editor";

type JsonObject = Record<string, unknown>;
type CanvasInstance = {
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
type WidgetDefinition = {
  id: string;
  name: string;
  component: ComponentType<{ config?: JsonObject }>;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultConfig?: JsonObject;
  category?: string;
  implemented?: boolean;
};
type CanvasGridSettings = {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  showSafeAreas: boolean;
  verticalGuides: { id: string; x: number }[];
  horizontalGuides: { id: string; y: number }[];
};
type CanvasBackground = {
  type?: string;
  color?: string;
  gradient?: string;
  image?: string;
  opacity?: number;
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  showBorder?: boolean;
  borderRadius?: string;
};
type CanvasConfig = {
  id?: string;
  name?: string;
  visualizerSize?: { width?: number; height?: number };
  instances?: CanvasInstance[];
  background?: CanvasBackground;
};
type OverlayRow = {
  id?: string;
  name?: string;
  settings?: unknown;
  config?: unknown;
  data?: unknown;
  user_id?: string;
  updated_at?: string;
};

const catalog = TWITCH_WIDGETS_CATALOG as unknown as WidgetDefinition[];
const DEFAULT_SIZE = { width: 800, height: 480 };
const EMPTY_BACKGROUND: CanvasBackground = { type: "transparent", opacity: 100 };

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getCanvasConfig(row: OverlayRow): CanvasConfig {
  const source =
    isObject(row.settings) && Object.keys(row.settings).length
      ? row.settings
      : isObject(row.config) && Object.keys(row.config).length
        ? row.config
        : isObject(row.data) && Object.keys(row.data).length
          ? row.data
          : (row as unknown as JsonObject);
  return {
    ...source,
    ...(typeof row.id === "string" ? { id: row.id } : {}),
    name: String(source["name"] ?? row.name ?? "Overlay"),
    visualizerSize: isObject(source["visualizerSize"])
      ? (source["visualizerSize"] as CanvasConfig["visualizerSize"])
      : DEFAULT_SIZE,
    instances: Array.isArray(source["instances"]) ? (source["instances"] as CanvasInstance[]) : [],
    background: isObject(source["background"])
      ? (source["background"] as CanvasBackground)
      : EMPTY_BACKGROUND,
  };
}

function backgroundStyle(background: CanvasBackground): CSSProperties {
  const style: CSSProperties = {};
  if (background.type === "solid") {
    style.backgroundColor = background.color || "#020617";
  } else if (background.type === "gradient") {
    style.backgroundImage =
      background.gradient || "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)";
  } else if (background.type === "image" && background.image) {
    style.backgroundImage = `url("${background.image.replace(/"/g, "%22")}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
  } else {
    style.backgroundImage = [
      "linear-gradient(45deg, rgba(255,255,255,.04) 25%, transparent 25%)",
      "linear-gradient(-45deg, rgba(255,255,255,.04) 25%, transparent 25%)",
      "linear-gradient(45deg, transparent 75%, rgba(255,255,255,.04) 75%)",
      "linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.04) 75%)",
    ].join(",");
    style.backgroundSize = "20px 20px";
    style.backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0";
    style.backgroundColor = "#030712";
  }
  style.opacity = Math.max(0, Math.min(100, Number(background.opacity ?? 100))) / 100;
  const filters: string[] = [];
  if (Number(background.blur) > 0) filters.push(`blur(${Number(background.blur)}px)`);
  if (background.brightness != null && Number(background.brightness) !== 100)
    filters.push(`brightness(${Number(background.brightness)}%)`);
  if (background.contrast != null && Number(background.contrast) !== 100)
    filters.push(`contrast(${Number(background.contrast)}%)`);
  if (background.saturate != null && Number(background.saturate) !== 100)
    filters.push(`saturate(${Number(background.saturate)}%)`);
  if (filters.length) style.filter = filters.join(" ");
  return style;
}

/**
 * Somente o canvas de Overlay do BACKUP01, adaptado ao catálogo e ao multichat do LIVENEXUS.
 * Mantém apenas o canvas, com seleção, arraste e redimensionamento direto das widgets.
 */
export default function OverlayCanvas() {
  useEffect(() => {
  }, []);

  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [gridSettings, setGridSettings] = useState<CanvasGridSettings>({
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,
    showSafeAreas: false,
    verticalGuides: [],
    horizontalGuides: [],
  });
  const widgetPointer = useRef<{
    instanceId: string;
    mode: "move" | "resize";
    x: number;
    y: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [config, setConfig] = useState<CanvasConfig>({
    name: "Overlay",
    visualizerSize: DEFAULT_SIZE,
    instances: [],
    background: EMPTY_BACKGROUND,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overlays, setOverlays] = useState<OverlayRow[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOverlay() {
      setLoading(true);
      setError("");
      try {
        const headers: Record<string, string> = {};
        const token = sessionStorage.getItem("livenexus_token");
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch("/api/overlay/canvas", {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok || !Array.isArray(payload.overlays)) {
          throw new Error(payload.message || "Não foi possível carregar as overlays.");
        }
        const rows = payload.overlays as OverlayRow[];
        const requestedScenarioId = sessionStorage.getItem("livenexus_active_scenario_id");
        const requestedScenario = requestedScenarioId
          ? rows.find((row) => String(row.id ?? "") === requestedScenarioId)
          : undefined;
        const firstConfigured =
          requestedScenario ||
          rows.find((row) => getCanvasConfig(row).instances.length > 0) ||
          rows[0];
        if (!cancelled) setOverlays(rows);
        if (!cancelled && firstConfigured) {
          setConfig(getCanvasConfig(firstConfigured));
          setActiveOverlayId(String(firstConfigured.id ?? "") || null);
          if (requestedScenario) sessionStorage.removeItem("livenexus_active_scenario_id");
        } else if (!cancelled) {
          setActiveOverlayId(null);
          setConfig({ name: "Overlay", visualizerSize: DEFAULT_SIZE, instances: [], background: EMPTY_BACKGROUND });
        }
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Erro ao carregar o canvas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOverlay();
    return () => {
      cancelled = true;
    };
  }, []);

  const size = useMemo(
    () => ({
      width: Math.max(1, Number(config.visualizerSize?.width) || DEFAULT_SIZE.width),
      height: Math.max(1, Number(config.visualizerSize?.height) || DEFAULT_SIZE.height),
    }),
    [config.visualizerSize],
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const updateScale = () => {
      const widthScale = frame.clientWidth / size.width;
      const heightScale = frame.clientHeight / size.height;
      setScale(Math.max(0.01, Math.min(widthScale, heightScale)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [size.width, size.height]);

  useEffect(() => {
    function handleCanvasKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        !selectedInstanceId ||
        target?.closest("input,textarea,select,button,a,[contenteditable='true'],[role='textbox']")
      ) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        setConfig((current) => ({
          ...current,
          instances: (current.instances || []).filter(
            (item, index) =>
              (item.id || `${item.widgetId}-${index}`) !== selectedInstanceId,
          ),
        }));
        setSelectedInstanceId(null);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const selected = (config.instances || []).find(
        (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedInstanceId,
      );
      if (!selected) return;

      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = -step;
      else if (event.key === "ArrowDown") dy = step;
      else return;

      event.preventDefault();
      setConfig((current) => ({
        ...current,
        instances: (current.instances || []).map((item, index) => {
          if ((item.id || `${item.widgetId}-${index}`) !== selectedInstanceId) return item;
          const width = Math.max(1, Number(item.width) || 280);
          const height = Math.max(1, Number(item.height) || 120);
          return {
            ...item,
            x: Math.max(0, Math.min(size.width - width, (Number(item.x) || 0) + dx)),
            y: Math.max(0, Math.min(size.height - height, (Number(item.y) || 0) + dy)),
          };
        }),
      }));
    }

    window.addEventListener("keydown", handleCanvasKeyDown);
    return () => window.removeEventListener("keydown", handleCanvasKeyDown);
  }, [config.instances, selectedInstanceId, size.width, size.height]);

  function selectOverlay(id: string) {
    const row = overlays.find((item) => String(item.id ?? "") === id);
    if (!row) return;
    setConfig(getCanvasConfig(row));
    setActiveOverlayId(id);
    setSelectedInstanceId(null);
    setError("");
    setNotice("");
  }

  function makeOverlayId(name: string) {
    return name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function makeUniqueWidgetId(name: string, instances: CanvasInstance[]) {
    const base = makeOverlayId(name) || "widget";
    let candidate = base;
    let suffix = 2;
    while (instances.some((instance) => instance.id === candidate)) candidate = base + "-" + suffix++;
    return candidate;
  }
  async function saveOverlay() {
    const name = String(config.name || config.instances?.[0]?.name || "").trim();
    const generatedId = makeOverlayId(name);
    if (!name || !generatedId || !config.instances?.length) {
      setError("Adicione uma widget ao canvas antes de salvar.");
      return;
    }
    if (!activeOverlayId && overlays.some((row) => String(row.id ?? "") === generatedId)) {
      setError("Já existe uma overlay com esse nome/ID. Escolha outro nome ou selecione a overlay existente.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/overlay/canvas", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ overlay: { ...config, id: generatedId, name }, currentId: activeOverlayId, createNew: !activeOverlayId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.overlay) throw new Error(payload.message || "Não foi possível salvar a overlay.");
      const saved = payload.overlay as OverlayRow;
      const savedId = String(saved.id ?? activeOverlayId ?? generatedId);
      setOverlays((current) => {
        const withoutPreviousId = current.filter((row) => String(row.id ?? "") !== savedId);
        return [...withoutPreviousId, saved];
      });
      // Após salvar, mantém a overlay na lista e libera um canvas vazio para criar outra.
      setActiveOverlayId(null);
      setSelectedInstanceId(null);
      setConfig({ name: "Nova Overlay", visualizerSize: size, instances: [], background: EMPTY_BACKGROUND });
      setNotice(`Overlay "${name}" salva. Canvas limpo para criar outra overlay.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao salvar a overlay.");
    } finally { setSaving(false); }
  }

  async function deleteOverlay() {
    if (!activeOverlayId) { setError("Selecione uma overlay salva para excluir."); return; }
    if (!window.confirm("Excluir permanentemente a overlay \"" + String(config.name || activeOverlayId) + "\"?")) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/overlay/canvas", {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store", body: JSON.stringify({ id: activeOverlayId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Não foi possível excluir a overlay.");
      setOverlays((current) => current.filter((row) => String(row.id ?? "") !== activeOverlayId));
      setActiveOverlayId(null);
      setConfig({ name: "Nova Overlay", visualizerSize: DEFAULT_SIZE, instances: [], background: EMPTY_BACKGROUND });
      setSelectedInstanceId(null); setNotice("Overlay excluída do JSON.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao excluir a overlay.");
    } finally { setSaving(false); }
  }

  function addWidget(definition: WidgetDefinition) {
    const existing = config.instances || [];
    const index = existing.length;
    const width = definition.defaultWidth || 280;
    const height = definition.defaultHeight || 120;
    const nextInstance: CanvasInstance = {
      id: makeUniqueWidgetId(definition.name, existing),
      widgetId: definition.id,
      elementKey: "full_widget",
      isFullWidget: true,
      name: definition.name,
      x: Math.max(0, Math.min(size.width - width, 24 + (index % 5) * 28)),
      y: Math.max(0, Math.min(size.height - height, 24 + (index % 5) * 28)),
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: { ...(definition.defaultConfig || {}) },
    };
    // Cada submenu selecionado representa uma overlay independente neste editor provisório.
    // Não acrescentar a nova widget à overlay que estava aberta.
    setActiveOverlayId(null);
    setConfig((current) => ({
      ...current,
      id: undefined,
      name: definition.name,
      instances: [nextInstance],
      background: current.background || EMPTY_BACKGROUND,
    }));
    setSelectedInstanceId(nextInstance.id || null);
    setError("");
    setNotice("");
  }

  function addWidgetComponent(definition: WidgetDefinition, elementKey: string, label: string) {
    const existing = config.instances || [];
    const index = existing.length;
    const width = 260;
    const height = 50;
    const nextInstance: CanvasInstance = {
      id: makeUniqueWidgetId(definition.name + " " + label, existing),
      widgetId: definition.id,
      elementKey,
      isFullWidget: false,
      name: `${definition.name} — ${label}`,
      x: Math.max(0, Math.min(size.width - width, 24 + (index % 5) * 28)),
      y: Math.max(0, Math.min(size.height - height, 24 + (index % 5) * 28)),
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: { ...(definition.defaultConfig || {}) },
    };
    // Elementos escolhidos por submenu também recebem canvas/overlay próprios.
    setActiveOverlayId(null);
    setConfig((current) => ({
      ...current,
      id: undefined,
      name: nextInstance.name || definition.name,
      instances: [nextInstance],
      background: current.background || EMPTY_BACKGROUND,
    }));
    setSelectedInstanceId(nextInstance.id || null);
    setError("");
    setNotice("");
  }

  function updateInstance(instanceId: string, patch: Partial<CanvasInstance>) {
    setConfig((current) => ({
      ...current,
      instances: (current.instances || []).map((item, index) =>
        (item.id || `${item.widgetId}-${index}`) === instanceId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function deleteInstance(instanceId: string) {
    setConfig((current) => ({
      ...current,
      instances: (current.instances || []).filter(
        (item, index) => (item.id || `${item.widgetId}-${index}`) !== instanceId,
      ),
    }));
    setSelectedInstanceId((current) => (current === instanceId ? null : current));
  }

  function updateGridSettings(patch: Partial<CanvasGridSettings>) {
    setGridSettings((current) => ({ ...current, ...patch }));
  }

  function updateBackground(patch: Partial<CanvasBackground>) {
    setConfig((current) => ({
      ...current,
      background: { ...(current.background || EMPTY_BACKGROUND), ...patch },
    }));
  }

  const canvasBackground = useMemo(
    () => backgroundStyle(config.background || EMPTY_BACKGROUND),
    [config.background],
  );

  return (
    <section className="relative flex w-full min-w-0 flex-col items-center gap-4 px-2 pb-40 pt-4">
      <button type="button" onClick={() => void saveOverlay()} disabled={saving || loading} title="Salvar overlay" aria-label="Salvar overlay" className="fixed right-4 top-20 z-[100] inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg hover:bg-violet-500 disabled:opacity-50"><Save size={16} /></button>
      <button type="button" onClick={() => void deleteOverlay()} disabled={saving || !activeOverlayId} title="Excluir overlay" aria-label="Excluir overlay" className="fixed right-16 top-20 z-[100] inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/30 bg-slate-950 text-rose-200 shadow-lg hover:bg-rose-500/10 disabled:opacity-40"><Trash2 size={16} /></button>
      {error && <p role="alert" className="w-full text-xs text-rose-200">{error}</p>}
      <div className="mt-4 w-full min-w-0">
        <HorizontalMenu ariaLabel="Widgets de Overlay" className="w-full">
          {catalog
            .filter((widget) => widget.implemented !== false)
            .map((widget) => (
              <button
                key={widget.id}
                type="button"
                onClick={() => addWidget(widget)}
                title={`Adicionar ${widget.name} ao canvas`}
                className="shrink-0 rounded-md border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-white"
              >
                {widget.name}
              </button>
            ))}
        </HorizontalMenu>
      </div>
      {overlays.length > 0 && (
        <div className="w-full min-w-0">
          <p className="mb-1 text-[10px] text-violet-200/80">Overlays salvas</p>
          <HorizontalMenu ariaLabel="Overlays salvas" className="w-full">
            {overlays.map((overlay) => {
              const overlayId = String(overlay.id ?? "");
              const overlayName = String(overlay.name ?? getCanvasConfig(overlay).name ?? overlayId);
              return (
                <button
                  key={overlayId}
                  type="button"
                  onClick={() => selectOverlay(overlayId)}
                  title={`Abrir overlay ${overlayName}`}
                  aria-pressed={activeOverlayId === overlayId}
                  className={`shrink-0 rounded-md border px-3 py-1.5 text-xs transition ${activeOverlayId === overlayId ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-slate-800/80 text-slate-200 hover:border-violet-400/60"}`}
                >
                  {overlayName}
                </button>
              );
            })}
          </HorizontalMenu>
        </div>
      )}
      <p className="w-full text-[10px] text-violet-200/80">
        Atalhos: Delete remove · setas movem 1 px · Shift + setas movem 10 px
      </p>
      <div className="relative mt-2 flex w-full min-w-0 justify-center overflow-auto">
        <div
          ref={frameRef}
          className="relative mx-auto shrink-0 overflow-hidden bg-transparent"
          style={{
            width: size.width,
            marginInline: "auto",
            height: size.height,
            boxSizing: "border-box",
          }}
          aria-label="Canvas de Overlay"
        >
          <div
            className="absolute left-0 top-0 overflow-hidden"
            style={{
              width: size.width,
              height: size.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="absolute inset-0" style={canvasBackground} />
            {gridSettings.showGrid && (
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(167,139,250,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(167,139,250,.2) 1px, transparent 1px)",
                  backgroundSize: `${Math.max(5, Number(gridSettings.gridSize) || 20)}px ${Math.max(5, Number(gridSettings.gridSize) || 20)}px`,
                }}
              />
            )}
            {gridSettings.showSafeAreas && (
              <div
                aria-hidden="true"
                className="absolute inset-[5%] pointer-events-none border border-dashed border-emerald-400/60"
              />
            )}
            {(gridSettings.verticalGuides || []).map((guide: { id: string; x: number }) => (
              <div
                key={guide.id}
                aria-hidden="true"
                className="absolute top-0 bottom-0 z-30 pointer-events-none border-l border-cyan-400/80"
                style={{ left: guide.x }}
              />
            ))}
            {(gridSettings.horizontalGuides || []).map((guide: { id: string; y: number }) => (
              <div
                key={guide.id}
                aria-hidden="true"
                className="absolute left-0 right-0 z-30 pointer-events-none border-t border-cyan-400/80"
                style={{ top: guide.y }}
              />
            ))}
            {config.instances
              ?.filter((instance) => instance.visible !== false)
              .slice()
              .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
              .map((instance, index) => {
                const definition = catalog.find((item) => item.id === instance.widgetId);
                if (!definition) return null;
                const width = Math.max(1, Number(instance.width) || definition.defaultWidth || 280);
                const height = Math.max(
                  1,
                  Number(instance.height) || definition.defaultHeight || 120,
                );
                const widgetConfig = {
                  ...(definition.defaultConfig || {}),
                  ...(instance.config || {}),
                };
                const transform = [
                  widgetConfig["rotation"] ? `rotate(${Number(widgetConfig["rotation"])}deg)` : "",
                  widgetConfig["flipH"] ? "scaleX(-1)" : "",
                  widgetConfig["flipV"] ? "scaleY(-1)" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const instanceId = instance.id || `${instance.widgetId}-${index}`;
                const isSelected = selectedInstanceId === instanceId;
                const instanceStyle: CSSProperties = {
                  position: "absolute",
                  left: Number(instance.x) || 0,
                  top: Number(instance.y) || 0,
                  width,
                  height,
                  zIndex: Number(instance.zIndex) || index + 1,
                  overflow: "visible",
                  opacity: Math.max(0, Math.min(100, Number(widgetConfig["opacity"] ?? 100))) / 100,
                  transform: transform || undefined,
                  outline: isSelected ? "1px solid #a78bfa" : "none",
                  cursor: "move",
                  touchAction: "none",
                };
                return (
                  <div
                    key={instanceId}
                    style={instanceStyle}
                    onPointerDown={(event) => {
                      setSelectedInstanceId(instanceId);
                      if (
                        (event.target as HTMLElement).closest(
                          "button,input,textarea,select,a,[data-no-widget-drag]",
                        )
                      )
                        return;
                      event.preventDefault();
                      event.stopPropagation();
                      widgetPointer.current = {
                        instanceId,
                        mode: "move",
                        x: event.clientX,
                        y: event.clientY,
                        left: Number(instance.x) || 0,
                        top: Number(instance.y) || 0,
                        width,
                        height,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setConfig((current) => {
                        const instances = [...(current.instances || [])];
                        const maxZ = instances.reduce(
                          (max, item) => Math.max(max, Number(item.zIndex) || 0),
                          0,
                        );
                        if (instances[index])
                          instances[index] = { ...instances[index], zIndex: maxZ + 1 };
                        return { ...current, instances };
                      });
                    }}
                    onPointerMove={(event) => {
                      const drag = widgetPointer.current;
                      if (!drag || drag.instanceId !== instanceId || !(event.buttons & 1)) return;
                      const dx = (event.clientX - drag.x) / scale;
                      const dy = (event.clientY - drag.y) / scale;
                      setConfig((current) => {
                        const instances = [...(current.instances || [])];
                        const targetIndex = instances.findIndex(
                          (item, itemIndex) =>
                            (item.id || `${item.widgetId}-${itemIndex}`) === drag.instanceId,
                        );
                        if (targetIndex < 0) return current;
                        const item = instances[targetIndex];
                        if (drag.mode === "move") {
                          const gridSize = Math.max(1, Number(gridSettings.gridSize) || 20);
                          const rawX = Math.max(
                            0,
                            Math.min(size.width - drag.width, drag.left + dx),
                          );
                          const rawY = Math.max(
                            0,
                            Math.min(size.height - drag.height, drag.top + dy),
                          );
                          const nextX = gridSettings.snapToGrid
                            ? Math.round(rawX / gridSize) * gridSize
                            : rawX;
                          const nextY = gridSettings.snapToGrid
                            ? Math.round(rawY / gridSize) * gridSize
                            : rawY;
                          instances[targetIndex] = {
                            ...item,
                            x: Math.max(0, Math.min(size.width - drag.width, nextX)),
                            y: Math.max(0, Math.min(size.height - drag.height, nextY)),
                          };
                        } else {
                          instances[targetIndex] = {
                            ...item,
                            width: Math.max(1, drag.width + dx),
                            height: Math.max(1, drag.height + dy),
                          };
                        }
                        return { ...current, instances };
                      });
                    }}
                    onPointerUp={() => {
                      widgetPointer.current = null;
                    }}
                    onPointerCancel={() => {
                      widgetPointer.current = null;
                    }}
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
                        aria-label={`Redimensionar ${instance.name || definition.name}`}
                        title="Arraste para ajustar o tamanho"
                        className="absolute bottom-0 right-0 z-50 h-3 w-3 cursor-se-resize border border-white bg-violet-500"
                        style={{ touchAction: "none" }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          widgetPointer.current = {
                            instanceId,
                            mode: "resize",
                            x: event.clientX,
                            y: event.clientY,
                            left: Number(instance.x) || 0,
                            top: Number(instance.y) || 0,
                            width,
                            height,
                          };
                          event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
                        }}
                      />
                    )}
                  </div>
                );
              })}
            {!loading &&
              !error &&
              (!config.instances ||
                config.instances.filter((item) => item.visible !== false).length === 0) && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 p-6 text-center">
                  <p className="max-w-sm text-xs text-slate-400">
                    Canvas vazio. Adicione widgets para criar uma nova overlay ou abra uma overlay salva acima.
                  </p>
                </div>
              )}
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 text-xs text-slate-300">
                Carregando canvas…
              </div>
            )}
            {error && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 text-center">
                <p role="alert" className="max-w-lg text-xs text-rose-300">
                  {error}
                </p>
              </div>
            )}
          </div>
          <div
            role="separator"
            aria-label="Redimensionar canvas"
            title="Arraste para redimensionar; tamanho definido pelo usuário"
            className="absolute bottom-0 right-0 z-[70] h-4 w-4 cursor-se-resize touch-none opacity-60 hover:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, transparent 50%, #a78bfa 50%, #a78bfa 62%, transparent 62%, transparent 74%, #a78bfa 74%, #a78bfa 86%, transparent 86%)",
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              resizeStart.current = {
                x: event.clientX,
                y: event.clientY,
                width: size.width,
                height: size.height,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = resizeStart.current;
              if (!start || !(event.buttons & 1)) return;
              setConfig((current) => ({
                ...current,
                visualizerSize: {
                  width: Math.max(1, Math.round(start.width + event.clientX - start.x)),
                  height: Math.max(1, Math.round(start.height + event.clientY - start.y)),
                },
              }));
            }}
            onPointerUp={() => {
              resizeStart.current = null;
            }}
            onPointerCancel={() => {
              resizeStart.current = null;
            }}
          />
        </div>
      </div>
      <Overlay_Editor />
    </section>
  );
}
