// Haggling. 'sale' = dealer sells a lot car to a buyer; 'purchase' = dealer buys a seller's car.
import { MODEL_BY_ID } from '../content/models';
import { UPGRADE_BY_ID } from '../content/workshop';
import { LINES, type LineKey } from '../content/lines';
import { CONDITION_REMARKS, UPGRADE_REMARKS } from '../content/remarks';
import { REACTIONS, type ReactionKey } from '../content/reactions';
import { archetypeOf, buyerLimit, carFit, removeCustomer, sellerLimit, wishMet } from './customers';
import { freeSlot, overallCondition } from './economy';
import { chance, pick, randRange } from './rng';
import { addRep, repMoodBonus } from './reputation';
import { buildingLevel, carById, customerById, emit, formatMoney, hasTech, type Car, type GameState } from './state';

export type Tactic = 'charm' | 'hard' | 'story';

export const TACTIC_LABEL: Record<Tactic, string> = {
  charm: 'Charme spielen lassen',
  hard: 'Knallhart bleiben',
  story: 'Maßlos übertreiben',
};

export interface Negotiation {
  kind: 'sale' | 'purchase';
  customerId: number;
  carId: number;
  /** private limit: max the buyer pays / min the seller accepts (before mood) */
  limit: number;
  /** customer's current offer on the table */
  theirOffer: number;
  /** player's last offer, if any */
  lastOffer: number | null;
  patience: number;
  maxPatience: number;
  mood: number; // 0..100
  used: Tactic[];
  log: { who: 'player' | 'customer'; text: string }[];
  result: 'open' | 'deal' | 'walkout';
  dealPrice: number | null;
}

const BROKE = 'Ähm... so viel Kohle hast du doch gar nicht. Dein Scheck platzt ja jetzt schon.';

export interface NegotiationStep {
  line: string;
  result: Negotiation['result'];
}

function say(s: GameState, key: LineKey, vars: Record<string, string> = {}): string {
  let t = pick(s, LINES[key]);
  for (const [k, v] of Object.entries(vars)) t = t.split(`{${k}}`).join(v);
  return t;
}

/** Tactic reaction: archetype-specific line when there is one (most of the time), otherwise generic. */
function react(s: GameState, archetypeId: string, key: ReactionKey): string {
  const own = REACTIONS[archetypeId]?.[key];
  if (own?.length && chance(s, 0.7)) return pick(s, own);
  return say(s, key);
}

function round50(n: number): number {
  return Math.max(50, Math.round(n / 50) * 50);
}

/** Effective limit after mood: good mood moves the limit in the dealer's favour. */
export function effectiveLimit(n: Negotiation): number {
  const m = (n.mood - 50) / 50; // -1..1
  return n.kind === 'sale' ? n.limit * (1 + 0.08 * m) : n.limit * (1 - 0.08 * m);
}

export function baseMood(s: GameState): number {
  return 50 + (buildingLevel(s, 'deko') > 0 ? 10 : 0) + repMoodBonus(s);
}

/** Book the sale of a lot car: money, stats, reputation; the car drives off. */
export function recordSale(s: GameState, car: Car, price: number): number {
  const profit = price - car.invested;
  s.money += price;
  s.ledger.income += price;
  s.ledger.sold++;
  s.stats.carsSold++;
  s.stats.revenue += price;
  s.stats.profit += profit;
  s.stats.bestDeal = Math.max(s.stats.bestDeal, profit);
  s.cars = s.cars.filter((x) => x.id !== car.id);
  addRep(s, 1);
  emit(s, { type: 'carRemoved', carId: car.id });
  return profit;
}

function basePatience(s: GameState, archetypePatience: number): number {
  return archetypePatience + (buildingLevel(s, 'kaffeebar') > 0 ? 1 : 0);
}

/** Opening reaction of a buyer to a car, without starting a negotiation. */
export function pitchReaction(s: GameState, customerId: number, carId: number): { fit: ReturnType<typeof carFit>['fit']; line: string } {
  const c = customerById(s, customerId)!;
  const car = carById(s, carId)!;
  const { fit } = carFit(c, car);
  const name = MODEL_BY_ID[car.modelId].name;
  const key: LineKey = fit === 'good' ? 'carFits' : fit === 'meh' ? 'carMeh' : 'carBad';
  const parts = [say(s, key, { car: name })];
  if (fit === 'bad') return { fit, line: parts[0] };
  const met = wishMet(c, car);
  if (met !== null && c.wish) parts.push(pick(s, met ? UPGRADE_REMARKS[c.wish].have : UPGRADE_REMARKS[c.wish].missing));
  else {
    // no wish: maybe praise an extra that matches their taste
    const a = archetypeOf(c);
    const liked = car.upgrades.filter((u) => UPGRADE_BY_ID[u].tags.some((t) => a.likes.includes(t)));
    if (liked.length) parts.push(pick(s, UPGRADE_REMARKS[pick(s, liked)].praise));
  }
  const cond = overallCondition(car);
  const ck = cond < 35 ? 'wreck' : cond < 55 ? 'poor' : cond >= 92 ? 'mint' : null;
  if (ck) parts.push(pick(s, CONDITION_REMARKS[ck]).split('{car}').join(name));
  return { fit, line: parts.join(' ') };
}

export function startSale(s: GameState, customerId: number, carId: number): Negotiation | null {
  const c = customerById(s, customerId);
  const car = carById(s, carId);
  if (!c || !car || c.intent !== 'buy' || car.loc.kind !== 'lot') return null;
  const a = archetypeOf(c);
  const { fit } = carFit(c, car);
  if (fit === 'bad') return null;
  const limit = buyerLimit(s, c, car, randRange(s, 0.92, 1.1));
  const n: Negotiation = {
    kind: 'sale',
    customerId,
    carId,
    limit,
    theirOffer: round50(limit * randRange(s, 0.68, 0.82)),
    lastOffer: null,
    patience: basePatience(s, a.patience),
    maxPatience: basePatience(s, a.patience),
    mood: baseMood(s),
    used: [],
    log: [],
    result: 'open',
    dealPrice: null,
  };
  n.log.push({ who: 'customer', text: say(s, 'counterBuy', { price: formatMoney(n.theirOffer) }) });
  s.negotiation = n;
  c.served = true;
  return n;
}

export function startPurchase(s: GameState, customerId: number): Negotiation | null {
  const c = customerById(s, customerId);
  if (!c || c.intent !== 'sell' || c.carId == null || freeSlot(s) === null) return null;
  const car = carById(s, c.carId)!;
  const a = archetypeOf(c);
  const limit = sellerLimit(c, car);
  const n: Negotiation = {
    kind: 'purchase',
    customerId,
    carId: car.id,
    limit,
    theirOffer: round50(limit * randRange(s, 1.3, 1.6)),
    lastOffer: null,
    patience: basePatience(s, a.patience),
    maxPatience: basePatience(s, a.patience),
    mood: baseMood(s),
    used: [],
    log: [],
    result: 'open',
    dealPrice: null,
  };
  n.log.push({ who: 'customer', text: say(s, 'counterSell', { price: formatMoney(n.theirOffer) }) });
  s.negotiation = n;
  c.served = true;
  return n;
}

function finish(s: GameState, n: Negotiation, result: 'deal' | 'walkout', price: number | null): void {
  n.result = result;
  n.dealPrice = price;
  const c = customerById(s, n.customerId)!;
  const a = archetypeOf(c);
  n.log.push({ who: 'customer', text: pick(s, result === 'deal' ? a.accept : a.walkout) });
  const car = carById(s, n.carId)!;
  if (result === 'deal' && price != null) {
    if (n.kind === 'sale') {
      const profit = recordSale(s, car, price);
      emit(s, { type: 'toast', text: `Verkauft für ${formatMoney(price)} (Gewinn ${formatMoney(profit)})` });
    } else {
      const slot = freeSlot(s);
      s.money -= price;
      s.ledger.expenses += price;
      s.ledger.bought++;
      s.stats.carsBought++;
      car.invested = price;
      addRep(s, 0.5);
      car.loc = { kind: 'lot', slot: slot ?? 0 };
      c.carId = null;
      emit(s, { type: 'carMoved', carId: car.id });
      emit(s, { type: 'toast', text: `Angekauft für ${formatMoney(price)}` });
    }
  }
  if (result === 'walkout') addRep(s, -1.5);
  removeCustomer(s, c.id, 'done');
}

/** The player names a price. */
export function makeOffer(s: GameState, price: number): NegotiationStep {
  const n = s.negotiation!;
  const c = customerById(s, n.customerId)!;
  const a = archetypeOf(c);
  price = Math.round(price);
  if (n.kind === 'purchase' && price > s.money) return { line: BROKE, result: 'open' };
  n.log.push({ who: 'player', text: n.kind === 'sale' ? `Für dich: ${formatMoney(price)}.` : `Ich biete ${formatMoney(price)}.` });
  const lim = effectiveLimit(n);
  const sale = n.kind === 'sale';
  // going back on your own offer is bad manners
  if (n.lastOffer != null && (sale ? price > n.lastOffer : price < n.lastOffer)) n.mood -= 10;
  n.lastOffer = price;

  if (sale ? price <= lim : price >= lim) {
    finish(s, n, 'deal', price);
    return { line: n.log[n.log.length - 1].text, result: n.result };
  }
  // the customer would happily take their own offer if the player matches it
  if (sale ? price <= n.theirOffer : price >= n.theirOffer) {
    finish(s, n, 'deal', price);
    return { line: n.log[n.log.length - 1].text, result: n.result };
  }

  const ratio = sale ? price / lim : lim / price;
  n.patience--;
  let line: string;
  if (ratio > a.insultAt) {
    n.mood -= 25;
    n.patience--;
    line = say(s, 'insulted');
  } else {
    n.mood -= 6;
    // concede part of the gap between their offer and their limit
    const gap = lim - n.theirOffer;
    n.theirOffer = round50(n.theirOffer + gap * randRange(s, 0.3, 0.5));
    if (sale ? n.theirOffer > lim : n.theirOffer < lim) n.theirOffer = round50(lim);
    const key: LineKey = sale ? 'counterBuy' : 'counterSell';
    line = (ratio < 1.06 ? say(s, 'closer') + ' ' : '') + say(s, key, { price: formatMoney(n.theirOffer) });
  }
  n.mood = Math.max(0, Math.min(100, n.mood));
  if (n.patience <= 0 || n.mood <= 0) {
    n.log.push({ who: 'customer', text: line });
    finish(s, n, 'walkout', null);
    return { line: n.log[n.log.length - 1].text, result: n.result };
  }
  n.log.push({ who: 'customer', text: line });
  return { line, result: 'open' };
}

/** Accept the customer's current offer. */
export function acceptOffer(s: GameState): NegotiationStep {
  const n = s.negotiation!;
  if (n.kind === 'purchase' && n.theirOffer > s.money) return { line: BROKE, result: 'open' };
  n.log.push({ who: 'player', text: 'Abgemacht. Schlag ein!' });
  finish(s, n, 'deal', n.theirOffer);
  return { line: n.log[n.log.length - 1].text, result: n.result };
}

export function availableTactics(s: GameState): Tactic[] {
  const t: Tactic[] = ['charm', 'hard'];
  if (hasTech(s, 'rhetorik')) t.push('story');
  return t;
}

/** Use a tactic once per negotiation. Does not cost patience unless it backfires badly. */
export function useTactic(s: GameState, t: Tactic): NegotiationStep {
  const n = s.negotiation!;
  if (n.used.includes(t)) return { line: '', result: n.result };
  n.used.push(t);
  const c = customerById(s, n.customerId)!;
  const a = archetypeOf(c);
  const boost = hasTech(s, 'charmeoffensive') ? 1.5 : 1;
  const sale = n.kind === 'sale';
  let line: string;
  if (t === 'charm') {
    n.log.push({ who: 'player', text: say(s, 'playerCharm') });
    if (chance(s, Math.min(0.95, a.charmable * boost))) {
      n.mood += 20 * boost;
      line = react(s, a.id, 'charmWin');
    } else {
      n.mood -= 5;
      line = react(s, a.id, 'charmFail');
    }
  } else if (t === 'hard') {
    n.log.push({ who: 'player', text: say(s, 'playerHard') });
    if (chance(s, Math.min(0.9, (1 - a.charmable * 0.5) * 0.75 * boost))) {
      const lim = effectiveLimit(n);
      n.theirOffer = round50(n.theirOffer + (lim - n.theirOffer) * 0.5);
      line = react(s, a.id, 'hardWin') + ` Na gut: ${formatMoney(n.theirOffer)}.`;
    } else {
      n.mood -= 20;
      line = react(s, a.id, 'hardFail');
    }
  } else {
    n.log.push({ who: 'player', text: say(s, sale ? 'playerStoryBuy' : 'playerStorySell') });
    if (chance(s, a.gullible)) {
      n.limit = Math.round(n.limit * (sale ? 1.12 : 0.88));
      line = react(s, a.id, 'storyWin');
    } else {
      n.mood -= 30;
      n.patience--;
      line = react(s, a.id, 'storyFail');
    }
  }
  n.mood = Math.max(0, Math.min(100, n.mood));
  n.log.push({ who: 'customer', text: line });
  if (n.patience <= 0 || n.mood <= 0) {
    finish(s, n, 'walkout', null);
    return { line: n.log[n.log.length - 1].text, result: n.result };
  }
  return { line, result: 'open' };
}

/** Player walks away from the table. */
export function abandonNegotiation(s: GameState): void {
  const n = s.negotiation;
  if (!n) return;
  if (n.result === 'open') {
    n.log.push({ who: 'player', text: 'Wissen Sie was? Vergessen wir das.' });
    finish(s, n, 'walkout', null);
  }
}

export function closeNegotiation(s: GameState): void {
  s.negotiation = null;
}
