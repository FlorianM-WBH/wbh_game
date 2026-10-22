// New game, the clock, end of day, saving.
import { MODEL_BY_ID } from '../content/models';
import { makeCar, removeCustomer, spawnCustomer } from './customers';
import { customerRate, dailyRent } from './economy';
import { randRange } from './rng';
import { DAY_END, DAY_START, SAVE_VERSION, emit, type GameState } from './state';
import { tickLift } from './workshop';

export function newGame(seed = Date.now()): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    day: 1,
    minute: DAY_START,
    money: 8000,
    cars: [],
    customers: [],
    lift: { carId: null, job: null },
    techs: [],
    buildings: {},
    stats: { carsSold: 0, carsBought: 0, revenue: 0, profit: 0, bestDeal: 0, repairsDone: 0, upgradesDone: 0 },
    ledger: { income: 0, expenses: 0, sold: 0, bought: 0 },
    spawnIn: 8,
    nextId: 1,
    rng: seed | 0,
    negotiation: null,
    events: [],
  };
  // starting stock: one tired hatchback and one cardboard joke
  const golfo = makeCar(s, MODEL_BY_ID.golfo, 0.55);
  golfo.loc = { kind: 'lot', slot: 0 };
  golfo.invested = 3200;
  const trabbo = makeCar(s, MODEL_BY_ID.trabbo, 0.4);
  trabbo.loc = { kind: 'lot', slot: 1 };
  trabbo.invested = 450;
  s.cars.push(golfo, trabbo);
  return s;
}

/** Mean minutes between customers. */
function spawnInterval(s: GameState): number {
  return 50 / customerRate(s);
}

export interface TickOptions {
  /** player is helping at the lift */
  workBoost?: number;
}

/** Advance the world by `minutes` of game time. Time does not pass during negotiations. */
export function tick(s: GameState, minutes: number, opts: TickOptions = {}): void {
  if (s.negotiation) return;
  s.minute += minutes;
  tickLift(s, minutes, opts.workBoost ?? 1);

  for (const c of [...s.customers]) {
    c.waitLeft -= minutes;
    if (c.waitLeft <= 0) removeCustomer(s, c.id, 'impatient');
  }

  // no new customers in the last hour
  if (s.minute < DAY_END - 60) {
    s.spawnIn -= minutes;
    if (s.spawnIn <= 0) {
      spawnCustomer(s);
      s.spawnIn = spawnInterval(s) * randRange(s, 0.5, 1.5);
    }
  }

  if (s.minute >= DAY_END) endDay(s);
}

export function endDay(s: GameState): void {
  for (const c of [...s.customers]) removeCustomer(s, c.id, 'closing');
  const rent = dailyRent(s);
  s.money -= rent;
  s.ledger.expenses += rent;
  emit(s, { type: 'dayEnded', day: s.day, ledger: { ...s.ledger }, rent });
  s.day++;
  s.minute = DAY_START;
  s.ledger = { income: 0, expenses: 0, sold: 0, bought: 0 };
  s.spawnIn = 5;
}

export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, events: [], negotiation: null });
}

export function deserialize(json: string): GameState | null {
  try {
    const s = JSON.parse(json) as GameState;
    if (s.version !== SAVE_VERSION) return null;
    s.events = [];
    s.negotiation = null;
    return s;
  } catch {
    return null;
  }
}
