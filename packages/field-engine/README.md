# `@awb/field-engine`

Canonical renderer-neutral analytic acoustic-field projection and propagation. The package
contains no React, Three.js, browser API or SuperCollider engine. Cross-repository consumers use
its built private artifact rather than copying this source.

Its boundary operation is:

```js
projectInstrumentToFieldComponents(instrument, speakers, timeFactor, localTime)
// -> [{ slot, freq, gl, gr }, ...]
```

Each result is an ideal sinusoidal component with stable slot identity, frequency in hertz and
relative left/right speaker gains. `flattenChannels()` applies session mixing state. The shader and
CPU probe then apply speaker geometry, distance loss, propagation phase and directivity.

This is a projection, not synthesis. It does not execute SynthDefs, produce audio or claim that a
catalogued instrument is representable. In particular, the current Substrate projections omit their
12–30 second envelopes and frequency ramps, and Resobass2 produces no field components because its
PM sidebands are not modelled. Packaging does not improve that fidelity.

Instrument identity and control meaning come from `@awb/instruments`. Renderer capability, live
nodes and session state remain outside this package.

Run `npm test` here for the browserless package contract. The application harnesses remain the
integration gates, including the headed phase-lock check against real audio.
