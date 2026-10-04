# Rolling scopes and source provenance

Wide zoom now assembles short chunks in a bounded browser ring. SC keeps capturing 1,024 audio samples or 32 control values per publication. The native reader reduces each chunk to min/max bins at ¼× or ¹⁄₁₆×; the browser retains consecutive chunks and scrolls through the composite window. A larger display no longer waits for a giant SC capture to finish. Inward 2×/4×/8× still crops the baseline window and supports frozen panning.

| Zoom | Audio composite window | Audio displayed points/bins | Control composite window | Control displayed points/bins |
| --- | ---: | ---: | ---: | ---: |
| 1× | 1,024 samples / 21.33 ms | 1,024 raw | 128 values / 170.67 ms | 128 raw |
| ¼× | 4,096 samples / 85.33 ms | 1,024 min/max | 512 values / 682.67 ms | 128 min/max |
| ¹⁄₁₆× | 16,384 samples / 341.33 ms | 1,024 min/max | 2,048 values / 2,730.67 ms | 128 min/max |

These durations illustrate 48 kHz audio and a 64-sample server block. Actual rates come from the existing shell host; no device or sample-rate option is changed. Audio publishes about 46.875 chunks/s and control about 23.438 chunks/s at these rates, at every outward zoom setting. The scope collector polls every 8 ms; the stored-loop summary keeps its separate 33 ms poll. Cached native read slots are not recopied or resent until a new publication or reduction setting appears.

The counter at the end of each scope chunk identifies its source interval. The ring places chunks by source frame index, not arrival time or polling sequence. Duplicate/out-of-order chunks are ignored. Missing chunks become NaN gaps; the UI states filling/gaps instead of compressing lost time. Freeze holds an owned composite snapshot while collection/acknowledgements continue. Changing outward resolution clears the history and resumes a frozen viewer; it needs one window of fresh chunks to fill. Reconnect also clears history.

This is a peak-preserving display summary, not an anti-aliased signal for playback/spectral analysis. Peak/RMS meters describe the latest full source chunk, not the whole rolling history. Constant control buckets retain held horizontal extents; other min/max bins show vertical ranges. Rendering remains Canvas2D at animation-frame cadence.

## Where the signals come from

The scope buffers are private exchange buffers allocated by sclang, distinct from the ordinary recorded-loop Buffer:

- **Mic:** `SoundIn.ar(0)`, raw hardware input 1 before the looper's input gain, independent of test-tone selection.
- **Output:** `In.ar(0, 2)` in an ordered root-tail tap, final stereo hardware output bus mix including other SC instruments.
- **Control:** demo generators explicitly added in [sc/build-def.scd](sc/build-def.scd), written to six private buses allocated with `Bus.control(server, 6)`. These are not existing application control buses discovered automatically.
- **Stored-loop waveform:** the custom SharedLooper UGen's min/max summary of its ordinary mono SC Buffer, including overdubs; this is a separate shared-memory producer.

The control channel order is 1 Hz sine, 10 Hz sine, then independent held-noise signals at nominal 1/5/20/100 Hz:

```supercollider
Out.kr(controlBus,
    [SinOsc.kr(1), SinOsc.kr(10)] ++ LFNoise0.kr([1, 5, 20, 100]));
```

[LFNoise0](https://doc.sccode.org/Classes/LFNoise0.html) produces random held values at quantized update rates. It is stepped low-frequency noise, not audio WhiteNoise. `In.kr(controlBus, 6)` captures actual control-bus values without K2A conversion or browser-generated samples. Signal selection changes drawing and selected-channel meters only; all six channels remain captured/transmitted. These signals do not modulate the looper or enter audio output.

## Short captures and source clock

The compiled tap uses an extra private counter channel for each scope:

```supercollider
var audioClock = Phasor.ar(0, 1, 0, 4194304);
var controlClock = Phasor.kr(0, 1, 0, 4194304);
ScopeOut2.ar([SoundIn.ar(0), audioClock], micScope, 2048, 1024);
ScopeOut2.ar(In.ar(0, 2) ++ [audioClock], outScope, 2048, 1024);
ScopeOut2.kr(In.kr(controlBus, 6) ++ [controlClock], controlScope, 256, 32);
```

Allocate physical ScopeBuffer channel counts 2/3/7 for mic/output/control. The native reader strips the last channel, returning visible counts 1/2/6. The counter never goes to audio output. It is exactly representable as Float32 and wraps every 4,194,304 source frames (about 87.4 seconds at 48 kHz audio). Native code unwraps ordinary wraparound into a Float64 exclusive `sourceEnd`. This is a tap-local source clock, not UTC or the global SC timeline. A consumer stalled for a whole counter period can lose the number of wraps; restarting a tap without a new instrument identity is unsupported. Epoch/reboot recovery remains future work.

SC's exchange is latest-block, single-reader, not a reliable producer queue. The faster poll and source stamps make ordinary contiguous history possible but cannot guarantee every chunk under load. The bounded ACK transport intentionally drops intermediate chunks for a slow viewer; gaps expose that loss. Keep scope indices private and fan out Node-owned copies; never attach Qt and Node readers to one index concurrently.

## Current binary protocol

Subprotocol **awb.scope.v4**, **104-byte header**. v1/v2/v3 readers must be updated. Multibyte fields are little-endian:

| Offset | Type | Meaning |
| ---: | --- | --- |
| 0 | uint32 | Magic, bytes SCOP |
| 4 | uint16 | Version 4 |
| 6 | uint8 | Kind: 0 mic, 1 output, 2 control |
| 7 | uint8 | Visible channels: 1/2/6 |
| 8 | uint32 | Points/bins per channel in this chunk |
| 12 | uint32 | Poll sequence at publication observation |
| 16 | float64 | Source rate: audio or control |
| 24 | 6 × float32 | Per-channel full-chunk peaks |
| 48 | 6 × float32 | Per-channel full-chunk RMS |
| 72 | uint32 | Instrument identity |
| 76 | uint32 | Raw source frames per chunk: 1,024 audio / 32 control |
| 80 | uint32 | Flags: bit 0 min/max, bit 1 control |
| 84 | uint32 | Server block size |
| 88 | float64 | Actual audio sample rate |
| 96 | float64 | Exclusive unwrapped source frame counter |
| 104 | Float32 payload | Planar channels, raw points or min/max pairs per bin |

Codec validation covers rates, dimensions, kind, version, levels, identity, source clock and exact packet length. `POST /api/scope-view` accepts `{kind: 'mic'|'output'|'control', zoom: 1|0.25|0.0625}`. It sets only the corresponding native reduction step 1/4/16; it no longer sends `/n_set` to change capture length. The host owns scope allocations, six control buses and the writer synth. Native `attach(port, mic, output, control)` validates physical channel counts; three arguments support audio-only consumers. There is one shell viewer/setting per kind. Multiple standalone viewers share the reduction setting.

Use [public/scope-history.js](public/scope-history.js) with the codec when embedding: `ScopeHistory(baseFrames)` takes 1,024 for audio or 128 for control, `append(packet)` places chunks, and `view(span)` returns an owned immutable composite. Source clocks, rates, generation, reduction and channel layout must travel together. The ring clears when this identity changes. This is bounded display memory, not recording storage.

## Current calculated costs and limits

At 48 kHz / block size 64, these application byte budgets include headers but exclude ACKs/WebSocket/TCP framing and missing chunks:

| Mode | Bytes per publication | Calculated bytes/s | Source publications/s |
| --- | ---: | ---: | ---: |
| Audio pair, 1× | 12,496 | 585,750 (0.559 MiB/s) | 46.875 per kind |
| Audio pair, ¼× | 6,352 | 297,750 (0.284 MiB/s) | 46.875 per kind |
| Audio pair, ¹⁄₁₆× | 1,744 | 81,750 (0.078 MiB/s) | 46.875 per kind |
| Six control channels, 1× | 872 | 20,438 (19.96 KiB/s) | 23.438 |
| Six control channels, ¹⁄₁₆× | 200 | 4,688 (4.58 KiB/s) | 23.438 |

The wider audio view preserves the old wide mode's approximate transport budget while updating every short chunk instead of roughly three times/s. Baseline audio delivery is higher than the original 30 Hz binary run because it now follows every short capture. The extra polling/counter copies and browser ring have real cost; earlier CPU measurements cannot establish current costs.

Triple-slot raw scope sample capacity is now 144,384 bytes for all three scopes, compared with 737,280 bytes in the giant-capture six-channel version. These are payload capacities, not RSS/private RAM. Browser rings are bounded to 16 baseline windows and shrink their bin capacity as resolution decreases; view construction still allocates owned snapshots. Electron process/GPU overhead remains. Normal source-counter wrap handling is implemented; prolonged stalls, crash/reboot/device change and sustained-load stability have not been certified.

## Isolated rolling measurement

[Raw rolling results](tests/rolling-results-2026-10-01.json), 2026-10-01: Intel i7-8700B, macOS, SC 3.12.2, actual 48 kHz / block size 64. Minimal Electron/SC only, no Field/Studio/shell services. Two-second settling, approximately 5.1-second sequential measurement phases, quiet deterministic bus probes, active painting with background throttling disabled and display gain 16. Audio windows 720 × 520; six-channel control window 720 × 640. The looper was paused during scope phases. All three scope writers/readers remained active; “one” means one visible/subscribed scope, not an isolated one-channel producer.

| Visible scopes | Binary payload rate | Main CPU, one core | Combined visible renderer CPU, one core |
| --- | ---: | ---: | ---: |
| Mic, 1× | 196.1 KiB/s | 5.07% | 8.78% |
| Stereo output, 1× | 387.3 KiB/s | 6.24% | 11.12% |
| Audio pair, 1× | 581.2 KiB/s | 5.27% | 18.35% |
| Audio pair, ¹⁄₁₆× | 82.0 KiB/s | 4.87% | 15.20% |
| Six control lanes, 1× | 20.3 KiB/s | 3.52% | 7.82% |
| Six control lanes, ¹⁄₁₆× | 4.64 KiB/s | 4.09% | 7.79% |

Wide audio retained about 48 observed packets/s per kind in this short run versus roughly three/s in the giant-capture version. Wide control retained about 24 packets/s versus less than one/s. Endpoint counting gives slight differences from theoretical capture cadence. Wide audio used about 86% less payload than current raw 1×, with approximately 17% less renderer CPU in this sweep. Main CPU varied much less; the regular poll and Canvas/process overhead remain. Sequential/JIT variance means single-viewer numbers cannot predict incremental CPU savings. SC reported average audio CPU was 0.18–0.21% during scope phases versus 0.145% idle; no sustained-load or dropout claim follows.

Current encoding microbenchmark: raw pair 12,496 bytes and about 12.14 µs to encode, versus 67,171 JSON bytes and about 239.68 µs (about 20× encoding time). This is encoding alone, not end-to-end latency or zero-copy. Main RSS was about 139–141 MiB after warm-up; wide audio renderer RSS was about 92/98 MiB, control about 89 MiB. RSS includes shared pages. GPU/helper CPU, private memory and confidence intervals are unmeasured. Timer resolution is about 0.2 process-CPU percentage points over these phases. No new Qt comparison was performed; the historical no-counter comparison below remains separate.

For idle connection, live-feed-without-paint and 1/4/6 drawn control lane costs, see [CONTROL_COSTS.md](CONTROL_COSTS.md). This separates display increments with a fixed six-channel feed; it does not claim a control-only native backend.

## Focused validation and activation

The matching addon and SynthDefs were rebuilt in the installed artifact. **Restart the shell and its owned SC host**, then reopen Shared Loop. Existing sessions have the old physical scope layout. This work does not restart the user's live server.

```sh
npm test --prefix tool-artifacts/shared-loop/0.1.0
npm run test:shared-loop --workspace @awb/desktop-shell
node tool-artifacts/shared-loop/0.1.0/tests/run-component-bench.mjs --rolling-only
node tool-artifacts/shared-loop/0.1.0/tests/run-component-bench.mjs --control-cost-only
```

All 14 unit/protocol/socket/history tests pass. History tests cover ring wrap, missing intervals/duplicates, immutable frozen snapshots, planar channel layout and identity/resolution resets. The real Electron gate passed short native/binary chunks, multi-publication composite fill, exact time-axis durations, independent mic/stereo bus probes, 1/10 Hz control LFO crossings, four independent bounded noise channels, frozen signal selection, zoom/pan, sandboxing, close/reopen and reader/writer/window cleanup preserving an unrelated test SC node and the shared host. Screenshots of all three wide scopes were visually inspected. No Field, Studio or unrelated tool is launched. Physical microphone/speaker behavior and loaded long-run stability remain separate checks.

The optional benchmark owns only minimal Electron/SC processes; default includes isolated looper phases, `--binary-only` audio scope phases, and `--rolling-only` (or compatibility alias `--wide-only`) adds wide audio/control phases. It now writes `/private/tmp/awb-rolling-results.json`. Removed variable-capture-size/Qt phases were valid for the historical layout only: the extra counter channels would invalidate a direct Qt comparison. Historical raw data below remains unchanged.

## Isolated cost comparison — earlier mono-control configuration

These retained results measure the earlier v2 mono-control display, not the new six-channel array.

[Raw results](tests/wide-results-2026-10-01.json), captured 2026-10-01: Intel i7-8700B, macOS, SC 3.12.2, actual 48 kHz/64-sample blocks. Minimal test-owned Electron/SC only, no Studio/Field or shell services. Two-second settling and approximately five-second measured intervals, sequential phases. Display 2560 × 1415; scope windows 720 × 520, Canvas height 160. Benchmark painting is explicitly kept active with background throttling disabled and display gain 16; the ordinary control GUI defaults to gain 1. Cosmetic control meter/ruler/status fixes followed this sweep and do not change capture/transport; these are indicative short-run costs, not a precise forecast for every displayed waveform.

| Mode | Application bytes/s | Completed packets/s | Node main CPU | Renderer CPU, one core |
| --- | ---: | ---: | ---: | ---: |
| Both audio scopes, 1× | 370,369 (0.353 MiB/s) | 59.66 combined | 3.10% | 18.01% combined |
| Both audio scopes, ¹⁄₁₆× | 77,187 (0.074 MiB/s) | 6.25 combined | 0.98% | 8.98% combined |
| Control only, 1× | 3,378 (3.30 KiB/s) | 5.86 | 1.17% | 6.65% |
| Control only, ¹⁄₁₆× | 3,227 (3.15 KiB/s) | 0.39 | 1.17% | 7.04% |

Widest audio delivery used approximately **79% fewer bytes than binary 1×**, with about half the combined renderer CPU in this run. It carries a 16× longer time span per frame, with min/max buckets and much slower completed-capture cadence. This trades freshness and individual sample detail for width. Drawing still runs at animation-frame cadence; cached captures eliminate repeated sample delivery, not all drawing.

For one audio scope at 1×, mic renderer used 8.60% and stereo 9.97%; main was 5.08%/7.04% respectively in these earlier phases, higher than the later two-viewer phase. Sequential warm-up/JIT variance matters; do not infer that adding a viewer saves CPU. The small control payload does not eliminate the Canvas/process overhead: its renderer remained roughly 7%. The control-wide phase contains only two publications in the measurement interval, so its measured Hz has coarse endpoint error.

SC audio CPU averaged approximately 0.14–0.17% in these cases. The wide value is not a reliable isolated DSP-saving estimate. Main RSS was about 135 MiB after warm-up; the two wide renderers were about 84 and 87 MiB, and the control renderer about 76–81 MiB. RSS includes shared pages and is not private physical RAM. Chromium helper/GPU CPU is unmeasured. The process CPU timer resolution is 0.01 s (about 0.2 percentage points over five seconds), with no repeated-trial confidence intervals or long soak.

`traffic` records actual binary/status/ACK application counters, excluding WebSocket/TCP framing; steady status traffic was zero. `wireBytesPerSnapshot` reconstructs equivalent JSON for comparison and is not actual transport traffic. The final encoding microbenchmark in this sweep uses the **wide audio pair**, not the raw v1 pair: 24,704 packet bytes, about 15.8 µs encoding, versus 133,793 JSON bytes / 494.2 µs. Historical v1 baseline figures remain in BINARY_TRANSPORT.md.


[Multichannel audio measurements](AUDIO_CHANNEL_COSTS.md) compare 1/2/4/6 drawn audio lanes
from a fixed six-channel SC feed, in raw and wide modes. The isolated fixture leaves the
normal stereo instrument and live host unchanged; it is measurement tooling, not a deployed
arbitrary-channel scope API.


[Canvas/window comparison](LAYOUT_COSTS.md) measures 1/2/4/6 control and audio lanes in raw/wide
views on one canvas, separate canvases in one window and separate windows. The 71-phase
isolated fixture includes GPU-process/helper CPU and retains equal total waveform area.
Separate canvases share feed/history; separate windows duplicate full-feed processing.
Production scope files and the live host are unchanged.


[Current native Qt comparison](QT_COSTS.md) pairs stock ScopeView and the binary rolling browser
path at approximately 30 Hz, fixed waveform area, short/wide control/audio spans and
one/six lanes. The 58-phase run includes Electron GPU/helper CPU, repeat ranges, memory,
freshness differences and retained screenshots. Wide native captures are not equivalent
to continuously updated browser history. Production runtime and the live host are unchanged.
