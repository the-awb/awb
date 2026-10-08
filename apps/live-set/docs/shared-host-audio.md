# Shared-host delay/rack integration — 2026-10-07

The composite now borrows actual SC-hosted audio and controls. AWBaseTool owns the prepared FX set and one UBPGraphController delay graph. Nine rack channels expose 24 destinations each; four separate delay returns and Delay Bus are wired. No private delay engine or duplicate internal routing is launched by the composite viewer.

## Functional evidence

The final test used the real first-pass set: Verb file convolution capped at 30 seconds with FFT 4096; Deci, Sparkle, restored Fuzz, UM and mono/stereo Scheps enabled. Required plugin controllers became ready. A pre-existing VST cache entry reported `FL Studio VSTi.vst: not a plugin`; it was unrelated to the loaded set. No server command failures or duplicate resource-free errors occurred in the final run.

Test settings: scsynth, 44.1 kHz, SC block 128, existing hardware buffer 512, three input/four output channels, 262144 KiB real-time pool and two VST DSP workers. The rack master group was paused; test signals were DC sources captured in private SC buffers. This verifies routing and control behaviour, not audible quality or full FX signal-path parity. The full FX graph was allocated and active. No runMidi, global MIDI initialisation or physical-input connector was started.

| Gate | Passed | Evidence |
| --- | ---: | --- |
| Actual SC/audio assertions | 26 | `shared-host-verification/engine.log` |
| Actual Node/SC bridge assertions | 11 | `shared-host-verification/node-results.json` |
| Actual Electron GUI assertions | 8 | `shared-host-verification/browser-results.json` |
| Focused Node tests | 23 | `shared-host-verification/node-tests.log` |
| Isolated SC contracts | 15 | `shared-host-verification/sc-contracts.log` |

The audio assertions measured VC → B1 and Pro2 → A2 independently, stereo preservation, both SC inputs → A1, one aggregate sum, separate wet returns, source mute and an internal B1 → B2 route. Feedback modulation was registered and measured on the output bus; a GUI edit changed its baseline without removing the modulation input. The rack fader changed the same Delay Bus AWParam used by the delay view.

The actual Electron test opened four native stereo waveform views, the SC rack, AWParam sources and AWBase logs. It checked SC-origin reconciliation, keyboard edits, retained timing metadata, GUI-close borrowing and owner-loss reader detachment. The captured composite is `shared-host-verification/composite.png`.

## Bugs corrected during integration

- Persistent set ownership was being discarded by NodeManager's generic playback poll: `Object.isPlaying` defaults to false. AWBase now adopts resources with explicit container lifetimes. This keeps first-pass set cleanup ordered before parent rack teardown.
- Per-head sends had GUI values of zero but native edge defaults of one. They are now explicitly initialised from the configuration.
- Graph retirement is asynchronous. Closing the base now disowns native graph resources and moves the paused graph out of its parent before retirement, avoiding duplicate frees.
- OSC strings arrive as Symbols. Metadata is normalised and string membership uses equality rather than identity.
- Observed seconds must not be recomputed from rhythmic UI metadata. SC snapshots and deltas preserve the authoritative timing parameter.
- A failed viewer startup releases partially attached readers; owner loss detaches all eight handles.

## Repeat and limitations

From the AWB root under Node 22, after building the native readers, delay plugin, rack and live-set bundles:

```sh
python3 apps/live-set/sc/test-run.py --output /private/tmp/awb-live-delay-classes
AWB_FULL_SET=1 AWB_DELAY_GUI=1 python3 apps/live-set/test/run-delay-audio.py
node --test --test-concurrency=1 apps/live-set/test/*.test.mjs apps/rack/test/model.test.mjs
```

The functional fixture has private UDP ports 57975/57976 and refuses an existing exclusive audio-test lock. It must not overlap another use of these fixture ports. It freezes the selected SC classes and uses per-server plugin paths, leaving the installed class library unchanged. Its test engine and language process exited cleanly. The pre-existing interactive preview was preserved. No sample-rate or device-buffer change was made.

The next performance run should compare the same live-set audio baseline with the composite, sparse AWParam observation, rack edits/transitions and shared scopes enabled. It needs actual cello playback, live follower/modulation activity and delay record/feedback operations, with dropout measurement and the required audio-only headroom separated from GUI cost. This pass makes no quiet-machine or CPU capacity claim.

Still to review: physical MOTU input indices/audition; translations of legacy delay blender/envelope/tap controls; final GUI layout; detailed tail/click policy. The currently selected feed-forward cell topology intentionally excludes reverse routing cycles. Persistent delay-input reads add one SC block; rearranging this order would require an explicit routing-policy change.

## Short paired load run — 7 October 2026

After the user requested a quick load test, the separate preview was stopped through its supported API and its shutdown verified. Two sequential 150-second windows ran on one audited SC host: recorded cello, live FX/follower modulation, nine rack channels and four delays recording with feedback. The second window added the composite, 55 observed AWParams, 16 simultaneous changing FX send controls at 15 Hz, four stereo delay waveform views and eight stereo ScopeOut2/native readers with 15 Hz canvas display. Scope observers used direct native setup, rather than the full Scope Tool lease UI. Actual Pro2 input was silent. No runMidi or physical instrument input was active.

| Window | SC average | Sampled SC peak | Engine discontinuity callbacks | Physical-return discontinuity callbacks | Native over-budget callbacks |
| --- | ---: | ---: | ---: | ---: | ---: |
| Audio-only, 150 s | 35.8% | 135.8% | 16 | 28 | 13 |
| Full GUI/bridges/scopes, 150 s | 37.4% | 80.1% | 0 | 0 | 0 |

The return recorder had zero dropped captures, recorder overruns or timestamp frame gaps in both windows. Native maximum callback duration was 15.77 ms audio-only and 9.30 ms with GUI. The 512-frame period is 11.61 ms at 44.1 kHz. Rate and device-buffer settings did not change. All 13 plugins passed readbacks before and after; no OSC server failures or browser errors occurred. The GUI generated 36,336 actual rack edits, and completed 2,271 scope polls while remaining connected.

Audio-only faults/over-budget events were concentrated 20.5–62.1 seconds into its capture. Both windows followed only five seconds of explicit warmup. The later GUI window was clean, so this does not implicate GUI load as the cause of the earlier faults; it also does not prove the GUI improves delivery. Settling, workload evolution and background variation remain confounders. A properly warmed/reversed comparison is required before declaring capacity. The required extra 25% calibrated DSP reserve was not included in this shortened test.

Process CPU accounting included the Electron renderer, main process and helper descendants (including GPU/utility helpers), plus WindowServer. During the GUI window the composite subtree consumed about 90.5% of one CPU core; WindowServer averaged about 30.5%, versus 17.0% audio-only. These are separate from SC's callback-wall-time percentages and are not GPU execution-time measurements. Thus the GUI has meaningful system cost even though it added little observed SC average load in this run. No engine-headroom guarantee follows from these process averages.

Compact evidence and exact private probe variants are retained in `paired-load-20261007/summary.json`; raw native/return captures and process samples are under `/private/tmp/awb-live-paired-load-5min`. The shortened preparation attempt that refused the still-running preview is retained separately under `/private/tmp/awb-live-quick-load`; it started no new engine. Test engine, language, recorder and Electron processes exited; the reservation was released. The preview remains stopped as requested. No further tests were started.


## Warmed audio-only component pause test — 7 October 2026

The user cleared the machine. An isolated audited scsynth host ran real recorded cello through the same first-pass FX, 16 control sends, 25 followers and four recording delays. Configuration: 44.1 kHz, SC block 128, MOTU 512, four hardware outputs, FFT 4096, IR cap 30 seconds, two VST DSP workers. No GUI, scopes, MIDI or additional calibrated DSP reserve. There are nine persistent rack channels, but VC is the active source; Pro2 and external SC1/SC2 are silent. The three spare audio destinations remain empty. Five active audio sends and all sixteen control sends receive cello.

After 90 seconds warmup: 60 seconds all-active, 12-second hard pause windows for each listed component with 3-second settle/resume gaps, then 30 seconds restored. Hard server node/group pauses preserve mappings; they are diagnostic operations, not a live tail policy. The source and modulation evolve during this sequential test; small differences cannot be assigned as precise additive component costs.

| State | SC average | Sampled SC peak | Max native DSP ms | Engine discontinuity callbacks | Return discontinuity callbacks |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmed-baseline | 34.07% | 77.49% | 9.00 | 0 | 0 |
| Paused verb | 19.73% | 40.00% | 4.65 | 0 | 0 |
| Paused deci | 33.23% | 59.75% | 6.94 | 0 | 0 |
| Paused spark | 31.64% | 63.32% | 7.36 | 0 | 0 |
| Paused fuzz | 33.47% | 57.68% | 6.70 | 0 | 0 |
| Paused um | 34.18% | 66.87% | 7.77 | 0 | 0 |
| Paused stereoScheps | 33.99% | 64.06% | 7.45 | 0 | 0 |
| Paused B1 | 33.64% | 68.24% | 7.93 | 0 | 0 |
| Paused A2 | 34.88% | 67.84% | 7.88 | 0 | 0 |
| Paused B2 | 33.83% | 62.21% | 6.99 | 0 | 0 |
| Paused A1 | 34.63% | 65.26% | 7.58 | 0 | 2 |
| Paused delays | 33.72% | 104.88% | 12.19 | 2 | 4 |
| Paused allFX | 7.51% | 17.60% | 2.05 | 0 | 0 |
| restored-baseline | 34.09% | 62.44% | 7.26 | 0 | 0 |

Both all-active baseline windows were clean and had almost identical average load. Verb accounts for the largest measurable saving (approximately 14.3 percentage points); all FX paused lowers average load to 7.51%. All delays paused leaves average at 33.72%, so this short run finds little marginal delay cost. Individual UM/Scheps/delay differences are within workload variation. This warmed clean audio-only result removes any need to infer that the GUI made the previous run better; it does not establish the cause of those earlier faults.

Two transient fault episodes occurred during pause windows. A1 paused: engine pilot clean, two discontinuity callbacks and three silent callbacks on the return; native DSP itself peaked at 7.58 ms, but one audit section took 14.22 ms. That section is normally a few microseconds; instrumentation/preemption may have contributed, so this episode cannot be attributed to audio DSP. All delays paused: two engine discontinuity callbacks, four return discontinuity callbacks; native DSP reached 12.19 ms (hardware period 11.61 ms). Neither episode demonstrates that delay processing caused the fault. The capture recorder had no dropped data, overruns or timestamp frame gaps. Pauses/resumes outside the measured intervals are retained in the complete timeline and raw data.

Coverage was queried during warmup: all 16 detector outputs were nonzero and changing; all 25 follower inputs refer to those live detector buses. 24 follower outputs were nonzero and changing. f_stut retains its saved zero scale, so its output is zero by design. No GUI polling was added. The initial whole-tree query exceeded the server response buffer; a compact tree and individual readbacks succeeded. This read-only diagnostic failure is separate from the main harness, which recorded no OSC failures.

Every measured native phase was checked again against the completed binary capture: all sequence IDs, 512-frame periods and 44.1 kHz rates were valid and discontinuity counts matched. The live allocation/loading aggregate contains invalid zero records and must not be used for timing/frame-gap totals; the actual heaviest valid startup callback was 18.18 ms while starting cello. All 13 plugins passed readbacks before and after. Frozen source guards passed. Engine, language and return recorder exited, and the exclusive reservation was released; preview remains stopped.

Evidence: `audio-pause-20261007/summary.json`, full status/timeline `results.json`, `follower-coverage.json`, process log and exact private probe variants. Raw native/return capture remains at `/private/tmp/awb-audio-pause-load`. This is component isolation, not a full GUI/headroom qualification or a sustained dropout-free claim.


## Settled full GUI plus calibrated reserve — 7 October 2026

Requested setup: full live audio and GUI, settle before adding an extra 25 percentage points of SC DSP, then five minutes loaded. Same44.1kHz, SC128, MOTU512, FFT4096, two VST workers, 30s file IR cap, nine rack channels and four recording delays. Recorded cello feeds VC through Scheps, all24 send destinations (including three empty spare audio slots) and all16 detector buses; Pro2/external SC1/SC2 remain silent. All25 follower inputs reach those live detectors;24 outputs change and f_stut keeps its saved zero scale. GUI includes55 AWParams, four stereo delay waves, eight native ScopeOut2 stereo scopes and16 concurrent rack send edits at15Hz. Scope readers use direct observation setup rather than the full Scope Tool lease UI.

The first attempt failed during plugin startup, before GUI/capacity measurement: SIGBUS/page-in error within the callback auditor's mapped capture file. The audit library constructor opens that file with O_TRUNC, and injected-library inheritance into helper processes creates a capture corruption path. The private launcher now sets its own PID and the private auditor returns before opening any file in other processes. The private reader also loops until the requested record bytes are fully read. Both changes are retained with the probe. They are isolated test-harness changes, not engine/plugin changes. The failed attempt is retained at `/private/tmp/awb-full-gui-reserve-load` and provides no capacity result. Prior faults cannot all be retrospectively attributed to this issue.

The retry let the entire GUI settle90s, measured90s baseline, recalibrated reserve against a45s live baseline, settled the selected reserve another30s, captured300s loaded, then removed reserve and captured30s recovered.26 reserve nodes measured27.61 percentage points extra (above the requested25):64.50% versus36.89% in calibration. These are serial private DSP nodes, not a reduction in the production FX graph.

| Full GUI state | SC average | Sampled SC peak | Max native DSP ms | Engine discontinuity callbacks | Return discontinuity callbacks |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 37.25% | 69.66% | 8.09 | 0 | 0 |
| plus-reserve | 65.10% | 107.63% | 12.50 | 14 | 28 |
| restored | 35.28% | 65.35% | 7.60 | 0 | 0 |

The loaded run does not demonstrate reliable25% headroom with the full GUI workload:14 engine discontinuity callbacks and28 on the physical return. Native processing reached12.50ms against an11.61ms hardware period; three callbacks exceeded that period. Fault/timing events recur throughout the loaded capture (about22–248s), rather than just allocation/onset. Both unreserved windows were clean. No separate callback-auditor stall like the previous14ms episode occurred; loaded max audit time was0.163ms. These are callback counts, not14 or28 independent audible incidents. The actual processed FX path is metered then silenced at hardware output; continuity uses a separate quiet pilot through the engine and MOTU loopback.

The return recorder had zero dropped captures, recorder overruns and frame gaps. All13 plugins passed readbacks before/after; no server OSC or browser errors occurred. The composite generated163072 rack edits and10192 scope polls over the full attached period;55 AWParams remained connected. All62326 completed native records were reread after shutdown with valid sequential IDs,512-frame callbacks and44.1kHz rates; phase discontinuity counts matched. Frozen source guards passed.

Process accounting includes the Electron renderer, main process and helper descendants, plus WindowServer. Composite CPU averaged88.69% of one core in the baseline and82.00% loaded; WindowServer29.79% and28.92%. Engine process CPU61.04% and88.15%. GPU/utility helper CPU is included in the composite totals; GPU execution time/power is not measured. These process percentages differ from SC callback-wall-time percentages.

During settling, the compact gig renderer was imported from SuperCollider commit `c4ee528` into `tool-artifacts/buffer-views/0.1.0`, preserving AWB embedding, shared routing and sparse SC reconciliation. The already-loaded test views were not reloaded, so this benchmark qualifies the preceding GUI version, not the newly imported layout. After the engine stopped, the integrated new view passed81 rehearsal/browser checks (including380x252 embedded fitting/settings, control commands, shared observation, duplicate views and detach/reopen) and11 live-set contract tests. Screenshots/logs are in `full-gui-reserve-20261007/gig-view-checks/`. No new audio engine or preview was started for those checks. The new SC/native delay DSP was not rebuilt or changed.

Evidence and exact private probe variants: `full-gui-reserve-20261007/summary.json` and sibling files. Raw native/return recordings are at `/private/tmp/awb-full-gui-reserve-retry`. Engine, language, recorder, measurement GUI and rehearsal GUI all exited. Reservation released; preview stays stopped. No commit or push was made.


## Shorter IRs and SC256 reserve boundary

Earth5s,Composite21.818sunchanged,Echo20s;SC256/MOTU512 at44.1kHz,FFT4096,twoVSTworkers. Full composite GUI,55AWParams,fourdelaywaves,eightnative scopes and16simultaneousrack edits15Hz. Display held awake. Recorded cello through VC;otherinstrument sources silent;all24VC sends and16detectors/25followers exercised.

| Requested extra DSP | Actual calibration | Loaded average / sampled peak | Engine / return fault callbacks |
|---|---:|---:|---:|
| +25pp | +25.12pp |52.15% /83.57%|0 /0|
| +30pp | +31.28pp |57.27% /100.04%|3 /6|
| +35pp | +36.35pp |60.39% /111.76%|5 /10|

Five-minute loaded windows;allbaselines and recoveries clean. +45skipped because35failed. Native over-budget callbacks0/1/2 respectively. Recorders reliable;all13pluginreadbacks,sourceguards andGUIchecks passed. Completed native rows reread and counts matched. +25is the conservative clean result from these single trials;30/35have failures during normal loaded processing. The earlier SC128shorterIRrepeat failed under reserve but its display slept duringcalibration, so it is not visibleGUIqualification.

[Full setup, timing, CPU process costs and evidence](ir-shortening-reserve-20261007/README.md). Native convolution waveform/envelope/gain editor added:recompile/reopen the set,then `~awb52.convolutionGUI`.14shaping+16livechecks passed;NodeManager Buffer ownership regression5/5passed. Editor was closed during performance tests. No blanketpausepolicy added. Test engines/windows stopped and hardware slot released.
