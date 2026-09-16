#!/usr/bin/env node
//
// Recovering phase from the engine's output. Synthesised signals, no browser, no server.
//
//   node tools/verify/phase-fit.mjs
//
// This is where all the risk in phase-locking lives, and it is all arithmetic - so it is checked
// against signals whose phases are known by construction, before any of it is pointed at a real
// tap. The failure that matters is not "inaccurate": it is CONFIDENT AND WRONG. A bad lock puts a
// stable, precise, incorrect interference pattern on screen, which looks exactly like a correct
// one. So the refusals are asserted as hard as the recoveries.

import assert from 'node:assert/strict';
import { fitComponents, fitSignals, windowSecondsFor, windowQuality, RESOLUTION_CYCLES } from '../src/phaseFit.js';
import { longestCleanRun } from '../src/phaseFit.js';
import { createPhaseLock } from '../src/phaseLock.js';

const SR = 48000;
const TWO_PI = Math.PI * 2;

// The shader's convention: a channel contributes cos(uPh) at the speaker, so that is what is built
// here. Getting this backwards is a silent 90-degree error in every locked phase.
function synth(seconds, parts, noise = 0) {
  const N = Math.round(seconds * SR);
  const y = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let v = 0;
    for (const { freq, amp, phase } of parts) v += amp * Math.cos(TWO_PI * freq * n / SR + phase);
    y[n] = v + (noise ? (Math.random() * 2 - 1) * noise : 0);
  }
  return y;
}

const angleErr = (a, b) => {
  let d = Math.abs(a - b) % TWO_PI;
  return d > Math.PI ? TWO_PI - d : d;
};
const deg = (r) => (r * 180 / Math.PI).toFixed(2);

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

// 1. One component, exactly recovered. If this is wrong nothing else means anything.
{
  let worst = 0;
  for (const phase of [0, 0.7, Math.PI, 4.9, 6.1]) {
    const y = synth(0.5, [{ freq: 36, amp: 0.3, phase }]);
    const { components } = fitComponents(y, SR, [36]);
    worst = Math.max(worst, angleErr(components[0].phase, phase));
    assert.ok(Math.abs(components[0].amp - 0.3) < 1e-6, 'amplitude');
  }
  check('a single component recovers its phase', worst < 1e-6, `worst error ${deg(worst)} deg`);
}

// 2. Well-separated components in one buffer, fitted jointly.
{
  const parts = [
    { freq: 36, amp: 0.3, phase: 1.1 },
    { freq: 90, amp: 0.15, phase: 4.4 },
    { freq: 211, amp: 0.05, phase: 2.0 },
  ];
  const y = synth(0.5, parts);
  const { components, residual } = fitComponents(y, SR, parts.map((p) => p.freq));
  const worst = Math.max(...components.map((c, i) => angleErr(c.phase, parts[i].phase)));
  const ampErr = Math.max(...components.map((c, i) => Math.abs(c.amp - parts[i].amp)));
  check('separated components are recovered together',
    worst < 1e-5 && ampErr < 1e-6 && residual < 1e-9,
    `worst phase ${deg(worst)} deg, worst amp ${ampErr.toExponential(1)}, residual ${residual.toExponential(1)}`);
}

// 3. THE REFUSAL. 36 and 36.1 Hz in a half-second window cannot be told apart - the two columns are
// nearly collinear and the solve would return confident noise. It must decline instead.
{
  const parts = [{ freq: 36, amp: 0.3, phase: 1.0 }, { freq: 36.1, amp: 0.3, phase: 5.0 }];
  const y = synth(0.5, parts);
  const { components, ok } = fitComponents(y, SR, parts.map((p) => p.freq));
  check('components too close for the window are REFUSED, not guessed',
    !ok && components.every((c) => !c.resolved),
    `0.1 Hz apart in 0.5 s -> resolved: [${components.map((c) => c.resolved).join(', ')}]`);
}

// 4. ...and accepted once the window is long enough. windowSecondsFor says how long that is, and
// the fit must agree with it rather than being separately tuned.
{
  const parts = [{ freq: 36, amp: 0.3, phase: 1.0 }, { freq: 36.1, amp: 0.2, phase: 5.0 }];
  const need = windowSecondsFor(parts.map((p) => p.freq));
  const y = synth(need * 1.05, parts);
  const { components, ok } = fitComponents(y, SR, parts.map((p) => p.freq));
  const worst = Math.max(...components.map((c, i) => angleErr(c.phase, parts[i].phase)));
  check('the same pair resolves once the window is long enough',
    ok && worst < 0.02,
    `needs ${need.toFixed(1)} s (${RESOLUTION_CYCLES} beat cycles), worst phase ${deg(worst)} deg`);
}

// 5. A component nobody told us about. The console can play anything, so the tap routinely carries
// energy the app has no model for. It must show up as residual rather than silently corrupt the
// phases we do care about - that is the difference between "this lock is unreliable" and a lie.
{
  const known = { freq: 60, amp: 0.3, phase: 2.2 };
  const clean = fitComponents(synth(0.5, [known]), SR, [60]);
  const dirty = fitComponents(synth(0.5, [known, { freq: 173, amp: 0.25, phase: 0.4 }]), SR, [60]);
  check('an unmodelled component raises the residual',
    clean.residual < 1e-9 && dirty.residual > 0.3,
    `residual ${clean.residual.toExponential(1)} alone -> ${dirty.residual.toFixed(3)} with an unknown 173 Hz`);
  check('and the known component survives it',
    angleErr(dirty.components[0].phase, known.phase) < 0.05,
    `phase error ${deg(angleErr(dirty.components[0].phase, known.phase))} deg`);
}

// 6. Noise. The tap is a real signal; the estimate should degrade gracefully, not fall over.
{
  const p = { freq: 40, amp: 0.2, phase: 3.3 };
  const y = synth(0.5, [p], 0.2);   // noise at the signal's own amplitude
  const { components } = fitComponents(y, SR, [40]);
  const err = angleErr(components[0].phase, p.phase);
  check('phase survives noise at the signal amplitude', err < 0.05, `error ${deg(err)} deg`);
}

// 7. HOW SHORT A WINDOW ACTUALLY WORKS - measured, not assumed. This used to be a fixed two-cycle
// floor, which is a guess at conditioning when conditioning can simply be computed: what the fit
// needs is that a component's cos and sin columns not be parallel, and that is a number you can
// read off the design matrix. The difference matters because the engine glitches, so the hunt is
// always for the shortest usable stretch between two discontinuities.
{
  let shortest = null;
  for (let ms = 1; ms <= 60; ms++) {
    const N = Math.round(ms / 1000 * SR);
    const y = synth(ms / 1000, [{ freq: 36, amp: 0.3, phase: 2.1 }]);
    const fit = fitComponents(y, SR, [36]);
    if (fit.ok && angleErr(fit.components[0].phase, 2.1) < 0.02) { shortest = { ms, N }; break; }
  }
  check('a usable window is far shorter than the old two-cycle rule allowed',
    shortest !== null && shortest.ms < 2000 / 36,
    shortest
      ? `${shortest.ms} ms = ${(shortest.ms * 36 / 1000).toFixed(2)} cycles at 36 Hz, against 56 ms for the old floor`
      : 'no window under 60 ms worked');
}

// ...and a window genuinely too short is still refused. cos and sin over a small fraction of a
// cycle are nearly the same vector, so amplitude and phase cannot be told apart and any answer
// would be arbitrary.
{
  const y = synth(0.002, [{ freq: 36, amp: 0.3, phase: 2.1 }]);
  const fit = fitComponents(y, SR, [36]);
  check('a window of a fourteenth of a cycle is refused',
    !fit.ok && !fit.components[0].resolved,
    `2 ms is ${(0.002 * 36).toFixed(3)} cycles; resolved ${fit.components[0].resolved}`);
}

// ...and the floor is where it is because of NOISE, which is the only reason a fraction of a cycle
// is not enough. On noiseless data a millisecond recovers phase exactly; the question the
// conditioning test is really answering is how much a short window amplifies whatever else is in
// the signal. So it is checked with noise present, which is the case that matters.
{
  const rows = [];
  for (const ms of [3, 6, 10, 20, 56]) {
    const p = { freq: 36, amp: 0.3, phase: 2.1 };
    let worst = 0, refused = 0;
    for (let trial = 0; trial < 12; trial++) {
      const fit = fitComponents(synth(ms / 1000, [p], 0.03), SR, [36]);
      if (!fit.ok) { refused++; continue; }
      worst = Math.max(worst, angleErr(fit.components[0].phase, p.phase));
    }
    rows.push({ ms, cycles: ms * 36 / 1000, refused, worst });
  }
  const accepted = rows.filter((r) => r.refused === 0);
  const ok = accepted.every((r) => r.worst < 0.25) && rows.some((r) => r.refused > 0);
  check('every window the fit ACCEPTS gives a usable phase under noise', ok,
    rows.map((r) => `${r.ms}ms(${r.cycles.toFixed(2)}cy)${r.refused ? ' refused' : ` ${deg(r.worst)}deg`}`).join('  '));
}

// 8. \substrate as it actually plays: carrier hard left, beat hard right. Each speaker carries ONE
// component, so the pair that would need a 15 s window never lands in the same buffer - which is
// why per-speaker fitting is the right shape for this, not a mono sum.
{
  const L = synth(0.5, [{ freq: 36, amp: 0.3, phase: 1.4 }]);
  const R = synth(0.5, [{ freq: 36.1, amp: 0.3, phase: 5.9 }]);
  const fl = fitComponents(L, SR, [36]);
  const fr = fitComponents(R, SR, [36.1]);
  check('hard-panned channels fit per speaker in a short window',
    fl.ok && fr.ok
    && angleErr(fl.components[0].phase, 1.4) < 1e-5
    && angleErr(fr.components[0].phase, 5.9) < 1e-5,
    `carrier ${deg(fl.components[0].phase)} deg (1.4 rad), beat ${deg(fr.components[0].phase)} deg (5.9 rad)`);
}

// 9. THE ONE THE STEREO FIT EXISTS FOR. \substrate's carrier and beat are 0.1 Hz apart, which
// frequency alone cannot separate in under 15 seconds - but they are hard-panned to opposite
// speakers, so their columns are orthogonal BY PANNING and half a second is plenty. Fitting each
// speaker on its own would work here too; fitting them jointly is what also handles substrate2,
// where the same components are blended across both.
{
  const parts = [
    { freq: 36, phase: 1.4, gl: 0.7, gr: 0 },
    { freq: 36.1, phase: 5.9, gl: 0, gr: 0.7 },
  ];
  const N = Math.round(0.5 * SR);
  const L = new Float64Array(N);
  const R = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    for (const p of parts) {
      const v = Math.cos(TWO_PI * p.freq * n / SR + p.phase);
      L[n] += p.gl * v; R[n] += p.gr * v;
    }
  }
  const fit = fitSignals([L, R], SR, parts.map((p) => ({ freq: p.freq, gains: [p.gl, p.gr] })));
  const worst = Math.max(...fit.components.map((c, i) => angleErr(c.phase, parts[i].phase)));
  check('a 0.1 Hz pair separated ONLY by panning resolves in 0.5 s',
    fit.ok && fit.components.every((c) => c.resolved) && worst < 1e-4,
    `needs ${windowSecondsFor([36, 36.1]).toFixed(1)} s on frequency alone; got it in 0.5 s, worst ${deg(worst)} deg`);
}

// 10. ...and the same pair is still refused when panning does NOT separate them. This is the
// control for 9: if it passed too, the correlation test would be rubber-stamping everything.
{
  const parts = [
    { freq: 36, phase: 1.4, gl: 0.7, gr: 0.7 },
    { freq: 36.1, phase: 5.9, gl: 0.7, gr: 0.7 },
  ];
  const N = Math.round(0.5 * SR);
  const L = new Float64Array(N);
  const R = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    for (const p of parts) {
      const v = Math.cos(TWO_PI * p.freq * n / SR + p.phase);
      L[n] += p.gl * v; R[n] += p.gr * v;
    }
  }
  const fit = fitSignals([L, R], SR, parts.map((p) => ({ freq: p.freq, gains: [p.gl, p.gr] })));
  check('the same pair centre-panned is still refused',
    !fit.ok && fit.components.every((c) => !c.resolved),
    `resolved: [${fit.components.map((c) => c.resolved).join(', ')}]`);
}

// 11. A silent channel must not be "resolved". Its columns are all zero, the phase is arbitrary,
// and locking to it would install a confident value derived from nothing.
{
  const N = Math.round(0.5 * SR);
  const L = new Float64Array(N);
  for (let n = 0; n < N; n++) L[n] = 0.3 * Math.cos(TWO_PI * 60 * n / SR + 2.0);
  const fit = fitSignals([L, new Float64Array(N)], SR, [
    { freq: 60, gains: [1, 0] },
    { freq: 200, gains: [0, 0] },
  ]);
  check('a channel with no gain anywhere is not resolved',
    fit.components[0].resolved && !fit.components[1].resolved,
    `60 Hz ${fit.components[0].resolved}, silent 200 Hz ${fit.components[1].resolved}`);
}

// 12. SILENCE MUST NOT READ AS A PERFECT FIT. residual is sse/sy, so an empty window divides by
// nothing. This is not hypothetical: the lock originally fired 400 ms after boot, in the middle of
// a 12-second attack, read residual 0.000 off near-silence, locked to noise, and never retried
// because nothing about the model had changed.
{
  const N = Math.round(0.5 * SR);
  const fit = fitSignals([new Float64Array(N), new Float64Array(N)], SR, [{ freq: 36, gains: [1, 0] }]);
  check('a silent window is not a perfect fit', !fit.ok && fit.residual === 1 && fit.rms === 0,
    `ok ${fit.ok}, residual ${fit.residual}, rms ${fit.rms}`);
}

// 13. SPLICE DETECTION. Measured against the real engine: ~12-21 discontinuities per half second,
// steps up to 0.11 on a signal peaking at 0.0707 whose largest physically possible step is 0.00037.
// They land on multiples of 64 samples - scsynth's control block - and some fall INSIDE a single
// 2048-sample tap buffer, which a dropped buffer cannot produce. So it is the engine under-running,
// not the tap dropping. Either way a spliced window smears a pure tone across several Hz and every
// phase taken from it is noise, so it has to be caught.
{
  const N = Math.round(0.5 * SR);
  const clean = new Float64Array(N);
  for (let n = 0; n < N; n++) clean[n] = 0.07 * Math.cos(TWO_PI * 36 * n / SR);
  const dirty = Float64Array.from(clean);
  for (let k = 1; k < 12; k++) dirty[2048 * k] += 0.05;
  const qc = windowQuality([clean], SR, 40);
  const qd = windowQuality([dirty], SR, 40);
  check('a clean window passes and a spliced one is caught',
    qc.splices === 0 && qd.splices > 0,
    `clean ${qc.splices}, spliced ${qd.splices} (largest legitimate step ${qc.allowedStep.toExponential(1)})`);
}

// 14. And the lock ACTS on all of that: it refuses rather than locking, and keeps the phase map
// untouched. A refused lock leaves the free-running accumulator alone, which is merely arbitrary;
// a bad lock would be arbitrary AND confident.
{
  const N = Math.round(0.5 * SR);
  const L = new Float64Array(N), R = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    L[n] = 0.7 * Math.cos(TWO_PI * 36 * n / SR + 1.4);
    R[n] = 0.7 * Math.cos(TWO_PI * 36.1 * n / SR + 5.9);
  }
  const chans = [
    { instId: 'a', slot: 'carrier', freq: 36, gl: 0.7, gr: 0 },
    { instId: 'a', slot: 'beat', freq: 36.1, gl: 0, gr: 0.7 },
  ];
  const run = (x, y) => {
    const lock = createPhaseLock();
    const map = new Map();
    const read = () => ({ x, y, sampleRate: SR, seconds: 0.5 });
    lock.tick(chans, 0, read, map);
    return { status: lock.tick(chans, 500, read, map), map };
  };

  const good = run(L, R);
  const zero = new Float64Array(N);
  const silent = run(zero, zero);
  // Splices every 256 samples leave nothing longer than 5.3 ms - a fifth of a cycle at 36 Hz - so
  // there is no fittable stretch anywhere in the window. (A splice every 2048 samples leaves 43 ms,
  // which IS usable now and gets fitted rather than refused. That is the point of hunting for the
  // clean stretch rather than judging the window as a whole.)
  const spliced = (() => { const d = Float64Array.from(L); for (let k = 1; k * 256 < N; k++) d[256 * k] += 0.5; return run(d, R); })();

  check('the lock applies on a clean window',
    good.status.applied.length === 2 && good.map.size === 2
    && Math.abs(good.map.get('a:carrier') - ((1.4 + TWO_PI * 36 * (N - 1) / SR) % TWO_PI)) < 1e-3,
    `applied ${good.status.applied.map((a) => a.key).join(', ')}`);
  check('and refuses silence without touching the phase map',
    silent.status.refused === 'silence' && silent.map.size === 0, `refused: ${silent.status.refused}`);
  // A spliced window is not thrown away - the longest unbroken stretch inside it is fitted. With
  // splices every 2048 samples that stretch is 43 ms, which is under two cycles at 36 Hz, so THIS
  // one is still refused. The distinction matters: it is refused for being too short, not for
  // containing a splice, and a real engine glitching less often clears the bar.
  check('a window with no fittable stretch anywhere is refused',
    spliced.status.applied.length === 0 && spliced.map.size === 0,
    `refused: ${spliced.status.refused}, longest clean run ${(spliced.status.runSeconds * 1000).toFixed(1)} ms`);
}

// 15. The clean stretch is found, and a phase fitted from it is still correct. This is what makes
// the lock work against a real engine at all: measured on real hardware, scsynth.wasm still puts
// 1-8 discontinuities into every half second, so whole-window purity is rare while a clean third of
// a second - four times what 36 Hz needs - is common.
{
  const N = Math.round(0.5 * SR);
  const phase = 2.4;
  const y = new Float64Array(N);
  for (let n = 0; n < N; n++) y[n] = 0.3 * Math.cos(TWO_PI * 36 * n / SR + phase);
  // One break early on, leaving a long clean tail. Everything after the break is shifted, so a
  // whole-window fit would be pulled between two incompatible phases.
  const broken = Float64Array.from(y);
  for (let n = 6000; n < N; n++) broken[n] = 0.3 * Math.cos(TWO_PI * 36 * n / SR + phase + 1.0);
  const run = longestCleanRun([broken], SR, 36);
  const slice = broken.subarray(run.start, run.end);
  const fit = fitSignals([slice], SR, [{ freq: 36, gains: [1] }]);
  // The tail carries the shifted phase, so that is what must come back - and referenced to the end
  // of the RUN, not of the window.
  const expected = (phase + 1.0 + TWO_PI * 36 * (run.start + slice.length - 1) / SR) % TWO_PI;
  check('the longest clean stretch is found and fitted correctly',
    run.start === 6000 && run.end === N && angleErr(fit.components[0].phaseAtEnd, expected) < 0.01,
    `run [${run.start}, ${run.end}) = ${((run.end - run.start) / SR * 1000).toFixed(0)} ms; `
    + `phase error ${deg(angleErr(fit.components[0].phaseAtEnd, expected))} deg`);
}

// 16. VISUAL SYNC MODE. A lock decays: every discontinuity in the engine's output that shifts the
// sample timeline shifts the true phase against the free-running model. So the lock can be told to
// re-measure on a timer as well as on a change. Checked here rather than in a browser because the
// alternative is a harness that sits still for thirty seconds to observe one event.
{
  const N = Math.round(0.5 * SR);
  const L = new Float64Array(N), R = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    L[n] = 0.7 * Math.cos(TWO_PI * 36 * n / SR + 1.4);
    R[n] = 0.7 * Math.cos(TWO_PI * 36.1 * n / SR + 5.9);
  }
  const chans = [
    { instId: 'a', slot: 'carrier', freq: 36, gl: 0.7, gr: 0 },
    { instId: 'a', slot: 'beat', freq: 36.1, gl: 0, gr: 0.7 },
  ];
  const read = () => ({ x: L, y: R, sampleRate: SR, seconds: 0.5 });
  const RESYNC = 30000;

  // With sync ON: one lock at the start, nothing for the next half minute, another after it.
  const on = createPhaseLock();
  const onMap = new Map();
  on.tick(chans, 0, read, onMap, { resyncMs: RESYNC });
  const first = on.tick(chans, 500, read, onMap, { resyncMs: RESYNC });
  const quiet = [5000, 15000, 29000].map((t) => on.tick(chans, t, read, onMap, { resyncMs: RESYNC }));
  const second = on.tick(chans, 31000, read, onMap, { resyncMs: RESYNC });
  check('visual sync re-measures on the timer and not before',
    first.applied.length === 2 && quiet.every((q) => q === null) && second?.applied.length === 2,
    `locked at 500 ms, ${quiet.filter(Boolean).length} fits during the next 28.5 s, re-locked at 31 s`);

  // With it OFF: the first lock stands, and the timer never fires. Nothing else changed.
  const off = createPhaseLock();
  const offMap = new Map();
  off.tick(chans, 0, read, offMap, { resyncMs: 0 });
  const only = off.tick(chans, 500, read, offMap, { resyncMs: 0 });
  const later = [31000, 61000, 121000].map((t) => off.tick(chans, t, read, offMap, { resyncMs: 0 }));
  check('with visual sync off, only a change triggers a lock',
    only.applied.length === 2 && later.every((l) => l === null),
    `one lock, then ${later.filter(Boolean).length} fits over the following two minutes`);

  // ...and a real change still locks with sync off, or the toggle would have disabled the feature
  // rather than its timer.
  const moved = chans.map((c, i) => (i ? c : { ...c, freq: 44 }));
  off.tick(moved, 130000, read, offMap, { resyncMs: 0 });
  const afterChange = off.tick(moved, 130500, read, offMap, { resyncMs: 0 });
  check('a frequency change still locks with visual sync off',
    afterChange?.applied.length > 0, `${afterChange?.applied.length ?? 0} channel(s) re-locked`);
}

// 17. SOUND THE FIELD DOES NOT MODEL still has to trigger a re-lock. A Resobass2 contributes no
// channels at all - its field projection returns [] - so starting one leaves the channel signature
// untouched while transforming what is coming out of the speakers. Measured against the real
// engine: 0% of the sound unexplained before, 58% after. Without the scene tag the lock never
// noticed, and with visual sync off it would have stood stale indefinitely.
{
  const N = Math.round(0.5 * SR);
  const L = new Float64Array(N), R = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    L[n] = 0.7 * Math.cos(TWO_PI * 36 * n / SR + 1.4);
    R[n] = 0.7 * Math.cos(TWO_PI * 40 * n / SR + 5.9);
  }
  const chans = [
    { instId: 'a', slot: 'carrier', freq: 36, gl: 0.7, gr: 0 },
    { instId: 'a', slot: 'beat', freq: 40, gl: 0, gr: 0.7 },
  ];
  const read = () => ({ x: L, y: R, sampleRate: SR, seconds: 0.5 });

  const lock = createPhaseLock();
  const map = new Map();
  lock.tick(chans, 0, read, map, { sceneTag: '2/0' });
  const first = lock.tick(chans, 500, read, map, { sceneTag: '2/0' });
  // Nothing about the modelled channels changes; only the number of synths on the server does.
  const quiet = lock.tick(chans, 1000, read, map, { sceneTag: '2/0' });
  lock.tick(chans, 1500, read, map, { sceneTag: '3/0' });
  const after = lock.tick(chans, 2000, read, map, { sceneTag: '3/0' });
  check('a synth the field does not model still triggers a re-lock',
    first.applied.length === 2 && quiet === null && after?.applied.length === 2,
    `locked, idle while unchanged, re-locked when a third synth appeared`);
}

console.log('');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n           ${r.detail}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed.\n`);
process.exit(failed ? 1 : 0);
