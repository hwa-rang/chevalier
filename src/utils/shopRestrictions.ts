import type { Player } from '../types/game';
import type { ShopItem } from '../data/shopItems';

export interface BuyCheck {
  allowed: boolean;
  reasons: string[];
}

export function canBuy(player: Player, item: ShopItem): BuyCheck {
  const reasons: string[] = [];
  const req = item.requirements;

  if (req) {
    if (req.minAge !== undefined && player.age < req.minAge) {
      reasons.push(`Âge minimum : ${req.minAge} ans (vous avez ${player.age} ans)`);
    }
    if (req.minReputation !== undefined && player.prestige.reputation < req.minReputation) {
      reasons.push(
        `Réputation minimum : ${req.minReputation} (vous avez ${Math.floor(player.prestige.reputation)})`,
      );
    }
    if (req.minHonor !== undefined && player.prestige.honor < req.minHonor) {
      reasons.push(
        `Honneur minimum : ${req.minHonor} (vous avez ${Math.floor(player.prestige.honor)})`,
      );
    }
    if (
      req.minAnimalHandling !== undefined &&
      player.ridingSkills.animalHandling < req.minAnimalHandling
    ) {
      reasons.push(
        `Dressage minimum : ${req.minAnimalHandling} (vous avez ${player.ridingSkills.animalHandling})`,
      );
    }
  }

  if (player.gold < item.price) {
    reasons.push(`Or insuffisant — il vous manque ${item.price - player.gold}g`);
  }

  return { allowed: reasons.length === 0, reasons };
}
