import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { TWITCH_WIDGETS_CATALOG } from "../widget/Widget_twitchWidgetsCatalog";
import OverlayWidgetElementRenderer from "./Overlay_WidgetElementRenderer";
import HorizontalMenu from "../components/HorizontalMenu";

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
};

const catalog = TWITCH_WIDGETS_CATALOG as unknown as WidgetDefinition[];
const DEFAULT_SIZE = { width: 800, height: 480 };
const EMPTY_BACKGROUND: CanvasBackground = { type: "transparent", opacity: 100 };

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getCanvasConfig(row: OverlayRow): CanvasConfig {
  const source = isObject(row.settings) && Object.keys(row.settings).length
    ? row.settings
    : isObject(row.config) && Object.keys(row.config).length
      ? row.config
      : isObject(row.data) && Object.keys(row.data).length
        ? row.data
        : row as unknown as JsonObject;
  return {
    ...source,
    name: String(source["name"] ?? row.name ?? "Overlay"),
    visualizerSize: isObject(source["visualizerSize"])
      ? source["visualizerSize"] as CanvasConfig["visualizerSize"]
      : DEFAULT_SIZE,
    instances: Array.isArray(source["instances"]) ? source["instances"] as CanvasInstance[] : [],
    background: isObject(source["background"])
      ? source["background"] as CanvasBackground
      : EMPTY_BACKGROUND,
  };
}

function backgroundStyle(background: CanvasBackground): CSSProperties {
  const style: CSSProperties = {};
  if (background.type === "solid") {
    style.backgroundColor = background.color || "#020617";
  } else if (background.type === "gradient") {
    style.backgroundImage = background.gradient || "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)";
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
  if (background.brightness != null && Number(background.brightness) !== 100) filters.push(`brightness(${Number(background.brightness)}%)`);
  if (background.contrast != null && Number(background.contrast) !== 100) filters.push(`contrast(${Number(background.contrast)}%)`);
  if (background.saturate != null && Number(background.saturate) !== 100) filters.push(`saturate(${Number(background.saturate)}%)`);
  if (filters.length) style.filter = filters.join(" ");
  return style;
}

/**
 * Somente o canvas de Overlay do BACKUP01, adaptado ao catálogo e ao multichat do LIVENEXUS.
 * Mantém apenas o canvas, com seleção, arraste e redimensionamento direto das widgets.
 */
export default function OverlayCanvas() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [displaySize, setDisplaySize] = useState(DEFAULT_SIZE);
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const widgetPointer = useRef<{ index: number; mode: "move" | "resize"; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null);
  const [config, setConfig] = useState<CanvasConfig>({
    name: "Overlay",
    visualizerSize: DEFAULT_SIZE,
    instances: [],
    background: EMPTY_BACKGROUND,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const firstConfigured =
          rows.find((row) => getCanvasConfig(row).instances.length > 0) || rows[0];
        if (!cancelled && firstConfigured) setConfig(getCanvasConfig(firstConfigured));
        else if (!cancelled) setConfig({
          name: "Overlay",
          visualizerSize: DEFAULT_SIZE,
          instances: [],
          background: EMPTY_BACKGROUND,
        });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Erro ao carregar o canvas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOverlay();
    return () => { cancelled = true; };
  }, []);

  const size = useMemo(() => ({
    width: Math.max(320, Number(config.visualizerSize?.width) || DEFAULT_SIZE.width),
    height: Math.max(180, Number(config.visualizerSize?.height) || DEFAULT_SIZE.height),
  }), [config.visualizerSize]);

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
  }, [size.width, size.height, displaySize.width, displaySize.height]);

  function addWidget(definition: WidgetDefinition) {
    const existing = config.instances || [];
    const index = existing.length;
    const width = definition.defaultWidth || 280;
    const height = definition.defaultHeight || 120;
    const nextInstance: CanvasInstance = {
      id: `overlay-widget-${Date.now()}-${index}`,
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
    setConfig((current) => ({ ...current, instances: [...(current.instances || []), nextInstance] }));
  }

  const canvasBackground = useMemo(
    () => backgroundStyle(config.background || EMPTY_BACKGROUND),
    [config.background],
  );

  return (
    <section className="flex w-full min-w-0 flex-col items-center gap-2 overflow-hidden">
      <div className="w-full min-w-0">
        <HorizontalMenu ariaLabel="Widgets de Overlay" className="w-full">
          {catalog.filter((widget) => widget.implemented !== false).map((widget) => (
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
      <div className="flex w-full min-w-0 justify-center overflow-hidden">
      <div
        ref={frameRef}
        className="relative mx-auto shrink-0 overflow-hidden bg-transparent"
        style={{ width: displaySize.width, maxWidth: "100%", height: displaySize.height, boxSizing: "border-box" }}
        aria-label="Canvas de Overlay"
      >
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{ width: size.width, height: size.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="absolute inset-0" style={canvasBackground} />
          {config.instances
            ?.filter((instance) => instance.visible !== false)
            .slice()
            .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
            .map((instance, index) => {
              const definition = catalog.find((item) => item.id === instance.widgetId);
              if (!definition) return null;
              const width = Math.max(1, Number(instance.width) || definition.defaultWidth || 280);
              const height = Math.max(1, Number(instance.height) || definition.defaultHeight || 120);
              const widgetConfig = { ...(definition.defaultConfig || {}), ...(instance.config || {}) };
              const transform = [
                widgetConfig["rotation"] ? `rotate(${Number(widgetConfig["rotation"])}deg)` : "",
                widgetConfig["flipH"] ? "scaleX(-1)" : "",
                widgetConfig["flipV"] ? "scaleY(-1)" : "",
              ].filter(Boolean).join(" ");
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
                    if ((event.target as HTMLElement).closest("button,input,textarea,select,a,[data-no-widget-drag]")) return;
                    event.preventDefault();
                    event.stopPropagation();
                    widgetPointer.current = {
                      index,
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
                      const maxZ = instances.reduce((max, item) => Math.max(max, Number(item.zIndex) || 0), 0);
                      if (instances[index]) instances[index] = { ...instances[index], zIndex: maxZ + 1 };
                      return { ...current, instances };
                    });
                  }}
                  onPointerMove={(event) => {
                    const drag = widgetPointer.current;
                    if (!drag || drag.index !== index || !(event.buttons & 1)) return;
                    const dx = (event.clientX - drag.x) / scale;
                    const dy = (event.clientY - drag.y) / scale;
                    setConfig((current) => {
                      const instances = [...(current.instances || [])];
                      const item = instances[index];
                      if (!item) return current;
                      if (drag.mode === "move") {
                        instances[index] = {
                          ...item,
                          x: Math.max(0, Math.min(size.width - drag.width, drag.left + dx)),
                          y: Math.max(0, Math.min(size.height - drag.height, drag.top + dy)),
                        };
                      } else {
                        instances[index] = {
                          ...item,
                          width: Math.max(40, Math.min(size.width - drag.left, drag.width + dx)),
                          height: Math.max(20, Math.min(size.height - drag.top, drag.height + dy)),
                        };
                      }
                      return { ...current, instances };
                    });
                  }}
                  onPointerUp={() => { widgetPointer.current = null; }}
                  onPointerCancel={() => { widgetPointer.current = null; }}
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
                          index,
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
          {!loading && !error && (!config.instances || config.instances.filter((item) => item.visible !== false).length === 0) && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 p-6 text-center">
              <p className="max-w-sm text-xs text-slate-400">Nenhuma overlay salva para esta conta.</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 text-xs text-slate-300">
              Carregando canvas…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 text-center">
              <p role="alert" className="max-w-lg text-xs text-rose-300">{error}</p>
            </div>
          )}
        </div>
        <div
          role="separator"
          aria-label="Redimensionar canvas"
          title="Arraste para redimensionar (mínimo 40 × 20 px)"
          className="absolute bottom-0 right-0 z-[70] h-4 w-4 cursor-se-resize touch-none opacity-60 hover:opacity-100"
          style={{ background: "linear-gradient(135deg, transparent 50%, #a78bfa 50%, #a78bfa 62%, transparent 62%, transparent 74%, #a78bfa 74%, #a78bfa 86%, transparent 86%)" }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            resizeStart.current = {
              x: event.clientX,
              y: event.clientY,
              width: displaySize.width,
              height: displaySize.height,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = resizeStart.current;
            if (!start || !(event.buttons & 1)) return;
            const parentWidth = frameRef.current?.parentElement?.clientWidth ?? 2400;
            setDisplaySize({
              width: Math.round(Math.max(40, Math.min(2400, parentWidth, start.width + event.clientX - start.x))),
              height: Math.round(Math.max(20, Math.min(1600, start.height + event.clientY - start.y))),
            });
          }}
          onPointerUp={() => { resizeStart.current = null; }}
          onPointerCancel={() => { resizeStart.current = null; }}
        />
      </div>
      </div>
    </section>
  );
}
