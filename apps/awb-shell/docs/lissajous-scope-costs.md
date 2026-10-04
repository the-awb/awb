# One 5,000-point Lissajous pattern versus a mono scope — 2026-10-02

In the actual shell, the mono scope at 30 fps measured **27.1% of one core** across the Electron process tree. One live 5,000-point Lissajous pattern at normal refresh measured **35.7%**, or **1.32×** the scope's total. A test-only 30 fps cap brought Lissajous to **28.1%** (**1.04×** the scope), saving **21.3%** of its normal-refresh total. These are workload comparisons, not point-count or framework multipliers.

## CPU and memory

Four-repeat mean and observed range. CPU is percent of one core: 100% consumes one whole core. GPU-process CPU is CPU used by Chromium's GPU process, not hardware GPU utilisation. Electron total includes all current main, renderer, GPU and utility processes; SC is separate.

| Case | Total Electron CPU | Main CPU | Active-view renderer CPU | GPU-process CPU | Summed Electron RSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle shell | 1.0 (0.6–1.6) | 0.6 (0.5–0.8) | 0.0 (0.0–0.0) | 0.2 (0.0–0.5) | 398.5 (347.0–422.4) |
| Mono scope, 1,024 points, 30 fps | 27.1 (25.2–27.9) | 7.3 (6.3–8.0) | 9.1 (8.8–9.4) | 9.0 (8.6–9.3) | 497.0 (455.6–515.8) |
| Lissajous, 5,000 points, normal refresh | 35.7 (34.5–37.1) | 5.3 (5.2–5.6) | 12.9 (12.5–13.2) | 15.3 (14.8–16.0) | 542.6 (527.5–553.4) |
| Lissajous, 5,000 points, fixture 30 fps cap | 28.1 (25.8–31.8) | 6.3 (5.3–8.3) | 10.8 (10.2–11.4) | 8.8 (8.3–9.6) | 548.7 (544.2–554.8) |

## Actual activity

The point draw count measures WebGL submissions of exactly 5,000 POINTS, not merely rolling GUI diagnostics. Geometry rate counts pairs of active-prefix Float32 position/color uploads. Scope paints use its production painter counter. Pixel snapshots before/after each sample must differ. Every measured viewer phase passed these checks.

| Case | Paints or point draws/s | Geometry updates/s | Browser packets/s | Binary application KiB/s | Maximum observed paint interval ms | SC average audio CPU | Source-gap samples per phase |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Mono scope, 1,024 points, 30 fps | 29.9 (29.9–30.0) | — | 46.7 (46.4–46.9) | 192.2 (191.2–193.1) | 66.9 | 0.154 (0.153–0.157)% | 0–4096 |
| Lissajous, 5,000 points, normal refresh | 59.9 (59.9–60.0) | 38.7 (38.4–38.8) | 93.5 (93.2–93.8) | 378.3 (377.0–379.4) | 19.3 | 0.161 (0.157–0.165)% | 0–3584 |
| Lissajous, 5,000 points, fixture 30 fps cap | 30.0 (29.9–30.0) | 30.0 (29.9–30.0) | 93.4 (93.1–93.8) | 377.8 (376.8–379.5) | 44.6 | 0.158 (0.152–0.163)% | 0–4096 |

Binary bytes include each application header/payload, excluding WebSocket/TCP framing. Source gaps count missing SC publications; they do not include browser queue drops. This latest-publication bridge is not a lossless recorder. No microphone-to-screen latency or audio xrun guarantee is measured.

## Paired differences

Differences pair the same repetition; means and observed ranges are CPU percentage points, not confidence intervals.

- Normal Lissajous minus scope: **+8.56**, range +6.97 to +9.70.
- 30 fps Lissajous minus scope: **+0.98**, range -1.75 to +3.96.
- Normal minus 30 fps Lissajous: **+7.58**, range +4.24 to +9.54.

## Method and limits

- Runs the current published `tool-artifacts/lissajous/0.1.0` in the real shell through its normal launch router, capability grant, SC Bus binary endpoint and shared capture broker. It does not substitute a standalone geometry benchmark. Published artifact and native/SC/audio-route sources are unchanged; their hashes are retained.
- One fresh default pattern, persistence set through the GUI to 5,000 samples, default point appearance and scene. Its WebGL draw range must be exactly 5,000. One active WebGL canvas is observed. The optional background canvas in source is commented out. The normal view uses React Three Fiber/Three.js with `preserveDrawingBuffer: true`; this test does not optimise those settings.
- The live private stereo producer on buses 32/33 emits 113.37/170.03 Hz sine waves with slow amplitude variation. It remains active throughout all cases, with no hardware output. Lissajous captures two channels for XY; the scope captures only bus 32, one channel. The wider Lissajous capture costs are included. Controls/chrome and drawing style also differ.
- Both test windows are 1,100 × 700; actual plotted CSS and drawing-buffer size are checked at **620 × 240, DPR 1**. This remeasures the scope alongside Lissajous rather than combining a new pattern figure with the previous 720 × 520-window baseline. A normal full-size/high-DPI Lissajous view can cost more.
- Normal Lissajous geometry setting is 60 fps, but the setting gates geometry updates rather than R3F painting. The measured paint/upload rates above distinguish these. The 30 fps variant caps `requestAnimationFrame` in this disposable fixture, including scene/audio-drain/geometry callbacks. It leaves SC capture and packet delivery running. **This is not a shipped Lissajous refresh option** and should not be read as a production optimisation already applied.
- Four repetitions of idle/scope/normal-pattern/capped-pattern, forward/reverse order alternated: **16 measured phases**, plus four successful smoke phases. Each measured phase settles 2 seconds and samples ~12 seconds. No tests/builds run concurrently. The normal Home and hidden render-worker are loaded; no render jobs, Field or Studio tool views are launched. Only owned temporary hosts/views are closed; live user hosts are untouched.
- Host: **Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz**, Electron **44.4.1** / embedded Node **24.21.0**, SC block **64**, measured rate **48.0 kHz**. No device or rate option is forced. This host selected input `1248` and output `BlackHole 16ch`; the user's normal 44.1 kHz configuration is not a measured result here. At this measured rate the nominal 5,000-sample history is 104.2 ms versus 21.3 ms for 1,024 scope samples, with discontinuities handled by each consumer.
- CPU uses cumulative `ps` process clocks before/after each sample. Status probes, lightweight draw/upload/packet counters, and screenshot setup are test overhead. GPU hardware load, macOS WindowServer, power and core placement are unmeasured. Summed RSS can count shared pages more than once. Short sequential results have scheduler/background/thermal variation; observed ranges are retained rather than claimed as statistical bounds.
- Checks enforce live source clocks, changing pixels, matching size/rate, advancing 5,000-point uploads, minimum visual cadence, bounded paint gaps, continued host connection and source cleanup. SC synth/group counts return to their pre-view baseline after closure; broker polling stops. All **143** guarded original source/native/published/historical files match pre-run hashes.
- Failed attempts are excluded: an instrumentation hook first matched the hidden worker instead of the tool; debugger initialization needed an initial renderer; one longer attempt had a transient process disappear and was rejected rather than reported as a complete CPU sample. The fixture was corrected and rerun. Existing SC extension/plugin warnings were not changed. This is not a loaded-graph or long-soak stability assessment.

## Interpretation

Five thousand GPU points do not mean five times the cost of a 1,024-sample Canvas waveform. The normal view paints roughly twice as often and carries a paired feed plus its full application UI. The 30 fps experiment shows the amount available from controlling actual scene painting, rather than only slowing geometry updates. It does not isolate shader versus Canvas work or establish how multiple patterns scale; those require another matched test.

## Reproduction and evidence

From AWB with Node 22 first in PATH, run sequentially:

```sh
node apps/awb-shell/test/signal-bench/pattern-compare/run.mjs --mode=shell --smoke
node apps/awb-shell/test/signal-bench/pattern-compare/run.mjs --mode=shell
```

- [Full 16-phase results](../test/signal-bench/results/pattern-compare-shell-2026-10-02.json)
- [Four smoke phases](../test/signal-bench/results/pattern-compare-shell-smoke-2026-10-02.json); smoke preceded the added byte counter and is used only for activity checks.
- [Case statistics and paired differences](../test/signal-bench/results/pattern-compare-summary-2026-10-02.json)
- [Environment, artifact/native guards and harness hashes](../test/signal-bench/results/pattern-compare-environment-2026-10-02.json)
- [Fixture runner](../test/signal-bench/pattern-compare/run.mjs), [measurement](../test/signal-bench/pattern-compare/measure.mjs), [private producer](../test/signal-bench/pattern-compare/producer.scd), [view instrumentation](../test/signal-bench/pattern-compare/instrument.js)
- [Earlier mono routing baseline](one-line-scopes-costs.md) and [SC Bus integration](sc-bus-audio.md)

Changes remain uncommitted on `design/score-studio-layout`. Vault and Telegram MCP tools are absent from this session; no direct vault-file substitute was used.
