// Procedural top-down car sprites. The car faces up (front at y = 0).
import type { CarShape } from '../content/models';

export interface CarLookOpts {
  color: string;
  chrome?: boolean; // chrome rims
  leather?: boolean; // white seats visible in open tops
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Sprite size for a shape: body plus a pixel of wheel overhang each side and shadow. */
export function carSpriteSize(shape: CarShape): { w: number; h: number } {
  return { w: shape.width + 4, h: shape.length + 3 };
}

export function drawCar(ctx: CanvasRenderingContext2D, shape: CarShape, o: CarLookOpts): void {
  const { length: L, width: W } = shape;
  const ox = 2;
  const oy = 1;
  const body = o.color;
  const dark = shade(body, -0.35);
  const light = shade(body, 0.35);
  const glass = '#26345a';
  const glassHi = '#6fa8d8';

  // shadow
  ctx.fillStyle = 'rgba(10,0,30,0.35)';
  ctx.fillRect(ox + 1, oy + 2, W, L);

  // wheels
  const wheel = o.chrome ? '#e8e8f0' : '#141414';
  const wy = [Math.round(L * 0.18), Math.round(L * 0.72)];
  for (const y of wy) {
    ctx.fillStyle = '#141414';
    ctx.fillRect(ox - 1, oy + y, 2, 5);
    ctx.fillRect(ox + W - 1, oy + y, 2, 5);
    ctx.fillStyle = wheel;
    ctx.fillRect(ox - 1, oy + y + 2, 1, 1);
    ctx.fillRect(ox + W, oy + y + 2, 1, 1);
  }

  // body with tapered nose
  for (let y = 0; y < L; y++) {
    let inset = 0;
    if (y < shape.nose) inset = Math.ceil((shape.nose - y) * (shape.wedge ? 0.6 : 0.45));
    if (y === L - 1) inset = Math.max(inset, 1);
    ctx.fillStyle = body;
    ctx.fillRect(ox + inset, oy + y, W - inset * 2, 1);
    // side edge shading
    ctx.fillStyle = dark;
    ctx.fillRect(ox + inset, oy + y, 1, 1);
    ctx.fillRect(ox + W - inset - 1, oy + y, 1, 1);
  }
  // hood highlight
  ctx.fillStyle = light;
  ctx.fillRect(ox + Math.floor(W / 2) - 1, oy + Math.max(1, shape.nose - 1), 2, Math.max(2, shape.roofStart - shape.nose - 2));

  if (shape.wood) {
    ctx.fillStyle = '#7a4a22';
    ctx.fillRect(ox + 1, oy + shape.roofStart, 1, L - shape.roofStart - 2);
    ctx.fillRect(ox + W - 2, oy + shape.roofStart, 1, L - shape.roofStart - 2);
  }
  if (shape.stripes) {
    ctx.fillStyle = body === '#ffffff' || body === '#e8e8e8' ? '#1e3cd2' : '#f5f5f5';
    ctx.fillRect(ox + Math.floor(W / 2) - 2, oy + 1, 1, L - 2);
    ctx.fillRect(ox + Math.floor(W / 2) + 1, oy + 1, 1, L - 2);
  }
  if (shape.gullwing) {
    ctx.fillStyle = shade(body, 0.2);
    for (let x = ox + 2; x < ox + W - 2; x += 2) ctx.fillRect(x, oy + 2, 1, L - 4);
  }
  if (shape.vents) {
    ctx.fillStyle = '#141414';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(ox, oy + shape.roofStart + shape.roofLen - 2 + i * 2, 2, 1);
      ctx.fillRect(ox + W - 2, oy + shape.roofStart + shape.roofLen - 2 + i * 2, 2, 1);
    }
  }

  // cabin
  const rs = shape.roofStart;
  const rl = shape.roofLen;
  if (shape.openTop) {
    ctx.fillStyle = '#3a2a22';
    ctx.fillRect(ox + 2, oy + rs - 1, W - 4, rl + 2);
    ctx.fillStyle = o.leather ? '#f5f0e6' : '#7a5a44';
    ctx.fillRect(ox + 3, oy + rs + 1, 3, 3);
    ctx.fillRect(ox + W - 6, oy + rs + 1, 3, 3);
    ctx.fillRect(ox + 3, oy + rs + rl - 3, W - 6, 2);
    ctx.fillStyle = glass;
    ctx.fillRect(ox + 2, oy + rs - 2, W - 4, 1);
  } else {
    ctx.fillStyle = glass;
    ctx.fillRect(ox + 2, oy + rs - 2, W - 4, 3); // windshield
    ctx.fillRect(ox + 2, oy + rs + rl - 1, W - 4, 2); // rear window
    ctx.fillStyle = glassHi;
    ctx.fillRect(ox + 3, oy + rs - 2, 2, 1);
    ctx.fillStyle = shade(body, 0.12);
    ctx.fillRect(ox + 2, oy + rs + 1, W - 4, rl - 2); // roof
    ctx.fillStyle = glass;
    ctx.fillRect(ox + 1, oy + rs + 1, 1, rl - 2); // side windows
    ctx.fillRect(ox + W - 2, oy + rs + 1, 1, rl - 2);
  }

  // lights
  const fy = oy + Math.max(0, Math.ceil(shape.nose * 0.3));
  if (shape.popups) {
    ctx.fillStyle = dark;
    ctx.fillRect(ox + 2, fy + 1, 3, 1);
    ctx.fillRect(ox + W - 5, fy + 1, 3, 1);
  } else {
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(ox + 2, fy, 2, 1);
    ctx.fillRect(ox + W - 4, fy, 2, 1);
  }
  ctx.fillStyle = '#e8203c';
  ctx.fillRect(ox + 2, oy + L - 2, 3, 1);
  ctx.fillRect(ox + W - 5, oy + L - 2, 3, 1);

  if (shape.spoiler) {
    ctx.fillStyle = shade(body, -0.5);
    ctx.fillRect(ox - 1, oy + L - 4, W + 2, 2);
  }
}
