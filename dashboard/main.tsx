import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { RealErrorBoundary } from "./ErrorViewer";
import { LogsCollector } from "./LogsCollector";
import "./css/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Elemento raiz "#root" não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <RealErrorBoundary>
      <LogsCollector />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RealErrorBoundary>
  </StrictMode>,
);
