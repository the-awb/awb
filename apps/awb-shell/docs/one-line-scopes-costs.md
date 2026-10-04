# One-line scope: actual shell versus direct capture — 2026-10-02

This test captures **one mono SC audio channel**, not six source channels with one selected for drawing. It compares the current native source directly with the same source through `SignalCaptureBroker`, using identical reduction, transport, browser history and 30 fps painting. It runs both inside the **actual shell** and inside a minimal Electron host.

Actual-shell idle: **1.9% of one core**. One drawn mono line through the broker: **28.0% total Electron CPU**, versus **27.7% direct**. Broker-minus-direct means are **+0.31 CPU percentage points total** and **+0.16 main**, with paired total differences spanning **-0.33 to +0.97**. Capture-only total difference: **-0.19 points**. Interpret small differences against the individual and paired repeat ranges below; these are not framework multipliers or statistical confidence intervals.

## Method

- Five cases per host, four repetitions each: 40 measured phases, plus two five-case smoke runs. Forward order on repetitions 1/3 and reverse on 2/4. Each case settles 2 seconds and samples 12 seconds. Minimal and full-shell runs are sequential; the within-host direct/broker comparison alternates order. Cross-host differences are indicative, not a simultaneous controlled comparison of shell code alone.
- Mono private bus 32 carries a 113.37 Hz sine with 1.37 Hz amplitude variation from 0.03 to 0.10. It never goes to hardware output. One mono source generator remains active during idle/capture/viewer cases. No looper, control/noise stream, Lissajous, Field or Studio tool view is launched. The full shell's normal Home and hidden render-worker remain loaded, with no render jobs. No live user host is restarted.
- Both routes use the installed `openScSignalSource`, matching SC tap/reader and 4 ms polling. SC publishes 512 audio frames with an additional private clock channel, removed by the native reader. Both join pairs into 1,024-frame scope chunks and perform the same peak/RMS transform. Both use the same v5 selected-channel transport, immediate ACK/history append, cached grid and 30 fps painter. The scope uses an instrumented copy of the production mono GUI at 620 × 240 CSS pixels/DPR 1 and 1× zoom. Only diagnostics, plot dimensions and private-source captions are added to that GUI.
- **Direct** bypasses `SignalCaptureBroker` and its source/profile registries; it does not replay the historical `scopeview.node` reader or old JSON/SSE bridge. This isolates the current broker path, not all historical architectural changes. There is no new native build and no production implementation change.
- The actual shell is a disposable copy of current `shell/main.mjs`, with a test-only entry hook after Home readiness and a private SC producer inserted inside its bootstrap evaluation block. It uses the real shell SC supervisor, services, existing capture broker and normal headless host/authentication. The measured scope backend is a minimal trusted adapter to private bus 32, not a launched Shared Loop instrument (which would add a looper and its polling). The shell's tool catalogue is loaded, but no catalogue tool view is opened. User startup/extensions remain part of the full-shell language environment.
- The minimal host uses stock SC classes with a test-only localhost/token authentication shim and stock UGen search path; it skips user startup. The shell uses its normal library/plugins. Their language-process memory and startup differ; sclang and scsynth CPU are recorded separately from Electron totals.
- `minimal` measured SC at **48.0 kHz**, block **64**, Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz, Electron 44.4.1 / embedded Node 24.21.0. Neither fixture sets a sample-rate or audio-device preference. The user's normal 44.1 kHz configuration was not set to 48 kHz in code; this is evidence at the test host's measured rate, not a measured 44.1 kHz result.
- `shell` measured SC at **48.0 kHz**, block **64**, Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz, Electron 44.4.1 / embedded Node 24.21.0. Neither fixture sets a sample-rate or audio-device preference. The user's normal 44.1 kHz configuration was not set to 48 kHz in code; this is evidence at the test host's measured rate, not a measured 44.1 kHz result.
- CPU is cumulative process-clock CPU from macOS `ps`; **100% is one CPU core**. Totals include main, all current renderers (including Home/worker in shell mode), GPU and utility processes. GPU-process CPU is not GPU hardware utilisation. macOS WindowServer, power and hardware GPU load are unmeasured. RSS sums process resident sets and can double-count shared pages. Status sampling/instrumentation is present in all cases, including idle. Short sequential measurements are subject to scheduler, thermal, background and warm-cache variation.

## Total Electron CPU

Cells show mean and observed four-repeat range, as percentages of one core.

| Case | Minimal host | Actual shell |
| --- | ---: | ---: |
| Idle, no capture/viewer | 0.3 (0.3–0.4) | 1.9 (1.8–1.9) |
| Mono capture, direct | 4.7 (4.5–5.0) | 6.7 (6.1–7.2) |
| Mono capture, broker | 4.7 (4.5–4.9) | 6.6 (6.1–6.9) |
| Mono scope, direct, 30 fps | 25.9 (24.5–27.5) | 27.7 (27.2–28.0) |
| Mono scope, broker, 30 fps | 25.9 (25.3–26.6) | 28.0 (27.7–28.2) |

## Actual-shell CPU components

Means; Electron totals include utility/helper CPU beyond the listed columns.

| Case | Main | Scope renderer | Home/worker renderers | GPU process | Total | Above idle total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Idle, no capture/viewer | 0.5% | 0.0% | 0.5% | 0.9% | 1.9% | 0.0 points |
| Mono capture, direct | 5.3% | 0.0% | 0.5% | 0.9% | 6.7% | 4.9 points |
| Mono capture, broker | 5.2% | 0.0% | 0.5% | 0.9% | 6.6% | 4.7 points |
| Mono scope, direct, 30 fps | 6.8% | 9.4% | 0.4% | 9.5% | 27.7% | 25.8 points |
| Mono scope, broker, 30 fps | 7.0% | 9.5% | 0.4% | 9.5% | 28.0% | 26.1 points |

## Paired broker-minus-direct differences

Each difference pairs the same repetition in the same process/SC host. Signs indicate observed additional CPU for the broker; negative means lower observed CPU.

| Host / workload | Total mean | Total observed range | Main mean | Main observed range |
| --- | ---: | ---: | ---: | ---: |
| minimal / capture | +0.00 | -0.40 to +0.26 | -0.04 | -0.40 to +0.26 |
| minimal / scope | -0.01 | -1.15 to +1.21 | -0.10 | -0.62 to +0.32 |
| shell / capture | -0.19 | -0.41 to -0.00 | -0.11 | -0.25 to +0.08 |
| shell / scope | +0.31 | -0.33 to +0.97 | +0.16 | -0.16 to +0.55 |

## Freshness, transport and SC

Only available SC publications enter history; the feed is not a lossless recorder. Source gaps are missing audio samples over each measured interval and remain represented in history. Sampled source lag is received source end minus painted source end, not end-to-end microphone latency.

| Host / case | Raw chunks/s mean | Browser packets/s mean | Paints/s mean | Maximum paint interval ms | Largest sampled endpoint lag ms | Missing source samples range | Scope KiB/s mean | SC audio CPU mean | Largest SC peak |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| minimal / capture-direct | 93.6 | — | — | — | — | 1024–3072 | 0.0 | 0.131% | 3.11% |
| minimal / capture-broker | 93.2 | — | — | — | — | 3072–8704 | 0.0 | 0.132% | 0.55% |
| minimal / scope-direct | 93.3 | 46.4 | 30.0 | 66.8 | 21.3 | 2048–6656 | 191.3 | 0.130% | 0.56% |
| minimal / scope-broker | 93.5 | 46.5 | 30.0 | 51.1 | 21.3 | 0–7168 | 191.7 | 0.134% | 0.61% |
| shell / capture-direct | 93.9 | — | — | — | — | 0–512 | 0.0 | 0.135% | 0.36% |
| shell / capture-broker | 93.7 | — | — | — | — | 0–4096 | 0.0 | 0.138% | 0.71% |
| shell / scope-direct | 93.7 | 46.7 | 30.0 | 66.8 | 42.7 | 1024–4096 | 192.3 | 0.135% | 0.45% |
| shell / scope-broker | 93.8 | 46.8 | 29.9 | 67.7 | 42.7 | 0–2560 | 192.7 | 0.135% | 0.49% |

## Memory

Summed Electron RSS means, MiB; not unique physical memory and not a clean-start allocation profile.

| Case | Minimal host | Actual shell |
| --- | ---: | ---: |
| Idle, no capture/viewer | 198 | 376 |
| Mono capture, direct | 199 | 375 |
| Mono capture, broker | 200 | 377 |
| Mono scope, direct, 30 fps | 313 | 475 |
| Mono scope, broker, 30 fps | 314 | 474 |

## How this relates to the earlier 12% figure

The [historical binary stereo result](../../../tool-artifacts/shared-loop/0.1.0/BINARY_TRANSPORT.md) reported 3.52% main + 8.99% renderer = **12.51%**, and explicitly did **not** measure GPU/helper CPU. It also used a different reader, capture/delivery cadence and pre-rolling-history implementation. It cannot be compared directly with a modern total.

The current mono shell-broker case has **7.0% main + 9.5% scope renderer = 16.5%** before its **9.5% GPU-process CPU**, background renderer and remaining helpers bring it to **28.0%**. Thus broader accounting explains a substantial part of the apparent increase; it does not explain every backend difference. The current direct/broker pair is the evidence for broker overhead. This test does not identify the historical main-process increase's exact cause.

## Validation and limits

- Both five-case smoke runs and all 40 full phases pass. Each visible case is verified mono at source and browser, with correct rate/chunk/physical channel ID, binary-v5 transport, live connection, advancing clocks, changing canvas pixels and a sandboxed renderer. Broker cases retain exactly one physical source; visible broker cases retain one derived profile. Direct cases allocate no broker source/profile. Capture/viewer cleanup restores each host's pre-case SC synth/group count and leaves broker polling stopped; the owned host remains connected until normal runner shutdown.
- Both full runs re-read and match 136 protected production/native/audio/SC/Lissajous/historical evidence files. Production source files and native builds are unchanged. Guard manifests and source hashes are retained in raw results. No physical microphone/speaker, long soak, loaded graph, xrun, latency, core-placement or multi-subscriber scaling test is implied.
- Initial fixture smoke attempts failed before measurement: one Electron ready/module-load wait issue, a minimal-host plugin warning treated as failure, and full-shell SC bootstrap code appended outside its evaluation block. The disposable harness was corrected and owned processes cleaned up. Those failed attempts are not used for CPU conclusions. No production startup or plugin configuration was fixed or changed.
- The actual shell's existing SC extension/plugin warnings remain visible in its test logs. Successful measured phases establish only this small private-bus workload, not general plugin health.

## Reproduction and retained evidence

With Node 22 first in PATH, from AWB, run sequentially without concurrent tests/builds:

```sh
node apps/awb-shell/test/signal-bench/one-line/run.mjs --mode=minimal --smoke
node apps/awb-shell/test/signal-bench/one-line/run.mjs --mode=shell --smoke
node apps/awb-shell/test/signal-bench/one-line/run.mjs --mode=minimal --seconds=12
node apps/awb-shell/test/signal-bench/one-line/run.mjs --mode=shell --seconds=12
```

The runner snapshots sources and owned user-data/SC ports into a temporary fixture. Output is `/private/tmp/awb-one-line-{minimal,shell}[-smoke].json`; fixture files are removed on completion. No live host/tool is used. Direct polling is 4 ms to match the broker; 30 fps only limits painting, not incoming capture.

- [Minimal-host full raw results](../test/signal-bench/results/one-line-minimal-2026-10-02.json)
- [Actual-shell full raw results](../test/signal-bench/results/one-line-shell-2026-10-02.json)
- [Means, ranges and paired deltas](../test/signal-bench/results/one-line-summary-2026-10-02.json)
- [Evidence and harness SHA256 manifest](../test/signal-bench/results/one-line-environment-2026-10-02.json)
- [Minimal smoke](../test/signal-bench/results/one-line-minimal-smoke-2026-10-02.json), [actual-shell smoke](../test/signal-bench/results/one-line-shell-smoke-2026-10-02.json)
- [Runner](../test/signal-bench/one-line/run.mjs), [measurement](../test/signal-bench/one-line/measure.mjs), [private SC source](../test/signal-bench/one-line/producer.scd)
- [Shared signal engine](shared-signal-engine.md), [cadence comparison](scope-cadence-costs.md), [earlier six-channel selected-delivery comparison](scope-optimisation-costs.md)

Changes are uncommitted on `design/score-studio-layout`. This is measurement tooling and documentation only. Vault/Telegram MCP tools were unavailable; no direct vault file write was made.
