// Procedural synthwave loop: drums, pumping bass, pad, arpeggio and an occasional lead melody.
// Everything is synthesised with WebAudio and scheduled a little ahead of time.
import { audioContext, musicEnabled, musicOutput } from './audio';

const BPM = 104;
const STEP = 60 / BPM / 4; // one 16th note in seconds
const LOOKAHEAD = 0.2;

type Chord = { root: number; minor: boolean };
const m = (root: number): Chord => ({ root, minor: true });
const M = (root: number): Chord => ({ root, minor: false });

// MIDI roots in octave 3 (A3 = 57); all progressions are in A minor / C major
const PROGRESSIONS: Chord[][] = [
  [m(57), M(53), M(48), M(55)], // Am F C G
  [M(53), M(55), m(57), m(57)], // F G Am Am
  [m(50), M(53), m(57), M(55)], // Dm F Am G
  [M(48), M(55), m(57), M(53)], // C G Am F
];
const PENTA = [69, 72, 74, 76, 79, 81, 84]; // A minor pentatonic, octave 4-5

const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 4, 3, 2, 1];

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

class Synthwave {
  private ac: BaseAudioContext;
  private out: GainNode;
  private fx: GainNode;
  private noise: AudioBuffer;
  private nextTime = 0;
  private step = 0;
  private phrase = 0;
  private prog = PROGRESSIONS[0];
  private motif: (number | null)[] = [];

  constructor(ac: BaseAudioContext, dest: AudioNode) {
    this.ac = ac;
    this.out = ac.createGain();
    this.out.gain.value = 0.32;
    this.out.connect(dest);
    // dotted-eighth echo for arp and lead
    const delay = ac.createDelay(1);
    delay.delayTime.value = STEP * 3;
    const fb = ac.createGain();
    fb.gain.value = 0.35;
    const wet = ac.createGain();
    wet.gain.value = 0.35;
    this.fx = ac.createGain();
    this.fx.connect(this.out);
    this.fx.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(this.out);
    this.noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.newPhrase();
  }

  start(): void {
    this.nextTime = this.ac.currentTime + 0.1;
    window.setInterval(() => this.schedule(), 40);
  }

  private newPhrase(): void {
    if (this.phrase % 2 === 0) this.prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
    // a fresh 2-bar motif, repeated over the 4-bar phrase
    this.motif = [];
    for (let i = 0; i < 32; i++) {
      const on = i % 4 === 0 ? 0.6 : i % 2 === 0 ? 0.3 : 0.1;
      this.motif.push(Math.random() < on ? PENTA[Math.floor(Math.random() * PENTA.length)] : null);
    }
  }

  /** Schedule everything up to `until` at once (offline rendering for tests). */
  scheduleUntil(until: number): void {
    while (this.nextTime < until) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
      if (this.step % 64 === 0) {
        this.phrase++;
        this.newPhrase();
      }
    }
  }

  private schedule(): void {
    const now = this.ac.currentTime;
    // the tab was in the background: skip ahead instead of playing a burst of notes
    if (this.nextTime < now - 0.3) this.nextTime = now + 0.05;
    while (this.nextTime < now + LOOKAHEAD) {
      if (musicEnabled()) this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
      if (this.step % 64 === 0) {
        this.phrase++;
        this.newPhrase();
      }
    }
  }

  private playStep(step: number, t: number): void {
    const s16 = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const chord = this.prog[bar];
    const intro = this.phrase === 0;
    const breakdown = this.phrase % 6 === 5;
    const withLead = this.phrase % 4 >= 2;

    if (!breakdown) {
      if (s16 % 4 === 0) this.kick(t);
      if (s16 === 4 || s16 === 12) this.snare(t);
      if (s16 % 2 === 0 && !intro) this.hat(t, s16 % 4 === 2 ? 0.07 : 0.035);
    }
    if (s16 % 2 === 0) this.bass(hz(chord.root - 24 + (s16 % 8 === 6 ? 12 : 0)), t);
    if (s16 === 0) this.pad(chord, t, STEP * 16);
    if (!intro) {
      const tones = [0, chord.minor ? 3 : 4, 7, 12, 15];
      this.arp(hz(chord.root + 12 + tones[ARP[s16]]), t);
    }
    if (withLead && !breakdown) {
      const note = this.motif[(step % 64) % 32];
      if (note != null) this.lead(hz(note), t, STEP * 2);
    }
  }

  private env(g: GainNode, t: number, vol: number, attack: number, dur: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private kick(t: number): void {
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    this.env(g, t, 0.9, 0.003, 0.3);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.32);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, vol: number, dur: number): void {
    const src = this.ac.createBufferSource();
    src.buffer = this.noise;
    const f = this.ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ac.createGain();
    this.env(g, t, vol, 0.002, dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number): void {
    this.noiseHit(t, 'bandpass', 1800, 0.45, 0.22);
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    this.env(g, t, 0.25, 0.002, 0.1);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.12);
  }

  private hat(t: number, vol: number): void {
    this.noiseHit(t, 'highpass', 7000, vol, 0.05);
  }

  private bass(freq: number, t: number): void {
    const o = this.ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = this.ac.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + STEP * 1.8);
    const g = this.ac.createGain();
    this.env(g, t, 0.28, 0.005, STEP * 1.9);
    o.connect(f).connect(g).connect(this.out);
    o.start(t);
    o.stop(t + STEP * 2);
  }

  private pad(chord: Chord, t: number, dur: number): void {
    const f = this.ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.4);
    g.gain.setValueAtTime(0.05, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.out);
    for (const iv of [0, chord.minor ? 3 : 4, 7]) {
      for (const detune of [-8, 8]) {
        const o = this.ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(chord.root + iv);
        o.detune.value = detune;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }

  private arp(freq: number, t: number): void {
    const o = this.ac.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const f = this.ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    const g = this.ac.createGain();
    this.env(g, t, 0.05, 0.003, STEP * 0.9);
    o.connect(f).connect(g).connect(this.fx);
    o.start(t);
    o.stop(t + STEP);
  }

  private lead(freq: number, t: number, dur: number): void {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.setValueAtTime(0.06, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
    g.connect(this.fx);
    const vib = this.ac.createOscillator();
    vib.frequency.value = 5.5;
    const vibAmt = this.ac.createGain();
    vibAmt.gain.value = freq * 0.006;
    vib.connect(vibAmt);
    for (const [type, det] of [['sawtooth', -6], ['square', 6]] as const) {
      const o = this.ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = det;
      vibAmt.connect(o.frequency);
      o.connect(g);
      o.start(t);
      o.stop(t + dur * 1.5);
    }
    vib.start(t);
    vib.stop(t + dur * 1.5);
  }
}

let music: Synthwave | null = null;

/** Start the background music (idempotent). Must be called from a user gesture the first time. */
export function startMusic(): void {
  if (music) return;
  const ac = audioContext();
  const out = musicOutput();
  if (!ac || !out) return;
  music = new Synthwave(ac, out);
  music.start();
}

/** Debug/test helper: render the music offline and report its peak and RMS level. */
export async function analyseMusic(seconds: number): Promise<{ peak: number; rms: number }> {
  const off = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
  const synth = new Synthwave(off, off.destination);
  synth.scheduleUntil(seconds);
  const buf = await off.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0;
  let sum = 0;
  for (const v of d) {
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  return { peak, rms: Math.sqrt(sum / d.length) };
}
