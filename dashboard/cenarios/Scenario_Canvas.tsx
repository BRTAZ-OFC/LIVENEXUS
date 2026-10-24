import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";
import HorizontalMenu from "../components/HorizontalMenu";
import Cenario_WidgetElementRenderer from "./Cenario_WidgetElementRenderer";
import { TWITCH_WIDGETS_CATALOG } from "../widget/Widget_twitchWidgetsCatalog";
import { registerCanvasHotkeyHandler } from "../hotkeys/useGlobalHotkeys";
import Cenario_Editor from "./Cenario_Editor";
import AnimacoesTexto from "../animacoes/AnimacoesTexto";

function OverlayShape({
  shape,
  color,
  strokeColor,
  strokeWidth,
  fillEnabled,
  fillOpacity,
}: {
  shape: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  fillEnabled: boolean;
  fillOpacity: number;
}) {
  const fill = fillEnabled ? color : "none";
  const common = {
    fill,
    fillOpacity: Math.max(0, Math.min(100, Number(fillOpacity) || 0)) / 100,
    stroke: strokeColor,
    strokeWidth,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const points: Record<string, string> = {
    triangle: "50,4 96,94 4,94",
    "right-triangle": "5,5 5,95 95,95",
    diamond: "50,3 97,50 50,97 3,50",
    parallelogram: "25,5 97,5 75,95 3,95",
    trapezoid: "25,5 75,5 97,95 3,95",
    pentagon: "50,3 97,38 79,96 21,96 3,38",
    hexagon: "25,4 75,4 97,50 75,96 25,96 3,50",
    heptagon: "50,3 88,20 98,55 76,90 38,98 5,70 12,30",
    octagon: "30,3 70,3 97,30 97,70 70,97 30,97 3,70 3,30",
    decagon: "50,2 79,12 96,35 96,65 79,88 50,98 21,88 4,65 4,35 21,12",
    "star-6": "50,3 61,35 95,35 68,55 78,91 50,70 22,91 32,55 5,35 39,35",
    "arrow-right": "3,30 60,30 60,7 97,50 60,93 60,70 3,70",
    "arrow-left": "97,30 40,30 40,7 3,50 40,93 40,70 97,70",
    "arrow-right-2": "10,35 60,35 60,10 90,50 60,90 60,65 10,65",
    "arrow-left-2": "90,35 40,35 40,10 10,50 40,90 40,65 90,65",
    "arrow-up": "30,97 30,40 7,40 50,3 93,40 70,40 70,97",
    "arrow-down": "30,3 70,3 70,60 93,60 50,97 7,60 30,60",
    chevron: "5,5 50,35 95,5 95,35 50,65 5,35",
    cross: "35,3 65,3 65,35 97,35 97,65 65,65 65,97 35,97 35,65 3,65 3,35 35,35",
    plus: "38,3 62,3 62,38 97,38 97,62 62,62 62,97 38,97 38,62 3,62 3,38 38,38",
    minus: "5,38 95,38 95,62 5,62",
  };

  if (["circle", "ellipse", "ring"].includes(shape)) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <ellipse
          cx="50"
          cy="50"
          rx={shape === "ellipse" ? 48 : 43}
          ry={shape === "ellipse" ? 30 : 43}
          fill={shape === "ring" ? "none" : fill}
          fillOpacity={Math.max(0, Math.min(100, Number(fillOpacity) || 0)) / 100}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (["rectangle", "square", "rounded-rectangle"].includes(shape)) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <rect
          x={shape === "square" ? 5 : 2}
          y={shape === "square" ? 5 : 20}
          width={shape === "square" ? 90 : 96}
          height={shape === "square" ? 90 : 60}
          rx={shape === "rounded-rectangle" ? 12 : 0}
          {...common}
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <polygon points={points[shape] || points["triangle"]} {...common} />
    </svg>
  );
}

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
  subScenarios?: { id: string; name: string; instances: ScenarioInstance[] }[];
  globalStyleConfig?: {
    borderEnabled?: boolean;
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    texture?: string;
    colorEffectEnabled?: boolean;
    colorEffect?: string;
  };
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

const COLOR_EFFECT_FILTERS: Record<string, string> = {
  glass: "saturate(1.25) contrast(1.04) brightness(1.04)",
  chrome: "saturate(0.35) contrast(1.35) brightness(1.08)",
  mirror: "saturate(1.4) contrast(1.2)",
  crystal: "saturate(1.3) brightness(1.12) contrast(0.92)",
  hologram: "hue-rotate(38deg) saturate(1.8) contrast(1.08)",
  neon: "saturate(2.2) contrast(1.25) brightness(1.08)",
  iridescent: "hue-rotate(75deg) saturate(1.55)",
  metal: "grayscale(0.65) contrast(1.35) brightness(1.12)",
  liquid: "saturate(1.65) contrast(1.08)",
  frost: "saturate(0.65) brightness(1.1) contrast(0.9)",
  gold: "sepia(0.8) saturate(1.8) contrast(1.12)",
  silver: "grayscale(0.85) contrast(1.2) brightness(1.12)",
  copper: "sepia(0.65) saturate(1.35) hue-rotate(-12deg)",
  ruby: "hue-rotate(315deg) saturate(1.8) contrast(1.12)",
  sapphire: "hue-rotate(190deg) saturate(1.7) contrast(1.1)",
  emerald: "hue-rotate(95deg) saturate(1.65) contrast(1.08)",
  amethyst: "hue-rotate(250deg) saturate(1.55)",
  duotone: "grayscale(0.8) sepia(0.35) hue-rotate(180deg) saturate(1.5)",
  thermal: "hue-rotate(155deg) saturate(2) contrast(1.15)",
  vintage: "sepia(0.55) saturate(0.8) contrast(0.95)",
  dream: "hue-rotate(22deg) saturate(1.35) brightness(1.12)",
};

const COLOR_EFFECT_OVERLAYS: Record<string, string> = {
  glass:
    "linear-gradient(135deg, rgba(220,245,255,.48), rgba(125,190,220,.28), rgba(255,255,255,.42))",
  chrome:
    "linear-gradient(135deg, rgba(245,248,255,.92), rgba(105,120,145,.78), rgba(235,240,250,.92))",
  mirror:
    "linear-gradient(135deg, rgba(240,248,255,.78), rgba(70,100,130,.68), rgba(220,235,255,.86))",
  crystal:
    "linear-gradient(135deg, rgba(190,245,255,.62), rgba(125,190,255,.45), rgba(245,255,255,.72))",
  hologram:
    "linear-gradient(120deg, rgba(255,80,220,.68), rgba(65,225,255,.62), rgba(180,100,255,.7))",
  neon: "linear-gradient(135deg, rgba(255,0,220,.72), rgba(0,255,235,.62), rgba(100,0,255,.68))",
  iridescent:
    "linear-gradient(120deg, rgba(255,120,210,.68), rgba(100,220,255,.62), rgba(190,255,140,.62), rgba(210,150,255,.68))",
  metal:
    "linear-gradient(135deg, rgba(235,238,242,.88), rgba(85,95,110,.78), rgba(210,215,225,.9))",
  liquid:
    "linear-gradient(135deg, rgba(50,210,230,.56), rgba(35,110,230,.54), rgba(100,245,220,.6))",
  frost:
    "linear-gradient(135deg, rgba(225,240,255,.78), rgba(195,215,235,.68), rgba(250,252,255,.82))",
  gold: "linear-gradient(135deg, rgba(255,210,65,.92), rgba(190,125,15,.84), rgba(255,235,135,.92))",
  silver:
    "linear-gradient(135deg, rgba(245,248,255,.92), rgba(145,155,170,.86), rgba(225,232,242,.92))",
  copper: "linear-gradient(135deg, rgba(235,135,75,.9), rgba(145,65,35,.82), rgba(255,185,125,.9))",
  ruby: "linear-gradient(135deg, rgba(255,45,85,.9), rgba(145,0,35,.82), rgba(255,105,125,.9))",
  sapphire:
    "linear-gradient(135deg, rgba(45,115,255,.9), rgba(5,35,145,.84), rgba(105,185,255,.9))",
  emerald: "linear-gradient(135deg, rgba(30,210,125,.9), rgba(0,95,55,.84), rgba(105,255,175,.9))",
  amethyst:
    "linear-gradient(135deg, rgba(175,85,255,.9), rgba(75,25,145,.84), rgba(220,155,255,.9))",
  duotone: "linear-gradient(135deg, rgba(30,215,220,.86), rgba(60,45,160,.86))",
  thermal: "linear-gradient(135deg, rgba(255,35,35,.92), rgba(255,190,0,.86), rgba(30,90,255,.9))",
  vintage:
    "linear-gradient(135deg, rgba(190,135,75,.78), rgba(115,75,45,.7), rgba(240,205,145,.8))",
  dream:
    "linear-gradient(135deg, rgba(255,165,215,.62), rgba(160,155,255,.58), rgba(145,230,255,.62))",
};

function getGlobalTextureStyle(texture: string): CSSProperties {
  const textures: Record<string, CSSProperties> = {
    glass: {
      backgroundImage:
        "linear-gradient(135deg, rgba(255,255,255,.34), rgba(255,255,255,.03) 45%, rgba(160,220,255,.16))",
      backdropFilter: "blur(1px)",
      mixBlendMode: "screen",
    },
    "brushed-metal": {
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(255,255,255,.12) 0px, rgba(255,255,255,.02) 1px, transparent 2px, transparent 4px)",
      mixBlendMode: "screen",
    },
    carbon: {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(255,255,255,.12) 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,.18) 0 2px, transparent 2px 5px)",
      mixBlendMode: "overlay",
    },
    noise: {
      backgroundImage: "radial-gradient(rgba(255,255,255,.22) .7px, transparent .8px)",
      backgroundSize: "4px 4px",
      mixBlendMode: "overlay",
    },
    stripes: {
      backgroundImage:
        "repeating-linear-gradient(135deg, rgba(255,255,255,.14) 0 2px, transparent 2px 7px)",
      mixBlendMode: "overlay",
    },
    dots: {
      backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1.5px)",
      backgroundSize: "7px 7px",
      mixBlendMode: "screen",
    },
    holographic: {
      backgroundImage:
        "linear-gradient(120deg, rgba(255,0,180,.18), rgba(0,220,255,.22), rgba(255,220,0,.16), rgba(130,80,255,.2))",
      mixBlendMode: "color-dodge",
    },
    marble: {
      backgroundImage:
        "repeating-radial-gradient(ellipse at 20% 30%, transparent 0 9px, rgba(255,255,255,.15) 10px 11px, transparent 12px 20px)",
      mixBlendMode: "screen",
    },
  };
  return textures[texture] || {};
}
const catalog = TWITCH_WIDGETS_CATALOG as unknown as WidgetDefinition[];

// isObject: executa a etapa descrita pelo nome da função.
function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// sourceFor: executa a etapa descrita pelo nome da função.
function sourceFor(row: ScenarioRecord): JsonObject {
  if (isObject(row.settings) && Object.keys(row.settings).length) return row.settings;
  if (isObject(row.config) && Object.keys(row.config).length) return row.config;
  if (isObject(row.data) && Object.keys(row.data).length) return row.data;
  return row as unknown as JsonObject;
}

type AlignmentType =
  "left" | "center-h" | "right" | "top" | "center-v" | "bottom" | "distribute-h" | "distribute-v";

function alignSelectedInstances<
  T extends { id?: string; x?: number; y?: number; width?: number; height?: number },
>(
  instances: T[],
  selectedIds: string[],
  type: AlignmentType,
  canvasWidth: number,
  canvasHeight: number,
  alignToCanvas: boolean = false,
): T[] {
  if (selectedIds.length === 0) return instances;

  const targetIds = new Set(selectedIds);
  const selectedItems = instances.filter((item) => item.id && targetIds.has(item.id));
  if (selectedItems.length === 0) return instances;

  if (selectedItems.length === 1 || alignToCanvas) {
    return instances.map((item) => {
      if (!item.id || !targetIds.has(item.id)) return item;
      const w = Math.max(1, Number(item.width) || 100);
      const h = Math.max(1, Number(item.height) || 100);
      let newX = Number(item.x) || 0;
      let newY = Number(item.y) || 0;

      switch (type) {
        case "left":
          newX = 0;
          break;
        case "center-h":
          newX = Math.round((canvasWidth - w) / 2);
          break;
        case "right":
          newX = Math.round(canvasWidth - w);
          break;
        case "top":
          newY = 0;
          break;
        case "center-v":
          newY = Math.round((canvasHeight - h) / 2);
          break;
        case "bottom":
          newY = Math.round(canvasHeight - h);
          break;
      }
      return {
        ...item,
        x: newX,
        y: newY,
      };
    });
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  selectedItems.forEach((item) => {
    const x = Number(item.x) || 0;
    const y = Number(item.y) || 0;
    const w = Math.max(1, Number(item.width) || 100);
    const h = Math.max(1, Number(item.height) || 100);
    if (x < minX) minX = x;
    if (x + w > maxX) maxX = x + w;
    if (y < minY) minY = y;
    if (y + h > maxY) maxY = y + h;
  });

  const boundingCenterX = Math.round((minX + maxX) / 2);
  const boundingCenterY = Math.round((minY + maxY) / 2);

  if (type === "distribute-h" && selectedItems.length >= 3) {
    const sorted = [...selectedItems].sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0));
    const firstX = Number(sorted[0].x) || 0;
    const lastX = Number(sorted[sorted.length - 1].x) || 0;
    const totalSpan = lastX - firstX;
    const step = totalSpan / (sorted.length - 1);
    const posMap = new Map<string, number>();
    sorted.forEach((item, idx) => {
      if (item.id) posMap.set(item.id, Math.round(firstX + step * idx));
    });

    return instances.map((item) => {
      if (!item.id || !targetIds.has(item.id) || !posMap.has(item.id)) return item;
      const w = Math.max(1, Number(item.width) || 100);
      const newX = posMap.get(item.id)!;
      return {
        ...item,
        x: newX,
      };
    });
  }

  if (type === "distribute-v" && selectedItems.length >= 3) {
    const sorted = [...selectedItems].sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0));
    const firstY = Number(sorted[0].y) || 0;
    const lastY = Number(sorted[sorted.length - 1].y) || 0;
    const totalSpan = lastY - firstY;
    const step = totalSpan / (sorted.length - 1);
    const posMap = new Map<string, number>();
    sorted.forEach((item, idx) => {
      if (item.id) posMap.set(item.id, Math.round(firstY + step * idx));
    });

    return instances.map((item) => {
      if (!item.id || !targetIds.has(item.id) || !posMap.has(item.id)) return item;
      const h = Math.max(1, Number(item.height) || 100);
      const newY = posMap.get(item.id)!;
      return {
        ...item,
        y: newY,
      };
    });
  }

  return instances.map((item) => {
    if (!item.id || !targetIds.has(item.id)) return item;
    const w = Math.max(1, Number(item.width) || 100);
    const h = Math.max(1, Number(item.height) || 100);
    let newX = Number(item.x) || 0;
    let newY = Number(item.y) || 0;

    switch (type) {
      case "left":
        newX = minX;
        break;
      case "center-h":
        newX = Math.round(boundingCenterX - w / 2);
        break;
      case "right":
        newX = Math.round(maxX - w);
        break;
      case "top":
        newY = minY;
        break;
      case "center-v":
        newY = Math.round(boundingCenterY - h / 2);
        break;
      case "bottom":
        newY = Math.round(maxY - h);
        break;
    }

    return {
      ...item,
      x: newX,
      y: newY,
    };
  });
}

// normalizeScenario: executa a etapa descrita pelo nome da função.
function normalizeScenario(row: ScenarioRecord): ScenarioConfig {
  const source = sourceFor(row);
  const backgroundSource = isObject(source.background) ? source.background : {};
  const rawInstances = Array.isArray(source.instances)
    ? (source.instances as ScenarioInstance[])
    : [];
  const instances = rawInstances.map((item, idx) => ({
    ...item,
    id: item.id || `scen-inst-${idx}-${Math.random().toString(36).slice(2, 7)}`,
  }));

  const rawSubScenarios = Array.isArray(source.subScenarios) ? source.subScenarios : [];
  const subScenarios = rawSubScenarios.map((sub: any, subIdx: number) => ({
    id: String(sub.id || `sub-${subIdx + 1}`),
    name: String(sub.name || `Sub Cenário ${subIdx + 1}`),
    instances: Array.isArray(sub.instances)
      ? sub.instances.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `scen-sub-inst-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        }))
      : [],
  }));

  return {
    id: String(row.id ?? source.id ?? ""),
    name: String(source.name ?? row.name ?? "Cenário"),
    visualizerSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    instances,
    background: {
      type: String(backgroundSource.type ?? "transparent"),
      color: typeof backgroundSource.color === "string" ? backgroundSource.color : "#07111f",
      gradient:
        typeof backgroundSource.gradient === "string"
          ? backgroundSource.gradient
          : "linear-gradient(135deg, #07111f, #15112c)",
      image: typeof backgroundSource.image === "string" ? backgroundSource.image : "",
      opacity: Math.max(0, Math.min(100, Number(backgroundSource.opacity ?? 100))),
    },
    subScenarios,
  };
}

// backgroundStyle: executa a etapa descrita pelo nome da função.
function backgroundStyle(background: CanvasBackground): CSSProperties {
  if (background.type === "solid") return { backgroundColor: background.color || "#07111f" };
  if (background.type === "gradient")
    return { backgroundImage: background.gradient || "linear-gradient(135deg, #07111f, #15112c)" };
  if (background.type === "image" && background.image) {
    return {
      backgroundImage: 'url("' + background.image.replace(/"/g, "%22") + '")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return {
    backgroundColor: "#07111f",
    backgroundImage:
      "linear-gradient(45deg, rgba(255,255,255,.045) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,.045) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,.045) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.045) 75%)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
  };
}

// ScenarioCanvas: executa a etapa descrita pelo nome da função.
export default function ScenarioCanvas({
  scenarioId,
  onBack,
}: {
  scenarioId: string;
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const guidePointer = useRef<{ id: string; orientation: "vertical" | "horizontal" } | null>(null);
  const lastClickRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });
  const [scale, setScale] = useState(1280 / 1920);
  const [zoomMode, setZoomMode] = useState<"fit" | "960x540" | "1024x768" | "1280x720">("1280x720");
  const [scenario, setScenario] = useState<ScenarioConfig | null>(null);

  const [subScenarios, setSubScenarios] = useState<
    { id: string; name: string; instances: ScenarioInstance[] }[]
  >([]);
  const [selectedSubScenarioId, setSelectedSubScenarioId] = useState<string>("");
  const [rowKey, setRowKey] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(true);
  const [gridSettings, setGridSettings] = useState<{
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
    showSafeAreas: boolean;
    verticalGuides: { id: string; x: number }[];
    horizontalGuides: { id: string; y: number }[];
  }>({
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,
    showSafeAreas: false,
    verticalGuides: [],
    horizontalGuides: [],
  });

  const TEXT_WIDGET_ID = "__livenexus_text__";
  const SHAPE_WIDGET_ID = "__livenexus_shape__";
  const IMAGE_WIDGET_ID = "__livenexus_image__";

  function addTextInstance(text: string, fontSize: number, color: string, fontFamily: string) {
    if (!scenario) return;
    const index = scenario.instances.length;
    const width = 400;
    const height = 100;
    const id = "scenario-text-" + Date.now() + "-" + index;
    const instance: ScenarioInstance = {
      id,
      widgetId: TEXT_WIDGET_ID,
      elementKey: "text",
      isFullWidget: true,
      name: text.slice(0, 30) || "Texto",
      x: 200 + (index % 5) * 30,
      y: 200 + (index % 5) * 30,
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: {
        text,
        fontSize,
        color,
        textColor: color,
        fontFamily,
      },
    };
    const nextInstances = [...scenario.instances, instance];
    syncInstancesToSubScenario(nextInstances);
    setSelectedId(id);
    setSelectedIds([id]);
  }

  function addShapeInstance(shape: string) {
    if (!scenario) return;
    const index = scenario.instances.length;
    const width = 200;
    const height = 200;
    const id = "scenario-shape-" + Date.now() + "-" + index;
    const instance: ScenarioInstance = {
      id,
      widgetId: SHAPE_WIDGET_ID,
      elementKey: shape,
      isFullWidget: true,
      name: `Forma (${shape})`,
      x: 300 + (index % 5) * 30,
      y: 300 + (index % 5) * 30,
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: {
        shape,
        shapeType: shape,
        fillColor: "#8b5cf6",
        color: "#8b5cf6",
        textColor: "#8b5cf6",
        strokeColor: "#ddd6fe",
        strokeWidth: 2,
        fillEnabled: true,
        fillOpacity: 100,
      },
    };
    const nextInstances = [...scenario.instances, instance];
    syncInstancesToSubScenario(nextInstances);
    setSelectedId(id);
    setSelectedIds([id]);
  }

  function addImageInstance(src: string, name: string) {
    if (!scenario) return;
    const index = scenario.instances.length;
    const width = 320;
    const height = 240;
    const id = "scenario-image-" + Date.now() + "-" + index;
    const instance: ScenarioInstance = {
      id,
      widgetId: IMAGE_WIDGET_ID,
      elementKey: "image",
      isFullWidget: true,
      name: name || "Imagem",
      x: 350 + (index % 5) * 30,
      y: 350 + (index % 5) * 30,
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: {
        src,
        bgImage: src,
        backgroundImage: src,
        imageName: name || "Imagem",
        objectFit: "contain",
      },
    };
    const nextInstances = [...scenario.instances, instance];
    syncInstancesToSubScenario(nextInstances);
    setSelectedId(id);
    setSelectedIds([id]);
  }

  function addWidgetComponent(definition: WidgetDefinition, elementKey: string, label: string) {
    if (!scenario) return;
    const index = scenario.instances.length;
    const width = definition.defaultWidth || 320;
    const height = definition.defaultHeight || 120;
    const id = "scenario-fragment-" + Date.now() + "-" + index;
    const instance: ScenarioInstance = {
      id,
      widgetId: definition.id,
      elementKey,
      isFullWidget: false,
      name: label || definition.name,
      x: 200 + (index % 6) * 25,
      y: 200 + (index % 6) * 25,
      width,
      height,
      zIndex: index + 1,
      visible: true,
      config: { ...(definition.defaultConfig || {}) },
    };
    const nextInstances = [...scenario.instances, instance];
    syncInstancesToSubScenario(nextInstances);
    setSelectedId(id);
    setSelectedIds([id]);
  }

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
        const payload = (await response.json()) as {
          ok?: boolean;
          items?: ScenarioRecord[];
          error?: string;
        };
        if (!response.ok || !payload.ok || !Array.isArray(payload.items)) {
          throw new Error(payload.error || "Não foi possível carregar os cenários.");
        }
        const row = payload.items.find((item) => String(item.id ?? "") === scenarioId);
        if (!row) throw new Error("Cenário não encontrado para esta conta.");
        if (!cancelled) {
          const normalized = normalizeScenario(row);
          setScenario(normalized);
          setSubScenarios(
            normalized.subScenarios && normalized.subScenarios.length > 0
              ? normalized.subScenarios
              : [{ id: "sub-1", name: "Sub Cenário 1", instances: normalized.instances }],
          );
          setSelectedSubScenarioId(
            normalized.subScenarios && normalized.subScenarios.length > 0
              ? normalized.subScenarios[0].id
              : "sub-1",
          );
          setRowKey(String(row.__rowKey ?? ""));
        }
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Erro ao carregar o cenário.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadScenario();
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const maxAllowedWidth = Math.max(280, container.clientWidth - 24);
      const maxAllowedHeight = Math.max(240, window.innerHeight * 0.42);

      let targetWidth = 1280;
      if (zoomMode === "960x540") targetWidth = 960;
      else if (zoomMode === "1024x768") targetWidth = 1024;
      else if (zoomMode === "1280x720") targetWidth = 1280;
      else if (zoomMode === "fit") {
        targetWidth = Math.min(maxAllowedWidth, maxAllowedHeight * (1920 / 1080));
      }

      const effectiveWidth = Math.min(targetWidth, maxAllowedWidth);
      const computedScale = Math.max(0.15, effectiveWidth / CANVAS_WIDTH);
      setScale(computedScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [zoomMode]);

  function syncInstancesToSubScenario(nextInstances: ScenarioInstance[]) {
    setSubScenarios((prev) =>
      prev.map((s) => (s.id === selectedSubScenarioId ? { ...s, instances: nextInstances } : s)),
    );
    setScenario((current) => (current ? { ...current, instances: nextInstances } : current));
  }

  function handleSelectSubScenario(subId: string) {
    setSelectedSubScenarioId(subId);
    setSelectedId(null);
    setSelectedIds([]);
    const sub = subScenarios.find((s) => s.id === subId);
    if (sub && scenario) {
      setScenario({
        ...scenario,
        instances: sub.instances,
      });
    }
  }

  useEffect(() => {
    registerCanvasHotkeyHandler({
      handleKeyDown: (event: KeyboardEvent) => {
        const activeIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        if (activeIds.length === 0 || !scenario) return false;
        if (event.altKey || event.ctrlKey || event.metaKey) return false;

        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          deleteInstance(activeIds);
          setNotice("");
          return true;
        }

        const step = event.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (event.key === "ArrowLeft") dx = -step;
        else if (event.key === "ArrowRight") dx = step;
        else if (event.key === "ArrowUp") dy = -step;
        else if (event.key === "ArrowDown") dy = step;
        else return false;

        event.preventDefault();
        const targetSet = new Set(activeIds);
        const nextInstances = scenario.instances.map((item, index) => {
          const itemKey = item.id || `${item.widgetId}-${index}`;
          if (!targetSet.has(itemKey)) return item;
          const width = Math.max(1, Number(item.width) || 320);
          const height = Math.max(1, Number(item.height) || 120);
          return {
            ...item,
            x: (Number(item.x) || 0) + dx,
            y: (Number(item.y) || 0) + dy,
          };
        });
        syncInstancesToSubScenario(nextInstances);
        setNotice("");
        return true;
      },
    });

    return () => {
      registerCanvasHotkeyHandler(null);
    };
  }, [scenario, selectedId, selectedIds, selectedSubScenarioId]);

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

    const nextInstances = [...scenario.instances, instance];
    syncInstancesToSubScenario(nextInstances);
    setSelectedId(id);
    setSelectedIds([id]);
    setNotice("");
  }

  function updateInstance(instanceId: string, patch: Partial<ScenarioInstance>) {
    if (!scenario) return;
    const nextInstances = scenario.instances.map((item, index) =>
      (item.id || `${item.widgetId}-${index}`) === instanceId ? { ...item, ...patch } : item,
    );
    syncInstancesToSubScenario(nextInstances);
    setNotice("");
  }

  function deleteInstance(instanceId: string | string[]) {
    if (!scenario) return;
    const idsToDelete = new Set(Array.isArray(instanceId) ? instanceId : [instanceId]);
    const nextInstances = scenario.instances.filter(
      (item, index) => !idsToDelete.has(item.id || `${item.widgetId}-${index}`),
    );
    syncInstancesToSubScenario(nextInstances);
    setSelectedId((prev) => (prev && idsToDelete.has(prev) ? null : prev));
    setSelectedIds((prev) => prev.filter((id) => !idsToDelete.has(id)));
  }

  function handleAlignSelected(type: AlignmentType, alignToCanvas: boolean = false) {
    if (!scenario) return;
    const activeIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (activeIds.length === 0) return;

    const aligned = alignSelectedInstances(
      scenario.instances,
      activeIds,
      type,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      alignToCanvas,
    );
    syncInstancesToSubScenario(aligned);
  }

  function beginDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    instance: ScenarioInstance,
    index: number,
    mode: "move" | "resize",
  ) {
    const instanceId = String(instance.id ?? String(instance.widgetId) + "-" + index);

    // Double-click detection for text elements
    const now = Date.now();
    const timeDiff = now - lastClickRef.current.time;
    const isSameInstance = lastClickRef.current.id === instanceId;
    lastClickRef.current = { id: instanceId, time: now };

    const isTextWidget =
      instance.widgetId === "__livenexus_text__" ||
      instance.widgetId === "library-text" ||
      String(instance.widgetId || "").includes("text") ||
      instance.elementKey === "text" ||
      instance.config?.text !== undefined;

    if (isSameInstance && timeDiff < 450 && isTextWidget) {
      setEditingId(instanceId);
      setSelectedId(instanceId);
      setSelectedIds([instanceId]);
      dragRef.current = null;
      return;
    }

    if (editingId === instanceId) {
      return;
    }

    if (editingId && editingId !== instanceId) {
      setEditingId(null);
    }

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) =>
        prev.includes(instanceId) ? prev.filter((i) => i !== instanceId) : [...prev, instanceId],
      );
      setSelectedId(instanceId);
    } else {
      setSelectedId(instanceId);
      setSelectedIds([instanceId]);
    }

    if (
      mode === "move" &&
      (event.target as HTMLElement).closest("button,input,textarea,select,a,[data-no-widget-drag]")
    )
      return;
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
    const maxZ = Math.max(
      0,
      ...(scenario?.instances ?? []).map((item) => Number(item.zIndex) || 0),
    );
    updateInstance(instanceId, { zIndex: maxZ + 1 });
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !(event.buttons & 1)) return;
    const dx = (event.clientX - drag.pointerX) / scale;
    const dy = (event.clientY - drag.pointerY) / scale;
    if (drag.mode === "move") {
      updateInstance(drag.instanceId, {
        x: Math.round(drag.left + dx),
        y: Math.round(drag.top + dy),
      });
      return;
    }
    updateInstance(drag.instanceId, {
      width: Math.round(Math.max(40, drag.width + dx)),
      height: Math.round(Math.max(24, drag.height + dy)),
    });
  }

  async function saveScenario() {
    if (!scenario || !rowKey || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updatedSubScenarios = subScenarios.map((s) =>
        s.id === selectedSubScenarioId ? { ...s, instances: scenario.instances } : s,
      );
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
            subScenarios: updatedSubScenarios,
          },
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        item?: ScenarioRecord;
        error?: string;
      };
      if (!response.ok || !payload.ok)
        throw new Error(payload.error || "Não foi possível salvar o cenário.");
      if (payload.item?.__rowKey) setRowKey(payload.item.__rowKey);
      setNotice("Cenário salvo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar o cenário.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    {
      /* Estrutura visual: div. */
    }
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-300">
        <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> Carregando cenário...
      </div>
    );
  }

  if (!scenario) {
    {
      /* Estrutura visual: section. */
    }
    return (
      <section className="space-y-4 p-4 sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"
        >
          <ArrowLeft size={14} /> Voltar aos cenários
        </button>
        <p
          role="alert"
          className="rounded-lg border border-rose-400/20 bg-rose-950/20 p-3 text-sm text-rose-200"
        >
          {error || "Cenário indisponível."}
        </p>
      </section>
    );
  }

  {
    /* Estrutura visual: section. */
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-300/10 pb-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-cyan-200"
          >
            <ArrowLeft size={14} /> Voltar aos cenários
          </button>
          <h1 className="truncate text-xl font-extrabold text-white sm:text-2xl">
            {scenario.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newId = `sub-${Date.now()}`;
              setSubScenarios([
                ...subScenarios,
                { id: newId, name: `Sub Cenário ${subScenarios.length + 1}`, instances: [] },
              ]);
              setSelectedSubScenarioId(newId);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15"
          >
            <Layers size={14} /> Criar Sub Cenário
          </button>
          <input
            type="text"
            value={subScenarios.find((s) => s.id === selectedSubScenarioId)?.name || ""}
            onChange={(e) =>
              setSubScenarios(
                subScenarios.map((s) =>
                  s.id === selectedSubScenarioId ? { ...s, name: e.target.value } : s,
                ),
              )
            }
            className="w-36 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
          />
          <select
            value={selectedSubScenarioId}
            onChange={(e) => handleSelectSubScenario(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
          >
            {subScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {scenario.background.type === "solid" && (
            <label
              title="Cor do fundo"
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-2 text-[11px] text-slate-300"
            >
              <input
                aria-label="Cor do fundo"
                type="color"
                value={scenario.background.color || "#07111f"}
                onChange={(event) =>
                  setScenario((current) =>
                    current
                      ? {
                          ...current,
                          background: { ...current.background, color: event.target.value },
                        }
                      : current,
                  )
                }
                className="h-6 w-7 cursor-pointer bg-transparent"
              />
            </label>
          )}
          {scenario.background.type === "image" && (
            <input
              aria-label="URL da imagem de fundo"
              value={scenario.background.image || ""}
              onChange={(event) =>
                setScenario((current) =>
                  current
                    ? {
                        ...current,
                        background: { ...current.background, image: event.target.value },
                      }
                    : current,
                )
              }
              placeholder="URL da imagem"
              className="w-36 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-[11px] text-white"
            />
          )}
          <button
            type="button"
            onClick={() => {
              const active = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
              if (active.length > 0) {
                deleteInstance(active);
              }
            }}
            disabled={!selectedId && selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"
          >
            <Trash2 size={14} /> Excluir selecionado
          </button>
          <button
            type="button"
            onClick={() => void saveScenario()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-50"
          >
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvando..." : "Salvar cenário"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-300/10 bg-slate-950/60 p-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            Alinhamento:
          </span>
          <button
            type="button"
            title="Esquerda"
            disabled={!selectedId && selectedIds.length === 0}
            onClick={() => handleAlignSelected("left", true)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white disabled:opacity-30"
          >
            ⇥ Esquerda
          </button>
          <button
            type="button"
            title="Centro Horizontal"
            disabled={!selectedId && selectedIds.length === 0}
            onClick={() => handleAlignSelected("center-h", true)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white disabled:opacity-30"
          >
            ↔ Centro H
          </button>
          <button
            type="button"
            title="Direita"
            disabled={!selectedId && selectedIds.length === 0}
            onClick={() => handleAlignSelected("right", true)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white disabled:opacity-30"
          >
            ⇤ Direita
          </button>
          <button
            type="button"
            title="Topo"
            disabled={!selectedId && selectedIds.length === 0}
            onClick={() => handleAlignSelected("top", true)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white disabled:opacity-30"
          >
            ⤒ Topo
          </button>
          <button
            type="button"
            title="Centro Vertical"
            disabled={!selectedId && selectedIds.length === 0}
            onClick={() => handleAlignSelected("center-v", true)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white disabled:opacity-30"
          >
            ↕ Centro V
          </button>
          <button
            type="button"
            title="Base"
            disabled={!selectedId && selectedIds.length === 0}
            onClick={() => handleAlignSelected("bottom", true)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white disabled:opacity-30"
          >
            ⤓ Base
          </button>
          {selectedIds.length >= 3 && (
            <>
              <button
                type="button"
                title="Distribuir Horizontalmente"
                onClick={() => handleAlignSelected("distribute-h", false)}
                className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white"
              >
                ⁞⁞ Dist. H
              </button>
              <button
                type="button"
                title="Distribuir Verticalmente"
                onClick={() => handleAlignSelected("distribute-v", false)}
                className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-300 hover:text-white"
              >
                ≡ Dist. V
              </button>
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-400">
          {selectedIds.length > 1
            ? `${selectedIds.length} elementos selecionados`
            : selectedId
              ? "1 elemento selecionado"
              : "Nenhum elemento selecionado"}
        </span>
      </div>

      <div className="w-full min-w-0">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          Adicionar elemento ao cenário
        </p>
        <HorizontalMenu ariaLabel="Widgets do cenário" className="w-full">
          {catalog
            .filter((widget) => widget.implemented !== false)
            .map((widget) => (
              <button
                key={widget.id}
                type="button"
                onClick={() => addWidget(widget)}
                title={"Adicionar " + widget.name}
                className="shrink-0 rounded-md border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/10 hover:text-white"
              >
                {widget.name}
              </button>
            ))}
        </HorizontalMenu>
      </div>

      {notice && (
        <p
          role="status"
          className="inline-flex items-center gap-2 self-start rounded-lg border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200"
        >
          <Check size={13} /> {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/20 bg-rose-950/20 px-3 py-2 text-xs text-rose-200"
        >
          {error}
        </p>
      )}

      <div ref={containerRef} className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="mb-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-slate-900/80 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setZoomMode("fit")}
              className={`rounded px-2 py-0.5 font-bold transition ${zoomMode === "fit" ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40" : "text-slate-400 hover:text-white"}`}
            >
              Fit (Ajustar)
            </button>
            <button
              type="button"
              onClick={() => setZoomMode("960x540")}
              className={`rounded px-2 py-0.5 font-bold transition ${zoomMode === "960x540" ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40" : "text-slate-400 hover:text-white"}`}
            >
              960 × 540
            </button>
            <button
              type="button"
              onClick={() => setZoomMode("1024x768")}
              className={`rounded px-2 py-0.5 font-bold transition ${zoomMode === "1024x768" ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40" : "text-slate-400 hover:text-white"}`}
            >
              1024 x 768
            </button>
            <button
              type="button"
              onClick={() => setZoomMode("1280x720")}
              className={`rounded px-2 py-0.5 font-bold transition ${zoomMode === "1280x720" ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40" : "text-slate-400 hover:text-white"}`}
            >
              1280 x 720
            </button>
          </div>
          <span className="text-[10px] text-cyan-300/80">
            Atalhos: Delete remove · setas movem 1 px · Shift + setas movem 10 px
          </span>
        </div>
        <div className="relative flex w-full justify-center overflow-hidden py-1">
          <div
            ref={viewportRef}
            className="relative mx-auto shrink-0 overflow-visible border-2 border-cyan-400/50 bg-[#030712] shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
            style={{
              width: Math.round(CANVAS_WIDTH * scale),
              height: Math.round(CANVAS_HEIGHT * scale),
              boxSizing: "border-box",
            }}
            aria-label="Canvas do cenário"
          >
            <div
              className="absolute left-0 top-0 origin-top-left overflow-visible"
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                transform: "scale(" + scale + ")",
                transformOrigin: "top left",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  ...canvasBackground,
                  filter: scenario.globalStyleConfig?.colorEffectEnabled
                    ? COLOR_EFFECT_FILTERS[
                        String(scenario.globalStyleConfig.colorEffect || "glass")
                      ] || "none"
                    : undefined,
                }}
              />
              {scenario.globalStyleConfig?.colorEffectEnabled &&
                scenario.background?.type === "solid" && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        COLOR_EFFECT_OVERLAYS[
                          String(scenario.globalStyleConfig.colorEffect || "glass")
                        ] || COLOR_EFFECT_OVERLAYS.glass,
                    }}
                  />
                )}
              {scenario.globalStyleConfig?.texture &&
                scenario.globalStyleConfig.texture !== "none" && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20"
                    style={{
                      ...getGlobalTextureStyle(String(scenario.globalStyleConfig.texture)),
                    }}
                  />
                )}
              {gridSettings.showGrid && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-30"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(34,211,238,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,.2) 1px, transparent 1px)",
                    backgroundSize: `${Math.max(5, Number(gridSettings.gridSize) || 20)}px ${Math.max(5, Number(gridSettings.gridSize) || 20)}px`,
                  }}
                />
              )}
              {gridSettings.showSafeAreas && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-[5%] z-30 border border-dashed border-cyan-400/60"
                />
              )}
              {(gridSettings.verticalGuides || []).map((guide: { id: string; x: number }) => (
                <div
                  key={guide.id}
                  role="separator"
                  aria-label="Arrastar linha-guia vertical"
                  title="Segure o botão esquerdo do mouse e arraste"
                  className="absolute bottom-0 top-0 z-40 w-[7px] -translate-x-1/2 cursor-col-resize border-l border-cyan-400/90"
                  style={{ left: guide.x, touchAction: "none" }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    guidePointer.current = { id: guide.id, orientation: "vertical" };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (
                      !guidePointer.current ||
                      guidePointer.current.id !== guide.id ||
                      !(event.buttons & 1)
                    )
                      return;
                    const rect = viewportRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const x = Math.max(
                      0,
                      Math.min(CANVAS_WIDTH, (event.clientX - rect.left) / scale),
                    );
                    setGridSettings((current) => ({
                      ...current,
                      verticalGuides: current.verticalGuides.map((item) =>
                        item.id === guide.id ? { ...item, x } : item,
                      ),
                    }));
                  }}
                  onPointerUp={() => {
                    guidePointer.current = null;
                  }}
                  onPointerCancel={() => {
                    guidePointer.current = null;
                  }}
                />
              ))}
              {(gridSettings.horizontalGuides || []).map((guide: { id: string; y: number }) => (
                <div
                  key={guide.id}
                  role="separator"
                  aria-label="Arrastar linha-guia horizontal"
                  title="Segure o botão esquerdo do mouse e arraste"
                  className="absolute left-0 right-0 z-40 h-[7px] -translate-y-1/2 cursor-row-resize border-t border-cyan-400/90"
                  style={{ top: guide.y, touchAction: "none" }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    guidePointer.current = { id: guide.id, orientation: "horizontal" };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (
                      !guidePointer.current ||
                      guidePointer.current.id !== guide.id ||
                      !(event.buttons & 1)
                    )
                      return;
                    const rect = viewportRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const y = Math.max(
                      0,
                      Math.min(CANVAS_HEIGHT, (event.clientY - rect.top) / scale),
                    );
                    setGridSettings((current) => ({
                      ...current,
                      horizontalGuides: current.horizontalGuides.map((item) =>
                        item.id === guide.id ? { ...item, y } : item,
                      ),
                    }));
                  }}
                  onPointerUp={() => {
                    guidePointer.current = null;
                  }}
                  onPointerCancel={() => {
                    guidePointer.current = null;
                  }}
                />
              ))}
              {(subScenarios.find((s) => s.id === selectedSubScenarioId)?.instances || [])
                .filter((instance) => instance.visible !== false)
                .slice()
                .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
                .map((instance, index) => {
                  const definition = catalog.find((entry) => entry.id === instance.widgetId) || {
                    id: instance.widgetId,
                    name: instance.name || "Elemento",
                    defaultWidth: 320,
                    defaultHeight: 120,
                    defaultConfig: {},
                  };
                  const instanceId = String(instance.id ?? String(instance.widgetId) + "-" + index);
                  const isSelected = selectedId === instanceId;
                  const width = Math.max(
                    40,
                    Number(instance.width) || definition.defaultWidth || 320,
                  );
                  const height = Math.max(
                    24,
                    Number(instance.height) || definition.defaultHeight || 120,
                  );
                  const widgetConfig = {
                    ...(definition.defaultConfig || {}),
                    ...(instance.config || {}),
                  };
                  const transform = [
                    widgetConfig.rotation ? "rotate(" + Number(widgetConfig.rotation) + "deg)" : "",
                    widgetConfig.flipH ? "scaleX(-1)" : "",
                    widgetConfig.flipV ? "scaleY(-1)" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const style: CSSProperties = {
                    position: "absolute",
                    left: Number(instance.x) || 0,
                    top: Number(instance.y) || 0,
                    width,
                    height,
                    zIndex: Number(instance.zIndex) || index + 1,
                    overflow: "visible",
                    opacity: Math.max(0, Math.min(100, Number(widgetConfig.opacity ?? 100))) / 100,
                    transform: transform || undefined,
                    outline: isSelected ? "2px solid #22d3ee" : "none",
                    cursor: "move",
                    touchAction: "none",
                    transition: "opacity 240ms ease, transform 240ms ease",
                  };
                  {
                    /* Estrutura visual: div. */
                  }
                  return (
                    <div
                      key={instanceId}
                      style={style}
                      onPointerDown={(event) => beginDrag(event, instance, index, "move")}
                      onPointerMove={moveDrag}
                      onPointerUp={() => {
                        dragRef.current = null;
                      }}
                      onPointerCancel={() => {
                        dragRef.current = null;
                      }}
                    >
                      <div
                        className="h-full w-full overflow-visible"
                        onDoubleClick={() => {
                          const isTextWidget =
                            instance.widgetId === TEXT_WIDGET_ID ||
                            instance.widgetId === "library-text" ||
                            String(instance.widgetId || "").includes("text") ||
                            instance.elementKey === "text" ||
                            instance.config?.text !== undefined;

                          if (isTextWidget) {
                            setEditingId(instanceId);
                            setSelectedId(instanceId);
                            setSelectedIds([instanceId]);
                          }
                        }}
                      >
                        {instance.widgetId === IMAGE_WIDGET_ID ? (
                          <img
                            src={String(
                              widgetConfig["src"] ||
                                widgetConfig["bgImage"] ||
                                widgetConfig["backgroundImage"] ||
                                "",
                            )}
                            alt={String(widgetConfig["imageName"] || instance.name || "Imagem")}
                            draggable={false}
                            className="h-full w-full select-none"
                            style={{
                              objectFit: String(widgetConfig["objectFit"] || "contain") as any,
                              opacity:
                                Math.max(0, Math.min(100, Number(widgetConfig["opacity"] ?? 100))) /
                                100,
                            }}
                          />
                        ) : instance.widgetId === SHAPE_WIDGET_ID ? (
                          <div
                            className="h-full w-full"
                            style={{
                              opacity:
                                Math.max(0, Math.min(100, Number(widgetConfig["opacity"] ?? 100))) /
                                100,
                            }}
                          >
                            <OverlayShape
                              shape={String(
                                widgetConfig["shape"] || instance.elementKey || "rectangle",
                              )}
                              color={String(
                                widgetConfig["fillColor"] || widgetConfig["color"] || "#8b5cf6",
                              )}
                              strokeColor={String(widgetConfig["strokeColor"] || "#ddd6fe")}
                              strokeWidth={Math.max(0, Number(widgetConfig["strokeWidth"] ?? 2))}
                              fillEnabled={widgetConfig["fillEnabled"] !== false}
                              fillOpacity={Number(widgetConfig["fillOpacity"] ?? 100)}
                            />
                          </div>
                        ) : instance.widgetId === TEXT_WIDGET_ID ? (
                          <div
                            className="flex items-center justify-center p-2.5 w-full h-full"
                            style={{
                              color: String(
                                widgetConfig["color"] || widgetConfig["textColor"] || "#ffffff",
                              ),
                              fontSize: Math.max(1, Number(widgetConfig["fontSize"]) || 32),
                              fontFamily: `"${String(widgetConfig["fontFamily"] || "Inter")}", sans-serif`,
                              fontWeight: (widgetConfig["fontWeight"] as any) || "normal",
                              textAlign: (widgetConfig["textAlign"] as any) || "center",
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              lineHeight: 1.2,
                            }}
                          >
                            {editingId === instanceId ? (
                              <textarea
                                autoFocus
                                value={String(widgetConfig["text"] || "")}
                                onChange={(e) =>
                                  updateInstance(instanceId, {
                                    config: { ...(instance.config || {}), text: e.target.value },
                                  })
                                }
                                onBlur={() => setEditingId(null)}
                                className="w-full h-full bg-transparent border-0 outline-none resize-none overflow-hidden p-0 m-0 focus:ring-0 focus:outline-none"
                                style={{
                                  color: "inherit",
                                  fontSize: "inherit",
                                  fontFamily: "inherit",
                                  fontWeight: "inherit",
                                  textAlign: "inherit",
                                }}
                              />
                            ) : ![
                                "cascata",
                                "cascata-baixo",
                                "casanique",
                                "rolar",
                                "encarrilha",
                                "slide-in-cima",
                                "slide-in-baixo",
                                "slide-in-esquerda",
                                "slide-in-direita",
                                "reveal",
                                "flip-in",
                                "bounce-in",
                                "blur-in",
                                "light-speed-in",
                              ].includes(String(widgetConfig["animationType"] || "")) ? (
                              String(widgetConfig["text"] || "Texto")
                            ) : (
                              <AnimacoesTexto
                                key={
                                  String(widgetConfig["animationType"]) +
                                  "-" +
                                  String(widgetConfig["text"] || "") +
                                  "-" +
                                  String(widgetConfig["animationDelayMs"] ?? 1000) +
                                  "-" +
                                  String(widgetConfig["animationDurationMs"] ?? 650) +
                                  "-" +
                                  String(Boolean(widgetConfig["animationInfinite"])) +
                                  "-" +
                                  String(Boolean(widgetConfig["animationAlternate"]))
                                }
                                texto={String(widgetConfig["text"] || "Texto")}
                                tipo={String(widgetConfig["animationType"])}
                                atraso={Math.max(
                                  0,
                                  Number(widgetConfig["animationDelayMs"] ?? 1000),
                                )}
                                duracao={Math.max(
                                  50,
                                  Number(widgetConfig["animationDurationMs"] ?? 650),
                                )}
                                infinita={Boolean(widgetConfig["animationInfinite"])}
                                vaiEVem={Boolean(widgetConfig["animationAlternate"])}
                                repetir={Boolean(widgetConfig["animationInfinite"])}
                              />
                            )}
                          </div>
                        ) : (
                          <Cenario_WidgetElementRenderer
                            widgetId={instance.widgetId}
                            elementKey={instance.elementKey || "full_widget"}
                            isFullWidget={instance.isFullWidget !== false}
                            config={widgetConfig}
                            isEditing={editingId === instanceId}
                            onUpdateConfig={(patch) =>
                              updateInstance(instanceId, {
                                config: { ...(instance.config || {}), ...patch },
                              })
                            }
                            onFinishEditing={() => setEditingId(null)}
                            instanceId={instance.id}
                            instanceName={instance.name}
                          />
                        )}
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
                  <div className="border border-cyan-300/20 bg-slate-950/70 px-8 py-6 text-center">
                    <p className="text-base font-bold text-white">Cenário vazio</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Use a barra acima para adicionar widgets.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Cenario_Editor
        catalog={catalog}
        onAddFragment={addWidgetComponent}
        onAddText={addTextInstance}
        onAddShape={addShapeInstance}
        onAddImage={addImageInstance}
        gridSettings={gridSettings}
        onUpdateGridSettings={(patch) => setGridSettings((current) => ({ ...current, ...patch }))}
        backgroundColor={(() => {
          const selectedInstance = scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          );
          if (selectedInstance) {
            return String(
              selectedInstance.widgetId === SHAPE_WIDGET_ID
                ? selectedInstance.config?.fillColor || selectedInstance.config?.color || "#8b5cf6"
                : selectedInstance.config?.backgroundColor || "#07111f",
            );
          }
          return scenario.background.color || "#07111f";
        })()}
        backgroundMode={(() => {
          const selectedInstance = scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          );
          if (selectedInstance) {
            if (selectedInstance.widgetId === SHAPE_WIDGET_ID) {
              return selectedInstance.config?.fillEnabled === false ||
                Number(selectedInstance.config?.fillOpacity ?? 100) === 0
                ? "transparent"
                : "solid";
            }
            return selectedInstance.config?.backgroundTransparent === true ||
              !selectedInstance.config?.backgroundColor
              ? "transparent"
              : "solid";
          }
          return scenario.background.type === "image"
            ? "image"
            : scenario.background.type === "solid"
              ? "solid"
              : "transparent";
        })()}
        backgroundOpacity={(() => {
          const selectedInstance = scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          );
          if (selectedInstance) {
            return selectedInstance.widgetId === SHAPE_WIDGET_ID
              ? Number(selectedInstance.config?.fillOpacity ?? 100)
              : Number(selectedInstance.config?.backgroundOpacity ?? 100);
          }
          return scenario.background.opacity ?? 100;
        })()}
        onUpdateBackgroundColor={(color) => {
          if (selectedId) {
            const selectedInstance = scenario.instances.find(
              (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
            );
            if (selectedInstance) {
              const patch =
                selectedInstance.widgetId === SHAPE_WIDGET_ID
                  ? {
                      fillColor: color,
                      color,
                      textColor: color,
                      fillOpacity: 100,
                      fillEnabled: true,
                    }
                  : { backgroundColor: color, backgroundTransparent: false };
              updateInstance(selectedId, {
                config: { ...(selectedInstance.config || {}), ...patch },
              });
              return;
            }
          }
          setScenario({
            ...scenario,
            background: { ...scenario.background, type: "solid", color },
          });
        }}
        onUpdateBackgroundMode={(mode) => {
          if (mode === "transparent") {
            const updatedInstances = scenario.instances.map((instance) => ({
              ...instance,
              config:
                instance.widgetId === SHAPE_WIDGET_ID
                  ? { ...(instance.config || {}), fillEnabled: false, fillOpacity: 0 }
                  : { ...(instance.config || {}), backgroundTransparent: true },
            }));
            const updated = {
              ...scenario,
              background: { ...scenario.background, type: "transparent" },
              instances: updatedInstances,
            };
            syncInstancesToSubScenario(updatedInstances);
            return;
          }
          const updatedInstances = scenario.instances.map((instance) => ({
            ...instance,
            config:
              instance.widgetId === SHAPE_WIDGET_ID
                ? { ...(instance.config || {}), fillEnabled: true, fillOpacity: 100 }
                : {
                    ...(instance.config || {}),
                    backgroundColor: String(instance.config?.backgroundColor || "#07111f"),
                    backgroundTransparent: false,
                  },
          }));
          const updated = {
            ...scenario,
            background: { ...scenario.background, type: "solid" },
            instances: updatedInstances,
          };
          syncInstancesToSubScenario(updatedInstances);
        }}
        onUpdateBackgroundOpacity={(opacity) => {
          if (selectedId) {
            const selectedInstance = scenario.instances.find(
              (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
            );
            if (selectedInstance) {
              const patch =
                selectedInstance.widgetId === SHAPE_WIDGET_ID
                  ? { fillOpacity: opacity, fillEnabled: opacity > 0 }
                  : { backgroundOpacity: opacity, backgroundTransparent: opacity === 0 };
              updateInstance(selectedId, {
                config: { ...(selectedInstance.config || {}), ...patch },
              });
              return;
            }
          }
          setScenario({
            ...scenario,
            background: { ...scenario.background, opacity },
          });
        }}
        backgroundImage={scenario.background.image || ""}
        onUpdateBackgroundImage={(imageUrl) => {
          if (selectedId) {
            const selectedInstance = scenario.instances.find(
              (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
            );
            if (selectedInstance && selectedInstance.widgetId === IMAGE_WIDGET_ID) {
              updateInstance(selectedId, {
                config: { ...(selectedInstance.config || {}), src: imageUrl, url: imageUrl },
              });
              return;
            }
          }
          setScenario((current) =>
            current
              ? {
                  ...current,
                  background: {
                    ...current.background,
                    type: "image",
                    image: imageUrl,
                  },
                }
              : current,
          );
        }}
        globalStyleConfig={{
          borderEnabled: Boolean(scenario.globalStyleConfig?.borderEnabled),
          borderWidth: Number(scenario.globalStyleConfig?.borderWidth ?? 1),
          borderColor: String(scenario.globalStyleConfig?.borderColor || "#dce6ff"),
          borderRadius: Number(scenario.globalStyleConfig?.borderRadius ?? 16),
          texture: String(scenario.globalStyleConfig?.texture || "none"),
          colorEffectEnabled: Boolean(scenario.globalStyleConfig?.colorEffectEnabled),
          colorEffect: String(scenario.globalStyleConfig?.colorEffect || "glass"),
        }}
        onUpdateGlobalStyleConfig={(patch) =>
          setScenario({
            ...scenario,
            globalStyleConfig: {
              borderEnabled: false,
              borderWidth: 1,
              borderColor: "#dce6ff",
              borderRadius: 16,
              texture: "none",
              colorEffectEnabled: false,
              colorEffect: "glass",
              ...(scenario.globalStyleConfig || {}),
              ...patch,
            },
          })
        }
        layers={(scenario.instances || [])
          .map((instance, index) => ({
            id: instance.id || `${instance.widgetId}-${index}`,
            name: String(
              instance.name ||
                catalog.find((item) => item.id === instance.widgetId)?.name ||
                instance.widgetId ||
                `Elemento ${index + 1}`,
            ),
            widgetId: String(instance.widgetId || ""),
            visible: instance.visible !== false,
            locked: Boolean(instance.locked),
            selected: (instance.id || `${instance.widgetId}-${index}`) === selectedId,
            zIndex: Number(instance.zIndex) || index + 1,
          }))
          .sort((a, b) => b.zIndex - a.zIndex)}
        onSelectLayer={(id) => {
          setSelectedId(id);
          setSelectedIds([id]);
        }}
        onMoveLayer={(id, delta) => {
          const normalized = [...scenario.instances].sort(
            (a, b) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0),
          );
          const from = normalized.findIndex(
            (item, idx) => (item.id || `${item.widgetId}-${idx}`) === id,
          );
          const to = from + delta;
          if (from < 0 || to < 0 || to >= normalized.length) return;
          const [moved] = normalized.splice(from, 1);
          normalized.splice(to, 0, moved);
          const updated = normalized.map((item, index) => ({
            ...item,
            zIndex: normalized.length - index,
          }));
          syncInstancesToSubScenario(updated);
        }}
        onToggleLayerVisibility={(id) => {
          const updated = scenario.instances.map((item, index) =>
            (item.id || `${item.widgetId}-${index}`) === id
              ? { ...item, visible: item.visible === false }
              : item,
          );
          syncInstancesToSubScenario(updated);
        }}
        onToggleLayerLock={(id) => {
          const updated = scenario.instances.map((item, index) =>
            (item.id || `${item.widgetId}-${index}`) === id
              ? { ...item, locked: !item.locked }
              : item,
          );
          syncInstancesToSubScenario(updated);
        }}
        onDeleteLayer={(id) => deleteInstance(id)}
        onAlignSelected={handleAlignSelected}
        onAddGuide={(orientation) => {
          const id = `guide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          if (orientation === "vertical")
            setGridSettings((current) => ({
              ...current,
              verticalGuides: [...current.verticalGuides, { id, x: Math.round(CANVAS_WIDTH / 2) }],
            }));
          else
            setGridSettings((current) => ({
              ...current,
              horizontalGuides: [
                ...current.horizontalGuides,
                { id, y: Math.round(CANVAS_HEIGHT / 2) },
              ],
            }));
        }}
        onFontChange={(fontFamily) => {
          if (!selectedId) return;
          const selected = scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          );
          if (!selected) return;
          updateInstance(selectedId, { config: { ...(selected.config || {}), fontFamily } });
        }}
        onTextStyleChange={(patch) => {
          if (!selectedId) return;
          const selected = scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          );
          if (!selected) return;
          const updatedPatch = {
            ...patch,
            ...(patch.color ? { textColor: patch.color } : {}),
          };
          updateInstance(selectedId, { config: { ...(selected.config || {}), ...updatedPatch } });
        }}
        selectedInstanceId={selectedId}
        selectedInstanceWidgetId={
          scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          )?.widgetId ?? null
        }
        selectedInstanceConfig={
          scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          )?.config ?? null
        }
        onSelectWidget={(widgetId) => {
          const existing = (scenario.instances || []).find(
            (item) => item.widgetId === widgetId && item.isFullWidget !== false,
          );
          if (existing?.id) {
            setSelectedId(existing.id);
            setSelectedIds([existing.id]);
          } else {
            const definition = catalog.find((w) => w.id === widgetId);
            if (definition) addWidget(definition);
          }
        }}
        onUpdateSelectedConfig={(patch) => {
          if (!selectedId) return;
          const selected = scenario.instances.find(
            (item, index) => (item.id || `${item.widgetId}-${index}`) === selectedId,
          );
          if (!selected) return;
          const updatedPatch = {
            ...patch,
            ...(patch.color ? { textColor: patch.color } : {}),
            ...(patch.fillColor ? { color: patch.fillColor, textColor: patch.fillColor } : {}),
            ...(patch.shape ? { shapeType: patch.shape } : {}),
          };
          updateInstance(selectedId, {
            config: { ...(selected.config || {}), ...updatedPatch },
          });
        }}
      />
    </section>
  );
}
