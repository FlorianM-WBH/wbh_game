// Turns the procedural drawings into Phaser textures (cached by key).
import Phaser from 'phaser';
import { ARCHETYPE_BY_ID } from '../content/archetypes';
import { MODEL_BY_ID } from '../content/models';
import type { Car, Customer } from '../sim/state';
import { carSpriteSize, drawCar } from './carArt';
import { CHAR_H, CHAR_W, drawCharacter, type CharLook } from './charArt';
import { drawLot, drawPalm, type LotLook } from './lotArt';

export function carTextureKey(car: Car): string {
  const chrome = car.upgrades.includes('chromfelgen') ? 1 : 0;
  const leather = car.upgrades.includes('leder') ? 1 : 0;
  return `car_${car.modelId}_${car.color}_${chrome}${leather}`;
}

export function ensureCarTexture(scene: Phaser.Scene, car: Car): string {
  const key = carTextureKey(car);
  if (scene.textures.exists(key)) return key;
  const model = MODEL_BY_ID[car.modelId];
  const { w, h } = carSpriteSize(model.shape);
  const tex = scene.textures.createCanvas(key, w, h)!;
  drawCar(tex.getContext(), model.shape, {
    color: car.color,
    chrome: car.upgrades.includes('chromfelgen'),
    leather: car.upgrades.includes('leder'),
  });
  tex.refresh();
  return key;
}

/** Character texture with two frames: 0 = stand, 1 = step. */
export function ensureCharTexture(scene: Phaser.Scene, key: string, look: CharLook): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, CHAR_W * 2, CHAR_H)!;
  const ctx = tex.getContext();
  drawCharacter(ctx, look, 0, 0, 0);
  drawCharacter(ctx, look, CHAR_W, 0, 1);
  tex.add(0, 0, 0, 0, CHAR_W, CHAR_H);
  tex.add(1, 0, CHAR_W, 0, CHAR_W, CHAR_H);
  tex.refresh();
  return key;
}

/** Small local RNG so a customer's look depends only on their seed. */
function seeded(seed: number) {
  let r = seed | 0;
  return () => {
    r = (r + 0x6d2b79f5) | 0;
    let t = Math.imul(r ^ (r >>> 15), r | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function customerLook(c: Customer): CharLook {
  const a = ARCHETYPE_BY_ID[c.archetypeId];
  const rnd = seeded(c.lookSeed);
  const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  return {
    skin: pick(a.look.skin),
    hair: pick(a.look.hair),
    hairColor: pick(a.look.hairColor),
    top: pick(a.look.top),
    topColor: pick(a.look.topColor),
    pantsColor: pick(a.look.pantsColor),
    shades: rnd() < a.look.shades,
    innerColor: pick(['#3cd8c8', '#ff8fc8', '#ffd23c', '#a0e0ff']),
    chain: a.id === 'pate' || a.id === 'disco' || rnd() < 0.1,
  };
}

export function ensureCustomerTexture(scene: Phaser.Scene, c: Customer): string {
  return ensureCharTexture(scene, `cust_${c.id}`, customerLook(c));
}

export function makePalmTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('palm')) return;
  const tex = scene.textures.createCanvas('palm', 40, 44)!;
  drawPalm(tex.getContext(), 20, 42);
  tex.refresh();
}

export function drawLotTexture(scene: Phaser.Scene, look: LotLook): string {
  const key = 'lot';
  let tex = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
  if (!scene.textures.exists(key)) tex = scene.textures.createCanvas(key, 640, 360)!;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 640, 360);
  drawLot(ctx, look);
  tex.refresh();
  return key;
}

/** Round soft light (fades fully to zero inside the texture, so scaled copies have no edges). */
export function makeLightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('light')) return;
  const tex = scene.textures.createCanvas('light', 64, 64)!;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  tex.refresh();
}

/** Soft glow blob used for neon underglow and lights. */
export function makeGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('glow')) return;
  const tex = scene.textures.createCanvas('glow', 32, 48)!;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(16, 24, 2, 16, 24, 22);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 48);
  tex.refresh();
}
