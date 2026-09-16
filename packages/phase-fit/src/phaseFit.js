// Recovering the phase of known components from the engine's own output.
//
// WHY THIS IS POSSIBLE AT ALL, having said it wasn't. Phase cannot be got out of scsynth over OSC:
// replies are plain messages with no timetag, /status.reply has no clock, phase is not a control so
// no query returns it, and /n_go arrives ~330ms late with ~100ms of jitter (measured). But the
// audio path has no OSC in it. useSuperCollider taps the engine's stereo output directly, and that
// tap is the actual waveform at a fixed 48kHz with sample-accurate buffer boundaries. It is the
// same evidence sc-smoke.mjs uses to prove a def is audible, and this project already trusts it
// over anything the server or the UI SAYS.
//
// WHAT IS BEING FITTED. The shader's convention is `pL = w - k*d` with the contribution taken as
// cos(pL), so at the speaker itself (d -> 0) a channel contributes cos(uPh). The model is therefore
//
//     y(n) = SUM_k A_k * cos(2*pi*f_k*n/SR + phi_k)
//
// and phi_k IS uPh for that channel. Expanded onto a linear basis, cos(x+phi) = cos(phi)cos(x) -
// sin(phi)sin(x), so each component contributes two columns and the whole thing is one linear
// least-squares solve. Not a per-frequency DFT bin: the components are NOT orthogonal over a short
// window, and demodulating each one separately would silently report a neighbour's energy as its
// own. Solving them together is what makes close frequencies either right or refused.
//
// STEREO IS PART OF THE FIT, NOT A SECOND FIT. The two speakers carry the SAME phases with
// different gains, so L and R are stacked into one system whose columns are scaled by that
// channel's gl and gr. This is not tidiness: it is what makes \substrate work at all. Its carrier
// and beat sit 0.1 Hz apart, which frequency alone cannot separate in under 15 seconds - but they
// are hard-panned to opposite speakers, so their columns are ORTHOGONAL BY PANNING and a
// half-second window resolves them exactly. Fitting each speaker separately would throw that away,
// and fitting a mono sum would throw it away twice.
//
// WHAT IT REFUSES TO DO. Two components are confounded when their columns are nearly collinear -
// close in frequency AND similarly panned. That is measured on the actual design matrix rather than
// assumed from the frequencies, because panning is what rescues the substrate case and a
// frequency-only rule would reject it. Anything confounded is marked unresolved and left on the
// free-running accumulator. A wrong lock is worse than no lock: it would put a stable, precise,
// incorrect interference pattern on screen, and that is indistinguishable from a correct one.

const TWO_PI = 6.283185307179586;

// How many beat cycles two components must complete within the window before they can be
// separated. 1 is the Rayleigh criterion; 1.5 buys margin against noise and the envelope.
export const RESOLUTION_CYCLES = 1.5;

// Advice only, for callers deciding how much audio to ASK for. It is NOT the criterion for whether
// a window is usable: that is measured on the design matrix (see MAX_COLUMN_CORRELATION), because a
// cycle count is a guess at conditioning and conditioning can be computed. Two cycles at 36 Hz is
// 56 ms, and the true floor measured against the correlation test is roughly a third of that - a
// difference that matters a great deal when you are hunting for an unbroken stretch between the
// engine's glitches.
export const MIN_CYCLES = 2;

// The window this set of frequencies needs before their phases can be told apart, in seconds.
// Driven by the CLOSEST pair, which is usually the beat and can be very close indeed - 36 vs
// 36.1 Hz needs 15 s. Callers use this to decide what to ask for, and to explain a refusal.
export function windowSecondsFor(freqs) {
  const live = freqs.filter((f) => f > 0);
  if (live.length === 0) return 0;
  let need = MIN_CYCLES / Math.min(...live);
  for (let a = 0; a < live.length; a++) {
    for (let b = a + 1; b < live.length; b++) {
      const df = Math.abs(live[a] - live[b]);
      if (df > 1e-9) need = Math.max(need, RESOLUTION_CYCLES / df);
    }
  }
  return need;
}

// Solve (G w = r) by Gauss-Jordan with partial pivoting. Returns null if the matrix is singular to
// working precision, which is the backstop behind the resolvability test above: the two are
// measuring the same thing from different directions, and either one saying no means no.
function solve(G, r, n) {
  const a = G.map((row, i) => [...row, r[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[piv][col])) piv = row;
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= d;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = a[row][col];
      if (f === 0) continue;
      for (let j = col; j <= n; j++) a[row][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

// How alike two columns may be before the pair is called confounded. |corr| for two sinusoids over
// a window goes as sinc(df*T): at df*T = 1.5 (the Rayleigh criterion) it is about 0.21, and at
// df*T = 0.05 - a 0.1 Hz beat in half a second - it is 0.996. 0.9 sits well clear of both.
const MAX_COLUMN_CORRELATION = 0.9;

// How well-conditioned a single component's own 2x2 block must be: the ratio of its smaller
// eigenvalue to its larger, which is what sets how much the phase estimate amplifies noise.
//
// Correlation is the WRONG statistic here and quietly never fires. As the window shrinks, cos
// tends to a constant and sin to a ramp, whose correlation is sqrt(3)/2 = 0.866 - forever just
// under any sensible threshold - while the sine column's norm collapses to nothing. So a
// noiseless one-millisecond window recovers phase perfectly and a real one recovers noise. The
// eigenvalue ratio sees exactly that: 1.0 at a whole cycle, 0.22 at a quarter, 0.03 at a tenth.
const MIN_BLOCK_CONDITION = 0.2;

// Is this window of audio fit to be measured at all?
//
// The tap is a ScriptProcessorNode, which runs on the MAIN THREAD and drops buffers under load -
// it is deprecated for exactly that reason. Measured here, with the field shader running: 14
// discontinuities in one second, steps up to 0.11 on a signal whose peak is 0.0707 and whose
// largest physically possible sample-to-sample step is 0.00037. Three hundred times too big, and
// landing on 2048-sample boundaries. A spliced stream smears the spectrum across several Hz and
// every phase taken from it is noise.
//
// This does NOT invalidate amplitude measurements - a splice cannot fake a peak, which is why
// sc-smoke.mjs is unaffected - but it invalidates anything spectral. So a window is checked before
// it is trusted, and a bad one is refused rather than fitted. The real fix is an AudioWorklet ring
// buffer (cross-origin isolation is already in place, so SharedArrayBuffer is available); that is a
// change to a file byte-shared with ~/lissajous-viz and wants doing deliberately, with both.
//
// `maxFreq` bounds the legitimate slope: a sinusoid of amplitude A at f cannot move faster than
// 2*pi*f*A per sample. Anything past a generous multiple of that did not come from the model.
export function windowQuality(signals, sampleRate, maxFreq, { slopeTolerance = 8 } = {}) {
  let peak = 0;
  let energy = 0;
  let count = 0;
  for (const sig of signals) {
    if (!sig) continue;
    for (let n = 0; n < sig.length; n++) {
      const v = sig[n];
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      energy += v * v;
      count++;
    }
  }
  const rms = count ? Math.sqrt(energy / count) : 0;
  const allowed = TWO_PI * Math.max(maxFreq, 1) * peak / sampleRate * slopeTolerance;
  let splices = 0;
  if (peak > 0) {
    for (const sig of signals) {
      if (!sig) continue;
      for (let n = 1; n < sig.length; n++) {
        const d = sig[n] - sig[n - 1];
        if ((d < 0 ? -d : d) > allowed) splices++;
      }
    }
  }
  return { peak, rms, splices, allowedStep: allowed };
}

// The longest stretch of the window with no discontinuity in it, as [start, end).
//
// Refusing a whole window for one splice throws away good audio: measured on real hardware (a
// headed browser with an actual output device) the engine still produces 1-8 discontinuities per
// half second, so whole-window purity is rare while a clean THIRD of a second is common - and a
// third of a second is four times what 36 Hz needs. Splices from every channel are pooled, because
// a break in either speaker breaks the joint fit.
export function longestCleanRun(signals, sampleRate, maxFreq, { slopeTolerance = 8, peak: knownPeak } = {}) {
  const N = signals[0]?.length ?? 0;
  if (N === 0) return { start: 0, end: 0 };
  // The caller has usually just measured the peak in windowQuality; taking it saves a whole extra
  // pass over the buffer, which at these window lengths is the same order of cost as the fit.
  const peak = knownPeak ?? windowQuality(signals, sampleRate, maxFreq, { slopeTolerance }).peak;
  if (peak <= 0) return { start: 0, end: N };
  const allowed = TWO_PI * Math.max(maxFreq, 1) * peak / sampleRate * slopeTolerance;

  const breaks = [];
  for (let n = 1; n < N; n++) {
    for (const sig of signals) {
      if (!sig) continue;
      const d = sig[n] - sig[n - 1];
      if ((d < 0 ? -d : d) > allowed) { breaks.push(n); break; }
    }
  }
  let best = { start: 0, end: 0 };
  let from = 0;
  for (const b of [...breaks, N]) {
    if (b - from > best.end - best.start) best = { start: from, end: b };
    from = b;
  }
  return best;
}

// Fit `components` to the engine's output, returning amplitude and phase for each.
//
// `signals` is one Float32Array per speaker, all the same length; `components` is
// [{ freq, gains: [gL, gR] }] - the same freq/gl/gr the shader is given, so the model being fitted
// is literally the one being drawn. Phase is referenced to sample 0 of the buffer.
//
// `residual` is the RMS of what the model could not explain, as a fraction of the signal's own RMS.
// Energy from something not in `components` - a temp__0 from the console, say - lands there, and a
// large residual means every phase here is contaminated. That is the difference between reporting
// "this lock is unreliable" and quietly lying.
export function fitSignals(signals, sampleRate, components) {
  const K = components.length;
  const N = signals[0]?.length ?? 0;
  const T = N / sampleRate;
  const out = components.map((c) => ({ freq: c.freq, amp: 0, phase: 0, phaseAtEnd: 0, resolved: false }));
  const empty = { components: out, residual: 0, windowSeconds: T, ok: false };
  if (N === 0 || K === 0) return empty;

  // Two cycles of the component's own frequency, or there is no shape in the window to fit.
  // No cycle-count gate here. Whether this window determines this component's phase is decided
  // below, from the actual columns: cos and sin of one frequency become collinear as the window
  // shrinks, and that is the real "too short", measured rather than guessed at.
  const usable = components.map((c) => c.freq > 0
    && c.gains.some((g, i) => Math.abs(g) > 1e-9 && signals[i]));
  const idx = [];
  for (let k = 0; k < K; k++) if (usable[k]) idx.push(k);
  if (idx.length === 0) return empty;

  // Columns are stacked across speakers: one long vector per basis function, gain-weighted per
  // speaker, so a component's phase is constrained by everywhere it is audible at once.
  const S = signals.length;
  const rows = N * S;
  const M = idx.length;
  const D = 2 * M;
  const cols = new Array(D);
  for (let m = 0; m < M; m++) {
    const c = components[idx[m]];
    const w = TWO_PI * c.freq / sampleRate;
    const cc = new Float64Array(rows);
    const ss = new Float64Array(rows);
    for (let sp = 0; sp < S; sp++) {
      const g = c.gains[sp] ?? 0;
      const base = sp * N;
      for (let n = 0; n < N; n++) { cc[base + n] = g * Math.cos(w * n); ss[base + n] = g * Math.sin(w * n); }
    }
    cols[2 * m] = cc;
    cols[2 * m + 1] = ss;
  }

  const y = new Float64Array(rows);
  for (let sp = 0; sp < S; sp++) {
    const src = signals[sp];
    for (let n = 0; n < N; n++) y[sp * N + n] = src ? src[n] : 0;
  }

  const dot = (a, b) => { let acc = 0; for (let n = 0; n < rows; n++) acc += a[n] * b[n]; return acc; };
  const G = Array.from({ length: D }, () => new Float64Array(D));
  const r = new Float64Array(D);
  for (let i = 0; i < D; i++) {
    for (let j = i; j < D; j++) { const v = dot(cols[i], cols[j]); G[i][j] = v; G[j][i] = v; }
    r[i] = dot(cols[i], y);
  }

  // Confounding, measured on the design matrix rather than guessed from the frequencies - which is
  // the whole point, because panning is what separates the substrate pair and a frequency rule
  // would reject it.
  const norm = new Float64Array(D);
  for (let i = 0; i < D; i++) norm[i] = Math.sqrt(G[i][i]);
  const confounded = new Array(M).fill(false);
  // WITHIN a component first: how well does this window determine ITS phase, as opposed to telling
  // it apart from the others? That is the eigenvalue ratio of its own 2x2 block, and it is what the
  // old fixed two-cycle floor was standing in for - except measured, so it adapts to the frequency
  // instead of guessing at it.
  for (let m = 0; m < M; m++) {
    const i = 2 * m, j = 2 * m + 1;
    const a = G[i][i], c = G[j][j], b = G[i][j];
    if (a < 1e-12 && c < 1e-12) { confounded[m] = true; continue; }
    const mean = (a + c) / 2;
    const spread = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    const hi = mean + spread;
    const lo = mean - spread;
    if (hi <= 0 || lo / hi < MIN_BLOCK_CONDITION) confounded[m] = true;
  }
  for (let a = 0; a < M; a++) {
    for (let b = a + 1; b < M; b++) {
      let worst = 0;
      for (const i of [2 * a, 2 * a + 1]) {
        for (const j of [2 * b, 2 * b + 1]) {
          if (norm[i] < 1e-12 || norm[j] < 1e-12) continue;
          worst = Math.max(worst, Math.abs(G[i][j]) / (norm[i] * norm[j]));
        }
      }
      if (worst > MAX_COLUMN_CORRELATION) { confounded[a] = true; confounded[b] = true; }
    }
  }
  const keep = [];
  for (let m = 0; m < M; m++) if (!confounded[m]) keep.push(m);
  if (keep.length === 0) return empty;

  // Re-solve on the kept columns only, so a rejected pair does not distort what survives.
  const P = keep.length * 2;
  const pick = keep.flatMap((m) => [2 * m, 2 * m + 1]);
  const Gk = pick.map((i) => Float64Array.from(pick.map((j) => G[i][j])));
  const rk = Float64Array.from(pick.map((i) => r[i]));
  const w = solve(Gk, rk, P);
  if (!w) return empty;

  for (let q = 0; q < keep.length; q++) {
    const alpha = w[2 * q];
    const beta = w[2 * q + 1];
    let phase = Math.atan2(-beta, alpha);
    if (phase < 0) phase += TWO_PI;
    const target = out[idx[keep[q]]];
    target.amp = Math.hypot(alpha, beta);
    target.phase = phase;
    // ...and the same phase referenced to the LAST sample instead of the first. `phase` is the
    // honest parameter of the fitted model and is what the offline harness checks, but it describes
    // the window's beginning - which is up to a second in the past, and a second is many cycles.
    // Any consumer asking "what is the phase NOW" wants this one, and the difference between them
    // is per-frequency, so it does not cancel between channels: using the wrong one puts a fixed,
    // stable, wrong offset between every pair of channels at different frequencies.
    target.phaseAtEnd = (phase + TWO_PI * target.freq * (N - 1) / sampleRate) % TWO_PI;
    target.resolved = true;
  }

  let sse = 0, sy = 0;
  for (let n = 0; n < rows; n++) {
    let model = 0;
    for (let q = 0; q < P; q++) model += w[q] * cols[pick[q]][n];
    const e = y[n] - model;
    sse += e * e;
    sy += y[n] * y[n];
  }

  // A SILENT window divides by nothing and would report a residual of 0 - a perfect fit to
  // nothing at all. That is not a hypothetical: the lock originally fired 400ms after boot, in the
  // middle of a 12-second attack, read residual 0.000 off near-silence and locked to noise. Report
  // the signal level and let the caller refuse; a fit is only as good as the sound it saw.
  const rms = Math.sqrt(sy / rows);
  return {
    components: out,
    residual: sy > 0 ? Math.sqrt(sse / sy) : 1,
    rms,
    windowSeconds: T,
    ok: out.some((c) => c.resolved) && sy > 0,
  };
}

// The single-signal case: one speaker, unit gain. Kept because most of the reasoning is easier to
// check in this form, and it is what the offline harness exercises first.
export function fitComponents(samples, sampleRate, freqs) {
  return fitSignals([samples], sampleRate, freqs.map((f) => ({ freq: f, gains: [1] })));
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

// Exact finite sum for n=0..N-1. The near-zero branch avoids catastrophic cancellation for equal
// frequencies, which is also where the diagonal energy of the design matrix lives.
function trigSum(angle, count, sine = false) {
  const half = angle / 2;
  if (Math.abs(Math.sin(half)) < 1e-12) return sine ? 0 : count;
  const scale = Math.sin(count * half) / Math.sin(half);
  return scale * (sine ? Math.sin((count - 1) * half) : Math.cos((count - 1) * half));
}

function statisticsGram(components, sampleRate, frameCount) {
  const D = components.length * 2;
  const G = Array.from({ length: D }, () => new Float64Array(D));
  for (let a = 0; a < components.length; a++) {
    const ca = components[a]; const wa = TWO_PI * ca.freq / sampleRate;
    for (let b = a; b < components.length; b++) {
      const cb = components[b]; const wb = TWO_PI * cb.freq / sampleRate;
      const gain = (ca.gains[0] ?? 0) * (cb.gains[0] ?? 0) + (ca.gains[1] ?? 0) * (cb.gains[1] ?? 0);
      const cc = gain * 0.5 * (trigSum(wa - wb, frameCount) + trigSum(wa + wb, frameCount));
      const ss = gain * 0.5 * (trigSum(wa - wb, frameCount) - trigSum(wa + wb, frameCount));
      const cs = gain * 0.5 * (trigSum(wb + wa, frameCount, true) + trigSum(wb - wa, frameCount, true));
      const sc = gain * 0.5 * (trigSum(wa + wb, frameCount, true) + trigSum(wa - wb, frameCount, true));
      const ai = 2 * a; const bi = 2 * b;
      G[ai][bi] = cc; G[bi][ai] = cc;
      G[ai + 1][bi + 1] = ss; G[bi + 1][ai + 1] = ss;
      G[ai][bi + 1] = cs; G[bi + 1][ai] = cs;
      G[ai + 1][bi] = sc; G[bi][ai + 1] = sc;
    }
  }
  return G;
}

/**
 * Solve the same joint-stereo model as fitSignals from compact X'y and y'y statistics emitted by
 * a sample-synchronous desktop listener. This deliberately keeps raw fitting available as the
 * parity oracle; callers must not enable statistics mode until the listener basis fixture agrees.
 */
export function fitSignalStatistics(statistics, requestedComponents = null) {
  const sampleRate = finiteNumber(statistics?.sampleRate, 'statistics.sampleRate');
  const frameCount = statistics?.frameCount;
  if (!Number.isInteger(frameCount) || frameCount <= 0) throw new TypeError('statistics.frameCount must be a positive integer');
  if (!Array.isArray(statistics.components) || statistics.components.length === 0 || statistics.components.length > 16) {
    throw new TypeError('statistics.components must contain 1 to 16 components');
  }
  const components = statistics.components.map((item, index) => {
    const component = { freq: finiteNumber(item.frequency, `components[${index}].frequency`),
      gains: [finiteNumber(item.gainL, `components[${index}].gainL`), finiteNumber(item.gainR, `components[${index}].gainR`)] };
    finiteNumber(item.correlationCos, `components[${index}].correlationCos`);
    finiteNumber(item.correlationSin, `components[${index}].correlationSin`);
    if (requestedComponents) {
      const requested = requestedComponents[index];
      if (!requested || requested.freq !== component.freq || requested.gains?.[0] !== component.gains[0]
        || requested.gains?.[1] !== component.gains[1]) throw new Error('Statistics do not match requested components');
    }
    return component;
  });
  if (requestedComponents && requestedComponents.length !== components.length) throw new Error('Statistics component count mismatch');
  const energy = finiteNumber(statistics.energy?.combined, 'statistics.energy.combined');
  if (energy < 0) throw new RangeError('statistics.energy.combined must be non-negative');
  const K = components.length; const D = K * 2;
  const out = components.map((component) => ({ freq: component.freq, amp: 0, phase: 0, phaseAtEnd: 0, resolved: false }));
  const empty = { components: out, residual: energy > 0 ? 1 : 1, rms: 0,
    windowSeconds: frameCount / sampleRate, ok: false };
  const G = statisticsGram(components, sampleRate, frameCount);
  const r = Float64Array.from(statistics.components.flatMap((item) => [item.correlationCos, item.correlationSin]));
  const norm = new Float64Array(D);
  for (let i = 0; i < D; i++) norm[i] = Math.sqrt(Math.max(0, G[i][i]));
  const confounded = new Array(K).fill(false);
  for (let m = 0; m < K; m++) {
    const i = 2 * m; const j = i + 1; const a = G[i][i]; const c = G[j][j]; const b = G[i][j];
    if (a < 1e-12 && c < 1e-12) { confounded[m] = true; continue; }
    const mean = (a + c) / 2; const spread = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    const hi = mean + spread; const lo = mean - spread;
    if (hi <= 0 || lo / hi < MIN_BLOCK_CONDITION) confounded[m] = true;
  }
  for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) {
    let worst = 0;
    for (const i of [2 * a, 2 * a + 1]) for (const j of [2 * b, 2 * b + 1]) {
      if (norm[i] < 1e-12 || norm[j] < 1e-12) continue;
      worst = Math.max(worst, Math.abs(G[i][j]) / (norm[i] * norm[j]));
    }
    if (worst > MAX_COLUMN_CORRELATION) { confounded[a] = true; confounded[b] = true; }
  }
  const keep = []; for (let m = 0; m < K; m++) if (!confounded[m]) keep.push(m);
  if (!keep.length || energy === 0) return empty;
  const pick = keep.flatMap((m) => [2 * m, 2 * m + 1]);
  const solved = solve(pick.map((i) => Float64Array.from(pick.map((j) => G[i][j]))),
    Float64Array.from(pick.map((i) => r[i])), pick.length);
  if (!solved) return empty;
  for (let q = 0; q < keep.length; q++) {
    const alpha = solved[2 * q]; const beta = solved[2 * q + 1];
    let phase = Math.atan2(-beta, alpha); if (phase < 0) phase += TWO_PI;
    const target = out[keep[q]]; target.amp = Math.hypot(alpha, beta); target.phase = phase;
    target.phaseAtEnd = (phase + TWO_PI * target.freq * (frameCount - 1) / sampleRate) % TWO_PI;
    target.resolved = true;
  }
  let qDotR = 0; let qGq = 0;
  for (let i = 0; i < pick.length; i++) {
    qDotR += solved[i] * r[pick[i]];
    for (let j = 0; j < pick.length; j++) qGq += solved[i] * G[pick[i]][pick[j]] * solved[j];
  }
  const sse = Math.max(0, energy - 2 * qDotR + qGq);
  return { components: out, residual: Math.sqrt(sse / energy),
    rms: Math.sqrt(energy / (frameCount * 2)), windowSeconds: frameCount / sampleRate,
    ok: out.some((component) => component.resolved) };
}
