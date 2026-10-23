/* LIVENEXUS: Explica a ligação automática usada para publicar mídia na conexão RTC. */
// Ponte de ciclo de vida para o Publisher RTC Automático
// Conecta a Central (runtimeId) e o StreamingProvider ao WebRTC P2P
import { useLocation } from "react-router-dom";
import { useRtcPublisher } from "./useRtcPublisher.js";

// RtcAutoPublisherBridge: executa a tarefa indicada pelo nome e pelos parâmetros recebidos.
export function RtcAutoPublisherBridge() {
  const location = useLocation();

  // O Publisher automático SÓ deve ser ativado na área autenticada do streamer (/dashboard)
  // NUNCA em rotas de visualização pública ou receiver (/cenario, /login, /register, etc.)
  const isStreamerDashboard = location.pathname.startsWith("/dashboard");

  useRtcPublisher({ enabled: isStreamerDashboard });
  return null;
}
