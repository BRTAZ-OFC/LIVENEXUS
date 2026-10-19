import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withFileQueue, writeJsonAtomically } from "../../../admin/banco/-json-storage.js";

const CONNECTIONS_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "json",
  "conect-plataform.json",
);
const ALLOWED_PLATFORMS = new Set(["youtube", "twitch", "kick"]);

async function readConnections() {
  try {
    const parsed = JSON.parse(await readFile(CONNECTIONS_FILE, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new Error("conect-plataform.json precisa conter uma lista de conexões.");
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function listUserPlatforms(user_id) {
  const ownerId = String(user_id ?? "").trim();
  if (!ownerId) return [];
  return (await readConnections()).filter((item) => item.user_id === ownerId);
}

export async function saveUserPlatform(user_id, input = {}) {
  const ownerId = String(user_id ?? "").trim();
  const platform = String(input.platform ?? "").trim().toLowerCase();
  const channelId = String(input.channel_id ?? "").trim();
  const channelName = String(input.channel_name ?? "").trim();
  const channelUrl = String(input.channel_url ?? "").trim();

  if (!ownerId) throw new Error("Usuário autenticado inválido.");
  if (!ALLOWED_PLATFORMS.has(platform)) throw new Error("Plataforma inválida.");
  if (!channelId || channelId.length > 256) throw new Error("Identificador do canal inválido.");
  if (!channelName || channelName.length > 120) throw new Error("Nome do canal inválido.");
  if (channelUrl.length > 2048) throw new Error("URL do canal inválida.");

  return withFileQueue(CONNECTIONS_FILE, async () => {
    const connections = await readConnections();
    const now = new Date().toISOString();
    const index = connections.findIndex(
      (item) =>
        item.user_id === ownerId &&
        item.platform === platform &&
        item.channel_id.toLowerCase() === channelId.toLowerCase(),
    );

    if (index >= 0) {
      const updated = {
        ...connections[index],
        channel_name: channelName,
        channel_url: channelUrl,
        updated_at: now,
      };
      connections[index] = updated;
      await writeJsonAtomically(CONNECTIONS_FILE, connections);
      return updated;
    }

    const record = {
      connection_id: randomUUID(),
      user_id: ownerId,
      platform,
      channel_id: channelId,
      channel_name: channelName,
      channel_url: channelUrl,
      status: "pending",
      created_at: now,
      updated_at: now,
    };
    connections.push(record);
    await writeJsonAtomically(CONNECTIONS_FILE, connections);
    return record;
  });
}

export async function deleteUserPlatform(user_id, connection_id) {
  const ownerId = String(user_id ?? "").trim();
  const connectionId = String(connection_id ?? "").trim();
  if (!ownerId || !connectionId) return false;

  return withFileQueue(CONNECTIONS_FILE, async () => {
    const connections = await readConnections();
    const index = connections.findIndex(
      (item) => item.user_id === ownerId && item.connection_id === connectionId,
    );
    if (index < 0) return false;
    connections.splice(index, 1);
    await writeJsonAtomically(CONNECTIONS_FILE, connections);
    return true;
  });
}
