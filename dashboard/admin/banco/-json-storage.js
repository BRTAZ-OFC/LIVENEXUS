import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const queues = new Map();

// BLOCO 1 — Serializa operações que modificam o mesmo arquivo.
export function withFileQueue(filePath, operation) {
  const previous = queues.get(filePath) ?? Promise.resolve();
  const current = previous.then(operation);

  const settled = current.then(
    () => undefined,
    () => undefined,
  );

  queues.set(filePath, settled);

  void settled.then(() => {
    if (queues.get(filePath) === settled) {
      queues.delete(filePath);
    }
  });

  return current;
}

// BLOCO 2 — Grava primeiro em arquivo temporário e depois o substitui.
export async function writeJsonAtomically(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });

  const tempFile = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await writeFile(tempFile, JSON.stringify(data, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
      flush: true,
    });

    await rename(tempFile, filePath);
  } catch (error) {
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}