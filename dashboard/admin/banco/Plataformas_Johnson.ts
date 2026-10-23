/* LIVENEXUS: Explica como os dados das plataformas conectadas são organizados e salvos. */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withFileQueue, writeJsonAtomically } from "./-json-storage.js";

const CONNECTIONS_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "json",
  "conect-plataform.json",
);

function validateUserId(userId) {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Usuário não identificado.");
  }
  return userId.trim();
}

async function readDatabase() {
  try {
    const parsed = JSON.parse(await readFile(CONNECTIONS_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(
        "Formato inválido em conect-plataform.json; esperado objeto indexado por user_id.",
      );
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function consolidatedRecord(records, userId) {
  if (!Array.isArray(records) || records.length === 0) return null;
  const source = records.find((record) => record && typeof record === "object") || null;
  if (!source) return null;
  return {
    id: source.id || randomUUID(),
    user_id: userId,
    youtube: source.youtube ?? null,
    youtube_code: source.youtube_code ?? null,
    youtube_status: source.youtube_status ?? null,
    twitch: source.twitch ?? null,
    twitch_code: source.twitch_code ?? null,
    twitch_status: source.twitch_status ?? null,
    kick: source.kick ?? null,
    kick_code: source.kick_code ?? null,
    kick_status: source.kick_status ?? null,
    ...Object.fromEntries(
      Object.entries(source).filter(
        ([key]) =>
          ![
            "id",
            "user_id",
            "youtube",
            "youtube_code",
            "youtube_status",
            "twitch",
            "twitch_code",
            "twitch_status",
            "kick",
            "kick_code",
            "kick_status",
          ].includes(key),
      ),
    ),
  };
}

function upsertRecord(existing, userId, data = {}) {
  const record = existing || {
    id: randomUUID(),
    user_id: userId,
    youtube: null,
    youtube_code: null,
    youtube_status: null,
    twitch: null,
    twitch_code: null,
    twitch_status: null,
    kick: null,
    kick_code: null,
    kick_status: null,
  };
  record.user_id = userId;
  const platform = String(data.platform ?? "")
    .trim()
    .toLowerCase();
  const channel = data.channel_name ?? data.channel_id ?? data.channel_handle ?? data.channel;
  const code = data.verification_code ?? data.bio_link_code ?? data.code;

  if (platform === "youtube" || platform === "yt") {
    if (channel !== undefined) {
      const nextChannel = channel || null;
      if (
        record.youtube !== nextChannel &&
        String(data.status ?? "")
          .trim()
          .toLowerCase() !== "verified"
      ) {
        record.youtube_status = "pending";
        record.youtube_code = null;
        record.youtube_challenge_id = null;
      }
      record.youtube = nextChannel;
    }
    if (code !== undefined) record.youtube_code = code || null;
    if (data.status !== undefined) record.youtube_status = data.status;
    if (data.challenge_id !== undefined) record.youtube_challenge_id = data.challenge_id || null;
  } else if (platform === "twitch") {
    if (channel !== undefined) {
      const nextChannel = channel || null;
      if (
        record.twitch !== nextChannel &&
        String(data.status ?? "")
          .trim()
          .toLowerCase() !== "verified"
      ) {
        record.twitch_status = "pending";
        record.twitch_code = null;
        record.twitch_challenge_id = null;
      }
      record.twitch = nextChannel;
    }
    if (code !== undefined) record.twitch_code = code || null;
    if (data.status !== undefined) record.twitch_status = data.status;
    if (data.challenge_id !== undefined) record.twitch_challenge_id = data.challenge_id || null;
  } else if (platform === "kick") {
    if (channel !== undefined) {
      const nextChannel = channel || null;
      if (
        record.kick !== nextChannel &&
        String(data.status ?? "")
          .trim()
          .toLowerCase() !== "verified"
      ) {
        record.kick_status = "pending";
        record.kick_code = null;
        record.kick_challenge_id = null;
      }
      record.kick = nextChannel;
    }
    if (code !== undefined) record.kick_code = code || null;
    if (data.status !== undefined) record.kick_status = data.status;
    if (data.challenge_id !== undefined) record.kick_challenge_id = data.challenge_id || null;
  } else {
    for (const field of [
      "youtube",
      "youtube_code",
      "youtube_status",
      "twitch",
      "twitch_code",
      "twitch_status",
      "kick",
      "kick_code",
      "kick_status",
    ]) {
      if (data[field] !== undefined) record[field] = data[field];
    }
  }

  for (const [field, value] of Object.entries(data)) {
    if (
      [
        "id",
        "user_id",
        "platform",
        "channel_name",
        "channel_id",
        "channel_handle",
        "verification_code",
        "bio_link_code",
        "code",
      ].includes(field)
    )
      continue;
    if (
      value !== undefined &&
      ![
        "youtube",
        "youtube_code",
        "youtube_status",
        "twitch",
        "twitch_code",
        "twitch_status",
        "kick",
        "kick_code",
        "kick_status",
      ].includes(field)
    ) {
      record[field] = value;
    }
  }
  return record;
}

export const PlataformasJohnson = {
  async list(userId) {
    const ownerId = validateUserId(userId);
    const db = await readDatabase();
    const record = consolidatedRecord(db[ownerId], ownerId);
    return record ? [record] : [];
  },

  async get(userId, id) {
    const records = await this.list(userId);
    if (!records.length) return null;
    return id && String(records[0].id) !== String(id) ? null : records[0];
  },

  create(userId, data = {}) {
    const ownerId = validateUserId(userId);
    return withFileQueue(CONNECTIONS_FILE, async () => {
      const db = await readDatabase();
      const current = consolidatedRecord(db[ownerId], ownerId);
      const record = upsertRecord(current, ownerId, data);
      db[ownerId] = [record];
      await writeJsonAtomically(CONNECTIONS_FILE, db);
      return record;
    });
  },

  update(userId, id, changes = {}) {
    const ownerId = validateUserId(userId);
    return withFileQueue(CONNECTIONS_FILE, async () => {
      const db = await readDatabase();
      const current = consolidatedRecord(db[ownerId], ownerId);
      if (id && current && String(current.id) !== String(id)) {
        throw new Error("Não é permitido alterar o identificador principal do registro.");
      }
      const record = upsertRecord(current, ownerId, changes);
      db[ownerId] = [record];
      await writeJsonAtomically(CONNECTIONS_FILE, db);
      return record;
    });
  },

  delete(userId, id = "") {
    const ownerId = validateUserId(userId);
    return withFileQueue(CONNECTIONS_FILE, async () => {
      const db = await readDatabase();
      const current = consolidatedRecord(db[ownerId], ownerId);
      if (!current || (id && String(current.id) !== String(id))) return false;
      delete db[ownerId];
      await writeJsonAtomically(CONNECTIONS_FILE, db);
      return true;
    });
  },

  replace(userId, items) {
    const ownerId = validateUserId(userId);
    return withFileQueue(CONNECTIONS_FILE, async () => {
      const db = await readDatabase();
      const item = Array.isArray(items) ? items[0] : items;
      if (!item) {
        delete db[ownerId];
        await writeJsonAtomically(CONNECTIONS_FILE, db);
        return [];
      }
      const record = upsertRecord(consolidatedRecord([item], ownerId), ownerId, item);
      record.user_id = ownerId;
      db[ownerId] = [record];
      await writeJsonAtomically(CONNECTIONS_FILE, db);
      return db[ownerId];
    });
  },
};

export async function listAllPlataformas() {
  const db = await readDatabase();
  const list = [];
  for (const [userId, records] of Object.entries(db)) {
    if (userId === "_challenges") continue;
    const consolidated = consolidatedRecord(records, userId);
    if (consolidated) list.push(consolidated);
  }
  return list;
}
