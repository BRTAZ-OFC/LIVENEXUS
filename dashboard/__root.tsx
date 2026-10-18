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

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a13] p-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1120] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400">
          <AudioLines className="h-7 w-7 text-white" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Erro 404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          A rota solicitada não existe ou foi movida. Verifique o endereço e tente novamente.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <House className="h-4 w-4" /> Ir para o Início
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </div>
    </main>
  );
}
