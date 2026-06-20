import type { GameEvent } from '../events';
import type { SuitorArchetype } from './types';
import { devote } from './devote';
import { serveuse } from './serveuse';
import { voleuse } from './voleuse';
import { noble } from './noble';
import { marchande } from './marchande';
import { COURTSHIP_EVENTS } from './events';

export type { SuitorArchetype } from './types';

/** Registre des archétypes de prétendant(e)s. */
export const ARCHETYPES: SuitorArchetype[] = [devote, serveuse, voleuse, noble, marchande];

export function archetypeById(id: string): SuitorArchetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

/** Délai (mois) avant qu'une nouvelle rencontre puisse survenir après une cour. */
export const COURTSHIP_COOLDOWN_MONTHS = 30;

/** Compile l'événement de rencontre (non-prioritaire) d'un archétype. */
function meetingEvent(a: SuitorArchetype): GameEvent {
  return {
    id: `courtship_meet_${a.id}`,
    type: 'monthly',
    title: a.meeting.title,
    description: a.meeting.description,
    conditions: {
      single: true,
      minAge: 16,
      minMonthsSinceCourtship: COURTSHIP_COOLDOWN_MONTHS,
      ...(a.location ? { minCounter: { key: a.location, value: 1 } } : {}),
      ...a.meetingConditions,
    },
    outcomes: [
      { label: a.meeting.acceptLabel, startCourtship: a.id, historyText: a.meeting.acceptHistory },
      { label: a.meeting.declineLabel, historyText: a.meeting.declineHistory },
    ],
  };
}

/** Événements de cour mensuels : rencontres (par archétype) + obstacles/mariage. */
export const COURTSHIP_MONTHLY_EVENTS: GameEvent[] = [
  ...ARCHETYPES.map(meetingEvent),
  ...COURTSHIP_EVENTS,
];
