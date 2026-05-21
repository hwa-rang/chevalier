import React from 'react';
import Svg, { Rect, Ellipse, Circle, G as SvgG } from 'react-native-svg';
import type { Player, Item, SkinTone } from '../types/game';

import { bodySlim, bodyAverage, bodyMuscular } from '../assets/sprites/body';
import { clothingNone, clothingCommon, clothingFine, clothingNoble } from '../assets/sprites/clothing';
import { armorNone, armorLeather, armorChainmail, armorPlate } from '../assets/sprites/armor';
import { gauntletsNone, gauntletsMetal } from '../assets/sprites/gauntlets';
import { helmetNone, helmetBasic, helmetGreat } from '../assets/sprites/helmet';
import { shieldNone, shieldEquipped } from '../assets/sprites/shield';
import { weaponNone, weaponSword, weaponLance, weaponAxe, weaponMace, weaponBow } from '../assets/sprites/weapons';

// ─── Variant resolvers ────────────────────────────────────────────────────────

type BodyVariant    = 'slim' | 'average' | 'muscular';
type ClothingVariant = 'none' | 'common' | 'fine' | 'noble';
type ArmorVariant   = 'none' | 'leather' | 'chainmail' | 'plate';
type HelmetVariant  = 'none' | 'basic' | 'great';
type WeaponVariant  = 'none' | 'sword' | 'lance' | 'axe' | 'mace' | 'bow';

function getBodyVariant(player: Player): BodyVariant {
  const { strength, endurance } = player.physicalStats;
  if (strength > 60 || endurance > 60) return 'muscular';
  if (strength < 30 && endurance < 30) return 'slim';
  return 'average';
}

function hasSubtype(inv: Item[], subtype: string): boolean {
  return inv.some((i) => i.subtype === subtype);
}

function getClothingVariant(inv: Item[]): ClothingVariant {
  if (hasSubtype(inv, 'noble_attire'))   return 'noble';
  if (hasSubtype(inv, 'fine_clothes'))   return 'fine';
  if (hasSubtype(inv, 'common_clothes')) return 'common';
  return 'none';
}

function getArmorVariant(inv: Item[]): ArmorVariant {
  if (hasSubtype(inv, 'full_plate'))    return 'plate';
  if (hasSubtype(inv, 'chainmail'))     return 'chainmail';
  if (hasSubtype(inv, 'leather_armor')) return 'leather';
  return 'none';
}

function getHelmetVariant(inv: Item[]): HelmetVariant {
  if (hasSubtype(inv, 'full_plate')) return 'great';
  if (hasSubtype(inv, 'helmet'))     return 'basic';
  return 'none';
}

function getWeaponVariant(inv: Item[]): WeaponVariant {
  if (hasSubtype(inv, 'long_sword') || hasSubtype(inv, 'sword_shield')) return 'sword';
  if (hasSubtype(inv, 'lance')) return 'lance';
  if (hasSubtype(inv, 'axe'))   return 'axe';
  if (hasSubtype(inv, 'mace'))  return 'mace';
  if (hasSubtype(inv, 'bow'))   return 'bow';
  return 'none';
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

const SKIN_PALETTES: Record<SkinTone, { sk: string; sk2: string }> = {
  tone1: { sk: '#F5C4B3', sk2: '#D85A30' },
  tone2: { sk: '#EF9F27', sk2: '#BA7517' },
  tone3: { sk: '#D85A30', sk2: '#993C1D' },
  tone4: { sk: '#BA7517', sk2: '#854F0B' },
  tone5: { sk: '#854F0B', sk2: '#633806' },
};

const CLOTHING_PALETTES: Record<ClothingVariant, Record<string, string>> = {
  none:   { lb: '#C8B49A', tb: '#8B6F5A', td: '#6B5040' },
  common: { br: '#8B5E3C', bd: '#6B4226', tb: '#8B6F5A', td: '#6B5040' },
  fine:   { bl: '#2E5DA8', bd: '#1E4080', dg: '#444444', dd: '#333333' },
  noble:  { bu: '#7B2335', bn: '#5C1828', gd: '#D4A017', dg: '#444444', dd: '#333333' },
};

const ARMOR_PALETTE: Record<string, string> = {
  db: '#5C3D1E', dc: '#3E2610',
  gy: '#8E8E8E', gy2: '#A8A8A8',
  sv: '#C0C0C0', sv2: '#888888', sl: '#555555',
};

const HELMET_PALETTE: Record<string, string> = {
  sv: '#C0C0C0', sv2: '#888888', sl: '#555555', gy2: '#CCCCCC',
};

const GAUNTLET_PALETTE: Record<string, string> = {
  sv: '#C0C0C0', sv2: '#888888', sl: '#555555',
};

const SHIELD_PALETTE: Record<string, string> = {
  sv: '#C0C0C0', sv2: '#888888', sl: '#444444',
  rd: '#8B0000', rd2: '#600000', gy2: '#DDDDDD',
};

const WEAPON_PALETTE: Record<string, string> = {
  sv: '#C0C0C0', sv2: '#888888', sl: '#555555', gy2: '#DDDDDD',
  gd: '#D4A017',
  br: '#8B5E3C', bd: '#6B4226',
  dk: '#333333',
};

// ─── PixelLayer ───────────────────────────────────────────────────────────────

interface PixelLayerProps {
  data: string[][];
  palette: Record<string, string>;
  offsetX?: number;
  offsetY?: number;
}

function PixelLayer({ data, palette, offsetX = 0, offsetY = 0 }: PixelLayerProps) {
  const rects: React.ReactElement[] = [];
  for (let row = 0; row < data.length; row++) {
    const rowData = data[row];
    for (let col = 0; col < rowData.length; col++) {
      const key = rowData[col];
      if (key === '.') continue;
      const color = palette[key];
      if (!color) continue;
      rects.push(
        <Rect
          key={`${row}-${col}`}
          x={(col + offsetX) * 3}
          y={(row + offsetY) * 3}
          width={3}
          height={3}
          fill={color}
        />,
      );
    }
  }
  return <>{rects}</>;
}

// ─── Prestige aura ────────────────────────────────────────────────────────────

function PrestigeAura({ glory }: { glory: number }) {
  if (glory < 20) return null;
  const amber = '#EF9F27';
  const star  = '#FAC775';
  return (
    <>
      {/* Crown (center x≈96, above head at y≈9) */}
      <Rect x={81}  y={6}  width={30} height={6} fill={amber} />
      <Rect x={81}  y={0}  width={6}  height={9} fill={amber} />
      <Rect x={93}  y={0}  width={6}  height={9} fill={amber} />
      <Rect x={105} y={0}  width={6}  height={9} fill={amber} />

      {glory >= 50 && (
        <>
          {/* Thin border rect around character */}
          <Rect x={54}  y={12}  width={84} height={3} fill={amber} fillOpacity={0.5} />
          <Rect x={54}  y={177} width={84} height={3} fill={amber} fillOpacity={0.5} />
          <Rect x={54}  y={12}  width={3}  height={168} fill={amber} fillOpacity={0.5} />
          <Rect x={135} y={12}  width={3}  height={168} fill={amber} fillOpacity={0.5} />
        </>
      )}

      {glory > 80 && (
        <>
          {/* 4 corner stars */}
          <Circle cx={57}  cy={15}  r={4} fill={star} />
          <Circle cx={135} cy={15}  r={4} fill={star} />
          <Circle cx={57}  cy={177} r={4} fill={star} />
          <Circle cx={135} cy={177} r={4} fill={star} />
        </>
      )}
    </>
  );
}

// ─── CharacterSprite ──────────────────────────────────────────────────────────

interface Props {
  player: Player;
  flipped?: boolean;
}

export default function CharacterSprite({ player, flipped = false }: Props) {
  const { inventory, physicalStats, prestige, age, skinTone } = player;

  const body     = getBodyVariant(player);
  const clothing = getClothingVariant(inventory);
  const armor    = getArmorVariant(inventory);
  const helmet   = getHelmetVariant(inventory);
  const weapon   = getWeaponVariant(inventory);
  const hasGaunt  = hasSubtype(inventory, 'gauntlets') || armor === 'plate';
  const hasShield = hasSubtype(inventory, 'shield') || armor === 'plate';

  const bodyData     = body === 'slim' ? bodySlim : body === 'muscular' ? bodyMuscular : bodyAverage;
  const clothingData = { none: clothingNone, common: clothingCommon, fine: clothingFine, noble: clothingNoble }[clothing][body];
  const armorData    = { none: armorNone, leather: armorLeather, chainmail: armorChainmail, plate: armorPlate }[armor][body];
  const gauntletData = (hasGaunt ? gauntletsMetal : gauntletsNone)[body];
  const helmetData   = { none: helmetNone, basic: helmetBasic, great: helmetGreat }[helmet];
  const shieldData   = hasShield ? shieldEquipped : shieldNone;
  const weaponData   = { none: weaponNone, sword: weaponSword, lance: weaponLance, axe: weaponAxe, mace: weaponMace, bow: weaponBow }[weapon];

  // Skin & eye palettes
  const skin = SKIN_PALETTES[skinTone] ?? SKIN_PALETTES.tone1;
  const bodyPalette: Record<string, string> = {
    sk: skin.sk, sk2: skin.sk2,
    hr: '#6B3E26',
    ey: prestige.honor < -20 ? '#501313' : '#2C2C2A',
    mo: '#8B2020',
  };

  // Age scale centered at (96, 0)
  const s = age < 15 ? 0.78 : age < 18 ? 0.90 : 1.0;
  const ageTransform = s !== 1.0
    ? `translate(96, 0) scale(${s}) translate(-96, 0)`
    : '';

  // Flip around center x=96: translate(192,0) then scale(-1,1)
  const flipTransform = flipped ? 'translate(192, 0) scale(-1, 1)' : '';

  // Hunched posture for low honor
  const hunchY = prestige.honor < -20 ? 18 : 0;

  return (
    <Svg width={192} height={192}>
      {/* Ground shadow */}
      <Ellipse cx={96} cy={184} rx={30} ry={5} fill="#00000033" />

      <SvgG transform={`${flipTransform} ${ageTransform}`}>
        {/* Shield (left side, rendered behind body) */}
        <PixelLayer data={shieldData}  palette={SHIELD_PALETTE}              offsetX={6}  offsetY={18} />

        {/* Body group (affected by posture) */}
        <SvgG transform={hunchY ? `translate(0, ${hunchY})` : undefined}>
          <PixelLayer data={bodyData}     palette={bodyPalette}               offsetX={20} offsetY={4} />
          <PixelLayer data={clothingData} palette={CLOTHING_PALETTES[clothing]} offsetX={20} offsetY={4} />
          <PixelLayer data={armorData}    palette={ARMOR_PALETTE}             offsetX={20} offsetY={4} />
          <PixelLayer data={gauntletData} palette={GAUNTLET_PALETTE}          offsetX={20} offsetY={4} />
          <PixelLayer data={helmetData}   palette={HELMET_PALETTE}            offsetX={20} offsetY={4} />
        </SvgG>

        {/* Weapon (right side) */}
        <PixelLayer data={weaponData} palette={WEAPON_PALETTE} offsetX={44} offsetY={8} />
      </SvgG>

      {/* Prestige aura (rendered last, not affected by age/posture) */}
      <PrestigeAura glory={prestige.glory} />
    </Svg>
  );
}
