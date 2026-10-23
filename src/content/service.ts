// Lines for service customers: people who bring their own car for a paid repair or upgrade.
// Placeholders: {car}, {job}, {fee}, {time}.
import type { Component } from './workshop';

export const SERVICE_REPAIR_ASK: Record<Component, string[]> = {
  motor: [
    'Mein {car} macht beim Anlassen ein Geräusch wie Phil Collins beim Drum-Solo. Nur schlechter.',
    'Der Motor von meinem {car} qualmt. Und nicht auf die coole Nebelmaschinen-Art.',
  ],
  karosserie: [
    'Ich hab meinen {car} rückwärts in einen Flamingo-Brunnen gesetzt. Kannst du die Delle rausmachen?',
    'Die Karosserie hat eine Beule in Form von einem Einkaufswagen. Frag nicht.',
  ],
  innenraum: [
    'Im {car} ist ein Milchshake explodiert. Vor drei Wochen. Bei 35 Grad. Hilf mir.',
    'Mein Hund hat die Sitze gefressen. Er heißt Rambo. Er bereut nichts.',
  ],
  reifen: [
    'Die Reifen sind so glatt, ich bin gestern auf einer Bananenschale quer über den Highway.',
    'Ich brauche neue Reifen. Die alten haben mehr Löcher als die Story von meinem Ex.',
  ],
};

export const SERVICE_UPGRADE_ASK = [
  'Ich will, dass mein {car} cooler wird. Mach mir {job} rein!',
  'Mein {car} braucht {job}. Am Wochenende ist Beach-Party, da muss ich glänzen.',
  'Alle Nachbarn haben schon {job}. ALLE. Ich halte das nicht mehr aus.',
];

export const SERVICE_OFFER = ['Kriegst du das bis {time} hin? Ich zahle {fee}.', 'Bis {time} brauch ich ihn wieder. {fee} sind drin, bar auf die Kralle.'];

export const SERVICE_HAGGLE_WIN = ['Okay, okay, du Halsabschneider. Aber dann will ich ihn glänzen sehen!', 'Na gut. Für Qualität zahl ich gern. Hat meine Mutter gesagt.'];
export const SERVICE_HAGGLE_KEEP = ['Nee, nee. Das Angebot steht. Nimm es oder lass es.', 'Mehr gibt mein Sparschwein nicht her.'];
export const SERVICE_HAGGLE_LEAVE = ['Weißt du was? Dann fahr ich eben zu Rudi\'s Reifen-Ranch. Tschüss!'];

export const SERVICE_DONE = [
  'Wie neu! Ich könnte weinen. Mach ich aber nicht, wegen der Wimperntusche.',
  'Wahnsinn! Du bist ein Zauberer mit Schraubenschlüssel!',
  'Super Arbeit! Ich erzähl allen davon. Also, allen auf der Rollschuhbahn.',
];
