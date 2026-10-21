import { getMusicPlayerState, playTrack as playGlobalTrack } from "../biblioteca/musicPlayerEngine";

export function getCurrentTrack() {
  return getMusicPlayerState().track;
}

export function setCurrentTrack(track) {
  if (track?.videoId) playGlobalTrack(track);
}
