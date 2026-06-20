/* Headless verification of the arc pipeline. Transpiles .ts on the fly and
 * simulates the monthly engine loop: trigger -> step -> climax -> lock release,
 * plus cooldown and re-trigger blocking. Run: node scripts/verify-arcs.cjs */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Register a .ts require hook (transpile-only, types erased).
require.extensions['.ts'] = (module, filename) => {
  const src = fs.readFileSync(filename, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: { module: 'CommonJS', target: 'ES2019', esModuleInterop: true, isolatedModules: true },
    fileName: filename,
  }).outputText;
  module._compile(out, filename);
};

const { arcToEvents } = require('../src/data/arcs/index.ts');
const { filterEligibleEvents } = require('../src/utils/eventEngine.ts');

// Self-contained test arc (independent of the shipped registry).
const smoke = {
  id: 'smoke', cooldownMonths: 0,
  trigger: {
    title: 'Arc de test', description: 'd', conditions: { minAge: 15 },
    outcomes: [
      { label: 'Lancer', begins: true, historyText: 'x' },
      { label: 'Ignorer', historyText: 'y' },
    ],
  },
  steps: [{ stage: 1, title: 'Étape', description: 'd', outcomes: [{ label: 'Avancer', historyText: 'z' }] }],
  climax: { title: 'Climax', description: 'd', outcomes: [{ label: 'Conclure', historyText: 'w' }] },
};

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('ok  -', msg); }

// Minimal player covering every field filterEligibleEvents reads.
function makePlayer() {
  return {
    age: 18, prestige: { reputation: 0, glory: 0, honor: 0 },
    inventory: [], relations: [], flags: [], templeVisits: 0,
    currentYear: 1320, currentMonth: 1, activeQuest: null,
    knowledgeSkills: {}, combatSkills: {}, physicalStats: {}, ridingSkills: {},
    arcState: { activeArcId: null, arcStartAbsMonth: 0, lastArcEndAbsMonth: 0, completedArcIds: [] },
  };
}

// Mirror of gameStore.resolveEvent's flag/arc handling (the bits the pipeline needs).
function resolve(p, outcome) {
  if (outcome.setFlags) p.flags = [...p.flags, ...outcome.setFlags.filter((f) => !p.flags.includes(f))];
  const abs = p.currentYear * 12 + p.currentMonth;
  if (outcome.startArc) p.arcState = { ...p.arcState, activeArcId: outcome.startArc, arcStartAbsMonth: abs };
  if (outcome.endArc) p.arcState = {
    activeArcId: null, arcStartAbsMonth: 0, lastArcEndAbsMonth: abs,
    completedArcIds: p.arcState.completedArcIds.includes(outcome.endArc)
      ? p.arcState.completedArcIds : [...p.arcState.completedArcIds, outcome.endArc],
  };
}

// Engine-like pick: priority events preempt.
function pick(p, events) {
  const eligible = filterEligibleEvents(p, events);
  const prio = eligible.filter((e) => e.priority);
  return (prio.length ? prio : eligible)[0] ?? null;
}

const events = arcToEvents(smoke);
assert(events.length === 3, 'smoke compiles to 3 events (trigger + 1 step + climax)');

const p = makePlayer();

// 1) Trigger eligible, not priority.
let ev = pick(p, events);
assert(ev && ev.id === 'smoke_trigger', 'trigger is the eligible event');
const begin = ev.outcomes.find((o) => o.startArc === 'smoke');
assert(begin && begin.setFlags.includes('smoke_stage_1'), 'begin outcome carries startArc + stage_1');
resolve(p, begin);
assert(p.arcState.activeArcId === 'smoke', 'arc locked after trigger');

// 2) Step preempts; trigger no longer eligible (noActiveArc fails).
ev = pick(p, events);
assert(ev && ev.id === 'smoke_step_1' && ev.priority, 'step_1 (priority) is now the eligible event');
resolve(p, ev.outcomes[0]);
assert(p.flags.includes('smoke_stage_2'), 'step advanced to stage_2');

// 3) Climax eligible, terminal releases lock + cooldown + ledger.
ev = pick(p, events);
assert(ev && ev.id === 'smoke_climax', 'climax is the eligible event');
resolve(p, ev.outcomes[0]);
assert(p.arcState.activeArcId === null, 'lock released after climax');
assert(p.arcState.completedArcIds.includes('smoke'), 'arc id recorded in completedArcIds');
assert(p.flags.includes('smoke_complete'), 'smoke_complete flag set');

// 4) Re-trigger blocked by forbiddenFlag smoke_complete.
ev = pick(p, events);
assert(ev === null, 'no arc event re-fires once complete');

// 5) Cooldown gate: a fresh arc with cooldown>0 is blocked right after another arc ended.
const cooldownEv = arcToEvents({
  id: 'cd', cooldownMonths: 30,
  trigger: { title: 't', description: 'd', outcomes: [{ label: 'go', begins: true, historyText: 'x' }] },
  steps: [], climax: { title: 'c', description: 'd', outcomes: [{ label: 'end', historyText: 'y' }] },
});
const p2 = makePlayer();
p2.arcState = { activeArcId: null, arcStartAbsMonth: 0, lastArcEndAbsMonth: p2.currentYear * 12 + p2.currentMonth, completedArcIds: [] };
assert(pick(p2, cooldownEv) === null, 'trigger blocked during 30-month cooldown');
p2.currentYear += 3; // +36 months
assert(pick(p2, cooldownEv) && pick(p2, cooldownEv).id === 'cd_trigger', 'trigger eligible after cooldown elapses');

console.log('\nALL ARC PIPELINE CHECKS PASSED');
