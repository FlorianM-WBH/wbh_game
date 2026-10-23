// Values, costs and the modifiers that tech and buildings apply to them.
import { MODEL_BY_ID } from '../content/models';
import { COMPONENTS, COMPONENT_WEIGHT, REPAIR, UPGRADE_BY_ID, type Component, type Tag } from '../content/workshop';
import { repRateFactor } from './reputation';
import { buildingLevel, hasTech, type Car, type GameState } from './state';

export const LOT_CAPACITY = [4, 6, 8, 10];
export const MAX_SLOTS = LOT_CAPACITY[LOT_CAPACITY.length - 1];

/** Weighted overall condition, 0..100. */
export function overallCondition(car: Car): number {
  return COMPONENTS.reduce((s, c) => s + car.cond[c] * COMPONENT_WEIGHT[c], 0);
}

export function upgradeValue(car: Car): number {
  const base = MODEL_BY_ID[car.modelId].basePrice;
  return car.upgrades.reduce((s, id) => {
    const u = UPGRADE_BY_ID[id];
    return s + base * u.valuePct + u.valueFlat;
  }, 0);
}

/** Fair market value of a car in its current state. */
export function marketValue(car: Car): number {
  const base = MODEL_BY_ID[car.modelId].basePrice;
  return base * (0.3 + 0.7 * (overallCondition(car) / 100)) + upgradeValue(car);
}

export function carTags(car: Car): Tag[] {
  const tags = new Set<Tag>();
  for (const id of car.upgrades) for (const t of UPGRADE_BY_ID[id].tags) tags.add(t);
  return [...tags];
}

export function lotCapacity(s: GameState): number {
  return LOT_CAPACITY[Math.min(buildingLevel(s, 'parkplatz'), LOT_CAPACITY.length - 1)];
}

export function lotCars(s: GameState): Car[] {
  return s.cars.filter((c) => c.loc.kind === 'lot');
}

export function freeSlot(s: GameState): number | null {
  const used = new Set(lotCars(s).map((c) => (c.loc.kind === 'lot' ? c.loc.slot : -1)));
  for (let i = 0; i < lotCapacity(s); i++) if (!used.has(i)) return i;
  return null;
}

/** Multiplier on work time (lower = faster). */
export function workSpeedFactor(s: GameState): number {
  let f = 1;
  if (hasTech(s, 'druckluft')) f *= 0.7;
  if (hasTech(s, 'hebebuehne2')) f *= 0.7;
  f *= [1, 0.75, 0.5][buildingLevel(s, 'werkstatt')] ?? 1;
  return f;
}

export function partsCostFactor(s: GameState): number {
  return hasTech(s, 'teilehandel') ? 0.75 : 1;
}

export function repairQuote(s: GameState, car: Car, comp: Component): { cost: number; minutes: number } {
  const missing = 100 - car.cond[comp];
  const r = REPAIR[comp];
  const base = MODEL_BY_ID[car.modelId].basePrice;
  const cost = Math.round((r.flatCost + missing * r.costPerPoint * base) * partsCostFactor(s));
  const minutes = Math.max(15, Math.round(missing * r.minPerPoint * workSpeedFactor(s)));
  return { cost, minutes };
}

export function upgradeQuote(s: GameState, upgradeId: string): { cost: number; minutes: number } {
  const u = UPGRADE_BY_ID[upgradeId];
  return {
    cost: Math.round(u.cost * partsCostFactor(s)),
    minutes: Math.max(15, Math.round(u.minutes * workSpeedFactor(s))),
  };
}

/** Customers per hour multiplier. */
export function customerRate(s: GameState): number {
  let r = 1;
  if (hasTech(s, 'radio')) r += 0.3;
  if (hasTech(s, 'tvspot')) r += 0.4;
  if (buildingLevel(s, 'neonschild') > 0) r += 0.25;
  return r * repRateFactor(s);
}

/** Multiplier on what buyers are willing to pay. */
export function showroomBonus(s: GameState): number {
  return [1, 1.06, 1.12][buildingLevel(s, 'showroom')] ?? 1;
}

/** Daily fixed costs: rent plus upkeep that grows with the business. */
export function dailyRent(s: GameState): number {
  const levels = Object.values(s.buildings).reduce((a, b) => a + b, 0);
  return 250 + 60 * levels;
}
