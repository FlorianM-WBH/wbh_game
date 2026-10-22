import { describe, expect, it } from 'vitest';
import { newGame, tick, serialize, deserialize } from '../../src/sim/game';
import { marketValue, freeSlot, lotCars, repairQuote } from '../../src/sim/economy';
import { spawnCustomer, carFit } from '../../src/sim/customers';
import { startSale, startPurchase, makeOffer, acceptOffer, useTactic, effectiveLimit, closeNegotiation } from '../../src/sim/negotiation';
import { putOnLift, startRepair, takeOffLift, tickLift } from '../../src/sim/workshop';
import { buyTech, buyBuilding, completion } from '../../src/sim/progression';
import { COMPONENTS } from '../../src/content/workshop';
import type { GameState } from '../../src/sim/state';

describe('economy', () => {
  it('repaired cars are worth more than broken ones', () => {
    const s = newGame(1);
    const car = s.cars[0];
    const before = marketValue(car);
    for (const c of COMPONENTS) car.cond[c] = 100;
    expect(marketValue(car)).toBeGreaterThan(before);
  });

  it('repairing a component adds more value than it costs on average', () => {
    const s = newGame(2);
    const car = s.cars[0];
    for (const c of COMPONENTS) car.cond[c] = 40;
    for (const comp of COMPONENTS) {
      const before = marketValue(car);
      const q = repairQuote(s, car, comp);
      car.cond[comp] = 100;
      expect(marketValue(car) - before).toBeGreaterThan(q.cost);
    }
  });
});

describe('workshop', () => {
  it('runs a repair job to completion and returns the car to the lot', () => {
    const s = newGame(3);
    const car = s.cars[0];
    car.cond.motor = 30;
    expect(putOnLift(s, car.id).ok).toBe(true);
    const money = s.money;
    expect(startRepair(s, 'motor').ok).toBe(true);
    expect(s.money).toBeLessThan(money);
    tickLift(s, 10000);
    expect(car.cond.motor).toBe(100);
    expect(s.lift.job).toBeNull();
    expect(takeOffLift(s).ok).toBe(true);
    expect(car.loc.kind).toBe('lot');
  });
});

describe('negotiation', () => {
  function buyerFor(s: GameState, carId: number) {
    for (let i = 0; i < 200; i++) {
      const c = spawnCustomer(s, 'buy');
      if (c && carFit(c, s.cars.find((x) => x.id === carId)!).fit !== 'bad') return c;
      s.customers = [];
    }
    throw new Error('no buyer');
  }

  it('a buyer accepts a price at or below their limit', () => {
    const s = newGame(4);
    const car = s.cars[0];
    const c = buyerFor(s, car.id);
    const n = startSale(s, c.id, car.id)!;
    expect(n).not.toBeNull();
    const money = s.money;
    const price = Math.floor(effectiveLimit(n)) - 10;
    expect(makeOffer(s, price).result).toBe('deal');
    expect(s.money).toBe(money + price);
    expect(s.cars.find((x) => x.id === car.id)).toBeUndefined();
    expect(s.customers.find((x) => x.id === c.id)).toBeUndefined();
  });

  it('a buyer walks out after endless overpricing', () => {
    const s = newGame(5);
    const car = s.cars[0];
    const c = buyerFor(s, car.id);
    const n = startSale(s, c.id, car.id)!;
    let result = 'open';
    for (let i = 0; i < 20 && result === 'open'; i++) result = makeOffer(s, n.limit * 1.2).result;
    expect(result).toBe('walkout');
    expect(s.cars.find((x) => x.id === car.id)).toBeDefined();
  });

  it('counteroffers move towards the limit', () => {
    const s = newGame(6);
    const car = s.cars[0];
    const c = buyerFor(s, car.id);
    const n = startSale(s, c.id, car.id)!;
    const first = n.theirOffer;
    makeOffer(s, n.limit * 1.1);
    if (n.result === 'open') expect(n.theirOffer).toBeGreaterThanOrEqual(first);
  });

  it('buying a car from a seller puts it on the lot', () => {
    const s = newGame(7);
    const c = spawnCustomer(s, 'sell')!;
    expect(c.carId).not.toBeNull();
    startPurchase(s, c.id);
    const money = s.money;
    const offer = s.negotiation!.theirOffer;
    expect(acceptOffer(s).result).toBe('deal');
    expect(s.money).toBe(money - offer);
    expect(lotCars(s).length).toBe(3);
    closeNegotiation(s);
  });

  it('tactics can only be used once each', () => {
    const s = newGame(8);
    const c = spawnCustomer(s, 'sell')!;
    startPurchase(s, c.id);
    useTactic(s, 'charm');
    const logLen = s.negotiation!.log.length;
    useTactic(s, 'charm');
    expect(s.negotiation!.log.length).toBe(logLen);
  });
});

describe('clock', () => {
  it('spawns customers during the day and charges rent at closing', () => {
    const s = newGame(9);
    let arrived = 0;
    let rentDay = 0;
    for (let i = 0; i < 12 * 60; i++) {
      tick(s, 1);
      for (const e of s.events) {
        if (e.type === 'customerArrived') arrived++;
        if (e.type === 'dayEnded') rentDay = e.day;
      }
      s.events = [];
    }
    expect(arrived).toBeGreaterThan(4);
    expect(rentDay).toBe(1);
    expect(s.day).toBe(2);
    expect(s.customers.length).toBe(0);
  });

  it('save and load round-trips', () => {
    const s = newGame(10);
    tick(s, 100);
    const t = deserialize(serialize(s))!;
    expect(t.money).toBe(s.money);
    expect(t.cars).toEqual(s.cars);
    expect(t.rng).toBe(s.rng);
  });
});

describe('progression', () => {
  it('tech needs prerequisites and money', () => {
    const s = newGame(11);
    s.money = 100000;
    expect(buyTech(s, 'turbo').ok).toBe(false);
    expect(buyTech(s, 'druckluft').ok).toBe(true);
    expect(buyTech(s, 'neon').ok).toBe(true);
    expect(buyTech(s, 'chrom').ok).toBe(true);
    expect(buyTech(s, 'turbo').ok).toBe(true);
    expect(completion(s)).toBeGreaterThan(0);
  });

  it('a bigger lot adds parking slots', () => {
    const s = newGame(12);
    s.money = 100000;
    s.cars.push(...[2, 3].map((slot) => ({ ...s.cars[0], id: 100 + slot, loc: { kind: 'lot' as const, slot } })));
    expect(freeSlot(s)).toBeNull();
    expect(buyBuilding(s, 'parkplatz').ok).toBe(true);
    expect(freeSlot(s)).toBe(4);
  });
});

/**
 * A simple bot plays two weeks: buys cheap, repairs everything, sells near the buyer's limit.
 * This guards the economy against obviously broken balance (it must be profitable to play well).
 */
describe('balance bot', () => {
  it('a sensible strategy makes money over 14 days', () => {
    const s = newGame(42);
    const start = s.money;
    for (let day = 0; day < 14; day++) {
      const today = s.day;
      while (s.day === today) {
        tick(s, 5, { workBoost: 1 });
        s.events = [];
        // workshop: repair whatever is on the lift, then put it back
        if (!s.lift.job) {
          const car = s.lift.carId != null ? s.cars.find((c) => c.id === s.lift.carId) : undefined;
          if (car) {
            const broken = COMPONENTS.find((c) => car.cond[c] < 90);
            if (!broken || s.money < 1500 || !startRepair(s, broken).ok) takeOffLift(s);
          } else {
            const worst = lotCars(s).find((c) => COMPONENTS.some((k) => c.cond[k] < 90));
            if (worst) putOnLift(s, worst.id);
          }
        }
        for (const c of [...s.customers]) {
          if (c.served) continue;
          if (c.intent === 'sell' && freeSlot(s) !== null) {
            const n = startPurchase(s, c.id);
            if (!n) continue;
            for (let r = 0; r < 6 && n.result === 'open'; r++) makeOffer(s, Math.min(s.money - 500, n.limit * 0.97 + r * 0.04 * n.limit));
            closeNegotiation(s);
          } else if (c.intent === 'buy') {
            const cars = lotCars(s).filter((car) => carFit(c, car).fit !== 'bad' && car.loc.kind === 'lot');
            if (!cars.length) continue;
            const n = startSale(s, c.id, cars[0].id);
            if (!n) continue;
            for (let r = 0; r < 6 && n.result === 'open'; r++) makeOffer(s, Math.max(cars[0].invested * 1.02, n.limit * (1.04 - r * 0.03)));
            closeNegotiation(s);
          }
        }
      }
    }
    expect(s.stats.carsSold).toBeGreaterThan(3);
    expect(s.money + lotCars(s).reduce((a, c) => a + c.invested, 0)).toBeGreaterThan(start * 1.3);
  });
});
