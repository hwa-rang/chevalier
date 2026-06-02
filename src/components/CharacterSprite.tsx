import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Player } from '../types/game';
import { EMPTY_EQUIPMENT } from '../utils/equipment';
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

type Skin = 'skin1' | 'skin2';

const BODY: Record<Skin, Record<'hair1' | 'hair2', string>> = {
  skin1: { hair1: S.bodyS1H1, hair2: S.bodyS1H2 },
  skin2: { hair1: S.bodyS2H1, hair2: S.bodyS2H2 },
};

// ─── Equipment sprite resolvers (subtype → SVG string, null if no art) ─────────

function helmetSprite(subtype: string): string | null {
  switch (subtype) {
    case 'helmet': return S.helmet1;
    case 'helmet_visor': return S.helmet2;
    case 'helmet_crusader': return S.helmetChristian;
    default: return null;
  }
}

function armorSprite(subtype: string, skin: Skin): string | null {
  switch (subtype) {
    case 'chainmail': return skin === 'skin1' ? S.chainmailS1 : S.chainmailS2;
    case 'full_plate': return S.armorCuirass;
    default: return null;
  }
}

function shieldSprite(subtype: string): string | null {
  switch (subtype) {
    case 'shield': return S.shieldMedium;
    case 'shield_large': return S.shieldLarge;
    default: return null;
  }
}

function weaponSprite(subtype: string): string | null {
  switch (subtype) {
    case 'long_sword':
    case 'sword_shield': return S.weaponShortsword;
    default: return null;
  }
}

interface Props {
  player: Player;
  flipped?: boolean;
  size?: number;
}

export default function CharacterSprite({ player, flipped = false, size = 192 }: Props) {
  const skin: Skin = player.skinTone === 'tone1' ? 'skin1' : 'skin2';
  const hair = player.hair ?? 'hair1';
  const bodyXml = BODY[skin][hair];

  const eq = player.equipment ?? EMPTY_EQUIPMENT;
  // Only show a slot if the player still owns the equipped item.
  const owns = (sub: string | null) => !!sub && player.inventory.some((i) => i.subtype === sub);

  const armorXml  = owns(eq.armor)  ? armorSprite(eq.armor as string, skin) : null;
  const helmetXml = owns(eq.helmet) ? helmetSprite(eq.helmet as string) : null;
  const shieldXml = owns(eq.shield) ? shieldSprite(eq.shield as string) : null;
  const weaponXml = owns(eq.weapon) ? weaponSprite(eq.weapon as string) : null;

  return (
    <View
      style={[
        { width: size, height: size },
        flipped ? { transform: [{ scaleX: -1 }] } : null,
      ]}
    >
      {/* Stacked back → front */}
      <Layer xml={bodyXml} size={size} />
      {armorXml && <Layer xml={armorXml} size={size} />}
      {helmetXml && <Layer xml={helmetXml} size={size} />}
      {shieldXml && <Layer xml={shieldXml} size={size} />}
      {weaponXml && <Layer xml={weaponXml} size={size} />}
    </View>
  );
}
