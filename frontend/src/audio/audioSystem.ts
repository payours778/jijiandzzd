import { MUSIC_FILES, SFX_FILES, type MusicKey, type SfxKey } from "./audioConfig";

export interface AudioSettings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  trainingBgm: string;
  /** 背景音乐总开关（仅控制 BGM，不影响音效） */
  bgmEnabled: boolean;
}

const SETTINGS_KEY = "mini-playbox-audio-settings";

const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  musicVolume: 0.65,
  sfxVolume: 0.8,
  trainingBgm: "camp_main",
  bgmEnabled: true,
};

let settings = loadSettings();
let audioContext: AudioContext | null = null;
let musicElement: HTMLAudioElement | null = null;
let currentMusicKey: string | null = null;
// 最近一次真正发起的 BGM 请求（用于取消静音/音量恢复时回到正确的场景音乐，
// 而不是无条件拉起军营 BGM）。在守卫通过、即将 startLoop 时更新。
let lastMusicRequest: { kind: "key"; value: MusicKey } | { kind: "src"; value: string } | null = null;
// 环境音（风声等）独立通道, 与 BGM 可同时播放
let ambientElement: HTMLAudioElement | null = null;
let ambientKey: string | null = null;
let ambientPendingHandler: (() => void) | null = null;
// 待用户手势后启动的音乐回调，避免多次注册累积监听器
let pendingGestureHandler: (() => void) | null = null;
const MAX_SFX_INSTANCES_PER_SRC = 3;
const SFX_MIN_GAP_MS: Partial<Record<SfxKey, number>> = {
  hit: 45,
  melee: 120,
  spear: 120,
  bow: 140,
  cavalry: 170,
  zombie_bite: 90,
  wei_hit: 90,
  general_liubei: 160,
  general_zhaoyun: 160,
  general_guanyu: 160,
  machao_attack: 160,
  diaochan_attack: 160,
  lubu_attack: 160,
  lubu_skill1: 240,
  lubu_skill2: 240,
  diaochan_skill1: 240,
  diaochan_skill2: 240,
  huangzhong_skill: 400,
  huangzhong_skill_voice: 400,
  liubei_heal: 300,
  liubei_heal_voice: 300,
  guanyu_skill_voice: 300,
  huangzu_skill_voice: 300,
  zhangfei_roar: 300,
  boss_warning: 400,
  game_over: 500,
};

const PRELOAD_SFX_KEYS: SfxKey[] = [
  "click",
  "place",
  "melee",
  "spear",
  "bow",
  "cavalry",
  "wei_hit",
  "zombie_bite",
  "general_liubei",
  "general_zhaoyun",
  "general_guanyu",
  "huangzhong_skill",
  "huangzhong_skill_voice",
  "liubei_heal",
  "liubei_heal_voice",
  "guanyu_skill_voice",
  "huangzu_skill_voice",
  "machao_attack",
  "diaochan_attack",
  "lubu_attack",
  "lubu_boss_entry",
  "caocao_boss_entry",
  "diaochan_boss_entry",
  "boss_warning",
  "game_over",
  "zhaoyun_longdan",
  "zhangfei_roar",
  "weiyan_enter",
  "weiyan_kill",
];

const lastSfxAt = new Map<SfxKey, number>();
const sfxPools = new Map<string, HTMLAudioElement[]>();
const nextSfxSlot = new Map<string, number>();
// WebAudio 解码缓冲：攻击/技能音效走 BufferSource 直出，消除 HTMLAudio 的播放延迟
const sfxBuffers = new Map<string, AudioBuffer>();
const sfxBufferFailed = new Set<string>();
let sfxGainNode: GainNode | null = null;
// 技能语音池：与 SFX 池同思路，避免每次放技能都 new Audio 重新拉取
const MAX_VOICE_INSTANCES_PER_SRC = 2;
const voicePools = new Map<string, HTMLAudioElement[]>();
const nextVoiceSlot = new Map<string, number>();
// 每次播放的令牌：元素被复用后，旧回调过期作废
const voiceTokens = new WeakMap<HTMLAudioElement, symbol>();
// 元素当前活跃的结算回调：被抢占时立即结算上一段语音，避免调用方（技能释放）被卡住
const voiceFinishers = new WeakMap<HTMLAudioElement, () => void>();
let preloadStarted = false;
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
      trainingBgm:
        typeof parsed.trainingBgm === "string" ? parsed.trainingBgm : DEFAULT_SETTINGS.trainingBgm,
      bgmEnabled:
        typeof parsed.bgmEnabled === "boolean" ? parsed.bgmEnabled : DEFAULT_SETTINGS.bgmEnabled,
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

function sfxShouldThrottle(key: SfxKey) {
  const gap = SFX_MIN_GAP_MS[key] ?? 60;
  const now = performance.now();
  if (now - (lastSfxAt.get(key) ?? 0) < gap) {
    return true;
  }
  lastSfxAt.set(key, now);
  return false;
}

function getSfxPool(src: string) {
  let pool = sfxPools.get(src);
  if (!pool) {
    pool = [];
    sfxPools.set(src, pool);
  }
  return pool;
}

function getSfxElement(src: string) {
  const pool = getSfxPool(src);
  const idle = pool.find((sound) => sound.paused);
  if (idle) {
    idle.currentTime = 0;
    idle.volume = settings.sfxVolume;
    return idle;
  }

  if (pool.length < MAX_SFX_INSTANCES_PER_SRC) {
    const sound = new Audio(src);
    sound.preload = "auto";
    sound.volume = settings.sfxVolume;
    pool.push(sound);
    return sound;
  }

  const index = nextSfxSlot.get(src) ?? 0;
  const sound = pool[index % pool.length];
  nextSfxSlot.set(src, index + 1);
  sound.pause();
  sound.currentTime = 0;
  sound.volume = settings.sfxVolume;
  return sound;
}

export function preloadSfx() {
  if (preloadStarted || typeof Audio === "undefined") {
    return;
  }
  preloadStarted = true;
  for (const key of PRELOAD_SFX_KEYS) {
    const src = SFX_FILES[key];
    if (!src) {
      continue;
    }
    const sound = getSfxElement(src);
    sound.load();
    void decodeSfx(src);
  }
}

function getSfxGainNode(ctx: AudioContext): GainNode {
  if (!sfxGainNode) {
    sfxGainNode = ctx.createGain();
    sfxGainNode.gain.value = settings.sfxVolume;
    sfxGainNode.connect(ctx.destination);
  }
  return sfxGainNode;
}

/** 拉取并解码音效文件为 AudioBuffer（失败标记后走 HTMLAudio 兜底，不再重试）。 */
function decodeSfx(src: string): Promise<AudioBuffer | undefined> {
  const cached = sfxBuffers.get(src);
  if (cached || sfxBufferFailed.has(src)) {
    return Promise.resolve(cached);
  }
  return (async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }
      const raw = await response.arrayBuffer();
      const ctx = getContext();
      if (!ctx) {
        throw new Error("no audio context");
      }
      const decoded = await ctx.decodeAudioData(raw);
      sfxBuffers.set(src, decoded);
      return decoded;
    } catch {
      sfxBufferFailed.add(src);
      return undefined;
    }
  })();
}

/** 用解码缓冲即时播放（WebAudio 延迟≈0）；缓冲未就绪/上下文不可用时返回 false 走兜底。 */
function playBufferSfx(src: string): boolean {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") {
    return false;
  }
  const buffer = sfxBuffers.get(src);
  if (!buffer) {
    void decodeSfx(src);
    return false;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(getSfxGainNode(ctx));
  source.start();
  return true;
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

  preloadSfx();

  if (musicElement && musicElement.paused && currentMusicKey) {
    musicElement.play().catch(() => {});
  }
}

export function getSettings(): AudioSettings {
  return { ...settings };
}

export function getTrainingBgm(): string {
  return settings.trainingBgm;
}

export function setBgmEnabled(enabled: boolean) {
  settings.bgmEnabled = enabled;
  if (!enabled) {
    stopMusic();
  }
  saveSettings();
  notify();
}

export function setTrainingBgm(id: string) {
  settings.trainingBgm = id;
  saveSettings();
  notify();
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
  } else {
    // 取消静音后恢复最近一次场景音乐（不重启正在播放的同一首）
    resumeLastBgm();
  }
  saveSettings();
  notify();
}

export function toggleMuted() {
  setMuted(!settings.muted);
}

export function setMusicVolume(volume: number) {
  const wasZero = settings.musicVolume <= 0;
  settings.musicVolume = clampVolume(volume, 0);
  // 音量变化直接更新当前正在播放的 musicElement，无需重启
  if (musicElement) {
    musicElement.volume = settings.musicVolume;
  }
  if (settings.musicVolume <= 0) {
    stopMusic();
  } else if (wasZero) {
    // 从静音状态恢复到有音量，恢复最近一次场景音乐
    resumeLastBgm();
  }
  saveSettings();
  notify();
}

/**
 * 根据最近一次 BGM 请求恢复播放。
 * - 军营（playLoopSrc 的自定义音乐）→ 原样恢复；
 * - 带文件的场景音乐（如 BOSS BGM）→ 按场景 key 恢复；
 * - battle 这类未配置文件的 key → 保持安静（不误播军营音乐）。
 */
function resumeLastBgm() {
  if (!settings.bgmEnabled || settings.muted || settings.musicVolume <= 0) {
    return;
  }
  if (!lastMusicRequest) {
    return;
  }
  if (lastMusicRequest.kind === "src") {
    playLoopSrc(lastMusicRequest.value);
    return;
  }
  if (MUSIC_FILES[lastMusicRequest.value]) {
    playMusic(lastMusicRequest.value);
  }
}

export function setSfxVolume(volume: number) {
  settings.sfxVolume = clampVolume(volume, 0);
  if (sfxGainNode) {
    sfxGainNode.gain.value = settings.sfxVolume;
  }
  for (const pool of sfxPools.values()) {
    for (const sound of pool) {
      sound.volume = settings.sfxVolume;
    }
  }
  for (const pool of voicePools.values()) {
    for (const sound of pool) {
      sound.volume = settings.sfxVolume;
    }
  }
  saveSettings();
  notify();
}

function clearPendingGesture() {
  if (pendingGestureHandler) {
    window.removeEventListener("pointerdown", pendingGestureHandler);
    window.removeEventListener("keydown", pendingGestureHandler);
    pendingGestureHandler = null;
  }
}

// BGM/环境音元素的加载错误处理：置空引用（停止音乐走 removeAttribute+load，不会触发此事件）
const musicErrorHandler = () => {
  musicElement = null;
  currentMusicKey = null;
  // 文件加载失败时清掉"最近请求"，避免取消静音后反复重试坏文件
  lastMusicRequest = null;
};
const ambientErrorHandler = () => {
  ambientElement = null;
  ambientKey = null;
};

function startLoop(src: string, key: string) {
  // 无论新音乐是否为空，都先停止当前音乐，确保同时只播放一首 BGM
  if (musicElement) {
    musicElement.pause();
    // 先移除 error 监听再清空 src，避免空 src 触发伪加载错误
    musicElement.removeEventListener("error", musicErrorHandler);
    musicElement.removeAttribute("src");
    musicElement.load();
    musicElement = null;
  }
  // 清理待触发的手势监听，避免累积导致重复播放
  clearPendingGesture();
  currentMusicKey = key;

  if (!src || typeof Audio === "undefined") {
    return;
  }

  musicElement = new Audio(src);
  musicElement.loop = true;
  musicElement.volume = settings.musicVolume;
  musicElement.addEventListener("error", musicErrorHandler);

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
      clearPendingGesture();
    };
    pendingGestureHandler = onGesture;
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
  }
}

export function playMusic(key: MusicKey) {
  unlock();

  if (!settings.bgmEnabled || settings.muted || settings.musicVolume <= 0) {
    return;
  }

  if (currentMusicKey === key && (!MUSIC_FILES[key] || (musicElement && !musicElement.paused))) {
    return;
  }

  lastMusicRequest = { kind: "key", value: key };
  startLoop(MUSIC_FILES[key], key);
}

/** 循环播放一段自定义音乐（军营背景音乐自选用） */
export function playLoopSrc(src: string) {
  unlock();

  if (!settings.bgmEnabled || settings.muted || settings.musicVolume <= 0) {
    return;
  }

  if (currentMusicKey === src && (!src || (musicElement && !musicElement.paused))) {
    return;
  }

  lastMusicRequest = { kind: "src", value: src };
  startLoop(src, src);
}

export function stopMusic() {
  // 清理待触发的手势监听，防止用户点击关闭后被手势监听重新拉起
  clearPendingGesture();
  if (musicElement) {
    musicElement.pause();
    musicElement.removeEventListener("error", musicErrorHandler);
    musicElement.removeAttribute("src");
    musicElement.load();
    musicElement = null;
  }
  currentMusicKey = null;
}

export function stopAmbient() {
  if (ambientPendingHandler) {
    window.removeEventListener("pointerdown", ambientPendingHandler);
    window.removeEventListener("keydown", ambientPendingHandler);
    ambientPendingHandler = null;
  }
  if (ambientElement) {
    ambientElement.pause();
    ambientElement.removeEventListener("error", ambientErrorHandler);
    ambientElement.removeAttribute("src");
    ambientElement.load();
    ambientElement = null;
  }
  ambientKey = null;
}

/** 循环播放一段环境音（如风声），与 BGM 并行；遵循 BGM 开关与音量 */
export function playAmbient(src: string, volumeFactor = 1) {
  unlock();
  if (!src || typeof Audio === "undefined") {
    stopAmbient();
    return;
  }
  if (!settings.bgmEnabled || settings.muted || settings.musicVolume <= 0) {
    stopAmbient();
    return;
  }
  if (ambientKey === src && ambientElement && !ambientElement.paused) {
    // 音量变化时直接更新, 不打断循环
    ambientElement.volume = Math.min(1, settings.musicVolume * volumeFactor);
    return;
  }
  stopAmbient();
  ambientKey = src;
  ambientElement = new Audio(src);
  ambientElement.loop = true;
  ambientElement.volume = Math.min(1, settings.musicVolume * volumeFactor);
  ambientElement.addEventListener("error", ambientErrorHandler);
  const startAmbient = () => {
    if (ambientElement) {
      ambientElement.play().catch(() => {});
    }
  };
  if (audioContext?.state === "running") {
    startAmbient();
  } else {
    const onGesture = () => {
      startAmbient();
      if (ambientPendingHandler) {
        window.removeEventListener("pointerdown", ambientPendingHandler);
        window.removeEventListener("keydown", ambientPendingHandler);
        ambientPendingHandler = null;
      }
    };
    ambientPendingHandler = onGesture;
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
  }
}

export function playSfx(key: SfxKey) {
  if (settings.muted || settings.sfxVolume <= 0) {
    return;
  }

  unlock();

  if (sfxShouldThrottle(key)) {
    return;
  }

  const src = SFX_FILES[key];
  if (src && typeof Audio !== "undefined") {
    // 优先走 WebAudio 缓冲直出（零延迟）；未解码完成/不可用时回退 HTMLAudio 池
    if (playBufferSfx(src)) {
      return;
    }
    const sound = getSfxElement(src);
    sound.play().catch(() => {});
    return;
  }

  synthSfx(key);
}

function getVoiceElement(src: string) {
  let pool = voicePools.get(src);
  if (!pool) {
    pool = [];
    voicePools.set(src, pool);
  }
  const idle = pool.find((sound) => sound.paused);
  if (idle) {
    return idle;
  }

  if (pool.length < MAX_VOICE_INSTANCES_PER_SRC) {
    const sound = new Audio(src);
    sound.preload = "auto";
    pool.push(sound);
    return sound;
  }

  const index = nextVoiceSlot.get(src) ?? 0;
  const sound = pool[index % pool.length];
  nextVoiceSlot.set(src, index + 1);
  voiceFinishers.get(sound)?.();
  sound.pause();
  return sound;
}

export function playVoiceOnce(key: SfxKey, onEnd: () => void, fallbackMs = 3000) {
  const src = SFX_FILES[key];
  if (!src || settings.muted || settings.sfxVolume <= 0 || typeof Audio === "undefined") {
    window.setTimeout(onEnd, fallbackMs);
    return;
  }

  unlock();
  const sound = getVoiceElement(src);
  const token = Symbol();
  voiceTokens.set(sound, token);
  sound.volume = settings.sfxVolume;
  sound.currentTime = 0;
  let done = false;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;
  const safeFinish = () => {
    if (done || voiceTokens.get(sound) !== token) return;
    done = true;
    if (finishTimer) {
      clearTimeout(finishTimer);
      finishTimer = null;
    }
    onEnd();
  };
  voiceFinishers.set(sound, safeFinish);
  sound.addEventListener("ended", safeFinish, { once: true });
  sound.addEventListener("error", safeFinish, { once: true });
  finishTimer = window.setTimeout(safeFinish, Math.max(fallbackMs, 15000));
  sound.play().catch(() => safeFinish());
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
  // 合成音效也要跟随 SFX 音量滑块
  const volume = Math.min(1, Math.max(0, (options.volume ?? 0.2) * settings.sfxVolume));

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
  gain.gain.setValueAtTime((options.volume ?? 0.15) * settings.sfxVolume, now);
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
    case "heal":
      playTone({ frequency: 520, duration: 0.1, type: "sine", volume: 0.12 });
      playTone({ frequency: 780, duration: 0.14, type: "sine", volume: 0.12, delay: 0.1 });
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
    case "zhangfei_attack":
      playTone({ frequency: 80, endFrequency: 38, duration: 0.26, type: "sine", volume: 0.34 });
      playNoise({ duration: 0.18, volume: 0.24, lowpass: 850 });
      playTone({ frequency: 52, duration: 0.3, type: "triangle", volume: 0.3, delay: 0.02 });
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
