# `@awb/field-renderer`

The shared Three.js/WebGL renderer for acoustic fields. Its React-free controller owns the scene,
shader maths, camera, room geometry, body surfaces, microphones and instrument colouring. Both the
interactive Field application and fixed-frame export use that controller, so there is no separate
export visualisation to drift from the live view.

The deterministic producer currently supports only the explicit `analytic-preview` mode: declared
initial phase advanced by the render clock, labelled as model-only and making no claim of
correspondence with realized playback. It renders at an exact requested size with pixel ratio 1,
no interactive controls and no internal animation loop.

```js
import { createFieldRenderProducer } from '@awb/field-renderer';
import { runRenderPipeline } from '@awb/render-pipeline';

await runRenderPipeline({
  job: fieldJob,
  createProducer: ({ job }) => createFieldRenderProducer({ canvas, job }),
  createSink
});
```

The producer state contains the same complete field state consumed by the live controller:

```js
fieldJob.producer.state = {
  mode: 'analytic-preview',
  pixelRatio: 1,
  field: {
    instruments,
    room,
    surfaces,
    microphones,
    display,
    timeFactor
  },
  camera: { position, target }
};
```

For direct, non-React use, import `createFieldRenderer` from the package root. The React adapter is
available from `@awb/field-renderer/react`; it owns browser animation and resize observation while
delegating all scene work to the same controller.

`fieldJob.producer.state.mode` must currently be `"analytic-preview"`. A future `realized-score`
mode will require a materialised `field-phase-track` derived from waveform observations and
associated upstream with a score/config pair. It will not consume ordinary audio samples frame by
frame: the renderer evolves analytically between sparse observation anchors and uses them only to
correct phase. The reserved mode fails loudly until that contract and consumer exist.

The controller deliberately does not own observation, scheduling, SuperCollider session state or
encoding. Those remain separate live-host and render-pipeline responsibilities.
