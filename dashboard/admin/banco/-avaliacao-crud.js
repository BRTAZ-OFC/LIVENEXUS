/**
 * CRUD server-side para avaliações armazenadas em JSON.
 * IMPORTANTE: usar somente no servidor Node.js; nunca importar este arquivo no frontend.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AVALIACOES_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "json", "avaliacao.json");

async function readAvaliacoes() {
  try {
    const parsed = JSON.parse(await readFile(AVALIACOES_FILE, "utf8"));
    if (!Array.isArray(parsed))
      throw new Error("O arquivo avaliacao.json precisa conter uma lista.");
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeAvaliacoes(avaliacoes) {
  await mkdir(dirname(AVALIACOES_FILE), { recursive: true });
  await writeFile(AVALIACOES_FILE, JSON.stringify(avaliacoes, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o644,
    flush: true,
  });
}

export async function listAvaliacoes() {
  const list = await readAvaliacoes();
  return list.sort(
    (a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime(),
  );
}

export async function createAvaliacao({ nome, nota, mensagem }) {
  if (typeof nome !== "string" || !nome.trim() || nome.trim().length > 100) {
    throw new Error("O nome deve ter entre 1 e 100 caracteres.");
  }
  const parsedNota = Number(nota);
  if (!Number.isInteger(parsedNota) || parsedNota < 1 || parsedNota > 5) {
    throw new Error("A nota deve ser um número inteiro entre 1 e 5.");
  }
  if (typeof mensagem !== "string" || !mensagem.trim() || mensagem.trim().length > 1000) {
    throw new Error("A mensagem deve ter entre 1 e 1000 caracteres.");
  }

  const avaliacoes = await readAvaliacoes();
  const now = new Date().toISOString();
  const record = {
    avaliacao_id: randomUUID(),
    nome: nome.trim(),
    nota: parsedNota,
    mensagem: mensagem.trim(),
    resposta_admin: null,
    respondido_por: null,
    data_criacao: now,
    data_atualizacao: now,
  };

  avaliacoes.push(record);
  await writeAvaliacoes(avaliacoes);
  return record;
}

export async function updateAvaliacao(avaliacao_id, changes = {}, adminUser = null) {
  const avaliacoes = await readAvaliacoes();
  const index = avaliacoes.findIndex((item) => item.avaliacao_id === avaliacao_id);
  if (index < 0) throw new Error("Avaliação não encontrada.");

  const current = avaliacoes[index];
  const next = { ...current };

  if (changes.nome !== undefined) {
    if (typeof changes.nome !== "string" || !changes.nome.trim()) {
      throw new Error("Nome inválido.");
    }
    next.nome = changes.nome.trim();
  }

  if (changes.nota !== undefined) {
    const parsedNota = Number(changes.nota);
    if (!Number.isInteger(parsedNota) || parsedNota < 1 || parsedNota > 5) {
      throw new Error("A nota deve ser um número inteiro entre 1 e 5.");
    }
    next.nota = parsedNota;
  }

  if (changes.mensagem !== undefined) {
    if (typeof changes.mensagem !== "string" || !changes.mensagem.trim()) {
      throw new Error("Mensagem inválida.");
    }
    next.mensagem = changes.mensagem.trim();
  }

  if (changes.resposta_admin !== undefined) {
    const resp = changes.resposta_admin;
    if (resp === null || resp === "" || (typeof resp === "string" && !resp.trim())) {
      next.resposta_admin = null;
      next.respondido_por = null;
    } else if (typeof resp === "string") {
      next.resposta_admin = resp.trim();
      next.respondido_por = adminUser || "Administrador";
    }
  }

  next.data_atualizacao = new Date().toISOString();
  avaliacoes[index] = next;
  await writeAvaliacoes(avaliacoes);
  return next;
}

export async function deleteAvaliacao(avaliacao_id) {
  const avaliacoes = await readAvaliacoes();
  const targetId = String(avaliacao_id ?? "").trim();
  const index = avaliacoes.findIndex((item) => String(item.avaliacao_id ?? "").trim() === targetId);
  if (index < 0) return false;

  avaliacoes.splice(index, 1);
  await writeAvaliacoes(avaliacoes);
  return true;
}
