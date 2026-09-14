# `@awb/render-pipeline`

Provider-neutral deterministic frame scheduling for AWB visual producers.

This package begins at a **resolved** render job. An upstream score/container resolver must already
have selected or rendered the exact audio artifact. The package does not inspect score folders,
choose between masters and raw renders, open Bitwig projects, fetch from Drive, or submit work to a
cloud provider.

```text
score/container resolver -> ResolvedRenderJob -> render pipeline -> execution receipt
                                      local/cloud assignment lives outside the job ^
```

The pipeline owns frame indices, fixed times, audio-window cadence, progress, cancellation,
producer/sink cleanup and frame-count validation. A producer owns its renderer, scene and camera;
a sink owns encoding and storage.

```js
import { runRenderPipeline } from '@awb/render-pipeline';

const receipt = await runRenderPipeline({
  job,
  createProducer: async ({ job, signal }) => producer,
  createSink: async ({ job, signal, frameSource }) => sink,
  sampleAudio: ({ startTime, endTime }) => decodedAudio.window(startTime, endTime),
  execution: { executor: 'local' },
  signal,
  onProgress,
});
```

Producer lifecycle:

- `prepare({ job, signal })`
- `renderFrame(frameContext)` -> a canvas, `VideoFrame`-compatible source, or `undefined` when
  `producer.frameSource` is stable
- `dispose({ job })`

Sink lifecycle:

- `addFrame(frameSource, frameContext)`
- `finish({ job, signal, frameCount })` -> output metadata
- `abort({ job, error, completedFrames })`

Jobs contain immutable content and replaceable artifact locators, never executor credentials or
provider queue settings. Execution facts belong in the returned receipt.
