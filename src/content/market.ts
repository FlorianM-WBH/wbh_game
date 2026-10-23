// Lines for price-tag browsing, the dealer auction and the loan shark.

/** Buyer pays the tag price without haggling. {car} {price} */
export const TAG_BUY = [
  '{price} für den {car}? Gekauft! Ich hasse Feilschen.',
  'Steht ja dran: {price}. Hier ist die Kohle, Schlüssel her!',
  'Preisschild sagt {price}, mein Herz sagt ja. Deal!',
  'Ehrlicher Preis, ehrlicher Händler. Na ja, fast. Ich nehm ihn!',
  'Kein Gequatsche, kein Gefeilsche – {price}, bar auf die Hand.',
];

/** Buyer finds the tag too expensive. {car} {price} */
export const TAG_REJECT = [
  '{price} für den {car}? Hast du dich verschrieben?',
  'Bei dem Preisschild krieg ich Herzrasen. Und nicht das gute.',
  '{price}?! Dafür krieg ich ja zwei Flamingos und ein Boot!',
  'Das Schild ist teurer als die Karre. Nee.',
  'Mein Steuerberater würde weinen. {price}, pfff.',
];

/** Flavour text for auction lots. */
export const AUCTION_BLURB = [
  'Aus einer Insolvenzmasse. Fragen Sie nicht, wessen.',
  'Leasingrückläufer, angeblich nur sonntags gefahren.',
  'Sichergestellt bei einer Razzia. Kokosnuss-Duft gratis.',
  'Vom Autokino-Parkplatz. Hat viel gesehen.',
  'Erbstück. Die Erben wollten lieber Bargeld.',
  'Aus Texas. Die Hörner wurden abmontiert.',
];

export const SHARK_NAME = 'Tony „Zinsen“ Calamari';

export const SHARK_GREET = [
  'Ey, Kleiner! Onkel Sal war mir was schuldig. Jetzt bist du mein Lieblingskunde.',
  'Geld? Hab ich. Geduld? Nicht so viel.',
  'Meine Zinsen sind fair. Fair für mich.',
];

export const SHARK_WARN = ['Die Jungs fragen schon, wo dein Laden steht. Nur so.', 'Ich mag deinen Hof. Wär doch schade, wenn ihm was passiert.'];

export const GAME_OVER_TEXT = 'Tonys Jungs stehen mit Baseballschlägern auf dem Hof. Sie nehmen die Autos mit. Und den Kaktus. Miami Motors ist Geschichte.';
