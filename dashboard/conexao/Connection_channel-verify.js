/**
 * Verificação de propriedade de canal por bio pública.
 * Os desafios e vínculos são persistidos em dashboard/admin/banco/json/conexoes-plataformas.json.
 * Este módulo roda no servidor Node.js; não usa Worker, KV, Map como armazenamento nem a pasta ramal.
 */
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withFileQueue, writeJsonAtomically } from "../admin/banco/-json-storage.js";

const DATABASE_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../admin/banco/json/conexoes-plataformas.json",
);
const CHALLENGE_TTL_MS = 30 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TWITCH_CLIENT_ID = process.env["TWITCH_CLIENT_ID"] || "kimne78kx3ncx6brgo4mv6wki5h1ko";

class ChannelVerifyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ChannelVerifyError";
    this.status = status;
  }
}

function normalizePlatform(value) {
  const platform = {
    twitch: "Twitch",
    kick: "Kick",
    youtube: "YouTube",
  }[String(value ?? "").trim().toLowerCase()];

  if (!platform) throw new ChannelVerifyError("Plataforma inválida.", 400);
  return platform;
}

function resolveBioProfile(platformInput, input) {
  const platform = normalizePlatform(platformInput);
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw || raw.length > 300) {
    throw new ChannelVerifyError("Informe um canal válido para essa plataforma.", 400);
  }

  if (platform === "Twitch" || platform === "Kick") {
    const expectedHost = platform === "Twitch" ? /^(?:www\.)?twitch\.tv$/i : /^(?:www\.)?kick\.com$/i;
    let value = raw;

    if (/^https?:\/\//i.test(raw)) {
      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        throw new ChannelVerifyError("URL de canal inválida.", 400);
      }
      if (!expectedHost.test(parsed.hostname)) {
        throw new ChannelVerifyError("A URL não corresponde à plataforma selecionada.", 400);
      }
      value = parsed.pathname;
    } else {
      value = value.replace(platform === "Twitch" ? /^(?:www\.)?twitch\.tv\//i : /^(?:www\.)?kick\.com\//i, "");
    }

    value = value.replace(/^\/+/, "").split(/[/?#]/)[0].replace(/^@/, "").trim().toLowerCase();
    const allowed = platform === "Twitch" ? /^[a-z0-9_]{1,25}$/ : /^[a-z0-9_-]{1,25}$/;
    if (!allowed.test(value)) {
      throw new ChannelVerifyError("Nome de canal inválido para essa plataforma.", 400);
    }

    return {
      platform,
      channelIdentifier: value,
      channelUrl: platform === "Twitch" ? "https://www.twitch.tv/" + value : "https://kick.com/" + value,
      bioUrl: platform === "Twitch" ? "https://www.twitch.tv/" + value + "/about" : "https://kick.com/" + value,
    };
  }

  let source = raw;
  if (/^https?:\/\//i.test(raw)) {
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new ChannelVerifyError("URL de canal inválida.", 400);
    }
    if (!/^(?:www\.|m\.)?youtube\.com$/i.test(parsed.hostname)) {
      throw new ChannelVerifyError("Informe uma URL do YouTube.", 400);
    }
    source = parsed.pathname;
  } else {
    source = source.replace(/^(?:www\.|m\.)?youtube\.com\//i, "/");
  }

  const handleMatch = source.match(/^\/?(@[A-Za-z0-9._-]{1,100})(?:\/|$)/);
  const idMatch = source.match(/^\/?(?:channel\/)?(UC[A-Za-z0-9_-]{22})(?:\/|$)/i);
  let channelIdentifier = "";

  if (handleMatch) {
    channelIdentifier = "@" + handleMatch[1].slice(1);
  } else if (idMatch) {
    channelIdentifier = idMatch[1];
  } else if (/^@[A-Za-z0-9._-]{1,100}$/.test(source)) {
    channelIdentifier = source;
  } else if (/^[A-Za-z0-9._-]{1,100}$/.test(source)) {
    channelIdentifier = "@" + source;
  }

  if (!channelIdentifier) {
    throw new ChannelVerifyError("Informe o @handle ou a URL pública do canal do YouTube.", 400);
  }

  const channelUrl = channelIdentifier.startsWith("UC")
    ? "https://www.youtube.com/channel/" + channelIdentifier
    : "https://www.youtube.com/" + channelIdentifier;

  return {
    platform,
    channelIdentifier,
    channelUrl,
    bioUrl: channelIdentifier.startsWith("UC")
      ? channelUrl + "/about"
      : channelUrl + "/about",
  };
}

function generateCode() {
  const bytes = randomBytes(6);
  let suffix = "";
  for (const byte of bytes) suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return "LNX-" + suffix;
}

function proofSecret() {
  const secret = String(process.env["BIO_PROOF_SECRET"] || process.env["SESSION_SECRET"] || "");
  if (secret.length < 32) {
    throw new ChannelVerifyError("Configure BIO_PROOF_SECRET ou SESSION_SECRET com pelo menos 32 caracteres.", 500);
  }
  return secret;
}

function signPayload(payloadText) {
  return createHmac("sha256", proofSecret()).update(payloadText).digest("base64url");
}

function parseSignedProof(proof) {
  if (typeof proof !== "string") return null;
  const separator = proof.indexOf(".");
  if (separator < 1 || separator === proof.length - 1 || proof.indexOf(".", separator + 1) !== -1) return null;

  try {
    const payloadText = Buffer.from(proof.slice(0, separator), "base64url").toString("utf8");
    const supplied = Buffer.from(proof.slice(separator + 1), "base64url");
    const expected = createHmac("sha256", proofSecret()).update(payloadText).digest();
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

    const payload = JSON.parse(payloadText);
    if (!payload || typeof payload !== "object") return null;
    return payload;
  } catch {
    return null;
  }
}

async function readRows() {
  try {
    const parsed = JSON.parse(await readFile(DATABASE_FILE, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new Error("conexoes-plataformas.json precisa conter uma lista JSON.");
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function mutateRows(operation) {
  return withFileQueue(DATABASE_FILE, async () => {
    const rows = await readRows();
    const now = Date.now();
    const activeRows = rows.filter(
      (row) => row?.recordType !== "challenge" || Number(row.expiresAt) > now,
    );
    rows.splice(0, rows.length, ...activeRows);

    const result = await operation(rows);
    await writeJsonAtomically(DATABASE_FILE, rows);
    return result;
  });
}

async function fetchTwitchBio(channel) {
  const response = await fetch("https://gql.twitch.tv/gql", {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{
      operationName: "ChanBio",
      variables: { login: channel },
      query: "query ChanBio($login: String!){ user(login: $login){ description } }",
    }]),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  const result = await response.json();
  return result?.[0]?.data?.user?.description ?? null;
}

async function fetchKickBio(channel) {
  const response = await fetch("https://kick.com/api/v1/channels/" + encodeURIComponent(channel), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (LiveNexusVerify)",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  const result = await response.json();
  if (!result || !result.id) return null;
  return result?.user?.bio ?? result?.bio ?? "";
}

async function fetchYouTubeBio(channelIdentifier) {
  const path = channelIdentifier.startsWith("UC")
    ? "/channel/" + channelIdentifier + "/about"
    : "/" + (channelIdentifier.startsWith("@") ? channelIdentifier : "@" + channelIdentifier) + "/about";
  const response = await fetch("https://www.youtube.com" + path, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  const html = await response.text();
  const matches = [
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i),
    html.match(/<meta\s+content=["']([^"']*)["']\s+property=["']og:description["']/i),
  ];
  return matches.find((match) => match?.[1])?.[1] ?? null;
}

async function fetchPublicBio(challenge) {
  if (challenge.platform === "Twitch") return fetchTwitchBio(challenge.channelIdentifier);
  if (challenge.platform === "Kick") return fetchKickBio(challenge.channelIdentifier);
  return fetchYouTubeBio(challenge.channelIdentifier);
}

function codeInBio(bio, code) {
  return typeof bio === "string" && typeof code === "string" &&
    bio.toLowerCase().includes(code.toLowerCase());
}

function challengeResponse(challenge) {
  return {
    challengeId: challenge.challengeId,
    challengeKey: challenge.challengeKey,
    verificationCode: challenge.verificationCode,
    channelIdentifier: challenge.channelIdentifier,
    expiresAt: challenge.expiresAt,
  };
}

export async function createBioChallenge(userId, platformInput, channelInput) {
  const profile = resolveBioProfile(platformInput, channelInput);
  const now = Date.now();
  const challenge = {
    recordType: "challenge",
    challengeId: randomUUID(),
    challengeKey: randomBytes(24).toString("base64url"),
    user_id: userId,
    platform: profile.platform,
    channelIdentifier: profile.channelIdentifier,
    channelUrl: profile.channelUrl,
    verificationCode: generateCode(),
    attempts: 0,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
    status: "pending",
  };

  await mutateRows((rows) => {
    for (let index = rows.length - 1; index >= 0; index--) {
      const row = rows[index];
      if (
        row?.recordType === "challenge" &&
        row.user_id === userId &&
        row.platform === profile.platform
      ) {
        rows.splice(index, 1);
      }
    }
    rows.push(challenge);
  });

  return challengeResponse(challenge);
}

export async function reemitBioChallenge(userId, challengeKey) {
  if (typeof challengeKey !== "string" || !challengeKey.trim()) {
    throw new ChannelVerifyError("Tentativa não encontrada.", 404);
  }

  const challenge = await mutateRows((rows) => {
    const row = rows.find(
      (item) => item?.recordType === "challenge" &&
        item.user_id === userId &&
        item.challengeKey === challengeKey,
    );
    if (!row || row.status !== "pending") {
      throw new ChannelVerifyError("Tentativa não encontrada ou expirada.", 404);
    }

    row.challengeId = randomUUID();
    row.verificationCode = generateCode();
    row.attempts = 0;
    row.createdAt = Date.now();
    row.expiresAt = row.createdAt + CHALLENGE_TTL_MS;
    return { ...row };
  });

  return challengeResponse(challenge);
}

export async function verifyBioChallenge(userId, platformInput, challengeId) {
  const platform = normalizePlatform(platformInput);
  if (typeof challengeId !== "string" || !challengeId.trim()) {
    throw new ChannelVerifyError("Tentativa inválida.", 400);
  }

  const challenge = await mutateRows((rows) => {
    const row = rows.find(
      (item) => item?.recordType === "challenge" &&
        item.user_id === userId &&
        item.challengeId === challengeId,
    );
    if (!row) throw new ChannelVerifyError("Tentativa não encontrada ou expirada.", 404);
    if (row.platform !== platform) {
      throw new ChannelVerifyError("Plataforma não corresponde a esta tentativa.", 400);
    }
    if (Number(row.expiresAt) < Date.now()) {
      throw new ChannelVerifyError("Código expirado. Gere um novo código.", 410);
    }
    if (Number(row.attempts || 0) >= 10) {
      throw new ChannelVerifyError("Muitas tentativas de validação. Gere outro código.", 429);
    }
    row.attempts = Number(row.attempts || 0) + 1;
    return { ...row };
  });

  let bio;
  try {
    bio = await fetchPublicBio(challenge);
  } catch {
    throw new ChannelVerifyError("Não foi possível consultar a bio pública agora. Tente novamente.", 502);
  }
  if (bio == null) {
    throw new ChannelVerifyError("Canal não encontrado ou perfil indisponível.", 404);
  }
  if (!codeInBio(bio, challenge.verificationCode)) {
    throw new ChannelVerifyError(
      "Código ainda não encontrado na bio. Confira a descrição pública e tente novamente.",
      409,
    );
  }

  const verifiedAt = Date.now();
  const proofId = randomUUID();
  const payloadText = JSON.stringify({
    proofId,
    userId,
    platform,
    channelIdentifier: challenge.channelIdentifier,
    verifiedAt,
  });
  const verificationProof = Buffer.from(payloadText).toString("base64url") + "." + signPayload(payloadText);

  await mutateRows((rows) => {
    const currentChallenge = rows.find(
      (row) => row?.recordType === "challenge" &&
        row.user_id === userId &&
        row.challengeId === challengeId,
    );
    if (!currentChallenge || Number(currentChallenge.expiresAt) < Date.now()) {
      throw new ChannelVerifyError("A tentativa expirou durante a validação. Gere outro código.", 410);
    }

    const keptRows = rows.filter((row) => !(
      (row?.recordType === "challenge" && row.user_id === userId && row.challengeId === challengeId) ||
      (row?.recordType === "connection" && row.user_id === userId && row.platform === platform)
    ));
    rows.splice(0, rows.length, ...keptRows);
    rows.push({
      recordType: "connection",
      connectionId: proofId,
      user_id: userId,
      platform,
      channelIdentifier: challenge.channelIdentifier,
      channelUrl: challenge.channelUrl,
      status: "verified",
      verifiedAt,
      verificationProof,
      challengeKey: challenge.challengeKey,
      updatedAt: new Date(verifiedAt).toISOString(),
    });
  });

  return {
    platform,
    channelIdentifier: challenge.channelIdentifier,
    channelUrl: challenge.channelUrl,
    verifiedAt,
    verificationProof,
    challengeKey: challenge.challengeKey,
  };
}

export async function validateBioProof(userId, proof) {
  const payload = parseSignedProof(proof);
  if (!payload || payload.userId !== userId || typeof payload.proofId !== "string") {
    return { valid: false };
  }

  const rows = await readRows();
  const connection = rows.find(
    (row) => row?.recordType === "connection" &&
      row.user_id === userId &&
      row.connectionId === payload.proofId &&
      row.verificationProof === proof &&
      row.status === "verified" &&
      row.platform === payload.platform &&
      row.channelIdentifier === payload.channelIdentifier,
  );
  if (!connection) return { valid: false };

  return {
    valid: true,
    platform: connection.platform,
    channelIdentifier: connection.channelIdentifier,
    verifiedAt: connection.verifiedAt,
  };
}

export async function revokeBioProof(userId, verificationProof, challengeKey) {
  let payload = null;
  if (verificationProof) {
    const candidate = parseSignedProof(verificationProof);
    if (candidate?.userId === userId && typeof candidate.proofId === "string") {
      payload = candidate;
    }
  }

  await mutateRows((rows) => {
    const keptRows = rows.filter((row) => {
      if (row?.recordType === "challenge" && row.user_id === userId &&
        typeof challengeKey === "string" && challengeKey &&
        row.challengeKey === challengeKey) {
        return false;
      }
      if (payload && row?.recordType === "connection" &&
        row.user_id === userId &&
        row.connectionId === payload.proofId &&
        row.verificationProof === verificationProof) {
        return false;
      }
      return true;
    });
    rows.splice(0, rows.length, ...keptRows);
  });

  return { ok: true };
}

export async function listBioConnections(userId) {
  const rows = await readRows();
  const connections = rows
    .filter((row) => row?.recordType === "connection" &&
      row.user_id === userId &&
      row.status === "verified")
    .map((row) => ({
      platform: row.platform,
      channelIdentifier: row.channelIdentifier,
      channelUrl: row.channelUrl,
      status: row.status,
      verifiedAt: row.verifiedAt,
      verificationProof: row.verificationProof,
      challengeKey: row.challengeKey,
    }));
  return { connections };
}
