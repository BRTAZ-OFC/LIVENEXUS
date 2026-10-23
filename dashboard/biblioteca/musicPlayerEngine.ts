export type MusicTrack = {
  videoId: string;
  title: string;
  artist?: string;
  album?: string;
  thumbnail?: string;
  durationStr?: string;
  source?: string;
  [key: string]: unknown;
};

type PlayerState = {
  track: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: MusicTrack[];
  index: number;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
  history: number[];
};

const state: PlayerState = {
  track: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
  queue: [],
  index: -1,
  repeat: "off",
  shuffle: false,
  history: [],
};
const listeners = new Set<(next: PlayerState) => void>();
let frame: HTMLIFrameElement | null = null;
let messageHandlerReady = false;
let progressTimer: ReturnType<typeof setInterval> | null = null;
let observedPlaying = false;

function snapshot(): PlayerState {
  return { ...state, queue: [...state.queue], history: [...state.history] };
}
function emit() {
  const next = snapshot();
  for (const listener of listeners) {
    try {
      listener(next);
    } catch {
      /* isolate UI subscribers */
    }
  }
}
function post(func: string, args: unknown[] = []) {
  try {
    frame?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube-nocookie.com",
    );
  } catch {
    /* iframe may still be loading */
  }
}
function startProgressPoll() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (state.track && frame?.contentWindow) {
      post("getCurrentTime");
      post("getDuration");
    }
  }, 1000);
}
function playQueueIndex(index: number) {
  if (index < 0 || index >= state.queue.length) return;
  const track = state.queue[index];
  if (!track?.videoId) return;
  if (state.track && state.index >= 0 && state.index !== index) state.history.push(state.index);
  state.index = index;
  observedPlaying = false;
  state.track = track;
  state.currentTime = 0;
  state.duration = 0;
  state.isPlaying = true;
  emit();
  if (frame) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(track.videoId)}?autoplay=1&mute=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}`;
    window.setTimeout(() => {
      post("unMute");
      post("setVolume", [state.volume]);
      post("playVideo");
    }, 900);
    window.setTimeout(() => {
      post("unMute");
      post("setVolume", [state.volume]);
    }, 1800);
  }
  startProgressPoll();
}
export function subscribeMusicPlayer(listener: (next: PlayerState) => void) {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}
export function getMusicPlayerState() {
  return snapshot();
}
export function connectMusicPlayerFrame(nextFrame: HTMLIFrameElement | null) {
  frame = nextFrame;
  if (!frame || typeof window === "undefined") return;
  if (!messageHandlerReady) {
    messageHandlerReady = true;
    window.addEventListener("message", (event) => {
      if (!frame || event.source !== frame.contentWindow || typeof event.data !== "string") return;
      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      const info = message?.info || message?.data?.info || message?.infoDelivery;
      if (info && typeof info === "object") {
        if (typeof info.currentTime === "number") state.currentTime = info.currentTime;
        if (typeof info.duration === "number" && info.duration > 0) state.duration = info.duration;
        if (typeof info.playerState === "number") {
          state.isPlaying = info.playerState === 1;
          if (info.playerState === 1) observedPlaying = true;
          if (info.playerState === 0 && observedPlaying) {
            observedPlaying = false;
            advanceMusicTrack(true);
            return;
          }
        }
        emit();
      }
      if (message?.event === "onStateChange" && Number(message?.info) === 0 && observedPlaying) {
        observedPlaying = false;
        state.isPlaying = false;
        advanceMusicTrack(true);
        return;
        emit();
      }
    });
  }
  window.setTimeout(() => {
    try {
      frame?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", channel: "widget" }),
        "https://www.youtube-nocookie.com",
      );
    } catch {}
  }, 300);
}
export function playTrack(track: MusicTrack) {
  if (!track?.videoId) return;
  state.queue = [track];
  state.index = -1;
  state.history = [];
  playQueueIndex(0);
}
export function playTracks(tracks: MusicTrack[], startIndex = 0) {
  const valid = tracks.filter((track) => Boolean(track?.videoId));
  if (!valid.length) return;
  state.queue = valid;
  state.index = -1;
  state.history = [];
  playQueueIndex(Math.min(Math.max(startIndex, 0), valid.length - 1));
}
export function toggleMusicPlayback() {
  if (!state.track) return;
  if (state.isPlaying) {
    post("pauseVideo");
    state.isPlaying = false;
  } else {
    post("unMute");
    post("setVolume", [state.volume]);
    post("playVideo");
    state.isPlaying = true;
    startProgressPoll();
  }
  emit();
}
function advanceMusicTrack(automatic: boolean) {
  if (!state.queue.length || state.index < 0) return;
  if (automatic && state.repeat === "one") {
    playQueueIndex(state.index);
    return;
  }
  let nextIndex = state.index + 1;
  if (state.shuffle && state.queue.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } while (nextIndex === state.index);
  } else if (nextIndex >= state.queue.length) {
    if (state.repeat === "all") nextIndex = 0;
    else {
      state.isPlaying = false;
      emit();
      return;
    }
  }
  playQueueIndex(nextIndex);
}
export function nextMusicTrack() {
  advanceMusicTrack(false);
}
export function previousMusicTrack() {
  if (state.history.length) {
    const previous = state.history.pop()!;
    const target =
      previous >= 0 && previous < state.queue.length ? previous : Math.max(0, state.index - 1);
    playQueueIndex(target);
  } else if (state.index > 0) playQueueIndex(state.index - 1);
  else if (state.track) {
    post("seekTo", [0, true]);
    post("playVideo");
    state.currentTime = 0;
    state.isPlaying = true;
    emit();
  }
}
export function toggleMusicShuffle() {
  state.shuffle = !state.shuffle;
  emit();
}
export function cycleMusicRepeat() {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  emit();
}
export function seekMusicTo(seconds: number) {
  const target = Math.max(
    0,
    Math.min(Number(seconds) || 0, state.duration || Number(seconds) || 0),
  );
  post("seekTo", [target, true]);
  state.currentTime = target;
  emit();
}
export function setMusicVolume(volume: number) {
  state.volume = Math.max(0, Math.min(100, Math.round(volume)));
  post("setVolume", [state.volume]);
  if (state.volume > 0) post("unMute");
  emit();
}
