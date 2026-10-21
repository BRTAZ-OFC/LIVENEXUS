import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Music2, Disc3, Users, ListMusic, History, ChevronDown, ChevronUp,
  LoaderCircle, Play, Sparkles, X, Youtube, Radio
} from "lucide-react";

type MusicItem = {
  type?: string;
  videoId?: string;
  playlistId?: string;
  browseId?: string;
  id?: string;
  title?: string;
  name?: string;
  artist?: string;
  author?: string;
  channelTitle?: string;
  thumbnail?: string;
  durationStr?: string;
  source?: string;
  year?: string;
};
type Category = "songs" | "albums" | "artists" | "playlists" | "youtube";
type SearchData = {
  ok?: boolean;
  songs?: MusicItem[];
  albums?: MusicItem[];
  artists?: MusicItem[];
  playlists?: MusicItem[];
  youtube?: MusicItem[];
  continuations?: Partial<Record<Category, string>>;
  items?: MusicItem[];
  continuation?: string;
};

const CATEGORY_INFO: Record<Category, { label: string; icon: typeof Music2 }> = {
  songs: { label: "Músicas", icon: Music2 },
  albums: { label: "Álbuns", icon: Disc3 },
  artists: { label: "Artistas", icon: Users },
  playlists: { label: "Playlists", icon: ListMusic },
  youtube: { label: "YouTube", icon: Youtube },
};
const CAROUSEL_LIMIT = 400;
const HISTORY_KEY = "livenexus_biblioteca_history_v1";
const GENRES = [
  "Pop", "Rock", "Hip-hop", "Rap", "Funk brasileiro", "Sertanejo", "MPB",
  "Samba", "Pagode", "Forró", "Eletrônica", "Lo-fi", "Jazz", "Blues",
  "Reggae", "Gospel", "Clássica", "Metal", "Indie", "K-pop", "R&B", "Trap"
];
const initialCategories: Record<Category, MusicItem[]> = {
  songs: [], albums: [], artists: [], playlists: [], youtube: []
};

function itemKey(item: MusicItem) {
  return item.videoId || item.playlistId || item.browseId || item.id ||
    `${item.title || item.name || ""}-${item.artist || item.author || ""}`;
}
function itemTitle(item: MusicItem) {
  return item.title || item.name || "Sem título";
}
function dedupe(items: MusicItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = itemKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function BibliotecaPage() {
  const [carouselData, setCarouselData] = useState<Record<Category, MusicItem[]>>(initialCategories);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [currentTrack, setCurrentTrack] = useState<MusicItem | null>(null);
  const [activeSource, setActiveSource] = useState<"music" | "youtube">("music");
  const [results, setResults] = useState<Record<Category, MusicItem[]>>(initialCategories);
  const [continuations, setContinuations] = useState<Partial<Record<Category, string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<Partial<Record<Category, boolean>>>({});
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<Category, boolean>>>({});
  const [showGenres, setShowGenres] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<MusicItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved)) setHistory(saved);
    } catch { /* histórico inválido: inicia vazio */ }
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadCarousels() {
      setCarouselLoading(true);
      const types: Category[] = ["songs", "albums", "artists", "playlists"];
      await Promise.all(types.map(async (type) => {
        try {
          const response = await fetch(`/api/ytmusic/search?q=${encodeURIComponent(type === "songs" ? "músicas populares Brasil" : type === "albums" ? "álbuns populares Brasil" : type === "artists" ? "artistas populares Brasil" : "playlists populares Brasil")}&type=${type}&step=true`, { credentials: "same-origin" });
          if (!response.ok) return;
          const data = await response.json() as SearchData;
          if (alive) setCarouselData((current) => ({
            ...current,
            [type]: dedupe([...(current[type] || []), ...(data.items || [])]).slice(0, CAROUSEL_LIMIT)
          }));
        } catch { /* cada carrossel pode falhar sem bloquear os demais */ }
      }));
      if (alive) setCarouselLoading(false);
    }
    void loadCarousels();
    return () => { alive = false; };
  }, []);

  const saveHistory = useCallback((item: MusicItem) => {
    const entry = { ...item, playedAt: new Date().toISOString() };
    setHistory((current) => {
      const next = [entry, ...current.filter((saved) => itemKey(saved) !== itemKey(item))].slice(0, 100);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
      return next;
    });
  }, []);

  const playItem = useCallback((item: MusicItem, source: "YouTube Music" | "YouTube" = "YouTube Music") => {
    saveHistory({ ...item, source });
    const videoId = item.videoId;
    if (videoId) {
      setCurrentTrack({ ...item, source });
      window.dispatchEvent(new CustomEvent("livenexus:play-track", { detail: { ...item, source } }));
    } else if (item.browseId) {
      window.open(`https://music.youtube.com/browse/${encodeURIComponent(item.browseId)}`, "_blank", "noopener,noreferrer");
    } else if (item.playlistId) {
      window.open(`https://www.youtube.com/playlist?list=${encodeURIComponent(item.playlistId)}`, "_blank", "noopener,noreferrer");
    }
  }, [saveHistory]);

  const runSearch = useCallback(async (term = query) => {
    const clean = term.trim();
    if (!clean) return;
    setQuery(clean);
    setLoading(true);
    setError("");
    setSearched(true);
    setResults(initialCategories);
    setContinuations({});
    setExpanded({});
    try {
      const response = await fetch(`/api/ytmusic/bundle?q=${encodeURIComponent(clean)}&mode=initial`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      const data = await response.json() as SearchData;
      if (!response.ok || data.ok === false) throw new Error("Não foi possível realizar a busca.");
      setResults({
        songs: dedupe(data.songs || []),
        albums: dedupe(data.albums || []),
        artists: dedupe(data.artists || []),
        playlists: dedupe(data.playlists || []),
        youtube: dedupe(data.youtube || [])
      });
      setContinuations(data.continuations || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na busca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadMore = useCallback(async (type: Category) => {
    const token = continuations[type];
    if (!token || loadingMore[type]) return;
    setLoadingMore((current) => ({ ...current, [type]: true }));
    try {
      const endpoint = type === "youtube" ? "/api/ytmusic/youtube" : "/api/ytmusic/search";
      const body: Record<string, string | boolean> = { query, continuation: token, step: true };
      if (type !== "youtube") body.type = type;
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json() as SearchData;
      if (!response.ok) throw new Error("Não foi possível carregar a próxima página.");
      setResults((current) => ({ ...current, [type]: dedupe([...current[type], ...(data.items || [])]) }));
      setContinuations((current) => ({ ...current, [type]: data.continuation || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar mais resultados.");
    } finally {
      setLoadingMore((current) => ({ ...current, [type]: false }));
    }
  }, [continuations, loadingMore, query]);

  const counts = useMemo(() => ({
    music: results.songs.length + results.albums.length + results.artists.length + results.playlists.length,
    youtube: results.youtube.length
  }), [results]);

  function toggleExpanded(type: Category) {
    setExpanded((current) => ({ ...current, [type]: !current[type] }));
  }

  function ResultCard({ item, type, compact = false }: { item: MusicItem; type: Category; compact?: boolean }) {
    const Icon = CATEGORY_INFO[type].icon;
    const image = item.thumbnail || (item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` : "");
    return (
      <button type="button" onClick={() => playItem(item, type === "youtube" ? "YouTube" : "YouTube Music")}
        className={`lnx-library-card ${compact ? "lnx-library-card-compact" : ""}`} title={itemTitle(item)}>
        <span className="lnx-library-thumb">
          {image ? <img src={image} loading="lazy" alt="" /> : <span className="lnx-library-placeholder"><Icon /></span>}
          <span className="lnx-library-play"><Play size={17} fill="currentColor" /></span>
        </span>
        <span className="lnx-library-item-title">{itemTitle(item)}</span>
        <span className="lnx-library-item-subtitle">{item.artist || item.author || item.channelTitle || item.year || CATEGORY_INFO[type].label}</span>
      </button>
    );
  }

  function CategorySection({ type, items, isSearch = false }: { type: Category; items: MusicItem[]; isSearch?: boolean }) {
    const info = CATEGORY_INFO[type];
    const Icon = info.icon;
    const isExpanded = Boolean(expanded[type]);
    const displayItems = isSearch ? items : items.slice(0, CAROUSEL_LIMIT);
    return (
      <section className="lnx-library-section">
        <div className="lnx-library-section-heading">
          <h2><Icon size={20} /> {info.label}</h2>
          <span>{items.length.toLocaleString("pt-BR")}{!isSearch && items.length >= CAROUSEL_LIMIT ? " / 400" : ""}</span>
        </div>
        {displayItems.length ? (
          <div className={isExpanded ? "lnx-library-grid lnx-library-grid-expanded" : "lnx-library-carousel"}>
            {displayItems.map((item) => <ResultCard key={itemKey(item)} item={item} type={type} compact={!isExpanded} />)}
          </div>
        ) : (
          <p className="lnx-library-empty">{isSearch ? "Nenhum resultado nesta categoria." : carouselLoading ? "Carregando catálogo…" : "Nenhum item disponível."}</p>
        )}
        {displayItems.length > 0 && (
          <div className="lnx-library-section-actions">
            <button type="button" onClick={() => toggleExpanded(type)} className="lnx-library-text-button">
              {isExpanded ? <><ChevronUp size={16} /> Ver menos</> : <><ChevronDown size={16} /> Ver mais</>}
            </button>
            {isSearch && continuations[type] && (
              <button type="button" onClick={() => void loadMore(type)} disabled={Boolean(loadingMore[type])} className="lnx-library-text-button">
                {loadingMore[type] ? <LoaderCircle size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                {loadingMore[type] ? "Carregando…" : "Carregar mais resultados"}
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="lnx-library-page">
      <header className="lnx-library-header">
        <div>
          <p className="lnx-library-eyebrow"><Sparkles size={14} /> CATÁLOGO MUSICAL</p>
          <h1>Biblioteca</h1>
          <p>Pesquise músicas, álbuns, artistas e playlists no YouTube Music e no YouTube.</p>
        </div>
        <button type="button" className="lnx-library-outline-button" onClick={() => setShowHistory((value) => !value)}>
          <History size={17} /> Histórico <span>{history.length}</span>
        </button>
      </header>

      <form className="lnx-library-searchbar" onSubmit={(event) => { event.preventDefault(); void runSearch(); }}>
        <Search size={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar músicas, álbuns, artistas ou playlists…" aria-label="Buscar na biblioteca" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="lnx-library-clear"><X size={16} /></button>}
        <button type="submit" disabled={loading || !query.trim()} className="lnx-library-search-button">
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />} Buscar
        </button>
        <button type="button" className={showGenres ? "lnx-library-genre-button active" : "lnx-library-genre-button"} onClick={() => setShowGenres((value) => !value)}>
          <Radio size={17} /> Gêneros
        </button>
      </form>

      {currentTrack?.videoId && (
        <section className="lnx-library-player" aria-label="Reprodutor da biblioteca">
          <div className="lnx-library-player-info">
            <strong>Tocando agora</strong>
            <span>{itemTitle(currentTrack)}{currentTrack.artist ? ` — ${currentTrack.artist}` : ""}</span>
            <button type="button" onClick={() => setCurrentTrack(null)} aria-label="Fechar reprodutor"><X size={16} /></button>
          </div>
          <div className="lnx-library-player-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(currentTrack.videoId)}?autoplay=1&rel=0`}
              title={itemTitle(currentTrack)}
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {showGenres && (
        <div className="lnx-library-genres">
          <div className="lnx-library-genres-heading"><strong>Explorar por gênero</strong><button type="button" onClick={() => setShowGenres(false)} aria-label="Fechar gêneros"><X size={16} /></button></div>
          <div className="lnx-library-genre-list">
            {GENRES.map((genre) => <button key={genre} type="button" onClick={() => { setShowGenres(false); void runSearch(genre); }}>{genre}</button>)}
          </div>
        </div>
      )}

      {showHistory && (
        <section className="lnx-library-history">
          <div className="lnx-library-section-heading"><h2><History size={20} /> Ouvidas recentemente</h2><button type="button" onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }} className="lnx-library-text-button">Limpar histórico</button></div>
          {history.length ? <div className="lnx-library-carousel">{history.map((item) => <ResultCard key={itemKey(item)} item={item} type={item.source === "YouTube" ? "youtube" : "songs"} compact />)}</div> : <p className="lnx-library-empty">As músicas abertas a partir da biblioteca aparecerão aqui.</p>}
        </section>
      )}

      {error && <p role="alert" className="lnx-library-error">{error}</p>}

      {searched ? (
        <div className="lnx-library-search-results">
          <div className="lnx-library-source-tabs" role="tablist" aria-label="Fonte dos resultados">
            <button type="button" role="tab" aria-selected={activeSource === "music"} className={activeSource === "music" ? "active" : ""} onClick={() => setActiveSource("music")}>YouTube Music <span>{counts.music.toLocaleString("pt-BR")}</span></button>
            <button type="button" role="tab" aria-selected={activeSource === "youtube"} className={activeSource === "youtube" ? "active" : ""} onClick={() => setActiveSource("youtube")}><Youtube size={16} /> YouTube <span>{counts.youtube.toLocaleString("pt-BR")}</span></button>
          </div>
          {loading ? <div className="lnx-library-loading"><LoaderCircle className="animate-spin" /> Buscando nas duas plataformas…</div> : activeSource === "music" ? (
            (["songs", "albums", "artists", "playlists"] as Category[]).map((type) => <CategorySection key={type} type={type} items={results[type]} isSearch />)
          ) : <CategorySection type="youtube" items={results.youtube} isSearch />}
        </div>
      ) : (
        <div className="lnx-library-discovery">
          <div className="lnx-library-discovery-title"><div><h2>Descobrir</h2><p>Prévia limitada a 400 resultados por categoria para manter a biblioteca leve.</p></div></div>
          {(["songs", "albums", "artists", "playlists"] as Category[]).map((type) => <CategorySection key={type} type={type} items={carouselData[type]} />)}
        </div>
      )}
    </section>
  );
}
