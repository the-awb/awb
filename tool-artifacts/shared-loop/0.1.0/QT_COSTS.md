# Current native Qt versus Electron scope costs

2026-10-02 · Intel i7-8700B / macOS 15.7.9, SC 3.12.2, Electron 44.4.1. Actual audio configuration: 48 kHz, SC block 64, hardware callback buffer 512 samples. [Full 58-phase results](tests/qt-results-2026-10-02.json), [eight-case smoke gate](tests/qt-smoke-results-2026-10-02.json). Minimal test-owned processes only; no Field, Studio, normal shell services or live-host restart. Normal scope runtime files and binaries passed before/after hash guards unchanged.

## What the comparison establishes

The stock native Qt ScopeView is substantially cheaper in these cases. Its cost advantage remains with matched short-view signal spans, equal total waveform area and approximately 30 Hz painting/polling settings. Separate native windows also have much smaller marginal cost than the current Electron per-window full-feed path.

This compares two implementations, not an intrinsic framework multiplier. Qt is the installed C++ ScopeView hosted in sclang, with simple static captions. Electron retains the installed binary transport, browser history, dynamic meters/status, grids, labels and view controls. Native Qt has no equivalent rolling-history, source-gap, immutable-freeze or binary/browser-delivery features in this experiment. Those differences contribute to cost.

Wide-mode cost is particularly **not feature-equivalent**: Qt completes a large raw capture before publishing; the browser continually assembles reduced short chunks. Showing the same duration in Qt means much less frequent fresh data. A custom Qt implementation could add rolling history; it has not been built or measured here.

## Six lanes: CPU breakdown

Means of two measured phases, with reversed layout and implementation order on pass two. **100% is one CPU core.** Qt is total sclang process CPU (native drawing runs there); Electron is main + all current renderer + GPU/Utility helper CPU. The separately recorded scsynth CPU is excluded from both. Electron's GPU column is **GPU-process CPU**, not GPU hardware utilization. Utility CPU is included in total but omitted from its own column.

| Signal | View | Layout | Qt / sclang CPU | Total Electron CPU | Electron main | Electron renderers | GPU-process CPU | Observed Electron / Qt |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Control | Short | One shared plot | 3.0% | 20.9% | 4.4% | 7.0% | 9.0% | 6.9× |
| Control | Short | Separate plots, one window | 3.4% | 27.7% | 4.9% | 8.1% | 14.3% | 8.1× |
| Control | Short | Separate windows | 5.2% | 74.9% | 5.2% | 39.3% | 28.5% | 14.5× |
| Control | Wide | One shared plot | 5.0% | 24.6% | 4.2% | 7.4% | 12.4% | 4.9× |
| Control | Wide | Separate plots, one window | 4.8% | 30.1% | 4.1% | 8.1% | 17.5% | 6.3× |
| Control | Wide | Separate windows | 5.1% | 78.0% | 4.9% | 39.1% | 32.2% | 15.2× |
| Audio | Short | One shared plot | 5.0% | 33.1% | 6.9% | 11.7% | 13.1% | 6.7× |
| Audio | Short | Separate plots, one window | 4.8% | 38.1% | 5.1% | 12.5% | 18.9% | 8.0× |
| Audio | Short | Separate windows | 6.9% | 104.3% | 6.7% | 53.9% | 37.0% | 15.1× |
| Audio | Wide | One shared plot | 5.2% | 42.7% | 5.6% | 11.7% | 24.1% | 8.1× |
| Audio | Wide | Separate plots, one window | 6.2% | 46.9% | 5.2% | 11.7% | 28.8% | 7.6× |
| Audio | Wide | Separate windows | 6.9% | 113.0% | 8.4% | 50.9% | 49.0% | 16.4× |

The Node/Electron benchmark controller remains alive during Qt phases, mostly idle; its CPU is retained in the raw results but excluded from Qt's UI cost because a Qt-only viewer does not require it. System WindowServer/compositor CPU, GPU hardware use and power are unmeasured for both paths.

## One lane: short-view reference

| Signal | Qt / sclang CPU | Total Electron CPU |
| --- | ---: | ---: |
| Control | 2.5% | 21.0% |
| Audio | 3.0% | 27.8% |

One and six lanes have two repetitions each. Qt's one-lane tap publishes one channel; its six-lane tap publishes six. The browser always receives six channels, selecting one or six for display, so these are implementation costs rather than a fixed-source-count marginal rendering comparison. Six source generators remain active in both. No 2/4-lane sweep was added here; [the preceding Electron layout experiment](LAYOUT_COSTS.md) retains those measurements.

## Matching time span and stating freshness

| Signal / view | Visible source frames | Visible duration | Native Qt fresh captures | Browser fresh source chunks |
| --- | ---: | ---: | ---: | ---: |
| Control, short | 32 kr values | 42.67 ms | 23.438 Hz | 23.438 Hz |
| Audio, short | 1,024 ar samples | 21.33 ms | 46.875 Hz | 46.875 Hz |
| Control, wide | 2,048 kr values | 2,730.67 ms | 0.366 Hz | 23.438 Hz |
| Audio, wide | 16,384 ar samples | 341.33 ms | 2.930 Hz | 46.875 Hz |

Qt's polling timer is 33 ms, validated by property read-back. The browser paint callback is test-capped near 30 Hz; measured rates were 30.0–30.3 Hz. Native Qt actual paint-event frequency was not instrumented: the timer setting is matched, and changing plot images verify activity, but configured cadence is not an exact repaint counter. Qt can repaint cached data between publications. No intentional painting-stop phases occur in this run; idle baselines close the windows instead.

Short control uses the browser's 4× inward zoom to display 32 values from its normal 128-value composite, matching Qt's short capture span. Default pan selects the earliest 32 values, whose end is 128 ms behind the latest composite end. This is a fixed view offset, not a stopped feed; publication cadence and drawing workload match, but absolute source recency is not identical. The cases are sequential and compare the same signal generators, not sample-for-sample synchronized images. Wide browser history has 128 control / 1,024 audio min/max bins; native Qt scans the full raw capture and reduces dense plots per horizontal pixel internally. Control interpolation also differs: browser steps versus native linear segments.

## Memory

Short view, six lanes. Summed RSS includes shared pages; it is not private/unique physical RAM:

| Signal | Layout | Qt sclang RSS | Browser host sclang RSS | Electron main + renderers + helpers RSS |
| --- | --- | ---: | ---: | ---: |
| Control | One shared plot | 240 MiB | 235 MiB | 334 MiB |
| Control | Separate plots, one window | 242 MiB | 237 MiB | 331 MiB |
| Control | Separate windows | 260 MiB | 238 MiB | 740 MiB |
| Audio | One shared plot | 268 MiB | 262 MiB | 388 MiB |
| Audio | Separate plots, one window | 268 MiB | 262 MiB | 387 MiB |
| Audio | Separate windows | 281 MiB | 262 MiB | 897 MiB |

Both paths need the SC host processes. Qt uses the existing language/GUI process; a headless Node shell also runs sclang for this instrument. The Electron RSS column is additional to the browser-host sclang/scsynth processes; it must not be compared with an assumed zero-cost Qt language host. Per-process main, renderer, GPU/Utility and scsynth RSS are retained. Language/UI allocation caches and repeated image capture can affect warm RSS, so these values do not isolate bytes owned by the ScopeView widget itself.

## Signals, ownership and SC costs

The same private buses supply both paths: six audio-rate SinOsc signals at 110/220/330/440/550/660 Hz and amplitudes .10/.12/.14/.16/.18/.20; control buses contain 1/10 Hz sine LFOs and LFNoise0 at 1/5/20/100 Hz. Test audio never reaches hardware output. The looper is paused. The base mic/audio/control writer with clock channels remains active throughout. Qt adds a private counter-free tap while its views are open; Node consumes the existing clocked tap. Consequently SC process/audio CPU is useful observed evidence, but this fixture does not isolate the minimum producer cost of a Qt-only graph.

Native views allocate separate scope indices, one per widget: shared plot gets N channels; separate plots/windows get N mono buffers. Qt and Node never attach readers to the same index. Qt readers stop before writers/buffers are freed; the owned test server is quit at the end. Large raw captures are only in Qt's private buffers and never change the shipped rolling allocations.

All layouts hold total waveform area at **620 × 240 = 148,800 logical pixels**. Each of six separate plots/windows gets 620 × 40. Qt style 0 stacks channels, fill disabled, yZoom .8 matching the browser's .4-of-lane-height amplitude. Qt has no grid/text inside the plot; Electron repeats its own grid/labels per canvas. Extra window surfaces/controls are not held equal. Separate Qt windows share one sclang process; separate Electron windows have independent full six-channel sockets, decoders, histories and renderer processes. Browser traffic is retained and grows approximately sixfold with six windows; Qt reads shared memory directly and has no Node-to-browser payload.

SC's reported audio CPU across the sweep ranged 0.22–0.39%, with maximum reported peak 46.72% in the second-pass Qt wide-control shared-plot phase. These are SC's own metrics, separate from process CPU. No hardware underrun count, loaded audio deadline analysis, core-placement trace or sustained-load guarantee follows. The shared benchmark graph is quiet and small.

All 58 phases and the eight-case smoke gate passed. All sampled browser endpoints had complete history; every Qt plot image changed in the successful full run. The installed production hash guards and normal owned window/reader/server/fixture cleanup passed. These endpoint checks do not certify continuous visual presentation.

## Repeat variation

Each case settles two seconds then samples 20 status replies over about 5.1 seconds. Wide control gets 3.1 seconds of additional fill time. Process CPU uses macOS ps cumulative CPU clocks, with approximately 0.2-point resolution. These are sequential short-run measurements, not confidence intervals. Six-lane observed ranges:

| Signal | View | Layout | Qt CPU range | Electron CPU range |
| --- | --- | --- | ---: | ---: |
| Control | Short | One shared plot | 2.9–3.1% | 19.3–22.5% |
| Control | Short | Separate plots, one window | 3.1–3.7% | 26.8–28.5% |
| Control | Short | Separate windows | 5.1–5.2% | 74.4–75.4% |
| Control | Wide | One shared plot | 4.8–5.2% | 24.1–25.1% |
| Control | Wide | Separate plots, one window | 4.7–4.9% | 29.7–30.5% |
| Control | Wide | Separate windows | 3.3–7.0% | 76.5–79.4% |
| Audio | Short | One shared plot | 4.5–5.4% | 31.7–34.6% |
| Audio | Short | Separate plots, one window | 4.7–4.9% | 37.7–38.5% |
| Audio | Short | Separate windows | 6.6–7.2% | 102.6–106.0% |
| Audio | Wide | One shared plot | 5.0–5.4% | 42.4–42.9% |
| Audio | Wide | Separate plots, one window | 6.0–6.4% | 46.3–47.6% |
| Audio | Wide | Separate windows | 6.6–7.2% | 111.0–115.1% |

Qt plot PNG hashes are captured before/after each phase, outside the CPU measurement interval. At least one plot must change per case; the per-plot change array is retained. A periodic individual channel can produce an identical image despite receiving fresh captures, so identical hashes alone do not establish a freeze. Browser checks enforce capped drawing activity, advancing source clocks, correct view span, channel/subscriber counts, live state and reachable controls. Neither check is a continuous screen-presentation or maximum-stall measurement.

## Reproduction and evidence

```sh
# From AWB with Node 22 first in PATH:
node tool-artifacts/shared-loop/0.1.0/tests/qt-bench/run.mjs --smoke
node tool-artifacts/shared-loop/0.1.0/tests/qt-bench/run.mjs
```

The runner copies the installed artifact into a private temporary fixture and compiles only its adapted six-channel Node addon. Guarded transformations reuse the existing layout renderer/history/codec and add a private audio bus, Qt tap/controller and test-only 30 Hz browser paint cap. The installed SC/Qt library and native Qt widget are unchanged. Inputs are in [run.mjs](tests/qt-bench/run.mjs), [prepare.mjs](tests/qt-bench/prepare.mjs), [bench.mjs](tests/qt-bench/bench.mjs), [qt-controls.scd](tests/qt-bench/qt-controls.scd). Results go to `/private/tmp/awb-qt-results.json`; first-pass six-lane window images are captured per case. Owned fixture/server/window cleanup and production hashes passed with exit 0.

Retained screenshots show one representative window per layout. For the separate-window layout, that is the first single-channel window, not a montage of all six.

Control, short:

- One shared plot: [qt](tests/qt-bench/qt-control-short-shared.png), [electron](tests/qt-bench/electron-control-short-shared.png)
- Separate plots, one window: [qt](tests/qt-bench/qt-control-short-canvases.png), [electron](tests/qt-bench/electron-control-short-canvases.png)
- Separate windows: [qt](tests/qt-bench/qt-control-short-windows.png), [electron](tests/qt-bench/electron-control-short-windows.png)

Control, wide:

- One shared plot: [qt](tests/qt-bench/qt-control-wide-shared.png), [electron](tests/qt-bench/electron-control-wide-shared.png)
- Separate plots, one window: [qt](tests/qt-bench/qt-control-wide-canvases.png), [electron](tests/qt-bench/electron-control-wide-canvases.png)
- Separate windows: [qt](tests/qt-bench/qt-control-wide-windows.png), [electron](tests/qt-bench/electron-control-wide-windows.png)

Audio, short:

- One shared plot: [qt](tests/qt-bench/qt-output-short-shared.png), [electron](tests/qt-bench/electron-output-short-shared.png)
- Separate plots, one window: [qt](tests/qt-bench/qt-output-short-canvases.png), [electron](tests/qt-bench/electron-output-short-canvases.png)
- Separate windows: [qt](tests/qt-bench/qt-output-short-windows.png), [electron](tests/qt-bench/electron-output-short-windows.png)

Audio, wide:

- One shared plot: [qt](tests/qt-bench/qt-output-wide-shared.png), [electron](tests/qt-bench/electron-output-wide-shared.png)
- Separate plots, one window: [qt](tests/qt-bench/qt-output-wide-canvases.png), [electron](tests/qt-bench/electron-output-wide-canvases.png)
- Separate windows: [qt](tests/qt-bench/qt-output-wide-windows.png), [electron](tests/qt-bench/electron-output-wide-windows.png)
