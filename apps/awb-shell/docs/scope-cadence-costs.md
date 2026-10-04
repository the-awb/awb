# Scope paint cadence costs — 2026-10-02

Compared **Auto, 30 fps and 15 fps** on the same shared-capture/selected-channel scope implementation. Capture, reduction, socket delivery, acknowledgements and history append stay at their existing rates. Only painting and building the display view wait for their deadline. The scope GUI now has **Refresh → Auto / 30 fps / 15 fps**, defaulting to Auto. Changes remain uncommitted on `design/score-studio-layout`.

## What was tested

- Twelve cases: audio/control × short/wide × one lane on one canvas / six lanes on separate canvases / six separate one-lane windows. Fixed total waveform area 620 × 240 CSS pixels, device scale 1; production audio output remains stereo and the six-channel test feed is fixture-only. Separate windows still duplicate controls/chrome and have greater total compositor area.
- All three rates interleaved per case, then the full sequence reversed. Two 8-second samples per setting, 72 measured phases. This compares cadence within one run, not the old before/after scope report or Qt.
- Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz; Electron 44.4.1 / embedded Node 24.21.0. Test-owned SC selected 48.0 kHz with 64-sample blocks from its defaults. No audio rate/device settings changed; the user’s normal 44.1 kHz setup was not replaced.
- Temporary fixture owns its Electron/sclang/SC processes and private six-channel producers; tones do not go to hardware output. No Field/Studio apps or user SC startup/extensions. The test authentication shim is separate from the actual-shell gate.
- CPU is a percentage of **one core**, measured from cumulative process clocks. Electron total includes main, renderer, GPU and utility processes; SC/sclang are separate. GPU-process CPU is not GPU utilisation. RSS is summed resident memory, can count shared pages twice, and includes Chromium caches.
- Renderer paint/packet counts use each renderer’s own measurement span. Paint pause metrics include interval endpoints and are based on a bounded ring of 512 animation-frame timestamps. The endpoint lag is latest received source clock minus painted source clock, not microphone-to-screen latency. Values shown are the largest sampled endpoint lag, not a continuously observed maximum.
- Active views must remain Live, advance source clocks, respect rate bounds, paint above 5 Hz, have no paint pause over 400 ms and no sampled endpoint lag over 200 ms. Actual measured maxima appear below. These checks catch large pauses in the tested intervals; they are not a long-session freeze or dropout guarantee.
- Source gaps remain explicit and are reported. This receives every available acknowledged scope packet into history; SC’s single-reader/latest-publication capture can still miss publications under load. Fewer paints do not mean fewer source packets by design.
- Short, sequential samples on one machine: ranges are observed repeat ranges, not confidence intervals. Differences in SC average/peak or uncapped ingress are not evidence of an audio-engine change. Default Auto remains available; perceived smoothness has not been established by a user study.

## Electron total CPU

| Layout / view | Auto mean (range) | 30 fps mean (range) | 15 fps mean (range) | Savings at 30 / 15 |
| --- | ---: | ---: | ---: | ---: |
| `control-raw-shared-1` | 19.3 (19.0–19.6) | 20.3 (20.1–20.5) | 17.9 (17.8–18.1) | -5.1% / 7.1% |
| `control-raw-canvases-6` | 25.5 (25.3–25.7) | 26.3 (26.0–26.5) | 21.8 (21.5–22.0) | -3.1% / 14.5% |
| `control-raw-windows-6` | 70.6 (68.6–72.7) | 71.1 (69.8–72.4) | 58.8 (58.8–58.9) | -0.6% / 16.7% |
| `control-wide-shared-1` | 20.8 (20.6–20.9) | 21.0 (20.8–21.1) | 17.0 (16.8–17.3) | -1.0% / 17.9% |
| `control-wide-canvases-6` | 26.4 (26.0–26.8) | 27.1 (27.0–27.1) | 22.1 (22.0–22.1) | -2.6% / 16.4% |
| `control-wide-windows-6` | 71.8 (71.3–72.4) | 73.5 (73.5–73.5) | 59.9 (59.5–60.2) | -2.4% / 16.7% |
| `output-raw-shared-1` | 30.3 (30.2–30.4) | 26.4 (26.0–26.8) | 20.7 (19.5–21.8) | 12.8% / 31.8% |
| `output-raw-canvases-6` | 46.0 (45.6–46.5) | 36.5 (36.2–36.7) | 26.6 (26.2–27.1) | 20.8% / 42.1% |
| `output-raw-windows-6` | 120.6 (119.2–122.0) | 96.3 (95.6–97.0) | 71.6 (71.3–71.9) | 20.1% / 40.6% |
| `output-wide-shared-1` | 32.0 (31.3–32.8) | 26.9 (26.5–27.4) | 20.3 (20.2–20.3) | 15.9% / 36.8% |
| `output-wide-canvases-6` | 61.8 (61.7–61.9) | 47.2 (47.2–47.2) | 30.8 (30.2–31.5) | 23.6% / 50.1% |
| `output-wide-windows-6` | 131.2 (130.7–131.7) | 106.1 (105.9–106.4) | 70.9 (70.4–71.4) | 19.1% / 46.0% |

## Where CPU was spent

Cells show **main / renderer / GPU-process CPU**; utility CPU is included in the totals above.

| Layout / view | Auto | 30 fps | 15 fps |
| --- | ---: | ---: | ---: |
| `control-raw-shared-1` | 5.2 / 5.8 / 7.8 | 5.5 / 6.3 / 8.0 | 5.9 / 5.1 / 6.4 |
| `control-raw-canvases-6` | 5.3 / 7.1 / 12.5 | 5.5 / 7.4 / 12.8 | 5.7 / 6.1 / 9.4 |
| `control-raw-windows-6` | 6.8 / 34.1 / 27.0 | 6.6 / 34.4 / 27.3 | 6.4 / 27.9 / 22.5 |
| `control-wide-shared-1` | 5.7 / 6.1 / 8.4 | 5.6 / 6.4 / 8.4 | 5.6 / 4.9 / 6.0 |
| `control-wide-canvases-6` | 5.3 / 6.8 / 13.7 | 5.3 / 7.1 / 14.1 | 5.2 / 6.1 / 10.2 |
| `control-wide-windows-6` | 6.3 / 33.7 / 29.1 | 6.7 / 34.8 / 29.2 | 6.0 / 27.6 / 24.2 |
| `output-raw-shared-1` | 7.1 / 10.5 / 11.2 | 6.9 / 9.5 / 8.4 | 7.3 / 6.3 / 5.5 |
| `output-raw-canvases-6` | 7.0 / 13.7 / 23.5 | 7.1 / 11.7 / 15.9 | 7.6 / 8.0 / 9.1 |
| `output-raw-windows-6` | 8.6 / 57.1 / 48.0 | 8.0 / 49.3 / 33.4 | 8.5 / 34.9 / 22.6 |
| `output-wide-shared-1` | 6.9 / 10.5 / 13.6 | 6.8 / 9.1 / 10.0 | 7.1 / 5.8 / 6.3 |
| `output-wide-canvases-6` | 5.9 / 13.6 / 41.0 | 6.3 / 11.8 / 27.8 | 7.0 / 7.4 / 15.1 |
| `output-wide-windows-6` | 8.1 / 54.6 / 63.9 | 8.2 / 48.4 / 45.6 | 8.1 / 30.9 / 27.9 |

## Actual updates, pauses and source gaps

Each rate cell shows **paint Hz / incoming packet Hz / max paint gap ms / max endpoint source lag ms**. Incoming rate and paint rate are separate counters. Gaps count source samples/control values per viewer; multiple viewers can report the same gap, so do not sum them as independent losses.

| Layout / view | Auto | 30 fps | 15 fps | Source-gap ranges Auto / 30 / 15 |
| --- | ---: | ---: | ---: | --- |
| `control-raw-shared-1` | 23.4 / 23.5 / 68.3 / 42.7 | 23.4 / 23.5 / 68.5 / 42.7 | 15.0 / 23.5 / 68.8 / 42.7 | 0–0 / 0–0 / 0–0 |
| `control-raw-canvases-6` | 23.4 / 23.5 / 68.8 / 42.7 | 23.5 / 23.5 / 68.6 / 0.0 | 15.0 / 23.5 / 68.7 / 42.7 | 0–0 / 0–0 / 0–0 |
| `control-raw-windows-6` | 23.5 / 23.5 / 68.5 / 0.0 | 23.4 / 23.4 / 68.7 / 42.7 | 15.0 / 23.5 / 68.8 / 85.3 | 0–0 / 0–0 / 0–0 |
| `control-wide-shared-1` | 23.5 / 23.5 / 68.6 / 42.7 | 23.5 / 23.4 / 68.6 / 0.0 | 15.0 / 23.5 / 68.8 / 42.7 | 0–0 / 0–0 / 0–0 |
| `control-wide-canvases-6` | 23.5 / 23.5 / 68.7 / 0.0 | 23.5 / 23.5 / 68.6 / 0.0 | 14.9 / 23.4 / 68.8 / 42.7 | 0–0 / 0–0 / 0–0 |
| `control-wide-windows-6` | 23.4 / 23.4 / 68.9 / 0.0 | 23.5 / 23.5 / 68.7 / 0.0 | 15.0 / 23.4 / 68.8 / 85.3 | 0–0 / 0–0 / 0–0 |
| `output-raw-shared-1` | 47.0 / 46.9 / 52.1 / 0.0 | 30.0 / 46.9 / 35.4 / 21.3 | 15.0 / 46.7 / 68.8 / 42.7 | 0–0 / 0–0 / 0–2048 |
| `output-raw-canvases-6` | 46.8 / 46.8 / 52.1 / 0.0 | 30.0 / 46.9 / 35.4 / 42.7 | 15.0 / 46.7 / 68.7 / 42.7 | 0–1536 / 0–0 / 0–2048 |
| `output-raw-windows-6` | 46.9 / 46.8 / 52.1 / 0.0 | 30.0 / 46.7 / 50.1 / 21.3 | 15.0 / 46.8 / 82.6 / 64.0 | 0–0 / 512–2560 / 0–1536 |
| `output-wide-shared-1` | 46.7 / 46.7 / 52.0 / 0.0 | 29.9 / 46.9 / 35.5 / 21.3 | 14.9 / 46.8 / 68.7 / 64.0 | 0–2560 / 0–0 / 0–2048 |
| `output-wide-canvases-6` | 46.6 / 46.6 / 116.7 / 21.3 | 30.0 / 46.9 / 35.5 / 21.3 | 15.0 / 46.9 / 68.7 / 21.3 | 0–5632 / 0–1024 / 0–0 |
| `output-wide-windows-6` | 46.9 / 46.8 / 52.1 / 0.0 | 30.0 / 46.8 / 50.2 / 42.7 | 15.0 / 46.5 / 68.8 / 64.0 | 0–0 / 0–1024 / 2048–4096 |

## Transport, memory and SC load

Cells show **scope binary KiB/s / summed RSS MiB / SC average CPU / largest SC peak CPU**. Transport counters exclude ACK/status/control framing. Rates are unchanged by the paint setting apart from timing/load variation.

| Layout / view | Auto | 30 fps | 15 fps |
| --- | ---: | ---: | ---: |
| `control-raw-shared-1` | 5.5 / 322 / 0.215 / 0.60 | 5.5 / 323 / 0.218 / 0.67 | 5.5 / 320 / 0.224 / 0.48 |
| `control-raw-canvases-6` | 20.2 / 329 / 0.228 / 0.68 | 20.2 / 331 / 0.219 / 0.73 | 20.2 / 331 / 0.223 / 0.75 |
| `control-raw-windows-6` | 33.2 / 744 / 0.214 / 0.74 | 33.1 / 746 / 0.214 / 0.65 | 33.1 / 721 / 0.215 / 0.64 |
| `control-wide-shared-1` | 2.9 / 347 / 0.224 / 0.56 | 2.9 / 346 / 0.229 / 0.54 | 2.9 / 342 / 0.225 / 0.53 |
| `control-wide-canvases-6` | 4.8 / 339 / 0.217 / 0.61 | 4.8 / 339 / 0.219 / 0.71 | 4.8 / 336 / 0.222 / 0.63 |
| `control-wide-windows-6` | 17.6 / 754 / 0.218 / 0.85 | 17.7 / 755 / 0.217 / 0.76 | 17.6 / 729 / 0.214 / 0.83 |
| `output-raw-shared-1` | 193.4 / 344 / 0.244 / 0.60 | 193.3 / 342 / 0.245 / 0.65 | 192.4 / 339 / 0.247 / 0.61 |
| `output-raw-canvases-6` | 1133.5 / 361 / 0.229 / 0.60 | 1134.7 / 359 / 0.236 / 0.70 | 1132.2 / 356 / 0.243 / 0.69 |
| `output-raw-windows-6` | 1159.6 / 798 / 0.225 / 0.84 | 1154.9 / 782 / 0.232 / 0.95 | 1159.2 / 767 / 0.235 / 0.96 |
| `output-wide-shared-1` | 28.6 / 348 / 0.239 / 0.65 | 28.7 / 345 / 0.242 / 0.63 | 28.6 / 343 / 0.242 / 0.65 |
| `output-wide-canvases-6` | 145.3 / 354 / 0.219 / 0.73 | 146.3 / 350 / 0.229 / 0.83 | 146.2 / 347 / 0.245 / 0.80 |
| `output-wide-windows-6` | 172.0 / 790 / 0.233 / 1.06 | 171.8 / 773 / 0.231 / 0.87 | 170.7 / 756 / 0.233 / 0.73 |

## Interpretation

The largest observed paint interval was **116.7 ms**; the largest sampled endpoint source lag
was **85.3 ms**. These are different measures, and neither is end-to-end audio latency.

- **output-raw-shared-1:** total 30.3 → 26.4 → 20.7% of one core; actual paint 47.0 → 30.0 → 15.0 Hz. At 15 fps ingress remained 46.7 Hz.
- **output-raw-canvases-6:** total 46.0 → 36.5 → 26.6% of one core; actual paint 46.8 → 30.0 → 15.0 Hz. At 15 fps ingress remained 46.7 Hz.
- **output-raw-windows-6:** total 120.6 → 96.3 → 71.6% of one core; actual paint 46.9 → 30.0 → 15.0 Hz. At 15 fps ingress remained 46.8 Hz.
- **output-wide-windows-6:** total 131.2 → 106.1 → 70.9% of one core; actual paint 46.9 → 30.0 → 15.0 Hz. At 15 fps ingress remained 46.5 Hz.
- **control-raw-windows-6:** total 70.6 → 71.1 → 58.8% of one core; actual paint 23.5 → 23.4 → 15.0 Hz. At 15 fps ingress remained 23.5 Hz.
- A 30 fps target mainly affects audio, whose incoming display chunks are about 47 Hz. Controls arrive about 23–24 Hz, so 30 fps ordinarily does not reduce their paint work; 15 fps does.
- A steady deadline is aligned with animation frames. Late frames do not permanently push the target downward; missed deadlines are skipped and idle scopes schedule no work. User controls bypass the data deadline for a prompt next-frame redraw. Freeze receives history without requesting paints; page closure cancels the pending frame/timer.
- Lower refresh keeps each displayed waveform’s sample/bin resolution and every available history chunk, but makes the screen less current and motion less fluid. A short transient can occur entirely between paints of a short view; retained history is not the same as showing every transient live. Use Auto when that matters.
- This is a cadence comparison, not proof that transport, geometry or the graphics driver is the sole remaining bottleneck. Only some rendering work follows paint cadence; packet processing, history append, freshness timers, chrome and process overhead remain.

## Validation and limitations

29 scope unit tests pass, including five scheduler/history/urgent-control/cleanup/bounded-diagnostics tests. The actual-shell looper gate passed with ~30/15 fps, changing canvas pixels at each target, live waveform/control checks, freeze, on-demand ownership, raw 512-frame paired SC Bus streaming and host-preserving teardown. The final six-case benchmark smoke passed, including all three audio rates, control 15 fps, frozen receiving and the real looper/stereo scope/raw peer. The full 72-phase run passed and restored the expected synth/group baseline.
One preliminary smoke stalled between cases and was stopped using only its test-owned processes. Bounded stage-specific cleanup diagnostics were added; subsequent smoke and full runs completed. The original stall’s cause was not established, so this is not claimed as a general lifecycle fix.
122 protected source/native/audio/SC/Lissajous artifact and historical artifact files, plus 6 prior shell evidence files, match their pre-change hashes. No new native build, audio routing, broker/reduction, raw SC Bus codec or Lissajous renderer change was needed. Physical-device/load/long-session regressions were not remeasured.

## Run and reuse

30 fps is a useful interactive audio-scope option here: roughly 13% lower total CPU for one raw
scope and 20% for six raw windows, with faster updates than 15 fps. At 15 fps the same cases
save roughly 32% and 41%. Control scopes below 30 Hz can stay on Auto; 15 fps saves more when
slower updates are acceptable. These are measured tradeoffs, not universal default choices.

Open a scope and choose **Refresh → Auto / 30 fps / 15 fps**. A page reload returns to Auto; settings are per window and do not change audio or another viewer. Restart the shell for its new JS asset-serving route, then reopen scope windows. The normal SC host needs no reboot or rate/device reconfiguration for this change.

```sh
# AWB root; Node 22 first in PATH
node apps/awb-shell/test/signal-bench/run.mjs --cadence --tag=cadence-check --smoke
node apps/awb-shell/test/signal-bench/run.mjs --cadence --tag=cadence-current --seconds=8
node --test tool-artifacts/shared-loop/0.1.0/tests/*.test.mjs
npm run test:shared-loop --workspace @awb/desktop-shell
```

The full sweep has a 30-minute runner timeout. Do not run other tests/builds during measurement. Output is `/private/tmp/awb-signal-<tag>.json`.

The reusable module is [scope-painter.js](../../../tool-artifacts/shared-loop/0.1.0/public/scope-painter.js). Give it a paint callback, call `invalidate()` when data makes the view dirty, `invalidate(true)` for user actions, `setRate(0/30/15)` for refresh changes, and `close()` on teardown. Decode, acknowledge and append history outside it. Keep rendering and source lifecycle owned by the app; this module does not grant renderer access to SC.

Retained evidence:

- [72-phase raw results](../test/signal-bench/results/cadence-2026-10-02.json)
- [Summary means and freshness metrics](../test/signal-bench/results/cadence-summary-2026-10-02.json)
- [Final smoke raw results](../test/signal-bench/results/cadence-smoke-2026-10-02.json)
- [Protected-file manifest](../test/signal-bench/results/cadence-environment-2026-10-02.json)
- [Harness](../test/signal-bench/bench.mjs) / [fixture layout](../test/signal-bench/prepare.mjs)
- [Previous shared-reduction/selected-channel costs](scope-optimisation-costs.md)
- [Engine and reuse guide](shared-signal-engine.md)
