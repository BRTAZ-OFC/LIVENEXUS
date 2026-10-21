import { useEffect } from "react";
import { reportRealError } from "./ErrorViewer";

/**
 * Componente invisível apenas para coletar erros reais do sistema silenciosamente.
 */
export function LogsCollector() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const msg = event.message || "";
      if (
        msg.includes("WebSocket") ||
        msg.includes("vite/client") ||
        msg.includes("net::ERR_") ||
        msg.includes("ResizeObserver")
      ) {
        return;
      }
      reportRealError({
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: "Erro de Execução (Runtime)",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason || "");
      if (
        msg.includes("WebSocket") ||
        msg.includes("vite/client") ||
        msg.includes("Promise Rejeitada (Unhandled)") ||
        msg.includes("net::ERR_")
      ) {
        return;
      }
      reportRealError({
        error: reason,
        message: msg,
        stack: reason instanceof Error ? reason.stack : undefined,
        type: "Promise Rejeitada (Unhandled)",
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
