import { describe, expect, it } from 'vitest';
import { endDay, newGame, tick } from '../../src/sim/game';
import { customerRate, freeSlot, lotCars, marketValue } from '../../src/sim/economy';
import { carFit, removeCustomer, spawnCustomer } from '../../src/sim/customers';
import { auctionLots, buyAuctionLot, setPriceTag, tickBrowsing } from '../../src/sim/market';
import { borrow, CREDIT_LIMIT, debt, GAME_OVER_DEBT, repay } from '../../src/sim/finance';
import { acceptService } from '../../src/sim/service';
import { addRep, reputation } from '../../src/sim/reputation';
import { buyBuilding, buyTech } from '../../src/sim/progression';
import { liftAt, liftCount, putOnLift, startRepair, takeOffLift } from '../../src/sim/workshop';
import { startSale, makeOffer } from '../../src/sim/negotiation';
import type { GameState } from '../../src/sim/state';

function buyerLiking(s: GameState, carId: number) {
  for (let i = 0; i < 300; i++) {
    const c = spawnCustomer(s, 'buy');
    if (
      c &&
      carFit(
        c,
        s.cars.find((x) => x.id === carId)!,
      ).fit === 'good'
    )
      return c;
    s.customers = [];
  }
  throw new Error('no buyer');
}

describe('price tags', () => {
  it('a buyer pays a cheap tag price without haggling', () => {
    const s = newGame(5);
    const car = s.cars[0];
    setPriceTag(s, car.id, marketValue(car) * 0.6);
    const c = buyerLiking(s, car.id);
    const money = s.money;
    for (let i = 0; i < 20 && s.customers.length; i++) tickBrowsing(s, 15);
    expect(s.customers.find((x) => x.id === c.id)).toBeUndefined();
    expect(s.cars.find((x) => x.id === car.id)).toBeUndefined();
    expect(s.money).toBe(money + car.price!);
    expect(s.stats.tagSales).toBe(1);
  });

  it('an absurd tag is rejected and the buyer stays', () => {
    const s = newGame(6);
    const car = s.cars[0];
    setPriceTag(s, car.id, marketValue(car) * 5);
    const c = buyerLiking(s, car.id);
    c.waitLeft = 9999;
    for (let i = 0; i < 20; i++) tickBrowsing(s, 15);
    expect(s.cars.find((x) => x.id === car.id)).toBeDefined();
    expect(c.rejected).toContain(car.id);
    expect(c.eyeing ?? null).toBeNull();
  });

  it('buyers ignore untagged cars and customers already talked to', () => {
    const s = newGame(7);
    const car = s.cars[0];
    const c = buyerLiking(s, car.id);
    for (let i = 0; i < 10; i++) tickBrowsing(s, 15);
    expect(c.eyeing ?? null).toBeNull();
    setPriceTag(s, car.id, 100);
    startSale(s, c.id, car.id);
    makeOffer(s, 1e9); // keep the negotiation open; the customer is now "served"
    s.negotiation = null;
    for (let i = 0; i < 10; i++) tickBrowsing(s, 15);
    expect(s.cars.find((x) => x.id === car.id)).toBeDefined();
  });
});

describe('dealer auction', () => {
  it('needs the tech and puts the bought car on the lot', () => {
    const s = newGame(8);
    s.money = 100000;
    const lot = auctionLots(s)[0];
    expect(buyAuctionLot(s, lot.car.id).ok).toBe(false);
    expect(buyTech(s, 'auktion').ok).toBe(true);
    const before = lotCars(s).length;
    expect(buyAuctionLot(s, lot.car.id).ok).toBe(true);
    expect(lotCars(s).length).toBe(before + 1);
    expect(lot.car.invested).toBe(lot.price + 150);
    expect(auctionLots(s).length).toBe(2);
    // new lots the next day
    endDay(s);
    expect(auctionLots(s).length).toBe(3);
  });

  it('prices are below market value', () => {
    const s = newGame(9);
    for (const l of auctionLots(s)) expect(l.price).toBeLessThan(marketValue(l.car));
  });

  it('refuses when the lot is full', () => {
    const s = newGame(10);
    s.money = 100000;
    buyTech(s, 'auktion');
    while (freeSlot(s) !== null) buyAuctionLot(s, auctionLots(s)[0].car.id) || endDay(s);
    expect(freeSlot(s)).toBeNull();
    endDay(s);
    expect(buyAuctionLot(s, auctionLots(s)[0].car.id).ok).toBe(false);
  });
});

describe('loan shark', () => {
  it('borrowing has a limit and costs daily interest', () => {
    const s = newGame(11);
    expect(borrow(s, CREDIT_LIMIT + 1).ok).toBe(false);
    expect(borrow(s, 10000).ok).toBe(true);
    expect(s.money).toBe(18000);
    endDay(s);
    expect(debt(s)).toBe(10300);
    expect(repay(s, 300).ok).toBe(true);
    expect(debt(s)).toBe(10000);
  });

  it('a negative balance at closing becomes debt with a fee', () => {
    const s = newGame(12);
    s.money = -1000;
    endDay(s);
    expect(s.money).toBe(0);
    expect(debt(s)).toBe(Math.ceil((1000 + 250) * 1.2));
    expect(s.over).toBeFalsy();
  });

  it('heavy debt ends the game', () => {
    const s = newGame(13);
    s.debt = GAME_OVER_DEBT - 100;
    endDay(s);
    expect(s.over).toBe(true);
    expect(s.events.some((e) => e.type === 'gameOver')).toBe(true);
    const minute = s.minute;
    tick(s, 30);
    expect(s.minute).toBe(minute);
  });
});

describe('reputation', () => {
  it('missing a service deadline hurts, and reputation changes the customer rate', () => {
    const s = newGame(14);
    const c = spawnCustomer(s, 'service')!;
    acceptService(s, c.id);
    const before = reputation(s);
    removeCustomer(s, c.id, 'impatient');
    expect(reputation(s)).toBe(before - 6);
    const r = customerRate(s);
    addRep(s, 40);
    expect(customerRate(s)).toBeGreaterThan(r);
    addRep(s, 1000);
    expect(reputation(s)).toBe(100);
  });
});

describe('second lift', () => {
  it('comes with the workshop upgrade and runs jobs in parallel', () => {
    const s = newGame(15);
    s.money = 100000;
    const [a, b] = s.cars;
    expect(putOnLift(s, a.id).ok).toBe(true);
    expect(putOnLift(s, b.id).ok).toBe(false);
    expect(buyBuilding(s, 'werkstatt').ok).toBe(true);
    expect(liftCount(s)).toBe(2);
    expect(putOnLift(s, b.id).ok).toBe(true);
    expect(b.loc).toEqual({ kind: 'lift', bay: 1 });
    a.cond.motor = 20;
    b.cond.reifen = 20;
    expect(startRepair(s, 'motor', 0).ok).toBe(true);
    expect(startRepair(s, 'reifen', 1).ok).toBe(true);
    tick(s, 400);
    expect(a.cond.motor).toBe(100);
    expect(b.cond.reifen).toBe(100);
    expect(takeOffLift(s, 1).ok).toBe(true);
    expect(liftAt(s, 1).carId).toBeNull();
    expect(b.loc.kind).toBe('lot');
  });

  it('the player boost only speeds up the bay they help at', () => {
    const s = newGame(16);
    s.money = 100000;
    buyBuilding(s, 'werkstatt');
    const [a, b] = s.cars;
    putOnLift(s, a.id, 0);
    putOnLift(s, b.id, 1);
    a.cond.motor = 10;
    b.cond.motor = 10;
    startRepair(s, 'motor', 0);
    startRepair(s, 'motor', 1);
    tick(s, 10, { workBoost: 3, boostBay: 1 });
    expect(liftAt(s, 1).job!.minutesLeft).toBeLessThan(liftAt(s, 0).job!.minutesLeft);
  });
});
