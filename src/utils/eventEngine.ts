import type { Player } from '../types/game';
import type { GameEvent } from '../data/events';
import { MONTHLY_EVENTS, ANNUAL_EVENTS } from '../data/events';
import { QUEST_OFFER_EVENTS } from '../data/quests';
import { ARC_MONTHLY_EVENTS, ARC_ANNUAL_EVENTS } from '../data/arcs';
import { COURTSHIP_MONTHLY_EVENTS } from '../data/courtship';

function getSkillValue(player: Player, skillPath: string): number {
  const dotIndex = skillPath.indexOf('.');
  if (dotIndex === -1) return 0;
  const category = skillPath.slice(0, dotIndex) as keyof Player;
  const skill = skillPath.slice(dotIndex + 1);
  const group = player[category];
  if (typeof group === 'object' && group !== null && skill in group) {
    return (group as unknown as Record<string, number>)[skill] ?? 0;
  }
  return 0;
}

export function filterEligibleEvents(
  player: Player,
  events: GameEvent[],
): GameEvent[] {
  return events.filter((event) => {
    const c = event.conditions;
    if (!c) return true;

    if (c.minAge !== undefined && player.age < c.minAge) return false;
    if (c.maxAge !== undefined && player.age > c.maxAge) return false;
    if (c.minGlory !== undefined && player.prestige.glory < c.minGlory) return false;
    if (c.minReputation !== undefined && player.prestige.reputation < c.minReputation)
      return false;
    if (c.maxReputation !== undefined && player.prestige.reputation > c.maxReputation)
      return false;
    if (c.minHonor !== undefined && player.prestige.honor < c.minHonor) return false;
    if (c.maxHonor !== undefined && player.prestige.honor > c.maxHonor) return false;
    if (
      c.requiresItem !== undefined &&
      !player.inventory.some((i) => i.subtype === c.requiresItem)
    )
      return false;
    if (
      c.requiresRelationType !== undefined &&
      !player.relations.some((r) => r.type === c.requiresRelationType)
    )
      return false;
    if (
      c.minSkill !== undefined &&
      getSkillValue(player, c.minSkill.skill) < c.minSkill.value
    )
      return false;

    const flags = player.flags ?? [];
    if (c.requiredFlag !== undefined && !flags.includes(c.requiredFlag)) return false;
    if (c.forbiddenFlag !== undefined) {
      const forbidden = Array.isArray(c.forbiddenFlag) ? c.forbiddenFlag : [c.forbiddenFlag];
      if (forbidden.some((f) => flags.includes(f))) return false;
    }
    if (c.noActiveQuest && player.activeQuest) return false;
    if (c.minYear !== undefined && player.currentYear < c.minYear) return false;
    if (c.maxYear !== undefined && player.currentYear > c.maxYear) return false;
    if (c.minTempleVisits !== undefined && (player.templeVisits ?? 0) < c.minTempleVisits)
      return false;
    if (
      c.requiresNpcRole !== undefined &&
      !player.relations.some((r) => r.npcRole === c.requiresNpcRole)
    )
      return false;

    // ── Story-arc gating ──────────────────────────────────────────────────────
    const arc = player.arcState ?? {
      activeArcId: null,
      arcStartAbsMonth: 0,
      lastArcEndAbsMonth: 0,
      completedArcIds: [],
    };
    const absMonth = player.currentYear * 12 + player.currentMonth;
    if (c.noActiveArc && arc.activeArcId !== null) return false;
    if (c.requiresActiveArc !== undefined && arc.activeArcId !== c.requiresActiveArc)
      return false;
    if (
      c.minMonthsSinceLastArc !== undefined &&
      absMonth - arc.lastArcEndAbsMonth < c.minMonthsSinceLastArc
    )
      return false;

    // ── Romance (cour) gating ─────────────────────────────────────────────────
    const hasLover = player.relations.some((r) => r.type === 'lover');
    if (c.single && (player.spouseId || player.courtship || hasLover)) return false;
    if (c.requiresCourtship && !player.courtship) return false;
    if (c.requiresSpouse && !player.spouseId) return false;
    if (
      c.requiresCourtshipArchetype !== undefined &&
      player.courtship?.archetype !== c.requiresCourtshipArchetype
    )
      return false;
    if (
      c.minMonthsSinceCourtship !== undefined &&
      absMonth - (player.lastCourtshipEndAbsMonth ?? 0) < c.minMonthsSinceCourtship
    )
      return false;
    if (c.minCounter !== undefined) {
      const counters = (player.counters ?? {}) as unknown as Record<string, number>;
      if ((counters[c.minCounter.key] ?? 0) < c.minCounter.value) return false;
    }

    return true;
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns an eligible monthly event or null. Base chance 15%, rising as
 * reputation drops below 0 (up to +35% at reputation −100): the more notorious
 * you are, the more often trouble — especially law/faith events — finds you.
 */
export function rollMonthlyEvent(player: Player): GameEvent | null {
  const rep = player.prestige.reputation;
  const lowRepBonus = rep < 0 ? Math.min(0.35, (-rep / 100) * 0.35) : 0;

  // Guarantee at least 3 events a year (the year-end annual event counts as 1):
  // if the remaining monthly rolls barely cover what's missing, force the event.
  const count = player.eventsThisYear ?? 0;
  const rollsLeftThisYear = 13 - player.currentMonth; // this roll included
  const neededFromMonthly = Math.max(0, 2 - count);
  const forced = neededFromMonthly >= rollsLeftThisYear;

  const chance = 0.2 + lowRepBonus;
  if (!forced && Math.random() > chance) return null;
  const eligible = filterEligibleEvents(player, [
    ...MONTHLY_EVENTS,
    ...QUEST_OFFER_EVENTS,
    ...ARC_MONTHLY_EVENTS,
    ...COURTSHIP_MONTHLY_EVENTS,
  ]);
  if (eligible.length === 0) return null;
  // Priority events (rare scripted moments) preempt the random pool.
  const priority = eligible.filter((e) => e.priority);
  return pickRandom(priority.length > 0 ? priority : eligible);
}

/** Guaranteed to return one eligible annual event (null only if none pass conditions). */
export function rollAnnualEvent(player: Player): GameEvent | null {
  const eligible = filterEligibleEvents(player, [...ANNUAL_EVENTS, ...ARC_ANNUAL_EVENTS]);
  if (eligible.length === 0) return null;
  // Priority events (the 1315 famine…) preempt the random pool.
  const priority = eligible.filter((e) => e.priority);
  return pickRandom(priority.length > 0 ? priority : eligible);
}
