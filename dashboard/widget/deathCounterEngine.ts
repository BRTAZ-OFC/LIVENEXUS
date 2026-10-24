/* LIVENEXUS: Motor central de estado, persistência e sincronização do contador de mortes. */
import { triggerReloadRTC } from "./ReloadRTC";

const STORAGE_KEY = "livenexus_death_count";

let currentDeathCount = 0;
let isInitialized = false;
let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Retorna a contagem atual de mortes da sessão.
 */
export function getDeathCount(): number {
  if (!isInitialized && typeof window !== "undefined") {
    initDeathCounter();
  }
  return currentDeathCount;
}

/**
 * Sincroniza a contagem interna a partir de um valor externo e opcionalmente notifica outros componentes.
 */
export function syncDeathCounter(count: number, broadcast = false) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  currentDeathCount = safeCount;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(safeCount));
    } catch {
      // ignore
    }

    if (broadcast) {
      window.dispatchEvent(
        new CustomEvent("livenexus:death-counter-updated", {
          detail: { count: safeCount, timestamp: Date.now() },
        }),
      );
    }
  }
}

/**
 * Persiste o novo valor no backend caso o usuário possua uma overlay salva com a widget de mortes.
 */
async function persistDeathCountToServer(newCount: number) {
  if (typeof window === "undefined") return;

  try {
    const token = sessionStorage.getItem("livenexus_token");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/api/overlay/canvas", {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return;

    const data = await res.json();
    if (!data.ok || !Array.isArray(data.overlays)) return;

    // Localiza e atualiza overlays que possuam instâncias da widget manual-death-counter
    for (const row of data.overlays) {
      const source = (row.settings || row.config || row.data || row) as Record<string, unknown>;
      const instances = Array.isArray(source.instances)
        ? (source.instances as Array<Record<string, unknown>>)
        : [];

      let hasDeathWidget = false;
      const updatedInstances = instances.map((inst) => {
        if (inst.widgetId === "manual-death-counter") {
          hasDeathWidget = true;
          return {
            ...inst,
            config: {
              ...((inst.config as Record<string, unknown>) || {}),
              deathCount: newCount,
            },
          };
        }
        return inst;
      });

      if (hasDeathWidget && row.id) {
        const updatedOverlay = {
          ...source,
          id: row.id,
          name: row.name || source.name || "Overlay",
          instances: updatedInstances,
        };

        await fetch("/api/overlay/canvas", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
          body: JSON.stringify({
            overlay: updatedOverlay,
            currentId: row.id,
            createNew: false,
          }),
        });
      }
    }
  } catch {
    // Falhas de rede não interrompem o funcionamento em tela
  }
}

/**
 * Incrementa ou decrementa a contagem de mortes respeitando a regra de valor mínimo (0).
 */
export function updateDeathCount(delta: number): number {
  const current = getDeathCount();
  const next = Math.max(0, current + delta);
  currentDeathCount = next;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }

    // Dispara a sincronização RTC entre abas e OBS
    triggerReloadRTC("shortcut-death-counter", { deathCount: next, mortes: next });

    // Notifica instantaneamente todos os componentes em tela
    window.dispatchEvent(
      new CustomEvent("livenexus:death-counter-updated", {
        detail: { count: next, timestamp: Date.now() },
      }),
    );

    // Persistência com debounce no servidor
    if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
    pendingSaveTimer = setTimeout(() => {
      void persistDeathCountToServer(next);
    }, 600);
  }

  return next;
}

/**
 * Inicializa a sincronização do contador de mortes e os listeners de abas cruzadas.
 */
export function initDeathCounter(): () => void {
  if (isInitialized || typeof window === "undefined") return () => {};
  isInitialized = true;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      currentDeathCount = Math.max(0, parseInt(saved, 10) || 0);
    }
  } catch {
    // ignore
  }

  // Tenta sincronizar a partir do backend caso ainda não exista no localStorage
  const token = sessionStorage.getItem("livenexus_token");
  if (token && window.localStorage.getItem(STORAGE_KEY) === null) {
    fetch("/api/overlay/canvas", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.overlays)) {
          for (const row of data.overlays) {
            const source = (row.settings || row.config || row.data || row) as Record<
              string,
              unknown
            >;
            const instances = Array.isArray(source?.instances)
              ? (source.instances as Array<Record<string, unknown>>)
              : [];
            const inst = instances.find((i) => i.widgetId === "manual-death-counter");
            if (inst && typeof inst.config === "object" && inst.config !== null) {
              const cfg = inst.config as Record<string, unknown>;
              if (cfg.deathCount !== undefined) {
                const val = Math.max(0, Number(cfg.deathCount) || 0);
                syncDeathCounter(val, true);
                break;
              }
            }
          }
        }
      })
      .catch(() => {});
  }

  // Sincronização entre abas diferentes via evento storage
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue !== null) {
      const val = Math.max(0, parseInt(e.newValue, 10) || 0);
      currentDeathCount = val;
      window.dispatchEvent(
        new CustomEvent("livenexus:death-counter-updated", {
          detail: { count: val, timestamp: Date.now() },
        }),
      );
    }
  };

  // Listener para atualizações disparadas por componentes locais
  const handleCustomUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<{ count?: number }>;
    if (typeof customEvent.detail?.count === "number") {
      const val = Math.max(0, customEvent.detail.count);
      currentDeathCount = val;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(val));
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("livenexus:death-counter-updated", handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("livenexus:death-counter-updated", handleCustomUpdate);
  };
}
