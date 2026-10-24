import express, { type Express, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile, rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createJsonTableRecord,
  deleteJsonTableRecord,
  listJsonTableRecords,
  updateJsonTableRecord,
} from "../admin/banco/-json-tables-crud.js";
import { readSession } from "../login/session.js";

type SessionData = { user_id?: string; role?: string };
type GalleryImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  created_at: string;
  filename: string;
};
type Album = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string;
  imagens: GalleryImage[];
  data_criacao: string;
  data_edicao: string;
  __rowKey?: string;
};

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IMAGE_ROOT = resolve(PROJECT_ROOT, "dashboard/imagen/usuarios");
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = { "image/png": ".png", "image/gif": ".gif" };

function sessionUser(req: Request, res: Response): string | null {
  const session = readSession(req) as SessionData | null;
  if (!session?.user_id) {
    res
      .status(401)
      .set(NO_CACHE)
      .json({ ok: false, message: "Faça login para acessar sua galeria." });
    return null;
  }
  return session.user_id;
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function imageDirectory(userId: string, albumId: string): string {
  const directory = resolve(IMAGE_ROOT, safeSegment(userId), safeSegment(albumId));
  if (!directory.startsWith(IMAGE_ROOT + sep)) throw new Error("Caminho de imagem inválido.");
  return directory;
}

async function ownedAlbum(userId: string, albumId: string): Promise<Album | null> {
  const rows = (await listJsonTableRecords("galeria_usuarios")) as Album[];
  return rows.find((row) => row.user_id === userId && row.id === albumId) ?? null;
}

async function saveAlbum(album: Album): Promise<Album> {
  if (!album.__rowKey) throw new Error("Álbum não encontrado.");
  const saved = (await updateJsonTableRecord("galeria_usuarios", album.__rowKey, {
    id: album.id,
    user_id: album.user_id,
    nome: album.nome,
    descricao: album.descricao,
    imagens: album.imagens,
    data_criacao: album.data_criacao,
    data_edicao: new Date().toISOString(),
  })) as Album;
  return saved;
}

export function registerUserGalleryRoutes(app: Express) {
  app.get("/api/galeria-usuarios", async (req: Request, res: Response) => {
    const userId = sessionUser(req, res);
    if (!userId) return;
    try {
      const rows = (await listJsonTableRecords("galeria_usuarios")) as Album[];
      const albums = rows
        .filter((row) => row.user_id === userId)
        .map(({ __rowKey: _rowKey, ...row }) => row);
      return res.set(NO_CACHE).json({ ok: true, albums });
    } catch {
      return res
        .status(500)
        .set(NO_CACHE)
        .json({ ok: false, message: "Não foi possível carregar os álbuns." });
    }
  });

  app.post("/api/galeria-usuarios", async (req: Request, res: Response) => {
    const userId = sessionUser(req, res);
    if (!userId) return;
    const nome = String(req.body?.nome ?? "").trim();
    const descricao = String(req.body?.descricao ?? "").trim();
    if (!nome)
      return res.status(400).set(NO_CACHE).json({ ok: false, message: "Informe o nome do álbum." });
    if (nome.length > 80 || descricao.length > 500)
      return res
        .status(400)
        .set(NO_CACHE)
        .json({ ok: false, message: "Nome ou descrição excede o limite permitido." });
    try {
      const now = new Date().toISOString();
      const album = (await createJsonTableRecord("galeria_usuarios", {
        id: randomUUID(),
        user_id: userId,
        nome,
        descricao,
        imagens: [],
        data_criacao: now,
        data_edicao: now,
      })) as Album;
      const { __rowKey: _rowKey, ...publicAlbum } = album;
      return res.status(201).set(NO_CACHE).json({ ok: true, album: publicAlbum });
    } catch {
      return res
        .status(500)
        .set(NO_CACHE)
        .json({ ok: false, message: "Não foi possível criar o álbum." });
    }
  });

  app.patch("/api/galeria-usuarios/:albumId", async (req: Request, res: Response) => {
    const userId = sessionUser(req, res);
    if (!userId) return;
    try {
      const album = await ownedAlbum(userId, String(req.params["albumId"] ?? ""));
      if (!album)
        return res.status(404).set(NO_CACHE).json({ ok: false, message: "Álbum não encontrado." });
      const nome = req.body?.nome === undefined ? album.nome : String(req.body.nome).trim();
      const descricao =
        req.body?.descricao === undefined ? album.descricao : String(req.body.descricao).trim();
      if (!nome || nome.length > 80 || descricao.length > 500)
        return res
          .status(400)
          .set(NO_CACHE)
          .json({ ok: false, message: "Nome ou descrição inválidos." });
      const saved = await saveAlbum({ ...album, nome, descricao });
      const { __rowKey: _rowKey, ...publicAlbum } = saved;
      return res.set(NO_CACHE).json({ ok: true, album: publicAlbum });
    } catch {
      return res
        .status(500)
        .set(NO_CACHE)
        .json({ ok: false, message: "Não foi possível atualizar o álbum." });
    }
  });

  app.delete("/api/galeria-usuarios/:albumId", async (req: Request, res: Response) => {
    const userId = sessionUser(req, res);
    if (!userId) return;
    try {
      const album = await ownedAlbum(userId, String(req.params["albumId"] ?? ""));
      if (!album?.__rowKey)
        return res.status(404).set(NO_CACHE).json({ ok: false, message: "Álbum não encontrado." });
      await rm(imageDirectory(userId, album.id), { recursive: true, force: true });
      const deleted = await deleteJsonTableRecord("galeria_usuarios", album.__rowKey);
      if (!deleted)
        return res.status(404).set(NO_CACHE).json({ ok: false, message: "Álbum não encontrado." });
      return res.set(NO_CACHE).json({ ok: true });
    } catch {
      return res
        .status(500)
        .set(NO_CACHE)
        .json({ ok: false, message: "Não foi possível excluir o álbum." });
    }
  });

  app.post(
    "/api/galeria-usuarios/:albumId/imagens",
    express.raw({ type: ["image/png", "image/gif"], limit: "6mb" }),
    async (req: Request, res: Response) => {
      const userId = sessionUser(req, res);
      if (!userId) return;
      const albumId = String(req.params["albumId"] ?? "");
      const type = String(req.headers["content-type"] ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const extension = ALLOWED_TYPES[type];
      const filenameHeader = req.headers["x-file-name"];
      const originalName =
        (Array.isArray(filenameHeader) ? filenameHeader[0] : filenameHeader) ?? "";
      let filename = originalName;
      try {
        filename = decodeURIComponent(originalName);
      } catch {
        /* filename será validado abaixo */
      }
      if (!extension || !filename || !filename.toLowerCase().endsWith(extension))
        return res
          .status(415)
          .set(NO_CACHE)
          .json({ ok: false, message: "Este formato nao e permitido neste ambiente." });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0)
        return res
          .status(400)
          .set(NO_CACHE)
          .json({ ok: false, message: "Arquivo de imagem vazio ou inválido." });
      const isPng =
        type === "image/png" &&
        req.body
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const signature = req.body.subarray(0, 6).toString("ascii");
      const isGif = type === "image/gif" && (signature === "GIF87a" || signature === "GIF89a");
      if (!isPng && !isGif)
        return res
          .status(415)
          .set(NO_CACHE)
          .json({ ok: false, message: "Este formato nao e permitido neste ambiente." });
      if (req.body.length > MAX_IMAGE_SIZE)
        return res
          .status(413)
          .set(NO_CACHE)
          .json({
            ok: false,
            message: "Este tamanho de arquivo ultrapassa o limite permitido de 5 MB por imagem.",
          });
      try {
        const album = await ownedAlbum(userId, albumId);
        if (!album)
          return res
            .status(404)
            .set(NO_CACHE)
            .json({ ok: false, message: "Álbum não encontrado." });
        const imageId = randomUUID();
        const storedFilename = imageId + extension;
        const directory = imageDirectory(userId, albumId);
        await mkdir(directory, { recursive: true });
        await writeFile(resolve(directory, storedFilename), req.body, { flag: "wx", mode: 0o600 });
        const image: GalleryImage = {
          id: imageId,
          name: filename.replace(/[\\/]/g, "_").slice(0, 255),
          type,
          size: req.body.length,
          url: `/api/galeria-usuarios/${encodeURIComponent(albumId)}/imagens/${encodeURIComponent(imageId)}`,
          created_at: new Date().toISOString(),
          filename: storedFilename,
        };
        const saved = await saveAlbum({ ...album, imagens: [...album.imagens, image] });
        const { __rowKey: _rowKey, ...publicAlbum } = saved;
        return res
          .status(201)
          .set(NO_CACHE)
          .json({ ok: true, album: publicAlbum, image: { ...image, filename: undefined } });
      } catch {
        return res
          .status(500)
          .set(NO_CACHE)
          .json({ ok: false, message: "Não foi possível salvar a imagem." });
      }
    },
  );

  app.get(
    "/api/galeria-usuarios/:albumId/imagens/:imageId",
    async (req: Request, res: Response) => {
      const userId = sessionUser(req, res);
      if (!userId) return;
      try {
        const album = await ownedAlbum(userId, String(req.params["albumId"] ?? ""));
        const imageId = String(req.params["imageId"] ?? "");
        const image = album?.imagens.find((item) => item.id === imageId);
        if (!album || !image)
          return res
            .status(404)
            .set(NO_CACHE)
            .json({ ok: false, message: "Imagem não encontrada." });
        const path = resolve(imageDirectory(userId, album.id), image.filename);
        if (!path.startsWith(imageDirectory(userId, album.id) + sep))
          return res
            .status(400)
            .set(NO_CACHE)
            .json({ ok: false, message: "Caminho de imagem inválido." });
        const data = await readFile(path);
        return res.status(200).set(NO_CACHE).type(image.type).send(data);
      } catch {
        return res.status(404).set(NO_CACHE).json({ ok: false, message: "Imagem não encontrada." });
      }
    },
  );

  app.delete(
    "/api/galeria-usuarios/:albumId/imagens/:imageId",
    async (req: Request, res: Response) => {
      const userId = sessionUser(req, res);
      if (!userId) return;
      try {
        const album = await ownedAlbum(userId, String(req.params["albumId"] ?? ""));
        if (!album?.__rowKey)
          return res
            .status(404)
            .set(NO_CACHE)
            .json({ ok: false, message: "Álbum não encontrado." });
        const imageId = String(req.params["imageId"] ?? "");
        const image = album.imagens.find((item) => item.id === imageId);
        if (!image)
          return res
            .status(404)
            .set(NO_CACHE)
            .json({ ok: false, message: "Imagem não encontrada." });
        await unlink(resolve(imageDirectory(userId, album.id), image.filename)).catch(() => {});
        const saved = await saveAlbum({
          ...album,
          imagens: album.imagens.filter((item) => item.id !== imageId),
        });
        const { __rowKey: _rowKey, ...publicAlbum } = saved;
        return res.set(NO_CACHE).json({ ok: true, album: publicAlbum });
      } catch {
        return res
          .status(500)
          .set(NO_CACHE)
          .json({ ok: false, message: "Não foi possível excluir a imagem." });
      }
    },
  );
}
