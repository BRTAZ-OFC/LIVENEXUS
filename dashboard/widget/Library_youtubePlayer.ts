import { getMusicPlayerState } from "../biblioteca/musicPlayerEngine";

let fallbackTrack = null;

// getCurrentTrack: executa a tarefa indicada pelo nome e pelos parâmetros recebidos.
export function getCurrentTrack() {
  return getMusicPlayerState().track || fallbackTrack;
}

// setCurrentTrack: executa a tarefa indicada pelo nome e pelos parâmetros recebidos.
export function setCurrentTrack(track) {
  fallbackTrack = track || null;
}
