import React, { Component, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Terminal,
  FileCode,
  Trash2,
  Minimize2,
  Maximize2,
} from "lucide-react";

export interface RealErrorItem {
  id: string;
  name: string;
  message: string;
  filename?: string | undefined;
  lineno?: number | undefined;
  colno?: number | undefined;
  stack?: string | undefined;
  componentStack?: string | undefined;
  type:
    | "Erro de Execução (Runtime)"
    | "Promise Rejeitada (Unhandled)"
    | "Erro React (Render)"
    | "Erro do Sistema";
  timestamp: string;
}

export interface ReportErrorInput {
  error?: Error | unknown;
  message?: string | undefined;
  filename?: string | undefined;
  lineno?: number | undefined;
  colno?: number | undefined;
  stack?: string | undefined;
  componentStack?: string | undefined;
  type?: RealErrorItem["type"] | undefined;
}

declare global {
  interface Window {
    __LIVENEXUS_ERRORS__?: RealErrorItem[] | undefined;
    __addLiveNexusError?: ((err: RealErrorItem) => void) | undefined;
    __simulateTestError?: (() => void) | undefined;
  }
}

// Inicializa o buffer global se ainda não existir
if (typeof window !== "undefined") {
  window.__LIVENEXUS_ERRORS__ = window.__LIVENEXUS_ERRORS__ || [];
}

/**
 * Normaliza e registra um erro no canal global
 */
export function reportRealError(input: ReportErrorInput) {
  const errObj = input.error instanceof Error ? input.error : null;
  const rawMessage =
    input.message ||
    errObj?.message ||
    (typeof input.error === "string" ? input.error : JSON.stringify(input.error)) ||
    "Erro não especificado";

  const rawStack =
    errObj?.stack ||
    (typeof input.error === "object" && input.error && "stack" in input.error
      ? String((input.error as { stack?: unknown }).stack)
      : undefined);

  // Tentar extrair arquivo e linha do stack se não fornecidos
  let deducedFilename = input.filename;
  let deducedLineno = input.lineno;
  let deducedColno = input.colno;

  if ((!deducedFilename || deducedFilename === "undefined") && rawStack) {
    const stackMatch = rawStack.match(
      /(?:at\s+|@)(?:.*?\(|)(https?:\/\/[^\s)]+|file:\/\/[^\s)]+|\/[^\s)]+):(\d+):(\d+)/i,
    );
    if (stackMatch && stackMatch[1]) {
      deducedFilename = stackMatch[1];
      deducedLineno = Number(stackMatch[2]);
      deducedColno = Number(stackMatch[3]);
    }
  }

  const item: RealErrorItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name:
      errObj?.name ||
      (input.type === "Promise Rejeitada (Unhandled)" ? "UnhandledRejection" : "Error"),
    message: String(rawMessage),
    filename: deducedFilename,
    lineno: deducedLineno,
    colno: deducedColno,
    stack: rawStack,
    componentStack: input.componentStack,
    type: input.type || "Erro de Execução (Runtime)",
    timestamp: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  if (typeof window !== "undefined") {
    window.__LIVENEXUS_ERRORS__ = window.__LIVENEXUS_ERRORS__ || [];
    window.__LIVENEXUS_ERRORS__.push(item);
    window.dispatchEvent(new CustomEvent("livenexus:error", { detail: item }));
  }

  return item;
}

/**
 * Error Boundary para capturar falhas da árvore React
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class RealErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportRealError({
      error,
      message: error.message,
      componentStack: errorInfo.componentStack || undefined,
      type: "Erro React (Render)",
    });
  }

  override render() {
    // Mantém a aplicação renderizando normalmente, registrando o erro em segundo plano.
    return this.props.children;
  }
}

export default RealErrorBoundary;
