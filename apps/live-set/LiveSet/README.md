# Editable LiveSet migration

Open `Open.scd`, or use AWB Toolkit → AWB Live Set → Start live set (no IDE).
The shell opener chooses this migration folder on the external volume, falling
back to the versioned `apps/live-set/LiveSet` mirror if it is unavailable.
Recompile after class changes. A running server with different settings is
reported rather than stopped automatically.

## Files and ownership

- `BaseLaunch with efKR.scd`: hardware, physical inputs, plugins and normalized
  plugin values, convolution files/caps, selector tables, initial routes, delay
  defaults and tapehead motion, follower/blender definitions, MIDI and remote
  banks. Edit musical configuration here.
- `ParamValues.scd`: named delay/modulation/routing presets, retaining their
  original dictionaries and callable shape.
- `scenes [template].scd`: local scene definitions; no scene launches on boot.
- `patterns.scd`, `synths.scd`, `autobuffers.scd`: original musical assets. Loading
  these remains opt-in via `~awbLoadMusicalAssets`. AutoBuffer and the original
  instruments still require their external classes/assets; these have not been
  integrated or auditioned as part of the rack migration.
- `Open.scd`: one-line folder opener. Technical boot/allocation/cleanup lives in
  `AWBLiveSet`, `AWBaseTool`, `AWBLiveControlGraph` and `AWBDelayRack`.

Use `b` for musical access: `b.rack`, `b.containers`, `b.chains`, `b.delays`,
`b.inputFor(\patterns)`, `b.fxMix(\verb)` and `b.clock`. The startup coordinator
keeps the rack/FX implementation private. Closing `b` also closes the coordinator.

`b` / `~liveBase` is the owning AWBaseTool. `~verb`, `~fuzz`, `~deci`, `~spark`,
`~mast` and each delay are convenience namespaces. Their `.p` dictionary borrows
existing AWParams, including their envelope fader. The delay namespaces retain
an AWBDelayTrack subclass for loop/tapehead helpers. Rack and shared UM/Scheps
chain resources belong to the root ToolInstance. Closing a viewer preserves DSP;
`~awbLiveClose.value` closes the set through the shell opener; `~awbSet.close`
also works after opening this folder directly.

## Current behavior

MOTU 1248: 44.1 kHz, SC block 256, hardware 512, four outputs, six input channels,
256 MiB real-time pool, 4096 nodes and two VST DSP workers. VC is input 0, Mic 1,
and Pro 2 inputs 4/5. Earth/Composite/Echo convolution caps are 5/30/20 seconds,
FFT 4096. No benchmark reserve or scopes start on launch.

Manual audio/control faders reach +6 dB. Their MIDI ranges stop at unity.
Continuous MIDI pickup flashes amber at threshold and holds for one second.
At hold-end it captures the offset between the held value and the controller's
current position. Control then becomes live minus that fixed offset, which fades
linearly to zero over 0.5 seconds. Moving back never cancels takeover. BaseLaunch
exposes `~awbPickupWait` and `~awbPickupFade`. Choice controls stay discrete.
Recompile and reopen the set for this language change.

Send knobs stop at unity. Delay Bus gates cello availability to all delay VC
inputs, with no additional block delay. Each delay has its own explicit output
sends; Delay Bus does not collect playback returns.

The control graph reuses 25 rack followers, adds three instrument followers and
42 blenders, and connects 57 registered modulation routes, including 24 tapehead
routes. Modulation connections explicitly use previous-block timing. Startup
checks the actual server node order and rejects missing/failed routes.

Tapehead amount modulation slowly erodes individual levels. Position modulation
moves heads 2 and 4 off their grids. A/B/AB/weighted-AB modes are independent of
quarter-grid/pairs/full position choices. The original Lua has no action for
position choice 3: it leaves the current positions intact. Timing slider mapping
is a first-pass approximation, capped at 32 seconds; original external tap/reverse
and envelope-wrapper controls remain unavailable.

## MIDI, scenes and Bitwig

Pedal device/port and all available CC mappings are in BaseLaunch. Pickup reads
the unmodulated base, leaving internal modulation connected. Delay choice CCs
map 0–127 onto the original integer choices. Preset note mappings 66–80 are
retained from ParamValues; scene mappings are separate.

Scene starts from MIDI and the shell share one SC transition lock. New starts
are rejected until both the scene action and its transition interval finish.
Only dummy silent scenes were used in verification; existing scenes were never
launched. The original transition.js maps notes 81–89 to scenes 1–9, and note
90 to scene 0. BaseLaunch now uses that map, accepts any channel, and restricts
scene notes to the configured FCB source UID. Set `~awbSceneNotes = nil` to disable.
The supplied scene template defines only scenes 0 and 1; other scenes still need
musical definitions. The original OSC transition algorithm was not copied.
The extended silent regression crashed in sclang's native backtrace builder on
an unknown-scene exception. Expected missing-scene/busy replies now avoid creating
that exception; this change and the full note/source matrix await runtime retesting.

Set `~awbSet.backend = \bitwig` at launch to enable the optional IAC Bus 4
remote-control adapter. Eight-slot controls/mods/routing banks and the original
track channels are retained, referring to the existing parameters and signal
buses. Values are sampled at the configured rate, quantized, and emitted only
when changed. SC mode does not start this reader. The adapter was verified with
a recording MIDI sink, not against Bitwig. This is control-output compatibility;
it is not a reconstruction of the old Bitwig audio/OSC host or absent effects.

## Verified and remaining

Private actual-engine checks cover startup, complete modulation registration,
MIDI endpoints and pickup, delay choices/helpers, fader ranges, scene locking,
remote bank addresses/change suppression and shutdown. The earlier actual language UDP
bridge passed 16 logging/scene/parameter assertions. The extended regression is
not yet passing; see the crash and retest note above. Focused Node regressions
and Core offline audio/protocol checks pass. No CPU headroom conclusion is made
for this new structure; physical-input/plugin audition and full musical scenes
remain user rehearsal work.

The envelope matrix passes all 5,110 checks, including detector/fader isolation,
all 42 blender combinations, 33 intended output routes, signed/zero amounts,
curves/clipping, selector interpolation, actual Verb ingress gain/taper, all 24
tapehead routes, the seven original delay-envelope presets, and actual readback
of 39 VST mappings at two source levels. A further 60 Deci envelope/LFO checks
pass. Both final runners are clean. The public Deci depth/folding AWParams now
carry their envelopes; the profile adds the remaining captured LFO terms.

The blender live-setter constructor and negative Deci modulation faults found
by this matrix are fixed. An intermittent VSTPlugin startup diagnostic
(`PluginBridge::pollUIThread: plugin N doesn't exist (anymore)`) occurred in earlier
runs and remains unexplained. It was absent in the full matrix and final LFO probe;
this is not a claim that it is fixed. Splutter/Mast EQ outputs remain
unavailable. Cello Stutter now has a native first-pass gain/pan chopper. Intermediate signals are preserved, without invented native outputs.
See `apps/live-set/docs/class-migration-20261008` for logs and reproduction commands.

Run the silent engine regression explicitly (it reserves the MOTU and starts
only its private test server; no original scene actions run):

```sh
python3 apps/live-set/sc/test/migration.py
```

Original files on the external volume are retained in `SourceArchive` as inert
`.scd.txt` copies. The repository mirror contains the migrated editable files.

Cello Stutter is after Scheps and before the rack: its sends and Delay Bus all receive the processed cello. `~vcfx.p[\stut1AMT]` is the amount (0..1), `stutWave` selects Tri/Pulse/Sine/Saw/Custom (0..4), and `stutRate` is Hz. The shell has the same amount, waveform and rate controls; FCB channel 4 / CC17 retains its pickup mapping. `f_stut_vc` supplies rate modulation through a registered AWParam input. Amount zero leaves both gain and pan at exact unity.

Edit `~awbSet.stutter((...))` in BaseLaunch for pulse width, attenuation depth, pan and custom shape. The four soundbath Stutter edits and ParamValues resets are active again. Rate 4 Hz and slow pan 0.1 Hz are provisional: the capture lacks those settings and the Polynom curve. This native chopper is usable, but is not an exact reproduction of that uncaptured network. Recompile and close/relaunch the set to install it.

Faders now span exact silence to unity (0 dB), with a continuous audio taper and a unity tick. Positive headroom is disabled. Delay Input/FX/Feedback/Time widgets expose the full AWParam: offset and modulation amount edit independently, and the readout shows effective output. Dry has no assigned envelope. Recompile and close/relaunch after installing these class changes.

### Pickup and saved mixes

Threshold pickup remains on; `~awbPickupWait = 0` and `~awbPickupFade = 0` currently bypass the soft warning/fade only. A pedal must reach or cross the existing value before it controls the parameter. The pickup GUI notification exception is fixed; recompile and relaunch the set.

Load set lists the saved o-s-c collections, including config, jailhouse, INEFFIBLEED and the blank template. Selecting a collection loads mix targets into the current rack without changing current levels or launching scenes. Browse can load other JSON collections. Imports persist under this rack's libraryID. Send knobs now have an audio taper (same gain curve as the faders); fully clockwise is unity.

AWParam base changes now have 0.5-second server-side lag after their envelope,
before modulation. It also applies to scene ramps. Set a parameter's
`baseSmoothing = 0` to disable it. Amount/follower timing is unchanged.
Recompile the class library and close/relaunch the set to load the processor.
