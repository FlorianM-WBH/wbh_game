// Tiny WebAudio synth for sound effects. No audio files needed.
// Shared context with two buses (sfx, music) under one master gain, so mute and music toggle are instant.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;

const PREFS_KEY = 'miami-motors-86-audio';
const prefs = loadPrefs();

function loadPrefs(): { muted: boolean; music: boolean } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return { muted: !!p.muted, music: p.music !== false };
  } catch {
    return { muted: false, music: true };
  }
}

function savePrefs(): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable */
  }
}

/** The audio context, created lazily (browsers only allow it after a user gesture). */
export function audioContext(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = prefs.muted ? 0 : 1;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = prefs.music ? 1 : 0;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function musicOutput(): GainNode | null {
  audioContext();
  return musicBus;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.06): void {
  if (prefs.muted) return;
  const a = audioContext();
  if (!a || !sfxBus) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type Sfx = 'click' | 'open' | 'deal' | 'walkout' | 'cash' | 'job' | 'arrive' | 'error';

export function sfx(name: Sfx): void {
  switch (name) {
    case 'click':
      tone(880, 0, 0.04, 'square', 0.03);
      break;
    case 'open':
      tone(523, 0, 0.06);
      tone(784, 0.05, 0.08);
      break;
    case 'deal':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.18, 'sawtooth', 0.05));
      break;
    case 'cash':
      tone(1318, 0, 0.08, 'square', 0.05);
      tone(1760, 0.07, 0.2, 'square', 0.05);
      break;
    case 'walkout':
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.07));
      break;
    case 'job':
      tone(660, 0, 0.1, 'triangle', 0.07);
      tone(990, 0.1, 0.2, 'triangle', 0.07);
      break;
    case 'arrive':
      tone(740, 0, 0.07, 'sine', 0.06);
      tone(988, 0.08, 0.1, 'sine', 0.06);
      break;
    case 'error':
      tone(140, 0, 0.18, 'square', 0.05);
      break;
  }
}

function ramp(node: GainNode | null, to: number): void {
  if (!node || !ctx) return;
  node.gain.cancelScheduledValues(ctx.currentTime);
  node.gain.setTargetAtTime(to, ctx.currentTime, 0.05);
}

/** Toggle all sound. Returns true if now muted. */
export function toggleMute(): boolean {
  prefs.muted = !prefs.muted;
  savePrefs();
  ramp(master, prefs.muted ? 0 : 1);
  return prefs.muted;
}

/** Toggle the music only. Returns true if music is now on. */
export function toggleMusic(): boolean {
  prefs.music = !prefs.music;
  savePrefs();
  ramp(musicBus, prefs.music ? 1 : 0);
  return prefs.music;
}

export function musicEnabled(): boolean {
  return prefs.music && !prefs.muted;
}
