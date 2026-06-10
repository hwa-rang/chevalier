import type { Player, StatDelta } from '../types/game';
import type { GameEvent } from './events';

// ─── Contracts / quests ───────────────────────────────────────────────────────
// One active contract at a time. Offers arrive as events (see QUEST_OFFER_EVENTS);
// completion/expiry is checked each month in gameStore.advanceMonth.

export interface QuestDef {
  id: string;
  giver: string;
  title: string;
  /** Objective shown to the player. */
  objective: string;
  durationMonths: number;
  /** Metric snapshot taken at acceptance. */
  baseline: (p: Player) => number;
  /** Completed when this returns true. */
  isComplete: (p: Player, baseline: number) => boolean;
  reward: { gold?: number; statDelta?: StatDelta; npc?: { role: string; profession: string; scoreDelta: number } };
  rewardText: string;
  /** Reputation lost when the deadline passes. */
  failPenalty: number;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q_bandits',
    giver: 'Le bailli',
    title: 'Nettoyer les routes',
    objective: 'Vaincre un camp de brigands (carte d\'Europe)',
    durationMonths: 24,
    baseline: (p) => p.banditsDefeated ?? 0,
    isComplete: (p, base) => (p.banditsDefeated ?? 0) > base,
    reward: { gold: 40, statDelta: { prestige: { reputation: 6 } } },
    rewardText: '40 or · Réputation +6',
    failPenalty: 3,
  },
  {
    id: 'q_pilgrim',
    giver: 'Le curé',
    title: 'Servir la foi',
    objective: 'Approfondir votre savoir religieux (+8 Religion)',
    durationMonths: 12,
    baseline: (p) => p.knowledgeSkills.religion,
    isComplete: (p, base) => p.knowledgeSkills.religion >= base + 8,
    reward: { gold: 10, statDelta: { prestige: { honor: 4, reputation: 3 } } },
    rewardText: '10 or · Honneur +4 · Réputation +3',
    failPenalty: 2,
  },
  {
    id: 'q_prove_worth',
    giver: 'Le seigneur',
    title: 'Faire ses preuves',
    objective: 'Remporter un tournoi',
    durationMonths: 24,
    baseline: (p) => p.tournamentRecord.wins,
    isComplete: (p, base) => p.tournamentRecord.wins > base,
    reward: {
      gold: 50,
      statDelta: { prestige: { glory: 3 } },
      npc: { role: 'noble', profession: 'le seigneur', scoreDelta: 20 },
    },
    rewardText: '50 or · Gloire +3 · Faveur du seigneur',
    failPenalty: 4,
  },
  {
    id: 'q_fortune',
    giver: 'Le marchand',
    title: 'Esprit d\'entreprise',
    objective: 'Accroître votre fortune de 60 or',
    durationMonths: 12,
    baseline: (p) => p.gold,
    isComplete: (p, base) => p.gold >= base + 60,
    reward: { statDelta: { prestige: { reputation: 4 }, knowledgeSkills: { eloquence: 2 } }, npc: { role: 'merchant', profession: 'le marchand', scoreDelta: 10 } },
    rewardText: 'Réputation +4 · Éloquence +2 · Estime du marchand',
    failPenalty: 2,
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

/** Months remaining before the deadline (can be negative once expired). */
export function questMonthsLeft(p: Player): number {
  if (!p.activeQuest) return 0;
  const def = questById(p.activeQuest.id);
  if (!def) return 0;
  const absNow = p.currentYear * 12 + p.currentMonth;
  return def.durationMonths - (absNow - p.activeQuest.startAbsMonth);
}

// ─── Offer events (monthly, only without an active contract) ─────────────────

function offerEvent(
  q: QuestDef,
  description: string,
  extraConditions: NonNullable<GameEvent['conditions']> = {},
): GameEvent {
  // Merge forbidden flags (quest_done_<id> must always remain).
  const extraForbidden = extraConditions.forbiddenFlag;
  const forbiddenFlag = [
    `quest_done_${q.id}`,
    ...(Array.isArray(extraForbidden) ? extraForbidden : extraForbidden ? [extraForbidden] : []),
  ];
  return {
    id: `quest_offer_${q.id}`,
    type: 'monthly',
    title: `Contrat : ${q.title}`,
    description,
    conditions: { noActiveQuest: true, ...extraConditions, forbiddenFlag },
    outcomes: [
      {
        label: `Accepter (${q.durationMonths} mois)`,
        acceptQuest: q.id,
        historyText: `Contrat accepté auprès de ${q.giver.toLowerCase()} : ${q.title}.`,
      },
      {
        label: 'Décliner',
        historyText: `Vous déclinez la proposition de ${q.giver.toLowerCase()}.`,
      },
    ],
  };
}

export const QUEST_OFFER_EVENTS: GameEvent[] = [
  offerEvent(
    QUESTS[0],
    "Le bailli vous fait mander : « Des brigands écument les routes et le seigneur me presse. Débarrassez-nous d'un de leurs camps, et vous serez récompensé. »",
    { minAge: 16, minReputation: -10 },
  ),
  offerEvent(
    QUESTS[1],
    "Le curé vous aborde après l'office : « Je vois en vous une âme qui cherche. Étudiez les Écritures, approfondissez votre foi — l'Église sait se montrer reconnaissante. »",
    { forbiddenFlag: 'pagan_path' },
  ),
  offerEvent(
    QUESTS[2],
    "Un messager du seigneur vous apporte un pli scellé : « Mon maître a entendu parler de vous. Qu'il vous voie triompher en tournoi, et sa faveur vous sera acquise. »",
    { minAge: 20, requiresNpcRole: 'noble' },
  ),
  offerEvent(
    QUESTS[3],
    "Le marchand vous prend à part : « J'aime les gens débrouillards. Faites fructifier votre bourse, montrez-moi votre étoffe — et je saurai parler de vous. »",
    { minAge: 16 },
  ),
];
