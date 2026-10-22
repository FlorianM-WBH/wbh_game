import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/sim/game';
import { spawnCustomer, buyerLimit, wishMet } from '../../src/sim/customers';
import { pitchReaction, startSale, useTactic } from '../../src/sim/negotiation';
import { ARCHETYPES } from '../../src/content/archetypes';
import { UPGRADES } from '../../src/content/workshop';
import { UPGRADE_REMARKS } from '../../src/content/remarks';
import { REACTIONS } from '../../src/content/reactions';
import { currentTip, TIPS } from '../../src/tutorial';

describe('buyer wishes', () => {
  it('about half of the buyers wish for an extra that matches their taste', () => {
    const s = newGame(11);
    let wishes = 0;
    for (let i = 0; i < 200; i++) {
      s.customers = [];
      const c = spawnCustomer(s, 'buy')!;
      if (c.wish) {
        wishes++;
        const a = ARCHETYPES.find((x) => x.id === c.archetypeId)!;
        const u = UPGRADES.find((x) => x.id === c.wish)!;
        expect(u.tags.some((t) => a.likes.includes(t))).toBe(true);
      }
    }
    expect(wishes).toBeGreaterThan(60);
    expect(wishes).toBeLessThan(140);
  });

  it('a fulfilled wish raises the price and shows up in the pitch', () => {
    const s = newGame(12);
    let c = spawnCustomer(s, 'buy')!;
    while (!c.wish) {
      s.customers = [];
      c = spawnCustomer(s, 'buy')!;
    }
    const car = s.cars[0];
    car.upgrades = [];
    expect(wishMet(c, car)).toBe(false);
    const without = buyerLimit(s, c, car, 1);
    c.budget = 1e9;
    const withoutRich = buyerLimit(s, c, car, 1);
    car.upgrades = [c.wish!];
    expect(wishMet(c, car)).toBe(true);
    expect(buyerLimit(s, c, car, 1)).toBeGreaterThan(withoutRich);
    expect(without).toBeGreaterThan(0);
    const r = pitchReaction(s, c.id, car.id);
    if (r.fit !== 'bad') expect(UPGRADE_REMARKS[c.wish!].have.some((l) => r.line.includes(l))).toBe(true);
  });
});

describe('dialogue content', () => {
  it('every upgrade has remarks and every archetype has tactic reactions', () => {
    for (const u of UPGRADES) {
      const r = UPGRADE_REMARKS[u.id];
      expect(r, u.id).toBeTruthy();
      for (const k of ['wish', 'have', 'missing', 'praise'] as const) expect(r[k].length, `${u.id}.${k}`).toBeGreaterThan(0);
    }
    for (const a of ARCHETYPES) expect(Object.keys(REACTIONS[a.id] ?? {}).length, a.id).toBe(6);
  });

  it('tactics produce a customer line', () => {
    const s = newGame(13);
    const c = spawnCustomer(s, 'buy')!;
    c.archetypeId = 'rocker';
    s.cars[0].modelId = 'golfo';
    const n = startSale(s, c.id, s.cars[0].id) ?? startSale(s, c.id, s.cars[1].id);
    if (!n) return;
    const step = useTactic(s, 'charm');
    expect(step.line.length).toBeGreaterThan(5);
  });
});

describe('first-steps tips', () => {
  it('advance as the player completes actions, in any order', () => {
    const s = newGame(14);
    expect(currentTip(s)!.index).toBe(0);
    s.stats.carsSold = 1;
    expect(currentTip(s)!.index).toBe(0);
    s.stats.carsBought = 1;
    s.stats.repairsDone = 1;
    expect(currentTip(s)!.index).toBe(4);
    s.techs.push('x');
    s.buildings.parkplatz = 1;
    expect(currentTip(s)).toBeNull();
    expect(s.tips).toBe((1 << TIPS.length) - 1);
  });
});
