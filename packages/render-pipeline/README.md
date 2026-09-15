# `@awb/render-pipeline`

Canonical source lives in the `~/awb` workspace. Applications consume a built private artifact;
they do not keep an editable copy of this package.

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

## Browser WebCodecs sink

`@awb/render-pipeline/webcodecs` provides the first portable production sink. It accepts a
resolved job directly and uses Mediabunny to encode H.264 and optional AAC as frames arrive. It
can either return an MP4 Blob or stream fragmented MP4 to a browser file handle. It contains no
React or renderer dependency; the producer may hand it a canvas or any other
`VideoFrame`-compatible source.

```js
import { createWebCodecsSink } from '@awb/render-pipeline/webcodecs';

const receipt = await runRenderPipeline({
  job,
  createProducer,
  createSink: ({ job }) => createWebCodecsSink({
    job,
    audioBuffer,
    fileName: 'render.mp4',
    fileHandle,
  }),
});
```

The same entry point exports browser capability detection, quality choices and bitrate helpers for
host UI. Cross-sink size estimates, file/folder pickers and download presentation remain host
concerns.

Jobs contain immutable content and replaceable artifact locators, never executor credentials or
provider queue settings. Execution facts belong in the returned receipt.
