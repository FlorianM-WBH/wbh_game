// World layout in art pixels (game resolution 640x360).

export const WORLD_W = 640;
export const WORLD_H = 360;

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Centres of the 10 parking slots, in unlock order. */
export const SLOTS: Pt[] = [
  { x: 40, y: 152 },
  { x: 80, y: 152 },
  { x: 120, y: 152 },
  { x: 160, y: 152 },
  { x: 200, y: 152 },
  { x: 240, y: 152 },
  { x: 40, y: 236 },
  { x: 80, y: 236 },
  { x: 120, y: 236 },
  { x: 160, y: 236 },
];

/** Where waiting buyers stand (aisle between the rows). */
export const WAIT_SPOTS: Pt[] = [
  { x: 62, y: 196 },
  { x: 142, y: 200 },
  { x: 222, y: 194 },
  { x: 200, y: 232 },
];

export const BUYIN_CAR: Pt = { x: 440, y: 160 };
export const BUYIN_SELLER: Pt = { x: 470, y: 196 };
export const LIFT_CAR: Pt = { x: 365, y: 70 };
/** Driveway into the lot; pedestrians arrive along the sidewalk from either side. */
export const ENTRANCE: Pt = { x: 320, y: 295 };
export const SIDEWALK_Y = 295;
export const AISLE_Y = 198;

export const BUILDING_FRONT_Y = 96;
export const SIDEWALK_BOTTOM = 300;

export type StationId = 'office' | 'computer' | 'lift';

export const STATIONS: Record<StationId, Pt & { label: string }> = {
  office: { x: 92, y: 104, label: 'Büro' },
  computer: { x: 196, y: 104, label: 'Computer (Technologie)' },
  lift: { x: 365, y: 104, label: 'Hebebühne' },
};

export const PLAYER_START: Pt = { x: 300, y: 120 };

/** Static obstacles (feet collide, so rects are around the ground footprint). */
export const STATIC_COLLIDERS: Rect[] = [
  { x: 0, y: 0, w: WORLD_W, h: BUILDING_FRONT_Y + 2 }, // building row
  { x: 0, y: SIDEWALK_BOTTOM, w: WORLD_W, h: WORLD_H - SIDEWALK_BOTTOM }, // street
  { x: 187, y: 97, w: 18, h: 4 }, // computer kiosk
];

export const PALMS: Pt[] = [
  { x: 14, y: 292 },
  { x: 120, y: 296 },
  { x: 228, y: 292 },
  { x: 418, y: 296 },
  { x: 530, y: 292 },
  { x: 626, y: 296 },
  { x: 600, y: 140 },
  { x: 520, y: 118 },
];
