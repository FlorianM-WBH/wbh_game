// The workshop lift: put a car on it, run repair and upgrade jobs, take it back down.
import { UPGRADE_BY_ID, UPGRADES, type Component, COMPONENT_LABEL } from '../content/workshop';
import { MODEL_BY_ID } from '../content/models';
import { freeSlot, repairQuote, upgradeQuote } from './economy';
import { buildingLevel, carById, emit, hasTech, type GameState, type Job, type Lift } from './state';
import { pick } from './rng';

export const PASTELS = ['#ff9ad0', '#7af0e0', '#c8a0ff', '#fff08a', '#9ad8ff'];

export type ActionResult = { ok: true } | { ok: false; reason: string };

/** Number of usable lift bays (the second one comes with the first workshop upgrade). */
export function liftCount(s: GameState): number {
  return buildingLevel(s, 'werkstatt') >= 1 ? 2 : 1;
}

export function liftAt(s: GameState, bay = 0): Lift {
  if (bay === 0) return s.lift;
  return (s.lift2 ??= { carId: null, job: null });
}

export function bays(s: GameState): number[] {
  return liftCount(s) > 1 ? [0, 1] : [0];
}

/** First empty bay, or null when all lifts are taken. */
export function freeBay(s: GameState): number | null {
  return bays(s).find((b) => liftAt(s, b).carId == null) ?? null;
}

export function bayOf(s: GameState, carId: number): number | null {
  return bays(s).find((b) => liftAt(s, b).carId === carId) ?? (s.lift2?.carId === carId ? 1 : null);
}

/** Clear whichever lift holds this car (it left the dealership). */
export function clearLiftFor(s: GameState, carId: number): void {
  if (s.lift.carId === carId) s.lift = { carId: null, job: null };
  if (s.lift2?.carId === carId) s.lift2 = { carId: null, job: null };
}

export function liftCar(s: GameState, bay = 0) {
  return carById(s, liftAt(s, bay).carId);
}

/** Put a car on a lift; without a bay the first free one is used. */
export function putOnLift(s: GameState, carId: number, bay?: number): ActionResult {
  const car = carById(s, carId);
  const serviceCar = car?.ownerId != null && !!s.customers.find((c) => c.id === car.ownerId)?.service?.accepted;
  if (!car || (car.loc.kind !== 'lot' && !serviceCar)) return { ok: false, reason: 'Wagen steht nicht auf dem Hof.' };
  const b = bay ?? freeBay(s);
  if (b == null || liftAt(s, b).carId != null) return { ok: false, reason: 'Die Hebebühne ist schon belegt.' };
  car.loc = { kind: 'lift', bay: b };
  liftAt(s, b).carId = car.id;
  emit(s, { type: 'carMoved', carId: car.id });
  return { ok: true };
}

export function takeOffLift(s: GameState, bay = 0): ActionResult {
  const lift = liftAt(s, bay);
  const car = liftCar(s, bay);
  if (!car) return { ok: false, reason: 'Die Hebebühne ist leer.' };
  if (lift.job) return { ok: false, reason: 'Erst die laufende Arbeit abschließen.' };
  if (car.ownerId != null) {
    // a customer's car goes back to the buy-in zone where its owner waits
    car.loc = { kind: 'buyin' };
    lift.carId = null;
    emit(s, { type: 'carMoved', carId: car.id });
    return { ok: true };
  }
  const slot = freeSlot(s);
  if (slot === null) return { ok: false, reason: 'Kein freier Stellplatz auf dem Hof.' };
  car.loc = { kind: 'lot', slot };
  lift.carId = null;
  emit(s, { type: 'carMoved', carId: car.id });
  return { ok: true };
}

export function availableUpgrades(s: GameState, bay = 0) {
  const car = liftCar(s, bay);
  return UPGRADES.filter((u) => (u.tech === null || hasTech(s, u.tech)) && !(car && car.upgrades.includes(u.id)));
}

function startJob(s: GameState, job: Job, cost: number, bay: number): ActionResult {
  const lift = liftAt(s, bay);
  if (lift.job) return { ok: false, reason: 'Es läuft schon eine Arbeit.' };
  if (s.money < cost) return { ok: false, reason: 'Nicht genug Geld für die Teile.' };
  const car = liftCar(s, bay)!;
  s.money -= cost;
  s.ledger.expenses += cost;
  car.invested += cost;
  lift.job = job;
  return { ok: true };
}

export function startRepair(s: GameState, comp: Component, bay = 0): ActionResult {
  const car = liftCar(s, bay);
  if (!car) return { ok: false, reason: 'Kein Wagen auf der Hebebühne.' };
  if (car.cond[comp] >= 100) return { ok: false, reason: 'Ist schon top in Schuss.' };
  const q = repairQuote(s, car, comp);
  return startJob(s, { kind: 'repair', target: comp, minutesLeft: q.minutes, total: q.minutes }, q.cost, bay);
}

export function startUpgrade(s: GameState, upgradeId: string, bay = 0): ActionResult {
  const car = liftCar(s, bay);
  const u = UPGRADE_BY_ID[upgradeId];
  if (!car || !u) return { ok: false, reason: 'Kein Wagen auf der Hebebühne.' };
  if (u.tech && !hasTech(s, u.tech)) return { ok: false, reason: 'Noch nicht freigeschaltet.' };
  if (car.upgrades.includes(u.id)) return { ok: false, reason: 'Schon eingebaut.' };
  const q = upgradeQuote(s, upgradeId);
  return startJob(s, { kind: 'upgrade', target: upgradeId, minutesLeft: q.minutes, total: q.minutes }, q.cost, bay);
}

/** Advance the jobs on all lifts. `boost` > 1 on the bay where the player lends a hand. */
export function tickLift(s: GameState, minutes: number, boost = 1, boostBay = 0): void {
  for (const bay of bays(s)) tickBay(s, bay, minutes, bay === boostBay ? boost : 1);
}

function tickBay(s: GameState, bay: number, minutes: number, boost: number): void {
  const lift = liftAt(s, bay);
  const job = lift.job;
  const car = liftCar(s, bay);
  if (!job || !car) return;
  job.minutesLeft -= minutes * boost;
  if (job.minutesLeft > 0) return;
  if (job.kind === 'repair') {
    car.cond[job.target as Component] = 100;
    s.stats.repairsDone++;
    emit(s, { type: 'toast', text: `${COMPONENT_LABEL[job.target as Component]} repariert: ${MODEL_BY_ID[car.modelId].name}` });
  } else {
    car.upgrades.push(job.target);
    if (job.target === 'pastell') car.color = pick(s, PASTELS);
    s.stats.upgradesDone++;
    emit(s, { type: 'toast', text: `${UPGRADE_BY_ID[job.target].name} eingebaut!` });
  }
  lift.job = null;
  emit(s, { type: 'jobDone', carId: car.id, job });
}
