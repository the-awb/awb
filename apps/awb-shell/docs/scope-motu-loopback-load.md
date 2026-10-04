# Headless SC, MOTU return and sustained graphics — measured 3–4 October 2026

Returned-signal faults occurred under heavy sustained drawing at high DSP load without app switching. Heavier display profiles increased faults in the matched upper-load comparisons. Switching can also cause faults with capture stopped. Neither graphics alone nor a single universal CPU threshold explains the results. Keep DSP headroom, and measure the delivered signal as well as drawing cadence.

All completed runs below used only the benchmark-owned headless SC language/server in every recorded process inventory. The earlier interrupted run with another agent's SC process is excluded. These are configuration-specific tests, not a guarantee for every SynthDef, buffer size or background workload.

## Practical interpretation

- The 16-canvas profile held approximately 30 fps; 64 canvases managed about 27–28 fps. The largest profile (128 canvases + 512 widgets) fell to roughly 14 fps even at baseline DSP load. Its 60 fps setting was an upper limit, not an achieved workload.
- In the short sweeps, capture stopped was clean at 60 DSP nodes (~73% SC load) but had one return discontinuity at 68 nodes (~80%). The 16-canvas profile was clean at 52 nodes (~65%) but had a fault at 60 nodes (~74%). The 64-canvas profile was clean in short 52-node passes (~71%), then failed at 60 nodes (~82%). The largest profile already failed in one 52-node pass (~71%).
- Switching at 52 nodes caused a returned-signal fault with capture stopped (~70%) and substantially more with widgets active (~73%). At 36 nodes (~50%), short switching controls were clean.
- The longer checks were clean for steady 16/64-canvas rendering at both 36 and 44 nodes (approximately 47–59% SC load). Switching was clean at 36 nodes (~50%), but one 44-node switching pass (~61%) contained two discontinuity callbacks. My practical starting budget here is **55–60% SC load for sustained heavy GUI use, nearer 50% when frequent switching matters**. Leave further margin for less predictable instruments. These are recommendations from finite captures, not hard safe ceilings.

## Method and boundaries

Existing MOTU 1248 digital routing was retained: output channel 2 returns on input channel 6 (zero-based), within the user's output 2–9 → input 6–13 route. The routing snapshot maps computer output 2 through mixer input 12 and Mix Post FX 12 to computer input 6. No cable route, analogue DAC/ADC loopback or routing write was used. The [MOTU routing guide](https://cdn-data.motu.com/manuals/avb/1248_8M_16A_Switch_User_Guide.pdf) describes the matrix; the [before/after route verification](../test/signal-bench/dropout/results/2026-10-03-loopback/routing-verification.json) retains the actual mapping. All sixteen loopback source mappings are unchanged.

The fixture exposes ten SC output channels so output 2 is a physical output, not an input/internal bus. The observed defaults remain 48 kHz, 512 hardware frames (10.667 ms) and 64-sample SC DSP blocks. Production audio options, apps and routes were not modified. Only Scope was launched; no Field Modelling, Rack, SC IDE or Bitwig window was launched by the benchmark. Existing unrelated applications were left alone.

Hardware/versions: Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz; Electron 44.4.1; installed SC 3.12.2. A temporary code-matching SC executable supplies the software-buffer/timing probe; the installed executable remains unchanged.

Each load node contains 32 SinOsc → RLPF → tanh paths, mixed to a private bus. A separate quiet 997 Hz pilot on output 2 is recorded from the MOTU return. Sixteen generated audio buses feed the GUI. More canvases/widgets repeat those sixteen source bindings: this measures display fan-out, not 128 separate SC capture streams. Canvas rendering uses the production trace painter and a shared 1024-sample history view. Profiles differ in size, widget count and refresh limit, so their totals cannot be treated as a pure per-canvas marginal-cost test.

The fixed window is 2250 × 1250, DPR 1; every canvas/widget must fit in the content viewport. Source packets arrive around 46.9 Hz. Paint requests are data-driven; achieved fresh-paint rates are reported. Browser callback cadence does not prove every paint reached the monitor. Switching alternates Scope and existing VS Code about twice a second using a persistent helper. Conditions run forward/reverse across two passes; DSP graphs are fixed rather than retuned to guessed CPU percentages.

Electron CPU includes main, renderer, GPU-process and utility CPU, with 100% = one core of CPU time. It is not GPU utilization. SC load is the server's reported DSP-load measure; do not add these percentages. GPU-process CPU dominates the heavy display profiles; per-process figures remain in the full phase JSON.

## Drawing costs at the baseline graph

Baseline means no stress nodes; source and pilot synths remain active. Two 15-second passes per profile.

| Profile | Canvases | Widgets | Total Electron CPU | Achieved wave fps | Achieved widget Hz | Return faults |
|---|---:|---:|---:|---:|---:|---:|
| widgets | — | 128 × 96 px | 30.1% | 0.0 | 15.0 | 0 |
| mixed-16-30 | 16 × 256×64 | 128 × 48 px | 68.3% | 30.0 | 15.0 | 0 |
| mixed-64-30 | 64 × 256×64 | 128 × 48 px | 159.7% | 27.8 | 15.0 | 0 |
| mixed-128-60 | 128 × 128×48 | 512 × 24 px | 168.9% | 14.5 | 14.1 | 0 |

## Sustained upper-load comparison

Two 15-second passes per row; input counts are discontinuity-containing callbacks, not distinct audible-click counts. Native sample buffers remained continuous; the return reveals delivery faults those buffers can miss.

| DSP nodes | Profile | Mean SC load | Wave fps | Bad return callbacks | SC over-budget callbacks | Longest DSP callback |
|---:|---|---:|---:|---:|---:|---:|
| 52 | stopped | 66.0% | 0.0 | 0 | 0 | 8.150 ms |
| 52 | widgets | 63.9% | 0.0 | 0 | 0 | 9.095 ms |
| 52 | mixed-16-30 | 64.9% | 29.8 | 0 | 0 | 9.549 ms |
| 52 | mixed-64-30 | 70.9% | 26.9 | 0 | 0 | 10.402 ms |
| 52 | mixed-128-60 | 70.9% | 13.7 | 18 | 7 | 11.972 ms |
| 60 | stopped | 72.7% | 0.0 | 0 | 0 | 9.275 ms |
| 60 | widgets | 71.7% | 0.0 | 0 | 0 | 10.110 ms |
| 60 | mixed-16-30 | 73.7% | 30.0 | 1 | 1 | 10.809 ms |
| 60 | mixed-64-30 | 81.6% | 27.3 | 122 | 51 | 11.815 ms |
| 68 | stopped | 79.5% | 0.0 | 1 | 0 | 10.362 ms |
| 68 | widgets | 79.9% | 0.0 | 25 | 9 | 11.945 ms |
| 68 | mixed-16-30 | 82.4% | 30.0 | 50 | 20 | 12.458 ms |
| 68 | mixed-64-30 | 93.3% | 26.9 | 1063 | 454 | 13.924 ms |

## Switching with and without capture

Two 15-second passes per row. Stopped-focus contains no scope capture or widget updates.

| DSP nodes | Condition | Mean SC load | Bad return callbacks | SC over-budget callbacks | Longest DSP callback |
|---:|---|---:|---:|---:|---:|
| 20 | stopped | 33.5% | 0 | 0 | 3.926 ms |
| 20 | stopped-focus | 28.8% | 0 | 0 | 4.358 ms |
| 20 | widgets | 30.5% | 0 | 0 | 4.000 ms |
| 20 | focus | 28.8% | 0 | 0 | 4.868 ms |
| 36 | stopped | 49.8% | 0 | 0 | 6.143 ms |
| 36 | stopped-focus | 49.2% | 0 | 0 | 7.806 ms |
| 36 | widgets | 47.4% | 0 | 0 | 6.655 ms |
| 36 | focus | 50.5% | 0 | 0 | 8.045 ms |
| 52 | stopped | 66.1% | 0 | 0 | 8.255 ms |
| 52 | stopped-focus | 69.5% | 1 | 0 | 10.622 ms |
| 52 | widgets | 64.1% | 0 | 0 | 9.046 ms |
| 52 | focus | 72.5% | 38 | 12 | 11.901 ms |

## Longer operating-level checks

Two 45-second passes per row (approximately 90 seconds total), with no switching in the mixed-canvas conditions.

| DSP nodes | Condition | Mean SC load | Wave fps | Bad return callbacks | SC over-budget callbacks | Longest DSP callback |
|---:|---|---:|---:|---:|---:|---:|
| 36 | stopped | 50.2% | 0.0 | 0 | 0 | 6.646 ms |
| 36 | mixed-16-30 | 46.8% | 30.0 | 0 | 0 | 7.282 ms |
| 36 | mixed-64-30 | 48.5% | 27.4 | 0 | 0 | 8.138 ms |
| 36 | focus | 49.9% | 0.0 | 0 | 0 | 8.470 ms |
| 44 | stopped | 58.0% | 0.0 | 0 | 0 | 7.189 ms |
| 44 | mixed-16-30 | 55.8% | 29.9 | 0 | 0 | 8.352 ms |
| 44 | mixed-64-30 | 59.4% | 27.3 | 0 | 0 | 9.310 ms |
| 44 | focus | 60.7% | 0.0 | 2 | 1 | 10.925 ms |

## Recorder and verification

V2 copies input into a locked memory queue and writes on a separate thread. Each completed run positively detected an injected 80 ms mute and two phase changes before measurement; the clean returned-sine residual was about 2.34e-7 against the 1e-5 threshold. This detector is specific to the known pilot, not an arbitrary-music dropout detector.

Zero recorder queue drops occurred in all completed V2 runs. Per-phase input timestamp continuity and recorder callback budgets are checked before treating a return measurement as reliable. The earlier V1 recorder had a callback overrun/input gap and is excluded from the ceiling assessment. Recorded return faults can occur without a software over-budget flag: the timestamp/buffer budget is a useful warning, not a complete model of the device's delivery deadline.

Completed comparison phases: 96; measured phase time: 32.2 minutes. Each run passed all 16 protected production hashes, exact native callback-range verification and owned-process cleanup. Process checks are boundary inventories, not continuous process tracing. The recorder/native audit are part of this measured configuration; removing their overhead or changing output-channel count is not separately quantified.

No scheduler, per-core placement, clock-frequency, compositor-presentation or driver-internal tracing was performed. These tests establish the observed load-dependent failures, not their precise mechanism or the original SC IDE ↔ Bitwig cause.

## Recorded waveform faults and silence gaps

The detector measured actual discontinuities and zero-sample gaps in the MOTU-returned pilot, as well as late/over-budget software callbacks. The original output sample buffers remained continuous. I did not listen and classify the recordings as clicks versus pops, or grade their audibility; the test pilot was deliberately quiet (about −50 dBFS). Abrupt waveform interruptions can produce clicks, but the measured gap durations below are the firmer statement.

- At 44 nodes, the failed longer widget-switching pass (~61% SC load) contained one **31.854 ms zero-sample gap**. Its two discontinuity callbacks and four silence-containing callbacks describe the same interruption, not six separate audible events.
- At 52 nodes, the failed sustained 128-canvas/512-widget pass (~71%) contained **five gaps of 31.583–31.875 ms**, totaling 158.792 ms within its 15-second measurement.
- At 52 nodes with widget switching, each pass contained five gaps. The longest was **53.188 ms**.
- At the strongest overload (68 nodes with 64 canvases), gaps reached **64 ms**. Some other failing conditions had discontinuities without sustained zeros.

These are brief delivered-signal dropouts, not only subtle timing warnings. Gap lengths use the original samples, with the existing detector threshold of abs(sample) < 1e-9 for at least 32 consecutive frames. At this capture's quantization that represents zero samples. Measurement ranges exclude injected validation mutes/phase jumps. Individual runs can be truncated at phase boundaries; there is no extra missing input timestamp or recorder queue loss in these captures.

[Steady-gap analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/steady/silence-analysis.json), [switching-gap analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/focus/silence-analysis.json), [longer-check gap analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/long/silence-analysis.json), [upper-load gap analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/upper/silence-analysis.json).

## What to improve next

The 128-canvas case is already slow at baseline DSP load; adding DSP headroom cannot fix its drawing rate. The next graphics experiment should compare the same visible waveforms in one batched surface against separate canvases, and reduce trace work to screen resolution while retaining extrema. GPU-process CPU dominates the current heavy cases, so cutting JSON or text updates alone will not address this drawing bottleneck. This is a proposed next experiment, not an optimization implemented or benchmarked in this run.

## Evidence and reproduction

[Completion verification](../test/signal-bench/dropout/results/2026-10-03-loopback/completion-verification.json) confirms the archive checksums, production guards and absence of SC/probe processes.

Every evidence folder contains full phase/process JSON, native callback records, compressed original MOTU-return samples, logs, detector checks and verification. Selected failing conditions also include original Float32 WAV excerpts and explicitly labelled +40 dB versions. The latter are for listening; analysis uses original samples.

- v2-smoke: [full phases](../test/signal-bench/dropout/results/2026-10-03-loopback/v2-smoke/full.json), [return analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/v2-smoke/return.json), [native verification](../test/signal-bench/dropout/results/2026-10-03-loopback/v2-smoke/verification.json), [return verification](../test/signal-bench/dropout/results/2026-10-03-loopback/v2-smoke/return-verification.json).
- steady: [full phases](../test/signal-bench/dropout/results/2026-10-03-loopback/steady/full.json), [return analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/steady/return.json), [native verification](../test/signal-bench/dropout/results/2026-10-03-loopback/steady/verification.json), [return verification](../test/signal-bench/dropout/results/2026-10-03-loopback/steady/return-verification.json).
- upper: [full phases](../test/signal-bench/dropout/results/2026-10-03-loopback/upper/full.json), [return analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/upper/return.json), [native verification](../test/signal-bench/dropout/results/2026-10-03-loopback/upper/verification.json), [return verification](../test/signal-bench/dropout/results/2026-10-03-loopback/upper/return-verification.json).
- focus: [full phases](../test/signal-bench/dropout/results/2026-10-03-loopback/focus/full.json), [return analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/focus/return.json), [native verification](../test/signal-bench/dropout/results/2026-10-03-loopback/focus/verification.json), [return verification](../test/signal-bench/dropout/results/2026-10-03-loopback/focus/return-verification.json).
- long: [full phases](../test/signal-bench/dropout/results/2026-10-03-loopback/long/full.json), [return analysis](../test/signal-bench/dropout/results/2026-10-03-loopback/long/return.json), [native verification](../test/signal-bench/dropout/results/2026-10-03-loopback/long/verification.json), [return verification](../test/signal-bench/dropout/results/2026-10-03-loopback/long/return-verification.json).

[Earlier setup and interrupted runs](../test/signal-bench/dropout/results/2026-10-03-loopback/setup-and-interrupted/README.md) remain separate. [Three V2 fixture setup retries](../test/signal-bench/dropout/results/2026-10-03-loopback/v2-setup-excluded/README.md) (asset serving/layout) are also excluded from comparisons.

Reproduce with `dropout/prepare.sh`, the environment shown in the earlier report plus `AWB_AUDIO_AUDIT_CHANNEL=2`, `AWB_PILOT_BUS=2` and a fresh `AWB_LOOPBACK_RECORD` path. Use distinct evidence prefixes for each matrix:

```sh
# sustained matrix
--dropout-bench --seconds=15 --repeats=2 --targets=0,30,50,65 --load-nodes=0,20,36,52 \
--conditions=stopped,widgets,mixed-16-30,mixed-64-30,mixed-128-60 --exclusive-sc
# upper-load matrix
--dropout-bench --seconds=15 --repeats=2 --targets=75,85 --load-nodes=60,68 \
--conditions=stopped,widgets,mixed-16-30,mixed-64-30 --exclusive-sc
# switching controls
--dropout-bench --seconds=15 --repeats=2 --targets=30,50,65 --load-nodes=20,36,52 \
--conditions=stopped,stopped-focus,widgets,focus --persistent-focus --exclusive-sc
# longer checks
--dropout-bench --seconds=45 --repeats=2 --targets=50,60 --load-nodes=36,44 \
--conditions=stopped,mixed-16-30,mixed-64-30,focus --persistent-focus --exclusive-sc
```

The native callback audit holds 100,000 callbacks (~17.8 minutes at this device buffer), so longer experiments need separate captures. Fixture syntax can be checked using `--dropout-bench --prepare-only`; five offline renderer tests also cover shared snapshots, source advancement and stop cancellation. Live profiles passed visibility/advancement assertions.

Vault MCP and Telegram tools were unavailable; no external update/notification was sent.

## ToolInstance integration and evidence storage — 4 October 2026

The harness and compact results are now integrated on AWB main with the ToolInstance shell.
The hardware numbers above remain measurements of the earlier checkout; they are not a
post-migration performance result. [Raw recording storage](../test/signal-bench/dropout/results/RAW_RECORDINGS.md)
explains which bulk files remain local and how to restore them for audit.
