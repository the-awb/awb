# Shared Loop bridge: cost and stability assessment

Original JSON/SSE assessment; scope transport has since changed. See [BINARY_TRANSPORT.md](BINARY_TRANSPORT.md) for the initial binary measurements and resolved delivery risks. [WIDE_SCOPES.md](WIDE_SCOPES.md) describes the current rolling implementation; costs below are historical, with fresh isolated rolling measurements in that document.

2026-10-01 · `/Users/willy/awb` · branch `design/score-studio-layout` · uncommitted demo slice.

The proof works: a looper UGen updates its ordinary SC Buffer while publishing a coherent min/max mirror through shared memory, and Node reads SC's existing ScopeOut2 transport for mic and output displays. The audio-side cost is small in this short run. Electron rendering, JSON and process memory cost substantially more. Normal lifecycle behavior is tested; crash recovery, a long soak and SC-version portability are not established.

## Measurements

One isolated, test-owned Electron/sclang/scsynth host on this Intel Mac, SC 3.12.2, inherited 48 kHz/system interface “1248”, four-second mono loop. The loop output was muted; independent quiet SC bus probes exercised the scopes. A Field tool and normal shell services remained open. These are measurements of this demo configuration, not a minimal-host comparison or maximum-load/dropout certification.

Each phase settled for 2.5 seconds, then sampled 20 SC status replies across approximately 5.3 seconds. Node main CPU uses `process.cpuUsage`; renderer CPU uses deltas in macOS `ps` cumulative process time. Process percentages below mean percent of **one CPU core**. SC's reported audio CPU is a different metric and must not be added to process CPU.

| Phase | SC average audio CPU | SC maximum reported peak CPU | Shell main CPU | Mic renderer CPU | Output renderer CPU |
| --- | ---: | ---: | ---: | ---: | ---: |
| Scope synth paused, viewers hidden, loop stopped | 0.339% | 1.491% | 9.00% | 1.32% | 1.69% |
| Scope synth running, both viewers visible, loop stopped | 0.360% | 1.805% | 9.77% | 9.31% | 8.36% |
| Scope synth running, both viewers visible, overdubbing | 0.452% | 2.314% | 8.75% | 9.36% | 8.22% |

The approximately 0.02 percentage-point difference with scopes enabled is too small and the run too short to isolate a precise scope cost. The entire SC workload stayed below 0.5% average in these phases. Two scope renderers together consumed about 18% of one core. The shell main includes other host/tool work and is not a bridge-only measurement. Hidden viewers still received SSE, and the paused producer's cached data was still copied/serialized: the first row is not a scopes-uninstalled baseline.

The current pair of snapshots occupied **67,245 bytes as SSE JSON**, approximately **1.92 MiB/s at 30 Hz** to one mic and one output subscriber. Content changes encoded length; silence costs less. Multiple subscribers repeat serialization and delivery. A 3,000-pair microbenchmark of Float32Array → ordinary Array → JSON measured **353 microseconds/pair**, roughly 1.06% of one core at 30 Hz, excluding native reads, socket work, UI parse and painting. This is a warmed microbenchmark of realistic captured data, not total bridge CPU.

At the end, RSS was about 138 MiB for shell main, 104 MiB for mic and 115 MiB for output. RSS includes shared pages and Chromium overhead; summing it is not unique physical RAM consumption. Renderer RSS grew while the processes warmed. This short run cannot determine steady-state memory or rule out a leak. GPU and browser-process costs were not measured.

Reproduce the optional measurement inside the real Electron integration gate, with Node 22 first in PATH:

```sh
AWB_SHARED_LOOP_ASSESS=1 npm run test:shared-loop --workspace @awb/desktop-shell
```

The gate prints `AWB_SHARED_LOOP_ASSESS` JSON. Measurement code lives in `tests/assessment.mjs` and runs only when requested by the smoke test; ordinary launches have no profiling path. Raw output is also retained in `/private/tmp/awb-zoom-assessment.log` on the validation machine, but temporary logs are not durable documentation.

## What costs what

- **Buffer:** four seconds × 48,000 frames/s × one float = 768,000 bytes (750 KiB). It stays in SC; no full Buffer is copied to the GUI.
- **Loop mirror:** three slots of a 4,096-byte min/max envelope plus headers = 12,416 bytes (about 12.1 KiB). Publishing copies 4 KiB about 30 times/s, approximately 120 KiB/s. Changed bins are rescanned during record/overdub. At four seconds/48 kHz/64-sample blocks, bins contain 375 samples; this is bounded but longer loops and smaller blocks cause more repeated scanning.
- **Scope storage:** one mono plus one stereo scope, 2,048-frame capacity, three slots each = 73,728 bytes (72 KiB) of sample storage, plus SC descriptors/allocator overhead. These use the host's existing shared-memory pool. ScopeOut2 copies three channels of audio: about 576,000 bytes/s at 48 kHz before other signal-processing work.
- **Native → JS:** the readers return owned copies. A scope pair is 12 KiB and the loop mirror 4 KiB per update, around 0.47 MiB/s combined at 30 Hz before JS objects/JSON. This deliberately prevents the renderer from observing mutable native memory.
- **Node → GUI:** local SSE converts floats into decimal JSON, then each renderer parses it and redraws Canvas2D at animation-frame cadence, even between sample updates. This is where the proof wastes the most work. The transport is shared memory across SC → Node; it is not end-to-end zero-copy.
- **X zoom:** 1×/2×/4×/8× and position crop the existing 1,024-frame snapshot. No larger SC allocation, extra audio work or additional network samples. At 48 kHz, the visible duration changes from 21.33 ms to 2.67 ms. This is not a history buffer, lower-frequency capture or a triggered oscilloscope. Peak meters still describe the entire captured snapshot.

SharedLooper performs no general-purpose allocation, file I/O or blocking lock in its audio calculation. Region creation and destruction use asynchronous plugin-command stages; fixed-size publishing uses lock-free 32-bit atomics. Buffer/scope creation and UGen setup are startup work, so this is not a guarantee that opening the instrument during a heavily loaded show is glitch-free. Clear writes at most 4,096 samples per block, a bounded burst larger than normal per-block work.

## Stability and ownership

The loop mirror and SC scopes both use a three-slot single-writer/single-reader exchange. A stalled consumer skips intermediate publications; it does not block the producer. Slow browser drawing therefore does not hold up audio. The loop region validates magic, version, byte size and generation before use. Bounds and finite-value checks protect the expected data path. Only this looper may modify its Buffer; freeing/reallocating it while the UGen is active violates that contract.

Normal teardown detaches the scope reader before releasing its writer, frees the looper synth before unlinking the custom region, and releases only instrument-owned Buffer/synth/scope resources. The real Electron gate passed routing, sandbox, zoom/pan/reset on frozen snapshots, freeze/resume, window close/reopen, resource release, survival of another SC node/tool, and shell quit with an active looper. Original live checks exercised loop-reader reattachment, duplicate-reader rejection, waveform agreement with the actual Buffer and two server generations. Physical interface operation is user-observed; the automated probes do not independently verify a microphone or speaker.

Remaining material risks:

1. **Crash recovery is incomplete.** Killing the reader can leave the loop's reader claim set; killing SC can leave a named POSIX region and stale mappings. A killed shell attached to an externally owned host can leave its synths/resources running. There is no lease, heartbeat cleanup, safe orphan reclamation or automatic remapping after reboot. Fresh IDs avoid ordinary reuse but do not reclaim leaked resources. PID checks protect teardown from freeing a replacement server's identities; they do not implement reconnection.
2. **Scope ABI is internal.** The reader embeds SC/Boost shared-memory layouts from matching 3.12.2 source. N-API stabilizes the Node addon interface, not SC's layout. Current official [ScopeOut2 documentation](https://doc.sccode.org/Classes/ScopeOut2.html) still labels the class undocumented. This build targets this Intel macOS/scsynth installation; other SC/Boost versions, Apple Silicon, Windows/Linux and supernova have not been validated. Rebuild and verify the native boundary before upgrading.
3. **Scope reader ownership is partly conventional.** SC scopes are single-reader structures. The Node guard rejects the same scope pair only inside this process; it does not prevent another process, Qt viewer, or an overlapping pair from consuming the same indices. Keep the language-allocated scope indices private. The custom loop region has an interprocess reader claim, but that claim lacks crash recovery.
4. **Freshness is not producer liveness.** Scope `pull` can return the last published frame block repeatedly, and this reader's sequence advances on Node reads. A paused/free-running-but-silent producer is not distinguished by that counter. The host connection check helps detect disconnection, but a ready host after reboot is not proof that an old mapped scope belongs to the current server. A true producer epoch/heartbeat is needed for trustworthy recovery status.
5. **SSE has no bounded backpressure policy.** `res.write` return values are ignored. A sufficiently stalled subscriber can accumulate Node-side queued output. Reader polling continues with no scope windows, and Freeze holds drawing state while data still arrives and parses. Neither user action releases the SC tap. Binary, bounded delivery and subscriber-aware work would reduce both cost and this memory risk.
6. **Final-mix ordering is repaired asynchronously.** A root-node creation/move triggers a language-side move of the tap back to root tail. There can be a short gap before that repair; external routing/order changes may invalidate the assumed mix. Two such independently managed root-tail taps could repeatedly move each other. This manifest allows one looper; scaling the technique calls for one host-owned output tap and a defined master output group.
7. **No sustained stress evidence.** These measurements did not exercise prolonged memory stability, a heavily loaded audio graph, device disconnect/reconnect, deliberate process crashes or timing/continuity of every audio block. Short passing lifecycle checks are evidence for the demo, not a production reliability guarantee.

## Assessment and next work

Keep this as a working proof. There is no reason to abandon shared memory: audio-side work is bounded and small, and ordinary resource cleanup works. The expensive part is the current UI delivery/rendering, and the largest stability gap is recovery/ownership across process failure.

Before making it reusable infrastructure, prioritize:

1. Binary sample delivery with bounded latest-snapshot queues; skip serialization when there are no subscribers and draw only new data or changed zoom/gain. Preserve freshness/status separately. Closing/pausing scopes should have an explicit work policy.
2. One host-owned mic/output tap with reference-counted subscribers and centralized node ordering, rather than per-instrument taps competing at root tail.
3. Epoch/heartbeat validation, interprocess reader ownership and safe crash/reboot cleanup. Include SC-version/build identity in attachment checks rather than relying only on matching source at build time.
4. A sustained soak under a representative loaded audio graph, with CPU/memory/dropout measurements, deliberately stalled UI, crash/reboot and interface-change tests. Then address broader instrument features such as stereo, variable length and click-free boundaries.

This original zoom assessment preceded the binary scope transport change. Binary scope delivery and bounded outstanding frames are now implemented; recovery remains open. The loop-waveform SSE path still needs its own backpressure policy.

## Follow-up: isolated components and Qt

[COMPONENT_COSTS.md](COMPONENT_COSTS.md) adds a minimal-app sweep without Studio/Field, one-viewer
cases, lower sample/update counts, capped painting and matched SC Qt ScopeView measurements.
It separates the earlier shell-wide figures from component cost and quantifies binary encoding.
[GUIDE.md](GUIDE.md) explains implementation and reuse.
