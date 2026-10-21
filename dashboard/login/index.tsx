/* BLOCO 1 — Imports de rota, navegação, estados, ícones e login do servidor. */
import { useNavigate } from "react-router-dom";
import { AudioLines, ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { loginUser } from "./auth-client";
import { reportRealError } from "../ErrorViewer";

/* BLOCO 2 — A página de login é registrada em dashboard/App.tsx. */
/* BLOCO 3 — Armazena credenciais e mensagens de retorno. */
function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // BLOCO 4 — Envia credenciais, registra sessão e abre o dashboard.
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
        navigate("/");
        return;
      }
      setMessage(result.message);
    } catch (error) {
      reportRealError({
        error,
        message: error instanceof Error ? error.message : String(error),
        type: "Erro do Sistema",
      });
      // O diagnóstico técnico aparece no painel vermelho fixo, não nesta página.
      setMessage("");
    }
  }

  /* BLOCO 5 — Monta a tela de login; os estilos ficam em css/auth.css. */

  return (
    <main className="auth-page">
      <div aria-hidden="true" className="auth-pointer-events-none-abso-13gjxy4" />
      <section className="auth-card">
        <a href="/" className="auth-brand">
          <span className="auth-brand-mark">
            <AudioLines className="auth-h-5-w-5-8794lx" />
          </span>
          <span className="auth-text-lg-font-extrabold-1h5z3qk">
            LIVE<span className="auth-text-cyan-300-bbfjjq">NEXUS</span>
          </span>
        </a>
        <p className="auth-eyebrow-login">Bem-vindo de volta</p>
        <h1 className="auth-title">Entrar na conta</h1>
        <p className="auth-description">Acesse seu espaço LiveNexus.</p>
        {/* BLOCO 6 — Campos, botão de entrada e mensagem de diagnóstico. */}
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field-label">
            Nome de usuário
            <span className="auth-field-shell">
              <UserRound className="auth-h-4-w-4-f89m3f" />
              <input
                autoComplete="username"
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="auth-input"
                placeholder="Seu usuário"
              />
            </span>
          </label>
          <label className="auth-field-label">
            Senha
            <span className="auth-field-shell">
              <LockKeyhole className="auth-h-4-w-4-f89m3f" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="Sua senha"
              />
            </span>
          </label>
          <button className="auth-submit" type="submit">
            Entrar <ArrowRight className="auth-h-4-w-4-3ulyf2" />
          </button>
          {message && (
            <p role="status" className="auth-message">
              {message}
            </p>
          )}
        </form>
        <p className="auth-footer">
          Ainda não tem conta?{" "}
          <a href="/login/registro" className="auth-link">
            Criar conta
          </a>
        </p>
        <a href="/" className="auth-back-link">
          Voltar à página inicial
        </a>
      </section>
    </main>
  );
}

export default LoginPage;
