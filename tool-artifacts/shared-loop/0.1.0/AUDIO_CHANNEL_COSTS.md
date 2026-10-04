# Multichannel audio: marginal scope rendering cost

Follow-up: [LAYOUT_COSTS.md](LAYOUT_COSTS.md) compares canvases/windows and adds GPU-process/helper CPU. The original figures below remain renderer-only evidence from their own runs.

2026-10-01 · installed Shared Loop artifact, Intel i7-8700B/macOS, SC 3.12.2, actual 48 kHz / 64-sample blocks. [Raw 24-phase results](tests/audio-channel-cost-results-2026-10-01.json). Focused minimal Electron/SC only; no Field, Studio or normal shell services. The live instrument, normal stereo codec/addon and the user's host were not modified or restarted.

## Result

The same broad fixed-cost pattern appears with audio, but adding audio lanes costs more than adding the control lanes in the preceding experiment. A fixed six-channel audio feed was captured/received throughout each sweep. Only the number of displayed lanes changed. Renderer CPU is percent of one core; values below average two forward/reverse passes:

| Drawn lanes | Raw audio 1× | Wide audio ¹⁄₁₆× | Earlier wide control |
| --- | ---: | ---: | ---: |
| 1 | 11.51% | 10.84% | 7.71% |
| 2 | 12.22% | 11.63% | Not measured |
| 4 | 11.92% | 12.48% | 8.20% |
| 6 | 12.70% | 13.45% | 8.39% |

Five extra audio lanes added approximately **1.2 CPU percentage points raw** and **2.6 points wide**, versus about 0.7 points for control. These are bounded short-run increments, not a universal cost per channel or a linear scaling model. Raw four-lane results overlap and average below two-lane results; measurement/order/content variance prevents a precise per-line fit.

With Canvas painting suspended but binary decode, rolling history, text/meters and acknowledgements active, audio renderer CPU averaged **7.71% raw / 7.69% wide**, compared with about 4.2% in the previous control run. The idle connected renderer with the producer paused measured 0.20%, near the timer resolution. The active main before opening a viewer measured 3.12% initially and 3.52% at the end, versus 0.39% idle; this includes the background mic/control readers and stored-loop bridge. Streaming/drawing main was roughly 4.3–5.9% and showed no reliable increase with visible lane count. This is not a bare socket or fully audio-only backend benchmark.

The six-channel audio stream carried about **1.11–1.14 MiB/s raw**, or **145–148 KiB/s wide**, irrespective of drawn lane count. Capture cadence remained about 47–49 chunks/s. It always transmitted six channels. Drawing one lane does not reduce transport, generation or native capture. Actual source-channel-count scaling has not been isolated here.

## Why audio differs from control

The audio renderer displays 1,024 points/bins per lane, compared with 128 for the control renderer. Audio arrives in 1,024-sample chunks at about 46.875 publications/s; control used 32 values at about 23.438 publications/s. A wider audio bin is drawn as a low/high vertical extent; raw audio uses a line. The wider view cuts transmitted samples substantially but still constructs a six-channel, 1,024-bin composite and paints it. That explains why the transport saving is much larger than any renderer CPU saving. Frequency-dependent geometry and browser behavior also matter; this is not an isolated causal profile of every pipeline component.

Sharing one feed/window amortizes socket, clock, history, DOM and repaint setup across lanes. Those fixed costs remain significant. Six signals in one renderer is different from opening six renderer processes/windows; that was not tested in this original sweep. The follow-up layout experiment linked above measures it.

## What was actually scoped

The test-only SC tap directly scopes six real audio-rate UGens:

```supercollider
var audioClock = Phasor.ar(0, 1, 0, 4194304);
var signals = SinOsc.ar([110, 220, 330, 440, 550, 660])
    * [0.10, 0.12, 0.14, 0.16, 0.18, 0.20];
ScopeOut2.ar(signals ++ [audioClock], outScope, 2048, 1024);
```

These are synthetic SC test signals, not browser samples, control-rate conversions, or six physical interface inputs. They never enter hardware output. The physical scope has seven channels; native code strips the last counter channel and transports six visible audio channels. The ordinary mono mic and six-channel control tap are still background readers, without viewers/subscribers. The looper is paused. No default device/sample-rate settings are forced.

## Isolation and reproduction

```sh
# From AWB, with Node 22 first in PATH:
node tool-artifacts/shared-loop/0.1.0/tests/multichannel-audio/run.mjs
# Short six-lane/time-axis/viewport visual verification:
node tool-artifacts/shared-loop/0.1.0/tests/multichannel-audio/run.mjs --verify-only
```

[Runner](tests/multichannel-audio/run.mjs) copies the installed demo into a temporary fixture. [Fixture transformations](tests/multichannel-audio/prepare.mjs) change only that copy: physical output scope count 3→7, reader validation, output codec count 2→6, a distinct test subprotocol `awb.scope.audio-bench.v4`, SC test tap and stacked 1/2/4/6 audio lane selector. The ordinary renderer's audio line/minmax path, history, native reducer, backend and ACK transport are retained. The addon is rebuilt only inside the temporary copy. Codec smoke checks validate six planar audio channels. Guarded source replacements fail on drift rather than silently using a different fixture.

The fixture contains six per-channel peak/RMS fields using the existing header capacity. It is a test adapter, not a production multichannel API. General arbitrary-channel support would require coordinated native/codec/host/UI changes. The existing shell still has mono mic/stereo output scopes; this experiment adds no permanent instrument or audio routing.

Cost sweeps use a 720 × 520 Electron window with a 240-pixel-high canvas, display gain 1 and background throttling disabled. Six lanes share that fixed canvas; they do not increase window size. Raw 1× spans 21.33 ms; widest spans 341.33 ms with min/max step 16. Each phase settles two seconds and samples about 5.1 seconds. Lane order 1→2→4→6 then 6→4→2→1 is repeated for both raw and wide. The previous control experiment used a 720 × 640 window but the same canvas width/height; cross-run absolute CPU differences are indicative, not a perfectly matched content/rate/viewport comparison.

## Validation and limitations

The 24-phase cost run passed active-stroke/selected-channel assertions and native six-channel amplitude, true audio rate, fixed capture length and raw/minmax format checks. Every drawn endpoint reported a complete composite history. SourceEnd advanced through an ordinary 2^22 counter wrap; this does not cover long stalls or producer restart. Normal test-owned reader/window/SC cleanup completed with exit 0. Hash guards confirmed the installed production reader, addon, codec, GUI and host were unchanged.

The raw/wide cost screenshots show a one-lane canvas at the end of each sweep. The short visual run passed with a single paint loop and uses a 720 × 640 window, all six lanes, focused captures and verifies 1,024 versus 16,384 source-frame time spans, fixed 1,024 display bins, live state and reachable footer/controls. Screenshots are test artifacts, not measurements of physical mic/speaker operation.

Two short repetitions show ranges, not confidence intervals. Process CPU resolution is roughly 0.2 percentage points; renderer/GPU/helper costs and private memory are not exhaustively profiled. SC average audio CPU was about 0.20–0.25% during active phases, versus 0.084% idle. One wide one-lane phase reported a 25.15% SC peak; this measurement does not diagnose that spike, count xruns or establish dropout/load stability. RSS includes shared pages. Different signal content, rates, channel counts, update rates, geometry density, platform and viewport can change the result. No production-only tests or unrelated application suites were rerun because the changes are isolated measurement tooling.

Visual evidence: [six raw audio lanes](tests/multichannel-audio/raw-six.png),
[six wide audio lanes](tests/multichannel-audio/wide-six.png), and
[separate visual-gate results](tests/audio-channel-verify-results-2026-10-01.json).
The larger visual-check viewport and its CPU readings are excluded from the cost table.
