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
import AnimacoesTexto from "../animacoes/AnimacoesTexto";
import { loadGoogleFont } from "../fontes/Font_Loader";

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
  locked?: boolean;
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
  globalStyleConfig?: { borderEnabled?: boolean; borderWidth?: number; borderColor?: string; borderRadius?: number; texture?: string; colorEffectEnabled?: boolean; colorEffect?: string };
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
const TEXT_WIDGET_ID = "__livenexus_text__";
const SHAPE_WIDGET_ID = "__livenexus_shape__";
const EMPTY_BACKGROUND: CanvasBackground = { type: "transparent", opacity: 100 };

const COLOR_EFFECT_FILTERS: Record<string, string> = {"glass":"saturate(1.25) contrast(1.04) brightness(1.04)","chrome":"saturate(0.35) contrast(1.35) brightness(1.08)","mirror":"saturate(1.4) contrast(1.2)","crystal":"saturate(1.3) brightness(1.12) contrast(0.92)","hologram":"hue-rotate(38deg) saturate(1.8) contrast(1.08)","neon":"saturate(2.2) contrast(1.25) brightness(1.08)","iridescent":"hue-rotate(75deg) saturate(1.55)","metal":"grayscale(0.65) contrast(1.35) brightness(1.12)","liquid":"saturate(1.65) contrast(1.08)","frost":"saturate(0.65) brightness(1.1) contrast(0.9)","gold":"sepia(0.8) saturate(1.8) contrast(1.12)","silver":"grayscale(0.85) contrast(1.2) brightness(1.12)","copper":"sepia(0.65) saturate(1.35) hue-rotate(-12deg)","ruby":"hue-rotate(315deg) saturate(1.8) contrast(1.12)","sapphire":"hue-rotate(190deg) saturate(1.7) contrast(1.1)","emerald":"hue-rotate(95deg) saturate(1.65) contrast(1.08)","amethyst":"hue-rotate(250deg) saturate(1.55)","duotone":"grayscale(0.8) sepia(0.35) hue-rotate(180deg) saturate(1.5)","thermal":"hue-rotate(155deg) saturate(2) contrast(1.15)","vintage":"sepia(0.55) saturate(0.8) contrast(0.95)","dream":"hue-rotate(22deg) saturate(1.35) brightness(1.12)"};
const COLOR_EFFECT_OVERLAYS: Record<string, string> = {
  glass: "linear-gradient(135deg, rgba(220,245,255,.48), rgba(125,190,220,.28), rgba(255,255,255,.42))",
  chrome: "linear-gradient(135deg, rgba(245,248,255,.92), rgba(105,120,145,.78), rgba(235,240,250,.92))",
  mirror: "linear-gradient(135deg, rgba(240,248,255,.78), rgba(70,100,130,.68), rgba(220,235,255,.86))",
  crystal: "linear-gradient(135deg, rgba(190,245,255,.62), rgba(125,190,255,.45), rgba(245,255,255,.72))",
  hologram: "linear-gradient(120deg, rgba(255,80,220,.68), rgba(65,225,255,.62), rgba(180,100,255,.7))",
  neon: "linear-gradient(135deg, rgba(255,0,220,.72), rgba(0,255,235,.62), rgba(100,0,255,.68))",
  iridescent: "linear-gradient(120deg, rgba(255,120,210,.68), rgba(100,220,255,.62), rgba(190,255,140,.62), rgba(210,150,255,.68))",
  metal: "linear-gradient(135deg, rgba(235,238,242,.88), rgba(85,95,110,.78), rgba(210,215,225,.9))",
  liquid: "linear-gradient(135deg, rgba(50,210,230,.56), rgba(35,110,230,.54), rgba(100,245,220,.6))",
  frost: "linear-gradient(135deg, rgba(225,240,255,.78), rgba(195,215,235,.68), rgba(250,252,255,.82))",
  gold: "linear-gradient(135deg, rgba(255,210,65,.92), rgba(190,125,15,.84), rgba(255,235,135,.92))",
  silver: "linear-gradient(135deg, rgba(245,248,255,.92), rgba(145,155,170,.86), rgba(225,232,242,.92))",
  copper: "linear-gradient(135deg, rgba(235,135,75,.9), rgba(145,65,35,.82), rgba(255,185,125,.9))",
  ruby: "linear-gradient(135deg, rgba(255,45,85,.9), rgba(145,0,35,.82), rgba(255,105,125,.9))",
  sapphire: "linear-gradient(135deg, rgba(45,115,255,.9), rgba(5,35,145,.84), rgba(105,185,255,.9))",
  emerald: "linear-gradient(135deg, rgba(30,210,125,.9), rgba(0,95,55,.84), rgba(105,255,175,.9))",
  amethyst: "linear-gradient(135deg, rgba(175,85,255,.9), rgba(75,25,145,.84), rgba(220,155,255,.9))",
  duotone: "linear-gradient(135deg, rgba(30,215,220,.86), rgba(60,45,160,.86))",
  thermal: "linear-gradient(135deg, rgba(255,35,35,.92), rgba(255,190,0,.86), rgba(30,90,255,.9))",
  vintage: "linear-gradient(135deg, rgba(190,135,75,.78), rgba(115,75,45,.7), rgba(240,205,145,.8))",
  dream: "linear-gradient(135deg, rgba(255,165,215,.62), rgba(160,155,255,.58), rgba(145,230,255,.62))",
};
function getGlobalTextureStyle(texture: string): CSSProperties {
  const textures: Record<string, CSSProperties> = {
    glass: { backgroundImage: "linear-gradient(135deg, rgba(255,255,255,.34), rgba(255,255,255,.03) 45%, rgba(160,220,255,.16))", backdropFilter: "blur(1px)", mixBlendMode: "screen" },
    "brushed-metal": { backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.12) 0px, rgba(255,255,255,.02) 1px, transparent 2px, transparent 4px)", mixBlendMode: "screen" },
    carbon: { backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.12) 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,.18) 0 2px, transparent 2px 5px)", mixBlendMode: "overlay" },
    noise: { backgroundImage: "radial-gradient(rgba(255,255,255,.22) .7px, transparent .8px)", backgroundSize: "4px 4px", mixBlendMode: "overlay" },
    stripes: { backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,.14) 0 2px, transparent 2px 7px)", mixBlendMode: "overlay" },
    dots: { backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1.5px)", backgroundSize: "7px 7px", mixBlendMode: "screen" },
    holographic: { backgroundImage: "linear-gradient(120deg, rgba(255,0,180,.18), rgba(0,220,255,.22), rgba(255,220,0,.16), rgba(130,80,255,.2))", mixBlendMode: "color-dodge" },
    marble: { backgroundImage: "repeating-radial-gradient(ellipse at 20% 30%, transparent 0 9px, rgba(255,255,255,.15) 10px 11px, transparent 12px 20px)", mixBlendMode: "screen" },
  };
  return textures[texture] || {};
}



function OverlayShape({ shape, color, strokeColor, strokeWidth, fillEnabled, fillOpacity }: { shape: string; color: string; strokeColor: string; strokeWidth: number; fillEnabled: boolean; fillOpacity: number }) {
 const fill = fillEnabled ? color : "none";
 const common = { fill, fillOpacity: Math.max(0, Math.min(100, Number(fillOpacity) || 0)) / 100, stroke: strokeColor, strokeWidth, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
 const points: Record<string,string> = {triangle:"50,4 96,94 4,94","right-triangle":"5,5 5,95 95,95",diamond:"50,3 97,50 50,97 3,50",parallelogram:"25,5 97,5 75,95 3,95",trapezoid:"25,5 75,5 97,95 3,95",pentagon:"50,3 97,38 79,96 21,96 3,38",hexagon:"25,4 75,4 97,50 75,96 25,96 3,50",heptagon:"50,3 88,20 98,55 76,90 38,98 5,70 12,30",octagon:"30,3 70,3 97,30 97,70 70,97 30,97 3,70 3,30",decagon:"50,2 79,12 96,35 96,65 79,88 50,98 21,88 4,65 4,35 21,12","star-6":"50,3 61,35 95,35 68,55 78,91 50,70 22,91 32,55 5,35 39,35","arrow-right":"3,30 60,30 60,7 97,50 60,93 60,70 3,70","arrow-left":"97,30 40,30 40,7 3,50 40,93 40,70 97,70","arrow-up":"30,97 30,40 7,40 50,3 93,40 70,40 70,97","arrow-down":"30,3 70,3 70,60 93,60 50,97 7,60 30,60",chevron:"5,5 50,35 95,5 95,35 50,65 5,35",cross:"35,3 65,3 65,35 97,35 97,65 65,65 65,97 35,97 35,65 3,65 3,35 35,35",plus:"38,3 62,3 62,38 97,38 97,62 62,62 62,97 38,97 38,62 3,62 3,38 38,38",minus:"5,38 95,38 95,62 5,62"};
 if(["circle","ellipse","ring"].includes(shape)) return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><ellipse cx="50" cy="50" rx={shape==="ellipse"?48:43} ry={shape==="ellipse"?30:43} fill={shape==="ring"?"none":fill} fillOpacity={Math.max(0, Math.min(100, Number(fillOpacity) || 0)) / 100} stroke={strokeColor} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke"/></svg>;
 if(["rectangle","square","rounded-rectangle"].includes(shape)) return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><rect x={shape==="square"?5:2} y={shape==="square"?5:20} width={shape==="square"?90:96} height={shape==="square"?90:60} rx={shape==="rounded-rectangle"?12:0} {...common}/></svg>;
 if(shape==="star") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points="50,3 61,36 96,36 68,57 79,93 50,71 21,93 32,57 4,36 39,36" {...common}/></svg>;
 if(shape==="heart") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M50 91 C40 78 7 56 7 30 C7 5 38 1 50 24 C63 1 94 5 94 30 C94 56 60 79 50 91Z" {...common}/></svg>;
 if(shape==="lightning") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points="57,2 18,56 44,56 35,98 83,37 56,37" {...common}/></svg>;
 if(shape==="speech-bubble") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M8 12 H92 V72 H42 L20 92 V72 H8Z" {...common}/></svg>;
 if(shape==="cylinder") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M8 20 C8 3 92 3 92 20 V80 C92 98 8 98 8 80Z" {...common}/><ellipse cx="50" cy="20" rx="42" ry="14" fill={fill} stroke={strokeColor} strokeWidth={strokeWidth}/></svg>;
 if(shape==="cloud") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M22 76 C1 76 1 48 21 43 C18 17 48 9 60 31 C82 21 100 40 91 58 C109 77 87 88 72 85 H23Z" {...common}/></svg>;
 if(shape==="arch") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M10 95 V48 A40 40 0 0 1 90 48 V95 H68 V48 A18 18 0 0 0 32 48 V95Z" {...common}/></svg>;
 if(shape==="wave") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M4 35 C25 5 35 65 50 35 S75 5 96 35 V65 C75 35 65 95 50 65 S25 35 4 65Z" {...common}/></svg>;
 if(shape==="pie") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M50 50 L50 5 A45 45 0 0 1 95 50Z" {...common}/><circle cx="50" cy="50" r="45" fill="none" stroke={strokeColor} strokeWidth={strokeWidth}/></svg>;
 if(shape==="line") return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M8 90 L92 10" fill="none" stroke={strokeColor || color} strokeWidth={Math.max(1,strokeWidth)} strokeLinecap="round"/></svg>;
 return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points={points[shape]||points.hexagon} {...common}/></svg>;
}

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
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textDraftsRef = useRef<Record<string, string>>({});
  const [gridSettings, setGridSettings] = useState<CanvasGridSettings>({
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,
    showSafeAreas: false,
    verticalGuides: [],
    horizontalGuides: [],
  });
  const guidePointer = useRef<{ id: string; orientation: "vertical" | "horizontal" } | null>(null);
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
    globalStyleConfig: { borderEnabled: false, borderWidth: 1, borderColor: "#dce6ff", borderRadius: 16, texture: "none", colorEffectEnabled: false, colorEffect: "glass" },
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

  useEffect(() => {
    (config.instances || []).forEach((instance) => {
      if (instance.widgetId === TEXT_WIDGET_ID && typeof instance.config?.["fontFamily"] === "string") {
        loadGoogleFont(String(instance.config["fontFamily"]));
      }
    });
  }, [config.instances]);

  useEffect(() => {
    if (!editingTextId) return;
    const element = Array.from(document.querySelectorAll<HTMLElement>("[data-overlay-text]"))
      .find((node) => node.dataset.overlayTextId === editingTextId);
    if (element) {
      element.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editingTextId]);

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
      x: 0,
      y: 0,
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
      visualizerSize: { width, height },
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
      x: 0,
      y: 0,
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
      visualizerSize: { width, height },
      instances: [nextInstance],
      background: current.background || EMPTY_BACKGROUND,
    }));
    setSelectedInstanceId(nextInstance.id || null);
    setError("");
    setNotice("");
  }

  function applyTextStyleToSelectedText(patch: { fontSize?: number; color?: string; fontFamily?: string }) {
    if (patch.fontFamily && patch.fontFamily !== "monospace") loadGoogleFont(patch.fontFamily);
    if (!selectedInstanceId) return;
    const selected = (config.instances || []).find((item, index) =>
      (item.id || `${item.widgetId}-${index}`) === selectedInstanceId,
    );
    if (!selected) return;
    setConfig((current) => ({
      ...current,
      instances: (current.instances || []).map((item, index) =>
        (item.id || `${item.widgetId}-${index}`) === selectedInstanceId
          ? { ...item, config: { ...(item.config || {}), ...patch, ...(patch.color ? { textColor: patch.color } : {}) } }
          : item,
      ),
    }));
  }

  function addTextInstance(text: string, fontSize: number, color: string, fontFamily: string) {
    const existing = config.instances || [];
    const width = Math.min(size.width, Math.max(180, Math.ceil(text.length * fontSize * 0.62) + 24));
    const height = Math.min(size.height, Math.max(44, Math.ceil(fontSize * 1.6) + 12));
    const id = makeUniqueWidgetId("texto", existing);
    loadGoogleFont(fontFamily);
    const instance: CanvasInstance = {
      id, widgetId: TEXT_WIDGET_ID, elementKey: "text", isFullWidget: false,
      name: text.slice(0, 80) || "Texto",
      x: Math.max(0, Math.min(size.width - width, 24)),
      y: Math.max(0, Math.min(size.height - height, 24)), width, height,
      zIndex: existing.reduce((max, item) => Math.max(max, Number(item.zIndex) || 0), 0) + 1,
      visible: true, config: { text, fontSize, color, fontFamily },
    };
    setActiveOverlayId(null);
    setConfig((current) => ({ ...current, id: undefined, name: text.slice(0, 80) || "Texto", instances: [...(current.instances || []), instance] }));
    setSelectedInstanceId(id);
    setEditingTextId(null);
    setError(""); setNotice("");
  }


  function addShapeInstance(shape: string) {
    const existing = config.instances || [];
    const width = Math.min(size.width, 140);
    const height = Math.min(size.height, 100);
    const label = [["rectangle","Retângulo"],["rounded-rectangle","Retângulo arredondado"],["square","Quadrado"],["circle","Círculo"],["ellipse","Elipse"],["triangle","Triângulo"],["right-triangle","Triângulo retângulo"],["diamond","Losango"],["parallelogram","Paralelogramo"],["trapezoid","Trapézio"],["pentagon","Pentágono"],["hexagon","Hexágono"],["heptagon","Heptágono"],["octagon","Octógono"],["decagon","Decágono"],["star","Estrela"],["star-6","Estrela 6 pontas"],["arrow-right","Seta direita"],["arrow-left","Seta esquerda"],["arrow-up","Seta para cima"],["arrow-down","Seta para baixo"],["chevron","Chevron"],["cross","Cruz"],["plus","Mais"],["minus","Menos"],["heart","Coração"],["lightning","Raio"],["speech-bubble","Balão de fala"],["cylinder","Cilindro"],["cloud","Nuvem"],["arch","Arco"],["wave","Onda"],["pie","Setor circular"],["ring","Anel"],["line","Linha"]].find(([id]) => id === shape)?.[1] || "Forma";
    const id = makeUniqueWidgetId(String(label), existing);
    const instance: CanvasInstance = {
      id, widgetId: SHAPE_WIDGET_ID, elementKey: shape, isFullWidget: false, name: String(label),
      x: Math.max(0, Math.min(size.width - width, 24)), y: Math.max(0, Math.min(size.height - height, 24)),
      width, height, zIndex: existing.reduce((max, item) => Math.max(max, Number(item.zIndex) || 0), 0) + 1,
      visible: true, config: { shape, color: "#8b5cf6", fillColor: "#8b5cf6", strokeColor: "#ddd6fe", strokeWidth: 2, fillEnabled: true, opacity: 100 },
    };
    setActiveOverlayId(null);
    setConfig((current) => ({ ...current, id: undefined, name: String(label), instances: [...(current.instances || []), instance] }));
    setSelectedInstanceId(id); setEditingTextId(null); setError(""); setNotice("");
  }

  function updateInstance(instanceId: string, patch: Partial<CanvasInstance>) {
    setConfig((current) => ({
      ...current,
      instances: (current.instances || []).map((item, index) =>
        (item.id || `${item.widgetId}-${index}`) === instanceId ? { ...item, ...patch, ...(patch.color ? { textColor: patch.color } : {}) } : item,
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

  const selectedCanvasInstance = (config.instances || []).find(
    (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedInstanceId,
  );

  const selectedElementBackgroundColor = selectedCanvasInstance
    ? String(selectedCanvasInstance.widgetId === SHAPE_WIDGET_ID
      ? selectedCanvasInstance.config?.fillColor || selectedCanvasInstance.config?.color || "#8b5cf6"
      : selectedCanvasInstance.config?.backgroundColor || "#020617")
    : String(config.background?.color || "#020617");
  const selectedBackgroundMode: "transparent" | "solid" = selectedCanvasInstance
    ? selectedCanvasInstance.widgetId === SHAPE_WIDGET_ID
      ? selectedCanvasInstance.config?.fillEnabled === false || Number(selectedCanvasInstance.config?.fillOpacity ?? 100) === 0 ? "transparent" : "solid"
      : selectedCanvasInstance.config?.backgroundTransparent === true || !selectedCanvasInstance.config?.backgroundColor ? "transparent" : "solid"
    : config.background?.type === "solid" ? "solid" : "transparent";
  const selectedBackgroundOpacity = selectedCanvasInstance
    ? selectedCanvasInstance.widgetId === SHAPE_WIDGET_ID
      ? Number(selectedCanvasInstance.config?.fillOpacity ?? 100)
      : Number(selectedCanvasInstance.config?.backgroundOpacity ?? 100)
    : Number(config.background?.opacity ?? 100);

  function updateSelectedBackgroundColor(color: string) {
    if (!selectedInstanceId || !selectedCanvasInstance) {
      updateBackground({ type: "solid", color, opacity: 100, gradient: undefined, image: undefined });
      return;
    }
    const nextConfig = selectedCanvasInstance.widgetId === SHAPE_WIDGET_ID
      ? { ...(selectedCanvasInstance.config || {}), fillColor: color, color, fillOpacity: 100, fillEnabled: true, opacity: 100 }
      : { ...(selectedCanvasInstance.config || {}), backgroundColor: color, backgroundTransparent: false };
    updateInstance(selectedInstanceId, { config: nextConfig });
  }

  function updateSelectedBackgroundMode(mode: "transparent" | "solid") {
    if (mode === "transparent") {
      // Transparência global: mantém as cores configuradas para que possam ser restauradas ao voltar para Sólido.
      setConfig((current) => ({
        ...current,
        background: { ...(current.background || EMPTY_BACKGROUND), type: "transparent", opacity: 100, gradient: undefined, image: undefined },
        instances: (current.instances || []).map((instance) => ({
          ...instance,
          config: instance.widgetId === SHAPE_WIDGET_ID
            ? { ...(instance.config || {}), fillEnabled: false, fillOpacity: 0 }
            : { ...(instance.config || {}), backgroundTransparent: true },
        })),
      }));
      return;
    }

    // Sólido também é global: reativa os fundos de todos os elementos e widgets.
    setConfig((current) => ({
      ...current,
      background: {
        ...(current.background || EMPTY_BACKGROUND),
        type: "solid",
        color: current.background?.color || "#020617",
        opacity: 100,
        gradient: undefined,
        image: undefined,
      },
      instances: (current.instances || []).map((instance) => ({
        ...instance,
        config: instance.widgetId === SHAPE_WIDGET_ID
          ? { ...(instance.config || {}), fillEnabled: true, fillOpacity: 100 }
          : {
              ...(instance.config || {}),
              backgroundColor: String(instance.config?.backgroundColor || "#020617"),
              backgroundTransparent: false,
              backgroundOpacity: 100,
            },
      })),
    }));
  }

  function updateSelectedBackgroundOpacity(opacity: number) {
    const value = Math.max(0, Math.min(100, Number(opacity) || 0));
    if (!selectedInstanceId || !selectedCanvasInstance) {
      updateBackground({ opacity: value });
      return;
    }
    if (selectedCanvasInstance.widgetId === SHAPE_WIDGET_ID) {
      updateInstance(selectedInstanceId, { config: { ...(selectedCanvasInstance.config || {}), fillOpacity: value, fillEnabled: value > 0 } });
      return;
    }
    updateInstance(selectedInstanceId, { config: { ...(selectedCanvasInstance.config || {}), backgroundOpacity: value, backgroundTransparent: value === 0 } });
  }

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
            border: config.globalStyleConfig?.borderEnabled ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderWidth) || 1))}px solid ${String(config.globalStyleConfig.borderColor || "#dce6ff")}` : undefined,
            borderRadius: config.globalStyleConfig?.borderRadius ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderRadius) || 16))}px` : undefined,
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
              borderRadius: config.globalStyleConfig?.borderRadius ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderRadius) || 16))}px` : undefined,
            }}
          >
            <div className="absolute inset-0" style={{ ...canvasBackground, filter: config.globalStyleConfig?.colorEffectEnabled ? (COLOR_EFFECT_FILTERS[String(config.globalStyleConfig.colorEffect || "glass")] || "none") : undefined, borderRadius: config.globalStyleConfig?.borderRadius ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderRadius) || 16))}px` : undefined }} />
            {config.globalStyleConfig?.colorEffectEnabled && config.background?.type === "solid" && <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: COLOR_EFFECT_OVERLAYS[String(config.globalStyleConfig.colorEffect || "glass")] || COLOR_EFFECT_OVERLAYS.glass, borderRadius: config.globalStyleConfig?.borderRadius ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderRadius) || 16))}px` : undefined }} />}
            {config.globalStyleConfig?.texture && config.globalStyleConfig.texture !== "none" && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30" style={{ ...getGlobalTextureStyle(String(config.globalStyleConfig.texture)), borderRadius: config.globalStyleConfig?.borderRadius ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderRadius) || 16))}px` : undefined }} />}
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
              <div key={guide.id} role="separator" aria-label="Arrastar linha-guia vertical" title="Segure o botão esquerdo do mouse e arraste"
                className="absolute top-0 bottom-0 z-40 w-[7px] -translate-x-1/2 cursor-col-resize border-l border-cyan-400/90"
                style={{ left: guide.x, touchAction: "none" }}
                onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); guidePointer.current = { id: guide.id, orientation: "vertical" }; event.currentTarget.setPointerCapture(event.pointerId); }}
                onPointerMove={(event) => { if (!guidePointer.current || guidePointer.current.id !== guide.id || !(event.buttons & 1)) return; const rect = frameRef.current?.getBoundingClientRect(); if (!rect) return; const x = Math.max(0, Math.min(size.width, (event.clientX - rect.left) / scale)); updateGridSettings({ verticalGuides: gridSettings.verticalGuides.map((item) => item.id === guide.id ? { ...item, x } : item) }); }}
                onPointerUp={() => { guidePointer.current = null; }} onPointerCancel={() => { guidePointer.current = null; }}
              />
            ))}
            {(gridSettings.horizontalGuides || []).map((guide: { id: string; y: number }) => (
              <div key={guide.id} role="separator" aria-label="Arrastar linha-guia horizontal" title="Segure o botão esquerdo do mouse e arraste"
                className="absolute left-0 right-0 z-40 h-[7px] -translate-y-1/2 cursor-row-resize border-t border-cyan-400/90"
                style={{ top: guide.y, touchAction: "none" }}
                onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); guidePointer.current = { id: guide.id, orientation: "horizontal" }; event.currentTarget.setPointerCapture(event.pointerId); }}
                onPointerMove={(event) => { if (!guidePointer.current || guidePointer.current.id !== guide.id || !(event.buttons & 1)) return; const rect = frameRef.current?.getBoundingClientRect(); if (!rect) return; const y = Math.max(0, Math.min(size.height, (event.clientY - rect.top) / scale)); updateGridSettings({ horizontalGuides: gridSettings.horizontalGuides.map((item) => item.id === guide.id ? { ...item, y } : item) }); }}
                onPointerUp={() => { guidePointer.current = null; }} onPointerCancel={() => { guidePointer.current = null; }}
              />
            ))}
            {config.instances
              ?.filter((instance) => instance.visible !== false)
              .slice()
              .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
              .map((instance, index) => {
                const definition = catalog.find((item) => item.id === instance.widgetId) ||
                  (instance.widgetId === TEXT_WIDGET_ID
                    ? ({ id: TEXT_WIDGET_ID, name: instance.name || "Texto", defaultWidth: 320, defaultHeight: 60 } as WidgetDefinition)
                    : instance.widgetId === SHAPE_WIDGET_ID
                      ? ({ id: SHAPE_WIDGET_ID, name: instance.name || "Forma", defaultWidth: 140, defaultHeight: 100 } as WidgetDefinition)
                      : undefined);
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
                  filter: config.globalStyleConfig?.colorEffectEnabled ? (COLOR_EFFECT_FILTERS[String(config.globalStyleConfig.colorEffect || "glass")] || "none") : undefined,
                  border: config.globalStyleConfig?.borderEnabled ? (Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderWidth) || 1)) + "px solid " + String(config.globalStyleConfig.borderColor || "#dce6ff")) : undefined,
                  borderRadius: config.globalStyleConfig?.borderRadius ? `${Math.max(1, Math.min(100, Number(config.globalStyleConfig.borderRadius) || 16))}px` : widgetConfig["roundedBorder"] ? "16px" : undefined,
                  boxSizing: "border-box",
                  transform: transform || undefined,
                  outline: isSelected ? "1px solid #a78bfa" : "none",
                  cursor: "move",
                  touchAction: "none",
                  fontFamily: String(widgetConfig["fontFamily"] || "Inter, sans-serif"),
                  fontSize: `${Math.max(1, Number(widgetConfig["fontSize"]) || 16)}px`,
                  color: String(widgetConfig["color"] || widgetConfig["textColor"] || "#ffffff"),
                };
                return (
                  <div
                    key={instanceId}
                    data-overlay-instance={instanceId}
                    style={instanceStyle}
                    onPointerDown={(event) => {
                      setSelectedInstanceId(instanceId);
                      if (instance.locked) { event.stopPropagation(); return; }
                      const target = event.target as HTMLElement;
                      // Preserve native focus and pointer events on the editable text itself.
                      if (target.closest("[data-overlay-text]")) {
                        if (event.detail >= 2) setEditingTextId(instanceId);
                        return;
                      }
                      if (
                        target.closest(
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
                    <div className="h-full w-full overflow-hidden" style={instance.widgetId !== SHAPE_WIDGET_ID && widgetConfig["backgroundTransparent"] !== true && widgetConfig["backgroundColor"] ? { backgroundColor: `color-mix(in srgb, ${String(widgetConfig["backgroundColor"])} ${Math.max(0, Math.min(100, Number(widgetConfig["backgroundOpacity"] ?? 100)))}%, transparent)` } : undefined}>
                      <style>{'[data-overlay-instance="' + instanceId + '"] :is(p,span,h1,h2,h3,h4,h5,h6,label,li,a,strong,em,small) { font-family: "' + String(widgetConfig["fontFamily"] || "Inter").replace(/"/g, "") + '", sans-serif !important; font-size: ' + Math.max(1, Number(widgetConfig["fontSize"]) || 16) + 'px !important; color: ' + String(widgetConfig["color"] || widgetConfig["textColor"] || "#ffffff") + ' !important; }' + (widgetConfig["backgroundTransparent"] === true ? '[data-overlay-instance="' + instanceId + '"], [data-overlay-instance="' + instanceId + '"] * { background-color: transparent !important; background-image: none !important; box-shadow: none !important; }' : '')}</style>
                      {instance.widgetId === SHAPE_WIDGET_ID ? (
                        <div className="h-full w-full" style={{ opacity: Math.max(0, Math.min(100, Number(widgetConfig["opacity"] ?? 100))) / 100 }}><OverlayShape shape={String(widgetConfig["shape"] || instance.elementKey || "rectangle")} color={String(widgetConfig["fillColor"] || widgetConfig["color"] || "#8b5cf6")} strokeColor={String(widgetConfig["strokeColor"] || "#ddd6fe")} strokeWidth={Math.max(0, Number(widgetConfig["strokeWidth"] ?? 2))} fillEnabled={widgetConfig["fillEnabled"] !== false} fillOpacity={Number(widgetConfig["fillOpacity"] ?? 100)}/></div>
                      ) : instance.widgetId === TEXT_WIDGET_ID ? (
                        <div
                          data-overlay-text
                          data-overlay-text-id={instanceId}
                          contentEditable={editingTextId === instanceId}
                          suppressContentEditableWarning
                          spellCheck={false}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            setSelectedInstanceId(instanceId);
                            textDraftsRef.current[instanceId] = String(widgetConfig["text"] || "Texto");
                            setEditingTextId(instanceId);
                            const editable = event.currentTarget;
                            requestAnimationFrame(() => {
                              editable.focus();
                              const selection = window.getSelection();
                              const range = document.createRange();
                              range.selectNodeContents(editable);
                              selection?.removeAllRanges();
                              selection?.addRange(range);
                            });
                          }}
                          onInput={(event) => {
                            if (editingTextId !== instanceId) return;
                            textDraftsRef.current[instanceId] = event.currentTarget.textContent || "";
                          }}
                          onBlur={(event) => {
                            if (editingTextId !== instanceId) return;
                            const text = textDraftsRef.current[instanceId] ?? event.currentTarget.textContent ?? "";
                            delete textDraftsRef.current[instanceId];
                            updateInstance(instanceId, { name: text.slice(0, 80) || "Texto", config: { ...widgetConfig, text } });
                            setEditingTextId(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape" || (event.key === "Enter" && !event.shiftKey)) {
                              event.preventDefault(); event.currentTarget.blur();
                            }
                          }}
                          onPointerDown={(event) => {
                            if (editingTextId === instanceId || event.detail >= 2) event.stopPropagation();
                          }}
                          style={{
                            width: "100%", height: "100%", outline: editingTextId === instanceId ? "1px dashed #c4b5fd" : "none",
                            cursor: editingTextId === instanceId ? "text" : "move", whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                            color: String(widgetConfig["color"] || "#ffffff"), fontSize: Math.max(1, Number(widgetConfig["fontSize"]) || 32),
                            fontFamily: `"${String(widgetConfig["fontFamily"] || "Inter")}", sans-serif`, lineHeight: 1.2,
                          }}
                        >{editingTextId === instanceId || !["cascata", "cascata-baixo", "casanique", "rolar", "encarrilha", "slide-in-cima", "slide-in-baixo", "slide-in-esquerda", "slide-in-direita", "reveal", "flip-in", "bounce-in", "blur-in", "light-speed-in"].includes(String(widgetConfig["animationType"] || ""))
                          ? String(widgetConfig["text"] || "Texto")
                          : <AnimacoesTexto
                              key={String(widgetConfig["animationType"]) + "-" + String(widgetConfig["text"] || "") + "-" + String(widgetConfig["animationDelayMs"] ?? 1000) + "-" + String(widgetConfig["animationDurationMs"] ?? 650) + "-" + String(Boolean(widgetConfig["animationInfinite"])) + "-" + String(Boolean(widgetConfig["animationAlternate"]))}
                              texto={String(widgetConfig["text"] || "Texto")}
                              tipo={String(widgetConfig["animationType"])}
                              atraso={Math.max(0, Number(widgetConfig["animationDelayMs"] ?? 1000))}
                              duracao={Math.max(50, Number(widgetConfig["animationDurationMs"] ?? 650))}
                              infinita={Boolean(widgetConfig["animationInfinite"])}
                              vaiEVem={Boolean(widgetConfig["animationAlternate"])}
                              repetir={Boolean(widgetConfig["animationInfinite"])}
                            />}</div>
                      ) : (
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
                      )}
                    </div>
                    {config.globalStyleConfig?.texture && config.globalStyleConfig.texture !== "none" && (
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20" style={getGlobalTextureStyle(String(config.globalStyleConfig.texture))} />
                    )}
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
      <Overlay_Editor
        catalog={catalog}
        onAddFragment={addWidgetComponent}
        onAddText={addTextInstance}
        onAddShape={addShapeInstance}
        gridSettings={gridSettings}
        onUpdateGridSettings={updateGridSettings}
        backgroundColor={selectedElementBackgroundColor}
        backgroundMode={selectedBackgroundMode}
        backgroundOpacity={Math.max(0, Math.min(100, selectedBackgroundOpacity))}
        onUpdateBackgroundColor={updateSelectedBackgroundColor}
        onUpdateBackgroundMode={updateSelectedBackgroundMode}
        onUpdateBackgroundOpacity={updateSelectedBackgroundOpacity}
        globalStyleConfig={{ borderEnabled: Boolean(config.globalStyleConfig?.borderEnabled), borderWidth: Math.max(1, Math.min(100, Number(config.globalStyleConfig?.borderWidth) || 1)), borderColor: String(config.globalStyleConfig?.borderColor || "#dce6ff"), borderRadius: Math.max(1, Math.min(100, Number(config.globalStyleConfig?.borderRadius) || 16)), texture: String(config.globalStyleConfig?.texture || "none"), colorEffectEnabled: Boolean(config.globalStyleConfig?.colorEffectEnabled), colorEffect: String(config.globalStyleConfig?.colorEffect || "glass") }}
        onUpdateGlobalStyleConfig={(patch) => setConfig((current) => ({ ...current, globalStyleConfig: { borderEnabled: false, borderWidth: 1, borderColor: "#dce6ff", borderRadius: 16, texture: "none", colorEffectEnabled: false, colorEffect: "glass", ...(current.globalStyleConfig || {}), ...patch } }))}
        layers={(config.instances || []).map((instance, index) => ({
          id: instance.id || `${instance.widgetId}-${index}`,
          name: String(instance.name || (instance.widgetId === TEXT_WIDGET_ID ? instance.config?.text : "") || catalog.find((item) => item.id === instance.widgetId)?.name || instance.widgetId || `Elemento ${index + 1}`),
          widgetId: String(instance.widgetId || ""),
          visible: instance.visible !== false,
          locked: Boolean(instance.locked),
          selected: (instance.id || `${instance.widgetId}-${index}`) === selectedInstanceId,
          zIndex: Number(instance.zIndex) || index + 1,
        })).sort((a, b) => b.zIndex - a.zIndex)}
        onSelectLayer={(id) => setSelectedInstanceId(id)}
        onMoveLayer={(id, delta) => setConfig((current) => {
          const normalized = (current.instances || []).map((item, index) => ({ ...item, id: item.id || `${item.widgetId}-${index}` })).sort((a, b) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0));
          const from = normalized.findIndex((item) => item.id === id);
          const to = from + delta;
          if (from < 0 || to < 0 || to >= normalized.length) return current;
          const [moved] = normalized.splice(from, 1);
          normalized.splice(to, 0, moved);
          return { ...current, instances: normalized.map((item, index) => ({ ...item, zIndex: normalized.length - index })) };
        })}
        onToggleLayerVisibility={(id) => setConfig((current) => ({ ...current, instances: (current.instances || []).map((item, index) => (item.id || `${item.widgetId}-${index}`) === id ? { ...item, visible: item.visible === false } : item) }))}
        onToggleLayerLock={(id) => setConfig((current) => ({ ...current, instances: (current.instances || []).map((item, index) => (item.id || `${item.widgetId}-${index}`) === id ? { ...item, locked: !item.locked } : item) }))}
        onDeleteLayer={(id) => deleteInstance(id)}
        onAddGuide={(orientation) => {
          const id = `guide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          if (orientation === "vertical") updateGridSettings({ verticalGuides: [...gridSettings.verticalGuides, { id, x: Math.round(size.width / 2) }] });
          else updateGridSettings({ horizontalGuides: [...gridSettings.horizontalGuides, { id, y: Math.round(size.height / 2) }] });
        }}
        onFontChange={(fontFamily) => applyTextStyleToSelectedText({ fontFamily })}
        onTextStyleChange={applyTextStyleToSelectedText}
        selectedInstanceWidgetId={config.instances?.find((item, index) => (item.id || `${item.widgetId}-${index}`) === selectedInstanceId)?.widgetId ?? null}
        selectedInstanceConfig={config.instances?.find((item, index) => (item.id || `${item.widgetId}-${index}`) === selectedInstanceId)?.config ?? null}
        onSelectWidget={(widgetId) => {
          const existing = (config.instances || []).find((item) => item.widgetId === widgetId && item.isFullWidget !== false);
          if (existing?.id) setSelectedInstanceId(existing.id);
          else {
            const definition = catalog.find((widget) => widget.id === widgetId);
            if (definition) addWidget(definition);
          }
        }}
        onUpdateSelectedConfig={(patch) => {
          if (!selectedInstanceId) return;
          const selected = (config.instances || []).find((item, index) => (item.id || `${item.widgetId}-${index}`) === selectedInstanceId);
          if (!selected) return;
          updateInstance(selectedInstanceId, { config: { ...(selected.config || {}), ...patch } });
        }}
      />
    </section>
  );
}
