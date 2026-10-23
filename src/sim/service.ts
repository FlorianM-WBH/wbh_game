// Service customers: they bring their own car, pay a fixed fee for one job on the lift, and want it back in time.
import { MODEL_BY_ID } from '../content/models';
import { SERVICE_DONE, SERVICE_HAGGLE_KEEP, SERVICE_HAGGLE_LEAVE, SERVICE_HAGGLE_WIN, SERVICE_OFFER, SERVICE_REPAIR_ASK, SERVICE_UPGRADE_ASK } from '../content/service';
import { COMPONENTS, REPAIR, UPGRADES, UPGRADE_BY_ID, type Component } from '../content/workshop';
import type { Archetype } from '../content/archetypes';
import { archetypeOf, removeCustomer } from './customers';
import { chance, pick, randRange } from './rng';
import { carById, customerById, DAY_END, emit, formatMoney, formatTime, hasTech, type Car, type Customer, type GameState, type ServiceOrder } from './state';
import type { ActionResult } from './workshop';
import { addRep } from './reputation';

/** No new service customers this close to closing time. */
export const SERVICE_LAST_MINUTE = DAY_END - 240;

function round10(n: number): number {
  return Math.max(10, Math.round(n / 10) * 10);
}

/** Parts cost and work minutes of a job without tech/building discounts (the customer pays list price). */
function listQuote(car: Car, kind: ServiceOrder['kind'], target: string): { cost: number; minutes: number } {
  if (kind === 'repair') {
    const r = REPAIR[target as Component];
    const missing = 100 - car.cond[target as Component];
    return { cost: r.flatCost + missing * r.costPerPoint * MODEL_BY_ID[car.modelId].basePrice, minutes: Math.max(15, missing * r.minPerPoint) };
  }
  const u = UPGRADE_BY_ID[target];
  return { cost: u.cost, minutes: u.minutes };
}

function fill(t: string, vars: Record<string, string>): string {
  for (const [k, v] of Object.entries(vars)) t = t.split(`{${k}}`).join(v);
  return t;
}

/** What a service customer wants: usually a repair of the worst part, sometimes an unlocked extra. */
export function makeServiceOrder(s: GameState, car: Car, a: Archetype): ServiceOrder {
  const unlocked = UPGRADES.filter((u) => (u.tech === null || hasTech(s, u.tech)) && !car.upgrades.includes(u.id));
  let kind: ServiceOrder['kind'] = 'repair';
  let target: string;
  if (unlocked.length && chance(s, 0.35)) {
    kind = 'upgrade';
    const liked = unlocked.filter((u) => u.tags.some((t) => a.likes.includes(t)));
    target = pick(s, liked.length ? liked : unlocked).id;
  } else {
    // make sure the part is actually broken
    const comp = pick(s, COMPONENTS);
    car.cond[comp] = Math.min(car.cond[comp], Math.round(randRange(s, 15, 55)));
    target = comp;
  }
  const q = listQuote(car, kind, target);
  const fee = round10((q.cost * 1.4 + q.minutes * 5) * Math.max(0.9, a.valuation));
  const model = MODEL_BY_ID[car.modelId].name;
  const ask =
    kind === 'repair'
      ? fill(pick(s, SERVICE_REPAIR_ASK[target as Component]), { car: model })
      : fill(pick(s, SERVICE_UPGRADE_ASK), { car: model, job: UPGRADE_BY_ID[target].name });
  return { kind, target, fee, accepted: false, haggled: false, due: 0, ask };
}

export function serviceJobLabel(o: ServiceOrder): string {
  return o.kind === 'repair' ? `${{ motor: 'Motor', karosserie: 'Karosserie', innenraum: 'Innenraum', reifen: 'Reifen' }[o.target as Component]} reparieren` : `${UPGRADE_BY_ID[o.target].name} einbauen`;
}

/** The deadline the customer would set if the player accepted now. */
export function proposedDue(s: GameState, c: Customer): number {
  const car = carById(s, c.carId)!;
  const o = c.service!;
  const q = listQuote(car, o.kind, o.target);
  return Math.min(DAY_END - 10, Math.round((s.minute + q.minutes * 1.8 + 70) / 10) * 10);
}

export function offerLine(s: GameState, c: Customer): string {
  return fill(SERVICE_OFFER[c.lookSeed % SERVICE_OFFER.length], { time: formatTime(proposedDue(s, c)), fee: formatMoney(c.service!.fee) });
}

export function acceptService(s: GameState, customerId: number): ActionResult {
  const c = customerById(s, customerId);
  if (!c?.service || c.service.accepted) return { ok: false, reason: 'Kein offener Auftrag.' };
  c.service.accepted = true;
  c.service.due = proposedDue(s, c);
  c.waitLeft = c.service.due - s.minute;
  c.served = true;
  return { ok: true };
}

/** Ask for more money, once. Returns the customer's reply; they may leave. */
export function haggleService(s: GameState, customerId: number): { line: string; left: boolean } {
  const c = customerById(s, customerId)!;
  const o = c.service!;
  const a = archetypeOf(c);
  o.haggled = true;
  if (chance(s, 0.35 + a.charmable * 0.4)) {
    o.fee = round10(o.fee * 1.25);
    return { line: pick(s, SERVICE_HAGGLE_WIN), left: false };
  }
  if (chance(s, 0.35)) {
    const line = pick(s, SERVICE_HAGGLE_LEAVE);
    addRep(s, -1);
    removeCustomer(s, c.id, 'done');
    return { line, left: true };
  }
  return { line: pick(s, SERVICE_HAGGLE_KEEP), left: false };
}

export function declineService(s: GameState, customerId: number): void {
  removeCustomer(s, customerId, 'done');
}

export function ownerOf(s: GameState, car: Car | undefined): Customer | undefined {
  return car?.ownerId != null ? customerById(s, car.ownerId) : undefined;
}

/** Is the ordered job finished on this car? */
export function serviceFinished(car: Car, o: ServiceOrder): boolean {
  return o.kind === 'repair' ? car.cond[o.target as Component] >= 100 : car.upgrades.includes(o.target);
}

/** Hand the finished car back: the customer pays the fee (plus a tip if early) and drives off. */
export function completeService(s: GameState): ActionResult & { text?: string } {
  const car = carById(s, s.lift.carId);
  const c = ownerOf(s, car);
  if (!car || !c?.service) return { ok: false, reason: 'Das ist kein Kundenauftrag.' };
  if (s.lift.job) return { ok: false, reason: 'Erst die laufende Arbeit abschließen.' };
  if (!serviceFinished(car, c.service)) return { ok: false, reason: 'Der Auftrag ist noch nicht erledigt.' };
  const early = (c.service.due - s.minute) / 60; // hours to spare
  const tip = early >= 1 ? round10(c.service.fee * Math.min(0.25, 0.08 * early)) : 0;
  const pay = c.service.fee + tip;
  s.money += pay;
  s.ledger.income += pay;
  s.stats.servicesDone = (s.stats.servicesDone ?? 0) + 1;
  addRep(s, tip ? 4 : 3);
  const text = pick(s, SERVICE_DONE);
  emit(s, { type: 'toast', text: `Auftrag erledigt: +${formatMoney(c.service.fee)}${tip ? ` und ${formatMoney(tip)} Trinkgeld` : ''}` });
  removeCustomer(s, c.id, 'done');
  return { ok: true, text };
}
