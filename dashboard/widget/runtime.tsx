import { useMemo } from "react";
import { useMultiChatSnapshot } from "../multichat";

const PLATFORMS = ["Twitch", "Kick", "YouTube"] as const;

/** Adapta o estado do multichat do LIVENEXUS à interface usada pelos widgets migrados. */
export function useStreaming() {
  const snapshot = useMultiChatSnapshot();

  const connections = useMemo(() => {
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
  }, [snapshot]);

  const liveActivity = useMemo(
    () => {
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
    },
    [snapshot.messages],
  );

  const streamMeta = useMemo(() => {
    const result: Record<string, { title: string; channelName: string; startedAt: unknown; game?: unknown; streamId?: unknown; streamUrl?: unknown }> = {};
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
  }, [snapshot]);

  return { connections, streamMeta, liveActivity, messages: snapshot.messages };
}
