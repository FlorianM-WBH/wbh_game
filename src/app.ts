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
import { buyBuilding, buyTech, completion, nextBuildingCost, techState } from './sim/progression';
import { buildingLevel, carById, customerById, drainEvents, formatMoney, formatTime, hasTech, type GameState, type SimEvent } from './sim/state';
import { availableUpgrades, liftCar, putOnLift, startRepair, startUpgrade, takeOffLift, type ActionResult } from './sim/workshop';
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
        '<p><b>Kaufe</b> Autos von Verkäufern an der <span class="tag">ANKAUF</span>-Zone, <b>repariere und tune</b> sie an der Hebebühne und <b>verkaufe</b> sie teuer an Kunden auf dem Hof.</p>' +
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
    tick(this.state, minutes, { workBoost: this.helping && this.state.lift.job ? WORK_BOOST : 1 });
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
      if (t.id === 'lift') {
        const job = s.lift.job;
        if (job) return `Hebebühne – mit anpacken (halten): ${Math.round(100 - (job.minutesLeft / job.total) * 100)}%`;
        return 'Hebebühne';
      }
      return t.id === 'office' ? 'Büro' : 'Computer: Technologie';
    }
    if (t.kind === 'car') {
      const car = carById(s, t.carId);
      return car ? `${MODEL_BY_ID[car.modelId].name} ansehen` : '';
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
      else this.liftMenu();
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
        `</table>`,
      options: [
        { label: 'Firma ausbauen', desc: 'Parkplatz, Showroom, Werkstatt, Deko…', action: () => this.buildingMenu() },
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

  // ---------- computer ----------

  techMenu(): void {
    const s = this.state;
    const branchLabel = { werkstatt: 'Werkstatt', tuning: 'Tuning', verkauf: 'Verkauf', marketing: 'Marketing' };
    const options: MenuOption[] = TECHS.map((t) => {
      const st = techState(s, t.id);
      return {
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
      };
    });
    this.ui.menu({
      title: 'Commodore-Computer 64K',
      sub: `READY. Kontostand: ${formatMoney(s.money)} · ${s.techs.length}/${TECHS.length} freigeschaltet`,
      options,
    });
  }

  // ---------- workshop ----------

  liftMenu(): void {
    const s = this.state;
    const car = liftCar(s);
    if (!car) {
      const cars = lotCars(s);
      this.ui.menu({
        title: 'Hebebühne',
        sub: 'Die Hebebühne ist leer. Welchen Wagen holen wir rein?',
        options: cars.map((c) => ({
          label: MODEL_BY_ID[c.modelId].name,
          desc: `Zustand: ${Math.round(COMPONENTS.reduce((a, k) => a + c.cond[k], 0) / 4)}% · Wert ${formatMoney(marketValue(c))}`,
          action: () => {
            if (this.result(putOnLift(s, c.id))) {
              this.flush();
              this.liftMenu();
            }
          },
        })),
      });
      return;
    }
    const model = MODEL_BY_ID[car.modelId];
    const job = s.lift.job;
    const head =
      `<p><b>${esc(model.name)}</b> · Wert jetzt: <b>${formatMoney(marketValue(car))}</b> · investiert: ${formatMoney(car.invested)}</p>` +
      `<p>${conditionHtml(s, car, true)}</p>` +
      (car.upgrades.length ? `<p>Extras: ${car.upgrades.map((u) => `<span class="tag">${esc(UPGRADE_BY_ID[u].name)}</span>`).join('')}</p>` : '');
    if (job) {
      const label = job.kind === 'repair' ? COMPONENT_LABEL[job.target as keyof typeof COMPONENT_LABEL] : UPGRADE_BY_ID[job.target].name;
      const pct = Math.round(100 - (job.minutesLeft / job.total) * 100);
      this.ui.menu({
        title: 'Hebebühne',
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
          if (this.result(startRepair(s, comp))) this.ui.close();
        },
      });
    }
    for (const u of availableUpgrades(s)) {
      const q = upgradeQuote(s, u.id);
      options.push({
        label: `Einbauen: ${u.name}`,
        desc: `${u.desc} (${q.minutes} Min.)`,
        right: formatMoney(q.cost),
        disabled: q.cost > s.money,
        action: () => {
          if (this.result(startUpgrade(s, u.id))) this.ui.close();
        },
      });
    }
    const locked = UPGRADES.filter((u) => u.tech && !hasTech(s, u.tech)).length;
    options.push({
      label: 'Zurück auf den Hof stellen',
      disabled: freeSlot(s) === null,
      desc: freeSlot(s) === null ? 'Kein freier Stellplatz!' : undefined,
      action: () => {
        if (this.result(takeOffLift(s))) {
          this.flush();
          this.ui.close();
        }
      },
    });
    this.ui.menu({
      title: 'Hebebühne',
      body: head + (locked ? `<p class="sub">${locked} weitere Extras lassen sich am Computer freischalten.</p>` : ''),
      options,
    });
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
        disabled: s.lift.carId != null,
        desc: s.lift.carId != null ? 'Die Hebebühne ist belegt.' : 'Stellt den Wagen auf die Hebebühne.',
        action: () => {
          if (this.result(putOnLift(s, car.id))) {
            this.flush();
            this.ui.close();
          }
        },
      });
    }
    const seller = s.customers.find((c) => c.carId === car.id);
    this.ui.menu({
      title: model.name,
      sub: `${CLASS_LABEL[model.cls]} · ${model.blurb}`,
      body:
        `<p>${conditionHtml(s, car, onLot || hasTech(s, 'gutachter'))}</p>` +
        (onLot
          ? `<p>Marktwert: <b>${formatMoney(marketValue(car))}</b> · investiert: <b>${formatMoney(car.invested)}</b></p>`
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
      desc: `Wert ${formatMoney(marketValue(car))} · investiert ${formatMoney(car.invested)}`,
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
    const job = s.lift.job;
    const jobHtml = job
      ? `<span class="job">Werkstatt <span class="bar"><i style="width:${Math.round(100 - (job.minutesLeft / job.total) * 100)}%"></i></span></span>`
      : s.lift.carId != null
        ? '<span class="job">Werkstatt: bereit</span>'
        : '';
    const html =
      `<span class="money ${s.money < 0 ? 'neg' : ''}">${formatMoney(s.money)}</span>` +
      `<span>Tag ${s.day}</span><span class="clock">${formatTime(s.minute)}</span>` +
      `<span>Autos ${lotCars(s).length}/${lotCapacity(s)}</span>` +
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
        `</table>` +
        (this.state.money < 0 ? '<p class="bad">Du bist im Minus! Der Kredithai lässt grüßen. Verkauf schnell ein paar Autos.</p>' : '') +
        '<p class="sub">Automatisch gespeichert.</p>',
      options: [],
      closeLabel: `Tag ${this.state.day} beginnen`,
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
