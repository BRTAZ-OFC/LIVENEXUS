/* LIVENEXUS: Explica o recurso usado pela tela para publicar mídia RTC. */
// Hook para inicialização e ciclo de vida do Publisher RTC Automático
import { useEffect, useRef, useState, useCallback } from "react";
import { useStreaming } from "@/dashboard/widget/runtime";
import { RtcPublisher } from "./rtcPublisher.js";
import { registerActivePublisher, unregisterActivePublisher } from "./ReloadRTC.js";

export function useRtcPublisher({ enabled = true } = {}) {
  const globalStreaming = useStreaming();

  const [userId, setUserId] = useState(() => {
    return typeof window !== "undefined" ? sessionStorage.getItem("livenexus_user_id") || "" : "";
  });

  useEffect(() => {
    const handleAuth = (e) => {
      const id = e?.detail?.userId || sessionStorage.getItem("livenexus_user_id") || "";
      if (id && id !== userId) {
        setUserId(id);
      }
    };
    window.addEventListener("livenexus:user-auth-ready", handleAuth);

    const checkTimer = setInterval(() => {
      const stored =
        typeof window !== "undefined" ? sessionStorage.getItem("livenexus_user_id") || "" : "";
      if (stored && stored !== userId) {
        setUserId(stored);
      }
    }, 200);

    return () => {
      window.removeEventListener("livenexus:user-auth-ready", handleAuth);
      clearInterval(checkTimer);
    };
  }, [userId]);

  const runtimeId = userId ? `rtc_723d9e62d2b04b6a_${userId}` : "";

  const [state, setState] = useState({
    isConnected: false,
    dataChannelState: "closed",
    peerConnectionState: "closed",
    iceConnectionState: "closed",
    signalingState: "idle",
  });

  const [logs, setLogs] = useState([]);
  const publisherRef = useRef(null);
  const streamingRef = useRef(globalStreaming);
  streamingRef.current = globalStreaming;

  const addLog = useCallback((entry) => {
    setLogs((prev) => [...prev.slice(-100), entry]);
  }, []);

  const sendImmediateSnapshot = useCallback(() => {
    if (!publisherRef.current) return;
    const current = streamingRef.current;
    if (!current) return;
    publisherRef.current.sendStreamState(
      current.liveActivity,
      current.connections,
      current.streamMeta,
    );
  }, []);

  // Listener para eventos de reload acionados pelo ReloadRTC
  useEffect(() => {
    const handleRtcReload = (e) => {
      const newValues = e?.detail?.newValues;
      if (publisherRef.current) {
        if (newValues && typeof publisherRef.current.setLatestScenarioData === "function") {
          publisherRef.current.setLatestScenarioData(newValues);
        }
        if (newValues && typeof publisherRef.current.sendScenarioUpdate === "function") {
          publisherRef.current.sendScenarioUpdate(newValues);
        }
        if (typeof publisherRef.current.start === "function") {
          publisherRef.current.start();
        }
      }
    };

    window.addEventListener("livenexus:reload-rtc-publisher", handleRtcReload);
    return () => window.removeEventListener("livenexus:reload-rtc-publisher", handleRtcReload);
  }, []);

  // Iniciar Publisher quando runtimeId estiver disponível
  useEffect(() => {
    if (!enabled || !runtimeId) {
      if (publisherRef.current) {
        unregisterActivePublisher(publisherRef.current);
        publisherRef.current.destroy();
        publisherRef.current = null;
      }
      return;
    }

    const pub = new RtcPublisher({
      runtimeId,
      onStateChange: (partial) => setState((prev) => ({ ...prev, ...partial })),
      onLog: addLog,
      onDataChannelOpen: sendImmediateSnapshot,
    });

    publisherRef.current = pub;
    registerActivePublisher(pub, {
      onSnapshot: (customValues) => {
        if (customValues && typeof pub.setLatestScenarioData === "function") {
          pub.setLatestScenarioData(customValues);
        }
        sendImmediateSnapshot();
        if (customValues && typeof pub.sendScenarioUpdate === "function") {
          pub.sendScenarioUpdate(customValues);
        }
      },
      onReload: (customValues) => {
        if (pub && typeof pub.start === "function") {
          if (customValues && typeof pub.setLatestScenarioData === "function") {
            pub.setLatestScenarioData(customValues);
          }
          pub.start();
        }
      },
    });

    pub.start();

    return () => {
      unregisterActivePublisher(pub);
      pub.destroy();
      publisherRef.current = null;
    };
  }, [enabled, runtimeId, addLog, sendImmediateSnapshot]);

  // Transmitir fluxo de dados reais quando o DataChannel estiver OPEN e a cada atualização
  useEffect(() => {
    if (!publisherRef.current || state.dataChannelState !== "open") return;

    const sendSnapshot = () => {
      if (!publisherRef.current || state.dataChannelState !== "open") return;
      publisherRef.current.sendStreamState(
        globalStreaming.liveActivity,
        globalStreaming.connections,
        globalStreaming.streamMeta,
      );
    };

    // Envio imediato na abertura/atualização
    sendSnapshot();

    // Sincronização periódica ativa (2 segundos) para garantir uptime e telemetria atualizados
    const syncTimer = setInterval(sendSnapshot, 2000);
    return () => clearInterval(syncTimer);
  }, [
    state.dataChannelState,
    globalStreaming.liveActivity,
    globalStreaming.connections,
    globalStreaming.streamMeta,
  ]);

  return {
    runtimeId,
    isConnected: state.isConnected,
    dataChannelState: state.dataChannelState,
    peerConnectionState: state.peerConnectionState,
    iceConnectionState: state.iceConnectionState,
    signalingState: state.signalingState,
    logs,
    sendImmediateSnapshot,
  };
}
