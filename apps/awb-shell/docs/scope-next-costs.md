# Scope drawing and capture follow-up — 2026-10-03

The five approved investigations are complete. Two changes are shipped: conservative held-run geometry compression and cached control-lane labels/dividers. Connected remains the default. Bulk history copying, a Node worker reader and a process power assertion remain measurement experiments.

This is a modest improvement, not a new order of magnitude. Six wide control lanes fall from **28.33% to 27.36%** total Electron CPU, about **3.4%** less. The strongest saving in this investigation comes from the already-available Connected mode versus Stepped: **29.00% versus 36.77%** for six widest lanes. These are separate matched experiments with different baselines; do not add their percentages together.

Reopen **only the scope windows** to load the two JavaScript modules. Keep Shared Loop, its recorded buffer and the shell SC host running. No build, native compile or audio restart is needed. There is no sample-rate/device override, and no production capture, broker, transport, looper or Lissajous change.

## Method and limits

Measurements run inside a disposable copy of the actual desktop shell, with Home and its normal hidden idle render worker included. No Field Modelling, Score Studio or Lissajous view opens. Private mono audio and six control buses are supplied by an owned isolated SC host; the producer writes no hardware audio output. Each full case has three approximately eight-second repetitions, with forward/reverse case ordering and settling/history fill before sampling. The plot is 620 × 240 CSS pixels at DPR 1 and 30 fps. All imported stylesheets are served, including `style.css`.

The machine is an Intel i7-8700B at 3.20 GHz, Electron 44.4.1 / embedded Node 24.21.0. The isolated host detected **48,000 Hz / block 64**, giving a 750 Hz control clock. That is the fixture's observed device rate, not an imposed setting or a change to the user's normal 44.1 kHz route. Synthetic image checks use 44.1 kHz.

CPU below is percent of **one core**, summed across Electron main, scope renderer, background renderers, GPU process and helpers. It excludes sclang/scsynth, which are retained separately in the raw reports. GPU-process CPU is CPU time, not GPU hardware utilisation. These are short comparative runs, not a thermal/power or long-session stability guarantee. System compositor cost is not measured. RSS sums can double-count shared pages.

There are **99 full measurement phases**: 27 mode comparisons, 39 staged optimisation phases, 21 capture/jitter phases and 12 power-assertion checks; additionally 16 smoke phases. Each completed measurement run guards 140 production/historical files against modification. The final implementation guard covers 51 runtime sources and changes only `public/scope.js` and `public/scope-trace.js`; the other 49 remain byte-identical.

The earlier [36-phase UI report](scope-ui-costs.md) remains historical evidence. Its adapter omitted the imported base stylesheet in both compared versions; its absolute CPU figures are not interchangeable with this complete-style fixture.

## 1. Connected versus Stepped

Total Electron CPU: mean [minimum–maximum], three repetitions. Both modes draw the same raw samples and retain NaN gaps.

| Control display | Connected | Stepped |
|---|---:|---:|
| One lane, 1× / 128 points | 18.82 [18.01–20.08]% | 19.35 [19.22–19.60]% |
| One lane, ¹⁄₁₆× / 2,048 points | 22.21 [21.79–23.03]% | 27.40 [27.10–27.70]% |
| Six lanes, 1× / 128 points each | 19.17 [18.00–20.02]% | 19.62 [19.55–19.72]% |
| Six lanes, ¹⁄₁₆× / 2,048 points each | 29.00 [28.85–29.21]% | 36.77 [36.68–36.87]% |

Connected costs about 19% less for one widest lane and 21% less for six widest lanes. Much of the difference is GPU-process CPU: 16.32 versus 22.94% for the latter. Short views show little difference. The two drawing modes already existed; this step measures their cost, and keeps both available.

## 2–3. Geometry and static background — shipped

`scope-trace.js` collapses redundant equal plotted-Y vertices only when sample spacing is below one device pixel. It keeps the last held sample before each transition, exact Stepped jump positions, final endpoints and gap boundaries. It inspects measured values after display gain/clipping; it does not infer sine/noise/audio/control character. Changing samples are retained and the history is unchanged.

Compression is deliberately conservative: sparse traces, missing first/last endpoints, and traces whose first and last plotted Y are equal use the original path. Compressing a completely flat trace initially changed Canvas fast-line antialiasing, even with identical geometric endpoints. That candidate was rejected. The conservative version is byte-identical in the retained pixel cases, including gain clipping and fractional DPR. This is evidence for those cases, not a proof for every possible browser rasteriser.

`scope.js` caches the control labels/dividers with the existing grid. The background rebuilds on canvas size/DPR or visible channel/availability changes, rather than on every arriving packet. Channel selection still invalidates it. Waveforms remain painted independently at the requested rate; the existing 8 Hz DOM/metadata cadence is unchanged.

| Display | Baseline | Geometry only | Geometry + cache, shipped | Bulk history candidate |
|---|---:|---:|---:|---:|
| Mono audio, 1× | 23.45 [22.63–24.45]% | 22.99 [22.13–24.09]% | 23.29 [22.65–24.06]% | 24.04 [23.59–24.45]% |
| Mono audio, ¼× envelope | 25.58 [24.41–26.89]% | 26.13 [25.58–26.52]% | 26.16 [25.32–27.26]% | 26.60 [25.91–27.39]% |
| Six control lanes, ¹⁄₁₆× | 28.33 [28.02–28.71]% | 27.45 [26.97–28.22]% | 27.36 [27.14–27.73]% | 27.26 [26.94–27.57]% |

Six-control baseline→shipped reductions are 0.81, 0.99 and 1.11 percentage points in the three paired repetitions. Cache alone has mixed paired deltas; its separate CPU benefit is not established. Audio changes vary in both directions: the widest audio mean increases by 0.58 points, with overlapping ranges and mixed paired deltas. **No audio CPU improvement is claimed.** There is no shader replacement or sample decimator in this patch.

## 4. History copying — tested, parked

The retained `ring` stage experiments with two bulk typed-array copies per raw channel across ring wrap, plus slot-completeness bookkeeping. It preserves contiguous owned display samples and missing intervals. A differential test compares **7,200** views across wrap, discontinuities, channel changes and raw/minmax input.

For six wide control lanes, history-view work drops from approximately **2.61 to 0.57 ms per second** of wall time compared with the cached stage. That is only about 0.20 percentage points of one core for the measured JavaScript work. Whole-app CPU changes from 27.36 to 27.26%, with mixed per-repeat deltas (+0.05, −0.79, +0.43 points). Both audio means increase. The additional bookkeeping does not earn its place on this evidence, so production `scope-history.js` is unchanged.

A frozen display must own its values while the live ring continues receiving. Passing a direct mutable ring view would invalidate that contract. The current bounded owned-copy design is retained.

## 5. Capture gaps and worker separation — tested, unresolved

This series separates reader-only, transport/history without drawing, normal drawing, and a fixture-only Node worker. Both readers poll every 4 ms. The audio source publishes 512-sample windows about every **10.67 ms** at the observed rate. The worker transfers JS-owned `ArrayBuffer`s to the main process with one in-flight and one latest queued frame; it does not expose mutable SC memory to a browser. Worker CPU is included in the main process total. [Node worker/transfer documentation](https://nodejs.org/api/worker_threads.html).

A stress case deliberately blocks the Electron main JavaScript loop for 15 ms every 250 ms. This is a synthetic disturbance, not production behaviour.

| Case | Mean total Electron CPU | Missed source samples in each measured repetition |
|---|---:|---|
| Reader only | 4.91% | 0 / 7,680 / 5,120 |
| Transport/history, drawing disabled | 15.66% | 0 / 1,024 / 15,360 |
| Normal drawing, main reader | 24.47% | 0 / 3,584 / 0 |
| Normal drawing, worker reader | 24.33% | 0 / 4,608 / 0 |
| Main reader + deliberate stall | 29.54% | 15,360 / 28,160 / 15,360 |
| Worker reader + deliberate main stall | 28.73% | 19,456 / 18,432 / 0 |

Drawing-disabled cases intentionally do not update waveform pixels or materialise display views, so they are broader pipeline comparisons than simply removing GPU rasterisation. Source clocks and acknowledgements continue. Do not interpret their stationary canvases as accidental freezes.

Gaps also occur without drawing. Main reader-only polling reaches 53–72 ms delays in two repetitions; the worker's stressed runs reach 53–134 ms in two repetitions, despite avoiding the deliberate main stall entirely in the third. Worker native-read p99 is only approximately 0.06–0.08 ms. There are **zero latest-queue skipped frames** in these worker phases: the recorded worker losses occur before that message queue.

A further 12-phase run holds `prevent-app-suspension` during the fixture and releases it on exit. It does not eliminate gaps: worker-stall repetitions still miss 3,072 / 2,560 / 5,120 samples, with maximum worker polling intervals around 37–40 ms. Reader-only and no-draw cases also retain gaps. This does not establish App Nap as their cause or justify imposing a shell-wide power policy. [Electron power assertion documentation](https://www.electronjs.org/docs/latest/api/power-save-blocker).

The local SC [scope buffer implementation](/Users/willy/supercollider/common/scope_buffer.hpp:70) swaps the latest published stage; it is not a lossless publication FIFO. A late reader can miss windows. These are observation gaps, not evidence of audible SC dropouts. Short successful runs do not establish lossless long-session capture.

The worker experiment proves attachment/read/transfer works in this isolated one-reader case. It is **not a production worker integration**: the native addon has process-global claim bookkeeping, concurrent reader ownership has not been audited, and the fixture's worker connection predicate is not the shell's actual host-disconnect lifecycle. Moving it into production requires those boundaries to be resolved. [Node addon worker support](https://nodejs.org/api/addons.html#worker-support).

Raw phase `rawGapFrames` and worker counters are the measured-window loss totals. The original per-gap event arrays could continue acquiring events at phase teardown, so their event counts are qualitative diagnostics, not exact measured-window totals. The retained runner now snapshots/filter events at the phase boundary; historical reports remain untouched.

## Verification and evidence

- **41 scope unit tests passed**, plus the retained history experiment's differential test (7,200 view comparisons).
- **72 page-canvas cases and 252 trace-canvas cases** across page DPR 1, 1.25 and 2 have identical pixels, maximum byte delta zero. Selection changes rebuild the cached background; incoming packets with unchanged layout do not. Test signals are synthetic, not live audio.
- The **actual-shell Shared Loop gate passed**: all three scopes, fractional X/Y, frozen controls, binary v5, sample/channel selection, control single paths, live waveform changes, 30/15 fps, concurrent raw PCM peer isolation, release/quit and surviving shared host checks. No unrelated tool view opens.
- Of **51 final runtime guards, only the two intended scope JavaScript modules changed**. SC, native readers, broker, transport, looper and Lissajous remain byte-identical.
- A fixture-only HTTP keep-alive shutdown initially delayed the successful fractional-DPR test's exit. Cleanup was corrected; the rerun exits successfully. This is not a production change.

[Full summary: ranges, process costs, paired deltas and diagnostics](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-summary.json)

| Evidence | Report | Log |
|---|---|---|
| Connected/Stepped, 27 phases | [raw JSON](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-modes.json) | [log](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-modes.log) |
| Four stages, 39 phases | [raw JSON](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-optimisations.json) | [log](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-optimisations.log) |
| Capture/worker/stall, 21 phases | [raw JSON](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-jitter.json) | [log](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-jitter.log) |
| Power assertion, 12 phases | [raw JSON](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-jitter-awake.json) | [log](../test/signal-bench/scope-next/results/2026-10-03/awb-scope-next-jitter-awake.log) |

Image checks: [DPR 1](../test/signal-bench/scope-next/results/2026-10-03/fidelity-1/results.json), [DPR 1.25](../test/signal-bench/scope-next/results/2026-10-03/fidelity-1.25/results.json), [DPR 2](../test/signal-bench/scope-next/results/2026-10-03/fidelity-2/results.json); [synthetic screenshot](../test/signal-bench/scope-next/results/2026-10-03/fidelity-2/wide.png). [Live gate log](../test/signal-bench/scope-next/results/2026-10-03/live-shell.log) includes prior appended gate output as well as this successful run. [Final runtime hashes](../test/signal-bench/scope-next/results/2026-10-03/production-guards.json), [validation summary](../test/signal-bench/scope-next/results/2026-10-03/validation.json).

## Reproduction and reuse

The [runner](../test/signal-bench/scope-next/run.mjs), [measurement adapter](../test/signal-bench/scope-next/measure.mjs), [private producer](../test/signal-bench/scope-next/producer.scd), [fidelity fixture](../test/signal-bench/scope-next/fidelity.mjs), [worker experiment](../test/signal-bench/scope-next/reader-worker.mjs), [history parity test](../test/signal-bench/scope-next/history-parity.test.mjs) and all four [archived stages](../test/signal-bench/scope-next/stages) are retained. Stage asset hashes identify the active measured versions. The mode report also records earlier development versions of unused geometry/cache/ring assets; only its baseline stage runs, and that baseline matches the archive. All 44 stage assets in the staged-optimisation report match the archive. Measurement instrumentation operates on disposable copies and is never promoted.

From the AWB root, with Node 22 first in PATH:

```sh
node apps/awb-shell/test/signal-bench/scope-next/run.mjs --series=modes --seconds=8 --repeats=3
node apps/awb-shell/test/signal-bench/scope-next/run.mjs --series=optimisations --seconds=8 --repeats=3
node apps/awb-shell/test/signal-bench/scope-next/run.mjs --series=jitter --seconds=8 --repeats=3
node apps/awb-shell/test/signal-bench/scope-next/run.mjs --series=jitter --awake --cases=reader-only,transport-no-draw,main-stall,worker-stall --seconds=8 --repeats=3 --output=/private/tmp/awb-scope-next-jitter-awake.json
node apps/awb-shell/test/signal-bench/scope-next/summarise.mjs
node --test tool-artifacts/shared-loop/0.1.0/tests/scope-*.test.mjs apps/awb-shell/test/signal-bench/scope-next/history-parity.test.mjs
node --test apps/awb-shell/test/electron-shared-loop.test.mjs
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron apps/awb-shell/test/signal-bench/scope-next/fidelity.mjs --dpr=1.25
```

`--smoke` shortens a measurement run. Run CPU comparisons without simultaneous UI fixtures or other benchmark workloads. Scope stages are intentionally archived rather than automatically following current production code.

To reuse the shipped work, call `paintScopeTrace` with the real pixel ratio, and cache static lane decoration until layout/DPR/visible-channel identity changes. Keep reception, acknowledgements and owned history outside the painter. Other apps' audio routes need no migration for this drawing patch.

The next useful capture investigation is to correlate source-clock gaps with native-reader timing/OS scheduling over a longer run, and assess whether lossless observation requires a producer-owned queue. A worker is a separation tool; these measurements do not make it a reliable gap fix yet.

Repository reports are current. Vault MCP and Telegram tools were not callable in this session, so no vault update or notification was sent; no direct vault-file write was used.
