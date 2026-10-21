import type { CSSProperties } from "react";

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
  const style: CSSProperties = {
    height: `min(${Math.max(80, height)}px, 35vh)`,
  };

  return (
    <section
      role="region"
      aria-label="Editor de overlay"
      data-overlay-editor
      className={`fixed inset-x-0 bottom-0 z-[80] w-full border-t border-white/15 bg-slate-950 ${className}`}
      style={style}
    />
  );
}
