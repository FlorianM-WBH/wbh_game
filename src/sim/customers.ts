// Customer generation: who arrives, what they want, and the cars sellers bring.
import { ARCHETYPES, ARCHETYPE_BY_ID, type Archetype } from '../content/archetypes';
import { MODELS, type CarModel } from '../content/models';
import { COMPONENTS, UPGRADES, type Component } from '../content/workshop';
import { carTags, freeSlot, lotCars, marketValue, showroomBonus } from './economy';
import { makeServiceOrder, SERVICE_LAST_MINUTE } from './service';
import { addRep } from './reputation';
import { chance, pick, pickWeighted, rand, randInt, randRange } from './rng';
import { buildingLevel, emit, hasTech, nextId, type Car, type Customer, type GameState, type Intent } from './state';

export const WAIT_SPOTS = 4;

export function archetypeOf(c: Customer): Archetype {
  return ARCHETYPE_BY_ID[c.archetypeId];
}

function freeWaitSpot(s: GameState): number | null {
  const used = new Set(s.customers.filter((c) => c.intent === 'buy').map((c) => c.spot));
  for (let i = 0; i < WAIT_SPOTS; i++) if (!used.has(i)) return i;
  return null;
}

function buyinBusy(s: GameState): boolean {
  return s.cars.some((c) => c.loc.kind === 'buyin' || c.ownerId != null) || s.customers.some((c) => c.intent !== 'buy');
}

/** Random condition record, skewed by a "how well kept" factor 0..1. */
export function randomCondition(s: GameState, care: number): Record<Component, number> {
  const out = {} as Record<Component, number>;
  for (const comp of COMPONENTS) {
    const v = 10 + care * 70 + randRange(s, -25, 25);
    out[comp] = Math.round(Math.max(5, Math.min(98, v)));
  }
  return out;
}

export function makeCar(s: GameState, model: CarModel, care: number): Car {
  return {
    id: nextId(s),
    modelId: model.id,
    color: pick(s, model.colors),
    cond: randomCondition(s, care),
    upgrades: [],
    invested: 0,
    loc: { kind: 'buyin' },
  };
}

function modelForArchetype(s: GameState, a: Archetype): CarModel {
  const fits = MODELS.filter((m) => a.classes.includes(m.cls));
  const pool = fits.length ? fits : MODELS;
  // cheaper cars show up more often
  return pickWeighted(s, pool, (m) => 1 / Math.sqrt(m.basePrice));
}

function chooseIntent(s: GameState): Intent | null {
  if (!buyinBusy(s) && s.minute < SERVICE_LAST_MINUTE && chance(s, 0.2)) return 'service';
  const canSell = !buyinBusy(s) && freeSlot(s) !== null;
  const canBuy = freeWaitSpot(s) !== null;
  if (!canSell && !canBuy) return null;
  if (!canSell) return 'buy';
  if (!canBuy) return 'sell';
  const stock = lotCars(s).length;
  // few cars on the lot: more sellers, so the player can restock
  const pSell = stock <= 1 ? 0.6 : stock <= 3 ? 0.4 : 0.3;
  return chance(s, pSell) ? 'sell' : 'buy';
}

/** About half the buyers want a specific extra that matches their taste; unlocked extras are wished for more often. */
function chooseWish(s: GameState, a: Archetype): string | null {
  const fits = UPGRADES.filter((u) => u.tags.some((t) => a.likes.includes(t)));
  if (!fits.length || !chance(s, 0.5)) return null;
  return pickWeighted(s, fits, (u) => (u.tech === null || hasTech(s, u.tech) ? 3 : 1)).id;
}

export function spawnCustomer(s: GameState, forceIntent?: Intent): Customer | null {
  const intent = forceIntent ?? chooseIntent(s);
  if (!intent) return null;
  if (intent !== 'buy' && buyinBusy(s)) return null;
  const spot = intent === 'buy' ? freeWaitSpot(s) : -1;
  if (spot === null) return null;

  const a = pickWeighted(s, ARCHETYPES, (x) => (intent === 'buy' ? x.buyWeight : intent === 'sell' ? x.sellWeight : x.buyWeight + x.sellWeight));
  const rich = hasTech(s, 'tvspot') ? 1.25 : 1;
  const [bmin, bmax] = a.budget;
  // skew towards the low end of the budget range
  const budget = Math.round((bmin + (bmax - bmin) * Math.pow(rand(s), 1.6)) * rich / 100) * 100;

  const c: Customer = {
    id: nextId(s),
    archetypeId: a.id,
    name: pick(s, a.names),
    intent,
    lookSeed: randInt(s, 0, 1 << 30),
    budget,
    carId: null,
    sellFactor: randRange(s, 0.58, 0.85),
    waitLeft: randRange(s, 130, 200) + (buildingLevel(s, 'kaffeebar') > 0 ? 60 : 0),
    spot,
    served: false,
    wish: intent === 'buy' ? chooseWish(s, a) : null,
  };
  if (intent === 'sell') {
    const car = makeCar(s, modelForArchetype(s, a), rand(s));
    s.cars.push(car);
    c.carId = car.id;
    emit(s, { type: 'carAdded', carId: car.id });
  }
  if (intent === 'service') {
    const car = makeCar(s, modelForArchetype(s, a), randRange(s, 0.3, 0.9));
    car.ownerId = c.id;
    s.cars.push(car);
    c.carId = car.id;
    c.service = makeServiceOrder(s, car, a);
    emit(s, { type: 'carAdded', carId: car.id });
  }
  s.customers.push(c);
  emit(s, { type: 'customerArrived', customerId: c.id });
  return c;
}

export function removeCustomer(s: GameState, id: number, reason: 'impatient' | 'done' | 'closing'): void {
  const c = s.customers.find((x) => x.id === id);
  if (!c) return;
  s.customers = s.customers.filter((x) => x.id !== id);
  if (reason === 'impatient') {
    if (c.service?.accepted) {
      addRep(s, -6);
      emit(s, { type: 'toast', text: `${c.name} ist ohne fertiges Auto abgerauscht. Das spricht sich rum!` });
    } else if (!c.served && !c.rejected?.length) addRep(s, -0.25);
  }
  // a seller who leaves without a deal drives their car away; a service customer always takes their car
  if (c.carId != null) {
    const car = s.cars.find((x) => x.id === c.carId);
    if (car && (car.loc.kind === 'buyin' || car.ownerId === c.id)) {
      s.cars = s.cars.filter((x) => x.id !== car.id);
      if (s.lift.carId === car.id) s.lift = { carId: null, job: null };
      emit(s, { type: 'carRemoved', carId: car.id });
    }
  }
  emit(s, { type: 'customerLeft', customerId: id, name: c.name, reason });
}

export type Fit = 'good' | 'meh' | 'bad';

/** How well a car matches a buyer's taste. */
export function carFit(c: Customer, car: Car): { fit: Fit; score: number; liked: number } {
  const a = archetypeOf(c);
  const model = MODELS.find((m) => m.id === car.modelId)!;
  const idx = a.classes.indexOf(model.cls);
  let score = idx === 0 ? 1.1 : idx > 0 ? 1 : 0.3;
  const liked = carTags(car).filter((t) => a.likes.includes(t)).length;
  score += 0.25 * liked;
  if (wishMet(c, car)) score += 0.3;
  const fit: Fit = score >= 1 ? 'good' : score >= 0.5 ? 'meh' : 'bad';
  return { fit, score, liked };
}

/** true / false if the buyer has a wish and the car does / does not fulfil it; null without a wish. */
export function wishMet(c: Customer, car: Car): boolean | null {
  if (!c.wish) return null;
  return car.upgrades.includes(c.wish);
}

/** Price factor from the buyer's wish: a fulfilled wish is worth a lot, a missing one a little. */
export function wishFactor(c: Customer, car: Car): number {
  const met = wishMet(c, car);
  return met === null ? 1 : met ? 1.15 : 0.95;
}

/** Highest price a buyer would pay for this car, before mood. */
export function buyerLimit(s: GameState, c: Customer, car: Car, fudge: number): number {
  const a = archetypeOf(c);
  const { score, liked } = carFit(c, car);
  const showroom = showroomBonus(s);
  const want = marketValue(car) * a.valuation * fudge * Math.min(1.2, 0.7 + 0.3 * score) * (1 + 0.1 * liked) * wishFactor(c, car) * showroom;
  return Math.round(Math.min(want, c.budget));
}

/** Lowest price a seller accepts for their car, before mood. */
export function sellerLimit(c: Customer, car: Car): number {
  return Math.round(marketValue(car) * c.sellFactor);
}
