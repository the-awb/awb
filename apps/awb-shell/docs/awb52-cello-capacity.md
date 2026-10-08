# AWB 5.2 first-pass rack: real-cello capacity tests, 7 October 2026

The original serial implementation dropped out at every tested internal block size. A private benchmark variant using **two VSTPlugin DSP workers, internal block 128, FFT 4096, and the original IRs capped at 30 seconds** completed a five-minute baseline at **27.3% average / 53.8% peak**. It then completed **two further five-minute runs with more than 25 percentage points of live-calibrated extra DSP**, with no missed deadlines or physical-return faults. Hyperthreading remained enabled.

This establishes usable capacity for this workload. It does not validate the full live set, GUI, every possible modulation state, or 25% spare at every instantaneous peak. The second stress run peaked at 96.0%. Startup allocation remains capable of missing a deadline. The worker/FFT changes are confined to private benchmark copies; production sound and latency compensation still need validation before adoption.

For Supernova continuation, start with [the live comparison suite](#supernova-live-comparison-suite--agreed-scope-7-october-2026) and the combined qualification it cites. Earlier investigation context is in [the general assessment](#general-supernova-assessment-checked-7-october-2026) and [the repair candidates and resumption handoff](#supernova-repair-candidates-and-resumption-handoff). The latter records fix confidence, execution/memory clarification, preserved evidence and the next steps.

## Controlled results

Every row is 300 seconds of steady real-cello processing after preparation and 35 seconds of warmup. SC percentages are DSP callback wall time, not whole-machine CPU. Native deadline analysis also includes audit overhead. Return faults count discontinuous callbacks, not distinct audible episodes.

| Configuration | SC block | IR cap, s | FFT | VST workers | SC avg | SC peak | Native late / over-budget callbacks | Return fault callbacks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Original, repeat 1 | 256 | 30 | 2048 | 0 | 60.2% | 111.3% | 4 / 4 | 9 |
| Original | 64 | 30 | 2048 | 0 | 72.7% | 128.4% | 45 / 45 | 97 |
| Original | 128 | 30 | 2048 | 0 | 62.3% | 135.1% | 19 / 17 | 31 |
| Original, repeat 2 | 256 | 30 | 2048 | 0 | 57.9% | 136.1% | 3 / 3 | 8 |
| Original | 512 | 30 | 2048 | 0 | 54.4% | 150.2% | 204 / 222 | 460 |
| Short IRs | 256 | 10 | 2048 | 0 | 45.9% | 88.2% | 0 / 0 | 0 |
| Short IRs | 256 | 5 | 2048 | 0 | 39.7% | 68.6% | 0 / 0 | 0 |
| Plugin workers | 128 | 30 | 2048 | 2 | 41.1% | 91.5% | 0 / 0 | 0 |
| Workers + larger FFT | 128 | 30 | 4096 | 2 | 27.3% | 53.8% | 0 / 0 | 0 |
| Workers + FFT + extra DSP, run 1 | 128 | 30 | 4096 | 2 | 54.9% | 88.1% | 0 / 0 | 0 |
| Workers + FFT + extra DSP, run 2 | 128 | 30 | 4096 | 2 | 56.1% | 96.0% | 0 / 0 | 0 |

The serial 256 repeat differences are normal boundary variability; both failed. The additional earlier 512 run was also poor (55.1% average / 145.8% peak, 192 late / 195 over-budget / 478 return callbacks). Earlier concurrent-development runs are retained in the evidence index but excluded from controlled conclusions.

## MOTU256 comparison on scsynth

Two further five-minute captures on7October used the same protected sources as the earlier hardware512 baseline (all previously guarded file hashes matched before testing). The only workload-setting change for the initial baseline was hardware256, but that capture overlapped another agent's compilation and offline DSP tests and is excluded from clean capacity conclusions. Rate44.1kHz, SC128, FFT4096, two VST workers and original IRs capped30seconds were retained. The observed output callback and device buffer were256frames; neither rate nor buffer changed during the recorded native windows. The shared hardware reservation was held throughout both runs and the original512-frame buffer was restored afterward.

| Hardware frames | Workload | SC average | Sampled SC peak | Native late / over-budget callbacks | Return fault callbacks | Maximum recorded engine callback |
|---|---|---:|---:|---:|---:|---:|
|512|Earlier rack baseline|27.3%|53.8%|0 /0|0|6.255ms|
|512|Earlier calibrated reserve, run1|54.9%|88.1%|0 /0|0|10.244ms|
|512|Earlier calibrated reserve, run2|56.1%|96.0%|0 /0|0|11.153ms|
|256|Initial rack baseline, contaminated|29.4%|122.7%|21 /19|47|7.137ms|
|256|Calibrated reserve|52.1%|342.5%|at least114 /at least120|251|19.886ms|

**The loaded hardware256 workload failed the headroom requirement.** The initial rack-only capture also recorded delivery faults but was contaminated: its scored11:40:38–11:45:38UTC window overlapped documented Supernova compilation11:40:27–11:41:02 and C++/NRT tests11:42:21–11:43:12. The loaded scored11:50:45–11:55:47UTC window was after those jobs stopped. An unloaded repeat was cancelled by the user during preparation; no repeat result is counted. The loaded failure alone was sufficient for the decision to retain512. Each physical-return recorder covered the entire five-minute window with zero capture drops, recorder over-budget callbacks or timestamp frame gaps. Fault counts are callback counts, not distinct audible episodes. Native output-pilot residuals were zero in the recorded windows: the computed pilot remained continuous, while callback timing overruns and physical-return discontinuities showed delivery failure.

The reserve run accepted21stress nodes after live calibration measured rack29.715%, loaded54.986%, an increase of25.271percentage points. Four calibration trials were needed; one overshot to+31.691points. These preparation/calibration intervals are excluded from the scored run. The timed average was52.085%; calibration establishes the chosen extra load at that point, not a guaranteed continuous25-point increase throughout five minutes.

### Native audit coverage and probe overhead

The original logger has a100000-row capacity. It covered the baseline's full300.06-second native window. In the longer-prepared reserve test it reached capacity after294.14seconds of the timed window, leaving approximately six seconds without native callback records. Its114late/120over-budget counts are therefore **lower bounds**, not complete five-minute counts. The physical return remained fully recorded and independently failed251callbacks. This limitation prevents an exact full-window native comparison but does not reverse the failure conclusion. Before longer hardware256 tests, increase capacity in an isolated probe copy and make capture coverage an explicit acceptance gate.

Audit wall time averaged about2microseconds, but had outliers of4.36ms baseline and9.17ms loaded; elapsed time includes possible scheduling interruptions. The probe pushed one baseline callback and three loaded callbacks over the period when the wrapped engine alone had remained within it. The engine callback itself exceeded the period18times baseline and117times in the recorded loaded window. Retain both counts rather than assigning every probe-inclusive overrun to engine DSP.

### What the hardware buffer changes

[SC_CoreAudioDriver::Run](/Users/willy/supercollider/server/scsynth/SC_CoreAudio.cpp:1293) computes `numBufs = numSamplesPerCallback / world->mBufLength`, then runs the internal blocks sequentially within one callback. With SC128, hardware512 groups four internal blocks under approximately11.610ms; hardware256 groups two under approximately5.805ms. There is no separate hardware-delivery deadline after each128-sample block in this path. An expensive internal block can borrow time from cheaper blocks in its batch, provided the complete callback meets its deadline. The slack is bounded by the current hardware callback, not permission to fall progressively behind across callbacks.

For illustration only: internal block costs of1,1,6,1ms total9ms and fit an11.6ms four-block budget, while the pair6+1ms would exceed a5.8ms two-block budget. Individual internal-block durations were not measured in this experiment. Smaller buffers also increase callback frequency; this experiment does not isolate callback/handoff overhead or identify the exact source of each burst. The evidence is consistent with tighter callback timing being consequential even when average SC load is modest.

The baseline's largest allocation-stage callback was17.913ms; its steady maximum was7.137ms. The reserve test recorded17.001ms during source preparation and a larger19.886ms callback during normal timed processing. The large342.5% sampled peak corresponds closely to that recorded timed callback; it was not attributed to allocation. Before/after process snapshots include active Codex/WindowServer and other background processes, but are not a continuous trace capable of identifying the cause of the outlier. These are not tests on a perfectly isolated machine.

All13plugins passed before/after readbacks in each run, protected hashes were verified, no OSC server failures were reported and owned language/recorder/engine shutdowns completed. GUI/bridge traffic and actual additional instruments remain excluded. The input recorder delivered512-frame chunks while the audited output callback used256frames; recorder timing checks use its observed chunk size. Round-trip latency and dry/wet alignment were not measured. Hardware512 comparison rows are earlier same-day runs, not a fresh interleaved control.

Recommendation: retain MOTU512 for this first-pass rack. The experiment establishes failure at256 for the loaded workload, not a universal256-frame limitation of SC or the interface. Further work should reduce concentrated processing and validate the real GUI/instrument workload at512 before adopting a lower hardware buffer.

[Compact evidence and exact probe sources](awb52-cello-capacity-20261007/motu256/summary.json) retain the two results, hardware restoration record, calibration, callback timing, shortened event lists and SHA256 provenance. Raw audit/input captures remain under `/private/tmp/awb-motu256-session-20261007`.

## The hardware512 reserve check

Extra DSP consisted of serial nodes, each running 32 SinOsc → RLPF → tanh paths into a private unconsumed audio bus. It is a measurable reserve proxy, not a substitute for the actual instruments and GUI. Calibration occurs with the rack already running, using 45-second windows and the last 30 seconds of each window.

- Run 1: rack 28.0%; loaded 54.7%; added **26.75 percentage points**, 27 stress nodes. Timed average 54.85%, peak 88.14%; native maximum callback 10.244 ms. All 13 plugin readbacks passed before and after.
- Run 2: rack 28.7%; loaded 55.9%; added **27.17 percentage points**, 29 stress nodes. Timed average 56.09%, peak 95.97%; native maximum callback 11.153 ms. All 13 plugin readbacks passed before and after.
- Both: zero native late callbacks, zero over-budget callbacks, zero output-pilot discontinuities, zero returned-pilot discontinuities, zero recorder losses/gaps, no OSC server failures; protected source hashes verified and owned processes shut down.

The first idle-calibrated reserve experiment (5-second IRs, serial block 256) is **not a 25% pass**: it measured only 22.7 points on an isolated server and less when combined with the rack. It had one deadline and return fault. Idle and loaded measurements demonstrably differ, so the corrected harness calibrates against the live rack and rejects increments below 25 or above 30 points. The second corrected run briefly overshot to +35.1 points during calibration and missed two deadlines there; its subsequently accepted +27.17-point timed window was clean. Preparation/calibration is not counted as steady performance.

## Where the peaks occurred

The native hardware callback budget is 512 / 44100 = **11.610 ms**. Startup, warmup, calibration and timed processing are recorded as separate stages.

In the three final FFT4096 runs, the largest startup callback occurred in the stage **“all plugins ready / cello begin”**: 18.013, 17.162 and 18.264 ms respectively, with one missed deadline each. That stage reads the cello buffer and constructs its source/meter/output-clear nodes; this narrows the location but does not identify one operation as the cause. It is separate from convolution IR preparation and plugin opening. Preload buffers and prepare the graph before opening live audio.

Steady maxima were 6.255 ms without extra DSP, and 10.244 / 11.153 ms with the calibrated loads. These were normal processing peaks, not allocation. `stageCosts`, `heaviestCallbacks`, sampled peak timestamps and event records are retained in the compact JSON evidence.

Three complete-rack startups timed out across the whole session (including one excluded early attempt, a 10-second-IR attempt, and the first final reserve attempt). The engine stopped answering status requests before readiness; retries worked. They remain a startup reliability issue, not steady capacity measurements. Private per-plugin begin/end logging was added after the final stall; the two later launches opened all 13 successfully. Old FL Studio cache and Waves bridge UI warnings persisted even on successful readback-verified runs, so they do not establish the stall's cause.

## Why these changes helped

Shortening IRs reduced serial average load from roughly 58–60% to 46% at 10 seconds and 40% at 5 seconds. Moving plugins to two workers reduced the block128 / FFT2048 / original-IR average from 62.3% to 41.1%. Increasing the FFT to 4096 reduced it further to 27.3%. These are sequential experiments on the same rack, not isolated per-component CPU attribution.

Local SC source gives a concrete explanation for the surprising block512 result. [PartitionedConvolution.cpp](/Users/willy/supercollider/server/plugins/PartitionedConvolution.cpp:159) sets `spareblocks = (FFT / 2 / SCblock) - 1` and amortizes remaining partitions across those blocks. FFT2048 gives three spare blocks at SC256 but only one at SC512; FFT4096 gives fifteen at SC128. A larger SC block can lower average overhead while concentrating convolution work enough to miss deadlines. The measurements support this scheduling/critical-path explanation. They do **not** prove an OS-priority, thermal, hyperthreading or cache-contention cause; no Xcode trace has yet isolated those effects.

## Latency and deployment boundary

Installed VSTPlugin documentation says `multiThreading:true` introduces one internal block of delay: **128 samples, 2.90 ms**, per worker-processed plugin at these settings. Readbacks included 128 samples for many plugins, 193 for Scheps and 384 for Spiral. Serial chains and parallel dry/wet paths therefore differ in latency. This first pass does not yet compensate them as Bitwig does. The larger convolution FFT also needs an impulse/latency comparison before production adoption. These performance savings cannot be adopted blindly if phase/alignment matters.

Only the benchmark copies of AWBFirstPassSet and AWBSharedFXChain enable workers. The live source classes and saved spec are untouched. Plugin reblocking and FFT8192 options exist in the harness but were not measured. No claim is made that four workers, shorter block64, or Supernova is better.

## Exact workload and exclusions

- Intel Macmini8,1, i7-8700B: six physical cores / twelve logical threads, 32 GB. macOS 15.7.9; installed SC 3.12.2; VSTPlugin 0.6-pre1; MOTU1248.
- 44.1 kHz, fixed hardware buffer512, three SC input channels / four output channels, realtime pool262144 KiB. Internal block varies as shown.
- Thirteen real plugins, six allocated PartConv UGens, two persistent input channels. Recorded cello drives VC before mono Scheps; Pro2 is present but silent. Cello sends at unity to Verb, Deci, Sparkle, Fuzz, clean Mast and all sixteen dedicated control destinations. Twenty-five followers and representative server-rate modulation are active; Deci sine LFO0.04Hz is active.
- Tail/profile logic may pause unselected convolution branches. This is the representative profile graph, **not all branch mixes forced to 100%**. The complete BaseLaunch blender/source relationships are not recreated: representative follower routes are used. Voice/instrument count is not a 32/64-grain test.
- IR cap30 uses Mulching1 at10.5s, composite earth at21.818s and longest echo fourth impulse capped30s; original samples are unchanged. Short tests cap each at10 or5s.
- Sample: `/Volumes/ARMED WITH SOUND/Samples/Ali March 22/Cello 1-bounce-1.wav`, left channel, looping at amplitude0.3. FX output is computed and metered, then cleared from hardware channels0/1 after processing.
- A separate −50dBFS997Hz global pilot goes from physical output3 to MOTU input7 (zero-based input6). Another733Hz pilot is unreturned. Native output audit plus returned recording are calibrated with deliberate mute and polarity faults. This tests global delivery continuity; it does not compare the processed FX waveform against Bitwig or catch every effect-specific glitch.
- No GUI or shell bridge traffic, runMidi, MIDI input, or continuous language automation during measurements. Status is polled4Hz; FX/follower meters1Hz. This does not replace the later combined GUI/bridge/instrument test. Background snapshots are before/after, not a continuous system trace.

## Hyperthreading and Supernova

Hyperthreading was not disabled. Xcode26.3 contains an Instruments CPUs preferences resource with “Hardware Multi-Threading”, but that does not establish an enabled usable control on macOS15. The user was asked to check the UI. Apple's [documented Recovery procedure](https://support.apple.com/en-us/101870) applies to older macOS versions and also changes security mitigation; no NVRAM settings or reboot were attempted. Restricting workers is not disabling HT.

Supernova rack capacity remains untested; the isolated combined build has passed bounded core/query gates described in the live comparison suite below. Its installed macOS build uses PortAudio rather than the audited scsynth native CoreAudio path, so the current callback interposer cannot be assumed to measure it correctly. Independent FX slots and convolution branches are candidates for ParGroups, with shared post-FX processing after the barrier; ordinary Groups remain serial. First validate its return detector/backend instrumentation and routing order, then compare deadline/return results. CPU peak definitions also differ between the backends. No production ordering or plugin binaries have been changed for Supernova.

## CPU history panel

[DSP History](/Users/willy/awb/apps/dsp-history/README.md) is registered in Toolkit Home; restart the shell to reload its catalog. It observes an existing localhost SC server through `/status`, displays average / peak / maximum-since-clear and a five-minute graph, and offers freeze, clear and CSV. It neither boots nor changes the server. One shared observer polls4Hz; one Canvas2D paints at most2Hz. It needs no IDE or language ToolInstance.

Five focused Node tests passed. The default960×460 Electron window was visually checked. Its native hide/minimize probe did not consistently set Page Visibility hidden, so native hidden-window suspension is explicitly unverified; simulated Page Visibility handling is tested separately. Total owned Electron process CPU from the synthetic UI probe is not an incremental tool-overhead or Qt comparison. Full shell/audio combined cost is still unmeasured.


## Further test backlog

For current hardware ownership and quiet windows, read [audio testing coordination](audio-testing-coordination.md).

The MOTU256 comparison is now recorded above; the remaining work is pending. No Supernova audio test was launched by this rack workstream.

1. **MOTU256 comparison completed:** the loaded five-minute run failed physical-return continuity with251affected callbacks. Its native counts are lower bounds because the logger filled near the end. Initial baseline was contaminated; the repeat was cancelled by the user because the loaded failure settles the current headroom decision. Retain512. Before future long tests, increase native logger capacity and reject incomplete coverage; those changes exist only in the cancelled private repeat probe. Input/output latency and alignment remain unmeasured.
2. **Hyperthreading A/B:** pending a confirmed usable Instruments setting and an agreed system change; restricting worker count is not equivalent.
3. **Supernova core/query gates passed in the isolated combined build:** pin revision2e198c5 and the archived qualification below. AWB extensions, NodeManager/notifications, rack/modulation/recording, GUI and physical-return/capacity gates remain pending; follow the live comparison suite.
4. **Parallel convolution FFT2048 vs4096:** conditional on item3, compare identical signals/IRs, tail policies and output alignment. Measure latency with impulses and repeat steady captures with added DSP. Split branches only where dependency boundaries are explicit.
5. **Actual instruments and GUI/bridge together:** capacity proxy does not qualify the complete live workload. Include transient voice creation, node pause/resume and FX replacement, not only a static graph.

## General Supernova assessment, checked 7 October 2026

This assessment applies beyond the first-pass rack. Sources were the live upstream issue/PR API, release documentation and local source; the reported bugs below were not reproduced locally during this read-only investigation. Open does not prove that every current build is affected, and closed does not establish that an installed release contains a fix.

**Historical investigation judgement (superseded for the three repaired defects by the combined-build qualification below):** Supernova is worth evaluating as an optional execution backend. It is not currently a drop-in default for the whole AWB environment. Its static independent-voice/FX strengths should be assessed separately from dynamic tree editing, recording and extension compatibility. The most serious general concern found was an unresolved dependency-scheduler lockup associated with group changes, re-confirmed by a maintainer in2025.

| Area | Verified upstream state | General implication |
|---|---|---|
| Group creation/removal and DSP scheduler | [#3461](https://github.com/supercollider/supercollider/issues/3461) open; maintainer reproduced on3.14-dev,11May2025 | Creating/freeing groups around a ParGroup can stop audio and terminate the server. Qualify live coding, chain reconstruction and dynamic topology; a fixed hierarchy alone is not evidence that arbitrary edits are safe. |
| Real-time memory exhaustion | [#5732](https://github.com/supercollider/supercollider/issues/5732), [#1840](https://github.com/supercollider/supercollider/issues/1840) open | Reported crash/silence under exhausted RT memory. Local source allocates per-synth wire buffers from the RT pool, so many voices can consume more RT memory than scsynth. Larger RAM availability alone does not increase the configured pool. |
| Bulk node ordering | [#3100](https://github.com/supercollider/supercollider/issues/3100) open; proposed [#7551](https://github.com/supercollider/supercollider/pull/7551) still unmerged | `/n_order` applies actions differently; topology can remain wrong without a clear error. Audit high-level libraries' movement primitives. Local source contains the old algorithm. |
| Cross-group moveAfter/moveBefore | [#5909](https://github.com/supercollider/supercollider/issues/5909) closed by merged [#7552](https://github.com/supercollider/supercollider/pull/7552),14June2026, develop | Fixed upstream, but the merge postdates stable3.14.1 (24November2025). Do not assume the fix is in3.12.2 or the latest stable release. The fix uses the destination node's parent instead of the moved node's parent. |
| Client registration | [#3337](https://github.com/supercollider/supercollider/issues/3337) open; [#7554](https://github.com/supercollider/supercollider/pull/7554) unmerged | `/notify` maxLogins and its configured limit differ from scsynth. Multiple clients and shell reconnection need explicit checks. |
| Error reporting and observation | [#1581](https://github.com/supercollider/supercollider/issues/1581), [#949](https://github.com/supercollider/supercollider/issues/949), [#3269](https://github.com/supercollider/supercollider/issues/3269) open, older reports | Missing `/fail` in reported failure paths, ineffective error suppression, and oversized node-tree replies. Bridges should verify resources and use bounded queries/timeouts rather than treating absence of errors as success. The historic~9KB tree-reply threshold is not a measured current limit. |
| macOS boot | [#7731](https://github.com/supercollider/supercollider/issues/7731), [#7733](https://github.com/supercollider/supercollider/issues/7733), [#7734](https://github.com/supercollider/supercollider/issues/7734) open, September2026 development-build reports | Low main-thread priority during boot, queued pre-ready OSC replies and repeated client boot finalization. Latest reports use M1Max/macOS27, not this Intel/macOS15 machine. The audio thread sets its own priority; the boot-priority report does not demonstrate low-priority steady DSP. Local older source also calls `thread_set_priority(0)` at startup, but the impact is unmeasured here. |
| Offline rendering with input files | [#7108](https://github.com/supercollider/supercollider/issues/7108) open; new [#7761](https://github.com/supercollider/supercollider/pull/7761) unmerged as checked | NRT SoundIn from input files can produce silence; proposed fixes also address EOF and final-block behavior. Keep scsynth as an independent offline-render path until equivalence is established. This report does not imply real-time hardware SoundIn is broken. |

Relevant version history: [SC3.13 release notes](https://docs.supercollider.online/Guides/News-3_13.html) explicitly include the fix for crashing on arrayed audio/control mappings to Groups. That matters to ProxySpace/NodeProxy-style workflows; it is not automatically present in a3.12.2-based build. A development FFT-interface crash [#7728](https://github.com/supercollider/supercollider/issues/7728) was fixed by merged [#7729](https://github.com/supercollider/supercollider/pull/7729),25September2026. Old parallelFFT distortion and multipleSendTrig reports are closed; they should not be presented as established current bugs, but are useful regression cases. Pick an exact source revision and known test suite rather than relying on a version label or the age of an issue.

General design costs, independent of bugs:

- **Parallelism is explicit, and between synths/groups.** A single large SynthDef is not automatically spread across cores. Ordinary Groups stay ordered; children of a ParGroup have unspecified order. Writers, consumers, modulation combiners and feedback require explicit dependencies. An ordered stage after a parallel stage waits for it; Supernova does not inherently add one block of cross-thread delay merely because a chain runs on different cores. [Execution-order guide](https://docs.supercollider.online/Guides/Order-of-execution.html).
- **Small jobs and shared writes can erase the benefit.** Scheduling/barrier overhead, imbalance and shared bus/buffer spinlocks can dominate small control synths or many voices writing one destination. Preserve serial blocks for inexpensive/dependent operations until measurements justify splitting. Float summation order can vary, so bit-identical renders are not guaranteed even with valid routing.
- **Buffer access and third-party UGen state need thread safety.** Reader/writer locks protect resources, not musical ordering. Shared read-only samples are different from several writers to one recording/looper/FFT buffer. `LocalBuf` is local to a synth; multiple-UGen dependencies within that synth remain serial. Compiling a Supernova variant is necessary but not itself proof that custom global mutable state is safe. [Writing UGens](https://docs.supercollider.online/Guides/WritingUGens.html), [plugin API](https://docs.supercollider.online/Reference/ServerPluginAPI.html).
- **Some lifecycle actions assume ordered siblings.** Local Supernova code frees the current synth but skips the preceding/following-node part of those doneActions when its parent is a ParGroup, because those relationships are undefined. Keep such lifetime-management schemes inside ordinary ordered Groups; ordinary self-freeing voices are a different case. [Local implementation](/Users/willy/supercollider/server/supernova/sc/sc_plugin_interface.cpp:87).
- **Randomness needs a reproducibility policy.** [#708](https://github.com/supercollider/supercollider/issues/708) remains open for unsynchronised global RNGs. Local source gives each synth its own default RNG; `RandID` explicitly switches it to a world/global RNG. Shared RandIDs across parallel nodes therefore deserve specific checks; this is not evidence that every noise UGen is unsafe. Parallel summation and execution order also mean that equal seeds alone do not guarantee bit-identical results across engines.
- **Plugin binaries and hosting differ.** Supernova plugins are built/tagged separately; audit every non-core UGen used by instruments, not just rack effects. EnvDetect3 currently has only a scsynth-named binary in its installed folder; VSTPlugin has both variants. VSTPlugin's `multiThreading` pool setting is ignored under Supernova, so putting all VSTs in one serial synth would lose the concurrency used in the successful scsynth experiment. Native plugin parallelism comes from separate nodes/ParGroups. Sandboxed VST process overhead and each plugin's own thread safety remain relevant. [Installed VST docs](/Library/Application Support/SuperCollider/Extensions/VSTPlugin/HelpSource/Classes/VSTPluginController.schelp:504).
- **Audio backend, clocks and telemetry must be qualified separately.** This installed macOS Supernova uses PortAudio. Its reported CPU is based on `Pa_GetStreamCpuLoad` and differs from scsynth's native callback peak statistic. Validate actual channel layout, hardware size, sample rate, bundle timing/OffsetOut and shared-memory scope bridge behavior; do not infer those from the same SC option names or a successful synth sound. [macOS build documentation](https://github.com/supercollider/supercollider/blob/develop/README_MACOS.md), [ServerOptions](https://doc.sccode.org/Classes/ServerOptions.html).

The documented `useSystemClock` choice is also significant for long performances: system-clock mode keeps language-message latency stable but may lose perfect sample alignment, while sample-clock mode supports sample accuracy but permits language-message latency drift. This is a clock-domain tradeoff, not a claim that Patterns or MIDI categorically fail on Supernova. Test long-running timestamped sequences and external synchronisation rather than only instantaneous notes. [ServerOptions clock documentation](https://doc.sccode.org/Classes/ServerOptions.html#-useSystemClock).

No production graph, engine, hardware buffer, NVRAM setting or plugin binary was changed for this investigation. The previous five-minute tests remain scsynth-only. The private mapped-control-query Supernova build exists locally, but passing those query-specific tests would not establish general scheduler, plugin, buffer or live reliability.

## Supernova repair candidates and resumption handoff

Updated 7 October 2026 after discussion with the user. The user wants general Supernova suitability assessed, beyond the rack built so far. Investigation and documentation are authorised; implementing engine repairs or beginning Supernova audio tests has not been requested in this discussion. No Supernova performance result is available from this session.

### What appears fixable

These are engineering judgements from source and existing upstream patches, not promises that the fixes work or estimates grounded in completed repair work.

| Candidate | Proposed work | Confidence and boundary |
|---|---|---|
| Node ordering and cross-group movement | Review/adapt PR7551 and the merged PR7552; compare both servers for all add actions, nested groups, repeated cross-group moves and the resulting parent/tree structure. | High: identified defects and existing patches. Validate against an exact pinned revision rather than blindly copying changes. |
| Client registration/maxLogins | Review PR7554 and test clients joining, leaving, reconnecting, configured limits and the notify reply. | High for the bounded protocol defect. Reporting maxLogins correctly does not by itself prove limit enforcement or reconnection correctness. |
| Missing failure replies | Reproduce specific command failures and add consistent replies/resource-state verification tests. | High for individual command paths. A complete OSC protocol audit is a separate larger task. |
| NRT input-file rendering | Review PR7761 and compare rendered signals, EOF handling and partial final blocks. | Moderately high: proposed implementation exists. It remains unmerged in the captured snapshot. |
| RT memory exhaustion | Trace allocation failure and partial synth/UGen construction; reject failed operations without corrupting the active graph. | Medium: exception handling alone may not safely unwind partially constructed resources. The correct result is a failed request while existing audio continues. |
| Dynamic-group scheduler lockup | First reproduce issue3461; instrument graph-to-queue construction, runnable-item/dependency counts and queue execution. Diagnose before choosing a repair. | Unknown until reproduced and narrowed down. May be a bounded bookkeeping bug or a substantial concurrency/scheduler defect. Increasing watchdog limits or removing the watchdog is not a demonstrated repair. |
| Third-party UGen thread safety | Audit source-available extensions and build/test the required Supernova variants. | Feasible for our code and accessible source. Proprietary plugin internals cannot be repaired here; host isolation/workarounds may be possible. |

The bounded repairs plausibly take days including meaningful validation; that is a rough planning judgement, not a commitment. The scheduler lockup needs a diagnosis before a defensible estimate. The preferred first repair investigation is the lockup because fixing smaller compatibility issues does not establish dependable dynamic live use.

Scheduling overhead, explicit dependency order, higher per-synth memory and the clock-domain choice are architectural costs. Integration can manage them; they are not all bugs to eliminate. A reliable optional backend with scsynth retained is the current recommendation.

### Clarification: every synth owns its audio wire buffers

The extra audio-buffer allocation in Supernova applies to **every synth**, including synths inside ordinary sequential Groups. In the inspected `sc_synth` constructor, the RT allocation includes `world.mBufLength * synthdef.buffer_count`, independent of the synth's parent group. The SynthDef determines the size; a control-only AWParam needs little audio wire-buffer memory, but still has node, control and UGen allocations. This is distinct from parallel execution: ParGroup children may execute concurrently, while ordinary Groups preserve dependency order.

Source: [sc_synth.cpp](/Users/willy/supercollider/server/supernova/sc/sc_synth.cpp:56). This is a source observation, not a measured memory-per-voice result.

### Resume without repeating the investigation

1. Read this section and the General Supernova assessment above. Treat the issue/PR states as a **7 October snapshot** and refresh only candidates being acted on.
2. Preserve the current AWB dirty work. This documentation is on `integration/bw-sc` and uncommitted. Do not stage the many unrelated Bitwig capture, shell or GUI files implicitly.
3. Choose a source baseline explicitly. The local source repositories `/Users/willy/supercollider` and `/Users/willy/supercollider-control-queries` both reported HEAD `fa7c200aa0979ecde52ff4231f32c357029741cd` during documentation. HEAD alone does not describe their local changes or establish binary provenance. Recheck branches, dirty files, query patches, submodules and compiler options before building.
4. The private binary `/private/tmp/sc-control-queries-20261005/build/server/supernova/supernova` exists. Its presence and query-specific validation history do not qualify its scheduler/audio reliability, plugin compatibility or general use. Do not overwrite installed engines or the user's live class library as part of an exploratory repair.
5. Start with functional reproduction and bounded regression tests. If issue3461 reproduces, investigate it before interpreting a static-graph throughput win as live readiness. Use isolated source/build directories for repairs. Agreement on a concrete repair scope precedes implementation.
6. Only after qualification, validate the Supernova PortAudio deadline/return instrumentation and run performance comparisons. Keep signal, channel count, IR lengths, branch activity, latency, warmup and test duration comparable; VST worker-pool flags do not carry the scsynth concurrency strategy over to Supernova.
7. MOTU256 comparison is completed above: the loaded run failed; the unloaded repeat was cancelled. Retain512. Resume with the pinned combined build and the live comparison suite below, rather than repeating the old repair investigation.

### Retained investigation evidence

[Supernova evidence manifest](awb52-cello-capacity-20261007/supernova/index.json) preserves the GitHub API snapshots captured during this investigation, with SHA256 hashes. It includes the open-item search, issue comments, candidate PRs, selected resolved reports and latest-stable release metadata. Search results include enhancements and PRs as well as bugs; do not describe their total as a bug count. Files are raw source evidence, not instructions or locally reproduced failures. Local source observations are identified above and must be rechecked if that checkout changes.

This is a research handoff, not another repository roadmap. The report and evidence are uncommitted. No Supernova code, production routing, plugin binary or hardware setting was changed. Telegram and Vault tools were unavailable in this session, so no notification or Obsidian status update could be sent.

## Evidence and reproduction

[Evidence index](awb52-cello-capacity-20261007/index.json) links compact per-run records and raw `/private/tmp` result paths, each with a SHA256. Raw native/return binaries stay in those directories; they are not copied into Git. Compact records retain configuration, provenance, checks, phases, stage timing, worst callbacks and the first 100 fault events per stream with total event counts. All results are uncommitted.

Run only in an agreed quiet window with other audio engines closed:

```sh
node apps/rack/sc/sets/awb52/cello-run.mjs --run --quiet-window --seconds=300 --repeats=1 --block=128 --ir-cap=30 --plugin-workers=2 --fft-size=4096 --reserve-percent=25 --output=/private/tmp/awb52-unique-output
```

Current production recommendation is to validate latency compensation and audible equivalence for the two-worker / FFT4096 variant, then repeat it with the actual GUI and instruments. Keep preparation outside the live interval and investigate the intermittent plugin-startup stall before relying on unattended launch.


## Supernova live comparison suite — agreed scope, 7 October 2026

Status: **designed; the AWB integration and performance gates below are not run or implemented yet**. This is the continuation of the existing testing backlog, not a second roadmap. The user requests comparison with the existing rack and qualification for live AWB use. Offline rendering and explicitly shared RandID generators are excluded for now. RandID selects a random-number generator; it does not allocate synth/node IDs. Ordinary noise/random UGens remain part of instrument compatibility testing.

The machine reports Intel Macmini8,1 / macOS15.7.9 (Sequoia), not Sonoma. Apple Silicon/macOS27-specific reports are lower priority; boot/reconnect must still work on this actual host.

### Pinned combined build and existing evidence

Use revision `2e198c5c10207c991190ba15714a95510af03c11`, branch `codex/combined-control-query-supernova`, matching sclang/class library and core plugins. The supplied [qualification summary](/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider/Testing/temp/supernova-combined-control-queries-20261007/qualification-summary.json) records:

- Each engine:24/24 query integration cases and29 language checks; mapped-control C++5/5 with83assertions.
- Supernova C++34/34; selected CTest7/7; offline ordering30/30, lockup11/11, natural EOF teardown18/18.
- Four45-second realtime configurations,2939churn cycles,1221DSP heartbeats,176tree checks and four successful populated-graph quits.
- Isolated engines, sclang and class library; installed engines and1474protected files unchanged. This is core-plugin functional evidence, not a rack/plugin/NodeManager/GUI/capacity pass.

Binary paths are under `/private/tmp/awb-combined-control-queries-20261007/build`: `server/scsynth/scsynth`, `server/supernova/supernova`, `lang/sclang`. Their hashes matched the supplied summary when this plan was written. Preserve the archive because `/private/tmp` is disposable. `getLive/getLiven` now return raw control values with mapped bus index or literal false; bus0 remains integer0. Keep legacy get/getn stored-value semantics.

**Comparison controls:** the combined build has `NATIVE=off`; its scsynth is not the native CoreAudio engine used in the successful capacity measurements. Use paired same-revision PortAudio scsynth/Supernova to distinguish engine differences from backend differences, plus a freshly measured native scsynth reference. Build a same-revision native scsynth companion if supported; otherwise label installed3.12.2 comparisons as both version and backend differences. Do not compare percentages alone or reuse old measurements as fresh controls.

### Preparation and measurement contract

- Declare use through [audio coordination](audio-testing-coordination.md). Shared functional use may coexist with other declared work; reserve named resources when exclusivity is needed. Quiet performance reservations also exclude heavy builds/offline checks and other heavy processes. Design work does not reserve hardware. No device tests begin merely because this plan exists.
- Isolated fixture copies, explicit engine path, matching core-plugin paths, private ports/cache and owned child PIDs. Hash source classes, plugins, specs, IRs and samples before/after. Preserve unrelated dirty work and the installed runtime. Restore44.1kHz/MOTU512 and release only our own reservation on completion/cancellation.
- Default comparison:44.1kHz, MOTU512, SC128,3input/4output channels, FFT4096, original IRs capped30seconds, RTpool262144KiB. Verify actual backend channels/buffer/rate, not only requested options. Retain hyperthreading; worker count is not a hyperthreading switch.
- Use the known cello recording through mono Scheps and the same13plugins/settings. Feed the Pro2 path with a recorded stereo fixture during functional tests; retain the prior cello-only/Pro2-silent workload as the capacity control. Label workload changes.
- Build and audit EnvDetect3 for Supernova in isolation: only its scsynth binary is installed. Test both detector/follower and all required VSTPlugin variants before attempting the complete rack. Do not silently substitute a different follower algorithm.
- Existing `cello-run.mjs` is a starting point, not an engine-neutral controller: it hardcodes native scsynth, VST workers, tracking off, and CoreAudio audit assumptions. Add explicit backend/engine/plugin paths, tracking and GUI workload selection in an isolated harness. Extend framework inclusion with the actual NodeManagerOSCBridge/host classes.
- Use a backend-specific callback audit. For Supernova, measure full PortAudio callback duration/entry/deadline and, if available, individual DSP-block timing separately. Validate injected mute/phase faults on the computed pilot and physical return; reject recorder drops, timestamp gaps, exhausted audit capacity or incomplete capture. A continuous global pilot does not prove an FX branch is correct: also capture/check processed branches in bounded functional probes.
- Record startup, IR preparation, plugin open, warmup, calibration, steady playback and live graph mutation separately. Preloading spikes may be outside the live interval; live replacement spikes count against it. Capture p50/p95/p99/max callback time, native late/over-budget counts, returned fault callbacks and episodes, command latency, stage-tagged peaks and owned process CPU. Include renderer/GPU process CPU and WindowServer/system observations; label shared/background cost rather than assigning it all to the rack. SC CPU statistics are descriptive, not a cross-backend acceptance oracle.

### Functional gates — both engines, same fixtures

All time/count targets below are planned. Keep raw OSC replies, language assertions and an independent expected graph/state ledger. Normal lifecycle events and deliberate failures must be distinguished.

| ID | Exercise | Acceptance and scope |
|---|---|---|
| F1 — boot and registration | Ten full boot/quit cycles with AWB class library; immediate/delayed attach, same endpoint re-register, notify off/on. Separately test maxLogins1 and2 with independent OSC client endpoints and an excess client. | Exactly one language boot finalisation per boot; usable notify reply/clientID/maxLogins or an explicitly verified compatibility path; no allocator reset while reconnecting the same live client; disjoint node-ID ranges for independent clients; configured login policy behaves consistently. Missing maxLogins must not become an unchecked default. |
| F2 — lifecycle and NodeManager | NodeWatcher plus actual NodeManager and ToolInstance ownership:1000short tracked voices, persistent nodes, pause/resume, release/self-free, explicit free, addReplace and group teardown. Include Event/Pattern tracking. | Expected /n_go,/n_end,/n_on,/n_off,/n_move where the protocol promises them; registry reaches the expected live set and returns to its initial baseline within2seconds of final /sync. No orphan entries, missed cleanup or duplicate ownership. addReplace is checked against framework explicit unregister semantics, not an assumed /n_end. |
| F3 — shell projection and recovery | Two browser clients through the one sclang host;20connect/disconnect cycles, NodeManager enable/disable, projection resnapshot after a deliberate sequence gap, bridge restart and owned engine reboot. | Engine /notify registration is distinct from /awb/nm/tool/notify and shell subscription. Browsers do not each require an engine login. Snapshot/sequence recovery is complete within the configured health timeout plus one maximum reconnect backoff plus2seconds; no duplicate stale entries or loss of ownership. A shell reload must not kill an attached IDE host. |
| F4 — rack/modulation dependencies | Eight persistent instrument channels, five fixed FX slots verb/deci/spark/fuzz/mast and three dynamic slots;16control sends/25followers. Known block-counter/ramp writers through detector/follower -> AWParam writers -> processor -> consumers. Add/remove multiple modulation sources, map/unmap/remap, interrupt base/amount ramps. | Expected block values, sums, curves and endpoints within predeclared float tolerances; no unintended stale block, stuck modulation, double-clearing or NaN/Inf. Explicit feedback paths get a documented delay; dependent stages remain ordered. Rerun getMap/getLive through actual AWParams, including bus0 and legacy get semantics. |
| F5 — plugins and sound | All13plugin opens/readbacks/latencies, full chain and isolated effects. Impulses, silence, recorded cello and stereo input; profile sweeps, gain modulation, Deci0.04Hz sine, deselection/tail/bypass/reactivation. Repeat20complete launches. | No unexplained startup hangs, nonfinite output, missing branch or lost modulation; controls/latencies match selected configuration. Capture onset and tail timing and dry/wet alignment. Deterministic native stages can be compared numerically; stateful/random/proprietary effects use latency/RMS/spectral/envelope checks plus listening, not a bit-identical oracle. |
| F6 — dynamic graph | Ten minutes of nested group insertion/removal/reorder, chain node moves, mixed synth/group n_order lists, all add actions, dynamic FX install/remove, writer removal and tail retirement while known signals run. T1/T2/T4 atSC64/128 for small fixtures; full rack at selected production block. | Independent bounded tree/state checks, continuing DSP heartbeat and registry convergence; no deadlock, crash, wrong parent/order, output loss or unbounded resource growth. Keep repaired core tests as regressions; new tests exercise actual AWB operations. |
| F7 — transport | Real GUI -> shell OSC batching -> sclang rack -> engine, then independent SC-origin edits back to GUI. Eight channels at24destinations, then32destinations:8FX +16control +8named unused test destinations. Ten minutes of scene recalls and100bursts changing the whole matrix at once. | No command timeouts; requested final state equals engine state after /sync; no per-cell await, silent stale endpoint or unbounded pending queue. Locally authoritative GUI edits produce no redundant own-origin value reapplication; genuine SC edits appear remotely. Audit packet/message/value counts separately. Keep intermediate coalescing distinct from endpoint loss; test feedback-origin tagging without relying on a numeric epsilon. |
| F8 — buffers and recording | Current sample/granular UGens, allocation/free/reuse, RecordBuf/write -> dependent readers, stop/save/reload a recording, and observation bridge on internal buses; compare ordinary ordered groups with independent parallel readers. | Correct buffer content and rate, continued recording, no cross-thread corruption/crash. Mutable producer/reader chains remain ordered; verify scope/shared-memory capture with the actual engine. Unified-buffer/looper tools need their own supported-engine gate before inclusion, not presumed compatibility. |
| F9 — failure resilience | Private silent engines: missing SynthDef/UGen, bad buffer-write path, absent node/control, oversized tree query, very small RTpool until allocation fails; one surviving heartbeat/pilot. | Every request terminates with a meaningful error or bounded timeout followed by state verification; no false success. Record raw /fail and /error behaviour. Pool exhaustion must not corrupt or crash the surviving graph to pass this resilience gate. Crash is retained as a failed test, not fixed by increasing memory in the test. Production-capacity conclusions remain separate. |
| F10 — scheduling | Thirty-minute timestamped Pattern/OSC run with known OffsetOut onset markers and actual runMidi scheduling enabled against a private sink. One Supernova system-clock run; alternate clock mode only if drift is found or sample-clock operation is needed. | Record lateness, onset error and drift relative to the reference; no duplicate or dropped events. Set tolerance before running: control transitions within one control block of the defined schedule plus measured delivery latency; sample-accurate native onset fixtures within one sample after measured fixed offset. Do not assert this strict bound for proprietary plugins. No real footpedal required; hardware MIDI/takeover remains a later separate qualification. |

F1/F2/F3 are adoption gates for NodeManager. A raw OSC-only pass is insufficient. If /notify fails, reproduce it first and make a bounded engine/client compatibility fix with regressions before relying on live cleanup. The combined build has not yet qualified this behaviour.

F9 distinguishes engine resilience from bridge resilience: a bridge can handle missing error replies with bounded verification, but cannot repair an engine crash. A failed memory-exhaustion gate must remain visible even if normal configured memory has plenty of capacity.

### Performance comparison after functional gates

1. **Backend/graph controls:** fresh native scsynth with two VST workers (the successful reference); paired combined scsynth without workers; SupernovaT1 ordered graph. Use these to identify backend/version differences before claiming a parallel speedup. If a same-revision native scsynth companion is built, retain the installed reference as a separate version control.
2. **Parallel candidates:** SupernovaT2 andT4 with independent FX and convolution branches in ParGroups. Shared downstream UM/Scheps/master stages remain after explicit ordered barriers. A SynthDef containing three VSTs stays one job: splitting Sparkle into separate branch nodes is a private graph variant, not an automatic engine feature. Log every transform and validate F4/F5/F6 before scoring it. Cross-branch signal dependencies must not be replaced by an undocumented block delay.
3. **Short screening:** each configuration gets35seconds warmup and300seconds scored rack-only playback at hardware512/SC128/FFT4096/30-second IRcap. Reverse/interleave comparison order across repeats to reduce drift. Stop a configuration on persistent failure; do not sweep the entire range again. Benchmark all-active FX branches as a separately labelled worst-case profile, in addition to the representative profile which may pause branches.
4. **Integrated finalists:** compare the fresh native scsynth reference and best functional Supernova candidate. Eight instrument channels,8FXslots and16control sends, tracked nodes and actual batched bidirectional bridge. Test four GUI conditions: rack alone; rack +32medium transparency knobs; rack +8waveforms; rack +both. Start at15Hz paint/coalescing; waveform cases include the real audio observation bridge, not canned redraws. The GUI is a separate process workload; its authoritative control traffic stays independent of paint cadence.
5. **Reserve requirement:** for each finalist/GUI condition calibrate an additional25–30percentage points of DSP while that complete setup is active, then score300seconds; repeat the intended live condition twice. Calibration uses comparable callback wall-time, not incomparable server-reported CPU or whole-process CPU. If a reliable Supernova wall-time oracle is unavailable, report throughput at the same fixed stress graph and leave the25-point reserve gate unqualified. Also run the identical stress-node count on both engines so per-backend calibration does not hide workload differences.
6. **Boundary and long-run:** only after the512production setup passes, compare FFT2048 vs4096 andSC64vs128 on the best Nova layout, verifying latency again. Hardware256 stays deferred until a demonstrated512gain makes it worth revisiting. Selected configuration then runs30minutes with live scene/profile changes, dynamic replacement and transient voices. Additional instruments beyond the fixed calibrated DSP proxy remain explicitly unqualified unless actually included.

If a GUI condition recreates the unexplained overrun wall, retain the original Xcode/Instruments investigation: capture a short paired boundary run with System Trace/Time Profiler and available GPU/power counters. Align traces to returned-fault and callback timestamps. Profiling runs are diagnostic and kept separate from unprofiled capacity results because the profiler can perturb timing; do not restart a full load sweep.

Classify physical-return results as consistently zero faults, intermittent1–2fault episodes, or repeatable failure, retaining callback counts and event durations. A clean audio return can coexist with callback overruns; retain both. The intended live setup earns a clean qualification only with repeated zero returned faults and valid capture under calibrated reserve. Intermittent boundary slips are useful measurements, not clean passes. A startup spike is acceptable only while deliberately muted/prepared; a live replacement spike counts.

A fixed-function eight-channel fixture can populate six extra channels with independently phased recordings for reproducibility. It does not stand in for all future real synths: qualify the specific sample/granular/instrument UGens separately, and record which ones actually ran. The32destination transport fixture adds eight unused endpoints to the real24; it does not claim32loaded FX processors.

### Deliverables and next implementation slice

Each gate/configuration produces configuration.json (revision/binary/plugin/source hashes, backend, topology, threads/block/FFT/IRcap, actual hardware state, client and GUI state), events.jsonl, assertions/results.json, callback/return coverage summaries and before/after resource counts. Capacity runs also retain calibrated stress count, timing quantiles, tagged peak events, processed-audio probe/latency results and contamination intervals. No full-suite claim follows from selected gates. Cross-engine audio comparators declare tolerances before playback.

Next implementation slice: an engine-selectable isolated controller and matching fixtures for **F1–F3**, plus the EnvDetect3 Supernova prerequisite. Then ordered rack/modulation/plugin qualification, backend measurement validation and parallel layouts; only then reserve/GUI capacity tests. The supplied combined core/query regressions are reused, not needlessly reimplemented. No production engine installation, routing change or automatic branch merge is part of this test design.


### AWB functional comparison outcome, 7 October 2026

The functional pass is retained in [Supernova AWB qualification](supernova-awb-functional-20261007.md). Rack transport/scopes passed at8channels×24/32destinations with independent engine send-gain readback. scsynth passed the13plugin set readbacks; Supernova passed native routing but fails convolution preparation and has notification/client-ID defects. No performance/headroom gate was run. Installed runtimes unchanged; hardware44.1kHz/512, owned processes stopped and reservation released. The fullF1–F10plan remains incomplete.
