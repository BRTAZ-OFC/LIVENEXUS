// Widgets cujo renderer não implementa renderização de fragmentos independentes.
export const NON_FRAGMENTABLE_WIDGET_IDS = [
  "manual-pix-widget",
  "react-hub-widget",
  "multi-viewers-counter",
  "twitch-chat-box",
  "twitch-alerts",
  "twitch-event-list",
  "twitch-bits-goal",
  "twitch-raid-goal",
  "twitch-latest-sub",
  "twitch-latest-cheer",
  "twitch-latest-raid",
  "twitch-top-cheer",
  "twitch-sub-counter",
  "twitch-bits-counter",
  "twitch-chat-speed",
  "twitch-hype-meter",
  "twitch-chat-vibe",
  "twitch-viewers-chart",
  "twitch-chatter-leaderboard",
  "twitch-poll",
  "twitch-raffle",
  "twitch-sub-train",
  "twitch-word-cloud",
  "twitch-emote-shower",
  "twitch-uptime",
  "twitch-commands-list",
  "twitch-milestones",
  "twitch-rules",
  "twitch-schedule",
  "twitch-schedule-ticker",
  "twitch-moderator-feed",
];

// Apenas fragmentos com suporte explícito no renderer/componentes reais.
// Os valores dinâmicos são obtidos pela própria widget (dados da live, relógio, etc.).
export const WIDGET_ELEMENTS_MAP = {
  "manual-death-counter": [{ key: "count", label: "Contagem de mortes" }],
  "manual-clock": [
    { key: "time", label: "Hora atual" },
    { key: "date", label: "Data atual" },
  ],
  "manual-timer": [{ key: "timer", label: "Temporizador" }],
  "manual-now-playing": [
    { key: "title", label: "Nome da faixa" },
    { key: "artist", label: "Artista" },
    { key: "cover", label: "Capa da faixa" },
  ],
  "twitch-status-label": [
    { key: "status_badge", label: "Status ao vivo/offline" },
    { key: "viewers_count", label: "Contador de espectadores" },
    { key: "stream_title", label: "Título real da transmissão" },
    { key: "stream_game", label: "Categoria/jogo real" },
  ],
  "youtube-native-poll": [
    { key: "poll_question", label: "Pergunta da enquete" },
    { key: "poll_options", label: "Opções reais da enquete" },
    { key: "poll_status", label: "Estado real da enquete" },
  ],
  "twitch-sub-goal": [
    { key: "goal_title", label: "Título da meta de inscritos" },
    { key: "goal_progress_bar", label: "Barra real de progresso" },
  ],
};

export function isWidgetFragmentable(widgetId) {
  if (!widgetId || NON_FRAGMENTABLE_WIDGET_IDS.includes(widgetId)) return false;
  return Boolean(WIDGET_ELEMENTS_MAP[widgetId]);
}

export function getWidgetInternalElements(widgetId) {
  if (!widgetId || !isWidgetFragmentable(widgetId)) return [];
  return WIDGET_ELEMENTS_MAP[widgetId] || [];
}

export function getWidgetDefaultDimensions(widgetId, isFullWidget) {
  if (!isFullWidget) {
    return { width: 260, height: 50 };
  }

  switch (widgetId) {
    case "react-hub-widget":
      return { width: 420, height: 640 };
    case "twitch-chat-box":
      return { width: 380, height: 560 };
    case "twitch-alerts":
      return { width: 500, height: 140 };
    case "twitch-event-list":
      return { width: 440, height: 460 };
    case "youtube-native-poll":
      return { width: 380, height: 260 };
    case "twitch-status-label":
      return { width: 320, height: 90 };
    case "twitch-sub-goal":
    case "twitch-bits-goal":
    case "twitch-raid-goal":
      return { width: 380, height: 120 };
    case "twitch-latest-sub":
    case "twitch-latest-cheer":
    case "twitch-latest-raid":
    case "twitch-top-cheer":
      return { width: 280, height: 70 };
    case "twitch-sub-counter":
    case "twitch-bits-counter":
      return { width: 240, height: 80 };
    default: {
      if (widgetId?.startsWith("chat") || widgetId?.includes("chat"))
        return { width: 380, height: 560 };
      if (widgetId?.includes("alert")) return { width: 500, height: 140 };
      if (widgetId?.includes("event") || widgetId?.includes("list") || widgetId?.includes("feed"))
        return { width: 440, height: 460 };
      if (widgetId?.includes("goal")) return { width: 380, height: 120 };
      if (widgetId?.includes("status") || widgetId?.includes("label") || widgetId?.includes("counter"))
        return { width: 300, height: 80 };
      return { width: 360, height: 240 };
    }
  }
}
