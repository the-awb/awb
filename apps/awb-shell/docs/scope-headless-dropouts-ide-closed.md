# Headless SC with the IDE and its server closed — 2026-10-03

## Result

**No signal breaks or unexpected silence were detected in the output samples. Timing gaps/overruns and overload notifications remained.**

This rerun addresses the extra IDE/server in the [previous comparison](scope-headless-dropouts.md). The benchmark host was already headless in that run, but another SC instance was active on the interface. The user closed the IDE before this rerun. No SC processes were present at preflight; all twenty recorded inventory checks (before the matrix, before each phase and after it) contain exactly the benchmark-owned headless `sclang` and `scsynth`. These checks are boundary snapshots rather than continuous process tracing.

## Method

The same two private DSP graphs are held at **20 and 52 load nodes**, with the same stock-UGen load, quiet 997/733 Hz pilot, 128 visible 96 px opacity widgets, sixteen source channels, 2250 × 1250 window and DPR 1. This holds the graph constant rather than retuning to an identical reported CPU percentage. The three conditions are observation stopped, steady widgets, and widgets while switching Scope ↔ existing VS Code. Each is sampled for 30 seconds in three passes, with forward/reverse/forward order. The persistent AppKit helper starts before sampling; a fresh process is not created for each activation. Background throttling remains disabled. No unrelated AWB tool is launched.

The device default is **48 kHz**: the user confirmed this is the correct system rate. The observed hardware buffer is **512 frames (10.667 ms)**; SC DSP blocks remain **64 samples**. No rate, interface or hardware-buffer setting is forced. The detector and code-matching temporary SC executable are unchanged from the previous comparison. SC alone among SC processes does not mean the whole computer or audio device is otherwise idle. Other existing applications remain running.

The audit checks the actual output buffers handed to Core Audio, timestamp continuity, callback duration and device notifications. It does not record analogue speaker/DAC output. Device overload notifications are device-wide. Detector validation checks a clean pilot plus injected mute/phase faults before sampling; these faults are excluded from the matrix. The audit averages 2.36–4.53 microseconds per callback across phases. Full detector/mmap details are in the previous report.

## Results

Three 30-second passes per row. CPU percentages for Electron include helper/GPU-process CPU, exclude SC and the focus automation helper, and use 100% = one core. SC load percentages instead describe callback processing time; these percentages cannot be added.

| Load nodes | Condition | Mean SC load | Max sampled SC peak | Total Electron CPU | Timestamp gaps | Signal-break callbacks | Silent callbacks | Device overload notifications |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 20 | Observation stopped | 33.41% | 42.22% | 0.79% | 0 | 0 | 0 | 0 |
| 20 | 128 widgets at 15 Hz | 30.86% | 42.86% | 26.01% | 0 | 0 | 0 | 0 |
| 20 | 128 widgets + app switching | 29.63% | 51.48% | 27.47% | 0 | 0 | 0 | 0 |
| 52 | Observation stopped | 66.36% | 94.20% | 0.83% | 0 | 0 | 0 | 0 |
| 52 | 128 widgets at 15 Hz | 64.41% | 90.51% | 23.54% | 0 | 0 | 0 | 0 |
| 52 | 128 widgets + app switching | 74.80% | 120.06% | 26.65% | 57 | 0 | 0 | 57 |

| Load nodes | Condition | Longest DSP callback | Callbacks over buffer budget | Callbacks after output host timestamp |
|---:|---|---:|---:|---:|
| 20 | Observation stopped | 4.511 ms | 0 | 0 |
| 20 | 128 widgets at 15 Hz | 4.577 ms | 0 | 0 |
| 20 | 128 widgets + app switching | 5.499 ms | 0 | 0 |
| 52 | Observation stopped | 10.050 ms | 0 | 0 |
| 52 | 128 widgets at 15 Hz | 9.663 ms | 0 | 0 |
| 52 | 128 widgets + app switching | 12.821 ms | 111 | 133 |

Different event columns can describe the same interruption; do not sum them into a count of distinct audible dropouts.

## Matched heavier-graph comparison

The earlier persistent-helper control supplies the closest focus-method match. All rows below use the same 52-node graph and widgets. Runs occurred sequentially, so closing the IDE/server is not the only possible run-to-run change.

| Run / condition | Mean SC load | Longest DSP callback | Timestamp gaps | Signal-break callbacks | Device overload notifications | Sample time |
|---|---:|---:|---:|---:|---:|---:|
| IDE/server present, steady widgets (3 passes) | 64.68% | 9.770 ms | 0 | 0 | 0 | ~90 s |
| IDE/server present, persistent focus switching (2 passes) | 75.28% | 11.992 ms | 288 | 293 | 301 | ~60 s |
| IDE/server closed, steady widgets (3 passes) | 64.41% | 9.663 ms | 0 | 0 | 0 | ~90 s |
| IDE/server closed, persistent focus switching (3 passes) | 74.80% | 12.821 ms | 57 | 0 | 57 | ~90 s |

## Interpretation

With the IDE and its server closed, the previously observed output silence and signal-break events did not reproduce. That is a substantial improvement over the earlier persistent-helper focus control (293 break callbacks and 291 silent callbacks across two passes). However, timestamp gaps, buffer-budget overruns and device overload notifications remained: this does not establish dropout-free delivery to the hardware. Removing the IDE and removing its second server occurred together, so this test cannot attribute the improvement to the IDE GUI or separate server/device sharing. Sequential runs also retain ordinary background variation.

This test does not identify the responsible scheduling policy, driver, foreground/background behavior or GUI operation. Per-core placement and thread scheduling were not traced. Average CPU or continued 15 Hz widget movement cannot establish audio safety. The original SC IDE ↔ Bitwig transition was not tested.

## Verification and evidence

All 18 phases completed. Every requested app activation was confirmed; the detector caught the injected faults. Exact native callback ranges, DSP sums and event counts were checked against raw records. Capture/node/group cleanup passed and the owned server, language process and focus helper exited. All sixteen protected production files match their before/after hashes. Temporary SC executable code sections match installed SC. Benchmark instrumentation and documentation are the only changes from this rerun.

[Raw phases and process inventories](../test/signal-bench/dropout/results/2026-10-03-ide-closed/full.json), [summary and paired differences](../test/signal-bench/dropout/results/2026-10-03-ide-closed/summary.json), [compressed callback records](../test/signal-bench/dropout/results/2026-10-03-ide-closed/callback-audit.bin.gz), [full log](../test/signal-bench/dropout/results/2026-10-03-ide-closed/full.log), [verification](../test/signal-bench/dropout/results/2026-10-03-ide-closed/verification.json).

## Reproduction

Close the SC IDE and other SC hosts first. Prepare the probe as described in the previous report, then use a fresh evidence prefix with:

```sh
--dropout-bench --load-nodes=20,52 --persistent-focus --exclusive-sc
```

The exclusive-SC option aborts if a boundary inventory includes another SC process. Archive with:

```sh
python3 apps/awb-shell/test/signal-bench/dropout/analyse.py \
  /private/tmp/awb-dropout-ide-closed 2026-10-03-ide-closed
```

Vault MCP and Telegram tools were unavailable; no external update or notification was sent.
