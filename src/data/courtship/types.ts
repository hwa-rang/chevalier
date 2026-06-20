import type { Player, StatDelta } from '../../types/game';
import type { GameEvent } from '../events';

/**
 * Un archétype de prétendant(e). La rencontre est un événement non-prioritaire
 * dont la plomberie (single, cooldown, lieu) est injectée par le compilateur ;
 * l'auteur ne décrit que le contenu humain, les gates durs et la compatibilité.
 */
export interface SuitorArchetype {
  id: string;
  /** Libellé affiché, ex. « la dévote ». */
  label: string;
  emoji: string;
  /** Compteur de fréquentation requis pour la rencontre (clé de Player.counters). Optionnel : certains archétypes se gardent par réputation/gloire/relation. */
  location?: string;
  /** Prénoms pour générer le/la prétendant(e). */
  namePool: string[];
  /**
   * Compatibilité avec le profil joueur (≈ -100..+100) : module la réussite des
   * gestes de cour. Les exigences DURES (rencontre impossible) passent par
   * `meetingConditions`, pas ici.
   */
  compatibility: (p: Player) => number;
  /** Gates durs de la rencontre (minHonor, forbiddenFlag…), fusionnés au compilateur. */
  meetingConditions?: GameEvent['conditions'];
  /** Contenu de l'événement de rencontre. */
  meeting: {
    title: string;
    description: string;
    acceptLabel: string;
    declineLabel: string;
    acceptHistory: string;
    declineHistory: string;
  };
  /** Effets de prestige/stats appliqués au mariage. */
  marriageEffects: StatDelta;
  /** Score perdu par l'époux/épouse si l'on courtise/flirte ailleurs. */
  jealousyPenalty: number;
  /** Reproche conjugal si l'honneur passe sous ce seuil (événement). */
  dishonorReproach?: { maxHonor: number };
}
