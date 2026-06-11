import type { PointOfInterest } from '../components/PixelMap';
import { TOURNAMENTS } from './tournaments';
import type { TournamentType } from './tournaments';

// ─── Map image ────────────────────────────────────────────────────────────────
// Hand-drawn pixel-art map of Europe. POI positions below are expressed in the
// original 1254×1254 pixel space of that image.

export const EUROPE_MAP_IMAGE = require('../../assets/maps/europe-map.png');
export const EUROPE_MAP_WIDTH = 1254;
export const EUROPE_MAP_HEIGHT = 1254;

// The hero's home — north of Cologne, towards the Low Countries.
export const PLAYER_HOME_POS = { x: 600, y: 353 };

// ─── Tournament POI colors & icons ────────────────────────────────────────────

export const TOURNAMENT_TYPE_COLORS: Record<TournamentType, string> = {
  melee:     '#E05C2A',
  joust:     '#4A90D9',
  swordDuel: '#708090',
  archery:   '#6AB04C',
  chess:     '#9B59B6',
  poetry:    '#E9C46A',
};

export const TOURNAMENT_TYPE_ICONS: Record<TournamentType, string> = {
  melee:     '⚔',
  joust:     '🏇',
  swordDuel: '🗡',
  archery:   '🏹',
  chess:     '♟',
  poetry:    '📜',
};

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  melee:     'Mêlée',
  joust:     'Joûte',
  swordDuel: "Duel à l'épée",
  archery:   "Tir à l'arc",
  chess:     'Échecs',
  poetry:    'Poésie',
};

// ─── Geographic positions for each tournament ─────────────────────────────────
// x/y in the 1254×1254 pixel space of the map image.

const POSITIONS: Record<string, { x: number; y: number }> = {
  // France
  troyes_melee:    { x: 515, y: 578 },
  rouen_archery:   { x: 432, y: 513 },
  lyon_joust:      { x: 540, y: 695 },
  bordeaux_duel:   { x: 335, y: 700 },
  reims_melee:     { x: 530, y: 528 },
  paris_joust:     { x: 470, y: 540 },
  // England
  canterbury_chess: { x: 402, y: 398 },
  york_melee:      { x: 295, y: 235 },
  london_joust:    { x: 358, y: 380 },
  // Spain
  seville_poetry:  { x: 150, y: 1027 },
  toledo_duel:     { x: 240, y: 900 },
  barcelona_joust: { x: 415, y: 837 },
  // Italy
  venice_poetry:   { x: 785, y: 678 },
  milan_melee:     { x: 650, y: 688 },
  florence_chess:  { x: 690, y: 770 },
  // Holy Roman Empire
  cologne_joust:   { x: 620, y: 430 },
  vienna_melee:    { x: 855, y: 590 },
  prague_duel:     { x: 810, y: 460 },
  // Poland
  krakow_archery:  { x: 960, y: 450 },
  gdansk_melee:    { x: 885, y: 258 },
};

// ─── Bandit camps ─────────────────────────────────────────────────────────────

export interface BanditCamp {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Martial power needed to clear it (player power compared against this). */
  difficulty: number;
  rewardGold: number;
  rewardGlory: number;
}

export const BANDIT_CAMPS: BanditCamp[] = [
  { id: 'camp_ardennes', label: 'Camp des Ardennes',     x: 565, y: 470, difficulty: 35, rewardGold: 25, rewardGlory: 6 },
  { id: 'camp_pyrenees', label: 'Repaire des Pyrénées',  x: 390, y: 788, difficulty: 55, rewardGold: 45, rewardGlory: 10 },
  { id: 'camp_alps',     label: "Nid d'aigle des Alpes", x: 620, y: 655, difficulty: 75, rewardGold: 70, rewardGlory: 16 },
];

export function buildBanditPois(): PointOfInterest[] {
  return BANDIT_CAMPS.map((c) => ({
    id: c.id,
    label: c.label,
    x: c.x,
    y: c.y,
    icon: '💀',
    color: '#7A2020',
  }));
}

// ─── Build POI list from TOURNAMENTS ─────────────────────────────────────────

export function buildEuropePois(playerGlory: number): PointOfInterest[] {
  return TOURNAMENTS.map((t) => {
    const pos = POSITIONS[t.id] ?? { x: 627, y: 627 };
    return {
      id: t.id,
      label: t.city,
      x: pos.x,
      y: pos.y,
      icon: TOURNAMENT_TYPE_ICONS[t.type],
      color: TOURNAMENT_TYPE_COLORS[t.type],
      locked: playerGlory < t.minGlory,
    };
  });
}
