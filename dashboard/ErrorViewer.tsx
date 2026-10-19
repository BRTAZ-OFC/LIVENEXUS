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
    // Ao falhar a árvore da aplicação, desmonta-a para que o visualizador
    // global (montado fora deste boundary) continue visível.
    return this.state.hasError ? null : this.props.children;
  }
}

/**
 * Visualizador de erros reais: Faixa vermelha fixa na lateral esquerda, começando no topo.
 */
export function RealErrorViewer() {
  const [errors, setErrors] = useState<RealErrorItem[]>(() => {
    return typeof window !== "undefined" && window.__LIVENEXUS_ERRORS__
      ? [...window.__LIVENEXUS_ERRORS__]
      : [];
  });
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // Remove qualquer elemento fallback nativo já que o componente React assumiu
    const fallbackEl = document.getElementById("livenexus-native-error-stripe");
    if (fallbackEl) {
      fallbackEl.remove();
    }

    // Garante método global de teste e registro
    window.__addLiveNexusError = (item: RealErrorItem) => {
      setErrors((prev) => [...prev, item]);
      setSelectedIndex((prev) => prev);
    };

    window.__simulateTestError = () => {
      try {
        // Gera um erro real com stack trace nativo
        throw new ReferenceError(
          "Falha de teste simulada no LiveNexus: variável 'liveStreamSocket' não foi definida.",
        );
      } catch (e) {
        reportRealError({
          error: e,
          type: "Erro de Execução (Runtime)",
        });
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      // reportRealError emite o evento global; handleCustomError adiciona o registro
      // uma única vez, evitando duplicação no painel.
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
      const isErr = reason instanceof Error;
      reportRealError({
        error: reason,
        message: isErr ? reason.message : String(reason || "Rejeição de Promise não tratada"),
        stack: isErr ? reason.stack : undefined,
        type: "Promise Rejeitada (Unhandled)",
      });
    };

    const handleCustomError = (e: Event) => {
      const customEvent = e as CustomEvent<RealErrorItem>;
      if (customEvent.detail) {
        setErrors((prev) => {
          if (prev.some((item) => item.id === customEvent.detail.id)) return prev;
          return [...prev, customEvent.detail];
        });
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("livenexus:error", handleCustomError);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("livenexus:error", handleCustomError);
    };
  }, []);

  // Mantém o índice selecionado no erro mais recente se novo erro chegar
  useEffect(() => {
    if (errors.length > 0) {
      setSelectedIndex(errors.length - 1);
    }
  }, [errors.length]);

  if (errors.length === 0) {
    return null;
  }

  const currentError = errors[selectedIndex] || errors[errors.length - 1];

  const handleCopy = async () => {
    if (!currentError) return;
    const textToCopy = [
      `[LIVENEXUS ERROR DEVTOOLS DUMP]`,
      `Tipo: ${currentError.type}`,
      `Nome: ${currentError.name}`,
      `Mensagem: ${currentError.message}`,
      currentError.filename ? `Arquivo: ${currentError.filename}` : null,
      currentError.lineno ? `Linha: ${currentError.lineno}:${currentError.colno || 0}` : null,
      `Horário: ${currentError.timestamp}`,
      `\n--- STACK TRACE ---`,
      currentError.stack || "(Nenhum stack trace disponível)",
      currentError.componentStack
        ? `\n--- REACT COMPONENT STACK ---\n${currentError.componentStack}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Optional: Handle user feedback if copy fails
    }
  };

  const handleClear = () => {
    if (typeof window !== "undefined") {
      window.__LIVENEXUS_ERRORS__ = [];
    }
    setErrors([]);
    setSelectedIndex(0);
  };

  /* Visualizador em modo minimizado: Faixa vermelha compacta na lateral esquerda superior */
  if (isMinimized) {
    return (
      <div
        role="region"
        aria-label="Notificador de erro lateral"
        className="fixed top-0 left-0 z-[999999] flex flex-col items-center bg-red-700 hover:bg-red-600 text-white shadow-2xl transition-all cursor-pointer border-r-2 border-b-2 border-red-500 rounded-br-lg py-2 px-2.5"
        onClick={() => setIsMinimized(false)}
        title="Clique para expandir o painel técnico de erros"
      >
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 animate-bounce text-amber-300" />
          <span>
            {errors.length} {errors.length === 1 ? "Erro" : "Erros"}
          </span>
        </div>
        <span className="text-[10px] text-red-200 mt-0.5 font-mono">Abrir Detalhes</span>
      </div>
    );
  }

  /* Painel fixo na lateral esquerda, começando do topo */
  return (
    <aside
      id="livenexus-react-error-viewer"
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 bottom-0 z-[999999] w-[440px] max-w-[94vw] bg-[#140204]/98 text-red-100 border-r-4 border-red-600 shadow-[12px_0_35px_rgba(220,38,38,0.35)] flex flex-col backdrop-blur-xl animate-in slide-in-from-left duration-200 font-sans select-text"
      style={{ boxSizing: "border-box" }}
    >
      {/* Faixa decorativa vermelha viva na borda extrema esquerda */}
      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-red-500 via-rose-600 to-red-800" />

      {/* Cabeçalho de Erro */}
      <header className="pl-4 pr-3 py-3 bg-gradient-to-r from-red-950 via-red-900 to-red-950/80 border-b border-red-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-950 shrink-0">
            <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-white leading-none">
              Visualizador de Erros Reais
            </h2>
            <p className="text-[11px] text-red-300 font-mono mt-0.5 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
              LIVENEXUS DevTools Inspector
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimizar faixa de erros"
            className="p-1.5 rounded-md hover:bg-red-800/60 text-red-200 hover:text-white transition"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            title="Fechar e limpar erros"
            className="p-1.5 rounded-md hover:bg-red-800/60 text-red-200 hover:text-white transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Barra de Navegação se houver múltiplos erros */}
      <div className="px-4 py-2 bg-red-950/60 border-b border-red-800/40 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-red-900/80 text-red-200 font-mono text-[11px] font-bold border border-red-700/60">
            {currentError?.type}
          </span>
          <span className="text-red-400 text-[11px] font-mono">{currentError?.timestamp}</span>
        </div>

        {errors.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
              className="p-1 rounded bg-red-900/40 hover:bg-red-800/80 disabled:opacity-30 disabled:pointer-events-none transition text-red-200"
              title="Erro anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 text-red-200">
              {selectedIndex + 1}/{errors.length}
            </span>
            <button
              type="button"
              disabled={selectedIndex >= errors.length - 1}
              onClick={() => setSelectedIndex((i) => Math.min(errors.length - 1, i + 1))}
              className="p-1 rounded bg-red-900/40 hover:bg-red-800/80 disabled:opacity-30 disabled:pointer-events-none transition text-red-200"
              title="Próximo erro"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo Técnico com Scroll */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 text-xs">
        {/* Mensagem do Erro */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
            Mensagem de Erro
          </label>
          <div className="p-2.5 rounded-lg bg-black/60 border border-red-700/60 text-red-100 font-mono text-[12px] font-semibold leading-relaxed break-words shadow-inner">
            <span className="text-red-400 font-bold mr-1.5">{currentError?.name}:</span>
            {currentError?.message}
          </div>
        </div>

        {/* Localização Técnica (Arquivo, Linha, Coluna) */}
        {(currentError?.filename || currentError?.lineno) && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1 flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              Origem do Erro
            </label>
            <div className="p-2.5 rounded-lg bg-black/40 border border-red-800/40 font-mono text-[11px] space-y-1">
              {currentError.filename && (
                <div className="break-all text-red-200">
                  <span className="text-red-400 font-semibold mr-1">Arquivo:</span>
                  {currentError.filename}
                </div>
              )}
              {currentError.lineno !== undefined && (
                <div className="text-red-300">
                  <span className="text-red-400 font-semibold mr-1">Linha:</span>
                  <span className="px-1.5 py-0.2 rounded bg-red-900/80 text-white font-bold">
                    {currentError.lineno}
                  </span>
                  {currentError.colno !== undefined && (
                    <span className="ml-2 text-red-400">
                      Coluna: <span className="text-white font-bold">{currentError.colno}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stack Trace Real (DevTools Style) */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1 flex items-center gap-1">
            <Terminal className="h-3 w-3" />
            Stack Trace Completo (DevTools)
          </label>
          <div className="relative group">
            <pre className="p-2.5 rounded-lg bg-[#070102] border border-red-800/60 font-mono text-[11px] text-red-200/90 leading-tight overflow-x-auto max-h-[260px] whitespace-pre select-all shadow-inner">
              {currentError?.stack ||
                "(Nenhum rastreamento de pilha disponível no contexto deste erro)"}
            </pre>
          </div>
        </div>

        {/* Component Stack do React (se disponível) */}
        {currentError?.componentStack && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
              Hierarquia de Componentes (React Component Stack)
            </label>
            <pre className="p-2.5 rounded-lg bg-[#070102] border border-rose-900/50 font-mono text-[10px] text-rose-200 leading-tight overflow-x-auto max-h-[160px] whitespace-pre select-all">
              {currentError.componentStack.trim()}
            </pre>
          </div>
        )}
      </div>

      {/* Rodapé com Ações */}
      <footer className="p-3 bg-red-950/80 border-t border-red-800/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-700 hover:bg-red-600 text-white text-xs font-semibold shadow transition active:scale-95"
            title="Copiar relatório técnico completo"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar Erro"}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-900/60 hover:bg-red-800/80 text-red-200 hover:text-white text-xs font-medium transition"
            title="Limpar erros da tela"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        </div>

        <div className="text-[10px] text-red-400 font-mono text-right">
          <span>
            {errors.length} {errors.length === 1 ? "registro ativo" : "registros ativos"}
          </span>
        </div>
      </footer>
    </aside>
  );
}

export default RealErrorViewer;
