/* BLOCO 1 — Imports de rota, navegação, estados, ícones e cadastro do servidor. */
import { useNavigate } from "react-router-dom";
import { AudioLines, ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { registerUser } from "./auth-client";

/* BLOCO 2 — A página de cadastro é registrada em dashboard/App.tsx. */
/* BLOCO 3 — Armazena usuário, senha, confirmação e mensagens. */
function RegisterPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // BLOCO 4 — Confere senhas, verifica duplicidade e envia o cadastro.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }
    try {
      const check = await fetch(`/api/check-username?user=${encodeURIComponent(user.trim())}`);
      const availability = await check.json();
      if (!check.ok) {
        setMessage(availability.message ?? "Não foi possível verificar o nome de usuário.");
        return;
      }
      if (availability.exists) {
        setMessage("Esse nome de usuário já está em uso.");
        return;
      }
      const result = await registerUser({ data: { user, password } });
      if (result.ok) {
        navigate("/login");
        return;
      }
      setMessage(result.message);
    } catch {
      setMessage("Não foi possível concluir o cadastro. Tente novamente.");
    }
  }

  /* BLOCO 5 — Monta a tela de cadastro; os estilos ficam em css/auth.css. */

  return (
    <main className="auth-page">
      <div aria-hidden="true" className="auth-pointer-events-none-abso-kxfgfw" />
      <section className="auth-card">
        <a href="/" className="auth-brand">
          <span className="auth-brand-mark">
            <AudioLines className="auth-h-5-w-5-8794lx" />
          </span>
          <span className="auth-text-lg-font-extrabold-1h5z3qk">
            LIVE<span className="auth-text-cyan-300-bbfjjq">NEXUS</span>
          </span>
        </a>
        <p className="auth-eyebrow-register">Comece por aqui</p>
        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-description">Preencha os dados para criar seu acesso.</p>
        {/* BLOCO 6 — Campos do cadastro, aviso de senha exclusiva e mensagens. */}
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field-label">
            Nome de usuário
            <span className="auth-field-shell">
              <UserRound className="auth-h-4-w-4-f89m3f" />
              <input
                autoComplete="username"
                minLength={3}
                maxLength={32}
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="auth-input"
                placeholder="Escolha um usuário"
              />
            </span>
          </label>
          <label className="auth-field-label">
            Senha
            <span className="auth-field-shell">
              <LockKeyhole className="auth-h-4-w-4-f89m3f" />
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="Use uma senha forte e exclusiva"
              />
            </span>
          </label>
          <label className="auth-field-label">
            Confirmar senha
            <span className="auth-field-shell">
              <LockKeyhole className="auth-h-4-w-4-f89m3f" />
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                placeholder="Digite a senha novamente"
              />
            </span>
          </label>
          <p className="auth-text-xs-leading-5-vfygoe">
            Não use senhas padrão, repetidas ou utilizadas em outros serviços. Use uma senha
            exclusiva com pelo menos 8 caracteres.
          </p>
          <button className="auth-submit" type="submit">
            Cadastrar <ArrowRight className="auth-h-4-w-4-3ulyf2" />
          </button>
          {message && (
            <p role="status" className="auth-message">
              {message}
            </p>
          )}
        </form>
        <p className="auth-footer">
          Já tem conta?{" "}
          <a href="/login" className="auth-link">
            Entrar
          </a>
        </p>
        <a href="/" className="auth-back-link">
          Voltar à página inicial
        </a>
      </section>
    </main>
  );
}

export default RegisterPage;
