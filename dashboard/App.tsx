import { Route, Routes } from "react-router-dom"; // Importa os componentes que organizam os endereços da aplicação.
import HomePage from "./index"; // Carrega a página inicial.
import DashboardPage from "./dashboard"; // Carrega a página principal do painel.
import LoginPage from "./login/index"; // Carrega a tela de entrada da conta.
import RegisterPage from "./login/registro"; // Carrega o formulário de criação de conta.
import DatabasePage from "./admin/banco"; // Carrega a área de consulta e administração dos dados.
import OverlayReceiver from "./overlay/Overlay_Receiver"; // Carrega a tela que recebe e exibe um overlay.

/**
 * Mostra uma página simples quando o endereço acessado não existe.
 */
function NotFoundPage() {
  return (
    // Área principal da mensagem de página não encontrada.
    <main className="not-found-page">
      {/* Cartão que reúne o aviso e o caminho para voltar. */}
      <section className="not-found-card">
        {/* Identifica o erro apresentado ao visitante. */}
        <p className="not-found-eyebrow">Erro 404</p>
        {/* Título principal do aviso. */}
        <h1 className="not-found-title">Página não encontrada</h1>
        {/* Explica por que o conteúdo não foi exibido. */}
        <p className="not-found-description">A página solicitada não existe ou foi movida.</p>
        {/* Link para retornar à página inicial. */}
        <a className="button-primary" href="/">
          Voltar ao início
        </a>
      </section>
    </main>
  );
}

/* Define os endereços disponíveis sem gerar rotas automaticamente. */
export default function App() {
  return (
    // Escolhe qual página mostrar de acordo com o endereço acessado.
    <Routes>
      {/* Página inicial do site. */}
      <Route path="/" element={<HomePage />} />
      {/* Tela de entrada na conta. */}
      <Route path="/login" element={<LoginPage />} />
      {/* Tela de cadastro de uma nova conta. */}
      <Route path="/login/registro" element={<RegisterPage />} />
      {/* Painel principal do usuário. */}
      <Route path="/dashboard" element={<DashboardPage />} />
      {/* Área administrativa dos dados. */}
      <Route path="/admin/banco" element={<DatabasePage />} />
      {/* Exibição do overlay identificado pelo parâmetro :id. */}
      <Route path="/overlay/receiver/:id" element={<OverlayReceiver />} />
      {/* Página exibida para qualquer endereço sem rota correspondente. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
