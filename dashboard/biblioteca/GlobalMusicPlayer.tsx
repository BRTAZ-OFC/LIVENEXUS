import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import {
  connectMusicPlayerFrame, getMusicPlayerState, nextMusicTrack, previousMusicTrack,
  seekMusicTo, setMusicVolume, subscribeMusicPlayer, toggleMusicPlayback, type MusicTrack,
} from "./musicPlayerEngine";

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function GlobalMusicPlayer() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [player, setPlayer] = useState(getMusicPlayerState());
  useEffect(() => {
    connectMusicPlayerFrame(frameRef.current);
    return subscribeMusicPlayer(setPlayer);
  }, []);
  const track = player.track as MusicTrack | null;
  const progress = player.duration > 0 ? Math.min(100, (player.currentTime / player.duration) * 100) : 0;

  return <>
    <div className="mx-3 flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-slate-950/60 px-2 py-1.5 md:mx-6 md:max-w-3xl">
      {track?.thumbnail
        ? <img src={track.thumbnail} alt="" className="hidden h-9 w-9 shrink-0 rounded-md object-cover sm:block" />
        : <Music2 className="hidden h-5 w-5 shrink-0 text-cyan-300 sm:block" />}
      <div className="min-w-0 max-w-48 flex-1">
        <p className="truncate text-xs font-semibold text-white" title={track?.title}>{track?.title || "Nenhuma música"}</p>
        <p className="truncate text-[10px] text-slate-400">{track?.artist || (track ? "YouTube Music" : "Player musical")}</p>
      </div>
      <button type="button" onClick={previousMusicTrack} disabled={!track} title="Anterior" aria-label="Faixa anterior" className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30"><SkipBack className="h-4 w-4" /></button>
      <button type="button" onClick={toggleMusicPlayback} disabled={!track} title={player.isPlaying ? "Pausar" : "Reproduzir"} aria-label={player.isPlaying ? "Pausar música" : "Reproduzir música"} className="rounded-full bg-cyan-300 p-2 text-slate-950 hover:bg-cyan-200 disabled:opacity-30">{player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
      <button type="button" onClick={nextMusicTrack} disabled={!track || player.index + 1 >= player.queue.length} title="Próxima" aria-label="Próxima faixa" className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30"><SkipForward className="h-4 w-4" /></button>
      <div className="hidden min-w-24 max-w-44 flex-1 items-center gap-1.5 lg:flex">
        <span className="w-8 text-right font-mono text-[9px] text-slate-400">{timeLabel(player.currentTime)}</span>
        <input aria-label="Posição da música" type="range" min={0} max={Math.max(1, player.duration)} step={1} value={Math.min(player.currentTime, player.duration || 0)} onChange={(event) => seekMusicTo(Number(event.target.value))} className="w-full accent-cyan-300" />
        <span className="w-8 font-mono text-[9px] text-slate-400">{timeLabel(player.duration)}</span>
      </div>
      <Volume2 className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
      <input aria-label="Volume da música" type="range" min={0} max={100} value={player.volume} onChange={(event) => setMusicVolume(Number(event.target.value))} className="hidden w-16 accent-cyan-300 sm:block" />
    </div>
    <iframe ref={frameRef} title="Player global do YouTube" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="origin" style={{ position: "fixed", width: 320, height: 180, right: -340, bottom: -200, opacity: 0.01, pointerEvents: "none", zIndex: -1, border: 0 }} />
  </>;
}
