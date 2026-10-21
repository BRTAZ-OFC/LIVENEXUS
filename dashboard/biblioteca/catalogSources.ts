export type CatalogItem = {
  id?: string;
  videoId?: string;
  browseId?: string;
  playlistId?: string;
  title?: string;
  name?: string;
  artist?: string;
  author?: string;
  type: string;
  source: string;
  thumbnail?: string;
  durationStr?: string;
  year?: string;
  url?: string;
  genres?: string[];
  sourceTags?: string[];
};

function uniqueById(items: CatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.videoId
      ? `video:${item.videoId}`
      : item.browseId
        ? `browse:${item.browseId}`
        : item.playlistId
          ? `playlist:${item.playlistId}`
          : item.id
            ? `${item.source}:${item.id}`
            : `${item.source}:${(item.title || item.name || "").trim().toLowerCase()}:${(item.artist || item.author || "").trim().toLowerCase()}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getJson(url: string, timeoutMs = 10000): Promise<any> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function searchApple(query: string): Promise<CatalogItem[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=25`;
  const data = await getJson(url);
  const tracks: CatalogItem[] = [];
  for (const row of data.results || []) {
    const thumbnail = String(row.artworkUrl100 || "").replace("100x100", "300x300");
    if (row.trackName && row.trackId) {
      tracks.push({
        id: String(row.trackId),
        title: row.trackName,
        artist: row.artistName || "",
        type: "song",
        source: "iTunes",
        thumbnail,
        url: row.trackViewUrl,
        genres: row.primaryGenreName ? [row.primaryGenreName] : [],
      });
    } else if (row.collectionName && row.collectionId) {
      tracks.push({
        id: String(row.collectionId),
        title: row.collectionName,
        artist: row.artistName || "",
        type: "album",
        source: "iTunes",
        thumbnail,
        url: row.collectionViewUrl,
        genres: row.primaryGenreName ? [row.primaryGenreName] : [],
      });
    }
  }
  return tracks;
}

async function searchAudius(query: string): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ query, app_name: "LIVENEXUS" });
  const data = await getJson(`https://discoveryprovider.audius.co/v1/tracks/search?${params}`);
  return (data.data || []).map((track: any) => ({
    id: String(track.id || ""),
    title: track.title || "",
    artist: track.user?.name || "",
    type: "song",
    source: "Audius",
    thumbnail: track.artwork?.['150x150'] || track.artwork?.['480x480'] || "",
    url: track.permalink || "",
    genres: track.genre ? [track.genre] : [],
  })).filter((item: CatalogItem) => item.title && item.id);
}

async function searchMixcloud(query: string): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ q: query, type: "cloudcast", limit: "20" });
  const data = await getJson(`https://api.mixcloud.com/search/?${params}`);
  return (data.data || []).map((mix: any) => ({
    id: String(mix.key || mix.url || ""),
    title: mix.name || "",
    artist: mix.user?.username || "",
    type: "mix",
    source: "Mixcloud",
    thumbnail: mix.pictures?.medium || mix.pictures?.large || "",
    url: mix.url || "",
  })).filter((item: CatalogItem) => item.title);
}

async function searchMusicBrainz(query: string): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ query, fmt: "json", limit: "10" });
  const [artists, recordings, releases] = await Promise.all([
    getJson(`https://musicbrainz.org/ws/2/artist?${params}`).catch(() => ({ artists: [] })),
    getJson(`https://musicbrainz.org/ws/2/recording?${params}`).catch(() => ({ recordings: [] })),
    getJson(`https://musicbrainz.org/ws/2/release-group?${params}`).catch(() => ({ "release-groups": [] })),
  ]);
  const artistItems: CatalogItem[] = (artists.artists || []).map((item: any) => ({
    id: item.id,
    title: item.name,
    artist: item.name,
    type: "artist",
    source: "MusicBrainz",
  }));
  const recordingItems: CatalogItem[] = (recordings.recordings || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    artist: (item["artist-credit"] || []).map((credit: any) => credit.name || credit.artist?.name).filter(Boolean).join(", "),
    type: "song",
    source: "MusicBrainz",
  }));
  const albumItems: CatalogItem[] = (releases["release-groups"] || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    artist: (item["artist-credit"] || []).map((credit: any) => credit.name || credit.artist?.name).filter(Boolean).join(", "),
    type: "album",
    source: "MusicBrainz",
    year: item["first-release-date"] || "",
  }));
  return [...artistItems, ...recordingItems, ...albumItems];
}

export async function searchCatalogSources(query: string): Promise<CatalogItem[]> {
  const term = query.trim();
  if (!term) return [];

  // Cada catálogo é isolado: indisponibilidade ou bloqueio CORS de uma fonte
  // não impede a exibição dos resultados das demais.
  const responses = await Promise.allSettled([
    searchApple(term),
    searchAudius(term),
    searchMixcloud(term),
    searchMusicBrainz(term),
  ]);

  const items = responses.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  return uniqueById(items);
}
