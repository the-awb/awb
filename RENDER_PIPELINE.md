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

| Producer | Required resolved inputs | Render authority |
|---|---|---|
| Lissajous | audio | decoded samples plus saved visual state |
| Field | none | analytic field state and the render clock |

Lissajous audio may be an authored master already stored with a score, or the result of a separate
SuperCollider score-render job. SC rendering is never hidden inside the visual job. Channels 0/1
remain the authored listening master; higher stereo pairs may be sampled independently for pattern
analysis.

Field Modelling is the counterexample that keeps this boundary honest: it renders analytic state,
not sound. Its timeline is still useful for deterministic phase evolution, automation and encoded
video, but it has no fake or silent audio dependency.

## Current implementation

- `@awb/render-pipeline` 0.7 validates schema-v1 audio jobs and schema-v2 typed-input jobs, schedules
  exact frame windows, supplies generic per-frame inputs, owns cancellation/progress/lifecycle and
  returns an execution receipt.
- `@awb/render-pipeline/webcodecs` encodes H.264 and optional AAC through Mediabunny. Silent video is
  a supported output, not an error case.
- `@awb/lissajous-engine`'s render producer now rejects jobs with no audio descriptor and frames
  with no decoded audio samples.
- `@awb/field-renderer` provides the first deterministic, React-free Canvas2D field producer using
  `@awb/field-engine`'s CPU propagation equations. Its integration test runs through the shared
  scheduler and sink contract with `inputs: []`.

The Canvas2D producer is a boundary proof and useful preview renderer. It is not yet visual parity
with Field Modelling's Three.js `FieldCanvas`.

## Next vertical slices

1. Add a shell render service which resolves granted files into job inputs, runs local jobs, writes
   outputs through guarded file grants and persists receipts.
2. Wire the hosted Lissajous artifact to create schema-v2 jobs from a saved visual config plus an
   audio file. Keep decoded audio in the renderer/worker data plane, not lifecycle IPC.
3. Extract the Field Modelling WebGL scene, camera and fixed-frame tick into a second
   `@awb/field-renderer` producer, then compare it against the live `FieldCanvas` at landmark frames.
4. Add a provider adapter interface for large jobs. The first remote adapter may target Runpod, but
   provider choice stays deployment policy rather than entering the job schema.
5. Add a shell Render Centre only after the service contract is stable: queue, progress, cancel,
   output/reveal and retry belong there; producer controls remain in their tools.

Not yet implemented: shell file/audio resolution, the Render Centre UI, FieldCanvas visual parity,
remote submission, and optional SC-score-to-audio job chaining.
