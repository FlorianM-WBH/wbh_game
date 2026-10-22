// Car models: affectionate parodies of 80s cars (no real brand names).
// Prices are US dollars in "Miami 1986" money.

export type CarClass = 'schrott' | 'alltag' | 'familie' | 'sport' | 'luxus' | 'exot';

export const CLASS_LABEL: Record<CarClass, string> = {
  schrott: 'Rostlaube',
  alltag: 'Alltagsauto',
  familie: 'Familienkutsche',
  sport: 'Sportwagen',
  luxus: 'Luxusschlitten',
  exot: 'Supersportler',
};

/** Shape parameters for the procedural top-down car sprite (in art pixels). */
export interface CarShape {
  length: number; // body length (vertical, sprite faces up)
  width: number;
  nose: number; // how pointy the front is (0 = boxy)
  roofStart: number; // where the cabin starts, from the front
  roofLen: number;
  wedge?: boolean; // wedge supercar: long low nose, short cabin
  popups?: boolean; // pop-up headlights
  spoiler?: boolean; // rear wing
  stripes?: boolean; // racing stripes
  wood?: boolean; // wood panel sides
  openTop?: boolean; // jeep / convertible
  gullwing?: boolean; // stainless steel look
  vents?: boolean; // side strakes
}

export interface CarModel {
  id: string;
  name: string;
  cls: CarClass;
  basePrice: number; // market value at 100% condition, no upgrades
  colors: string[];
  shape: CarShape;
  blurb: string;
}

export const MODELS: CarModel[] = [
  {
    id: 'trabbo',
    name: 'Trabbo 601 "Rennpappe"',
    cls: 'schrott',
    basePrice: 1200,
    colors: ['#9fb8a0', '#d8cfa8', '#7aa7c7'],
    shape: { length: 22, width: 12, nose: 1, roofStart: 7, roofLen: 9 },
    blurb: 'Aus Pappe und Hoffnung gebaut. Importiert von einem sehr verwirrten Onkel.',
  },
  {
    id: 'golfo',
    name: 'Golfo GTI',
    cls: 'alltag',
    basePrice: 6500,
    colors: ['#e8e8e8', '#d23c3c', '#222222', '#3c6fd2'],
    shape: { length: 24, width: 13, nose: 1, roofStart: 8, roofLen: 10, stripes: true },
    blurb: 'Der Kompaktsportler für Yuppies mit kleinem Budget und großem Ego.',
  },
  {
    id: 'kombi',
    name: 'Holzklasse Country Kombi',
    cls: 'familie',
    basePrice: 7500,
    colors: ['#c9b48a', '#7c8f5c', '#a05a3c'],
    shape: { length: 30, width: 14, nose: 2, roofStart: 9, roofLen: 17, wood: true },
    blurb: 'Holzoptik, acht Sitze, null Coolness. Perfekt für Zahnärzte aus Ohio.',
  },
  {
    id: 'jeepo',
    name: 'Jeepo Wrangla',
    cls: 'alltag',
    basePrice: 9500,
    colors: ['#f2d23c', '#e85d9c', '#3cc8e8', '#ffffff'],
    shape: { length: 24, width: 14, nose: 0, roofStart: 9, roofLen: 9, openTop: true },
    blurb: 'Kein Dach, keine Türen, keine Sorgen. Sand inklusive.',
  },
  {
    id: 'mustank',
    name: 'Mustank 5.0',
    cls: 'sport',
    basePrice: 13000,
    colors: ['#d23c3c', '#ffffff', '#1e1e1e', '#3c8ce8'],
    shape: { length: 28, width: 14, nose: 2, roofStart: 11, roofLen: 9, stripes: true },
    blurb: 'Fünf Liter Hubraum, null Liter Vernunft.',
  },
  {
    id: 'feuervogel',
    name: 'Pontiak Feuervogel Trans-Ami',
    cls: 'sport',
    basePrice: 15500,
    colors: ['#111111', '#c8a03c', '#e8e8e8'],
    shape: { length: 30, width: 14, nose: 4, roofStart: 12, roofLen: 9, spoiler: true, popups: true },
    blurb: 'Mit Adler auf der Haube. Der Adler ist im Preis inbegriffen.',
  },
  {
    id: 'kadillak',
    name: 'Kadillak El Dorado',
    cls: 'luxus',
    basePrice: 24000,
    colors: ['#f5f0e6', '#e87eb4', '#8c1e3c', '#e8d8a0'],
    shape: { length: 34, width: 15, nose: 2, roofStart: 13, roofLen: 11 },
    blurb: 'So lang, dass man beim Einparken zwei Postleitzahlen braucht.',
  },
  {
    id: 'corvetto',
    name: 'Corvetto Stachelrochen',
    cls: 'sport',
    basePrice: 29000,
    colors: ['#d23c3c', '#ffffff', '#f2d23c', '#3cc8e8'],
    shape: { length: 30, width: 14, nose: 5, roofStart: 13, roofLen: 8, popups: true },
    blurb: 'Für Zahnärzte, die sich nicht wie Zahnärzte fühlen wollen.',
  },
  {
    id: 'delorenzo',
    name: 'DeLorenzo DMC-85',
    cls: 'exot',
    basePrice: 38000,
    colors: ['#b8bcc4'],
    shape: { length: 28, width: 14, nose: 4, roofStart: 11, roofLen: 9, gullwing: true },
    blurb: 'Edelstahl, Flügeltüren. Fluxkompensator nicht im Lieferumfang. Vermutlich.',
  },
  {
    id: 'porschke',
    name: 'Porschke 9-Elf Turbo',
    cls: 'exot',
    basePrice: 58000,
    colors: ['#d23c3c', '#111111', '#ffffff', '#e8c83c'],
    shape: { length: 26, width: 14, nose: 3, roofStart: 9, roofLen: 9, spoiler: true },
    blurb: 'Der Heckmotor ist da, wo andere den Kofferraum haben. Wie die Moral des Besitzers.',
  },
  {
    id: 'testosterossa',
    name: 'Ferrero Testosterossa',
    cls: 'exot',
    basePrice: 98000,
    colors: ['#ffffff', '#d21e1e', '#111111'],
    shape: { length: 30, width: 16, nose: 5, roofStart: 12, roofLen: 8, vents: true, popups: true },
    blurb: 'Seitenkiemen, weißes Jackett nicht inbegriffen. Fast jedenfalls.',
  },
  {
    id: 'kontrach',
    name: 'Lambo Kontrach',
    cls: 'exot',
    basePrice: 125000,
    colors: ['#f2d23c', '#d21e1e', '#ffffff', '#1e9c5a'],
    shape: { length: 30, width: 16, nose: 7, roofStart: 13, roofLen: 7, wedge: true, spoiler: true },
    blurb: 'Rückwärts einparken nur mit offenem Scherentür-Stunt. Poster-Garantie.',
  },
];

export const MODEL_BY_ID: Record<string, CarModel> = Object.fromEntries(MODELS.map((m) => [m.id, m]));
