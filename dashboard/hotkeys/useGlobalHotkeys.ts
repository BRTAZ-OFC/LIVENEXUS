/* LIVENEXUS: Hook centralizador de hotkeys globais compartilhado em toda a aplicação. */
import { useEffect } from "react";
import { initDeathCounter, updateDeathCount } from "../widget/deathCounterEngine";
import {
  getMusicPlayerState,
  nextMusicTrack,
  previousMusicTrack,
  setMusicVolume,
} from "../biblioteca/musicPlayerEngine";

type CanvasHotkeyHandler = {
  handleKeyDown: (event: KeyboardEvent) => boolean;
};

let activeCanvasHandler: CanvasHotkeyHandler | null = null;

export function registerCanvasHotkeyHandler(handler: CanvasHotkeyHandler | null) {
  activeCanvasHandler = handler;
}

/**
 * Detecta se o elemento com foco atual é um campo editável ou input de texto,
 * onde as hotkeys globais não devem interferir na digitação do usuário.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  const active = typeof document !== "undefined" ? document.activeElement : null;
  const candidates = [target, active].filter(Boolean);

  for (const item of candidates) {
    const el = item as HTMLElement;
    if (!el || typeof el !== "object") continue;

    const isContentEditable =
      el.isContentEditable === true ||
      el.contentEditable === "true" ||
      el.getAttribute?.("contenteditable") === "true" ||
      el.getAttribute?.("contenteditable") === "" ||
      (typeof el.closest === "function" &&
        Boolean(el.closest('[contenteditable="true"], [contenteditable=""]')));

    if (isContentEditable) return true;

    const tagName = String(el.tagName || "").toUpperCase();
    if (tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "INPUT") {
      return true;
    }

    const role = el.getAttribute?.("role");
    if (role === "textbox" || role === "searchbox" || role === "combobox") return true;
  }

  return false;
}

/**
 * Hook global que registra os atalhos de teclado de forma única na janela.
 */
export function useGlobalHotkeys() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inicializa a sincronização do contador de mortes
    const cleanupDeathSync = initDeathCounter();

    function handleKeyDown(event: KeyboardEvent) {
      // 1. Ignora quando o usuário estiver focado em campos de digitação
      if (isEditableTarget(event.target)) return;

      // 2. Previne disparos repetidos contínuos ao segurar a tecla pressionada
      if (event.repeat) return;

      const hasCtrl = event.ctrlKey || event.metaKey;
      const hasAlt = event.altKey;

      // Atalhos do sistema com Alt não devem ser interceptados
      if (hasAlt) return;

      // 3. Verifica se há um canvas ativo (Overlay ou Cenário) tratando movimentação e exclusão
      if (activeCanvasHandler) {
        const handled = activeCanvasHandler.handleKeyDown(event);
        if (handled) return;
      }

      if (hasCtrl) {
        // --- 1. CONTADOR DE MORTES (Exige Ctrl) ---
        // Ctrl + '+': Aumentar mortes em 1
        const isPlus =
          event.key === "+" ||
          event.code === "NumpadAdd" ||
          (event.code === "Equal" && (event.shiftKey || event.key === "=" || event.key === "+")) ||
          (event.key === "=" && event.shiftKey);

        if (isPlus) {
          event.preventDefault();
          updateDeathCount(1);
          return;
        }

        // Ctrl + '-': Diminuir mortes em 1
        const isMinus =
          !event.shiftKey &&
          (event.key === "-" || event.code === "NumpadSubtract" || event.code === "Minus");

        if (isMinus) {
          event.preventDefault();
          updateDeathCount(-1);
          return;
        }

        // --- 3. CONTROLE DE MÚSICAS (Exige Ctrl) ---
        // Ctrl + '.': Avançar para a próxima música
        const isPeriod =
          event.key === "." ||
          event.code === "Period" ||
          (event.code === "NumpadDecimal" && event.key === ".");

        if (isPeriod) {
          event.preventDefault();
          nextMusicTrack();
          return;
        }

        // Ctrl + ',': Voltar para a música anterior
        const isComma = event.key === "," || event.code === "Comma";

        if (isComma) {
          event.preventDefault();
          previousMusicTrack();
          return;
        }
      } else {
        // --- 2. VOLUME DO PLAYER DE MÚSICA (NÃO exige Ctrl) ---
        // '+': Aumentar volume em 1%
        const isVolumeUp = event.key === "+" || event.code === "NumpadAdd";

        if (isVolumeUp) {
          event.preventDefault();
          const current = getMusicPlayerState().volume;
          setMusicVolume(Math.min(100, current + 1));
          return;
        }

        // '-': Diminuir volume em 1%
        const isVolumeDown =
          !event.shiftKey &&
          (event.key === "-" || event.code === "NumpadSubtract" || event.code === "Minus");

        if (isVolumeDown) {
          event.preventDefault();
          const current = getMusicPlayerState().volume;
          setMusicVolume(Math.max(0, current - 1));
          return;
        }
      }
    }

    // Registra listener no window em fase de captura para garantir atuação global
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      cleanupDeathSync();
    };
  }, []);
}
