// Deterministic RNG (mulberry32). The state lives in GameState so saves replay identically.

export interface RngHolder {
  rng: number;
}

export function rand(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(h: RngHolder, min: number, max: number): number {
  return min + rand(h) * (max - min);
}

export function randInt(h: RngHolder, min: number, maxIncl: number): number {
  return Math.floor(randRange(h, min, maxIncl + 1));
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(rand(h) * arr.length)];
}

export function pickWeighted<T>(h: RngHolder, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = rand(h) * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

export function chance(h: RngHolder, p: number): boolean {
  return rand(h) < p;
}
