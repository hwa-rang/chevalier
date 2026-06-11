import type { Player } from '../types/game';

// ─── Earned titles (epithets) ─────────────────────────────────────────────────
// The hero starts as "Chasse-poulet" and earns better (or worse) epithets
// through behaviour. Counters live in player.counters (see gameStore).

export interface TitleDef {
  id: string;
  label: string;
  /** How it is earned — shown in the titles list. */
  desc: string;
  check: (p: Player) => boolean;
}

export const DEFAULT_TITLE_ID = 'chasse_poulet';

const BOOK_SUBTYPES = [
  'book_general', 'book_religion', 'book_medicine', 'book_strategy',
  'book_craft', 'book_fencing', 'book_hunting', 'book_milon',
];

const c = (p: Player) => p.counters;

export const TITLES: TitleDef[] = [
  {
    id: 'chasse_poulet',
    label: 'Chasse-poulet',
    desc: 'Tout le monde commence quelque part.',
    check: () => true,
  },
  {
    id: 'grenouille',
    label: 'La grenouille de bénitier',
    desc: "Fréquenter l'église 2 fois par mois, 3 mois de suite.",
    check: (p) => (c(p)?.churchStreak ?? 0) >= 3,
  },
  {
    id: 'pieux',
    label: 'Le pieux',
    desc: "Plus de 12 actions à l'église dans l'année.",
    check: (p) => (c(p)?.churchYear ?? 0) > 12,
  },
  {
    id: 'artisan',
    label: "L'artisan",
    desc: "Accomplir 20 travaux de forge ou d'artisanat.",
    check: (p) => (c(p)?.craftJobs ?? 0) >= 20,
  },
  {
    id: 'curieux',
    label: 'Le curieux',
    desc: 'Posséder tous les livres du marché.',
    check: (p) => BOOK_SUBTYPES.every((s) => p.inventory.some((i) => i.subtype === s)),
  },
  {
    id: 'chasseur',
    label: 'Le chasseur',
    desc: 'Chasser 2 fois par mois, 3 mois de suite.',
    check: (p) => (c(p)?.huntStreak ?? 0) >= 3,
  },
  {
    id: 'paien',
    label: 'Le païen',
    desc: 'Rompre avec la communauté chrétienne.',
    check: (p) =>
      (p.flags ?? []).includes('pagan_path') ||
      (p.templeVisits ?? 0) >= 5 ||
      p.relations.some((r) => r.type === 'priest' && r.score <= -30),
  },
  {
    id: 'bel',
    label: 'Le bel',
    desc: 'Une éloquence hors du commun (≥ 60).',
    check: (p) => p.knowledgeSkills.eloquence >= 60,
  },
  {
    id: 'bagarreur',
    label: 'Le bagarreur',
    desc: 'Nettoyer 3 camps de brigands.',
    check: (p) => (p.banditsDefeated ?? 0) >= 3,
  },
  {
    id: 'bourse_dor',
    label: "Bourse-d'or",
    desc: 'Amasser 300 pièces d\'or.',
    check: (p) => p.gold >= 300,
  },

  // ── Gloire & combat ──────────────────────────────────────────────────────
  {
    id: 'tournoyeur',
    label: 'Le tournoyeur',
    desc: 'Remporter 3 tournois.',
    check: (p) => p.tournamentRecord.wins >= 3,
  },
  {
    id: 'champion_lices',
    label: 'Champion des lices',
    desc: 'Remporter 10 tournois.',
    check: (p) => p.tournamentRecord.wins >= 10,
  },
  {
    id: 'fleau_routes',
    label: 'Fléau des routes',
    desc: 'Nettoyer 6 camps de brigands.',
    check: (p) => (p.banditsDefeated ?? 0) >= 6,
  },
  {
    id: 'voyageur',
    label: 'Le voyageur',
    desc: 'Participer à un tournoi en terre lointaine.',
    check: (p) => (p.flags ?? []).includes('traveled_distant'),
  },
  {
    id: 'hardi',
    label: 'Le Hardi',
    desc: 'Combattre un tournoi de corps-à-corps sans armure complète.',
    check: (p) => (p.flags ?? []).includes('fought_unarmored'),
  },
  {
    id: 'maudit',
    label: 'Le Maudit',
    desc: 'Perdre 5 tournois d\'affilée.',
    check: (p) => (p.tournamentRecord.lossStreak ?? 0) >= 5,
  },
  {
    id: 'colosse',
    label: 'Le colosse',
    desc: 'Force ≥ 60.',
    check: (p) => p.physicalStats.strength >= 60,
  },
  {
    id: 'lievre',
    label: 'Le lièvre',
    desc: 'Vitesse ≥ 60.',
    check: (p) => p.physicalStats.speed >= 60,
  },

  // ── Foi & ténèbres ───────────────────────────────────────────────────────
  {
    id: 'croise',
    label: 'Le croisé',
    desc: 'Gagner le bascinet à visière à croix.',
    check: (p) => p.inventory.some((i) => i.subtype === 'helmet_crusader'),
  },
  {
    id: 'yeomen',
    label: 'Yeomen',
    desc: 'Gagner le heaume des anciens dieux.',
    check: (p) => p.inventory.some((i) => i.subtype === 'helmet_apocryphal'),
  },
  {
    id: 'langue_fourchue',
    label: 'Langue fourchue',
    desc: 'Avoir juré faux devant le bailli.',
    check: (p) => (p.flags ?? []).includes('perjurer'),
  },
  {
    id: 'gibier_potence',
    label: 'Gibier de potence',
    desc: 'Honneur ≤ −60.',
    check: (p) => p.prestige.honor <= -60,
  },

  // ── Les années noires ────────────────────────────────────────────────────
  {
    id: 'increvable',
    label: "L'increvable",
    desc: 'Être en vie au sortir de la Grande Famine (1318).',
    check: (p) => p.currentYear >= 1318,
  },
  {
    id: 'mange_racines',
    label: 'Mange-racines',
    desc: 'Avoir traversé la famine le ventre vide.',
    check: (p) => (p.flags ?? []).includes('famine_belt'),
  },
  {
    id: 'charitable',
    label: 'Le charitable',
    desc: 'Avoir nourri le village pendant la disette.',
    check: (p) => (p.flags ?? []).includes('famine_shared'),
  },
  {
    id: 'pique_assiette',
    label: 'Pique-assiette',
    desc: 'Avoir volé le pain des affamés.',
    check: (p) => (p.flags ?? []).includes('granary_thief'),
  },
  {
    id: 'coeur_chene',
    label: 'Cœur de chêne',
    desc: 'Porter sa vitalité à 120 points de vie.',
    check: (p) => (p.maxHealth ?? 100) >= 120,
  },

  // ── Société & loyautés ───────────────────────────────────────────────────
  {
    id: 'homme_lige',
    label: "L'homme lige",
    desc: 'Avoir juré fidélité au seigneur.',
    check: (p) => (p.flags ?? []).includes('sworn_to_lord'),
  },
  {
    id: 'chevalier_errant',
    label: 'Chevalier errant',
    desc: 'Avoir refusé de servir un maître.',
    check: (p) => (p.flags ?? []).includes('free_blade'),
  },
  {
    id: 'parole_dor',
    label: "Parole d'or",
    desc: 'Honorer les quatre contrats.',
    check: (p) => {
      const f = p.flags ?? [];
      return ['q_bandits', 'q_pilgrim', 'q_prove_worth', 'q_fortune'].every((q) =>
        f.includes(`quest_done_${q}`),
      );
    },
  },
  {
    id: 'ami_de_tous',
    label: "L'ami de tous",
    desc: 'Être aimé de 8 personnes (relation ≥ 50).',
    check: (p) => p.relations.filter((r) => r.score >= 50).length >= 8,
  },

  // ── Vie de village ───────────────────────────────────────────────────────
  {
    id: 'pilier_comptoir',
    label: 'Pilier de comptoir',
    desc: 'Hanter la taverne 2 fois par mois, 3 mois de suite.',
    check: (p) => (p.counters?.tavernStreak ?? 0) >= 3,
  },
  {
    id: 'lettre',
    label: 'Le lettré',
    desc: 'Littérature ≥ 60.',
    check: (p) => p.knowledgeSkills.literature >= 60,
  },
  {
    id: 'malavise',
    label: 'Le Malavisé',
    desc: 'Atteindre 30 ans sans rien connaître du monde.',
    check: (p) => p.age >= 30 && p.knowledgeSkills.generalCulture < 10,
  },
  {
    id: 'gris',
    label: 'Le gris',
    desc: 'Atteindre 50 ans.',
    check: (p) => p.age >= 50,
  },
  {
    id: 'blanc',
    label: 'Le blanc',
    desc: 'Atteindre 65 ans.',
    check: (p) => p.age >= 65,
  },
];

export function titleById(id: string): TitleDef {
  return TITLES.find((t) => t.id === id) ?? TITLES[0];
}

/** Returns ids of titles newly earned by the player (not yet unlocked). */
export function newlyEarnedTitles(p: Player): string[] {
  const unlocked = p.unlockedTitles ?? [DEFAULT_TITLE_ID];
  return TITLES.filter((t) => !unlocked.includes(t.id) && t.check(p)).map((t) => t.id);
}
