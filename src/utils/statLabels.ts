import type { StatDelta } from '../types/game';

/** Human-readable French labels for every stat path. */
const LABELS: Record<string, string> = {
  gold: 'Or',
  followers: 'Partisans',

  'physicalStats.strength': 'Force',
  'physicalStats.agility': 'Agilité',
  'physicalStats.endurance': 'Endurance',
  'physicalStats.speed': 'Vitesse',

  'combatSkills.longSword': 'Épée longue',
  'combatSkills.lance': 'Lance',
  'combatSkills.axe': 'Hache',
  'combatSkills.swordAndShield': 'Épée & bouclier',
  'combatSkills.heavyWeapon': 'Arme lourde',
  'combatSkills.archery': "Tir à l'arc",

  'ridingSkills.horsemanship': 'Équitation',
  'ridingSkills.animalHandling': 'Soin animalier',

  'knowledgeSkills.generalCulture': 'Culture générale',
  'knowledgeSkills.literature': 'Littérature',
  'knowledgeSkills.religion': 'Religion',
  'knowledgeSkills.medicine': 'Médecine',
  'knowledgeSkills.strategy': 'Stratégie',
  'knowledgeSkills.eloquence': 'Éloquence',

  'craftSkills.tailoring': 'Couture',
  'craftSkills.blacksmithing': 'Forge',
  'craftSkills.bowyer': 'Arc et flèches',

  'prestige.reputation': 'Réputation',
  'prestige.glory': 'Gloire',
  'prestige.honor': 'Honneur',
};

export interface ChangeLine {
  label: string;
  value: number;
}

const GROUP_KEYS = [
  'physicalStats',
  'combatSkills',
  'ridingSkills',
  'knowledgeSkills',
  'craftSkills',
  'prestige',
] as const;

/**
 * Turns a StatDelta into a flat list of { label, value } lines, skipping zeros.
 * Used to show the player what an activity changed.
 */
export function formatStatDelta(delta: StatDelta): ChangeLine[] {
  const lines: ChangeLine[] = [];

  if (delta.gold !== undefined && delta.gold !== 0) {
    lines.push({ label: LABELS.gold, value: delta.gold });
  }
  if (delta.followers !== undefined && delta.followers !== 0) {
    lines.push({ label: LABELS.followers, value: delta.followers });
  }

  for (const group of GROUP_KEYS) {
    const sub = (delta as Record<string, Record<string, number> | undefined>)[group];
    if (!sub) continue;
    for (const key of Object.keys(sub)) {
      const value = sub[key];
      if (value === undefined || value === 0) continue;
      lines.push({ label: LABELS[`${group}.${key}`] ?? key, value });
    }
  }

  return lines;
}
