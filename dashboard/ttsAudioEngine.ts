type EffectId = "normal" | "squirrel" | "monster" | "robot" | "radio" | "megaphone" | "alien" | "giant" | "ghost";

export type ProcessedTtsSettings = {
  voice: string;
  rate: number;
  volume: number;
  pitch: number;
  effect: EffectId;
  intensity: number;
};

export type PlaybackHandle = {
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

const enginePromises = new Map<string, Promise<any>>();
let audioContext: AudioContext | null = null;

const PIPER_VOICES: Record<string, { model?: string; config?: string }> = {
  "pt_BR-faber-medium": {},
  "pt_BR-edresson-low": {
    model: "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/edresson/low/pt_BR-edresson-low.onnx?download=true",
    config: "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/edresson/low/pt_BR-edresson-low.onnx.json?download=true",
  },
  "pt_BR-cadu-medium": {
    model: "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/cadu/medium/pt_BR-cadu-medium.onnx?download=true",
    config: "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/cadu/medium/pt_BR-cadu-medium.onnx.json?download=true",
  },
  "pt_BR-jeff-medium": {
    model: "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/jeff/medium/pt_BR-jeff-medium.onnx?download=true",
    config: "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/jeff/medium/pt_BR-jeff-medium.onnx.json?download=true",
  },
  "pt_BR-dii": {
    model: "https://huggingface.co/OpenVoiceOS/pipertts_pt-BR_dii/resolve/main/dii_pt-BR.onnx?download=true",
    config: "https://huggingface.co/OpenVoiceOS/pipertts_pt-BR_dii/resolve/main/dii_pt-BR.onnx.json?download=true",
  },
};

async function getEngine(voice: string, onProgress?: (message: string) => void) {
  const selectedVoice = PIPER_VOICES[voice] ? voice : "pt_BR-faber-medium";
  if (!enginePromises.has(selectedVoice)) {
    const options = PIPER_VOICES[selectedVoice];
    const promise = import("@pedrobef/vozz/piper").then(({ Piper }) =>
      Piper.carregar({
        ...(options?.model && options?.config ? { urlModelo: options.model, urlConfig: options.config } : {}),
        aoProgredir: (event: { status?: string; progresso?: number; arquivo?: string }) => {
          if (event.status === "baixando") {
            const percent = typeof event.progresso === "number" ? Math.round(event.progresso * 100) : 0;
            onProgress?.(`Baixando modelo da voz selecionada: ${percent}%`);
          } else if (event.status === "carregando") {
            onProgress?.("Inicializando o motor neural de voz…");
          }
        },
      }),
    ).catch((error) => {
      enginePromises.delete(selectedVoice);
      throw error;
    });
    enginePromises.set(selectedVoice, promise);
  }
  return enginePromises.get(selectedVoice)!;
}

function makeImpulse(context: AudioContext, seconds: number, decay: number) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function makeDistortion(context: AudioContext, amount: number) {
  const node = context.createWaveShaper();
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = Math.max(0, amount) * 90;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = k === 0 ? x : ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  node.curve = curve;
  node.oversample = "4x";
  return node;
}

export async function playProcessedSpeech(
  text: string,
  settings: ProcessedTtsSettings,
  callbacks: { onProgress?: (message: string) => void; onStart?: () => void; onEnd?: () => void; onError?: (error: unknown) => void } = {},
): Promise<PlaybackHandle> {
  const engine = await getEngine(settings.voice, callbacks.onProgress);
  const generated = await engine.falar(text, { velocidade: Math.max(0.5, Math.min(2, settings.rate)) });
  const wav = generated.paraWav() as ArrayBuffer;
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  await context.resume();
  const buffer = await context.decodeAudioData(wav.slice(0));
  const intensity = Math.max(0, Math.min(1.5, settings.intensity));
  const effect = settings.effect;
  const sourceRate = effect === "squirrel" ? 1 + 0.25 * intensity
    : effect === "monster" ? 1 - 0.18 * intensity
    : effect === "giant" ? 1 - 0.25 * intensity
    : effect === "alien" ? 1 + 0.08 * intensity
    : 1;
  let source: AudioBufferSourceNode | null = null;
  let startedAt = 0;
  let offset = 0;
  let ended = false;
  let paused = false;
  let modulator: OscillatorNode | null = null;
  let modGain: GainNode | null = null;

  const buildGraph = (startOffset: number) => {
    const input = context.createBufferSource();
    input.buffer = buffer;
    input.playbackRate.value = sourceRate * Math.max(0.5, Math.min(2, settings.pitch));
    const nodes: AudioNode[] = [input];
    let previous: AudioNode = input;

    const filter = context.createBiquadFilter();
    if (effect === "radio") {
      filter.type = "bandpass"; filter.frequency.value = 1700; filter.Q.value = 0.8;
      previous.connect(filter); previous = filter; nodes.push(filter);
    } else if (effect === "megaphone") {
      filter.type = "bandpass"; filter.frequency.value = 1300; filter.Q.value = 1.1;
      previous.connect(filter); previous = filter; nodes.push(filter);
    } else if (effect === "monster" || effect === "giant") {
      filter.type = "lowshelf"; filter.frequency.value = 240; filter.gain.value = 8 * intensity;
      previous.connect(filter); previous = filter; nodes.push(filter);
    } else if (effect === "ghost") {
      filter.type = "highpass"; filter.frequency.value = 260;
      previous.connect(filter); previous = filter; nodes.push(filter);
    } else if (effect === "squirrel") {
      filter.type = "highshelf"; filter.frequency.value = 1800; filter.gain.value = 5 * intensity;
      previous.connect(filter); previous = filter; nodes.push(filter);
    } else if (effect === "alien" || effect === "robot") {
      filter.type = "bandpass"; filter.frequency.value = effect === "robot" ? 1100 : 1900; filter.Q.value = 1.2;
      previous.connect(filter); previous = filter; nodes.push(filter);
    }

    if (effect === "robot" || effect === "alien") {
      modGain = context.createGain();
      modGain.gain.value = effect === "robot" ? 0.72 : 0.82;
      previous.connect(modGain); previous = modGain; nodes.push(modGain);
      modulator = context.createOscillator();
      const depth = context.createGain();
      modulator.type = effect === "robot" ? "square" : "sine";
      modulator.frequency.value = effect === "robot" ? 34 : 7;
      depth.gain.value = effect === "robot" ? 0.28 * intensity : 0.18 * intensity;
      modulator.connect(depth); depth.connect(modGain.gain); modulator.start();
      nodes.push(modulator, depth);
    }

    if (effect === "radio" || effect === "megaphone" || effect === "robot") {
      const distortion = makeDistortion(context, (effect === "megaphone" ? 0.7 : 0.4) * intensity);
      previous.connect(distortion); previous = distortion; nodes.push(distortion);
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -24; compressor.ratio.value = 5;
      previous.connect(compressor); previous = compressor; nodes.push(compressor);
    }

    if (effect === "ghost" || effect === "alien") {
      const delay = context.createDelay(1.5);
      delay.delayTime.value = effect === "ghost" ? 0.32 : 0.12;
      const feedback = context.createGain();
      feedback.gain.value = (effect === "ghost" ? 0.3 : 0.12) * intensity;
      previous.connect(delay); delay.connect(feedback); feedback.connect(delay);
      const mix = context.createGain(); mix.gain.value = effect === "ghost" ? 0.45 * intensity : 0.25 * intensity;
      delay.connect(mix); previous.connect(mix); previous = mix;
      nodes.push(delay, feedback, mix);
    }

    if (effect === "ghost") {
      const reverb = context.createConvolver();
      reverb.buffer = makeImpulse(context, 1.8, 2.5);
      const wet = context.createGain(); wet.gain.value = 0.28 * intensity;
      previous.connect(reverb); reverb.connect(wet);
      const mix = context.createGain(); mix.gain.value = 0.78;
      previous.connect(mix); wet.connect(mix); previous = mix;
      nodes.push(reverb, wet, mix);
    }

    const master = context.createGain();
    master.gain.value = Math.max(0, Math.min(1, settings.volume));
    previous.connect(master); master.connect(context.destination);
    nodes.push(master);
    input.onended = () => {
      if (source !== input) return;
      modulator?.stop();
      nodes.forEach((node) => { try { node.disconnect(); } catch {} });
      source = null;
      if (!paused && !ended) { ended = true; callbacks.onEnd?.(); }
    };
    source = input;
    startedAt = context.currentTime;
    input.start(0, startOffset);
    callbacks.onStart?.();
  };

  const handle: PlaybackHandle = {
    stop() {
      if (ended) return;
      ended = true; paused = false;
      try { source?.stop(); } catch {}
      try { modulator?.stop(); } catch {}
      source = null;
      callbacks.onEnd?.();
    },
    pause() {
      if (!source || paused || ended) return;
      offset += context.currentTime - startedAt;
      paused = true;
      try { source.stop(); } catch {}
      source = null;
      try { modulator?.stop(); } catch {}
    },
    resume() {
      if (!paused || ended) return;
      paused = false;
      const duration = buffer.duration;
      offset %= duration;
      buildGraph(offset);
    },
  };
  buildGraph(0);
  return handle;
}
