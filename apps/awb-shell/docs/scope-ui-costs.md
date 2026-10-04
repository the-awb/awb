# Scope UI before/after costs — 2026-10-03

The approved metadata/trace changes lower audio-scope CPU at the matched 30-fps cap. The control single-line correction has a measurable trade-off: six channels at the widest zoom are substantially more expensive, mostly in GPU-process CPU. One widened control LFO is slightly cheaper despite retaining more ordered samples. These are combined UI changes; metadata and trace style were not separately ablated.

## Matched results

**CPU percentages are percentages of one core.** Total Electron includes main, scope renderer, Home, the normal hidden render worker, GPU and utility processes; it excludes sclang/scsynth. Four repetitions per case, alternating forward/reverse order, 12 s sampling per phase after settling/history fill. Ranges are observed ranges, not confidence intervals. There are 36 completed phases and an earlier nine-case smoke run.

| Scope | Before total CPU mean (range) | Current total CPU mean (range) | Paired current − before, percentage points |
|---|---:|---:|---:|
| Mono audio · 1× | 34.83 (32.44–36.47) | 23.77 (21.48–25.79) | -11.06 (-12.01–-10.59) |
| Mono audio · ¼× | 36.08 (33.10–37.82) | 26.98 (23.93–29.02) | -9.09 (-11.19–-7.36) |
| One 10 Hz control LFO · ¼× | 21.91 (20.11–23.31) | 20.33 (18.00–22.57) | -1.58 (-2.25–-0.74) |
| Six control lanes · ¹⁄₁₆× | 24.03 (20.91–26.19) | 35.24 (34.56–36.23) | +11.21 (+9.36–+13.69) |

Idle total: **1.44 (0.57–1.87)%**. Mean paired relative changes are −31.8% for normal audio, −25.2% for widened audio, −7.4% for one widened control lane, and +47.7% for six widest control lanes.

| Case | Main CPU | Scope renderer CPU | GPU-process CPU | Other Electron CPU |
|---|---:|---:|---:|---:|
| idle | 0.47 | 0.00 | 0.65 | 0.32 |
| audio-1x-before | 5.89 | 11.83 | 15.35 | 1.76 |
| audio-1x-after | 6.38 | 7.63 | 7.92 | 1.84 |
| audio-wide-before | 6.05 | 11.91 | 16.46 | 1.66 |
| audio-wide-after | 6.37 | 7.95 | 11.00 | 1.66 |
| control-one-before | 5.19 | 6.37 | 9.49 | 0.87 |
| control-one-after | 5.19 | 5.23 | 8.98 | 0.93 |
| control-six-wide-before | 5.16 | 6.46 | 11.52 | 0.89 |
| control-six-wide-after | 4.92 | 7.35 | 22.01 | 0.95 |

The six-lane widest view's GPU-process CPU rises from **11.52% to 22.01%**, while main CPU falls slightly. It now draws 2,048 ordered samples per lane instead of 128 min/max bins. This is a renderer/compositor cost, not evidence that SC's DSP graph became expensive. SC's sampled average audio-thread CPU remains approximately 0.13–0.20% across captured cases; those status percentages differ from process CPU accounting.

## Exactly what was compared

The archived [pre-polish scope.js](../test/scope-ui/baseline/scope.js) and painter were served against the same current native source, broker, reduction, binary-v5 transport, protocol/history/HTML/CSS and SC host as the approved current UI. The painter scheduler is identical in both versions. Only the earlier UI versus the current UI/display-profile choices differ. Each scope has its own 1,100 × 700 window, with an identical **620 × 240 canvas at DPR 1**, sandboxing and background throttling disabled. No Field, Studio or Lissajous tool view is launched; the ordinary hidden render worker remains present in both versions and runs no render job.

A fixture-owned headless host generates a slowly amplitude-varying 113.37 Hz mono sine on private audio bus 32, plus 1/10 Hz sine LFOs and independent 1/5/20/100 Hz LFNoise0 on private control buses 32–37. That graph stays running unchanged throughout the cases; it sends no hardware output. The control selector transports only the selected 10 Hz lane for the one-line case, while the physical capture still has six channels. The six-line case transports all six.

Measured host: **48,000 Hz audio, 64-sample blocks, 750 Hz control rate**, Intel i7-8700B, Electron 44.4.1 / embedded Node 24.21.0. No device or sample-rate option is forced by the producer/fixture. The user's normal 44.1 kHz route is not altered; this is a measurement at the owned test host's detected rate, not a 44.1 kHz result.

| View | Before display | Current display | Unchanged source span at measured rate |
|---|---|---|---:|
| Mono 1× | 1,024 raw samples | 1,024 raw samples | 21.33 ms |
| Mono ¼× | 1,024 min/max bins | 1,024 min/max bins | 85.33 ms |
| One control ¼× | 128 min/max bins | 512 raw samples | 682.67 ms |
| Six control ¹⁄₁₆× | 128 min/max bins per lane | 2,048 raw samples per lane | 2,730.67 ms |

## Cadence, traffic and stability

| Case | Paints/s | Update-label mutations/s | Binary KiB/s | Largest paint interval ms | Raw missing source frames, observed range |
|---|---:|---:|---:|---:|---:|
| audio-1x-before | 29.97 | 29.97 | 192.69 | 50.7 | 0–3072 |
| audio-1x-after | 29.93 | 7.87 | 191.93 | 50.6 | 1024–4608 |
| audio-wide-before | 29.95 | 29.95 | 98.87 | 66.7 | 0–2560 |
| audio-wide-after | 29.95 | 7.89 | 98.68 | 66.2 | 0–6144 |
| control-one-before | 23.44 | 23.44 | 4.04 | 67.7 | 0–0 |
| control-one-after | 23.40 | 7.94 | 5.51 | 83.3 | 0–32 |
| control-six-wide-before | 23.36 | 23.36 | 4.77 | 116.7 | 0–32 |
| control-six-wide-after | 23.43 | 7.97 | 20.24 | 67.8 | 0–0 |

Every phase verifies a live connection, advancing source/paint timestamps, changing canvas pixels, correct selected channels, raw/minmax profile, duration/rate, sandbox boundaries and source amplitude. Paint gaps stay at or below **116.7 ms** across all cases. Normal/widened audio painting remains approximately 30/s; control painting follows its approximately 23.4/s 32-control-frame publications. Current label mutations are approximately 8/s. Diagnostic paint counters remain per paint.

This is not a lossless capture test or a long-session soak. The native reader takes the latest available SC publication. **Audio publication gaps occur in both versions**. Mean missed audio source frames per sampled phase are 1,280 before versus 3,200 current at 1×, and 1,536 before versus 2,560 current at ¼×. The UI is cheaper overall, but this run does not show improved capture reliability. The additional gaps need a separate polling-jitter experiment before attributing them to the UI changes: background load, scheduler timing and short sequential sampling are not isolated here. Gaps remain represented in history rather than being hidden or time-compressed. Largest sampled received-to-painted source endpoint lag is 42.7 ms; that is not end-to-end microphone latency.

Four repetitions give consistent CPU-change direction in every pair, but the one-control effect is small and its before/current ranges overlap. Total CPU is not GPU hardware utilisation, power, WindowServer cost or display latency. Process RSS is retained in the raw results; summed resident sets can double-count shared pages. These results do not replace the earlier Qt comparison or establish Auto-refresh costs. A later slider review found that this adapter served `scope.css` but omitted its imported `/style.css`, leaving base font/background styling incomplete in both measured versions. The matched canvas/data comparison remains useful, but absolute GUI CPU costs need rechecking with the complete stylesheet. The adapter now serves that stylesheet; the historical numbers above were not regenerated.

## Next optimisation

This historical target is now assessed in the [five-thread follow-up](scope-next-costs.md), with complete stylesheets, conservative geometry shipped and history/worker experiments retained separately.

For the widest control view, first remove redundant geometry **without removing data**: retain the full raw history, collapse runs of identical held samples into their exact horizontal endpoints and vertical transitions, and avoid issuing thousands of collinear line segments for the noise lanes. Verify identical pixels and preserved gap boundaries. Pixel-aware reduction for changing LFOs can follow, with separate fidelity checks. Reducing the transport alone will not address the measured GPU-process increase: widest control traffic is only about 20 KiB/s.

For shell launch, the separate [startup report](startup-costs.md) identifies the full workspace prebuild and the unconditional native compile as the main delays. Neither startup optimisation nor a new waveform decimator was implemented by this measurement; the approved scope version stays intact.

## Evidence and reproduction

- [Full actual-shell results, per-process CPU/RSS, SC status, feed checks and 140-file source guards](../test/signal-bench/ui-cost/results/shell-2026-10-03.json)
- [Summary and all paired deltas](../test/signal-bench/ui-cost/results/summary-2026-10-03.json)
- [Full run log](../test/signal-bench/ui-cost/results/shell-2026-10-03.log) / [earlier smoke results](../test/signal-bench/ui-cost/results/smoke-2026-10-03.json)
- [Runner](../test/signal-bench/ui-cost/run.mjs), [measurement adapter](../test/signal-bench/ui-cost/measure.mjs), [private producer](../test/signal-bench/ui-cost/producer.scd)

With Node 22 first in PATH:

```sh
node apps/awb-shell/test/signal-bench/ui-cost/run.mjs --mode=shell --smoke
node apps/awb-shell/test/signal-bench/ui-cost/run.mjs --mode=shell
node apps/awb-shell/test/signal-bench/ui-cost/summarise.mjs
```

The first long attempt selected a control channel before its WebSocket was ready. Its failed partial run/log are retained separately and excluded from all means. The final driver waits for its first packet before changing zoom/selection. All 36 final phases complete, the owned host survives per-case capture cleanup, node/group counts return to the producer-only baseline, and 140 guarded production/native/audio/source/historical files match pre-run hashes. The fixture shuts down its own host on exit. No live user shell/host was restarted or original native artifact rebuilt.

Changes remain uncommitted on `design/score-studio-layout`. Vault/Telegram MCP tools are absent, so those external updates are pending.
