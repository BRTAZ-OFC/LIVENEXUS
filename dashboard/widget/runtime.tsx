import { useMemo, createContext, useContext } from "react";
import { useMultiChatSnapshot } from "../multichat";

const PLATFORMS = ["Twitch", "Kick", "YouTube"] as const;

/** Contexto para permitir injeção de dados externos (ex: via WebRTC Consumer) */
export const StreamingContext = createContext<any>(null);

/** Adapta o estado do multichat do LIVENEXUS à interface usada pelos widgets migrados. */
export function useStreaming() {
  const contextValue = useContext(StreamingContext);
  const snapshot = useMultiChatSnapshot();

  const connections = useMemo(() => {
    if (contextValue?.connections) return contextValue.connections;

    const result: Record<
      string,
      { status: string; viewers: number | null; detail: string; channel: string }
    > = {};
    for (const platform of PLATFORMS) {
      const source = snapshot.statuses[platform];
      result[platform] = {
        status: source.status.toLowerCase() === "open" ? "connected" : source.status.toLowerCase(),
        viewers: source.viewers,
        detail: source.detail,
        channel: snapshot.channels[platform] || "",
      };
    }
    return result;
  }, [snapshot, contextValue?.connections]);

  const liveActivity = useMemo(() => {
    if (contextValue?.liveActivity) return contextValue.liveActivity;

    const items = snapshot.messages.map((message) => ({
      ...message,
      eventMeta: message.eventMeta || null,
      eventType: message.eventType || null,
      text: message.text,
      author: message.author,
      timestamp: message.timestamp,
    }));
    return {
      items,
      lastMessage: items.find((item) => !item.eventType) || null,
      lastEvent: items.find((item) => !!item.eventType) || null,
    };
  }, [snapshot.messages, contextValue?.liveActivity]);

  const streamMeta = useMemo(() => {
    if (contextValue?.streamMeta) return contextValue.streamMeta;

    const result: Record<
      string,
      {
        title: string;
        channelName: string;
        startedAt: unknown;
        game?: unknown;
        streamId?: unknown;
        streamUrl?: unknown;
      }
    > = {};
    for (const platform of PLATFORMS) {
      const source = snapshot.statuses[platform];
      result[platform] = {
        ...(source.streamMeta || {}),
        title: String(source.streamMeta?.title || source.meta || ""),
        channelName: String(source.streamMeta?.channelName || snapshot.channels[platform] || ""),
        startedAt: source.streamMeta?.startedAt || null,
      };
    }
    return result;
  }, [snapshot, contextValue?.streamMeta]);

  return {
    connections,
    streamMeta,
    liveActivity,
    messages: contextValue?.messages || snapshot.messages,
    isOnline: contextValue?.isOnline ?? true,
  };
}
