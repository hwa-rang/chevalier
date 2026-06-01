import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Player } from '../types/game';
import * as S from '../assets/sprites/svg/spriteData';

// One memoised layer — parses its SVG string only when xml/size change.
const Layer = React.memo(function Layer({ xml, size }: { xml: string; size: number }) {
  return (
    <SvgXml
      xml={xml}
      width={size}
      height={size}
      style={{ position: 'absolute', left: 0, top: 0 }}
    />
  );
});

// Body sprite chosen by skin tone × hair colour.
const BODY: Record<'skin1' | 'skin2', Record<'hair1' | 'hair2', string>> = {
  skin1: { hair1: S.bodyS1H1, hair2: S.bodyS1H2 },
  skin2: { hair1: S.bodyS2H1, hair2: S.bodyS2H2 },
};

/** Which equipment layers to show. Overrides ownership when provided (preview). */
export interface EquipmentVisibility {
  armor?: boolean;
  helmet?: boolean;
  shield?: boolean;
  weapon?: boolean;
}

interface Props {
  player: Player;
  flipped?: boolean;
  size?: number;
  /** Force specific layers on/off (used by the character-screen preview). */
  preview?: EquipmentVisibility;
}

export default function CharacterSprite({ player, flipped = false, size = 192, preview }: Props) {
  const skin = player.skinTone === 'tone1' ? 'skin1' : 'skin2';
  const hair = player.hair ?? 'hair1';
  const bodyXml = BODY[skin][hair];

  const owns = (pred: (subtype: string, category: string) => boolean) =>
    player.inventory.some((i) => pred(i.subtype, i.category));

  const showArmor  = preview?.armor  ?? owns((_s, c) => c === 'armor');
  const showHelmet = preview?.helmet ?? owns((s) => s === 'helmet' || s === 'full_plate');
  const showShield = preview?.shield ?? owns((s) => s === 'shield');
  const showWeapon = preview?.weapon ?? owns((s) => s === 'long_sword' || s === 'sword_shield' || s === 'short_sword');

  return (
    <View
      style={[
        { width: size, height: size },
        flipped ? { transform: [{ scaleX: -1 }] } : null,
      ]}
    >
      {/* Stacked back → front */}
      <Layer xml={bodyXml} size={size} />
      {showArmor && <Layer xml={S.armorCuirass} size={size} />}
      {showHelmet && <Layer xml={S.helmet1} size={size} />}
      {showShield && <Layer xml={S.shieldMedium} size={size} />}
      {showWeapon && <Layer xml={S.weaponShortsword} size={size} />}
    </View>
  );
}
