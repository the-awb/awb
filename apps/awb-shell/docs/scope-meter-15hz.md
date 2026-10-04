# Scope meters: 15 Hz frame-aligned update comparison — 2026-10-03

Scope now updates its small audio/control canvas meters at **15 Hz**, using a shared browser-frame callback and time origin with waveform painting. Text labels retain their independent **8 Hz** timer. Reopen Scope to load this renderer change; no build, native-addon reload or SC restart is required for this change.

At a steady 30 Hz waveform draw rate, the meter deadline coincides with every second waveform frame. With a 60 Hz browser refresh it is every fourth browser frame. These are nominal rates: missing publications, CPU stalls, background throttling and non-60 Hz displays can alter actual timing. A control feed with only about 23 publications per second cannot supply a fresh waveform at every 30 Hz deadline, so not every meter paint will share a waveform paint. The meter still keeps its independent cadence when waves are frozen, hidden or waiting for a trigger.

## Implementation and boundaries

`ScopeFrameClock` multiplexes pending view callbacks through one `requestAnimationFrame` callback and supplies their shared phase. `ScopePainter` supports this optional phase; its existing default behavior is preserved for other consumers. Scope creates a 15 Hz meter painter and gives it the same clock as its waveform painter. Each has its own dirty flag and deadline. Neither schedules recurring work without invalidation; teardown cancels pending frames and timers.

Meter accumulation still runs on incoming packets, so the new paint rate does not change packet capture, peak retention or sample-weighted RMS. The 600 ms peak hold remains. Signed control values/ranges retain their source units. Audio routing, SC device/sample rate, native reader, capture broker, codec, history and waveform interpolation are unchanged. There is no additional SC tap or sample transport. Meters-only still receives PCM and appends history.

## Measurement method

The matched follow-up compares the previous **8 Hz metadata-timer meter paints** against the new **15 Hz shared-frame meter paints** in the actual shell, through disposable fixture copies. The legacy schedule is restored only in the fixture. Both schedules use the same signals, layout and instrumentation. This compares the complete schedule change, including shared waveform phase; it does not isolate frequency from alignment.

- One and sixteen buses for audio and control; Waves only, Meters only and Waves + meters, plus stopped Scope. Two opposite-order passes for each schedule: **26 phases per schedule / 52 total**.
- Each phase settles for 1.2 s and samples CPU for about six seconds. Total Electron CPU includes main, Scope, Toolkit Home, render worker and helper processes including GPU-helper CPU; **100% = one core**. SC processes are measured separately. GPU execution is not measured.
- Fixed 1100 × 900 window, 620 × 240 waveform and 88 × 38 widget canvases, DPR 1. Every phase checks that the whole UI is visible. Target waveform painting is 30 Hz; the control feed can limit it below that.
- Isolated shell-owned server, default device/rate selection and private buses 32–47. The fixed 16-audio/16-control producer remains active throughout and writes no hardware audio output. No Field Modelling, Lissajous, Studio or looper views are opened, and the user's existing host is untouched.
- Fourteen production source/addon hashes are checked before and after each run. Live advancing source/pixel checks, single-tap ownership and complete release/node cleanup are required.
- CPU readings are short, serial comparisons with two repeats. They show local cost patterns, not statistical confidence intervals or precise causal attribution. Differing wave-only baselines matter when interpreting total differences.

## Results

Percentages below are total Electron CPU, including helper CPU; **100% = one core**. SC is excluded. These are fresh matched reference runs, so their 8 Hz values differ slightly from the earlier full-matrix report.

| Source | Buses | View | Previous 8 Hz | Frame-aligned 15 Hz | Difference |
|---|---:|---|---:|---:|---:|
| Audio | 1 | Meters only | 14.48% | 17.75% | +3.27 points |
| Audio | 1 | Waves + meters | 25.03% | 22.03% | -3.01 points |
| Audio | 16 | Meters only | 21.69% | 27.26% | +5.57 points |
| Audio | 16 | Waves + meters | 38.09% | 39.72% | +1.63 points |
| Control | 1 | Meters only | 11.38% | 14.31% | +2.93 points |
| Control | 1 | Waves + meters | 17.83% | 18.60% | +0.77 points |
| Control | 16 | Meters only | 16.29% | 22.06% | +5.77 points |
| Control | 16 | Waves + meters | 26.36% | 30.77% | +4.41 points |

The wave-only baselines also shifted: audio 1 / 16 were 23.65 / 32.41% at the old schedule and 21.56 / 31.52% with the shared clock; control 1 / 16 were 18.95 / 20.95% and 16.51 / 18.41%. The shared phase changes waveform scheduling too, and serial measurement noise can contribute. The apparent single-audio-line total saving is not evidence that faster meter drawing is free.

For sixteen buses, adding meters to already running waves cost **5.68 → 8.20 points for audio**, and **5.40 → 12.36 points for control**. The two paired differences were 4.85–6.51 → 6.69–9.72 for audio, and 3.91–6.90 → 10.91–13.81 for control. At one bus, the old control difference was negative, showing why tiny marginal estimates should not be treated as exact costs.

Actual meter updates were approximately **15 Hz**, while text labels stayed **7.78–8.07 Hz**. In audio combined cases, **97.9% of single-line and 99.5% of sixteen-line meter updates** shared the waveform callback's browser-frame timestamp. For control, the corresponding figures were **36.4% and 35.5%**. The ~23 Hz control publication cadence cannot populate every 30 Hz wave deadline. Shared timestamps establish callback coalescing, not the exact number of compositor submissions.

Sixteen-meter-only canvas calls took **5.79 ms/s for audio / 5.87 ms/s for control**, compared with approximately 3.1 ms/s at 8 Hz. The larger full-process increase again sits mainly outside JavaScript canvas submission: GPU-helper CPU in meters-only rose about **6.8 → 11.6%** for both source types. This is helper CPU, not GPU utilisation.

**15 Hz is enabled as requested. It improves update cadence, but did not reduce the sixteen-line costs.** Audio frame coalescing keeps the combined total increase smaller than the meters-only increase in these tests. Control gets less coalescing. A level-only feed and a single canvas meter bank remain untested cost-reduction options; there is no route or transport change in this work.

The owned host detected **48,000 Hz / block 64**, without imposing that rate. The user's system default is still used in normal operation. SC's reported audio-thread CPU ranged **0.32–0.47%** across both runs, including the fixed producer and tap; that is not an isolated marginal SC meter cost. Hardware was Intel i7-8700B 3.20 GHz, 12 logical CPUs; Electron 44.4.1. The existing 44.1 kHz codec/trigger checks also passed.

## Verification and evidence

**63 checks passed:** 20 Scope units, the native clock probe, the actual-shell widget/trigger/shared-peer gate, and 41 existing scope units. Cadence tests cover 30 and 60 Hz synthetic displays, 23 Hz control publications, frozen waves, idle scheduling, cancellation and teardown. Both real-shell cost runs completed all 26 phases, released captures and restored node/group counts. Protected production hashes are identical across the two fixture runs. Compared with the prior milestone's runtime hashes, only Scope renderer scheduling and the optional shared painter clock changed.

[Matched comparison data](../test/signal-bench/meters/results/2026-10-03-15hz/meter-cadence-comparison.json), [8 Hz raw phases](../test/signal-bench/meters/results/2026-10-03-15hz/meter-legacy8-comparison.json), [15 Hz raw phases](../test/signal-bench/meters/results/2026-10-03-15hz/meter-aligned15-comparison.json), [live tests](../test/signal-bench/meters/results/2026-10-03-15hz/meter15-tests.log), [existing scope tests](../test/signal-bench/meters/results/2026-10-03-15hz/meter15-shared-tests.log), [default-window widgets](../test/signal-bench/meters/results/2026-10-03-15hz/scope-meters.png). Vault MCP and Telegram tools were unavailable; no external update or notification was sent.

## Reproduce

```sh
env PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  node apps/awb-shell/test/signal-bench/meters/run.mjs \
  --meter-schedule=legacy8 --channels=1,16 --views=waves,meters,both \
  --seconds=6 --output=/private/tmp/awb-meter-legacy8-comparison.json
env PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
  node apps/awb-shell/test/signal-bench/meters/run.mjs \
  --meter-schedule=aligned15 --channels=1,16 --views=waves,meters,both \
  --seconds=6 --output=/private/tmp/awb-meter-aligned15-comparison.json
node apps/awb-shell/test/signal-bench/meters/compare-cadence.mjs
```

See the [original 8 Hz cost report](scope-meter-costs.md) for the full 1/4/16-bus capture-only matrix and transport/memory calculations, and the [Scope usage guide](scope-tool.md) for the controls and reusable helper API.
