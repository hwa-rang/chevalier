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
import { rollMonthlyEvent, rollAnnualEvent } from '../utils/eventEngine';

// Action economy: one skill action + four social actions per month.
export const MAX_PRINCIPAL_ACTIONS = 1;
export const MAX_SECONDARY_ACTIONS = 4;
/** Visiting the same place this many times in a row triggers a streak effect. */
const STREAK_THRESHOLD = 3;

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
  hair: Hair,
): Player {
  const startingAge = 14;

  const base: Player = {
    id: uuidv4(),
    name,
    age: startingAge,
    skinTone,
    hair,
    background,
    religion: 'christian',
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
    equipment: { ...EMPTY_EQUIPMENT },
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

/** A village activity to perform, resolved from the screen's activity table. */
export interface ActivityRequest {
  kind: 'principal' | 'secondary';
  /** Location id, used for the consecutive-visit streak (tavern/church). */
  location?: string;
  statDelta?: StatDelta;
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
}

export interface ActivityResult {
  ok: boolean;
  /** Reason shown when the action is blocked (no slots left). */
  reason?: string;
  lines?: ChangeLine[];
  note?: string;
}

export interface GameState {
  player: Player | null;
  pendingEvent: GameEvent | null;

  // Actions
  initNewGame: (name: string, background: Background, skinTone: SkinTone, hair: Hair) => void;
  advanceMonth: () => void;
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

      initNewGame: (name, background, skinTone, hair) => {
        const player = makeDefaultPlayer(name, background, skinTone, hair);
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
          principalActionsUsed: 0,
          secondaryActionsUsed: 0,
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

        if (req.kind === 'principal' && principalUsed >= MAX_PRINCIPAL_ACTIONS) {
          return { ok: false, reason: "Vous avez déjà accompli votre action principale ce mois-ci." };
        }
        if (req.kind === 'secondary' && secondaryUsed >= MAX_SECONDARY_ACTIONS) {
          return { ok: false, reason: "Vous avez épuisé vos actions secondaires ce mois-ci." };
        }

        let next: Player = { ...player };
        const lines: ChangeLine[] = [];
        const noteParts: string[] = [];

        // 1. Direct stat changes
        if (req.statDelta) {
          next = applyDeltaToPlayer(next, req.statDelta);
          lines.push(...formatStatDelta(req.statDelta));
        }

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
        if (kind === 'principal') {
          if ((player.principalActionsUsed ?? 0) >= MAX_PRINCIPAL_ACTIONS) return false;
          set({
            player: {
              ...player,
              principalActionsUsed: (player.principalActionsUsed ?? 0) + 1,
              skillActivityUsedThisMonth: true,
            },
          });
          return true;
        }
        if ((player.secondaryActionsUsed ?? 0) >= MAX_SECONDARY_ACTIONS) return false;
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
