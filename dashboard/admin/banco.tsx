/* BLOCO 1 — Imports de rota, ícones e estados da tabela JSON. */
import { createFileRoute, Link } from "@tanstack/react-router";
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

/* BLOCO 2 — Registra a rota da tabela administrativa. */
export const Route = createFileRoute("/admin/banco")({ component: DatabasePage });

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

/* BLOCO 5 — Controla seleção de tabelas, registros, edição, exclusão e carregamento. */
export default function DatabasePage({ embedded = false }: { embedded?: boolean } = {}) {
  const [selectedTable, setSelectedTable] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("livenexus_selected_table") || "usuarios";
    }
    return "usuarios";
  });
  const [isAdmin, setIsAdmin] = useState(embedded);

  function handleSelectTable(table: string) {
    setSelectedTable(table);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("livenexus_selected_table", table);
    }
    if (table === "usuarios") void loadUsers();
    else if (table === "avaliacoes") void loadReviews();
  }

  const [users, setUsers] = useState<UserRow[]>([]);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [reviewEditingId, setReviewEditingId] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        <nav className="db-p-2-178lum4 space-y-1">
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
                {selectedTable === "usuarios" ? "Usuários" : "Avaliações"}
              </h1>
              <p className="db-mt-1-text-11px-fgeh1h">
                {selectedTable === "usuarios"
                  ? "Registros da tabela Usuários. Edite os campos na linha e salve as alterações."
                  : "Registros da tabela Avaliações. Edite as avaliações ou adicione respostas administrativas oficiais."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedTable === "usuarios") void loadUsers();
                else void loadReviews();
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
          ) : (
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
        </section>
      </main>
    </div>
  );
}
