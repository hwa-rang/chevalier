import type { SuitorArchetype } from './types';

/**
 * 👑 La dame noble — aperçue lors des tournois (gloire requise). Le mariage
 * confère une grande réputation, mais sa famille exige des preuves et un rival
 * noble la dispute. Le déshonneur la fait fuir.
 */
export const noble: SuitorArchetype = {
  id: 'noble',
  label: 'la dame noble',
  emoji: '👑',
  // Pas de lieu : on ne l'approche qu'avec une gloire suffisante.
  meetingConditions: { minGlory: 25 },
  namePool: ['Aliénor', 'Isabeau', 'Mathilde', 'Constance', 'Éléonore', 'Béatrix'],
  compatibility: (p) => {
    let s = Math.round(p.prestige.glory / 3);
    s += Math.round(p.prestige.honor / 4);
    s += Math.round(p.prestige.reputation / 4);
    return s;
  },
  meeting: {
    title: 'Une dame de haut rang',
    description:
      "Dans les tribunes du tournoi, une dame de noble lignée remarque vos exploits. Son regard s'attarde — mais sa famille veille.",
    acceptLabel: 'Lui rendre hommage',
    declineLabel: 'Rester à votre place',
    acceptHistory: 'Vous entreprenez de courtiser la dame noble. Le défi est de taille.',
    declineHistory: 'Vous vous inclinez et gardez vos distances.',
  },
  marriageEffects: { prestige: { reputation: 15, glory: 3 } }, // alliance prestigieuse
  jealousyPenalty: 10,
  dishonorReproach: { maxHonor: 5 },
};
