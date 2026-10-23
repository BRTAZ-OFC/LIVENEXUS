/* LIVENEXUS: Explica como os participantes trocam mensagens para iniciar a conexão RTC. */
// Cliente de Signaling HTTP de Ultra-Baixa Latência para a infraestrutura RTC Automática do LiveNexus
// Otimizado para estabelecer conexão WebRTC completa entre 1 a 3 segundos (meta: < 6s)

export const RTC_STUN_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  iceCandidatePoolSize: 0,
};

export class RtcSignalingManager {
  constructor({ runtimeId, role, onLog = () => {}, onSignal = () => {} }) {
    if (!runtimeId || !runtimeId.trim()) {
      throw new Error(
        "Identidade real da sessão não resolvida: runtimeId é obrigatório para o signaling.",
      );
    }
    this.runtimeId = runtimeId.trim();
    this.role = role; // 'publisher' | 'consumer'
    this.onLog = onLog;
    this.onSignal = onSignal;
    this.lastSignalTimestamp = 0;
    this.pollingTimer = null;
    this.isDestroyed = false;
    this.isPolling = false;
    this.currentIntervalMs = 250; // Padrão ultrarrápido durante negociação (250ms)
    this.processedSignalIds = new Set();
  }

  log(message, detail = null, type = "info") {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    this.onLog({ timestamp, role: this.role, message, detail, type });
  }

  // Alterna dinamicamente entre modo rápido (250ms na negociação) e modo econômico (1500ms conectado)
  setFastMode(isFast) {
    const nextInterval = isFast ? 250 : 1500;
    if (this.currentIntervalMs !== nextInterval) {
      this.currentIntervalMs = nextInterval;
      if (this.pollingTimer) {
        this.startPolling(nextInterval);
      }
    }
  }

  async send(type, data = null, toRole = "all") {
    if (this.isDestroyed || !this.runtimeId) return false;
    try {
      this.log(`[Signaling Auto OUT] Enviando ${type.toUpperCase()}`, { type, toRole });
      const res = await fetch(
        `/api/admin/lab/rtc/signal?runtimeId=${encodeURIComponent(this.runtimeId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            runtimeId: this.runtimeId,
            fromRole: this.role,
            toRole,
            type,
            data,
          }),
        },
      );
      if (!res.ok) {
        this.log(`[Signaling Auto ERRO] Resposta HTTP ${res.status}`, null, "error");
        return false;
      }
      const cType = res.headers.get("content-type") || "";
      if (!cType.includes("application/json")) {
        this.log(`[Signaling Auto ERRO] Resposta não-JSON recebida`, null, "error");
        return false;
      }
      const result = await res.json();
      if (!result.ok) {
        this.log(`[Signaling Auto ERRO] Resposta de falha: ${result.error}`, null, "error");
        return false;
      }

      // Dispara imediatamente uma checagem em 60ms para capturar a resposta do peer sem esperar o ciclo de polling
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.pollNow();
        }
      }, 60);

      return true;
    } catch (err) {
      this.log(`[Signaling Auto EXCEÇÃO] ${err.message}`, null, "error");
      return false;
    }
  }

  async pollNow() {
    if (this.isDestroyed || !this.runtimeId || this.isPolling) return;
    this.isPolling = true;

    try {
      const url = `/api/admin/lab/rtc/signal?runtimeId=${encodeURIComponent(this.runtimeId)}&role=${this.role}&since=${this.lastSignalTimestamp}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        this.log(`[Signaling Auto Poll] HTTP ${res.status}`, null, "warn");
        return;
      }

      const cType = res.headers.get("content-type") || "";
      if (!cType.includes("application/json")) {
        return;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.signals)) {
        for (const sig of data.signals) {
          if (this.processedSignalIds.has(sig.id)) continue;
          this.processedSignalIds.add(sig.id);
          if (sig.timestamp > this.lastSignalTimestamp) {
            this.lastSignalTimestamp = sig.timestamp;
          }
          this.log(
            `[Signaling Auto IN] Recebido ${sig.type.toUpperCase()} de ${sig.fromRole}`,
            sig.data,
          );
          try {
            await this.onSignal(sig);
          } catch (sErr) {
            this.log(`[Signaling Auto Callback ERRO] ${sErr.message}`, null, "error");
          }
        }
      }

      // Se não recebeu sinais, mantém o relógio com margem de segurança para não pular sinais concorrentes
      if (data.ok && (!data.signals || data.signals.length === 0) && data.serverTime) {
        if (this.lastSignalTimestamp === 0) {
          this.lastSignalTimestamp = Math.max(0, data.serverTime - 1000);
        }
      }
    } catch (err) {
      this.log(`[Signaling Auto Poll] ${err.message}`, null, "warn");
    } finally {
      this.isPolling = false;
    }
  }

  startPolling(intervalMs = 250) {
    this.stopPolling();
    this.currentIntervalMs = intervalMs;

    // Executa a primeira leitura imediatamente
    this.pollNow();

    this.pollingTimer = setInterval(() => {
      this.pollNow();
    }, this.currentIntervalMs);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.stopPolling();
    this.processedSignalIds.clear();
  }
}
