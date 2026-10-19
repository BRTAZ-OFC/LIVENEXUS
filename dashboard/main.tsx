import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { RealErrorBoundary, RealErrorViewer } from "./ErrorViewer";
import "./css/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Elemento raiz "#root" não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <RealErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RealErrorBoundary>
    <RealErrorViewer />
  </StrictMode>,
);
