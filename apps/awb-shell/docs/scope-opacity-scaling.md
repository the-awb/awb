# CSS opacity widgets at 32, 64 and 128 elements — 2026-10-03

## What this measures

This extends the [original opacity guide and cost report](scope-opacity-costs.md). A fresh 16-widget reference and 32/64/128-widget banks are tested at 24/48/96 px and both 8/15 Hz, separately for audio and control.

**The source feed stays at sixteen channels.** Widget i observes bus `32 + i % 16`, so more widgets fan out from the same sixteen sources. This isolates the cost of extra displayed elements. It does not measure 128 independent SC buses or subscriptions. The normal Scope channel limit remains sixteen; expanded banks exist only in the disposable benchmark fixture.

The fixture uses the production `OpacityBusWidgets` DOM construction and render loop. It substitutes sixteen-lane `OpacityValues` aggregation and assigns multiple widgets to each lane. Audio continues using received RMS summaries; controls use the latest ordered value. The full binary PCM/history feed remains active. There is no new transport, SC graph change or level-only subscription.

## Method and limits

- Actual desktop shell, Scope only, plus its usual Home/render-worker/helper processes. No other tool view is launched.
- Fixed **2250 × 1250** outer window, **DPR 1**, sixteen compact grid columns; static channel/size captions hidden. All 128 of the 96 px faces fit and are checked inside the viewport. The face artwork and `will-change: opacity` are unchanged. No CSS transitions.
- Fresh stopped and sixteen-channel capture-only baselines, followed by the full widget matrix. Two opposite-order passes, 1.2 s settling and approximately six seconds sampled per phase: **102 phases**.
- Cumulative per-process CPU time includes Electron main, Scope, Home, worker and every helper, including GPU-helper **CPU**. **100% means one core.** SC is excluded from the headline totals. This does not measure GPU execution time.
- Each phase verifies advancing source data, one capture, correct widget count/size/bus mapping, matching values for fan-out copies, changing opacity and actual cropped face pixels, expected cadence, and no waveform/canvas-meter painting. The whole UI must fit. Extra pixel probes, when needed, happen after sampled CPU counters.
- The producer stays fixed throughout, using private buses 32–47 and no hardware audio output. A private owned host uses the default device/rate; the user's live host is untouched.
- Warmed steady-state costs: element construction and first layer creation are outside sampling. Two short repeats give ranges, not confidence intervals. Summed RSS includes shared mappings and cannot isolate widget or compositor texture memory.

**Compare counts within this new run.** The earlier report used a smaller 1100 × 900 window and normal labelled cards; its totals should not be directly subtracted from these totals. Window area, composition and layout are held fixed within this scaling run, even when only sixteen widgets are present.

## Results

Total Electron CPU, including the existing sixteen-channel feed and all helpers. **100% = one core.**

| Widgets (48 px) | Audio 8 Hz | Audio 15 Hz | Control 8 Hz | Control 15 Hz |
|---|---:|---:|---:|---:|
| 16 | 20.66% | 21.16% | 14.81% | 16.56% |
| 32 | 21.13% | 22.39% | 14.70% | 17.42% |
| 64 | 22.28% | 23.36% | 15.21% | 18.64% |
| 128 | 24.54% | 29.64% | 18.79% | 23.52% |

Extra CPU **above the same-run sixteen-widget reference**, with feed, size and update rate held fixed:

| Widgets (48 px) | Audio 8 Hz | Audio 15 Hz | Control 8 Hz | Control 15 Hz |
|---|---:|---:|---:|---:|
| 32 | +0.47 points | +1.23 points | -0.11 points | +0.86 points |
| 64 | +1.62 points | +2.20 points | +0.40 points | +2.09 points |
| 128 | +3.88 points | +8.48 points | +3.98 points | +6.96 points |

Paired differences for 128 versus sixteen 48 px widgets:

| Source / update | Mean extra CPU | Two pass differences |
|---|---:|---|
| audio / 8 Hz | +3.88 points | +3.83 / +3.93 |
| audio / 15 Hz | +8.48 points | +6.19 / +10.77 |
| control / 8 Hz | +3.98 points | +4.22 / +3.74 |
| control / 15 Hz | +6.96 points | +7.17 / +6.76 |

### All face sizes

| Widgets | Face | Audio 8 Hz | Audio 15 Hz | Control 8 Hz | Control 15 Hz |
|---|---|---:|---:|---:|---:|
| 16 | 24 px | 20.91% | 22.46% | 14.81% | 17.00% |
| 16 | 48 px | 20.66% | 21.16% | 14.81% | 16.56% |
| 16 | 96 px | 21.33% | 22.53% | 13.70% | 15.55% |
| 32 | 24 px | 20.93% | 22.17% | 14.08% | 16.43% |
| 32 | 48 px | 21.13% | 22.39% | 14.70% | 17.42% |
| 32 | 96 px | 20.52% | 22.37% | 13.76% | 17.50% |
| 64 | 24 px | 22.88% | 25.03% | 15.70% | 18.30% |
| 64 | 48 px | 22.28% | 23.36% | 15.21% | 18.64% |
| 64 | 96 px | 21.90% | 23.68% | 15.88% | 18.14% |
| 128 | 24 px | 23.20% | 27.82% | 18.51% | 22.29% |
| 128 | 48 px | 24.54% | 29.64% | 18.79% | 23.52% |
| 128 | 96 px | 24.35% | 28.51% | 18.82% | 23.01% |

### Baselines and process breakdown

Stopped Scope averaged **0.98%** total Electron CPU. Sixteen-channel capture-only averaged **13.90% audio / 8.31% control**.

The 128 × 48 px cases split as follows. GPU-helper CPU is part of total, not GPU execution:

| Source / update | Total | Scope renderer | GPU helper | Main | Remaining shell/helpers |
|---|---:|---:|---:|---:|---:|
| audio / 8 Hz | 24.54% | 8.85% | 5.39% | 9.01% | 1.29% |
| audio / 15 Hz | 29.64% | 12.13% | 7.08% | 9.12% | 1.30% |
| control / 8 Hz | 18.79% | 6.91% | 5.45% | 5.61% | 0.81% |
| control / 15 Hz | 23.52% | 10.09% | 6.92% | 5.53% | 0.98% |

Actual cadence ranged **7.88–8.15 Hz** for 8 Hz and **14.90–15.14 Hz** for 15 Hz.

At 128 elements, timed opacity render work ranged **1.24–2.89 ms per second** across sizes, rates and individual passes. The sixteen-channel append work ranged **0.02–0.35 ms/s**. 2 phases needed a later pixel probe, outside CPU sampling.

The private host detected **48,000 Hz / block 64**, without imposing that rate. Hardware: **Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz**, 12 logical CPUs; Electron 44.4.1. The fixed SC test graph plus active observer reported **0.38–0.48%** average audio-thread load across active phases; that is not a measurement of CSS work.

These samples support a modest marginal display cost for extra static opacity elements. At
48 px, adding 112 widgets costs approximately +3.9/+4.0 points for audio/control at 8 Hz, and
+8.5/+7.0 at 15 Hz. The audio 16-widget 15 Hz reference varied from 19.36 to 22.96%, so its
paired increment is particularly uncertain; the two differences are shown above. Reducing
128-widget cadence from 15 to 8 Hz lowers the mean totals by about 5.1 points for audio and
4.7 for control. Face size has no consistent monotonic CPU effect in this run. The 32-widget
increments are mostly small relative to repeat variation. These are local results rather
than a linear per-widget pricing model.

The small timed JavaScript hook covers value-to-opacity conversion and style assignments, including deduplication. It excludes style/composition work occurring after the hook returns; the full-process CPU measurements include that later work.

All-size and paired per-pass results are in the linked JSON. A small or negative increment falls within these samples' noise; it does not demonstrate that more elements save CPU. The measurements apply to these static knob faces in one window, not arbitrary shadows, filters, colour changes, animations or separate windows.

## Verification and evidence

The final full run completed all 102 phases, live layout/value/pixel/cadence checks, and capture/node/group cleanup. The host survived capture teardown; its owned SC process was also confirmed absent after the benchmark shell exited. Sixteen protected production sources, including audio bridge, native addon, broker, renderer and shell, matched their before/after hashes. The 7-phase 128 × 96 px smoke test also passed; its shorter CPU measurements are excluded from the full-run tables. Existing production code and other apps' audio routes were not changed by this task.

Initial fixture-only layout attempts failed visibility: dynamically inserted CSS was blocked by Scope's content-security policy. Dense-grid CSS now lives in the disposable fixture stylesheet, respecting the existing policy. Those failed attempts are excluded. No production security policy was relaxed.

[Full raw phases](../test/signal-bench/opacity/results/2026-10-03-scaling/full.json), [summary with ranges and paired increments](../test/signal-bench/opacity/results/2026-10-03-scaling/summary.json), [full log](../test/signal-bench/opacity/results/2026-10-03-scaling/full.log), [128-widget screenshot](../test/signal-bench/opacity/results/2026-10-03-scaling/128-widgets.png), [smoke evidence](../test/signal-bench/opacity/results/2026-10-03-scaling/smoke.json), [final verification](../test/signal-bench/opacity/results/2026-10-03-scaling/verification.json).

Vault MCP and Telegram tools were unavailable; no external write or notification was sent.

## Reproduce

From the AWB repository:

```sh
env -u ELECTRON_RUN_AS_NODE PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  node apps/awb-shell/test/signal-bench/meters/run.mjs \
  --opacity-scaling --output=/private/tmp/awb-opacity-scaling.json
node apps/awb-shell/test/signal-bench/opacity/summarise-scaling.mjs \
  /private/tmp/awb-opacity-scaling.json /private/tmp/awb-opacity-scaling-summary.json
```

Use `--smoke --widgets=128 --sizes=96` for the short boundary check. The full fixture requires a primary work area of at least 2250 × 1250. Production sources are copied into an isolated temporary checkout, instrumented there, and checked unchanged at completion. No shell build or live-host restart is needed for this benchmark-only extension.

## Audio deadline follow-up

The [headless audio/focus report](scope-headless-dropouts.md) checks the safety boundary these average CPU figures cannot establish. Steady 128-widget updates were clean at both loads; app switching repeatedly interrupted audio at the heavier load, including with a persistent automation helper.
