// Customer archetypes: who walks onto the lot, what they want, how they haggle.
import type { CarClass } from './models';
import type { Tag } from './workshop';

export type HairStyle = 'vokuhila' | 'dauerwelle' | 'glatze' | 'flattop' | 'gegelt' | 'stirnband' | 'surfer' | 'dutt';
export type TopStyle = 'hawaii' | 'jackett' | 'tanktop' | 'body' | 'lederjacke' | 'polo' | 'anzug' | 'shirt';

export interface Look {
  skin: string[];
  hair: HairStyle[];
  hairColor: string[];
  top: TopStyle[];
  topColor: string[];
  pantsColor: string[];
  shades: number; // probability of sunglasses
}

export interface Archetype {
  id: string;
  label: string;
  names: string[];
  look: Look;
  budget: [number, number];
  classes: CarClass[];
  likes: Tag[];
  /** multiplier on how much they value a car vs. market value */
  valuation: number;
  /** negotiation rounds before they lose patience */
  patience: number;
  /** 0..1, chance that bold claims ("Übertreiben") work */
  gullible: number;
  /** 0..1, how well charm works */
  charmable: number;
  /** offer ratio (vs. their limit) above which they feel insulted */
  insultAt: number;
  /** relative frequency as a buyer / as a seller */
  buyWeight: number;
  sellWeight: number;
  greetBuy: string[];
  greetSell: string[];
  accept: string[];
  walkout: string[];
}

const SKIN = ['#f2c9a0', '#e0a878', '#b87a50', '#8a5634', '#5e3a22', '#f5d6b8'];

export const ARCHETYPES: Archetype[] = [
  {
    id: 'yuppie',
    label: 'Yuppie mit Ziegelstein-Handy',
    names: ['Chad Moneypenny', 'Brad Börsenberg', 'Kevin Kurswert', 'Tiffany Trust'],
    look: {
      skin: SKIN,
      hair: ['gegelt', 'flattop'],
      hairColor: ['#3a2a1a', '#d8b860', '#1a1a1a'],
      top: ['anzug', 'polo'],
      topColor: ['#2a3a6a', '#888888', '#f0f0f0', '#e87eb4'],
      pantsColor: ['#2a2a3a', '#f0f0f0'],
      shades: 0.6,
    },
    budget: [9000, 70000],
    classes: ['sport', 'exot', 'alltag'],
    likes: ['business', 'speed', 'protz'],
    valuation: 1.08,
    patience: 4,
    gullible: 0.3,
    charmable: 0.4,
    insultAt: 1.35,
    buyWeight: 3,
    sellWeight: 2,
    greetBuy: [
      'Moment, ich hab einen Anruf... Nein, Mutti, ich bin im MEETING! – So. Ich brauche einen Wagen, der "Aktienpaket" schreit.',
      'Mein Broker sagt, Autos sind keine Investition. Mein Broker fährt Bus. Zeig mir was!',
      'Ich habe heute 40.000 an der Börse gemacht. Und morgen verliere ich sie wieder. Also schnell.',
    ],
    greetSell: [
      'Ich steige auf was Größeres um. Der hier passt nicht mehr zu meinem Portfolio.',
      'Kurzer Deal, ich hab um drei ein Squash-Match: Was gibst du mir für den Wagen?',
    ],
    accept: ['Deal! Ich ruf gleich alle an. Also, alle drei, die ein Telefon haben.', 'Gekauft. Das war das beste Geschäft seit meinem Apple-Aktien-Fehlkauf.'],
    walkout: ['Meine Zeit kostet 300 Dollar die Stunde. Du hast gerade 900 verbrannt.', 'Ich geh jetzt. Mein Pager piept sowieso.'],
  },
  {
    id: 'rentner',
    label: 'Rentner aus Ohio',
    names: ['Herb Kowalski', 'Doris Wintergarten', 'Earl Shuffleboard', 'Mildred Coupon'],
    look: {
      skin: ['#f2c9a0', '#f5d6b8', '#e0a878'],
      hair: ['glatze', 'dauerwelle'],
      hairColor: ['#e8e8e8', '#c8c8d8', '#b0a8c8'],
      top: ['hawaii', 'polo'],
      topColor: ['#7ad8c8', '#f2d23c', '#e87e7e', '#a0c8f0'],
      pantsColor: ['#e8dcc0', '#8ca0b8', '#f0f0f0'],
      shades: 0.3,
    },
    budget: [6000, 32000],
    classes: ['luxus', 'familie', 'alltag'],
    likes: ['komfort', 'chrom'],
    valuation: 1.05,
    patience: 6,
    gullible: 0.6,
    charmable: 0.8,
    insultAt: 1.4,
    buyWeight: 3,
    sellWeight: 2,
    greetBuy: [
      'Junger Mann, damals 1952 hat ein Auto 800 Dollar gekostet. Mit Tankfüllung. Und einem Hund.',
      'Wir überwintern hier. Ich brauche was Bequemes. Mein Rücken ist von 1944.',
      'Mildred sagt, ich soll mir was Flottes kaufen. Mildred ist meine Physiotherapeutin.',
    ],
    greetSell: [
      'Mein Doktor sagt, ich darf nicht mehr fahren. Ich sage, der Doktor darf nicht mehr Golf spielen.',
      'Das war das Auto meiner verstorbenen Frau. Sie ist nicht tot, sie ist nur nach Arizona gezogen.',
    ],
    accept: ['Abgemacht. Das erzähle ich beim Bingo!', 'Na gut. Sie erinnern mich an meinen Enkel. Der schuldet mir auch Geld.'],
    walkout: ['Also bei Sears war man höflicher. Und Sears verkauft gar keine Autos!', 'Ich muss los, um vier gibt es das Early-Bird-Menü.'],
  },
  {
    id: 'aerobic',
    label: 'Aerobic-Queen',
    names: ['Jazzy Legwarmer', 'Sandy Stretch', 'Cindy Calorie', 'Brenda Bodyfit'],
    look: {
      skin: SKIN,
      hair: ['dauerwelle', 'stirnband'],
      hairColor: ['#f2d880', '#a04020', '#2a1a10', '#e8a040'],
      top: ['body', 'tanktop'],
      topColor: ['#ff4fa8', '#3cf0e0', '#c8ff3c', '#a050ff'],
      pantsColor: ['#ff4fa8', '#3c3cff', '#1a1a1a'],
      shades: 0.2,
    },
    budget: [5000, 22000],
    classes: ['alltag', 'sport'],
    likes: ['pastell', 'sound', 'neon'],
    valuation: 1.05,
    patience: 5,
    gullible: 0.5,
    charmable: 0.7,
    insultAt: 1.35,
    buyWeight: 3,
    sellWeight: 1,
    greetBuy: [
      'Und eins, und zwei, und AUTO kaufen! Ich brauche was, wo mein Kassettenrekorder reinpasst.',
      'Ich gebe Kurse am Strand. Mein Fahrrad ist nicht mehr gut genug für meine Ausstrahlung.',
      'Hi! Der Wagen muss zu meinen Stulpen passen. Pink. Oder Türkis. Oder beides!',
    ],
    greetSell: [
      'Mein Wagen ist zu langsam für meinen Puls. Willst du ihn?',
      'Ich ziehe nach L.A., Jane Fonda braucht mich. Der Wagen bleibt hier.',
    ],
    accept: ['Juhuuu! Ich fahr sofort zum Strand und mache Hampelmänner auf der Motorhaube!', 'Geil! Das Ding hat voll die Aura!'],
    walkout: ['Du bringst mein Chi total durcheinander. Tschüssi!', 'Mein Puls ist auf 180, und nicht vom Training. Bye!'],
  },
  {
    id: 'rocker',
    label: 'Vokuhila-Rocker',
    names: ['Dirk Doppelgitarre', 'Ricky Riff', 'Axel Haarspray', 'Mötley Manni'],
    look: {
      skin: SKIN,
      hair: ['vokuhila'],
      hairColor: ['#3a2a1a', '#d8b860', '#1a1a1a', '#a04020'],
      top: ['lederjacke', 'tanktop'],
      topColor: ['#1a1a1a', '#5a3a2a', '#e8e8e8'],
      pantsColor: ['#3c5a9c', '#1a1a1a'],
      shades: 0.5,
    },
    budget: [4000, 19000],
    classes: ['sport', 'alltag', 'schrott'],
    likes: ['speed', 'sound'],
    valuation: 0.95,
    patience: 3,
    gullible: 0.4,
    charmable: 0.3,
    insultAt: 1.3,
    buyWeight: 2,
    sellWeight: 2,
    greetBuy: [
      'Yo. Vorne Business, hinten Party – genau wie meine Frisur. So soll auch die Karre sein.',
      'Meine Band braucht ein Tourfahrzeug. Wir sind zu viert. Und der Verstärker. Und Gisela.',
      'Ich will was mit Wumms. Und einem Kassettendeck für meine Demo-Tapes.',
    ],
    greetSell: [
      'Brauch Kohle für eine neue Gitarre. Der Wagen muss weg. Frag nicht nach dem Fleck auf dem Rücksitz.',
      'Die Band hat sich aufgelöst. Kreative Differenzen. Der Wagen war auch dabei.',
    ],
    accept: ['Rock and Roll, Alter! Jetzt fehlt nur noch ein Plattenvertrag.', 'Deal! Ich spiel dir ein Solo. Später. Wenn ich spielen kann.'],
    walkout: ['Das ist mir zu Spießer hier. Ich geh zu Larry, der hat wenigstens Haarspray.', 'Kein Bock mehr. Rock\'n\'Roll wartet nicht.'],
  },
  {
    id: 'pate',
    label: 'Der Pate von Little Havana',
    names: ['Don Tony Tortellini', 'Señor Rico Ricardo', 'Big Sal Salami', 'Don Vito Vespa'],
    look: {
      skin: ['#e0a878', '#b87a50', '#f2c9a0'],
      hair: ['gegelt', 'glatze'],
      hairColor: ['#1a1a1a', '#3a3a3a'],
      top: ['anzug', 'jackett'],
      topColor: ['#f0f0f0', '#1a1a1a', '#5a2a5a'],
      pantsColor: ['#f0f0f0', '#1a1a1a'],
      shades: 0.9,
    },
    budget: [25000, 150000],
    classes: ['luxus', 'exot'],
    likes: ['protz', 'chrom', 'komfort'],
    valuation: 1.2,
    patience: 3,
    gullible: 0.2,
    charmable: 0.5,
    insultAt: 1.2,
    buyWeight: 1,
    sellWeight: 1,
    greetBuy: [
      'Ich mache dir ein Angebot, das du nicht ablehnen kannst. Aber zuerst zeigst du mir was Schönes.',
      'Meine Organisation... äh, mein Gemüsehandel, braucht ein repräsentatives Fahrzeug.',
      'Ich zahle bar. Frag nicht, warum die Scheine nach Fisch riechen.',
    ],
    greetSell: [
      'Der Wagen muss weg. Heute. Und er war nie hier, capisce?',
      'Mein Cousin hat ihn "gefunden". Ich verkaufe ihn dir günstig. Fragen kosten extra.',
    ],
    accept: ['Bene. Wir sind jetzt Freunde. Freunde vergessen nie.', 'Ein ehrlicher Preis. Ich mag ehrliche Leute. Die sind so selten geworden.'],
    walkout: ['Du hast mich beleidigt. Meine Familie vergisst so etwas nicht.', 'Schade. Ich dachte, wir könnten Geschäfte machen.'],
  },
  {
    id: 'tourist',
    label: 'Tourist im Hawaiihemd',
    names: ['Günther aus Gelsenkirchen', 'Hans-Peter Sonnenbrand', 'Gary Gapetown', 'Ute Urlaub'],
    look: {
      skin: ['#f5d6b8', '#f2c9a0', '#ff9a8a'],
      hair: ['glatze', 'gegelt', 'dutt'],
      hairColor: ['#a07040', '#d8b860', '#5a4030'],
      top: ['hawaii'],
      topColor: ['#ff6a3c', '#3cc8e8', '#f2d23c', '#7ad87a'],
      pantsColor: ['#e8dcc0', '#7aa0c8'],
      shades: 0.7,
    },
    budget: [3000, 16000],
    classes: ['alltag', 'familie', 'schrott', 'sport'],
    likes: ['neon', 'pastell'],
    valuation: 1.1,
    patience: 5,
    gullible: 0.85,
    charmable: 0.6,
    insultAt: 1.45,
    buyWeight: 2,
    sellWeight: 1,
    greetBuy: [
      'Gutn Tach! Äh, hello! Ich will was Amerikanisches. So wie bei Miami Vice, aber billiger.',
      'Meine Frau sagt, ich spinne. Ich sage, ein Mann braucht im Urlaub ein Auto zum Angeben.',
      'Wir fliegen in zwei Wochen zurück. Kann man das Auto als Handgepäck mitnehmen?',
    ],
    greetSell: [
      'Ich habe den hier am ersten Tag gekauft. Jetzt ist das Urlaubsgeld alle. Hilfe.',
      'Der Mietwagen ist kaputt... äh, ich meine, MEIN Wagen. Total meiner. Echt.',
    ],
    accept: ['Wunderbar! Das wird ein Dia-Abend, sag ich dir!', 'Gekauft! Die Kollegen im Büro platzen vor Neid!'],
    walkout: ['Na, dann fahr ich halt mit dem Bus. Wie zu Hause.', 'Ich glaub, ich hab einen Sonnenstich. Tschüss!'],
  },
  {
    id: 'surfer',
    label: 'Surfer-Dude',
    names: ['Chip Wellenreiter', 'Dude McBrandung', 'Sunny Wachsbrett', 'Kai Kalifornia'],
    look: {
      skin: ['#e0a878', '#b87a50', '#f2c9a0'],
      hair: ['surfer'],
      hairColor: ['#f2e080', '#e8c860', '#d8b860'],
      top: ['tanktop', 'hawaii', 'shirt'],
      topColor: ['#3cf0e0', '#ff4fa8', '#f2d23c'],
      pantsColor: ['#3c8ce8', '#ff6a3c', '#7ad87a'],
      shades: 0.8,
    },
    budget: [3000, 13000],
    classes: ['alltag', 'schrott'],
    likes: ['neon', 'sound'],
    valuation: 1.0,
    patience: 5,
    gullible: 0.7,
    charmable: 0.8,
    insultAt: 1.4,
    buyWeight: 2,
    sellWeight: 2,
    greetBuy: [
      'Duuude. Ich brauch was, wo mein Brett draufpasst. Und mein anderes Brett. Und Kevin.',
      'Totally tubular, Mann! Hast du was ohne Dach? Dächer sind so... einengend.',
      'Ich hab Kohle gespart. Also, ein bisschen. Also, ich hab Muscheln. Nimmst du Muscheln?',
    ],
    greetSell: [
      'Der Wagen hat schlechtes Karma, Mann. Er hat meine Welle gestohlen.',
      'Ich zieh nach Hawaii. Autos schwimmen da schlecht hin, hab ich gehört.',
    ],
    accept: ['Radikal, Bro! Hang loose!', 'Gnarly! Das ist der beste Tag seit der großen Welle von \'83!'],
    walkout: ['Bad Vibes, Mann. Ich geh surfen.', 'Wipeout, Dude. Ich bin raus.'],
  },
  {
    id: 'cop',
    label: 'Undercover-Cop',
    names: ['Detective Sonny Crockett-Kopie', 'Rico Tubbs-Imitat', 'Agent Dan Dreitagebart', 'Officer Lou Lederslipper'],
    look: {
      skin: SKIN,
      hair: ['gegelt', 'flattop'],
      hairColor: ['#a07040', '#1a1a1a', '#d8b860'],
      top: ['jackett'],
      topColor: ['#f0f0f0', '#f2c0d8', '#a0e0e8'],
      pantsColor: ['#f0f0f0', '#e8dcc0'],
      shades: 0.95,
    },
    budget: [18000, 100000],
    classes: ['sport', 'exot'],
    likes: ['speed', 'protz'],
    valuation: 1.12,
    patience: 4,
    gullible: 0.25,
    charmable: 0.4,
    insultAt: 1.3,
    buyWeight: 1,
    sellWeight: 1,
    greetBuy: [
      'Ich bin ganz normaler Zivilist. Mit ganz normalem Spesenkonto. Ich brauche was Schnelles für... Zivilistendinge.',
      'Mein letzter Wagen wurde bei einer Verfolgungsjagd in die Luft gesprengt. Der davor auch. Hast du was Robustes?',
      'Keine Socken, weißes Jackett, Dreitagebart. Jetzt fehlt nur noch der richtige Wagen.',
    ],
    greetSell: [
      'Beschlagnahmt, äh, gebraucht. Der Wagen ist gebraucht. Willst du ihn?',
      'Das Präsidium sagt, ich habe zu viele Autos. Ich sage, es gibt nie zu viele Autos.',
    ],
    accept: ['Gekauft. Und denk dran: Du hast mich nie gesehen.', 'Perfekt. Jetzt noch Phil Collins im Radio, und der Abend ist gerettet.'],
    walkout: ['Ich hab hier noch eine Observation. Du bist übrigens nicht verdächtig. Noch nicht.', 'Vergiss es. Ich nehme den Dienstwagen.'],
  },
  {
    id: 'disco',
    label: 'Disco-Diva',
    names: ['Gloria Glitzer', 'Donna Discokugel', 'Roxy Rollschuh', 'Bianca Boogie'],
    look: {
      skin: SKIN,
      hair: ['dauerwelle', 'dutt'],
      hairColor: ['#1a1a1a', '#e8c040', '#c03060', '#f0f0f0'],
      top: ['body', 'jackett'],
      topColor: ['#e8c040', '#c0c0d0', '#ff4fa8', '#a050ff'],
      pantsColor: ['#1a1a1a', '#e8c040', '#ff4fa8'],
      shades: 0.5,
    },
    budget: [12000, 60000],
    classes: ['luxus', 'sport', 'exot'],
    likes: ['neon', 'pastell', 'protz', 'chrom'],
    valuation: 1.12,
    patience: 4,
    gullible: 0.45,
    charmable: 0.65,
    insultAt: 1.3,
    buyWeight: 2,
    sellWeight: 1,
    greetBuy: [
      'Darling, ich brauche einen Wagen, der heller strahlt als die Discokugel im Studio 54.',
      'Meine Schulterpolster passen in keinen normalen Wagen mehr. Zeig mir was Breites.',
      'Ich will ankommen und alle sollen sagen: "Oh. Mein. Gott." Und dann Champagner.',
    ],
    greetSell: [
      'Der Wagen ist SO 1984. Ich brauche was Neues, Schätzchen.',
      'Mein Ex hat ihn mir geschenkt. Mein Ex ist jetzt Ex. Der Wagen soll auch Ex werden.',
    ],
    accept: ['Fabelhaft! Ich nenne ihn Gianni!', 'Darling, du bist ein Schatz! Küsschen links, Küsschen rechts!'],
    walkout: ['Ugh. Das ist ja wie Polka hier. Ciao!', 'Ich habe Besseres zu tun. Zum Beispiel: alles.'],
  },
  {
    id: 'nerd',
    label: 'Heimcomputer-Nerd',
    names: ['Wolfgang Wolfenstein', 'Byte-Bernd', 'Gerald Gigahertz', 'Melvin Modem'],
    look: {
      skin: ['#f5d6b8', '#f2c9a0', '#e0a878'],
      hair: ['gegelt', 'dutt', 'flattop'],
      hairColor: ['#5a4030', '#1a1a1a', '#a04020'],
      top: ['polo', 'shirt'],
      topColor: ['#a0a0a0', '#c8b890', '#7aa0c8'],
      pantsColor: ['#7a6a4a', '#5a5a5a'],
      shades: 0.05,
    },
    budget: [5000, 45000],
    classes: ['exot', 'alltag', 'sport'],
    likes: ['business', 'sound'],
    valuation: 1.0,
    patience: 5,
    gullible: 0.3,
    charmable: 0.35,
    insultAt: 1.3,
    buyWeight: 1,
    sellWeight: 1,
    greetBuy: [
      'Ich habe mit meinem C64 berechnet, dass ich ein Auto brauche. Die Berechnung dauerte drei Tage.',
      'Hat einer deiner Wagen einen Bordcomputer? Der spricht? Wie K.I.T.T.? Bitte sag ja.',
      'Ich habe 64 Kilobyte RAM und keine Freundin. Vielleicht hilft ein Auto.',
    ],
    greetSell: [
      'Ich brauche Geld für einen Amiga. Der Wagen hat sowieso keinen Diskettenschacht.',
      'Laut meiner Tabellenkalkulation ist dieser Wagen ineffizient. Kaufst du ihn?',
    ],
    accept: ['LOAD "AUTO",8,1 ... READY. Gekauft!', 'Ausgezeichnet. Ich schreibe ein Textadventure darüber.'],
    walkout: ['SYNTAX ERROR. Ich gehe.', 'Das ist ineffizient. Ich gehe zurück in den Keller.'],
  },
];

export const ARCHETYPE_BY_ID: Record<string, Archetype> = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));
