import { createFileRoute } from "@tanstack/react-router";
import DatabasePage from "./admin/banco";
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
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("livenexus_role") === "admin";
    }
    return false;
  });
  const [activeSection, setActiveSection] = useState<"overview" | "database">(() => {
    if (typeof window !== "undefined") {
      const admin = sessionStorage.getItem("livenexus_role") === "admin";
      if (!admin) return "overview";
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "database" || tabParam === "overview") return tabParam;
      const stored = sessionStorage.getItem("livenexus_active_tab");
      if (stored === "database" || stored === "overview") return stored;
    }
    return "overview";
  });

  function handleSelectSection(section: "overview" | "database") {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("livenexus_active_tab", section);
      const url = new URL(window.location.href);
      if (section === "database") {
        url.searchParams.set("tab", "database");
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  useEffect(() => {
    const admin = sessionStorage.getItem("livenexus_role") === "admin";
    setIsAdmin(admin);
    if (!admin) {
      setActiveSection("overview");
      sessionStorage.setItem("livenexus_active_tab", "overview");
    }
  }, []);
  return (
    <div className="flex min-h-screen bg-[#080a13] text-slate-100">
      <aside
        className={`flex min-h-screen shrink-0 flex-col border-r border-white/10 bg-[#0b0e19] transition-[width] duration-200 ${sidebarExpanded ? "w-52" : "w-16"}`}
      >
        <div className="flex h-[73px] items-center justify-center border-b border-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <AudioLines className="h-5 w-5 text-white" />
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-2 p-2 pt-4">
          <button
            type="button"
            onClick={() => handleSelectSection("overview")}
            title="Início"
            aria-label="Início"
            className={`flex h-11 items-center rounded-lg transition hover:bg-white/5 ${sidebarExpanded ? "gap-3 px-3" : "justify-center"} ${activeSection === "overview" ? "bg-violet-500/15 text-violet-200" : "text-slate-300 hover:text-white"}`}
          >
            <House className="h-2.5 w-2.5 shrink-0" />
            {sidebarExpanded && <span className="text-[7px] font-semibold">Início</span>}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSelectSection("database")}
              title="Banco de dados"
              aria-label="Banco de dados"
              className={`flex h-11 items-center rounded-lg transition hover:bg-white/5 ${sidebarExpanded ? "gap-3 px-3" : "justify-center"} ${activeSection === "database" ? "bg-violet-500/15 text-violet-200" : "text-slate-300 hover:text-white"}`}
            >
              <Database className="h-2.5 w-2.5 shrink-0" />
              {sidebarExpanded && <span className="text-[7px] font-semibold">Banco de dados</span>}
            </button>
          )}
        </nav>
        <button
          type="button"
          onClick={() => setSidebarExpanded((expanded) => !expanded)}
          aria-label={sidebarExpanded ? "Recolher menu" : "Estender menu"}
          title={sidebarExpanded ? "Recolher menu" : "Estender menu"}
          className="m-2 flex h-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
        >
          {sidebarExpanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="border-b border-white/10 bg-[#0d1120]/80">
          <div className="flex w-full items-center justify-between px-6 py-4 sm:px-8">
            <a href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
                <AudioLines className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-extrabold text-white">
                LIVE<span className="text-cyan-300">NEXUS</span>
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </header>
        {activeSection === "overview" ? (
          <section className="w-full px-6 py-8 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Área do usuário
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Bem-vindo ao LiveNexus. Este é o painel inicial da sua conta.
            </p>
            <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-[#0d1120] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                  <Radio className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-white">Conexões</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Acesse os recursos de conexão das suas plataformas de transmissão.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  Em preparação <ArrowRight className="h-4 w-4" />
                </span>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#0d1120] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <UserRound className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-white">Minha conta</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Área reservada para informações e dados da conta.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  Em preparação <ArrowRight className="h-4 w-4" />
                </span>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#0d1120] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-400/10 text-fuchsia-300">
                  <Settings2 className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-white">Configurações</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Espaço para as configurações do LiveNexus.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  Em preparação <ArrowRight className="h-4 w-4" />
                </span>
              </article>
            </div>
          </section>
        ) : isAdmin ? (
          <section className="w-full px-6 py-6 sm:px-8">
            <DatabasePage embedded />
          </section>
        ) : null}
      </main>
    </div>
  );
}
