import { useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type OverlayEditorProps = {
  className?: string;
  height?: number;
};

/**
 * Painel base do editor de overlays.
 * Fica fixo na borda inferior da janela e permanece vazio nesta primeira etapa.
 */
export default function Overlay_Editor({
  className = "",
  height = 140,
}: OverlayEditorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelHeight = `min(${Math.max(80, height)}px, 35vh)`;
  const style: CSSProperties = {
    height: isCollapsed ? "0px" : panelHeight,
    transition: "height 220ms ease",
  };

  return (
    <section
      role="region"
      aria-label="Editor de overlay"
      data-overlay-editor
      className={`fixed inset-x-0 bottom-0 z-[80] w-full border-t border-white/15 bg-slate-950 ${className}`}
      style={style}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        aria-label={isCollapsed ? "Mostrar editor de overlay" : "Recolher editor de overlay"}
        aria-expanded={!isCollapsed}
        title={isCollapsed ? "Mostrar editor" : "Recolher editor"}
        className="absolute -top-9 right-4 inline-flex h-8 w-10 items-center justify-center rounded-t-md border border-b-0 border-white/15 bg-slate-950 text-slate-200 transition hover:bg-slate-800 hover:text-white"
      >
        {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
    </section>
  );
}
