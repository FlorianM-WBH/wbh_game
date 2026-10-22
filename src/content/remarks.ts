// Car-specific remarks: buyers' feature wishes, reactions to upgrades and to the car's condition.
// Placeholders: {car}, {extra}.

export interface UpgradeRemarks {
  /** the buyer asks for this feature in their greeting */
  wish: string[];
  /** the shown car has the wished feature */
  have: string[];
  /** the shown car lacks the wished feature */
  missing: string[];
  /** unprompted praise when a car has this extra and the buyer likes its tags */
  praise: string[];
}

export const UPGRADE_REMARKS: Record<string, UpgradeRemarks> = {
  politur: {
    wish: ['Und er muss glänzen. Ich will mich beim Einsteigen im Lack frisieren können.'],
    have: ['Der glänzt ja! Ich kann meine Dauerwelle darin nachkämmen!'],
    missing: ['Der ist ja matt wie ein Montagmorgen. Wo ist der Glanz?'],
    praise: ['Diese Politur! Die Möwen landen darauf, um sich selbst anzustarren.'],
  },
  kassette: {
    wish: [
      'Hat der ein Kassettendeck? Ohne mein Mixtape "Sommer 86 Vol. 7" fahre ich keinen Meter.',
      'Wichtig: Kassettendeck. Ich hab eine Tasche voller Modern-Talking-Tapes, die gehört werden wollen.',
    ],
    have: ['Ein Kassettendeck! Mit Equalizer! Ich höre schon "Brother Louie" in voller Lautstärke.'],
    missing: ['Kein Kassettendeck? Soll ich etwa SELBER singen? Das will keiner.'],
    praise: ['Mit Equalizer? Da kann man die Bässe so aufdrehen, dass die Nachbarn mittanzen.'],
  },
  neon: {
    wish: ['Ich will Neon unterm Wagen. Pink. Damit mich die Ufos finden.'],
    have: ['NEON! Pink! Der leuchtet wie der Strip in Vegas! Ich bin verliebt.'],
    missing: ['Kein Neon? Wie soll man mich nachts denn bitte bewundern?'],
    praise: ['Die Unterbodenbeleuchtung... sie spricht zu meiner Seele. Sie sagt: "Party".'],
  },
  pastell: {
    wish: ['Die Farbe muss stimmen. Pastell! Flamingo-Rosa oder Lagune. Alles andere ist so 1979.'],
    have: ['Diese Farbe! Passt perfekt zu meinem Sakko mit den hochgekrempelten Ärmeln!'],
    missing: ['Die Farbe ist ja trostlos. Hast du kein Pastell? Das ist Miami, nicht Wanne-Eickel!'],
    praise: ['Pastell! Wie ein Cocktail mit Schirmchen, nur auf Rädern.'],
  },
  chromfelgen: {
    wish: ['Ohne Chromfelgen steig ich nicht ein. Ich will mich in den Rädern spiegeln, beim Fahren.'],
    have: ['Chromfelgen! Ich sehe mich darin! Und ich sehe FANTASTISCH aus.'],
    missing: ['Keine Chromfelgen? Die Räder sehen ja aus wie Kaffeedosendeckel.'],
    praise: ['Diese Felgen blenden so schön. Gegenverkehr ist ab jetzt deren Problem.'],
  },
  turbo: {
    wish: ['Hat der einen Turbo? Ich brauche dieses PSSSCHHH. Für mein Selbstwertgefühl.'],
    have: ['Ein TURBO! PSSSCHHH! ...Entschuldigung, das musste raus.'],
    missing: ['Kein Turbo? Dann kommt da ja gar kein PSSSCHHH. Was soll ich den Leuten erzählen?'],
    praise: ['Turbo? Dann bin ich an der Ampel ja schneller weg als mein Gerichtsvollzieher.'],
  },
  autotelefon: {
    wish: ['Ich brauche ein Autotelefon. Wichtige Leute müssen mich IMMER erreichen können. Also meine Mutter.'],
    have: ['Ein Autotelefon! Endlich kann ich im Stau Leute anrufen und sagen, dass ich im Stau stehe!'],
    missing: ['Kein Autotelefon? Wie soll ich da meinen Broker anrufen? Mit Rauchzeichen?'],
    praise: ['Autotelefon! Ich werde jeden anrufen. Einfach so. Weil ich es KANN.'],
  },
  leder: {
    wish: ['Weiße Ledersitze, bitte. Mein Hintern ist an Luxus gewöhnt.'],
    have: ['Weißes Leder! So weich! Wie auf einem Sofa in einer Villa, die ich nicht besitze.'],
    missing: ['Stoffsitze? Was ist das, ein Schulbus? Wo ist das weiße Leder?'],
    praise: ['Weißes Leder... im Sommer brennt man sich zwar den Po, aber mit STIL.'],
  },
};

export const CONDITION_REMARKS = {
  wreck: [
    'Der {car} sieht aus, als wäre er schon dreimal von Hurrikans geklaut worden.',
    'Ist das Rost, oder ist das ein sehr mutiges Lackdesign?',
    'Der Motor klingt wie ein asthmatischer Rasenmäher.',
  ],
  poor: [
    'Der hat aber schon ein paar Macken. Und Dellen. Und Gerüche.',
    'Die Reifen sind ja glatter als mein Banker.',
  ],
  mint: [
    'Der ist ja top in Schuss! Wie frisch aus dem Werbeprospekt.',
    'Keine Delle, kein Kratzer. Sind Sie sicher, dass der gebraucht ist?',
  ],
};
