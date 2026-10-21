import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Disc3,
  LoaderCircle,
  ListMusic,
  Music2,
  Search,
  UserRound,
} from "lucide-react";
import { type CatalogItem } from "./catalogSources";

type LibraryCategory = "songs" | "artists" | "albums" | "playlists" | "mixes";
type Continuations = Record<string, string>;

const CATEGORIES: { key: LibraryCategory; label: string }[] = [
  { key: "songs", label: "Músicas" },
  { key: "artists", label: "Artistas" },
  { key: "albums", label: "Álbuns" },
  { key: "playlists", label: "Playlists" },
  { key: "mixes", label: "Mixes" },
];

function entityKey(item: CatalogItem) {
  if (item.videoId) return `video:${item.videoId}`;
  if (item.browseId) return `${item.type || "browse"}:${item.browseId}`;
  if (item.playlistId) return `${item.type || "playlist"}:${item.playlistId}`;
  if (item.id) return `${item.source}:${item.type}:${item.id}`;
  return `${item.source}:${item.type}:${(item.title || item.name || "").trim().toLowerCase()}:${(item.artist || item.author || "").trim().toLowerCase()}`;
}

function uniqueItems(items: CatalogItem[]) {
  const unique = new Map<string, CatalogItem>();
  for (const item of items) {
    if (!item || !(item.title || item.name)) continue;
    const key = entityKey(item);
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, item);
      continue;
    }
    // Mantém um resultado por ID e completa metadados que estejam ausentes.
    const merged = { ...existing };
    for (const [field, value] of Object.entries(item)) {
      if ((merged as any)[field] == null || (merged as any)[field] === "") {
        (merged as any)[field] = value;
      }
    }
    unique.set(key, merged);
  }
  return [...unique.values()];
}

function normalizeBundle(data: any): CatalogItem[] {
  const songs: CatalogItem[] = (data.songs || []).map((item: any) => ({
    ...item, type: "song", source: "YouTube Music",
  }));
  const artists: CatalogItem[] = (data.artists || []).map((item: any) => ({
    ...item, title: item.name || item.title, artist: item.name || item.title,
    type: "artist", source: "YouTube Music",
  }));
  const albums: CatalogItem[] = (data.albums || []).map((item: any) => ({
    ...item, type: "album", source: "YouTube Music",
  }));
  const playlists: CatalogItem[] = (data.playlists || []).map((item: any) => {
    const id = String(item.playlistId || "");
    const type = id.startsWith("RD") ? "mix" : id.startsWith("PL") ? "community_playlist" : "playlist";
    return { ...item, type, source: "YouTube Music" };
  });
  const youtube: CatalogItem[] = (data.youtube || []).map((item: any) => ({
    ...item, type: item.type || "song", source: "YouTube",
  }));
  return uniqueItems([...songs, ...artists, ...albums, ...playlists, ...youtube]);
}

function belongsToCategory(item: CatalogItem, category: LibraryCategory) {
  if (category === "artists") return item.type === "artist";
  if (category === "albums") return item.type === "album";
  if (category === "playlists") {
    return (item.type === "playlist" || item.type === "community_playlist" || Boolean(item.playlistId))
      && item.type !== "mix" && !item.playlistId?.startsWith("RD");
  }
  if (category === "mixes") return item.type === "mix" || item.type === "mixcloud_mix" || Boolean(item.playlistId?.startsWith("RD"));
  return item.type === "song" || item.type === "youtube" || Boolean(item.videoId);
}

function categoryIcon(category: LibraryCategory) {
  if (category === "artists") return UserRound;
  if (category === "albums") return Disc3;
  if (category === "playlists" || category === "mixes") return ListMusic;
  return Music2;
}

const GENRE_PATTERNS: [RegExp, string][] = [
  [/\bsertanejo\b/i, "Sertanejo"], [/\bpagode\b/i, "Pagode"],
  [/\bsamba\b/i, "Samba"], [/\bforr[óo]\b/i, "Forró"],
  [/\bpiseiro\b/i, "Piseiro"], [/\bfunk carioca\b|\bmandel[ãa]o\b/i, "Funk Brasileiro"],
  [/\bhip[ -]?hop\b/i, "Hip Hop"], [/\brap\b/i, "Rap"],
  [/\bpop[ -]?rock\b/i, "Pop Rock"], [/\brock\b/i, "Rock"],
  [/\bmetal\b/i, "Metal"], [/\bpop\b/i, "Pop"],
  [/\breggae\b/i, "Reggae"], [/\bgospel\b|\bworship\b/i, "Gospel"],
  [/\bjazz\b/i, "Jazz"], [/\bblues\b/i, "Blues"],
  [/\bclassical\b|\bcl[áa]ssica\b/i, "Clássica"], [/\blo[ -]?fi\b/i, "Lo-fi"],
  [/\bhouse\b|\btechno\b|\btrance\b|\bedm\b|\belectronic\b|\beletr[ôo]nica\b/i, "Eletrônica"],
];

function getGenres(item: CatalogItem) {
  const text = [item.title, item.artist, ...(item.genres || []), ...(item.sourceTags || [])].filter(Boolean).join(" ");
  const genres = new Set<string>();
  for (const [pattern, label] of GENRE_PATTERNS) if (pattern.test(text)) genres.add(label);
  return [...genres].slice(0, 3);
}

export default function BibliotecaSearch() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState<LibraryCategory>("songs");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [continuations, setContinuations] = useState<Continuations>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const visibleItems = useMemo(
    () => items.filter((item) => belongsToCategory(item, category)),
    [items, category],
  );

  async function runSearch(nextCategory = category, nextQuery = query) {
    const term = nextQuery.trim();
    if (!term) {
      setError("Digite o nome de uma música, artista, álbum ou playlist.");
      return;
    }

    const version = ++requestVersion.current;
    setSubmittedQuery(term);
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setItems([]);
    setContinuations({});

    try {
      // Usa o bundle da API existente: categorias oficiais consultadas em paralelo,
      // resultados iniciais e tokens separados para continuar cada categoria.
      const response = await fetch(`/api/ytmusic/bundle?q=${encodeURIComponent(term)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok || !data.ok) throw new Error(data.error || "A busca do catálogo falhou.");

      setItems(normalizeBundle(data));
      setContinuations(data.continuations && typeof data.continuations === "object" ? data.continuations : {});
      setLoading(false);

    } catch (err) {
      if (version === requestVersion.current) {
        setError(err instanceof Error ? err.message : "Falha ao pesquisar.");
        setLoading(false);
      }
    }
  }

  async function loadMore() {
    const tokenKeys = category === "songs"
      ? ["songs", "youtube"].filter((key) => Boolean(continuations[key]))
      : [category === "mixes" ? "playlists" : category].filter((key) => Boolean(continuations[key]));
    if (!tokenKeys.length || loadingMore || !submittedQuery) return;

    const version = requestVersion.current;
    setLoadingMore(true);
    setError("");
    try {
      const pages = await Promise.all(tokenKeys.map(async (tokenKey) => {
        const endpoint = tokenKey === "youtube" ? "youtube" : "search";
        const params = new URLSearchParams({
          q: submittedQuery,
          continuation: continuations[tokenKey],
          step: "true",
        });
        if (endpoint === "search") params.set("type", tokenKey);
        const response = await fetch(`/api/ytmusic/${endpoint}?${params.toString()}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível carregar mais resultados.");
        const incoming = (Array.isArray(data.items) ? data.items : []).map((item: any) => {
          if (tokenKey === "playlists") {
            const id = String(item.playlistId || "");
            return { ...item, type: id.startsWith("RD") ? "mix" : id.startsWith("PL") ? "community_playlist" : "playlist", source: item.source || "YouTube Music" };
          }
          if (tokenKey === "youtube") return { ...item, source: "YouTube" };
          return { ...item, type: tokenKey === "songs" ? "song" : tokenKey.slice(0, -1), source: "YouTube Music" };
        });
        return { tokenKey, items: incoming, continuation: data.continuation || "" };
      }));
      if (version !== requestVersion.current) return;
      setItems((current) => uniqueItems([...current, ...pages.flatMap((page) => page.items)]));
      setContinuations((current) => {
        const next = { ...current };
        for (const page of pages) next[page.tokenKey] = page.continuation;
        return next;
      });
    } catch (err) {
      if (version === requestVersion.current) {
        setError(err instanceof Error ? err.message : "Falha ao carregar mais resultados.");
      }
    } finally {
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }

  function chooseCategory(nextCategory: LibraryCategory) {
    setCategory(nextCategory);
    if (submittedQuery) void runSearch(nextCategory, submittedQuery);
    else {
      requestVersion.current += 1;
      setItems([]);
      setContinuations({});
      setError("");
    }
  }

  const ResultIcon = categoryIcon(category);
  const canLoadMore = category === "songs"
    ? Boolean(continuations.songs || continuations.youtube)
    : Boolean(continuations[category === "mixes" ? "playlists" : category]);

  return (
    <section className="w-full min-w-0 px-4 py-6 sm:px-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Catálogo musical</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Biblioteca</h1>
        <p className="mt-2 text-sm text-slate-400">
          Busca por categorias, resultados progressivos e metadados de várias fontes.
        </p>
      </header>

      <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={(event) => {
        event.preventDefault();
        void runSearch(category, query);
      }}>
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-500" />
          <input
            aria-label="Pesquisar catálogo musical"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por música, artista, álbum..."
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>
        <button type="submit" disabled={loading || !query.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Pesquisar
        </button>
      </form>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Categorias do catálogo">
        {CATEGORIES.map((entry) => (
          <button key={entry.key} type="button" onClick={() => chooseCategory(entry.key)}
            aria-pressed={category === entry.key}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              category === entry.key
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5 hover:text-white"
            }`}>
            {entry.label}
          </button>
        ))}
      </nav>

      {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
      </div>}

      {loading && <p className="mt-4 text-xs text-slate-500">
        Buscando nas categorias do YouTube Music e YouTube...
      </p>}

      {loading && items.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-400">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Pesquisando catálogo...
        </div>
      ) : submittedQuery && visibleItems.length === 0 && !error && !loading ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-[#0d1120] p-8 text-center text-sm text-slate-400">
          Nenhum resultado encontrado nesta categoria.
        </div>
      ) : visibleItems.length > 0 ? (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Resultados de <span className="font-semibold text-white">{submittedQuery}</span></p>
            <span className="text-xs text-slate-500">{visibleItems.length} itens</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => {
              const Icon = categoryIcon(category);
              const genres = getGenres(item);
              return (
                <article key={entityKey(item)} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] p-3">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-white/5 object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-500"><Icon className="h-6 w-6" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{item.title || item.name || "Sem título"}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{item.artist || item.author || item.source}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{item.source}</span>
                      {genres.map((genre) => <span key={genre} className="rounded bg-cyan-300/5 px-1.5 py-0.5 text-[10px] text-cyan-200/80">{genre}</span>)}
                    </div>
                    {item.year && <p className="mt-1 truncate text-[11px] text-slate-500">{item.year}</p>}
                  </div>
                </article>
              );
            })}
          </div>
          {canLoadMore && <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50">
              {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loadingMore ? "Carregando..." : "Carregar mais resultados"}
            </button>
          </div>}
        </>
      ) : (
        <div className="mt-8 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-center text-sm text-slate-500">
          <ResultIcon className="h-7 w-7" /> Digite uma pesquisa para explorar o catálogo.
        </div>
      )}
    </section>
  );
}
