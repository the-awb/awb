import { projectInstrumentToFieldComponents } from './instrumentProjection.js';

const TWO_PI = 6.283185307179586;

// Instrument-level mute/solo, global mixing-console style: soloing any
// instrument silences every other non-soloed one. Components within a surviving
// instrument are already filtered by their own on/off inside the field projection.
// `localTime(instrumentId)` returns seconds since THAT instrument's synth started, or null if it
// isn't sounding. Envelopes and the movement LFO both begin when the note does, so drawing them
// from the page's clock puts the picture at an arbitrary point of a 12-to-30-second attack. The
// fallback to the global clock is now only for a type with no SynthDef behind it: the CALLER only
// passes instruments that have a synth on the server, so there is no field before the engine runs.
// This is not a visualiser with audio attached - the picture and the sound are one object seen
// twice, and drawing an interference pattern nobody is hearing would be a drawing.
export function flattenChannels(instruments, speakers, timeFactor, t, localTime) {
  // Solo is the APP'S mixer, and an external node is not in it - soloing an instrument changes the
  // gain of the app's own synths and leaves a console synth sounding exactly as before. So an
  // external neither counts towards anySolo nor is silenced by one. Doing otherwise would draw a
  // node dark while it is plainly still audible, which is the one thing this picture must not do.
  const anySolo = instruments.some((i) => i.solo && !i.mute && !i.external);
  const out = [];
  for (const inst of instruments) {
    if (inst.mute) continue;
    if (anySolo && !inst.solo && !inst.external) continue;
    const amp = inst.amp ?? 1;
    const lMul = inst.lActive === false ? 0 : amp;
    const rMul = inst.rActive === false ? 0 : amp;
    const tLocal = localTime?.(inst.id) ?? null;
    for (const ch of projectInstrumentToFieldComponents(inst, speakers, timeFactor, tLocal ?? t)) {
      out.push({ ...ch, gl: ch.gl * lMul, gr: ch.gr * rMul, instId: inst.id });
    }
  }
  return out;
}

// Advances each channel's own phase in JS double precision, wrapped mod 2*pi
// every frame, instead of uploading raw elapsed time to the GPU as a float32
// uniform -- that loses enough precision after a few minutes at audio-band
// frequencies to visibly corrupt the interference pattern. Independent of
// whatever schedules the frame (rAF here, would be identical under R3F's
// useFrame) -- the fix is about what's computed each tick, not when.
export function advancePhase(phaseAcc, freqs, count, dt) {
  for (let i = 0; i < count; i++) {
    phaseAcc[i] = (phaseAcc[i] + TWO_PI * freqs[i] * dt) % TWO_PI;
  }
}

// Slowest beat among a set of active frequencies, for a "N sources, beat at
// X Hz" style summary readout.
export function slowestBeat(freqs) {
  let best = Infinity;
  for (let a = 0; a < freqs.length; a++) {
    for (let b = a + 1; b < freqs.length; b++) {
      const d = Math.abs(freqs[a] - freqs[b]);
      if (d > 1e-6 && d < best) best = d;
    }
  }
  return best === Infinity ? null : best;
}
