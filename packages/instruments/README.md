# `@awb/instruments`

The canonical practice-specific instrument vocabulary shared by browser, desktop and offline integrations.
It is not a universal SuperCollider model and it does not own a live sclang or scsynth process.
Cross-repository consumers use its built private artifact rather than copying this source.

The catalog records stable instrument and SynthDef identity plus authored control meaning: initial
values, units, useful bounds, primary frequency, continuous gain, amplitude-envelope duration
semantics, and which controls represent frequencies or frequency offsets. Envelope descriptors
record the controls the SynthDef really uses; they do not infer a generic envelope from score
`dur`. Compiled SynthDef manifests remain authoritative for which raw controls actually exist.

The catalog is plain JSON-compatible data. That matters because a JavaScript object containing
functions cannot be the contract with awbCollider. JavaScript helpers materialise editor fields and
speaker-dependent controls; the SuperCollider-side exchange can consume or emit the same data
without importing JavaScript.

## Boundaries

- A `SynthPreset` is a durable SynthDef reference plus particular values and provenance. It is not
  an instrument descriptor.
- Runtime node ids, targets, start times, mute, solo and lifecycle state belong to the session host.
- Each renderer declares which events, controls and automation it can execute. Catalog membership
  does not claim renderer support.
- Analytic field projections belong to `@awb/field-engine`.

Run `npm test` here for the catalog contract. The app's `param-surface.mjs` additionally checks
catalog control names against compiled SynthDef bytes.
