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
  // MusicBrainz limita a frequência de chamadas; serializa as três consultas.
  const artists = await getJson(`https://musicbrainz.org/ws/2/artist?${params}`).catch(() => ({ artists: [] }));
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const recordings = await getJson(`https://musicbrainz.org/ws/2/recording?${params}`).catch(() => ({ recordings: [] }));
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const releases = await getJson(`https://musicbrainz.org/ws/2/release-group?${params}`).catch(() => ({ "release-groups": [] }));
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


async function fetchViaJina(url: string, timeoutMs = 12000): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", "X-Timeout": "10" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Jina HTTP ${response.status}`);
  return response.text();
}

async function searchLastFm(query: string): Promise<CatalogItem[]> {
  const text = await fetchViaJina(`https://www.last.fm/search?q=${encodeURIComponent(query)}`);
  const results: CatalogItem[] = [];
  const sections = [
    { name: "artist", text: (text.split(/##\\s*\\[Artists\\]/)[1] || "").split(/##\\s*\\[Albums\\]/)[0] },
    { name: "album", text: (text.split(/##\\s*\\[Albums\\]/)[1] || "").split(/##\\s*\\[Tracks\\]/)[0] },
  ];
  for (const section of sections) {
    const re = /!\\[Image \\d+: Image for '([^']+)'\\]\\((https:\\/\\/lastfm-img[^)]+)\\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(section.text)) !== null) {
      results.push({ title: match[1], type: section.name, source: "Last.fm", thumbnail: match[2] });
    }
  }
  return results;
}

async function searchJamendo(query: string): Promise<CatalogItem[]> {
  const text = await fetchViaJina(`https://www.jamendo.com/search?q=${encodeURIComponent(query)}`);
  const results: CatalogItem[] = [];
  const re = /\\[([^\\]]+?)\\s+by\\s+([^\\]]+)\\]\\(https:\\/\\/www\\.jamendo\\.com\\/track\\/(\\d+)\\/[^)]*\\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    results.push({ id: match[3], title: match[1].trim(), artist: match[2].trim(), type: "song", source: "Jamendo", url: `https://www.jamendo.com/track/${match[3]}` });
  }
  return results;
}

async function searchBandcamp(query: string): Promise<CatalogItem[]> {
  const text = await fetchViaJina(`https://bandcamp.com/search?q=${encodeURIComponent(query)}`, 15000);
  const results: CatalogItem[] = [];
  const seen = new Set<string>();
  const lines = text.split("\\n");
  const re = /\\[!\\[Image \\d+\\]\\((https:\\/\\/f4\\.bcbits\\.com\\/img\\/[^)]+)\\)\\]\\((https:\\/\\/[^)]+\\.bandcamp\\.com\\/(album|track)\\/[^)]+)\\)(ALBUM|TRACK|ARTIST)/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(re);
    if (!match) continue;
    const url = match[2].split("?")[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const kind = match[3];
    const slug = decodeURIComponent((match[2].split(`/${kind}/`)[1] || "").split("?")[0]);
    const title = slug.replace(/-/g, " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase()).trim();
    let artist = "";
    const sourceTags: string[] = [];
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      if (!artist) artist = (lines[j].match(/^by\\s+(.+)$/i) || lines[j].match(/from\\s+.+\\s+by\\s+(.+)$/i))?.[1]?.trim() || "";
      const tags = lines[j].match(/^tags:\\s*(.+)$/i)?.[1];
      if (tags) sourceTags.push(...tags.split(",").map((tag) => tag.trim()).filter(Boolean));
      if (artist && sourceTags.length) break;
    }
    results.push({ title, artist, type: kind === "album" ? "album" : "song", source: "Bandcamp", thumbnail: match[1], url, sourceTags });
  }
  return results;
}

async function searchDeezer(query: string): Promise<CatalogItem[]> {
  const [trackText, playlistText] = await Promise.all([
    fetchViaJina(`https://www.deezer.com/search/${encodeURIComponent(query)}`).catch(() => ""),
    fetchViaJina(`https://api.deezer.com/search/playlist?q=${encodeURIComponent(query)}&limit=15`).catch(() => ""),
  ]);
  const results: CatalogItem[] = [];
  const section = trackText.split("### Tracks")[1] || "";
  const lines = section.split("\\n");
  const seenTitles = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const imageMatch = lines[i].match(/!\\[Image \\d+\\]\\((https:\\/\\/cdn-images\\.dzcdn\\.net\\/[^)]+)\\)/);
    if (!imageMatch) continue;
    let title = "";
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const candidate = lines[j].trim();
      if (candidate && !/^\\d{1,2}:\\d{2}$/.test(candidate) && !candidate.startsWith("![") && !candidate.startsWith("###")) { title = candidate; break; }
    }
    if (title && !seenTitles.has(title)) {
      seenTitles.add(title);
      results.push({ title, type: "song", source: "Deezer", thumbnail: imageMatch[1] });
    }
  }
  try {
    const wrapped = JSON.parse(playlistText);
    const raw = JSON.parse(wrapped?.data?.content || "{}");
    for (const playlist of raw.data || []) {
      if (!playlist.title) continue;
      results.push({
        id: String(playlist.id || ""),
        title: playlist.title,
        artist: playlist.user?.name ? `Comunidade: ${playlist.user.name}` : "Deezer Community",
        type: "community_playlist",
        source: "Deezer",
        thumbnail: playlist.picture_medium || playlist.picture_big || playlist.picture || "",
        url: playlist.link || "",
      });
    }
  } catch {
    // A falha no parser de playlists Deezer não afeta as outras fontes.
  }
  return results;
}

async function searchAudiusPlaylists(query: string): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ query, limit: "15" });
  const data = await getJson(`https://discoveryprovider.audius.co/v1/playlists/search?${params}`);
  return (data.data || []).map((playlist: any) => ({
    id: String(playlist.id || ""),
    title: playlist.playlist_name || playlist.title || "",
    artist: playlist.user?.name ? `Comunidade: ${playlist.user.name}` : "Audius Community",
    type: "community_playlist",
    source: "Audius",
    thumbnail: playlist.artwork?.["480x480"] || playlist.artwork?.["150x150"] || "",
    url: playlist.permalink ? `https://audius.co/${playlist.permalink}` : "",
  })).filter((item: CatalogItem) => item.title);
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
    searchLastFm(term),
    searchJamendo(term),
    searchBandcamp(term),
    searchDeezer(term),
    searchAudiusPlaylists(term),
  ]);

  const items = responses.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  return uniqueById(items);
}
