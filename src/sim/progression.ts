// Buying tech and building upgrades, and tracking overall completion.
import { BUILDINGS, BUILDING_BY_ID, TECHS, TECH_BY_ID } from '../content/progression';
import { buildingLevel, emit, hasTech, type GameState } from './state';
import type { ActionResult } from './workshop';

export function techState(s: GameState, id: string): 'owned' | 'available' | 'locked' {
  if (hasTech(s, id)) return 'owned';
  return TECH_BY_ID[id].requires.every((r) => hasTech(s, r)) ? 'available' : 'locked';
}

export function buyTech(s: GameState, id: string): ActionResult {
  const t = TECH_BY_ID[id];
  if (!t) return { ok: false, reason: 'Unbekannt.' };
  const st = techState(s, id);
  if (st === 'owned') return { ok: false, reason: 'Schon freigeschaltet.' };
  if (st === 'locked') return { ok: false, reason: 'Erst die Voraussetzungen freischalten.' };
  if (s.money < t.cost) return { ok: false, reason: 'Nicht genug Geld.' };
  s.money -= t.cost;
  s.ledger.expenses += t.cost;
  s.techs.push(id);
  emit(s, { type: 'toast', text: `Freigeschaltet: ${t.name}` });
  return { ok: true };
}

export function nextBuildingCost(s: GameState, id: string): number | null {
  const b = BUILDING_BY_ID[id];
  const lvl = buildingLevel(s, id);
  return lvl < b.costs.length ? b.costs[lvl] : null;
}

export function buyBuilding(s: GameState, id: string): ActionResult {
  const b = BUILDING_BY_ID[id];
  if (!b) return { ok: false, reason: 'Unbekannt.' };
  const cost = nextBuildingCost(s, id);
  if (cost === null) return { ok: false, reason: 'Schon voll ausgebaut.' };
  if (s.money < cost) return { ok: false, reason: 'Nicht genug Geld.' };
  s.money -= cost;
  s.ledger.expenses += cost;
  s.buildings[id] = buildingLevel(s, id) + 1;
  emit(s, { type: 'toast', text: `Ausgebaut: ${b.name} – ${b.desc[s.buildings[id]]}` });
  return { ok: true };
}

/** 0..1: share of all tech and building levels owned. */
export function completion(s: GameState): number {
  const total = TECHS.length + BUILDINGS.reduce((a, b) => a + b.costs.length, 0);
  const have = s.techs.length + BUILDINGS.reduce((a, b) => a + Math.min(buildingLevel(s, b.id), b.costs.length), 0);
  return have / total;
}
