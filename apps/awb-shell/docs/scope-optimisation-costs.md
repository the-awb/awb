# Shared scope optimisation costs — 2026-10-02

Shared display derivation and selected-channel delivery are implemented and measured. This is a new comparison of the shell-owned broker, not a rerun of the old Qt benchmark. Historical reports and results remain unchanged. Changes are uncommitted on `design/score-studio-layout`.

## What changed

- Compatible scope adapters now share sample joining, min/max and peak/RMS computation through `SignalCaptureBroker.subscribeDerived`. Raw PCM subscribers keep their existing API and bytes.
- Scope v5 sends only requested physical channels and caches each encoded snapshot/mask variant within a transport. Source capture width, audio/control clock, reduction steps and rendering cadence are unchanged.
- History remaps retained lanes by physical ID, leaves unavailable past values as gaps, and keeps frozen views independent.
- Reused SC ScopeBuffer slots exposed preceding-writer cached blocks. The reader now waits for a fresh compatible startup publication. **Both measured versions include this stability fix**; it is not credited as an optimisation saving.

## Method and limits

- Machine: Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz; Electron 44.4.1 (embedded Node 24.21.0). The runner/tests use Node 22.23.2. Test-owned SC selected 48 kHz from its device defaults, block size 64; no sample rate or device was forced. Control rate was 750 Hz. The user's normal 44.1 kHz system configuration was not replaced.
- 24 cases per version, two 8-second samples per case, forward then reverse order: 96 measured phases total. Baseline ran first and optimised second. The run is sequential, short and subject to background load, thermal and compositor variation; ranges are observed sample ranges, not confidence intervals.
- Minimal test-owned Electron and isolated sclang library/server. No Studio, Field Modelling, or user SC startup/extensions. A test-only authentication shim supplies the same local/token checks; the separate real-shell integration gates validate production host control.
- Private six-channel audio/control producers run in all phases, including idle and looper-only. Audio test tones are not routed to hardware output. These numbers therefore isolate viewer/capture increments above a small common SC workload, not a zero-synth SC server.
- Fixed total waveform area: 620 × 240 CSS pixels at device scale 1; six canvases/windows each use 620 × 40. The test adapts layout only in a temporary fixture and uses production paint/history/transport modules. Six-channel output is fixture-only; production output remains stereo. Separate windows duplicate controls/chrome and have more total window area; matching plot area does not match compositor area. Display work area: 2560 × 1415.
- CPU comes from cumulative process clocks. **100% means one fully occupied CPU core.** Electron total includes main, renderer, GPU and utility helper processes; sclang/scsynth are separate. GPU-process CPU is CPU work, not GPU hardware utilisation.
- RSS totals sum resident process memory and can double-count shared pages; retained Chromium processes/caches also affect later phases. They are not unique physical memory or a clean-start Electron/Qt memory comparison.
- Raw results preserve process samples, SC average/peak load, packets, source clocks/gaps, paint counts, configuration and source hashes. The after run also records measured broker counter deltas; the before broker had no equivalent derived counters.
- This measures a bundled optimisation. It does not attribute CPU differences independently to encoding, history, shared reduction or native startup; it does not measure latency, core placement, audio dropouts, physical devices or long-session reliability.

## CPU: means and observed ranges

All entries are percentages of one core. Total is the whole test-owned Electron process tree.

| Case | Main before → after | Renderer before → after | GPU process before → after | Total before → after | Total ranges before / after |
| --- | ---: | ---: | ---: | ---: | --- |
| `idle` | 0.4 → 0.4 | 0.0 → 0.0 | 0.0 → 0.0 | 0.4 → 0.4 | 0.4–0.5 / 0.4–0.4 |
| `capture-control` | 4.5 → 2.3 | 0.0 → 0.0 | 0.1 → 0.0 | 4.6 → 2.3 | 4.5–4.6 / 2.2–2.4 |
| `capture-audio` | 4.9 → 3.9 | 0.0 → 0.0 | 0.0 → 0.0 | 4.9 → 3.9 | 4.5–5.4 / 3.1–4.7 |
| `control-raw-shared-1` | 5.7 → 5.5 | 5.9 → 5.9 | 7.8 → 7.8 | 20.0 → 19.7 | 19.5–20.6 / 19.4–20.1 |
| `control-raw-shared-6` | 5.5 → 4.1 | 6.2 → 5.3 | 8.5 → 7.7 | 20.7 → 17.5 | 20.4–21.0 / 15.2–19.8 |
| `control-raw-canvases-6` | 5.4 → 4.1 | 6.6 → 6.0 | 12.0 → 11.6 | 24.5 → 22.1 | 24.3–24.7 / 19.7–24.6 |
| `control-raw-windows-6` | 6.4 → 5.7 | 32.0 → 28.8 | 27.0 → 26.2 | 68.0 → 62.9 | 67.8–68.2 / 56.8–69.0 |
| `control-wide-shared-1` | 5.3 → 4.1 | 5.6 → 5.0 | 7.8 → 7.1 | 19.3 → 16.7 | 19.2–19.3 / 14.0–19.3 |
| `control-wide-shared-6` | 5.4 → 4.1 | 6.0 → 5.2 | 10.1 → 9.4 | 22.1 → 19.2 | 21.8–22.3 / 16.7–21.6 |
| `control-wide-canvases-6` | 5.3 → 4.7 | 6.3 → 6.2 | 13.3 → 13.2 | 25.5 → 24.6 | 25.5–25.6 / 24.0–25.3 |
| `control-wide-windows-6` | 6.6 → 6.3 | 31.9 → 31.6 | 27.3 → 27.4 | 68.5 → 67.9 | 67.2–69.7 / 66.2–69.6 |
| `output-raw-shared-1` | 6.9 → 6.5 | 10.8 → 9.8 | 10.3 → 10.4 | 30.0 → 28.2 | 29.4–30.5 / 27.0–29.3 |
| `output-raw-shared-6` | 6.6 → 6.4 | 11.7 → 11.3 | 14.9 → 14.6 | 35.0 → 34.1 | 34.3–35.7 / 34.0–34.2 |
| `output-raw-canvases-6` | 6.3 → 5.9 | 12.3 → 12.0 | 22.8 → 22.3 | 43.2 → 41.8 | 42.7–43.7 / 39.9–43.6 |
| `output-raw-windows-6` | 8.1 → 8.5 | 60.0 → 52.4 | 48.6 → 46.7 | 127.7 → 114.2 | 125.3–130.1 / 113.8–114.7 |
| `output-wide-shared-1` | 6.4 → 6.9 | 10.1 → 9.7 | 12.7 → 12.9 | 30.5 → 30.7 | 29.9–31.0 / 30.2–31.3 |
| `output-wide-shared-6` | 5.8 → 6.2 | 10.9 → 12.2 | 31.4 → 31.7 | 49.4 → 51.5 | 48.7–50.1 / 50.0–53.0 |
| `output-wide-canvases-6` | 5.9 → 5.9 | 12.8 → 13.1 | 40.1 → 40.0 | 60.1 → 60.3 | 60.0–60.1 / 60.3–60.4 |
| `output-wide-windows-6` | 7.7 → 8.3 | 55.2 → 51.3 | 66.7 → 64.3 | 135.6 → 128.3 | 134.3–136.8 / 128.1–128.6 |
| `two-audio-adapters` | 6.3 → 6.3 | 22.3 → 22.9 | 60.5 → 60.4 | 91.2 → 91.8 | 89.9–92.5 / 91.6–91.9 |
| `frozen-control` | 5.1 → 4.8 | 0.7 → 0.7 | 0.0 → 0.0 | 6.4 → 6.0 | 6.2–6.6 / 5.3–6.6 |
| `looper-no-viewer` | 1.4 → 1.3 | 0.0 → 0.0 | 0.0 → 0.0 | 1.4 → 1.3 | 1.3–1.5 / 1.1–1.5 |
| `looper-playback` | 1.5 → 1.6 | 0.0 → 0.0 | 0.0 → 0.0 | 1.5 → 1.6 | 1.3–1.6 / 1.6–1.7 |
| `looper-gui-scope-raw-peer` | 9.6 → 8.6 | 20.0 → 17.9 | 22.1 → 20.6 | 53.9 → 49.1 | 53.9–53.9 / 46.4–51.8 |

## Transport and memory

Scope binary bytes only, excluding WebSocket framing, ACK/status/control traffic and the looper SSE/raw peer path. They are local transport throughput, not SC audio output bandwidth.

| Case | Scope KiB/s before → after | Saved | Summed RSS MiB before → after |
| --- | ---: | ---: | ---: |
| `idle` | 0.0 → 0.0 | — | 206 → 208 |
| `capture-control` | 0.0 → 0.0 | — | 207 → 208 |
| `capture-audio` | 0.0 → 0.0 | — | 208 → 210 |
| `control-raw-shared-1` | 20.0 → 5.5 | 72.5% | 332 → 333 |
| `control-raw-shared-6` | 20.1 → 20.3 | -1.1% | 347 → 349 |
| `control-raw-canvases-6` | 20.0 → 20.2 | -1.1% | 345 → 345 |
| `control-raw-windows-6` | 120.1 → 33.1 | 72.5% | 749 → 748 |
| `control-wide-shared-1` | 4.6 → 2.9 | 35.9% | 351 → 353 |
| `control-wide-shared-6` | 4.6 → 4.8 | -4.1% | 358 → 361 |
| `control-wide-canvases-6` | 4.6 → 4.8 | -3.9% | 346 → 348 |
| `control-wide-windows-6` | 27.5 → 17.7 | 35.8% | 754 → 754 |
| `output-raw-shared-1` | 1128.9 → 191.9 | 83.0% | 364 → 352 |
| `output-raw-shared-6` | 1123.1 → 1130.5 | -0.7% | 367 → 369 |
| `output-raw-canvases-6` | 1130.8 → 1133.8 | -0.3% | 369 → 371 |
| `output-raw-windows-6` | 6806.1 → 1148.9 | 83.1% | 864 → 792 |
| `output-wide-shared-1` | 145.7 → 28.5 | 80.4% | 355 → 355 |
| `output-wide-shared-6` | 144.7 → 145.2 | -0.3% | 356 → 358 |
| `output-wide-canvases-6` | 144.5 → 145.2 | -0.5% | 359 → 360 |
| `output-wide-windows-6` | 874.9 → 171.3 | 80.4% | 797 → 783 |
| `two-audio-adapters` | 288.7 → 291.2 | -0.9% | 445 → 449 |
| `frozen-control` | 4.6 → 4.8 | -3.8% | 336 → 339 |
| `looper-no-viewer` | 0.0 → 0.0 | — | 266 → 266 |
| `looper-playback` | 0.0 → 0.0 | — | 266 → 266 |
| `looper-gui-scope-raw-peer` | 0.0 → 0.0 | — | 453 → 453 |

The `looper-gui-scope-raw-peer` case uses the real hosted looper backend, which the fixture does not include in its transport byte counter. Its zero in this table is **unmeasured traffic**, not zero traffic. It includes the looper GUI, a stereo scope and an SC Bus socket consumer, but no Lissajous/R3F UI. Looper playback is prerecorded with output gain zero; record/overdub costs under load were not measured here.

## Freshness and SC load

Paint rates below are per viewer, averaged across the two samples. Gaps are observed **source frames missing during each sample**, by viewer; identical viewers can report the same missing source interval. Do not sum those as independent losses. Control gaps count control values, audio gaps count audio samples. A gap remains visible at its source-clock position.

| Case | Paint Hz before → after | Source gaps before / after | SC average CPU before → after | SC maximum peak before → after |
| --- | ---: | --- | ---: | ---: |
| `idle` | — → — | — / — | 0.197 → 0.168 | 0.49 → 0.53 |
| `capture-control` | — → — | — / — | 0.221 → 0.158 | 0.54 → 0.65 |
| `capture-audio` | — → — | — / — | 0.260 → 0.216 | 43.72 → 0.62 |
| `control-raw-shared-1` | 23.5 → 23.5 | 0–0 / 0–0 | 0.214 → 0.221 | 0.47 → 0.55 |
| `control-raw-shared-6` | 23.6 → 23.5 | 0–0 / 0–0 | 0.212 → 0.186 | 0.80 → 0.87 |
| `control-raw-canvases-6` | 23.5 → 23.6 | 0–0 / 0–0 | 0.243 → 0.186 | 37.24 → 0.60 |
| `control-raw-windows-6` | 23.6 → 23.5 | 0–0 / 0–0 | 0.203 → 0.194 | 0.81 → 0.65 |
| `control-wide-shared-1` | 23.5 → 23.5 | 0–0 / 0–0 | 0.209 → 0.190 | 0.49 → 1.19 |
| `control-wide-shared-6` | 23.6 → 23.5 | 0–0 / 0–0 | 0.212 → 0.186 | 0.47 → 0.82 |
| `control-wide-canvases-6` | 23.5 → 23.6 | 0–0 / 0–0 | 0.213 → 0.199 | 0.59 → 0.68 |
| `control-wide-windows-6` | 23.5 → 23.5 | 0–0 / 0–0 | 0.212 → 0.205 | 0.63 → 0.63 |
| `output-raw-shared-1` | 46.8 → 46.6 | 0–2560 / 2048–3072 | 0.232 → 0.228 | 0.67 → 0.66 |
| `output-raw-shared-6` | 46.6 → 46.9 | 3072–4608 / 0–1536 | 0.226 → 0.214 | 0.70 → 0.62 |
| `output-raw-canvases-6` | 47.0 → 47.0 | 0–2560 / 0–1024 | 0.217 → 0.206 | 0.78 → 0.61 |
| `output-raw-windows-6` | 47.1 → 46.5 | 0–512 / 1536–6144 | 0.217 → 0.216 | 0.80 → 0.95 |
| `output-wide-shared-1` | 47.0 → 46.8 | 0–1536 / 0–4608 | 0.230 → 0.240 | 0.73 → 0.61 |
| `output-wide-shared-6` | 46.7 → 46.8 | 2048–5120 / 0–6144 | 0.211 → 0.224 | 0.85 → 0.76 |
| `output-wide-canvases-6` | 46.5 → 46.7 | 3072–5120 / 2560–3584 | 0.221 → 0.218 | 0.69 → 0.89 |
| `output-wide-windows-6` | 46.9 → 46.8 | 0–3584 / 2560–3072 | 0.222 → 0.222 | 0.83 → 1.19 |
| `two-audio-adapters` | 46.5 → 46.7 | 2560–6656 / 2048–2560 | 0.210 → 0.215 | 0.95 → 0.65 |
| `frozen-control` | 0.0 → 0.0 | 0–0 / 0–0 | 0.213 → 0.211 | 0.63 → 0.62 |
| `looper-no-viewer` | — → — | — / — | 0.239 → 0.228 | 0.63 → 0.60 |
| `looper-playback` | — → — | — / — | 0.263 → 0.278 | 0.61 → 0.59 |
| `looper-gui-scope-raw-peer` | 46.7 → 47.0 | 2560–2560 / 0–2048 | 0.308 → 0.287 | 0.66 → 0.81 |

All active measured viewers advanced source clocks, stayed connected and painted above 5 Hz; frozen viewers painted zero times while continuing to receive. This is an 8-second interval check, not a per-frame freeze detector. Nonzero gaps show that this remains a latest-publication visual feed, not a lossless recorder.

## What the numbers support

A subsequent before-source replay reported accelerated Canvas and GPU compositing enabled
(see the environment manifest). This is a later feature-status check, not a GPU timing profile
of the paired phases; the high GPU-process CPU is not evidence that Canvas ran in software.

Capture-only cases do not exercise display reduction or selection. Their CPU decrease cannot
be credited to these changes; timing/background/JIT variation remains a confound. These short
samples support transport savings and verified shared work more strongly than small CPU deltas.

- **One drawn audio lane from a six-channel feed:** scope traffic 1128.9 → 191.9 KiB/s; Electron total 30.0 → 28.2% of one core; main 6.9 → 6.5%.
- **Six raw audio windows:** scope traffic 6806.1 → 1148.9 KiB/s; Electron total 127.7 → 114.2% of one core; main 8.1 → 8.5%.
- **Six wide control windows:** scope traffic 27.5 → 17.7 KiB/s; Electron total 68.5 → 67.9% of one core; main 6.6 → 6.3%.
- **Two compatible wide audio adapters:** scope traffic 288.7 → 291.2 KiB/s; Electron total 91.2 → 91.8% of one core; main 6.3 → 6.3%.
- The duplicate-adapter case confirms **one transform call per raw publication**, one derived profile and two display subscribers. This proves shared computation; the CPU table determines whether that computation was a large bottleneck.
- A single window already shared one transport/history among its canvases before this change. Separate canvases therefore do not get a channel-multiplication transport saving. Six separate windows formerly each received six lanes; now each receives one. Rendering/compositor costs remain per view.
- Full six-channel packets grow by 8 header bytes in v5. Selection has the largest bandwidth benefit on raw audio; the small wide control payload is dominated by its header. Selecting one lane does not reduce the six-channel SC source allocation in this experiment.
- GPU/helper and renderer work remain substantial. This implementation does not erase the old measured Qt advantage, and no new Qt run was made. A 30/15 Hz paint experiment that continues ingesting every available chunk is the next useful comparison; these process clocks do not prove that replacing line geometry with a shader alone will fix it.

## Validation and replication

Passed: 65 shell unit tests, 24 scope unit tests, 3 native-audio protocol tests, 32 Lissajous host/SC decoder/AudioWorklet/native/config checks, two real shell Electron gates and both six-case benchmark smoke runs. The retained before-source replay also passed six smoke cases and matches the baseline source hashes. Both full 48-phase versions completed and restored the expected test synth/group counts. The native reader rebuild passed (existing Boost deprecation warnings).
77 protected files covering Lissajous source/published renderer, existing native audio access/decoder/media policy and SC bootstrap match their pre-change hashes. Old cost reports/results retain their existing hashes. These checks protect code paths and sample contracts; physical hardware-input/loopback/file/WASM behaviour under combined load was not remeasured.

From the AWB root, with Node 22 first in PATH:

```sh
node apps/awb-shell/test/signal-bench/run.mjs --tag=check --smoke
node apps/awb-shell/test/signal-bench/run.mjs --tag=current --seconds=8
node apps/awb-shell/test/signal-bench/run.mjs --tag=before-replay --before --seconds=8
npm test --workspace @awb/desktop-shell
node --test tool-artifacts/shared-loop/0.1.0/tests/*.test.mjs
npm run test:shared-loop --workspace @awb/desktop-shell
npm run test:sc-bus --workspace @awb/desktop-shell
```

The runner snapshots installed code into a temporary fixture, starts its own SC/Electron processes, and writes `/private/tmp/awb-signal-<tag>.json`. It does not mutate production scopes or use the live host. The second command measures the current version; `--before` overlays the seven retained pre-optimisation scope sources inside the fixture only. It keeps the current matching native reader and SC source, so check recorded hashes before treating a later replay as the same environment. It has a 15-minute timeout and normally takes about ten minutes. Run versions sequentially without other tests/builds during measurement.

Retained evidence:

- [Baseline raw results](../test/signal-bench/results/baseline-2026-10-02.json)
- [Optimised raw results](../test/signal-bench/results/optimised-2026-10-02.json)
- [Before-source replay smoke and GPU feature check](../test/signal-bench/results/before-replay-smoke-2026-10-02.json)
- [Comparison means](../test/signal-bench/results/comparison-2026-10-02.json)
- [Native fix and protected-route manifest](../test/signal-bench/results/environment-2026-10-02.json)
- [Retained before sources](../test/signal-bench/results/baseline-sources/), used by the fixture-only `--before` replay flag
- [Harness](../test/signal-bench/run.mjs), [fixture preparation](../test/signal-bench/prepare.mjs), [SC producers](../test/signal-bench/server.scd)
- [Current architecture and adaptation guide](shared-signal-engine.md)
- [Historical Qt costs](../../../tool-artifacts/shared-loop/0.1.0/QT_COSTS.md) and [historical layout costs](../../../tool-artifacts/shared-loop/0.1.0/LAYOUT_COSTS.md)
