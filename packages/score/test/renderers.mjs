#!/usr/bin/env node
//
// The renderer contract. No browser, no engine.
//
//   npm test          # from packages/score
//
// WHY THIS EXISTS AT ALL. Every failure it catches is SILENT: an event type nobody handles, or
// one that is handled but missing the key the renderer needs, reaches playback and evaporates.
// Neither program is in an error state. That is the same class as scsynth ignoring an unknown
// control name in /n_set, which cost this project a real bug before `param-surface.mjs` existed.
//
// The assertion that matters most is the one about `unhandled` NOT being an error -- getting
// that wrong makes the check cry wolf, and a check people ignore is worse than no check.

import { makeEvent, defineRenderer, checkScore, describeCheck } from '../src/index.js';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const sc = defineRenderer({
  name: 'supercollider',
  handles: {
    note: { required: ['def'] },
    set: { required: ['target'] },
    release: { required: ['target'] },
  },
});

try {

// --- the happy path -------------------------------------------------------
{
  const score = [
    makeEvent(0, { type: 'note', def: 'substrate', freqA: 36 }),
    makeEvent(8, { type: 'set', target: '@prev', spread: 1 }),
    makeEvent(30, { type: 'release', target: '@all' }),
  ];
  const report = checkScore(score, [sc]);
  check('a score every renderer can act on is ok and complete',
    report.ok && report.complete && !report.rejected.length && !report.unhandled.length,
    describeCheck(report) || '(nothing to report)');
  check('describeCheck says nothing when there is nothing to say',
    describeCheck(report) === '', JSON.stringify(describeCheck(report)));
}

// --- rejected: claimed, but unusable --------------------------------------
{
  // The real bug. The editor accepts it, the lane draws it, and it does nothing forever.
  const score = [
    makeEvent(0, { type: 'note', def: 'substrate' }, { id: 'good' }),
    makeEvent(8, { type: 'set', spread: 1 }, { id: 'no-target' }),
  ];
  const report = checkScore(score, [sc]);
  check('an event whose renderer claims the type but cannot act on it is REJECTED',
    !report.ok && eq(report.rejected.map((r) => r.id), ['no-target']),
    describeCheck(report));
  check('...and the report names the renderer and the key it needed',
    eq(report.rejected[0].misses, [{ renderer: 'supercollider', missing: ['target'] }]),
    JSON.stringify(report.rejected[0].misses));
}

// --- undefined is missing -------------------------------------------------
{
  // `'target' in event` would pass this and then fail after a save: JSON drops an undefined
  // value, so the score would be valid in memory and invalid on disk.
  const report = checkScore([makeEvent(0, { type: 'set', target: undefined })], [sc]);
  check('a required key set to undefined counts as missing, not present',
    !report.ok, describeCheck(report));
}

// --- unhandled is NOT an error --------------------------------------------
{
  // The single most important behaviour here. The renderer that handles this type may simply
  // not be loaded -- same reasoning as ugen-allowlist.json reporting absence as unverified
  // rather than broken. Calling it fatal teaches people to ignore the check.
  const score = [
    makeEvent(0, { type: 'note', def: 'substrate' }),
    makeEvent(5, { type: 'lissajous-automation', lane: 'x' }, { id: 'foreign' }),
  ];
  const report = checkScore(score, [sc]);
  check('an event no renderer claims is UNHANDLED, and ok stays true',
    report.ok === true && report.complete === false
    && eq(report.unhandled.map((u) => u.id), ['foreign']),
    describeCheck(report));
  check('ok and complete are separate questions',
    report.ok && !report.complete);
}

// --- renderers compose ----------------------------------------------------
{
  const lissajous = defineRenderer({
    name: 'lissajous',
    handles: { 'lissajous-automation': { required: ['lane'] } },
  });
  const score = [
    makeEvent(0, { type: 'note', def: 'substrate' }),
    makeEvent(5, { type: 'lissajous-automation', lane: 'x' }),
  ];
  check('adding the renderer that handles it makes the score complete',
    checkScore(score, [sc, lissajous]).complete, describeCheck(checkScore(score, [sc, lissajous])));

  // One renderer accepting is enough. A second that claims the same type but wants more must
  // not veto the one that can already act on it.
  const strict = defineRenderer({ name: 'strict', handles: { note: { required: ['def', 'bus'] } } });
  const one = [makeEvent(0, { type: 'note', def: 'substrate' })];
  check('an event is fine if ANY claiming renderer can act on it',
    checkScore(one, [sc, strict]).ok, describeCheck(checkScore(one, [sc, strict])));
  check('...and rejected only when none of them can',
    !checkScore(one, [strict]).ok, describeCheck(checkScore(one, [strict])));
}

// --- degenerate input -----------------------------------------------------
{
  check('no renderers at all: everything is unhandled, nothing is rejected',
    (() => {
      const r = checkScore([makeEvent(0, { type: 'note', def: 'x' })], []);
      return r.ok && !r.complete && r.unhandled.length === 1;
    })());
  check('an event with no type is unhandled rather than a crash',
    (() => {
      const r = checkScore([makeEvent(0, {})], [sc]);
      return r.ok && r.unhandled.length === 1 && r.unhandled[0].type === undefined;
    })());
  check('an empty score is ok and complete',
    checkScore([], [sc]).complete);
}

// --- defineRenderer refuses nonsense --------------------------------------
{
  let threwNoName = null;
  try { defineRenderer({ handles: {} }); } catch (e) { threwNoName = e.message; }
  check('defineRenderer requires a name', threwNoName !== null, threwNoName ?? 'no throw');

  let threwBadRequired = null;
  try {
    defineRenderer({ name: 'x', handles: { note: { required: 'def' } } });
  } catch (e) { threwBadRequired = e.message; }
  check('defineRenderer rejects a `required` that is not an array',
    threwBadRequired !== null, threwBadRequired ?? 'no throw');
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
