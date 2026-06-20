import type { EventOutcome, GameEvent } from '../events';

/**
 * Un outcome tel qu'écrit par l'auteur d'un arc : un EventOutcome enrichi de deux
 * marqueurs d'auteur (begins/ends) que le compilateur `arcToEvents` consomme puis
 * retire. La plomberie d'arc (startArc/endArc, flags d'étape) est injectée par le
 * compilateur — l'auteur n'écrit que le contenu humain et les gates métier.
 */
export interface ArcOutcome extends EventOutcome {
  /** (déclencheur uniquement) cet outcome accepte/lance l'arc. */
  begins?: boolean;
  /** (étape uniquement) cet outcome termine l'arc prématurément au lieu d'avancer. */
  ends?: boolean;
}

/** Un nœud d'arc (déclencheur ou climax). */
export interface ArcNode {
  type?: 'monthly' | 'annual';
  title: string;
  description: string;
  /** Gates métier supplémentaires (minAge, minSkill, minYear…). */
  conditions?: GameEvent['conditions'];
  outcomes: ArcOutcome[];
}

/** Une étape intermédiaire (montée) — une seule éligible à la fois. */
export interface ArcStep extends ArcNode {
  /** Numéro d'étape (1-based, consécutif). NE JAMAIS renuméroter (cf. migration). */
  stage: number;
}

/** Définition complète d'un arc majeur, data-driven. */
export interface ArcDef {
  id: string;
  /** Mois requis depuis la fin du dernier arc avant que celui-ci puisse se déclencher. */
  cooldownMonths: number;
  /** L'événement déclencheur — un outcome doit porter `begins: true`. */
  trigger: ArcNode;
  /** Les étapes de montée (peuvent être vides). */
  steps: ArcStep[];
  /** Le climax — tous ses outcomes terminent l'arc. */
  climax: ArcNode;
}
