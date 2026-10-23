import { describe, expect, it } from 'vitest';
import { runBot } from './playbot';

/**
 * Pacing guard: a strong, human-like bot (serves every customer, no peeking at hidden limits) should
 * finish the whole empire in roughly 15–45 game days. Real players are slower, which lands them in
 * the 3–5 hour target (a game day lasts about 6 real minutes).
 */
describe('long run pacing', () => {
  it.each([1, 2, 3])('seed %i: the empire is finished in a sensible number of days, without going bust', (seed) => {
    const r = runBot(seed, 70);
    expect(r.dayDone).not.toBeNull();
    expect(r.dayDone!).toBeGreaterThanOrEqual(15);
    expect(r.dayDone!).toBeLessThanOrEqual(45);
    expect(r.debt).toBe(0);
  });

  it('early progress is visible but not instant', () => {
    const r = runBot(4, 10, [5]);
    expect(r.curve[5]).toBeGreaterThan(5);
    expect(r.curve[5]).toBeLessThan(60);
  });
});
