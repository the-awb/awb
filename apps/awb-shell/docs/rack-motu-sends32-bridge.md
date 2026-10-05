# Corrected native rack test: eight channels, 32 sends — 5 October 2026

This corrects the requested topology: **eight instrument channels with 32 send destinations per channel**, including clean Mast. The earlier 32-channel/9-destination result remains a separate experiment in the [native bridge/Xcode report](rack-motu-native-bridge-and-xcode.md).

The corrected rack has 256 send controls, 32 return faders and eight channel faders: **296 moving controls, 312 mounted controls** including static mute/solo. Every destination has a pass processor and a return to the master. Five FX IDs and Mast stay fixed; the other 26 slots are reserved/dynamic IDs with active pass processors for this benchmark. No real Bitwig FX chains or followers are modelled.

Each instrument's 32 send controls occupy two columns of 16 at the existing compact control size. The original-size horizontal bottom faders wrap after 16: two rows of returns and one row of channel levels. All controls fit inside the actual scroll region, with the same 2250 × 1322 viewport and DPR 1 for SVG and Canvas2D. This wrapping is a disposable benchmark layout, not a production GUI change.

The same native ToolInstance/Tool/NodeManager integration, MOTU 1248 loopback, 48 kHz, 512 hardware frames, SC block size 64, 60 synthetic DSP stress nodes and positive detector checks apply. No scopes or SC audio-bus capture run; the real **SC rack data bridge** is the connection under test. All controls change every 32 ms; only painting is capped at 15 or 30 Hz and aligned to display refresh. SC-origin cases use the actual rack setters and require no echoed GUI commands.

There are 28 45-second captures: bridge off/on at idle and the four moving view/cap combinations, each in two orders (20 captures), then the four SC-origin combinations in two orders (eight captures). A separate six-second no-stress smoke validated the topology, server values, ownership, visible controls and returned audio before the measured matrix.

The current `setSend` implementation writes the entire channel gain vector to scsynth on every send change. Here each send update contains 32 gains, versus nine in the earlier wide-channel test. More sends and more channels therefore exercise different server-message payloads even at similar total control counts. This is source-verified behaviour, not a causal proof for every audio interruption.

CPU percentages are one-core equivalents. Electron includes GPU/utility/helper CPU; WindowServer, sclang, scsynth and the recorder are retained separately in the per-case evidence. SC load measures DSP elapsed time and cannot be added to those CPU percentages. Hardware GPU utilization, clocks and power are not measured.

## Correctness and delivery

| Direction / bridge | Moving control checks | Idle control checks |
|---|---:|---:|
| gui / off | 8/8 | 2/2 |
| gui / on | 0/8 | 2/2 |
| sc / on | 8/8 | not run |

A completed capture is not necessarily a successful controller. GUI-origin failures are retained as negative functional results; disarmed/incorrect bridge runs are excluded from successful live-cost comparisons. They show incomplete accepted revisions, mismatched final SC/server values and the error `SC rack Sync timed out; the bound ToolInstance may be closed.` ToolInstance ownership and source guards remained intact.

In the first SVG 15 Hz GUI-origin failure, 187,277 commands were sent and 171,498 accepted: a deficit of 15,779. The global UDP full-socket-buffer-drop counter increased by 15,781. This near agreement again strongly supports receiver overflow, but these are global counters, not a direct attribution to an individual socket. The workload makes 416,472 requested changes per run (296 × 1,407 batches), about 9,250 control messages/s before any bridge disarming. This is continuous full-matrix automation, not an ordinary single-control drag.

## Cost when control checks pass

The retained captures passed the control/server checks; that does not imply clean audio. Means of the two passes. Separate pass counts retain returned-audio variability. The SC-origin 30 Hz entries show actual achieved paints rather than assuming a 30 Hz cap delivers 30 paints/s.

| Direction / bridge | View/cap | Actual paint Hz | Electron CPU | sclang CPU | SC load | Bad return callbacks (pass 1 / 2) |
|---|---|---:|---:|---:|---:|---:|
| gui / off | idle | 0.00 | 1.9% | 0.1% | 75.1% | 0 / 0 |
| gui / off | svg-15 | 15.00 | 49.4% | 0.1% | 74.9% | 6 / 0 |
| gui / off | svg-30 | 29.99 | 86.9% | 0.1% | 75.9% | 9 / 1 |
| gui / off | canvas2d-15 | 15.00 | 32.2% | 0.1% | 75.2% | 0 / 0 |
| gui / off | canvas2d-30 | 30.00 | 44.7% | 0.1% | 75.3% | 9 / 5 |
| sc / on | svg-15 | 15.00 | 53.7% | 25.8% | 77.5% | 18 / 8 |
| sc / on | svg-30 | 17.55 | 59.8% | 26.2% | 78.0% | 7 / 20 |
| sc / on | canvas2d-15 | 15.00 | 34.7% | 25.7% | 77.2% | 9 / 7 |
| sc / on | canvas2d-30 | 17.15 | 34.9% | 25.3% | 75.7% | 0 / 106 |

Only one of the eight SC-origin captures was fully audio-clean. In the noisy second Canvas2D 30 Hz capture, mediaanalysisd used 62.85% of one core and mds_stores 24.98% over the surrounding 47.16-second marker interval; the clean first pass had mediaanalysisd at 2.23% and mds_stores 24.32%. These are surrounding-interval CPU counters, not causal measurements. They substantially limit attributing the audio outcome to the renderer or routing graph alone.

The reliable returned-pilot recording measures delivery under the synthetic near-limit DSP load; it does not validate the sound of real FX chains. A clean 45-second pass is finite evidence, not a safe-load guarantee. Audio failures and transport failures remain separate. No production transport optimization, hardware-priority change or graphics worker was added during this matrix.

The correction matters: total control count alone does not describe either the graph or its message cost. Keep dense automation in SC while fixing bounded GUI-to-SC transport batching/coalescing, recovery under congestion, and repeated full gain-vector writes. Repeat the corrected profile after those changes before treating it as a working dense GUI-driven bridge.

## Evidence and reproduction

- [All corrected per-case metrics, source guards and raw-report hashes](../test/signal-bench/dropout/results/2026-10-05-sends32/native-summary.json)
- [Cleanup, detector and hardware restoration verification](../test/signal-bench/dropout/results/2026-10-05-sends32/completion-verification.json)
- [Native benchmark runner](../test/signal-bench/dropout/native-run.mjs)

Raw samples, screenshots, generated fixtures and reports remain in `/private/tmp/awb-native-sends32-adf3f93-20261005`. The source/hash snapshots distinguish this corrected fixture from the previous capture. These scratch paths are not durable backups; curated results and historical analysis scripts are committed. The underlying application implementation remains unchanged from `adf3f93`; this follow-up adds benchmark profiles/layout only.

Use the single-case command in the [earlier report](rack-motu-native-bridge-and-xcode.md), replacing `AWB_NATIVE_RACK_SIZE=32` with `AWB_NATIVE_RACK_SIZE=sends32`, and use a fresh output/audit/input prefix. `AWB_NATIVE_MAST=include` is the tested setting (32 total destinations). The optional `extra` setting creates 32 FX destinations plus Mast, 33 total; it is not measured here. Set `AWB_NATIVE_DIRECTION=gui|sc` and `AWB_NATIVE_BRIDGE=off|on` as appropriate. Audio still requires `--run --quiet-window`; default execution prepares a disposable fixture only.

All 28 recorder captures were reliable. Current read-back verified all 36 source guard entries; every control fit the scroll region, NodeManager tracked each instance, all moving phases had zero React app/rack/control renders, and all SC-origin cases sent zero echoed commands. Two Node syntax checks and 6/6 phase-alignment tests passed. None of the 261 captured owned process IDs remained alive; independent MOTU read-back confirmed restoration to 44.1 kHz.

Telegram notification was unavailable in this session; no external notification was sent.

## Transport-only batching follow-up — 5 October 2026

The outgoing batching and shutdown EPIPE fix are committed as `6a9bc49` on
`integration/bw-sc`. At Willy's request this follow-up leaves Bitwig running and
makes no CPU/audio-performance claim. It starts private sclang instances with
the actual ToolInstance/Tool/NodeManager and the same eight-channel/32-send rack,
including all 32 pass processors. Audio dispatch is stubbed: the outgoing SC
server commands are captured and checked, and no scsynth server is booted. No
MOTU sample-rate, buffer, routing or Bitwig state is changed.

The previous runtime at `fba7843` and the batched runtime each run twice for
45 seconds, with order reversed. The same 296 controls change every 32 ms:
416,472 requested changes per run. WebSocket input, Node's 16 ms coalescing,
OSC transport, SC revision fences and bidirectional feedback are real. Graphics
are absent. Final SC commanded values and the stubbed server gain/level writes
must match all 296 targets; accepted revisions must equal transmitted commands.

| Runtime | Control passes | Sent and accepted commands, both runs | UDP packets, both runs | Missing commands | UDP buffer drops |
|---|---:|---:|---:|---:|---:|
| Previous | 2/2 | 682,443 | 682,443 | 0 | 0 |
| Batched | 2/2 | 826,834 | 55,860 | 0 | 0 |

The batched runs accepted 412,853 and 413,981
commands in 27,893 and 27,967 packets respectively:
**93.24% fewer packets per retained command** than one-message packets.
Both had zero bridge failures, disarming, sync errors or final-value mismatches.
All batched control packets were bounded at 1,200 bytes. The queue preserves
retained commands; it does not promise to send every calculated intermediate
value. Across the two runs it retained 21.2% more intermediate commands
than the previous runtime; these counts are transport observations on a busy
machine, not a controlled CPU/latency comparison.

The previous runtime also passed in this audio-free environment. The original
combined DSP/graphics receiver failure therefore was **not reproduced**, and
these results do not establish that batching fixes it at that earlier limit.
They establish correct sustained batching at the requested message workload,
with substantially fewer packets. A quiet-window repeat with the original
hardware DSP load remains the test for the earlier capacity failure. SC's
repeated full gain-vector writes and transition step scheduling remain unchanged.

All four sclang instances exited cleanly. All 27 protected implementation/class
source hashes remained unchanged during capture. The committed [transport
summary](../test/signal-bench/dropout/results/2026-10-05-sends32-batching/transport-summary.json)
retains endpoint snapshots, command/packet counts, revision accounting and source
provenance; its analysis folder retains the historical runner. Raw logs and
private fixtures remain in `/private/tmp/awb-transport-batching-6a9bc49-20261005`.

## Real DSP batching, origin filtering and rate/output follow-up — 5 October 2026

The corrected eight-channel/32-destination rack now passes **48/48 live control
checks**, with real sclang, scsynth, both GUI renderers, bidirectional SC feedback
and the MOTU loopback. The 40 moving captures accepted all **16,539,907 retained
commands**; the eight idle captures also passed. There were no final GUI/SC/server
value mismatches, bridge errors or disarmed captures. OSC used 1,118,631 packets
including idle/status traffic, approximately **93.2% fewer packets per retained
command** than individual-message transport. Coalescing intentionally discards
superseded intermediate values; these are not missing retained commands.

This establishes correctness for the combined corrected implementation at the
previous heavy-message workload. It does not isolate the contribution of
batching from origin filtering and recovery, or imply that audio is clean.

### What was corrected

SC no longer sends GUI-origin control values back to the originating watcher.
It still sends revision acknowledgement frames; other watchers and SC-originated
changes receive values. Node maintains its commanded SC state locally. Explicit
Sync still reads the complete SC state.

The first hardware attempt uncovered another bug: an automatic recovery snapshot
could overwrite a newer gesture while awaiting SC, despite every command arriving.
One negative SVG run had 296 extra GUI value changes and incorrect final targets.
Recovery now preserves controls edited during the pending snapshot and keeps
recalls running, including their browser active status. Explicit Sync retains its
full-read behavior. The corrected captures have exactly the requested store value
changes and zero React app/rack/control renders. **31/31 focused Rack tests** pass,
including private real-sclang origin tests and the delayed-recovery regression.
The user's installed SC class configuration remains unchanged.

The ten original 48 kHz/ten-output captures precede the tiny recovery recall-status
fix; the subsequent 38 captures use the final runtime. No recall is exercised in
these workloads. Both source variants are retained in the evidence.

### Matched 60-node comparison

Every capture lasts 45 seconds; each condition has two passes. All eight instrument
channels and 32 destinations are present; 296 controls move every 32 ms, with
312 controls mounted. The viewport is 2250 × 1322 at DPR 1, fixed and visible.
The real rack uses pass processors plus synthetic DSP stress nodes, not the migrated
Bitwig FX chains. Hardware buffers remain 512 frames and SC blocks 64 frames.
The diagnostic pilot uses output channel 2 and returns on MOTU input channel 6.
Four outputs means **two stereo pairs**, with rack master on 0/1; ten outputs means
five pairs, with rack master on 8/9. Device routing was preserved.

The table counts return callbacks with residual faults, **not distinct audible
glitches**. Silent callback counts and exact callback events are retained separately.
Clean cases also have no silent callbacks, output timestamp gaps or DSP-budget
overruns.

| Rate / SC output channels | Idle faults, pass 1 / 2 | Canvas2D 15 Hz faults | SVG 30 Hz faults |
|---|---:|---:|---:|
| 48 kHz / 10 | 0 / 0 | 12 / 8 | 67 / 52 |
| 48 kHz / 4 | 0 / 0 | 26 / 9 | 43 / 46 |
| 44.1 kHz / 10 | 0 / 0 | 0 / 0 | 0 / 0 |
| 44.1 kHz / 4 | 0 / 0 | 0 / 0 | 0 / 1 |

The one four-output/44.1 kHz SVG fault had no observed output callback lateness,
timestamp gap or nominal-budget overrun. Its cause is unresolved; this isolated
return fault is different from the repeated output overruns in the noisier cases.

The full four-condition comparison at 48 kHz/ten outputs gives these means:

| Surface | Electron CPU | sclang CPU | SC load | Return residual callbacks, pass 1 / 2 |
|---|---:|---:|---:|---:|
| Canvas2D 15 Hz | 75.0% | 56.0% | 74.0% | 12 / 8 |
| Canvas2D 30 Hz | 89.2% | 58.5% | 77.0% | 60 / 21 |
| SVG 15 Hz | 97.2% | 57.9% | 76.4% | 27 / 10 |
| SVG 30 Hz | 141.4% | 63.2% | 81.1% | 67 / 52 |

Electron includes its main, renderer, GPU and utility processes. CPU percentages
are one-core equivalents. WindowServer, sclang, scsynth and the recorder are
retained separately; SC load is elapsed DSP time and is not additive with process
CPU. Hardware GPU utilization, power and clocks were not measured.

### Observed bands near the boundary

Local boundary tests use Canvas2D at 15 Hz and the same real bridge. A band describes
these two captures, not a guaranteed safe operating limit. Background activity can
move the boundary, as Willy explicitly expects. A consistently faulty band means
faults occurred in both repeats, not uninterrupted failure throughout the run.

| Rate / outputs | Zero faults in both repeats | Intermittent faults | Faults in both repeats |
|---|---|---|---|
| 48 kHz / 10 | 56 nodes | Not observed at the tested increments | 58 and 60 nodes |
| 48 kHz / 4 | 54 nodes | 56 nodes: 5 / 0 residual callbacks | 58 and 60 nodes |
| 44.1 kHz / 10 | 60 nodes | 62: 0 / 8; 64: 14 / 0 residual callbacks | 68 nodes: 39 / 20 |
| 44.1 kHz / 4 | 60 and 62 nodes | Not observed at the tested increments | 64 nodes: 193 / 4 |

Adjacent faulty return callbacks are also grouped in the JSON evidence. This is
only sequence adjacency, not a perceptual glitch count. For example, the marginal
48 kHz/four-output 56-node pair has two contiguous fault groups then zero; the
44.1 kHz/ten-output 62-node pair has zero then four. The 44.1 kHz/four-output
64-node pair has 50 groups then one, demonstrating substantial variation even
within the band where both repeats fail. The added 68-node ten-output pair has
22 then 13 groups.

**44.1 kHz gives useful headroom.** At 512 frames the nominal callback budget grows
from 10.67 ms to 11.61 ms, about 8.8%. Reducing outputs from ten to four gives no
consistent improvement across these comparisons. The differing clean boundaries
are not evidence that fewer outputs are inherently slower or faster.

The audio wall remains after reliable command transport. At 48 kHz/60 nodes,
both Canvas2D 15 Hz runs have output timestamp gaps and DSP callbacks exceeding
the hardware-period budget, while the generated pilot samples remain waveform
clean. The issue is therefore not confined to the return recording. Average
Canvas2D CPU savings remain real, but average CPU cannot establish deadline safety.
These runs use the existing callback audit without a new Instruments scheduler
trace; they do not identify the remaining scheduling/hardware mechanism.

Willy confirms no computer interaction. Background mediaanalysisd and mds_stores
remain active, potentially including work triggered by test files. Around one
58-node pair, mediaanalysisd CPU time changes from 11.81 seconds to 75.60 seconds
and mds_stores from 18.65 to 21.15 seconds. These snapshots cover the surrounding
capture/startup interval, not exactly the measured phase; they document variation,
not causation. System services were not suspended. The 38 rate/output captures
show zero global UDP full-socket-buffer-drop increments, while no-socket counters
increase around startup/teardown; global counters do not identify a specific socket.

### Evidence and reproduction

- [48 captures, control endpoints, callback events, CPU, background counters, source variants and report hashes](../test/signal-bench/dropout/results/2026-10-05-batched-dsp-rates/native-summary.json)
- [Hardware restoration, source verification and process cleanup](../test/signal-bench/dropout/results/2026-10-05-batched-dsp-rates/completion-verification.json)
- [Focused test log](../test/signal-bench/dropout/results/2026-10-05-batched-dsp-rates/rack-tests.log)

The evidence retains the negative recovery-race manifest and historical capture/
analysis drivers. Raw reports, samples and copied fixtures remain under
`/private/tmp/awb-native-batched-dsp-v3-20261005` and
`/private/tmp/awb-native-rate-output-boundaries-20261005`; scratch files are not
durable backups. The base commit is `ebb9374`; the tested origin/recovery and
rate/output harness changes remain working-tree changes, not a new commit.

Use the existing single-case command with `AWB_NATIVE_RACK_SIZE=sends32`,
`AWB_NATIVE_MAST=include`, `AWB_NATIVE_BRIDGE=on`, `AWB_NATIVE_DIRECTION=gui`,
`AWB_NATIVE_SAMPLE_RATE=44100|48000` and `AWB_NATIVE_OUTPUT_CHANNELS=4|10`.
Set the MOTU to the same nominal rate and wait for read-back before capture.
The producer and recorder verify observed rate/output count. For 44.1 kHz, rebuild
`input-record.cpp` with Xcode clang and CoreAudio/CoreFoundation frameworks; set
`AWB_INPUT_RECORDER` to that fresh binary. The older 48-kHz-only recorder was left
unchanged. Use fresh output/audit/input paths, `--trace-mode=off`,
`--run --quiet-window`, `--seconds=45`, and the selected `--load-nodes` and condition.

All 48 recordings were reliable; current source read-back verified 46 guard paths.
None of the 432 recorded owned process IDs remains alive. Independent MOTU
read-back confirms 44.1 kHz. SC's per-send full gain-vector writes and automation
step scheduling are unchanged. No Telegram tool was available, so no external
notification was sent.
