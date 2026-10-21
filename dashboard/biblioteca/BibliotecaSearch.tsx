import { useRef, useState } from "react";
import {
  AlertCircle,
  Disc3,
  LoaderCircle,
  ListMusic,
  Music2,
  Search,
  UserRound,
} from "lucide-react";

type LibraryCategory = "songs" | "artists" | "albums" | "playlists" | "mixes";
type SearchItem = {
  videoId?: string;
  browseId?: string;
  playlistId?: string;
  id?: string;
  title?: string;
  name?: string;
  artist?: string;
  author?: string;
  source?: string;
  type?: string;
  thumbnail?: string;
  durationStr?: string;
  year?: string;
};

const CATEGORIES: { key: LibraryCategory; label: string; apiType: string }[] = [
  { key: "songs", label: "Músicas", apiType: "songs" },
  { key: "artists", label: "Artistas", apiType: "artists" },
  { key: "albums", label: "Álbuns", apiType: "albums" },
  { key: "playlists", label: "Playlists", apiType: "playlists" },
  { key: "mixes", label: "Mixes", apiType: "playlists" },
];

function itemKey(item: SearchItem) {
  if (item.videoId) return `song:${item.videoId}`;
  if (item.browseId) return `${item.type || "browse"}:${item.browseId}`;
  if (item.playlistId) return `${item.type || "playlist"}:${item.playlistId}`;
  if (item.id) return `${item.type || "item"}:${item.id}`;
  return `${item.type || "item"}:${(item.title || item.name || "").trim().toLowerCase()}:${(item.artist || item.author || "").trim().toLowerCase()}`;
}

function belongsToCategory(item: SearchItem, category: LibraryCategory) {
  if (category === "artists") return item.type === "artist";
  if (category === "albums") return item.type === "album";
  if (category === "playlists") {
    return Boolean(item.playlistId) && !item.playlistId?.startsWith("RD") && item.type !== "mix";
  }
  if (category === "mixes") return item.type === "mix" || Boolean(item.playlistId?.startsWith("RD"));
  return Boolean(item.videoId) && item.type !== "artist" && item.type !== "album";
}

function categoryIcon(category: LibraryCategory) {
  if (category === "artists") return UserRound;
  if (category === "albums") return Disc3;
  if (category === "playlists" || category === "mixes") return ListMusic;
  return Music2;
}

export default function BibliotecaSearch() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState<LibraryCategory>("songs");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [continuation, setContinuation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

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
    setContinuation("");

    try {
      const cfg = CATEGORIES.find((entry) => entry.key === nextCategory)!;
      const params = new URLSearchParams({
        q: term,
        type: cfg.apiType,
        step: "true",
      });
      const response = await fetch(`/api/ytmusic/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível pesquisar no catálogo.");
      }

      const received = (Array.isArray(data.items) ? data.items : []).filter(
        (item: SearchItem) => belongsToCategory(item, nextCategory),
      );
      const unique = new Map<string, SearchItem>();
      received.forEach((item: SearchItem) => unique.set(itemKey(item), item));
      setItems([...unique.values()]);
      setContinuation(typeof data.continuation === "string" ? data.continuation : "");
    } catch (err) {
      if (version === requestVersion.current) {
        setError(err instanceof Error ? err.message : "Falha ao pesquisar.");
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  async function loadMore() {
    if (!continuation || loadingMore || !submittedQuery) return;
    const version = requestVersion.current;
    setLoadingMore(true);
    setError("");
    try {
      const cfg = CATEGORIES.find((entry) => entry.key === category)!;
      const params = new URLSearchParams({
        q: submittedQuery,
        type: cfg.apiType,
        continuation,
        step: "true",
      });
      const response = await fetch(`/api/ytmusic/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível carregar mais resultados.");
      }

      const nextItems = (Array.isArray(data.items) ? data.items : []).filter(
        (item: SearchItem) => belongsToCategory(item, category),
      );
      setItems((current) => {
        const merged = new Map(current.map((item) => [itemKey(item), item]));
        nextItems.forEach((item: SearchItem) => {
          const key = itemKey(item);
          if (!merged.has(key)) merged.set(key, item);
        });
        return [...merged.values()];
      });
      setContinuation(typeof data.continuation === "string" ? data.continuation : "");
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
      setContinuation("");
      setError("");
    }
  }

  const ResultIcon = categoryIcon(category);

  return (
    <section className="w-full min-w-0 px-4 py-6 sm:px-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Catálogo musical</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Biblioteca</h1>
        <p className="mt-2 text-sm text-slate-400">
          Pesquise e explore músicas, artistas, álbuns, playlists e mixes.
        </p>
      </header>

      <form
        className="flex w-full flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(category, query);
        }}
      >
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
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Pesquisar
        </button>
      </form>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Categorias do catálogo">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => chooseCategory(entry.key)}
            aria-pressed={category === entry.key}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              category === entry.key
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-400">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Pesquisando catálogo...
        </div>
      ) : submittedQuery && items.length === 0 && !error ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-[#0d1120] p-8 text-center text-sm text-slate-400">
          Nenhum resultado encontrado nesta categoria.
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Resultados de <span className="font-semibold text-white">{submittedQuery}</span>
            </p>
            <span className="text-xs text-slate-500">{items.length} itens</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const Icon = categoryIcon(category);
              return (
                <article
                  key={itemKey(item)}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] p-3"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-lg bg-white/5 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-500">
                      <Icon className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{item.title || item.name || "Sem título"}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.artist || item.author || item.source || entryLabel(category)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.year || item.durationStr || entryLabel(category)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
          {continuation && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Carregando..." : "Carregar mais resultados"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-8 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-center text-sm text-slate-500">
          <ResultIcon className="h-7 w-7" />
          Digite uma pesquisa para explorar o catálogo.
        </div>
      )}
    </section>
  );
}

function entryLabel(category: LibraryCategory) {
  return CATEGORIES.find((entry) => entry.key === category)?.label || "Catálogo";
}
