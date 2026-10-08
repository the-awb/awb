# AWB live surface

The live surface now connects the first-pass SC FX set, one four-cell delay graph, the native send rack, AWParams and the AWBase console on one existing SC server. The composite places B2/A2 on top and A1/B1 below. Heads/sends open per cell; the cell routing panel opens once for the shared graph.

Start with [open.scd](open.scd). Load it once from SC:

```supercollider
"/Users/willy/awb/apps/live-set/open.scd".load;
```

It boots the MOTU 1248 at 44.1 kHz, SC block 256/hardware buffer 512, four hardware outputs, a 256 MiB real-time pool and two VST DSP workers. It then opens the prepared FX rack, sixteen control sends/followers, AWBase, four delays and the composite GUI in sequence. FFT is 4096; Earth/Echo caps are 5/20 seconds. It adds no benchmark reserve, pilot, test sample, scopes or automation. Repeating the load reopens the existing complete set rather than allocating a second one. A running server with incompatible settings is retained and reported; it is never rebooted or cleared automatically.

The opener connects **VC input 0**, **Mic input 1** and **Pro 2 inputs 4/5**, using zero-based MOTU indices and six hardware input channels. Override with `~awbLiveInputs = (vc: [0], mic: [1], pro2: [4, 5]);` before loading if needed. Mic is an independent mono source duplicated into its stereo rack pipe and initially routed to clean Mast. Delay record inputs still begin at zero until their route and input controls are enabled. MIDI source attachment remains explicit, as in the existing examples.

`~awbLiveClose.value;` closes this set and its views and cancels a pending launch, leaving the server running. Handles remain `~awb52`, `~liveBase`, and `~liveView`. [with-delays.scd](sc/examples/with-delays.scd) remains as the step-by-step example. Launch preflight and required files were checked with actual sclang; the new opener has not been auditioned against hardware.

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

The opener adds Mic and calls `AWBDelayRack.configure(spec, [])`: **eight input/delay channels** (VC, Pro 2, Mic, Delay Bus, B1, A2, B2, A1), plus the five FX-return send columns described below, each exposing eight FX and sixteen control destinations. VC, Pro 2 and Mic can independently enter every delay. SC1/SC2 are omitted from this live set. The legacy step-by-step example retains those optional inputs. Cell routing follows the acyclic **B1 → A2 → B2 → A1** order and remains inside the delay graph.

Delay inputs read the rack's post-fader/mute/solo outputs with an explicit one-block `InFeedback` boundary. Every cell has an independent stereo buffer and wet return channel. Delay Bus aggregates the selected wet returns, initially routes to clean Mast and has one shared AWParam fader. Individual cell sends begin at zero to prevent summing a second copy. The four 32-second stereo buffers use approximately 45 MiB at 44.1 kHz, separate from SC's real-time memory pool.

Delay input route gains and cell input gains begin at zero. Select both to begin recording; the startup example shows this. The aggregate output remains available while cell tails continue. Master/dry routing should be reviewed before an audible audition.

`base.bindFirstPass(set, own:true)` and `base.bindDelays(plan, configuration, action)` give AWBaseTool explicit ownership. Closing a GUI releases its observers/readers only. Closing the base retires the delay graph, AWParams, buffers and adopted FX set. Persistent owned objects use container lifetimes so NodeManager does not discard them based on `Object.isPlaying`.

## Controls and console

`t[track].p[name]` is a convenience dictionary referring to the actual AWParams. Delay aliases include `inOf`, `fbOf`, `fxOf`, `sliOf` and named source routes. Delay Bus's `fader`, the rack level control and native delay Master control change the same AWParam baseline. Existing mappings stay connected when these values change. Each cell has an expandable AWParam drawer exposing base, amount, effective value and registered sources.

The preserved pedal channel/CC metadata is available through the semantic controls. MIDI input must be explicitly selected and attached, for example `base.t[\b1].attachMidi(\fxOf, ~fcb)`. Opening the GUI initializes no MIDI device and restores no Bitwig remote-output banks. Legacy delay blender/envelope/tap aliases and unsupported FX controls remain visibly unbound until their replacement behaviour is implemented. Per-head controls still use the native graph's named literal controls.

`base.log(message, level)` sends bounded history plus deltas to the console. The view's Pause and Clear affect this viewer only; old AWBase logging is not automatically intercepted.

Local AWParam edits paint on the next display frame. Observed control values use the sparse shell control bridge. Delay configuration travels on connection/recovery and as changed fields, with a heartbeat rather than configuration polling. The four stereo waveforms share one network backend and existing 20 Hz observation feed. Owner loss disables the borrowed connection and detaches all eight native readers.

## Verification and next gate

The actual first-pass FX set, delay graph, rack and Electron surface were verified together: **26 SC/audio assertions, 11 bridge assertions, 8 real GUI assertions, 23 focused Node tests and 15 SC contracts passed**. This includes independent input routing, mute behaviour, one aggregate sum, preserved modulation through GUI edits, rhythmic metadata on reopen and clean ownership teardown.

Hardware output was muted and signals were captured inside SC. Physical-input audition, extended dropouts and CPU/headroom with GUI and scope bridge remain the next test gate. This is functional readiness, not a performance result. See [shared-host verification](docs/shared-host-audio.md) and `verification.json` for settings, evidence and remaining work.

![Actual shared-host composite](docs/shared-host-verification/composite.png)

The four borrowed tape views now use the compact gig renderer from SuperCollider commit `c4ee528`. Timing and transport are overlaid on the tape; extra settings live in its expandable panel. Heads/sends and shared routing retain their existing views. This is a renderer update only, with the existing shared SC graph and AWParam bindings retained.

## Compact performance layout

The composite is resizable. Its normal rack view shows all thirteen source columns and 21 active destinations without numeric readouts; channel levels remain horizontal at the bottom. Reserved FX rows are hidden during performance. Larger chain knobs follow the o-s-c layout, and mix triggers/capture controls remain visible beside the rack. Mix editing exposes decimal SC amounts plus per-target timing and alignment, including reserved sends. A dedicated Delay Bus fader controls the aggregate delay channel. FX returns stay at unity; each chain has only its envelope amount fader. Its single bar reads the existing post-amount detector bus through the shared native control reader at 15 Hz. Recompile SC and reopen the set/surface to load the meter registrations.

Use **Mixes → Load set** to replace only the named mix collection, including the imported o-s-c library. It leaves live values, routing and arming unchanged. **Save set** exports a portable JSON collection; the Node rack runtime persists the selected collection in its existing library. SuperCollider owns the live audio graph.

See [GUI verification](docs/gui-tidy-20261008/README.md) for the tested sizes and fixture boundary. The legacy delay LFO/offset DSP behaviour is outside this layout pass; delay parameter controls belong in the module views.

Delay Bus is immediately right of the delay cells, followed by the set list and matrix. The mix panel includes a scene-transition countdown/progress bar and a manually started set stopwatch (Start/Pause/Reset), matching the separate stopwatch control in o-s-c. Clocks belong to the Node rack runtime and recover on reconnect; their display updates locally at 8 Hz without OSC or telemetry polling. The AWBase console remains visible beneath the delay cells, with bounded log history and viewer-only Pause/Clear.

After recompiling the changed SC classes, close the old set with `~awbLiveClose.value;`. If the running server has fewer than six hardware inputs, quit it and wait for shutdown before loading the opener; it will boot the required input capacity. Existing complete older sets without Mic must be closed before reopening.

## FX-return sends

Five additional matrix source columns — Mast, Fuzz, Deci, Sparkle and Verb — expose their processed returns to every FX destination (including themselves) and all sixteen control sends. There are now **thirteen source columns** and twenty-four allocated destinations (twenty-one shown in performance). New sends start at zero. These branches tap the slot return before any shared UM/Scheps processing; existing main-output paths remain in place at unity. Return-row level/mute/solo govern the additional sends, not the existing direct return path. A slot’s ENV fader still controls detector amount.

Every FX-return send reads the previous audio block (256 samples = 5.80 ms at 44.1 kHz), so cross-sends and self-feedback have deterministic timing independent of FX slot order. Retiring generations contribute to the same stable tap; replacing a processor retains its routes. Feedback gain can build up, so audition self-sends starting low. This adds five persistent channel synths; the earlier CPU/headroom results have not been rerun with these new columns.

The reusable rack configuration enables a return source with `(id:"fx-verb", returnOf: \verb)`. The standard rack without these entries retains its original graph. See [layout and routing verification](docs/gui-tidy-20261008/README.md) for the offline audio and current GUI checks.
