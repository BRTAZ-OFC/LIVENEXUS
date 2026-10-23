/* LIVENEXUS: Explica a tela que mostra e permite administrar tabelas de dados. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";

type JsonRow = Record<string, unknown> & { __rowKey: string };
type JsonUser = { user_id: string; user: string };

type Props = {
  tableId: string;
  title: string;
  refreshKey?: number;
};

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = sessionStorage.getItem("livenexus_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function fieldTitle(key: string) {
  const labels: Record<string, string> = {
    user_id: "ID do usuário",
    rtcId: "ID RTC",
    id: "ID",
    expiresAt: "Expira em",
    created_at: "Criado em",
    created_date: "Criado em",
    updated_at: "Atualizado em",
    updated_date: "Atualizado em",
    original_name: "Nome original",
    local_path: "Caminho local",
    uploadedAt: "Enviado em",
    data: "Dados",
    code: "Código",
    url: "URL",
  };
  return (
    labels[key] ||
    key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (c) => c.toUpperCase())
  );
}

function cellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 10 ? `${text.slice(0, 10)}…` : text;
}

function emptyRecord(tableId: string, userId: string) {
  if (tableId === "biblioteca")
    return { user_id: userId, songs: [], albums: [], artists: [], playlists: [] };
  if (tableId === "rtc_registry")
    return {
      user_id: userId,
      rtcId: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  if (tableId === "cenarios" || tableId === "metricas" || tableId === "overlays")
    return { user_id: userId, name: "", data: {} };
  if (tableId === "auth_activation")
    return { email: "", code: "", expiresAt: "", created_at: new Date().toISOString() };
  if (tableId === "schemas") return { id: "", name: "", fields: [] };
  if (tableId === "image_store") return { filename: "", user_id: "", data: "", source: "admin" };
  if (tableId === "galeria")
    return {
      id: "",
      user_id: "",
      filename: "",
      url: "",
      size: 0,
      uploadedAt: new Date().toISOString(),
    };
  if (tableId === "messages")
    return { name: "", email: "", category: "Sugestão", message: "", status: "novo" };
  if (tableId === "templates")
    return {
      id: "",
      name: "",
      originalName: "",
      localPath: "",
      url: "",
      format: "PNG",
      category: "other",
    };
  return {};
}

export default function JSONTablesPanel({ tableId, title, refreshKey = 0 }: Props) {
  const [rows, setRows] = useState<JsonRow[]>([]);
  const [users, setUsers] = useState<JsonUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingRowKey, setEditingRowKey] = useState("");
  const [recordText, setRecordText] = useState("{}");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(tableId)}`, {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível carregar esta tabela JSON.");
      }
      setRows(Array.isArray(data.rows) ? (data.rows as JsonRow[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar os registros.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const response = await fetch("/api/database/users", {
          headers: authHeaders(),
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (response.ok && data.ok && Array.isArray(data.users) && !cancelled) {
          setUsers(
            data.users.filter((row: unknown): row is JsonUser =>
              Boolean(
                row &&
                typeof row === "object" &&
                typeof (row as JsonUser).user_id === "string" &&
                typeof (row as JsonUser).user === "string",
              ),
            ),
          );
        }
      } catch {
        // The generic table remains readable when there are no selectable users.
      }
    }
    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows, refreshKey]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) =>
      Object.keys(row)
        .filter((key) => key !== "__rowKey")
        .forEach((key) => keys.add(key)),
    );
    return [...keys].slice(0, 6);
  }, [rows]);

  function startCreate() {
    const ownerUserId = users[0]?.user_id || "";
    setRecordText(JSON.stringify(emptyRecord(tableId, ownerUserId), null, 2));
    setEditingRowKey("");
    setEditorMode("create");
    setError("");
    setNotice("");
  }

  function startEdit(row: JsonRow) {
    const { __rowKey, ...record } = row;
    setRecordText(JSON.stringify(record, null, 2));
    setEditingRowKey(__rowKey);
    setEditorMode("edit");
    setError("");
    setNotice("");
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(recordText);
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("Informe um objeto JSON válido.");
      }
      delete record["__rowKey"];
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON inválido.");
      return;
    }

    setBusy(true);
    try {
      const isEditing = editorMode === "edit";
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(tableId)}`, {
        method: isEditing ? "PATCH" : "POST",
        headers: authHeaders(true),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(isEditing ? { rowKey: editingRowKey, record } : { record }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.message || "Não foi possível salvar o registro.");
      setEditorMode(null);
      setNotice(isEditing ? "Registro atualizado." : "Registro criado.");
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar o registro.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord(row: JsonRow) {
    const id = String(row.__rowKey || "");
    if (
      !id ||
      !window.confirm("Deseja excluir este registro JSON? Esta ação não pode ser desfeita.")
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/database/json-tables/${encodeURIComponent(tableId)}`, {
        method: "DELETE",
        headers: authHeaders(true),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ rowKey: id }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.message || "Não foi possível excluir o registro.");
      setNotice("Registro excluído.");
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir o registro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
            TABELA JSON
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">
            Registros do arquivo JSON associado a esta tabela.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadRows()}
            disabled={loading || busy}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            type="button"
            onClick={startCreate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Plus size={13} /> Novo registro
          </button>
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="border-b border-white/10 bg-white/[0.03] text-slate-400">
            <tr>
              {(columns.length ? columns : ["Registro"]).map((column) => (
                <th key={column} className="px-2 py-3 font-semibold break-words">
                  {fieldTitle(column)}
                </th>
              ))}
              <th className="w-28 px-2 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={(columns.length || 1) + 1}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Carregando registros…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={(columns.length || 1) + 1}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Esta tabela ainda não possui registros.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.__rowKey} className="align-top">
                {(columns.length ? columns : ["Registro"]).map((column) => {
                  const value = column === "Registro" ? row.__rowKey : row[column];
                  const text = cellValue(value);
                  return (
                    <td
                      key={column}
                      className="max-w-0 px-2 py-3 text-slate-200"
                      title={
                        typeof value === "object" ? JSON.stringify(value) : String(value ?? "")
                      }
                    >
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                        {text}
                      </span>
                    </td>
                  );
                })}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Editar"
                      aria-label="Editar"
                      disabled={busy}
                      onClick={() => startEdit(row)}
                      className="rounded border border-white/10 p-1.5 text-slate-200 disabled:opacity-50"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      aria-label="Excluir"
                      disabled={busy}
                      onClick={() => void deleteRecord(row)}
                      className="rounded border border-red-500/20 p-1.5 text-red-300 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editorMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="json-record-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <form
            onSubmit={(event) => void saveRecord(event)}
            className="w-full max-w-2xl space-y-3 rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="json-record-editor-title" className="text-base font-bold text-white">
                {editorMode === "create" ? "Novo registro" : "Editar registro"} · {title}
              </h3>
              <button
                type="button"
                onClick={() => setEditorMode(null)}
                disabled={busy}
                aria-label="Fechar"
                className="rounded border border-white/10 p-1.5 text-slate-300"
              >
                <X size={14} />
              </button>
            </div>
            {["biblioteca", "cenarios", "metricas", "overlays", "rtc_registry"].includes(
              tableId,
            ) && (
              <label className="block space-y-1 text-xs text-slate-300">
                <span>Usuário proprietário (user_id de usuario.json)</span>
                <select
                  value={(() => {
                    try {
                      return String(JSON.parse(recordText).user_id || "");
                    } catch {
                      return "";
                    }
                  })()}
                  disabled={editorMode === "edit" || busy}
                  onChange={(event) => {
                    try {
                      const parsed = JSON.parse(recordText);
                      parsed.user_id = event.target.value;
                      setRecordText(JSON.stringify(parsed, null, 2));
                    } catch {
                      /* ignora erro de json incompleto */
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                >
                  <option value="">Selecione um usuário</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.user} · {user.user_id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-1 text-xs text-slate-300">
              <span>Registro JSON completo</span>
              <textarea
                value={recordText}
                onChange={(event) => setRecordText(event.target.value)}
                rows={14}
                spellCheck={false}
                className="w-full rounded-lg border border-white/10 bg-slate-900 p-3 font-mono text-xs text-slate-100 outline-none focus:border-violet-400"
              />
            </label>
            <p className="text-[10px] text-slate-500">
              O campo user_id é validado contra os usuários locais. A senha nunca é copiada para
              estas tabelas.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorMode(null)}
                disabled={busy}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}{" "}
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
