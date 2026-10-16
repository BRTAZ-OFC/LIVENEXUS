import { createFileRoute, Link } from "@tanstack/react-router";
import { AudioLines, ArrowLeft, Database, Pencil, RefreshCw, Save, X, House, ChevronRight, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard/banco")({ component: DatabasePage });

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

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  return text.length > 10 ? `${text.slice(0, 10)}…` : text;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function DatabasePage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/database/users");
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Falha ao carregar a tabela.");
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a tabela.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

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

  async function saveRow(userId: string) {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/database/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      setUsers((current) => current.map((row) => row.user_id === userId ? result.user : row));
      setEditingId(null);
      setDraft(null);
      setMessage("Registro atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#080a13] text-slate-100">
      <aside className={`flex min-h-screen shrink-0 flex-col border-r border-white/10 bg-[#0b0e19] transition-[width] duration-200 ${sidebarExpanded ? "w-52" : "w-16"}`}>
        <div className="flex h-[73px] items-center justify-center border-b border-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <AudioLines className="h-5 w-5 text-white" />
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-2 p-2 pt-4">
          <Link to="/dashboard" title="Início" aria-label="Início" className={`flex h-11 items-center rounded-lg text-slate-300 transition hover:bg-white/5 hover:text-white ${sidebarExpanded ? "gap-3 px-3" : "justify-center"}`}>
            <House className="h-5 w-5 shrink-0" />{sidebarExpanded && <span className="text-sm font-semibold">Início</span>}
          </Link>
          <Link to="/dashboard/banco" title="Banco de dados" aria-label="Banco de dados" className={`flex h-11 items-center rounded-lg bg-violet-500/15 text-violet-200 transition hover:bg-white/5 ${sidebarExpanded ? "gap-3 px-3" : "justify-center"}`}>
            <Database className="h-5 w-5 shrink-0" />{sidebarExpanded && <span className="text-sm font-semibold">Banco de dados</span>}
          </Link>
        </nav>
        <button type="button" onClick={() => setSidebarExpanded((expanded) => !expanded)} aria-label={sidebarExpanded ? "Recolher menu" : "Estender menu"} title={sidebarExpanded ? "Recolher menu" : "Estender menu"} className="m-2 flex h-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
          {sidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </aside>
      <main className="min-w-0 flex-1">
      <header className="border-b border-white/10 bg-[#0d1120]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
              <AudioLines className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-extrabold text-white">
              LIVE<span className="text-cyan-300">NEXUS</span>
            </span>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Administração de dados</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
              <Database className="h-8 w-8 text-cyan-300" /> Banco de dados
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Tabela de usuários carregada do arquivo JSON armazenado em admin/banco/json/usuario.json.
              Edite os campos diretamente na linha e salve as alterações.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/10 bg-[#0d1120] px-5 py-4">
            <p className="text-xs text-slate-400">Registros na tabela</p>
            <p className="mt-1 text-2xl font-bold text-white">{users.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0d1120] px-5 py-4">
            <p className="text-xs text-slate-400">Arquivo de origem</p>
            <p className="mt-1 text-sm font-semibold text-cyan-200">usuario.json</p>
          </div>
        </div>

        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3 text-sm text-emerald-200">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">{error}</p>}

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1120]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-4 font-semibold">ID</th>
                  <th className="px-4 py-4 font-semibold">Usuário</th>
                  <th className="px-4 py-4 font-semibold">Role</th>
                  <th className="px-4 py-4 font-semibold">Imagem (URL)</th>
                  <th className="px-4 py-4 font-semibold">Criado em</th>
                  <th className="px-4 py-4 font-semibold">Atualizado em</th>
                  <th className="px-4 py-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {loading && users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Carregando registros…</td></tr>
                )}
                {!loading && users.length === 0 && !error && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">A tabela ainda não possui registros.</td></tr>
                )}
                {users.map((row) => {
                  const editing = editingId === row.user_id && draft !== null;
                  return (
                    <tr key={row.user_id} className="align-top hover:bg-white/[0.02]">
                      <td className="max-w-44 px-4 py-4 font-mono text-xs text-slate-500" title={row.user_id}>{displayValue(row.user_id)}</td>
                      <td className="px-4 py-4">
                        {editing ? (
                          <input value={draft.user} onChange={(event) => setDraft({ ...draft, user: event.target.value })} minLength={3} maxLength={32} className="w-40 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" aria-label="Nome de usuário" />
                        ) : <span className="font-semibold text-white" title={row.user}>{displayValue(row.user)}</span>}
                      </td>
                      <td className="px-4 py-4">
                        {editing ? (
                          <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="rounded-lg border border-white/15 bg-[#101525] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" aria-label="Role">
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-slate-300" title={row.role ?? "—"}>{displayValue(row.role)}</span>}
                      </td>
                      <td className="px-4 py-4">
                        {editing ? (
                          <input value={draft.imagen} onChange={(event) => setDraft({ ...draft, imagen: event.target.value })} className="w-48 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" placeholder="URL opcional" aria-label="URL da imagem" />
                        ) : <span className="max-w-48 text-slate-400" title={row.imagen || "—"}>{displayValue(row.imagen)}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-400" title={formatDate(row.data_criacao)}>{displayValue(formatDate(row.data_criacao))}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-400" title={formatDate(row.data_atualizacao)}>{displayValue(formatDate(row.data_atualizacao))}</td>
                      <td className="px-4 py-4">
                        {editing ? (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => void saveRow(row.user_id)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50">
                              <Save className="h-3.5 w-3.5" /> {saving ? "Salvando" : "Salvar"}
                            </button>
                            <button type="button" onClick={() => { setEditingId(null); setDraft(null); }} disabled={saving} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Cancelar edição">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => startEditing(row)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-violet-400/40 hover:text-white">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Senhas e hashes não são exibidos na tabela. As alterações são gravadas no arquivo JSON pelo servidor.
        </p>
      </section>
      </main>
    </div>
  );
}
