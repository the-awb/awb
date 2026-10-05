# Rack knob motion, headless SC and MOTU return — measured 4 October 2026

**The single-canvas rack used substantially less CPU than HTML/SVG, but delivered less reliable audio under DSP stress in this configuration.** Lower GUI process CPU did not translate into more audio headroom.

HTML/SVG with all 354 controls moving was clean for two 45-second passes at 52 DSP nodes (~62% SC load). Canvas was clean in the longer 36-node checks (~52% SC load), but all three tested canvas counts failed the longer 44-node checks (~61–63%). The mechanism was not traced; this establishes the observed delivery difference, not a general verdict on WebGL.

## Method

This reuses the producer, native callback audit and V2 MOTU recorder from the [scope load report](scope-motu-loopback-load.md). Each stress node has 32 SinOsc → RLPF → tanh paths, summed to a private bus. The quiet 997 Hz pilot is on physical output 2, returning on input 6 through the existing MOTU digital mixer route. The sixteen source buses remain in the producer, but no Scope view or audio-bus capture runs: the broker has zero capture sources in every measured phase.

Hardware/options: Intel Core i7-8700B, SC 3.12.2, Electron 44.4.1, 48 kHz, 512 hardware frames (10.667 ms), 64-sample DSP blocks. Window: 2250 × 1250 outer bounds, DPR 1, zoom 100%. All 354 controls fit the content viewport. Each view is tested separately: 354 SVG controls or one Three.js canvas. The rendering source files match the comparison checkout’s SvgRack, CanvasRack and canvasRenderer.

The workload is the same deterministic motion trace used in the earlier rack scaling test: triangular stepped values, new batch every 32 ms, selected controls distributed round-robin across channel strips. Counts are 32, 64, 128, 256 and 354. The last count includes 336 send knobs and 18 bottom level faders. Every requested change is checked against actual store-change counts and final values; SVG numeric/ARIA endpoints and actual SVG/canvas draw counters are checked. No React app or rack renders occur during motion.

Control output is disabled, and trace changes use the renderer-local remote origin, matching the earlier GUI benchmark. This measures display load against the fixed audio stress graph; it does not measure OSC/MIDI transmission, real FX processing, mix editing, live instrument automation or application switching. The ordinary Shell main, home, worker, runtime and native headless SC host run in a disposable copy. The rack is built there, and its temporary library remains separate from production data.

Electron CPU sums main, rack renderer, home/worker renderers, GPU-process and utility CPU. **100% means one core of CPU time**, not the whole computer. GPU-process CPU is included; hardware GPU utilization, power, clocks and WindowServer CPU are not measured. SC load is the server’s DSP-load reading and must not be added to these CPU percentages.

## Baseline drawing cost

No stress nodes; source and pilot synths remain active. Means of two 10-second passes. All baseline returns were clean.

| Moving controls | HTML/SVG Electron CPU | Canvas Electron CPU |
|---:|---:|---:|
| 32 | 38.9% | 27.9% |
| 64 | 45.2% | 24.3% |
| 128 | 55.9% | 23.6% |
| 256 | 77.5% | 24.7% |
| 354 | 97.4% | 24.4% |

Canvas switches from per-cell scissored draws to a full retained-surface redraw when more than 32 cells are dirty. That explains the different rendering path at 32 versus 64 controls; it does not establish the cause of audio faults. Draw cadence stayed near the requested 31.25 batches/s, with animation-frame p95 generally around 17.5 ms. Callback cadence and draw counts do not prove every frame reached the monitor.

## Short load matrix

Two 10-second passes per cell, with condition order reversed on the second pass. Entries are **discontinuity-containing MOTU return callbacks summed over both passes**. Zero indicates a clean return in those captures. Counts are not distinct audible-click counts.

| Workload | 0 nodes | 44 nodes | 52 nodes | 60 nodes | 68 nodes | 76 nodes |
|---|---:|---:|---:|---:|---:|---:|
| idle | 0 | 0 | 0 | 0 | 77 | 56 |
| svg-32 | 0 | 0 | 0 | 1 | 6 | 98 |
| svg-64 | 0 | 0 | 0 | 0 | 31 | 168 |
| svg-128 | 0 | 0 | 0 | 17 | 16 | 130 |
| svg-256 | 0 | 0 | 0 | 71 | 78 | 326 |
| svg-354 | 0 | 0 | 0 | 33 | 129 | 484 |
| canvas-32 | 0 | 2 | 33 | 294 | 797 | 815 |
| canvas-64 | 0 | 7 | 92 | 464 | 701 | 683 |
| canvas-128 | 0 | 0 | 70 | 381 | 743 | 833 |
| canvas-256 | 0 | 3 | 78 | 434 | 706 | 804 |
| canvas-354 | 0 | 0 | 45 | 355 | 661 | 805 |

The upper sweep included two brief interim return-analysis calls (subsecond/about one second). Treat its fault totals as exploratory; the lower sweep and longer checks processed the returned signal only after capture closed. Those separate runs confirm the renderer difference without interim signal analysis. Sparse faults and non-monotonic count results are why no single universal control-count or average-load ceiling is claimed.

## Longer checks

Two 45-second passes per row, approximately 90 seconds total. Condition order reverses on pass two. The 52-node rows come from a separate final capture.

| DSP nodes | Workload | Mean SC load | Bad return callbacks | Longest zero-sample gap | Return clean |
|---:|---|---:|---:|---:|---|
| 36 | idle | 49.9% | 0 | 0.000 ms | yes |
| 36 | svg-354 | 44.5% | 0 | 0.000 ms | yes |
| 36 | canvas-32 | 52.1% | 0 | 0.000 ms | yes |
| 36 | canvas-64 | 52.4% | 0 | 0.000 ms | yes |
| 36 | canvas-354 | 52.3% | 0 | 0.000 ms | yes |
| 44 | idle | 58.2% | 0 | 0.000 ms | yes |
| 44 | svg-354 | 54.6% | 0 | 0.000 ms | yes |
| 44 | canvas-32 | 61.5% | 9 | 31.833 ms | no |
| 44 | canvas-64 | 62.2% | 16 | 31.854 ms | no |
| 44 | canvas-354 | 62.5% | 14 | 31.792 ms | no |
| 52 | idle | 66.5% | 0 | 0.000 ms | yes |
| 52 | svg-354 | 62.4% | 0 | 0.000 ms | yes |

At 44 nodes the longer canvas conditions produced delivered interruptions, including roughly 32 ms zero-sample gaps. HTML/SVG remained clean at that graph and at the heavier 52-node graph. The original software buffers can remain continuous despite a bad return, and a software over-budget flag is not a complete model of delivery. Interpret the returned samples as the acceptance measurement.

## Interpretation alongside the earlier tests

The [offline synth/send routing measurements](../../../../awb-rack-comparison/apps/rack/experiments/sc-routing/real-sources/README.md) establish processing cost for those sources and routes; they do not establish real-time deadline performance. This test supplies the missing delivered-audio boundary under GUI activity. The [scope report](scope-motu-loopback-load.md) remains a separate workload: continuous traces, display fan-out and optional focus switching. These different visible surfaces do not form a pure per-canvas marginal-cost experiment.

For this machine, the measured full-rack HTML/SVG surface is the stronger live-audio choice at high DSP load. Canvas retains a clear average CPU advantage, but its real-time delivery disadvantage needs investigation before relying on it for extra audio headroom. A useful follow-up is a matched Canvas2D/WebGL comparison, and CPU/GPU power or scheduling observations. Those optimizations and traces are not implemented here.

The clean longer points are finite observations, not guarantees: approximately 52% SC load for the tested canvas conditions and 62% for HTML/SVG in the final full-rack check. Leave margin for unpredictable instruments, note bursts, FX tails and application switching. No audible-click classification or arbitrary-music detector was used; the detector checks the known quiet pilot.

## Verification and evidence

156 measured phases, 40.5 minutes of measured phase time, and 11,786,076 verified actual value changes. Every capture positively detected an injected 80 ms mute and phase changes before measurement. All input ranges are reliable, with zero recorder queue drops and input timestamp gaps. All 16 protected Shell/native hashes and 10 rack source hashes remained unchanged. Installed scsynth text sections match the private audited copy. Owned SC and recorder processes are absent after each run.

The [routing verification](../test/signal-bench/dropout/results/2026-10-04-knobs/routing-verification.json) compares the first read-only snapshot during the upper sweep with the final snapshot: all 339 routing source fields are unchanged, and all 16 loopback mappings match the preceding report. No routing API write was issued.

Each folder retains full process/phase JSON, return analysis, native verification, zero-run analysis, compressed original native/returned samples, source snapshots, logs and screenshots. Full JSON retains its original temporary input path for replay. Restore input-return.bin.gz there to rerun the saved analysis.

- [Lower matrix](../test/signal-bench/dropout/results/2026-10-04-knobs/lower/return.json): baseline, 44 and 52 nodes; all five counts.
- [Upper sweep](../test/signal-bench/dropout/results/2026-10-04-knobs/sweep/return.json): 60, 68 and 76 nodes; all five counts.
- [Long checks](../test/signal-bench/dropout/results/2026-10-04-knobs/long/return.json): 36 and 44 nodes; idle, SVG-354, canvas-32/64/354.
- [Final HTML/SVG check](../test/signal-bench/dropout/results/2026-10-04-knobs/svg-limit/return.json): 52 nodes; idle and SVG-354.
- [Completion verification](../test/signal-bench/dropout/results/2026-10-04-knobs/completion-verification.json).

The initial smoke and interrupted 80%-zoom sweep are excluded from these tables and remain in the temporary scratch directory. All reported measurements use 100% zoom and DPR 1.

## Reproduce

From the AWB repository root, prepare the original audited SC/recorder binaries with `bash apps/awb-shell/test/signal-bench/dropout/prepare.sh`. Use Node 22 and fresh evidence prefixes. Example lower matrix:

```sh
env -u ELECTRON_RUN_AS_NODE \
  PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  AWB_AUDIO_AUDIT=/private/tmp/rack-lower.audit \
  AWB_AUDIO_AUDIT_LIBRARY=/private/tmp/awb-callback-audit.dylib \
  AWB_AUDIO_AUDIT_CHANNEL=2 AWB_PILOT_BUS=2 \
  AWB_LOOPBACK_RECORD=/private/tmp/rack-lower.input \
  node apps/awb-shell/test/signal-bench/dropout/knob-run.mjs \
  --dropout-bench --seconds=10 --repeats=2 \
  --targets=0,44,52 --load-nodes=0,44,52 --exclusive-sc \
  --output=/private/tmp/rack-lower.json > /private/tmp/rack-lower.log 2>&1

python3 apps/awb-shell/test/signal-bench/dropout/knob-analyse.py \
  /private/tmp/rack-lower rerun-lower
```

Upper matrix uses nodes 60,68,76 with the same duration/counts. Long checks use `--seconds=45 --repeats=2 --targets=36,44 --load-nodes=36,44 --conditions=idle,svg-354,canvas-32,canvas-64,canvas-354`. The final check uses nodes 52 and `--conditions=idle,svg-354`. `targets` are labels when fixed `load-nodes` is supplied; they are not claimed CPU percentages.

The original native audit holds 100,000 callbacks (~17.8 minutes at 512 frames). Keep longer matrices in separate captures. `--prepare-only` builds and checks the disposable fixture without starting SC or Electron.

Vault MCP and Telegram tools were unavailable; no external update or notification was sent.

## Diagnostic follow-up

The [focused renderer investigation](rack-motu-renderer-diagnostics.md) compares static WebGL, moving Canvas2D and the same WebGL renderer in a worker at 44 DSP nodes. It includes callback thread CPU-time bounds, WindowServer CPU and confirmation with the original audit library. Canvas2D was clean in the accepted moving captures; a worker did not reliably eliminate WebGL delivery interruptions. No production rendering optimization has been applied.

## Matched 15/30 Hz follow-up

The [HTML/SVG versus Canvas2D refresh-rate comparison](rack-motu-refresh-head-to-head.md) measures both views at actual 15 and 30 Hz with unchanged 31.25 Hz incoming updates. It retains per-pass returned-audio results, verified matched viewport dimensions, CPU costs and the excluded viewport-change captures. Canvas2D at 15 Hz was clean in both 60-node passes; the other moving conditions were not. The user subsequently confirmed about eight manual switches only during the early attempts, with none during the final non-resizable 60-node repeat. Those final measurements remain intact; exact interaction timing in earlier captures is unknown. The user also reported possible download/extraction or other background work, which was not controlled or comprehensively traced. This limits attribution of the refresh-rate audio outcomes solely to rendering. The rate gate is fixture-only; production rendering is unchanged.


## Native data bridge and Xcode follow-up

The [5 October native rack and Xcode report](rack-motu-native-bridge-and-xcode.md) adds real bidirectional SC data-bridge tests for 8 channels, 32 channels and the dense 354-control profile, plus audio-thread scheduler correlation. It separates transport correctness from CPU cost and returned audio; the earlier display-only measurements above remain historical evidence.
