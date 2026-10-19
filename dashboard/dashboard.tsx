/* BLOCO 1 — Imports de rota, estados React, ícones e painel de dados. */
import { createFileRoute } from "@tanstack/react-router";
import DatabasePage from "./admin/banco";
import AdminPanel from "./admin/panel";
import { useEffect, useState } from "react";
import {
  AudioLines,
  Radio,
  Settings2,
  UserRound,
  LogOut,
  ArrowRight,
  House,
  Database,
  ChevronRight,
  ChevronLeft,
  Layers,
} from "lucide-react";

/* BLOCO 2 — Registra a rota do dashboard autenticado. */
export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

/* BLOCO 3 — Controla menu lateral, seção ativa e acesso administrativo. */
function DashboardPage() {
  // BLOCO 4 — Inicializa o menu e recupera o papel antes de restaurar a aba ativa.
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("livenexus_role") === "admin";
    }
    return false;
  });
  const [activeSection, setActiveSection] = useState<"overview" | "database" | "admin-panel">(
    () => {
      if (typeof window !== "undefined") {
        const admin = sessionStorage.getItem("livenexus_role") === "admin";
        if (!admin) return "overview";
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam === "database" || tabParam === "overview" || tabParam === "admin-panel")
          return tabParam as "overview" | "database" | "admin-panel";
        const stored = sessionStorage.getItem("livenexus_active_tab");
        if (stored === "database" || stored === "overview" || stored === "admin-panel")
          return stored as "overview" | "database" | "admin-panel";
      }
      return "overview";
    },
  );

  // BLOCO 5 — Atualiza a seção selecionada e persiste a escolha.
  function handleSelectSection(section: "overview" | "database" | "admin-panel") {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("livenexus_active_tab", section);
      const url = new URL(window.location.href);
      if (section === "database" || section === "admin-panel") {
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
        {activeSection === "overview" ? (
          <section className="dash-w-full-px-6-n4tgk">
            <p className="dash-text-xs-font-bold-1eh0cdm">Área do usuário</p>
            <h1 className="dash-mt-3-text-3xl-1fv0i93">Dashboard</h1>
            <p className="dash-mt-3-max-w-2xl-1oz8868">
              Bem-vindo ao LiveNexus. Este é o painel inicial da sua conta.
            </p>
            <div className="dash-mt-9-grid-dk8xjy">
              <article className="dash-rounded-2xl-border-la2jyp">
                <span className="dash-flex-h-11-w12n1q">
                  <Radio className="dash-h-5-w-5-sv0uoi" />
                </span>
                <h2 className="dash-mt-5-text-lg-1wxow0h">Conexões</h2>
                <p className="dash-mt-2-text-sm-n1yf0y">
                  Acesse os recursos de conexão das suas plataformas de transmissão.
                </p>
                <span className="dash-mt-5-inline-flex-1wra89i">
                  Em preparação <ArrowRight className="dash-h-4-w-4-3ulyf2" />
                </span>
              </article>
              <article className="dash-rounded-2xl-border-la2jyp">
                <span className="dash-flex-h-11-a0p84e">
                  <UserRound className="dash-h-5-w-5-sv0uoi" />
                </span>
                <h2 className="dash-mt-5-text-lg-1wxow0h">Minha conta</h2>
                <p className="dash-mt-2-text-sm-n1yf0y">
                  Área reservada para informações e dados da conta.
                </p>
                <span className="dash-mt-5-inline-flex-1wra89i">
                  Em preparação <ArrowRight className="dash-h-4-w-4-3ulyf2" />
                </span>
              </article>
              <article className="dash-rounded-2xl-border-la2jyp">
                <span className="dash-flex-h-11-r1ook6">
                  <Settings2 className="dash-h-5-w-5-sv0uoi" />
                </span>
                <h2 className="dash-mt-5-text-lg-1wxow0h">Configurações</h2>
                <p className="dash-mt-2-text-sm-n1yf0y">
                  Espaço para as configurações do LiveNexus.
                </p>
                <span className="dash-mt-5-inline-flex-1wra89i">
                  Em preparação <ArrowRight className="dash-h-4-w-4-3ulyf2" />
                </span>
              </article>
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
