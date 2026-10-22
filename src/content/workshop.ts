// Repairs and upgrades that can be done on the workshop lift.

export type Component = 'motor' | 'karosserie' | 'innenraum' | 'reifen';

export const COMPONENTS: Component[] = ['motor', 'karosserie', 'innenraum', 'reifen'];

export const COMPONENT_LABEL: Record<Component, string> = {
  motor: 'Motor',
  karosserie: 'Karosserie',
  innenraum: 'Innenraum',
  reifen: 'Reifen',
};

/** How much each component weighs in the car's overall condition. */
export const COMPONENT_WEIGHT: Record<Component, number> = {
  motor: 0.4,
  karosserie: 0.3,
  innenraum: 0.15,
  reifen: 0.15,
};

/**
 * Repair cost per missing condition point, as a fraction of the model's base price,
 * and the work time in game minutes per missing point.
 */
export const REPAIR: Record<Component, { costPerPoint: number; minPerPoint: number; flatCost: number }> = {
  motor: { costPerPoint: 0.0016, minPerPoint: 1.6, flatCost: 60 },
  karosserie: { costPerPoint: 0.0012, minPerPoint: 1.2, flatCost: 40 },
  innenraum: { costPerPoint: 0.0007, minPerPoint: 0.8, flatCost: 25 },
  reifen: { costPerPoint: 0.0005, minPerPoint: 0.4, flatCost: 30 },
};

/** Taste tags that customers can like; upgrades carry them. */
export type Tag = 'neon' | 'sound' | 'speed' | 'protz' | 'komfort' | 'pastell' | 'chrom' | 'business';

export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  minutes: number;
  /** value added: fraction of base price plus a flat amount */
  valuePct: number;
  valueFlat: number;
  tags: Tag[];
  /** tech id that unlocks it; null = available from the start */
  tech: string | null;
  desc: string;
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'politur',
    name: 'Hochglanzpolitur',
    cost: 80,
    minutes: 40,
    valuePct: 0.02,
    valueFlat: 150,
    tags: ['protz'],
    tech: null,
    desc: 'Glänzt so sehr, dass Piloten die Landebahn verwechseln.',
  },
  {
    id: 'kassette',
    name: 'Kassettendeck mit Equalizer',
    cost: 350,
    minutes: 60,
    valuePct: 0.02,
    valueFlat: 600,
    tags: ['sound'],
    tech: null,
    desc: 'Mit Autoreverse! Kein Bleistift mehr nötig.',
  },
  {
    id: 'neon',
    name: 'Neon-Unterbodenbeleuchtung',
    cost: 600,
    minutes: 90,
    valuePct: 0.04,
    valueFlat: 900,
    tags: ['neon', 'protz'],
    tech: 'neon',
    desc: 'Pink. Natürlich pink.',
  },
  {
    id: 'pastell',
    name: 'Pastell-Lackierung',
    cost: 900,
    minutes: 150,
    valuePct: 0.06,
    valueFlat: 500,
    tags: ['pastell'],
    tech: 'lackiererei',
    desc: 'Flamingo-Rosa oder Lagunen-Türkis. Andere Farben sind 1986 verboten.',
  },
  {
    id: 'chromfelgen',
    name: 'Chromfelgen',
    cost: 800,
    minutes: 60,
    valuePct: 0.04,
    valueFlat: 700,
    tags: ['chrom', 'protz'],
    tech: 'chrom',
    desc: 'Man sieht sich darin. Und man sieht gut aus.',
  },
  {
    id: 'turbo',
    name: 'Turbolader',
    cost: 2200,
    minutes: 180,
    valuePct: 0.1,
    valueFlat: 1500,
    tags: ['speed'],
    tech: 'turbo',
    desc: 'Macht PSSSCHHH. Das ist das Wichtigste.',
  },
  {
    id: 'autotelefon',
    name: 'Autotelefon',
    cost: 1500,
    minutes: 60,
    valuePct: 0.04,
    valueFlat: 1800,
    tags: ['business', 'protz'],
    tech: 'elektronik',
    desc: 'Wiegt nur 4 Kilo. Reichweite: fast bis zur nächsten Ecke.',
  },
  {
    id: 'leder',
    name: 'Weiße Ledersitze',
    cost: 1200,
    minutes: 120,
    valuePct: 0.05,
    valueFlat: 800,
    tags: ['komfort', 'protz'],
    tech: 'sattlerei',
    desc: 'Im Sommer heiß wie die Hölle. Aber sooo stilvoll.',
  },
];

export const UPGRADE_BY_ID: Record<string, Upgrade> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
