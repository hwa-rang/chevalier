import React from 'react';
import { View, Image } from 'react-native';
import type { Player } from '../types/game';
import { EMPTY_EQUIPMENT } from '../utils/equipment';

// ─── Asset maps (static requires — Metro bundles each PNG) ─────────────────────

const SKIN: Record<string, number> = {
  tone1: require('../assets/sprites/png/skin-1.png'),
  tone2: require('../assets/sprites/png/skin-2.png'),
  tone3: require('../assets/sprites/png/skin-3.png'),
  tone4: require('../assets/sprites/png/skin-4.png'),
  tone5: require('../assets/sprites/png/skin-4.png'),
};

const HAIR: Record<string, number> = {
  blond: require('../assets/sprites/png/hair-blond.png'),
  brun: require('../assets/sprites/png/hair-brun.png'),
  noir: require('../assets/sprites/png/hair-noir.png'),
  rouge: require('../assets/sprites/png/hair-rouge.png'),
};

const CLOTHING_BASIC = require('../assets/sprites/png/clothing-basic.png');

const HELMET: Record<string, number> = {
  helmet_nasal: require('../assets/sprites/png/helmet-nasal.png'),
  helmet_corbeau: require('../assets/sprites/png/helmet-corbeau.png'),
  helmet_roa: require('../assets/sprites/png/helmet-roa.png'),
  helmet_crusader: require('../assets/sprites/png/helmet-crusader.png'),
  helmet_chapel: require('../assets/sprites/png/helmet-chapel.png'),
  // Reward helmets: pagan counterpart of the crusader bascinet.
  helmet_apocryphal: require('../assets/sprites/png/helmet-paien.png'),
};

const ARMOR: Record<string, number> = {
  chainmail: require('../assets/sprites/png/armor-maille.png'),
  full_plate: require('../assets/sprites/png/armor-cuirass.png'),
};

const SHIELD: Record<string, number> = {
  shield_small: require('../assets/sprites/png/shield-small.png'),
  shield: require('../assets/sprites/png/shield-medium.png'),
  shield_large: require('../assets/sprites/png/shield-large.png'),
};

const WEAPON: Record<string, number> = {
  long_sword: require('../assets/sprites/png/weapon-sword.png'),
  sword_shield: require('../assets/sprites/png/weapon-sword-1h.png'),
  axe: require('../assets/sprites/png/weapon-axe.png'),
  mace: require('../assets/sprites/png/weapon-mace.png'),
  lance: require('../assets/sprites/png/weapon-lance.png'),
  bardiche: require('../assets/sprites/png/weapon-bardiche.png'),
  bow: require('../assets/sprites/png/weapon-bow.png'),
  training_staff: require('../assets/sprites/png/weapon-staff.png'),
};

// ─── Layer ─────────────────────────────────────────────────────────────────────

function Layer({ src, size }: { src: number; size: number }) {
  return (
    <Image
      source={src}
      style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}
      resizeMode="contain"
      fadeDuration={0}
    />
  );
}

interface Props {
  player: Player;
  flipped?: boolean;
  size?: number;
}

export default function CharacterSprite({ player, flipped = false, size = 192 }: Props) {
  const skinSrc = SKIN[player.skinTone] ?? SKIN.tone1;
  const hairSrc = HAIR[player.hair ?? 'brun'] ?? HAIR.brun;

  const eq = player.equipment ?? EMPTY_EQUIPMENT;
  // A slot only shows if the player still owns the equipped item.
  const owns = (sub: string | null) => !!sub && player.inventory.some((i) => i.subtype === sub);

  const helmetSrc = owns(eq.helmet) ? HELMET[eq.helmet as string] ?? null : null;
  const armorSrc  = owns(eq.armor)  ? ARMOR[eq.armor as string]  ?? null : null;
  const shieldSrc = owns(eq.shield) ? SHIELD[eq.shield as string] ?? null : null;
  const weaponSrc = owns(eq.weapon) ? WEAPON[eq.weapon as string] ?? null : null;

  // Hair is hidden when a helmet is worn.
  const showHair = !helmetSrc;

  return (
    <View
      style={[
        { width: size, height: size },
        flipped ? { transform: [{ scaleX: -1 }] } : null,
      ]}
    >
      {/* Back → front: skin, hair, clothing, armor, shield, helmet, weapon */}
      <Layer src={skinSrc} size={size} />
      {showHair && <Layer src={hairSrc} size={size} />}
      <Layer src={CLOTHING_BASIC} size={size} />
      {armorSrc && <Layer src={armorSrc} size={size} />}
      {shieldSrc && <Layer src={shieldSrc} size={size} />}
      {helmetSrc && <Layer src={helmetSrc} size={size} />}
      {weaponSrc && <Layer src={weaponSrc} size={size} />}
    </View>
  );
}
