# Rack renderer diagnostics at the audio limit — 4 October 2026

**Static WebGL and moving Canvas2D are materially different from moving WebGL in this setup. Moving the existing WebGL renderer into a worker did not consistently remove delivered-audio interruptions.** This investigates the [earlier rack result](rack-motu-loopback-load.md), without a 15 Hz cap or other graphics optimization.

The detailed CPU-time capture and the independent capture using the original audit library are reported separately below. These are finite observations at 44 DSP nodes, not a universal safe budget. Static SVG also had an isolated interruption in the detailed capture; absolute fault counts vary between passes and runs.

## Fixed experiment

Same Intel i7-8700B, Intel UHD Graphics 630, MOTU 1248, SC 3.12.2, Electron 44.4.1, 48 kHz, 512 hardware frames (10.667 ms), SC block size 64. Exactly 44 private stress synths throughout every measured condition. The source synth and quiet pilot remain active. MOTU output 2 returns on input 6 using the existing digital routing. No device sample-rate, buffer or routing changes.

Window 2250 × 1250, zoom 100%, DPR 1; every one of the 354 controls fits. All moving conditions apply the same 354-value triangular trace every 32 ms (~31.25 batches/s), including the 18 bottom faders. Every actual store change, final value, canvas draw-input snapshot and renderer draw count is checked. No React app/rack renders occur during motion. Static canvas conditions perform their initial/setup drawings, settle, reset counters, then make zero additional draws during capture.

Conditions run for two 45-second passes, with the order reversed on the second pass and three seconds of settling after view setup. Full rack geometry stays mounted; one renderer is visible at a time. Output is disabled, values use the renderer-local remote origin, no scope or audio-bridge capture runs, and no application switching occurs. Shell main/home/render worker/runtime and the actual headless SC host remain running. Test variants are written only into a disposable copy; production rack source is unchanged.

- **WebGL:** the existing Three.js shaders, instanced geometry, dirty-cell/full-surface threshold, retained render target and presentation pass. Only diagnostic counters/draw-state observations are added.
- **Worker WebGL:** the same WebGL drawing source, geometry, shaders and retained/presentation passes, moved to one dedicated worker through OffscreenCanvas. Main-thread store events are forwarded in a microtask batch, preserving every value change. This is execution relocation, not multicore division of one frame. Worker messages/counters add overhead. DOM-created label/glyph canvases become OffscreenCanvases.
- **Canvas2D:** a diagnostic implementation drawing the same layout, controls, values, labels and colours with the 2D API, at the same incoming cadence and dirty/full threshold. It is functionally matched, not pixel-identical or algorithm-identical to the shader renderer. It is not a production UI replacement, and Canvas2D is not assumed to be software-only.

The diagnostic main-thread implementations record the values consumed by each draw. Worker readiness, final state and counters are explicitly awaited. Canvas2D/worker fixtures are for automated comparison; the production interaction/mix editor remains unchanged.

## Delivered return: detailed CPU-time capture

| Condition | Electron CPU | WindowServer CPU | SC load | Return callbacks with discontinuities | Max zero gap | Clean |
|---|---:|---:|---:|---:|---:|---|
| Static SVG | 1.2% | 12.2% | 56.2% | 3 | 31.521 ms | no |
| Static WebGL | 0.9% | 10.0% | 54.3% | 0 | 0.000 ms | yes |
| Moving WebGL | 19.9% | 19.7% | 62.1% | 67 | 63.792 ms | no |
| Moving Canvas2D | 44.3% | 13.6% | 54.8% | 0 | 0.000 ms | yes |
| Moving worker WebGL | 26.7% | 16.1% | 60.6% | 7 | 31.646 ms | no |

## Confirmation: original audit, no additional CPU-time probe

| Condition | Electron CPU | WindowServer CPU | SC load | Return callbacks with discontinuities | Max zero gap | Clean |
|---|---:|---:|---:|---:|---:|---|
| Static SVG | 0.9% | 6.4% | 56.8% | 0 | 0.000 ms | yes |
| Moving WebGL | 18.8% | 18.3% | 61.2% | 22 | 31.854 ms | no |
| Moving Canvas2D | 43.7% | 14.4% | 55.1% | 0 | 0.000 ms | yes |
| Moving worker WebGL | 25.6% | 16.9% | 60.7% | 17 | 31.833 ms | no |

CPU percentages above are one-core equivalents, not percentages of the whole machine. Electron includes main, renderers, GPU-process and utility CPU; WindowServer is measured separately. These are cumulative process CPU counters. WindowServer is system-wide and includes other desktop activity; its CPU cannot be attributed entirely to the rack. Other desktop applications were not stopped, and no CPU affinity or priority was changed. SC load is a separate DSP elapsed-time metric and must not be added to process CPU percentages. Hardware GPU utilization, power and clock rates were not measured. Return callback counts are not counts of distinct audible clicks.

## Callback execution versus time off CPU

A private variant of the existing native callback audit samples Mach `THREAD_BASIC_INFO` user + system CPU time immediately before and after the original SC audio callback. The ordinary audit record format remains unchanged; a second mapped sidecar holds CPU deltas and the elapsed cost of both queries. No file I/O, logging or allocation is added inside the measured DSP body. The first callback obtains the thread port; later callbacks reuse it. This assumes the device callback stays on that thread during the unchanged-device run.

The CPU-query interval encloses the measured DSP interval, so raw CPU deltas include a little query CPU time. They can therefore slightly exceed DSP wall time. The analyser uses both measured query durations and 2 µs counter quantization to retain lower/upper bounds on time off CPU; it does not equate raw subtraction with exact scheduler delay.

| Condition | Mean callback wall time | Mean raw thread CPU time | Largest off-CPU lower bound |
|---|---:|---:|---:|
| Static SVG | 6.002 ms | 6.012 ms | 0.000 ms |
| Static WebGL | 5.788 ms | 5.796 ms | 0.000 ms |
| Moving WebGL | 6.609 ms | 6.619 ms | 0.000 ms |
| Moving Canvas2D | 5.851 ms | 5.860 ms | 0.000 ms |
| Moving worker WebGL | 6.475 ms | 6.485 ms | 2.862 ms |

**The long ordinary-WebGL callbacks were predominantly accounted for as thread CPU time, rather than substantial time off CPU.** This weakens simple ready-queue starvation as the dominant explanation for those callbacks. It is consistent with slower execution from clock/power behaviour or shared-resource contention, and could include kernel CPU work charged to the thread. It does not identify which mechanism occurred.

One worker callback had approximately 2.86 ms of off-CPU time (lower bound), so occasional scheduling/blocking delays can also contribute. Neither this bound nor a callback deadline miss establishes which competing process caused it. No system scheduler trace was collected.

The independent clock sanity check demonstrated that sleeping time is excluded while busy computation is counted:

```text
sleep wall_ms=22.674 cpu_ms=0.017
busy wall_ms=20.000 cpu_ms=19.942 value=0.948515
```

The additional probe is small relative to the 10.667 ms hardware period; its full per-phase overhead distributions are retained. The separate original-audit capture tests whether the overall renderer difference survives removing it.

## Interpretation

1. A dormant WebGL surface did not reproduce the sustained extra load of its moving counterpart. Having a context open alone is not the strongest explanation in these finite checks.
2. Canvas2D is promising for this controller: it retained a substantial CPU saving relative to the earlier moving SVG measurements and avoided the observed WebGL delivery disadvantage here. This is evidence for a different rendering path, not proof that all GPU use is bad or that this diagnostic implementation is ready to ship.
3. One worker did not reliably cure the WebGL delivery problem and used more process CPU than main-thread WebGL. More rendering workers are not justified by these observations alone.
4. CPU-time measurements favour investigating execution speed/shared resources before treating audio-thread priority as the principal fix. CPU/GPU clocks, package power, cache/memory behaviour and graphics-driver work remain candidates.
5. A separate 15 Hz experiment can now test the user's proposed mitigation: latest-state coalescing and refresh-aligned drawing, keeping control state/audio commands immediate. It could improve either SVG or canvas without proving the mechanism. No rate cap, worker pool, GPU shader optimization or production rendering change was made here.

`powermetrics` requires administrator credentials (`sudo: a password is required`), and `xctrace` is absent from the installed Command Line Tools. No permission/settings change was made. Per-phase `pmset -g therm` snapshots and a display/GPU inventory are retained; those policy snapshots are not live clock measurements. Determining the specific hardware cause remains open.

## Validation, excluded capture and provenance

**18 accepted phases, 13.6 minutes of measured phase time and 5,976,936 verified actual value changes.** Both accepted captures pass the original exact-range native checks, input-range checks, positive injected mute/phase detector checks, recorder reliability checks, source guards and process cleanup. No recorder queue drops or input timestamp gaps. All 16 protected Shell/native hashes and 10 rack source hashes remain unchanged; copied scsynth text sections match the installed executable.

An earlier 16-phase capture (`limit44`) is excluded from the accepted tables. Its second worker-moving phase had a 0.505 s native/CPU interval difference, failing the original 0.35 s check. The boundary code had read and parsed the cumulative native audit merely to obtain its count. The diagnostic runner now reads the header only at that boundary. The original capture and return analysis remain in the scratch directory as exploratory evidence; the failed timing assertion was not relaxed. The eight short no-stress smoke phases are also excluded.

Read-only before/after MOTU routing snapshots are compared in [completion verification](../test/signal-bench/dropout/results/2026-10-04-rack-diagnostics/completion-verification.json). The accepted evidence folders retain raw compressed callback/returned samples, CPU sidecar where active, exact ranges, source and generated-renderer snapshots, logs, screenshots, SHA-256 checksums and per-phase process CPU. Every owned SC, recorder and disposable Electron process is absent after completion.

- [Detailed capture](../test/signal-bench/dropout/results/2026-10-04-rack-diagnostics/decisive44/return.json)
- [CPU-time analysis](../test/signal-bench/dropout/results/2026-10-04-rack-diagnostics/decisive44/thread-cpu-analysis.json)
- [Probe-free confirmation](../test/signal-bench/dropout/results/2026-10-04-rack-diagnostics/unprobed44/return.json)
- [Diagnostic renderer installer](../test/signal-bench/dropout/diagnostic-renderers.mjs)

## Reproduce

Use the original test preparation only if its private binaries are missing: `bash apps/awb-shell/test/signal-bench/dropout/prepare.sh`. Use Node 22. For the CPU-time variant, run `python3 apps/awb-shell/test/signal-bench/dropout/diagnostic-prepare-thread.py`, then compile the generated source:

```sh
clang++ -std=c++17 -dynamiclib -O2 -framework CoreAudio \
  /private/tmp/awb-rack-diagnostics-20261004/callback-thread-audit.cpp \
  -o /private/tmp/awb-rack-diagnostics-20261004/callback-thread-audit.dylib
```

Choose a fresh prefix for every run. Example detailed capture, from the AWB repository root:

```sh
env -u ELECTRON_RUN_AS_NODE \
  PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  AWB_AUDIO_AUDIT=/private/tmp/rack-diagnostic.audit \
  AWB_THREAD_CPU_AUDIT=/private/tmp/rack-diagnostic.cpu \
  AWB_AUDIO_AUDIT_LIBRARY=/private/tmp/awb-rack-diagnostics-20261004/callback-thread-audit.dylib \
  AWB_AUDIO_AUDIT_CHANNEL=2 AWB_PILOT_BUS=2 \
  AWB_LOOPBACK_RECORD=/private/tmp/rack-diagnostic.input \
  node apps/awb-shell/test/signal-bench/dropout/diagnostic-run.mjs \
  --dropout-bench --seconds=45 --repeats=2 --targets=44 --load-nodes=44 \
  --conditions=idle,webgl-static,webgl-354,canvas2d-354,worker-354 --exclusive-sc \
  --output=/private/tmp/rack-diagnostic.json > /private/tmp/rack-diagnostic.log 2>&1

python3 apps/awb-shell/test/signal-bench/dropout/diagnostic-analyse.py \
  /private/tmp/rack-diagnostic fresh-diagnostic
```

For probe-free confirmation omit `AWB_THREAD_CPU_AUDIT`, use `/private/tmp/awb-callback-audit.dylib`, and select `idle,webgl-354,canvas2d-354,worker-354`. Optional `canvas2d-static`, `worker-static`, and `svg-354` conditions remain available. Every native audit holds 100,000 callbacks; keep longer matrices in separate captures and do analysis after capture closes.

Telegram and Vault MCP were unavailable; no external notification/update was sent. No commits or production application changes.

## Matched 15/30 Hz follow-up

The [HTML/SVG versus Canvas2D refresh-rate comparison](rack-motu-refresh-head-to-head.md) measures both views at actual 15 and 30 Hz with unchanged 31.25 Hz incoming updates. It retains per-pass returned-audio results, verified matched viewport dimensions, CPU costs and the excluded viewport-change captures. Canvas2D at 15 Hz was clean in both 60-node passes; the other moving conditions were not. The user subsequently confirmed about eight manual switches only during the early attempts, with none during the final non-resizable 60-node repeat. Those final measurements remain intact; exact interaction timing in earlier captures is unknown. The user also reported possible download/extraction or other background work, which was not controlled or comprehensively traced. This limits attribution of the refresh-rate audio outcomes solely to rendering. The rate gate is fixture-only; production rendering is unchanged.
