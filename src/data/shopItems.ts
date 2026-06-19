import { v4 as uuidv4 } from 'uuid';
import type { Item, ItemCategory } from '../types/game';

export interface ShopItem {
  catalogId: string;
  name: string;
  category: ItemCategory;
  subtype: string;
  price: number;
  description: string;
  requirements?: {
    minAge?: number;
    minReputation?: number;
    minHonor?: number;
    minAnimalHandling?: number;
  };
}

export function makeInventoryItem(shopItem: ShopItem): Item {
  return {
    id: uuidv4(),
    name: shopItem.name,
    category: shopItem.category,
    subtype: shopItem.subtype,
  };
}

export const SHOP_ITEMS: ShopItem[] = [
  // WEAPONS — age 16+, reputation ≥ 20 (bow: ≥ 10)
  {
    catalogId: 'long_sword',
    name: 'Épée longue',
    category: 'weapon',
    subtype: 'long_sword',
    price: 80,
    description: 'Lame à deux mains, symbole de noblesse.',
    requirements: { minAge: 16, minReputation: 20 },
  },
  {
    catalogId: 'sword_shield',
    name: 'Épée à une main',
    category: 'weapon',
    subtype: 'sword_shield',
    price: 55,
    description: 'Lame à une main, à manier de pair avec un bouclier.',
    requirements: { minAge: 16, minReputation: 20 },
  },
  {
    catalogId: 'lance',
    name: 'Lance',
    category: 'weapon',
    subtype: 'lance',
    price: 40,
    description: 'Arme de joute et de charge cavalière.',
    requirements: { minAge: 16, minReputation: 20 },
  },
  {
    catalogId: 'axe',
    name: 'Hache',
    category: 'weapon',
    subtype: 'axe',
    price: 35,
    description: 'Arme brutale, redoutable au combat rapproché.',
    requirements: { minAge: 16, minReputation: 20 },
  },
  {
    catalogId: 'mace',
    name: "Masse d'armes",
    category: 'weapon',
    subtype: 'mace',
    price: 50,
    description: 'Arme lourde, efficace contre les armures.',
    requirements: { minAge: 16, minReputation: 20 },
  },
  {
    catalogId: 'bow',
    name: 'Arc',
    category: 'weapon',
    subtype: 'bow',
    price: 30,
    description: "Arme de tir à distance, nécessite entraînement.",
    requirements: { minAge: 16, minReputation: 10 },
  },
  {
    catalogId: 'bardiche',
    name: 'Bardiche',
    category: 'weapon',
    subtype: 'bardiche',
    price: 80,
    description: "Longue hache d'hast à deux mains.",
    requirements: { minAge: 16, minReputation: 20 },
  },

  // ARMOR — no restrictions
  {
    catalogId: 'helmet_nasal',
    name: 'Bascinet nasal',
    category: 'armor',
    subtype: 'helmet_nasal',
    price: 25,
    description: 'Casque léger avec protège-nez.',
  },
  {
    catalogId: 'helmet_chapel',
    name: 'Chapel de fer',
    category: 'armor',
    subtype: 'helmet_chapel',
    price: 18,
    description: 'Le casque à larges bords du soldat du commun.',
  },
  {
    catalogId: 'gauntlets',
    name: 'Gantelets',
    category: 'armor',
    subtype: 'gauntlets',
    price: 20,
    description: 'Protège les mains et les poignets.',
  },
  {
    catalogId: 'chainmail',
    name: 'Cotte de mailles',
    category: 'armor',
    subtype: 'chainmail',
    price: 120,
    description: 'Armure souple de haute protection.',
  },
  {
    catalogId: 'full_plate',
    name: 'Armure complète',
    category: 'armor',
    subtype: 'full_plate',
    price: 400,
    description: 'La protection ultime du chevalier.',
  },
  {
    catalogId: 'leather_armor',
    name: 'Armure de cuir',
    category: 'armor',
    subtype: 'leather_armor',
    price: 45,
    description: 'Légère et flexible, bon compromis.',
  },
  {
    catalogId: 'shield_small',
    name: 'Petit bouclier',
    category: 'armor',
    subtype: 'shield_small',
    price: 18,
    description: 'Léger et maniable, protection modeste.',
  },
  {
    catalogId: 'shield',
    name: 'Bouclier moyen',
    category: 'armor',
    subtype: 'shield',
    price: 30,
    description: 'Défense essentielle au combat.',
  },
  {
    catalogId: 'shield_large',
    name: 'Grand bouclier',
    category: 'armor',
    subtype: 'shield_large',
    price: 55,
    description: 'Large protection, plus lourd à porter.',
  },
  {
    catalogId: 'helmet_corbeau',
    name: 'Bascinet à bec de corbeau',
    category: 'armor',
    subtype: 'helmet_corbeau',
    price: 50,
    description: 'Heaume à visière pointue au profil agressif.',
  },
  {
    catalogId: 'helmet_roa',
    name: 'Bascinet royal',
    category: 'armor',
    subtype: 'helmet_roa',
    price: 70,
    description: "Casque ouvragé digne d'un seigneur.",
  },
  // NB: "Bascinet avec visière à croix" (helmet_crusader) n'est PAS vendu au marché —
  // il se gagne lorsque le savoir « religion » devient très élevé (voir gameStore).

  // BOOKS — no restrictions to buy
  {
    catalogId: 'book_general',
    name: 'Traité de culture',
    category: 'book',
    subtype: 'book_general',
    price: 15,
    description: 'Connaissance générale du monde médiéval.',
  },
  {
    catalogId: 'book_religion',
    name: 'Livre saint',
    category: 'book',
    subtype: 'book_religion',
    price: 20,
    description: 'Textes sacrés et doctrine religieuse.',
  },
  {
    catalogId: 'book_medicine',
    name: 'Traité de médecine',
    category: 'book',
    subtype: 'book_medicine',
    price: 25,
    description: 'Herbes, remèdes et pratiques soignantes.',
  },
  {
    catalogId: 'book_strategy',
    name: 'Traité de stratégie',
    category: 'book',
    subtype: 'book_strategy',
    price: 30,
    description: "Tactiques militaires et art de la guerre.",
  },
  {
    catalogId: 'book_craft',
    name: 'Manuel artisanal',
    category: 'book',
    subtype: 'book_craft',
    price: 12,
    description: "Techniques de métier : +2 g à la forge et chez l'artisan.",
  },
  {
    catalogId: 'book_fencing',
    name: "Manuel d'escrime",
    category: 'book',
    subtype: 'book_fencing',
    price: 35,
    description: "Traité du maniement de l'épée longue.",
  },
  {
    catalogId: 'book_hunting',
    name: 'Guide de chasse',
    category: 'book',
    subtype: 'book_hunting',
    price: 30,
    description: "L'art du tir à l'arc et de la traque.",
  },
  {
    catalogId: 'book_milon',
    name: 'Manuscrit de Milon de Crotone',
    category: 'book',
    subtype: 'book_milon',
    price: 35,
    description: 'Exercices légendaires pour bâtir la force.',
  },

  // GAMES — no restriction
  {
    catalogId: 'chess_set',
    name: "Jeu d'échecs",
    category: 'game',
    subtype: 'chess_set',
    price: 40,
    description: "Jeu de stratégie apprécié des nobles.",
  },

  // CLOTHING — no restrictions
  {
    catalogId: 'common_clothes',
    name: 'Vêtements communs',
    category: 'clothing',
    subtype: 'common_clothes',
    price: 5,
    description: 'Tenue simple et pratique.',
  },
  {
    catalogId: 'fine_clothes',
    name: 'Vêtements fins',
    category: 'clothing',
    subtype: 'fine_clothes',
    price: 25,
    description: 'Tissu de qualité, belle apparence.',
  },
  {
    catalogId: 'noble_attire',
    name: 'Tenue noble',
    category: 'clothing',
    subtype: 'noble_attire',
    price: 80,
    description: 'Tenue de cérémonie somptueuse.',
  },

  // ANIMALS
  {
    catalogId: 'dog',
    name: 'Chien',
    category: 'animal',
    subtype: 'dog',
    price: 10,
    description: 'Fidèle compagnon et gardien.',
  },
  {
    catalogId: 'cat',
    name: 'Chat',
    category: 'animal',
    subtype: 'cat',
    price: 8,
    description: 'Animal domestique chasseur de souris.',
  },
  {
    catalogId: 'rapace',
    name: 'Rapace',
    category: 'animal',
    subtype: 'rapace',
    price: 60,
    description: "Oiseau de fauconnerie, signe de prestige.",
    requirements: { minAge: 16, minReputation: 30, minAnimalHandling: 20 },
  },
  {
    catalogId: 'horse',
    name: 'Cheval',
    category: 'animal',
    subtype: 'horse',
    price: 150,
    description: 'Monture indispensable du cavalier.',
    requirements: { minAnimalHandling: 15 },
  },
];
