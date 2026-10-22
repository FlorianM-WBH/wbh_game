// The dealership lot background: buildings, asphalt, street, beach.
import { drawPixelText, textWidth } from './font';
import { shade } from './carArt';
import { BUYIN_CAR, SLOTS, WORLD_H, WORLD_W } from '../scenes/layout';

export interface LotLook {
  slots: number;
  showroom: number;
  werkstatt: number;
  neonSign: boolean;
  deko: boolean;
  bar: boolean;
}

function noise(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[], density: number, seed: number) {
  let r = seed;
  const rnd = () => {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    return r / 0x7fffffff;
  };
  const n = Math.floor(w * h * density);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.fillRect(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), 1, 1);
  }
}

export function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // trunk (base at x,y)
  ctx.fillStyle = 'rgba(10,0,30,0.3)';
  ctx.fillRect(x - 6, y - 1, 14, 3);
  for (let i = 0; i < 26; i++) {
    const bend = Math.round(Math.sin(i / 9) * 3);
    ctx.fillStyle = i % 4 === 0 ? '#7a5030' : '#a0703c';
    ctx.fillRect(x - 1 + bend, y - i, 3, 1);
  }
  const tx = x + Math.round(Math.sin(25 / 9) * 3);
  const ty = y - 26;
  const leaf = (dx: number, dy: number, len: number) => {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      ctx.fillStyle = i % 3 === 0 ? '#1e8c4a' : '#2ab45a';
      ctx.fillRect(tx + Math.round(dx * i), ty + Math.round(dy * i + t * t * 6), 2, 2);
    }
  };
  leaf(1, -0.3, 11);
  leaf(-1, -0.3, 11);
  leaf(0.8, 0.3, 9);
  leaf(-0.8, 0.3, 9);
  leaf(0.2, -0.9, 6);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(tx - 1, ty, 2, 2);
  ctx.fillRect(tx + 1, ty + 1, 2, 2);
}

function drawFlamingo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#ff6fb4';
  ctx.fillRect(x, y - 10, 5, 3); // body
  ctx.fillRect(x + 4, y - 15, 1, 5); // neck
  ctx.fillRect(x + 4, y - 16, 3, 2); // head
  ctx.fillStyle = '#202020';
  ctx.fillRect(x + 7, y - 15, 1, 1);
  ctx.fillStyle = '#e04a8a';
  ctx.fillRect(x + 2, y - 7, 1, 7);
}

export function drawLot(ctx: CanvasRenderingContext2D, look: LotLook): void {
  // asphalt
  ctx.fillStyle = '#3d3550';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  noise(ctx, 0, 96, WORLD_W, 210, ['#463d5c', '#352e46', '#4a4060'], 0.12, 7);

  // ---------- buildings ----------
  // office / showroom (left)
  const wall = look.showroom >= 2 ? '#ff8fc8' : look.showroom === 1 ? '#ffa8c8' : '#f0c8b0';
  ctx.fillStyle = shade(wall, 0.3);
  ctx.fillRect(10, 14, 240, 18); // roof edge
  ctx.fillStyle = wall;
  ctx.fillRect(10, 32, 240, 64);
  ctx.fillStyle = shade(wall, -0.15);
  ctx.fillRect(10, 32, 240, 3);
  // windows: more glass with better showroom
  const glassTop = look.showroom >= 1 ? 40 : 46;
  ctx.fillStyle = '#5ad8e8';
  if (look.showroom >= 1) {
    ctx.fillRect(130, glassTop, 112, 52);
    ctx.fillStyle = '#8ef0ff';
    for (let i = 0; i < 6; i++) ctx.fillRect(136 + i * 18, glassTop + 2, 3, 48);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(130, glassTop, 112, 1);
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#5ad8e8';
      ctx.fillRect(138 + i * 36, 48, 26, 22);
      ctx.fillStyle = '#8ef0ff';
      ctx.fillRect(140 + i * 36, 50, 4, 18);
    }
  }
  // glass blocks next to the door
  ctx.fillStyle = '#c8f0ff';
  for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 3; gx++) ctx.fillRect(24 + gx * 5, 50 + gy * 5, 4, 4);
  // door
  ctx.fillStyle = '#2a1e3a';
  ctx.fillRect(82, 62, 20, 34);
  ctx.fillStyle = '#5ad8e8';
  ctx.fillRect(84, 64, 16, 20);
  ctx.fillStyle = '#ffd23c';
  ctx.fillRect(98, 80, 2, 2);
  drawPixelText(ctx, 'BÜRO', 80, 54, '#7a1e5a');
  // stripes
  ctx.fillStyle = '#3cd8c8';
  ctx.fillRect(10, 90, 240, 2);
  ctx.fillStyle = '#ffd23c';
  ctx.fillRect(10, 93, 240, 1);

  // sign on the roof
  if (look.neonSign) {
    const t = 'MIAMI MOTORS';
    const w = textWidth(t, 2);
    const sx = 130 - w / 2;
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(sx - 6, 17, w + 12, 16);
    drawPixelText(ctx, t, sx + 1, 21, '#a01e78', 2);
    drawPixelText(ctx, t, sx, 20, '#ff5ad8', 2);
  } else {
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(84, 19, 92, 12);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(84, 30, 92, 1);
    drawPixelText(ctx, 'MIAMI MOTORS', 95, 22, '#3a2a1a');
  }

  // workshop (middle)
  const wsWall = look.werkstatt >= 2 ? '#5ac8e8' : look.werkstatt === 1 ? '#8ad8d0' : '#a8b8b0';
  ctx.fillStyle = shade(wsWall, 0.3);
  ctx.fillRect(282, 18, 168, 14);
  ctx.fillStyle = wsWall;
  ctx.fillRect(282, 32, 168, 64);
  ctx.fillStyle = shade(wsWall, -0.2);
  ctx.fillRect(282, 32, 168, 3);
  // big open door with dark interior
  ctx.fillStyle = '#1e1a2a';
  ctx.fillRect(333, 40, 64, 56);
  ctx.fillStyle = '#2e2840';
  for (let i = 0; i < 4; i++) ctx.fillRect(333, 40 + i * 3, 64, 1); // rolled-up door
  // lift posts
  ctx.fillStyle = '#ffd23c';
  ctx.fillRect(345, 52, 3, 44);
  ctx.fillRect(382, 52, 3, 44);
  ctx.fillStyle = '#202020';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(345, 54 + i * 7, 3, 2);
    ctx.fillRect(382, 54 + i * 7, 3, 2);
  }
  // tool wall
  ctx.fillStyle = '#5a5060';
  ctx.fillRect(292, 50, 32, 28);
  ctx.fillStyle = '#c8c8d8';
  for (let i = 0; i < 5; i++) ctx.fillRect(295 + i * 6, 54, 2, 8 + (i % 2) * 4);
  ctx.fillStyle = '#e83c3c';
  ctx.fillRect(408, 70, 30, 24); // tool chest
  ctx.fillStyle = '#a01e1e';
  for (let i = 0; i < 4; i++) ctx.fillRect(408, 74 + i * 5, 30, 1);
  drawPixelText(ctx, look.werkstatt >= 2 ? 'TUNING' : 'WERKSTATT', look.werkstatt >= 2 ? 347 : 338, 22, '#1e3a5a');

  // right block: palms and the bar
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(460, 60, 180, 36);
  noise(ctx, 460, 60, 180, 36, ['#e8d8b0', '#fff2d8'], 0.2, 3);
  if (look.bar) {
    // tiki bar
    ctx.fillStyle = '#c89a4a';
    ctx.fillRect(560, 50, 60, 10);
    ctx.fillStyle = '#e8c070';
    for (let i = 0; i < 12; i++) ctx.fillRect(560 + i * 5, 58, 3, 4);
    ctx.fillStyle = '#7a4a22';
    ctx.fillRect(566, 62, 48, 26);
    ctx.fillStyle = '#ff5ad8';
    ctx.fillRect(566, 62, 48, 2);
    drawPixelText(ctx, 'BAR', 581, 70, '#ffd23c');
  } else {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(580, 64, 10, 22); // broken coffee machine
    ctx.fillStyle = '#505050';
    ctx.fillRect(582, 68, 6, 4);
  }

  // sidewalk in front of buildings
  ctx.fillStyle = '#e8d8e8';
  ctx.fillRect(0, 96, WORLD_W, 12);
  ctx.fillStyle = '#d0c0d8';
  for (let x = 0; x < WORLD_W; x += 12) ctx.fillRect(x, 96, 1, 12);
  ctx.fillRect(0, 107, WORLD_W, 1);

  // ---------- lot markings ----------
  for (let i = 0; i < SLOTS.length; i++) {
    const p = SLOTS[i];
    const open = i < look.slots;
    ctx.fillStyle = open ? '#f0f0f0' : '#5a5070';
    ctx.fillRect(p.x - 18, p.y - 18, 1, 36);
    ctx.fillRect(p.x + 18, p.y - 18, 1, 36);
    if (!open) {
      ctx.fillStyle = '#ff8c3c';
      ctx.fillRect(p.x - 2, p.y - 3, 5, 6); // cone
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - 2, p.y - 1, 5, 1);
    }
  }
  // lane arrow
  ctx.fillStyle = '#f0f0f0';
  for (let y = 230; y < 290; y += 10) ctx.fillRect(319, y, 2, 6);

  // buy-in zone
  const bx = BUYIN_CAR.x;
  const by = BUYIN_CAR.y;
  ctx.fillStyle = '#ffd23c';
  ctx.fillRect(bx - 24, by - 26, 48, 2);
  ctx.fillRect(bx - 24, by + 24, 48, 2);
  ctx.fillRect(bx - 24, by - 26, 2, 52);
  ctx.fillRect(bx + 22, by - 26, 2, 52);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#ffd23c' : '#1a1a1a';
    ctx.fillRect(bx - 22 + i * 6, by + 27, 6, 3);
  }
  ctx.fillStyle = '#1a0a2a';
  ctx.fillRect(bx - 22, by - 42, 46, 11);
  drawPixelText(ctx, 'ANKAUF', bx - 17, by - 39, '#3cf0e0');

  // ---------- street, beach, ocean ----------
  ctx.fillStyle = '#e8d8e8';
  ctx.fillRect(0, 290, WORLD_W, 10);
  ctx.fillStyle = '#c0a8c8';
  ctx.fillRect(0, 290, WORLD_W, 1);
  ctx.fillRect(0, 299, WORLD_W, 1);
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(0, 300, WORLD_W, 36);
  noise(ctx, 0, 300, WORLD_W, 36, ['#332c44', '#241f30'], 0.15, 11);
  ctx.fillStyle = '#ffd23c';
  for (let x = 0; x < WORLD_W; x += 24) ctx.fillRect(x, 317, 12, 2);
  // driveway into the lot
  ctx.fillStyle = '#3d3550';
  ctx.fillRect(290, 290, 60, 10);
  ctx.fillStyle = '#f5e2b0';
  ctx.fillRect(0, 336, WORLD_W, 8);
  noise(ctx, 0, 336, WORLD_W, 8, ['#e8d098', '#fff0c8'], 0.3, 5);
  ctx.fillStyle = '#2ac8d8';
  ctx.fillRect(0, 344, WORLD_W, 16);
  ctx.fillStyle = '#7af0f0';
  for (let x = 0; x < WORLD_W; x += 16) ctx.fillRect(x + ((x / 16) % 2) * 6, 345, 6, 1);
  ctx.fillStyle = '#1aa0c0';
  ctx.fillRect(0, 352, WORLD_W, 8);

  if (look.deko) {
    drawFlamingo(ctx, 262, 128);
    drawFlamingo(ctx, 274, 132);
    drawFlamingo(ctx, 500, 286);
    drawFlamingo(ctx, 6, 128);
  } else {
    ctx.fillStyle = '#3c8c3c';
    ctx.fillRect(268, 116, 3, 10); // sad cactus
    ctx.fillRect(266, 119, 2, 1);
    ctx.fillStyle = '#a05a3a';
    ctx.fillRect(266, 125, 7, 4);
  }
}
