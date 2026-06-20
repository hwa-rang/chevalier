import type { SuitorArchetype } from './types';

/**
 * 📜 La fille du marchand — rencontrée par l'entremise du marchand (il faut le
 * connaître). Union transactionnelle : une belle dot (or) au mariage. Pragmatique,
 * elle estime la fortune et la bonne réputation.
 */
export const marchande: SuitorArchetype = {
  id: 'marchande',
  label: 'la fille du marchand',
  emoji: '📜',
  // Pas de lieu : il faut avoir noué des liens avec le marchand.
  meetingConditions: { requiresNpcRole: 'merchant' },
  namePool: ['Denise', 'Ameline', 'Jacquette', 'Marie', 'Thomasse', 'Aalis'],
  compatibility: (p) => {
    let s = Math.round(p.gold / 20); // la fortune compte
    s += Math.round(p.prestige.reputation / 5);
    return s;
  },
  meeting: {
    title: 'La fille du marchand',
    description:
      "Le marchand vous présente sa fille — avenante, à l'esprit pratique. Un beau parti, et une dot à la clé.",
    acceptLabel: 'Faire votre cour (et causer affaires)',
    declineLabel: 'Décliner poliment',
    acceptHistory: 'Vous courtisez la fille du marchand. Un arrangement avantageux se dessine.',
    declineHistory: 'Vous remerciez le marchand sans donner suite.',
  },
  marriageEffects: { gold: 80, prestige: { reputation: 3 } }, // la dot
  jealousyPenalty: 8,
};
