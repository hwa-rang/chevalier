import type { SuitorArchetype } from './types';

/**
 * 🗡️ La voleuse — croisée dans la pègre (réputation noire requise). Romance
 * dangereuse : partenaire de crime (bonus aux larcins une fois mariée). La loi
 * et l'honneur la révulsent ; un homme trop honorable la fait fuir.
 */
export const voleuse: SuitorArchetype = {
  id: 'voleuse',
  label: 'la voleuse',
  emoji: '🗡️',
  // Pas de lieu : on ne la croise qu'en ayant déjà mauvaise réputation.
  meetingConditions: { maxReputation: -15 },
  namePool: ['Maheut', 'Ysabel', 'Catau', 'Margot', 'Perrine', 'Sebille'],
  compatibility: (p) => {
    let s = Math.round(-p.prestige.honor / 2); // l'honneur la rebute
    if (p.prestige.reputation < -25) s += 15; // un vrai hors-la-loi l'attire
    return s;
  },
  meeting: {
    title: 'Une lame dans l’ombre',
    description:
      "Dans l'arrière-salle des bas-fonds, une jeune femme au regard vif vous jauge. Elle vit de rapines et n'a peur de rien.",
    acceptLabel: 'Jouer le jeu dangereux',
    declineLabel: 'Ne pas vous y risquer',
    acceptHistory: 'Vous vous rapprochez de la voleuse. Une liaison périlleuse commence.',
    declineHistory: 'Vous déclinez : certaines fréquentations coûtent cher.',
  },
  marriageEffects: { prestige: { reputation: -4, honor: -2 } }, // union scandaleuse
  jealousyPenalty: 12,
};
