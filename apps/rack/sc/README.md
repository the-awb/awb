# Native SC send rack

`AWBSendRackTool : Tool` uses the existing AWB framework. `AWBSendRackTool.open` returns a real `ToolInstance`, registered with `ToolLauncher`; that instance owns the groups/synths and projects them through `NodeManager`. The rack's `.gui` opens the existing Rack tool in the normal AWB Electron Shell, bound to this instance. Its standard Shell launch context carries the actual ToolInstance ID and owning sclang PID, and the manifest declares the sendRack NodeManager binding. No Param intermediary.

This implementation is now bundled in `/Users/willy/awb/apps/rack` on `integration/bw-sc`. It does not install classes or change the live set, Bitwig extension, SC device settings or default class path.

## Use

Load `sc/classes` alongside the real Tool/ToolInstance/NodeManager classes and recompile your chosen SC class library. The framework currently lives in awbCollider's `classes WIP`; don't copy a second version into Extensions. The test runner below loads exact copies in a temporary configuration, so testing does not require an installation.

With your selected server already booted:

```supercollider
~rackInstance = AWBSendRackTool.open((
    libraryID: "my-set", width: 2,
    channels: [\drums, \texture],
    fixedFX: [\splut, \spark, \deci, \fuzz, \verb, \mast],
    dynamicFX: 3, fixedFollowers: [\env1], spareFollowers: 3
), (server: s));
~rack = ~rackInstance.tool;
~rack.gui; // waits for graph readiness when called immediately
```

The shell root defaults to `~/awb`; override `shellRoot` if needed. `libraryID` is durable; the ToolInstance identity is temporary. Distinct racks need distinct library IDs if they should keep separate mixes. The GUI starts disarmed: click Enable output to audition edits or assign processors. Closing the view leaves the SC rack running; `~rackInstance.close` closes its owned Shell process and audio graph.

See [examples/basic.scd](examples/basic.scd) for persistent channels, a custom FX group, a direct grain wrapper and a pattern.

## Routing

```
sourceGroup → persistent channel input → level/mute/solo → sends ─┐
sourceGroup → one-shot voice with its own gains → sends ─────────┤
                                                              ↓
stable FX pipe → gated generation input → processor group → return → master
stable follower pipe → envelope processor → stable control output
```

All send gains start at zero. `mast` is an explicit clean destination containing a pass-through processor; it isn't an automatic dry route. Override `cleanSlot` with another fixed FX ID, or `false` to start every FX slot empty. Gains and faders use linear amplitude, default range 0–4. Mono/stereo conversion must be explicit; each rack has one width.

Persistent sources must run before the channel strips. Use `rack.sourceGroup` and `rack.inputFor(channelID)`. `rack.postFor(channelID)` exposes the sounding post-fader/mute/solo signal for recording. Fader, mute and solo affect every channel send, including follower sends. Direct voices bypass channel mute/solo unless deliberately routed into a channel input.

`prepareVoice(id, sourceFunction)` prepares the full-capacity wrapper. Source functions return audio, without calling Out. `prepareVariant(id, [slotIDs])` prepares a smaller wrapper with only those writers. Preparation sends SynthDefs; wait for `s.sync` before notes. `playVoice` and the `awbSendVoice` Event type use prepared graphs only. Profile omissions/nulls become zero; unknown/out-of-mask destinations are rejected. Explicit same-server private Bus overrides are supported. Per-voice gains are initial-rate controls; prepare a different profile for each grain. Ended voices are removed from ToolInstance ownership through node-end notifications.

`registerProcessor(id, factory)` makes an SC function available to the GUI. Factories receive `input`, `output`, `group`, `server`, `settings`, and an owned `synth` helper. Put arbitrary internal processing inside that group and write to its output bus. Prepare/upload custom SynthDefs before assignment. The factory owns its processing decisions; the rack owns the buses, ingress and return.

FX replacements preserve the public bus. A new ingress stays closed until its graph is complete; opening it and closing the old ingress happen in one OSC bundle. Defaults are 20ms fades, six-second retirement timeout and at most two retiring generations per slot. Old output continues to master while its tail decays. A rapid replacement exceeding that budget cuts the oldest generation; long/infinite feedback tails need an explicit policy. Processor latency can still produce an onset gap. Tail buses return to the allocator after graph removal is acknowledged.

Followers reserve stable audio/control buses, including spare slots. `setFollower` supports linear/log/sqrt curves, linear-to-shaped blend, attack/release, scale and dB floor. Removing a follower resets its control bus to zero. It reads In.ar from the private send bus. Audio producers precede followers; later control consumers may use the previous block's valid value.

## GUI and mixes

Both existing renderers consume the same native matrix. Sends remain compact vertical channel strips, with the larger horizontal level bank below for FX returns and channel faders. Mute/solo are stepped 0/1 controls. The SC routing panel assigns registered FX and configures spare followers.

Existing full/selected snapshots, inline timing/alignment fields and keyboard navigation work with SC gains. Amount edits audition live when armed. Null mix targets preserve the existing value; zero explicitly clears it. The local JSON mix library is associated with your compositional SC scene IDs. It does not define Bitwig scenes or launch SC compositions.

Outgoing Node OSC now uses the shared Shell batching sender. The runtime submits
its retained 16 ms control flush together; a 2 ms transport window packs commands
into immediate bundles capped at 1,200 bytes. Scalar messages and revision fences
are unchanged, so loaded SC rack classes need no protocol migration. Existing
large individual messages stay intact. Send-all uses the same batching path.
The general sender preserves every command; latest-value deduplication remains
in the rack. Message/packet/bundle counts are exposed as `oscOutput` in runtime
state. Bundling does not yet consolidate SC's per-send gain-array writes.

OSC commands carry the exact ToolInstance identity. SC publishes changed controls at
most once per 33 ms, coalescing repeated changes to the latest value. Both renderers
receive per-control store updates; the React rack structure stays mounted. GUI echoes
are filtered so a delayed acknowledgement cannot rewind a newer gesture or interrupt
its own mix transition. A language-side edit takes over only that control from an
active transition. Revision-fenced writes prevent already queued GUI changes from
overwriting that newer SC edit. Native scalar OSC commands append the observed
SC revision after the value. Older SC rack classes fail attach with an explicit
recompile instruction.

Attach, explicit Sync, processor changes and missing/incomplete feedback batches fetch
complete state. A three-second heartbeat checks the subscription/revision; it does not
poll individual values. A missed batch or revision gap triggers resync, and a closed
ToolInstance or failed connection disarms output. Up to eight feedback subscribers
have twelve-second leases; shutdown unsubscribes. Sync and feedback reflect SC's
commanded rack values, not audio modulation or Bitwig state. An SC error disarms output. The loopback instance binding separates racks; it is not an authentication boundary against other local processes.

Native libraries live in `.rack-sc-libraries/rack-library-sc-<libraryID>.json`. Each instance uses a separate Shell profile under `.rack-sc-user-data/<languagePID>-<instanceID>`. A library lock prevents concurrent writers; locks belonging to an exited process recover on the next open. Existing legacy `rack-library.json` is untouched.

Topology is fixed during a ToolInstance. Change channel IDs/counts or slot capacity in the next rack configuration; assign/clear processors inside reserved slots during performance. SC-mode imports must match this topology and library ID; temporary receiver IDs/ports are rebound to the current ToolInstance. Legacy sheet-format FX/level amounts import as amplitude directly; unavailable old bus mappings are reported as skipped. Old 0–127 libraries are not automatically converted. Sheet import preserves its numeric amount as amplitude; it is not a calibrated conversion of Bitwig fader/send curves.

## Verify

From `apps/rack`, with Node 22 first in PATH:

```sh
python3 sc/test/run.py --gui --shell
```

The runner creates a temporary SC class configuration containing core classes, the rack classes, exact copies of 21 real AWB dependency files and a private copy of the existing EnvDetect3 extension, with hashes/provenance. It runs native contracts, offline scsynth renders, Node tests, the real OSC bridge, both renderers and the ordinary Shell preload/runtime/file-grant boundary. No audio device is opened. Logs, float WAVs, JSON results and screenshots stay in the printed evidence directory.

Set `AWB_COLLIDER_ROOT`, `SUPERCOLLIDER_APP` or `AWB_NODE` for other locations. `npm test` runs the ordinary Node tests; the actual sclang bridge test is enabled by the isolated runner. Tests require macOS SuperCollider/Electron for this first implementation.

## First-pass boundaries

Audio recording exposes a post-channel bus tap; an audio recorder UI is still to be connected. ToolInstance supplies ownership/session recording, while detailed mix-command journal/replay needs its own adapter. Preset promotion and sparse SC `applyMix` are available. Node handles timed transitions; autonomous timed SC mix recall is not implemented yet.

The Node view launches from `rack.gui` and uses the standard Shell stack. The current framework's GUI factory contract requires Qt ToolInstanceControls; this view doesn't pretend to be a Qt ToolGUI or embed in Qt. Generic Shell host-directory launch/discovery for this rack is a follow-up; the actual ToolInstance and NodeManager ownership are already native.

The first graph routes channels/direct voices into independent FX/followers and FX returns into master. It doesn't generate an FX-to-FX dependency graph, feedback compensation or automatic FX-return channel strips. Custom cross-slot audio processing must respect SC node order. Processor failure inside a user-defined realtime SynthDef isn't automatically diagnosed by the GUI.

Hardware routing and your real-set migration have not been exercised by the offline tests. Realtime bus release and voice cleanup use normal server acknowledgement/node-end paths; the isolated contract suite also checks their language-side lifecycle behavior.

## Shell integration verification — 4 October 2026

The workspace uses ToolInstance identity and defaults `.gui` to the shared AWB shell.
Legacy standalone/Bitwig-preview libraries and native SC libraries remain separate.
Load this workspace's `sc/classes` alongside the existing AWB framework in the SC
language configuration you intend to use; recompilation is required before the new
classes are available. Testing uses private class paths rather than modifying them.

The integrated slice passes 47 SC routing/ownership contracts, 88 offline audio
assertions and 28 Node tests. Actual sclang verifies language-side values and
processor changes arriving without explicit Sync, 101 writes coalescing to one value,
no OSC echo, sparse recall, persistence, close/disarm and identity separation. Protocol
tests cover out-of-order packets, incomplete batches and heartbeat expiry. Both actual
Electron renderers show SC-originated changes with zero React app/rack renders. The
normal Shell gate verifies exact ToolInstance/owner identity and native import/export.
Its unchanged render-worker build was supplied from the shared checkout.

Evidence: `/private/tmp/awb-rack-feedback-shared-20261004`. GUI/OSC checks use
stubbed server dispatch; offline DSP checks render real audio separately. No hardware
audio or integrated live CPU measurement was run. Step 0 remains the quiet-window
Instruments investigation.

## Control sends and independent envelopes — 5 October 2026

Each control send now has an audio input bus, a separate stable KR measurement
bus, and a shared **amount fader** in the rack's “Control send amounts” panel.
The fader uses 0–1 for 0–100%. It scales the detector output before independent
followers read it; it does not adjust audio output or replace the per-instrument
send knobs. Both HTML/SVG and Three.js use the existing isolated control-store
updates and batched OSC output. Amounts participate in full/selected snapshots,
sparse recalls, SC-origin feedback, revision fencing and explicit Sync.

The new path is:

`channel / direct voice audio → control-send audio bus → Peak detector → amount → stable KR bus → independent followers`

The detector uses `Amplitude.kr`, with the settings confirmed by the user:
+14.4 dB, rise 5.62 ms, fall 23.4 ms. Stereo inputs use the mean of rectified
channels; sources on each audio channel sum before rectification. RMS mode is
rejected. Measurement retains headroom rather than normalizing or clipping it.
These are the captured Bitwig settings applied to an SC detector, **not a proven
sample-for-sample Bitwig detector clone**. Bitwig stereo linking, time-constant
interpretation and the upstream Gate/Compressor transfer remain uncalibrated.
The screenshot's Amount maps to the control channel level; its old Bitwig fader
was retained as a visual cue, with no audio output destination.

```supercollider
~instance = AWBSendRackTool.open(AWBControlSendProfile.configure((
    libraryID: "my-control-set", channels: [\vc, \pro2],
    fixedFX: [\verb, \deci, \spark, \fuzz, \mast], dynamicFX: 3,
    spareFollowers: 3
)), (server: s));
~rack = ~instance.tool;
~rack.whenReady({ |rack|
    AWBControlSendProfile.install(rack);
    // Explicit audio routing: FX names do not imply FX-return observation.
    rack.setSend(\vc, \c1, 1);
    rack.setControlAmount(\c1, 0.5);
    rack.gui;
});
// Inside a later SynthDef, map a control with rack.followerFor(\c1, \short).
```

The opt-in profile replaces `fixedFollowers` with sixteen fixed control sends:
C1–C4 plus twelve named modulation pipes, separate from the FX destinations.
It installs 25 independent envelopes copied from the active statements in
`BaseLaunch with efKR.scd`: three time scales for each C send and the named FX
followers. The commented alternative presets are excluded. Amounts start at
100%; audio send gains remain zero until routed explicitly. Spare sends remain
unassigned and do not create detector DSP. The profile is not automatically
added to the historical AWB 5.2 dropout fixture.

`setDetector(id, settings)` activates/edits measurement; `measurementFor(id)`
returns the raw KR bus. Existing AWFollower instances can read that bus, provided
their nodes run after the rack detector group. The rack-owned alternative is
`setControlFollower(sendID, followerID, settings)` and
`followerFor(sendID, followerID)`. It uses the existing `EnvDetect3.kr` and the
actual AWFollower linear/square-root blend. It does not call that blend logarithmic,
clip its output or require Param/MIDI. Settings edits preserve the DSP node and
envelope state. Multiple followers share one measurement but own separate outputs.
All new DSP nodes and buses belong to the rack ToolInstance / NodeManager.

`clearControlFollower` zeros and retains its output address for reassignment;
`clearDetector` zeros the shared source and lets remaining follower tails decay.
Rack close removes the graph, zeros owned KR outputs and waits for server
acknowledgement before releasing addresses. The existing `setFollower` / curve
GUI remains the earlier single-follower audio detector/shaper API; it is separate
from the new independent envelope bank. Full GUI editing of detector and named
consumer settings is still to be added; detector status and amount faders are visible.

Validation: 68 native SC contracts, 88 existing audio assertions, 17 new real DSP
assertions, 31 Node tests, both real Electron renderer checks and the normal Shell
check pass in `/private/tmp/awb-control-sends-20261005-complete`. The new checks cover
cancellation before detection, independent envelopes, amount zero/half scale,
stable outputs across reassignment, cleanup and an exact EnvDetect3 reference
comparison. Both GUI views send amount-fader values to SC and the full snapshot
contains them. No audio device was opened; integrated live DSP/dropout cost and
Bitwig detector-response calibration remain unrun.

The exact BaseLaunch input mapping is exposed by
`AWBControlSendProfile.baseLaunchBuses(rack)` as a dictionary of stable KR Bus
objects. Its sixteen keys are `ef_m0`–`ef_m3` (C1–C4), `ef_b1`, `ef_b2`,
`ef_a1`, `ef_a2`, `ef_splut`, `ef_spark`, `ef_deci`, `ef_fuzz`, `ef_verb`,
`ef_mast0` (Mast), `ef_mast1` (UM), and `ef_mast2` (Stutter). It does not overwrite
the live AWBase dictionary or its existing OSC receiver objects.

The first-pass set example now enables this bank with `controlSends: true`.
That option defaults to no additional spare control sends, giving eight FX
slots plus sixteen control slots: **24 audio destinations per channel**.
Set `controlSpareCount` explicitly if more slots are wanted. The historical
fixture without `controlSends` retains its earlier three spare follower slots.

Each control slot has Pause/Resume in the routing panel, backed by
`rack.setControlSendEnabled(id, false/true)`. Pausing stops its detector and all
owned envelopes, zeros their KR outputs, retains their state/addresses, and
leaves the amount setting unchanged. Resume continues the retained state.
A zero amount alone does not pause DSP: downstream release tails still run.
The channel's audio writer to that pipe remains part of its fixed SynthDef;
reducing writer cost requires a smaller topology or wrapper variant.

For the cost comparison, `sc/sets/awb52/run.py --measure-controls --quiet-window`
creates an owned, muted server and measures eight persistent stereo input strips
with 8 versus 24 audio writers, then detector and envelope overhead independently.
It uses the actual FX/IRs by default, never runs alongside an intentionally active
Bitwig engine, and keeps the sources/FX sounding internally while replacing only
the channel strips at the same node positions. This is separate from a per-voice
24-port wrapper comparison. Direct voices can still choose packed variants.


## Measured cost: 8 versus 24 destinations — 5 October 2026

Eight persistent stereo channel strips and eight synthetic sources, with all
five active FX chains fully wet, nine VST instances and six PartConv processors.
Actual IRs are capped at 30 seconds. 44.1 kHz, SC blocks 64, driver frames 512,
four hardware outputs, 256 MiB RT pool. Hardware output muted; GUI and bridge off.
Bitwig was closed with user agreement before booting the owned test server.

| Condition | Mean SC average CPU | Maximum SC peak CPU |
| --- | ---: | ---: |
| 8 audio writers per channel; control DSP paused | 47.88% | 87.39% |
| 24 audio writers per channel; control DSP paused | 48.22% | 88.41% |
| 24 writers plus 16 Peak detectors | 49.42% | 98.76% |
| 24 writers plus 16 detectors and 25 KR followers | 49.58% | 90.19% |

Each condition has two 8-second sample windows after 3 seconds of settling,
first in forward then reverse order. Only the channel strips change for the
8-versus-24 case; sources and FX stay running at the same node positions.
Extra writers add 512 UGens across the eight strips; paused detector/follower
nodes remain allocated and appear in the server's total node/UGen counts.

Full-bank overhead is +1.71 percentage points, or roughly 3.6% more processing
relative to the 47.88% baseline. The two paired full-bank increments are +1.57
and +1.84 points. The routing-only mean increase is +0.35 points, but the repeat
increments are +1.12 and -0.43: drift is larger than this increment, so its exact
size is unresolved. Detectors and envelope deltas should likewise not be read
as precise component costs from these short windows.

This is a useful first cost marker for **persistent channels**, not a result for
32/64 independent voices each running a full 24-port wrapper. Packed voice
variants still reduce writers when only a few destinations are needed. Highest
SC peak CPU is 98.76% in the detector-only condition; this run did not record
callback deadlines or MOTU return audio, so it cannot establish dropout freedom.
No changes were installed into the live class path. The owned server exited.

Machine-readable result: `control-routing-cost.json`; retained logs/provenance:
`evidence-control-routing-cost/`; raw float audio/score:
`/private/tmp/awb52-control-routing-cost-20261005`.
