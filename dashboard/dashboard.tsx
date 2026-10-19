/* BLOCO 1 — Imports de rota, estados React, ícones e painel de dados. */
import DatabasePage from "./admin/banco";
import AdminPanel from "./admin/panel";
import TTSPage from "./tts";
import MultiChatPanel, { disconnectAllMultiChat, useMultiChatSnapshot } from "./multichat";
import { useEffect, useState } from "react";
import {
  AudioLines,
  Radio,
  UserRound,
  LogOut,
  House,
  Database,
  ChevronRight,
  ChevronLeft,
  Layers,
  Clock3,
  MessageSquare,
  Eye,
  Volume2,
} from "lucide-react";

/* BLOCO 2 — O dashboard é registrado em dashboard/App.tsx. */
/* BLOCO 3 — Controla menu lateral, seção ativa e acesso administrativo. */
function DashboardPage() {
  // BLOCO 4 — Inicializa o menu e recupera o papel antes de restaurar a aba ativa.
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const chatState = useMultiChatSnapshot();
  const connectedPlatforms = ["Twitch", "Kick", "YouTube"].filter((platform) => ["connected", "open"].includes(chatState.statuses[platform as keyof typeof chatState.statuses].status.toLowerCase()));
  const totalViewers = ["Twitch", "Kick", "YouTube"].reduce((total, platform) => total + (chatState.statuses[platform as keyof typeof chatState.statuses].viewers ?? 0), 0);
  const speakerCounts = Object.values(chatState.messages.reduce<Record<string, { author: string; count: number }>>((acc, message) => {
    const key = message.author.trim().toLowerCase() || "anônimo";
    if (!acc[key]) acc[key] = { author: message.author || "Anônimo", count: 0 };
    acc[key].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 10);
  useEffect(() => () => disconnectAllMultiChat(), []);

  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("livenexus_role") === "admin";
    }
    return false;
  });
  const [activeSection, setActiveSection] = useState<"overview" | "database" | "admin-panel" | "voice">(
    () => {
      if (typeof window !== "undefined") {
        const admin = sessionStorage.getItem("livenexus_role") === "admin";
        if (!admin) return "overview";
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam === "database" || tabParam === "overview" || tabParam === "admin-panel" || tabParam === "voice")
          return tabParam as "overview" | "database" | "admin-panel" | "voice";
        const stored = sessionStorage.getItem("livenexus_active_tab");
        if (stored === "database" || stored === "overview" || stored === "admin-panel" || stored === "voice")
          return stored as "overview" | "database" | "admin-panel" | "voice";
      }
      return "overview";
    },
  );

  // BLOCO 5 — Atualiza a seção selecionada e persiste a escolha.
  function handleSelectSection(section: "overview" | "database" | "admin-panel" | "voice") {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("livenexus_active_tab", section);
      const url = new URL(window.location.href);
      if (section === "database" || section === "admin-panel" || section === "voice") {
        url.searchParams.set("tab", section);
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  // BLOCO 6 — Confirma o papel no cliente e força a aba inicial para usuários comuns.
  useEffect(() => {
    const admin = sessionStorage.getItem("livenexus_role") === "admin";
    setIsAdmin(admin);
    if (!admin) {
      setActiveSection("overview");
      sessionStorage.setItem("livenexus_active_tab", "overview");
    }
  }, []);
  // BLOCO 7 — Renderiza o layout do menu lateral e da área de conteúdo.

  return (
    <div className="dash-flex-min-h-screen-axmrk9">
      {/* BLOCO 8 — Menu lateral recolhível com atalhos das seções. */}
      <aside
        className={`dash-flex-min-h-screen-16w20hu ${sidebarExpanded ? "dash-w-52-p3mf56" : "dash-w-16-1j20ogi"}`}
      >
        <div className="dash-flex-h-73px-1rxqrjy">
          <span className="dash-flex-h-9-y3vg7y">
            <AudioLines className="dash-h-5-w-5-8794lx" />
          </span>
        </div>
        <nav className="dash-flex-flex-1-xgledq">
          <button
            type="button"
            onClick={() => handleSelectSection("overview")}
            title="Início"
            aria-label="Início"
            className={`dash-flex-h-11-141hbqq ${sidebarExpanded ? "dash-gap-3-px-3-x5a6yh" : "dash-justify-center-160tcmj"} ${activeSection === "overview" ? "dash-bg-violet-500-15-text-vi-1xm6n2h" : "dash-text-white-fmef8d"}`}
          >
            <House className="dash-h-2-5-w-2-5-16znhny" />
            {sidebarExpanded && <span className="dash-text-7px-font-semibold-r7z1tv">Início</span>}
          </button>
          <button
            type="button"
            onClick={() => handleSelectSection("voice")}
            title="Voz & TTS"
            aria-label="Voz & TTS"
            className={`dash-flex-h-11-141hbqq ${sidebarExpanded ? "dash-gap-3-px-3-x5a6yh" : "dash-justify-center-160tcmj"} ${activeSection === "voice" ? "dash-bg-violet-500-15-text-vi-1xm6n2h" : "dash-text-white-fmef8d"}`}
          >
            <Volume2 className="dash-h-2-5-w-2-5-16znhny" />
            {sidebarExpanded && <span className="dash-text-7px-font-semibold-r7z1tv">Voz &amp; TTS</span>}
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => handleSelectSection("admin-panel")}
                title="Painel Admin"
                aria-label="Painel Admin"
                className={`dash-flex-h-11-141hbqq ${sidebarExpanded ? "dash-gap-3-px-3-x5a6yh" : "dash-justify-center-160tcmj"} ${activeSection === "admin-panel" ? "dash-bg-violet-500-15-text-vi-1xm6n2h" : "dash-text-white-fmef8d"}`}
              >
                <Layers className="dash-h-2-5-w-2-5-16znhny" />
                {sidebarExpanded && (
                  <span className="dash-text-7px-font-semibold-r7z1tv">Painel Admin</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSelectSection("database")}
                title="Banco de dados"
                aria-label="Banco de dados"
                className={`dash-flex-h-11-141hbqq ${sidebarExpanded ? "dash-gap-3-px-3-x5a6yh" : "dash-justify-center-160tcmj"} ${activeSection === "database" ? "dash-bg-violet-500-15-text-vi-1xm6n2h" : "dash-text-white-fmef8d"}`}
              >
                <Database className="dash-h-2-5-w-2-5-16znhny" />
                {sidebarExpanded && (
                  <span className="dash-text-7px-font-semibold-r7z1tv">Banco de dados</span>
                )}
              </button>
            </>
          )}
        </nav>
        <button
          type="button"
          onClick={() => setSidebarExpanded((expanded) => !expanded)}
          aria-label={sidebarExpanded ? "Recolher menu" : "Estender menu"}
          title={sidebarExpanded ? "Recolher menu" : "Estender menu"}
          className="dash-m-2-flex-16sm6c8"
        >
          {sidebarExpanded ? (
            <ChevronLeft className="dash-h-5-w-5-sv0uoi" />
          ) : (
            <ChevronRight className="dash-h-5-w-5-sv0uoi" />
          )}
        </button>
      </aside>
      {/* BLOCO 9 — Painel principal ao lado do menu, sem centralização forçada. */}
      <main className="dash-min-w-0-flex-1-1g3oh63">
        <header className="dash-border-b-border-white-10-7389gy">
          <div className="dash-flex-w-full-1h42rcq">
            <a href="/" className="dash-flex-items-center-1bpln9w">
              <span className="dash-flex-h-10-8puoho">
                <AudioLines className="dash-h-5-w-5-8794lx" />
              </span>
              <span className="dash-text-lg-font-extrabold-1h5z3qk">
                LIVE<span className="dash-text-cyan-300-bbfjjq">NEXUS</span>
              </span>
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } finally {
                  sessionStorage.removeItem("livenexus_role");
                  window.location.href = "/login";
                }
              }}
              className="dash-inline-flex-items-center-11vpqzb"
            >
              <LogOut className="dash-h-4-w-4-3ulyf2" /> Sair
            </button>
          </div>
        </header>
        <div className={activeSection === "voice" ? "dash-w-full-px-6-5ebeye" : "hidden"}>
          <TTSPage />
        </div>
        {activeSection === "overview" ? (
          <section className="dash-overview">
            <div className="dash-overview-heading">
              <div>
                <p className="dash-text-xs-font-bold-1eh0cdm">CENTRAL DE TRANSMISSÃO</p>
                <h1 className="dash-mt-3-text-3xl-1fv0i93">Dashboard</h1>
              </div>
              <span className="dash-preview-tag">{connectedPlatforms.length ? `${connectedPlatforms.length} plataforma(s) conectada(s)` : "Aguardando conexões"}</span>
            </div>

            <div className="dash-live-stats">
              <article className="dash-stat-card">
                <div className="dash-stat-label"><Radio /> Plataformas conectadas</div>
                <div className="dash-platform-counts">
                  <span><i className="dash-platform-dot twitch" /> Twitch <b>{["connected", "open"].includes(chatState.statuses.Twitch.status.toLowerCase()) ? 1 : 0}</b></span>
                  <span><i className="dash-platform-dot youtube" /> YouTube <b>{["connected", "open"].includes(chatState.statuses.YouTube.status.toLowerCase()) ? 1 : 0}</b></span>
                  <span><i className="dash-platform-dot kick" /> KICK <b>{["connected", "open"].includes(chatState.statuses.Kick.status.toLowerCase()) ? 1 : 0}</b></span>
                </div>
              </article>
              <article className="dash-stat-card">
                <div className="dash-stat-label"><Eye /> Total de espectadores</div>
                <strong className="dash-stat-number">{totalViewers.toLocaleString("pt-BR")}</strong>
                <span className="dash-stat-caption">Soma das plataformas conectadas</span>
              </article>
              <article className="dash-stat-card">
                <div className="dash-stat-label"><Clock3 /> Status da transmissão</div>
                <strong className="dash-stat-number">{connectedPlatforms.length ? "Ativo" : "Offline"}</strong>
                <span className="dash-stat-caption">{connectedPlatforms.length ? "Conectores recebendo status" : "Conecte um canal no chat ao vivo"}</span>
              </article>
              <article className="dash-stat-card">
                <div className="dash-stat-label"><MessageSquare /> Mensagens recebidas</div>
                <strong className="dash-stat-number">{chatState.messages.length}</strong>
                <span className="dash-stat-caption">Mensagens recentes no multichat</span>
              </article>
            </div>

            <div className="dash-live-workspace">
              <MultiChatPanel />
              <section className="dash-speakers-panel">
                <header className="dash-panel-header">
                  <div>
                    <h2>Top 10 falantes</h2>
                    <p>Mais ativos no chat</p>
                  </div>
                  <UserRound className="dash-panel-heading-icon" />
                </header>
                {speakerCounts.length === 0 ? (
                  <div className="dash-speakers-empty">
                    <div className="dash-speakers-empty-icon"><UserRound /></div>
                    <strong>Ranking aguardando mensagens</strong>
                    <span>Os 10 usuários mais ativos aparecerão aqui conforme o multichat receber mensagens.</span>
                  </div>
                ) : (
                  <ol className="dash-speakers-list" aria-label="Top 10 falantes">
                    {speakerCounts.map((speaker, index) => (
                      <li key={speaker.author.toLowerCase()}>
                        <span className="dash-speaker-rank">{index + 1}</span>
                        <span className="dash-speaker-avatar">{speaker.author.slice(0, 2).toUpperCase()}</span>
                        <span className="dash-speaker-placeholder">{speaker.author}</span>
                        <b>{speaker.count}</b>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </section>
        ) : activeSection === "admin-panel" && isAdmin ? (
          <section className="dash-w-full-px-6-5ebeye">
            <AdminPanel />
          </section>
        ) : activeSection === "database" && isAdmin ? (
          <section className="dash-w-full-px-6-5ebeye">
            <DatabasePage embedded />
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default DashboardPage;
