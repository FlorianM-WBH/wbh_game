// Generic negotiation lines. Placeholders: {car}, {price}, {name}.

export const LINES = {
  carFits: [
    'Oh ja... der {car}. Der spricht zu mir. Er sagt: "Kauf mich, du Hengst."',
    'Der {car}? Damit bin ich der König vom Ocean Drive!',
    'Ja, genau sowas hab ich gesucht. Bleib cool, Herz, bleib cool.',
    'Wow. Ich sehe mich schon damit vor dem Club vorfahren. Mit Nebelmaschine.',
  ],
  carMeh: [
    'Der {car}... naja. Er ist nicht ganz mein Typ, aber ich höre zu.',
    'Hmm. Nicht ganz das, wovon ich nachts träume. Aber vielleicht.',
  ],
  carBad: [
    'Der {car}? Seh ich aus wie jemand, der SO etwas fährt?',
    'Nein, nein, nein. Eher würde ich zu Fuß nach Orlando laufen.',
    'Das Ding? Damit lacht mich ja sogar der Flamingo aus.',
  ],
  tooExpensive: [
    'Für den {car}? So viel Geld hat nicht mal Don Johnson!',
  ],
  noCars: [
    'Du hast ja gar nichts für mich da! Ich komme wieder, wenn du mehr Auswahl hast.',
  ],
  counterBuy: [
    'Hmm. Ich sag dir was: {price}. Und das ist schon großzügig.',
    '{price}. Und ich schmeiß meine Ray-Ban-Kopie mit drauf. Nein, doch nicht.',
    'Sagen wir {price}. Das ist mein Angebot, so sicher wie Föhnfrisur.',
    'Ich gehe auf {price}. Mehr nicht, sonst kann ich mir kein Haarspray mehr leisten.',
  ],
  counterSell: [
    'Pfff. Unter {price} geb ich ihn nicht her. Der hat Seele!',
    '{price}, und keinen Cent weniger. Okay, vielleicht ein paar Cent.',
    'Für {price} gehört er dir. Mit allem, was unter den Sitzen liegt.',
    'Unter {price}? Da müsste ich ja weinen. Und meine Wimperntusche ist nicht wasserfest.',
  ],
  insulted: [
    'WAS?! Das ist ja eine Beleidigung! Meine Mutter hat mich gewarnt vor Leuten wie dir!',
    'Hast du zu viel Sonne abbekommen? Das ist ja lächerlich!',
    'Ha! Guter Witz. Jetzt im Ernst, oder ich gehe.',
  ],
  closer: [
    'Wir kommen uns näher. Wie bei einem Slow-Dance in der Schuldisco.',
    'Fast! Noch ein bisschen, und wir haben einen Deal.',
  ],
  charmWin: [
    'Hihi, hör auf! ...Nein, mach weiter.',
    'Du bist ja ein richtiger Charmeur. Wie Tom Selleck, nur mit weniger Schnurrbart.',
    'Oh, du Schmeichler. Das gefällt mir.',
  ],
  charmFail: [
    'Spar dir das Süßholzraspeln. Ich bin hier wegen des Autos.',
    'Ist das ein Anmachspruch? Der war schon 1979 schlecht.',
  ],
  hardWin: [
    'Okay, okay! Du verhandelst ja wie ein Hai. Ich mag Haie.',
    'Na gut, du bist hart. Ich gebe ein bisschen nach.',
  ],
  hardFail: [
    'Sprich nicht so mit mir! Ich hab auch meinen Stolz. Und einen Anwalt.',
    'Uh, kein Grund, gleich so aggro zu werden.',
  ],
  storyWin: [
    'Wirklich?! Don Johnson hat den schon gefahren? Wahnsinn!',
    'Echt jetzt? Dann ist der ja quasi ein Museumsstück!',
    'Das wusste ich nicht! Dann ist er natürlich mehr wert.',
  ],
  storyFail: [
    'Ja klar. Und ich bin Madonna. Für wie blöd hältst du mich?',
    'Netter Versuch. Ich hab das auch bei "Wetten, dass..?" nicht geglaubt.',
  ],
  playerCharm: [
    'Mit Ihrem Stil sind Sie hier der heißeste Kunde seit Wochen.',
    'Wissen Sie, Sie haben Augen wie... wie... Scheinwerfer! Die guten!',
    'Darf ich sagen: Diese Frisur ist der Wahnsinn. Wie viel Haarspray ist das?',
  ],
  playerHard: [
    'Hören Sie: Das ist mein letztes Wort. Fast.',
    'Ich habe drei andere Interessenten. Mindestens zwei davon existieren.',
    'Ich bin Geschäftsmann, kein Wohltäter. Mein Wohltätigkeitstag ist Februar.',
  ],
  playerStoryBuy: [
    'Den hat schon Don Johnson Probe gefahren. Sehen Sie den Abdruck vom Ellbogen?',
    'Dieser Wagen war in einem Musikvideo! Ich darf nicht sagen, welches. Rhymt auf "Thriller".',
    'Der hat einen Spezialmotor aus der NASA. Sagen meine Quellen. Meine Quelle ist Kevin.',
  ],
  playerStorySell: [
    'Hören Sie dieses Klopfen? Das ist ein sehr teures Klopfen. Für Sie. Nicht für mich.',
    'Ehrlich gesagt, solche Wagen will 1986 keiner mehr. Ich tu Ihnen nur einen Gefallen.',
    'Mein Mechaniker sagt, der Motor hat höchstens noch drei Wochen. Und zwei davon sind schon um.',
  ],
};

export type LineKey = keyof typeof LINES;
