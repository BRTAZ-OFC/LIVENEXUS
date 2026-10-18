import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AudioLines, ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { loginUser } from "./-auth";

export const Route = createFileRoute("/login/")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const result = await loginUser({ data: { user, password } });
      if (result.ok) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("livenexus_role", result.user.role ?? "user");
          if ("token" in result && typeof result.token === "string") {
            sessionStorage.setItem("livenexus_token", result.token);
          }
          if (result.user.user_id) {
            sessionStorage.setItem("livenexus_user_id", result.user.user_id);
          }
        }
        setPassword("");
        await navigate({ to: "/dashboard" });
        return;
      }
      setMessage(result.message);
    } catch (error) {
      console.error("[LiveNexus] Falha no login:", error);
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      setMessage(`Diagnóstico do login: ${detail || "Erro sem mensagem retornada pelo servidor."}`);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a13] px-4 py-12 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]"
      />
      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1120]/90 p-7 shadow-2xl shadow-black/40 sm:p-9">
        <a href="/" className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <AudioLines className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-extrabold text-white">
            LIVE<span className="text-cyan-300">NEXUS</span>
          </span>
        </a>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
          Bem-vindo de volta
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Entrar na conta</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Acesse seu espaço LiveNexus.</p>
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-200">
            Nome de usuário
            <span className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3">
              <UserRound className="h-4 w-4 text-slate-500" />
              <input
                autoComplete="username"
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-600"
                placeholder="Seu usuário"
              />
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Senha
            <span className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3">
              <LockKeyhole className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-600"
                placeholder="Sua senha"
              />
            </span>
          </label>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
            type="submit"
          >
            Entrar <ArrowRight className="h-4 w-4" />
          </button>
          {message && (
            <p
              role="status"
              className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100"
            >
              {message}
            </p>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Ainda não tem conta?{" "}
          <a href="/login/registro" className="font-semibold text-cyan-300 hover:text-white">
            Criar conta
          </a>
        </p>
        <a href="/" className="mt-5 block text-center text-xs text-slate-500 hover:text-slate-300">
          Voltar à página inicial
        </a>
      </section>
    </main>
  );
}
