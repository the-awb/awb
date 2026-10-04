# Scope canvas meters: 8 Hz baseline cost and stability — 2026-10-03

**Historical 8 Hz baseline.** Scope now uses a 15 Hz frame-aligned meter schedule with separate 8 Hz text labels. See the [matched follow-up comparison](scope-meter-15hz.md). All figures below describe the original 8 Hz timer implementation.

Small per-bus canvas widgets are implemented in the standalone Scope tool. Choose **View → Waves + meters**, **Waves only**, or **Meters only**. Audio shows RMS dBFS and a held peak; control shows a signed current value and observed interval range. Sample-driven updates run at 8 Hz; explicit UI actions can flush a display update immediately. Freeze affects the waveform while meters remain live. Unchanged widget contents skip painting.

Drawing 16 widgets takes approximately **3.1–3.4 ms of JavaScript per second**, but the full browser cost is larger. With existing waveforms, four widgets added about **1.9–2.7 percentage points of one core**; sixteen added **5.0–6.2 points**. The largest extra process cost at 16 widgets was the GPU helper's CPU usage. Meters-only is substantially cheaper than waves plus meters, while still retaining the full sample transport.

## Total process costs

All percentages below use **100% = one logical CPU core**. Totals include the benchmark Electron main process, Scope renderer, Toolkit Home, render-worker and all Electron helper processes, including GPU-helper **CPU**. They exclude sclang and scsynth. They do not measure GPU utilisation or include the user's separate live shell.

| Source | Buses | Capture only | Waves only | Meters only | Waves + meters |
|---|---:|---:|---:|---:|---:|
| Audio | 1 | 11.88% | 23.26% | 15.70% | 25.06% |
| Audio | 4 | 11.81% | 27.01% | 18.42% | 28.94% |
| Audio | 16 | 13.27% | 32.39% | 20.90% | 38.57% |
| Control | 1 | 6.02% | 16.52% | 10.08% | 17.18% |
| Control | 4 | 5.87% | 17.34% | 11.96% | 20.01% |
| Control | 16 | 7.57% | 20.74% | 16.12% | 25.71% |

Stopped Scope with the shell/producer running averaged **1.06%**, with readings **0.49–1.63%**. Capture only has an active tap, binary delivery, packet decoding and bounded history; waveform and meter paints are disabled in the disposable fixture. It is a measurement baseline rather than a product view. Consequently, meters-only totals above are not the cost of drawing a widget in isolation.

Audio waveform painting was about 30 Hz. Control painting was about 23 Hz, limited by the 32-control-sample publications at the detected 750 Hz control rate. Meter updates were approximately 8 Hz (7.75–8.07 Hz measured). Widget count scales separately from bank update count: 16 changing canvases can mean roughly 128 widget paints per second.

## Added cost when waveforms already run

These are paired differences for each repeat: Waves + meters minus Waves only. Units are percentage points of one core.

| Source | Buses | Mean added CPU | Two measured differences |
|---|---:|---:|---:|
| Audio | 1 | +1.79 | +1.13 to +2.45 |
| Audio | 4 | +1.92 | +0.53 to +3.31 |
| Audio | 16 | +6.18 | +5.37 to +6.99 |
| Control | 1 | +0.66 | -0.79 to +2.11 |
| Control | 4 | +2.67 | +0.65 to +4.69 |
| Control | 16 | +4.98 | +4.08 to +5.87 |

The one-control-line difference changes sign across the two passes, so its fine-grained cost is inconclusive. The 1/4-channel differences have substantial variability. The 16-channel increase is positive in both directions of the experiment and is more convincing.

Relative to capture only, meter display plus its low-rate metadata/presentation cost was:

| Source | Buses | Mean added CPU | Two measured differences |
|---|---:|---:|---:|
| Audio | 1 | +3.82 | +3.58 to +4.06 |
| Audio | 4 | +6.61 | +5.09 to +8.12 |
| Audio | 16 | +7.63 | +7.61 to +7.65 |
| Control | 1 | +4.06 | +3.91 to +4.21 |
| Control | 4 | +6.09 | +4.72 to +7.46 |
| Control | 16 | +8.55 | +8.47 to +8.63 |

For meters-only, going from one to sixteen buses added about **5.20 points for audio** and **6.04 points for control**. Averaged across the fifteen additional buses, that is about **0.35 / 0.40 points per extra bus**. These are observed differences, not a guarantee of linear scaling: capture-only costs themselves varied with test order.

## Drawing work versus process work

The following table uses the meters-only cases. Main/renderer/GPU columns are process CPU percentages; the final columns are timed JavaScript milliseconds per wall-clock second. Timers include widget state accumulation and canvas command submission, but cannot account for browser rasterisation, driver work or GPU execution after those calls return.

| Source | Buses | Main | Scope renderer | GPU helper CPU | Meter accumulation ms/s | Canvas meter calls ms/s |
|---|---:|---:|---:|---:|---:|---:|
| Audio | 1 | 7.08% | 3.74% | 3.17% | 0.14 | 1.02 |
| Audio | 4 | 6.97% | 5.21% | 3.92% | 0.06 | 1.55 |
| Audio | 16 | 8.30% | 5.04% | 6.42% | 0.10 | 3.13 |
| Control | 1 | 4.55% | 2.03% | 2.85% | 0.06 | 0.87 |
| Control | 4 | 5.37% | 2.36% | 3.74% | 0.06 | 1.58 |
| Control | 16 | 5.37% | 3.17% | 6.68% | 0.16 | 3.36 |

For 16 channels, the combined meter accumulation/draw calls are about **0.32–0.35% of one core**. The additional GPU-helper CPU when adding 16 meters to running waveforms was about **4.32 points for audio** and **4.15 points for control**; the Scope renderer increased about **1.47 / 0.98 points**. These process deltas explain why timing only the drawing function understates the real cost.

A useful next experiment is to batch an 8 Hz meter update with an already-due waveform presentation, rather than treating the meter timer as an independent presentation opportunity. That is a hypothesis to test; this run does not establish why the GPU helper did more work. A single canvas containing multiple widgets would be another controlled comparison to the current separate-canvas widgets.

## Transport and memory

The widgets reuse existing packet levels. Audio accumulation needs the packet's RMS/peak arrays and source-frame counts; it does not scan PCM again. Control accumulation inspects the ordered control samples to retain the latest signed value and interval minimum/maximum. Neither creates another tap, subscription, SC node or extra transport payload.

Meters-only disables waveform drawing and display-view copying, but **still carries PCM and appends history**. At 48 kHz, the nominal current payloads are:

| Buses | Audio payload | Control payload |
|---:|---:|---:|
| 1 | 190.8 KiB/s | 4.6 KiB/s |
| 4 | 754.4 KiB/s | 13.9 KiB/s |
| 16 | 3008.8 KiB/s | 51.3 KiB/s |

These are codec arithmetic at uninterrupted publication, excluding WebSocket/ACK overhead; actual observed throughput can be lower when scope publications are missed. Audio packets have 1,024 samples per channel; control has 32. The audio payload is `(64 + 4104 × channels) × sampleRate / 1024` bytes/s. Control is `(64 + 136 × channels) × sampleRate / (blockSize × 32)`. At 44.1 kHz with the same block size, nominal rates are 91.875% of the 48 kHz figures.

A future **level-only subscriber** could deliver compact summaries at 8 Hz and skip browser PCM/history work. For example, sixteen pairs of float RMS/peak values plus a 64-byte header would be about 1.5 KiB/s at 8 Hz. That is a proposed wire-size calculation, not an implemented or measured CPU saving. Shared capture and raw-client behavior would have to remain intact.

Once sized, an 88 × 38 widget's RGBA backing is **13,376 bytes at DPR 1**. Sixteen total **0.204 MiB**, or **0.816 MiB at DPR 2**, before browser backing copies/driver allocations. Newly created widgets that remain hidden can retain the HTML canvas default backing dimensions until first paint; raw JSON records these larger intermediate sizes. The bank holds only small per-channel summaries in addition to the existing scope history.

The summed Electron RSS was roughly **433–585 MiB** in this run. This includes the whole shell and shared process mappings; it is not unique physical RAM and cannot be attributed to the widgets. It also grew with test order, so case-level RSS differences are not a reliable marginal-meter measurement. The canvas backing arithmetic above is the more useful bounded allocation figure.

## Stability and startup fix

The first long pass exposed an existing native startup error after cycling audio/control ranges: **Invalid SC bus clock**. SuperCollider's reused scope storage can return a cached publication before the new writer produces valid data. The reader already tolerated wrong-length cached startup data, but rejected an invalid clock immediately.

The reader now ignores invalid clocks **only before its first accepted frame**, resets warm-up and waits for valid advancing clocks. Invalid clocks after activation remain errors. Missing publication/stale-source timeouts still apply; it does not synthesize samples or silently repair an active corrupt stream.

The direct native regression probe reproduces the failure with the pre-fix addon and passes with the rebuilt addon. It explicitly checks that an invalid active clock is still rejected. The final 50-phase pass completed without that startup failure, released all captures/nodes/groups, and left the owned host running until normal fixture shutdown. This is useful regression evidence, not a long-duration stability guarantee.

Some observation windows were missed during measurement; their gaps remain in raw JSON/history. Audio packet rates ranged approximately 44.8–47.0 Hz rather than invariably reaching the ideal 46.875 Hz. Scope data remains a windowed observation path rather than lossless recording. Meters report received data and can miss a transient contained entirely in an unpublished window.

Restart the shell once to load the rebuilt native addon; it is already built, so **no build command is required**. An attached IDE and audio server can stay running. Routine renderer updates still need only Scope windows reopened. No SC/device/sample-rate configuration changed.

## Method and scope

- Actual shell runtime in a disposable checkout, with one standalone Scope window, Toolkit Home and the render-worker. No Field Modelling, Score Studio, Lissajous or Shared Loop view opens.
- Private source buses 32–47: sixteen sine audio channels with varying amplitudes and sixteen varying bipolar control channels, running throughout every case. No producer writes to hardware output buses. scsynth's reported average load was about 0.33–0.45% across cases; this includes that fixed producer and the active observer, not a minimal one-signal server.
- One physical tap and one derived stream per active case. View changes do not replace the tap. Channel/rate changes replace their range transactionally. Opening different scopes with compatible ranges still uses the existing sharing engine.
- 25 cases, repeated twice in opposite order: **50 phases**. Each phase has 1.2 s settling plus about 6.15 s sampling. Process CPU uses `/bin/ps` cumulative CPU-time differences; SC status is sampled at 4 Hz. Six-second phases and two repeats provide a bounded comparison, not precise confidence intervals.
- Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz; 12 logical CPUs; Electron 44.4.1 with bundled Node 24.21.0. Runner/build uses installed Node 22. Device defaults detected **48,000 Hz / block 64**; rates were not forced. Codec/trigger tests separately cover 44.1 kHz.
- Test window fixed at **1100 × 900** (1100 × 872 content), with full page height/width and footer visibility asserted in every phase. Wave plot fixed at **620 × 240**, widgets **88 × 38**, **DPR 1**, wave refresh 30 fps, raw X 1×, trigger Free running. Equal plot dimensions avoid making combined mode cheaper merely by shrinking the waveform. Normal UI uses its actual window/DPR. No scaling claim is made for Retina GPU cost.
- Timing/counter instrumentation exists only in copied fixture assets. Fourteen runtime files are hash-guarded throughout the successful measurement, including the rebuilt addon. Existing live user processes are untouched. Other system workload was not controlled; only the owned benchmark process set is summed.
- Final verification: **17 Scope units + one native guard probe + one actual-shell gate + 41 existing scope units = 60 checks passed**. Live checks cover 1/4/16 audio, 16 signed controls, meter pixel changes, frozen waveform with live meters, meters-only with no waveform paints, shared raw peers, trigger, cleanup and full default-window fit.

An earlier complete pass used the smaller default window without full-page layout assertions. It is retained as [prior-layout evidence](../test/signal-bench/meters/results/2026-10-03/prior-layout.json), but its numbers are superseded by the full-window pass above; no rows are pooled between layouts. [Final full-window screenshot](../test/signal-bench/meters/results/2026-10-03/benchmark-layout.png).

The historical Qt comparison remains separate. This experiment does not rerun Qt or justify comparing its rows directly to these different window/source configurations.

## Reports and reproduction

- [Complete raw phases](../test/signal-bench/meters/results/2026-10-03/full.json), [paired summary and ranges](../test/signal-bench/meters/results/2026-10-03/summary.json), [full run log](../test/signal-bench/meters/results/2026-10-03/full.log).
- [Widget screenshot](../test/signal-bench/meters/results/2026-10-03/scope-meters.png), [live/native validation log](../test/signal-bench/meters/results/2026-10-03/live-tests.log), [expected pre-fix native failure](../test/signal-bench/meters/results/2026-10-03/native-clock-before.log), [pre-fix partial smoke](../test/signal-bench/meters/results/2026-10-03/pre-fix-partial.json).
- [Scope usage and bus selection](scope-tool.md), [earlier waveform/capture measurements](scope-next-costs.md), [earlier one-line UI comparison](scope-ui-costs.md).

```sh
# From /Users/willy/awb with Node 22 first in PATH:
npm run test:scope --workspace @awb/desktop-shell
node apps/awb-shell/test/signal-bench/meters/run.mjs --seconds=6
node apps/awb-shell/test/signal-bench/meters/summarise.mjs
```

The benchmark writes its live JSON/log evidence under `/private/tmp`; the repository report path contains the archived successful pass. Work remains uncommitted on `design/score-studio-layout`. Vault MCP and Telegram are unavailable in this session; no direct vault update or external notification was made.
