import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { TWITCH_WIDGETS_CATALOG } from "../widget/Widget_twitchWidgetsCatalog";

type JsonObject = Record<string, unknown>;
type CanvasInstance = {
  id?: string;
  widgetId?: string;
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
 * Não inclui barra de ferramentas, painel lateral, seleção, alças ou ações de edição.
 */
export default function OverlayCanvas() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
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
    const updateScale = () => setScale(Math.min(1, frame.clientWidth / size.width));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [size.width, size.height]);

  const canvasBackground = useMemo(
    () => backgroundStyle(config.background || EMPTY_BACKGROUND),
    [config.background],
  );

  return (
    <section className="w-full min-w-0">
      <div
        ref={frameRef}
        className="relative mx-auto w-full overflow-hidden rounded-xl border border-white/10 bg-[#080a10]"
        style={{ maxWidth: size.width, aspectRatio: `${size.width} / ${size.height}` }}
        aria-label="Canvas de Overlay"
      >
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{ width: size.width, height: size.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="absolute inset-0" style={canvasBackground} />
          {config.background?.showBorder && (
            <div
              className="pointer-events-none absolute inset-0 z-30 border-2 border-violet-500/30"
              style={{ borderRadius: config.background.borderRadius || "0px" }}
            />
          )}
          {config.instances
            ?.filter((instance) => instance.visible !== false)
            .slice()
            .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
            .map((instance, index) => {
              const definition = catalog.find((item) => item.id === instance.widgetId);
              const Widget = definition?.component;
              if (!Widget) return null;
              const width = Math.max(1, Number(instance.width) || definition.defaultWidth || 280);
              const height = Math.max(1, Number(instance.height) || definition.defaultHeight || 120);
              const widgetConfig = { ...(definition.defaultConfig || {}), ...(instance.config || {}) };
              const transform = [
                widgetConfig["rotation"] ? `rotate(${Number(widgetConfig["rotation"])}deg)` : "",
                widgetConfig["flipH"] ? "scaleX(-1)" : "",
                widgetConfig["flipV"] ? "scaleY(-1)" : "",
              ].filter(Boolean).join(" ");
              const instanceStyle: CSSProperties = {
                position: "absolute",
                left: Number(instance.x) || 0,
                top: Number(instance.y) || 0,
                width,
                height,
                zIndex: Number(instance.zIndex) || index + 1,
                overflow: "hidden",
                opacity: Math.max(0, Math.min(100, Number(widgetConfig["opacity"] ?? 100))) / 100,
                transform: transform || undefined,
              };
              return (
                <div key={instance.id || `${instance.widgetId}-${index}`} style={instanceStyle}>
                  <div className="h-full w-full overflow-hidden">
                    <Widget config={widgetConfig} />
                  </div>
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
      </div>
    </section>
  );
}
