// ── Tournament tactics ───────────────────────────────────────────────────────
// Per-round stances, the cheating system and between-round narrative events.
// Stances tie the player's PHYSICAL stats (strength/agility/endurance/speed)
// into tournament rolls — previously they were ignored entirely.

import type { PhysicalStats } from '../types/game';

export type PhysicalStatKey = keyof PhysicalStats;
export type StanceId = 'aggressive' | 'technical' | 'cautious' | 'swift' | 'allin';

export interface Stance {
  id: StanceId;
  label: string;
  icon: string;
  /** Physical stat that scales the bonus (null for the all-in stance). */
  stat: PhysicalStatKey | null;
  statLabel: string;
  description: string;
  /** Flat roll bonus before stat scaling. */
  baseBonus: number;
  /** Roll bonus added per point of the keyed stat (stat is -100..100). */
  statFactor: number;
  /** Vigueur spent this round. */
  vigueurCost: number;
  /** Vigueur recovered this round (cautious play catches its breath). */
  vigueurRecover: number;
  /** Penalty applied to the opponent's roll this round. */
  opponentPenalty: number;
  /** Extra health lost on a LOSING round (reckless play hurts more). */
  injuryRisk: number;
  /** Élan gained on a WINNING round. */
  momentumGain: number;
  /** Ties resolve in the player's favour. */
  winsTies: boolean;
  /** Consumes all current élan and folds it into a big one-off bonus. */
  consumesMomentum: boolean;
  /** Minimum élan required to pick this stance. */
  requiresMomentum: number;
}

export const STANCES: Stance[] = [
  {
    id: 'aggressive',
    label: 'Offensif',
    icon: '⚔',
    stat: 'strength',
    statLabel: 'Force',
    description: 'Frappez fort. Gros avantage, mais épuisant et risqué si vous tombez.',
    baseBonus: 8,
    statFactor: 0.18,
    vigueurCost: 28,
    vigueurRecover: 0,
    opponentPenalty: 0,
    injuryRisk: 8,
    momentumGain: 2,
    winsTies: false,
    consumesMomentum: false,
    requiresMomentum: 0,
  },
  {
    id: 'technical',
    label: 'Technique',
    icon: '🗡',
    stat: 'agility',
    statLabel: 'Agilité',
    description: "Feintes et précision. Affaiblit la garde de l'adversaire.",
    baseBonus: 4,
    statFactor: 0.15,
    vigueurCost: 16,
    vigueurRecover: 0,
    opponentPenalty: 6,
    injuryRisk: 2,
    momentumGain: 1,
    winsTies: false,
    consumesMomentum: false,
    requiresMomentum: 0,
  },
  {
    id: 'cautious',
    label: 'Prudent',
    icon: '🛡',
    stat: 'endurance',
    statLabel: 'Endurance',
    description: 'Restez sur la défensive. Léger malus, mais vous reprenez votre souffle.',
    baseBonus: -4,
    statFactor: 0.1,
    vigueurCost: 4,
    vigueurRecover: 12,
    opponentPenalty: 0,
    injuryRisk: 0,
    momentumGain: 0,
    winsTies: false,
    consumesMomentum: false,
    requiresMomentum: 0,
  },
  {
    id: 'swift',
    label: 'Vif',
    icon: '💨',
    stat: 'speed',
    statLabel: 'Vitesse',
    description: 'Frappez le premier. Peu coûteux, et les égalités tournent en votre faveur.',
    baseBonus: 3,
    statFactor: 0.15,
    vigueurCost: 10,
    vigueurRecover: 0,
    opponentPenalty: 0,
    injuryRisk: 1,
    momentumGain: 1,
    winsTies: true,
    consumesMomentum: false,
    requiresMomentum: 0,
  },
  {
    id: 'allin',
    label: "Coup d'éclat",
    icon: '🔥',
    stat: null,
    statLabel: 'Élan',
    description: 'Jouez tout votre élan en un assaut spectaculaire. Tout ou rien.',
    baseBonus: 6,
    statFactor: 0,
    vigueurCost: 20,
    vigueurRecover: 0,
    opponentPenalty: 0,
    injuryRisk: 6,
    momentumGain: 0,
    winsTies: true,
    consumesMomentum: true,
    requiresMomentum: 2,
  },
];

// ── Tuning constants ─────────────────────────────────────────────────────────

export const MAX_MOMENTUM = 5;
/** Roll bonus granted per point of élan (passive). */
export const MOMENTUM_BONUS_PER_POINT = 4;
/** Bonus per élan point when spent via the all-in stance. */
export const ALLIN_BONUS_PER_POINT = 8;
/** Flat roll bonus from cheating. */
export const CHEAT_BONUS = 18;
/** Margin above which a round win counts as decisive (+1 extra élan). */
export const DECISIVE_MARGIN = 15;
/** Disgrace applied when caught cheating. */
export const CHEAT_CAUGHT_PENALTY = { glory: -8, reputation: -10, honor: -12 };

/** Starting vigueur — endurance lets you last longer (range ≈ 60–120). */
export function maxVigueur(stats: PhysicalStats): number {
  return Math.round(90 + clamp(stats.endurance, -100, 100) * 0.3);
}

/** Roll penalty when vigueur runs low. */
export function vigueurPenalty(vigueur: number, max: number): number {
  const pct = max > 0 ? vigueur / max : 0;
  if (pct < 0.15) return 24;
  if (pct < 0.35) return 12;
  if (pct < 0.55) return 5;
  return 0;
}

/**
 * Suspicion added by a single cheat. Agile players palm dice and bend rules
 * more discreetly, so they accrue suspicion slower (range 8–40).
 */
export function cheatSuspicionGain(agility: number): number {
  return Math.round(clamp(28 - agility * 0.12, 8, 40));
}

/** Stance roll bonus, factoring the keyed physical stat. */
export function stanceBonus(stance: Stance, stats: PhysicalStats, momentum: number): number {
  if (stance.consumesMomentum) {
    return stance.baseBonus + momentum * ALLIN_BONUS_PER_POINT;
  }
  const statValue = stance.stat ? stats[stance.stat] : 0;
  return Math.round(stance.baseBonus + statValue * stance.statFactor);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ── Between-round narrative events ────────────────────────────────────────────

export interface EventEffect {
  vigueur?: number;
  momentum?: number;
  suspicion?: number;
  gold?: number;
  honor?: number;
  reputation?: number;
  glory?: number;
  /** Penalty applied to the NEXT opponent's roll. */
  opponentPenaltyNext?: number;
  /** Health lost immediately. */
  healthLost?: number;
}

export interface EventChoice {
  label: string;
  /** Short line shown after the choice is made. */
  resultText: string;
  effects: EventEffect;
}

export interface TournamentEvent {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
}

export const TOURNAMENT_EVENTS: TournamentEvent[] = [
  {
    id: 'rival_taunt',
    title: 'Un rival vous provoque',
    text: "Un chevalier rival raille votre technique devant la foule amusée.",
    choices: [
      {
        label: 'Répondre avec esprit',
        resultText: "Votre repartie fait rire l'assemblée — à ses dépens.",
        effects: { momentum: 1, honor: 2 },
      },
      {
        label: "L'ignorer froidement",
        resultText: 'Vous gardez votre calme et votre souffle.',
        effects: { vigueur: 6 },
      },
      {
        label: 'Le menacer en retour',
        resultText: 'Il blêmit — mais la cour vous trouve grossier.',
        effects: { opponentPenaltyNext: 10, reputation: -3 },
      },
    ],
  },
  {
    id: 'lady_favor',
    title: "Le ruban d'une dame",
    text: 'Une dame de la cour vous tend son ruban en gage de faveur.',
    choices: [
      {
        label: 'Accepter avec galanterie',
        resultText: 'Son sourire vous emplit de fougue.',
        effects: { momentum: 2 },
      },
      {
        label: 'Refuser poliment',
        resultText: 'Votre retenue est remarquée et respectée.',
        effects: { honor: 3 },
      },
    ],
  },
  {
    id: 'old_wound',
    title: 'Une vieille blessure',
    text: 'Une douleur ancienne se réveille entre deux assauts.',
    choices: [
      {
        label: 'Se faire soigner par le mire',
        resultText: 'Le mire vous remet sur pied — contre quelques pièces.',
        effects: { vigueur: 25, gold: -5 },
      },
      {
        label: 'Serrer les dents',
        resultText: 'La douleur nourrit votre rage de vaincre.',
        effects: { momentum: 1, healthLost: 4 },
      },
    ],
  },
  {
    id: 'shady_bet',
    title: 'Un pari clandestin',
    text: "Un parieur vous glisse qu'il misera gros sur vous… si vous lui rendez un petit service.",
    choices: [
      {
        label: 'Refuser net',
        resultText: 'Vous le congédiez sèchement. Votre conscience est nette.',
        effects: { honor: 2 },
      },
      {
        label: 'Écouter sa combine',
        resultText: "Vous empochez son avance — mais des regards se font soupçonneux.",
        effects: { gold: 20, suspicion: 15 },
      },
    ],
  },
  {
    id: 'roaring_crowd',
    title: 'La foule en délire',
    text: 'La foule scande votre nom entre deux rounds.',
    choices: [
      {
        label: 'Saluer la foule',
        resultText: 'Leur ferveur vous porte.',
        effects: { momentum: 2 },
      },
      {
        label: 'Rester concentré',
        resultText: 'Vous restez focalisé sur le prochain combat.',
        effects: { vigueur: 10 },
      },
    ],
  },
  {
    id: 'injured_foe',
    title: 'Un adversaire blessé',
    text: "Votre prochain adversaire s'est blessé à l'échauffement.",
    choices: [
      {
        label: 'Proposer un report (fair-play)',
        resultText: 'Votre noblesse force le respect de tous.',
        effects: { honor: 4, reputation: 3 },
      },
      {
        label: 'Exiger le combat',
        resultText: 'Il se présente diminué — mais on vous juge sans pitié.',
        effects: { opponentPenaltyNext: 14, honor: -4 },
      },
    ],
  },
  {
    id: 'cup_of_wine',
    title: 'Une coupe de vin',
    text: 'Un page vous offre une coupe de vin entre deux rounds.',
    choices: [
      {
        label: 'Boire',
        resultText: 'La chaleur du vin vous détend… un peu trop.',
        effects: { vigueur: 14, momentum: -1 },
      },
      {
        label: 'Décliner',
        resultText: 'Vous gardez la tête froide.',
        effects: { honor: 1 },
      },
    ],
  },
];

export function pickEvent(seenIds: string[]): TournamentEvent | null {
  const pool = TOURNAMENT_EVENTS.filter((e) => !seenIds.includes(e.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
