import type { EquipSlot, Equipment } from '../types/game';

/**
 * Which slot an item subtype occupies. Only subtypes listed here are
 * equippable (i.e. they have a sprite). Extend as new art is added.
 */
export const SLOT_BY_SUBTYPE: Record<string, EquipSlot> = {
  // Helmets
  helmet_nasal: 'helmet',
  helmet_corbeau: 'helmet',
  helmet_roa: 'helmet',
  helmet_chapel: 'helmet',
  // Reward helmets (not sold): crusader = high religion, apocryphal = pagan path.
  helmet_crusader: 'helmet',
  helmet_apocryphal: 'helmet',
  // Armor
  full_plate: 'armor',
  chainmail: 'armor',
  // Shields
  shield_small: 'shield',
  shield: 'shield',
  shield_large: 'shield',
  // Weapons
  long_sword: 'weapon',
  sword_shield: 'weapon',
  axe: 'weapon',
  mace: 'weapon',
  lance: 'weapon',
  bardiche: 'weapon',
  bow: 'weapon',
  training_staff: 'weapon',
};

export function slotForSubtype(subtype: string): EquipSlot | null {
  return SLOT_BY_SUBTYPE[subtype] ?? null;
}

export function isEquippable(subtype: string): boolean {
  return subtype in SLOT_BY_SUBTYPE;
}

export const EMPTY_EQUIPMENT: Equipment = {
  helmet: null,
  armor: null,
  shield: null,
  weapon: null,
};
