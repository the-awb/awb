# Class-backed LiveSet migration — 2026-10-08

Editable configuration lives in `apps/live-set/LiveSet/BaseLaunch with efKR.scd`.
The same files are delivered to the user-prepared ` live set sc migration` folder
on the external volume. Original volume files remain inert in SourceArchive.
Ownership, boot and teardown live in the classes; musical assets remain opt-in.

The silent envelope matrix passes all **5,110 actual-engine checks**. A final
**60-check Deci envelope/LFO probe** also passes. Both runners report no unexpected
errors and clean server/language exit. The matrix covers all sixteen control-send
detectors/faders; 28 followers; 42 blenders (all eight input combinations, live
setters and full graph ordering); 33 intended envelope destinations, with crosstalk,
signed amounts, zero amounts, curves and clipping; all selector poles/interpolation;
actual Verb branch ingress audio, including taper/gain; 24 tapehead connections;
all seven original delay-envelope presets; and 39 actual VST mappings at two source
levels. Independent blender/preset literals come from the archived original set.

Two real faults were fixed: AWBLiveSignal's constructor put its settings/writer
in the wrong instance slots, and Deci's negative depth/folding amounts were clipped
away in the legacy auxiliary path. The live set now routes those envelopes to the
public AWParams with captured 0.2/0.53 depths. Borrowed raw inputs retain the LFO
cross-product without extra route synths; signed/clamped source behavior is tested.
AWParam output includes base/envelope; the final plugin bus additionally includes
captured LFO contributions. The final positive-LFO/source clamp refinement follows
the matrix checkpoint and has its own 60-check verification.

An earlier 127-assertion migration run and the first 20-check LFO probe emitted
`PluginBridge::pollUIThread: plugin N doesn't exist (anymore)` at startup, despite
passing their functional assertions. Their runners correctly fail. A 20-check
repeat and final 60-check run are clean, as is the full envelope matrix. The cause
and audio impact of this intermittent VST UI-event lookup error remain unknown;
it is not filtered out or claimed fixed. Historical and clean logs are retained.

The actual SC↔Node language bridge passes 16 checks, with a 160-parameter registry.
Core regression passes, SC contract passes 21 checks, focused Node tests pass
71/73 with two skips, and the shell host tests pass all three with no skips.
These are functional checks, not a new CPU/dropout qualification or physical-input
audition. The GUI inspector is bound but the test suppresses its window.

The original presets are exercised with disconnected inputs and muted output.
Only dummy scene actions run; no original musical scenes are launched. Scene
locks cover action completion and transition time across MIDI and Shell.
The original OSC source is now readable: notes 81–89 map to scenes 1–9 and
90 maps to scene 0, without a channel filter. BaseLaunch now binds that map to
its configured FCB UID; nil source UIDs are rejected. The OSC transition algorithm
is not copied. Physical pedal audition and the full note/source matrix remain
unverified. The extended bridge regression reached 14 checks, then sclang crashed
while constructing the unknown-scene exception (SIGSEGV in
DebugFrameConstructor::fillDebugFrame / prGetBackTrace). Expected missing-scene
and transition-busy replies now avoid that exception path; this source change
awaits compilation/runtime retesting. Tests were stopped after the user reported
crash dialogs. No audio engine or original musical scene was launched.

Manual faders permit +6 dB, their MIDI path stops at unity, and send gains stop
at unity. Delay Bus controls only the shared cello feed. Namespace aliases keep
remote-shaped banks for optional Bitwig control-output compatibility; only a
recording MIDI sink was tested, not Bitwig itself. Details and remaining scope
are in the editable folder README and verification.json.

The matrix uses bounded native mapping queries and direct bus reads on the
installed compatible SC 3.12 server. It does not require getLive, change installed
server binaries, launch original scenes, or qualify CPU/headroom/GUI cost.
At the time of that matrix, Stutter/Splutter/Mast EQ were unavailable: intermediate signals are tested,
but no native destinations are invented for effects not yet migrated.

Run the matrices explicitly (each reserves the MOTU; output is muted):

```sh
AWB_MIGRATION_ACTION="$PWD/apps/live-set/sc/test/envelope-modulation.scd" \
AWB_MIGRATION_TIMEOUT=600 \
AWB_MIGRATION_EVIDENCE=/private/tmp/awb-envelope-NEW \
python3 apps/live-set/sc/test/migration.py

AWB_MIGRATION_ACTION="$PWD/apps/live-set/sc/test/deci-envelope-lfo.scd" \
AWB_MIGRATION_EVIDENCE=/private/tmp/awb-deci-lfo-NEW \
python3 apps/live-set/sc/test/migration.py
```

All migration source changes are currently uncommitted on integration/bw-sc.
Unrelated dirty Bitwig capture and other agent work is left untouched.

Naming: musical access is through `b`; `liveSet.audio` and `.set` are removed.
Both BaseLaunch copies were patched independently in place, preserving user formatting.
Focused Node-only runtime/catalog tests pass 7/7 after these changes.


## Soundbath page reintegration, 8 October

Target: `/Volumes/ARMED WITH SOUND/SuperCollider/live sets/dfc 2026 sc migration/scenes dfc 2026 soundbath.scd`. The original `dfc 2026` folder was not edited.

The first block now calls `AWBLiveSet.openPage`, loading the editable rig from the sibling ` live set sc migration/BaseLaunch with efKR.scd` (the leading space in the folder name is intentional). BaseLaunch supplies ParamValues; the page supplies its own scenes instead of the template. No global OSC responder reset or old FlowVar boot handshake remains.

`b` owns a dedicated TempoClock unless a caller supplies one. Delays listen for tempo changes; patterns use the same clock. Scene waits and owned background tasks use seconds on SystemClock. Closing the base stops those tasks and closes the coordinator; borrowed clocks remain alive.

The delay plan includes a Patterns source. Native pattern events, sample players and dust/nervedrip voices enter its rack bus. The former A1 SC1 send is now `patternsIn`. Pdefs retain their own player so existing `.stop` calls work. Their outputs were changed from external hardware channels to the Patterns bus; one-shot Events use tracked playback. Existing scene bodies and ASCII section dividers remain in place.

The initial migration guarded four Stutter edits. The cello Stutter addition below reinstates them and removes the unavailable warning. Native nervedrip is retained. DiskStreamer now exposes its existing `ampMod` input as a control so the page's mapped follower buses can affect playback. Clear broken references to `~bassBend`, the patterns list, optional progress counter and Decimate selector were corrected. Additional performance MIDI notes are filtered by the configured FCB source UID.

Verification: 23 silent SC surface contracts and 40 real sclang/Node UDP checks passed. Five source units compiled without execution. Four additional clock/lifecycle checks verify second-based waits, owned task retirement and preservation of a borrowed clock. These are language/command checks: no audio engine or original musical scene was launched. Delay DSP routing, sample playback and audible scene fidelity remain unverified for this page. Compile-only evidence is `/private/tmp/awb-soundbath-compile.log`; originals before editing are in `/private/tmp/awb-soundbath-before-20261008`.


### Full BaseLaunch gate and IDE page evaluation

The page now uses its explicit migration folder, because `thisProcess.nowExecutingPath` is nil during direct IDE block evaluation. BaseLaunch no longer executes the page inside `onBase`. Its `onReady` callback schedules the owned continuation for the next SystemClock turn, after startup checks, input connection and shell launch have completed and the launch routine has returned. None of the page's local files is loaded earlier. Page errors are logged without tearing down the already-running rig.

Scene registration now sends a small replacement scene list to connected shell clients, so a shell opened before page continuation receives the later scene definitions. The real sclang/Node test passes 42 checks, including late scene registration and replacement without duplicates. Both BaseLaunch documents compile; 23 silent class checks pass. No audio engine or soundbath scene was launched for these checks. Recompile the SC class library before retrying the first page block.

## Cello Stutter, 8 October 2026

Native gain/pan chopping now sits after mono Scheps and before the VC rack input. The source still enters the raw mono cello bus; Scheps writes a new private stereo bus and Stutter is its sole path into the rack. Pro 2 and Mic routing is unchanged. Amount, waveform and rate are AWParams; `f_stut_vc` connects to the stage's envelope AWParam with the existing registered previous-block policy. All four parameter outputs have checked same-block mappings to the Stutter synth. Rack ownership retires the stage, parameters and SynthDef.

Waveforms are Tri/Pulse/Sine/Saw/Custom. Custom is an editable cycle of 2..128 attenuation values in BaseLaunch. Amount zero restores exact unity gain and centred pan; the stage never adds gain. The original FCB channel 4 / CC17 mapping and four soundbath scene edits are restored. Defaults 4 Hz / slow pan 0.1 Hz are provisional. Bitwig's local sidechain/Polynom/Select-4 network is not claimed reproduced; its uncaptured curve and LFO settings remain a follow-up.

Verification: 27 class contracts, 9 Stutter language/ownership/MIDI checks, 15 assertions against actual scsynth file-rendered audio, 105 Electron shell checks, 5 catalog checks and 42 language/OSC bridge checks pass. Nine live functional checks also pass on a private server using BlackHole 2ch, with no hardware output writers. They verify standalone and preinstalled SynthDef startup, four checked mappings, distinct base/amount/effective values and cleanup. Both BaseLaunch copies compile. MOTU and original scenes were untouched; this is not a CPU qualification. The built-in output-only device refused CoreAudio initialization, so the private probe used the virtual device. Offline loading reports an unrelated installed NN plugin dependency; Stutter uses core UGens and its OSC/render checks pass.

Reproduce with `python3 apps/live-set/sc/test-run.py --output /private/tmp/awb-stutter-20261008`, then run `apps/live-set/sc/test/stutter.scd` using that generated sclang config, then `python3 apps/live-set/sc/test/verify_stutter.py`. Shell: build `@awb/live-set`, then `electron apps/live-set/test/browser.mjs --stutter-only`. Evidence: `/private/tmp/awb-stutter-20261008`.

## Delay bindings and faders, 8 October 2026

Delay widgets now use explicit canonical registry names (`inOf`, `fxOf`, `fbOf`, `dryOf`, `sliOf`). Short language aliases and modulation-amount views still refer to the same AWParams. The GUI edits base and amount separately and observes the effective output; the adapter maps that output to the actual delay control. BaseLaunch binds each cell's `*_in`, `*_fx`, `*_fb` and `*_t` blender to its own parameter. Dry has no assigned blender. These parameter amounts start at zero.

All live-set faders span exact silence to unity (0 dB), without positive headroom. A continuous cubic taper places 50% travel at −18.1 dB; every composite and native mixer fader has a unity mark. The Delay Bus uses the same 0..1 range on both sides of the bridge, preventing a gain above one from invalidating the delay configuration. Stutter's SynthDef is installed and synchronized with the other rack definitions before its node is created. Recompile the class library and close/relaunch the set to install these changes.

## Send taper, pickup recovery and saved sets — 8 October 2026

Audio send knobs (native FX, follower audio sends, and delay inputs) now use the same cubic audio taper as faders. Half travel is gain 0.125 (−18.1 dB); full travel is unity. Scene targets, OSC and MIDI retain their native values.

Threshold pickup stays enabled. Both editable BaseLaunch copies set `~awbPickupEnabled = true`, `~awbPickupWait = 0.0`, `~awbPickupFade = 0.0`: only the warning hold and smoothing are bypassed. Controllers hold the existing value until reaching/crossing it, then follow immediately. The reported `warning.at(\id)` exception was a GUI bridge observer treating a pickup phase Symbol as a route Event. Pickup notifications now use scalar deltas; route updates retain their own event path. Recompile the class library, close and relaunch the set to load these SC changes. The user's running host was not commandeered.

Load set now opens a compact list of compatible saved collections, with Browse retained. It discovers the four original files in `/Users/willy/Documents/GitHub/osc-config`: config (11 mixes), config (jailhouse) (11), INEFFIBLEED_config (7), and config_BLANK (1). Selecting one transposes mix targets into the current rack, preserves current gains/topology/armed state, and does not launch an SC scene. Initial test previews had a seeded fixture library; a new SC-owned library starts empty, which explained the different initial display. Imported collections persist with that rack's libraryID. Default folders are the o-s-c repository under the current user's Documents/GitHub and the current rack-library directory; deployments can supply `mixSetDirectories` or JSON `AWB_RACK_MIX_SET_DIRECTORIES`. Discovery reads matching JSON collections only; credentials and symlinks are excluded.

Verification: 30 focused Node checks, 32 MIDI pickup checks, 48 real sclang/Node bridge checks, and 111 actual Electron GUI checks passed. Both BaseLaunch copies compiled. The GUI list was captured at `/private/tmp/awb-live-set-browser/saved-set-list.png`; no hardware/audio load test or original scene launch was performed. Rack and live-set consumed UI builds have been refreshed. Logs: `/private/tmp/awb-saved-sets-node.log`, `/private/tmp/awb-saved-sets-gui.log`, `/private/tmp/awb-pickup-bypass-unit.log`, `/private/tmp/awb-pickup-bypass-bridge.log`.

### AWB Shell launcher button — 8 October 2026

The live-set bottom toolbar has an AWB Shell button next to Names / MIDI. It opens or focuses the existing Toolkit launcher through the authenticated shell.open-home operation; the current set remains running. Restart AWB Shell to load the new main-process operation; this change does not require an SC class-library recompile.

Verification: isolated real Electron shell test passed opening/reopening and reusing the same visible launcher window; the full live-set GUI fixture passed 113 checks, including button placement and requested operation. Live-set UI build refreshed. Evidence: /private/tmp/awb-open-shell-home.log and /private/tmp/awb-open-shell-gui.log. No audio engine or original scenes were started.


### AWParam downstream base lag — 8 October 2026

AWParam now applies a default 0.5-second control-rate Lag after its base envelope,
before adding modulation. Every base edit passes through it, including explicit
duration zero and scene ramps. SC Lag time is its 60 dB settling time, so this
is not an exact arrival deadline. A timed ramp retains its duration/curve and
has a settling tail. Amount and follower signals retain their existing timing.
The supplied construction value is immediate. `param.baseSmoothing = 0` (or
constructor/core configuration `baseSmoothing: 0`) disables it per parameter.
Discrete Stutter waveform and legacy delay choices disable smoothing. No new
Synth nodes or buses are allocated. Threshold MIDI pickup remains enabled;
the separate warning/offset fade is still bypassed in BaseLaunch.

Verification: the complete core suite passes, including 81 class contracts,
32 pickup checks, 49 registry checks, 35 GUI class checks, 43 original audio
assertions, 26 new assertions against actual scsynth-rendered base-lag audio,
20 pickup audio assertions, 33 core protocol checks and 13 registry protocol
checks. Select/tail renders also pass. Additionally, 27 live-set class checks,
52 actual sclang/Node OSC checks, 9 focused Node checks and 114 Electron GUI
checks pass. The consumed live-set UI build was refreshed. Evidence:
`/private/tmp/awb-base-lag-always-20261008`,
`/private/tmp/awb-base-lag-always-class.log`,
`/private/tmp/awb-base-lag-always-bridge.log`,
`/private/tmp/awb-base-lag-always-node.log`,
`/private/tmp/awb-base-lag-gui.log`. No user audio engine, hardware device or
original scenes were started for these checks. Recompile the class library
and close/relaunch the set to load the new SC processor.


### Live delay wet/output unity ceiling — 8 October 2026

The live AWBDelayRack `effectLevel`/`fxOf` parameter now has maximum 1 (unity), including its modulated output. The generic looper graph still supports its own broader range; the live-set wrapper bounds its mapped AWParam. Input gain and feedback ranges are unchanged. `all params.scd` documents 0..1 wet/output for all four cells. Final checks: 27 live-set class checks and 366 isolated reference checks pass; no audio server or hardware opened. Evidence: `/private/tmp/awb-all-params-wet-unity-20261008/`. Recompile classes and close/relaunch the set to install the live processor range change.


### Commit checkpoint — 8 October 2026

All current repository changes are included at the user's request. Further testing stopped so the machine could be taken away. The separate `all params.scd` reference migration is installed; the `ParamValues.scd` preset-bank migration remains pending and its temporary candidate is not installed. Existing validation above applies only to its stated coverage.
