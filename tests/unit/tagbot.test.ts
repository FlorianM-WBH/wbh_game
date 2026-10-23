import { describe, expect, it } from 'vitest';
import { newGame, tick } from '../../src/sim/game';
import { freeSlot, lotCars } from '../../src/sim/economy';
import { startPurchase, makeOffer, closeNegotiation } from '../../src/sim/negotiation';
import { putOnLift, startRepair, takeOffLift } from '../../src/sim/workshop';
import { setPriceTag, tagFor } from '../../src/sim/market';
import { COMPONENTS } from '../../src/content/workshop';
import { reputation } from '../../src/sim/reputation';

/** Tag-only selling (no haggling at all) should work, but not be a money printer. */
describe('price tag bot', () => {
  it('selling only via price tags at 0.9x market value is profitable over 14 days', () => {
    const f = 0.9;
    const s = newGame(42);
    for (let day = 0; day < 14; day++) {
      const today = s.day;
      while (s.day === today) {
        tick(s, 5);
        s.events = [];
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
        for (const car of lotCars(s)) setPriceTag(s, car.id, Math.max(car.invested * 1.05, tagFor(car, f)));
        for (const c of [...s.customers]) {
          if (c.served) continue;
          if (c.intent === 'sell' && freeSlot(s) !== null) {
            const n = startPurchase(s, c.id);
            if (!n) continue;
            for (let r = 0; r < 6 && n.result === 'open'; r++) makeOffer(s, Math.min(s.money - 500, n.limit * 0.97 + r * 0.04 * n.limit));
            closeNegotiation(s);
          }
        }
      }
    }
    expect(s.stats.tagSales ?? 0).toBeGreaterThan(5);
    expect(s.money + lotCars(s).reduce((a, c) => a + c.invested, 0)).toBeGreaterThan(8000 * 1.5);
    expect(reputation(s)).toBeGreaterThan(30);
  });
});
