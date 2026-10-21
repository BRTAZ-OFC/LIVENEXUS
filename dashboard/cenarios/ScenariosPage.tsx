import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowUpRight, Layers, LoaderCircle, MonitorPlay, Plus, X } from "lucide-react";

type JsonObject = Record<string, unknown>;

type ScenarioInstance = {
  id?: string;
  widgetId?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
};

type ScenarioConfig = {
  name: string;
  visualizerSize: { width: number; height: number };
  instances: ScenarioInstance[];
  background: {
    type?: string;
    color?: string;
    gradient?: string;
    image?: string;
    opacity?: number;
  };
};

type ScenarioRecord = {
  id?: string;
  name?: string;
  settings?: unknown;
  config?: unknown;
  data?: unknown;
  updated_at?: string;
};

type ScenariosPageProps = {
  onOpenScenario: (scenarioId: string) => void;
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getScenarioConfig(row: ScenarioRecord): ScenarioConfig {
  const source: JsonObject = isObject(row.settings) && Object.keys(row.settings).length
    ? row.settings
    : isObject(row.config) && Object.keys(row.config).length
      ? row.config
      : isObject(row.data) && Object.keys(row.data).length
        ? row.data
        : row as unknown as JsonObject;
  const background: JsonObject = isObject(source["background"]) ? source["background"] : {};

  return {
    name: String(source["name"] ?? row.name ?? "Cenário"),
    visualizerSize: {
      width: 1920,
      height: 1080,
    },
    instances: Array.isArray(source["instances"]) ? source["instances"] as ScenarioInstance[] : [],
    background: {
      type: String(background["type"] ?? "transparent"),
      color: typeof background["color"] === "string" ? background["color"] : undefined,
      gradient: typeof background["gradient"] === "string" ? background["gradient"] : undefined,
      image: typeof background["image"] === "string" ? background["image"] : undefined,
      opacity: Number(background["opacity"] ?? 100),
    },
  };
}

function getPreviewBackground(background: ScenarioConfig["background"]): CSSProperties {
  if (background.type === "solid") {
    return { backgroundColor: background.color || "#07111f", opacity: Math.max(0, Math.min(100, Number(background.opacity ?? 100))) / 100 };
  }
  if (background.type === "gradient") {
    return { backgroundImage: background.gradient || "linear-gradient(135deg, #0e7490, #312e81)", opacity: Math.max(0, Math.min(100, Number(background.opacity ?? 100))) / 100 };
  }
  if (background.type === "image" && background.image) {
    return {
      backgroundImage: `url("${background.image.replace(/"/g, "%22")}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: Math.max(0, Math.min(100, Number(background.opacity ?? 100))) / 100,
    };
  }
  return {
    backgroundColor: "#07111f",
    backgroundImage: "linear-gradient(45deg, rgba(34,211,238,.09) 25%, transparent 25%), linear-gradient(-45deg, rgba(139,92,246,.09) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(34,211,238,.09) 75%), linear-gradient(-45deg, transparent 75%, rgba(139,92,246,.09) 75%)",
    backgroundSize: "18px 18px",
    backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
  };
}

function ScenarioThumbnail({ row }: { row: ScenarioRecord }) {
  const config = useMemo(() => getScenarioConfig(row), [row]);
  const visibleInstances = config.instances.filter((instance) => instance.visible !== false);
  const swatches = [
    "border-cyan-300/70 bg-cyan-400/20 text-cyan-100",
    "border-violet-300/70 bg-violet-400/20 text-violet-100",
    "border-lime-300/70 bg-lime-400/15 text-lime-100",
    "border-blue-300/70 bg-blue-400/20 text-blue-100",
  ];

  return (
    <div
      className="relative w-full overflow-hidden border-b border-cyan-100/10 bg-[#060b15]"
      style={{ aspectRatio: `${config.visualizerSize.width} / ${config.visualizerSize.height}` }}
      aria-label={`Miniatura do cenário ${config.name}`}
    >
      <div className="absolute inset-0" style={getPreviewBackground(config.background)} />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/10 via-transparent to-violet-950/30" />
      {visibleInstances.map((instance, index) => {
        const x = Math.max(0, Math.min(96, (Number(instance.x) || 0) / config.visualizerSize.width * 100));
        const y = Math.max(0, Math.min(94, (Number(instance.y) || 0) / config.visualizerSize.height * 100));
        const width = Math.max(6, Math.min(100 - x, (Number(instance.width) || 180) / config.visualizerSize.width * 100));
        const height = Math.max(5, Math.min(100 - y, (Number(instance.height) || 60) / config.visualizerSize.height * 100));
        const label = String(instance.name || instance.widgetId || `Widget ${index + 1}`);

        return (
          <div
            key={String(instance.id || `${instance.widgetId || "widget"}-${index}`)}
            className={`absolute flex min-w-0 items-center overflow-hidden rounded border px-1.5 py-0.5 shadow-lg ${swatches[index % swatches.length]}`}
            style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, fontSize: "clamp(5px, 0.65vw, 10px)" }}
            title={label}
          >
            <span className="block w-full truncate font-semibold">{label}</span>
          </div>
        );
      })}
      {visibleInstances.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-cyan-100/70">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/25 bg-slate-950/60 shadow-[0_0_24px_rgba(34,211,238,0.09)]">
            <MonitorPlay className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">Cenário vazio</span>
        </div>
      )}
      <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded border border-white/10 bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur">
        <Layers className="h-3 w-3 text-cyan-300" />
        {visibleInstances.length} elemento{visibleInstances.length === 1 ? "" : "s"}
      </div>
      <div className="pointer-events-none absolute inset-0 border border-white/[0.03]" />
    </div>
  );
}

export default function ScenariosPage({ onOpenScenario }: ScenariosPageProps) {
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadScenarios() {
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
        if (!cancelled) setScenarios(payload.items);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Erro ao carregar os cenários.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadScenarios();
    return () => { cancelled = true; };
  }, []);

  function openCreateDialog() {
    setScenarioName(`Cenário ${scenarios.length + 1}`);
    setShowCreateDialog(true);
    setError("");
  }

  async function createScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = scenarioName.trim();
    if (!name || saving) return;

    setSaving(true);
    setError("");
    try {
      const id = `scenario-${Date.now()}`;
      const response = await fetch("/api/cenarios", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          record: {
            id,
            name,
            visualizerSize: { width: 1920, height: 1080 },
            instances: [],
            background: { type: "transparent", opacity: 100 },
          },
        }),
      });
      const payload = await response.json() as { ok?: boolean; item?: ScenarioRecord; error?: string };
      if (!response.ok || !payload.ok || !payload.item) {
        throw new Error(payload.error || "Não foi possível criar o cenário.");
      }

      setScenarios((current) => [...current, payload.item!]);
      setShowCreateDialog(false);
      setScenarioName("");
      onOpenScenario(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar o cenário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full min-w-0 px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-cyan-300/10 pb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">LiveNexus / Studio</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Cenários</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Crie e organize as cenas da sua transmissão. Selecione uma miniatura para abrir seu canvas no Overlay.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-xs font-bold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.06)] transition hover:border-cyan-200/60 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Criar novo cenário
        </button>
      </header>

      {error && !showCreateDialog && (
        <div role="alert" className="mb-5 rounded-lg border border-rose-400/25 bg-rose-950/20 px-4 py-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
          Carregando cenários...
        </div>
      ) : scenarios.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {scenarios.map((scenario, index) => {
            const id = String(scenario.id ?? "");
            const config = getScenarioConfig(scenario);
            return (
              <button
                type="button"
                key={id || `scenario-${index}`}
                onClick={() => id && onOpenScenario(id)}
                disabled={!id}
                className="group min-w-0 overflow-hidden rounded-xl border border-cyan-300/15 bg-slate-950/60 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-[0_12px_36px_rgba(34,211,238,0.08)] disabled:cursor-not-allowed"
              >
                <ScenarioThumbnail row={scenario} />
                <span className="flex items-start justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-100">{config.name || `Cenário ${index + 1}`}</span>
                    <span className="mt-1 block text-[11px] text-slate-500">Canvas de transmissão</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-cyan-300/20 bg-slate-950/30 px-5 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/5 text-cyan-200">
            <MonitorPlay className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-white">Nenhum cenário criado</h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
            Use o botão no canto superior direito para criar seu primeiro cenário. As miniaturas aparecerão aqui.
          </p>
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-scenario-title"
            onSubmit={(event) => void createScenario(event)}
            className="w-full max-w-md rounded-xl border border-cyan-300/25 bg-[#0b1422] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Novo item</p>
                <h2 id="create-scenario-title" className="mt-1 text-lg font-bold text-white">Criar novo cenário</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                aria-label="Fechar janela"
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label htmlFor="scenario-name" className="mb-2 block text-xs font-semibold text-slate-300">Nome do cenário</label>
            <input
              id="scenario-name"
              autoFocus
              maxLength={80}
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
              placeholder="Ex.: Cena de abertura"
              required
              className="w-full rounded-lg border border-cyan-300/20 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            />
            {error && (
              <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!scenarioName.trim() || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? "Criando..." : "Criar cenário"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
