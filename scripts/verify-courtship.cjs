/* Headless verification of the courtship pipeline. Transpiles .ts on the fly and
 * simulates: church frequency -> meeting eligibility -> startCourtship -> gestures
 * advancing the stage -> marriage (spouse + marriageEffects) -> single/cooldown
 * gating blocks a second meeting. Run: node scripts/verify-courtship.cjs */
const fs = require('fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const src = fs.readFileSync(filename, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: { module: 'CommonJS', target: 'ES2019', esModuleInterop: true, isolatedModules: true },
    fileName: filename,
  }).outputText;
  module._compile(out, filename);
};

const { filterEligibleEvents } = require('../src/utils/eventEngine.ts');
const { COURTSHIP_MONTHLY_EVENTS, archetypeById } = require('../src/data/courtship/index.ts');

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok  -', m); }

function makePlayer(over = {}) {
  return {
    age: 20, prestige: { reputation: 0, glory: 0, honor: 30 },
    inventory: [], relations: [], flags: [], templeVisits: 0,
    currentYear: 1320, currentMonth: 1, activeQuest: null,
    knowledgeSkills: { religion: 12, eloquence: 10 }, combatSkills: {}, physicalStats: {}, ridingSkills: {},
    arcState: { activeArcId: null, arcStartAbsMonth: 0, lastArcEndAbsMonth: 0, completedArcIds: [] },
    counters: { churchStreak: 2 }, courtship: null, spouseId: null, spouseArchetype: null, lastCourtshipEndAbsMonth: 0,
    ...over,
  };
}
const eligibleIds = (p) => filterEligibleEvents(p, COURTSHIP_MONTHLY_EVENTS).map((e) => e.id);

// 1) Compatibility: devote favours honour/piety, loathes the pagan path.
const devote = archetypeById('devote');
assert(devote, 'devote archetype registered');
assert(devote.compatibility(makePlayer()) > 0, 'devote compatible with an honourable, pious player');
assert(devote.compatibility(makePlayer({ flags: ['pagan_path'] })) < 0, 'devote incompatible with a pagan');

// 2) Meeting eligibility.
assert(eligibleIds(makePlayer()).includes('courtship_meet_devote'), 'devote meeting eligible (church-going, honourable)');
assert(!eligibleIds(makePlayer({ flags: ['pagan_path'] })).includes('courtship_meet_devote'), 'meeting blocked for pagan (forbiddenFlag)');
assert(!eligibleIds(makePlayer({ prestige: { reputation: 0, glory: 0, honor: 2 } })).includes('courtship_meet_devote'), 'meeting blocked when honour < 10');
assert(!eligibleIds(makePlayer({ counters: { churchStreak: 0 } })).includes('courtship_meet_devote'), 'meeting blocked without church frequency');

// 3) startCourtship resolution (mirror of resolveEvent).
let p = makePlayer();
const meet = COURTSHIP_MONTHLY_EVENTS.find((e) => e.id === 'courtship_meet_devote');
const accept = meet.outcomes.find((o) => o.startCourtship);
assert(accept, 'meeting has a startCourtship outcome');
{
  const arche = archetypeById(accept.startCourtship);
  const compat = arche.compatibility(p);
  const suitor = { personId: 'suitor1', name: 'Agnès', age: 20, type: 'friend', score: Math.max(20, 25 + Math.round(compat / 4)), npcRole: 'suitor' };
  p = { ...p, relations: [...p.relations, suitor], courtship: { suitorId: 'suitor1', archetype: 'devote', stage: 1, lastGestureAbsMonth: 0 } };
}
assert(p.courtship && p.courtship.suitorId === 'suitor1', 'courtship started with a suitor');
assert(!eligibleIds(p).includes('courtship_meet_devote'), 'no new meeting while courting (single fails)');
assert(eligibleIds(p).includes('courtship_rival'), 'rival obstacle eligible during courtship');

// 4) Gestures advance the stage; marriage needs stage>=3 & score>=80 (mirror proposeMarriage gate).
function canMarry(pl, id) {
  if (pl.spouseId || pl.age < 16) return false;
  const t = pl.relations.find((r) => r.personId === id); if (!t || t.score < 80) return false;
  const c = pl.courtship && pl.courtship.suitorId === id ? pl.courtship : null;
  if (c && c.stage < 3) return false;
  return true;
}
// bump suitor score to 85 and stage to 3
p.relations = p.relations.map((r) => r.personId === 'suitor1' ? { ...r, score: 85 } : r);
assert(!canMarry(p, 'suitor1'), 'cannot marry before stage 3');
p.courtship = { ...p.courtship, stage: 3 };
assert(canMarry(p, 'suitor1'), 'can marry at stage 3 with score >= 80');

// marry (mirror): set spouse, apply marriageEffects, clear courtship, stamp cooldown.
const repBefore = p.prestige.reputation;
{
  const arche = archetypeById(p.courtship.archetype);
  p = {
    ...p, spouseId: 'suitor1', spouseArchetype: 'devote', courtship: null,
    lastCourtshipEndAbsMonth: p.currentYear * 12 + p.currentMonth,
    prestige: { ...p.prestige, reputation: p.prestige.reputation + (arche.marriageEffects.prestige.reputation || 0) },
    relations: p.relations.map((r) => r.personId === 'suitor1' ? { ...r, type: 'lover' } : r),
  };
}
assert(p.spouseId === 'suitor1', 'spouse set after marriage');
assert(p.prestige.reputation === repBefore + 10, 'devote marriage grants +10 reputation');
assert(!eligibleIds(p).includes('courtship_meet_devote'), 'married -> no new meeting (single fails)');
assert(eligibleIds(p).includes('spouse_reproach_dishonor') === false, 'no dishonour reproach while honour is fine');
assert(eligibleIds(makePlayer({ spouseId: 'x', prestige: { reputation: 0, glory: 0, honor: -5 } })).includes('spouse_reproach_dishonor'), 'reproach fires for a married, dishonoured player');

// 6) The four extra archetypes gate by their own conditions.
assert(['serveuse', 'voleuse', 'noble', 'marchande'].every((id) => archetypeById(id)), 'all five archetypes registered');
// serveuse: needs tavern frequency, not church.
assert(eligibleIds(makePlayer({ counters: { tavernStreak: 1 } })).includes('courtship_meet_serveuse'), 'serveuse meeting needs tavern frequency');
assert(!eligibleIds(makePlayer({ counters: { tavernStreak: 0 } })).includes('courtship_meet_serveuse'), 'serveuse blocked without tavern frequency');
// voleuse: notorious only.
assert(eligibleIds(makePlayer({ prestige: { reputation: -30, glory: 0, honor: 0 } })).includes('courtship_meet_voleuse'), 'voleuse meeting needs low reputation');
assert(!eligibleIds(makePlayer()).includes('courtship_meet_voleuse'), 'voleuse blocked for a reputable player');
// noble: glory gate.
assert(eligibleIds(makePlayer({ prestige: { reputation: 0, glory: 40, honor: 30 } })).includes('courtship_meet_noble'), 'noble meeting needs glory');
assert(!eligibleIds(makePlayer({ prestige: { reputation: 0, glory: 5, honor: 30 } })).includes('courtship_meet_noble'), 'noble blocked at low glory');
// marchande: requires knowing the merchant.
assert(eligibleIds(makePlayer({ relations: [{ personId: 'm', name: 'X', age: 40, type: 'friend', score: 10, npcRole: 'merchant' }] })).includes('courtship_meet_marchande'), 'marchande meeting needs a merchant relation');
assert(!eligibleIds(makePlayer()).includes('courtship_meet_marchande'), 'marchande blocked without a merchant relation');
// marriageEffects: marchande dowry is gold.
assert((archetypeById('marchande').marriageEffects.gold || 0) >= 50, 'marchande marriage brings a gold dowry');
// archetype-specific obstacles gate on the active archetype.
const pn = makePlayer({ courtship: { suitorId: 's', archetype: 'noble', stage: 1, lastGestureAbsMonth: 0 } });
assert(eligibleIds(pn).includes('courtship_noble_family'), 'noble family obstacle fires only during a noble courtship');
assert(!eligibleIds(pn).includes('courtship_voleuse_heist'), 'voleuse heist does not fire during a noble courtship');

console.log('\nALL COURTSHIP PIPELINE CHECKS PASSED');
