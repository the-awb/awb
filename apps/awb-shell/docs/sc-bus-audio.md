# Native SC bus audio for Lissajous

Implemented 2026-10-02, on `design/score-studio-layout` in AWB and
`design/shell-visual-language` in Lissajous. Changes are uncommitted.

## Use

1. Start AWB normally with Node 22 first in PATH: `npm start --workspace @awb/desktop-shell`.
2. Use the shell's existing local SC host. An owned headless host loads the bridge on startup.
   For an already running attached IDE, evaluate
   `"/Users/willy/awb/apps/awb-shell/sc/prepare-sc-bus.scd".load;` in that IDE.
   This installs the tap responders without booting or rebooting the server.
3. Open Lissajous, select **Source → SC Bus**, choose the starting audio bus and channel count,
   then **Start SC Bus**. Stop before changing the range.
4. Bus `0`, channels `2` shows SC's first stereo output. A private instrument bus captures the
   signal inside SC before any hardware routing. Bus numbers are zero-based. Select 2–16 channels
   in stereo pairs; the server's actual allocated bus range is checked in sclang.
5. Pattern source pairs are relative to this range: for bus `32`, channels `4`, pair 0 reads
   buses 32/33 and pair 1 reads buses 34/35. **Patterns → SC bus pair** reuses the existing
   multichannel selector, showing actual SC bus numbers. Each pattern chooses independently.
   A saved pair outside the current range is shown disabled; it is not silently retargeted.

This is a distinct source (`sourceKind: "sc-bus"`). **Native Audio** still means CoreAudio hardware
input; **System Output** still means Electron's system loopback. SC Bus uses the shell's existing
SC host connection. It does not choose an interface, request a sample rate, start the browser WASM
server, or route captured audio to speakers. The rate shown is the running SC server's rate.
At 44.1 kHz the 512-frame publication window is about 11.61 ms. Neither 44.1 nor 48 kHz is forced.
Restart the shell application to load changed Node code. A live attached SC host can load the
preparation script; there is no automatic restart of that host.

## Data and ownership

```
SC audio bus → In.ar → ScopeOut2 (private language-allocated scope)
  → matching native N-API reader → shell shared capture broker → owned planar Float32 samples
  → binary loopback WebSocket → per-pair queues → existing Lissajous engine
```

The tap uses built-in UGens, so no custom UGen installation is required. It publishes 512 raw
frames at a time with 1,024-frame per-channel storage. One extra private channel carries a source
frame clock; it is stripped by the reader. No min/max reduction is applied: sample alignment and
phase relationships survive for XY rendering. Ordinary SC Buffer storage is not mapped.

Each view owns a subscription and its binary endpoint. Compatible SC bus/rate/channel requests
share one tap, scope allocation and native reader through the shell broker. A single observer group
follows ordinary root producers; observers ignore each other's moves. Closing a view releases its
lease; only the last subscriber detaches/frees the physical source. The reader attaches by server
port and private scope index and rejects a duplicate native reader in this process. Browser arrays refer only to owned snapshots, never server memory. The
renderer has no Node access, filesystem access, host credential or arbitrary attach operation.
The capability `sc-bus-audio` grants only bounded start/stop requests to that view.

PCM travels in a 48-byte little-endian header plus planar Float32 payload. Header fields include
version, capture generation, packet sequence, actual rate, source-end frame, bus, channels and
frame count. Decoder validation rejects malformed sizes and mismatched capture identities.
This removes JSON sample formatting/parsing; it is not zero-copy end to end. There are native
snapshot, packet and browser drain copies. Small control/metadata requests still use structured IPC.

ScopeOut2 is a latest-block exchange, not a lossless recorder. Node polls at 4 ms; slow sockets
skip packets above a 64 KiB backlog. Source-frame gaps are shown as missing frames, and pending
pair queues are cleared at a discontinuity. The browser retains at most eight chunks per active
pair, dropping old chunks if painting falls behind. That browser queue loss is not included in
the transport-gap counter. Metadata updates at most four times per second rather than for every
PCM packet. This profile does not offer recording/export of this feed.

Stop, source switching and view closure release this view's lease. The last subscriber detaches the native reader before freeing the SC writer and scope allocation. Allocation racing view closure is serialized and cleaned up. Stream errors,
host disconnects and two seconds without fresh publications stop capture; recovery is explicit
Start rather than automatic reattachment. Normal host stop is blocked while a capture is active.
A process crash/forced kill can leave SC allocations until host cleanup/restart; crash recovery
and long-session load testing remain outside the verified behavior.

## Files and reuse

- `sc/AWBScBusAudio.scd`: authenticated language allocation/order/cleanup responders.
- `sc/prepare-sc-bus.scd`: attached-IDE setup; `AWBHeadlessHost.scd` loads it for owned hosts.
- `native/sc-bus-reader.cpp`: matching SuperCollider shared-memory consumer exposed with N-API.
- `src/signalCaptureBroker.mjs`: shared source identity, leases, polling and freshness.
- `src/scSignalSource.mjs`: private audio/control source allocation and native attachment.
- `src/scBusAudioAccess.mjs`: bounded view lifecycle and binary endpoint.
- `shell/main.mjs`: manifest grant checks, host selection, shutdown and focused Electron gate.
- Lissajous `src/scBusFrame.js`, `src/useAudioInput.js`, `src/SourceTab.jsx`: decoding, pair adapter,
  and separate source controls. `src/host/` and its tool manifest grant desktop-only availability.

The same shell service can feed Field Modelling's phase-fit adapter with raw paired samples;
that app has not been changed or launched for this work. A future consumer should declare the
capability, implement the decoder and adapt the samples to its own drain contract. Rendering need
not share an audio callback or core with SC. Compatible sources now share a tap across views and Shared Loop scopes; overlapping ranges
with different channel counts remain separate. See [shared-engine guide](shared-signal-engine.md).

The native addon currently builds on macOS against matching SC and Boost headers.
`SC_SOURCE` defaults to `/Users/willy/supercollider`; set it for another checkout. `NODE_HEADERS`
can override the current Node installation's `include/node` path. Run
`npm run build:sc-bus --workspace @awb/desktop-shell` after native changes. The normal shell build
also rebuilds it. A mismatched shared-memory ABI is unsupported. SC headers retain their GPL
license; this is a development integration, not a portable prebuilt addon distribution.

Change Lissajous in `/Users/willy/lissajous-viz`, run `npm run build:tool`, then replace the complete
`tool-artifacts/lissajous/0.1.0` artifact. Its `SOURCE.md` records the base commit, uncommitted
source/diff hashes and generated asset hashes. Source edits alone do not update the shell.

## Costs and verification

A [single-pattern shell comparison](lissajous-scope-costs.md) now measures one live 5,000-point
SC Bus pattern: total Electron CPU averaged 35.7% of one core at ~60 point draws/s, versus
27.1% for a mono 1,024-point scope at 30 fps. A fixture-only 30 fps scene cap averaged 28.1%;
this is not a shipped refresh control. Four alternating repeats retain CPU components, ranges,
traffic, SC cost and memory. The paired feed and app UI differ from the mono scope. Older
scope/Qt reports still must not be treated as Lissajous measurements. The raw payload at
44.1 kHz is `sampleRate × channels × 4` bytes/sec: stereo 352,800 B/s, four channels 705,600 B/s,
sixteen channels 2,822,400 B/s. Add about 4,134 B/s of frame headers, then WebSocket/TCP overhead.
These are full-delivery budgets, not measured traffic. SC's triple storage for the scope itself
is `3 × 1024 × (channels + 1) × 4` bytes: stereo 36 KiB, sixteen channels 204 KiB,
excluding metadata, synth buffers and process overhead.

Focused checks:

```sh
# AWB root, Node 22 first in PATH
npm test --workspace @awb/desktop-shell
npm run test:sc-bus --workspace @awb/desktop-shell
# Lissajous source root
npm run test:host
npm run test:sc-bus
npm run build:tool
```

Verification passed: 53 shell unit tests, 27 Lissajous host/decoder/existing-audio checks,
and the real Electron gate. One parallel shell-unit run failed transiently; the isolated rerun
passed all 53. Its truncated output did not retain the failed test name, so no cause is asserted.
The Electron gate owns a temporary SC host and silent private buses 32–35, opens only Lissajous,
checks four raw channel amplitudes, actual bus labels and per-pattern pair routing through canvas-only
image/curve-size comparisons and independent selections on two patterns, a drawn response to changing SC gain, a concurrent private tap,
a switch to buses 34/35, and restoration of the original synth count after view closure. It does
not launch Field Modelling/Studio or change the user's live host. The observed test device rate was
48 kHz from system defaults; binary unit fixtures explicitly verify 44.1 kHz. Physical microphone
capture, audible output, long-session stability and 44.1 kHz hardware were not tested here.

Full scope research reports: [reuse guide](../../../tool-artifacts/shared-loop/0.1.0/GUIDE.md),
[binary transport](../../../tool-artifacts/shared-loop/0.1.0/BINARY_TRANSPORT.md),
[component costs](../../../tool-artifacts/shared-loop/0.1.0/COMPONENT_COSTS.md),
[canvas/window costs](../../../tool-artifacts/shared-loop/0.1.0/LAYOUT_COSTS.md),
[Qt comparison](../../../tool-artifacts/shared-loop/0.1.0/QT_COSTS.md).

The per-pattern routing gate waits up to five seconds for the expected curve dimensions,
excluding status/selector pixels. Initial fixed 500 ms captures sometimes retained the previous
curve; later captures and sample-drain tracing confirmed correct pair data. No steady-state
source-switch latency claim follows from this startup test. Config round-trip checks pass 5/5.

2026-10-02 shared-engine validation supersedes the earlier independent-tap implementation: 60 shell
tests now pass, plus the focused Lissajous and Shared Loop gates. See the [shared-engine guide](shared-signal-engine.md)
for exact sharing, raw/display isolation, untouched audio routes and current unmeasured limits.
