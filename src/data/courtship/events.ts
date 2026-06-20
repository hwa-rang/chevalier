import type { GameEvent } from '../events';

/**
 * Événements de cour/mariage (non-prioritaires) — obstacles pendant la cour et
 * réactions du conjoint après le mariage. Génériques (s'appliquent à tout
 * archétype) ; les rencontres spécifiques sont compilées dans index.ts.
 */
export const COURTSHIP_EVENTS: GameEvent[] = [
  // ── Obstacle : un rival ───────────────────────────────────────────────────
  {
    id: 'courtship_rival',
    type: 'monthly',
    title: 'Un rival',
    description:
      "Un autre prétendant tourne autour de l'élu(e) de votre cœur. On murmure qu'il est bien placé.",
    conditions: { requiresCourtship: true },
    outcomes: [
      {
        label: 'Redoubler d’attentions et de présence',
        statDelta: { prestige: { glory: 1 } },
        historyText: "Vous vous imposez par votre constance. Le rival se décourage.",
      },
      {
        label: 'Le laisser courtiser',
        endCourtship: true,
        historyText: "Vous restez en retrait. Votre prétendant(e) finit par se détourner de vous.",
      },
    ],
  },

  // ── Obstacle (dame noble) : la famille exige des preuves ───────────────────
  {
    id: 'courtship_noble_family',
    type: 'monthly',
    title: 'Les exigences de la famille',
    description:
      "La famille de la dame noble doute de votre valeur. On attend de vous une preuve éclatante — ou un présent à la hauteur.",
    conditions: { requiresCourtship: true, requiresCourtshipArchetype: 'noble' },
    outcomes: [
      {
        label: 'Verser un présent somptueux (40 or)',
        goldDelta: -40,
        statDelta: { prestige: { reputation: 1 } },
        historyText: 'Votre largesse impressionne la famille. La cour se poursuit.',
      },
      {
        label: 'Renoncer à un parti si exigeant',
        endCourtship: true,
        historyText: 'Vous renoncez : la dame était au-dessus de vos moyens.',
      },
    ],
  },

  // ── Obstacle (voleuse) : un coup à faire ensemble ──────────────────────────
  {
    id: 'courtship_voleuse_heist',
    type: 'monthly',
    title: 'Un coup à deux',
    description:
      "La voleuse vous propose un larcin à quatre mains. Le butin scellerait votre complicité — au mépris de la loi.",
    conditions: { requiresCourtship: true, requiresCourtshipArchetype: 'voleuse' },
    outcomes: [
      {
        label: 'Faire le coup ensemble',
        goldDelta: 25,
        statDelta: { prestige: { honor: -3, reputation: -2 } },
        historyText: 'Le coup réussit. Votre complicité avec la voleuse se renforce.',
      },
      {
        label: 'Refuser de mal tourner',
        statDelta: { prestige: { honor: 1 } },
        historyText: 'Vous déclinez. Elle vous trouve un peu tiède.',
      },
    ],
  },

  // ── Après mariage : reproche en cas de déshonneur ───────────────────────────
  {
    id: 'spouse_reproach_dishonor',
    type: 'monthly',
    title: 'Les reproches du foyer',
    description:
      "Votre conjoint(e) supporte mal le déshonneur qui s'attache à votre nom. Le ton monte au foyer.",
    conditions: { requiresSpouse: true, maxHonor: 0 },
    outcomes: [
      {
        label: 'Promettre de vous amender',
        relationDelta: { relationType: 'lover', amount: -4 },
        statDelta: { prestige: { honor: 1 } },
        historyText: "Vous jurez de redresser votre conduite. La paix revient, fragile.",
      },
      {
        label: 'Hausser les épaules',
        relationDelta: { relationType: 'lover', amount: -10 },
        historyText: "Vous balayez ses reproches. Le fossé se creuse.",
      },
    ],
  },

  // ── Après mariage : soutien ─────────────────────────────────────────────────
  {
    id: 'spouse_support',
    type: 'monthly',
    title: 'Le soutien du foyer',
    description:
      "Dans les jours difficiles, votre conjoint(e) vous entoure de soins et d'attentions.",
    conditions: { requiresSpouse: true, minHonor: 10 },
    outcomes: [
      {
        label: 'Savourer ce réconfort',
        relationDelta: { relationType: 'lover', amount: 3 },
        statDelta: { prestige: { honor: 0.5 } },
        historyText: "Le soutien des vôtres vous rend plus fort.",
      },
    ],
  },
];
