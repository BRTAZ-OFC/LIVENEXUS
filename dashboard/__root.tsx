/* BLOCO 1 — Imports do roteador, ícones e folha de estilos global. */
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AudioLines, ArrowLeft, House } from "lucide-react";
import appCss from "./css/styles.css?url";

/* BLOCO 2 — Define metadados, CSS global e componentes raiz da aplicação. */
export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Live Nexus Connect" },
      {
        name: "description",
        content: "A secure, real-time connectivity platform.",
      },
      {
        property: "og:title",
        content: "Live Nexus Connect",
      },
      {
        property: "og:description",
        content: "A secure, real-time connectivity platform.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

/* BLOCO 3 — Cria documento HTML em pt-BR e aplica o shell compartilhado. */
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="app-body">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/* BLOCO 4 — Renderiza a rota atual dentro do documento raiz. */
function RootComponent() {
  return <Outlet />;
}

/* BLOCO 5 — Renderiza uma tela de erro quando a rota não existe. */
function NotFoundComponent() {
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        {/* BLOCO 6 — Marca, mensagem e navegação de retorno da página 404. */}
        <div className="not-found-brand-mark">
          <AudioLines className="shell-h-7-w-7-13cuvnl" />
        </div>
        <p className="not-found-eyebrow">Erro 404</p>
        <h1 className="not-found-title">Página não encontrada</h1>
        <p className="not-found-description">
          A rota solicitada não existe ou foi movida. Verifique o endereço e tente novamente.
        </p>
        <div className="not-found-actions">
          <Link to="/dashboard" className="button-primary">
            <House className="shell-h-4-w-4-3ulyf2" /> Ir para o Início
          </Link>
          <Link to="/" className="button-secondary">
            <ArrowLeft className="shell-h-4-w-4-3ulyf2" /> Voltar
          </Link>
        </div>
      </div>
    </main>
  );
}
