# `@awb/field-renderer`

React-free render producers for acoustic fields. The first producer is a deterministic Canvas2D
horizontal heatmap backed by `@awb/field-engine`'s CPU field equations. It supports only the
explicit `analytic-preview` mode: declared initial phase advanced by the render clock, labelled as
model-only and making no claim of correspondence with realized playback.

It is deliberately an initial portable render surface, not visual parity with Field Modelling's
current Three.js `FieldCanvas`. A future `realized-score` mode will require a materialised
`field-phase-track` derived from waveform observations and associated upstream with a score/config
pair. It will not consume ordinary audio samples: the renderer evolves analytically between sparse
observation anchors and uses them only to correct phase. It must not silently treat an uncorrected
model preview as realized playback.

```js
import { createFieldRenderProducer } from '@awb/field-renderer';
import { runRenderPipeline } from '@awb/render-pipeline';

await runRenderPipeline({
  job: fieldJob,
  createProducer: ({ job }) => createFieldRenderProducer({ canvas, job }),
  createSink
});
```

`fieldJob.producer.state.mode` must currently be `"analytic-preview"`. `"realized-score"` is a
reserved mode and fails loudly until its phase-track contract and consumer are implemented.

The next field-specific steps are the phase-observation extractor, its sparse track contract and a
WebGL producer extracted from `FieldCanvas`. That producer should retain this boundary rather than
moving observation, scheduling, SC session ownership or encoding back into the application.
