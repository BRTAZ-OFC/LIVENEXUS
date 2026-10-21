import { getMusicPlayerState } from "../biblioteca/musicPlayerEngine";

let fallbackTrack = null;

export function getCurrentTrack() {
  return getMusicPlayerState().track || fallbackTrack;
}

export function setCurrentTrack(track) {
  fallbackTrack = track || null;
}
