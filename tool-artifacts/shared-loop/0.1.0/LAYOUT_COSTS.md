# Scope layout costs: canvases versus windows

Measured 2026-10-01 on Intel i7-8700B/macOS, Electron 44.4.1, ws 8.21.3, SC 3.12.2, actual 48 kHz / 64-sample blocks. [Raw 71-phase results](tests/layout-results-2026-10-01.json). Only minimal test-owned Electron/sclang/scsynth processes were launched. No Field, Studio or normal shell services; no live host restart. Production scope files were byte-checked unchanged.

## Finding

Separate canvases in one window retain the shared transport/history cost, but add real display work. Separate windows are substantially more expensive in this implementation: each has its own renderer, full six-channel subscription, decoder, history, controls and animation loop.

For six wide control lanes, combined measured Electron CPU was **30.6%** on one canvas, **40.5%** on six canvases in one window and **97.7%** in six windows. Wide audio was **57.6% / 68.4% / 142.1%**. These percentages use one CPU core as 100%; 142% is about 1.42 cores, not 142% of the whole machine. Totals include main, renderer and Electron helper processes, including GPU-process CPU. They exclude sclang/scsynth and macOS WindowServer.

The earlier control/audio tables reported renderer CPU. That makes the small marginal cost look smaller than the total display cost: much of the additional drawing work here appears in the GPU process's CPU clock. This is **CPU consumed by the GPU process**, not GPU hardware utilization or a measurement of GPU energy.

## Six-lane CPU breakdown

Means of two painted phases per case. Total also includes the Utility helper, so main + renderer + GPU alone need not equal total. Never add the GPU column to the total again.

| Source | View | Layout | Main CPU | Renderer CPU, summed | GPU-process CPU | Total Electron CPU |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Control | Raw | One shared canvas | 4.1% | 8.1% | 12.9% | 25.4% |
| Control | Raw | Separate canvases, one window | 4.4% | 8.8% | 23.8% | 37.4% |
| Control | Raw | Separate windows | 5.1% | 40.5% | 42.4% | 89.9% |
| Control | Wide | One shared canvas | 4.1% | 7.7% | 18.3% | 30.6% |
| Control | Wide | Separate canvases, one window | 3.8% | 9.0% | 27.2% | 40.5% |
| Control | Wide | Separate windows | 4.6% | 41.6% | 49.4% | 97.7% |
| Audio | Raw | One shared canvas | 4.9% | 13.2% | 20.0% | 39.6% |
| Audio | Raw | Separate canvases, one window | 4.4% | 13.7% | 28.8% | 48.3% |
| Audio | Raw | Separate windows | 6.6% | 55.5% | 53.3% | 122.4% |
| Audio | Wide | One shared canvas | 3.9% | 12.2% | 40.4% | 57.6% |
| Audio | Wide | Separate canvases, one window | 4.0% | 13.7% | 49.6% | 68.4% |
| Audio | Wide | Separate windows | 5.9% | 56.8% | 74.6% | 142.1% |

Six separate canvases added about **9–12 CPU percentage points** versus one shared canvas across these four cases. Renderer CPU rose only **0.5–1.5 points**; most of the observed increase was GPU-process CPU. This includes each canvas's grid, labels and draw setup; it is not an isolated measurement of creating an otherwise empty canvas element.

Six windows used about **2.5–3.5 times** the measured Electron CPU of a shared canvas. That difference combines window/render-process overhead with replicated full-feed processing and UI. It does not prove that OS windows alone account for the increase.

## Scaling from one to six lanes

Total measured Electron CPU, including helpers:

| Source | View | Layout | 1 lane | 2 lanes | 4 lanes | 6 lanes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Control | Raw | One shared canvas | 26.4% | 28.4% | 24.1% | 25.4% |
| Control | Raw | Separate canvases, one window | 26.4% | 28.8% | 31.3% | 37.4% |
| Control | Raw | Separate windows | 26.4% | 38.3% | 63.7% | 89.9% |
| Control | Wide | One shared canvas | 25.1% | 27.8% | 28.4% | 30.6% |
| Control | Wide | Separate canvases, one window | 25.1% | 29.5% | 32.7% | 40.5% |
| Control | Wide | Separate windows | 25.1% | 42.3% | 67.7% | 97.7% |
| Audio | Raw | One shared canvas | 32.5% | 34.6% | 33.2% | 39.6% |
| Audio | Raw | Separate canvases, one window | 32.5% | 37.1% | 43.3% | 48.3% |
| Audio | Raw | Separate windows | 32.5% | 54.0% | 87.2% | 122.4% |
| Audio | Wide | One shared canvas | 33.2% | 38.6% | 46.0% | 57.6% |
| Audio | Wide | Separate canvases, one window | 33.2% | 38.8% | 49.9% | 68.4% |
| Audio | Wide | Separate windows | 33.2% | 58.7% | 98.7% | 142.1% |

One lane is a common one-canvas/one-window reference, repeated twice and reused for all layouts; those identical cells are not independent measurements. Two/four lanes have one measured phase each; six lanes have two, with layout order reversed on the second pass. Non-monotonic small differences are within this short sequential experiment's variability. Do not fit a precise per-wave cost from them.

## Transport and renderer memory

Six lanes, wide mode:

| Source | Layout | Summed renderer RSS | Aggregate binary application payload | Renderer processes |
| --- | --- | ---: | ---: | ---: |
| Control | One shared canvas | 87 MiB | 4.5 KiB/s | 1 |
| Control | Separate canvases, one window | 88 MiB | 4.5 KiB/s | 1 |
| Control | Separate windows | 518 MiB | 27.3 KiB/s | 6 |
| Audio | One shared canvas | 99 MiB | 145.5 KiB/s | 1 |
| Audio | Separate canvases, one window | 99 MiB | 146.3 KiB/s | 1 |
| Audio | Separate windows | 600 MiB | 873.7 KiB/s | 6 |

RSS includes shared pages and cannot be read as unique physical/private RAM. These figures cover renderers only; main, GPU and Utility RSS are retained per process in the raw results. The separate-window cases each created six distinct renderer PIDs. Application payload excludes WebSocket framing, TCP/IP and the small JSON ACK/status traffic (ACK bytes are separately recorded).

All cases keep six SC source channels allocated and transmit all six to each subscriber, even when it draws one lane. Separate canvases use one socket/history; six windows use six. Thus control wide payload rises from ~4.5 to ~27.3 KiB/s, and audio wide from ~146 to ~874 KiB/s. Raw audio was ~1.1 MiB/s with one subscriber and ~6.3 MiB/s across six windows. Bounded delivery can skip intermediate publications, so fanout is approximately rather than exactly sixfold.

One native reader still owns each SC scope index. Windows consume Node-owned copies; they never independently attach to SC's single-reader exchange. Packet encoding is shared by kind/update, but sending and browser decoding/history construction repeat per subscriber. A per-channel subscription or shared browser-side collector could remove some of this duplication; neither optimization is implemented or measured here.

## Feed active, waveform painting disabled

One phase per case, six selected lanes. The animation callback, socket, decoding, rolling history, DOM meters/status and acknowledgements continue; only plot calls are skipped. This differs from the earlier no-paint tests that stopped the animation loop entirely. GPU-process CPU can remain nonzero because the page still updates.

| Source | View | Layout | Renderer CPU | GPU-process CPU | Total Electron CPU |
| --- | --- | --- | ---: | ---: | ---: |
| Control | Raw | One shared canvas | 5.6% | 5.4% | 17.0% |
| Control | Raw | Separate canvases, one window | 5.6% | 5.6% | 16.1% |
| Control | Raw | Separate windows | 25.9% | 14.9% | 47.0% |
| Control | Wide | One shared canvas | 5.8% | 5.8% | 16.9% |
| Control | Wide | Separate canvases, one window | 5.0% | 5.0% | 15.6% |
| Control | Wide | Separate windows | 28.7% | 17.4% | 52.9% |
| Audio | Raw | One shared canvas | 10.1% | 8.1% | 25.7% |
| Audio | Raw | Separate canvases, one window | 9.7% | 8.0% | 24.5% |
| Audio | Raw | Separate windows | 52.1% | 25.2% | 90.9% |
| Audio | Wide | One shared canvas | 8.8% | 7.3% | 23.2% |
| Audio | Wide | Separate canvases, one window | 9.5% | 7.2% | 23.1% |
| Audio | Wide | Separate windows | 46.8% | 26.3% | 84.1% |

The bridge without viewers measured **3.88%** main CPU initially and **3.50%** finally, versus **0.58%** idle without the bridge. This includes regular all-scope polling and stored-loop status/summary work with the looper paused. It is not the cost of a bare WebSocket or of one isolated producer.

## Matched area and signals

- Fixed total waveform area **620 × 240 = 148,800 CSS pixels**, DPR 1 on this display. One canvas stacks N lanes. N canvases/windows each get 620 × (240/N) pixels. Width is pinned so scrollbar differences cannot change waveform area.
- One-window cases share one six-channel snapshot/history and one requestAnimationFrame callback. Separate canvases repeat the plotting body for their selected lane; they do not repeat transport/history construction. Separate windows have independent callbacks and full six-channel state.
- Windows are 720 pixels wide. One-window cases are 640 pixels high; per-channel windows are 640−240+240/N high, tiled visibly. Extra controls, DOM, labels and chrome in separate windows increase total UI area; the experiment holds waveform area constant, not total window surface.
- Control is real SC control-rate data: SinOsc.kr(1), SinOsc.kr(10), and LFNoise0.kr at 1/5/20/100 Hz on six private buses. Audio is six internal SinOsc.ar signals at 110/220/330/440/550/660 Hz and amplitudes .10/.12/.14/.16/.18/.20, with no hardware output. The looper is paused. The other scope writers/readers remain active without subscribers.
- Audio has 1,024 displayed points/bins per lane: raw 21.33 ms, wide 341.33 ms. Control has 128: raw 170.67 ms, wide 2,730.67 ms. Wide reduction is min/max step 16. Actual rates come from SC; no device or sample-rate setting is forced.
- Two-second settling, about 5.1-second measured phases; wide control gets an additional 3.1 seconds to fill new histories. Painting is kept active with background throttling disabled. Measured painted cadence was 59.5–61.5 frames/s per page.
- PID roles come from Electron getAppMetrics and webContents; all CPU/RSS readings use the same macOS ps cumulative process clock. CPU resolution is roughly 0.2 points per phase. No process CPU sample was missing.

## Wider is cheaper to transport, not automatically cheaper to draw

Six-channel audio payload falls about **87%** from raw to wide in this run. Yet one-canvas total Electron CPU rises from **39.6% to 57.6%**, primarily GPU-process CPU (**20.0% to 40.4%**), while renderer CPU stays around 12–13%. Wide bins draw low/high vertical segments over a longer signal interval, rather than the raw line. Different geometry/content and raster/composition work matter. These measurements locate an expensive process; they do not isolate the cause within Chromium or prove a shader would eliminate it.

A sensible next optimization is repainting only on new data or changed view settings, then measuring the same layouts again. Current callbacks repaint at display cadence even though audio/control publications are ~47/~23 Hz. Keep one feed/history/animation scheduler per window. Lower publication/repaint cadence, selected-channel fanout and GPU drawing are separate experiments; no savings from unimplemented changes are claimed.

## Validation and limits

All **71 measured phases**, the preceding **six-case smoke gate** and a [final six-case cleanup smoke rerun](tests/layout-smoke-results-2026-10-01.json) passed channel/rate/peak/format, selected-lane/window/subscriber count, equal waveform area, live source progression, active drawing, no-paint zero-stroke and reachable-footer assertions. Exit 0 and normal owned window/reader/server cleanup completed. Electron shutdown caches are contained inside the runner-owned fixture and removed after process exit; the final smoke verified that no layout fixture/cache directories remained. The guarded installed addon, native reader, codec, GUI and host were unchanged. Focused wide screenshots were visually inspected. Multi-window captures below show the first individual channel window, not a montage of all six.

Six painted wide-control phase endpoints reported gaps of **32–128 source values** (one to four 32-value chunks; 42.7–170.7 ms). One additional no-paint endpoint reported 32 missing values. Some multi-window endpoints had identical gaps across every subscriber, which is consistent with loss before fanout but does not diagnose where it occurred. The source-indexed history retains these as NaN gaps; it never compresses missing time. These endpoint observations are not a cumulative drop rate. Diagnostic snapshot fields continue updating during no-paint phases; canvas dataset attributes retain the last painted state. All sampled painted audio endpoints had complete history.

SC average audio CPU ranged **0.09–0.28%** across the matrix. One raw shared-control six-lane phase reported a **15.53% SC peak**, despite a low mean. This experiment does not explain that transient, count xruns, test physical microphone/speaker behavior or certify sustained loaded stability. Source clocks progressed across multiple ordinary counter wraps; stalled-period/restart recovery remains outside the supported contract.

Two repeats show variation, not confidence intervals. Total CPU ranges for six lanes:

| Source | View | Layout | Two observed total CPU values, range |
| --- | --- | --- | ---: |
| Control | Raw | One shared canvas | 23.7–27.2% |
| Control | Raw | Separate canvases, one window | 33.6–41.3% |
| Control | Raw | Separate windows | 89.2–90.5% |
| Control | Wide | One shared canvas | 30.2–30.9% |
| Control | Wide | Separate canvases, one window | 39.8–41.2% |
| Control | Wide | Separate windows | 94.1–101.2% |
| Audio | Raw | One shared canvas | 38.1–41.2% |
| Audio | Raw | Separate canvases, one window | 47.8–48.8% |
| Audio | Raw | Separate windows | 118.9–125.8% |
| Audio | Wide | One shared canvas | 54.4–60.7% |
| Audio | Wide | Separate canvases, one window | 66.9–69.9% |
| Audio | Wide | Separate windows | 140.0–144.2% |

GPU hardware utilization, power, private memory, macOS WindowServer/system compositor CPU and Windows/Linux behavior were not measured. There is no matched current Qt comparison. The earlier Qt figures use a different scope layout and cannot establish a current Electron-versus-Qt ratio. Ordinary shell services and the stored looper's active processing would add their own costs.

## Reproduce and inspect

```sh
# From AWB, with Node 22 first in PATH:
node tool-artifacts/shared-loop/0.1.0/tests/layout-bench/run.mjs --smoke
node tool-artifacts/shared-loop/0.1.0/tests/layout-bench/run.mjs
```

The [runner](tests/layout-bench/run.mjs) copies the installed artifact into a private temporary fixture, applies [guarded transformations](tests/layout-bench/prepare.mjs), compiles only that fixture's adapted six-channel addon and launches the [minimal benchmark](tests/layout-bench/bench.mjs). It reuses the existing isolated audio fixture and actual native binary/history/Canvas data path, with a test-only subprotocol. Production hashes are checked before/after. Outputs go to `/private/tmp/awb-layout-results.json` (or smoke results) and focused wide screenshots; retained copies accompany this report. No production layout option or persistent shell window is added by this measurement tooling.

Control: [shared canvas](tests/layout-bench/control-shared.png), [separate canvases](tests/layout-bench/control-canvases.png), [first separate window](tests/layout-bench/control-windows.png).

Audio: [shared canvas](tests/layout-bench/audio-shared.png), [separate canvases](tests/layout-bench/audio-canvases.png), [first separate window](tests/layout-bench/audio-windows.png).

Earlier renderer-only measurements: [control](CONTROL_COSTS.md), [audio](AUDIO_CHANNEL_COSTS.md). Protocol and reuse: [rolling scope design](WIDE_SCOPES.md), [guide](GUIDE.md).


[Current native Qt comparison](QT_COSTS.md) pairs stock ScopeView and the binary rolling browser
path at approximately 30 Hz, fixed waveform area, short/wide control/audio spans and
one/six lanes. The 58-phase run includes Electron GPU/helper CPU, repeat ranges, memory,
freshness differences and retained screenshots. Wide native captures are not equivalent
to continuously updated browser history. Production runtime and the live host are unchanged.
