import { fitSignals, windowSecondsFor, windowQuality, longestCleanRun } from './phaseFit.js';

// WHEN to measure phase off the engine, as opposed to how.
//
// The app's phase accumulator free-runs: every channel starts at 0 the first frame its key appears
// and is advanced by 2*pi*f*dt thereafter. That keeps RELATIVE phase coherent, which is most of
// what the picture needs, but the absolute value is arbitrary - so two sources that are actually in
// antiphase can be drawn reinforcing. Measuring the real phase off the tap fixes that, and the
// defs here are simple enough (sinusoids, known frequencies) for the fit to be exact.
//
// It is not worth doing every frame: the fit is a least-squares solve over ~24000 samples, and
// nothing changes between frames anyway. It is worth doing exactly when the truth might have moved:
// a synth mounted, or a control touched that changes a frequency or a gain. Both arrive here as a
// change in the CHANNEL SIGNATURE, which is the only thing the fit actually depends on - so one
// test covers both, and a control that changes neither (a filter cutoff, say) correctly triggers
// nothing.
//
// The debounce is what makes that usable. Dragging a frequency slider changes the signature on
// every pointermove, and fitting each one would be dozens of solves against audio that is still
// sliding. So a change ARMS the lock and the timer restarts on every further change; the fit runs
// once the signature has held still - and only then does the window of audio actually correspond to
// the frequencies being fitted.
//
// ON THE TIME REFERENCE, which turns out to matter far less than it looks like it should. The fit
// gives phase as of the END of the captured buffer, and it is installed some milliseconds later; at
// 36 Hz even 16 ms of frame jitter is 207 degrees. But every locked channel is advanced by the SAME
// delay, and a common time offset applied to every source is exactly "the whole field viewed a few
// milliseconds earlier". It slides the picture in time, it does not distort it. So the requirement
// is consistency, not accuracy, and one fit installed on one frame gives that for free. This is
// also why the delay is not corrected for: correcting it would be arithmetic in aid of nothing.

const TWO_PI = 6.283185307179586;

const DEFAULT_DEBOUNCE_MS = 400;
const DEFAULT_WINDOW_S = 0.5;

// Above this, the model explains so little of what came out that its phases are not worth trusting
// - typically something is sounding that the app has no model for (a temp__0 from the console).
const MAX_RESIDUAL = 0.6;

// Below this the window is silence and there is nothing to measure. A 12-second attack means the
// first seconds of a note ARE effectively silence, which is exactly when a mount-triggered lock
// wants to fire - so this is the common case, not an edge one.
const MIN_RMS = 0.002;

// How much the level may change ACROSS the fitted stretch before the fit is not worth doing.
//
// The model is a sum of constant-amplitude sinusoids, and these defs have 12-to-30-second attacks -
// so a lock triggered by a synth mounting fires at the quietest, fastest-changing moment of the
// note, which is the worst possible time. Measured: the first lock landed at rms 0.0032 against a
// settled level of 0.050, six percent of the way up. Comparing the first half of the stretch with
// the second catches that directly, and the retry means the lock simply happens later, once the
// envelope has arrived.
const MAX_LEVEL_DRIFT = 0.15;

function halfLevels(signals, from, to) {
  const mid = (from + to) >> 1;
  const rms = (lo, hi) => {
    let acc = 0, n = 0;
    for (const sig of signals) {
      if (!sig) continue;
      for (let i = lo; i < hi; i++) { acc += sig[i] * sig[i]; n++; }
    }
    return n ? Math.sqrt(acc / n) : 0;
  };
  return [rms(from, mid), rms(mid, to)];
}

// A splice is not a reason to throw the whole window away - only the part of it spanning the break.
// See longestCleanRun: on real hardware the engine still produces a handful of discontinuities per
// half second, so whole-window purity is rare while a clean third of a second is common, and that
// is several times what these frequencies need.

// How often to re-attempt after a refusal. The reasons to refuse are all transient - the envelope
// is still climbing, or that particular window happened to catch a dropped buffer - so the lock
// keeps asking rather than giving up, which is what makes "lock on mount" work at all when the
// mount itself is the quietest moment of the note.
const RETRY_MS = 700;

// A cheap early-out before building a design matrix, not the real criterion - that is measured on
// the matrix itself inside fitSignals. Deliberately well below what the fit will actually accept,
// so this rejects only the obviously hopeless and never overrules a measurement with a guess.
const MIN_CYCLES_FLOOR = 0.4;

// Where the fit starts before it considers growing. Comfortably above the measured 0.25-cycle
// conditioning floor, so the first pass is usually also the last, and small enough that it is
// cheap: at 36 Hz this is 56 ms against the ~725 ms clean stretches the engine leaves.
const START_CYCLES = 2;

// The channel set the fit depends on. Frequency and the two gains, nothing else: those are the
// model, so anything that changes them invalidates the lock and anything that does not, doesn't.
export function channelSignature(channels, sceneTag = '') {
  let out = '';
  for (const ch of channels) {
    out += `${ch.instId}:${ch.slot}:${ch.freq.toFixed(4)}:${ch.gl.toFixed(3)}:${ch.gr.toFixed(3)}|`;
  }
  // `sceneTag` carries what is SOUNDING but not modelled. Without it the trigger was blind to
  // exactly the thing most likely to invalidate a lock: a Resobass2 contributes no channels at all
  // (its field projection returns []), so starting one changed the tap completely - measured, from 0% of the
  // sound unexplained to 58% - while the signature did not move and nothing re-measured. The lock
  // then stood, stale, until the resync timer, and with visual sync off it stood indefinitely.
  return sceneTag ? `${out}#${sceneTag}` : out;
}

export function createPhaseLock({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  windowSeconds = DEFAULT_WINDOW_S,
} = {}) {
  let signature = null;
  let armedAt = 0;
  let pending = false;
  let last = null;
  let lastAppliedAt = null;

  return {
    // The most recent fit, for readback and for the panel to explain a refusal.
    get status() { return last; },

    // Called every frame. Cheap unless a fit is actually due.
    // `resyncMs` is Visual sync mode: re-measure every so often even when nothing has changed.
    // Zero turns it off and the lock only fires on a mount or a control that moves a frequency or a
    // gain, which is the cheaper behaviour.
    //
    // It exists because a lock DECAYS. Every discontinuity in the engine's output that shifts the
    // sample timeline shifts the true phase against our free-running model, and this engine
    // produces them steadily - measured, the same code lands at ~2 degrees against a real audio
    // device and ~40 degrees headless, where the glitching is twice as frequent. Re-measuring is the
    // only thing that walks that back, and at ~8 ms a lock, once every 30 s is 0.03% of the frame
    // budget.
    //
    // No debounce on this path: a timer-driven resync is not waiting for anything to stop moving.
    tick(channels, nowMs, readRecentSamples, phaseMap, { resyncMs = 0, sceneTag = '' } = {}) {
      if (resyncMs > 0 && !pending && lastAppliedAt !== null && nowMs - lastAppliedAt >= resyncMs) {
        pending = true;
        armedAt = nowMs - debounceMs;
      }
      const sig = channelSignature(channels, sceneTag);
      if (sig !== signature) {
        signature = sig;
        armedAt = nowMs;
        pending = true;
        return null;
      }
      if (!pending || nowMs - armedAt < debounceMs) return null;

      const audible = channels.filter((ch) => ch.freq > 0 && (Math.abs(ch.gl) > 1e-6 || Math.abs(ch.gr) > 1e-6));
      if (audible.length === 0) { pending = false; return null; }

      // Ask for whatever the frequencies need, but never less than the default: a pair 0.1 Hz apart
      // wants 15 s, which the tap's bounded backlog cannot give - and if panning separates them the
      // fit will resolve them in half a second anyway. So this is an upper bound on ambition, not a
      // precondition, and the fit itself decides what it can actually tell apart.
      const want = Math.min(2, Math.max(windowSeconds, windowSecondsFor(audible.map((c) => c.freq))));
      const buf = readRecentSamples?.(want);
      if (!buf || buf.seconds < windowSeconds * 0.9) return null;   // not enough audio yet; try again next frame

      // Is this window worth fitting? Refusing costs one retry; fitting a bad one costs a stable,
      // precise, wrong interference pattern that looks exactly like a correct one.
      const maxFreq = Math.max(...audible.map((c) => c.freq));
      const quality = windowQuality([buf.x, buf.y], buf.sampleRate, maxFreq);
      if (quality.rms < MIN_RMS) {
        armedAt = nowMs - debounceMs + RETRY_MS;   // stay pending, ask again shortly
        last = { at: nowMs, refused: 'silence', rms: quality.rms, splices: quality.splices, applied: [] };
        return last;
      }

      // Fit the longest unbroken stretch rather than the whole window. How long it needs to be is
      // set by the frequencies themselves, so this refuses when the engine is glitching badly and
      // proceeds when it is merely glitching.
      const run = longestCleanRun([buf.x, buf.y], buf.sampleRate, maxFreq, { peak: quality.peak });
      const runSeconds = (run.end - run.start) / buf.sampleRate;
      if (runSeconds < MIN_CYCLES_FLOOR / Math.min(...audible.map((c) => c.freq))) {
        armedAt = nowMs - debounceMs + RETRY_MS;
        last = {
          at: nowMs, refused: 'no clean stretch long enough',
          rms: quality.rms, splices: quality.splices, runSeconds, applied: [],
        };
        return last;
      }

      // Is the envelope holding still across the stretch? If not, wait: the sound is on its way in
      // and will be steady shortly.
      const [firstHalf, secondHalf] = halfLevels([buf.x, buf.y], run.start, run.end);
      const drift = Math.max(firstHalf, secondHalf) > 0
        ? Math.abs(secondHalf - firstHalf) / Math.max(firstHalf, secondHalf)
        : 1;
      if (drift > MAX_LEVEL_DRIFT) {
        armedAt = nowMs - debounceMs + RETRY_MS;
        last = {
          at: nowMs, refused: 'envelope still moving',
          rms: quality.rms, splices: quality.splices, runSeconds, levelDrift: drift, applied: [],
        };
        return last;
      }

      // START SHORT, GROW ONLY IF THE MATRIX SAYS YOU MUST.
      //
      // The fit is the one expensive thing here - measured, 10 ms for two components over half a
      // second and 50 ms for eight, which is three dropped frames. Cost is roughly linear in
      // samples, and the clean stretch found above is usually far longer than the frequencies
      // require: \substrate's two components are 0.1 Hz apart, which frequency alone could not
      // separate in fifteen seconds, but they are hard-panned so the design matrix separates them
      // in two cycles. Fitting the whole 725 ms stretch to learn that is pure waste.
      //
      // So begin at what conditioning demands - a couple of cycles of the lowest frequency - and
      // double only while something is still unresolved. The common case ends on the first pass;
      // the case that genuinely needs a long window still gets one, and pays for it only then.
      //
      // Each span is trimmed to a whole number of cycles of the lowest frequency, where that
      // component's cos and sin columns are exactly orthogonal: free, and the best-conditioned this
      // fit can be.
      const lowest = Math.min(...audible.map((c) => c.freq));
      const period = buf.sampleRate / lowest;
      const runLength = run.end - run.start;
      const model = audible.map((ch) => ({ freq: ch.freq, gains: [ch.gl, ch.gr] }));

      pending = false;
      let span = Math.min(runLength, Math.round(period * START_CYCLES));
      let fit;
      let passes = 0;
      for (;;) {
        passes++;
        const whole = Math.floor(span / period) * period;
        const width = whole >= period ? Math.round(whole) : span;
        const from = run.end - width;
        fit = fitSignals(
          [buf.x.subarray(from, run.end), buf.y.subarray(from, run.end)],
          buf.sampleRate,
          model,
        );
        // Everything passed in has gain somewhere, so anything still unresolved is genuinely
        // confounded and a longer window is the only thing that could help.
        if (fit.components.every((c) => c.resolved) || span >= runLength) break;
        span = Math.min(runLength, span * 2);
      }
      const fittedSeconds = fit.windowSeconds;
      // phaseAtEnd refers to the end of that stretch, which may sit before the end of the window.
      // Carry it forward over the trailing gap, or every locked channel is stale by a DIFFERENT
      // amount - which is exactly the per-channel error a common time shift would not be.
      const trailing = (buf.x.length - run.end) / buf.sampleRate;

      const applied = [];
      if (fit.ok && fit.residual <= MAX_RESIDUAL) {
        for (let i = 0; i < audible.length; i++) {
          const c = fit.components[i];
          if (!c.resolved) continue;
          const at = (c.phaseAtEnd + TWO_PI * c.freq * trailing) % TWO_PI;
          phaseMap.set(`${audible[i].instId}:${audible[i].slot}`, at);
          applied.push({ key: `${audible[i].instId}:${audible[i].slot}`, freq: c.freq, phase: at });
        }
      }
      // A fit that resolved nothing, or explained too little, is also worth retrying: the
      // frequencies may be about to separate as an envelope settles.
      if (applied.length === 0) armedAt = nowMs - debounceMs + RETRY_MS;
      else { pending = false; lastAppliedAt = nowMs; }
      last = {
        at: nowMs,
        windowSeconds: fit.windowSeconds,
        residual: fit.residual,
        rms: quality.rms,
        splices: quality.splices,
        runSeconds,
        fittedSeconds,
        passes,
        levelDrift: drift,
        refused: applied.length === 0 ? (fit.residual > MAX_RESIDUAL ? 'residual too high' : 'nothing resolvable') : null,
        considered: audible.length,
        applied,
      };
      return last;
    },
  };
}
