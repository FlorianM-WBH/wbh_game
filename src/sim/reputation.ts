// Reputation: how Miami talks about the dealer. Affects how many customers come and how friendly they start.
import { emit, type GameState } from './state';

export const REP_START = 50;

export function reputation(s: GameState): number {
  return s.rep ?? REP_START;
}

const TIERS: { min: number; label: string }[] = [
  { min: 85, label: 'Legende von Miami' },
  { min: 65, label: 'Solider Laden' },
  { min: 40, label: 'Unbeschriebenes Blatt' },
  { min: 20, label: 'Zwielichtiger Schuppen' },
  { min: 0, label: 'Halsabschneider' },
];

export function repLabel(s: GameState): string {
  const r = reputation(s);
  return TIERS.find((t) => r >= t.min)!.label;
}

/** 0..5 stars for the HUD. */
export function repStars(s: GameState): number {
  return Math.round(reputation(s) / 20);
}

/** Change reputation; emits a toast when the tier changes. */
export function addRep(s: GameState, delta: number): void {
  const before = repLabel(s);
  s.rep = Math.max(0, Math.min(100, reputation(s) + delta));
  const after = repLabel(s);
  if (after !== before) emit(s, { type: 'toast', text: `Dein Ruf: ${after}` });
}

/** Overnight, a bad reputation slowly fades back towards neutral (Miami forgets). */
export function overnightRep(s: GameState): void {
  const r = reputation(s);
  if (r < REP_START) s.rep = r + (REP_START - r) * 0.15;
}

/** Customer rate multiplier: 0.6 at rep 0, 1.0 at 50, 1.4 at 100. */
export function repRateFactor(s: GameState): number {
  return 0.6 + (0.8 * reputation(s)) / 100;
}

/** Mood bonus at the start of a negotiation: -10..+10. */
export function repMoodBonus(s: GameState): number {
  return (reputation(s) - REP_START) / 5;
}
