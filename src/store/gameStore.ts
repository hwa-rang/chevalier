import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type {
  Player,
  Item,
  Relation,
  GriefModifier,
  StatDelta,
  Background,
  SkinTone,
  Hair,
  EquipSlot,
  PhysicalStats,
} from '../types/game';
import { slotForSubtype, EMPTY_EQUIPMENT } from '../utils/equipment';
import { getBackgroundBonuses } from '../utils/backgrounds';
import { generateFamily } from '../utils/familyGenerator';
import { makeNpc, makeRandomFriend } from '../utils/relationGenerator';
import { formatStatDelta, type ChangeLine } from '../utils/statLabels';
import type { GameEvent } from '../data/events';
import { questById } from '../data/quests';
import { DEFAULT_TITLE_ID, newlyEarnedTitles, titleById } from '../data/titles';
import { rollMonthlyEvent, rollAnnualEvent } from '../utils/eventEngine';

// Action economy: a single fatigue gauge spent each month.
// Capacity 8 "units": a principal action costs ½ (4), a secondary costs ⅛ (1).
// → 2 principals, OR 1 principal + 4 secondaries, OR 8 secondaries, then exhausted.
export const ENERGY_CAPACITY = 8;
export const PRINCIPAL_COST = 4;
export const SECONDARY_COST = 1;

/** Fatigue units already spent this month (0 = fully rested). */
export function energyUsed(
  p: { principalActionsUsed?: number; secondaryActionsUsed?: number },
): number {
  return (p.principalActionsUsed ?? 0) * PRINCIPAL_COST + (p.secondaryActionsUsed ?? 0) * SECONDARY_COST;
}

/** Energy cost of an action kind. */
export function energyCost(kind: 'principal' | 'secondary'): number {
  return kind === 'principal' ? PRINCIPAL_COST : SECONDARY_COST;
}

/** Visiting the same place this many times in a row triggers a streak effect. */
const STREAK_THRESHOLD = 3;

// Merchant resale rules.
export const ITEM_SELL_PRICE = 1;          // derisory price per resold item
export const MERCHANT_MAX_PER_ITEM = 5;    // merchant refuses a 6th identical item
const MERCHANT_RESET_MONTHS = 6;           // merchant stock clears every 6 months

// ---------------------------------------------------------------------------
// Opposed stats helpers
// ---------------------------------------------------------------------------

const OPPOSED_SOFT_CAP = 120;

/** Clamp a stat to [-100, 100]. */
function clamp(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

/**
 * Apply opposed-stat rule: when a stat increases beyond the soft cap together
 * with its opponent, the opponent absorbs the overflow.
 */
function applyOpposed(
  primary: number,
  opponent: number,
  delta: number,
): [number, number] {
  const newPrimary = clamp(primary + delta);
  const sum = newPrimary + opponent;
  if (sum > OPPOSED_SOFT_CAP) {
    const overflow = sum - OPPOSED_SOFT_CAP;
    return [newPrimary, clamp(opponent - overflow)];
  }
  return [newPrimary, opponent];
}

function applyPhysicalDeltas(
  current: PhysicalStats,
  delta: Partial<PhysicalStats>,
): PhysicalStats {
  let { strength, agility, endurance, speed } = current;

  if (delta.strength !== undefined) {
    [strength, agility] = applyOpposed(strength, agility, delta.strength);
  }
  if (delta.agility !== undefined) {
    [agility, strength] = applyOpposed(agility, strength, delta.agility);
  }
  if (delta.endurance !== undefined) {
    [endurance, speed] = applyOpposed(endurance, speed, delta.endurance);
  }
  if (delta.speed !== undefined) {
    [speed, endurance] = applyOpposed(speed, endurance, delta.speed);
  }

  return { strength, agility, endurance, speed };
}

// ---------------------------------------------------------------------------
// Grief / death helpers
// ---------------------------------------------------------------------------

const GRIEF_STAT_POOL: Array<{ statGroup: GriefModifier['statGroup']; statKey: string }> = [
  { statGroup: 'physicalStats', statKey: 'strength' },
  { statGroup: 'physicalStats', statKey: 'endurance' },
  { statGroup: 'knowledgeSkills', statKey: 'generalCulture' },
  { statGroup: 'knowledgeSkills', statKey: 'eloquence' },
  { statGroup: 'knowledgeSkills', statKey: 'medicine' },
  { statGroup: 'combatSkills', statKey: 'longSword' },
  { statGroup: 'combatSkills', statKey: 'archery' },
];

function pickGriefStat(): { statGroup: GriefModifier['statGroup']; statKey: string } {
  return GRIEF_STAT_POOL[Math.floor(Math.random() * GRIEF_STAT_POOL.length)];
}

// ---------------------------------------------------------------------------
// Knowledge-based equipment unlocks (not sold — earned at very high knowledge)
// ---------------------------------------------------------------------------

const SKILL_HELMET_UNLOCKS: Array<{
  skill: keyof Player['knowledgeSkills'];
  threshold: number;
  subtype: string;
  name: string;
  note: string;
}> = [
  {
    skill: 'religion',
    threshold: 60,
    subtype: 'helmet_crusader',
    name: 'Bascinet avec visière à croix',
    note: 'Votre profonde ferveur religieuse vous vaut un bascinet à visière en croix.',
  },
  {
    skill: 'apocryphal',
    threshold: 60,
    subtype: 'helmet_apocryphal',
    name: 'Heaume des anciens dieux',
    note: 'Vos connaissances apocryphes vous attirent un heaume marqué de symboles oubliés.',
  },
];

/** Unlocks any newly earned titles; the newest becomes the displayed one. */
function applyTitleUnlocks(player: Player): { player: Player; notes: string[] } {
  const earned = newlyEarnedTitles(player);
  if (earned.length === 0) return { player, notes: [] };
  const unlocked = [...(player.unlockedTitles ?? [DEFAULT_TITLE_ID]), ...earned];
  return {
    player: { ...player, unlockedTitles: unlocked, title: earned[earned.length - 1] },
    notes: earned.map((id) => `Nouveau titre : « ${titleById(id).label} » !`),
  };
}

/** Grants any knowledge-gated helmet the player now qualifies for and doesn't own. */
function grantSkillUnlocks(player: Player): { player: Player; notes: string[] } {
  let p = player;
  const notes: string[] = [];
  for (const u of SKILL_HELMET_UNLOCKS) {
    const level = p.knowledgeSkills[u.skill] ?? 0;
    const owned = p.inventory.some((i) => i.subtype === u.subtype);
    if (level >= u.threshold && !owned) {
      p = {
        ...p,
        inventory: [
          ...p.inventory,
          { id: uuidv4(), name: u.name, category: 'armor', subtype: u.subtype },
        ],
      };
      notes.push(u.note);
    }
  }
  return { player: p, notes };
}

/** Fast-forwards the calendar by n months (jail) — no events, resets actions. */
function skipMonths(p: Player, n: number): Player {
  let month = p.currentMonth;
  let year = p.currentYear;
  let age = p.age;
  for (let i = 0; i < n; i++) {
    month++;
    if (month > 12) { month = 1; year++; age++; }
  }
  return {
    ...p,
    currentMonth: month,
    currentYear: year,
    age,
    principalActionsUsed: 0,
    secondaryActionsUsed: 0,
  };
}

/** Find-or-create a recurring NPC by role and nudge their score. */
function ensureNpcScore(p: Player, role: string, profession: string, delta: number): Player {
  let relations = p.relations;
  let idx = relations.findIndex((r) => r.npcRole === role);
  if (idx < 0) {
    relations = [...relations, makeNpc(role, profession)];
    idx = relations.length - 1;
  }
  relations = relations.map((r, i) =>
    i === idx ? { ...r, score: clamp(r.score + delta) } : r,
  );
  return { ...p, relations };
}

function buildGriefDelta(statGroup: GriefModifier['statGroup'], statKey: string, amount: number): StatDelta {
  switch (statGroup) {
    case 'physicalStats': return { physicalStats: { [statKey as keyof PhysicalStats]: amount } };
    case 'combatSkills': return { combatSkills: { [statKey]: amount } as StatDelta['combatSkills'] };
    case 'ridingSkills': return { ridingSkills: { [statKey]: amount } as StatDelta['ridingSkills'] };
    case 'knowledgeSkills': return { knowledgeSkills: { [statKey]: amount } as StatDelta['knowledgeSkills'] };
  }
}

// ---------------------------------------------------------------------------
// Default player factory
// ---------------------------------------------------------------------------

const GAME_START_YEAR = 1312;

function makeDefaultPlayer(
  name: string,
  background: Background,
  skinTone: SkinTone,
  hair: Hair,
  ambition: string,
): Player {
  const startingAge = 15;

  const base: Player = {
    id: uuidv4(),
    name,
    age: startingAge,
    skinTone,
    hair,
    background,
    ambition,
    religion: 'christian',
    gold: 10,
    health: 100,
    maxHealth: 100,
    physicalStats: {
      strength: 0,
      agility: 0,
      endurance: 0,
      speed: 0,
    },
    combatSkills: {
      longSword: 0,
      lance: 0,
      axe: 0,
      swordAndShield: 0,
      heavyWeapon: 0,
      archery: 0,
    },
    ridingSkills: {
      horsemanship: 0,
      animalHandling: 0,
    },
    knowledgeSkills: {
      generalCulture: 0,
      literature: 0,
      religion: 0,
      medicine: 0,
      strategy: 0,
      eloquence: 0,
      apocryphal: 0,
    },
    prestige: {
      reputation: 0,
      glory: 0,
      honor: 0,
    },
    inventory: [],
    readBooks: [],
    flags: [],
    activeQuest: null,
    banditsDefeated: 0,
    eventsThisYear: 0,
    title: DEFAULT_TITLE_ID,
    unlockedTitles: [DEFAULT_TITLE_ID],
    counters: { churchMonth: 0, churchStreak: 0, churchYear: 0, huntMonth: 0, huntStreak: 0, tavernMonth: 0, tavernStreak: 0, craftJobs: 0 },
    equipment: { ...EMPTY_EQUIPMENT },
    merchantStock: {},
    merchantStockMonth: GAME_START_YEAR * 12 + 1,
    relations: generateFamily(startingAge),
    tournamentRecord: { wins: 0, losses: 0, titles: [] },
    followers: 0,
    history: [],
    currentYear: GAME_START_YEAR,
    currentMonth: 1,
    skillActivityUsedThisMonth: false,
    principalActionsUsed: 0,
    secondaryActionsUsed: 0,
    visitStreakLocation: null,
    visitStreakCount: 0,
    templeVisits: 0,
    griefModifiers: [],
    activePlague: false,
  };

  // Apply background bonuses via StatDelta machinery (without store dispatch).
  const bonuses = getBackgroundBonuses(background);
  return applyDeltaToPlayer(base, bonuses);
}

// ---------------------------------------------------------------------------
// Pure delta application (used both in store action and makeDefaultPlayer)
// ---------------------------------------------------------------------------

function applyDeltaToPlayer(player: Player, delta: StatDelta): Player {
  const next = { ...player };

  if (delta.gold !== undefined) {
    next.gold = Math.max(0, next.gold + delta.gold);
  }

  if (delta.followers !== undefined) {
    next.followers = Math.max(0, next.followers + delta.followers);
  }

  if (delta.physicalStats) {
    next.physicalStats = applyPhysicalDeltas(
      next.physicalStats,
      delta.physicalStats,
    );
  }

  if (delta.combatSkills) {
    const cs = { ...next.combatSkills };
    for (const key of Object.keys(delta.combatSkills) as Array<
      keyof typeof cs
    >) {
      if (delta.combatSkills[key] !== undefined) {
        cs[key] = clamp(cs[key] + (delta.combatSkills[key] ?? 0));
      }
    }
    next.combatSkills = cs;
  }

  if (delta.ridingSkills) {
    const rs = { ...next.ridingSkills };
    for (const key of Object.keys(delta.ridingSkills) as Array<
      keyof typeof rs
    >) {
      if (delta.ridingSkills[key] !== undefined) {
        rs[key] = clamp(rs[key] + (delta.ridingSkills[key] ?? 0));
      }
    }
    next.ridingSkills = rs;
  }

  if (delta.knowledgeSkills) {
    const ks = { ...next.knowledgeSkills };
    for (const key of Object.keys(delta.knowledgeSkills) as Array<
      keyof typeof ks
    >) {
      if (delta.knowledgeSkills[key] !== undefined) {
        // `?? 0` guards legacy saves lacking the newer `apocryphal` field.
        ks[key] = clamp((ks[key] ?? 0) + (delta.knowledgeSkills[key] ?? 0));
      }
    }
    next.knowledgeSkills = ks;
  }

  if (delta.prestige) {
    const pr = { ...next.prestige };
    // Floats are preserved for reputation and honor.
    if (delta.prestige.reputation !== undefined) {
      pr.reputation = Math.max(-100, Math.min(100, pr.reputation + delta.prestige.reputation));
    }
    if (delta.prestige.glory !== undefined) {
      pr.glory = Math.max(-100, Math.min(100, pr.glory + delta.prestige.glory));
    }
    if (delta.prestige.honor !== undefined) {
      pr.honor = Math.max(-100, Math.min(100, pr.honor + delta.prestige.honor));
    }
    next.prestige = pr;
  }

  return next;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface TournamentResultParams {
  won: boolean;
  /** True when the run ended by being caught cheating (disqualification). */
  disqualified?: boolean;
  title?: string;
  prizeMoney?: number;
  prizeGlory?: number;
  prizeReputation?: number;
  prizeHonor?: number;
  followersGain?: number;
  /** Health lost from tournament injuries (always applied, on win or loss). */
  healthLost?: number;
  /** Tournament metadata for title unlocks (Le Hardi, Le voyageur…). */
  tournamentType?: string;
  distance?: string;
  /** Prestige deltas from in-tournament choices/cheating — always applied, may be negative. */
  bonusGlory?: number;
  bonusReputation?: number;
  bonusHonor?: number;
  /** Gold gained/spent during the tournament (events). Always applied. */
  bonusGold?: number;
  historyText: string;
}

/** A village activity to perform, resolved from the screen's activity table. */
export interface ActivityRequest {
  kind: 'principal' | 'secondary';
  /** Location id, used for the consecutive-visit streak (tavern/church). */
  location?: string;
  statDelta?: StatDelta;
  /** Raises max health and heals by this amount (e.g. reading a medical text). */
  healthDelta?: number;
  /** Records this book subtype as read (one-time); blocks re-reading. */
  markBookRead?: string;
  /** Extra clarifying note appended to the result popup. */
  note?: string;
  /** Behaviour category for title counters (church piety, hunting, craft). */
  countsAs?: 'church' | 'hunt' | 'craft' | 'tavern';
  christianRelationDelta?: number;
  paganRelationDelta?: number;
  /** Find-or-create a recurring NPC (blacksmith/merchant/artisan) and nudge their score. */
  ensureNpc?: { role: string; profession: string };
  npcScoreDelta?: number;
  /** Chance to befriend a stranger (tavern socialising). */
  meetRandomFriend?: boolean;
  /** Chance to forage a small random item (forest/river strolls). */
  findItem?: {
    chance: number;
    pool: Array<{ name: string; category: Item['category']; subtype: string; weight?: number }>;
  };
  /** Deterministically grant N copies of an item (e.g. chopping wood → logs). */
  grantItem?: { name: string; category: Item['category']; subtype: string; count?: number };
  /** Sell every inventory item of this subtype at a unit price (bulk goods). */
  sellAll?: { subtype: string; unitPrice: number };
}

export interface ActivityResult {
  ok: boolean;
  /** Reason shown when the action is blocked (no slots left). */
  reason?: string;
  lines?: ChangeLine[];
  note?: string;
}

export interface TimeTransition {
  kind: 'month' | 'year' | 'death';
  fromYear: number;
  toYear: number;
}

/** Annual chance of dying of old age, by current age. */
function oldAgeDeathChance(age: number): number {
  if (age < 45) return 0;
  if (age < 55) return 0.01;
  if (age < 65) return 0.04;
  if (age < 75) return 0.10;
  return 0.20;
}

export interface GameState {
  player: Player | null;
  pendingEvent: GameEvent | null;
  /** Drives the full-screen fade overlay when time advances. Null when idle. */
  timeTransition: TimeTransition | null;
  /** Event rolled on advance, held back until the time-transition finishes. */
  deferredEvent: GameEvent | null;

  // Actions
  initNewGame: (name: string, background: Background, skinTone: SkinTone, hair: Hair, ambition: string) => void;
  advanceMonth: () => void;
  /** Ends the time-transition overlay and surfaces any deferred event. */
  endTimeTransition: () => void;
  /** Performs a village activity, honouring the monthly action limits. */
  performActivity: (req: ActivityRequest) => ActivityResult;
  /**
   * Consumes one monthly action slot if available, returning true on success.
   * Used to gate relation interactions against the same economy as village activities.
   */
  consumeActionSlot: (kind: 'principal' | 'secondary') => boolean;
  /** Resolves the pending event and returns a summary of what changed. */
  resolveEvent: (outcomeIndex: number) => ActivityResult;
  applyStatDelta: (delta: StatDelta) => void;
  /** Wounds the player (combat, hardship). Health 0 = death at month's end. */
  applyDamage: (amount: number) => void;
  /** Marks a bandit camp as cleared (quest tracking). */
  registerBanditVictory: (campId: string) => void;
  /** Equips an unlocked epithet as the displayed title. */
  setTitle: (titleId: string) => void;
  /** A successful market theft: gain the item, lose 1 honour, nothing else. */
  stealMarketSuccess: (item: Item) => void;
  /** Caught stealing (theft + escape failed): applies the escalating penalty. */
  commitTheftCaught: () => { level: number; jailed: number; note: string };
  /**
   * Adjusts relation scores by faith. The priest and any 'christian' NPC get
   * `christianDelta`; any 'pagan' NPC gets `paganDelta`. Used by the temple/church.
   */
  applyReligionRelationDelta: (christianDelta: number, paganDelta: number) => void;
  addToHistory: (text: string) => void;
  addItem: (item: Item) => void;
  /** Equips an owned item subtype into its slot (no-op if not owned or not equippable). */
  equipItem: (subtype: string) => void;
  /** Clears a single equipment slot. */
  unequipSlot: (slot: EquipSlot) => void;
  addRelation: (relation: Relation) => void;
  removeRelation: (personId: string) => void;
  /** Atomically deducts gold and adds item. No-ops if gold insufficient. */
  purchaseItem: (item: Item, cost: number) => void;
  /** Sells one item of a subtype to the merchant (refused past the per-item cap). */
  sellItem: (subtype: string) => ActivityResult;
  /** Deducts travel+entry cost and advances time by travelMonths (no event roll). */
  travelToTournament: (totalCost: number, months: number) => void;
  /** Updates tournamentRecord, applies prestige/gold prizes, logs history. */
  recordTournamentResult: (params: TournamentResultParams) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      player: null,
      pendingEvent: null,
      timeTransition: null,
      deferredEvent: null,

      initNewGame: (name, background, skinTone, hair, ambition) => {
        const player = makeDefaultPlayer(name, background, skinTone, hair, ambition);
        set({ player, pendingEvent: null, timeTransition: null, deferredEvent: null });
      },

      endTimeTransition: () => {
        const { deferredEvent } = get();
        set({ timeTransition: null, pendingEvent: deferredEvent ?? null, deferredEvent: null });
      },

      advanceMonth: () => {
        const { player } = get();
        if (!player) return;

        let month = player.currentMonth + 1;
        let year = player.currentYear;
        let age = player.age;
        const isNewYear = month > 12;

        if (isNewYear) {
          month = 1;
          year += 1;
          age += 1;
        }

        // Title streaks: months with ≥2 church visits / hunts chain up.
        const oldCounters = player.counters ?? {
          churchMonth: 0, churchStreak: 0, churchYear: 0, huntMonth: 0, huntStreak: 0, tavernMonth: 0, tavernStreak: 0, craftJobs: 0,
        };
        const rolledCounters = {
          ...oldCounters,
          churchStreak: oldCounters.churchMonth >= 2 ? oldCounters.churchStreak + 1 : 0,
          huntStreak: oldCounters.huntMonth >= 2 ? oldCounters.huntStreak + 1 : 0,
          tavernStreak: (oldCounters.tavernMonth ?? 0) >= 2 ? (oldCounters.tavernStreak ?? 0) + 1 : 0,
          churchMonth: 0,
          huntMonth: 0,
          tavernMonth: 0,
          // churchYear keeps the passed year's total until titles are evaluated
          // below; it is zeroed afterwards on a new year.
        };

        let updatedPlayer: Player = {
          ...player,
          currentMonth: month,
          currentYear: year,
          age,
          skillActivityUsedThisMonth: false,
          principalActionsUsed: 0,
          secondaryActionsUsed: 0,
          counters: rolledCounters,
        };

        const absMonth = year * 12 + month;

        // Merchant restocks (clears bought-back items) every few months.
        const stockStart = updatedPlayer.merchantStockMonth ?? absMonth;
        if (absMonth - stockStart >= MERCHANT_RESET_MONTHS) {
          updatedPlayer = { ...updatedPlayer, merchantStock: {}, merchantStockMonth: absMonth };
        }

        // Expire grief modifiers
        const expiredGriefs = updatedPlayer.griefModifiers.filter(
          (gm) => gm.expiresAtAbsoluteMonth <= absMonth,
        );
        for (const gm of expiredGriefs) {
          updatedPlayer = applyDeltaToPlayer(
            updatedPlayer,
            buildGriefDelta(gm.statGroup, gm.statKey, 2),
          );
        }
        if (expiredGriefs.length > 0) {
          updatedPlayer = {
            ...updatedPlayer,
            griefModifiers: updatedPlayer.griefModifiers.filter(
              (gm) => gm.expiresAtAbsoluteMonth > absMonth,
            ),
          };
        }

        // Yearly: age up relations, check deaths
        if (isNewYear) {
          const agedRelations = updatedPlayer.relations.map((r) => ({
            ...r,
            age: r.age + 1,
          }));
          updatedPlayer = { ...updatedPlayer, relations: agedRelations };

          const deadIds: string[] = [];
          const newGriefModifiers = [...updatedPlayer.griefModifiers];

          for (const rel of updatedPlayer.relations) {
            if (rel.age < 70) continue;
            const deathChance = updatedPlayer.activePlague ? 0.25 : 0.10;
            if (Math.random() < deathChance) {
              deadIds.push(rel.personId);
              const { statGroup, statKey } = pickGriefStat();
              updatedPlayer = applyDeltaToPlayer(
                updatedPlayer,
                buildGriefDelta(statGroup, statKey, -2),
              );
              newGriefModifiers.push({
                statGroup,
                statKey,
                expiresAtAbsoluteMonth: absMonth + 12,
                personName: rel.name,
              });
              updatedPlayer = {
                ...updatedPlayer,
                history: [
                  ...updatedPlayer.history,
                  {
                    age: updatedPlayer.age,
                    month,
                    text: `${rel.name} est décédé(e) à l'âge de ${rel.age} ans. Le deuil vous pèse.`,
                  },
                ],
              };
            }
          }

          if (deadIds.length > 0) {
            updatedPlayer = {
              ...updatedPlayer,
              relations: updatedPlayer.relations.filter(
                (r) => !deadIds.includes(r.personId),
              ),
              griefModifiers: newGriefModifiers,
              activePlague: false,
            };
          } else {
            updatedPlayer = { ...updatedPlayer, activePlague: false };
          }
        }

        // Knowledge-gated equipment unlocks (safety net beyond performActivity)
        {
          const unlock = grantSkillUnlocks(updatedPlayer);
          if (unlock.notes.length > 0) {
            updatedPlayer = {
              ...unlock.player,
              history: [
                ...unlock.player.history,
                ...unlock.notes.map((text) => ({ age: updatedPlayer.age, month, text })),
              ],
            };
          }
        }

        // Titles earned over time (streaks, yearly piety, riches…)
        {
          const t = applyTitleUnlocks(updatedPlayer);
          if (t.notes.length > 0) {
            updatedPlayer = {
              ...t.player,
              history: [
                ...t.player.history,
                ...t.notes.map((text) => ({ age: updatedPlayer.age, month, text })),
              ],
            };
          }
          if (isNewYear && updatedPlayer.counters) {
            updatedPlayer = {
              ...updatedPlayer,
              counters: { ...updatedPlayer.counters, churchYear: 0 },
            };
          }
        }

        // Monthly recovery: rest mends the body a little.
        {
          const maxHp = updatedPlayer.maxHealth ?? 100;
          const hp = updatedPlayer.health ?? maxHp;
          if (hp > 0 && hp < maxHp) {
            updatedPlayer = { ...updatedPlayer, health: Math.min(maxHp, hp + 3) };
          }
        }

        // ── Active contract: completion / expiry ───────────────────────────
        let questEvent: GameEvent | null = null;
        if (updatedPlayer.activeQuest) {
          const def = questById(updatedPlayer.activeQuest.id);
          if (!def) {
            updatedPlayer = { ...updatedPlayer, activeQuest: null };
          } else if (def.isComplete(updatedPlayer, updatedPlayer.activeQuest.baseline)) {
            // Reward
            if (def.reward.statDelta) {
              updatedPlayer = applyDeltaToPlayer(updatedPlayer, def.reward.statDelta);
            }
            if (def.reward.gold) {
              updatedPlayer = { ...updatedPlayer, gold: updatedPlayer.gold + def.reward.gold };
            }
            if (def.reward.npc) {
              const { role, profession, scoreDelta } = def.reward.npc;
              let idx = updatedPlayer.relations.findIndex((r) => r.npcRole === role);
              if (idx < 0) {
                updatedPlayer = {
                  ...updatedPlayer,
                  relations: [...updatedPlayer.relations, makeNpc(role, profession)],
                };
                idx = updatedPlayer.relations.length - 1;
              }
              updatedPlayer = {
                ...updatedPlayer,
                relations: updatedPlayer.relations.map((r, i) =>
                  i === idx ? { ...r, score: clamp(r.score + scoreDelta) } : r,
                ),
              };
            }
            updatedPlayer = {
              ...updatedPlayer,
              activeQuest: null,
              flags: [...(updatedPlayer.flags ?? []), `quest_done_${def.id}`],
              history: [
                ...updatedPlayer.history,
                { age: updatedPlayer.age, month, text: `Contrat rempli : ${def.title}. ${def.rewardText}.` },
              ],
            };
            questEvent = {
              id: `quest_complete_${def.id}`,
              type: 'monthly',
              title: 'Contrat rempli !',
              description: `${def.giver} tient parole : « ${def.title} » est accompli. Votre récompense : ${def.rewardText}.`,
              outcomes: [{ label: 'Recevoir votre dû', historyText: `Récompense touchée : ${def.rewardText}.` }],
            };
          } else {
            const absNow = updatedPlayer.currentYear * 12 + updatedPlayer.currentMonth;
            if (absNow - updatedPlayer.activeQuest.startAbsMonth >= def.durationMonths) {
              updatedPlayer = applyDeltaToPlayer(updatedPlayer, {
                prestige: { reputation: -def.failPenalty },
              });
              updatedPlayer = {
                ...updatedPlayer,
                activeQuest: null,
                history: [
                  ...updatedPlayer.history,
                  { age: updatedPlayer.age, month, text: `Contrat échoué : ${def.title}. Votre parole vaut moins désormais.` },
                ],
              };
              questEvent = {
                id: `quest_failed_${def.id}`,
                type: 'monthly',
                title: 'Contrat échoué',
                description: `Le délai est passé : « ${def.title} » n'a pas été honoré. ${def.giver} s'en souviendra (Réputation −${def.failPenalty}).`,
                outcomes: [{ label: 'Encaisser le revers', historyText: `Vous n'avez pas honoré le contrat de ${def.giver.toLowerCase()}.` }],
              };
            }
          }
        }

        const rolledEvent =
          questEvent ??
          (isNewYear ? rollAnnualEvent(updatedPlayer) : rollMonthlyEvent(updatedPlayer));

        // Pace tracking: at least 3 events a year (see rollMonthlyEvent pressure).
        updatedPlayer = {
          ...updatedPlayer,
          eventsThisYear:
            (isNewYear ? 0 : updatedPlayer.eventsThisYear ?? 0) + (rolledEvent ? 1 : 0),
        };

        // Defer the event until the fade animation finishes (see endTimeTransition).
        // ── Mortality ──────────────────────────────────────────────────────
        // Health exhausted (wounds/illness) or old age at the turn of the year.
        let deathCause: string | null = null;
        if ((updatedPlayer.health ?? 100) <= 0) {
          deathCause = 'Succombé à ses blessures';
        } else if (isNewYear) {
          // NB: player.activePlague is the pre-update value — the reset above
          // happens at year end, so the plague year itself keeps its bite.
          const chance =
            oldAgeDeathChance(updatedPlayer.age) * (player.activePlague ? 2 : 1);
          if (Math.random() < chance) {
            deathCause =
              updatedPlayer.age >= 60
                ? "Mort de vieillesse, entouré des siens"
                : 'Emporté par une mauvaise fièvre';
          }
        }

        if (deathCause) {
          set({
            player: {
              ...updatedPlayer,
              isDead: true,
              deathCause,
              history: [
                ...updatedPlayer.history,
                {
                  age: updatedPlayer.age,
                  month,
                  text: `${updatedPlayer.name} s'éteint à ${updatedPlayer.age} ans. ${deathCause}.`,
                },
              ],
            },
            pendingEvent: null,
            deferredEvent: null,
            timeTransition: {
              kind: 'death',
              fromYear: player.currentYear,
              toYear: year,
            },
          });
          return;
        }

        set({
          player: updatedPlayer,
          pendingEvent: null,
          deferredEvent: rolledEvent ?? null,
          timeTransition: {
            kind: isNewYear ? 'year' : 'month',
            fromYear: player.currentYear,
            toYear: year,
          },
        });
      },

      resolveEvent: (outcomeIndex) => {
        const { player, pendingEvent } = get();
        if (!player || !pendingEvent) return { ok: false };

        const outcome = pendingEvent.outcomes[outcomeIndex];
        if (!outcome) return { ok: false };

        let next = { ...player };
        const lines: ChangeLine[] = [];
        const noteParts: string[] = [outcome.historyText];

        if (outcome.statDelta) {
          next = applyDeltaToPlayer(next, outcome.statDelta);
          lines.push(...formatStatDelta(outcome.statDelta));
        }

        if (outcome.goldDelta) {
          next = { ...next, gold: Math.max(0, next.gold + outcome.goldDelta) };
          lines.push({ label: 'Or', value: outcome.goldDelta });
        }

        if (outcome.addItem) {
          const item: Item = { ...outcome.addItem, id: uuidv4() };
          next = { ...next, inventory: [...next.inventory, item] };
          noteParts.push(`Obtenu : ${item.name}.`);
        }

        if (outcome.removeItem) {
          const idx = next.inventory.findIndex(
            (i) => i.subtype === outcome.removeItem,
          );
          if (idx >= 0) {
            const removed = next.inventory[idx];
            next = {
              ...next,
              inventory: next.inventory.filter((_, i) => i !== idx),
            };
            noteParts.push(`Perdu : ${removed.name}.`);
          }
        }

        if (outcome.relationDelta) {
          const { relationType, amount } = outcome.relationDelta;
          next = {
            ...next,
            relations: next.relations.map((r) =>
              r.type === relationType
                ? { ...r, score: Math.max(-100, Math.min(100, r.score + amount)) }
                : r,
            ),
          };
          lines.push({ label: `Relation (${relationType})`, value: amount });
        }

        if (outcome.ensureNpc) {
          const { role, profession, scoreDelta } = outcome.ensureNpc;
          let idx = next.relations.findIndex((r) => r.npcRole === role);
          if (idx < 0) {
            const npc = makeNpc(role, profession);
            next = { ...next, relations: [...next.relations, npc] };
            idx = next.relations.length - 1;
            noteParts.push(`Vous avez fait la connaissance de ${npc.name}.`);
          }
          if (scoreDelta !== 0) {
            const target = next.relations[idx];
            const updated = { ...target, score: clamp(target.score + scoreDelta) };
            next = {
              ...next,
              relations: next.relations.map((r, i) => (i === idx ? updated : r)),
            };
            lines.push({ label: `Relation : ${updated.name}`, value: scoreDelta });
          }
        }

        if (outcome.setFlags && outcome.setFlags.length > 0) {
          const cur = next.flags ?? [];
          next = { ...next, flags: [...cur, ...outcome.setFlags.filter((f) => !cur.includes(f))] };
        }

        if (outcome.healthDamage && outcome.healthDamage > 0) {
          const hp = Math.max(0, (next.health ?? next.maxHealth ?? 100) - outcome.healthDamage);
          next = { ...next, health: hp };
          lines.push({ label: 'Points de vie', value: -outcome.healthDamage });
          if (hp <= 0) noteParts.push('Vos forces vous abandonnent…');
        }

        if (outcome.acceptQuest) {
          const def = questById(outcome.acceptQuest);
          if (def && !next.activeQuest) {
            next = {
              ...next,
              activeQuest: {
                id: def.id,
                startAbsMonth: next.currentYear * 12 + next.currentMonth,
                baseline: def.baseline(next),
              },
            };
            noteParts.push(`Objectif : ${def.objective} (${def.durationMonths} mois).`);
          }
        }

        if (outcome.setActivePlague) {
          next = { ...next, activePlague: true };
        }

        next = {
          ...next,
          history: [
            ...next.history,
            { age: next.age, month: next.currentMonth, text: outcome.historyText },
          ],
        };

        set({ player: next, pendingEvent: null });
        return { ok: true, lines, note: noteParts.join(' ') };
      },

      applyStatDelta: (delta) => {
        const { player } = get();
        if (!player) return;
        set({ player: applyDeltaToPlayer(player, delta) });
      },

      applyDamage: (amount) => {
        const { player } = get();
        if (!player || amount <= 0) return;
        const hp = Math.max(0, (player.health ?? player.maxHealth ?? 100) - amount);
        set({ player: { ...player, health: hp } });
      },

      registerBanditVictory: (campId) => {
        const { player } = get();
        if (!player) return;
        const absMonth = player.currentYear * 12 + player.currentMonth;
        set({
          player: {
            ...player,
            banditsDefeated: (player.banditsDefeated ?? 0) + 1,
            banditCampClears: { ...(player.banditCampClears ?? {}), [campId]: absMonth },
          },
        });
      },

      setTitle: (titleId) => {
        const { player } = get();
        if (!player) return;
        if (!(player.unlockedTitles ?? [DEFAULT_TITLE_ID]).includes(titleId)) return;
        set({ player: { ...player, title: titleId } });
      },

      stealMarketSuccess: (item) => {
        const { player } = get();
        if (!player) return;
        let next = applyDeltaToPlayer(player, { prestige: { honor: -1 } });
        next = {
          ...next,
          inventory: [...next.inventory, { ...item, id: uuidv4() }],
          history: [
            ...next.history,
            { age: next.age, month: next.currentMonth, text: `Vol réussi au marché : ${item.name}.` },
          ],
        };
        set({ player: next });
      },

      commitTheftCaught: () => {
        const { player } = get();
        if (!player) return { level: 0, jailed: 0, note: '' };

        const level = (player.caughtThefts ?? 0) + 1;
        const isOutlaw = player.background === 'outlaw';
        const fine = level === 1 ? 10 : level === 2 ? 25 : 0;
        const jailed = level >= 3 ? 3 : 0;
        const repLoss = level === 1 ? 3 : level === 2 ? 5 : 8;
        const parentLoss = level <= 2 ? (level === 1 ? 5 : 8) : 10;
        const bailiffLoss = level <= 2 ? (level === 1 ? 8 : 12) : 15;

        let next: Player = { ...player, caughtThefts: level };
        const parts: string[] = [];

        if (fine > 0) {
          next = { ...next, gold: Math.max(0, next.gold - fine) };
          parts.push(`Amende : ${fine} or`);
        }
        next = applyDeltaToPlayer(next, { prestige: { reputation: -repLoss } });
        parts.push(`Réputation −${repLoss}`);

        if (!isOutlaw) {
          next = {
            ...next,
            relations: next.relations.map((r) =>
              r.type === 'father' || r.type === 'mother'
                ? { ...r, score: clamp(r.score - parentLoss) }
                : r,
            ),
          };
          parts.push('Vos parents sont déshonorés');
        }

        next = ensureNpcScore(next, 'bailiff', 'le bailli', -bailiffLoss);
        parts.push('Le bailli vous en tient rigueur');

        const flags = [...(next.flags ?? [])];
        if (level >= 4 && !flags.includes('banned_market')) {
          flags.push('banned_market');
          parts.push('Banni du travail au marché');
        }
        if (level >= 5) {
          if (!flags.includes('banned_guard')) flags.push('banned_guard');
          if (!flags.includes('banned_bailiff')) flags.push('banned_bailiff');
          parts.push('Banni du poste de garde et du bailli');
        }
        next = { ...next, flags };

        if (jailed > 0) {
          parts.unshift(`Prison : ${jailed} mois aux geôles du poste de garde`);
          next = skipMonths(next, jailed);
        }

        const note = parts.join(' · ');
        next = {
          ...next,
          history: [
            ...next.history,
            { age: next.age, month: next.currentMonth, text: `Pris à voler au marché. ${note}.` },
          ],
        };
        set({ player: next });
        return { level, jailed, note };
      },

      applyReligionRelationDelta: (christianDelta, paganDelta) => {
        const { player } = get();
        if (!player) return;
        const relations = player.relations.map((r) => {
          const faith = r.religion ?? 'christian';
          // The priest always counts as Christian, regardless of stored faith.
          const isChristian = faith === 'christian' || r.type === 'priest';
          const d = isChristian ? christianDelta : faith === 'pagan' ? paganDelta : 0;
          if (d === 0) return r;
          return {
            ...r,
            score: Math.max(-100, Math.min(100, r.score + d)),
          };
        });
        set({ player: { ...player, relations } });
      },

      performActivity: (req) => {
        const { player } = get();
        if (!player) return { ok: false, reason: 'Aucun personnage.' };

        const principalUsed = player.principalActionsUsed ?? 0;
        const secondaryUsed = player.secondaryActionsUsed ?? 0;

        // Single fatigue gauge: each action spends energy; none left → exhausted.
        if (energyUsed(player) + energyCost(req.kind) > ENERGY_CAPACITY) {
          return { ok: false, reason: 'Vous êtes épuisé. Passez au mois suivant pour récupérer vos forces.' };
        }

        // A book can only be read once.
        if (req.markBookRead && (player.readBooks ?? []).includes(req.markBookRead)) {
          return { ok: false, reason: 'Vous avez déjà lu ce livre.' };
        }

        let next: Player = { ...player };
        const lines: ChangeLine[] = [];
        const noteParts: string[] = [];

        // 1. Direct stat changes
        if (req.statDelta) {
          next = applyDeltaToPlayer(next, req.statDelta);
          lines.push(...formatStatDelta(req.statDelta));

          // Dishonourable acts (honour loss) shame the family — parents' regard drops.
          const honorDelta = req.statDelta.prestige?.honor ?? 0;
          if (honorDelta < 0) {
            const famPenalty = honorDelta * 2;
            next = {
              ...next,
              relations: next.relations.map((r) =>
                r.type === 'father' || r.type === 'mother'
                  ? { ...r, score: clamp(r.score + famPenalty) }
                  : r,
              ),
            };
            lines.push({ label: 'Relations parentales', value: famPenalty });
          }
        }

        // 1b. Health / vitality (raises max and heals to it — e.g. medical texts)
        if (req.healthDelta) {
          const curMax = next.maxHealth ?? 100;
          const curHp = next.health ?? curMax;
          const newMax = Math.max(0, Math.min(999, curMax + req.healthDelta));
          next = { ...next, maxHealth: newMax, health: Math.min(newMax, curHp + req.healthDelta) };
          lines.push({ label: 'Points de vie', value: req.healthDelta });
        }

        // 1c. Record a finished book (one-time) + optional clarifying note.
        if (req.markBookRead && !(next.readBooks ?? []).includes(req.markBookRead)) {
          next = { ...next, readBooks: [...(next.readBooks ?? []), req.markBookRead] };
        }
        if (req.note) noteParts.push(req.note);

        // 2. Faith-based relation shift (priest + Christians vs pagans)
        const cd = req.christianRelationDelta ?? 0;
        const pd = req.paganRelationDelta ?? 0;
        if (cd !== 0 || pd !== 0) {
          next = {
            ...next,
            relations: next.relations.map((r) => {
              const faith = r.religion ?? 'christian';
              const isChristian = faith === 'christian' || r.type === 'priest';
              const d = isChristian ? cd : faith === 'pagan' ? pd : 0;
              return d === 0 ? r : { ...r, score: clamp(r.score + d) };
            }),
          };
          if (cd !== 0) lines.push({ label: 'Relations chrétiennes', value: cd });
          if (pd !== 0) lines.push({ label: 'Relations païennes', value: pd });
        }

        // 3. Recurring NPC (find-or-create, then adjust their score)
        if (req.ensureNpc) {
          const { role, profession } = req.ensureNpc;
          let idx = next.relations.findIndex((r) => r.npcRole === role);
          if (idx < 0) {
            const npc = makeNpc(role, profession);
            next = { ...next, relations: [...next.relations, npc] };
            idx = next.relations.length - 1;
            noteParts.push(`Vous avez fait la connaissance de ${npc.name}.`);
          }
          const delta = req.npcScoreDelta ?? 0;
          if (delta !== 0) {
            const target = next.relations[idx];
            const updated = { ...target, score: clamp(target.score + delta) };
            next = {
              ...next,
              relations: next.relations.map((r, i) => (i === idx ? updated : r)),
            };
            lines.push({ label: `Relation : ${updated.name}`, value: delta });
          }
        }

        // 4. Forage a small random item (weighted pick)
        let foundSomething = false;
        if (req.findItem && req.findItem.pool.length > 0 && Math.random() < req.findItem.chance) {
          const pool = req.findItem.pool;
          const totalWeight = pool.reduce((sum, it) => sum + (it.weight ?? 1), 0);
          let roll = Math.random() * totalWeight;
          let picked = pool[0];
          for (const it of pool) {
            roll -= it.weight ?? 1;
            if (roll < 0) {
              picked = it;
              break;
            }
          }
          const item: Item = {
            id: uuidv4(),
            name: picked.name,
            category: picked.category,
            subtype: picked.subtype,
          };
          next = { ...next, inventory: [...next.inventory, item] };
          noteParts.push(`Vous avez trouvé : ${item.name}.`);
          foundSomething = true;
        }

        // 4b. Deterministic item grant (e.g. chopping wood yields logs)
        if (req.grantItem) {
          const { name, category, subtype, count = 1 } = req.grantItem;
          const granted: Item[] = Array.from({ length: count }, () => ({
            id: uuidv4(), name, category, subtype,
          }));
          next = { ...next, inventory: [...next.inventory, ...granted] };
          lines.push({ label: name, value: count });
        }

        // 4c. Sell all inventory items of a subtype at a unit price (bulk goods)
        if (req.sellAll) {
          const { subtype, unitPrice } = req.sellAll;
          const sold = next.inventory.filter((i) => i.subtype === subtype);
          if (sold.length > 0) {
            const total = sold.length * unitPrice;
            next = {
              ...next,
              inventory: next.inventory.filter((i) => i.subtype !== subtype),
              gold: next.gold + total,
            };
            lines.push({ label: 'Or', value: total });
            noteParts.push(`Vendu : ${sold.length} × ${sold[0].name} (+${total} g).`);
          } else {
            noteParts.push("Vous n'avez rien à vendre.");
          }
        }

        // 5. Random new friend (socialising / strolling)
        if (req.meetRandomFriend) {
          if (Math.random() < 0.4) {
            const friend = makeRandomFriend(next.age);
            next = { ...next, relations: [...next.relations, friend] };
            noteParts.push(`Vous avez fait la connaissance de ${friend.name}.`);
            foundSomething = true;
          }
        }

        // Stroll with nothing to show
        if ((req.meetRandomFriend || req.findItem) && !foundSomething) {
          noteParts.push("Rien d'intéressant cette fois-ci.");
        }

        // Track cumulative temple visits (affects church access)
        if (req.location === 'temple') {
          next = { ...next, templeVisits: (next.templeVisits ?? 0) + 1 };
        }

        // 6. Consecutive-visit streak (tavern penalty / church bonus)
        if (req.location) {
          const sameLoc = (next.visitStreakLocation ?? null) === req.location;
          const count = (sameLoc ? next.visitStreakCount ?? 0 : 0) + 1;
          next = { ...next, visitStreakLocation: req.location, visitStreakCount: count };

          if (count >= STREAK_THRESHOLD && count % STREAK_THRESHOLD === 0) {
            if (req.location === 'tavern') {
              next = applyDeltaToPlayer(next, { prestige: { honor: -3, reputation: -2 } });
              lines.push({ label: 'Honneur', value: -3 });
              lines.push({ label: 'Réputation', value: -2 });
              noteParts.push('On jase sur vos excès à la taverne.');
            } else if (req.location === 'church') {
              next = applyDeltaToPlayer(next, { prestige: { honor: 2, reputation: 1 } });
              lines.push({ label: 'Honneur', value: 2 });
              lines.push({ label: 'Réputation', value: 1 });
              noteParts.push('Votre piété assidue est remarquée.');
            }
          }
        }

        // Knowledge-gated equipment (e.g. high religion / apocryphal → a helmet)
        {
          const unlock = grantSkillUnlocks(next);
          next = unlock.player;
          noteParts.push(...unlock.notes);
        }

        // Title counters (piety, hunting, craft) + freshly earned epithets
        if (req.countsAs) {
          const cnt = next.counters ?? {
            churchMonth: 0, churchStreak: 0, churchYear: 0, huntMonth: 0, huntStreak: 0, tavernMonth: 0, tavernStreak: 0, craftJobs: 0,
          };
          next = {
            ...next,
            counters: {
              ...cnt,
              churchMonth: cnt.churchMonth + (req.countsAs === 'church' ? 1 : 0),
              churchYear: cnt.churchYear + (req.countsAs === 'church' ? 1 : 0),
              huntMonth: cnt.huntMonth + (req.countsAs === 'hunt' ? 1 : 0),
              tavernMonth: (cnt.tavernMonth ?? 0) + (req.countsAs === 'tavern' ? 1 : 0),
              craftJobs: cnt.craftJobs + (req.countsAs === 'craft' ? 1 : 0),
            },
          };
        }
        {
          const t = applyTitleUnlocks(next);
          next = t.player;
          noteParts.push(...t.notes);
        }

        // 6. Consume the action slot
        if (req.kind === 'principal') {
          next = {
            ...next,
            principalActionsUsed: principalUsed + 1,
            skillActivityUsedThisMonth: true,
          };
        } else {
          next = { ...next, secondaryActionsUsed: secondaryUsed + 1 };
        }

        set({ player: next });
        return { ok: true, lines, note: noteParts.length ? noteParts.join(' ') : undefined };
      },

      consumeActionSlot: (kind) => {
        const { player } = get();
        if (!player) return false;
        // Gate on the shared fatigue gauge rather than per-kind caps.
        if (energyUsed(player) + energyCost(kind) > ENERGY_CAPACITY) return false;
        if (kind === 'principal') {
          set({
            player: {
              ...player,
              principalActionsUsed: (player.principalActionsUsed ?? 0) + 1,
              skillActivityUsedThisMonth: true,
            },
          });
          return true;
        }
        set({
          player: {
            ...player,
            secondaryActionsUsed: (player.secondaryActionsUsed ?? 0) + 1,
          },
        });
        return true;
      },

      addToHistory: (text) => {
        const { player } = get();
        if (!player) return;
        const event = {
          age: player.age,
          month: player.currentMonth,
          text,
        };
        set({ player: { ...player, history: [...player.history, event] } });
      },

      addItem: (item) => {
        const { player } = get();
        if (!player) return;
        set({ player: { ...player, inventory: [...player.inventory, item] } });
      },

      equipItem: (subtype) => {
        const { player } = get();
        if (!player) return;
        const slot = slotForSubtype(subtype);
        if (!slot) return;
        if (!player.inventory.some((i) => i.subtype === subtype)) return;
        const equipment = { ...(player.equipment ?? EMPTY_EQUIPMENT), [slot]: subtype };
        set({ player: { ...player, equipment } });
      },

      unequipSlot: (slot) => {
        const { player } = get();
        if (!player) return;
        const equipment = { ...(player.equipment ?? EMPTY_EQUIPMENT), [slot]: null };
        set({ player: { ...player, equipment } });
      },

      addRelation: (relation) => {
        const { player } = get();
        if (!player) return;
        const existing = player.relations.findIndex(
          (r) => r.personId === relation.personId,
        );
        const updated =
          existing >= 0
            ? player.relations.map((r, i) => (i === existing ? relation : r))
            : [...player.relations, relation];
        set({ player: { ...player, relations: updated } });
      },

      removeRelation: (personId) => {
        const { player } = get();
        if (!player) return;
        set({
          player: {
            ...player,
            relations: player.relations.filter((r) => r.personId !== personId),
          },
        });
      },

      purchaseItem: (item, cost) => {
        const { player } = get();
        if (!player || player.gold < cost) return;
        set({
          player: {
            ...player,
            gold: player.gold - cost,
            inventory: [...player.inventory, item],
          },
        });
      },

      sellItem: (subtype) => {
        const { player } = get();
        if (!player) return { ok: false, reason: 'Aucun personnage.' };

        const stock = player.merchantStock ?? {};
        if ((stock[subtype] ?? 0) >= MERCHANT_MAX_PER_ITEM) {
          return { ok: false, reason: "Le marchand en a déjà trop — il refuse d'en acheter plus." };
        }

        const idx = player.inventory.findIndex((i) => i.subtype === subtype);
        if (idx < 0) return { ok: false, reason: "Vous n'avez pas cet objet." };

        const inventory = player.inventory.filter((_, i) => i !== idx);

        // Unequip if that was the last copy of an equipped item.
        let equipment = player.equipment ?? EMPTY_EQUIPMENT;
        if (!inventory.some((i) => i.subtype === subtype)) {
          const slot = slotForSubtype(subtype);
          if (slot && equipment[slot] === subtype) {
            equipment = { ...equipment, [slot]: null };
          }
        }

        set({
          player: {
            ...player,
            inventory,
            equipment,
            gold: player.gold + ITEM_SELL_PRICE,
            merchantStock: { ...stock, [subtype]: (stock[subtype] ?? 0) + 1 },
          },
        });
        return { ok: true };
      },

      travelToTournament: (totalCost, months) => {
        const { player } = get();
        if (!player) return;

        let month = player.currentMonth;
        let year = player.currentYear;
        let age = player.age;

        for (let i = 0; i < months; i++) {
          month += 1;
          if (month > 12) {
            month = 1;
            year += 1;
            age += 1;
          }
        }

        set({
          player: {
            ...player,
            gold: Math.max(0, player.gold - totalCost),
            currentMonth: month,
            currentYear: year,
            age,
            skillActivityUsedThisMonth: true,
          },
        });
      },

      recordTournamentResult: (params) => {
        const { player } = get();
        if (!player) return;

        let next = { ...player };

        if (params.won) {
          next.tournamentRecord = {
            wins: next.tournamentRecord.wins + 1,
            losses: next.tournamentRecord.losses,
            lossStreak: 0,
            titles: params.title
              ? [...next.tournamentRecord.titles, params.title]
              : next.tournamentRecord.titles,
          };
          next = applyDeltaToPlayer(next, {
            gold: params.prizeMoney ?? 0,
            followers: params.followersGain ?? 0,
            prestige: {
              glory: params.prizeGlory ?? 0,
              reputation: params.prizeReputation ?? 0,
              honor: params.prizeHonor ?? 0,
            },
          });
        } else {
          next.tournamentRecord = {
            wins: next.tournamentRecord.wins,
            losses: next.tournamentRecord.losses + 1,
            lossStreak: (next.tournamentRecord.lossStreak ?? 0) + 1,
            titles: next.tournamentRecord.titles,
          };
          // A clean defeat costs a little glory; in contact disciplines it also
          // leaves bruises. Archery/poetry/chess defeats don't wound you.
          // A disqualification for cheating is its own (harsher) punishment.
          if (!params.disqualified) {
            next = applyDeltaToPlayer(next, { prestige: { glory: -3 } });
            const contact =
              params.tournamentType === 'melee' ||
              params.tournamentType === 'joust' ||
              params.tournamentType === 'swordDuel' ||
              params.tournamentType === undefined;
            if (contact) {
              const wound = 5 + Math.floor(Math.random() * 11); // 5–15
              next = {
                ...next,
                health: Math.max(0, (next.health ?? next.maxHealth ?? 100) - wound),
              };
            }
          }
        }

        // Side effects from in-tournament choices, applied on win or loss.
        next = applyDeltaToPlayer(next, {
          gold: params.bonusGold ?? 0,
          prestige: {
            glory: params.bonusGlory ?? 0,
            reputation: params.bonusReputation ?? 0,
            honor: params.bonusHonor ?? 0,
          },
        });
        if (params.healthLost && params.healthLost > 0) {
          next = {
            ...next,
            health: Math.max(0, (next.health ?? next.maxHealth ?? 100) - params.healthLost),
          };
        }

        // Title flags from tournament context.
        {
          const flags = [...(next.flags ?? [])];
          const armor = next.equipment?.armor ?? null;
          // "Le Hardi": on-foot close combat (mêlée/duel — not the mounted joust)
          // fought WITHOUT the full plate.
          const onFootCombat =
            params.tournamentType === 'melee' || params.tournamentType === 'swordDuel';
          if (
            onFootCombat &&
            armor !== 'full_plate' &&
            !flags.includes('fought_unarmored')
          ) {
            flags.push('fought_unarmored');
          }
          if (params.distance === 'distant' && !flags.includes('traveled_distant')) {
            flags.push('traveled_distant');
          }
          next = { ...next, flags };
        }

        next = {
          ...next,
          history: [
            ...next.history,
            { age: next.age, month: next.currentMonth, text: params.historyText },
          ],
        };

        // Titles earned on the spot (tournoyeur, maudit, hardi…)
        {
          const t = applyTitleUnlocks(next);
          next = {
            ...t.player,
            history: [
              ...t.player.history,
              ...t.notes.map((text) => ({ age: next.age, month: next.currentMonth, text })),
            ],
          };
        }

        set({ player: next });
      },
    }),
    {
      name: 'medieval_save_v1',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: cleared the inventory once (items had been seeded to preview sprites).
      // v2: removed the unused craft skills (tailoring/blacksmithing/bowyer).
      version: 2,
      migrate: (persistedState: any, fromVersion: number) => {
        if (!persistedState?.player) return persistedState;
        if (fromVersion < 1) {
          persistedState.player = { ...persistedState.player, inventory: [] };
        }
        if (fromVersion < 2) {
          const { craftSkills, ...rest } = persistedState.player;
          persistedState.player = rest;
        }
        return persistedState;
      },
    },
  ),
);
