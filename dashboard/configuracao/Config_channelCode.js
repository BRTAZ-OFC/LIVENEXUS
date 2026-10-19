// Normalização de entrada para a interface. O servidor valida novamente antes de gravar.
export function normalizeChannelInput(platform, input) {
  const value = String(input || "").trim();
  if (!value || value.length > 300) return "";
  const lowerPlatform = String(platform).toLowerCase();

  if (lowerPlatform === "youtube") {
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        if (!/^(?:www\.|m\.)?youtube\.com$/i.test(url.hostname)) return "";
        const handle = url.pathname.match(/^\/(@[A-Za-z0-9._-]{1,100})(?:\/|$)/);
        const id = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/|$)/i);
        if (handle) return "@" + handle[1].slice(1);
        if (id) return id[1];
        return "";
      } catch {
        return "";
      }
    }
    const withoutHost = value.replace(/^(?:www\.|m\.)?youtube\.com\//i, "");
    const handle = withoutHost.match(/^(@[A-Za-z0-9._-]{1,100})(?:\/|$)/);
    const id = withoutHost.match(/^(UC[A-Za-z0-9_-]{22})(?:\/|$)/i);
    if (handle) return handle[1];
    if (id) return id[1];
    if (/^[A-Za-z0-9._-]{1,100}$/.test(withoutHost)) return "@" + withoutHost;
    return "";
  }

  const hostPattern = lowerPlatform === "twitch"
    ? /^(?:www\.)?twitch\.tv\//i
    : /^(?:www\.)?kick\.com\//i;
  let slug = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const expected = lowerPlatform === "twitch" ? /^(?:www\.)?twitch\.tv$/i : /^(?:www\.)?kick\.com$/i;
      if (!expected.test(url.hostname)) return "";
      slug = url.pathname;
    } catch {
      return "";
    }
  } else {
    slug = slug.replace(hostPattern, "");
  }
  slug = slug.replace(/^\/+/, "").split(/[/?#]/)[0].replace(/^@/, "").toLowerCase();
  const pattern = lowerPlatform === "twitch" ? /^[a-z0-9_]{1,25}$/ : /^[a-z0-9_-]{1,25}$/;
  return pattern.test(slug) ? slug : "";
}

export function channelUrl(platform, identifier) {
  if (!identifier) return null;
  if (String(platform).toLowerCase() === "twitch") return "https://twitch.tv/" + identifier;
  if (String(platform).toLowerCase() === "kick") return "https://kick.com/" + identifier;
  if (String(platform).toLowerCase() === "youtube") {
    return identifier.startsWith("UC")
      ? "https://www.youtube.com/channel/" + identifier
      : "https://www.youtube.com/" + (identifier.startsWith("@") ? identifier : "@" + identifier);
  }
  return null;
}

export function placeholderFor(platform) {
  return String(platform).toLowerCase() === "youtube" ? "@nomedocanal" : "nomedocanal";
}

export function hintFor(platform) {
  if (String(platform).toLowerCase() === "youtube") {
    return "Informe o @handle ou a URL pública do canal do YouTube.";
  }
  return "Informe o nome do canal ou a URL pública da Twitch/Kick.";
}
