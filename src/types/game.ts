export type SkinTone = 'tone1' | 'tone2' | 'tone3' | 'tone4' | 'tone5';

/** Hair colour for the character sprite. */
export type Hair = 'hair1' | 'hair2';

/** Wearable equipment slots. */
export type EquipSlot = 'helmet' | 'armor' | 'shield' | 'weapon';
/** Currently-worn item subtype per slot (null = nothing equipped). */
export type Equipment = Record<EquipSlot, string | null>;

export type Religion = 'christian' | 'pagan';

export type Background =
  | 'noble'
  | 'merchant'
  | 'blacksmith'
  | 'farmer'
  | 'clergy'
  | 'outlaw';

export type RelationType =
  | 'father'
  | 'mother'
  | 'sibling'
  | 'priest'
  | 'friend'
  | 'master'
  | 'lover'
  | 'enemy'
  | 'stranger';

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'book'
  | 'game'
  | 'clothing'
  | 'animal';

export interface PhysicalStats {
  /** -100 to 100. Soft cap: strength + agility ≤ 120. */
  strength: number;
  /** -100 to 100. Opposed to strength. */
  agility: number;
  /** -100 to 100. Soft cap: endurance + speed ≤ 120. */
  endurance: number;
  /** -100 to 100. Opposed to endurance. */
  speed: number;
}

export interface CombatSkills {
  longSword: number;
  lance: number;
  axe: number;
  swordAndShield: number;
  heavyWeapon: number;
  archery: number;
}

export interface RidingSkills {
  horsemanship: number;
  animalHandling: number;
}

export interface KnowledgeSkills {
  generalCulture: number;
  literature: number;
  religion: number;
  medicine: number;
  strategy: number;
  eloquence: number;
}

export interface CraftSkills {
  tailoring: number;
  blacksmithing: number;
  bowyer: number;
}

export interface Prestige {
  /** -100 to 100. Hard to raise; floats allowed. */
  reputation: number;
  /** -100 to 100. Floats allowed. */
  glory: number;
  /** -100 to 100. Hard to raise; floats allowed. */
  honor: number;
}

export interface TournamentRecord {
  wins: number;
  losses: number;
  titles: string[];
}

export interface Relation {
  personId: string;
  name: string;
  age: number;
  type: RelationType;
  /** -100 to 100 */
  score: number;
  /** Faith of this NPC. Defaults to 'christian' when absent (legacy saves). */
  religion?: Religion;
  /** Stable role for recurring village NPCs (e.g. 'blacksmith', 'merchant', 'artisan'). */
  npcRole?: string;
  /** Skill taught by this person when type === 'master' (e.g. 'combatSkills.longSword') */
  skill?: string;
  /** True if a flirt result of mutual interest is pending courtship */
  mutualInterest?: boolean;
}

export interface GriefModifier {
  statGroup: 'physicalStats' | 'combatSkills' | 'ridingSkills' | 'knowledgeSkills' | 'craftSkills';
  statKey: string;
  /** Absolute month (year * 12 + month) after which the grief expires */
  expiresAtAbsoluteMonth: number;
  personName: string;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  subtype: string;
}

export interface HistoryEvent {
  age: number;
  month: number;
  text: string;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  skinTone: SkinTone;
  /** Hair colour for the sprite (brun / blond). */
  hair: Hair;
  background: Background;
  /** The player is Christian by default. */
  religion: Religion;
  gold: number;
  physicalStats: PhysicalStats;
  combatSkills: CombatSkills;
  ridingSkills: RidingSkills;
  knowledgeSkills: KnowledgeSkills;
  craftSkills: CraftSkills;
  prestige: Prestige;
  inventory: Item[];
  /** Worn equipment, by slot (subtype values). */
  equipment: Equipment;
  relations: Relation[];
  tournamentRecord: TournamentRecord;
  followers: number;
  history: HistoryEvent[];
  currentYear: number;
  currentMonth: number; // 1–12
  skillActivityUsedThisMonth: boolean;
  /** Action economy — reset to 0 each month. Max 1 principal, 4 secondary. */
  principalActionsUsed: number;
  secondaryActionsUsed: number;
  /** Consecutive-visit streak used by tavern (penalty) and church (bonus). */
  visitStreakLocation: string | null;
  visitStreakCount: number;
  /** Cumulative pagan-temple visits — too many gets you barred from the church. */
  templeVisits: number;
  griefModifiers: GriefModifier[];
  /** Set to true by the plague annual event; raises death chance for relations that year */
  activePlague: boolean;
}

/** Partial deep delta applied via applyStatDelta. All fields optional. */
export type StatDelta = {
  gold?: number;
  followers?: number;
  physicalStats?: Partial<PhysicalStats>;
  combatSkills?: Partial<CombatSkills>;
  ridingSkills?: Partial<RidingSkills>;
  knowledgeSkills?: Partial<KnowledgeSkills>;
  craftSkills?: Partial<CraftSkills>;
  prestige?: Partial<Prestige>;
};
