// Tiny WebAudio synth for sound effects. No audio files needed.

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.06): void {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
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

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}
