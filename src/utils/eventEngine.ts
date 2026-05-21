import type { Player } from '../types/game';
import type { GameEvent } from '../data/events';
import { MONTHLY_EVENTS, ANNUAL_EVENTS } from '../data/events';

function getSkillValue(player: Player, skillPath: string): number {
  const dotIndex = skillPath.indexOf('.');
  if (dotIndex === -1) return 0;
  const category = skillPath.slice(0, dotIndex) as keyof Player;
  const skill = skillPath.slice(dotIndex + 1);
  const group = player[category];
  if (typeof group === 'object' && group !== null && skill in group) {
    return (group as Record<string, number>)[skill] ?? 0;
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

    return true;
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 15% chance to return an eligible monthly event, null otherwise. */
export function rollMonthlyEvent(player: Player): GameEvent | null {
  if (Math.random() > 0.15) return null;
  const eligible = filterEligibleEvents(player, MONTHLY_EVENTS);
  if (eligible.length === 0) return null;
  return pickRandom(eligible);
}

/** Guaranteed to return one eligible annual event (null only if none pass conditions). */
export function rollAnnualEvent(player: Player): GameEvent | null {
  const eligible = filterEligibleEvents(player, ANNUAL_EVENTS);
  if (eligible.length === 0) return null;
  return pickRandom(eligible);
}
