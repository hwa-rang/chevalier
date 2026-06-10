import type { Player } from '../types/game';

/** Cumulative temple visits past which the Church excommunicates you. */
export const TEMPLE_EXCOMMUNICATION_THRESHOLD = 5;
/** Reputation below which the law institutions bar their doors. */
export const LAW_ZONE_REP_FLOOR = -30;
/** Reputation below which the Church bars its doors. */
export const CHURCH_REP_FLOOR = -50;
/** Priest relation at/under which you are banned from the church. */
export const PRIEST_BAN_SCORE = -30;

export interface ZoneAccess {
  forbidden: boolean;
  reason?: string;
}

/**
 * Whether the player is barred from a village zone, and why.
 * Law zones (guardhouse, bailiff) close to the ill-reputed; the church closes
 * to the ill-reputed, the excommunicated (too many temple visits), or anyone
 * the priest has come to despise.
 */
export function getZoneAccess(player: Player, zone: string): ZoneAccess {
  const rep = player.prestige.reputation;
  const flags = player.flags ?? [];

  if (zone === 'guardhouse' || zone === 'bailiff') {
    if (rep < LAW_ZONE_REP_FLOOR) {
      return { forbidden: true, reason: 'Votre sinistre réputation vous ferme cette porte.' };
    }
    return { forbidden: false };
  }

  if (zone === 'temple') {
    if (flags.includes('renounced_old_gods')) {
      return { forbidden: true, reason: 'Vous avez abjuré les anciens dieux devant la paroisse.' };
    }
    return { forbidden: false };
  }

  if (zone === 'church') {
    if (flags.includes('pagan_path')) {
      return { forbidden: true, reason: "Excommunié : vous avez choisi les anciens cultes." };
    }
    if ((player.templeVisits ?? 0) >= TEMPLE_EXCOMMUNICATION_THRESHOLD) {
      return { forbidden: true, reason: 'Vos dévotions païennes vous ont valu une excommunication.' };
    }
    const priest = player.relations.find((r) => r.type === 'priest');
    if (priest && priest.score <= PRIEST_BAN_SCORE) {
      return { forbidden: true, reason: "Le prêtre vous a banni de son église." };
    }
    if (rep < CHURCH_REP_FLOOR) {
      return { forbidden: true, reason: "L'Église vous tient pour un paria." };
    }
    return { forbidden: false };
  }

  return { forbidden: false };
}
