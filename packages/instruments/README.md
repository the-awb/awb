# `@awb/instruments`

The canonical practice-specific instrument vocabulary shared by browser, desktop and offline integrations.
It is not a universal SuperCollider model and it does not own a live sclang or scsynth process.
Cross-repository consumers use its built private artifact rather than copying this source.

The catalog records stable instrument and SynthDef identity plus authored control meaning: initial
values, units, useful bounds, primary frequency, continuous gain, envelope graphs and which
controls represent frequencies or frequency offsets. Envelope descriptors are plural and
role-labelled: amplitude, modulation and other targets remain distinct, and only the envelope
whose EnvGen carries `Done.freeSelf` is marked as owning node completion. Their time expressions
may reference controls, products, sums, maxima and conditionals so the catalog can reproduce the
actual SynthDef graph rather than flattening every envelope into attack/release.

`instrumentEnvelopes()` materialises those data-only expressions for an event payload.
`instrumentNoteLifecycle()` is deliberately narrower: it derives an automatic gate boundary only
for instruments that explicitly declare how authored event duration maps onto their gated
amplitude envelope. An envelope using `dur` for frequency or phase modulation does not make `dur`
the note lifetime. Unknown lifecycle remains unknown; the helper never invents a generic
`sustain` or `legato`. Compiled SynthDef manifests remain authoritative for which raw controls
actually exist.

The catalog is plain JSON-compatible data. That matters because a JavaScript object containing
functions cannot be the contract with awbCollider. JavaScript helpers materialise editor fields and
speaker-dependent controls; the SuperCollider-side exchange can consume or emit the same data
without importing JavaScript.

## Boundaries

- A `SynthPreset` is a durable SynthDef reference plus particular values and provenance. It is not
  an instrument descriptor.
- Runtime node ids, targets, start times, mute, solo and lifecycle state belong to the session host.
- Score duration, envelope motion and runtime node lifetime are separate concepts. A consumer may
  connect them only through an instrument-specific lifecycle declaration.
- Each renderer declares which events, controls and automation it can execute. Catalog membership
  does not claim renderer support.
- Analytic field projections belong to `@awb/field-engine`.

Run `npm test` here for the catalog contract. The app's `param-surface.mjs` additionally checks
catalog control names against compiled SynthDef bytes.
