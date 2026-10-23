// Core game state. Pure data, JSON-serialisable; no Phaser imports anywhere in sim/.
import type { Component } from '../content/workshop';
import type { Negotiation } from './negotiation';

export const SAVE_VERSION = 1;
export const DAY_START = 8 * 60;
export const DAY_END = 20 * 60;

export type CarLocation = { kind: 'lot'; slot: number } | { kind: 'lift' } | { kind: 'buyin' };

export interface Car {
  id: number;
  modelId: string;
  color: string;
  cond: Record<Component, number>;
  upgrades: string[];
  /** total money the dealer put into this car (purchase + parts) */
  invested: number;
  loc: CarLocation;
  /** set for a service customer's own car (never sold, never on the lot) */
  ownerId?: number;
}

export type Intent = 'buy' | 'sell' | 'service';

export interface Customer {
  id: number;
  archetypeId: string;
  name: string;
  intent: Intent;
  lookSeed: number;
  budget: number;
  /** for sellers: the car they brought (lives in state.cars with loc buyin) */
  carId: number | null;
  /** seller's private minimum, as a fraction of market value */
  sellFactor: number;
  /** minutes left before they give up waiting */
  waitLeft: number;
  /** index of the waiting spot (scene maps it to coordinates); -1 for the buy-in spot */
  spot: number;
  /** set once they have been talked to (no second chance after a failed deal) */
  served: boolean;
  /** buyers only: an upgrade id they hope the car has (optional for old saves) */
  wish?: string | null;
  /** service customers only: the job they want done on their own car */
  service?: ServiceOrder;
}

export interface ServiceOrder {
  kind: 'repair' | 'upgrade';
  target: string; // component or upgrade id
  fee: number;
  accepted: boolean;
  haggled: boolean;
  /** the game minute by which the car must be done (set on acceptance) */
  due: number;
  /** text of the request, picked once so it stays stable */
  ask: string;
}

export interface Job {
  kind: 'repair' | 'upgrade';
  target: string; // component or upgrade id
  minutesLeft: number;
  total: number;
}

export interface Ledger {
  income: number;
  expenses: number;
  sold: number;
  bought: number;
}

export type SimEvent =
  | { type: 'customerArrived'; customerId: number }
  | { type: 'customerLeft'; customerId: number; name: string; reason: 'impatient' | 'done' | 'closing' }
  | { type: 'jobDone'; carId: number; job: Job }
  | { type: 'carAdded'; carId: number }
  | { type: 'carRemoved'; carId: number }
  | { type: 'carMoved'; carId: number }
  | { type: 'dayEnded'; day: number; ledger: Ledger; rent: number }
  | { type: 'toast'; text: string };

export interface Stats {
  carsSold: number;
  carsBought: number;
  revenue: number;
  profit: number;
  bestDeal: number;
  repairsDone: number;
  upgradesDone: number;
  servicesDone?: number;
}

export interface GameState {
  version: number;
  day: number;
  minute: number;
  money: number;
  cars: Car[];
  customers: Customer[];
  lift: { carId: number | null; job: Job | null };
  techs: string[];
  buildings: Record<string, number>;
  stats: Stats;
  ledger: Ledger;
  spawnIn: number;
  nextId: number;
  rng: number;
  negotiation: Negotiation | null;
  events: SimEvent[];
  /** bitmask of finished first-steps tips (see src/tutorial.ts); optional for old saves */
  tips?: number;
}

export function nextId(s: GameState): number {
  return s.nextId++;
}

export function emit(s: GameState, e: SimEvent): void {
  s.events.push(e);
}

export function drainEvents(s: GameState): SimEvent[] {
  const e = s.events;
  s.events = [];
  return e;
}

export function carById(s: GameState, id: number | null | undefined): Car | undefined {
  return id == null ? undefined : s.cars.find((c) => c.id === id);
}

export function customerById(s: GameState, id: number | null | undefined): Customer | undefined {
  return id == null ? undefined : s.customers.find((c) => c.id === id);
}

export function hasTech(s: GameState, id: string): boolean {
  return s.techs.includes(id);
}

export function buildingLevel(s: GameState, id: string): number {
  return s.buildings[id] ?? 0;
}

export function formatTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = Math.floor(minute % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}
