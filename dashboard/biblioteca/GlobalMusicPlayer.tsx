import { useEffect, useRef, useState } from "react";
import {
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import {
  connectMusicPlayerFrame,
  cycleMusicRepeat,
  getMusicPlayerState,
  nextMusicTrack,
  previousMusicTrack,
  seekMusicTo,
  setMusicVolume,
  subscribeMusicPlayer,
  toggleMusicPlayback,
  toggleMusicShuffle,
  type MusicTrack,
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

  return (
    <>
      <div className="mx-3 flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-slate-950/60 px-2 py-1.5 md:mx-6 md:max-w-3xl">
        {track?.thumbnail ? (
          <img
            src={track.thumbnail}
            alt=""
            className="hidden h-9 w-9 shrink-0 rounded-md object-cover sm:block"
          />
        ) : (
          <Music2 className="hidden h-5 w-5 shrink-0 text-cyan-300 sm:block" />
        )}
        <div className="min-w-0 max-w-48 flex-1">
          <div
            className="w-full min-w-0 overflow-hidden text-xs font-semibold text-white"
            title={track?.title || "Nenhuma música"}
          >
            <div
              className="ln-marquee-motion flex w-max"
              style={{ animation: "global-player-title-marquee 12s linear infinite" }}
            >
              <span className="shrink-0 pr-8">{track?.title || "Nenhuma música"}</span>
              <span className="shrink-0 pr-8" aria-hidden="true">
                {track?.title || "Nenhuma música"}
              </span>
            </div>
            <style>{`@keyframes global-player-title-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
          </div>
          <p className="truncate text-[10px] text-slate-400">
            {track?.artist || (track ? "YouTube Music" : "Player musical")}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMusicShuffle}
          title={player.shuffle ? "Desativar aleatório" : "Ativar aleatório"}
          aria-label="Alternar reprodução aleatória"
          className={`hidden rounded-md p-1.5 sm:block ${player.shuffle ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/10"}`}
        >
          <Shuffle className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={previousMusicTrack}
          disabled={!track}
          title="Anterior"
          aria-label="Faixa anterior"
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleMusicPlayback}
          disabled={!track}
          title={player.isPlaying ? "Pausar" : "Reproduzir"}
          aria-label={player.isPlaying ? "Pausar música" : "Reproduzir música"}
          className="rounded-full bg-cyan-300 p-2 text-slate-950 hover:bg-cyan-200 disabled:opacity-30"
        >
          {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={nextMusicTrack}
          disabled={!track || player.queue.length < 2}
          title="Próxima"
          aria-label="Próxima faixa"
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={cycleMusicRepeat}
          title={`Repetição: ${player.repeat}`}
          aria-label="Alternar repetição"
          className={`hidden rounded-md p-1.5 sm:block ${player.repeat !== "off" ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/10"}`}
        >
          {player.repeat === "one" ? (
            <Repeat1 className="h-4 w-4" />
          ) : (
            <Repeat className="h-4 w-4" />
          )}
        </button>
        <span
          title={`${player.queue.length} faixa(s) na fila`}
          className="hidden items-center gap-1 text-[10px] text-slate-400 md:flex"
        >
          <ListMusic className="h-3.5 w-3.5" />
          {player.queue.length}
        </span>
        <div className="hidden min-w-24 max-w-44 flex-1 items-center gap-1.5 lg:flex">
          <span className="w-8 text-right font-mono text-[9px] text-slate-400">
            {timeLabel(player.currentTime)}
          </span>
          <input
            aria-label="Posição da música"
            type="range"
            min={0}
            max={Math.max(1, player.duration)}
            step={1}
            value={Math.min(player.currentTime, player.duration || 0)}
            onChange={(event) => seekMusicTo(Number(event.target.value))}
            className="w-full accent-cyan-300"
          />
          <span className="w-8 font-mono text-[9px] text-slate-400">
            {timeLabel(player.duration)}
          </span>
        </div>
        <Volume2 className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
        <input
          aria-label="Volume da música"
          type="range"
          min={0}
          max={100}
          value={player.volume}
          onChange={(event) => setMusicVolume(Number(event.target.value))}
          className="hidden w-16 accent-cyan-300 sm:block"
        />
      </div>
      <iframe
        ref={frameRef}
        onLoad={() => connectMusicPlayerFrame(frameRef.current)}
        title="Player global do YouTube"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="origin"
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          right: 0,
          bottom: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
          border: 0,
        }}
      />
    </>
  );
}
