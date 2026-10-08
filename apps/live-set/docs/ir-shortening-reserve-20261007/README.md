# Shorter IRs, visible GUI and reserve boundary — 2026-10-07

**SC256/MOTU512 with +25 percentage points of extra DSP passed its five-minute loaded capture. The +30 and +35 targets failed. +45 was not run because the user made it conditional on +35 passing.** Keep +25 as the conservative working reserve from this experiment. This is one five-minute trial per target, not a guarantee of an exact long-term boundary.

44.1kHz; four hardware outputs and three input channels; SC block256; MOTU buffer512; PartConv FFT4096; two VST DSP workers; 262144KiB real-time pool. IRs actually read into the engine: Earth/Mulching5s (220500frames), Composite Earth21.818185941s (962182frames, unchanged), Echo/Inchindown20s (882000frames). Each run verified the actual crop metadata and frozen source hashes.

Nine persistent rack channels,13plugins,6PartConv processors,16audio-fed control-send detectors,25followers,live FX/follower modulation and four recording delay cells (32s stereo buffers,feedback0.4). Recorded cello feeds VC through mono Scheps; Pro2 and external SC1/SC2 remain silent. All24VC destinations are fed, including the three empty spare audio slots; empty slots do not add an FX chain. This is not an eight-independent-instrument-source qualification. Verb uses its existing selection/tail/pause policy; other FX are not blanket-paused when their contribution is zero.

GUI: current compact delay performance view;55AWParams;four stereo delay waveforms;eight native ScopeOut2 stereo scopes at15Hz;16simultaneous rack send edits at15Hz through the real SC rack bridge. Scope readers use direct native observation setup, not the full Scope Tool lease UI. Native convolution editor window closed. No runMidi or physical MIDI input workload.

Each run:90sGUI warmup,90sbaseline,fresh live reserve calibration,30ssettling,300sloaded,then reserve removed and30srecovery. The synthetic reserve is a serial group of32SinOsc→RLPF→tanh per node on an unconsumed private bus. Amounts are added absolute SC percentage points, not percentages of the baseline. +30 used a tighter30..31.5point calibration range; the others used target..target+5. Display held awake with temporary caffeinate assertions. Start/end power state4 and power log confirm no display-off interval during these runs.

| Requested reserve | Measured added load | Loaded SC average | Sampled SC peak | Engine / return fault callbacks | Native over-budget callbacks | Max native callback DSP |
|---|---:|---:|---:|---:|---:|---:|
| +25 | +25.12 | 52.15% | 83.57% | 0 / 0 | 0 | 9.718 ms |
| +30 | +31.28 | 57.27% | 100.04% | 3 / 6 | 1 | 11.625 ms |
| +35 | +36.35 | 60.39% | 111.76% | 5 / 10 | 2 | 12.988 ms |

The hardware period is11.610ms. Baselines and recoveries were clean in all three runs. +30 faults occurred14.543,16.261 and210.294seconds into its loaded phase; +35 faults occurred0.708,1.765,57.120,73.234 and176.815seconds in. They are not exclusively allocation/startup faults. “Fault callbacks” counts callbacks containing detected pilot discontinuities, not an audible-duration or severity measurement.

All13plugins passed open/parameter/latency readbacks before and after each run. No SC OSC command failures or browser errors; all55AWParams remained connected. The three GUI sessions generated163120,163504 and163168rack edits respectively (+25,+30,+35; see each gui-result.json for exact counts). Return recorders reported no drops, recorder overruns or frame gaps. Completed native binary captures were reread after shutdown:62145,+25;62091,+30;62097,+35callbacks, sequential IDs and valid512-frame/44100Hz rows throughout; every measured phase's discontinuity and deadline counts matched. Guard checks passed and all owned processes exited.

## What the detector establishes

The real FX output is metered, then hardware channels0/1 are cleared. A separate continuity pilot on hardware2/3 returns physically through MOTU input6. The audit checks the engine output and actual hardware-return continuity while the real FX/routing/GUI compute. It does not evaluate the sound quality or equivalence of every FX output. Allocation and calibration transitions are retained in results.json but excluded from steady loaded windows. For example, +25's largest whole-session29.210mscallback occurred while creating reserve nodes; its loaded maximum was9.718ms.

## CPU process cost

SC percentages above are callback wall time against the hardware period. Process CPU uses100%=onecore. Loaded phases, +25/+30/+35: direct engine72.26/77.89/80.40%;sclang2.43/2.60/2.35%;composite Electron including GPU/utility helpers88.51/96.33/87.64%;WindowServer27.22/30.24/26.99%. Electron helper costs are included, not added a second time. Raw process snapshots include all sampled processes and remain at the recorded raw locations. GPU execution time, power and thermal state were not measured. These results do not identify a single scheduling/driver/GPU cause for the remaining boundary.

## Earlier SC128 repeat

The shorter-IR SC128/MOTU512 repeat had a clean33.12%average/60.82%peak baseline, then62.14%average/103.97%peak under its calibrated+25.67point reserve:14engine/30returnfault callbacks and4over-budgetcallbacks. However, the display turned off at21:33:18UTC during calibration; the loaded and recovery phases were not visible-GUI qualification. Browser messages continued, but Electron and WindowServer CPU fell sharply. This result is preserved in sc128-display-off and must not be presented as a clean like-for-like visible-render comparison.

SC256 runs also include the new IR editor support (constant-one processor gate controls while unused) and explicit Buffer ownership fix. No pure single-variable block-size causal claim is made. The experiment establishes the usable tested configuration and its observed reserve bracket. Background OS variation and different cello/profile phases remain possible contributors.

## Convolution editor

After recompiling classes and reopening the file-IR set with Verb profiles:

```supercollider
~awb52.convolutionGUI;
```

[Editor verification](editor/README.md): waveform of actual crop; draggable envelope;curve;dBgain;Apply;Save settings.14offline shaping checks,16live checks and5Buffer ownership checks passed. IR copies are made from originals; the previous processor drains its complete tail before old spectra are freed. Future Verb clones use the current prepared spectra. Original files stay unchanged. Apply itself was not dropout-qualified under the loaded performance test.

Bounded evidence is copied in each case directory. Large raw output audits, returned audio and process CPU snapshots remain at raw-location.txt paths. Source, runtime and image evidence are preserved; no source changes have been committed as part of this testing turn. Preview and test windows are stopped; hardware reservation released.
