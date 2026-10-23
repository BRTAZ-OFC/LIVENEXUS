import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Disc3,
  History,
  Library,
  Link2,
  ListMusic,
  LoaderCircle,
  Music2,
  Play,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import MusicCarousel from "./MusicCarousel";
import type { CatalogItem } from "./catalogSources";
import { playTrack, playTracks, type MusicTrack } from "./musicPlayerEngine";

type Category = "songs" | "albums" | "artists" | "playlists";
type SearchCategory = Category | "mixes";
type View = "categories" | "history" | "personal";
type PersonalLibrary = {
  songs: CatalogItem[];
  albums: CatalogItem[];
  artists: CatalogItem[];
  playlists: CatalogItem[];
  user_id?: string;
};
type HistoryItem = { query: string; date: number };
const CATEGORIES: { key: Category; label: string; icon: typeof Music2 }[] = [
  { key: "songs", label: "Músicas", icon: Music2 },
  { key: "albums", label: "Álbuns", icon: Disc3 },
  { key: "artists", label: "Artistas", icon: UserRound },
  { key: "playlists", label: "Playlists", icon: ListMusic },
];
const EMPTY: PersonalLibrary = { songs: [], albums: [], artists: [], playlists: [] };
const SEEDS: Record<Category, string> = {
  songs: "músicas mais tocadas Brasil",
  albums: "álbuns populares Brasil",
  artists: "artistas populares Brasil",
  playlists: "playlists populares Brasil",
};
const itemId = (item: CatalogItem) =>
  String(
    item.videoId ||
      item.playlistId ||
      item.browseId ||
      item.id ||
      `${item.type}:${item.title || item.name || ""}`,
  ).trim();
function itemCategory(item: CatalogItem): Category {
  if (item.type === "album" || String(item.playlistId || "").startsWith("OLAK5uy_"))
    return "albums";
  if (item.type === "artist" || String(item.browseId || "").startsWith("UC")) return "artists";
  if (["playlist", "community_playlist", "mix"].includes(item.type) || item.playlistId)
    return "playlists";
  return "songs";
}
function normalizeLibrary(value: any): PersonalLibrary {
  const result: PersonalLibrary = {
    songs: Array.isArray(value?.songs) ? value.songs : [],
    albums: Array.isArray(value?.albums) ? value.albums : [],
    artists: Array.isArray(value?.artists) ? value.artists : [],
    playlists: Array.isArray(value?.playlists) ? value.playlists : [],
    ...(value?.user_id ? { user_id: value.user_id } : {}),
  };
  const seen = new Set<string>();
  for (const category of CATEGORIES)
    result[category.key] = result[category.key].filter((item) => {
      const id = itemId(item);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  return result;
}
function unique(items: CatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = itemId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
function normalizeBundle(data: any): CatalogItem[] {
  const songs = (data.songs || []).map((item: any) => ({
    ...item,
    type: "song",
    source: "YouTube Music",
  }));
  const artists = (data.artists || []).map((item: any) => ({
    ...item,
    title: item.name || item.title,
    type: "artist",
    source: "YouTube Music",
  }));
  const albums = (data.albums || []).map((item: any) => ({
    ...item,
    type: "album",
    source: "YouTube Music",
  }));
  const playlists = (data.playlists || []).map((item: any) => {
    const id = String(item.playlistId || "");
    return {
      ...item,
      type: id.startsWith("RD") ? "mix" : id.startsWith("PL") ? "community_playlist" : "playlist",
      source: "YouTube Music",
    };
  });
  const youtube = (data.youtube || []).map((item: any) => ({
    ...item,
    type: item.type || "song",
    source: "YouTube",
  }));
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
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Cole um link válido do YouTube ou YouTube Music.");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host))
    throw new Error("Use um link de youtube.com, youtu.be ou music.youtube.com.");
  const video =
    host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
  const playlist = url.searchParams.get("list") || "";
  const browse = url.pathname.match(/\/(?:browse|channel)\/([A-Za-z0-9_-]+)/)?.[1] || "";
  const handle = url.pathname.match(/^\/@([A-Za-z0-9._-]+)/)?.[1] || "";
  const videoId = video && /^[A-Za-z0-9_-]{11}$/.test(video) ? video : "";
  const playlistId = /^[A-Za-z0-9_-]{10,}$/.test(playlist) ? playlist : "";
  const browseId = /^[A-Za-z0-9_-]{5,}$/.test(browse) ? browse : "";
  let type: string;
  let category: Category;
  if (videoId) {
    type = "song";
    category = "songs";
  } else if (playlistId.startsWith("OLAK5uy_")) {
    type = "album";
    category = "albums";
  } else if (playlistId) {
    type = "playlist";
    category = "playlists";
  } else if (browseId.startsWith("UC") || handle) {
    type = "artist";
    category = "artists";
  } else if (browseId.startsWith("MP")) {
    type = "album";
    category = "albums";
  } else throw new Error("Não identifiquei uma música, álbum, artista ou playlist nesse link.");
  const id = videoId || playlistId || browseId || (handle ? `@${handle}` : "");
  const title =
    titleInput.trim() ||
    (category === "artists" && handle
      ? `@${handle}`
      : `${category === "songs" ? "Música" : category === "albums" ? "Álbum" : category === "artists" ? "Artista" : "Playlist"} ${id}`);
  return {
    id,
    type,
    title,
    name: category === "artists" ? title : undefined,
    ...(videoId ? { videoId, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } : {}),
    ...(playlistId ? { playlistId } : {}),
    ...(browseId ? { browseId } : {}),
    url: url.toString(),
    source: host === "music.youtube.com" ? "YouTube Music" : "YouTube",
  } as CatalogItem;
}

export default function BibliotecaSearch() {
  const [view, setView] = useState<View>("categories");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [category, setCategory] = useState<SearchCategory>("songs");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [continuations, setContinuations] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const requestVersionRef = useRef(0);
  const [home, setHome] = useState<Record<Category, CatalogItem[]>>({
    songs: [],
    albums: [],
    artists: [],
    playlists: [],
  });
  const [library, setLibrary] = useState<PersonalLibrary>(EMPTY);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [link, setLink] = useState("");
  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHome, setLoadingHome] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const libraryRef = useRef<PersonalLibrary>(EMPTY);
  const rowKeyRef = useRef("");
  const writes = useRef<Promise<void>>(Promise.resolve());
  const pendingAddsRef = useRef<Set<string>>(new Set());

  const setSnapshot = useCallback((value: PersonalLibrary, rowKey?: string) => {
    const normalized = normalizeLibrary(value);
    libraryRef.current = normalized;
    setLibrary(normalized);
    if (rowKey !== undefined) rowKeyRef.current = rowKey;
  }, []);

  const loadLibrary = useCallback(async () => {
    const response = await fetch("/api/library", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.ok)
      throw new Error(data.error || data.message || "Não foi possível carregar a biblioteca.");
    const row = (Array.isArray(data.items) ? data.items : []).find(
      (item: any) => item && (item.songs || item.albums || item.artists || item.playlists),
    );
    setSnapshot(row || EMPTY, String(row?.__rowKey || ""));
    setLibraryReady(true);
  }, [setSnapshot]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/library", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || data.message || "Não foi possível carregar a biblioteca.");
        if (!active) return;
        const row = (Array.isArray(data.items) ? data.items : []).find(
          (item: any) => item && (item.songs || item.albums || item.artists || item.playlists),
        );
        setSnapshot(row || EMPTY, String(row?.__rowKey || ""));
        setLibraryReady(true);
        try {
          const saved = localStorage.getItem("livenexus_music_search_history");
          if (saved) setHistory(JSON.parse(saved).slice(0, 30));
        } catch {}
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Falha ao carregar a biblioteca.");
      }
    })();
    return () => {
      active = false;
    };
  }, [setSnapshot]);

  useEffect(() => {
    let active = true;
    const loadHomeCategory = async (entry: (typeof CATEGORIES)[number]) => {
      const collected: CatalogItem[] = [];
      try {
        const response = await fetch(
          `/api/ytmusic/bundle?q=${encodeURIComponent(SEEDS[entry.key])}&mode=initial`,
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
        );
        const data = await response.json();
        if (!response.ok || !data.ok) return collected;
        collected.push(...normalizeBundle(data).filter((item) => itemCategory(item) === entry.key));
        // Carrega somente o lote inicial, igual à primeira leva da pesquisa; não solicita continuations.
      } catch {
        /* cada carrossel pode carregar independentemente */
      }
      return unique(collected).slice(0, 30);
    };
    (async () => {
      const pairs = await Promise.all(
        CATEGORIES.map(async (entry) => [entry.key, await loadHomeCategory(entry)] as const),
      );
      if (active) {
        const next: Record<Category, CatalogItem[]> = {
          songs: [],
          albums: [],
          artists: [],
          playlists: [],
        };
        for (const [key, items] of pairs) next[key] = items;
        setHome(next);
        setLoadingHome(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const pushHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setHistory((current) => {
      const next = [
        { query: clean, date: Date.now() },
        ...current.filter((item) => item.query.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, 30);
      try {
        localStorage.setItem("livenexus_music_search_history", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const persistLibrary = useCallback(
    async (next: PersonalLibrary) => {
      const payload: Record<string, unknown> = {
        ...next,
        user_id: next.user_id || sessionStorage.getItem("livenexus_user_id") || undefined,
      };
      if (rowKeyRef.current) {
        const response = await fetch("/api/library", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ rowKey: rowKeyRef.current, record: payload }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || data.message || "Não foi possível salvar a biblioteca.");
        const saved = data.item || payload;
        setSnapshot(saved as PersonalLibrary, String((saved as any).__rowKey || rowKeyRef.current));
      } else {
        const response = await fetch("/api/library", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ record: payload }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || data.message || "Não foi possível criar a biblioteca.");
        const saved = data.item || payload;
        setSnapshot(saved as PersonalLibrary, String((saved as any).__rowKey || ""));
      }
    },
    [setSnapshot],
  );

  const mutateLibrary = useCallback(
    (mutator: (current: PersonalLibrary) => PersonalLibrary) => {
      setLibraryBusy(true);
      setNotice("");
      setError("");
      writes.current = writes.current.then(async () => {
        try {
          await persistLibrary(normalizeLibrary(mutator(libraryRef.current)));
          setNotice("Biblioteca atualizada.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível atualizar a biblioteca.");
          try {
            await loadLibrary();
          } catch {}
        } finally {
          setLibraryBusy(false);
        }
      });
      return writes.current;
    },
    [loadLibrary, persistLibrary],
  );

  const isSaved = useCallback((item: CatalogItem) => {
    const id = itemId(item);
    return CATEGORIES.some((entry) =>
      libraryRef.current[entry.key].some((saved) => itemId(saved) === id),
    );
  }, []);

  const addItem = useCallback(
    (item: CatalogItem) => {
      const kind = itemCategory(item);
      const id = itemId(item);
      if (!id || isSaved(item) || pendingAddsRef.current.has(id)) return;
      pendingAddsRef.current.add(id);
      void mutateLibrary((current) => ({
        ...current,
        [kind]: [
          ...current[kind],
          {
            ...item,
            id: item.id || id,
            type:
              kind === "songs"
                ? "song"
                : kind === "albums"
                  ? "album"
                  : kind === "artists"
                    ? "artist"
                    : "playlist",
          },
        ],
      })).finally(() => pendingAddsRef.current.delete(id));
    },
    [isSaved, mutateLibrary],
  );

  const openItem = useCallback(async (item: CatalogItem) => {
    setDetailItem(item);
    setDetailData(null);
    setDetailLoading(true);
    setError("");
    const kind = itemCategory(item);
    let browseId =
      item.browseId ||
      (item.playlistId
        ? String(item.playlistId).startsWith("VL")
          ? item.playlistId
          : `VL${item.playlistId}`
        : "");
    if (!browseId && kind === "artists") {
      try {
        const lookup = await fetch(
          `/api/ytmusic/bundle?q=${encodeURIComponent(item.title || item.name || "")}`,
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
        );
        const bundle = await lookup.json();
        const match =
          (bundle.artists || []).find(
            (entry: any) =>
              String(entry.name || entry.title || "").toLowerCase() ===
              String(item.title || item.name || "").toLowerCase(),
          ) || bundle.artists?.[0];
        browseId = match?.browseId || "";
        if (browseId) setDetailItem((current) => (current ? { ...current, browseId } : current));
      } catch {
        /* keep basic artist details if lookup fails */
      }
    }
    if (kind === "songs" || !browseId) {
      setDetailData({
        ok: true,
        title: item.title || item.name,
        tracks: item.videoId ? [item] : [],
        sections: [],
      });
      setDetailLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/ytmusic/browse?browseId=${encodeURIComponent(browseId)}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Não foi possível abrir os detalhes deste item.");
      setDetailData({ ...data, itemType: kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os detalhes.");
      setDetailData({ ok: false, tracks: [], sections: [] });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const playDetailTrack = (track: any, list?: any[]) => {
    const normalized = {
      ...track,
      videoId: track.videoId,
      title: track.title || track.name || "Música",
      artist: track.artist || track.subtitle || detailItem?.artist || detailItem?.name || "",
      thumbnail: track.thumbnail || detailItem?.thumbnail,
    };
    if (list?.length) {
      const playable = list
        .filter((entry) => entry?.videoId)
        .map((entry) => ({
          ...entry,
          title: entry.title || entry.name || "Música",
        })) as MusicTrack[];
      const startIndex = playable.findIndex((entry) => entry.videoId === track.videoId);
      playTracks(playable, startIndex >= 0 ? startIndex : 0);
    } else playTrack(normalized as MusicTrack);
  };

  const playDetailCollection = (tracks: any[]) => {
    const playable = (tracks || [])
      .filter((track) => track?.videoId)
      .map((track) => ({ ...track, title: track.title || track.name || "Música" })) as MusicTrack[];
    if (playable.length) playTracks(playable, 0);
    else setError("Não há músicas reproduzíveis neste item.");
  };

  const openSectionItem = (entry: any, sectionTitle: string) => {
    const lower = String(sectionTitle || "").toLowerCase();
    const type = /álbum|album|lançamento|release/.test(lower)
      ? "album"
      : /playlist|lista/.test(lower)
        ? "playlist"
        : entry.videoId
          ? "song"
          : "artist";
    void openItem({
      ...entry,
      title: entry.title || entry.name || sectionTitle,
      type,
      name: entry.title || entry.name,
      source: "YouTube Music",
    } as CatalogItem);
  };

  async function runSearch(term = query) {
    const clean = term.trim();
    if (!clean) {
      setError("Digite o nome de uma música, álbum, artista ou playlist.");
      return;
    }
    const version = ++requestVersionRef.current;
    setSearched(clean);
    setView("categories");
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setResults([]);
    setContinuations({});
    pushHistory(clean);
    try {
      const response = await fetch(`/api/ytmusic/bundle?q=${encodeURIComponent(clean)}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json();
      if (version !== requestVersionRef.current) return;
      if (!response.ok || !data.ok) throw new Error(data.error || "A busca do catálogo falhou.");
      setResults(normalizeBundle(data));
      setContinuations(
        data.continuations && typeof data.continuations === "object" ? data.continuations : {},
      );
    } catch (err) {
      if (version === requestVersionRef.current) {
        setError(err instanceof Error ? err.message : "Falha ao pesquisar.");
        setResults([]);
      }
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }

  async function loadMore() {
    const tokenKeys =
      category === "songs"
        ? ["songs", "youtube"].filter((key) => Boolean(continuations[key]))
        : [category === "mixes" ? "playlists" : category].filter((key) =>
            Boolean(continuations[key]),
          );
    if (!tokenKeys.length || loadingMore || !searched) return;
    const version = requestVersionRef.current;
    setLoadingMore(true);
    setError("");
    try {
      const pages = await Promise.all(
        tokenKeys.map(async (tokenKey) => {
          const endpoint = tokenKey === "youtube" ? "youtube" : "search";
          const params = new URLSearchParams({
            q: searched,
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
          if (!response.ok || !data.ok)
            throw new Error(data.error || "Não foi possível carregar mais resultados.");
          const incoming = (Array.isArray(data.items) ? data.items : []).map((item: any) => {
            if (tokenKey === "playlists") {
              const id = String(item.playlistId || "");
              return {
                ...item,
                type: id.startsWith("RD")
                  ? "mix"
                  : id.startsWith("PL")
                    ? "community_playlist"
                    : "playlist",
                source: item.source || "YouTube Music",
              };
            }
            if (tokenKey === "youtube")
              return { ...item, type: item.type || "song", source: "YouTube" };
            return {
              ...item,
              type: tokenKey === "songs" ? "song" : tokenKey.slice(0, -1),
              source: "YouTube Music",
            };
          });
          return { tokenKey, items: incoming, continuation: data.continuation || "" };
        }),
      );
      if (version !== requestVersionRef.current) return;
      setResults((current) => unique([...current, ...pages.flatMap((page) => page.items)]));
      setContinuations((current) => {
        const next = { ...current };
        for (const page of pages) next[page.tokenKey] = page.continuation;
        return next;
      });
    } catch (err) {
      if (version === requestVersionRef.current)
        setError(err instanceof Error ? err.message : "Falha ao carregar mais resultados.");
    } finally {
      if (version === requestVersionRef.current) setLoadingMore(false);
    }
  }
  const canLoadMore =
    category === "songs"
      ? Boolean(continuations.songs || continuations.youtube)
      : Boolean(continuations[category === "mixes" ? "playlists" : category]);
  const visibleResults = useMemo(
    () =>
      results.filter((item) => {
        if (category === "mixes")
          return item.type === "mix" || Boolean(item.playlistId?.startsWith("RD"));
        if (category === "playlists")
          return (
            itemCategory(item) === "playlists" &&
            item.type !== "mix" &&
            !item.playlistId?.startsWith("RD")
          );
        return itemCategory(item) === category;
      }),
    [results, category],
  );
  const removeItem = (item: CatalogItem) =>
    void mutateLibrary((current) => {
      const kind = itemCategory(item);
      const id = itemId(item);
      return { ...current, [kind]: current[kind].filter((saved) => itemId(saved) !== id) };
    });

  async function handlePreviewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const item = parseLink(link, "");

      const browseId =
        item.browseId ||
        (item.playlistId
          ? String(item.playlistId).startsWith("VL")
            ? item.playlistId
            : `VL${item.playlistId}`
          : "");
      if (browseId) {
        const response = await fetch(
          `/api/ytmusic/browse?browseId=${encodeURIComponent(browseId)}`,
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
        );
        const data = await response.json();
        if (data.ok) {
          if (data.title) item.title = data.title;
          if (data.thumbnail) item.thumbnail = data.thumbnail;

          // Construir descrição
          let description = "";
          if (data.subtitle) description += data.subtitle + " • ";
          if (data.viewCount) description += data.viewCount + " • ";
          if (data.trackCount) description += data.trackCount + " itens • ";
          if (data.duration) description += data.duration;

          (item as any).fullDescription = description.replace(/ • $/, "");
          (item as any).year = data.year;
        }
      }

      const kind = itemCategory(item);
      const id = itemId(item);
      if (
        CATEGORIES.some((entry) =>
          libraryRef.current[entry.key].some((saved) => itemId(saved) === id),
        )
      ) {
        setError("Esse item já está na biblioteca.");
        return;
      }
      setPreviewItem(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAdd() {
    if (!previewItem) return;
    const kind = itemCategory(previewItem);
    await mutateLibrary((current) => ({ ...current, [kind]: [...current[kind], previewItem] }));
    setLink("");
    setPreviewItem(null);
  }

  const librarySections = () => (
    <div className="space-y-8">
      {CATEGORIES.map((entry) => {
        const Icon = entry.icon;
        const items = library[entry.key];
        return (
          <section key={entry.key} className="space-y-3">
            <header className="flex items-center gap-2 text-white">
              <Icon className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-bold">{entry.label}</h2>
              <span className="text-xs text-slate-500">{items.length}</span>
            </header>
            {items.length ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <article
                    key={itemId(item)}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => void openItem(item)}
                      aria-label={`Abrir ${item.title || item.name || "item"}`}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/5"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className={`h-full w-full object-cover ${entry.key === "artists" ? "rounded-full" : ""}`}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-slate-500">
                          <Icon className="h-5 w-5" />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openItem(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className="truncate text-xs font-semibold text-white"
                        title={item.title || item.name}
                      >
                        {item.title || item.name || "Sem título"}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {item.artist || item.author || item.source || itemUrl(item)}
                      </p>
                    </button>
                    {itemUrl(item) && (
                      <a
                        className="hidden shrink-0 text-[11px] text-cyan-300 hover:underline sm:block"
                        href={itemUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir link
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={libraryBusy}
                      onClick={() => removeItem(item)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1.5 text-[11px] text-rose-200 hover:bg-rose-400/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Nenhum item salvo em {entry.label.toLowerCase()}.
              </p>
            )}
          </section>
        );
      })}
      {!libraryReady && <p className="text-xs text-slate-500">Carregando biblioteca...</p>}
    </div>
  );

  return (
    <section className="w-full min-w-0 px-4 py-6 sm:px-8">
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Catálogo musical
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Biblioteca</h1>
        <p className="mt-2 text-sm text-slate-400">
          Catálogo do YouTube e YouTube Music, com carrosséis e biblioteca pessoal.
        </p>
      </header>
      <nav
        className="mb-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-3"
        aria-label="Navegação da biblioteca"
      >
        {(
          [
            { key: "categories", label: "CATEGORIAS", icon: Music2 },
            { key: "history", label: "HISTORICO", icon: History },
            { key: "personal", label: "BIBLIOTECA PESSOAL", icon: Library },
          ] as const
        ).map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => {
                setView(entry.key);
                setDetailItem(null);
                setDetailData(null);
                if (entry.key === "categories") setSearched("");
                setError("");
                setNotice("");
              }}
              aria-pressed={view === entry.key}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold tracking-wide transition ${view === entry.key ? "border-cyan-300 text-cyan-200" : "border-transparent text-slate-400 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </button>
          );
        })}
      </nav>
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fechar erro"
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="mb-4 text-xs text-cyan-200">
          {notice}
        </p>
      )}

      {detailItem && (
        <section className="mb-8 space-y-5 rounded-2xl border border-white/10 bg-[#0d1120] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setDetailItem(null);
                setDetailData(null);
                setError("");
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao catálogo
            </button>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            {detailItem.thumbnail ? (
              <img
                src={detailItem.thumbnail}
                alt=""
                className={`h-20 w-20 shrink-0 rounded-lg object-cover ${itemCategory(detailItem) === "artists" ? "rounded-full" : ""}`}
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <Music2 className="h-10 w-10 text-cyan-200" />
              </div>
            )}
            <div className="min-w-0 flex-1 self-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                {CATEGORIES.find((entry) => entry.key === itemCategory(detailItem))?.label}
              </p>
              <h2 className="mt-1 break-words text-xl font-bold text-white">
                {detailData?.title ||
                  detailData?.name ||
                  detailItem.title ||
                  detailItem.name ||
                  "Detalhes"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {detailData?.subtitle ||
                  detailData?.description ||
                  detailItem.artist ||
                  detailItem.author ||
                  detailItem.source}
              </p>
              {detailItem.videoId && (
                <button
                  type="button"
                  onClick={() => playDetailTrack(detailItem)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950"
                >
                  <Play className="h-4 w-4" />
                  Reproduzir música
                </button>
              )}
              {Array.isArray(detailData?.tracks) && detailData.tracks.length > 1 && (
                <button
                  type="button"
                  onClick={() => playDetailCollection(detailData.tracks)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950"
                >
                  <Play className="h-4 w-4" />
                  Reproduzir tudo ({detailData.tracks.length})
                </button>
              )}
            </div>
          </div>
          {detailLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando conteúdo do YouTube Music...
            </div>
          )}
          {!detailLoading && Array.isArray(detailData?.tracks) && detailData.tracks.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-white">Músicas ({detailData.tracks.length})</h3>
              {detailData.tracks.map((track: any, index: number) => (
                <div
                  key={track.videoId || index}
                  className="flex items-center gap-3 rounded-lg border border-white/5 px-3 py-2"
                >
                  {track.thumbnail && (
                    <img src={track.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {track.title || "Música"}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {track.artist || detailData.subtitle || detailItem.artist || ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => playDetailTrack(track, detailData.tracks)}
                    title="Reproduzir música"
                    className="rounded-md p-2 text-cyan-200 hover:bg-white/10"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </section>
          )}
          {!detailLoading &&
            Array.isArray(detailData?.sections) &&
            detailData.sections.map((section: any, sectionIndex: number) => (
              <section key={section.title || sectionIndex} className="space-y-2">
                <h3 className="text-sm font-bold text-white">{section.title || "Conteúdo"}</h3>
                <div className="space-y-2">
                  {(section.items || []).map((entry: any, entryIndex: number) => {
                    const isTrack = Boolean(entry.videoId);
                    return (
                      <article
                        key={entry.videoId || entry.browseId || entryIndex}
                        className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            isTrack
                              ? playDetailTrack(entry, section.items)
                              : openSectionItem(entry, section.title)
                          }
                          aria-label={`Abrir ${entry.title || entry.name || "item"}`}
                          className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/5"
                        >
                          {entry.thumbnail ? (
                            <img
                              src={entry.thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Music2 className="h-5 w-5 text-slate-500" />
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            isTrack
                              ? playDetailTrack(entry, section.items)
                              : openSectionItem(entry, section.title)
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-semibold text-white">
                            {entry.title || entry.name || "Item"}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {entry.subtitle || section.title}
                          </p>
                        </button>
                        {isTrack && (
                          <button
                            type="button"
                            onClick={() => playDetailTrack(entry, section.items)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-cyan-200 hover:bg-white/10"
                          >
                            <Play className="h-3 w-3" />
                            Reproduzir
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          {!detailLoading &&
            !detailData?.tracks?.length &&
            !detailData?.sections?.length &&
            !detailItem.videoId && (
              <p className="text-sm text-slate-500">Não há detalhes disponíveis para este item.</p>
            )}
        </section>
      )}
      {view === "categories" && !detailItem && (
        <div className="space-y-8">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] px-4">
              <Search className="h-5 w-5 shrink-0 text-slate-500" />
              <input
                aria-label="Pesquisar catálogo"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar música, álbum, artista ou playlist..."
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Pesquisar
            </button>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorias de resultados">
            {[...CATEGORIES, { key: "mixes" as const, label: "Mixes", icon: ListMusic }].map(
              (entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setCategory(entry.key)}
                  aria-pressed={category === entry.key}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === entry.key ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-400 hover:text-white"}`}
                >
                  {entry.label}
                </button>
              ),
            )}
          </div>
          {searched ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Resultados: {searched}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSearched("");
                    setResults([]);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Limpar busca
                </button>
              </div>
              {loading && (
                <p className="text-xs text-slate-500">Buscando no YouTube e YouTube Music...</p>
              )}
              {!loading && !visibleResults.length && (
                <p className="text-sm text-slate-500">Nenhum resultado nesta categoria.</p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleResults.map((item) => {
                  const Icon =
                    CATEGORIES.find((entry) => entry.key === itemCategory(item))?.icon || Music2;
                  const saved = isSaved(item);
                  return (
                    <article
                      key={itemId(item)}
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] p-3"
                    >
                      <button
                        type="button"
                        onClick={() => void openItem(item)}
                        aria-label={`Abrir detalhes: ${item.title || item.name || "item"}`}
                        title="Ver músicas e detalhes"
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5"
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className={`h-full w-full object-cover ${itemCategory(item) === "artists" ? "rounded-full" : ""}`}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-slate-500">
                            <Icon className="h-5 w-5" />
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void openItem(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className="truncate text-sm font-semibold text-white"
                          title={item.title || item.name}
                        >
                          {item.title || item.name || "Sem título"}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {item.artist || item.author || item.source || ""}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-slate-500">{item.source}</p>
                      </button>
                      <button
                        type="button"
                        disabled={libraryBusy || saved}
                        onClick={() => addItem(item)}
                        title={saved ? "Já está na biblioteca" : "Adicionar à biblioteca"}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cyan-300/20 px-2 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saved ? (
                          <Library className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {saved ? "Adicionado" : "Adicionar à biblioteca"}
                      </button>
                    </article>
                  );
                })}
              </div>
              {canLoadMore && !loading && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/10 py-1.5 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span aria-hidden="true">⌄</span>
                  )}
                  {loadingMore ? "Carregando..." : "Carregar mais"}
                </button>
              )}
            </section>
          ) : (
            <>
              {loadingHome && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Carregando carrosséis...
                </div>
              )}
              {CATEGORIES.map((entry) => (
                <MusicCarousel
                  key={entry.key}
                  title={entry.label}
                  items={home[entry.key]}
                  onOpen={openItem}
                />
              ))}
              {!loadingHome && CATEGORIES.every((entry) => !home[entry.key].length) && (
                <p className="text-sm text-slate-500">
                  Não foi possível carregar os destaques agora.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {view === "history" && !detailItem && (
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Histórico de pesquisas</h2>
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                try {
                  localStorage.removeItem("livenexus_music_search_history");
                } catch {}
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar histórico
            </button>
          </header>
          {!history.length ? (
            <p className="text-sm text-slate-500">Nenhuma pesquisa no histórico.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.query}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1120] p-3"
              >
                <History className="h-4 w-4 shrink-0 text-slate-500" />
                <button
                  type="button"
                  onClick={() => {
                    setQuery(item.query);
                    void runSearch(item.query);
                  }}
                  className="min-w-0 flex-1 truncate text-left text-sm text-slate-200 hover:text-cyan-200"
                >
                  {item.query}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHistory((current) => {
                      const next = current.filter((h) => h.query !== item.query);
                      try {
                        localStorage.setItem(
                          "livenexus_music_search_history",
                          JSON.stringify(next),
                        );
                      } catch {}
                      return next;
                    })
                  }
                  aria-label={`Remover histórico ${item.query}`}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </section>
      )}

      {view === "personal" && !detailItem && (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-[#0d1120] p-4">
            <h2 className="text-sm font-bold text-white">Biblioteca pessoal</h2>
            <p className="mt-1 text-xs text-slate-400">
              Cole um link de música, álbum, artista ou playlist do YouTube ou YouTube Music.
            </p>
            <form onSubmit={(event) => void handlePreviewLink(event)} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Link</span>
                <div className="flex h-11 w-full items-center rounded-lg border border-white/10 bg-black/20 text-sm focus-within:border-cyan-300/50">
                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    required
                    type="url"
                    placeholder="https://music.youtube.com/watch?v=..."
                    className="h-full flex-1 bg-transparent px-3 text-white outline-none"
                  />
                  <div className="flex h-full items-center border-l border-white/10 px-3">
                    <button
                      type="submit"
                      disabled={libraryBusy || !link.trim() || loading}
                      className="text-cyan-300 hover:text-white disabled:opacity-50"
                      aria-label="Buscar"
                    >
                      {loading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </label>
            </form>
            {previewItem && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-cyan-300/30 bg-cyan-400/5 p-4">
                <div className="flex gap-4">
                  {previewItem.thumbnail ? (
                    <img
                      src={previewItem.thumbnail}
                      alt=""
                      className="h-20 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-white/5">
                      <Music2 className="h-10 w-10 text-cyan-200" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {previewItem.type}
                    </p>
                    <p className="text-lg font-bold text-white leading-tight">
                      {previewItem.title || previewItem.name || "Sem título"}
                    </p>
                    {(previewItem as any).year && (
                      <p className="text-xs text-slate-400">{(previewItem as any).year}</p>
                    )}
                  </div>
                </div>
                {(previewItem as any).fullDescription && (
                  <p className="text-sm text-slate-300 bg-black/20 p-2 rounded">
                    {(previewItem as any).fullDescription}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void confirmAdd()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  Adicionar à Biblioteca
                </button>
              </div>
            )}
          </section>
          {librarySections()}
        </div>
      )}
    </section>
  );
}
