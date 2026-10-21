import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HorizontalMenuProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  trackClassName?: string;
};

type ScrollEdges = {
  hasOverflow: boolean;
  canGoLeft: boolean;
  canGoRight: boolean;
};

/**
 * Menu horizontal padronizado do LiveNexus.
 * A faixa não aceita rolagem manual; o deslocamento é feito pelos botões externos.
 */
export default function HorizontalMenu({
  children,
  ariaLabel = "Menu horizontal",
  className = "",
  trackClassName = "",
}: HorizontalMenuProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>({
    hasOverflow: false,
    canGoLeft: false,
    canGoRight: false,
  });

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const next: ScrollEdges = {
      hasOverflow: maxScroll > 2,
      canGoLeft: track.scrollLeft > 2,
      canGoRight: maxScroll - track.scrollLeft > 2,
    };

    setEdges((current) =>
      current.hasOverflow === next.hasOverflow &&
      current.canGoLeft === next.canGoLeft &&
      current.canGoRight === next.canGoRight
        ? current
        : next,
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const content = contentRef.current;
    if (!track || !content) return;

    updateEdges();

    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(track);
    resizeObserver.observe(content);
    Array.from(content.children).forEach((child) => resizeObserver.observe(child));

    const mutationObserver = new MutationObserver(updateEdges);
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("resize", updateEdges);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  function move(direction: "left" | "right") {
    const track = trackRef.current;
    if (!track) return;

    const distance = Math.max(140, Math.floor(track.clientWidth * 0.75));
    track.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }

  return (
    <div className={`lnx-horizontal-menu flex w-full min-w-0 items-center ${className}`}>
      {edges.hasOverflow && edges.canGoLeft && (
        <button
          type="button"
          onClick={() => move("left")}
          style={{ marginRight: "4px" }}
          className="lnx-horizontal-menu-arrow shrink-0 rounded-xl border border-white/10 bg-slate-800/90 p-2 text-slate-300 shadow-md transition hover:bg-slate-700 hover:text-white"
          aria-label={`Rolar ${ariaLabel} para a esquerda`}
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <div
        ref={trackRef}
        role="navigation"
        aria-label={ariaLabel}
        onScroll={updateEdges}
        onWheel={(event) => {
          event.preventDefault();
        }}
        className={`lnx-horizontal-menu-track min-w-0 flex-1 ${trackClassName}`}
      >
        <div ref={contentRef} className="lnx-horizontal-menu-content flex items-center gap-2 py-1">
          {children}
        </div>
      </div>

      {edges.hasOverflow && edges.canGoRight && (
        <button
          type="button"
          onClick={() => move("right")}
          style={{ marginLeft: "4px" }}
          className="lnx-horizontal-menu-arrow shrink-0 rounded-xl border border-white/10 bg-slate-800/90 p-2 text-slate-300 shadow-md transition hover:bg-slate-700 hover:text-white"
          aria-label={`Rolar ${ariaLabel} para a direita`}
          title="Próximo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
