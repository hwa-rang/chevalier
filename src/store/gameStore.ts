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
  PhysicalStats,
} from '../types/game';
import { getBackgroundBonuses } from '../utils/backgrounds';
import { generateFamily } from '../utils/familyGenerator';
import type { GameEvent } from '../data/events';
import { rollMonthlyEvent, rollAnnualEvent } from '../utils/eventEngine';

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

function buildGriefDelta(statGroup: GriefModifier['statGroup'], statKey: string, amount: number): StatDelta {
  switch (statGroup) {
    case 'physicalStats': return { physicalStats: { [statKey as keyof PhysicalStats]: amount } };
    case 'combatSkills': return { combatSkills: { [statKey]: amount } as StatDelta['combatSkills'] };
    case 'ridingSkills': return { ridingSkills: { [statKey]: amount } as StatDelta['ridingSkills'] };
    case 'knowledgeSkills': return { knowledgeSkills: { [statKey]: amount } as StatDelta['knowledgeSkills'] };
    case 'craftSkills': return { craftSkills: { [statKey]: amount } as StatDelta['craftSkills'] };
  }
}

// ---------------------------------------------------------------------------
// Default player factory
// ---------------------------------------------------------------------------

const GAME_START_YEAR = 1200;

function makeDefaultPlayer(
  name: string,
  background: Background,
  skinTone: SkinTone,
): Player {
  const startingAge = 14;

  const base: Player = {
    id: uuidv4(),
    name,
    age: startingAge,
    skinTone,
    background,
    gold: 10,
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
    },
    craftSkills: {
      tailoring: 0,
      blacksmithing: 0,
      bowyer: 0,
    },
    prestige: {
      reputation: 0,
      glory: 0,
      honor: 0,
    },
    inventory: [],
    relations: generateFamily(startingAge),
    tournamentRecord: { wins: 0, losses: 0, titles: [] },
    followers: 0,
    history: [],
    currentYear: GAME_START_YEAR,
    currentMonth: 1,
    skillActivityUsedThisMonth: false,
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
        ks[key] = clamp(ks[key] + (delta.knowledgeSkills[key] ?? 0));
      }
    }
    next.knowledgeSkills = ks;
  }

  if (delta.craftSkills) {
    const cr = { ...next.craftSkills };
    for (const key of Object.keys(delta.craftSkills) as Array<
      keyof typeof cr
    >) {
      if (delta.craftSkills[key] !== undefined) {
        cr[key] = clamp(cr[key] + (delta.craftSkills[key] ?? 0));
      }
    }
    next.craftSkills = cr;
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
  title?: string;
  prizeMoney?: number;
  prizeGlory?: number;
  prizeReputation?: number;
  prizeHonor?: number;
  followersGain?: number;
  historyText: string;
}

export interface GameState {
  player: Player | null;
  pendingEvent: GameEvent | null;

  // Actions
  initNewGame: (name: string, background: Background, skinTone: SkinTone) => void;
  advanceMonth: () => void;
  resolveEvent: (outcomeIndex: number) => void;
  applyStatDelta: (delta: StatDelta) => void;
  addToHistory: (text: string) => void;
  addItem: (item: Item) => void;
  addRelation: (relation: Relation) => void;
  removeRelation: (personId: string) => void;
  /** Atomically deducts gold and adds item. No-ops if gold insufficient. */
  purchaseItem: (item: Item, cost: number) => void;
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

      initNewGame: (name, background, skinTone) => {
        const player = makeDefaultPlayer(name, background, skinTone);
        set({ player, pendingEvent: null });
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

        let updatedPlayer: Player = {
          ...player,
          currentMonth: month,
          currentYear: year,
          age,
          skillActivityUsedThisMonth: false,
        };

        const absMonth = year * 12 + month;

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

        const pendingEvent = isNewYear
          ? rollAnnualEvent(updatedPlayer)
          : rollMonthlyEvent(updatedPlayer);

        set({ player: updatedPlayer, pendingEvent: pendingEvent ?? null });
      },

      resolveEvent: (outcomeIndex) => {
        const { player, pendingEvent } = get();
        if (!player || !pendingEvent) return;

        const outcome = pendingEvent.outcomes[outcomeIndex];
        if (!outcome) return;

        let next = { ...player };

        if (outcome.statDelta) {
          next = applyDeltaToPlayer(next, outcome.statDelta);
        }

        if (outcome.goldDelta) {
          next = { ...next, gold: Math.max(0, next.gold + outcome.goldDelta) };
        }

        if (outcome.addItem) {
          const item: Item = { ...outcome.addItem, id: uuidv4() };
          next = { ...next, inventory: [...next.inventory, item] };
        }

        if (outcome.removeItem) {
          const idx = next.inventory.findIndex(
            (i) => i.subtype === outcome.removeItem,
          );
          if (idx >= 0) {
            next = {
              ...next,
              inventory: next.inventory.filter((_, i) => i !== idx),
            };
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
      },

      applyStatDelta: (delta) => {
        const { player } = get();
        if (!player) return;
        set({ player: applyDeltaToPlayer(player, delta) });
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
            titles: next.tournamentRecord.titles,
          };
          next = applyDeltaToPlayer(next, { prestige: { glory: -3 } });
        }

        next = {
          ...next,
          history: [
            ...next.history,
            { age: next.age, month: next.currentMonth, text: params.historyText },
          ],
        };

        set({ player: next });
      },
    }),
    {
      name: 'medieval_save_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
