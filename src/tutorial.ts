// First-steps goals shown in a small box until the player has done each core action once.
import { buildingLevel, type GameState } from './sim/state';
import { BUILDINGS } from './content/progression';

interface Tip {
  title: string;
  text: string;
  done: (s: GameState) => boolean;
}

export const TIPS: Tip[] = [
  {
    title: 'Auto ankaufen',
    text: 'Verkäufer parken an der <b>ANKAUF</b>-Zone. Lauf hin und drück <span class="key">E</span> bei der Person, um zu verhandeln.',
    done: (s) => s.stats.carsBought > 0,
  },
  {
    title: 'Ab in die Werkstatt',
    text: 'Drück <span class="key">E</span> an einem Auto auf dem Hof oder an der <b>Hebebühne</b>, um es reinzuholen.',
    done: (s) => s.lift.carId != null || s.stats.repairsDone + s.stats.upgradesDone > 0,
  },
  {
    title: 'Reparieren oder tunen',
    text: 'Wähle an der Hebebühne eine Reparatur oder ein Extra. <span class="key">E</span> gedrückt halten = 3× schneller.',
    done: (s) => s.stats.repairsDone + s.stats.upgradesDone > 0,
  },
  {
    title: 'Auto verkaufen',
    text: 'Sprich wartende Käufer an und zeig ihnen ein passendes Auto. Ein erfüllter <b>Wunsch</b> (★) bringt viel mehr Geld!',
    done: (s) => s.stats.carsSold > 0,
  },
  {
    title: 'Technik freischalten',
    text: 'Am <b>Computer</b> im Büro kaufst du neue Extras und Verkaufstricks.',
    done: (s) => s.techs.length > 0,
  },
  {
    title: 'Firma ausbauen',
    text: 'An der <b>Bürotür</b>: „Firma ausbauen“. Mehr Stellplätze, Showroom, Neon!',
    done: (s) => BUILDINGS.some((b) => buildingLevel(s, b.id) > 0),
  },
  {
    title: 'Preisschild anbringen',
    text: 'Drück <span class="key">E</span> an einem Auto auf dem Hof: „Preisschild anbringen“. Käufer schauen es sich dann selbst an und zahlen ohne Feilschen.',
    done: (s) => s.cars.some((c) => c.price != null) || (s.stats.tagSales ?? 0) > 0,
  },
];

/** Marks finished tips in the state and returns the first open one (null when all are done). */
export function currentTip(s: GameState): { index: number; tip: Tip } | null {
  let mask = s.tips ?? 0;
  TIPS.forEach((t, i) => {
    if (!(mask & (1 << i)) && t.done(s)) mask |= 1 << i;
  });
  s.tips = mask;
  const index = TIPS.findIndex((_, i) => !(mask & (1 << i)));
  return index < 0 ? null : { index, tip: TIPS[index] };
}
