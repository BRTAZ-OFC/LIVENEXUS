import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Music2, Plus } from "lucide-react";
import type { CatalogItem } from "./catalogSources";

type Props = {
  title: string;
  items: CatalogItem[];
  isSaved: (item: CatalogItem) => boolean;
  onAdd: (item: CatalogItem) => void;
  onOpen: (item: CatalogItem) => void;
};
const keyOf = (item: CatalogItem) => item.videoId || item.playlistId || item.browseId || item.id || item.title || "";

export default function MusicCarousel({ title, items, isSaved, onAdd, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const width = 144;
  const gap = 12;
  const step = width + gap;
  if (!count) return null;
  const shift = (direction: number) => setIndex((current) => (current + direction + count) % count);

  return <section className="min-w-0 space-y-3">
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /><h2 className="text-base font-bold text-white">{title}</h2><span className="text-xs text-slate-500">{count}</span></div>
      <div className="flex gap-1">
        <button type="button" onClick={() => shift(-1)} aria-label={`Anterior: ${title}`} title="Anterior" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => shift(1)} aria-label={`Próximo: ${title}`} title="Próximo" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </header>
    <div className="overflow-hidden"><div className="flex" style={{ transform: `translate3d(-${index * step}px,0,0)`, transition: "transform 0.35s ease" }}>
      {items.map((item, offset) => {
        const saved = isSaved(item);
        return <article key={`${keyOf(item)}-${offset}`} className="group min-w-0 shrink-0" style={{ width, marginRight: gap }}>
          <button type="button" onClick={() => onOpen(item)} aria-label={`Abrir detalhes: ${item.title || item.name || title}`} className="mb-1.5 block w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]" style={{ height: width }}>
            {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-500"><Music2 className="h-7 w-7" /></div>}
          </button>
          <div className="flex items-start gap-1">
            <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-white" title={item.title || item.name}>{item.title || item.name || "Sem título"}</p>
              <p className="truncate text-[11px] text-slate-400">{item.artist || item.author || item.source || title}</p>
            </button>
            <button type="button" disabled={saved} onClick={() => onAdd(item)} title={saved ? "Já está na biblioteca" : "Adicionar à biblioteca"} aria-label={saved ? "Já está na biblioteca" : "Adicionar à biblioteca"} className={`shrink-0 rounded-md p-1 transition-colors ${saved ? "text-cyan-200/70" : "text-slate-300 hover:bg-white/10 hover:text-white"} disabled:cursor-default`}>{saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</button>
          </div>
        </article>;
      })}
    </div></div>
  </section>;
}
