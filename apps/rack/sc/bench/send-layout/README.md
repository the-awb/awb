# Persistent channel send layout comparison — 6 October 2026

Separate Synths cost more when every send node stays running. They can save DSP in
sparse mixes if unused nodes are explicitly paused. Gain zero alone does not
provide this saving. Keep the existing routing and per-voice wrappers for now;
an optional active-send policy needs a fade/resume design before production use.
The loaded follow-up below does not establish a stable universal crossover.

## Results

Mean SC average CPU across two passes, with the entire order reversed in pass 2.
Eight persistent stereo channels in every case. These are percentages of the
SC audio callback budget, **not** whole-machine/core utilisation or power.

| Stereo sends per channel | Current strip, all active | Separate sends, all active | Extra points | Current strip, all moving | Separate sends, all moving |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 0.89% | 1.14% | +0.25 | 0.86% | 1.20% |
| 16 | 1.30% | 1.78% | +0.48 | 1.42% | 2.03% |
| 24 | 1.75% | 2.65% | +0.89 | 1.88% | 2.78% |
| 32 | 2.20% | 3.17% | +0.97 | 2.46% | 3.52% |

Every paired difference in the 64-phase main run favours the current strip,
including zero and sparse gains. At 24 sends, zero gains still cost 1.68% for the
strip and 2.52% for separate sends. At 24 sends there are 19 Synths/969 UGens in
the current fixture, versus 211 Synths/1,337 UGens in the split fixture. These
counts include the common sources, master, mute node and diagnostic consumer.
Separate routing adds one stereo bus read and per-node processing/control work
per send; the current strip shares its source read and fader across outputs.
This experiment does not establish ddwMixer's author's reasons for its design.

A separate, paired 12-phase run at **24 sends** explicitly suspends send Synths
whose initial gain is zero. Allocations are retained, so total Synth/UGen counts
still include the paused nodes.

| Active sends per channel | Current strip | Separate sends, unused paused | Difference |
| ---: | ---: | ---: | ---: |
| 24 | 1.80% | 2.64% | +0.84 points |
| 4 | 1.66% | 1.12% | −0.54 points |
| 0 | 1.66% | 0.79% | −0.87 points |

Both sparse-repeat differences favour suspension (−0.63/−0.45 points).
Both full-repeat differences favour the current strip (+0.93/+0.74 points).
Suspension is a different operating policy, rather than a cheaper arrangement
of identical active DSP. The fixture suspends immediately: fade-to-zero,
resume timing, state restoration and switching/onset behaviour are not tested.
It is not a production pause-at-zero implementation.

## Matching and measurement

`definitions.scd` opens the actual `AWBSendRackTool` and either retains its
production channel SynthDef or replaces each channel with a common level/mute/
solo head plus independent send Synths. Both use the same sources, stereo buses,
20ms Lag, gains, eight channels, slot configuration and downstream readers. No FX
processors or followers are installed. The full/packed voice wrappers are not
changed or benchmarked.

The offline render compares every destination and post-fader bus for full, zero,
sparse, moving, fader/mute/solo and closure states at 8/16/24/32 sends. All **24
windows pass** for continuously running routes, and another **24 pass** with
pause-at-zero enabled. Largest corresponding sample difference is below 1e-6;
undeclared outputs must stay below 1e-8. Paused checks compare settled windows,
not transient equality when a node is suspended or resumed.

Live hardware: Macmini8,1, Intel i7-8700B 3.20GHz, 6 cores/12 threads, 32GiB;
MOTU 1248; **44.1kHz, 64-sample SC blocks, confirmed 512-frame driver callbacks**;
4 configured SC output channels, 0 input channels; output muted; 256MiB SC pool.
Both variants use the same installed **SC 3.12.2** executable and stock plugins.
This does not verify the newly reported patched scsynth or its query commands.

Each graph settles for 3 seconds, then captures 30 readings over 6 seconds.
SC status updates roughly every 0.7 seconds, so the 0.2-second readings include
cached values and are not independent samples. There are only two repeats per
case. No statistical significance estimate or dropout claim is made.

Moving gains update at 15Hz. Each update changes all gains in **one OSC bundle**:
8 full-vector `n_setn` messages for the current layout, versus 8×send-count
individual `n_set` messages for the split layout. Both send the same number of
gain values. Automation therefore includes different server message-processing
costs as well as DSP. Static cases send no continuous changes. This is not the
Shell/GUI/bridge workload, and sclang's process CPU is not included in SC's CPU
figure. There are no graphics, input signals, heavy instruments or actual FX.
Peak status values are retained in the JSON; they are not callback traces.

## Evidence and export failure

[comparison-20261006.json](comparison-20261006.json) contains every paired case
and repeat difference. Compact original logs, metadata, source hashes, source
snapshots and results are under `evidence-20261006/`.

All 64 main-run measurement phases completed, but its final nested JSON export
failed (`Primitive '_ArrayAdd' failed. Wrong type.`): SC Strings also report
`isArray`, and the exporter tested that branch before `isString`. Every phase
mean/peak/node count was printed before the failure and recovered from the log.
**The main runner remains recorded as failed**; its individual status rows were
lost. `recovered-aggregates.json` records this limitation explicitly. Protected
source hashes were checked unchanged before repairing the exporter.

The corrected exporter checks Strings first and checkpoints each completed
phase to JSONL. The supplementary live run passes end to end and retains all raw
status rows. The final paused offline equivalence run also passes. Both owned
hardware servers exited, and the final process check found no scsynth/supernova
or Bitwig process. No production classes or live class installation changed.

Raw scores/audio and isolated framework copies remain in:

- `/private/tmp/awb-send-layout-live-20261006` (main, recovered aggregates)
- `/private/tmp/awb-send-layout-paused-20261006` (supplement, full raw rows)
- `/private/tmp/awb-send-layout-paused-audio-20261006` (paused equivalence)

## Reproduce

From `/Users/willy/awb`:

```sh
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py --pause-zero
# Requires an agreed quiet hardware window; refuses existing audio engines/Bitwig.
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py --live --quiet-window
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py --live --quiet-window --pause-zero
```

Use `--output` with a fresh directory and `--engine` for an explicit executable.
The runner copies an isolated class library, hashes inputs and engine, uses an
owned process group and bounded timeout, and leaves existing audio engines alone.
Offline runs require no hardware boot. Live runs boot a muted MOTU server at the
settings above; they are not dropout tests and do not restore arbitrary previous
device configurations. Telegram/Vault connectors were unavailable in this run.

## Crossover and loaded follow-up

The light-load crossover is approximately **13 inactive destinations out of 24**
(11 active) or **17 out of 32** (15 active). The next denser tested configuration
favours the shared strip in both repeats. These small margins are conditional on
the eight-channel fixture and require real suspension, not just gain zero.

| Destinations | Active | Inactive | Shared strip | Paused individual sends | Difference |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 24 | 9 | 15 | 1.69% | 1.50% | −0.19 points |
| 24 | 11 | 13 | 1.72% | 1.65% | −0.07 points |
| 24 | 12 | 12 | 1.54% | 1.68% | +0.14 points |
| 32 | 14 | 18 | 2.13% | 2.07% | −0.06 points |
| 32 | 15 | 17 | 2.12% | 2.05% | −0.08 points |
| 32 | 16 | 16 | 2.07% | 2.23% | +0.16 points |

Each row compares matched layouts in its own two-pass run. Rows span separate
runs and 6/8-second sample windows; absolute means across rows should not be
interpreted as a clean per-send cost curve. Both threshold-repeat differences
favour suspension: −0.044/−0.103 points at 11/24 active, −0.097/−0.057 at 15/32.
A threshold is an approximate observed crossover, not a general performance rule.

A first loaded pass adds **48 persistent synthetic stress nodes** (the previous
32×SinOsc→RLPF→tanh workload per node) on a private bus. Background-only SC load is
55.02%, with total routing test load around 57–59%. Ten-second measurement windows
and reversed order produce 32 phases. Near-boundary results differ from the
light test and some repeat signs disagree. For example, 13/32 active shows
−1.039/+0.276 points. Fully active strips win both repeats at both destination
counts. This pass does not establish a reliable loaded crossover.

The stronger follow-up uses **60 persistent stress nodes**, four retained racks
(24/32 × shared/split), 60 seconds of warmup, atomic root-group switches and
**ABBA then BAAB** for each case, with the case order also reversed. Inactive rack
roots are paused; zero-gain routes within the active split rack are paused.
The two balanced blocks provide four six-second measurement phases per layout
and case: 80 phases total. Background-only load is 67.14%, total means around
68–70%. All source/reader operations remain structurally matched across layouts;
each retained rack has its own source oscillators, paused with its root. This
is a static routing comparison, not an identical continuous audio stream being
switched between processors. It also retains more paused allocations than the
single-rack run, so compare layouts within each run.

| Destinations | Active | Shared strip | Paused individual sends | Difference | Block differences |
| ---: | ---: | ---: | ---: | ---: | --- |
| 24 | 0 | 68.81% | 68.31% | −0.50 | −0.25 / −0.75 |
| 24 | 4 | 68.32% | 68.68% | +0.36 | −0.03 / +0.75 |
| 24 | 8 | 69.11% | 68.68% | −0.43 | −0.42 / −0.43 |
| 24 | 11 | 68.44% | 68.78% | +0.33 | +0.44 / +0.22 |
| 24 | 24 | 69.17% | 69.78% | +0.61 | +0.68 / +0.53 |
| 32 | 0 | 68.38% | 68.64% | +0.27 | −0.18 / +0.71 |
| 32 | 4 | 69.29% | 68.80% | −0.49 | +0.03 / −1.01 |
| 32 | 12 | 68.60% | 68.83% | +0.23 | +0.22 / +0.23 |
| 32 | 15 | 68.79% | 69.00% | +0.21 | +0.06 / +0.35 |
| 32 | 32 | 69.37% | 70.21% | +0.84 | +1.27 / +0.41 |

**There is no defensible single loaded breakpoint in these results.** The
previously favourable 11/24 and 15/32 cases now favour the shared strip in both
blocks, but sparse rows are non-monotonic and several block signs flip. Even the
32-slot all-paused case flips direction. Balanced ordering reduces one form of
drift; it does not identify whether the remaining variation comes from scheduling,
power/frequency behaviour, cache effects or other background work. None of those
causes has been traced here. Further repetition or thread-time/trace evidence is
needed to distinguish a real crossover shift from elapsed-callback variance.

The robust result is that **fully active shared strips are cheaper in every
light and loaded paired block tested**. Sparse suspension can help, but the light
threshold should not be used to choose a layout dynamically in a heavily loaded
live set. No production routing choice or pause-at-zero policy is implemented.

Three of the 80 heavier phases contain a sampled SC peak over 100%:
32/full/split 100.67%, 32/full/shared 102.48%, and 32/4-active/shared 101.78%.
These are phase maxima of cached status readings, not three distinct overruns or
three audio faults. Output is muted and there is no physical return capture.
The average difference alone cannot establish live dropout reliability.

All four follow-up runners pass, including their 24-window paused offline checks;
source/engine hashes are retained. The loaded in-place fixture is not independently
NRT-rendered as a switched graph. The standard routing and settled suspension
checks remain the functional evidence. Follow-up totals: **156 measurement phases**
(32 bracket, 12 refine, 32 moderate load, 80 heavier balanced load). Together with
the original 76 phases, 232 phase measurements have been retained; the original
64 main-run rows remain aggregate-only because of the export failure above.

See [crossover-20261006.json](crossover-20261006.json) and
`evidence-20261006/crossover-*` for per-block means/peaks, raw rows, checks and
source snapshots. The owned servers exited and final process inventory is clear.

```sh
# Quiet live window required. Declared zero sends are suspended.
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py --live --quiet-window --pause-zero --cases 24:9,24:11,32:15 --measure-seconds 8
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py --live --quiet-window --pause-zero --cases 24:9,24:11,24:13,24:24,32:13,32:15,32:17,32:32 --load-nodes 48 --measure-seconds 10
/usr/bin/python3 apps/rack/sc/bench/send-layout/run.py --live --quiet-window --pause-zero --cases 24:0,24:4,24:8,24:11,24:24,32:0,32:4,32:12,32:15,32:32 --load-nodes 60 --in-place --measure-seconds 6
```

A zero-gain pause policy would need to distinguish declared inactive routes from
modulated gains that happen to pass through zero. Resume before a gain ramp,
suspend after the fade, and retain FX processing for tails. Those are future
implementation constraints, not behaviours validated by this static fixture.
