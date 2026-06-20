import type { SuitorArchetype } from './types';

/**
 * 🍺 La serveuse — se rencontre à la taverne. Pas de barrière de classe, peu
 * exigeante, loyale mais jalouse. Le village jase sur une telle union. Pour
 * roturiers et filous.
 */
export const serveuse: SuitorArchetype = {
  id: 'serveuse',
  label: 'la serveuse',
  emoji: '🍺',
  location: 'tavernStreak',
  namePool: ['Perrette', 'Jeanne', 'Mahaut', 'Sance', 'Colette', 'Guillemette', 'Tiphaine'],
  compatibility: (p) => {
    let s = 12; // accessible à tous
    if (p.prestige.honor < 0) s += 10; // un faible pour les mauvais garçons
    if (p.prestige.glory > 60) s -= 15; // un grand seigneur ne s'abaisserait pas
    return s;
  },
  meeting: {
    title: 'La servante de la taverne',
    description:
      "Une servante avenante vous ressert sans qu'on le lui demande, un sourire en coin. Elle n'a cure de votre rang.",
    acceptLabel: 'Lui conter fleurette',
    declineLabel: 'Finir votre chope tranquillement',
    acceptHistory: 'Vous vous attardez à la taverne pour ses beaux yeux. Une idylle commence.',
    declineHistory: 'Vous videz votre chope et rentrez seul.',
  },
  marriageEffects: { prestige: { reputation: -2 } }, // le village jase
  jealousyPenalty: 14, // très jalouse
};
