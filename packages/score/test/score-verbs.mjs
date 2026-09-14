#!/usr/bin/env node
//
// The seven verbs, on the score format. No browser, no server, no UI.
//
//   npm test          # from packages/score
//
// WHY BEFORE THE UI. Roadmap E2 says it: "this is the part that has to FEEL right, so build it
// testable first". Every assertion here states the exact times it expects, because a verb that
// moves the right events by nearly the right amount looks perfect on a timeline drawn at four
// pixels a second and is wrong in the material.
//
// The traps each of these was written for are named in the case.

import {
  makeEvent, select, nudge, rippleFrom, setGap, stretch, group, ungroup,
  commonGroup, groups, sortScore, duration, adoptIds,
} from '../src/index.js';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const times = (score) => score.map((e) => e.time);
const ids = (score) => score.map((e) => e.id);

// A small score with the shape the real thing has: two notes with a `set` hung off each, and
// the two pairs already grouped the way a Ppar would deliver them.
function fixture() {
  return sortScore([
    makeEvent(0, { type: 'note', def: 'substrate', freqA: 36 }, { id: 'n1', path: ['a'] }),
    makeEvent(4, { type: 'set', id: 'n1', spread: 1 }, { id: 's1', path: ['a'] }),
    makeEvent(10, { type: 'note', def: 'substrate', freqA: 40 }, { id: 'n2', path: ['b'] }),
    makeEvent(18, { type: 'set', id: 'n2', feedback: 0.4 }, { id: 's2', path: ['b'] }),
    makeEvent(30, { type: 'note', def: 'resonantBassEnv2', freq: 36 }, { id: 'n3', path: [] }),
  ]);
}

// A verb that throws where it should not would otherwise kill the run BEFORE any result is
// printed, which reads as an empty harness rather than a failure. Caught, so it reads as one.
try {

// --- select ---------------------------------------------------------------
{
  const s = fixture();
  check('select by time window takes both ends',
    eq(select(s, { from: 4, to: 18 }), ['s1', 'n2', 's2']), select(s, { from: 4, to: 18 }).join(' '));
  check('select { after } is strict, select { from } is not',
    eq(select(s, { after: 10 }), ['s2', 'n3']) && eq(select(s, { from: 10 }), ['n2', 's2', 'n3']));
  check('select by group is a PREFIX match, not an equality one',
    eq(select(s, { path: ['a'] }), ['n1', 's1']), select(s, { path: ['a'] }).join(' '));
  check('select clauses are ANDed',
    eq(select(s, { path: ['b'], type: 'note' }), ['n2']));
}

// --- nudge ----------------------------------------------------------------
{
  const s = fixture();
  const out = nudge(s, ['n2', 's2'], 2.5);
  check('nudge moves only the selection, and re-sorts',
    eq(times(out), [0, 4, 12.5, 20.5, 30]) && eq(ids(out), ['n1', 's1', 'n2', 's2', 'n3']),
    times(out).join(' '));
  check('nudge does not mutate the input score',
    eq(times(s), [0, 4, 10, 18, 30]), times(s).join(' '));

  // THE TRAP. Clamping each event separately at zero would give [0, 0, 4, 12, 24] -- n1 and s1
  // land on top of each other and a four-second gap is gone. The move is limited as a whole
  // instead, so the earliest lands exactly on 0 and every interval survives.
  const back = nudge(s, ids(s), -6);
  check('a move past zero is LIMITED, not clipped: spacing survives',
    eq(times(back), [0, 4, 10, 18, 30]), times(back).join(' '));
  const partial = nudge(s, ['s1', 'n2'], -6);
  check('...and the limit is set by the selection, not by the score',
    eq(times(partial), [0, 0, 6, 18, 30]) && eq(ids(partial), ['n1', 's1', 'n2', 's2', 'n3']),
    times(partial).join(' '));
}

// --- sort stability -------------------------------------------------------
{
  // Same-time ordering is a replay question (E4). A verb must not answer it by shuffling, so
  // two events landing on the same instant keep the order they had.
  const s = fixture();
  const out = nudge(s, ['n2'], -6);
  const at4 = ids(out).filter((id) => ['s1', 'n2'].includes(id));
  check('events landing on the same time keep their order',
    eq(times(out), [0, 4, 4, 18, 30]) && eq(at4, ['s1', 'n2']), at4.join(' '));
}

// --- ripple ---------------------------------------------------------------
{
  const s = fixture();
  const out = rippleFrom(s, 10, 5);
  check('ripple moves everything at or after the point, and nothing before it',
    eq(times(out), [0, 4, 15, 23, 35]), times(out).join(' '));
  // Boundary: at-or-after. Dropping the playhead exactly on an event and pushing should take
  // that event with you; strictly-after would leave it behind and open a gap in the wrong place.
  check('ripple includes an event sitting exactly on the point',
    times(rippleFrom(s, 30, 1))[4] === 31, String(times(rippleFrom(s, 30, 1))[4]));
  check('ripple preserves every gap in the tail',
    eq(times(out).slice(2).map((t, i, a) => (i ? t - a[i - 1] : 0)),
      times(s).slice(2).map((t, i, a) => (i ? t - a[i - 1] : 0))));
}

// --- set gap --------------------------------------------------------------
{
  const s = fixture();
  const closed = setGap(s, 'n2', 's2', 3);
  check('set gap moves the later event only',
    eq(times(closed), [0, 4, 10, 13, 30]), times(closed).join(' '));
  check('the pair is named, not ordered: swapping the arguments changes nothing',
    eq(times(setGap(s, 's2', 'n2', 3)), times(closed)));
  // Without ripple the tail stays put and one gap absorbs the change; with it the tail follows
  // and every later gap survives. Guessing between these would be wrong half the time.
  const rippled = setGap(s, 'n2', 's2', 3, { ripple: true });
  check('set gap with ripple carries the tail',
    eq(times(rippled), [0, 4, 10, 13, 25]), times(rippled).join(' '));
  check('set gap to a bigger number opens the gap',
    eq(times(setGap(s, 'n1', 's1', 7)), [0, 7, 10, 18, 30]), times(setGap(s, 'n1', 's1', 7)).join(' '));
}

// --- stretch --------------------------------------------------------------
{
  const s = fixture();
  const out = stretch(s, ['n2', 's2'], 0.5);
  check('stretch scales about the earliest selected event by default',
    eq(times(out), [0, 4, 10, 14, 30]), times(out).join(' '));
  check('stretch about an explicit origin',
    eq(times(stretch(s, ['n1', 's1', 'n2'], 2, { origin: 0 })), [0, 8, 20, 18, 30].sort((a, b) => a - b)),
    times(stretch(s, ['n1', 's1', 'n2'], 2, { origin: 0 })).join(' '));
  check('stretch by 1 is identity',
    eq(times(stretch(s, ids(s), 1)), times(s)));
  let threw = null;
  try { stretch(s, ids(s), 0); } catch (e) { threw = e.message; }
  check('stretch refuses a zero factor rather than collapsing the piece onto a point',
    threw !== null, threw ?? 'no throw');
}

// --- group / ungroup ------------------------------------------------------
{
  const s = fixture();
  const g = group(s, ['n2', 's2', 'n3'], 'second-half');
  // THE TRAP. Appending would give ['b','second-half'] and ['second-half'] -- two paths that
  // merely end the same way, which a prefix match never finds. Grouping WRAPS.
  check('group prepends, so the group is a prefix and prefix-select finds it',
    eq(select(g, { path: ['second-half'] }), ['n2', 's2', 'n3']),
    g.map((e) => e.path.join('/')).join(' | '));
  check('group preserves the structure inside it, so groups nest',
    eq(g.find((e) => e.id === 'n2').path, ['second-half', 'b']));
  check('group leaves unselected events alone',
    eq(g.find((e) => e.id === 'n1').path, ['a']));

  const u = ungroup(g, ['n2', 's2', 'n3']);
  check('ungroup strips one level and is the inverse of group',
    eq(u.map((e) => e.path), s.map((e) => e.path)), u.map((e) => e.path.join('/')).join(' | '));

  let threw = null;
  try { ungroup(s, ['n1', 'n2']); } catch (e) { threw = e.message; }
  check('ungroup THROWS on a selection with no shared group, rather than no-opping silently',
    threw !== null, threw ?? 'no throw');
  check('commonGroup is what the UI asks before offering the button',
    commonGroup(s, ['n1', 's1']) === 'a' && commonGroup(s, ['n1', 'n2']) === null
    && commonGroup(s, ['n3']) === null);
}

// --- groups() -------------------------------------------------------------
{
  const s = group(fixture(), ['n1', 's1', 'n2', 's2'], 'both');
  const g = groups(s);
  check('groups() reports every prefix with its span, outermost first',
    eq(g.map((x) => [x.key, x.from, x.to]),
      [['both', 0, 18], ['both/a', 0, 4], ['both/b', 10, 18]]),
    g.map((x) => `${x.key}:${x.from}-${x.to}`).join(' '));
}

// --- authored ids ---------------------------------------------------------
{
  // The counter is per process. Reopening a saved document in a fresh page would otherwise
  // reissue ids the score already holds, and every verb addresses events BY id -- so a
  // collision means nudging one event moves two, silently.
  const loaded = [
    makeEvent(0, { type: 'note' }, { id: 'ev-7' }),
    makeEvent(5, { type: 'set' }, { id: 'ev-8' }),
    makeEvent(9, { type: 'set' }, { id: 'hand-authored' }),
  ];
  adoptIds(loaded);
  const fresh = makeEvent(12, { type: 'note' });
  check('adoptIds pushes the counter past the ids a loaded score already holds',
    !loaded.some((e) => e.id === fresh.id) && fresh.id === 'ev-9', fresh.id);
  check('...and ignores ids it did not issue',
    makeEvent(0, {}).id === 'ev-10');
}

// --- the verbs compose ----------------------------------------------------
{
  // What the editor actually does in one gesture: group the second pair, select it by prefix,
  // and move it as a unit. If grouping and prefix-select do not line up this reads as nothing
  // happening.
  let s = fixture();
  s = group(s, ['n2', 's2'], 'echo');
  s = nudge(s, select(s, { path: ['echo'] }), -3);
  check('group then move-by-prefix works as one gesture',
    eq(times(s), [0, 4, 7, 15, 30]), times(s).join(' '));
  check('duration tracks the last event',
    duration(s) === 30);
}

} catch (e) {
  check('the harness ran to completion without an unexpected throw', false, String(e.message ?? e));
}

console.log('');
for (const r of results) {
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n           ${r.detail}` : ''}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed.\n`);
process.exit(failed ? 1 : 0);
