# AWB live surface

The live surface now connects the first-pass SC FX set, one four-cell delay graph, the native send rack, AWParams and the AWBase console on one existing SC server. The composite places B2/A2 on top and A1/B1 below. Heads/sends open per cell; the cell routing panel opens once for the shared graph.

In AWB Toolkit, choose **AWB Live Set → Start live set (no IDE)**. The shell starts its own language host, loads the installed opener, binds the rack/parameters/delays/console and owns that set until its window closes. Save and close an existing IDE set before starting this hardware session; the launcher never terminates an attached IDE host.

Alternatively, load [open.scd](open.scd) once from SC:

```supercollider
"/Users/willy/awb/apps/live-set/open.scd".load;
```

It boots the MOTU 1248 at 44.1 kHz, SC block 256/hardware buffer 512, four hardware outputs, a 256 MiB real-time pool, 4096 server nodes and two VST DSP workers. It then opens the prepared FX rack, sixteen control sends/followers, AWBase, four delays and the composite GUI in sequence. FFT is 4096; Earth/Echo caps are 5/20 seconds. It adds no benchmark reserve, pilot, test sample, scopes or automation. Repeating the load reopens the existing complete set rather than allocating a second one. A running server with incompatible settings is retained and reported; it is never rebooted or cleared automatically.

The opener connects **VC input 0**, **Mic input 1** and **Pro 2 inputs 4/5**, using zero-based MOTU indices and six hardware input channels. Override with `~awbLiveInputs = (vc: [0], mic: [1], pro2: [4, 5]);` before loading if needed. Mic is an independent mono source duplicated into its stereo rack pipe and initially routed to clean Mast. Delay record inputs still begin at zero until their route and input controls are enabled. BaseLaunch selects and attaches the configured FCB MIDI source; opening another GUI does not initialize MIDI. A successfully bound live rack enables output immediately, so faders and send edits work without an extra arming click; standalone/preview racks retain their explicit output switch.

`~awbLiveClose.value;` closes this set and its views and cancels a pending launch, leaving the server running. Handles remain `~awb52`, `~liveBase`, and `~liveView`. [with-delays.scd](sc/examples/with-delays.scd) remains as the step-by-step example. Launch preflight and required files were checked with actual sclang; the new opener has not been auditioned against hardware.

The editable set now lives in [LiveSet](LiveSet/README.md), with configuration in [BaseLaunch](LiveSet/BaseLaunch%20with%20efKR.scd). Boot and allocation are class-backed. The repository mirror is copied to `/Volumes/ARMED WITH SOUND/SuperCollider/live sets/ live set sc migration`. See that README for the current MIDI, scene and compatibility boundaries.

## Class and native setup

Use Node 22 and run from the AWB root:

```sh
npm run prepare:delay --workspace @awb/live-set -- --live-inputs
npm run build --workspace @awb/live-set
npm run build --workspace @awb/rack
```

The preparation script generates 44.1/48 kHz plans and builds the per-host `UnifiedTape.scx` and waveform addon in `apps/live-set/.build`. It starts no engine and installs nothing globally. It uses `/Users/willy/supercollider` for SC headers by default; `SC_SOURCE` can select another source checkout. The example includes this plugin directory in this server's plugin path **before boot**. Choose the plan matching the actual server rate.

Select these class directories alongside the existing Tool framework, then recompile sclang:

- `apps/core/sc/classes`, `apps/param/sc/classes`
- `apps/rack/sc/classes`, `apps/chain/sc/classes`
- `apps/rack/sc/sets/awb52`
- `apps/live-set/sc/classes`
- `apps/live-set/sc/dependencies/unified-buffer`

Do not include tests, archived classes or the original prototype's duplicate dependency snapshots. The first-pass set also requires its existing EnvDetect3/VSTPlugin dependencies and restored FX plugins. No global class-path changes are made by this branch. Frozen delay dependencies and their original commit/hashes are recorded in `DEPENDENCIES.json`; renderer provenance is in `tool-artifacts/buffer-views/0.1.0/SOURCE.json`.

## Routing and ownership

The opener adds Mic and calls `AWBDelayRack.configure(spec, [])`: **nine input/delay/pattern channels** (VC, Pro 2, Mic, Delay Bus, B1, A2, B2, A1, Patterns), plus the five FX-return send columns described below, each exposing eight FX and sixteen control destinations. Each delay’s VC input reads the Delay Bus post-fader audio; Pro 2 and Mic independently enter every delay. The Delay Bus level is applied once and its mute gates the shared VC feed. SC1/SC2 are omitted from this live set. The legacy step-by-step example retains those optional inputs. Cell routing follows the acyclic **B1 → A2 → B2 → A1** order and remains inside the delay graph.

The wrapper explicitly orders input mixer channels, Delay Bus, input pipes, the delay graph, return pipes and delay mixer channels. Its pipes use current-block `In.ar` reads: VC → Delay Bus → delay VC routing adds no block delay. FX return feedback taps retain their existing block boundary. Every cell has an independent stereo buffer and wet return channel. Delay Bus carries the post-fader cello signal into the delays. Its shared AWParam fader allows +6 dB manually and unity through MIDI, and affects cello only; Pro 2 and Mic have independent feeds. No aggregate monitor return is connected. Individual delay sends start at zero: route each delay’s output explicitly in its own rack column. Dry is part of that cell’s output, using its input routing. The four 32-second stereo buffers use approximately 45 MiB at 44.1 kHz, separate from SC's real-time memory pool.

Delay input route gains and cell input gains begin at zero. Cell input (`inOf`, alias `in`) is limited to 0–1 / 0–100% in its AWParam, delay controls and command validation. Recompile the SC class library and recreate the set to replace existing 0–2 input parameters. Select both to begin recording; the startup example shows this. Feedback preserves the Lua master scaling: one enabled head pair has a 100% ceiling; enabling both pairs changes it to 50% and halves the current value, and returning to one pair doubles it. Three manually enabled heads conservatively use the 50% ceiling too. The native AWParam range bounds base, MIDI and modulated output; mode changes preserve normalized ramps and existing mappings. A recorded loop continues internally after its input route is lowered. Its channel sends, mute and level govern what leaves the delay; lowering Delay Bus affects new cello input rather than playback.

`base.bindFirstPass(set, own:true)` and `base.bindDelays(plan, configuration, action)` give AWBaseTool explicit ownership. Closing a GUI releases its observers/readers only. Closing the base retires the delay graph, AWParams, buffers and adopted FX set. Persistent owned objects use container lifetimes so NodeManager does not discard them based on `Object.isPlaying`.

## Controls and console

Knobs accept wheel input for the base value and Alt + wheel for modulation amount; Shift/Ctrl gives a fine step. Each delay has a single tape-head column with Mode, Position, TH mod and Position mod. Columns face outward: left for B2/A1, right for A2/B1. Input routing sits above B2/A2 and below A1/B1, keeping the performance surfaces together. The unrequested extra ~T/~FB/~FX/~IN bank has been removed. These controls now bind the native head modes/positions and slow level/position erosion. The Lua position choice 3 retains the current positions.

`t[track].p[name]` is a convenience dictionary referring to the actual AWParams. Delay aliases include `inOf`, `fbOf`, `fxOf`, `sliOf` and named source routes. Delay Bus's `fader`, the rack level control and `globalInput` refer to the same cello-feed AWParam baseline. Existing mappings stay connected when these values change. Each cell has an expandable AWParam drawer exposing base, amount, effective value and registered sources.

The preserved pedal channel/CC metadata is available through the semantic controls. MIDI input must be explicitly selected and attached, for example `base.t[\b1].attachMidi(\fxOf, ~fcb)`. Opening another GUI initializes no MIDI device. BaseLaunch restores the remote-shaped bank layout and optionally starts the Bitwig MIDI output adapter at launch. Legacy delay blender/envelope/tap aliases and unsupported FX controls remain visibly unbound until their replacement behaviour is implemented. Per-head controls still use the native graph's named literal controls.

`base.log(message, level)` sends bounded history plus deltas to the console. The view's Pause and Clear affect this viewer only; old AWBase logging is not automatically intercepted.

Local AWParam edits paint on the next display frame. Observed control values use the sparse shell control bridge. Delay configuration travels on connection/recovery and as changed fields, with a heartbeat rather than configuration polling. The four stereo waveforms share one network backend and existing 20 Hz observation feed. Owner loss disables the borrowed connection and detaches all eight native readers.

## Verification and next gate

The actual first-pass FX set, delay graph, rack and Electron surface were verified together: **26 SC/audio assertions, 11 bridge assertions, 8 real GUI assertions, 23 focused Node tests and 15 SC contracts passed**. This includes independent input routing, mute behaviour, one aggregate sum, preserved modulation through GUI edits, rhythmic metadata on reopen and clean ownership teardown.

Hardware output was muted and signals were captured inside SC. Physical-input audition, extended dropouts and CPU/headroom with GUI and scope bridge remain the next test gate. This is functional readiness, not a performance result. See [shared-host verification](docs/shared-host-audio.md) and `verification.json` for settings, evidence and remaining work.

![Actual shared-host composite](docs/shared-host-verification/composite.png)

The four borrowed tape views now use the compact gig renderer from SuperCollider commit `c4ee528`. Timing and transport are overlaid on the tape; extra settings live in its expandable panel. Heads/sends and shared routing retain their existing views. This is a renderer update only, with the existing shared SC graph and AWParam bindings retained.

## Compact performance layout

The composite is resizable. Its normal rack view shows all thirteen source columns and 21 active destinations without numeric readouts; channel levels remain horizontal at the bottom. Reserved FX rows are hidden during performance. Larger chain knobs follow the o-s-c layout, and mix triggers/capture controls remain visible beside the rack. Mix editing exposes decimal SC amounts plus per-target timing and alignment, including reserved sends. A dedicated Delay Bus fader controls cello availability to the delays; manual faders reach +6 dB and MIDI stops at unity. FX audio levels use their mixer-column faders; each chain panel has only its envelope amount fader. All faders support wheel scrolling, with Shift/Ctrl for fine adjustment. Each envelope fader’s single bar reads the existing post-amount detector bus through the shared native control reader at 15 Hz. Recompile SC and reopen the set/surface to load the meter registrations.

Use **Mixes → Load set** to replace only the named mix collection, including the imported o-s-c library. It leaves live values, routing and arming unchanged. **Save set** exports a portable JSON collection; the Node rack runtime persists the selected collection in its existing library. SuperCollider owns the live audio graph.

See [GUI verification](docs/gui-tidy-20261008/README.md) for the tested sizes and fixture boundary. The class migration adds tapehead erosion and baseline/amount aliases. Timing and missing legacy controls are documented in LiveSet/README.md.

Delay Bus is immediately right of the delay cells, followed by the set list and matrix. The mix panel includes a scene-transition countdown/progress bar and a manually started set stopwatch (Start/Pause/Reset), matching the separate stopwatch control in o-s-c. Clocks belong to the Node rack runtime and recover on reconnect; their display updates locally at 8 Hz without OSC or telemetry polling. The AWBase Console tab shares the mixer area with Sends, as in o-s-c. Delays and FX remain visible. It retains bounded log history and viewer-only Pause/Clear. Switching tabs preserves the live views and console history. Below 1500 px, delays and mixer stack in a scrollable Live pane so the controls keep their usable sizes; the footer tabs remain visible.

For GUI-only updates, evaluate `~liveView.close;`, wait for its window to close, then evaluate `~liveView = ~liveBase.gui((shellRoot: "/Users/willy/awb"));`. This recreates the viewer and its native rack binding while retaining the running set and audio server.

After recompiling the changed SC classes, close the old set with `~awbLiveClose.value;`. If the running server has fewer than six hardware inputs, quit it and wait for shutdown before loading the opener; it will boot the required input capacity. Existing complete older sets without Mic must be closed before reopening.

## FX-return sends

Five additional matrix source columns — Mast, Fuzz, Deci, Sparkle and Verb — expose their processed returns to every FX destination (including themselves) and all sixteen control sends. There are now **fourteen source columns** and twenty-four allocated destinations (twenty-one shown in performance). New sends start at zero. These branches tap the slot return before any shared UM/Scheps processing; existing main-output paths remain automatic. The return column’s audio fader and mute apply to its automatic return and additional sends, once per path. An FX solo silences other automatic returns while retaining its source feeds and upstream inter-FX sends. Source solos continue to filter source channels. A slot’s ENV fader still controls detector amount.

Every FX-return send reads the previous audio block (256 samples = 5.80 ms at 44.1 kHz), so cross-sends and self-feedback have deterministic timing independent of FX slot order. Retiring generations contribute to the same stable tap; replacing a processor retains its routes. Feedback gain can build up, so audition self-sends starting low. This adds five persistent channel synths; the earlier CPU/headroom results have not been rerun with these new columns.

The reusable rack configuration enables a return source with `(id:"fx-verb", returnOf: \verb)`. The standard rack without these entries retains its original graph. See [layout and routing verification](docs/gui-tidy-20261008/README.md) for the offline audio and current GUI checks.

The 2026-10-08 headless launch and corrected cello-feed routing are newer than the earlier shared-host audio verification. Isolated language/protocol and GUI tests verify the new contracts; a full MOTU boot and audible FX check remain pending while the existing IDE session is running. The historical aggregate-sum result above describes the old routing and is not a validation of the new path.

Live rack gains stop at 1: fully clockwise is unity (0 dB), 0.5 is approximately -6.02 dB. The opener sets the SC ceiling, so this is enforced by the server-side rack as well as the GUI. Deci Depth and Folding use the full normalized plugin range 0–1, initialized to the captured plugin values. The captured LFO and follower modulation depths remain additive and clip at the endpoints. The standalone migration configuration retains its original macro behaviour unless `fullParameterRanges` is enabled.

Current output routing: MAST (the dry send destination), Fuzz, Deci and Spark automatically return to the shared UM → stereo Scheps chain → rack master bus → output limiter → hardware 0/1. Verb automatically returns directly to the rack master bus. Each FX send column is an additional tap of its processed output; its additional sends retain their existing block boundary. Its column fader and mute govern both paths. Sending an FX column to MAST still adds another output path.

The unity send/fader ceilings, Delay Bus source and full Deci bases require a newly constructed set with the updated SC classes. Close the old set, recompile the class library and reopen; reopening only the GUI preserves the old DSP graph. Offline Deci range validation uses `deci-range-test.scd` and `verify-deci-ranges.py`; the changed delay path still needs an audible hardware check.

Same-block wrapper routing is verified offline at SC block size 256 using the actual rack channel definitions, the actual pipe definition and the shared ordering-message builder. `routing-order-test.scd` / `verify-routing-order.py` compare impulse samples before/after the Delay Bus gate and at a delay return: exact sample alignment at gate gains 0.5 and 1, plus silence on Delay Bus mute while VC stays active. This probe exercises wrapper routing, not the native tape DSP or hardware audio.

Verb’s Gain knob now binds `verbIn` (CC105) to a 0–1 AWParam controlling the Verb input hub. Its mapping remains connected when the baseline changes. `fx-fader-test.scd` / `verify-fx-faders.py` verify real offline rack return DSP: fader scaling on automatic returns and extra sends, mute, FX solo feed retention, AWParam mapping/unmapping and processor replacement. The same probe checks the Verb gain AWParam against a control hub. These checks do not audition the full plugin chain or MOTU output. SC routing changes require closing the old set, recompiling the class library and loading `open.scd` again. Reopening only the surface loads GUI changes.

## Class migration verification (2026-10-08)

The new class-backed set has a reproducible silent actual-engine fixture in `sc/test/migration.py`. It validates all 57 modulation routes and 94 producer identities, spoofed MIDI endpoints/pickup, remote banks, scene locking and cleanup. Large node-tree UDP replies are handled through bounded node-info queries. Startup audits routing nodes before reporting ready. Existing scenes were not launched, and this is not a renewed CPU/headroom or physical-input audition result. See [editable migration notes](LiveSet/README.md).


The envelope integration matrix now passes 5,110 actual-engine assertions, plus
60 signed Deci/LFO assertions. It found and fixed the blender constructor/live
setter fault and the old clipped-away negative Deci amounts. All seven original
delay-envelope presets and native plugin/head mappings are checked with muted
output; original scenes are not launched. See [saved evidence](docs/class-migration-20261008/README.md)
for exact coverage, remaining unavailable effects, and the intermittent VST UI
startup diagnostic that is still unexplained.

### Pickup and saved mixes

Threshold pickup remains on; `~awbPickupWait = 0` and `~awbPickupFade = 0` currently bypass the soft warning/fade only. A pedal must reach or cross the existing value before it controls the parameter. The pickup GUI notification exception is fixed; recompile and relaunch the set.

Load set lists the saved o-s-c collections, including config, jailhouse, INEFFIBLEED and the blank template. Selecting a collection loads mix targets into the current rack without changing current levels or launching scenes. Browse can load other JSON collections. Imports persist under this rack's libraryID. Send knobs now have an audio taper (same gain curve as the faders); fully clockwise is unity.
