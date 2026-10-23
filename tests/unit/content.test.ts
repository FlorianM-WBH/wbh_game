import { describe, expect, it } from 'vitest';
import { newGame, tick } from '../../src/sim/game';
import { lotCars, repairQuote, upgradeQuote } from '../../src/sim/economy';
import { acceptService, completeService, serviceFinished } from '../../src/sim/service';
import { putOnLift, startRepair, startUpgrade, takeOffLift, tickLift } from '../../src/sim/workshop';
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

describe('service customers', () => {
  function serviceCustomer(seed: number) {
    const s = newGame(seed);
    const c = spawnCustomer(s, 'service')!;
    return { s, c, car: s.cars.find((x) => x.id === c.carId)! };
  }

  it('arrive with their own car and a job that needs doing', () => {
    const { s, c, car } = serviceCustomer(21);
    expect(c.service).toBeTruthy();
    expect(car.ownerId).toBe(c.id);
    expect(car.loc.kind).toBe('buyin');
    expect(serviceFinished(car, c.service!)).toBe(false);
    expect(c.service!.fee).toBeGreaterThan(0);
    // the buy-in zone is taken: no seller can come now
    expect(spawnCustomer(s, 'sell')).toBeNull();
    // and the car never counts as stock
    expect(lotCars(s).some((x) => x.id === car.id)).toBe(false);
  });

  it('full job: accept, lift, work, hand over, get paid', () => {
    for (let seed = 30; seed < 40; seed++) {
      const { s, c, car } = serviceCustomer(seed);
      expect(putOnLift(s, car.id).ok).toBe(false); // not accepted yet
      expect(acceptService(s, c.id).ok).toBe(true);
      expect(c.service!.due).toBeGreaterThan(s.minute);
      expect(putOnLift(s, car.id).ok).toBe(true);
      const o = c.service!;
      const r = o.kind === 'repair' ? startRepair(s, o.target as never) : startUpgrade(s, o.target);
      expect(r.ok).toBe(true);
      const money = s.money;
      expect(completeService(s).ok).toBe(false); // job still running
      tickLift(s, 1000);
      const done = completeService(s);
      expect(done.ok).toBe(true);
      expect(s.money).toBeGreaterThanOrEqual(money + o.fee);
      expect(s.cars.some((x) => x.id === car.id)).toBe(false);
      expect(s.lift.carId).toBeNull();
      expect(s.customers.some((x) => x.id === c.id)).toBe(false);
      expect(s.stats.servicesDone).toBe(1);
    }
  });

  it('the fee covers the parts with a profit', () => {
    for (let seed = 40; seed < 60; seed++) {
      const { s, c, car } = serviceCustomer(seed);
      const o = c.service!;
      const q = o.kind === 'repair' ? repairQuote(s, car, o.target as never) : upgradeQuote(s, o.target);
      expect(o.fee).toBeGreaterThan(q.cost * 1.2);
    }
  });

  it('a missed deadline means the customer takes the car off the lift and pays nothing', () => {
    const { s, c, car } = serviceCustomer(61);
    acceptService(s, c.id);
    putOnLift(s, car.id);
    const money = s.money;
    tick(s, c.service!.due - s.minute + 1);
    expect(s.customers.some((x) => x.id === c.id)).toBe(false);
    expect(s.cars.some((x) => x.id === car.id)).toBe(false);
    expect(s.lift.carId).toBeNull();
    expect(s.money).toBe(money);
  });

  it('a car taken off the lift unfinished goes back to the buy-in zone', () => {
    const { s, c, car } = serviceCustomer(62);
    acceptService(s, c.id);
    putOnLift(s, car.id);
    expect(takeOffLift(s).ok).toBe(true);
    expect(car.loc.kind).toBe('buyin');
  });
});
