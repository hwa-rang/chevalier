import type { Background, StatDelta } from '../types/game';

const BACKGROUND_BONUSES: Record<Background, StatDelta> = {
  noble: {
    prestige: { reputation: 20, glory: 5 },
    knowledgeSkills: { eloquence: 15, generalCulture: 15 },
  },
  merchant: {
    gold: 50,
    knowledgeSkills: { eloquence: 20, generalCulture: 20 },
  },
  blacksmith: {
    craftSkills: { blacksmithing: 25 },
    physicalStats: { strength: 15, endurance: 10 },
  },
  farmer: {
    physicalStats: { endurance: 20, strength: 15, speed: 10 },
  },
  clergy: {
    knowledgeSkills: {
      religion: 25,
      literature: 20,
      generalCulture: 15,
      eloquence: 10,
    },
  },
  outlaw: {
    physicalStats: { speed: 20, agility: 15 },
    prestige: { honor: -20 },
  },
};

export function getBackgroundBonuses(background: Background): StatDelta {
  return BACKGROUND_BONUSES[background];
}
