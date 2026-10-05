# Native rack data bridge and Xcode audio diagnosis — 5 October 2026

The tested implementation is `ea338b9` on `integration/bw-sc`. The practical 8-channel bridge passes the control tests; continuous whole-matrix GUI automation overflows the current dense bridge, while SC-origin automation passes at every tested size. These measurements separate renderer cost, transport correctness, and audio delivery. A run with wrong control values or a disarmed bridge is a capacity failure, even if its CPU or returned audio looks favourable.

The requested additional topology was subsequently clarified as **32 sends per channel**, rather than 32 channels. The [corrected eight-channel, 32-send test](rack-motu-sends32-bridge.md) reports that profile. The original wide-channel measurements below remain valid as a separate experiment.

## Setup and scope

Intel i7-8700B (6 physical/12 logical cores), Intel UHD 630, 32 GB RAM; MOTU 1248; SC 3.12.2; Electron 44.4.1. The MOTU temporarily ran at 48 kHz with 512 hardware frames (10.667 ms), SC block size 64, then returned to its original 44.1 kHz setting. No MOTU routing changes. Output 2 returns digitally to input 6. A quiet 997 Hz pilot measures real delivered audio independently of SC's generated output.

The native matrix uses 60 unchanged synthetic DSP load nodes, plus the actual native rack audio graph. Each channel has a quiet stereo sine source feeding its persistent input bus; each destination has a pass processor, return and route to the master. ToolInstance, Tool and NodeManager are the actual local classes, with NodeManager enabled and the instance tracked. The rack classes are compiled from the repository through a private sclang configuration; the installed configuration and live classes are not edited.

The sources and pass processors exercise ownership, routing, control updates and server read-back. They do not model eight real instrument DSP chains or the Bitwig effect chains. Followers, mixed waveform/scope UI loads, hardware clock/power diagnosis, and Bitwig effect migration remain subsequent work.

The rack data bridge is the ordinary WS/OSC connection in both directions. There is no scope display or audio-bus-to-shell capture in the native matrix. The returned-audio recorder is diagnostic instrumentation, not the shell audio bridge.

| Profile | Instrument channels | Destinations | Moving controls | Mounted controls |
|---|---:|---:|---:|---:|
| Practical | 8 | 9: 5 fixed FX, 3 dynamic FX, clean Mast | 89 | 105 |
| Wide | 32 | Same 9 destinations | 329 | 393 |
| Dense comparison | 14 | 24 placeholder FX destinations | 354 | 382 |

The practical and wide profiles move all sends, all returns and all channel faders. Mute/solo controls stay mounted and static. The dense profile moves 336 sends and 18 returns; 20 static faders are omitted to fit. It has 402 configured controls, so its mounted layout is not identical to the earlier display-only fixture. The wide profile retains normal-size horizontal bottom faders in three rows.

All native captures use a fixed 2250 × 1322 content viewport, DPR 1, with every mounted control inside the rack's actual scroll region. The metadata panel is hidden equally in both renderers. Only one renderer is visible. The 15/30 Hz gates are refresh-aligned, latest-state rendering gates in disposable fixtures; incoming automation remains approximately 31.25 batches/s, not 15/30 commands/s. Canvas2D is the diagnostic 2D renderer, not Three.js/WebGL.

## Native bridge: correctness before cost

There are 84 completed native captures: 60 GUI-origin comparisons (three sizes, bridge off/on, idle plus four moving conditions, two passes), followed by 24 SC-origin captures (three sizes, four moving conditions, two passes). All 84 recorders are reliable. There are 68 functional passes and 16 recorded transport failures; a completed capture is not necessarily a functional pass. Each requested workload lasts 45 seconds. The second pass reverses size/condition/bridge order. Captures are untraced and run separately to avoid accumulated recorder limits and trace-export interference.

| Profile | GUI-origin, bridge off, moving | GUI-origin, bridge on, moving | SC-origin, bridge on, moving |
|---|---:|---:|---:|
| 8 channels | 8/8 | 8/8 | 8/8 |
| 32 channels | 8/8 | 0/8 | 8/8 |
| 354 moving controls | 8/8 | 0/8 | 8/8 |

The 32-channel GUI-origin workload changes 329 controls every 32 ms: 462,903 changes per run, approximately 10,281 control messages/s. The practical profile changes 89 controls, 125,223 changes per run (about 2,781/s). This is continuous whole-matrix automation, not the normal traffic from dragging one control.

Dense GUI-origin failures include incomplete accepted revisions, wrong SC/server endpoints, and a runtime Sync timeout that disarms output. The exact error is `SC rack Sync timed out; the bound ToolInstance may be closed.` Ownership/source checks remained intact; this is not evidence that the ToolInstance was deliberately closed.

In the first 32-channel SVG 15 Hz failure, 280,271 commands were sent but 235,542 SC revisions were accepted: a deficit of 44,729. The system's UDP full-socket-buffer drop counter increased by 44,732 over that run. These are global counters, not a socket-specific capture, but their close agreement strongly supports UDP receiver overflow. Both renderers and both paint caps reproduced dense GUI-origin failures. No production transport fix or socket-setting change was applied.

Failed bridge-on runs are retained as capacity evidence. Their CPU averages can include a disarmed interval and are deliberately excluded from the successful live-cost tables below. A low average or clean pilot after disarming does not establish a cheap, working bridge.

## Practical 8-channel GUI-origin cost

Means of the two passes. Bad return callbacks retain separate pass counts; they are not averaged into a misleading clean/noisy label.

| View/cap | Electron off | Electron on | sclang on | SC load on | Bad return callbacks on (pass 1 / 2) |
|---|---:|---:|---:|---:|---:|
| idle | 2.0% | 2.0% | 0.1% | 74.4% | 1 / 0 |
| svg-15 | 23.6% | 55.9% | 26.6% | 73.0% | 0 / 5 |
| svg-30 | 37.8% | 69.8% | 28.0% | 75.2% | 8 / 0 |
| canvas2d-15 | 16.9% | 49.8% | 27.4% | 74.5% | 0 / 3 |
| canvas2d-30 | 25.2% | 58.2% | 28.0% | 75.2% | 3 / 0 |

## SC-origin automation with data feedback enabled

Means of two passes. SC performs the same triangular control trace through the actual rack setters; the UI receives ordinary feedback and sends no reflected control commands. Actual paint rate is shown: a 30 Hz cap does not imply 30 Hz achieved rendering when feedback coalescing supplies fewer drawable updates.

| Profile | View/cap | Actual paint Hz | Electron CPU | sclang CPU | SC load | Bad return callbacks (pass 1 / 2) |
|---|---|---:|---:|---:|---:|---:|
| 8 ch | svg-15 | 15.00 | 22.6% | 7.5% | 73.1% | 0 / 0 |
| 8 ch | svg-30 | 16.97 | 24.5% | 7.9% | 73.5% | 0 / 0 |
| 8 ch | canvas2d-15 | 15.00 | 16.4% | 8.0% | 74.0% | 0 / 0 |
| 8 ch | canvas2d-30 | 16.92 | 17.2% | 7.8% | 74.2% | 0 / 0 |
| 32 ch | svg-15 | 15.00 | 57.6% | 26.2% | 74.6% | 5 / 0 |
| 32 ch | svg-30 | 17.74 | 65.9% | 26.6% | 75.0% | 24 / 1 |
| 32 ch | canvas2d-15 | 15.00 | 37.8% | 26.0% | 75.2% | 6 / 0 |
| 32 ch | canvas2d-30 | 17.41 | 40.2% | 25.9% | 75.5% | 6 / 0 |
| 354 controls | svg-15 | 15.00 | 58.0% | 27.6% | 73.8% | 0 / 0 |
| 354 controls | svg-30 | 17.57 | 65.9% | 28.5% | 73.7% | 4 / 0 |
| 354 controls | canvas2d-15 | 15.00 | 36.6% | 27.7% | 74.5% | 0 / 0 |
| 354 controls | canvas2d-30 | 17.47 | 39.9% | 29.0% | 76.0% | 0 / 140 |

The dense Canvas2D 30 Hz repeat with 140 bad return callbacks coincided with coreduetd at 12.91% and mediaanalysisd at 9.94% of one core over the surrounding 47.08-second marker interval. These counters flag a possible confound, not a causal diagnosis.

SC-origin success tests the feedback path and server writes, not the capacity of the GUI-origin command path. It supports keeping dense compositional automation inside SC; it does not make a broken GUI-origin bridge acceptable.

## Untraced display-only comparator

This separate two-pass 60-node comparison moves the earlier 354-control fixture, with output disabled, before adding the native rack graph. It is not a direct subtraction baseline for the differently sized native profiles.

| Condition | Electron CPU | SC load | Bad return callbacks (both passes combined) |
|---|---:|---:|---:|
| Idle | 0.9% | 73.2% | 10 |
| SVG 15 Hz | 46.0% | 71.2% | 0 |
| SVG 30 Hz | 81.6% | 71.2% | 9 |
| Canvas2D 15 Hz | 29.7% | 72.3% | 0 |
| Canvas2D 30 Hz | 42.0% | 72.0% | 0 |

Both native and display-only repeats have occasional returned-audio faults near the limit, including idle or bridge-off phases. These observations do not establish a universal safe DSP threshold or a guarantee that 15 Hz eliminates interruptions.

## Xcode: where the long callbacks spend their time

Two System Trace captures were exported and joined to the native callback audit: a faulty Canvas2D 30 Hz capture and a clean SVG 30 Hz capture. The correlation overlaps each DSP body's monotonic start/end with Xcode thread-state intervals; phase clock uncertainty is retained rather than treated as exact.

| Capture | Callbacks | Over budget | Mean DSP wall | Mean Running | Worst DSP wall | Worst Running |
|---|---:|---:|---:|---:|---:|---:|
| Faulty Canvas2D 30 Hz | 4,162 | 63 | 8.033 ms | 8.003 ms | 13.394 ms | 13.351 ms |
| Clean SVG 30 Hz | 4,251 | 0 | 7.677 ms | 7.650 ms | 10.524 ms | 10.483 ms |

SC's audio IO thread had priority 97 throughout both traces. In the faulty capture, the 63 over-budget DSP bodies averaged 11.407 ms wall time and 11.362 ms in Running state. Their largest observed off-CPU interval was 75 µs; the conservative upper bound including clock alignment uncertainty was 198 µs. None had Runnable time inside the DSP body. The worst callback had approximately 43 µs off CPU, with a conservative upper bound of 166 µs.

This strongly weakens large scheduling/preemption delays as the explanation for these callbacks. Xcode's Running state means the thread was assigned a CPU; it can include stalls or kernel work, and does not prove SC executed more instructions. CPU/graphics power and clock behaviour, shared caches/memory and sibling-thread contention remain candidates. Hardware GPU utilization, clocks and power were not measured.

The faulty replacement capture coincided with substantial background activity: mediaanalysisd used 72.16% of one core and mds_stores 12.31% over the recorded surrounding interval. This prevents attributing that failure to Canvas2D or the profiler alone. The six accepted Audio System Trace captures were mostly clean, with one bad return callback in one SVG 30 Hz pass. Instrumentation and background work can perturb this near-limit setup; the untraced comparisons are kept separate.

An earlier System Trace Canvas2D capture was excluded because the input recorder dropped 40 queued blocks during expensive trace saving. The single-phase wrapper now stops the recorder immediately after the captured range and before profiler saving. The replacement has zero recorder drops; its real returned-audio failures remain reported.

## Validation and evidence

Each native capture checks source guards, actual ToolInstance identity and NodeManager tracking, mounted visibility, final GUI values, accepted SC revisions, actual server send-gain arrays and channel/return levels, bridge error/disarm state, and owned-process cleanup. SC-origin runs also require zero reflected GUI commands. Every value in the sender workload changes. Actual store changes and draws are counted separately; the SC feedback path intentionally coalesces intermediate states. These are moving-control measurements rather than scene bookkeeping. All 72 moving native phases had zero React app renders, and all 24 SC-origin phases had zero reflected control commands.

Independent returned audio is analysed with the existing positive injected mute/phase detector checks. Recorder queue drops and input timestamp gaps invalidate delivery evidence. Callback discontinuity counts are not counts of distinct audible clicks. A clean 45-second observation is not a guarantee of safe live use.

CPU percentages are one-core equivalents: 100% means one core's CPU time, not the whole machine. Electron totals include main, renderers, GPU and utility processes. sclang, scsynth, the recorder and system-wide WindowServer are measured separately. SC average load is a DSP elapsed-time metric; it cannot be added to process CPU percentages. Neither the GPU process's CPU nor WindowServer measures hardware GPU utilization.


Final checks passed: three Node syntax checks, 6/6 phase-alignment tests, current read-back of all 36 source guard entries, and zero React rack/control renders in every moving native phase. The completion inventory found none of the 756 captured owned process IDs alive. MOTU read-back confirmed 44.1 kHz.

## Next engineering step

Keep 15 Hz refresh-aligned painting and keep dense compositional automation inside SC. Canvas2D retains a renderer CPU advantage; for GUI-origin traffic, transport work consumes much of the overall cost. Prioritize bounded OSC bundles/coalescing and recovery under congestion, then repeat the 32-channel GUI-origin cases. The packet-loss finding needs a transport fix and a successful endpoint/revision repeat before those failed captures can count as working live-controller benchmarks.

The Xcode result gives a useful boundary: audio spends almost all of its long DSP bodies assigned to a CPU. It does not identify a hardware cause. Increasing thread priority or adding rendering workers is not supported as the first fix by these captures.

## Retained artifacts and reproduction

- [Native per-case results and source guards](../test/signal-bench/dropout/results/2026-10-05-native-rack/native-summary.json)
- [Completion and MOTU restoration verification](../test/signal-bench/dropout/results/2026-10-05-native-rack/completion-verification.json)
- [System/Audio System Trace cases, including the excluded recorder capture](../test/signal-bench/dropout/results/2026-10-05-native-rack/step0-captures.json)
- [Callback/scheduler correlations](../test/signal-bench/dropout/results/2026-10-05-native-rack/scheduler-correlation.json)
- [Untraced display-only comparator](../test/signal-bench/dropout/results/2026-10-05-native-rack/display-only-summary.json)
- [Native benchmark runner](../test/signal-bench/dropout/native-run.mjs), [fixture installer](../test/signal-bench/dropout/native-rack-fixture.mjs), [SC producer](../test/signal-bench/dropout/native-producer.scd)

Raw captures, returned samples, screenshots, generated fixtures and profiler exports remain in `/private/tmp/awb-native-live-v3-ea338b9`, `/private/tmp/awb-step0-system-ea338b9`, `/private/tmp/awb-step0-followups-ea338b9`, `/private/tmp/awb-step0-scheduler-ea338b9`, and `/private/tmp/rack-off2-20261004-ea338b9.*`. Curated JSON retains raw-report hashes, ranges, metrics and guard catalogues. Private scratch paths are not durable backups; large raw samples and trace exports are not committed. Historical analysis scripts are saved beside the curated results.

Earlier native V1/V2 attempts stopped on a real bridge error or on a fixture accounting assumption invalidated by SC resynchronization. They are excluded from the matched V3 tables. V3 retains runtime errors/disarming and endpoint/accounting failures as negative functional results instead of aborting the remaining conditions. Structural, identity, visibility, recorder and source checks remain strict. No production application code changed during these captures.

Preparation is the default; actual audio requires `--run --quiet-window`. Use Node 22+, the installed Xcode developer directory, the existing private callback/recorder binaries, a fresh absolute prefix, and a confirmed quiet machine at the agreed 48 kHz/512-frame setup. Example single wide case from the repository root:

```sh
env -u ELECTRON_RUN_AS_NODE \
  PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  AWB_NATIVE_RACK_SIZE=32 AWB_NATIVE_BRIDGE=on AWB_NATIVE_DIRECTION=sc \
  AWB_AUDIO_AUDIT=/private/tmp/fresh-wide-sc.audit \
  AWB_AUDIO_AUDIT_LIBRARY=/private/tmp/awb-callback-audit.dylib \
  AWB_AUDIO_AUDIT_CHANNEL=2 AWB_PILOT_BUS=2 \
  AWB_LOOPBACK_RECORD=/private/tmp/fresh-wide-sc.input \
  node apps/awb-shell/test/signal-bench/dropout/native-run.mjs \
  --run --quiet-window --trace-mode=off --load-nodes=60 --targets=60 \
  --seconds=45 --repeats=1 --conditions=canvas2d-15 --exclusive-sc \
  --output=/private/tmp/fresh-wide-sc.json

node apps/awb-shell/test/signal-bench/dropout/analyse-input.mjs /private/tmp/fresh-wide-sc
```

Select `AWB_NATIVE_DIRECTION=gui` for GUI-origin testing; `AWB_NATIVE_BRIDGE=off` provides its transport-disabled comparator. `AWB_NATIVE_RACK_SIZE=small|32|large` selects the profiles. The runner verifies current sample rate; it does not configure MOTU routing or change rate itself. Restore the previous device rate after a manually configured future run.

The earlier [renderer diagnostics](rack-motu-renderer-diagnostics.md) and [refresh-rate comparison](rack-motu-refresh-head-to-head.md) retain their historical measurements. This report adds the actual native data bridge and scheduler traces rather than silently replacing those earlier conditions.

Telegram notification was unavailable in this session; no external notification was sent.
