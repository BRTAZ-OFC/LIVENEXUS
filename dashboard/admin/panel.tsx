/* BLOCO 1 — Painel Administrativo integrado ao dashboard do LiveNexus. */
import { useState, useEffect, useRef } from "react";
import {
  House,
  Image,
  Layers,
  BookOpen,
  Star,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
  MessageSquare,
} from "lucide-react";
import DatabasePage from "./banco";
import ReviewsManager from "./reviews-manager";

type UserRow = {
  user_id: string;
  user: string;
  role?: string;
  imagen?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
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

export default function AdminPanel() {
  const [subTab, setSubTab] = useState<
    "inicial" | "galeria" | "overlay" | "biblioteca" | "avaliacoes" | "suporte"
  >("inicial");

  // Submenu scroll & arrows state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Real data state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Editing state for users (Galeria / Overlay / Biblioteca)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userImagenDraft, setUserImagenDraft] = useState("");

  function checkScrollPosition() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftArrow(scrollLeft > 2);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
  }

  function scrollSubmenu(direction: "left" | "right") {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = 200;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("livenexus_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [resUsers, resReviews] = await Promise.all([
        fetch("/api/database/users", { headers, credentials: "include", cache: "no-store" }),
        fetch("/api/database/avaliacoes", { headers, credentials: "include", cache: "no-store" }),
      ]);

      const dataUsers = await resUsers.json();
      const dataReviews = await resReviews.json();

      if (dataUsers.ok) setUsers(dataUsers.users || []);
      if (dataReviews.ok) setReviews(dataReviews.avaliacoes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados administrativos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleUpdateUserImage(userId: string) {
    setError("");
    setMessage("");
    try {
      const token = sessionStorage.getItem("livenexus_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/database/users", {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          changes: { imagen: userImagenDraft.trim() || null },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Falha ao atualizar imagem.");

      setUsers((current) => current.map((u) => (u.user_id === userId ? data.user : u)));
      setEditingUserId(null);
      setMessage("Imagem do usuário atualizada com sucesso.");
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar imagem.");
    }
  }

  const subtabsList = [
    { id: "inicial", label: "Inicial", icon: House },
    { id: "galeria", label: "Galeria", icon: Image },
    { id: "overlay", label: "Overlay", icon: Layers },
    { id: "biblioteca", label: "Biblioteca", icon: BookOpen },
    { id: "avaliacoes", label: "Avaliações", icon: Star },
    { id: "suporte", label: "Suporte", icon: HelpCircle },
  ] as const;

  return (
    <div className="w-full px-6 py-4 space-y-6">
      <div>
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
          Painel Administrativo
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white flex items-center gap-2">
          Gerenciamento da Plataforma
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Consulte e administre os dados, configurações e registros reais da plataforma LiveNexus.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      {/* Submenu horizontal com setas de navegação (4px de distância) */}
      <div className="flex items-center">
        {showLeftArrow && (
          <button
            type="button"
            onClick={() => scrollSubmenu("left")}
            style={{ marginRight: "4px" }}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 shrink-0 shadow-md transition z-10"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScrollPosition}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 flex-1"
        >
          {subtabsList.map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition border ${
                  active
                    ? "bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-lg shadow-violet-500/10"
                    : "bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {showRightArrow && (
          <button
            type="button"
            onClick={() => scrollSubmenu("right")}
            style={{ marginLeft: "4px" }}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 shrink-0 shadow-md transition z-10"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Conteúdo da sub-área selecionada */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-6 backdrop-blur-xl">
        {subTab === "inicial" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Resumo Administrativo</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visão geral dos dados e métricas reais do sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Usuários Registrados</span>
                  <User className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-2xl font-extrabold text-white">{users.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Contas ativas na plataforma</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Total de Avaliações</span>
                  <Star className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-extrabold text-white">{reviews.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Feedbacks da comunidade</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Status do Sistema</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-extrabold text-emerald-400">Online</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Servidor Node.js operando normalmente
                </p>
              </div>
            </div>
          </div>
        )}

        {subTab === "galeria" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">
                Gerenciamento de Galeria / Avatares
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte e altere as imagens e avatares associados aos perfis dos usuários
                registrados.
              </p>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const isEditing = editingUserId === u.user_id;
                return (
                  <div
                    key={u.user_id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0 overflow-hidden">
                        {u.imagen ? (
                          <img src={u.imagen} alt={u.user} className="h-full w-full object-cover" />
                        ) : (
                          u.user.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.user}</p>
                        <p className="text-[10px] text-slate-400 truncate">ID: {u.user_id}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Imagem: {u.imagen || "Nenhuma URL cadastrada"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={userImagenDraft}
                            onChange={(e) => setUserImagenDraft(e.target.value)}
                            placeholder="URL da nova imagem"
                            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs w-48 focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => void handleUpdateUserImage(u.user_id)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(u.user_id);
                            setUserImagenDraft(u.imagen || "");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition border border-white/10"
                        >
                          Editar Imagem
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {subTab === "overlay" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Configurações de Overlay</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Parâmetros e dados de personalização de overlay associados aos usuários da
                plataforma.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
              <p className="text-xs text-slate-300">
                Os overlays do LiveNexus utilizam as credenciais e conexões ativas de cada usuário.
                Abaixo estão listados os usuários cadastrados e seus papéis na plataforma:
              </p>
              <div className="divide-y divide-white/5">
                {users.map((u) => (
                  <div key={u.user_id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">{u.user}</p>
                      <p className="text-[10px] text-slate-400">
                        Papel: <span className="text-violet-300 font-semibold">{u.role}</span>
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      Overlay Ativo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === "biblioteca" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Biblioteca de Recursos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulta de registros e ativos armazenados na plataforma.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <p className="text-xs text-slate-300">
                Total de registros indexados na base JSON de usuários:{" "}
                <strong className="text-white">{users.length}</strong>
              </p>
              <p className="text-xs text-slate-300">
                Total de feedbacks indexados na base JSON de avaliações:{" "}
                <strong className="text-white">{reviews.length}</strong>
              </p>
            </div>
          </div>
        )}

        {subTab === "avaliacoes" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Gerenciamento de Avaliações</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte, edite ou responda oficialmente às avaliações da comunidade.
              </p>
            </div>

            <ReviewsManager reviews={reviews} onUpdate={() => void loadData()} />
          </div>
        )}

        {subTab === "suporte" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Central de Suporte</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Informações de atendimento e status dos canais de suporte.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Atendimento ao Streamer</p>
                  <p className="text-[10px] text-slate-400">
                    Canais oficiais de suporte via chat e comunidade.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300 pt-2 border-t border-white/5">
                Nenhum ticket pendente no momento. O sistema de chamados operacionais externos não
                possui banco de dados dedicado nesta versão; utilize o painel de avaliações para
                feedback dos usuários.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
