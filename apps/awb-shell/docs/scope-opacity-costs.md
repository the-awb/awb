# Channel-linked CSS opacity widgets — 2026-10-03

## Use the demo

Reopen Scope. Choose **View → Opacity widgets** to see the demo alone, or **Waves + opacity** to keep the waveforms visible. Select the usual Audio/Control rate, first bus and channel count, then Listen. Each bus drives its own knob-like indicators. **Size** selects 24, 48, 96 px, or all three at once; **Updates** selects 8 or 15 Hz. Large all-size channel banks can scroll in small windows.

Only opacity changes. The knobs are observation indicators, with fixed pointers; they do not send control changes. No colour changes or CSS transitions are used. Static channel and size labels stay outside the fading elements. Opacity has a floor of 0.12 to keep the shape visible.

- Audio uses sample-weighted RMS from received packet summaries, mapped from −60…0 dBFS to opacity 0.12…1. Silence reaches the floor and levels above 0 dBFS clamp at 1.
- Control uses the last ordered value in each received channel window. The demo maps −1…+1 to opacity 0.12…1; zero gives 0.56. Values outside the range clamp. This is an explicit display mapping, without assumptions about signal shape or frequency. Unipolar or other control ranges would need an appropriate mapping in an application's widget.

The opacity examples remain live when waveforms are frozen or waiting for a trigger. Stop/disconnection clears them. Changing the size, cadence or view keeps the same SC tap. The user's audio device and server rate are unchanged.

## How it works

`OpacityBusWidgets` and `OpacityValues` live in Scope's `public/scope-opacity.js`. Configuration builds the static DOM once. Incoming audio packets accumulate only transmitted per-channel RMS summaries; controls read just their last planar sample. On a frame deadline, the renderer calculates opacity and writes `element.style.opacity` only when its value changes, rounded to three decimal places. All elements in a bank update in one callback, with no layout reads in the opacity update loop.

The bank uses the existing shared browser-frame clock. Its own painter accepts 8/15 Hz through an explicit rate list; existing waveform and canvas-meter painters retain their existing rate validation and behavior. Labels retain their separate 8 Hz scheduler. Frozen or hidden waveform painting does not throttle the opacity consumer, and no recurring work is scheduled without new data or UI invalidation.

The actively observed faces use `will-change: opacity` to request compositor layers. This adds possible layer/texture memory; it is not a guarantee of GPU-only execution. The hint applies to this opt-in demo, rather than the rest of the shell. In a real application's knob, the same update can target an existing element. Layer lifetime and visual complexity should be checked in that app.

This version continues using the normal scope PCM/history feed. It adds no SC tap or extra transport payload. A latest-value-only subscription remains future work; these cost numbers cannot be used as measurements of that smaller transport path.

## Use it with an existing knob

For an already-normalised control value (0…1), the actual binding can be as small as:

```js
const next = (0.12 + 0.88 * Math.max(0, Math.min(1, value))).toFixed(3);
if (knob.style.opacity !== next) knob.style.opacity = next;
```

Use an application-owned cached value for deduplication if the browser normalises the style string differently. Set the mapping from the control's declared range, rather than guessing its signal character. Audio-driven brightness needs an envelope such as the measured RMS summaries, rather than the signed instantaneous waveform.

For the demo's signed control/dBFS mappings, reuse `valueOpacity(value, rate)`. `OpacityValues` supplies latest per-channel control values or received-window-weighted RMS aggregation; `OpacityBusWidgets` supplies the example DOM bank. An application can keep its existing knob markup and update just its opacity in the common frame callback. This demo adds no new cross-app audio route.

## Test method

The real-shell benchmark uses a disposable checkout, random owned server/OSC ports and private audio/control buses 32–47. The fixed 16-audio/16-control producer runs in every phase, including stopped Scope, and never writes hardware audio output. It selects the system default device/rate rather than imposing 48 kHz. The user’s existing live host is untouched.

Only Scope is opened. Toolkit Home and the normal render-worker renderer remain part of the shell baseline. No Field Modelling, Lissajous, Studio or looper view is opened. Total Electron CPU includes main, Scope, Home, worker and all helper processes, including GPU-helper **CPU**; **100% = one core**. SC is reported separately; GPU execution is not measured.

The matrix measures 16 audio/control channels at every 24/48/96 px and 8/15 Hz combination, one channel at 48 px and both rates, capture-only baselines for 1/16 channels, canvas-only 15 Hz meters for 16 channels, and 16-channel waves-only / waves + 24 px opacity at 15 Hz. Stopped Scope is also measured. Two opposite-order passes produce **54 phases**. Each settles for 1.2 s and samples approximately six seconds.

All phases use a fixed 1100 × 900 window and DPR 1; waveforms are 620 × 240 and canvas meters 88 × 38. The entire UI must fit within the viewport. The opacity faces and canvas meters have different shapes/functions/areas, so their comparison is between these implemented widgets rather than identical visuals in two APIs. No transitions interpolate extra screen-refresh animation frames.

Each phase requires advancing source data, the expected number and physical sizes of elements, live changing opacity values and actual cropped face pixels, the expected cadence, and exactly one capture source. Capture-only and opacity-only skip waveform/canvas-meter painting. Periodic signals can return to identical endpoint brightness; when an endpoint image matches, the checker takes later pixel probes after the CPU interval, for up to 600 ms, to distinguish that from a freeze. The failed first endpoint-only pass is retained separately and excluded from the reported costs. Complete node/group and subscription cleanup is required. Production source/addon hashes are checked before and after the run. CPU deltas use cumulative `/bin/ps` time; short two-repeat measurements show local patterns, not confidence intervals. Summed RSS includes shared mappings and cannot isolate widget memory.

## Measured costs

The following are fresh total Electron CPU percentages, including helper CPU and excluding SC. **100% = one core.** They include the existing binary PCM/history feed; they are not the cost of a style assignment alone.

For **sixteen channel-linked elements**, with one element per channel:

| Face size | Audio, 8 Hz | Audio, 15 Hz | Control, 8 Hz | Control, 15 Hz |
|---|---:|---:|---:|---:|
| 24 px | 20.12% | 22.44% | 14.40% | 17.35% |
| 48 px | 21.71% | 22.85% | 15.05% | 17.49% |
| 96 px | 21.00% | 22.79% | 14.65% | 16.03% |

Capture-only averaged **13.45% audio / 8.71% control** at sixteen channels. The opacity increment above those baselines was:

| Face size | Audio, 8 Hz | Audio, 15 Hz | Control, 8 Hz | Control, 15 Hz |
|---|---:|---:|---:|---:|
| 24 px | +6.67 points | +8.98 points | +5.69 points | +8.64 points |
| 48 px | +8.26 points | +9.40 points | +6.34 points | +8.78 points |
| 96 px | +7.54 points | +9.33 points | +5.94 points | +7.32 points |

There was no monotonic CPU increase with diameter from 24 to 96 px. Moving from 8 to 15 Hz was consistently more expensive at every size. That applies to these simple shapes and channel counts; it is not a guarantee for hundreds of layered controls or more elaborate visual effects.

### One channel versus sixteen

| Source | Channels | Capture only | 48 px opacity, 8 Hz | 48 px opacity, 15 Hz |
|---|---:|---:|---:|---:|
| Audio | 1 | 12.21% | 17.99% | 18.70% |
| Audio | 16 | 13.45% | 21.71% | 22.85% |
| Control | 1 | 8.62% | 14.00% | 15.54% |
| Control | 16 | 8.71% | 15.05% | 17.49% |

### Canvas and waveform comparisons

Same-run sixteen-channel totals at 15 Hz:

| Source | Canvas meters only | 48 px opacity only | Waves only | Waves + 24 px opacity |
|---|---:|---:|---:|---:|
| Audio | 30.56% | 22.85% | 35.07% | 37.25% |
| Control | 24.95% | 17.49% | 22.30% | 24.16% |

Adding sixteen 24 px opacity elements to running audio waves averaged **+2.17 points**, with the two differences **+0.93 / +3.41**.

Adding sixteen 24 px opacity elements to running control waves averaged **+1.86 points**, with the two differences **+1.77 / +1.95**.

The opacity examples are cheaper than the current canvas-meter bank in these comparisons. Their faces have no peak marker, range shading or dynamic numeric text, and opacity changes can reuse static artwork; this is a simpler function, not a universal DOM-versus-canvas result. Negative or very small paired increments mean the effect is below the reliability of these short samples, rather than a proven CPU saving.

For sixteen elements, the timed opacity update function took **0.29–0.85 ms per second**, while accumulation took **0.05–0.39 ms/s**. Those timers omit browser work after the assignments return. Measured update cadence was **7.88–8.06 Hz** and **14.96–15.12 Hz**. Rounded-value deduplication means individual style-write counts can be lower than update count.

In the combined audio cases, **99.5%** of opacity update callbacks shared a waveform frame timestamp.

In the combined control cases, **37.1%** of opacity update callbacks shared a waveform frame timestamp.

The final run needed later pixel probes in **0** phases; they were outside the sampled CPU intervals.

The private test host detected **48,000 Hz / block 64**, without forcing that rate. Normal operation still follows the shell server. Hardware: **Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz**, 12 logical CPUs; Electron 44.4.1. The SC audio-thread readings include the fixed test graph and observer, and cannot isolate a marginal CSS cost.

## Verification and evidence

**67 checks passed:** 24 Scope units, one native clock probe, one actual-shell opacity/trigger/shared-peer gate, and 41 existing scope units. Live tests verify per-channel opacity, all three actual pixel sizes, audio silence/restore, signed negative control values, visible rendered changes, frozen waves with live opacity, size/cadence changes without new taps, Stop clearing widgets and subscription cleanup. The default 800 × 720 Scope layout still fits sixteen canvas meters; an inherited canvas margin exposed during view switching was removed in Scope's stylesheet.

The complete cost run passed **54 phases**, full-layout/live-pixel/cadence/source checks and node/group cleanup. Sixteen production hashes matched before/after the benchmark; thirteen pre-task audio/native/bridge/broker/history/looper hashes also remain unchanged. The preliminary endpoint-only run failed its pixel assertion and is archived separately; none of its CPU numbers were pooled into these results. Its owned server exited and was verified absent before reporting completion.

[Raw phases](../test/signal-bench/opacity/results/2026-10-03/full.json), [summary and paired ranges](../test/signal-bench/opacity/results/2026-10-03/summary.json), [full benchmark log](../test/signal-bench/opacity/results/2026-10-03/full.log), [live tests](../test/signal-bench/opacity/results/2026-10-03/live-tests.log), [existing scope tests](../test/signal-bench/opacity/results/2026-10-03/shared-tests.log), [rendered demo](../test/signal-bench/opacity/results/2026-10-03/opacity-demo.png), [audio-route guard](../test/signal-bench/opacity/results/2026-10-03/audio-route-guard.json).

Vault MCP and Telegram tools were unavailable; no external update or notification was sent.

## Reproduce

```sh
env PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  node apps/awb-shell/test/signal-bench/meters/run.mjs \
  --opacity-bench --output=/private/tmp/awb-opacity-cost.json
node apps/awb-shell/test/signal-bench/opacity/summarise.mjs
```

The [Scope guide](scope-tool.md), [15 Hz canvas comparison](scope-meter-15hz.md) and [original 8 Hz scope cost report](scope-meter-costs.md) cover existing routing, waveform/meter behavior and earlier measured costs. This fresh same-run baseline accounts for the new view options and corrected canvas-grid margins.

See the [32/64/128-widget scaling comparison](scope-opacity-scaling.md) for a fixed sixteen-source fan-out test at every size and both rates, with a fresh sixteen-widget baseline.
