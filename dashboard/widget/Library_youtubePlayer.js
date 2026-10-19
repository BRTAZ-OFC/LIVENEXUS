// O LIVENEXUS ainda não possui o player de música do BACKUP01.
 // Interface mínima usada pela widget Tocando Agora.
let currentTrack = null;

export function getCurrentTrack() {
  return currentTrack;
}

export function setCurrentTrack(track) {
  currentTrack = track || null;
}
