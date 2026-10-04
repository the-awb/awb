# Shared SC signal capture and display derivation

Implemented 2026-10-02 on AWB `design/score-studio-layout`; uncommitted.
The consumers are Shared Loop scopes, standalone Scope and Lissajous **SC Bus**. Field Modelling is unchanged.

The [standalone Scope tool](scope-tool.md) is another consumer: arbitrary audio/control ranges,
1–16 channels and independent windows share these same source/profile leases. The looper
is not required to run, and its scope routes and raw app consumers remain unchanged.

## What is shared

The shell owns `SignalCaptureBroker`. Compatible requests share one language-allocated
ScopeBuffer, ScopeOut2 writer and N-API reader. Compatibility means the same host service,
language address, rate, starting bus and channel count. Overlapping but different ranges are
separate captures; e.g. buses 0–1 and 0–3 do not share yet. Display zoom is not part of this key.

One 4 ms polling timer services all active sources. With no subscribers there are no signal
captures and no capture poll timer. Opening the looper alone creates neither scope writers nor
the demonstration LFO/noise synth. Looper scope windows acquire their feeds on connection; standalone scopes acquire on Listen.
The last viewer of a feed releases it. Control generators run only while the control viewer is open.
Freeze retains the subscription and rolling history, so resume can show recent data.

The first subscriber opens the source; concurrent opens await that allocation. Each subscription
owns a lease. Releasing a lease leaves peers alive; the last lease detaches the native reader
before asking sclang to free the writer and scope. Reacquisition waits for that teardown rather
than attaching to a closing scope. Shutdown waits for all sources, including when one cleanup
fails. Host disconnect or two seconds without a changing source clock closes a stalled source.
Cached snapshots cannot renew freshness. Recovery uses the existing explicit Start/reopen flow.

One observer group per server sits after ordinary root producers. One pair of node-notification
responders moves that group to the tail when ordinary root nodes move or appear. Observers ignore
moves from their own group and other observers, avoiding tail-following feedback. The group and
responders disappear with their last source. This observes current-block bus values; it does not
alter the producer graph's audio routing or provide a lossless recorder.

## Raw data and display data

```text
SC audio/control bus → ScopeOut2 + private frame clock → one N-API reader
  → shell broker's JS-owned planar Float32 PCM
      → Lissajous binary socket: raw 512-frame audio, channel alignment retained
      → shared scope profile: 1,024 audio samples / 32 control values
          → step 1 / min/max 4 / min/max 16 + peak/RMS, once per compatible profile
              → selected-channel binary packets → browser history → canvas
```

Audio capture uses 512-frame publications and 1,024-frame per-channel backing storage.
Control capture uses 32-value publications and 256-value backing storage. Every source has an
extra private counter channel, removed by the reader. Audio rate comes from the running server;
control rate is its audio rate divided by its block size. No device or sample-rate option changes.
At 44.1 kHz a raw audio chunk spans 11.61 ms; a scope's paired chunk spans 23.22 ms.

The scope adapter joins two consecutive raw audio chunks. If a chunk is missed, it waits for a
consecutive pair instead of fabricating continuity. It computes display-only reduction in Node;
Lissajous receives the original PCM. Browser history keeps gaps at their source-frame positions.
Looper scope protocol is `awb.scope.v5`; standalone Scope uses the generic 1–16-channel
`awb.bus-scope.v1` format. The Lissajous binary format is unchanged. Loop waveform
summaries still use the existing SSE path and custom looper UGen.

Scope canvases paint when new data, size or controls change. They build history views once per
paint, reuse display storage and cache the grid. Frozen viewers keep receiving/history updates
but stop painting until the view changes or resumes. Gain, pan and signal selection still work
on a held view. `data-paints` exposes actual paint counts for the focused freeze check.

**Refresh → Auto / 30 fps / 15 fps** now controls each scope's painting cadence; Auto remains
the default. `ScopePainter` schedules dirty views against a steady animation-frame deadline.
Every received packet is decoded, appended to source-indexed history and acknowledged immediately
outside that scheduler. Controls request a prompt next-frame paint; frozen streams append history
without requesting paints; page closure cancels pending timers/frames. Idle views schedule no
painting. Settings are per window and reset on reload. Bin/sample resolution stays unchanged,
but a lower refresh makes the screen less current and motion less fluid. A brief transient can
pass between paints of a short view even though its available chunks entered history.

See the [72-phase cadence comparison](scope-cadence-costs.md) for actual paint/ingress rates,
CPU components, pauses, endpoint source lag and gaps. This is separate from the earlier
shared-reduction/selected-channel comparison. No SC reboot, audio device/rate setting, native
build or Lissajous change is needed for this renderer update; restart the shell for its new
asset-serving route and reopen the scope windows.

Compatible display profiles now also share joining, peak/RMS and min/max work. Each scope
transport encodes a selected-channel variant once per snapshot/mask and reuses it for matching
viewers. Independent runtimes still own their packet headers, sequence counters and caches.
Each viewer retains its own socket, history and graphics work. No shared GPU context or zero-copy
renderer is implemented. The standalone `startBridge` path retains the legacy reader. Historical
reports describe their older measured implementation; the new focused comparison is in
[scope optimisation costs](scope-optimisation-costs.md). No long-session soak has been run.
The matching SC/Boost ABI and macOS constraints remain.

## Display profiles and selected channels

`subscribeDerived` adds a trusted deterministic transform profile on top of a raw lease.
The key is the raw source identity plus a stable profile string; matching consumers receive the
same JS-owned immutable result. The scope profile includes chunk length and reduction step.
The transform runs once per fresh raw publication/profile, not once per viewer. A late subscriber
gets the cached result with its original `publishedAt` timestamp. Callback errors are isolated;
a transform failure releases that profile while raw peers stay alive. Last-profile cleanup
releases its raw lease. The raw `subscribe` API is unchanged.

Scope zoom acquires the new display profile before releasing the old one; the physical capture
remains attached. Zoom is currently shared by viewers of a kind within one instrument runtime.
Different runtime adapters can use distinct profiles on the same raw source; independent zoom
per socket within one runtime is not implemented.

The v5 scope header is 112 bytes (v4 was 104). The first 104 bytes retain their meaning. Offset
104 contains a uint32 channel mask; 108 contains the original channel count; 109–111 are zero.
Selected planes and peak/RMS entries are packed in increasing physical channel order. Decoders
return `channelIds` and `sourceChannels`; they also accept full-channel v4 packets. The WebSocket
subprotocol is v5, so older v4 socket clients must be upgraded even though v4 files still decode.
The public demo still scopes mono input, stereo output and six control lanes.

A viewer requests `channels=0,1` in its socket URL and can change selection with
`{"channels":[1]}`. Acknowledgements remain `{"ack":sequence}`; one frame outstanding and the
latest-only bound are unchanged. Same-clock selection changes can resend a selected variant.
History preserves common channels by physical ID, marks unavailable past channels as gaps and
rejects backward clocks. Freeze holds its saved view: a full capture permits all selector modes;
a subset capture offers only its saved lanes until resumed. Selecting fewer lanes reduces
transport/history work, not the source tap's channel count or its clock rate.

Repeated allocation also revealed cached data from the previous writer in reused SC scope slots.
The native reader now ignores incompatible startup blocks and waits for two compatible forward
clock candidates before publishing. Runtime dimension checks remain strict. This adds one fresh
chunk of startup latency and no ongoing decimation. Both cost versions use this correction.

## Reuse from another app

A trusted shell adapter can subscribe without giving its renderer host credentials or native
memory access:

```js
const lease = await signalCaptures.subscribe({
  host: nativeHost, // stable service identity, local OSC address, token, isConnected()
  configuration: { bus: 32, channels: 4, rate: 'audio' },
  onFrame(frame, info) {
    // frame: { samples: Float32Array, frames, channels, sourceEnd }
    // info: actual rates, block size, capture generation, bus, node identity
    // Samples are planar and shared by trusted callbacks: read them, never mutate them.
    sendToYourBoundedTransport(frame, info);
  },
  onError(error) { showDisconnected(error.message); }
});
// When this consumer closes:
await lease.stop();
```

Use small synchronous callbacks; this broker runs in the Electron main process. A worker/utility
process and MessagePort transport are later experiments, not implemented here. Each consumer
must bound its queue and preserve discontinuities; a slow renderer cannot ask the broker to
block SC. The built-in public SC Bus capability still accepts 2–16 channels in stereo pairs.
The trusted internal source also permits mono audio and control feeds; that does not expand
renderer grants or grant arbitrary Buffer access.

For a trusted scope adapter, the derived lease looks like this:

```js
const step = 16;
const lease = await signalCaptures.subscribeDerived({
  host: nativeHost,
  configuration: { bus: 0, channels: 2, rate: 'audio' },
  profile: `scope:1024:${step}`, // Same name must always mean the same transform.
  createTransform: () => {
    const reduction = new ScopeReduction('output');
    return { append: (frame, info) => reduction.append(frame, info, step) };
  },
  onFrame(snapshot, info) {
    publishYourSnapshot(snapshot, info.publishedAt);
  },
  onError(error) { showDisconnected(error.message); }
});
// Release on viewer/runtime closure; do not mutate shared snapshots.
await lease.stop();
```

The profile API is trusted shell code only; renderers cannot submit executable transforms.
Diagnostics expose raw publications, transform calls and derived publications alongside active
profiles/subscriber counts. `ScopeReduction` can return null while awaiting a consecutive pair.

For another visual app, start by reusing the existing SC Bus capability/codec if paired raw PCM
fits. For a waveform scope, reuse `scope-reduction.mjs`, `public/scope-history.js` and the binary
scope transport, adapting channel configuration rather than exporting the demo's fixed 1/2/6
channel protocol as a general contract. Rendering and controls remain app-owned. Field Modelling
has not been adapted, launched or tested for this milestone.

## Run and verify

Restart the shell to load changed Node/native code. The shell-owned host loads the updated bridges.
For an attached IDE already prepared for Shared Loop, close its old instrument and explicitly load
both `tool-artifacts/shared-loop/0.1.0/sc/host.scd` and
`apps/awb-shell/sc/prepare-sc-bus.scd`. These responder loads do not reboot a running server.
A fresh attached setup still needs Shared Loop's `sc/prepare-host.scd` **before** normal server boot
to install the plugin search path; it now loads both bridges. No automatic live-host restart.

```sh
# AWB root; Node 22 first in PATH
npm run build:sc-bus --workspace @awb/desktop-shell
node tool-artifacts/shared-loop/0.1.0/scripts/build-def.mjs
npm test --workspace @awb/desktop-shell
node --test tool-artifacts/shared-loop/0.1.0/tests/*.test.mjs
npm test --workspace @awb/native-audio
npm run test:sc-bus --workspace @awb/desktop-shell
npm run test:shared-loop --workspace @awb/desktop-shell
```

Passed: 65 shell tests; 29 Shared Loop unit tests; 3 native-audio protocol tests; 32 Lissajous
host/SC-decoder/AudioWorklet/native-codec/config checks; and two focused real Electron gates.
The scope gate verifies mic/output probes, six control lanes, wide history, zoom/pan, actual
freeze painting, on-demand allocation and release, and one output capture shared with the SC Bus
adapter. It also checks live all/noise/slow/fast transport selection and subset freeze. Closing the looper leaves that raw PCM peer streaming; releasing the peer stops capture.
The Lissajous gate verifies raw private-bus amplitudes, actual curve changes, independent pair
selection and range switching, and restoration of both synth and group counts after closure.
Both gates use temporary test-owned SC hosts and open no Field/Studio apps.

Unchanged byte checks cover the existing audio-routing hook, native audio access, renderer media
policy and decoders. The Lissajous source and published renderer artifact were not edited in this
slice. Hardware input, Electron system loopback, browser/file/WASM routes and field code retain
their existing paths. Their physical-device behavior and timing under combined load have not
been remeasured; passing these checks is not an audio-dropout guarantee. The isolated host chose
48 kHz from its device defaults, while codecs explicitly test 44.1 kHz. Neither rate was forced.

Current measurements: [true mono baseline in the actual shell](one-line-scopes-costs.md),
[paint cadence](scope-cadence-costs.md) and
[shared engine optimisation](scope-optimisation-costs.md).

Full historical reports: [guide](../../../tool-artifacts/shared-loop/0.1.0/GUIDE.md),
[binary transport](../../../tool-artifacts/shared-loop/0.1.0/BINARY_TRANSPORT.md),
[component costs](../../../tool-artifacts/shared-loop/0.1.0/COMPONENT_COSTS.md),
[control costs](../../../tool-artifacts/shared-loop/0.1.0/CONTROL_COSTS.md),
[audio channel costs](../../../tool-artifacts/shared-loop/0.1.0/AUDIO_CHANNEL_COSTS.md),
[canvas/window costs](../../../tool-artifacts/shared-loop/0.1.0/LAYOUT_COSTS.md),
[Qt comparison](../../../tool-artifacts/shared-loop/0.1.0/QT_COSTS.md).

[Single 5,000-point Lissajous versus mono scope](lissajous-scope-costs.md) now provides
actual-shell SC Bus costs at matched plot size, with normal refresh and an experimental
30 fps scene cap. The latter is confined to the measurement fixture.

[Scope display polish](scope-display-polish.md) separates 8 Hz meters/text from wave painting
and draws connected min/max envelopes without bridging capture gaps. Capture/broker/raw
SC Bus/history are unchanged; this UI slice has cadence and visual checks, not new CPU costs.
