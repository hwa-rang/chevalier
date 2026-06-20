import type { EventOutcome, GameEvent } from '../events';
import type { ArcDef, ArcOutcome } from './types';

export type { ArcDef, ArcNode, ArcStep, ArcOutcome } from './types';

// ─── Compilateur d'arcs ────────────────────────────────────────────────────────
// Transforme un ArcDef (contenu humain) en GameEvent[] que le moteur d'événements
// existant consomme. Toute la plomberie de verrou/étape est injectée ici, jamais
// écrite à la main dans les fichiers d'arc.

function asArray(flag: string | string[] | undefined): string[] {
  if (flag === undefined) return [];
  return Array.isArray(flag) ? flag : [flag];
}

function mergeForbidden(
  base: string | string[] | undefined,
  extra: string,
): string[] {
  return [...asArray(base), extra];
}

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/** Retire les marqueurs d'auteur et injecte flags/verrou d'arc. */
function compileOutcome(
  o: ArcOutcome,
  inject: { setFlags?: string[]; startArc?: string; endArc?: string },
): EventOutcome {
  const { begins: _begins, ends: _ends, ...rest } = o;
  const setFlags = dedup([...(rest.setFlags ?? []), ...(inject.setFlags ?? [])]);
  return {
    ...rest,
    ...(setFlags.length > 0 ? { setFlags } : {}),
    ...(inject.startArc ? { startArc: inject.startArc } : {}),
    ...(inject.endArc ? { endArc: inject.endArc } : {}),
  };
}

/** Compile un arc en événements de jeu (déclencheur + étapes + climax). */
export function arcToEvents(arc: ArcDef): GameEvent[] {
  const events: GameEvent[] = [];
  const completeFlag = `${arc.id}_complete`;
  const stageFlag = (n: number) => `${arc.id}_stage_${n}`;
  const climaxFlag = stageFlag(arc.steps.length + 1);

  // ── Déclencheur (non prioritaire : concourt dans le pool normal) ──
  events.push({
    id: `${arc.id}_trigger`,
    type: arc.trigger.type ?? 'monthly',
    title: arc.trigger.title,
    description: arc.trigger.description,
    conditions: {
      ...arc.trigger.conditions,
      noActiveArc: true,
      minMonthsSinceLastArc: arc.cooldownMonths,
      forbiddenFlag: mergeForbidden(arc.trigger.conditions?.forbiddenFlag, completeFlag),
    },
    outcomes: arc.trigger.outcomes.map((o) =>
      o.begins
        ? compileOutcome(o, { startArc: arc.id, setFlags: [stageFlag(1)] })
        : compileOutcome(o, {}),
    ),
  });

  // ── Étapes (prioritaires : préemptent les événements ordinaires) ──
  for (const step of arc.steps) {
    const nextFlag = stageFlag(step.stage + 1);
    events.push({
      id: `${arc.id}_step_${step.stage}`,
      type: step.type ?? 'monthly',
      title: step.title,
      description: step.description,
      priority: true,
      conditions: {
        ...step.conditions,
        requiresActiveArc: arc.id,
        requiredFlag: stageFlag(step.stage),
        forbiddenFlag: mergeForbidden(step.conditions?.forbiddenFlag, nextFlag),
      },
      outcomes: step.outcomes.map((o) =>
        o.ends
          ? compileOutcome(o, { endArc: arc.id, setFlags: [completeFlag] })
          : compileOutcome(o, { setFlags: [nextFlag] }),
      ),
    });
  }

  // ── Climax (prioritaire) : tous les outcomes terminent l'arc ──
  events.push({
    id: `${arc.id}_climax`,
    type: arc.climax.type ?? 'monthly',
    title: arc.climax.title,
    description: arc.climax.description,
    priority: true,
    conditions: {
      ...arc.climax.conditions,
      requiresActiveArc: arc.id,
      requiredFlag: climaxFlag,
      forbiddenFlag: mergeForbidden(arc.climax.conditions?.forbiddenFlag, completeFlag),
    },
    outcomes: arc.climax.outcomes.map((o) =>
      compileOutcome(o, { endArc: arc.id, setFlags: [completeFlag] }),
    ),
  });

  return events;
}

// ─── Registre des arcs ─────────────────────────────────────────────────────────
// Les arcs réels (querelle, faveurs du seigneur, usurier, peste) arriveront aux
// étapes suivantes. Pour l'instant le cadre est en place mais le registre est vide.

export const ARCS: ArcDef[] = [];

const ALL_ARC_EVENTS: GameEvent[] = ARCS.flatMap(arcToEvents);

export const ARC_MONTHLY_EVENTS: GameEvent[] = ALL_ARC_EVENTS.filter(
  (e) => e.type === 'monthly',
);
export const ARC_ANNUAL_EVENTS: GameEvent[] = ALL_ARC_EVENTS.filter(
  (e) => e.type === 'annual',
);
