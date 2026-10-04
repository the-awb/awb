# Binary scope transport — initial v1 measurement, 2026-10-01

These measurements describe the initial binary-v1 implementation. [WIDE_SCOPES.md](WIDE_SCOPES.md) describes the current v4 codec, short captures, rolling histories and control array. Keep these results as the transport-only baseline; they do not measure the new modes.

The mic and stereo output scopes now receive binary Float32 samples over a local WebSocket. Sample count, capture duration, delivery interval, Canvas2D rendering, gain, freeze and X zoom are unchanged. No native addon, UGen or audio-device configuration changed. The shell still uses its own SC host and actual device sample rate.

**Restart the shell**, then launch Shared Loop and reopen its scopes. Node caches the backend modules, so reopening only a scope cannot activate this change. No native rebuild is required. In a standalone artifact copy, run `npm ci` to install the declared `ws` dependency (lockfile: 8.21.3). AWB already supplies it through its shell workspace.

## Measured costs

[Raw binary results](tests/binary-results-2026-10-01.json) and [previous JSON results](tests/component-results-2026-10-01.json) are retained. The scope-only harness runs a minimal test-owned Electron/SC process, without Studio, Field or other shell host services. Intel i7-8700B, macOS, SC 3.12.2, actual 48 kHz, display 2560 × 1415. Each phase settles for two seconds and measures approximately five seconds. It does not restart the user's server.

| Component at 1,024 frames / approximately 30 Hz | Binary application payload | Main CPU, one core | Scope renderer CPU, one core |
| --- | ---: | ---: | ---: |
| Tap + native reader, no viewer | 0 | 1.17% | — |
| One mic scope | 0.119 MiB/s | 2.73% | 8.20% |
| One stereo output scope | 0.235 MiB/s | 3.52% | 8.99% |
| Both scopes | **0.353 MiB/s** | **2.72%** | **17.65% combined** |

The original pair sent approximately **1.92 MiB/s of JSON**. Binary carries **81.5% fewer application bytes** at unchanged resolution. A pair now occupies 12,384 bytes: 4,144 mono + 8,240 stereo, including both 48-byte headers. ACKs add about 657 bytes/s for two viewers. Status is sent only on change (zero bytes during the steady measurement intervals). Counters exclude WebSocket/TCP framing; every additional subscriber still requires its own socket delivery.

The older isolated two-scope JSON run used 3.07% main + 18.99% combined renderer CPU; this binary run used 2.72% + 17.65%. That is a modest observed reduction, not an 82% CPU saving. One-scope main CPU was higher in this run than in the older baseline. These are separate short sequential runs with warm-up/JIT variation and no confidence intervals. Process CPU is sampled from cumulative `ps` time with 0.01-second granularity (about 0.2 percentage points over five seconds); tiny differences are not conclusive. Canvas redraw remains the dominant measured cost. GPU/helper process CPU is not measured.

Scope audio CPU stayed approximately 0.16–0.17% versus 0.14% idle. The audio path has not changed. Two renderer RSS values were approximately 77.5 and 78.8 MiB; main was 132.8 MiB, sclang 201.3 MiB, scsynth 31.6 MiB. RSS includes shared pages and excludes other Chromium helpers; it is not unique physical RAM and does not establish a memory saving.

| Encoding a captured pair, 3,000 warmed iterations | Time per pair | Bytes |
| --- | ---: | ---: |
| Array.from + JSON.stringify | 227.96 µs | 67,098 |
| Complete binary packet encoding, including header and owned copy | 14.08 µs | 12,384 |

The complete encoder is about **16× faster** in this microbenchmark. The difference corresponds to about 0.64% of one core at 30 pairs/s. It excludes native reads, socket copies, ACK handling, browser decoding and drawing. Bare wrapping/copy numbers in the raw result are comparison primitives, not the complete production path.

## Boundary and packet layout

SC shared memory → C++ reader → owned N-API Float32Array → immutable binary packet → WebSocket → browser ArrayBuffer → Float32Array view → existing Canvas2D drawing.

The native reader still copies from shared memory into JS-owned storage. Node makes one immutable packet per active kind per polling update and shares that packet among subscribers. The browser creates a sample view directly on its received ArrayBuffer on aligned little-endian machines. Socket/browser boundaries can copy; this is not end-to-end zero-copy. Unaligned or big-endian decoding uses a safe copy fallback.

Endpoint: `/scope/socket?kind=mic|output`, subprotocol `awb.scope.v1`. Every multibyte field is little-endian. Samples are planar (all channel 0 frames, then channel 1).

| Offset | Type | Meaning |
| ---: | --- | --- |
| 0 | uint32 | Magic, bytes `SCOP` |
| 4 | uint16 | Version 1 |
| 6 | uint8 | Kind: 0 mic, 1 output |
| 7 | uint8 | Channels: 1 mic, 2 output |
| 8 | uint32 | Frames per channel, 1–2,048 |
| 12 | uint32 | Poll sequence, wraps at 32 bits |
| 16 | float64 | Actual sample rate |
| 24 | 2 × float32 | Peak levels, unused channel zero |
| 32 | 2 × float32 | RMS levels, unused channel zero |
| 40 | uint32 | Instrument identity, sharedId |
| 44 | uint32 | Reserved, zero |
| 48 | frames × channels × float32 | Planar samples |

The shared [codec](public/scope-protocol.js) validates magic/version, reserved field, dimensions, exact packet length, rate/levels and expected kind/instrument identity. Instrument identity is not an SC reboot epoch. Sequence is a polling counter, not proof that the audio producer is advancing.

[ScopeTransport](scope-transport.mjs) accepts only the loopback host, mic/output kind and declared protocol; browser Origin must match the local HTTP origin. Compression is disabled. [ws documentation](https://github.com/websockets/ws/blob/master/doc/ws.md) describes the server API; the browser receives ArrayBuffers using [binaryType](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType).

## Bounded delivery and lifecycle

Each viewer has at most one application sample frame outstanding. After decoding/applying it, the browser sends the small JSON message `{"ack": sequence}`. While waiting, the server retains the latest owned snapshot and skips intermediate updates. ACK receipt sends the latest available update. A viewer that has not acknowledged after five seconds is terminated on a subsequent poll. Malformed ACKs close the connection; incoming messages are capped at 128 bytes. Packet encoding happens only for ready viewers.

This bounds queued scope sample delivery per viewer, not the number of local viewers or total process memory. It intentionally favors fresh frames over complete history. Freeze holds the displayed snapshot while incoming frames are still decoded/acknowledged. Browser reconnect delays grow from 500 ms to at most five seconds; page close cancels retries. Socket shutdown occurs before native-reader detachment and SC writer release.

Changed connection status remains small JSON. `/api/scopes` returns metadata and transport counters only; samples are absent. The old `/scope/events` route is removed. Controls and the stored-loop min/max waveform remain JSON/SSE; the latter still needs its own bounded backpressure policy. Crash/reboot recovery, producer-heartbeat detection, native ABI portability and long-session soak testing remain open. Separate scope windows remain pure JS/Electron, with no Qt drawing involved.

## Replication and checks

For an existing scope, keep the N-API Float32Array result, attach ScopeTransport to the local HTTP server, and publish `{mic, output}` snapshots with sampleRate, frames, channels, sequence, samples, peaks and RMS. Serve the shared codec. Replace EventSource with an ArrayBuffer WebSocket receiver, decode against the expected identity/kind, and ACK the decoded sequence. Preserve reader-before-writer teardown. The current codec specializes mic mono / output stereo; other layouts need a deliberate protocol extension. See [GUIDE.md](GUIDE.md) for the complete SC attachment and instrument adaptation steps.

Run from the AWB root with Node 22:

```sh
npm test --prefix tool-artifacts/shared-loop/0.1.0
npm run test:shared-loop --workspace @awb/desktop-shell
node tool-artifacts/shared-loop/0.1.0/tests/run-component-bench.mjs --binary-only
```

Eight unit/protocol/socket tests pass: exact Float32 preservation, header/identity/dimension rejection, unaligned decode/sequence wrap, blocked-viewer latest-frame behavior, timeout/malformed ACK, and real socket origin/kind/protocol validation. The real Electron gate passed binary sample checks against independent SC bus probes, zoom/pan/freeze, close/reopen, sandboxing and scoped teardown. Its first attempt failed the existing Field isolation assertion; retry passed. This transport work does not establish that unrelated intermittent assertion is fixed. Physical mic capture/audible output and sustained-load stability are not certified by these deterministic probes.

The successful benchmark emits `/private/tmp/awb-binary-results.json`; this document links the retained copy. Legacy `wireBytesPerSnapshot` fields in that result reconstruct equivalent JSON for comparison and are not actual binary socket bytes; `traffic` records actual transport counters.
