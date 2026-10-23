// Glue between the simulation, the Phaser scene and the DOM UI: menus for every workplace.
import { ARCHETYPE_BY_ID } from './content/archetypes';
import { CLASS_LABEL, MODEL_BY_ID } from './content/models';
import { BUILDINGS, TECHS } from './content/progression';
import { UPGRADE_REMARKS } from './content/remarks';
import { COMPONENTS, COMPONENT_LABEL, UPGRADES, UPGRADE_BY_ID } from './content/workshop';
import { drawCharacter } from './art/charArt';
import { customerLook } from './art/textures';
import { sfx, toggleMusic, toggleMute } from './audio';
import { startMusic } from './music';
import { currentTip, TIPS } from './tutorial';
import { archetypeOf } from './sim/customers';
import { dailyRent, freeSlot, lotCapacity, lotCars, marketValue, repairQuote, upgradeQuote } from './sim/economy';
import { deserialize, endDay, newGame, serialize, tick } from './sim/game';
import { pitchReaction, startPurchase, startSale } from './sim/negotiation';
import { acceptService, completeService, declineService, haggleService, offerLine, ownerOf, proposedDue, serviceFinished, serviceJobLabel } from './sim/service';
import { buyBuilding, buyTech, completion, nextBuildingCost, techState } from './sim/progression';
import { AUCTION_FEE, auctionBlurb, auctionLots, buyAuctionLot, setPriceTag, TAG_STEPS, tagFor } from './sim/market';
import { borrow, CREDIT_LIMIT, DAILY_INTEREST, debt, GAME_OVER_DEBT, repay, WARN_DEBT } from './sim/finance';
import { repLabel, repStars, reputation } from './sim/reputation';
import { GAME_OVER_TEXT, SHARK_GREET, SHARK_NAME, SHARK_WARN } from './content/market';
import { buildingLevel, carById, customerById, drainEvents, formatMoney, formatTime, hasTech, type Car, type Customer, type GameState, type SimEvent } from './sim/state';
import { availableUpgrades, bays, freeBay, liftAt, liftCar, putOnLift, startRepair, startUpgrade, takeOffLift, type ActionResult } from './sim/workshop';
import { conditionHtml, openNegotiation } from './ui/negotiationPanel';
import { esc, h, UI, type MenuOption } from './ui/ui';
import type { StationId } from './scenes/layout';

const SAVE_KEY = 'miami-motors-86-save';
/** game minutes per real millisecond (2 game minutes per second) */
export const TIME_SCALE = 2 / 1000;
export const WORK_BOOST = 3;

export type Target = { kind: 'station'; id: StationId } | { kind: 'car'; carId: number } | { kind: 'customer'; customerId: number };

/** What the scene must provide to the app. */
export interface SceneHooks {
  onEvents(events: SimEvent[]): void;
  rebuildAll(): void;
}

export class App {
  state: GameState;
  ui: UI;
  started = false;
  scene: SceneHooks | null = null;
  /** set by the scene while the player holds the action key at the lift */
  helping = false;
  /** the lift bay the player is standing at */
  helpBay = 0;
  private wonShown = false;
  tipsHidden = false;

  constructor(ui: UI) {
    this.ui = ui;
    this.state = newGame(1);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        if (!this.ui.isOpen) this.ui.toast(toggleMute() ? 'Ton aus' : 'Ton an');
      }
      if ((e.key === 'h' || e.key === 'H') && !this.ui.isOpen) this.tipsHidden = !this.tipsHidden;
      if (e.key === 'n' || e.key === 'N') {
        if (!this.ui.isOpen) this.ui.toast(toggleMusic() ? 'Musik an' : 'Musik aus');
      }
    });
    // browsers only allow audio after a user gesture
    for (const ev of ['keydown', 'pointerdown'] as const) window.addEventListener(ev, () => startMusic(), { once: true });
  }

  attachScene(scene: SceneHooks): void {
    this.scene = scene;
  }

  // ---------- lifecycle ----------

  hasSave(): boolean {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, serialize(this.state));
    } catch {
      /* storage may be unavailable */
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const s = raw ? deserialize(raw) : null;
      if (!s) return false;
      this.state = s;
      this.wonShown = completion(s) >= 1;
      return true;
    } catch {
      return false;
    }
  }

  startNew(seed = Date.now()): void {
    this.state = newGame(seed);
    this.wonShown = false;
    this.started = true;
    this.scene?.rebuildAll();
    this.intro();
  }

  continueGame(): void {
    if (!this.load()) return this.startNew();
    this.started = true;
    this.scene?.rebuildAll();
  }

  titleScreen(): void {
    const el = h('div', 'title-screen');
    el.dataset.menu = 'title';
    el.append(h('div', 'logo', 'MIAMI MOTORS'), h('div', 'logo-sub', "Gebrauchtwagen '86"));
    const opts = h('div', 'options');
    const add = (label: string, fn: () => void) => {
      const b = h('button', 'opt', `<span class="l">${esc(label)}</span>`);
      b.addEventListener('click', fn);
      opts.append(b);
      return b;
    };
    const go = (fn: () => void) => () => {
      sfx('open');
      this.ui.close();
      fn();
    };
    if (this.hasSave()) add('Weiterspielen', go(() => this.continueGame()));
    add('Neues Spiel', go(() => this.startNew()));
    el.append(opts, h('div', 'tagline', 'Dicke Schlitten. Dünne Ausreden. Neon bis zum Horizont.'));
    this.ui.openCustom(el, (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') {
        (opts.firstElementChild as HTMLButtonElement).click();
        return true;
      }
      return true;
    });
  }

  intro(): void {
    this.ui.menu({
      title: 'Willkommen in Miami, 1986!',
      body:
        '<p>Onkel Sal hat dir seinen Gebrauchtwagenhandel vermacht. Und seine Schulden. Und seinen Kaktus.</p>' +
        '<p><b>Kaufe</b> Autos von Verkäufern an der <span class="tag">ANKAUF</span>-Zone, <b>repariere und tune</b> sie an der Hebebühne und <b>verkaufe</b> sie teuer an Kunden auf dem Hof. <b>Werkstatt-Kunden</b> zahlen dir außerdem gutes Geld für Reparaturen an ihren eigenen Autos – wenn du pünktlich fertig wirst.</p>' +
        '<p>Im <b>Büro</b> baust du die Firma aus, am <b>Computer</b> schaltest du neue Technik frei. Ziel: das größte Autoimperium von Florida.</p>' +
        `<p>Jeden Abend um 20:00 werden <b>${formatMoney(dailyRent(this.state))}</b> Miete fällig. Onkel Sals Kredithai hat keinen Humor.</p>`,
      options: [],
      closeLabel: "Los geht's!",
    });
  }

  // ---------- per frame ----------

  update(dtMs: number): void {
    if (!this.started || this.ui.isOpen) return;
    const minutes = Math.min(dtMs, 100) * TIME_SCALE;
    tick(this.state, minutes, { workBoost: this.helping && liftAt(this.state, this.helpBay).job ? WORK_BOOST : 1, boostBay: this.helpBay });
    this.flush();
  }

  /** Process sim events: sounds, toasts, day summary, then hand them to the scene. */
  flush(): void {
    const events = drainEvents(this.state);
    if (!events.length) return;
    for (const e of events) {
      if (e.type === 'toast') this.ui.toast(e.text);
      if (e.type === 'customerArrived') sfx('arrive');
      if (e.type === 'jobDone') sfx('job');
      if (e.type === 'customerLeft' && e.reason === 'impatient') {
        this.ui.toast(`${e.name} hatte keine Lust mehr zu warten und ist gegangen.`);
      }
    }
    this.scene?.onEvents(events);
    const over = events.find((e) => e.type === 'gameOver');
    if (over && over.type === 'gameOver') return this.gameOver(over.debt);
    const day = events.find((e) => e.type === 'dayEnded');
    if (day && day.type === 'dayEnded') this.daySummary(day);
    if (!this.wonShown && completion(this.state) >= 1) {
      this.wonShown = true;
      this.victory();
    }
  }

  private result(r: ActionResult, okSound: 'cash' | 'open' = 'open'): boolean {
    if (!r.ok) {
      sfx('error');
      this.ui.toast(r.reason);
      return false;
    }
    sfx(okSound);
    return true;
  }

  // ---------- interactions ----------

  promptFor(t: Target): string {
    const s = this.state;
    if (t.kind === 'station') {
      if (t.id === 'lift' || t.id === 'lift2') {
        const name = t.id === 'lift2' ? 'Hebebühne 2' : 'Hebebühne';
        const job = liftAt(s, t.id === 'lift2' ? 1 : 0).job;
        if (job) return `${name} – mit anpacken (halten): ${Math.round(100 - (job.minutesLeft / job.total) * 100)}%`;
        return name;
      }
      return t.id === 'office' ? 'Büro' : 'Computer: Technologie';
    }
    if (t.kind === 'car') {
      const car = carById(s, t.carId);
      return car ? `${MODEL_BY_ID[car.modelId].name} ansehen${car.loc.kind === 'lot' && car.price != null ? ` · Schild ${formatMoney(car.price)}` : ''}` : '';
    }
    const c = customerById(s, t.customerId);
    return c ? `Sprechen mit ${c.name}` : '';
  }

  interact(t: Target): void {
    if (!this.started || this.ui.isOpen) return;
    sfx('open');
    if (t.kind === 'station') {
      if (t.id === 'office') this.officeMenu();
      else if (t.id === 'computer') this.techMenu();
      else this.liftMenu(t.id === 'lift2' ? 1 : 0);
    } else if (t.kind === 'car') this.carMenu(t.carId);
    else this.customerMenu(t.customerId);
  }

  // ---------- office ----------

  officeMenu(): void {
    const s = this.state;
    const pct = Math.round(completion(s) * 100);
    this.ui.menu({
      title: 'Büro',
      sub: `Tag ${s.day}, ${formatTime(s.minute)} · Imperium: ${pct}% ausgebaut`,
      body:
        `<table class="stats">` +
        `<tr><td>Kontostand</td><td>${formatMoney(s.money)}</td></tr>` +
        `<tr><td>Heute eingenommen / ausgegeben</td><td>${formatMoney(s.ledger.income)} / ${formatMoney(s.ledger.expenses)}</td></tr>` +
        `<tr><td>Miete heute Abend</td><td>${formatMoney(dailyRent(s))}</td></tr>` +
        `<tr><td>Verkaufte Autos (gesamt)</td><td>${s.stats.carsSold}</td></tr>` +
        `<tr><td>Gesamtgewinn aus Verkäufen</td><td>${formatMoney(s.stats.profit)}</td></tr>` +
        `<tr><td>Bester Deal</td><td>${formatMoney(s.stats.bestDeal)}</td></tr>` +
        `<tr><td>Erledigte Werkstatt-Aufträge</td><td>${s.stats.servicesDone ?? 0}</td></tr>` +
        `<tr><td>Ruf</td><td>${'★'.repeat(repStars(s))}${'☆'.repeat(5 - repStars(s))} ${esc(repLabel(s))} (${Math.round(reputation(s))})</td></tr>` +
        (debt(s) > 0 ? `<tr><td>Schulden bei Tony</td><td class="bad">${formatMoney(debt(s))}</td></tr>` : '') +
        `</table>`,
      options: [
        { label: 'Firma ausbauen', desc: 'Parkplatz, Showroom, Werkstatt, Deko…', action: () => this.buildingMenu() },
        {
          label: 'Kredithai anrufen',
          desc: debt(s) > 0 ? `Du schuldest ${SHARK_NAME} ${formatMoney(debt(s))}.` : `${SHARK_NAME} leiht dir Geld. Zu Zinsen, die man in Florida nicht laut sagt.`,
          action: () => this.sharkMenu(),
        },
        { label: 'Spiel speichern', action: () => (this.save(), this.ui.toast('Gespeichert.'), this.ui.close()) },
        {
          label: 'Feierabend machen',
          desc: 'Den Tag sofort beenden. Wartende Kunden gehen nach Hause.',
          action: () => {
            this.ui.close();
            endDay(this.state);
            this.flush();
          },
        },
      ],
    });
  }

  buildingMenu(): void {
    const s = this.state;
    const options: MenuOption[] = BUILDINGS.map((b) => {
      const lvl = buildingLevel(s, b.id);
      const cost = nextBuildingCost(s, b.id);
      return {
        label: `${b.name} (Stufe ${lvl}/${b.costs.length})`,
        desc: cost === null ? `Voll ausgebaut: ${b.desc[lvl]}` : `Jetzt: ${b.desc[lvl]} → ${b.desc[lvl + 1]}`,
        right: cost === null ? '✔' : formatMoney(cost),
        disabled: cost === null || cost > s.money,
        action: () => {
          if (this.result(buyBuilding(s, b.id), 'cash')) {
            this.flush();
            this.scene?.rebuildAll();
            this.buildingMenu();
          }
        },
      };
    });
    this.ui.menu({ title: 'Firma ausbauen', sub: `Kontostand: ${formatMoney(s.money)}`, options });
  }

  sharkMenu(): void {
    const s = this.state;
    const d = debt(s);
    const options: MenuOption[] = [];
    const again = (r: ActionResult) => {
      if (this.result(r, 'cash')) {
        this.flush();
        this.sharkMenu();
      }
    };
    for (const amt of [2000, 5000, 10000]) {
      options.push({
        label: `${formatMoney(amt)} leihen`,
        desc: `${Math.round(DAILY_INTEREST * 100)}% Zinsen pro Tag, jeden Abend fällig.`,
        disabled: d + amt > CREDIT_LIMIT,
        action: () => again(borrow(s, amt)),
      });
    }
    for (const amt of [2000, 10000]) {
      if (d > amt) options.push({ label: `${formatMoney(amt)} zurückzahlen`, disabled: s.money < amt, action: () => again(repay(s, amt)) });
    }
    if (d > 0) options.push({ label: 'Alles zurückzahlen', right: formatMoney(d), disabled: s.money < d, action: () => again(repay(s, d)) });
    const line = d > WARN_DEBT ? SHARK_WARN[s.day % SHARK_WARN.length] : SHARK_GREET[s.day % SHARK_GREET.length];
    this.ui.menu({
      title: SHARK_NAME,
      sub: `Schulden: ${formatMoney(d)} · Kontostand: ${formatMoney(s.money)}`,
      body:
        `<p>„${esc(line)}“</p>` +
        `<p class="sub">Leihen bis ${formatMoney(CREDIT_LIMIT)}. Bist du abends im Minus, springt Tony automatisch ein – mit 20% Aufschlag. ` +
        `Über ${formatMoney(GAME_OVER_DEBT)} Schulden ist das Spiel vorbei.</p>`,
      options,
    });
  }

  priceTagMenu(carId: number): void {
    const s = this.state;
    const car = carById(s, carId);
    if (!car) return;
    const options: MenuOption[] = TAG_STEPS.map((f) => {
      const p = tagFor(car, f);
      return {
        label: `${formatMoney(p)} (${f === 1 ? 'Marktwert' : `Marktwert ${f > 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 100)}%`})`,
        desc: `Gewinn bei Verkauf: ${formatMoney(p - car.invested)}`,
        right: car.price === p ? '✔' : undefined,
        action: () => {
          if (this.result(setPriceTag(s, car.id, p))) this.carMenu(car.id);
        },
      };
    });
    if (car.price != null)
      options.push({
        label: 'Preisschild abnehmen',
        action: () => {
          if (this.result(setPriceTag(s, car.id, null))) this.carMenu(car.id);
        },
      });
    this.ui.menu({
      title: 'Preisschild',
      sub: `${MODEL_BY_ID[car.modelId].name} · Marktwert ${formatMoney(marketValue(car))} · investiert ${formatMoney(car.invested)}`,
      body:
        '<p>Wartende Käufer schauen sich ausgezeichnete Autos selbst an. Passt der Preis, zahlen sie ihn ohne Feilschen. Zu teuer? Dann gehen sie weiter – ansprechen kannst du sie trotzdem.</p>' +
        '<p class="sub">Ohne Feilschen zahlen Käufer meist weniger als am Verhandlungstisch – außer das Auto erfüllt ihren Wunsch.</p>',
      options,
    });
  }

  auctionMenu(): void {
    const s = this.state;
    const lots = auctionLots(s);
    const full = freeSlot(s) === null;
    const exact = hasTech(s, 'gutachter');
    const tags = (c: Car) => c.upgrades.map((u) => ` <span class="tag">${esc(UPGRADE_BY_ID[u].name)}</span>`).join('');
    this.ui.menu({
      title: 'BTX-Händlerauktion',
      sub: `Heute im Angebot · Gebühr ${formatMoney(AUCTION_FEE)} pro Wagen · Kontostand: ${formatMoney(s.money)}`,
      body:
        (lots.length ? '' : '<p>Alles weg für heute. Morgen gibt es neue Wagen.</p>') +
        lots
          .map(
            (l) =>
              `<p><b>${esc(MODEL_BY_ID[l.car.modelId].name)}</b> <span class="tag">${CLASS_LABEL[MODEL_BY_ID[l.car.modelId].cls]}</span>${tags(l.car)}` +
              ` – <i>${esc(auctionBlurb(l))}</i><br>${conditionHtml(s, l.car, exact)}</p>`,
          )
          .join('') +
        (exact ? '' : '<p class="sub">Ohne Gutachter-Lehrgang siehst du den Zustand nur grob.</p>'),
      options: lots.map((l) => ({
        label: `Ersteigern: ${MODEL_BY_ID[l.car.modelId].name}`,
        desc: full ? 'Kein freier Stellplatz!' : exact ? `Marktwert ${formatMoney(marketValue(l.car))}` : 'Marktwert unbekannt',
        right: formatMoney(l.price + AUCTION_FEE),
        disabled: full || l.price + AUCTION_FEE > s.money,
        action: () => {
          if (this.result(buyAuctionLot(s, l.car.id), 'cash')) {
            this.flush();
            this.auctionMenu();
          }
        },
      })),
    });
  }

  // ---------- computer ----------

  techMenu(): void {
    const s = this.state;
    const branchLabel = { werkstatt: 'Werkstatt', tuning: 'Tuning', verkauf: 'Verkauf', marketing: 'Marketing' };
    const options: MenuOption[] = [];
    if (hasTech(s, 'auktion')) options.push({ label: '>> Händlerauktion öffnen', desc: 'Heute zu ersteigernde Wagen ansehen.', action: () => this.auctionMenu() });
    for (const t of TECHS) {
      const st = techState(s, t.id);
      options.push({
        label: `[${branchLabel[t.branch]}] ${t.name}`,
        desc: t.desc + (st === 'locked' ? ` (Benötigt: ${t.requires.map((r) => TECHS.find((x) => x.id === r)!.name).join(', ')})` : ''),
        right: st === 'owned' ? '✔' : formatMoney(t.cost),
        disabled: st !== 'available' || t.cost > s.money,
        action: () => {
          if (this.result(buyTech(s, t.id), 'cash')) {
            this.flush();
            this.techMenu();
          }
        },
      });
    }
    this.ui.menu({
      title: 'Commodore-Computer 64K',
      sub: `READY. Kontostand: ${formatMoney(s.money)} · ${s.techs.length}/${TECHS.length} freigeschaltet`,
      options,
    });
  }

  // ---------- workshop ----------

  liftMenu(bay = 0): void {
    const s = this.state;
    const car = liftCar(s, bay);
    const title = bay ? 'Hebebühne 2' : 'Hebebühne';
    if (!car) {
      const order = s.customers.find((c) => c.service?.accepted && carById(s, c.carId)?.loc.kind === 'buyin');
      const cars = order ? [carById(s, order.carId)!, ...lotCars(s)] : lotCars(s);
      this.ui.menu({
        title,
        sub: 'Die Hebebühne ist leer. Welchen Wagen holen wir rein?',
        options: cars.map((c) => ({
          label: c.ownerId != null ? `Kundenauftrag: ${MODEL_BY_ID[c.modelId].name}` : MODEL_BY_ID[c.modelId].name,
          desc:
            c.ownerId != null && order?.service
              ? `${serviceJobLabel(order.service)} · Abholung ${formatTime(order.service.due)} · ${formatMoney(order.service.fee)}`
              : `Zustand: ${Math.round(COMPONENTS.reduce((a, k) => a + c.cond[k], 0) / 4)}% · Wert ${formatMoney(marketValue(c))}`,
          action: () => {
            if (this.result(putOnLift(s, c.id, bay))) {
              this.flush();
              this.liftMenu(bay);
            }
          },
        })),
      });
      return;
    }
    const owner = ownerOf(s, car);
    if (owner?.service) return this.serviceLiftMenu(car, owner, bay);
    const model = MODEL_BY_ID[car.modelId];
    const job = liftAt(s, bay).job;
    const head =
      `<p><b>${esc(model.name)}</b> · Wert jetzt: <b>${formatMoney(marketValue(car))}</b> · investiert: ${formatMoney(car.invested)}</p>` +
      `<p>${conditionHtml(s, car, true)}</p>` +
      (car.upgrades.length ? `<p>Extras: ${car.upgrades.map((u) => `<span class="tag">${esc(UPGRADE_BY_ID[u].name)}</span>`).join('')}</p>` : '');
    if (job) {
      const label = job.kind === 'repair' ? COMPONENT_LABEL[job.target as keyof typeof COMPONENT_LABEL] : UPGRADE_BY_ID[job.target].name;
      const pct = Math.round(100 - (job.minutesLeft / job.total) * 100);
      this.ui.menu({
        title,
        body: head + `<p>In Arbeit: <b>${esc(label)}</b> – ${pct}% (noch ca. ${Math.ceil(job.minutesLeft)} Min.)</p><p>Tipp: <span class="key">E</span> an der Hebebühne gedrückt halten, um mit anzupacken (3× schneller).</p>`,
        options: [],
      });
      return;
    }
    const options: MenuOption[] = [];
    for (const comp of COMPONENTS) {
      if (car.cond[comp] >= 100) continue;
      const q = repairQuote(s, car, comp);
      options.push({
        label: `${COMPONENT_LABEL[comp]} reparieren (${Math.round(car.cond[comp])}% → 100%)`,
        desc: `${q.minutes} Minuten Arbeit`,
        right: formatMoney(q.cost),
        disabled: q.cost > s.money,
        action: () => {
          if (this.result(startRepair(s, comp, bay))) this.ui.close();
        },
      });
    }
    for (const u of availableUpgrades(s, bay)) {
      const q = upgradeQuote(s, u.id);
      options.push({
        label: `Einbauen: ${u.name}`,
        desc: `${u.desc} (${q.minutes} Min.)`,
        right: formatMoney(q.cost),
        disabled: q.cost > s.money,
        action: () => {
          if (this.result(startUpgrade(s, u.id, bay))) this.ui.close();
        },
      });
    }
    const locked = UPGRADES.filter((u) => u.tech && !hasTech(s, u.tech)).length;
    options.push({
      label: 'Zurück auf den Hof stellen',
      disabled: freeSlot(s) === null,
      desc: freeSlot(s) === null ? 'Kein freier Stellplatz!' : undefined,
      action: () => {
        if (this.result(takeOffLift(s, bay))) {
          this.flush();
          this.ui.close();
        }
      },
    });
    this.ui.menu({
      title,
      body: head + (locked ? `<p class="sub">${locked} weitere Extras lassen sich am Computer freischalten.</p>` : ''),
      options,
    });
  }

  /** The lift with a customer's car: only the ordered job, then hand it back. */
  serviceLiftMenu(car: Car, owner: Customer, bay = 0): void {
    const s = this.state;
    const o = owner.service!;
    const job = liftAt(s, bay).job;
    const done = serviceFinished(car, o);
    const head =
      `<p>Kundenauftrag von <b>${esc(owner.name)}</b>: <b>${esc(MODEL_BY_ID[car.modelId].name)}</b></p>` +
      `<p>Auftrag: <b>${esc(serviceJobLabel(o))}</b> · Lohn: <b>${formatMoney(o.fee)}</b> · Abholung um <b>${formatTime(o.due)}</b> (jetzt ${formatTime(s.minute)})</p>`;
    if (job) {
      const pct = Math.round(100 - (job.minutesLeft / job.total) * 100);
      this.ui.menu({
        title: bay ? 'Hebebühne 2' : 'Hebebühne',
        body: head + `<p>In Arbeit: ${pct}% (noch ca. ${Math.ceil(job.minutesLeft)} Min.)</p><p>Tipp: <span class="key">E</span> an der Hebebühne gedrückt halten, um mit anzupacken (3× schneller).</p>`,
        options: [],
      });
      return;
    }
    const options: MenuOption[] = [];
    if (done) {
      options.push({
        label: 'Fertig! Wagen übergeben und kassieren',
        desc: 'Früh fertig = Trinkgeld.',
        right: formatMoney(o.fee),
        action: () => {
          const r = completeService(s, bay);
          if (this.result(r, 'cash')) {
            this.flush();
            this.ui.menu({ title: owner.name, body: `<p>„${esc(r.text ?? '')}“</p>`, options: [] });
          }
        },
      });
    } else {
      const q = o.kind === 'repair' ? repairQuote(s, car, o.target as keyof typeof COMPONENT_LABEL) : upgradeQuote(s, o.target);
      options.push({
        label: serviceJobLabel(o),
        desc: `${q.minutes} Minuten Arbeit · Teile zahlst du, der Kunde zahlt ${formatMoney(o.fee)}`,
        right: formatMoney(q.cost),
        disabled: q.cost > s.money,
        action: () => {
          const r = o.kind === 'repair' ? startRepair(s, o.target as keyof typeof COMPONENT_LABEL, bay) : startUpgrade(s, o.target, bay);
          if (this.result(r)) this.ui.close();
        },
      });
      options.push({
        label: 'Zurück in die Ankauf-Zone stellen',
        desc: 'Macht die Hebebühne frei. Der Auftrag bleibt offen.',
        action: () => {
          if (this.result(takeOffLift(s, bay))) {
            this.flush();
            this.ui.close();
          }
        },
      });
    }
    this.ui.menu({ title: `${bay ? 'Hebebühne 2' : 'Hebebühne'} – Kundenauftrag`, body: head, options });
  }

  carMenu(carId: number): void {
    const s = this.state;
    const car = carById(s, carId);
    if (!car) return;
    const model = MODEL_BY_ID[car.modelId];
    const onLot = car.loc.kind === 'lot';
    const options: MenuOption[] = [];
    if (onLot) {
      options.push({
        label: 'In die Werkstatt fahren',
        disabled: freeBay(s) == null,
        desc: freeBay(s) == null ? 'Alle Hebebühnen sind belegt.' : 'Stellt den Wagen auf eine freie Hebebühne.',
        action: () => {
          if (this.result(putOnLift(s, car.id))) {
            this.flush();
            this.ui.close();
          }
        },
      });
      options.push({
        label: car.price != null ? `Preisschild ändern (${formatMoney(car.price)})` : 'Preisschild anbringen',
        desc: 'Käufer können zum Schildpreis kaufen, ohne zu feilschen.',
        action: () => this.priceTagMenu(car.id),
      });
    }
    const owner = ownerOf(s, car);
    if (owner?.service) {
      if (!owner.service.accepted) return this.customerMenu(owner.id);
      this.ui.menu({
        title: model.name,
        sub: `Kundenauftrag von ${owner.name}`,
        body: `<p>Auftrag: <b>${esc(serviceJobLabel(owner.service))}</b> · Abholung um <b>${formatTime(owner.service.due)}</b></p>`,
        options:
          car.loc.kind === 'buyin'
            ? [
                {
                  label: 'In die Werkstatt fahren',
                  disabled: freeBay(s) == null,
                  desc: freeBay(s) == null ? 'Alle Hebebühnen sind belegt. Erst einen Wagen runterholen.' : undefined,
                  action: () => {
                    if (this.result(putOnLift(s, car.id))) {
                      this.flush();
                      this.ui.close();
                    }
                  },
                },
              ]
            : [],
      });
      return;
    }
    const seller = s.customers.find((c) => c.carId === car.id);
    this.ui.menu({
      title: model.name,
      sub: `${CLASS_LABEL[model.cls]} · ${model.blurb}`,
      body:
        `<p>${conditionHtml(s, car, onLot || hasTech(s, 'gutachter'))}</p>` +
        (onLot
          ? `<p>Marktwert: <b>${formatMoney(marketValue(car))}</b> · investiert: <b>${formatMoney(car.invested)}</b>${car.price != null ? ` · Preisschild: <b>${formatMoney(car.price)}</b>` : ''}</p>`
          : `<p>Gehört ${esc(seller?.name ?? 'einem Verkäufer')}. Sprich ihn oder sie an, um zu verhandeln.</p>`) +
        (car.upgrades.length ? `<p>Extras: ${car.upgrades.map((u) => `<span class="tag">${esc(UPGRADE_BY_ID[u].name)}</span>`).join('')}</p>` : ''),
      options,
    });
  }

  // ---------- customers ----------

  private greeting(customerId: number): string {
    const c = customerById(this.state, customerId)!;
    const a = archetypeOf(c);
    const lines = c.intent === 'buy' ? a.greetBuy : a.greetSell;
    return lines[c.lookSeed % lines.length];
  }

  customerMenu(customerId: number, extra?: string): void {
    const s = this.state;
    const c = customerById(s, customerId);
    if (!c) return;
    const a = ARCHETYPE_BY_ID[c.archetypeId];
    if (c.intent === 'service') return this.serviceCustomerMenu(c, extra);
    if (c.intent === 'sell') {
      const car = carById(s, c.carId)!;
      const lotFull = freeSlot(s) === null;
      this.ui.menu({
        title: c.name,
        sub: a.label,
        body:
          `<p>„${esc(this.greeting(c.id))}“</p>` +
          `<p>Bietet an: <b>${esc(MODEL_BY_ID[car.modelId].name)}</b> <span class="tag">${CLASS_LABEL[MODEL_BY_ID[car.modelId].cls]}</span></p>` +
          `<p>${conditionHtml(s, car, hasTech(s, 'gutachter'))}</p>`,
        options: [
          {
            label: 'Über den Preis reden',
            disabled: lotFull,
            desc: lotFull ? 'Dein Hof ist voll – erst ein Auto verkaufen oder den Parkplatz ausbauen.' : undefined,
            action: () => {
              if (startPurchase(s, c.id)) this.negotiate();
            },
          },
        ],
        closeLabel: 'Später',
      });
      return;
    }
    const prefs = a.classes.map((k) => CLASS_LABEL[k]).join(', ');
    const knows = hasTech(s, 'menschenkenner');
    const cars = lotCars(s);
    const wish = c.wish ? UPGRADE_BY_ID[c.wish] : null;
    const options: MenuOption[] = cars.map((car) => ({
      label: `Zeigen: ${MODEL_BY_ID[car.modelId].name}${wish && car.upgrades.includes(wish.id) ? ' ★' : ''}`,
      desc: `Wert ${formatMoney(marketValue(car))} · investiert ${formatMoney(car.invested)}${car.price != null ? ` · Schild ${formatMoney(car.price)}` : ''}`,
      action: () => {
        const r = pitchReaction(s, c.id, car.id);
        if (r.fit === 'bad') {
          sfx('error');
          this.customerMenu(c.id, r.line);
          return;
        }
        startSale(s, c.id, car.id);
        s.negotiation!.log.unshift({ who: 'customer', text: r.line });
        this.negotiate();
      },
    }));
    this.ui.menu({
      title: c.name,
      sub: a.label,
      body:
        `<p>„${esc(extra ?? this.greeting(c.id))}“</p>` +
        (wish && !extra ? `<p>„${esc(UPGRADE_REMARKS[wish.id].wish[c.lookSeed % UPGRADE_REMARKS[wish.id].wish.length])}“</p>` : '') +
        `<p>Sucht vermutlich: <b>${esc(prefs)}</b>${wish ? ` · Wunsch: <span class="tag">${esc(wish.name)}</span>${wish.tech && !hasTech(s, wish.tech) ? ' <span class="sub">(noch nicht freigeschaltet)</span>' : ''}` : ''}</p>` +
        (knows
          ? `<p>Menschenkenntnis: steht auf ${a.likes.map((t) => `<span class="tag">${t}</span>`).join('')} · Budget etwa ${formatMoney(c.budget)}</p>`
          : '') +
        (cars.length ? '' : '<p class="bad">Dein Hof ist leer! Kauf erst ein paar Autos an.</p>'),
      options,
      closeLabel: 'Später',
    });
  }

  serviceCustomerMenu(c: Customer, extra?: string): void {
    const s = this.state;
    const o = c.service!;
    const car = carById(s, c.carId)!;
    const a = archetypeOf(c);
    if (o.accepted) {
      const where = car.loc.kind === 'lift' ? (serviceFinished(car, o) ? 'Fertig auf der Hebebühne.' : 'Steht auf der Hebebühne.') : 'Steht noch in der Ankauf-Zone.';
      this.ui.menu({
        title: c.name,
        sub: a.label,
        body:
          `<p>„Und? Ist mein ${esc(MODEL_BY_ID[car.modelId].name)} fertig? Um ${formatTime(o.due)} bin ich weg. Mit oder ohne Auto.“</p>` +
          `<p>Auftrag: <b>${esc(serviceJobLabel(o))}</b> · ${where}</p>`,
        options: [],
        closeLabel: 'Bin dran!',
      });
      return;
    }
    const options: MenuOption[] = [
      {
        label: 'Auftrag annehmen',
        desc: `${serviceJobLabel(o)} bis ${formatTime(proposedDue(s, c))}. Teile zahlst du.`,
        right: formatMoney(o.fee),
        action: () => {
          if (this.result(acceptService(s, c.id), 'cash')) {
            this.ui.close();
            this.ui.toast(`Auftrag angenommen: ${serviceJobLabel(o)} bis ${formatTime(o.due)}.`);
          }
        },
      },
    ];
    if (!o.haggled) {
      options.push({
        label: 'Mehr verlangen (+25%)',
        desc: 'Klappt nicht immer. Manche fahren dann lieber zur Konkurrenz.',
        action: () => {
          const r = haggleService(s, c.id);
          this.flush();
          if (r.left) {
            sfx('walkout');
            this.ui.menu({ title: c.name, body: `<p>„${esc(r.line)}“</p>`, options: [] });
          } else this.serviceCustomerMenu(c, r.line);
        },
      });
    }
    options.push({
      label: 'Ablehnen',
      action: () => {
        declineService(s, c.id);
        this.flush();
        this.ui.close();
      },
    });
    this.ui.menu({
      title: c.name,
      sub: `${a.label} · Werkstatt-Kunde`,
      body:
        `<p>„${esc(extra ?? o.ask)}“</p>` +
        `<p>„${esc(offerLine(s, c))}“</p>` +
        `<p>${conditionHtml(s, car, true)}</p>`,
      options,
      closeLabel: 'Später',
    });
  }

  negotiate(): void {
    openNegotiation(this.ui, this.state, {
      portrait: (id) => this.portrait(id),
      onDone: () => this.flush(),
      sfx: (n) => sfx(n),
    });
  }

  portrait(customerId: number): HTMLCanvasElement | null {
    const c = customerById(this.state, customerId);
    if (!c) return null;
    const cv = document.createElement('canvas');
    cv.width = 12;
    cv.height = 20;
    drawCharacter(cv.getContext('2d')!, customerLook(c), 0, 0, 0);
    return cv;
  }

  private hudHtml = '';
  private tipsHtml = '';

  renderTips(): void {
    const cur = this.started && !this.tipsHidden ? currentTip(this.state) : null;
    const html = cur
      ? `<div class="t">Nächster Schritt: ${cur.tip.title}<span class="n">${cur.index + 1}/${TIPS.length}</span></div>${cur.tip.text}`
      : '';
    if (html !== this.tipsHtml) this.ui.tips.innerHTML = this.tipsHtml = html;
  }

  renderHud(): void {
    const s = this.state;
    this.renderTips();
    if (!this.started) {
      if (this.hudHtml) this.ui.hud.innerHTML = this.hudHtml = '';
      return;
    }
    const jobHtml = bays(s)
      .map((b) => {
        const lift = liftAt(s, b);
        const name = b ? 'Bühne 2' : bays(s).length > 1 ? 'Bühne 1' : 'Werkstatt';
        if (lift.job) return `<span class="job">${name} <span class="bar"><i style="width:${Math.round(100 - (lift.job.minutesLeft / lift.job.total) * 100)}%"></i></span></span>`;
        return lift.carId != null ? `<span class="job">${name}: bereit</span>` : '';
      })
      .join('');
    const html =
      `<span class="money ${s.money < 0 ? 'neg' : ''}">${formatMoney(s.money)}</span>` +
      `<span>Tag ${s.day}</span><span class="clock">${formatTime(s.minute)}</span>` +
      `<span>Autos ${lotCars(s).length}/${lotCapacity(s)}</span>` +
      `<span class="rep" title="Ruf: ${esc(repLabel(s))}">${'★'.repeat(repStars(s))}<i>${'★'.repeat(5 - repStars(s))}</i></span>` +
      (debt(s) > 0 ? `<span class="debt ${debt(s) > WARN_DEBT ? 'neg' : ''}">Schulden ${formatMoney(debt(s))}</span>` : '') +
      `<span class="spacer"></span>${jobHtml}<span>Imperium ${Math.round(completion(s) * 100)}%</span>`;
    if (html !== this.hudHtml) this.ui.hud.innerHTML = this.hudHtml = html;
  }

  // ---------- day end / victory ----------

  daySummary(e: Extract<SimEvent, { type: 'dayEnded' }>): void {
    const l = e.ledger;
    const net = l.income - l.expenses;
    this.save();
    this.ui.menu({
      title: `Feierabend! Tag ${e.day}`,
      sub: 'Die Sonne geht unter, die Neonröhren gehen an.',
      body:
        `<table class="stats">` +
        `<tr><td>Einnahmen</td><td>${formatMoney(l.income)}</td></tr>` +
        `<tr><td>Ausgaben (inkl. Miete ${formatMoney(e.rent)})</td><td>${formatMoney(l.expenses)}</td></tr>` +
        `<tr><td>Ergebnis</td><td class="${net >= 0 ? 'good' : 'bad'}">${formatMoney(net)}</td></tr>` +
        `<tr><td>Verkauft / angekauft</td><td>${l.sold} / ${l.bought}</td></tr>` +
        `<tr><td>Kontostand</td><td>${formatMoney(this.state.money)}</td></tr>` +
        (e.interest > 0 ? `<tr><td>Zinsen an Tony</td><td class="bad">${formatMoney(e.interest)}</td></tr>` : '') +
        (debt(this.state) > 0 ? `<tr><td>Schulden</td><td class="bad">${formatMoney(debt(this.state))}</td></tr>` : '') +
        `<tr><td>Ruf</td><td>${esc(repLabel(this.state))}</td></tr>` +
        `</table>` +
        (e.bailout > 0 ? `<p class="bad">Du warst im Minus! ${SHARK_NAME} hat ${formatMoney(e.bailout)} vorgestreckt (inkl. 20% „Bearbeitungsgebühr“).</p>` : '') +
        (debt(this.state) > WARN_DEBT ? `<p class="bad">„${esc(SHARK_WARN[e.day % SHARK_WARN.length])}“ Ab ${formatMoney(GAME_OVER_DEBT)} Schulden ist Schluss!</p>` : '') +
        '<p class="sub">Automatisch gespeichert.</p>',
      options: [],
      closeLabel: `Tag ${this.state.day} beginnen`,
    });
  }

  gameOver(finalDebt: number): void {
    const s = this.state;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* storage may be unavailable */
    }
    sfx('walkout');
    this.ui.menu({
      title: 'GAME OVER',
      sub: `Tag ${s.day} · Schulden: ${formatMoney(finalDebt)}`,
      body:
        `<p>${esc(GAME_OVER_TEXT)}</p>` +
        `<p>Verkaufte Autos: <b>${s.stats.carsSold}</b> · Gesamtgewinn: <b>${formatMoney(s.stats.profit)}</b> · Imperium: <b>${Math.round(completion(s) * 100)}%</b></p>`,
      options: [],
      closeLabel: 'Neues Spiel',
      onClose: () => {
        if (this.state.over) this.startNew();
      },
    });
  }

  victory(): void {
    this.ui.menu({
      title: 'IMPERIUM KOMPLETT!',
      body:
        '<p>Jede Technik freigeschaltet, jedes Gebäude ausgebaut. Don Johnson fragt, ob er bei dir in die Lehre gehen darf.</p>' +
        `<p>Gesamtgewinn: <b>${formatMoney(this.state.stats.profit)}</b> · Verkaufte Autos: <b>${this.state.stats.carsSold}</b></p>` +
        '<p>Du kannst weiterspielen und deinen Gewinn maximieren.</p>',
      options: [],
      closeLabel: 'Weiter verkaufen',
    });
  }
}
