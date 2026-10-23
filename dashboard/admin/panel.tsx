/* BLOCO 1 — Painel Administrativo integrado ao dashboard do LiveNexus. */
import { useState, useEffect } from "react";
import {
  House,
  Image,
  Layers,
  Clapperboard,
  BookOpen,
  Star,
  HelpCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
  MessageSquare,
  RadioTower,
  Play,
  CheckCircle2,
  Sliders,
  Tv,
  Terminal,
  Trash2,
} from "lucide-react";
import DatabasePage from "./banco";
import ReviewsManager from "./reviews-manager";
import AdminConnectionsPage from "./connections";
import WidgetsSection from "../widget/Widget_Section";
import HorizontalMenu from "../components/HorizontalMenu";
import OverlaySection from "../overlay/Overlay_Section";

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

// AdminPanel: executa a etapa descrita pelo nome da função.
export default function AdminPanel() {
  const [subTab, setSubTab] = useState<
    | "inicial"
    | "erros"
    | "galeria"
    | "overlay"
    | "cenarios"
    | "biblioteca"
    | "avaliacoes"
    | "suporte"
    | "conexoes"
    | "widgets"
  >("inicial");

  // Real data state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Editing state for users (Galeria / Overlay / Biblioteca)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userImagenDraft, setUserImagenDraft] = useState("");

  // Cenários state
  const [expandedScenesUserId, setExpandedScenesUserId] = useState<string | null>(null);
  const [userActiveScenes, setUserActiveScenes] = useState<Record<string, string>>({});
  const [previewingSceneKey, setPreviewingSceneKey] = useState<string | null>(null);

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
    { id: "erros", label: "Ver Erros", icon: Terminal },
    { id: "galeria", label: "Galeria", icon: Image },
    { id: "overlay", label: "Overlay", icon: Layers },
    { id: "cenarios", label: "Cenários", icon: Clapperboard },
    { id: "biblioteca", label: "Biblioteca", icon: BookOpen },
    { id: "avaliacoes", label: "Avaliações", icon: Star },
    { id: "suporte", label: "Suporte", icon: HelpCircle },
    { id: "conexoes", label: "Conexão", icon: RadioTower },
    { id: "widgets", label: "Widgets", icon: Tv },
  ] as const;

  {/* Estrutura visual: div. */}

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

      {/* Menu horizontal global: setas externas e distância de 4px. */}
      <HorizontalMenu ariaLabel="Menu do Painel Administrativo" trackClassName="py-1">
        {subtabsList.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          {/* Estrutura visual: button. */}
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
      </HorizontalMenu>

      {/* Conteúdo da sub-área selecionada */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-6 backdrop-blur-xl">
        {subTab === "conexoes" && <AdminConnectionsPage />}
        {subTab === "widgets" && <WidgetsSection />}
        {subTab === "erros" && <ErrorLogsEmbedded />}

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
                {/* Estrutura visual: div. */}
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

        {subTab === "overlay" && <OverlaySection users={users} />}

        {subTab === "cenarios" && (
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-white/10">
                {loading ? "Carregando usuários..." : "Nenhum usuário cadastrado encontrado."}
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const isExpanded = expandedScenesUserId === u.user_id;
                  const activeScene = userActiveScenes[u.user_id] || "gameplay";

                  {/* Estrutura visual: div. */}

                  return (
                    <div
                      key={u.user_id}
                      className="rounded-xl bg-slate-950/60 border border-white/10 transition overflow-hidden"
                    >
                      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0 overflow-hidden">
                            {u.imagen ? (
                              <img
                                src={u.imagen}
                                alt={u.user}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              u.user.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-white truncate">{u.user}</p>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                {u.role || "Streamer"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">ID: {u.user_id}</p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedScenesUserId(isExpanded ? null : u.user_id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                              isExpanded
                                ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border-white/10"
                            }`}
                          >
                            <Clapperboard className="h-3.5 w-3.5 text-violet-300" />
                            {isExpanded ? "Ocultar cenários" : "Exibir cenários"}
                          </button>
                        </div>
                      </div>

                      {/* Exibição dos Cenários do Usuário Selecionado */}
                      {isExpanded && (
                        <div className="border-t border-white/10 p-5 bg-slate-900/60 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                              <Clapperboard className="h-4 w-4" />
                              Cenários de Transmissão — {u.user}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Resolução padrão: 1920 × 1080 (60 FPS)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              {
                                id: "gameplay",
                                title: "Cena Principal (Ao Vivo)",
                                badge: "Transmissão Principal",
                                badgeColor:
                                  "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
                                description:
                                  "Foco na captura de tela/jogo com multichat flutuante lateral e alertas TTS ativos.",
                                resolution: "1920 × 1080 (60 FPS)",
                                transition: "Fade Suave (300ms)",
                                elements: [
                                  "Captura de Jogo / Janela 16:9",
                                  "Overlay Multichat Flutuante",
                                  "Alertas de Voz TTS Integrados",
                                  "Status dos Canais Conectados",
                                ],
                              },
                              {
                                id: "chatting",
                                title: "Bate-Papo & Reações (Just Chatting)",
                                badge: "Interativo",
                                badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
                                description:
                                  "Destaque expandido para a câmera com chat em largura total e top falantes.",
                                resolution: "1920 × 1080 (60 FPS)",
                                transition: "Slide Horizontal",
                                elements: [
                                  "Webcam Expandida em Alta Resolução",
                                  "Top 10 Falantes em Tempo Real",
                                  "Multichat Unificado",
                                  "Contador de Espectadores",
                                ],
                              },
                              {
                                id: "brb",
                                title: "Intervalo / Pausa (BRB)",
                                badge: "Espera",
                                badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/20",
                                description:
                                  "Cena de pausa com timer regressivo, aviso de retorno em breve e trilha sonora.",
                                resolution: "1920 × 1080 (60 FPS)",
                                transition: "Corte Imediato",
                                elements: [
                                  "Temporizador Regressivo",
                                  "Mensagem de Retorno em Breve",
                                  "Feed de Chat em Modo Silencioso",
                                  "Player de Música de Fundo",
                                ],
                              },
                              {
                                id: "ending",
                                title: "Encerramento da Transmissão",
                                badge: "Conclusão",
                                badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/20",
                                description:
                                  "Créditos finais, resumo de mensagens recebidas e agradecimentos aos espectadores.",
                                resolution: "1920 × 1080 (60 FPS)",
                                transition: "Fade to Black (500ms)",
                                elements: [
                                  "Resumo de Espectadores e Chat",
                                  "Agradecimentos aos Seguidores",
                                  "Créditos Rolantes da Live",
                                  "Links Sociais e Próxima Transmissão",
                                ],
                              },
                            ].map((scene) => {
                              const isActive = activeScene === scene.id;
                              const previewKey = `${u.user_id}_${scene.id}`;
                              const isPreviewing = previewingSceneKey === previewKey;

                              {/* Estrutura visual: div. */}

                              return (
                                <div
                                  key={scene.id}
                                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                                    isActive
                                      ? "bg-slate-950/80 border-violet-500/40 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/20"
                                      : "bg-slate-950/60 border-white/10 hover:border-white/20"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2">
                                        <Tv className="h-4 w-4 text-violet-400 shrink-0" />
                                        <h3 className="text-xs font-bold text-white">
                                          {scene.title}
                                        </h3>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${scene.badgeColor}`}
                                      >
                                        {scene.badge}
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                                      {scene.description}
                                    </p>

                                    <div className="space-y-1 mb-3">
                                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Elementos da Cena:
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-300">
                                        {scene.elements.map((el, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-1.5 truncate"
                                          >
                                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                                            <span className="truncate">{el}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                    <div>
                                      {isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                          <CheckCircle2 className="h-3 w-3" /> Ativa no Ar
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setUserActiveScenes((prev) => ({
                                              ...prev,
                                              [u.user_id]: scene.id,
                                            }));
                                            setMessage(
                                              `Cenário "${scene.title}" ativado para ${u.user}.`,
                                            );
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition shadow-sm"
                                        >
                                          <Play className="h-3 w-3 fill-current" /> Ativar Cena
                                        </button>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewingSceneKey(isPreviewing ? null : previewKey)
                                      }
                                      className="px-2 py-1 rounded-md text-[11px] text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 transition"
                                    >
                                      {isPreviewing ? "Fechar Prévia" : "Prévia do Layout"}
                                    </button>
                                  </div>

                                  {isPreviewing && (
                                    <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-violet-500/30 text-xs text-slate-300 space-y-1.5">
                                      <div className="flex items-center justify-between text-[10px] font-semibold text-violet-300">
                                        <span>Frame da Stream — @{u.user}</span>
                                        <span className="text-[9px] text-slate-400">
                                          1080p Canvas
                                        </span>
                                      </div>
                                      <div className="aspect-video w-full rounded border border-white/10 bg-slate-950 p-2 relative flex flex-col justify-between overflow-hidden">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8px] bg-red-600/80 text-white font-bold px-1.5 py-0.5 rounded">
                                            AO VIVO
                                          </span>
                                          <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                            {scene.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-center text-[10px] text-slate-400 font-medium">
                                          Layout da cena para {u.user}
                                        </div>
                                        <div className="flex items-center justify-between text-[8px] text-slate-500 border-t border-white/5 pt-1">
                                          <span>Canal: @{u.user}</span>
                                          <span>60 FPS</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

// ErrorLogsEmbedded: executa a etapa descrita pelo nome da função.
function ErrorLogsEmbedded() {
  const [errors, setErrors] = useState<unknown[]>(
    typeof window !== "undefined" ? window.__LIVENEXUS_ERRORS__ || [] : [],
  );

  const handleClear = () => {
    if (typeof window !== "undefined") {
      window.__LIVENEXUS_ERRORS__ = [];
    }
    setErrors([]);
  };

  {/* Estrutura visual: div. */}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-red-500" />
            Logs de Erros do Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro centralizado de falhas e exceções ocorridas no navegador.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-200 text-xs font-semibold transition border border-red-700/50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Limpar Logs
        </button>
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-12 bg-slate-950/60 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Nenhum erro registrado nesta sessão.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.map((err) => (
            <div
              key={err.id}
              className="p-4 rounded-xl bg-slate-950 border border-red-900/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 uppercase">
                  {err.type} - {err.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{err.timestamp}</span>
              </div>
              <p className="text-sm text-white font-medium">{err.message}</p>
              {err.filename && (
                <div className="text-[10px] text-slate-400 font-mono text-slate-400">
                  {err.filename}:{err.lineno}:{err.colno}
                </div>
              )}
              {err.stack && (
                <pre className="p-2 bg-black rounded text-[10px] text-red-300/80 overflow-x-auto font-mono">
                  {err.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
