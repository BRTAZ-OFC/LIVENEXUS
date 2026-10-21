import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from "react";
import TwitchChatBox from "./Widget_TwitchChatBox";
import { useStreaming } from "../runtime";
import {
  getStoredReactQueue,
  getStoredActiveReactVideo,
  syncVideosFromChatMessages,
} from "../../cenarios/Scenario_reactVideoService";
import { MessageSquare, Film, SplitSquareVertical, CheckCircle2, Radio, Play, X } from "lucide-react";

function getYouTubeEmbedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    let videoId = "";
    if (url.hostname === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (url.hostname.includes("youtube.com") || url.hostname.includes("youtube-nocookie.com")) {
      videoId = url.searchParams.get("v") || "";
      const parts = url.pathname.split("/").filter(Boolean);
      if (!videoId && parts.length > 1 && ["embed", "shorts", "live"].includes(parts[0])) videoId = parts[1];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? "https://www.youtube.com/embed/" + videoId + "?autoplay=1&rel=0" : "";
  } catch { return ""; }
}

export default function ReactHubWidget({ config = {} }) {
  const { liveActivity } = useStreaming();

  const [queue, setQueue] = useState(() => getStoredReactQueue());
  const [activeVideo, setActiveVideo] = useState(() => getStoredActiveReactVideo());
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const containerRef = useRef(null);

  // Sync queue and active video with BroadcastChannel and storage events
  useEffect(() => {
    let channel = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("scenario_react_bus");
        channel.onmessage = (event) => {
          if (event.data?.type === "QUEUE_UPDATED") {
            setQueue(event.data.payload || []);
          } else if (event.data?.type === "ACTIVE_VIDEO_CHANGED") {
            setActiveVideo(event.data.payload || null);
          }
        };
      }
    } catch {
      // ignore
    }

    const handleStorage = (e) => {
      if (e.key === "scenario_react_queue") {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          setQueue(Array.isArray(parsed) ? parsed : []);
        } catch {
          // ignore
        }
      } else if (e.key === "scenario_react_active_video") {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setActiveVideo(parsed);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    const interval = setInterval(() => {
      setQueue(getStoredReactQueue());
      setActiveVideo(getStoredActiveReactVideo());
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
      if (channel) {
        try {
          channel.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // Automatically monitor live chat messages for YouTube video links
  useEffect(() => {
    if (liveActivity?.items && liveActivity.items.length > 0) {
      syncVideosFromChatMessages(liveActivity.items);
      setQueue(getStoredReactQueue());
    }
  }, [liveActivity?.items]);

  const queueKey = useMemo(() => {
    return queue.map((q) => q.id).join(",");
  }, [queue]);

  // Adjust visibility of elements based on container bounds directly in DOM to avoid state update loops
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create a ResizeObserver to trigger visibility adjustments on layout resize
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        adjustVisibleItems();
      });
    });
    observer.observe(container);

    function adjustVisibleItems() {
      const containerHeight = container.clientHeight;
      if (containerHeight <= 0) return;

      const children = Array.from(container.children);
      if (children.length === 0) return;

      // First, restore display of all children to measure them properly
      children.forEach((child) => {
        child.style.display = "flex";
      });

      let totalHeight = 0;
      const gap = 6; // space-y-1.5 (1.5 * 4px = 6px)
      let fitCount = 0;
      let hasOverflowed = false;

      // Newest videos are at the start of the queue (rendered at index 0).
      // We prioritize showing the newest videos and hide the older ones that don't fit.
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (hasOverflowed) {
          child.style.display = "none";
          continue;
        }

        const childHeight = child.offsetHeight;
        const neededSpace = childHeight + (fitCount > 0 ? gap : 0);

        if (totalHeight + neededSpace <= containerHeight) {
          totalHeight += neededSpace;
          fitCount++;
        } else {
          hasOverflowed = true;
          child.style.display = "none";
        }
      }
    }

    adjustVisibleItems();

    return () => {
      observer.disconnect();
    };
  }, [queue, queueKey]);

  const pendingCount = useMemo(() => {
    return queue.filter((item) => item.status === "pending").length;
  }, [queue]);

  const borderRadius = config.borderRadius || "12px";
  const backgroundColor = config.backgroundColor || "rgba(15, 23, 42, 0.9)";

  return (
    <div
      style={{
        borderRadius,
        background: backgroundColor,
        fontFamily: config.fontFamily || "Inter, sans-serif",
      }}
      className="w-full h-full flex flex-col overflow-hidden text-slate-100 shadow-2xl select-none"
    >
      {/* Top Header - Tabs/Buttons Removed */}
      <div className="p-2 border-b border-white/10 bg-slate-900/80 flex items-center justify-between gap-1.5 shrink-0 select-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <SplitSquareVertical className="w-3.5 h-3.5 text-blue-500" />
          <span>React Hub</span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">React Hub</span>
        </div>
      </div>

      {/* Main Content Area - Split view is permanently active */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Half: Twitch Chat */}
        <div className="h-[48%] border-b border-white/10 overflow-hidden flex flex-col">
          <div className="px-2.5 py-1 bg-slate-900/60 text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 select-none">
            <MessageSquare className="w-3 h-3 text-purple-400" />
            <span>Chat da Transmissão</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <TwitchChatBox
              config={{ ...config, backgroundColor: "transparent", showBorder: false }}
            />
          </div>
        </div>

        {/* Bottom Half: User-submitted Videos Area */}
        <div className="flex-1 overflow-hidden flex flex-col p-2 space-y-1.5">
          <div className="flex items-center justify-between px-0.5 select-none shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vídeos da Fila</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-600 text-white font-extrabold">
                  {pendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {queue.length} {queue.length === 1 ? "vídeo" : "vídeos"}
            </span>
          </div>

          {renderVideoQueueList()}
        </div>
      </div>
      {previewVideo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-3" role="dialog" aria-modal="true" aria-label="Fila de vídeos para reagir" onClick={() => setPreviewVideo(null)}>
          <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg border border-white/20 bg-slate-950 p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0"><p className="text-xs font-semibold text-white">React Hub — vídeos da fila</p><p className="truncate text-[11px] text-slate-400">Selecionado: {previewVideo.author || "Não identificado"}</p></div>
              <button type="button" data-no-widget-drag onClick={() => setPreviewVideo(null)} aria-label="Fechar popup" className="rounded border border-white/20 p-1.5 text-white hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2">
              <div className="flex min-h-[220px] flex-col overflow-hidden rounded bg-black">
                {getYouTubeEmbedUrl(previewUrl) ? <iframe className="h-full min-h-[220px] w-full flex-1" src={getYouTubeEmbedUrl(previewUrl)} title={"Vídeo enviado por " + (previewVideo.author || "usuário")} allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="flex min-h-[220px] items-center justify-center p-4 text-sm text-slate-400">Selecione um link válido do YouTube na coluna ao lado.</div>}
              </div>
              <div className="min-h-0 overflow-y-auto rounded border border-white/10">
                <div className="sticky top-0 border-b border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200">Fila de vídeos</div>
                <div className="space-y-1 p-2">
                  {queue.map((item, index) => <button key={item.id || index} type="button" data-no-widget-drag onClick={() => { setPreviewVideo(item); setPreviewUrl(item.url || ""); }} className={"block w-full rounded px-2 py-2 text-left text-xs break-words hover:bg-white/10 " + (previewUrl === item.url ? "bg-blue-950/70 text-cyan-200" : "text-slate-300")}>
                    <span className="font-semibold">{index + 1} - {item.author || "Usuário"} enviou = </span><span className="text-cyan-300 underline">{item.url || item.title || "Link indisponível"}</span>
                  </button>)}
                  {queue.length === 0 && <p className="p-2 text-xs text-slate-500">A fila está vazia.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Sub-component: List of user-submitted video links for the stream view
  function renderVideoQueueList() {
    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden space-y-1.5 pr-1 scrollbar-none relative h-full"
      >
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-1.5">
            <Film className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">Nenhum vídeo enviado ainda.</p>
            <p className="text-[11px] text-slate-500 max-w-[240px]">
              Envie links do YouTube pelo painel Config ou envie no chat da transmissão.
            </p>
          </div>
        ) : (
          queue.map((item, index) => {
            const isPlaying = activeVideo && activeVideo.id === item.id;
            const isWatched = item.status === "watched";
            return (
              <button key={item.id} type="button" data-no-widget-drag onClick={() => { setPreviewVideo(item); setPreviewUrl(item.url || ""); }} title="Abrir fila de vídeos" className={"p-2 rounded-lg border transition-all text-left flex items-center gap-1.5 shrink-0 w-full min-w-0 overflow-hidden " + (isPlaying ? "bg-blue-950/80 border-blue-500/80 shadow-md shadow-blue-950/50 ring-1 ring-blue-500/40" : isWatched ? "bg-slate-900/40 border-white/5 opacity-60" : "bg-slate-900/80 border-slate-700/60")}>
                <span className="shrink-0 text-xs font-semibold text-slate-200">{index + 1} - {item.author || "Usuário"} enviou =</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-cyan-300 underline decoration-cyan-700 underline-offset-2">{item.url || item.title || "Link do YouTube"}</span>
                {isPlaying && <Radio className="h-3 w-3 shrink-0 text-rose-400" />}{isWatched && !isPlaying && <CheckCircle2 className="h-3 w-3 shrink-0 text-slate-500" />}
              </button>
            );
          })
        )}
      </div>
    );
  }
}
