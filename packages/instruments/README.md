# `@awb/instruments`

The current practice-specific semantic annotations shared by the field and Score Studio browser
context. It is not a universal SuperCollider model, an inventory of what a host may execute, or the
authority for a SynthDef's raw control surface. Cross-repository consumers use its built private
artifact rather than copying this source.

`@awb/synthdef-interface` now establishes the general boundary: each execution context builds its
primary interface from the exact SynthDefs and author specs available there, then uses graph
analysis to determine functionality. This catalog remains a provisional context overlay for facts
that the current applications have not yet moved to that derived model. Catalog membership must
never reject an arbitrary desktop, imported or otherwise context-owned SynthDef.

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
