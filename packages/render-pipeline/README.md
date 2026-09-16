# `@awb/render-pipeline`

Canonical source lives in the `~/awb` workspace. Applications consume a built private artifact;
they do not keep an editable copy of this package.

Provider-neutral deterministic frame scheduling for AWB visual producers.

This package begins at a **resolved** render job. Schema v2 jobs carry zero or more typed input
descriptors. The scheduler does not make audio universal: a Lissajous producer requires it, while a
field producer can render directly from analytic state. An upstream resolver must resolve every
input that a particular producer requires. The package does not inspect score folders, choose
between masters and raw renders, open Bitwig projects, fetch from Drive, or submit work to a cloud
provider.

```text
score/container resolver -> ResolvedRenderJob -> render pipeline -> execution receipt
                                      local/cloud assignment lives outside the job ^
```

The pipeline owns frame indices, fixed times, per-frame input cadence, progress, cancellation,
producer/sink cleanup and frame-count validation. A producer owns its renderer, scene and camera;
a sink owns encoding and storage.

```js
import { runRenderPipeline } from '@awb/render-pipeline';

const receipt = await runRenderPipeline({
  job,
  createProducer: async ({ job, signal }) => producer,
  createSink: async ({ job, signal, frameSource }) => sink,
  readFrameInputs: ({ startTime, endTime }) => ({
    audio: decodedAudio?.window(startTime, endTime),
  }),
  execution: { executor: 'local' },
  signal,
  onProgress,
});
```

`sampleAudio` remains as a schema-v1 migration alias. New integrations use `readFrameInputs`. A
producer must validate its own descriptor and runtime requirements; the generic scheduler only
validates the portable manifest shape.

Schema v2 separates immutable descriptors from decoded runtime data:

```js
{
  schemaVersion: 2,
  producer: { kind: 'field', version: '0.1.0', state: { /* ... */ } },
  inputs: [],
  timeline: { cueInSeconds: 0, cueOutSeconds: 30 },
  output: { width: 1920, height: 1080, fps: 60, format: 'mp4' }
}
```

An audio-driven job instead includes an input such as `{ id: 'soundtrack', kind: 'audio',
artifactHash, locator, metadata }`. Rendering an SC score to audio is an upstream job and may be
chained before the visual job; it is not hidden inside the visual renderer.

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
