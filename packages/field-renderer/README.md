# `@awb/field-renderer`

React-free render producers for analytic acoustic fields. The first producer is a deterministic
Canvas2D horizontal heatmap backed by `@awb/field-engine`'s CPU field equations.

It is deliberately an initial portable render surface, not visual parity with Field Modelling's
current Three.js `FieldCanvas`. It proves the important boundary: a field job has no audio input,
yet uses the same `@awb/render-pipeline` scheduler, sink and local/cloud executor contract as an
audio-driven Lissajous job.

```js
import { createFieldRenderProducer } from '@awb/field-renderer';
import { runRenderPipeline } from '@awb/render-pipeline';

await runRenderPipeline({
  job: fieldJob,
  createProducer: ({ job }) => createFieldRenderProducer({ canvas, job }),
  createSink
});
```

The next field-specific step is a WebGL producer extracted from `FieldCanvas`. That producer should
retain this contract rather than moving scheduling or encoding back into the application.
