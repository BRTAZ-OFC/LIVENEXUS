import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CatalogItem } from "./catalogSources";

type Props = { title: string; items: CatalogItem[]; isSaved: (item: CatalogItem) => boolean; onAdd: (item: CatalogItem) => void };
const keyOf = (item: CatalogItem) => item.videoId || item.playlistId || item.browseId || item.id || item.title || "";

export default function MusicCarousel({ title, items, isSaved, onAdd }: Props) {
  const [index, setIndex] = useState(0);
  const [noAnimation, setNoAnimation] = useState(false);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const width = 144;
  const gap = 12;
  const step = width + gap;

  useEffect(() => { setIndex(0); setNoAnimation(false); }, [items]);
  useEffect(() => {
    if (index < count || !count) return;
    const timer = window.setTimeout(() => { setNoAnimation(true); setIndex(0); }, 720);
    return () => window.clearTimeout(timer);
  }, [index, count]);
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(() => { setNoAnimation(false); setIndex((current) => current + 1); }, 3200);
    return () => window.clearInterval(timer);
  }, [paused, count]);
  useEffect(() => {
    if (!noAnimation) return;
    const timer = window.setTimeout(() => setNoAnimation(false), 40);
    return () => window.clearTimeout(timer);
  }, [noAnimation]);

  if (!count) return null;
  const shift = (direction: number) => {
    setNoAnimation(false);
    setIndex((current) => direction < 0 ? (current - 1 + count) % count : current + 1);
  };
  return (
    <section className="min-w-0 space-y-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /><h2 className="text-base font-bold text-white">{title}</h2><span className="text-xs text-slate-500">{count}</span></div>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label={`Anterior: ${title}`} title="Anterior" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => shift(1)} aria-label={`Próximo: ${title}`} title="Próximo" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="overflow-hidden"><div className="flex" style={{ transform: `translate3d(-${index * step}px,0,0)`, transition: noAnimation ? "none" : "transform 0.7s ease" }}>
        {[...items, ...items].map((item, offset) => {
          const saved = isSaved(item);
          return <article key={`${keyOf(item)}-${offset}`} className="group min-w-0 shrink-0" style={{ width, marginRight: gap }}>
            <div className="mb-1.5 aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
              {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">{item.type}</div>}
            </div>
            <p className="truncate text-xs font-semibold text-white" title={item.title || item.name}>{item.title || item.name || "Sem título"}</p>
            <p className="mt-1 truncate text-[11px] text-slate-400">{item.artist || item.author || item.source}</p>
            <button type="button" onClick={() => onAdd(item)} className={`mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${saved ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-300 hover:bg-white/10"}`} title={saved ? "Remover da biblioteca" : "Adicionar à biblioteca"}>
              {saved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{saved ? "Na biblioteca" : "Adicionar à biblioteca"}
            </button>
          </article>;
        })}
      </div></div>
    </section>
  );
}
