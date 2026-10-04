# Control connection and additional lane costs

Follow-up: [LAYOUT_COSTS.md](LAYOUT_COSTS.md) compares canvases/windows and adds GPU-process/helper CPU. The original figures below remain renderer-only evidence from their own runs.

Measured 2026-10-01 with the installed Shared Loop artifact on Intel i7-8700B/macOS, SC 3.12.2, actual 48 kHz / 64-sample blocks. [Raw results](tests/control-cost-results-2026-10-01.json). This is a focused minimal Electron/SC test, with no Field, Studio or normal shell services. Production runtime behavior was not changed.

## What the measurement separates

One control window, 720 × 640, display gain 1, widest ¹⁄₁₆× view (2.731-second rolling span, 128 min/max bins per lane). Six SC generators/control channels remained allocated and transmitted regardless of visible lane selection. The looper was paused; audio taps/readers remained active in the backend but no audio viewer/subscriber was opened. Thus these are incremental **display-lane** costs with a fixed six-channel feed, not one-versus-six SC producer or wire-format costs.

Each phase settles for two seconds and measures about 5.1 seconds. The same renderer runs throughout, with background throttling disabled. Lane selection is swept 1→4→6 then 6→4→1 to reduce order/warm-up bias. One lane is the slow sine, four are noise, six include both sines and noise; content also affects drawing, so this is not a universal cost per identical line. No-paint phases suspend requestAnimationFrame while receiving/decoding chunks, building the ring, updating text/meters and acknowledging frames. The idle-connected phase additionally pauses the scope writer but retains the socket, timers, mapped readers and cached data. This is not a benchmark of a bare WebSocket in isolation.

| Phase | Main CPU, % one core | Control renderer CPU, % one core | Binary payload |
| --- | ---: | ---: | ---: |
| Idle minimal Electron, no bridge/viewer | 0.39 | — | — |
| Active bridge, all readers, no viewer (two phases) | 2.93 / 2.93 | — | 0 |
| Connected idle, no new publications or Canvas painting | 3.13 | Below resolution (reported 0.00) | 0 |
| Streaming, Canvas painting stopped (two phases) | 3.71 / 4.30 | 4.10 / 4.30 | 4.65 / 4.66 KiB/s |
| Streaming, one drawn lane (two phases) | 4.29 / 3.91 | 7.61 / 7.82 | 4.65 / 4.66 KiB/s |
| Streaming, four drawn lanes (two phases) | 3.71 / 3.71 | 7.81 / 8.59 | 4.69 / 4.69 KiB/s |
| Streaming, six drawn lanes (two phases) | 3.51 / 3.51 | 8.19 / 8.58 | 4.65 / 4.65 KiB/s |

The active bridge adds approximately 2.5 CPU percentage points above idle main in this run, even before a viewer subscribes. Its steady cost includes the current 8 ms all-scope polling and 33 ms stored-loop polling/status work; this does not mean an idle socket costs 3%. The connected but idle renderer was below the approximately 0.2-point measurement resolution.

A live feed without Canvas painting used about 4.2% renderer CPU, including ring assembly and DOM/meters. Drawing one lane raised total renderer CPU to about 7.7%; six lanes averaged about 8.4%. Five additional visible lines therefore added only about **0.7 CPU percentage points** in this sweep. Four lanes averaged about 8.2%; the overlap/variance precludes an exact linear per-line price. Main CPU showed no reliable scaling with visible lane count, as expected for an unchanged feed. Bandwidth stayed about 4.7 KiB/s because all six channels were still transmitted.

For an actually configurable source/channel format, the calculated widest-view payload would be 104 header bytes plus 16 bytes/channel per 32-value chunk, at 23.438 chunks/s: about 2.75 KiB/s for one channel and 4.58 KiB/s for six, or 375 bytes/s per added channel before ACK/framing. The current codec/reader expects six channels and was not changed to test that variant. No measured per-generator DSP/capture increment is claimed.

The fixed viewer/feed/repaint work dominates this bounded lane range. Plausible next optimizations are painting only fresh/dirty views and collecting only subscribed sources; these are suggestions, not changes implemented by this measurement.

## Evidence and reproduction

```sh
# From AWB, with Node 22 first in PATH:
node tool-artifacts/shared-loop/0.1.0/tests/run-component-bench.mjs --control-cost-only
```

Writes `/private/tmp/awb-control-cost-results.json`. The new mode preserves the existing rolling/binary/default benchmark modes. It asserts correct lane selection and active strokes during drawn phases and zero Canvas strokes in no-paint phases. All drawn phases had complete history at their sampled endpoints and about 24 packets/s. No-paint canvas datasets retain the last drawn history values; their missing-frame fields are not current stream-loss measurements. The paused-producer interval is intentional. End-to-end instrument/scope lifecycle and protocol/history gates were passed separately before this measurement; no production change required rerunning unrelated application tests.

Normal test-owned reader/window/server cleanup completed with exit 0. Short sequential phases and two repeats give ranges, not confidence intervals, long-run/load certification or GPU costs. CPU percentages refer to one core; SC's audio CPU is a separate metric and is not added to them. Process timer resolution is roughly 0.2 percentage points. RSS includes shared pages: one versus six lanes stays in the same Electron window/process, so adding lanes does not create additional renderer processes. Actual producer count, channel layout, sample rate, update rate, viewport, platform and background activity can change the costs.

[Multichannel audio measurements](AUDIO_CHANNEL_COSTS.md) compare 1/2/4/6 drawn audio lanes
from a fixed six-channel SC feed, in raw and wide modes. The isolated fixture leaves the
normal stereo instrument and live host unchanged; it is measurement tooling, not a deployed
arbitrary-channel scope API.
