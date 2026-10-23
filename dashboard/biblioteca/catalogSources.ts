/* LIVENEXUS: Explica quais fontes são usadas para buscar músicas e informações. */
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

// O catálogo da Biblioteca usa exclusivamente YouTube Music e YouTube.
// As consultas e continuações são feitas pela API existente do LIVENEXUS.
export function uniqueCatalogItems(items: CatalogItem[]) {
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
