import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowLeft, Check, Layers, LoaderCircle, Save, Trash2 } from "lucide-react";
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
  subScenarios?: { id: string; name: string; instances: ScenarioInstance[] }[];
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
  return row as unknown as JsonObject;
}

type AlignmentType =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom"
  | "distribute-h"
  | "distribute-v";

function alignSelectedInstances<T extends { id?: string; x?: number; y?: number; width?: number; height?: number }>(
  instances: T[],
  selectedIds: string[],
  type: AlignmentType,
  canvasWidth: number,
  canvasHeight: number,
  alignToCanvas: boolean = false
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
        x: Math.max(0, Math.min(canvasWidth - w, newX)),
        y: Math.max(0, Math.min(canvasHeight - h, newY)),
      };
    });
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

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
        x: Math.max(0, Math.min(canvasWidth - w, newX)),
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
        y: Math.max(0, Math.min(canvasHeight - h, newY)),
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
      x: Math.max(0, Math.min(canvasWidth - w, newX)),
      y: Math.max(0, Math.min(canvasHeight - h, newY)),
    };
  });
}

function normalizeScenario(row: ScenarioRecord): ScenarioConfig {
  const source = sourceFor(row);
  const backgroundSource = isObject(source.background) ? source.background : {};
  const rawInstances = Array.isArray(source.instances) ? (source.instances as ScenarioInstance[]) : [];
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
  const [subScenarios, setSubScenarios] = useState<{ id: string; name: string; instances: ScenarioInstance[] }[]>([]);
  const [selectedSubScenarioId, setSelectedSubScenarioId] = useState<string>("");
  const [rowKey, setRowKey] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
          setSubScenarios(normalized.subScenarios && normalized.subScenarios.length > 0 ? normalized.subScenarios : [{ id: 'sub-1', name: 'Sub Cenário 1', instances: normalized.instances }]);
          setSelectedSubScenarioId(normalized.subScenarios && normalized.subScenarios.length > 0 ? normalized.subScenarios[0].id : 'sub-1');
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
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateScale = () => setScale(Math.max(0.01, viewport.clientWidth / CANVAS_WIDTH));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  function syncInstancesToSubScenario(nextInstances: ScenarioInstance[]) {
    setSubScenarios((prev) =>
      prev.map((s) => (s.id === selectedSubScenarioId ? { ...s, instances: nextInstances } : s))
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
    function handleCanvasKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const activeIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];

      if (
        activeIds.length === 0 ||
        !scenario ||
        target?.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")
      ) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteInstance(activeIds);
        setNotice("");
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = -step;
      else if (event.key === "ArrowDown") dy = step;
      else return;

      event.preventDefault();
      const targetSet = new Set(activeIds);
      const nextInstances = scenario.instances.map((item, index) => {
        const itemKey = item.id || `${item.widgetId}-${index}`;
        if (!targetSet.has(itemKey)) return item;
        const width = Math.max(1, Number(item.width) || 320);
        const height = Math.max(1, Number(item.height) || 120);
        return {
          ...item,
          x: Math.max(0, Math.min(CANVAS_WIDTH - width, (Number(item.x) || 0) + dx)),
          y: Math.max(0, Math.min(CANVAS_HEIGHT - height, (Number(item.y) || 0) + dy)),
        };
      });
      syncInstancesToSubScenario(nextInstances);
      setNotice("");
    }

    window.addEventListener("keydown", handleCanvasKeyDown);
    return () => window.removeEventListener("keydown", handleCanvasKeyDown);
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
      (item.id || `${item.widgetId}-${index}`) === instanceId ? { ...item, ...patch } : item
    );
    syncInstancesToSubScenario(nextInstances);
    setNotice("");
  }

  function deleteInstance(instanceId: string | string[]) {
    if (!scenario) return;
    const idsToDelete = new Set(Array.isArray(instanceId) ? instanceId : [instanceId]);
    const nextInstances = scenario.instances.filter(
      (item, index) => !idsToDelete.has(item.id || `${item.widgetId}-${index}`)
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
      alignToCanvas
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
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) =>
        prev.includes(instanceId) ? prev.filter((i) => i !== instanceId) : [...prev, instanceId]
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
      const updatedSubScenarios = subScenarios.map((s) =>
        s.id === selectedSubScenarioId ? { ...s, instances: scenario.instances } : s
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
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-300">
        <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> Carregando canvas 1080p...
      </div>
    );
  }

  if (!scenario) {
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
          <p className="mt-1 text-[11px] text-slate-400">
            Canvas independente · resolução lógica 1920 × 1080 (Full HD)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newId = `sub-${Date.now()}`;
              setSubScenarios([...subScenarios, { id: newId, name: `Sub Cenário ${subScenarios.length + 1}`, instances: [] }]);
              setSelectedSubScenarioId(newId);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15"
          >
            <Layers size={14} /> Criar Sub Cenário
          </button>
          <input
            type="text"
            value={subScenarios.find(s => s.id === selectedSubScenarioId)?.name || ""}
            onChange={(e) => setSubScenarios(subScenarios.map(s => s.id === selectedSubScenarioId ? { ...s, name: e.target.value } : s))}
            className="w-36 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
          />
          <select
            value={selectedSubScenarioId}
            onChange={(e) => handleSelectSubScenario(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white"
          >
            {subScenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

      <div className="w-full min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>Pré-visualização responsiva · proporção 16:9</span>
          <span>
            {CANVAS_WIDTH} × {CANVAS_HEIGHT} px
          </span>
          <span className="basis-full text-cyan-300/80">
            Atalhos: Delete remove · setas movem 1 px · Shift + setas movem 10 px
          </span>
        </div>
        <div
          ref={viewportRef}
          className="relative aspect-video w-full overflow-hidden border border-cyan-300/20 bg-[#030712] shadow-[0_12px_48px_rgba(0,0,0,0.35)]"
          aria-label="Canvas do cenário 1920 por 1080"
        >
          <div
            className="absolute left-0 top-0 origin-top-left overflow-hidden"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: "scale(" + scale + ")",
              transformOrigin: "top left",
            }}
          >
            <div className="absolute inset-0" style={canvasBackground} />
            {(subScenarios.find(s => s.id === selectedSubScenarioId)?.instances || [])
              .filter((instance) => instance.visible !== false)
              .slice()
              .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
              .map((instance, index) => {
                const definition = catalog.find((entry) => entry.id === instance.widgetId);
                if (!definition) return null;
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
                    onPointerUp={() => {
                      dragRef.current = null;
                    }}
                    onPointerCancel={() => {
                      dragRef.current = null;
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
                  <p className="mt-2 text-sm text-slate-400">
                    Use a barra acima para adicionar widgets.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          As posições são calculadas em 1920 × 1080. A visualização diminui ou aumenta para caber no
          painel, sem alterar a resolução de trabalho.
        </p>
      </div>
    </section>
  );
}
