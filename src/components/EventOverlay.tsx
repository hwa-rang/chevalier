import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import EventModal from './EventModal';
import ActivityResultModal from './ActivityResultModal';
import type { ChangeLine } from '../utils/statLabels';

/**
 * Global event handler rendered above the whole app. Whenever the store has a
 * pending event, it shows the choice modal; after a choice it shows a
 * consequence popup. Because it sits at the root, events appear over any screen
 * (e.g. the character sheet you land on after advancing the month).
 */
export default function EventOverlay() {
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const resolveEvent = useGameStore((s) => s.resolveEvent);

  const [result, setResult] = useState<{ lines: ChangeLine[]; note?: string } | null>(null);

  return (
    <>
      <EventModal
        event={pendingEvent}
        onChoose={(index) => {
          const res = resolveEvent(index);
          if (res.ok) setResult({ lines: res.lines ?? [], note: res.note });
        }}
      />
      <ActivityResultModal
        visible={result !== null}
        title="Conséquence de votre choix"
        lines={result?.lines ?? []}
        note={result?.note}
        onClose={() => setResult(null)}
      />
    </>
  );
}
