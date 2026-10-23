import { Route, Routes } from "react-router-dom";
import HomePage from "./index";
import DashboardPage from "./dashboard";
import LoginPage from "./login/index";
import RegisterPage from "./login/registro";
import DatabasePage from "./admin/banco";
import OverlayReceiver from "./overlay/Overlay_Receiver";

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <p className="not-found-eyebrow">Erro 404</p>
        <h1 className="not-found-title">Página não encontrada</h1>
        <p className="not-found-description">A página solicitada não existe ou foi movida.</p>
        <a className="button-primary" href="/">
          Voltar ao início
        </a>
      </section>
    </main>
  );
}

/* Rotas explícitas: sem descoberta de arquivos nem árvore gerada. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/registro" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/admin/banco" element={<DatabasePage />} />
      <Route path="/overlay/receiver/:id" element={<OverlayReceiver />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
