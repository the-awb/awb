# Component costs: looper, scopes, Electron and Qt

This table records the earlier JSON/SSE implementation. Initial binary scope delivery was measured in [BINARY_TRANSPORT.md](BINARY_TRANSPORT.md); current rolling behavior is described in [WIDE_SCOPES.md](WIDE_SCOPES.md). These CPU figures predate rolling history; the raw JSON baseline below is retained for comparison.

Measured 2026-10-01 on Intel Core i7-8700B / macOS, SC 3.12.2, actual 48 kHz. This complements [ASSESSMENT.md](ASSESSMENT.md), whose first measurements included Field and shell services. These measurements use a minimal Electron process and isolated sclang/scsynth, with no Toolkit Home, Field, Score Studio or AWB host services in the benchmark. No live server is restarted.

The current component harness writes rolling results and no longer runs the obsolete variable-capture or Qt phases. Commands below describe the original measurement; see [WIDE_SCOPES.md](WIDE_SCOPES.md) for current commands and measured rolling scope costs.

## Method and limits

Each phase settles for two seconds and samples 20 SC status replies over about five seconds. CPU process deltas come from macOS `ps` cumulative time; **100% means one CPU core**. SC's reported audio CPU uses its own metric and is shown separately. Roughly 0.2 percentage-point process increments reflect the short run/time-counter resolution; do not interpret two decimal places as precision.

A four-second mono loop is recorded with output gain zero before playback measurements. The scope phases pause the loop synth and use deterministic low-level mic/stereo bus probes. Both scopes' SC tap runs in a one-viewer phase, and this native reader polls both indices even when only one browser subscribes. Thus “one scope” isolates one viewer/subscriber, not a custom single-channel-only SC tap/native reader. Quiet probes remain running in the idle baseline; it is not an empty SC graph.

The windows use the actual demo HTML/JS/CSS and sandbox settings. Scope windows are side by side; benchmark-only `backgroundThrottling:false` prevents occlusion from silently eliminating a renderer's work. This follows Electron's documented [macOS occlusion/visibility behavior](https://www.electronjs.org/docs/latest/api/browser-window#page-visibility). The display work area was 2560 × 1415 pixels. The first trial's overlapped two-scope results were discarded.

Qt uses the installed SC ScopeView, the same SC scope indices, the same sample/channel counts, overlay/no-fill plotting and a roughly comparable 628 × 160 canvas. All Node readers are detached before Qt attaches. Qt's timer is explicitly 33 ms; the matched source's default is 50 ms. Electron receives at 33 ms but normally paints at animation-frame cadence (about 60 Hz on this display). The separate paint-capped case limits callbacks to 30 Hz in the test renderer; this is not a shipped display setting.

The final sweep ran without a concurrent integration test. CPU/RSS phases are sequential, warm state is reused, and there are no repetitions/confidence intervals or long soak. GPU, WindowServer, Chromium helper process costs and unique physical RAM are not measured. It compares these implementations, not an intrinsic Electron/Qt framework multiplier.

## CPU results

“Renderer” is the sum of active measured demo renderer processes. “sclang/Qt” is the language process, where Qt draws. Electron main still exists, mostly idle, during Qt cases; a real Qt-only path does not require it. SC audio CPU should not be added to process CPU.

| Case | SC reported audio CPU | Electron/Node main | Renderer CPU | sclang/Qt CPU |
| --- | ---: | ---: | ---: | ---: |
| `idle-server-no-bridge-no-viewer` | 0.150% | 0.39% | 0.00% | 0.20% |
| `looper-playing-node-reader-no-viewer` | 0.216% | 1.56% | 0.00% | 0.00% |
| `looper-playing-one-gui-no-scopes` | 0.213% | 2.54% | 9.75% | 0.20% |
| `looper-overdub-node-reader-no-viewer` | 0.295% | 1.56% | 0.00% | 0.20% |
| `scope-tap-node-reader-no-viewer` | 0.170% | 1.76% | 0.00% | 0.00% |
| `one-mic-1024-30hz` | 0.172% | 2.54% | 9.76% | 0.20% |
| `one-stereo-output-1024-30hz` | 0.171% | 2.93% | 10.16% | 0.00% |
| `two-scopes-1024-30hz` | 0.165% | 3.07% | 18.99% | 0.00% |
| `two-scopes-1024-30hz-paint-capped-30hz` | 0.148% | 2.54% | 13.86% | 0.20% |
| `two-scopes-1024-15hz` | 0.159% | 1.56% | 14.85% | 0.00% |
| `two-scopes-256-15hz-shorter-window` | 0.170% | 1.17% | 15.03% | 0.20% |
| `qt-idle-tap-running-no-node-reader` | 0.174% | 1.37% | 0.00% | 0.20% |
| `qt-one-mic-1024-30hz` | 0.165% | 0.39% | 0.00% | 2.93% |
| `qt-one-stereo-output-1024-30hz` | 0.174% | 0.39% | 0.00% | 3.13% |
| `qt-two-scopes-1024-30hz` | 0.173% | 0.20% | 0.00% | 4.30% |

The looper adds about 0.07 percentage points to SC average audio CPU during playback and about 0.15 during overdub versus the probe baseline. Playback plus Node polling without a GUI uses about 1.6% of one core in main; adding the loop GUI adds about 9.8% in its renderer. The mic renderer alone is about 9.8%, stereo about 10.2%, plus 2.5–2.9% main including the native pair reader. Both Electron scopes use about 19% renderer plus 3.1% main.

Qt is about 2.9% language/GUI CPU for mic, 3.1% for stereo, and 4.3% for two scopes. The language baseline is about 0.2%. For the original JSON Electron scope path, two visible scopes are therefore roughly five times the process CPU of the Qt drawing path in this short run. At matched 30 Hz paint cadence, Electron's two renderers fall to about 13.9%, with about 2.5% main: still roughly four times Qt. These are approximate **original path comparisons**, including JS/DOM/JSON versus native ScopeView drawing; they are not a prediction for an optimized Electron renderer or every machine.

## Lower time resolution

| Setting | Main CPU | Two renderer CPU | Approx. scope JSON MiB/s |
| --- | ---: | ---: | ---: |
| 1,024 samples, 30 Hz delivery | 3.07% | 18.99% | 1.92 |
| 1,024 samples, 30 Hz delivery + capped painting | 2.54% | 13.86% | 1.92 |
| 1,024 samples, 15 Hz delivery | 1.56% | 14.85% | 0.96 |
| 256 samples, 15 Hz delivery | 1.17% | 15.03% | 0.25 |

Halving delivery rate approximately halves network payload and cuts main work, but does not halve renderer CPU: the ordinary renderer still redraws at animation-frame cadence. Capping drawing helps more directly. Reducing samples cuts payload further, but the 256-frame case spans **5.33 ms instead of 21.33 ms** at 48 kHz; it is a shorter window, not the same duration at lower sample resolution. Its SC storage capacity remains 2,048 frames/channel and the tap copies audio continuously.

For a same-duration 256-point display, decimate/resample or publish min/max buckets across the original block. That has not been implemented/measured in this sweep. Min/max buckets help retain transient peaks. Plain point dropping can alias or miss them. At 15 Hz delivery, raw binary 256-point × three-channel samples would be about 45 KiB/s, excluding headers; min/max pairs would double that payload. Those figures are calculated budgets, not a measured end-to-end binary GUI.

## Memory

The isolated mic and stereo Electron renderer RSS were about 82 and 88 MiB. Two together were about 171 MiB of summed renderer RSS, plus main (~134 MiB), sclang (~201 MiB), scsynth (~32 MiB) and unmeasured Chromium/GPU helpers. Summing RSS double-counts shared pages; this is not unique resident physical RAM.

The already-running sclang process grew from about 201 MiB to about 211 MiB for one Qt scope, and 214 MiB for two: roughly 10–13 MiB incremental RSS for the Qt views. Qt reuses the existing language/GUI process. Its full 201 MiB language baseline is not free if starting from nothing. The incremental viewer comparison favors Qt strongly, but a precise memory multiplier requires shared/private memory accounting and a longer steady-state run.

## Avoiding JSON

The existing native addon already supplies `Float32Array`: C++ → N-API → Node is implemented. The original transport introduced JSON through `Array.from`, stringification and SSE. The implemented binary WebSocket path now uses those typed arrays, with a small versioned metadata header. No new audio UGen, mmap scheme or raw SC pointer exposed to the browser is needed.

The 3,000-pair encoding microbenchmark on real captured samples measured:

| Encoding operation | Time per mic + stereo pair | Sample payload per pair |
| --- | ---: | ---: |
| Array.from + JSON.stringify | 221.73 µs | 67,081 bytes |
| Buffer wrapper + owned byte copy | 8.33 µs | 12,288 bytes |
| Buffer wrapper only | 0.54 µs | 12,288 bytes |

A binary pair is 12,288 bytes versus about 67,081 bytes as JSON: **about 5.5× smaller**, or **82% fewer bytes**. At 30 Hz this is about 0.35 MiB/s instead of 1.9 MiB/s, before packet/header overhead. An explicit owned binary copy was about 27× faster than array conversion/stringification in this microbenchmark. Buffer wrapping is cheaper still but only wraps existing owned memory; neither measurement includes socket/IPC copying, browser decoding, draw cost or native read cost.

That would save approximately 0.64% of one core in encoding at 30 Hz, using these microbenchmark numbers. It does not make the entire scope 27× faster: Canvas/Chromium redraw CPU remains the largest observed cost. Replacing JSON is worthwhile for allocation/GC, bandwidth and multi-subscriber scaling; combine it with update-driven drawing, cached geometry and visibility/subscriber-aware work. Use bounded latest-frame delivery instead of building a queue behind a slow viewer.

## Reproduce and reuse

With Node 22 first in PATH, from AWB:

```sh
node tool-artifacts/shared-loop/0.1.0/tests/run-component-bench.mjs
```

Optional tooling: `tests/component-bench.mjs`, `tests/component-server.scd`, and `tests/run-component-bench.mjs`. The bridge exposes a bounded optional `updateIntervalMs` through its exported trusted `startBridge` helper; ordinary hosted/standalone launches keep 33 ms. Lower sample count is applied only to the isolated tap. Neither measurement changes the user's host, device preferences or default GUI quality.

The successful raw data is preserved in [tests/component-results-2026-10-01.json](tests/component-results-2026-10-01.json). Normal teardown unlinks the test-owned region and quits its server. The real shell looper/scope regression also passed after the optional interval addition. The [reuse guide](GUIDE.md) maps source files, ownership and adaptation options.

Binary scope delivery and bounded acknowledgement flow are now implemented. The remaining drawing optimization is to stop repainting unchanged scope snapshots and give drawing a deliberate cadence. Qt remains the cheaper measured implementation today. Replacing Electron is a product/integration decision; these costs do not require doing so.


[Current native Qt comparison](QT_COSTS.md) pairs stock ScopeView and the binary rolling browser
path at approximately 30 Hz, fixed waveform area, short/wide control/audio spans and
one/six lanes. The 58-phase run includes Electron GPU/helper CPU, repeat ranges, memory,
freshness differences and retained screenshots. Wide native captures are not equivalent
to continuously updated browser history. Production runtime and the live host are unchanged.
