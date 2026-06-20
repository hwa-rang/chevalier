import type { EquipSlot, Equipment, Item } from '../types/game';

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

/**
 * Armes à deux mains (nom de fichier sprite « …-2mains-… ») — incompatibles
 * avec un bouclier. Les autres armes se manient à une main.
 */
export const TWO_HANDED_WEAPONS: ReadonlySet<string> = new Set([
  'long_sword', // épée longue (2 mains)
  'bardiche', // hache d'hast (2 mains)
  'bow', // arc (2 mains)
  'training_staff', // bâton (2 mains)
]);

export function isTwoHanded(subtype: string): boolean {
  return TWO_HANDED_WEAPONS.has(subtype);
}

export function isEquippable(subtype: string): boolean {
  return subtype in SLOT_BY_SUBTYPE;
}

/**
 * Helmet subtypes that count as a tournament "heaume". All bascinets qualify;
 * the chapel de fer (foot-soldier's wide-brimmed hat) does not.
 */
export const HEAUME_SUBTYPES: ReadonlySet<string> = new Set([
  'helmet_nasal',
  'helmet_corbeau',
  'helmet_roa',
  'helmet_crusader',
  'helmet_apocryphal',
]);

/**
 * True when the inventory satisfies a tournament required-item subtype.
 * The generic 'helmet' requirement is met by any qualifying bascinet.
 */
export function ownsRequiredItem(inventory: Pick<Item, 'subtype'>[], required: string): boolean {
  if (required === 'helmet') {
    return inventory.some((i) => HEAUME_SUBTYPES.has(i.subtype));
  }
  return inventory.some((i) => i.subtype === required);
}

export const EMPTY_EQUIPMENT: Equipment = {
  helmet: null,
  armor: null,
  shield: null,
  weapon: null,
};
