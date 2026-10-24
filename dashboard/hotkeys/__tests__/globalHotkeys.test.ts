import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initDeathCounter, getDeathCount, updateDeathCount, syncDeathCounter } from "../../widget/deathCounterEngine";
import { getMusicPlayerState, setMusicVolume, playTracks } from "../../biblioteca/musicPlayerEngine";
import { useGlobalHotkeys } from "../useGlobalHotkeys";
import { renderHook } from "@testing-library/react";

describe("Global Hotkeys System", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    syncDeathCounter(0, false);
    setMusicVolume(50);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Contador de Mortes: incrementa com Ctrl + + no teclado principal", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    expect(getDeathCount()).toBe(0);

    // Dispara Ctrl + '+' (key: '+', code: 'Equal', shiftKey: true)
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "Equal",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    expect(getDeathCount()).toBe(1);

    // Outro incremento
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "Equal",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    expect(getDeathCount()).toBe(2);
    unmount();
  });

  it("1. Contador de Mortes: incrementa com Ctrl + NumpadAdd", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    expect(getDeathCount()).toBe(0);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    expect(getDeathCount()).toBe(1);
    unmount();
  });

  it("1. Contador de Mortes: diminui com Ctrl + - no teclado principal e Numpad", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    updateDeathCount(5);
    expect(getDeathCount()).toBe(5);

    // Ctrl + '-' teclado principal
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "Minus",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(4);

    // Ctrl + NumpadSubtract
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "NumpadSubtract",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(3);

    // Não deve ficar negativo
    updateDeathCount(-10);
    expect(getDeathCount()).toBe(0);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "Minus",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(0);
    unmount();
  });

  it("2. Volume do player: aumenta e diminui em 1 ponto percentual sem Ctrl", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    setMusicVolume(50);
    expect(getMusicPlayerState().volume).toBe(50);

    // Tecla '+' principal (shiftKey: true)
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "Equal",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(51);

    // Tecla '+' no NumpadAdd
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(52);

    // Tecla '-' no teclado principal
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "Minus",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(51);

    // Tecla '-' no NumpadSubtract
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "NumpadSubtract",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(50);

    // Respeita limite máximo 100%
    setMusicVolume(100);
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(100);

    // Respeita limite mínimo 0%
    setMusicVolume(0);
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "NumpadSubtract",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(0);

    unmount();
  });

  it("3. Controle das músicas: avança com Ctrl + . e volta com Ctrl + ,", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    playTracks([
      { videoId: "v1", title: "Track 1" },
      { videoId: "v2", title: "Track 2" },
      { videoId: "v3", title: "Track 3" },
    ], 0);

    expect(getMusicPlayerState().index).toBe(0);

    // Ctrl + '.' avança para próxima
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: ".",
        code: "Period",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().index).toBe(1);

    // Ctrl + '.' avança para a próxima novamente
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: ".",
        code: "Period",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().index).toBe(2);

    // Ctrl + ',' volta para a anterior
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: ",",
        code: "Comma",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().index).toBe(1);

    unmount();
  });

  it("4. Proteção contra digitação em campos de texto (input, textarea, contenteditable)", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    setMusicVolume(50);
    syncDeathCounter(10);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Digitando '+' no input não deve alterar volume nem mortes
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(50);

    // Ctrl + '+' no input não deve alterar mortes
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "Equal",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(10);

    // Ctrl + '.' no input não deve pular música
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: ".",
        code: "Period",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    document.body.removeChild(input);
    unmount();
  });

  it("5. Previne execução duplicada em eventos com event.repeat = true", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    syncDeathCounter(0);
    setMusicVolume(50);

    // Disparo repetido mantido pressionado
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        repeat: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(50);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        ctrlKey: true,
        repeat: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(0);

    unmount();
  });

  it("6. Suporta Ctrl + Shift + = e Ctrl + = no layout físico do teclado US", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    syncDeathCounter(2);

    // Ctrl + Shift + Equal (onde a tecla física é '=' mas com Shift gera '+')
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "Equal",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(3);

    // Ctrl + '=' (atalho nativo de zoom que mapeia para o mesmo caractere de adição)
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "=",
        code: "Equal",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(4);

    unmount();
  });

  it("7. Não aciona hotkeys quando Alt estiver pressionado", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    syncDeathCounter(5);
    setMusicVolume(50);

    // Alt + '+' não altera mortes nem volume
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        altKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(50);

    // Ctrl + Alt + '+' não altera mortes
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        ctrlKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(5);

    unmount();
  });

  it("8. Proteção contra digitação em textarea e contenteditable", () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    setMusicVolume(40);
    syncDeathCounter(3);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "NumpadAdd",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(40);

    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "+",
        code: "Equal",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getDeathCount()).toBe(3);

    document.body.removeChild(textarea);

    // Elemento contenteditable
    const editableDiv = document.createElement("div");
    editableDiv.contentEditable = "true";
    document.body.appendChild(editableDiv);
    editableDiv.focus();

    editableDiv.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "-",
        code: "Minus",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(getMusicPlayerState().volume).toBe(40);

    document.body.removeChild(editableDiv);
    unmount();
  });
});
