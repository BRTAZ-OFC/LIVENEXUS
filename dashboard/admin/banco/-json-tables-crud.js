import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getUserById, listUsers } from "./-crud.js";
import { withFileQueue, writeJsonAtomically } from "./-json-storage.js";

const JSON_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), "json");

const DEFINITIONS = Object.freeze({
  auth_activation: {
    id: "auth_activation",
    title: "Ativações",
    file: "auth_activation.json",
    shape: "map",
    keyField: "email",
    ownerScoped: false,
  },
  biblioteca: {
    id: "biblioteca",
    title: "Biblioteca",
    file: "biblioteca.json",
    shape: "userObject",
    ownerScoped: true,
  },
  cenarios: {
    id: "cenarios",
    title: "Cenários",
    file: "cenarios.json",
    shape: "userList",
    ownerScoped: true,
  },
  galeria: {
    id: "galeria",
    title: "Galeria",
    file: "galeria.json",
    shape: "array",
    keyField: "id",
    ownerScoped: false,
  },
  image_store: {
    id: "image_store",
    title: "Armazenamento de imagens",
    file: "image_store.json",
    shape: "map",
    keyField: "filename",
    ownerScoped: false,
  },
  messages: {
    id: "messages",
    title: "Mensagens",
    file: "messages.json",
    shape: "array",
    keyField: "id",
    ownerScoped: false,
  },
  metricas: {
    id: "metricas",
    title: "Métricas",
    file: "metricas.json",
    shape: "userList",
    ownerScoped: true,
  },
  overlays: {
    id: "overlays",
    title: "Overlays",
    file: "overlays.json",
    shape: "userList",
    ownerScoped: true,
  },
  rtc_registry: {
    id: "rtc_registry",
    title: "Identidades RTC",
    file: "rtc_registry.json",
    shape: "userObject",
    ownerScoped: true,
  },
  schemas: {
    id: "schemas",
    title: "Esquemas",
    file: "schemas.json",
    shape: "map",
    keyField: "id",
    ownerScoped: false,
  },
  templates: {
    id: "templates",
    title: "Modelos",
    file: "templates.json",
    shape: "array",
    keyField: "id",
    ownerScoped: false,
  },
});

function definitionFor(tableId) {
  const definition = DEFINITIONS[String(tableId ?? "")];
  if (!definition) throw new Error("Tabela JSON não permitida.");
  return definition;
}

function fileFor(definition) {
  return resolve(JSON_DIRECTORY, definition.file);
}

function emptyValue(definition) {
  return definition.shape === "array" ? [] : {};
}

async function readTable(definition) {
  try {
    const parsed = JSON.parse(await readFile(fileFor(definition), "utf8"));
    const expectedArray = definition.shape === "array";
    if (expectedArray ? !Array.isArray(parsed) : !parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Formato inválido no arquivo ${definition.file}.`);
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return emptyValue(definition);
    throw error;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rowKey(...parts) {
  return parts.map((part) => encodeURIComponent(String(part))).join("|");
}

function parseRowKey(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Identificador do registro não fornecido.");
  const [kind, ...parts] = value.split("|");
  try {
    return [kind, ...parts.map((part) => decodeURIComponent(part))];
  } catch {
    throw new Error("Identificador do registro inválido.");
  }
}

function recordId(record, index) {
  return String(record?.id ?? record?.avaliacao_id ?? record?.user_id ?? `indice-${index}`);
}

function normalizeRecord(record, forcedUserId) {
  if (!isRecord(record)) throw new Error("O registro deve ser um objeto JSON.");
  const next = { ...record };
  delete next.__rowKey;

  // Migra os nomes antigos para user_id; o valor sempre será validado em usuario.json.
  if (next.user_id === undefined && typeof next.userId === "string") next.user_id = next.userId;
  delete next.userId;
  // created_by_id é uma referência antiga; não deve ser usada como identidade local.
  delete next.created_by_id;

  if (forcedUserId) next.user_id = forcedUserId;
  if (next.user_id === "" || next.user_id === undefined) delete next.user_id;
  if (next.user_id === null) return next;
  return next;
}

async function assertLocalUser(userId) {
  const id = String(userId ?? "").trim();
  if (!id) throw new Error("Informe o user_id de um usuário existente em usuario.json.");
  const user = await getUserById(id);
  if (!user) throw new Error("O user_id informado não existe em usuario.json.");
  return user.user_id;
}

async function validateOptionalUserId(record) {
  if (record.user_id === undefined || record.user_id === null) return record;
  record.user_id = await assertLocalUser(record.user_id);
  return record;
}

async function validUserIds() {
  return new Set((await listUsers()).map((user) => user.user_id));
}

function defaultUserValue(tableId, userId) {
  if (tableId === "biblioteca") {
    return { user_id: userId, songs: [], albums: [], artists: [], playlists: [] };
  }
  if (tableId === "rtc_registry") {
    const rtcId = `rtc_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();
    return { id: rtcId, rtcId, user_id: userId, created_at: now, updated_at: now };
  }
  return { user_id: userId };
}

function rowsFromTable(definition, data, users) {
  const rows = [];
  if (definition.shape === "array") {
    data.forEach((record, index) => {
      if (!isRecord(record)) return;
      rows.push({ ...record, __rowKey: rowKey("array", recordId(record, index)) });
    });
    return rows;
  }

  if (definition.shape === "map") {
    for (const [key, value] of Object.entries(data)) {
      const record = isRecord(value) ? { ...value } : { value };
      if (record.user_id === undefined && typeof record.userId === "string") record.user_id = record.userId;
      delete record.userId;
      if (record[definition.keyField] === undefined) record[definition.keyField] = key;
      rows.push({ ...record, __rowKey: rowKey("map", key) });
    }
    return rows;
  }

  const validIds = users;
  for (const [ownerId, value] of Object.entries(data)) {
    // Orphaned D1-era IDs are intentionally not treated as local user identities.
    if (!validIds.has(ownerId)) continue;

    if (definition.shape === "userObject") {
      if (!isRecord(value)) continue;
      rows.push({ ...value, user_id: ownerId, __rowKey: rowKey("user", ownerId) });
      continue;
    }

    if (definition.shape === "userList") {
      if (!Array.isArray(value)) continue;
      value.forEach((record, index) => {
        if (!isRecord(record)) return;
        const id = recordId(record, index);
        rows.push({ ...record, user_id: ownerId, __rowKey: rowKey("user", ownerId, id) });
      });
    }
  }
  return rows;
}

export function getJsonTableDefinitions() {
  return Object.values(DEFINITIONS).map(({ id, title, file, ownerScoped, shape }) => ({
    id,
    title,
    file,
    ownerScoped,
    shape,
  }));
}

export async function listJsonTableRecords(tableId) {
  const definition = definitionFor(tableId);
  const data = await readTable(definition);
  const users = definition.ownerScoped || definition.shape === "userObject" || definition.shape === "userList"
    ? await validUserIds()
    : new Set();
  return rowsFromTable(definition, data, users);
}

export async function createJsonTableRecord(tableId, input) {
  const definition = definitionFor(tableId);
  let record = normalizeRecord(input);
  await validateOptionalUserId(record);

  return withFileQueue(fileFor(definition), async () => {
    const data = await readTable(definition);
    if (definition.shape === "array") {
      const now = new Date().toISOString();
      const id = String(record.id || (tableId === "templates" ? `template_${randomUUID()}` : randomUUID()));
      if (data.some((item) => isRecord(item) && String(item.id ?? item.avaliacao_id ?? "") === id)) {
        throw new Error("Já existe um registro com esse ID.");
      }
      record = { ...record, id };
      if (record.created_at === undefined && record.created_date === undefined) record.created_at = now;
      data.push(record);
      await writeJsonAtomically(fileFor(definition), data);
      return { ...record, __rowKey: rowKey("array", id) };
    }

    if (definition.shape === "map") {
      const key = String(record[definition.keyField] ?? "").trim();
      if (!key) throw new Error(`O campo ${definition.keyField} é obrigatório.`);
      if (Object.hasOwn(data, key)) throw new Error("Já existe um registro com essa chave.");
      record[definition.keyField] = key;
      data[key] = record;
      await writeJsonAtomically(fileFor(definition), data);
      return { ...record, __rowKey: rowKey("map", key) };
    }

    const ownerId = await assertLocalUser(record.user_id);
    if (definition.shape === "userObject") {
      if (Object.hasOwn(data, ownerId)) throw new Error("Esse usuário já possui um registro nesta tabela.");
      const base = defaultUserValue(tableId, ownerId);
      const stored = { ...base, ...record, user_id: ownerId };
      if (tableId === "rtc_registry" && !stored.rtcId) {
        stored.rtcId = `rtc_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
        stored.id = stored.id || stored.rtcId;
      }
      data[ownerId] = stored;
      await writeJsonAtomically(fileFor(definition), data);
      return { ...stored, user_id: ownerId, __rowKey: rowKey("user", ownerId) };
    }

    const id = String(record.id || randomUUID());
    const now = new Date().toISOString();
    record = { ...record, id, user_id: ownerId };
    if (record.created_at === undefined && record.created_date === undefined) record.created_at = now;
    const items = Array.isArray(data[ownerId]) ? data[ownerId] : [];
    if (items.some((item) => isRecord(item) && String(item.id) === id)) {
      throw new Error("Já existe um registro com esse ID para o usuário.");
    }
    data[ownerId] = [...items, record];
    await writeJsonAtomically(fileFor(definition), data);
    return { ...record, __rowKey: rowKey("user", ownerId, id) };
  });
}

export async function updateJsonTableRecord(tableId, inputRowKey, inputRecord) {
  const definition = definitionFor(tableId);
  const [kind, ...parts] = parseRowKey(inputRowKey);
  let record = normalizeRecord(inputRecord);

  return withFileQueue(fileFor(definition), async () => {
    const data = await readTable(definition);
    if (definition.shape === "array") {
      if (kind !== "array" || parts.length !== 1) throw new Error("Identificador incompatível com a tabela.");
      const targetId = parts[0];
      const index = data.findIndex((item, i) => isRecord(item) && recordId(item, i) === targetId);
      if (index < 0) throw new Error("Registro não encontrado.");
      const original = data[index];
      await validateOptionalUserId(record);
      record = { ...original, ...record };
      if (original.id !== undefined) record.id = original.id;
      if (original.user_id !== undefined) record.user_id = original.user_id;
      data[index] = record;
      await writeJsonAtomically(fileFor(definition), data);
      return { ...record, __rowKey: inputRowKey };
    }

    if (definition.shape === "map") {
      if (kind !== "map" || parts.length !== 1) throw new Error("Identificador incompatível com a tabela.");
      const key = parts[0];
      if (!Object.hasOwn(data, key)) throw new Error("Registro não encontrado.");
      await validateOptionalUserId(record);
      record[definition.keyField] = key;
      data[key] = { ...(isRecord(data[key]) ? data[key] : {}), ...record };
      await writeJsonAtomically(fileFor(definition), data);
      return { ...data[key], __rowKey: inputRowKey };
    }

    if (kind !== "user" || !parts.length) throw new Error("Identificador incompatível com a tabela.");
    const ownerId = await assertLocalUser(parts[0]);

    if (definition.shape === "userObject") {
      if (parts.length !== 1 || !Object.hasOwn(data, ownerId)) throw new Error("Registro não encontrado.");
      if (record.user_id !== undefined && String(record.user_id) !== ownerId) {
        throw new Error("Não é permitido transferir o registro para outro usuário.");
      }
      const original = isRecord(data[ownerId]) ? data[ownerId] : {};
      record = { ...original, ...record, user_id: ownerId };
      data[ownerId] = record;
      await writeJsonAtomically(fileFor(definition), data);
      return { ...record, __rowKey: inputRowKey };
    }

    if (parts.length !== 2 || !Array.isArray(data[ownerId])) throw new Error("Registro não encontrado.");
    const targetId = parts[1];
    const index = data[ownerId].findIndex((item, i) => isRecord(item) && recordId(item, i) === targetId);
    if (index < 0) throw new Error("Registro não encontrado.");
    const original = data[ownerId][index];
    if (record.user_id !== undefined && String(record.user_id) !== ownerId) {
      throw new Error("Não é permitido transferir o registro para outro usuário.");
    }
    record = { ...original, ...record, id: original.id ?? targetId, user_id: ownerId };
    data[ownerId][index] = record;
    await writeJsonAtomically(fileFor(definition), data);
    return { ...record, __rowKey: inputRowKey };
  });
}

export async function deleteJsonTableRecord(tableId, inputRowKey) {
  const definition = definitionFor(tableId);
  const [kind, ...parts] = parseRowKey(inputRowKey);
  return withFileQueue(fileFor(definition), async () => {
    const data = await readTable(definition);
    if (definition.shape === "array") {
      if (kind !== "array" || parts.length !== 1) throw new Error("Identificador incompatível com a tabela.");
      const targetId = parts[0];
      const next = data.filter((item, i) => !isRecord(item) || recordId(item, i) !== targetId);
      if (next.length === data.length) return false;
      await writeJsonAtomically(fileFor(definition), next);
      return true;
    }

    if (definition.shape === "map") {
      if (kind !== "map" || parts.length !== 1) throw new Error("Identificador incompatível com a tabela.");
      const key = parts[0];
      if (!Object.hasOwn(data, key)) return false;
      delete data[key];
      await writeJsonAtomically(fileFor(definition), data);
      return true;
    }

    if (kind !== "user" || !parts.length) throw new Error("Identificador incompatível com a tabela.");
    const ownerId = await assertLocalUser(parts[0]);
    if (definition.shape === "userObject") {
      if (parts.length !== 1 || !Object.hasOwn(data, ownerId)) return false;
      delete data[ownerId];
      await writeJsonAtomically(fileFor(definition), data);
      return true;
    }

    if (parts.length !== 2 || !Array.isArray(data[ownerId])) return false;
    const targetId = parts[1];
    const next = data[ownerId].filter((item, i) => !isRecord(item) || recordId(item, i) !== targetId);
    if (next.length === data[ownerId].length) return false;
    if (next.length) data[ownerId] = next;
    else delete data[ownerId];
    await writeJsonAtomically(fileFor(definition), data);
    return true;
  });
}

export function createJsonTableCrud(tableId) {
  definitionFor(tableId);
  return Object.freeze({
    list: () => listJsonTableRecords(tableId),
    get: async (rowKeyValue) => (await listJsonTableRecords(tableId)).find((row) => row.__rowKey === rowKeyValue) ?? null,
    create: (record) => createJsonTableRecord(tableId, record),
    update: (rowKeyValue, record) => updateJsonTableRecord(tableId, rowKeyValue, record),
    delete: (rowKeyValue) => deleteJsonTableRecord(tableId, rowKeyValue),
  });
}

export const authActivationJohnson = createJsonTableCrud("auth_activation");
export const bibliotecaJohnson = createJsonTableCrud("biblioteca");
export const scenarioJohnson = createJsonTableCrud("cenarios");
export const galleryJohnson = createJsonTableCrud("galeria");
export const imageStoreJohnson = createJsonTableCrud("image_store");
export const messagesJohnson = createJsonTableCrud("messages");
export const metricasJohnson = createJsonTableCrud("metricas");
export const overlayJohnson = createJsonTableCrud("overlays");
export const rtcIdentityJohnson = createJsonTableCrud("rtc_registry");
export const schemasJohnson = createJsonTableCrud("schemas");
export const templateJohnson = createJsonTableCrud("templates");
