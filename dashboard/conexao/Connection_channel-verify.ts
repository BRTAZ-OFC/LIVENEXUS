/* LIVENEXUS: Explica como é verificada a conexão e a identificação do canal. */
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withFileQueue, writeJsonAtomically } from "../admin/banco/-json-storage.js";
import { PlataformasJohnson } from "../admin/banco/Plataformas_Johnson.js";

const CONNECTIONS_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../admin/banco/json/conect-plataform.json",
);
const CHALLENGE_TTL_MS = 30 * 60 * 1000;
const PLATFORMS = new Set(["twitch", "kick", "youtube"]);

async function readDatabase() {
  try {
    const parsed = JSON.parse(await readFile(CONNECTIONS_FILE, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function normalizeChannel(platform, input) {
  let value = String(input ?? "").trim();
  if (!value || value.length > 300) throw new Error("Informe um canal válido.");
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (platform === "twitch" && host === "twitch.tv")
      value = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (platform === "kick" && host === "kick.com")
      value = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (platform === "youtube" && ["youtube.com", "m.youtube.com"].includes(host)) {
      const match =
        url.pathname.match(/^\/@([A-Za-z0-9._-]+)/) ||
        url.pathname.match(/^\/(UC[A-Za-z0-9_-]{22})/);
      value = match ? match[1] : "";
    } else throw new Error("Use o link público da plataforma correspondente.");
  } catch (error) {
    if (error instanceof TypeError) {
      // A entrada não é URL; ela pode ser um nome/handle.
    } else if (error instanceof Error && error.message) {
      throw error;
    }
  }
  value = value.replace(/^@/, "");
  if (platform === "twitch") value = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
  else if (platform === "kick") value = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  else if (platform === "youtube") value = value.replace(/[^A-Za-z0-9._-]/g, "");
  if (!value) throw new Error("Não foi possível identificar o canal.");
  return platform === "youtube" ? (value.startsWith("UC") ? value : `@${value}`) : value;
}

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "LNX-" + Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

async function fetchBio(platform, channel) {
  let response;
  if (platform === "twitch") {
    response = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          operationName: "ChanBio",
          variables: { login: channel },
          query: "query ChanBio($login: String!){ user(login: $login){ description } }",
        },
      ]),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.[0]?.data?.user?.description ?? null;
  }
  if (platform === "kick") {
    response = await fetch(`https://kick.com/api/v1/channels/${encodeURIComponent(channel)}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (LiveNexusVerify)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.id) return null;
    return data?.user?.bio ?? data?.bio ?? "";
  }
  const youtubeAboutUrl = channel.startsWith("UC")
    ? `https://www.youtube.com/channel/${encodeURIComponent(channel)}/about`
    : `https://www.youtube.com/${encodeURIComponent(channel.startsWith("@") ? channel : `@${channel}`)}/about`;
  response = await fetch(youtubeAboutUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  const html = await response.text();
  const match = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
  if (match) return match[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'");
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return description?.[1]?.replace(/&amp;/g, "&").replace(/&#39;/g, "'") ?? null;
}

export async function createChannelChallenge(userId, platformInput, channelInput) {
  if (!userId) throw new Error("Autenticação necessária.");
  const platform = String(platformInput ?? "")
    .trim()
    .toLowerCase();
  if (!PLATFORMS.has(platform)) throw new Error("Plataforma inválida.");
  const channelIdentifier = normalizeChannel(platform, channelInput);
  const challengeId = randomUUID();
  const verificationCode = code();
  const now = Date.now();
  const challenge = {
    challengeId,
    userId,
    platform,
    channelIdentifier,
    verificationCode,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
  };
  await withFileQueue(CONNECTIONS_FILE, async () => {
    const db = await readDatabase();
    if (!db._challenges || typeof db._challenges !== "object") db._challenges = {};
    for (const [key, item] of Object.entries(db._challenges))
      if (!item || item.expiresAt <= now) delete db._challenges[key];
    db._challenges[challengeId] = challenge;
    await writeJsonAtomically(CONNECTIONS_FILE, db);
  });

  try {
    const existingList = await PlataformasJohnson.list(userId);
    if (existingList.length) {
      await PlataformasJohnson.update(userId, existingList[0].id, {
        platform,
        channel_name: channelIdentifier,
        channel_id: channelIdentifier,
        verification_code: verificationCode,
        challenge_id: challengeId,
        status: "pending",
      });
    } else {
      await PlataformasJohnson.create(userId, {
        platform,
        channel_name: channelIdentifier,
        channel_id: channelIdentifier,
        verification_code: verificationCode,
        challenge_id: challengeId,
        status: "pending",
      });
    }
  } catch (error) {
    console.warn("Aviso ao salvar plataforma pendente:", error);
  }

  return {
    challengeId,
    platform,
    channelIdentifier,
    verificationCode,
    expiresAt: challenge.expiresAt,
  };
}

export async function verifyChannelChallenge(userId, challengeIdInput) {
  if (!userId) throw new Error("Autenticação necessária.");
  const challengeId = String(challengeIdInput ?? "").trim();
  if (!challengeId) throw new Error("Gere um código de verificação primeiro.");
  const challenge = await withFileQueue(CONNECTIONS_FILE, async () => {
    const db = await readDatabase();
    const challenges = db._challenges || {};
    const item = challenges[challengeId];
    if (!item || item.userId !== userId)
      throw new Error("Verificação não encontrada ou não pertence a esta conta.");
    if (item.expiresAt <= Date.now()) {
      delete challenges[challengeId];
      await writeJsonAtomically(CONNECTIONS_FILE, db);
      throw new Error("O código expirou. Gere outro código.");
    }
    return item;
  });
  let bio;
  try {
    bio = await fetchBio(challenge.platform, challenge.channelIdentifier);
  } catch {
    throw new Error("Não foi possível consultar a bio pública da plataforma. Tente novamente.");
  }
  if (bio == null) throw new Error("Canal não encontrado ou bio pública indisponível.");
  if (!String(bio).toLowerCase().includes(challenge.verificationCode.toLowerCase())) {
    throw new Error(
      "Código não encontrado na bio. Atualize a descrição pública do canal e tente novamente.",
    );
  }

  const records = await PlataformasJohnson.list(userId);
  const existing = records[0];
  const verifiedAt = new Date().toISOString();
  const saved = existing
    ? await PlataformasJohnson.update(userId, existing.id, {
        platform: challenge.platform,
        channel_name: challenge.channelIdentifier,
        channel_id: challenge.channelIdentifier,
        verification_code: challenge.verificationCode,
        challenge_id: null,
        status: "verified",
        verifiedAt,
      })
    : await PlataformasJohnson.create(userId, {
        platform: challenge.platform,
        channel_name: challenge.channelIdentifier,
        channel_id: challenge.channelIdentifier,
        verification_code: challenge.verificationCode,
        challenge_id: null,
        status: "verified",
        verifiedAt,
      });

  await withFileQueue(CONNECTIONS_FILE, async () => {
    const db = await readDatabase();
    if (db._challenges) {
      delete db._challenges[challengeId];
      await writeJsonAtomically(CONNECTIONS_FILE, db);
    }
  });
  return {
    platform: challenge.platform,
    channelIdentifier: challenge.channelIdentifier,
    verifiedAt,
    plataforma: saved,
  };
}
