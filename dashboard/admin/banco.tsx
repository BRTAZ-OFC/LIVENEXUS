/* BLOCO 1 — Imports de rota, ícones e estados da tabela JSON. */
import { Link } from "react-router-dom";
import {
  AudioLines,
  ArrowLeft,
  Database,
  Pencil,
  RefreshCw,
  Save,
  X,
  House,
  Table2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

/* BLOCO 2 — A tabela pode ser usada no dashboard ou na rota própria. */
/* BLOCO 3 — Tipos dos campos que podem aparecer nas tabelas. */
type UserRow = {
  user_id: string;
  user: string;
  role?: string;
  imagen?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
};

type UserDraft = {
  user: string;
  role: string;
  imagen: string;
};

type ReviewRow = {
  avaliacao_id: string;
  nome: string;
  nota: number;
  mensagem: string;
  resposta_admin?: string | null;
  respondido_por?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
};

type ReviewDraft = {
  nome: string;
  nota: number;
  mensagem: string;
  resposta_admin: string;
};

type PlatformRow = {
  id: string;
  user_id: string;
  youtube?: string | null;
  youtube_status?: string | null;
  twitch?: string | null;
  twitch_status?: string | null;
  kick?: string | null;
  kick_status?: string | null;
  status?: string | null;
  verifiedAt?: string | null;
};

type PlatformDraft = {
  youtube: string;
  youtube_status: string;
  twitch: string;
  twitch_status: string;
  kick: string;
  kick_status: string;
};

/* BLOCO 4 — Helpers para formatar valores, datas e cabeçalhos de autenticação. */
function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  return text.length > 25 ? `${text.slice(0, 25)}…` : text;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("livenexus_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

type JsonRow = Record<string, unknown> & { __rowKey: string };

const JSON_TABLES: Array<{ id: string; title: string; file: string; description: string; fields: string[] }> = [
  { id: "auth_activation", title: "Ativações", file: "auth_activation.json", description: "Códigos temporários de ativação.", fields: ["email", "code", "expiresAt", "created_at"] },
  { id: "biblioteca", title: "Biblioteca", file: "biblioteca.json", description: "Músicas, álbuns, artistas e playlists por usuário.", fields: ["user_id", "songs", "albums", "artists", "playlists"] },
  { id: "cenarios", title: "Cenários", file: "cenarios.json", description: "Cenários salvos por usuário.", fields: ["id", "user_id", "name", "config", "created_at"] },
  { id: "galeria", title: "Galeria", file: "galeria.json", description: "Registros de mídia da galeria.", fields: ["id", "user_id", "filename", "url", "size", "uploadedAt"] },
  { id: "galeria_usuarios", title: "Galeria de usuários", file: "galeria-usuarios.json", description: "Itens de galeria agrupados por usuário.", fields: ["user_id", "id", "filename", "url", "size", "uploadedAt"] },
  { id: "image_store", title: "Armazenamento de imagens", file: "image_store.json", description: "Metadados e conteúdo de imagens.", fields: ["filename", "user_id", "data", "updatedAt", "id", "source"] },
  { id: "messages", title: "Mensagens", file: "messages.json", description: "Mensagens recebidas pelo sistema.", fields: ["id", "user_id", "name", "email", "category", "message", "status", "created_date"] },
  { id: "metricas", title: "Métricas", file: "metricas.json", description: "Métricas agrupadas por usuário.", fields: ["id", "user_id", "type", "data", "created_date"] },
  { id: "vods", title: "VODs e sessões", file: "vods.json", description: "VODs e sessões de transmissão agrupados por usuário.", fields: ["id", "user_id", "title", "url", "vodStatus", "created_date", "updated_date"] },
  { id: "overlays", title: "Overlays", file: "overlays.json", description: "Overlays e configurações por usuário.", fields: ["id", "user_id", "name", "type", "settings", "created_at"] },
  { id: "rtc_registry", title: "Identidades RTC", file: "rtc_registry.json", description: "Identificadores RTC associados ao user_id local.", fields: ["user_id", "id", "rtcId", "created_at", "updated_at"] },
  { id: "templates", title: "Modelos", file: "templates.json", description: "Catálogo de modelos visuais.", fields: ["id", "name", "originalName", "localPath", "url", "format", "category", "role", "sourceRepository", "size"] },
];

function jsonColumnLabel(field: string) {
  const labels: Record<string, string> = {
    id: "ID",
    user_id: "ID DO USUÁRIO",
    user: "USUÁRIO",
    role: "PERFIL",
    name: "NOME",
    filename: "NOME DO ARQUIVO",
    title: "TÍTULO",
    email: "E-MAIL",
    code: "CÓDIGO",
    nota: "NOTA",
    mensagem: "MENSAGEM",
    message: "MENSAGEM",
    resposta_admin: "RESPOSTA ADMIN",
    respondido_por: "RESPONDIDO POR",
    created_at: "CRIADO EM",
    created_date: "CRIADO EM",
    data_criacao: "CRIADO EM",
    updatedAt: "ATUALIZADO EM",
    updated_date: "ATUALIZADO EM",
    data_atualizacao: "ATUALIZADO EM",
    expiresAt: "EXPIRA EM",
    uploadedAt: "ENVIADO EM",
    url: "URL",
    size: "TAMANHO",
    songs: "MÚSICAS",
    albums: "ÁLBUNS",
    artists: "ARTISTAS",
    playlists: "PLAYLISTS",
    config: "CONFIGURAÇÃO",
    settings: "CONFIGURAÇÕES",
    type: "TIPO",
    data: "DADOS",
    status: "STATUS",
    source: "ORIGEM",
    category: "CATEGORIA",
    format: "FORMATO",
    localPath: "CAMINHO LOCAL",
    originalName: "NOME ORIGINAL",
    sourceRepository: "REPOSITÓRIO DE ORIGEM",
    vodStatus: "STATUS DO VOD",
    rtcId: "ID RTC",
  };
  if (labels[field]) return labels[field];
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLocaleUpperCase("pt-BR");
}

function jsonCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return text.length > 60 ? text.slice(0, 60) + "…" : text;
  }
  return displayValue(value);
}

/* BLOCO 5 — Controla seleção de tabelas, registros, edição, exclusão e carregamento. */
export default function DatabasePage({ embedded = false }: { embedded?: boolean } = {}) {
  const [selectedTable, setSelectedTable] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("livenexus_selected_table") || "usuarios";
    }
    return "usuarios";
  });
  const [isAdmin, setIsAdmin] = useState(embedded);
  const selectedJsonId = selectedTable.startsWith("json:") ? selectedTable.slice(5) : "";
  const selectedJsonTable = JSON_TABLES.find((table) => table.id === selectedJsonId);


  function handleSelectTable(table: string) {
    setSelectedTable(table);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("livenexus_selected_table", table);
    }
    if (table === "usuarios") void loadUsers();
    else if (table === "avaliacoes") void loadReviews();
    else if (table === "plataformas") void loadPlatforms();
    else if (table.startsWith("json:")) void loadJsonTable(table.slice(5));
  }

  const [users, setUsers] = useState<UserRow[]>([]);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [reviewEditingId, setReviewEditingId] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewRow | null>(null);

  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [platformDraft, setPlatformDraft] = useState<PlatformDraft | null>(null);
  const [platformEditingId, setPlatformEditingId] = useState<string | null>(null);
  const [platformToDelete, setPlatformToDelete] = useState<PlatformRow | null>(null);
  const [genericRows, setGenericRows] = useState<JsonRow[]>([]);
  const [genericDraft, setGenericDraft] = useState("");
  const [genericEditingKey, setGenericEditingKey] = useState<string | null>(null);
  const [genericNewJson, setGenericNewJson] = useState("{\n  \n}");
  const genericColumns = Array.from(new Set([
    ...(selectedJsonTable?.fields ?? []),
    ...genericRows.flatMap((row) => Object.keys(row).filter((key) => key !== "__rowKey")),
  ]));


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPlatforms() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/database/plataformas", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Falha ao carregar as plataformas.");
      setPlatforms(result.plataformas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as plataformas.");
    } finally {
      setLoading(false);
    }
  }

  async function loadJsonTable(tableId: string) {
    setLoading(true);
    setGenericRows([]);
    setGenericEditingKey(null);
    setGenericDraft("");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(tableId)}`, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível carregar a tabela JSON.");
      setGenericRows(Array.isArray(result.rows) ? result.rows : []);
      setGenericEditingKey(null);
      setGenericDraft("");
    } catch (err) {
      setGenericRows([]);
      setError(err instanceof Error ? err.message : "Falha ao carregar a tabela JSON.");
    } finally {
      setLoading(false);
    }
  }

  async function createGenericRow() {
    if (!selectedJsonId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const record = JSON.parse(genericNewJson);
      if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("O JSON precisa ser um objeto.");
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(selectedJsonId)}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ record }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível criar o registro.");
      setGenericNewJson("{\n  \n}");
      setMessage("Registro criado no JSON.");
      await loadJsonTable(selectedJsonId);
    } catch (err) {
      setError(err instanceof SyntaxError ? "JSON inválido. Corrija a sintaxe antes de salvar." : err instanceof Error ? err.message : "Falha ao criar registro.");
    } finally {
      setSaving(false);
    }
  }

  async function saveGenericRow(rowKey: string) {
    if (!selectedJsonId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const record = JSON.parse(genericDraft);
      if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("O JSON precisa ser um objeto.");
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(selectedJsonId)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ rowKey, record }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível atualizar o registro.");
      setGenericEditingKey(null);
      setGenericDraft("");
      setMessage("Registro atualizado no JSON.");
      await loadJsonTable(selectedJsonId);
    } catch (err) {
      setError(err instanceof SyntaxError ? "JSON inválido. Corrija a sintaxe antes de salvar." : err instanceof Error ? err.message : "Falha ao atualizar registro.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGenericRow(rowKey: string) {
    if (!selectedJsonId || (typeof window !== "undefined" && !window.confirm("Excluir este registro do arquivo JSON?"))) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(selectedJsonId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ rowKey }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível excluir o registro.");
      setMessage("Registro excluído do JSON.");
      await loadJsonTable(selectedJsonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir registro.");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeletePlatform(userId: string) {
    if (deleting) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/plataformas", {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ user_id: userId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Não foi possível excluir a plataforma.");
      }
      setPlatforms((current) => current.filter((row) => row.user_id !== userId));
      setPlatformToDelete(null);
      setMessage(result.message || "Plataforma excluída com sucesso.");
      void loadPlatforms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a plataforma.");
    } finally {
      setDeleting(false);
    }
  }

  function startEditingPlatform(row: PlatformRow) {
    setPlatformEditingId(row.id);
    setPlatformDraft({
      youtube: row.youtube ?? "",
      youtube_status: row.youtube_status ?? "",
      twitch: row.twitch ?? "",
      twitch_status: row.twitch_status ?? "",
      kick: row.kick ?? "",
      kick_status: row.kick_status ?? "",
    });
    setMessage("");
    setError("");
  }

  async function savePlatform(row: PlatformRow) {
    if (!platformDraft) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/plataformas", {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          user_id: row.user_id,
          changes: {
            id: row.id,
            youtube: platformDraft.youtube.trim() || null,
            youtube_status: platformDraft.youtube_status.trim() || null,
            twitch: platformDraft.twitch.trim() || null,
            twitch_status: platformDraft.twitch_status.trim() || null,
            kick: platformDraft.kick.trim() || null,
            kick_status: platformDraft.kick_status.trim() || null,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível salvar.");
      setPlatforms((current) =>
        current.map((item) => (item.id === row.id ? result.plataforma : item)),
      );
      setPlatformEditingId(null);
      setPlatformDraft(null);
      setMessage("Plataforma atualizada com sucesso.");
      void loadPlatforms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  // BLOCO 6 — Busca os usuários pela API administrativa sem usar cache.
  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/database/users", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Falha ao carregar a tabela.");
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a tabela.");
    } finally {
      setLoading(false);
    }
  }

  // BLOCO 6B — Busca as avaliações pela API administrativa sem usar cache.
  async function loadReviews() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/database/avaliacoes", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Falha ao carregar as avaliações.");
      setReviews(result.avaliacoes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
    }
  }

  // BLOCO 7 — Solicita a exclusão de usuário e atualiza a lista.
  async function confirmDelete(userId: string) {
    if (deleting) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/users", {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ user_id: userId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Não foi possível excluir o usuário.");
      }
      setUsers((current) => current.filter((row) => row.user_id !== userId));
      setUserToDelete(null);
      setMessage(result.message || "Usuário excluído com sucesso.");
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir o usuário.");
    } finally {
      setDeleting(false);
    }
  }

  // BLOCO 7B — Solicita a exclusão de avaliação e atualiza a lista.
  async function confirmDeleteReview(avaliacaoId: string) {
    if (deleting) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/avaliacoes", {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ avaliacao_id: avaliacaoId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Não foi possível excluir a avaliação.");
      }
      setReviews((current) => current.filter((row) => row.avaliacao_id !== avaliacaoId));
      setReviewToDelete(null);
      setMessage(result.message || "Avaliação excluída com sucesso.");
      void loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a avaliação.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    const admin = embedded || sessionStorage.getItem("livenexus_role") === "admin";
    setIsAdmin(admin);
    if (admin) {
      if (selectedTable === "usuarios") void loadUsers();
      else if (selectedTable === "avaliacoes") void loadReviews();
      else if (selectedTable === "plataformas") void loadPlatforms();
      else if (selectedTable.startsWith("json:")) void loadJsonTable(selectedTable.slice(5));
    } else {
      setLoading(false);
    }
  }, [embedded, selectedTable]);

  // BLOCO 8 — Prepara os valores temporários para editar usuário.
  function startEditing(row: UserRow) {
    setEditingId(row.user_id);
    setDraft({
      user: row.user ?? "",
      role: row.role ?? "user",
      imagen: row.imagen ?? "",
    });
    setMessage("");
    setError("");
  }

  // BLOCO 8B — Prepara os valores temporários para editar/responder avaliação.
  function startEditingReview(row: ReviewRow) {
    setReviewEditingId(row.avaliacao_id);
    setReviewDraft({
      nome: row.nome ?? "",
      nota: row.nota ?? 5,
      mensagem: row.mensagem ?? "",
      resposta_admin: row.resposta_admin ?? "",
    });
    setMessage("");
    setError("");
  }

  // BLOCO 9 — Envia os campos editados do usuário para a API.
  async function saveRow(userId: string) {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/users", {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          user_id: userId,
          changes: {
            user: draft.user,
            role: draft.role,
            imagen: draft.imagen.trim() || null,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível salvar.");
      setUsers((current) => current.map((row) => (row.user_id === userId ? result.user : row)));
      setEditingId(null);
      setDraft(null);
      setMessage("Registro atualizado.");
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  // BLOCO 9B — Envia os campos editados da avaliação para a API.
  async function saveReview(avaliacaoId: string) {
    if (!reviewDraft) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/avaliacoes", {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          avaliacao_id: avaliacaoId,
          changes: {
            nome: reviewDraft.nome,
            nota: Number(reviewDraft.nota),
            mensagem: reviewDraft.mensagem,
            resposta_admin: reviewDraft.resposta_admin.trim() || null,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível salvar.");
      setReviews((current) =>
        current.map((row) => (row.avaliacao_id === avaliacaoId ? result.avaliacao : row)),
      );
      setReviewEditingId(null);
      setReviewDraft(null);
      setMessage("Avaliação atualizada com sucesso.");
      void loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  if (!embedded && !isAdmin) {
    return (
      <main className="db-flex-min-h-screen-ejpwfw">
        <section className="db-rounded-xl-border-1yymjbi">
          <h1 className="db-text-lg-font-bold-15tkl3f">Acesso restrito</h1>
          <p className="db-mt-2-text-sm-1qgs8fd">
            O banco de dados está disponível somente para administradores.
          </p>
          <Link to="/dashboard" className="db-mt-4-inline-block-uyxz30">
            Voltar ao dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className={embedded ? "db-flex-min-h-0-1yrwjzw" : "db-flex-min-h-screen-axmrk9"}>
      {!embedded && (
        <aside className="db-flex-min-h-screen-18ufx4p">
          <div className="db-flex-h-11-1nokrch">
            <span className="db-flex-h-6-rvwoa7">
              <AudioLines className="db-h-3-w-3-16c88sp" />
            </span>
            <span className="db-text-11px-font-extrabold-1tiyd6b">LIVENEXUS</span>
          </div>
          {/* BLOCO 11 — Links de navegação da tabela independente. */}
          <nav className="db-flex-flex-col-1vt2mhw">
            <Link to="/dashboard" title="Início" className="db-flex-h-7-1jvyogy">
              <House className="db-h-3-w-3-92ylou" /> Início
            </Link>
            <Link to="/admin/banco" title="Banco de dados" className="db-flex-h-7-1yq75cr">
              <Database className="db-h-3-w-3-92ylou" /> Banco de dados
            </Link>
          </nav>
        </aside>
      )}
      <aside className="db-flex-w-32-qdsh3g">
        <div className="db-border-b-border-white-10-15zrj3l">
          <p className="db-text-9px-font-bold-14dl39j">TABELAS JSON</p>
        </div>
        <nav className="db-p-2-178lum4 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => handleSelectTable("usuarios")}
            className={`db-flex-w-full-oi8986 ${selectedTable === "usuarios" ? "db-bg-violet-500-15-text-vi-1xm6n2h" : "db-bg-white-5-sdteeg"}`}
          >
            <Table2 className="db-h-3-5-w-3-5-l2ap6m" />
            <span className="db-text-9px-font-medium-18gwz7j">Usuários</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTable("avaliacoes")}
            className={`db-flex-w-full-oi8986 ${selectedTable === "avaliacoes" ? "db-bg-violet-500-15-text-vi-1xm6n2h" : "db-bg-white-5-sdteeg"}`}
          >
            <Table2 className="db-h-3-5-w-3-5-l2ap6m" />
            <span className="db-text-9px-font-medium-18gwz7j">Avaliações</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTable("plataformas")}
            className={`db-flex-w-full-oi8986 ${selectedTable === "plataformas" ? "db-bg-violet-500-15-text-vi-1xm6n2h" : "db-bg-white-5-sdteeg"}`}
          >
            <Table2 className="db-h-3-5-w-3-5-l2ap6m" />
            <span className="db-text-9px-font-medium-18gwz7j">Plataformas</span>
          </button>
          {JSON_TABLES.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => handleSelectTable(`json:${table.id}`)}
              title={table.file}
              className={`db-flex-w-full-oi8986 ${selectedTable === `json:${table.id}` ? "db-bg-violet-500-15-text-vi-1xm6n2h" : "db-bg-white-5-sdteeg"}`}
            >
              <Table2 className="db-h-3-5-w-3-5-l2ap6m" />
              <span className="db-text-9px-font-medium-18gwz7j">{table.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* BLOCO 12 — Área principal da tabela, da edição e das ações CRUD. */}
      <main className="db-min-w-0-flex-1-1g3oh63">
        {!embedded && (
          <header className="db-border-b-border-white-10-7389gy">
            <div className="db-flex-w-full-1bum737">
              <Link to="/dashboard" className="db-flex-items-center-1bpln9w">
                <span className="db-flex-h-6-rvwoa7">
                  <AudioLines className="db-h-3-w-3-16c88sp" />
                </span>
                <span className="db-text-sm-font-extrabold-26vlbx">
                  LIVE<span className="db-text-cyan-300-bbfjjq">NEXUS</span>
                </span>
              </Link>
              <Link to="/dashboard" className="db-inline-flex-items-center-1h04382">
                <ArrowLeft className="db-h-3-w-3-1s0lck6" /> Voltar ao início
              </Link>
            </div>
          </header>
        )}

        <section className={embedded ? "db-min-w-0-flex-1-1pl9mdh" : "db-w-full-px-6-5ebeye"}>
          <div className="db-flex-flex-wrap-qlnoif">
            <div>
              <p className="db-text-9px-font-bold-ukmi15">TABELA SELECIONADA</p>
              <h1 className="db-mt-1-flex-590iju">
                <Table2 className="db-h-5-w-5-36nguv" />{" "}
                {selectedTable === "usuarios"
                  ? "Usuários"
                  : selectedTable === "avaliacoes"
                    ? "Avaliações"
                    : selectedTable === "plataformas"
                      ? "Plataformas"
                      : selectedJsonTable?.title ?? "Tabela JSON"}
              </h1>
              <p className="db-mt-1-text-11px-fgeh1h">
                {selectedTable === "usuarios"
                  ? "Registros da tabela Usuários. Edite os campos na linha e salve as alterações."
                  : selectedTable === "avaliacoes"
                    ? "Registros da tabela Avaliações. Edite as avaliações ou adicione respostas administrativas oficiais."
                    : selectedTable === "plataformas"
                      ? "Registros do arquivo conect-plataform.json."
                      : selectedJsonTable?.description ?? "Registros do arquivo JSON selecionado."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedTable === "usuarios") void loadUsers();
                else if (selectedTable === "avaliacoes") void loadReviews();
                else if (selectedTable === "plataformas") void loadPlatforms();
                else if (selectedTable.startsWith("json:")) void loadJsonTable(selectedTable.slice(5));
              }}
              disabled={loading || deleting}
              className="db-inline-flex-items-center-39j1c2"
            >
              <RefreshCw
                className={`db-h-3-w-3-1s0lck6 ${loading ? "db-animate-spin-1steumz" : ""}`}
              />{" "}
              Atualizar
            </button>
          </div>

          {message && (
            <p role="status" className="db-mt-5-rounded-xl-3ntd3c">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="db-mt-5-rounded-xl-13l52ky">
              {error}
            </p>
          )}

          {selectedTable === "usuarios" ? (
            <div className="db-mt-3-overflow-hidden-1sbx6fp">
              <div className="db-overflow-x-auto-1ytsssi">
                <table className="db-w-full-min-w-0-ldzfuq">
                  <thead className="db-border-b-border-white-10-1134gff">
                    <tr>
                      <th className="db-w-13-break-words-1g87fub">ID</th>
                      <th className="db-px-2-5-py-2-4bicug">Usuário</th>
                      <th className="db-px-2-5-py-2-4bicug">Role</th>
                      <th className="db-px-2-5-py-2-4bicug">Imagem (URL)</th>
                      <th className="db-px-2-5-py-2-4bicug">Criado em</th>
                      <th className="db-px-2-5-py-2-4bicug">Atualizado em</th>
                      <th className="db-px-2-5-py-2-4bicug">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="db-divide-y-divide-white-0--11j827l">
                    {loading && users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="db-px-4-py-10-sxzx56">
                          Carregando registros…
                        </td>
                      </tr>
                    )}
                    {!loading && users.length === 0 && !error && (
                      <tr>
                        <td colSpan={7} className="db-px-4-py-10-sxzx56">
                          A tabela ainda não possui registros.
                        </td>
                      </tr>
                    )}
                    {users.map((row) => {
                      const editing = editingId === row.user_id && draft !== null;
                      return (
                        <tr key={row.user_id} className="db-bg-white-0-02-lcbolw">
                          <td className="db-max-w-44-px-2-5-1uhmtbx" title={row.user_id}>
                            {displayValue(row.user_id)}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={draft.user}
                                onChange={(event) =>
                                  setDraft({ ...draft, user: event.target.value })
                                }
                                minLength={3}
                                maxLength={32}
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="Nome de usuário"
                              />
                            ) : (
                              <span
                                className="db-font-semibold-text-white-19kgctp"
                                title={row.user}
                              >
                                {displayValue(row.user)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <select
                                value={draft.role}
                                onChange={(event) =>
                                  setDraft({ ...draft, role: event.target.value })
                                }
                                className="db-w-full-min-w-0-133veqv"
                                aria-label="Role"
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span
                                className="db-rounded-md-bg-white-0-06-sgt1ga"
                                title={row.role ?? "—"}
                              >
                                {displayValue(row.role)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={draft.imagen}
                                onChange={(event) =>
                                  setDraft({ ...draft, imagen: event.target.value })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                placeholder="URL opcional"
                                aria-label="URL da imagem"
                              />
                            ) : (
                              <span
                                className="db-break-all-text-9px-ol3zkz"
                                title={row.imagen || "—"}
                              >
                                {displayValue(row.imagen)}
                              </span>
                            )}
                          </td>
                          <td
                            className="db-whitespace-nowrap-px-2-5-8kbajn"
                            title={formatDate(row.data_criacao)}
                          >
                            {displayValue(formatDate(row.data_criacao))}
                          </td>
                          <td
                            className="db-whitespace-nowrap-px-2-5-8kbajn"
                            title={formatDate(row.data_atualizacao)}
                          >
                            {displayValue(formatDate(row.data_atualizacao))}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <div className="db-flex-flex-wrap-1k8awxs">
                                <button
                                  type="button"
                                  onClick={() => void saveRow(row.user_id)}
                                  disabled={saving}
                                  className="db-inline-flex-max-w-full-108qdn7"
                                >
                                  <Save className="db-h-3-5-w-3-5-mho9dy" />{" "}
                                  {saving ? "Salvando" : "Salvar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setDraft(null);
                                  }}
                                  disabled={saving}
                                  className="db-rounded-lg-border-ffggg6"
                                  aria-label="Cancelar edição"
                                >
                                  <X className="db-h-4-w-4-3ulyf2" />
                                </button>
                              </div>
                            ) : (
                              <div className="db-flex-flex-wrap-agiabx">
                                <button
                                  type="button"
                                  onClick={() => startEditing(row)}
                                  disabled={deleting}
                                  className="db-inline-flex-max-w-full-1710mde"
                                >
                                  <Pencil className="db-h-3-5-w-3-5-mho9dy" /> Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessage("");
                                    setError("");
                                    setUserToDelete(row);
                                  }}
                                  disabled={deleting}
                                  className="db-inline-flex-max-w-full-13vi12l"
                                  title={`Excluir usuário ${row.user}`}
                                >
                                  <Trash2 className="db-h-3-5-w-3-5-mho9dy" /> Excluir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedTable === "avaliacoes" ? (
            <div className="db-mt-3-overflow-hidden-1sbx6fp">
              <div className="db-overflow-x-auto-1ytsssi">
                <table className="db-w-full-min-w-0-ldzfuq">
                  <thead className="db-border-b-border-white-10-1134gff">
                    <tr>
                      <th className="db-w-13-break-words-1g87fub">ID</th>
                      <th className="db-px-2-5-py-2-4bicug">Nota</th>
                      <th className="db-px-2-5-py-2-4bicug">Nome</th>
                      <th className="db-px-2-5-py-2-4bicug">Mensagem</th>
                      <th className="db-px-2-5-py-2-4bicug">Resposta Admin</th>
                      <th className="db-px-2-5-py-2-4bicug">Respondido por</th>
                      <th className="db-px-2-5-py-2-4bicug">Criado em</th>
                      <th className="db-px-2-5-py-2-4bicug">Atualizado em</th>
                      <th className="db-px-2-5-py-2-4bicug">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="db-divide-y-divide-white-0--11j827l">
                    {loading && reviews.length === 0 && (
                      <tr>
                        <td colSpan={9} className="db-px-4-py-10-sxzx56">
                          Carregando avaliações…
                        </td>
                      </tr>
                    )}
                    {!loading && reviews.length === 0 && !error && (
                      <tr>
                        <td colSpan={9} className="db-px-4-py-10-sxzx56">
                          A tabela ainda não possui avaliações.
                        </td>
                      </tr>
                    )}
                    {reviews.map((row) => {
                      const editing = reviewEditingId === row.avaliacao_id && reviewDraft !== null;
                      return (
                        <tr key={row.avaliacao_id} className="db-bg-white-0-02-lcbolw">
                          <td className="db-max-w-44-px-2-5-1uhmtbx" title={row.avaliacao_id}>
                            {displayValue(row.avaliacao_id)}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <select
                                value={reviewDraft.nota}
                                onChange={(e) =>
                                  setReviewDraft({ ...reviewDraft, nota: Number(e.target.value) })
                                }
                                className="db-w-full-min-w-0-133veqv"
                                aria-label="Nota"
                              >
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {n} ⭐
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="db-font-semibold-text-white-19kgctp">
                                {row.nota} ⭐
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={reviewDraft.nome}
                                onChange={(e) =>
                                  setReviewDraft({ ...reviewDraft, nome: e.target.value })
                                }
                                maxLength={100}
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="Nome"
                              />
                            ) : (
                              <span
                                className="db-font-semibold-text-white-19kgctp"
                                title={row.nome}
                              >
                                {displayValue(row.nome)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md" title={row.mensagem}>
                            {editing ? (
                              <textarea
                                value={reviewDraft.mensagem}
                                onChange={(e) =>
                                  setReviewDraft({ ...reviewDraft, mensagem: e.target.value })
                                }
                                maxLength={1000}
                                rows={2}
                                className="db-w-full-min-w-0-1o9jto resize-none"
                                aria-label="Mensagem"
                              />
                            ) : (
                              <span className="db-text-xs-text-slate-300" title={row.mensagem}>
                                {displayValue(row.mensagem)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md" title={row.resposta_admin || ""}>
                            {editing ? (
                              <textarea
                                value={reviewDraft.resposta_admin}
                                onChange={(e) =>
                                  setReviewDraft({ ...reviewDraft, resposta_admin: e.target.value })
                                }
                                maxLength={1000}
                                rows={2}
                                placeholder="Escrever resposta oficial..."
                                className="db-w-full-min-w-0-1o9jto resize-none"
                                aria-label="Resposta do Administrador"
                              />
                            ) : (
                              <span
                                className="db-text-xs-text-cyan-300"
                                title={row.resposta_admin || "Sem resposta"}
                              >
                                {displayValue(row.resposta_admin)}
                              </span>
                            )}
                          </td>
                          <td
                            className="db-whitespace-nowrap-px-2-5-8kbajn"
                            title={row.respondido_por || "—"}
                          >
                            {displayValue(row.respondido_por)}
                          </td>
                          <td
                            className="db-whitespace-nowrap-px-2-5-8kbajn"
                            title={formatDate(row.data_criacao)}
                          >
                            {displayValue(formatDate(row.data_criacao))}
                          </td>
                          <td
                            className="db-whitespace-nowrap-px-2-5-8kbajn"
                            title={formatDate(row.data_atualizacao)}
                          >
                            {displayValue(formatDate(row.data_atualizacao))}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <div className="db-flex-flex-wrap-1k8awxs">
                                <button
                                  type="button"
                                  onClick={() => void saveReview(row.avaliacao_id)}
                                  disabled={saving}
                                  className="db-inline-flex-max-w-full-108qdn7"
                                >
                                  <Save className="db-h-3-5-w-3-5-mho9dy" />{" "}
                                  {saving ? "Salvando" : "Salvar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewEditingId(null);
                                    setReviewDraft(null);
                                  }}
                                  disabled={saving}
                                  className="db-rounded-lg-border-ffggg6"
                                  aria-label="Cancelar edição"
                                >
                                  <X className="db-h-4-w-4-3ulyf2" />
                                </button>
                              </div>
                            ) : (
                              <div className="db-flex-flex-wrap-agiabx">
                                <button
                                  type="button"
                                  onClick={() => startEditingReview(row)}
                                  disabled={deleting}
                                  className="db-inline-flex-max-w-full-1710mde"
                                >
                                  <Pencil className="db-h-3-5-w-3-5-mho9dy" /> Responder / Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessage("");
                                    setError("");
                                    setReviewToDelete(row);
                                  }}
                                  disabled={deleting}
                                  className="db-inline-flex-max-w-full-13vi12l"
                                  title={`Excluir avaliação de ${row.nome}`}
                                >
                                  <Trash2 className="db-h-3-5-w-3-5-mho9dy" /> Excluir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedTable.startsWith("json:") ? (
            <div className="db-mt-3-overflow-hidden-1sbx6fp">
              {genericRows.length > 0 && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <label className="block text-xs text-slate-300">
                    Novo registro JSON
                    <textarea
                      value={genericNewJson}
                      onChange={(event) => setGenericNewJson(event.target.value)}
                      rows={5}
                      spellCheck={false}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-white"
                      aria-label="Novo registro JSON"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void createGenericRow()}
                    disabled={saving || deleting}
                    className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Salvando…" : "Adicionar registro"}
                  </button>
                  {selectedJsonTable?.id && ["biblioteca", "cenarios", "metricas", "overlays", "rtc_registry"].includes(selectedJsonTable.id) && (
                    <p className="mt-2 text-[10px] text-slate-400">
                      Esta tabela exige um <code>user_id</code> que exista em usuario.json. O servidor valida esse vínculo antes de gravar.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-0 border-collapse text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/5 text-slate-300">
                    <tr>
                      {genericColumns.map((field) => (
                        <th key={field} className="px-3 py-2 font-medium">{jsonColumnLabel(field)}</th>
                      ))}
                      <th className="px-3 py-2 font-medium">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading && genericRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-10 text-center text-slate-500" colSpan={genericColumns.length + 1}>
                          Carregando registros…
                        </td>
                      </tr>
                    )}
                    {!loading && genericRows.length === 0 && !error && (
                      <tr>
                        <td className="px-4 py-10 text-center text-slate-500" colSpan={genericColumns.length + 1}>
                          Esta tabela ainda não possui registros.
                        </td>
                      </tr>
                    )}
                    {genericRows.map((row) => {
                      const rowIsEditing = genericEditingKey === row.__rowKey;
                      return (
                        <tr key={row.__rowKey}>
                          {rowIsEditing ? (
                            <td colSpan={genericColumns.length + 1} className="p-3">
                              <textarea
                                value={genericDraft}
                                onChange={(event) => setGenericDraft(event.target.value)}
                                rows={8}
                                spellCheck={false}
                                className="w-full rounded-lg border border-violet-400/30 bg-black/50 p-3 font-mono text-xs text-white"
                                aria-label="Editar registro JSON"
                              />
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveGenericRow(row.__rowKey)}
                                  disabled={saving || deleting}
                                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  <Save size={13} />Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setGenericEditingKey(null); setGenericDraft(""); }}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"
                                >
                                  <X size={13} />Cancelar
                                </button>
                              </div>
                            </td>
                          ) : (
                            <>
                              {genericColumns.map((field) => (
                                <td
                                  key={field}
                                  className="max-w-64 break-words px-3 py-2 align-top text-slate-300"
                                  title={typeof row[field] === "string" ? row[field] as string : JSON.stringify(row[field] ?? "")}
                                >
                                  {jsonCellValue(row[field])}
                                </td>
                              ))}
                              <td className="whitespace-nowrap px-3 py-2 align-top">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = Object.fromEntries(Object.entries(row).filter(([key]) => key !== "__rowKey"));
                                      setGenericEditingKey(row.__rowKey);
                                      setGenericDraft(JSON.stringify(copy, null, 2));
                                    }}
                                    disabled={saving || deleting}
                                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-200"
                                  >
                                    <Pencil size={12} />Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteGenericRow(row.__rowKey)}
                                    disabled={saving || deleting}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-2 py-1 text-[10px] text-red-300"
                                  >
                                    <Trash2 size={12} />Excluir
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {!loading && genericRows.length === 0 && error && (
                      <tr>
                        <td className="px-4 py-10 text-center text-red-300" colSpan={genericColumns.length + 1}>
                          Não foi possível carregar os registros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="db-mt-3-overflow-hidden-1sbx6fp">
              <div className="db-overflow-x-auto-1ytsssi">
                <table className="db-w-full-min-w-0-ldzfuq">
                  <thead className="db-border-b-border-white-10-1134gff">
                    <tr>
                      <th className="db-w-13-break-words-1g87fub">ID</th>
                      <th className="db-px-2-5-py-2-4bicug">User ID</th>
                      <th className="db-px-2-5-py-2-4bicug">YouTube</th>
                      <th className="db-px-2-5-py-2-4bicug">YT Status</th>
                      <th className="db-px-2-5-py-2-4bicug">Twitch</th>
                      <th className="db-px-2-5-py-2-4bicug">Twitch Status</th>
                      <th className="db-px-2-5-py-2-4bicug">Kick</th>
                      <th className="db-px-2-5-py-2-4bicug">Kick Status</th>
                      <th className="db-px-2-5-py-2-4bicug">Verificado em</th>
                      <th className="db-px-2-5-py-2-4bicug">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="db-divide-y-divide-white-0--11j827l">
                    {loading && platforms.length === 0 && (
                      <tr>
                        <td colSpan={10} className="db-px-4-py-10-sxzx56">
                          Carregando plataformas…
                        </td>
                      </tr>
                    )}
                    {!loading && platforms.length === 0 && !error && (
                      <tr>
                        <td colSpan={10} className="db-px-4-py-10-sxzx56">
                          A tabela ainda não possui plataformas conectadas.
                        </td>
                      </tr>
                    )}
                    {platforms.map((row) => {
                      const editing = platformEditingId === row.id && platformDraft !== null;
                      return (
                        <tr key={row.id} className="db-bg-white-0-02-lcbolw">
                          <td className="db-max-w-44-px-2-5-1uhmtbx" title={row.id}>
                            {displayValue(row.id)}
                          </td>
                          <td className="db-max-w-44-px-2-5-1uhmtbx" title={row.user_id}>
                            {displayValue(row.user_id)}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={platformDraft.youtube}
                                onChange={(e) =>
                                  setPlatformDraft({ ...platformDraft, youtube: e.target.value })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="YouTube channel"
                              />
                            ) : (
                              <span
                                className="db-font-semibold-text-white-19kgctp"
                                title={row.youtube || ""}
                              >
                                {displayValue(row.youtube)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={platformDraft.youtube_status}
                                onChange={(e) =>
                                  setPlatformDraft({
                                    ...platformDraft,
                                    youtube_status: e.target.value,
                                  })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="YouTube status"
                              />
                            ) : (
                              <span
                                className="db-rounded-md-bg-white-0-06-sgt1ga"
                                title={row.youtube_status || ""}
                              >
                                {displayValue(row.youtube_status)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={platformDraft.twitch}
                                onChange={(e) =>
                                  setPlatformDraft({ ...platformDraft, twitch: e.target.value })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="Twitch channel"
                              />
                            ) : (
                              <span
                                className="db-font-semibold-text-white-19kgctp"
                                title={row.twitch || ""}
                              >
                                {displayValue(row.twitch)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={platformDraft.twitch_status}
                                onChange={(e) =>
                                  setPlatformDraft({
                                    ...platformDraft,
                                    twitch_status: e.target.value,
                                  })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="Twitch status"
                              />
                            ) : (
                              <span
                                className="db-rounded-md-bg-white-0-06-sgt1ga"
                                title={row.twitch_status || ""}
                              >
                                {displayValue(row.twitch_status)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={platformDraft.kick}
                                onChange={(e) =>
                                  setPlatformDraft({ ...platformDraft, kick: e.target.value })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="Kick channel"
                              />
                            ) : (
                              <span
                                className="db-font-semibold-text-white-19kgctp"
                                title={row.kick || ""}
                              >
                                {displayValue(row.kick)}
                              </span>
                            )}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <input
                                value={platformDraft.kick_status}
                                onChange={(e) =>
                                  setPlatformDraft({
                                    ...platformDraft,
                                    kick_status: e.target.value,
                                  })
                                }
                                className="db-w-full-min-w-0-1o9jto"
                                aria-label="Kick status"
                              />
                            ) : (
                              <span
                                className="db-rounded-md-bg-white-0-06-sgt1ga"
                                title={row.kick_status || ""}
                              >
                                {displayValue(row.kick_status)}
                              </span>
                            )}
                          </td>
                          <td
                            className="db-whitespace-nowrap-px-2-5-8kbajn"
                            title={formatDate(row.verifiedAt || undefined)}
                          >
                            {displayValue(formatDate(row.verifiedAt || undefined))}
                          </td>
                          <td className="db-px-2-5-py-2-1not5md">
                            {editing ? (
                              <div className="db-flex-flex-wrap-1k8awxs">
                                <button
                                  type="button"
                                  onClick={() => void savePlatform(row)}
                                  disabled={saving}
                                  className="db-inline-flex-max-w-full-108qdn7"
                                >
                                  <Save className="db-h-3-5-w-3-5-mho9dy" />{" "}
                                  {saving ? "Salvando" : "Salvar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlatformEditingId(null);
                                    setPlatformDraft(null);
                                  }}
                                  disabled={saving}
                                  className="db-rounded-lg-border-ffggg6"
                                  aria-label="Cancelar edição"
                                >
                                  <X className="db-h-4-w-4-3ulyf2" />
                                </button>
                              </div>
                            ) : (
                              <div className="db-flex-flex-wrap-agiabx">
                                <button
                                  type="button"
                                  onClick={() => startEditingPlatform(row)}
                                  disabled={deleting}
                                  className="db-inline-flex-max-w-full-1710mde"
                                >
                                  <Pencil className="db-h-3-5-w-3-5-mho9dy" /> Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessage("");
                                    setError("");
                                    setPlatformToDelete(row);
                                  }}
                                  disabled={deleting}
                                  className="db-inline-flex-max-w-full-13vi12l"
                                  title="Excluir plataforma"
                                >
                                  <Trash2 className="db-h-3-5-w-3-5-mho9dy" /> Excluir
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="db-mt-2-text-10px-15p4c0e">
            As alterações são gravadas no arquivo JSON pelo servidor.
          </p>

          {userToDelete && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              className="db-fixed-inset-0-cet2d5"
            >
              <div className="db-w-full-max-w-md-9gxz7l">
                <div className="db-flex-items-center-1bpln9w">
                  <span className="db-flex-h-10-s20i5t">
                    <Trash2 className="db-h-5-w-5-sv0uoi" />
                  </span>
                  <div>
                    <h2 id="delete-dialog-title" className="db-text-base-font-bold-1au4nai">
                      Confirmar exclusão
                    </h2>
                    <p className="db-text-xs-text-slate-400-1qmab5e">
                      Esta ação não poderá ser desfeita.
                    </p>
                  </div>
                </div>
                <p className="db-mt-4-text-xs-1p2vnyp">
                  Deseja realmente excluir o usuário{" "}
                  <strong className="db-font-semibold-text-white-19kgctp">
                    "{userToDelete.user}"
                  </strong>{" "}
                  (ID:{" "}
                  <span className="db-font-mono-text-slate-400-2q6jsq">{userToDelete.user_id}</span>
                  )? O registro será removido permanentemente do arquivo JSON.
                </p>
                <div className="db-mt-6-flex-t4d3go">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    disabled={deleting}
                    className="db-rounded-lg-border-8ndnc"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete(userToDelete.user_id)}
                    disabled={deleting}
                    className="db-inline-flex-items-center-i4nxas"
                  >
                    {deleting ? (
                      <>
                        <RefreshCw className="db-h-3-5-w-3-5-172mrj8" /> Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="db-h-3-5-w-3-5-mho9dy" /> Excluir usuário
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {reviewToDelete && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-review-title"
              className="db-fixed-inset-0-cet2d5"
            >
              <div className="db-w-full-max-w-md-9gxz7l">
                <div className="db-flex-items-center-1bpln9w">
                  <span className="db-flex-h-10-s20i5t">
                    <Trash2 className="db-h-5-w-5-sv0uoi" />
                  </span>
                  <div>
                    <h2 id="delete-review-title" className="db-text-base-font-bold-1au4nai">
                      Confirmar exclusão de avaliação
                    </h2>
                    <p className="db-text-xs-text-slate-400-1qmab5e">
                      Esta ação não poderá ser desfeita.
                    </p>
                  </div>
                </div>
                <p className="db-mt-4-text-xs-1p2vnyp">
                  Deseja realmente excluir a avaliação de{" "}
                  <strong className="db-font-semibold-text-white-19kgctp">
                    "{reviewToDelete.nome}"
                  </strong>{" "}
                  (ID:{" "}
                  <span className="db-font-mono-text-slate-400-2q6jsq">
                    {reviewToDelete.avaliacao_id}
                  </span>
                  )? O registro será removido permanentemente do arquivo JSON.
                </p>
                <div className="db-mt-6-flex-t4d3go">
                  <button
                    type="button"
                    onClick={() => setReviewToDelete(null)}
                    disabled={deleting}
                    className="db-rounded-lg-border-8ndnc"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDeleteReview(reviewToDelete.avaliacao_id)}
                    disabled={deleting}
                    className="db-inline-flex-items-center-i4nxas"
                  >
                    {deleting ? (
                      <>
                        <RefreshCw className="db-h-3-5-w-3-5-172mrj8" /> Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="db-h-3-5-w-3-5-mho9dy" /> Excluir avaliação
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {platformToDelete && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-platform-title"
              className="db-fixed-inset-0-cet2d5"
            >
              <div className="db-w-full-max-w-md-9gxz7l">
                <div className="db-flex-items-center-1bpln9w">
                  <span className="db-flex-h-10-s20i5t">
                    <Trash2 className="db-h-5-w-5-sv0uoi" />
                  </span>
                  <div>
                    <h2 id="delete-platform-title" className="db-text-base-font-bold-1au4nai">
                      Confirmar exclusão de plataforma
                    </h2>
                    <p className="db-text-xs-text-slate-400-1qmab5e">
                      Esta ação não poderá ser desfeita.
                    </p>
                  </div>
                </div>
                <p className="db-mt-4-text-xs-1p2vnyp">
                  Deseja realmente excluir as conexões de plataforma do usuário (ID:{" "}
                  <span className="db-font-mono-text-slate-400-2q6jsq">
                    {platformToDelete.user_id}
                  </span>
                  )? O registro será removido permanentemente do arquivo JSON conect-plataform.json.
                </p>
                <div className="db-mt-6-flex-t4d3go">
                  <button
                    type="button"
                    onClick={() => setPlatformToDelete(null)}
                    disabled={deleting}
                    className="db-rounded-lg-border-8ndnc"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDeletePlatform(platformToDelete.user_id)}
                    disabled={deleting}
                    className="db-inline-flex-items-center-i4nxas"
                  >
                    {deleting ? (
                      <>
                        <RefreshCw className="db-h-3-5-w-3-5-172mrj8" /> Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="db-h-3-5-w-3-5-mho9dy" /> Excluir plataforma
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
