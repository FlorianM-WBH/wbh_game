// A "human-like" bot for long balance runs. It never peeks at hidden limits: it haggles with simple
// rules of thumb, does service jobs, repairs and tunes cars, and spends money on tech and buildings.
import { BUILDINGS, TECHS } from '../../src/content/progression';
import { COMPONENTS } from '../../src/content/workshop';
import { carFit } from '../../src/sim/customers';
import { freeSlot, lotCars, marketValue, repairQuote, upgradeQuote } from '../../src/sim/economy';
import { newGame, tick } from '../../src/sim/game';
import { abandonNegotiation, acceptOffer, closeNegotiation, makeOffer, startPurchase, startSale, useTactic, availableTactics } from '../../src/sim/negotiation';
import { buyBuilding, buyTech, completion, nextBuildingCost, techState } from '../../src/sim/progression';
import { acceptService, completeService, ownerOf, serviceFinished } from '../../src/sim/service';
import { carById, type Car, type GameState } from '../../src/sim/state';
import { availableUpgrades, bays, liftAt, liftCar, putOnLift, startRepair, startUpgrade, takeOffLift } from '../../src/sim/workshop';

export interface BotReport {
  dayDone: number | null;
  days: number;
  money: number;
  debt: number;
  sold: number;
  bought: number;
  services: number;
  completion: number;
  /** completion % at the end of selected days */
  curve: Record<number, number>;
}

/** Spend on progression, keeping a reserve for buying stock. */
function shop(s: GameState): void {
  const reserve = 4000 + 1500 * lotCars(s).length;
  const options: { cost: number; buy: () => boolean }[] = [];
  for (const t of TECHS) if (techState(s, t.id) === 'available') options.push({ cost: t.cost, buy: () => buyTech(s, t.id).ok });
  for (const b of BUILDINGS) {
    const c = nextBuildingCost(s, b.id);
    if (c != null) options.push({ cost: c, buy: () => buyBuilding(s, b.id).ok });
  }
  options.sort((a, b) => a.cost - b.cost);
  for (const o of options) if (s.money - o.cost > reserve) o.buy();
}

function workLift(s: GameState, bay: number): void {
  const lift = liftAt(s, bay);
  if (lift.job) return;
  const car = liftCar(s, bay);
  if (car) {
    const owner = ownerOf(s, car);
    if (owner?.service) {
      if (serviceFinished(car, owner.service)) completeService(s, bay);
      else if (owner.service.kind === 'repair') startRepair(s, owner.service.target as never, bay);
      else startUpgrade(s, owner.service.target, bay);
      return;
    }
    const broken = COMPONENTS.find((c) => car.cond[c] < 85 && repairQuote(s, car, c).cost < s.money - 1000);
    if (broken) {
      startRepair(s, broken, bay);
      return;
    }
    // one or two extras that are cheap relative to the car
    const up = availableUpgrades(s, bay).find((u) => car.upgrades.length < 2 && upgradeQuote(s, u.id).cost < marketValue(car) * 0.15 && upgradeQuote(s, u.id).cost < s.money - 2000);
    if (up) {
      startUpgrade(s, up.id, bay);
      return;
    }
    takeOffLift(s, bay);
    return;
  }
  // service cars first, then the most worn stock car
  const order = s.customers.find((c) => c.service?.accepted && carById(s, c.carId)?.loc.kind === 'buyin');
  if (order) {
    putOnLift(s, order.carId!, bay);
    return;
  }
  const worn = lotCars(s).find((c) => COMPONENTS.some((k) => c.cond[k] < 85));
  if (worn) putOnLift(s, worn.id, bay);
}

function buyFromSeller(s: GameState, customerId: number): void {
  const n = startPurchase(s, customerId);
  if (!n) return;
  const car = carById(s, n.carId)!;
  const value = marketValue(car);
  const maxPay = Math.min(s.money - 1500, value * 0.8);
  if (maxPay < value * 0.3) abandonNegotiation(s);
  let offer = value * 0.5;
  for (let r = 0; r < 5 && n.result === 'open'; r++) {
    if (n.theirOffer <= maxPay) {
      acceptOffer(s);
      break;
    }
    if (r === 1 && useTactic(s, 'hard').result !== 'open') break;
    makeOffer(s, Math.min(offer, maxPay));
    offer *= 1.12;
  }
  closeNegotiation(s);
  void car;
}

function sellToBuyer(s: GameState, customerId: number): void {
  const c = s.customers.find((x) => x.id === customerId)!;
  const cars = lotCars(s)
    .filter((car) => carFit(c, car).fit !== 'bad')
    .sort((a, b) => carFit(c, b).score - carFit(c, a).score);
  const car = cars[0];
  if (!car) return;
  const n = startSale(s, customerId, car.id);
  if (!n) return;
  const value = marketValue(car);
  const floor = Math.max(car.invested * 1.08, value * 0.85);
  let ask = value * 1.25;
  if (availableTactics(s).includes('story')) useTactic(s, 'story');
  if (n.result === 'open') useTactic(s, 'charm');
  for (let r = 0; r < 5 && n.result === 'open'; r++) {
    if (n.theirOffer >= ask * 0.97) {
      acceptOffer(s);
      break;
    }
    makeOffer(s, Math.max(floor, ask));
    ask *= 0.94;
  }
  if (n.result === 'open' && n.theirOffer >= floor) acceptOffer(s);
  closeNegotiation(s);
}

export function runBot(seed: number, maxDays: number, checkpoints: number[] = []): BotReport {
  const s = newGame(seed);
  let dayDone: number | null = null;
  const curve: Record<number, number> = {};
  while (s.day <= maxDays && !s.over) {
    const today = s.day;
    while (s.day === today && !s.over) {
      tick(s, 5, { workBoost: 1 });
      s.events = [];
      for (const b of bays(s)) workLift(s, b);
      for (const c of [...s.customers]) {
        if (c.served || !s.customers.includes(c)) continue;
        if (c.intent === 'service') acceptService(s, c.id);
        else if (c.intent === 'sell' && freeSlot(s) !== null) buyFromSeller(s, c.id);
        else if (c.intent === 'buy') sellToBuyer(s, c.id);
      }
      if (s.minute % 120 === 0) shop(s);
    }
    if (checkpoints.includes(today)) curve[today] = Math.round(completion(s) * 100);
    if (dayDone === null && completion(s) >= 1) dayDone = today;
    if (dayDone !== null) break;
  }
  return {
    dayDone,
    days: s.day - 1,
    money: Math.round(s.money),
    debt: Math.round(s.debt ?? 0),
    sold: s.stats.carsSold,
    bought: s.stats.carsBought,
    services: s.stats.servicesDone ?? 0,
    completion: Math.round(completion(s) * 100),
    curve,
  };
}

export type { Car };
