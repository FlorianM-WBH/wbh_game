// Price tags on lot cars (buyers browse and may pay the tag without haggling) and the dealer auction.
import { MODEL_BY_ID, MODELS } from '../content/models';
import { AUCTION_BLURB, TAG_BUY, TAG_REJECT } from '../content/market';
import { UPGRADES } from '../content/workshop';
import { buyerLimit, carFit, makeCar, removeCustomer } from './customers';
import { freeSlot, lotCars, marketValue } from './economy';
import { baseMood, recordSale } from './negotiation';
import { chance, pick, pickWeighted, randRange } from './rng';
import { carById, emit, formatMoney, hasTech, type AuctionLot, type Car, type Customer, type GameState } from './state';
import type { ActionResult } from './workshop';

function fill(t: string, vars: Record<string, string>): string {
  for (const [k, v] of Object.entries(vars)) t = t.split(`{${k}}`).join(v);
  return t;
}

function round50(n: number): number {
  return Math.max(50, Math.round(n / 50) * 50);
}

// ---------- price tags ----------

/** Preset tag multipliers on market value offered in the car menu. */
export const TAG_STEPS = [0.9, 1.0, 1.1, 1.2, 1.35];

export function setPriceTag(s: GameState, carId: number, price: number | null): ActionResult {
  const car = carById(s, carId);
  if (!car || car.ownerId != null) return { ok: false, reason: 'Das ist nicht dein Auto.' };
  car.price = price == null ? null : round50(price);
  return { ok: true };
}

export function tagFor(car: Car, factor: number): number {
  return round50(marketValue(car) * factor);
}

/** The buyer's private ceiling for a tag purchase (a bit stingier than at the negotiating table). */
function tagLimit(s: GameState, c: Customer, car: Car): number {
  const m = (baseMood(s) - 50) / 50;
  return buyerLimit(s, c, car, randRange(s, 0.8, 0.96)) * (1 + 0.08 * m);
}

function browsable(s: GameState, c: Customer): Car[] {
  return lotCars(s).filter((car) => car.price != null && !(c.rejected ?? []).includes(car.id) && carFit(c, car).fit !== 'bad');
}

/** Waiting buyers who have not been talked to walk up to tagged cars they like and decide. */
export function tickBrowsing(s: GameState, minutes: number): void {
  for (const c of [...s.customers]) {
    if (c.intent !== 'buy' || c.served) continue;
    c.browseIn = (c.browseIn ?? randRange(s, 8, 25)) - minutes;
    if (c.browseIn > 0) continue;
    if (c.eyeing != null) {
      decide(s, c);
      continue;
    }
    const pool = browsable(s, c);
    if (!pool.length) {
      c.browseIn = 20;
      continue;
    }
    const car = pickWeighted(s, pool, (x) => carFit(c, x).score);
    c.eyeing = car.id;
    c.browseIn = randRange(s, 18, 30);
    emit(s, { type: 'customerMoved', customerId: c.id });
  }
}

function decide(s: GameState, c: Customer): void {
  const car = carById(s, c.eyeing);
  c.eyeing = null;
  c.browseIn = randRange(s, 15, 30);
  if (!car || car.loc.kind !== 'lot' || car.price == null) {
    emit(s, { type: 'customerMoved', customerId: c.id });
    return;
  }
  const name = MODEL_BY_ID[car.modelId].name;
  const vars = { car: name, price: formatMoney(car.price) };
  if (car.price <= tagLimit(s, c, car)) {
    const price = car.price;
    const profit = recordSale(s, car, price);
    s.stats.tagSales = (s.stats.tagSales ?? 0) + 1;
    emit(s, {
      type: 'toast',
      text: `${c.name}: „${fill(pick(s, TAG_BUY), vars)}“ (+${formatMoney(price)}, Gewinn ${formatMoney(profit)})`,
    });
    removeCustomer(s, c.id, 'done');
    return;
  }
  c.rejected = [...(c.rejected ?? []), car.id];
  emit(s, { type: 'customerSays', customerId: c.id, text: fill(pick(s, TAG_REJECT), vars) });
  emit(s, { type: 'customerMoved', customerId: c.id });
}

// ---------- dealer auction ----------

export const AUCTION_FEE = 150;
export const AUCTION_LOTS = 3;

function makeLot(s: GameState): AuctionLot {
  // the auction leans towards better cars than the street brings in
  const model = pickWeighted(s, MODELS, (m) => 1 / Math.pow(m.basePrice, 0.35));
  const car = makeCar(s, model, randRange(s, 0.25, 0.85));
  const unlocked = UPGRADES.filter((u) => u.tech === null);
  if (chance(s, 0.3)) car.upgrades.push(pick(s, unlocked).id);
  const price = round50(marketValue(car) * randRange(s, 0.72, 0.95));
  return { car, price };
}

/** Today's lots; generated on first look each day. */
export function auctionLots(s: GameState): AuctionLot[] {
  if (!s.auction || s.auction.day !== s.day) {
    const lots: AuctionLot[] = [];
    for (let i = 0; i < AUCTION_LOTS; i++) lots.push(makeLot(s));
    s.auction = { day: s.day, lots };
  }
  return s.auction.lots;
}

export function auctionBlurb(lot: AuctionLot): string {
  return AUCTION_BLURB[lot.car.id % AUCTION_BLURB.length];
}

export function buyAuctionLot(s: GameState, carId: number): ActionResult {
  if (!hasTech(s, 'auktion')) return { ok: false, reason: 'Erst die Händlerauktion freischalten.' };
  const lots = auctionLots(s);
  const lot = lots.find((l) => l.car.id === carId);
  if (!lot) return { ok: false, reason: 'Schon weg.' };
  const slot = freeSlot(s);
  if (slot === null) return { ok: false, reason: 'Kein freier Stellplatz auf dem Hof.' };
  const total = lot.price + AUCTION_FEE;
  if (s.money < total) return { ok: false, reason: 'Nicht genug Geld.' };
  s.money -= total;
  s.ledger.expenses += total;
  s.ledger.bought++;
  s.stats.carsBought++;
  s.stats.auctionBuys = (s.stats.auctionBuys ?? 0) + 1;
  s.auction!.lots = lots.filter((l) => l !== lot);
  const car = lot.car;
  car.invested = total;
  car.loc = { kind: 'lot', slot };
  s.cars.push(car);
  emit(s, { type: 'carAdded', carId: car.id });
  emit(s, {
    type: 'toast',
    text: `Ersteigert: ${MODEL_BY_ID[car.modelId].name} für ${formatMoney(total)} – wird gleich geliefert.`,
  });
  return { ok: true };
}
