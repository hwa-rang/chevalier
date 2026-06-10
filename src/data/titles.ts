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
];

export function titleById(id: string): TitleDef {
  return TITLES.find((t) => t.id === id) ?? TITLES[0];
}

/** Returns ids of titles newly earned by the player (not yet unlocked). */
export function newlyEarnedTitles(p: Player): string[] {
  const unlocked = p.unlockedTitles ?? [DEFAULT_TITLE_ID];
  return TITLES.filter((t) => !unlocked.includes(t.id) && t.check(p)).map((t) => t.id);
}
