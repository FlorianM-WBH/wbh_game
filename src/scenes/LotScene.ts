// The dealership lot: player movement, NPCs, cars, and the link to the App's menus.
import Phaser from 'phaser';
import type { App, SceneHooks, Target } from '../app';
import { MODELS, MODEL_BY_ID } from '../content/models';
import { CHAR_H, PLAYER_LOOK } from '../art/charArt';
import {
  drawLotTexture,
  ensureCarTexture,
  ensureCharTexture,
  ensureCustomerTexture,
  makeGlowTexture,
  makePalmTexture,
} from '../art/textures';
import { lotCapacity } from '../sim/economy';
import { buildingLevel, carById, customerById, type Car, type SimEvent } from '../sim/state';
import {
  AISLE_Y,
  BUYIN_CAR,
  BUYIN_SELLER,
  ENTRANCE,
  LIFT_CAR,
  PALMS,
  PLAYER_START,
  SIDEWALK_Y,
  SLOTS,
  STATIC_COLLIDERS,
  STATIONS,
  WAIT_SPOTS,
  WORLD_H,
  WORLD_W,
  type Pt,
  type Rect,
  type StationId,
} from './layout';

const PLAYER_SPEED = 90;
const NPC_SPEED = 45;
const CAR_SPEED = 140;
const REACH = 18;

interface CarView {
  spr: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image | null;
  texKey: string;
  moving: boolean;
}

interface NpcView {
  spr: Phaser.GameObjects.Sprite;
  path: Pt[];
  leaving: boolean;
  visible: boolean;
  animT: number;
  /** hidden seller waiting for this car to park */
  carId?: number | null;
}

export class LotScene extends Phaser.Scene implements SceneHooks {
  private app!: App;
  private player!: Phaser.GameObjects.Sprite;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'e' | 'space', Phaser.Input.Keyboard.Key>;
  private cars = new Map<number, CarView>();
  private npcs = new Map<number, NpcView>();
  private ghosts: NpcView[] = [];
  private tint!: Phaser.GameObjects.Rectangle;
  private sparks!: Phaser.GameObjects.Graphics;
  private walkT = 0;
  private target: Target | null = null;
  private lastLook = '';
  /** set on key-down so even very short taps register */
  private actPressed = false;

  constructor() {
    super('lot');
  }

  init(data: { app: App }): void {
    this.app = data.app;
  }

  create(): void {
    makePalmTexture(this);
    makeGlowTexture(this);
    ensureCharTexture(this, 'player', PLAYER_LOOK);
    this.redrawLot();
    this.add.image(0, 0, 'lot').setOrigin(0).setDepth(-1000);
    for (const p of PALMS) this.add.image(p.x, p.y, 'palm').setOrigin(0.5, 1).setDepth(p.y);

    this.player = this.add.sprite(PLAYER_START.x, PLAYER_START.y, 'player', 0).setOrigin(0.5, 1);
    this.sparks = this.add.graphics().setDepth(5000);
    this.tint = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0xff6a3c, 0).setOrigin(0).setDepth(9000);

    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey(K.UP, false),
      down: kb.addKey(K.DOWN, false),
      left: kb.addKey(K.LEFT, false),
      right: kb.addKey(K.RIGHT, false),
      w: kb.addKey(K.W, false),
      a: kb.addKey(K.A, false),
      s: kb.addKey(K.S, false),
      d: kb.addKey(K.D, false),
      e: kb.addKey(K.E, false),
      space: kb.addKey(K.SPACE, false),
    };

    const onAct = (_k: unknown, e: KeyboardEvent) => {
      if (!e.repeat) this.actPressed = true;
    };
    this.keys.e.on('down', onAct);
    this.keys.space.on('down', onAct);

    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.spawnTraffic() });
    this.app.attachScene(this);
    this.rebuildAll();
    this.game.events.emit('lot-ready');
  }

  // ---------- building the view from state ----------

  private lotLookKey(): string {
    const s = this.app.state;
    return JSON.stringify([lotCapacity(s), s.buildings]);
  }

  private redrawLot(): void {
    const s = this.app.state;
    drawLotTexture(this, {
      slots: lotCapacity(s),
      showroom: buildingLevel(s, 'showroom'),
      werkstatt: buildingLevel(s, 'werkstatt'),
      neonSign: buildingLevel(s, 'neonschild') > 0,
      deko: buildingLevel(s, 'deko') > 0,
      bar: buildingLevel(s, 'kaffeebar') > 0,
    });
    this.lastLook = this.lotLookKey();
  }

  rebuildAll(): void {
    if (!this.player) return;
    this.redrawLot();
    for (const v of this.cars.values()) {
      v.spr.destroy();
      v.glow?.destroy();
    }
    this.cars.clear();
    for (const v of [...this.npcs.values(), ...this.ghosts]) v.spr.destroy();
    this.npcs.clear();
    this.ghosts = [];
    const s = this.app.state;
    for (const car of s.cars) this.addCarView(car, this.carHome(car));
    for (const c of s.customers) {
      const v = this.addNpc(c.id, this.npcHome(c.id));
      v.path = [];
    }
    this.player.setPosition(PLAYER_START.x, PLAYER_START.y);
  }

  private carHome(car: Car): { p: Pt; angle: number } {
    if (car.loc.kind === 'lot') {
      const p = SLOTS[car.loc.slot];
      return { p, angle: car.loc.slot >= 6 ? 180 : 0 };
    }
    if (car.loc.kind === 'lift') return { p: LIFT_CAR, angle: 0 };
    return { p: BUYIN_CAR, angle: 0 };
  }

  private npcHome(customerId: number): Pt {
    const c = customerById(this.app.state, customerId);
    if (!c || c.spot < 0) return BUYIN_SELLER;
    return WAIT_SPOTS[c.spot];
  }

  private addCarView(car: Car, at: { p: Pt; angle: number }): CarView {
    const key = ensureCarTexture(this, car);
    const spr = this.add.image(at.p.x, at.p.y, key).setAngle(at.angle);
    const v: CarView = { spr, glow: null, texKey: key, moving: false };
    this.cars.set(car.id, v);
    this.refreshCar(car);
    return v;
  }

  private refreshCar(car: Car): void {
    const v = this.cars.get(car.id);
    if (!v) return;
    const key = ensureCarTexture(this, car);
    if (key !== v.texKey) {
      v.spr.setTexture(key);
      v.texKey = key;
    }
    const neon = car.upgrades.includes('neon');
    if (neon && !v.glow) {
      v.glow = this.add.image(v.spr.x, v.spr.y, 'glow').setTint(0xff3cc8).setBlendMode(Phaser.BlendModes.ADD);
    } else if (!neon && v.glow) {
      v.glow.destroy();
      v.glow = null;
    }
  }

  private addNpc(customerId: number, at: Pt): NpcView {
    const c = customerById(this.app.state, customerId)!;
    const key = ensureCustomerTexture(this, c);
    const spr = this.add.sprite(at.x, at.y, key, 0).setOrigin(0.5, 1);
    const v: NpcView = { spr, path: [], leaving: false, visible: true, animT: 0 };
    this.npcs.set(customerId, v);
    return v;
  }

  // ---------- events from the sim ----------

  onEvents(events: SimEvent[]): void {
    const s = this.app.state;
    for (const e of events) {
      switch (e.type) {
        case 'carAdded': {
          const car = carById(s, e.carId);
          if (!car) break;
          const v = this.addCarView(car, { p: { x: -40, y: 310 }, angle: 90 });
          const home = this.carHome(car);
          this.drive(v, [{ x: ENTRANCE.x, y: 310 }, { x: ENTRANCE.x, y: AISLE_Y }, { x: home.p.x, y: AISLE_Y }, home.p]);
          break;
        }
        case 'carMoved': {
          const car = carById(s, e.carId);
          const v = this.cars.get(e.carId);
          if (!car || !v) break;
          const home = this.carHome(car);
          this.drive(v, [{ x: v.spr.x, y: AISLE_Y }, { x: home.p.x, y: AISLE_Y }, home.p], () => {
            if (car.loc.kind === 'lot') v.spr.setAngle(home.angle);
          });
          break;
        }
        case 'carRemoved': {
          const v = this.cars.get(e.carId);
          if (!v) break;
          this.cars.delete(e.carId);
          const dir = Math.random() < 0.5 ? -60 : WORLD_W + 60;
          this.drive(v, [{ x: v.spr.x, y: AISLE_Y }, { x: ENTRANCE.x, y: AISLE_Y }, { x: ENTRANCE.x, y: 326 }, { x: dir, y: 326 }], () => {
            v.spr.destroy();
            v.glow?.destroy();
          });
          break;
        }
        case 'jobDone': {
          const car = carById(s, e.carId);
          if (car) this.refreshCar(car);
          break;
        }
        case 'customerArrived': {
          const c = customerById(s, e.customerId);
          if (!c) break;
          const home = this.npcHome(c.id);
          if (c.intent === 'sell') {
            // the seller gets out of their car once it is parked
            // the seller gets out once their car is parked (see updateNpcs)
            const v = this.addNpc(c.id, { x: BUYIN_CAR.x + 12, y: BUYIN_CAR.y + 4 });
            v.spr.setVisible(false);
            v.visible = false;
            v.carId = c.carId;
            v.path = [home];
          } else {
            const side = Math.random() < 0.5 ? -10 : WORLD_W + 10;
            const v = this.addNpc(c.id, { x: side, y: SIDEWALK_Y });
            v.path = [ENTRANCE, { x: ENTRANCE.x, y: AISLE_Y }, { x: home.x, y: AISLE_Y }, home];
          }
          break;
        }
        case 'customerLeft': {
          const v = this.npcs.get(e.customerId);
          if (!v) break;
          this.npcs.delete(e.customerId);
          v.leaving = true;
          v.spr.setVisible(true);
          const from = { x: v.spr.x, y: v.spr.y };
          const side = Math.random() < 0.5 ? -10 : WORLD_W + 10;
          v.path = [{ x: from.x, y: AISLE_Y }, { x: ENTRANCE.x, y: AISLE_Y }, ENTRANCE, { x: side, y: SIDEWALK_Y }];
          this.ghosts.push(v);
          this.app.ui.setBubble(`c${e.customerId}`, null);
          break;
        }
        default:
          break;
      }
    }
    if (this.lotLookKey() !== this.lastLook) this.redrawLot();
  }

  /** Drive a car sprite along waypoints, turning to face each segment. */
  private drive(v: CarView, pts: Pt[], done?: () => void): void {
    v.moving = true;
    const path = pts.filter((p, i) => {
      const prev = i === 0 ? { x: v.spr.x, y: v.spr.y } : pts[i - 1];
      return Math.hypot(p.x - prev.x, p.y - prev.y) > 0.5;
    });
    const next = (i: number) => {
      if (i >= path.length) {
        v.moving = false;
        done?.();
        return;
      }
      const p = path[i];
      const dx = p.x - v.spr.x;
      const dy = p.y - v.spr.y;
      v.spr.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90);
      this.tweens.add({
        targets: v.spr,
        x: p.x,
        y: p.y,
        duration: (Math.hypot(dx, dy) / CAR_SPEED) * 1000,
        onComplete: () => next(i + 1),
      });
    };
    this.tweens.killTweensOf(v.spr);
    next(0);
  }

  private spawnTraffic(): void {
    const model = MODELS[Math.floor(Math.random() * MODELS.length)];
    const fake: Car = {
      id: -1,
      modelId: model.id,
      color: model.colors[Math.floor(Math.random() * model.colors.length)],
      cond: { motor: 100, karosserie: 100, innenraum: 100, reifen: 100 },
      upgrades: [],
      invested: 0,
      loc: { kind: 'lot', slot: 0 },
    };
    const right = Math.random() < 0.5;
    const y = right ? 326 : 310;
    const spr = this.add
      .image(right ? -30 : WORLD_W + 30, y, ensureCarTexture(this, fake))
      .setAngle(right ? 90 : -90)
      .setDepth(y);
    this.tweens.add({
      targets: spr,
      x: right ? WORLD_W + 30 : -30,
      duration: 3000 + Math.random() * 2500,
      onComplete: () => spr.destroy(),
    });
  }

  // ---------- per frame ----------

  private colliders(): Rect[] {
    const out: Rect[] = [...STATIC_COLLIDERS];
    for (const p of PALMS) out.push({ x: p.x - 2, y: p.y - 3, w: 5, h: 3 });
    for (const [id, v] of this.cars) {
      const car = carById(this.app.state, id);
      if (!car || car.loc.kind === 'lift') continue;
      const sh = MODEL_BY_ID[car.modelId].shape;
      out.push({ x: v.spr.x - sh.width / 2 - 1, y: v.spr.y - sh.length / 2, w: sh.width + 2, h: sh.length });
    }
    return out;
  }

  private blocked(x: number, y: number, rects: Rect[]): boolean {
    const fx = x - 4;
    const fy = y - 3;
    if (fx < 2 || fx + 8 > WORLD_W - 2) return true;
    return rects.some((r) => fx < r.x + r.w && fx + 8 > r.x && fy < r.y + r.h && fy + 3 > r.y);
  }

  update(_time: number, dtMs: number): void {
    const dt = Math.min(dtMs, 100) / 1000;
    const ui = this.app.ui;
    const free = this.app.started && !ui.isOpen;

    // movement
    let mx = 0;
    let my = 0;
    if (free) {
      const k = this.keys;
      if (k.left.isDown || k.a.isDown) mx -= 1;
      if (k.right.isDown || k.d.isDown) mx += 1;
      if (k.up.isDown || k.w.isDown) my -= 1;
      if (k.down.isDown || k.s.isDown) my += 1;
    }
    if (mx || my) {
      const len = Math.hypot(mx, my);
      const rects = this.colliders();
      const nx = this.player.x + (mx / len) * PLAYER_SPEED * dt;
      const ny = this.player.y + (my / len) * PLAYER_SPEED * dt;
      if (!this.blocked(nx, this.player.y, rects)) this.player.x = nx;
      if (!this.blocked(this.player.x, ny, rects)) this.player.y = ny;
      if (mx) this.player.setFlipX(mx < 0);
      this.walkT += dt;
      this.player.setFrame(Math.floor(this.walkT * 7) % 2);
    } else {
      this.player.setFrame(0);
    }
    this.player.setDepth(this.player.y);

    // interaction
    this.target = free ? this.findTarget() : null;
    const act = this.keys.e.isDown || this.keys.space.isDown;
    const justAct = this.actPressed;
    this.actPressed = false;
    const atLift = this.target?.kind === 'station' && this.target.id === 'lift';
    this.app.helping = free && atLift && act && !!this.app.state.lift.job;
    if (justAct && this.target && !(atLift && this.app.state.lift.job)) this.app.interact(this.target);

    this.app.update(dtMs);
    this.updateNpcs(dt);
    this.updateCars();
    this.updateOverlay();
  }

  private findTarget(): Target | null {
    const px = this.player.x;
    const py = this.player.y;
    let best: Target | null = null;
    let bestD = REACH;
    for (const id of Object.keys(STATIONS) as StationId[]) {
      const st = STATIONS[id];
      const d = Math.hypot(st.x - px, st.y - py);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'station', id };
      }
    }
    for (const [id, v] of this.npcs) {
      if (!v.visible || v.path.length) continue;
      const d = Math.hypot(v.spr.x - px, v.spr.y - py);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'customer', customerId: id };
      }
    }
    for (const [id, v] of this.cars) {
      const car = carById(this.app.state, id);
      if (!car || v.moving || car.loc.kind === 'lift') continue;
      const sh = MODEL_BY_ID[car.modelId].shape;
      const dx = Math.max(0, Math.abs(v.spr.x - px) - sh.width / 2);
      const dy = Math.max(0, Math.abs(v.spr.y - (py - 2)) - sh.length / 2);
      const d = Math.hypot(dx, dy) + 6; // people beat cars when equally close
      if (d < bestD) {
        bestD = d;
        best = { kind: 'car', carId: id };
      }
    }
    return best;
  }

  private updateNpcs(dt: number): void {
    const step = (v: NpcView): boolean => {
      if (!v.visible) {
        const car = v.carId != null ? this.cars.get(v.carId) : undefined;
        if (car && car.moving) return false;
        v.visible = true;
        v.spr.setVisible(true);
      }
      if (!v.path.length) {
        v.spr.setFrame(0);
        return false;
      }
      const p = v.path[0];
      const dx = p.x - v.spr.x;
      const dy = p.y - v.spr.y;
      const d = Math.hypot(dx, dy);
      const m = NPC_SPEED * dt;
      if (d <= m) {
        v.spr.setPosition(p.x, p.y);
        v.path.shift();
      } else {
        v.spr.x += (dx / d) * m;
        v.spr.y += (dy / d) * m;
      }
      if (Math.abs(dx) > 0.5) v.spr.setFlipX(dx < 0);
      v.animT += dt;
      v.spr.setFrame(Math.floor(v.animT * 6) % 2);
      return true;
    };
    for (const v of this.npcs.values()) {
      step(v);
      v.spr.setDepth(v.spr.y);
    }
    this.ghosts = this.ghosts.filter((v) => {
      const moving = step(v);
      v.spr.setDepth(v.spr.y);
      if (!moving) {
        v.spr.destroy();
        return false;
      }
      return true;
    });
  }

  private updateCars(): void {
    const t = this.time.now / 1000;
    for (const [id, v] of this.cars) {
      const car = carById(this.app.state, id);
      const len = car ? MODEL_BY_ID[car.modelId].shape.length : 30;
      v.spr.setDepth(car?.loc.kind === 'lift' ? 50 : v.spr.y + len / 2);
      if (v.glow) {
        v.glow.setPosition(v.spr.x, v.spr.y).setAngle(v.spr.angle);
        v.glow.setDepth(v.spr.depth - 0.5).setAlpha(0.55 + 0.25 * Math.sin(t * 3 + id));
      }
    }
    // welding sparks while a job runs
    this.sparks.clear();
    if (this.app.state.lift.job && this.app.started && !this.app.ui.isOpen) {
      const n = this.app.helping ? 8 : 3;
      for (let i = 0; i < n; i++) {
        this.sparks.fillStyle(Math.random() < 0.5 ? 0xffe03c : 0xffffff, 1);
        this.sparks.fillRect(LIFT_CAR.x - 10 + Math.random() * 20, LIFT_CAR.y - 8 + Math.random() * 24, 1, 1);
      }
    }
  }

  private updateOverlay(): void {
    const s = this.app.state;
    const ui = this.app.ui;
    // evening light
    const m = s.minute;
    let color = 0xff6a3c;
    let a = 0;
    if (m > 16 * 60) a = Math.min(0.22, ((m - 16 * 60) / 120) * 0.22);
    if (m > 18 * 60) {
      color = 0x5a1a8a;
      a = Math.min(0.38, 0.22 + ((m - 18 * 60) / 120) * 0.16);
    }
    this.tint.setFillStyle(color, a);

    const canvas = this.game.canvas;
    const frame = canvas.parentElement!.parentElement!;
    const cr = canvas.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    const k = cr.width / WORLD_W;
    const toScreen = (x: number, y: number) => ({ x: cr.left - fr.left + x * k, y: cr.top - fr.top + y * k });

    // prompt
    if (this.target) {
      const p = this.targetPoint(this.target);
      const sp = toScreen(p.x, p.y);
      ui.setPrompt(this.app.promptFor(this.target), sp.x, sp.y);
    } else ui.setPrompt(null);

    // bubbles over customers
    for (const [id, v] of this.npcs) {
      const c = customerById(s, id);
      const show = c && v.visible && !v.path.length && !ui.isOpen && !(this.target?.kind === 'customer' && this.target.customerId === id);
      if (!show) {
        ui.setBubble(`c${id}`, null);
        continue;
      }
      const sp = toScreen(v.spr.x, v.spr.y - CHAR_H - 1);
      const text = c.waitLeft < 30 ? 'Wird ungeduldig!' : c.intent === 'buy' ? 'Will kaufen' : 'Verkauft Auto';
      ui.setBubble(`c${id}`, text, sp.x, sp.y);
    }
    this.renderHud();
  }

  private targetPoint(t: Target): Pt {
    if (t.kind === 'station') {
      const st = STATIONS[t.id];
      return { x: st.x, y: st.y - 14 };
    }
    if (t.kind === 'customer') {
      const v = this.npcs.get(t.customerId);
      return v ? { x: v.spr.x, y: v.spr.y - CHAR_H - 2 } : { x: 0, y: 0 };
    }
    const v = this.cars.get(t.carId);
    const car = carById(this.app.state, t.carId);
    const len = car ? MODEL_BY_ID[car.modelId].shape.length : 30;
    return v ? { x: v.spr.x, y: v.spr.y - len / 2 - 2 } : { x: 0, y: 0 };
  }

  private renderHud(): void {
    this.app.renderHud();
  }
}
