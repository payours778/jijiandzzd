import { MUSIC_FILES, SFX_FILES, type MusicKey, type SfxKey } from "./audioConfig";

export interface AudioSettings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
}

const SETTINGS_KEY = "mini-playbox-audio-settings";

const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  musicVolume: 0.65,
  sfxVolume: 0.8,
};

let settings = loadSettings();
let audioContext: AudioContext | null = null;
let musicElement: HTMLAudioElement | null = null;
let currentMusicKey: MusicKey | null = null;
let lastHitAt = 0;
const listeners = new Set<() => void>();

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_SETTINGS.muted,
      musicVolume: clampVolume(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clampVolume(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable.
  }
}

function clampVolume(value: unknown, fallback: number) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(1, Math.max(0, number));
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getContext(): AudioContext | null {
  if (audioContext) {
    return audioContext;
  }

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  audioContext = new Ctor();
  return audioContext;
}

export function unlock() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  if (musicElement && musicElement.paused && currentMusicKey) {
    musicElement.play().catch(() => {});
  }
}

export function getSettings(): AudioSettings {
  return { ...settings };
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMuted(muted: boolean) {
  settings.muted = muted;
  if (muted) {
    stopMusic();
  }
  saveSettings();
  notify();
}

export function toggleMuted() {
  setMuted(!settings.muted);
}

export function setMusicVolume(volume: number) {
  settings.musicVolume = clampVolume(volume, 0);
  if (musicElement) {
    musicElement.volume = settings.musicVolume;
  }
  if (settings.musicVolume <= 0) {
    stopMusic();
  }
  saveSettings();
  notify();
}

export function setSfxVolume(volume: number) {
  settings.sfxVolume = clampVolume(volume, 0);
  saveSettings();
  notify();
}

export function playMusic(key: MusicKey) {
  unlock();

  if (settings.muted || settings.musicVolume <= 0) {
    return;
  }

  if (currentMusicKey === key && musicElement && !musicElement.paused) {
    return;
  }

  stopMusic();
  currentMusicKey = key;

  const src = MUSIC_FILES[key];
  if (!src || typeof Audio === "undefined") {
    return;
  }

  musicElement = new Audio(src);
  musicElement.loop = true;
  musicElement.volume = settings.musicVolume;
  musicElement.addEventListener("error", () => {
    musicElement = null;
    currentMusicKey = null;
  });

  const startMusic = () => {
    if (musicElement) {
      musicElement.play().catch(() => {});
    }
  };

  if (audioContext?.state === "running") {
    startMusic();
  } else {
    const onGesture = () => {
      startMusic();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
  }
}

export function stopMusic() {
  if (musicElement) {
    musicElement.pause();
    musicElement.src = "";
    musicElement = null;
  }
  currentMusicKey = null;
}

export function playSfx(key: SfxKey) {
  if (settings.muted || settings.sfxVolume <= 0) {
    return;
  }

  unlock();

  if (key === "hit" && performance.now() - lastHitAt < 45) {
    return;
  }
  if (key === "hit") {
    lastHitAt = performance.now();
  }

  const src = SFX_FILES[key];
  if (src && typeof Audio !== "undefined") {
    const sound = new Audio(src);
    sound.volume = settings.sfxVolume;
    sound.play().catch(() => {});
    return;
  }

  synthSfx(key);
}

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
}

function playTone(options: ToneOptions) {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime + (options.delay ?? 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const volume = Math.min(1, Math.max(0, options.volume ?? 0.2));

  oscillator.type = options.type ?? "square";
  oscillator.frequency.setValueAtTime(options.frequency, now);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + options.duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + options.duration + 0.05);
}

function playNoise(options: {
  duration: number;
  volume?: number;
  lowpass?: number;
  delay?: number;
}) {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime + (options.delay ?? 0);
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * options.duration));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(options.volume ?? 0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  let output: AudioNode = source;
  if (options.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = options.lowpass;
    output.connect(filter);
    output = filter;
  }

  output.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + options.duration + 0.05);
}

function synthSfx(key: SfxKey) {
  switch (key) {
    case "click":
      playTone({ frequency: 560, endFrequency: 420, duration: 0.08, type: "square", volume: 0.1 });
      break;
    case "draw":
      playTone({ frequency: 440, duration: 0.07, type: "triangle", volume: 0.14 });
      playTone({ frequency: 660, duration: 0.08, type: "triangle", volume: 0.14, delay: 0.07 });
      break;
    case "place":
      playTone({ frequency: 160, endFrequency: 90, duration: 0.12, type: "sine", volume: 0.2 });
      break;
    case "upgrade":
      playTone({ frequency: 523, duration: 0.08, type: "triangle", volume: 0.16 });
      playTone({ frequency: 659, duration: 0.08, type: "triangle", volume: 0.16, delay: 0.08 });
      playTone({ frequency: 784, duration: 0.12, type: "triangle", volume: 0.16, delay: 0.16 });
      break;
    case "recycle":
      playTone({ frequency: 520, endFrequency: 180, duration: 0.18, type: "square", volume: 0.1 });
      break;
    case "synthesize":
      playTone({ frequency: 523, duration: 0.09, type: "sine", volume: 0.18 });
      playTone({ frequency: 659, duration: 0.09, type: "sine", volume: 0.18, delay: 0.09 });
      playTone({ frequency: 784, duration: 0.09, type: "sine", volume: 0.18, delay: 0.18 });
      playTone({ frequency: 1046, duration: 0.16, type: "sine", volume: 0.18, delay: 0.27 });
      break;
    case "farm":
      playTone({ frequency: 300, endFrequency: 210, duration: 0.1, type: "triangle", volume: 0.14 });
      break;
    case "hit":
      playNoise({ duration: 0.07, volume: 0.18, lowpass: 2200 });
      playTone({ frequency: 190, endFrequency: 90, duration: 0.09, type: "square", volume: 0.12 });
      break;
    case "melee":
      playNoise({ duration: 0.12, volume: 0.22, lowpass: 3200 });
      playTone({ frequency: 240, endFrequency: 130, duration: 0.1, type: "square", volume: 0.12 });
      break;
    case "spear":
      playTone({ frequency: 340, endFrequency: 240, duration: 0.09, type: "sawtooth", volume: 0.12 });
      playNoise({ duration: 0.08, volume: 0.12, lowpass: 1800 });
      break;
    case "bow":
      playTone({ frequency: 900, endFrequency: 1500, duration: 0.12, type: "sine", volume: 0.12 });
      playNoise({ duration: 0.05, volume: 0.08, lowpass: 4000 });
      break;
    case "cavalry":
      playNoise({ duration: 0.22, volume: 0.2, lowpass: 1600 });
      playTone({ frequency: 130, endFrequency: 60, duration: 0.2, type: "sawtooth", volume: 0.1 });
      break;
    case "zombie_bite":
      playTone({ frequency: 110, duration: 0.16, type: "sawtooth", volume: 0.14 });
      playTone({ frequency: 95, duration: 0.16, type: "sawtooth", volume: 0.12, delay: 0.03 });
      break;
    case "boss_warning":
      playTone({ frequency: 196, duration: 0.24, type: "sawtooth", volume: 0.18 });
      playTone({ frequency: 233, duration: 0.24, type: "sawtooth", volume: 0.18, delay: 0.28 });
      playTone({ frequency: 196, duration: 0.24, type: "sawtooth", volume: 0.18, delay: 0.56 });
      break;
    case "game_over":
      playTone({ frequency: 440, duration: 0.22, type: "triangle", volume: 0.18 });
      playTone({ frequency: 330, duration: 0.24, type: "triangle", volume: 0.18, delay: 0.24 });
      playTone({ frequency: 220, duration: 0.4, type: "triangle", volume: 0.18, delay: 0.48 });
      break;
    default:
      playTone({ frequency: 500, endFrequency: 300, duration: 0.08, type: "square", volume: 0.1 });
  }
}
