# Shared render pipeline

AWB has one visual-render job shape and scheduler, with producer-specific inputs. Sharing the
pipeline does not mean pretending every visual is driven by the same material.

```text
score/config resolver
        |
        | immutable descriptors and producer state
        v
ResolvedRenderJob v2 -----> executor assignment (local, Runpod, other)
        |                                  |
        v                                  v
visual producer -----------------------> frame sink
        |                                  |
        +---------- fixed frames ----------+
                                           |
                                           v
                                     execution receipt
```

Executor placement and credentials are deliberately outside the immutable job. A local desktop
worker and a cloud worker should receive the same job, producer version and resolved artifacts.

## Input rule

`inputs` is an array of typed artifact descriptors. It may be empty. The scheduler validates the
portable shape; each producer validates what it needs.

| Producer mode | Required resolved inputs | Render authority |
|---|---|---|
| Lissajous | audio | decoded samples plus saved visual state |
| Field: `analytic-preview` | none | declared initial phase plus deterministic clock evolution |
| Field: `realized-score` | score and `field-phase-track` | waveform-derived observations anchoring analytic evolution |

Lissajous audio may be an authored master already stored with a score, or the result of a separate
SuperCollider score-render job. SC rendering is never hidden inside the visual job. Channels 0/1
remain the authored listening master; higher stereo pairs may be sampled independently for pattern
analysis.

Field Modelling has two intentionally different claims. An `analytic-preview` renders model state
without audio and must remain labelled model-only. A `realized-score` render claims correspondence
with playback and therefore needs waveform-derived phase observations associated with its score and
configuration. It may evolve phase analytically between observations, but must use the observations
to anchor and periodically correct that evolution.

The phase track may be materialised from live `FieldModellingTool` snapshots, a saved recording, an
offline SC score render, or raw audio passed through a preprocessing step. Once materialised, the
visual renderer does not need the original audio:

```js
inputs: [
  { id: 'score', kind: 'score', artifactHash, locator, metadata: { scoreID, revision } },
  { id: 'phase-observations', kind: 'field-phase-track', artifactHash, locator,
    metadata: { sampleRate } }
]
```

Live and offline ownership remain separate. `FieldModellingTool` owns live SC routing, capture and
observation production; the live view consumes that stream directly. The render pipeline consumes
frozen configuration and artifacts. `@awb/field-renderer` should eventually supply their common
renderer, but must not own the SC `ToolSession`.

## Current implementation

- `@awb/render-pipeline` 0.7 validates schema-v1 audio jobs and schema-v2 typed-input jobs, schedules
  exact frame windows, supplies generic per-frame inputs, owns cancellation/progress/lifecycle and
  returns an execution receipt.
- `@awb/render-pipeline/webcodecs` encodes H.264 and optional AAC through Mediabunny. Silent video is
  a supported output, not an error case.
- `@awb/lissajous-engine`'s render producer now rejects jobs with no audio descriptor and frames
  with no decoded audio samples.
- `@awb/field-renderer` provides the first deterministic, React-free Canvas2D field producer using
  `@awb/field-engine`'s CPU propagation equations. It accepts only explicitly labelled
  `analytic-preview` jobs; its integration test runs through the shared scheduler and sink contract
  with `inputs: []`. `realized-score` is reserved and rejected until phase-track consumption exists.

The Canvas2D producer is a boundary proof and useful preview renderer. It is not yet visual parity
with Field Modelling's Three.js `FieldCanvas`.

## Next vertical slices

1. Add a shell render service which resolves granted files into job inputs, runs local jobs, writes
   outputs through guarded file grants and persists receipts.
2. Wire the hosted Lissajous artifact to create schema-v2 jobs from a saved visual config plus an
   audio file. Keep decoded audio in the renderer/worker data plane, not lifecycle IPC.
3. Specify and test the `field-phase-track` artifact, including anchor interpolation and correction
   policy, before implementing `realized-score` rendering.
4. Extract the Field Modelling WebGL scene, camera and fixed-frame tick into `@awb/field-renderer`,
   then compare both field modes against the live `FieldCanvas` at landmark frames.
5. Add a provider adapter interface for large jobs. The first remote adapter may target Runpod, but
   provider choice stays deployment policy rather than entering the job schema.
6. Add a shell Render Centre only after the service contract is stable: queue, progress, cancel,
   output/reveal and retry belong there; producer controls remain in their tools.

Not yet implemented: shell file/audio resolution, the Render Centre UI, the phase-track schema and
realized-score field mode, FieldCanvas visual parity, remote submission, and optional
SC-score-to-audio job chaining.
