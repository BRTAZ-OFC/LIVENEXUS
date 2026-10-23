import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { TWITCH_WIDGETS_CATALOG } from "../widget/Widget_twitchWidgetsCatalog";
import OverlayWidgetElementRenderer from "./Overlay_WidgetElementRenderer";
import { loadGoogleFont } from "../fontes/Font_Loader";
import { useRtcConsumer } from "../conexao/rtc/useRtcConsumer";

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

// TEXT_WIDGET_ID: valor ou configuração reutilizada neste módulo.
const TEXT_WIDGET_ID = "__livenexus_text__";
// SHAPE_WIDGET_ID: valor ou configuração reutilizada neste módulo.
const SHAPE_WIDGET_ID = "__livenexus_shape__";

// OverlayReceiver: executa a tarefa indicada pelo nome e pelos parâmetros recebidos.
export default function OverlayReceiver() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id");
  const runtimeId = searchParams.get("runtime_id");

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Conecta ao RTC se runtimeId estiver presente
  const rtc = useRtcConsumer({
    runtimeId: runtimeId || "",
    enabled: !!runtimeId,
  });

  // Carrega a configuração da overlay
  useEffect(() => {
    async function loadConfig() {
      if (!id || !userId) {
        if (!userId) setError("ID do usuário não fornecido na URL.");
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/overlay/canvas?user_id=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (payload.ok && Array.isArray(payload.overlays)) {
          const found = payload.overlays.find((o: any) => String(o.id) === id);
          if (found) {
            setConfig(found.settings || found.config || found);
          } else {
            setError("Overlay não encontrada.");
          }
        }
      } catch (err) {
        setError("Erro ao carregar overlay.");
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [id]);

  // Carrega fontes
  useEffect(() => {
    if (config?.instances) {
      config.instances.forEach((inst: any) => {
        if (inst.widgetId === TEXT_WIDGET_ID && inst.config?.fontFamily) {
          loadGoogleFont(inst.config.fontFamily);
        }
      });
    }
  }, [config]);

  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState("");
  const [connectionColor, setConnectionColor] = useState("bg-amber-500");

  // Gerencia o status da conexão RTC para o usuário
  useEffect(() => {
    if (!runtimeId) {
      setShowConnectionStatus(false);
      return;
    }

    if (!rtc.isConnected) {
      setShowConnectionStatus(true);
      setConnectionLabel("Connecting...");
      setConnectionColor("bg-amber-500 animate-pulse");
    } else {
      setConnectionLabel("Connected");
      setConnectionColor("bg-emerald-500");
      // Esconde após 3 segundos quando conectado
      const timer = setTimeout(() => setShowConnectionStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [rtc.isConnected, runtimeId]);

  // Força fundo transparente no body (importante para OBS/fontes de navegador)
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalOverflow = document.body.style.overflow;

    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.overflow = "hidden"; // Remove barras de navegação/rolagem
    document.documentElement.style.overflow = "hidden";

    // Também garante que o #root não tenha fundo
    const root = document.getElementById("root");
    let originalRootBg = "";
    document.body.classList.add("is-overlay-receiver");
    if (root) {
      originalRootBg = root.style.backgroundColor;
      root.style.backgroundColor = "transparent";
    }

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.backgroundColor = "";
      document.documentElement.style.overflow = "";
      document.body.classList.remove("is-overlay-receiver");
      if (root) root.style.backgroundColor = originalRootBg;
    };
  }, []);

  if (loading) return null;
  if (error)
    return (
      <div className="p-4 text-rose-500 font-bold bg-slate-900/80 rounded-lg m-4">{error}</div>
    );
  if (!config) return null;

  const size = {
    width: config.visualizerSize?.width || 800,
    height: config.visualizerSize?.height || 480,
  };

  return (
    <main
      className="relative overflow-hidden bg-transparent"
      style={{
        width: size.width,
        height: size.height,
        backgroundColor:
          config.background?.type === "transparent"
            ? "transparent"
            : config.background?.color || "transparent",
      }}
    >
      {(config.instances || [])
        .filter((inst: any) => inst.visible !== false)
        .map((instance: any, index: number) => {
          const definition = TWITCH_WIDGETS_CATALOG.find((w: any) => w.id === instance.widgetId);
          const widgetConfig = {
            ...(definition?.defaultConfig || {}),
            ...(instance.config || {}),
          };

          const style: CSSProperties = {
            position: "absolute",
            left: instance.x || 0,
            top: instance.y || 0,
            width: instance.width || 280,
            height: instance.height || 120,
            zIndex: instance.zIndex || index + 1,
            opacity: (widgetConfig.opacity ?? 100) / 100,
            fontFamily: widgetConfig.fontFamily || "inherit",
            fontSize: widgetConfig.fontSize ? `${widgetConfig.fontSize}px` : "inherit",
            color: widgetConfig.color || widgetConfig.textColor || "inherit",
          };

          return (
            <div key={instance.id || index} style={style}>
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
                // Conexão vital: Se houver runtimeId na URL, usa os dados vindo do Publisher via RTC.
                // Caso contrário, tenta usar os dados do multichat local (se houver).
                rtcData={runtimeId ? rtc.streamState : undefined}
              />
            </div>
          );
        })}

      {/* Indicador de Conexão RTC */}
      {showConnectionStatus && (
        <div className="absolute bottom-4 right-4 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/10 shadow-lg transition-all duration-500">
          <div className={`w-2 h-2 rounded-full ${connectionColor}`} />
          <span className="text-[10px] font-bold text-white tracking-wider uppercase">
            {connectionLabel}
          </span>
        </div>
      )}
    </main>
  );
}
