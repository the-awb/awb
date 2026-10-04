# Headless SC: GUI updates, focus switching and audio deadlines — 2026-10-03

## Question and boundary

Can the headless shell's GUI cause SC audio interruptions, particularly when applications change focus? Earlier [opacity scaling costs](scope-opacity-scaling.md) measured average CPU and live widget updates, not audio deadline safety.

This test adds a calibrated stock-UGen DSP load and a continuous quiet pilot tone, then compares the same graph with observation stopped, 128 audio-driven opacity widgets, and those widgets while switching between the shell and an already-running VS Code. The test host is headless. The user's existing IDE/server remains untouched; Bitwig was not running, so it is not launched. These results test the headless route and do not establish the cause of the reported SC IDE focus dropout.

## Detector

The installed SC executable has hardened runtime restrictions that prevent this callback interposer loading. The fixture runs a temporary copy of the same installed `scsynth`, signed ad hoc, through a launcher that sets the test library for that child only. The installed server and production shell/audio sources are unchanged. Executable code sections are compared with the original. The copied executable's standard UGen path is set explicitly because its new location would otherwise hide the bundled plugins. The workload uses only stock UGens.

The test-only interposer wraps SC's existing `AudioDeviceCreateIOProcID` output callback and maps legacy `AudioDeviceStart`/stop identifiers. It calls the original DSP callback and then audits channel zero of the actual Float32 output buffers handed to Core Audio. It does not create an extra audio stream or tap, alter the device/rate/buffer, or require audio-recording permission.

The output pilot is 997 Hz on channel zero and 733 Hz on channel one, peak approximately −50 dBFS. The channel-zero detector checks:

- Sine recurrence residual `x[n] - 2 cos(2π·997/sampleRate) x[n-1] + x[n-2]`, threshold 1e−5, including callback boundaries.
- Runs of at least 32 effectively zero samples, to catch unexpected silence.
- Output timestamp continuity versus the preceding callback's frame count.
- Callback completion versus Core Audio's output host-time deadline and the hardware callback period.
- Device processor-overload, nominal-rate-change and hardware-buffer-change notifications. These notifications are device-wide, not a process-specific xrun counter.

All three property listeners must register successfully. DSP and audit time are measured separately. Probe-inclusive deadline counts are checked against the raw callbacks after the run. The callback probe performs no allocation, file I/O or logging inside the audio callback; it writes fixed records to a preallocated, prefaulted shared mapping. Reading/analysis runs outside the audio thread.

The detector is validated before each run: a clean pilot must be visible with no residual/silence events, an injected 80 ms mute must produce silence and boundary events, and two injected phase jumps must produce discontinuities. Those injected faults, calibration and phase settling are excluded from the reported stress results.

This observes the software buffers delivered to Core Audio and device notifications. It is **not an analogue loopback recording** and cannot prove every sample reached the DAC/speakers. Callback lateness or overload is a warning of scheduling trouble, rather than automatic proof of an audible dropout. A lost scope packet is not classified as an audio dropout.

## Matrix

- Two calibrated DSP load targets: approximately 30% and 60% of SC's audio callback budget. Each graph stays fixed throughout its three-condition comparison.
- Private-bus load nodes: 32 oscillators each, resonant low-pass filters and `tanh`, mixed onto unused audio bus 96. A fixed sixteen-channel modulation source remains on buses 32–47.
- Conditions: observation **stopped**, **128 widgets**, **128 widgets + cross-application focus switching**.
- Widgets: 96 px faces, 15 Hz, sixteen-channel audio feed repeated across 128 elements; no waveforms or canvas meters. A fixed 2250 × 1250 outer window, DPR 1, compact sixteen-column fixture layout.
- Three passes per condition per load, alternating forward/reverse condition order: **18 phases**, approximately 30 seconds each after 1.5 seconds settling. Widget updates continue while the shell is in the background; background throttling is disabled to retain the workload.
- Focus activations are confirmed using AppKit’s active-application state. Existing VS Code and the owned test Electron app are alternated; no SC IDE, Field Modelling or other tool is opened.
- Private server/OSC ports and user data. Device/rate/hardware buffer defaults are preserved. The quiet pilot is the only test signal sent to hardware outputs.

SC load percentages describe time spent processing each hardware callback. Headline Electron CPU includes main, renderers and helpers, including GPU-helper **CPU**; **100% = one core**. Those two percentages use different denominators and should not be directly added. GPU execution is not measured.

The interrupted earlier run is [preserved separately](../test/signal-bench/dropout/results/interrupted-concurrent/README.md) and excluded from all results below because another agent was also testing. The user confirmed all clear before this fresh run; the process inventory showed no other active benchmark. The existing live SC server remained running.

## Results

The fresh run completed **18 measurement phases**, approximately **9.0 minutes** sampled, **50,703 output callbacks** and **257 confirmed app-focus transitions**.

Three 30-second samples per row. The graph stays fixed within each load tier. Counts refer to the sampled intervals only:

| DSP target | GUI condition | Mean SC load | Max sampled SC peak | Output timestamp gaps | Signal-break callbacks | Silent callbacks | Device overload notifications |
|---|---|---:|---:|---:|---:|---:|---:|
| ~30% | Observation stopped | 32.54% | 40.26% | 0 | 0 | 0 | 0 |
| ~30% | 128 widgets | 30.87% | 40.98% | 0 | 0 | 0 | 0 |
| ~30% | 128 widgets + focus switching | 29.22% | 48.17% | 0 | 0 | 0 | 0 |
| ~60% | Observation stopped | 65.66% | 88.69% | 0 | 0 | 0 | 0 |
| ~60% | 128 widgets | 64.68% | 91.49% | 0 | 0 | 0 | 0 |
| ~60% | 128 widgets + focus switching | 74.64% | 113.02% | 427 | 437 | 430 | 449 |

These event columns can refer to the same interruption and must not be added together as a count of distinct audible dropouts. A signal-break count is the number of callbacks exceeding the calibrated recurrence threshold.

### CPU, timing and repeat ranges

| DSP target | GUI condition | Total Electron CPU | SC mean-load range across passes | Longest DSP callback |
|---|---|---:|---:|---:|
| ~30% | Observation stopped | 0.77% | 31.79–32.99% | 4.301 ms |
| ~30% | 128 widgets | 26.23% | 30.60–31.10% | 4.374 ms |
| ~30% | 128 widgets + focus switching | 27.62% | 29.01–29.34% | 5.150 ms |
| ~60% | Observation stopped | 0.65% | 65.25–66.07% | 9.467 ms |
| ~60% | 128 widgets | 23.78% | 64.46–64.87% | 9.770 ms |
| ~60% | 128 widgets + focus switching | 27.17% | 73.25–75.42% | 12.058 ms |

SC mean-load changes versus observation stopped, paired within each pass (percentage points):

| DSP target | 128 widgets | Widgets + focus switching |
|---|---:|---:|
| ~30% | -1.68 (-1.95…-1.19) | -3.33 (-3.98…-2.45) |
| ~60% | -0.98 (-1.20…-0.79) | +8.98 (+8.00…+9.75) |

Probe-inclusive counts: **0** callbacks completed after their output host timestamp, **105** exceeded their hardware callback period. Nominal-rate changes: **0**; hardware-buffer changes: **0**.

Actual widget cadence ranged **14.96–15.01 Hz**. Native audit work averaged **2.08–4.01 μs per callback** across phases (worst individual callback: **46.77 μs**). Its average cost is approximately **0.019–0.038%** of the 10.667 ms hardware callback budget.

The detected settings were **48,000 Hz, 512-frame hardware buffer (10.667 ms), and 64-sample SC DSP blocks**. They were not imposed by the test. The two calibrated graphs had 20 and 52 load nodes. Hardware: **Intel(R) Core(TM) i7-8700B CPU @ 3.20GHz**; Electron **44.4.1**.

In this fresh run, detector validation saw **8 silent callbacks / 2 boundary-break callbacks** during the injected mute, and **2 break callbacks** during the two injected phase jumps. The initial clean pilot had **0** break/silence events, with maximum recurrence residual **9.26e-10**, compared with the **1e−5** event threshold.

## Focus automation control

The first matrix launches a short-lived AppKit helper for each activation, which could confound focus changes with process-startup work. A separate **six-phase control** fixes the same 52-node graph, keeps the 128 widgets at 15 Hz, and alternates condition order across two 30-second passes. It compares a persistent helper activating the already-focused Scope, that helper switching Scope ↔ existing VS Code, and freshly launched helpers activating Scope without changing applications. The persistent helper is started before sampling. Its CPU is reported separately from Electron. All requested activations are confirmed.

| Condition | Mean SC load | Max sampled SC peak | Timestamp gaps | Signal-break callbacks | Silent callbacks | Device overload notifications |
|---|---:|---:|---:|---:|---:|---:|
| Persistent helper, keep Scope focused | 63.76% | 87.67% | 0 | 0 | 0 | 0 |
| Persistent helper, actual app switching | 75.28% | 112.32% | 288 | 293 | 291 | 301 |
| Fresh helpers, keep Scope focused | 63.71% | 91.62% | 0 | 0 | 0 | 0 |

Actual switching requested 98 confirmed activations across the two passes. Control conditions use the same approximate half-second request cadence; focus switching also includes window foreground/background changes. Per-pass timings and CPU roles are in the raw report. The no-op controls do not reproduce foreground/background transitions.

[Control raw phases](../test/signal-bench/dropout/results/2026-10-03-focus-control/full.json), [control summary](../test/signal-bench/dropout/results/2026-10-03-focus-control/summary.json), [control callback records](../test/signal-bench/dropout/results/2026-10-03-focus-control/callback-audit.bin.gz), [control log](../test/signal-bench/dropout/results/2026-10-03-focus-control/full.log), [control verification](../test/signal-bench/dropout/results/2026-10-03-focus-control/verification.json).

## Interpretation

**Steady 128-widget updates were clean at both tested DSP loads. Actual cross-application focus changes were clean at the lower load, but repeatedly broke the output at the heavier load. Headless operation alone is not a guarantee against this failure.**

The persistent-helper control reproduced the focus failures in both passes. Both keep-Scope-focused controls were clean, including repeated helper process launches. That rules out helper startup as the sole explanation under these conditions. The main matrix had three failing heavy-load focus passes, and the control adds two independent repeats with a different automation method.

This is evidence of a focus-related timing failure in this system configuration at a graph that averages roughly 64–66% SC load while steady. It does not isolate widget painting as the cause: actual switching also changes application foreground status and OS/browser behavior, and the other foreground application has its own workload. Scheduling/performance policy, driver/device contention and foreground/background behavior are candidate causes, not measured diagnoses. No per-core placement or thread scheduling trace was captured. The user's existing audio server remained active on the same interface; this is not an exclusive-device laboratory test.

The high-load focus phases exceeded the 10.667 ms hardware callback budget and produced timestamp gaps, unexpected silence and device overload notifications. Therefore averages alone overstate available safety margin. Keep more DSP headroom on this setup until the focus behavior is resolved; a normal-load clean run is encouraging but does not establish a universally safe load threshold. The widgets continued near 15 Hz while the audio failed, so smooth UI updates would not reveal the problem.

The reported SC IDE-specific problem remains separate: this test alternated the headless shell and VS Code without bringing the IDE or Bitwig to the foreground. It has not reproduced that original IDE transition or established that the IDE is its cause. The earlier interrupted concurrent run stays excluded.

This is a finite synthetic test with observed hardware settings and background machine activity, not a guarantee at arbitrary DSP loads, smaller hardware buffers, plugin graphs, memory pressure or driver conditions. The independently tested signal is simple, even though the private DSP graph is deliberately loaded. A live production graph can introduce other real-time risks. GUI work remains outside SC's audio thread in normal operation; this audit adds a small, measured test-only callback cost.

## Evidence and reproduction

[Raw phase report](../test/signal-bench/dropout/results/2026-10-03/full.json), [summary and paired load differences](../test/signal-bench/dropout/results/2026-10-03/summary.json), [compressed raw callback records](../test/signal-bench/dropout/results/2026-10-03/callback-audit.bin.gz), [full log](../test/signal-bench/dropout/results/2026-10-03/full.log), [detector validation in the full run](../test/signal-bench/dropout/results/2026-10-03/full.json), [final verification](../test/signal-bench/dropout/results/2026-10-03/verification.json).

The raw binary starts with a 4096-byte header, including magic, published record count, column count/capacity, device and listener statuses. Each record contains twenty little-endian doubles in the order defined by `audit.mjs`. Each archived phase records its exact native sequence range; duration and DSP sums are verified against those raw callback records.

Run the `prepare.sh` helper from this test directory to build the local probe and temporary server copy, then use the printed benchmark command (redirect its log to `/private/tmp/awb-dropout-isolated.log`). Preparation only changes files under `/private/tmp`; the installed SC binary remains unchanged. The helper requires clang++, swiftc, codesign, macOS Core Audio headers, the installed SC application and an already-running VS Code. The full matrix takes approximately ten minutes. Add `--smoke` for the detector check and three short conditions. After the full run, `analyse.py` archives and verifies the evidence.

Capture/node/group cleanup is checked before the owned server exits. Final verification checks that the owned server and persistent helper are absent, all sixteen protected production hashes still match, every recorded focus transition succeeded and the temporary SC code sections match the installed executable. No production audio route or application GUI implementation is changed by this task.

Vault MCP and Telegram tools were unavailable; no external update or notification was sent.

To reproduce the additional control, use a fresh `.audit`/`.json`/`.log` prefix and add:

```sh
--targets=60 --load-nodes=52 --repeats=2 \
--conditions=focus-noop,focus,spawn-noop --persistent-focus
```

Pass that same prefix to `analyse.py`. It verifies exact callback ranges, recomputes event counts from native records, checks cleanup and source hashes, and archives the separate control. The fixed node count reproduces this graph; its observed percentage may vary on another machine or run.

## Follow-up with the IDE and its server closed

The [headless-only rerun](scope-headless-dropouts-ide-closed.md) repeats all 18 phases with exactly the benchmark-owned SC processes present at each boundary. With the IDE and its server closed, the previously observed output silence and signal-break events did not reproduce. Heavy-load app switching still recorded 57 timestamp gaps and 111 buffer-budget overruns; dropout-free operation is not established. The user confirmed the system default is 48 kHz.
