import type { SuitorArchetype } from './types';

/**
 * ⛪ La dévote — se rencontre à l'église. Exige honneur et piété ; rejette le
 * chemin païen et le déshonneur. Le mariage rejaillit en réputation. Elle déteste
 * la traîtrise et le déshonneur : jalousie forte, reproches si l'honneur chute.
 */
export const devote: SuitorArchetype = {
  id: 'devote',
  label: 'la dévote',
  emoji: '⛪',
  location: 'churchStreak',
  namePool: ['Agnès', 'Blanche', 'Marguerite', 'Aliénor', 'Jeanne', 'Mahaut', 'Sibylle'],
  compatibility: (p) => {
    let s = 0;
    s += Math.round(p.prestige.honor / 2); // l'honneur attire fortement
    s += Math.round((p.knowledgeSkills.religion ?? 0) / 3); // la piété
    if ((p.flags ?? []).includes('pagan_path')) s -= 60;
    if (p.prestige.honor < 0) s -= 20;
    return s;
  },
  // Rencontre impossible aux impies et aux âmes sans honneur.
  meetingConditions: { minHonor: 10, forbiddenFlag: 'pagan_path' },
  meeting: {
    title: 'Une jeune dévote',
    description:
      "À la sortie de l'office, une jeune femme pieuse vous adresse un sourire discret. Fervente et réservée, elle est de bonne réputation — et vous remarque.",
    acceptLabel: 'Lui faire la conversation',
    declineLabel: 'Garder vos distances',
    acceptHistory: 'Vous engagez la conversation avec la dévote. Une cour discrète commence.',
    declineHistory: 'Vous la saluez poliment et passez votre chemin.',
  },
  marriageEffects: { prestige: { reputation: 10, honor: 4 } },
  jealousyPenalty: 12,
  dishonorReproach: { maxHonor: 0 },
};
