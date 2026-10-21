import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Disc3, History, Library, Link2, ListMusic, LoaderCircle, Music2, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import MusicCarousel from "./MusicCarousel";
import type { CatalogItem } from "./catalogSources";

type Category = "songs" | "albums" | "artists" | "playlists";
type View = "categories" | "history" | "library" | "personal";
type PersonalLibrary = { songs: CatalogItem[]; albums: CatalogItem[]; artists: CatalogItem[]; playlists: CatalogItem[]; user_id?: string };
type HistoryItem = { query: string; date: number };
const CATEGORIES: { key: Category; label: string; icon: typeof Music2 }[] = [
  { key: "songs", label: "Músicas", icon: Music2 }, { key: "albums", label: "Álbuns", icon: Disc3 },
  { key: "artists", label: "Artistas", icon: UserRound }, { key: "playlists", label: "Playlists", icon: ListMusic },
];
const EMPTY: PersonalLibrary = { songs: [], albums: [], artists: [], playlists: [] };
const SEEDS: Record<Category, string> = { songs: "músicas mais tocadas Brasil", albums: "álbuns populares Brasil", artists: "artistas populares Brasil", playlists: "playlists populares Brasil" };
const itemId = (item: CatalogItem) => String(item.videoId || item.playlistId || item.browseId || item.id || `${item.type}:${item.title || item.name || ""}`).trim();
function itemCategory(item: CatalogItem): Category {
  if (item.type === "album" || String(item.playlistId || "").startsWith("OLAK5uy_")) return "albums";
  if (item.type === "artist" || String(item.browseId || "").startsWith("UC")) return "artists";
  if (["playlist", "community_playlist", "mix"].includes(item.type) || item.playlistId) return "playlists";
  return "songs";
}
function normalizeLibrary(value: any): PersonalLibrary {
  const result: PersonalLibrary = { songs: Array.isArray(value?.songs) ? value.songs : [], albums: Array.isArray(value?.albums) ? value.albums : [], artists: Array.isArray(value?.artists) ? value.artists : [], playlists: Array.isArray(value?.playlists) ? value.playlists : [], ...(value?.user_id ? { user_id: value.user_id } : {}) };
  const seen = new Set<string>();
  for (const category of CATEGORIES) result[category.key] = result[category.key].filter((item) => { const id = itemId(item); if (!id || seen.has(id)) return false; seen.add(id); return true; });
  return result;
}
function unique(items: CatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => { const id = itemId(item); if (!id || seen.has(id)) return false; seen.add(id); return true; });
}
function normalizeBundle(data: any): CatalogItem[] {
  const songs = (data.songs || []).map((item: any) => ({ ...item, type: "song", source: "YouTube Music" }));
  const artists = (data.artists || []).map((item: any) => ({ ...item, title: item.name || item.title, type: "artist", source: "YouTube Music" }));
  const albums = (data.albums || []).map((item: any) => ({ ...item, type: "album", source: "YouTube Music" }));
  const playlists = (data.playlists || []).map((item: any) => { const id = String(item.playlistId || ""); return { ...item, type: id.startsWith("RD") ? "mix" : id.startsWith("PL") ? "community_playlist" : "playlist", source: "YouTube Music" }; });
  const youtube = (data.youtube || []).map((item: any) => ({ ...item, type: item.type || "song", source: "YouTube" }));
  return unique([...songs, ...artists, ...albums, ...playlists, ...youtube]);
}
function itemUrl(item: CatalogItem) {
  if (item.url) return item.url;
  if (item.videoId) return `https://music.youtube.com/watch?v=${item.videoId}`;
  if (item.playlistId) return `https://music.youtube.com/playlist?list=${item.playlistId}`;
  if (item.browseId) return `https://music.youtube.com/browse/${item.browseId}`;
  return "";
}
function parseLink(raw: string, titleInput: string): CatalogItem {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error("Cole um link válido do YouTube ou YouTube Music."); }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) throw new Error("Use um link de youtube.com, youtu.be ou music.youtube.com.");
  const video = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
  const playlist = url.searchParams.get("list") || "";
  const browse = url.pathname.match(/\/browse\/([A-Za-z0-9_-]+)/)?.[1] || "";
  const videoId = video && /^[A-Za-z0-9_-]{11}$/.test(video) ? video : "";
  const playlistId = /^[A-Za-z0-9_-]{10,}$/.test(playlist) ? playlist : "";
  const browseId = /^[A-Za-z0-9_-]{5,}$/.test(browse) ? browse : "";
  let type: string;
  let category: Category;
  if (videoId) { type = "song"; category = "songs"; }
  else if (playlistId.startsWith("OLAK5uy_")) { type = "album"; category = "albums"; }
  else if (playlistId) { type = "playlist"; category = "playlists"; }
  else if (browseId.startsWith("UC") || handle) { type = "artist"; category = "artists"; }
  else if (browseId.startsWith("MP")) { type = "album"; category = "albums"; }
  else throw new Error("Não identifiquei uma música, álbum, artista ou playlist nesse link.");
  const id = videoId || playlistId || browseId || (handle ? `@${handle}` : "");
  const title = titleInput.trim() || `${category === "songs" ? "Música" : category === "albums" ? "Álbum" : category === "artists" ? "Artista" : "Playlist"} ${id}`;
  return { id, type, title, name: category === "artists" ? title : undefined, ...(videoId ? { videoId, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } : {}), ...(playlistId ? { playlistId } : {}), ...(browseId ? { browseId } : {}), url: url.toString(), source: host === "music.youtube.com" ? "YouTube Music" : "YouTube" } as CatalogItem;
}

export default function BibliotecaSearch() {
  const [view, setView] = useState<View>("categories");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [category, setCategory] = useState<Category>("songs");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [home, setHome] = useState<Record<Category, CatalogItem[]>>({ songs: [], albums: [], artists: [], playlists: [] });
  const [library, setLibrary] = useState<PersonalLibrary>(EMPTY);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [link, setLink] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHome, setLoadingHome] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const libraryRef = useRef<PersonalLibrary>(EMPTY);
  const rowKeyRef = useRef("");
  const writes = useRef<Promise<void>>(Promise.resolve());

  const setSnapshot = useCallback((value: PersonalLibrary, rowKey?: string) => {
    const normalized = normalizeLibrary(value);
    libraryRef.current = normalized;
    setLibrary(normalized);
    if (rowKey !== undefined) rowKeyRef.current = rowKey;
  }, []);

  const loadLibrary = useCallback(async () => {
    const response = await fetch("/api/library", { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || data.message || "Não foi possível carregar a biblioteca.");
    const row = (Array.isArray(data.items) ? data.items : []).find((item: any) => item && (item.songs || item.albums || item.artists || item.playlists));
    setSnapshot(row || EMPTY, String(row?.__rowKey || ""));
    setLibraryReady(true);
  }, [setSnapshot]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/library", { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || data.message || "Não foi possível carregar a biblioteca.");
        if (!active) return;
        const row = (Array.isArray(data.items) ? data.items : []).find((item: any) => item && (item.songs || item.albums || item.artists || item.playlists));
        setSnapshot(row || EMPTY, String(row?.__rowKey || ""));
        setLibraryReady(true);
        try { const saved = localStorage.getItem("livenexus_music_search_history"); if (saved) setHistory(JSON.parse(saved).slice(0, 30)); } catch {}
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Falha ao carregar a biblioteca."); }
    })();
    return () => { active = false; };
  }, [setSnapshot]);

  useEffect(() => {
    let active = true;
    (async () => {
      const next: Record<Category, CatalogItem[]> = { songs: [], albums: [], artists: [], playlists: [] };
      await Promise.all(CATEGORIES.map(async (entry) => {
        try {
          const response = await fetch(`/api/ytmusic/bundle?q=${encodeURIComponent(SEEDS[entry.key])}`, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
          const data = await response.json();
          if (response.ok && data.ok) next[entry.key] = normalizeBundle(data).filter((item) => itemCategory(item) === entry.key).slice(0, 18);
        } catch { /* cada carrossel pode carregar independentemente */ }
      }));
      if (active) { setHome(next); setLoadingHome(false); }
    })();
    return () => { active = false; };
  }, []);

  const pushHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setHistory((current) => {
      const next = [{ query: clean, date: Date.now() }, ...current.filter((item) => item.query.toLowerCase() !== clean.toLowerCase())].slice(0, 30);
      try { localStorage.setItem("livenexus_music_search_history", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const persistLibrary = useCallback(async (next: PersonalLibrary) => {
    const payload: Record<string, unknown> = { ...next, user_id: next.user_id || sessionStorage.getItem("livenexus_user_id") || undefined };
    if (rowKeyRef.current) {
      const response = await fetch("/api/library", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ rowKey: rowKeyRef.current, record: payload }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || data.message || "Não foi possível salvar a biblioteca.");
      const saved = data.item || payload;
      setSnapshot(saved as PersonalLibrary, String((saved as any).__rowKey || rowKeyRef.current));
    } else {
      const response = await fetch("/api/library", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ record: payload }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || data.message || "Não foi possível criar a biblioteca.");
      const saved = data.item || payload;
      setSnapshot(saved as PersonalLibrary, String((saved as any).__rowKey || ""));
    }
  }, [setSnapshot]);

  const mutateLibrary = useCallback((mutator: (current: PersonalLibrary) => PersonalLibrary) => {
    setLibraryBusy(true); setNotice(""); setError("");
    writes.current = writes.current.then(async () => {
      try {
        await persistLibrary(normalizeLibrary(mutator(libraryRef.current)));
        setNotice("Biblioteca atualizada.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar a biblioteca.");
        try { await loadLibrary(); } catch {}
      } finally { setLibraryBusy(false); }
    });
    return writes.current;
  }, [loadLibrary, persistLibrary]);

  const isSaved = useCallback((item: CatalogItem) => {
    const id = itemId(item);
    return CATEGORIES.some((entry) => libraryRef.current[entry.key].some((saved) => itemId(saved) === id));
  }, []);

  const addItem = useCallback((item: CatalogItem) => {
    const kind = itemCategory(item);
    const id = itemId(item);
    if (!id) return;
    void mutateLibrary((current) => isSaved(item)
      ? { ...current, [kind]: current[kind].filter((saved) => itemId(saved) !== id) }
      : { ...current, [kind]: [...current[kind], { ...item, id: item.id || id, type: kind === "songs" ? "song" : kind === "albums" ? "album" : kind === "artists" ? "artist" : "playlist" }] });
  }, [isSaved, mutateLibrary]);

  async function runSearch(term = query) {
    const clean = term.trim();
    if (!clean) { setError("Digite o nome de uma música, álbum, artista ou playlist."); return; }
    setSearched(clean); setView("categories"); setLoading(true); setError(""); pushHistory(clean);
    try {
      const response = await fetch(`/api/ytmusic/bundle?q=${encodeURIComponent(clean)}`, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "A busca do catálogo falhou.");
      setResults(normalizeBundle(data));
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao pesquisar."); setResults([]); }
    finally { setLoading(false); }
  }
  const visibleResults = useMemo(() => results.filter((item) => itemCategory(item) === category), [results, category]);
  const removeItem = (item: CatalogItem) => void mutateLibrary((current) => {
    const kind = itemCategory(item); const id = itemId(item);
    return { ...current, [kind]: current[kind].filter((saved) => itemId(saved) !== id) };
  });

  async function handleAddLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    let item: CatalogItem;
    try { item = parseLink(link, linkTitle); } catch (err) { setError(err instanceof Error ? err.message : "Link inválido."); return; }
    const kind = itemCategory(item); const id = itemId(item);
    if (CATEGORIES.some((entry) => libraryRef.current[entry.key].some((saved) => itemId(saved) === id))) { setError("Esse item já está na biblioteca."); return; }
    await mutateLibrary((current) => ({ ...current, [kind]: [...current[kind], item] }));
    setLink(""); setLinkTitle("");
  }

  const librarySections = () => <div className="space-y-8">
    {CATEGORIES.map((entry) => {
      const Icon = entry.icon; const items = library[entry.key];
      return <section key={entry.key} className="space-y-3">
        <header className="flex items-center gap-2 text-white"><Icon className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold">{entry.label}</h2><span className="text-xs text-slate-500">{items.length}</span></header>
        {items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => <article key={itemId(item)} className="min-w-0 rounded-xl border border-white/10 bg-[#0d1120] p-3">
            {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className={`mb-2 aspect-square w-full rounded-lg object-cover ${entry.key === "artists" ? "rounded-full" : ""}`} /> : <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-white/5 text-slate-500"><Icon className="h-7 w-7" /></div>}
            <p className="truncate text-xs font-semibold text-white" title={item.title || item.name}>{item.title || item.name || "Sem título"}</p>
            <p className="mt-1 truncate text-[11px] text-slate-400">{item.artist || item.author || item.source || itemUrl(item)}</p>
            {itemUrl(item) && <a className="mt-2 block truncate text-[11px] text-cyan-300 hover:underline" href={itemUrl(item)} target="_blank" rel="noreferrer">Abrir link</a>}
            <button type="button" disabled={libraryBusy} onClick={() => removeItem(item)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1.5 text-[11px] text-rose-200 hover:bg-rose-400/10 disabled:opacity-50"><Trash2 className="h-3 w-3" />Remover</button>
          </article>)}
        </div> : <p className="text-xs text-slate-500">Nenhum item salvo em {entry.label.toLowerCase()}.</p>}
      </section>;
    })}
    {!libraryReady && <p className="text-xs text-slate-500">Carregando biblioteca...</p>}
  </div>;

  return <section className="w-full min-w-0 px-4 py-6 sm:px-8">
    <header className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Catálogo musical</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Biblioteca</h1><p className="mt-2 text-sm text-slate-400">Catálogo do YouTube e YouTube Music, com carrosséis e biblioteca pessoal.</p></header>
    <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-3" aria-label="Navegação da biblioteca">
      {([{ key: "categories", label: "CATEGORIAS", icon: Music2 }, { key: "history", label: "HISTORICO", icon: History }, { key: "library", label: "BIBLIOTECA", icon: Library }, { key: "personal", label: "PESSOAL", icon: UserRound }] as const).map((entry) => {
        const Icon = entry.icon;
        return <button key={entry.key} type="button" onClick={() => { setView(entry.key); if (entry.key === "categories") setSearched(""); setError(""); setNotice(""); }} aria-pressed={view === entry.key} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold tracking-wide transition ${view === entry.key ? "border-cyan-300 text-cyan-200" : "border-transparent text-slate-400 hover:text-white"}`}><Icon className="h-4 w-4" />{entry.label}</button>;
      })}
    </nav>
    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Fechar erro" className="ml-auto"><X className="h-4 w-4" /></button></div>}
    {notice && <p role="status" className="mb-4 text-xs text-cyan-200">{notice}</p>}

    {view === "categories" && <div className="space-y-8">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void runSearch(); }}>
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] px-4"><Search className="h-5 w-5 shrink-0 text-slate-500" /><input aria-label="Pesquisar catálogo" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar música, álbum, artista ou playlist..." className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></label>
        <button type="submit" disabled={loading || !query.trim()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Pesquisar</button>
      </form>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorias de resultados">
        {CATEGORIES.map((entry) => <button key={entry.key} type="button" onClick={() => setCategory(entry.key)} aria-pressed={category === entry.key} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === entry.key ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-400 hover:text-white"}`}>{entry.label}</button>)}
      </div>
      {searched ? <section className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-white">Resultados: {searched}</h2><button type="button" onClick={() => { setSearched(""); setResults([]); }} className="text-xs text-slate-400 hover:text-white">Limpar busca</button></div>
        {loading && <p className="text-xs text-slate-500">Buscando no YouTube e YouTube Music...</p>}
        {!loading && !visibleResults.length && <p className="text-sm text-slate-500">Nenhum resultado nesta categoria.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visibleResults.map((item) => {
          const saved = isSaved(item); const Icon = CATEGORIES.find((entry) => entry.key === itemCategory(item))?.icon || Music2;
          return <article key={itemId(item)} className="min-w-0 rounded-xl border border-white/10 bg-[#0d1120] p-3">
            {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className={`mb-2 aspect-square w-full rounded-lg object-cover ${itemCategory(item) === "artists" ? "rounded-full" : ""}`} /> : <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-white/5 text-slate-500"><Icon className="h-7 w-7" /></div>}
            <p className="truncate text-xs font-semibold text-white" title={item.title || item.name}>{item.title || item.name || "Sem título"}</p><p className="mt-1 truncate text-[11px] text-slate-400">{item.artist || item.author || item.source}</p>
            <button type="button" disabled={libraryBusy} onClick={() => addItem(item)} className={`mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${saved ? "border-cyan-300/30 text-cyan-200" : "border-white/10 text-slate-300 hover:bg-white/10"}`}>{saved ? <Library className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{saved ? "Na biblioteca" : "Adicionar à biblioteca"}</button>
          </article>;
        })}</div>
      </section> : <>
        {loadingHome && <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando carrosséis...</div>}
        {CATEGORIES.map((entry) => <MusicCarousel key={entry.key} title={entry.label} items={home[entry.key]} isSaved={isSaved} onAdd={addItem} />)}
        {!loadingHome && CATEGORIES.every((entry) => !home[entry.key].length) && <p className="text-sm text-slate-500">Não foi possível carregar os destaques agora.</p>}
      </>}
    </div>}

    {view === "history" && <section className="space-y-3">
      <header className="flex items-center justify-between"><h2 className="text-sm font-bold text-white">Histórico de pesquisas</h2><button type="button" onClick={() => { setHistory([]); try { localStorage.removeItem("livenexus_music_search_history"); } catch {} }} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><Trash2 className="h-3.5 w-3.5" />Limpar histórico</button></header>
      {!history.length ? <p className="text-sm text-slate-500">Nenhuma pesquisa no histórico.</p> : history.map((item) => <div key={item.query} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] p-3"><History className="h-4 w-4 shrink-0 text-slate-500" /><button type="button" onClick={() => { setQuery(item.query); void runSearch(item.query); }} className="min-w-0 flex-1 truncate text-left text-sm text-slate-200 hover:text-cyan-200">{item.query}</button><button type="button" onClick={() => setHistory((current) => { const next = current.filter((h) => h.query !== item.query); try { localStorage.setItem("livenexus_music_search_history", JSON.stringify(next)); } catch {} return next; })} aria-label={`Remover histórico ${item.query}`} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div>)}
    </section>}

    {view === "library" && <div className="space-y-4"><h2 className="text-sm font-bold text-white">Biblioteca salva</h2>{librarySections()}</div>}

    {view === "personal" && <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-[#0d1120] p-4"><h2 className="text-sm font-bold text-white">Adicionar por link</h2><p className="mt-1 text-xs text-slate-400">Cole um link de música, álbum, artista ou playlist do YouTube ou YouTube Music.</p>
        <form onSubmit={(event) => void handleAddLink(event)} className="mt-4 space-y-3">
          <label className="block"><span className="mb-1 block text-xs text-slate-400">Link</span><input value={link} onChange={(event) => setLink(event.target.value)} required type="url" placeholder="https://music.youtube.com/watch?v=..." className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-cyan-300/50" /></label>
          <label className="block"><span className="mb-1 block text-xs text-slate-400">Nome (opcional)</span><input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Nome para exibir na biblioteca" className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-cyan-300/50" /></label>
          <button type="submit" disabled={libraryBusy || !link.trim()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{libraryBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}Adicionar à biblioteca pessoal</button>
        </form>
      </section>
      {librarySections()}
    </div>}
  </section>;
}
