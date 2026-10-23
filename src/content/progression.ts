// Tech tree (bought at the office computer) and building upgrades.

export interface Tech {
  id: string;
  name: string;
  cost: number;
  requires: string[];
  desc: string;
  branch: 'werkstatt' | 'tuning' | 'verkauf' | 'marketing';
}

export const TECHS: Tech[] = [
  { id: 'druckluft', name: 'Druckluftschrauber', cost: 2500, requires: [], branch: 'werkstatt', desc: 'Reparaturen 30% schneller. BRRRRT!' },
  { id: 'teilehandel', name: 'Teile-Großhandel', cost: 3500, requires: [], branch: 'werkstatt', desc: 'Ersatzteile 25% billiger. Kein Wort zur Herkunft.' },
  { id: 'gutachter', name: 'Gutachter-Lehrgang', cost: 1500, requires: [], branch: 'werkstatt', desc: 'Zeigt den genauen Zustand von Ankaufwagen.' },
  { id: 'hebebuehne2', name: 'Hydraulik-Hebebühne Pro', cost: 9000, requires: ['druckluft'], branch: 'werkstatt', desc: 'Reparaturen nochmals 30% schneller.' },
  { id: 'neon', name: 'Neon-Technik', cost: 2000, requires: [], branch: 'tuning', desc: 'Schaltet Neon-Unterbodenbeleuchtung frei.' },
  { id: 'chrom', name: 'Chrom-Veredelung', cost: 3000, requires: ['neon'], branch: 'tuning', desc: 'Schaltet Chromfelgen frei.' },
  { id: 'lackiererei', name: 'Pastell-Lackiererei', cost: 4000, requires: ['neon'], branch: 'tuning', desc: 'Schaltet Pastell-Lackierungen frei.' },
  { id: 'sattlerei', name: 'Sattlerei', cost: 4500, requires: ['chrom'], branch: 'tuning', desc: 'Schaltet weiße Ledersitze frei.' },
  { id: 'elektronik', name: 'Hightech-Elektronik', cost: 5000, requires: ['lackiererei'], branch: 'tuning', desc: 'Schaltet das Autotelefon frei.' },
  { id: 'turbo', name: 'Turbo-Tuning', cost: 8000, requires: ['druckluft', 'chrom'], branch: 'tuning', desc: 'Schaltet den Turbolader frei. PSSSCHHH!' },
  { id: 'rhetorik', name: 'Verkaufsseminar "Übertreiben"', cost: 2000, requires: [], branch: 'verkauf', desc: 'Neue Taktik: maßlos übertreiben.' },
  { id: 'menschenkenner', name: 'Menschenkenntnis', cost: 3000, requires: ['rhetorik'], branch: 'verkauf', desc: 'Zeigt die Vorlieben von Kunden.' },
  { id: 'charmeoffensive', name: 'Charme-Offensive', cost: 6000, requires: ['menschenkenner'], branch: 'verkauf', desc: 'Charme und Härte wirken doppelt so gut.' },
  { id: 'auktion', name: 'BTX-Händlerauktion', cost: 4000, requires: [], branch: 'verkauf', desc: 'Am Computer täglich Autos ersteigern – ganz ohne Verkäufer. Bildschirmtext, Baby!' },
  { id: 'radio', name: 'Radiowerbung', cost: 3000, requires: [], branch: 'marketing', desc: '"Miami Motors – wir sind billig, aber nicht billig!" +30% Kunden.' },
  { id: 'tvspot', name: 'TV-Werbespot', cost: 12000, requires: ['radio'], branch: 'marketing', desc: 'Du im Werbespot, mit Explosion. +40% Kunden, reichere Kunden.' },
];

export interface BuildingUpgrade {
  id: string;
  name: string;
  /** cost per level, index 0 = cost to reach level 1 */
  costs: number[];
  desc: string[];
}

export const BUILDINGS: BuildingUpgrade[] = [
  {
    id: 'parkplatz',
    name: 'Parkplatz',
    costs: [5000, 12000, 25000],
    desc: ['4 Stellplätze', '6 Stellplätze', '8 Stellplätze', '10 Stellplätze'],
  },
  {
    id: 'showroom',
    name: 'Showroom',
    costs: [15000, 40000],
    desc: ['Bürocontainer', 'Glas-Showroom: Kunden zahlen 6% mehr', 'Neon-Palast: Kunden zahlen 12% mehr'],
  },
  {
    id: 'werkstatt',
    name: 'Werkstatt',
    costs: [8000, 20000],
    desc: ['Garage', 'Profi-Werkstatt: 25% schneller', 'Tuning-Halle: 50% schneller'],
  },
  {
    id: 'neonschild',
    name: 'Neon-Leuchtreklame',
    costs: [6000],
    desc: ['Pappschild', 'Riesiges Neonschild: +25% Kunden'],
  },
  {
    id: 'kaffeebar',
    name: 'Kaffee- und Cocktailbar',
    costs: [4000],
    desc: ['Kaffeeautomat (kaputt)', 'Cocktailbar: Kunden haben mehr Geduld'],
  },
  {
    id: 'deko',
    name: 'Flamingos & Palmen',
    costs: [2500],
    desc: ['Ein trauriger Kaktus', 'Plastikflamingos: Kunden starten besser gelaunt'],
  },
];

export const TECH_BY_ID: Record<string, Tech> = Object.fromEntries(TECHS.map((t) => [t.id, t]));
export const BUILDING_BY_ID: Record<string, BuildingUpgrade> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
