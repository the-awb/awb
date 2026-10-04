# Rack refresh-rate head-to-head — 4 October 2026

HTML/SVG and Canvas2D were compared at measured 15 and 30 Hz, with identical incoming updates and verified rack/window geometry. Canvas2D used less Electron CPU at both rates. After testing, the user reported manually resizing the window and making about eight app/window switches, then confirmed those switches were only during the early attempts. The final non-resizable 60-node capture was unaffected by those manual switches: Canvas2D 15 Hz was the only moving condition clean in both passes. Exact interaction timing in the earlier captures remains unknown. The user also reported that downloading, unpacking or other background work may have overlapped some tests. Whole-machine background work was neither controlled nor comprehensively traced, so the observed audio differences cannot be attributed solely to the renderer or refresh rate.

## Post-run interaction and background context

The user confirmed that the observed resizing was manual and reported about eight app/window switches. They then clarified: **only during the early attempts, not the final runs after the window became non-resizable**. The final `load60` capture therefore retains its comparison without those reported manual switches. This conclusion uses the user's confirmation; the harness did not independently record manual focus changes.

The user subsequently qualified “untouched”: downloads, extraction/unzipping or other processes may still have been active. This does not retract their confirmation about manual switches. It does mean that no capture, including the final one, has a verified quiet whole-machine baseline. Whether any particular background job overlapped a particular phase is unknown; do not assert that extraction or downloading actually caused a recorded fault.

Known-process CPU sampling and system-wide WindowServer CPU do not account for every unrelated process or disk operation. There was no whole-machine scheduling/I/O trace. The final table remains an accurate account of the recorded passes, but the causal interpretation is limited: Canvas2D 15 Hz stayed clean in that capture, while other conditions faulted under potentially different background activity. The repeated CPU/cadence pattern is useful evidence; it is not a controlled measurement of all machine resource costs or a proven renderer-only audio ceiling.

Resizing invalidated the captures listed below. The accepted upper reruns guard dimensions, and the final 60-node repeat also makes the window non-resizable. Those controls prevent/detect resizing, not app switching. Empty `focusEvents` arrays do not prove the absence of manual switches.

Exact switch timing within the earlier attempts is unknown. Earlier accepted captures (`load44` and `load56`) should not be treated as independently verified untouched steady-drawing runs. Preserve their measurements, but do not attribute every earlier fault to the renderer, or assume comparable switches across conditions. CPU and cadence trends remain recorded observations; earlier CPU averages, especially system-wide WindowServer CPU, may include interaction costs.

Accepted capture windows, in Europe/London local time (BST):

- 44 nodes: 11:42–11:50.
- 56 nodes: 12:14–12:23.
- 60 nodes: 12:36–12:44.

See [post-run context](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/post-run-context.json). The final 60-node observations retain verified fixed geometry and the user-confirmed absence of manual switches. Their attribution to rendering alone remains unresolved because background work was not controlled. A future trace should log focus changes and whole-machine CPU scheduling/process activity and I/O around faults; earlier phase attribution would also require more precise interaction timing.

## Matched setup

Same Intel i7-8700B, UHD Graphics 630, MOTU 1248, SC 3.12.2 and Electron 44.4.1 as the [original rack test](rack-motu-loopback-load.md) and [renderer diagnostics](rack-motu-renderer-diagnostics.md). 48 kHz, 512 hardware frames (10.667 ms), SC block size 64. Fixed private stress synth counts: 44, 56 and 60 to bracket the failure region. The guarded upper-load captures run at 56 then 60; initial upper captures are excluded below. No Xcode/Instruments tracing or added audio-thread CPU probe.

354 controls (336 sends and 18 bottom level faders) remain mounted and visible in a 2250 × 1250 window at DPR 1. All 354 receive a triangular value change every 32 ms (31.25 batches/s, 11,062.5 value changes/s). Incoming/store changes stay immediate; only painting is coalesced. Output remains off, values use the renderer-local remote origin, and no scope/audio-bridge capture or automated app-switch workload runs. Manual switches were later reported for the early attempts; the user confirmed none during the final non-resizable 60-node repeat. The intended workload isolates visual load and does not benchmark live OSC transmission or SC language parameter handling.

Each load uses two 45-second passes per condition, reversing condition order on the second pass. Three seconds of settling follows renderer setup. One renderer is visible at a time. Idle is the SVG rack mounted with no value changes. Shell main, home, render worker, runtime, headless sclang/scsynth and native return recorder remain running. Other desktop applications are left alone; no CPU priority or affinity changes.

Both drawing paths use the same fixture-only, on-demand requestAnimationFrame gate. Pending changes keep only the latest visual state. Painting follows target deadlines on browser refresh callbacks, skips missed deadlines rather than catching up, and stops when nothing is dirty. Shape/text preparation happens at paint time. SVG retains per-control subscriptions and attribute/text updates; it does not rerender the React tree. Canvas2D draws the existing diagnostic rack implementation. No production rendering changes were installed. The upper comparisons verify bounds throughout each phase; the final 60-node window is also non-resizable. Production selector/heading text still says Three.js, but the fixture renderer is explicitly selected and verified as Canvas2D.

The Canvas2D fixture draws the same layout/control values/labels/colours, but is not pixel-identical and does not implement the production pointer, keyboard and mix-editor UI. Canvas2D may be hardware accelerated; its actual backend is not established by this experiment. Earlier “Canvas” results referred to Three.js/WebGL, not this 2D renderer.

## Process CPU and achieved cadence

CPU percentages are one-core equivalents: 100% means one fully occupied core. Electron includes main/renderers/GPU-process/utility CPU. WindowServer is measured separately and is system-wide, so includes other desktop activity. SC load measures DSP elapsed time against its budget and cannot be added to process CPU. Hardware GPU utilization, clocks, power and driver scheduling are not measured.

| DSP nodes | View/rate | Actual paint Hz | Electron CPU | WindowServer CPU | SC load |
|---:|---|---:|---:|---:|---:|
| 44 | Idle SVG | 0.00 | 0.9% | 1.3% | 57.5% |
| 44 | HTML/SVG 15 | 15.00 | 49.4% | 11.8% | 54.6% |
| 44 | HTML/SVG 30 | 29.99 | 86.2% | 14.8% | 54.2% |
| 44 | Canvas2D 15 | 15.00 | 31.0% | 11.2% | 55.5% |
| 44 | Canvas2D 30 | 29.99 | 43.5% | 12.2% | 55.4% |
| 56 | Idle SVG | 0.00 | 0.9% | 7.7% | 68.6% |
| 56 | HTML/SVG 15 | 15.00 | 50.0% | 16.1% | 67.4% |
| 56 | HTML/SVG 30 | 29.98 | 86.2% | 18.2% | 67.7% |
| 56 | Canvas2D 15 | 14.99 | 30.1% | 16.2% | 67.9% |
| 56 | Canvas2D 30 | 29.99 | 43.2% | 16.4% | 68.4% |
| 60 | Idle SVG | 0.00 | 0.8% | 8.6% | 71.8% |
| 60 | HTML/SVG 15 | 15.00 | 49.4% | 16.5% | 71.6% |
| 60 | HTML/SVG 30 | 29.99 | 86.4% | 18.8% | 72.2% |
| 60 | Canvas2D 15 | 14.99 | 30.4% | 16.7% | 71.6% |
| 60 | Canvas2D 30 | 29.99 | 43.1% | 17.4% | 74.5% |

Actual paint cadence is measured separately from the browser rAF cadence. Moving phases paint roughly 676 times at 15 Hz and 1,351 times at 30 Hz, for 1,407 incoming batches. The content viewport is verified as 2250 × 1222 in every accepted phase; the upper reruns also continuously guard native window dimensions. All requested values change in the store and all final displayed/drawn values are checked after the queue drains. Skipped intermediate visual values are intentional coalescing.

The JavaScript paint callback alone does not represent total browser cost: SVG spends less measured callback time than Canvas2D while using more total Electron CPU. The tables include process CPU outside those callbacks.

## Actual MOTU return

Fault counts below are callbacks with returned-signal discontinuities, not distinct clicks. The maximum zero run is measured from returned PCM. Clean requires no discontinuities, silence callbacks, timestamp gaps or recorder losses, with the pilot signal present.

| DSP nodes | View/rate | Fault callbacks, pass 1 / 2 | Max zero gap | Both passes clean |
|---:|---|---:|---:|---|
| 44 | Idle SVG | 0 / 0 | 0.000 ms | yes |
| 44 | HTML/SVG 15 | 0 / 0 | 0.000 ms | yes |
| 44 | HTML/SVG 30 | 0 / 0 | 0.000 ms | yes |
| 44 | Canvas2D 15 | 0 / 0 | 0.000 ms | yes |
| 44 | Canvas2D 30 | 0 / 0 | 0.000 ms | yes |
| 56 | Idle SVG | 0 / 0 | 0.000 ms | yes |
| 56 | HTML/SVG 15 | 4 / 0 | 0.000 ms | no |
| 56 | HTML/SVG 30 | 0 / 0 | 0.000 ms | yes |
| 56 | Canvas2D 15 | 0 / 0 | 0.000 ms | yes |
| 56 | Canvas2D 30 | 0 / 0 | 0.000 ms | yes |
| 60 | Idle SVG | 0 / 0 | 0.000 ms | yes |
| 60 | HTML/SVG 15 | 5 / 10 | 53.208 ms | no |
| 60 | HTML/SVG 30 | 9 / 0 | 31.854 ms | no |
| 60 | Canvas2D 15 | 0 / 0 | 0.000 ms | yes |
| 60 | Canvas2D 30 | 107 / 4 | 42.542 ms | no |

At 56 nodes (~68% SC load), both Canvas2D rates and SVG 30 Hz were clean in both passes; SVG 15 Hz had four discontinuity callbacks in its first pass. At 60 nodes (~72% SC load), Canvas2D 15 Hz was the only moving condition clean in both passes. The user confirmed that the final non-resizable 60-node repeat had none of the reported manual switches. Its measured outcomes remain intact, but possible unmeasured background work limits causal comparison even there. Earlier phase attribution is also uncertain. These observations do not establish a renderer-only or universal operating ceiling.

Returned faults and native overruns are different measurements. A returned discontinuity can occur without a measured DSP overrun, which is why delivered audio is the deciding check. Average CPU and one clean pass cannot establish a reliable operating budget.

## What this supports

- With matched geometry and commanded input, Canvas2D has lower recorded Electron CPU at both measured rates, and 15 Hz reduces recorded CPU in both implementations. Unknown early switch timing limits attribution of earlier CPU differences; the final 60-node comparison was reported free of manual switches.
- Canvas2D 15 Hz had the cleanest recorded outcome in the final 60-node repeat: both passes were clean while other moving conditions had faults. Possible unmeasured background work means this is an observed result, not a controlled causal ranking of renderer reliability. Earlier results additionally have uncertain manual-interaction timing.
- The results do not identify a scheduling, clock/power or graphics-driver mechanism. The earlier WebGL diagnostic finding remains separate. Instruments can investigate the observed boundary rather than repeating a broad sweep.
- These are controller redraw tests with a synthetic DSP graph. A live instrument set, OSC traffic, FX changes, app switching and longer performance durations require their own headroom. Do not turn the highest clean finite observation into a promised operating limit.

## Validation and evidence

**30 accepted phases, 22.6 minutes of measured phase time, 11,953,872 verified actual value changes.** All exact native callback ranges, returned-audio ranges, positive mute/phase detector checks, recorder reliability, source guards and cleanup checks pass. Zero recorder queue losses and timestamp gaps. All 16 protected Shell/native files and 10 rack source files are unchanged; copied scsynth text sections match the installed executable. All 339 MOTU routing source fields are unchanged. Every owned process is absent after completion.

The initial diagnostic-handle smoke attempt and successful four-second no-load smoke capture are excluded. The first 56/60-node captures are retained as `excluded-unmatched56` and `excluded-unmatched60`: their content viewport changed from 2250 px to 1585/1640 px partway through. Control geometry stayed 1286 × 998, but the full window was not matched. The accepted upper reruns set bounds for each phase and continuously check them. A first guarded 60-node attempt was stopped during its ninth phase when width changed to 1469 px. It is retained as `excluded-aborted-guard60`, with eight completed phases and an explicitly partial return analysis; the entire attempt is excluded. The successful 60-node repeat additionally makes the window non-resizable. No phase from an accepted capture is dropped because its audio fails.

- [load44 returned audio](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/load44/return.json), [validation](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/load44/verification.json)
- [load56 returned audio](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/load56/return.json), [validation](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/load56/verification.json)
- [load60 returned audio](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/load60/return.json), [validation](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/load60/verification.json)
- [Combined comparison](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/comparison.json)
- [Completion verification](../test/signal-bench/dropout/results/2026-10-04-rack-refresh/completion-verification.json)
- [Fixture installer](../test/signal-bench/dropout/refresh-renderers.mjs), [measurements](../test/signal-bench/dropout/refresh-measure.mjs)

Each capture retains compressed native callback records and returned PCM, exact phase ranges, logs, screenshots, generated renderer source, harness snapshots and checksums. The shared rate gate is retained inside each `copied-renderers/refreshGate.mjs`.

## Reproduce

Use Node 22 and the existing private binaries prepared by `test/signal-bench/dropout/prepare.sh` if missing. For a matched run (replace paths/node count as needed):

```sh
env -u ELECTRON_RUN_AS_NODE \
 PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
 AWB_AUDIO_AUDIT=/private/tmp/refresh.audit \
 AWB_AUDIO_AUDIT_LIBRARY=/private/tmp/awb-callback-audit.dylib \
 AWB_AUDIO_AUDIT_CHANNEL=2 AWB_PILOT_BUS=2 \
 AWB_LOOPBACK_RECORD=/private/tmp/refresh.input \
 node apps/awb-shell/test/signal-bench/dropout/refresh-run.mjs \
 --dropout-bench --seconds=45 --repeats=2 --targets=56 --load-nodes=56 \
 --conditions=idle,svg-15,svg-30,canvas2d-15,canvas2d-30 --exclusive-sc \
 --output=/private/tmp/refresh.json > /private/tmp/refresh.log 2>&1
python3 apps/awb-shell/test/signal-bench/dropout/refresh-analyse.py \
 /private/tmp/refresh repeat56
```
