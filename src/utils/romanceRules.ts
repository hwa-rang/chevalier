import type { Player, Relation } from '../types/game';

export interface RomanceCheck {
  allowed: boolean;
  reason?: string;
}

const FAMILY_TYPES = new Set(['father', 'mother', 'sibling']);

export function canRomance(player: Player, target: Relation): RomanceCheck {
  if (player.age < 16) {
    return { allowed: false, reason: 'Vous êtes trop jeune.' };
  }
  if (FAMILY_TYPES.has(target.type)) {
    return { allowed: false, reason: 'Impossible avec un membre de la famille.' };
  }
  if (target.type === 'lover') {
    return { allowed: false, reason: 'Vous êtes déjà amoureux.' };
  }
  if (target.score < 40) {
    return { allowed: false, reason: 'Vous ne vous connaissez pas assez bien.' };
  }
  const ageDiff = Math.abs(player.age - target.age);
  if (player.age < 19 && ageDiff > 3) {
    return { allowed: false, reason: 'La différence d\'âge est trop grande.' };
  }
  if (player.age >= 19 && ageDiff > 5) {
    return { allowed: false, reason: 'La différence d\'âge est trop grande.' };
  }
  return { allowed: true };
}
