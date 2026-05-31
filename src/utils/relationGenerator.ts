import { v4 as uuidv4 } from 'uuid';
import type { Relation, Religion } from '../types/game';
import { pickMaleName, pickFemaleName } from './familyGenerator';

const rint = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Pagans are a minority among the population (~15%). */
function rollReligion(): Religion {
  return Math.random() < 0.15 ? 'pagan' : 'christian';
}

/** A casual acquaintance met through socialising (e.g. at the tavern). */
export function makeRandomFriend(playerAge: number): Relation {
  const male = Math.random() < 0.5;
  return {
    personId: uuidv4(),
    name: male ? pickMaleName() : pickFemaleName(),
    age: Math.max(14, playerAge + rint(-8, 12)),
    type: 'friend',
    score: rint(5, 25),
    religion: rollReligion(),
  };
}

/**
 * A recurring village professional (blacksmith, merchant, artisan…).
 * Identified by a stable `npcRole` so the same person is found again later.
 */
export function makeNpc(role: string, profession: string): Relation {
  const male = Math.random() < 0.7;
  const base = male ? pickMaleName() : pickFemaleName();
  return {
    personId: uuidv4(),
    name: `${base} ${profession}`,
    age: rint(25, 55),
    type: 'friend',
    score: rint(5, 15),
    religion: 'christian',
    npcRole: role,
  };
}
