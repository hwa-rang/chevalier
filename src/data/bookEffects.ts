import type { StatDelta } from '../types/game';

export interface BookEffect {
  /** Display title of the book. */
  label: string;
  /** Short flavour shown after reading. */
  desc: string;
  /** Stat changes applied when read (every book grants Littérature). */
  statDelta?: StatDelta;
  /** Raises max health + heals (medical texts). */
  healthDelta?: number;
}

// Every book grants reading (Littérature); most also train a specialty.
// Add new books here later — the entry's key is the item subtype.
export const BOOK_EFFECTS: Record<string, BookEffect> = {
  book_general:  { label: 'Traité de culture',  desc: 'Vous enrichissez votre culture générale.',  statDelta: { knowledgeSkills: { literature: 1, generalCulture: 2 } } },
  book_religion: { label: 'Livre saint',         desc: 'Vous méditez les Écritures sacrées.',       statDelta: { knowledgeSkills: { literature: 1, religion: 2 } } },
  book_strategy: { label: 'Traité de stratégie', desc: "Vous étudiez l'art de la guerre.",           statDelta: { knowledgeSkills: { literature: 1, strategy: 2 } } },
  book_medicine: { label: 'Traité de médecine',  desc: 'Vous apprenez à préserver votre corps.',     statDelta: { knowledgeSkills: { literature: 1 } }, healthDelta: 2 },
  book_craft:    { label: 'Manuel artisanal',    desc: 'Vous révisez les techniques de métier.',     statDelta: { knowledgeSkills: { literature: 1 } } },
  book_fencing:  { label: "Manuel d'escrime",    desc: "Vous perfectionnez le maniement de l'épée.", statDelta: { knowledgeSkills: { literature: 1 }, combatSkills: { longSword: 2 } } },
  book_hunting:  { label: 'Guide de chasse',     desc: 'Vous affûtez votre adresse au tir.',         statDelta: { knowledgeSkills: { literature: 1 }, combatSkills: { archery: 2 } } },
  book_milon:    { label: 'Manuscrit de Milon de Crotone', desc: 'Vous suivez ses exercices de force.', statDelta: { knowledgeSkills: { literature: 1 }, physicalStats: { strength: 2 } } },
};

/** Effect for a book subtype, with a sensible fallback for unknown books. */
export function bookEffectFor(subtype: string, fallbackName: string): BookEffect {
  return (
    BOOK_EFFECTS[subtype] ?? {
      label: fallbackName,
      desc: 'Vous lisez attentivement.',
      statDelta: { knowledgeSkills: { literature: 1 } },
    }
  );
}
