// The workshop lift: put a car on it, run repair and upgrade jobs, take it back down.
import { UPGRADE_BY_ID, UPGRADES, type Component, COMPONENT_LABEL } from '../content/workshop';
import { MODEL_BY_ID } from '../content/models';
import { freeSlot, repairQuote, upgradeQuote } from './economy';
import { carById, emit, hasTech, type GameState, type Job } from './state';
import { pick } from './rng';

export const PASTELS = ['#ff9ad0', '#7af0e0', '#c8a0ff', '#fff08a', '#9ad8ff'];

export type ActionResult = { ok: true } | { ok: false; reason: string };

export function liftCar(s: GameState) {
  return carById(s, s.lift.carId);
}

export function putOnLift(s: GameState, carId: number): ActionResult {
  const car = carById(s, carId);
  if (!car || car.loc.kind !== 'lot') return { ok: false, reason: 'Wagen steht nicht auf dem Hof.' };
  if (s.lift.carId != null) return { ok: false, reason: 'Die Hebebühne ist schon belegt.' };
  car.loc = { kind: 'lift' };
  s.lift.carId = car.id;
  emit(s, { type: 'carMoved', carId: car.id });
  return { ok: true };
}

export function takeOffLift(s: GameState): ActionResult {
  const car = liftCar(s);
  if (!car) return { ok: false, reason: 'Die Hebebühne ist leer.' };
  if (s.lift.job) return { ok: false, reason: 'Erst die laufende Arbeit abschließen.' };
  const slot = freeSlot(s);
  if (slot === null) return { ok: false, reason: 'Kein freier Stellplatz auf dem Hof.' };
  car.loc = { kind: 'lot', slot };
  s.lift.carId = null;
  emit(s, { type: 'carMoved', carId: car.id });
  return { ok: true };
}

export function availableUpgrades(s: GameState) {
  const car = liftCar(s);
  return UPGRADES.filter((u) => (u.tech === null || hasTech(s, u.tech)) && !(car && car.upgrades.includes(u.id)));
}

function startJob(s: GameState, job: Job, cost: number): ActionResult {
  if (s.lift.job) return { ok: false, reason: 'Es läuft schon eine Arbeit.' };
  if (s.money < cost) return { ok: false, reason: 'Nicht genug Geld für die Teile.' };
  const car = liftCar(s)!;
  s.money -= cost;
  s.ledger.expenses += cost;
  car.invested += cost;
  s.lift.job = job;
  return { ok: true };
}

export function startRepair(s: GameState, comp: Component): ActionResult {
  const car = liftCar(s);
  if (!car) return { ok: false, reason: 'Kein Wagen auf der Hebebühne.' };
  if (car.cond[comp] >= 100) return { ok: false, reason: 'Ist schon top in Schuss.' };
  const q = repairQuote(s, car, comp);
  return startJob(s, { kind: 'repair', target: comp, minutesLeft: q.minutes, total: q.minutes }, q.cost);
}

export function startUpgrade(s: GameState, upgradeId: string): ActionResult {
  const car = liftCar(s);
  const u = UPGRADE_BY_ID[upgradeId];
  if (!car || !u) return { ok: false, reason: 'Kein Wagen auf der Hebebühne.' };
  if (u.tech && !hasTech(s, u.tech)) return { ok: false, reason: 'Noch nicht freigeschaltet.' };
  if (car.upgrades.includes(u.id)) return { ok: false, reason: 'Schon eingebaut.' };
  const q = upgradeQuote(s, upgradeId);
  return startJob(s, { kind: 'upgrade', target: upgradeId, minutesLeft: q.minutes, total: q.minutes }, q.cost);
}

/** Advance the lift job. `boost` > 1 when the player lends a hand. */
export function tickLift(s: GameState, minutes: number, boost = 1): void {
  const job = s.lift.job;
  const car = liftCar(s);
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
  s.lift.job = null;
  emit(s, { type: 'jobDone', carId: car.id, job });
}
