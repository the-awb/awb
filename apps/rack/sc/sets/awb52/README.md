# AWB 5.2 — first SC-only slice

Optional prototype around `AWBSendRackTool : Tool`; the existing Rack ToolInstance
owns the graph and standard Shell GUI. It does not add another host or change the
installed SC class library. VC is a mono input duplicated into the stereo rack;
Pro 2 is a separate stereo input. Opt-in Scheps 73 Mono now processes the cello
before its stereo rack input. The updated example also enables actual MDMX Fuzz
Stereo and an independent native UM → Scheps 73 Stereo Chain Tool, with captured
KR modulation profiles. This is separate from full-load mode.

The fixed destinations are Verb, Deci, Spark, Fuzz and explicit clean/Mast. Three
dynamic FX pipes and three spare follower pipes remain available. Destination
buses stay stable when processors change. Mast, Fuzz, Deci and Spark feed the
shared UM → stereo Scheps chain before the limited master; Verb returns directly.
Reserved dynamic slots return directly unless explicitly rerouted.
Current Shell routing/mix editing and its batched, origin-aware SC bridge are
inherited from the Rack Tool. This slice adds no bespoke FX parameter panels.

## Graph and source boundaries

| Destination | First pass |
| --- | --- |
| Deci | Installed `++decimate`, captured parameters and outer gain |
| Spark | Parallel `++spiralstretch` and two `++pitchdelay` instances, then `++delay`, optional tail `++decimate`, then Things Texture |
| Fuzz | Actual MDMX Fuzz Stereo, verified 20-parameter baseline, captured selector/Math profile and separate −5 dB container gain |
| Verb | Three stereo partitioned convolution branches, Things Texture and ValhallaShimmer in parallel |
| Mast | Explicit clean destination feeding the shared chain |
| Shared | ValhallaUberMod → external blend of dry and actual Scheps 73 Stereo; EQ deferred |

The complete example has thirteen plugin instances, including mono cello Scheps,
MDMX Fuzz, UM and stereo Scheps, and six `PartConv` processors, with FFT
size 2048. Convolution now reads the actual files from
`/Volumes/ARMED WITH SOUND/Samples/Convology samples`:

| Branch | Source duration | Used duration | IR channels |
| --- | ---: | ---: | --- |
| Earth / Mulching 1 | 10.5 s | 10.5 s | Stereo |
| Composite Earth b | 21.8182 s | 21.8182 s | Stereo |
| Inchindown / fourth impulse | 74.8637 s | 30 s | Mono, applied independently to both input channels |

Reads start at frame zero and stop at the configurable `irMaxSeconds` cap, without
changing the source files. Stereo sides are preserved. No resampling is performed;
IR sample rates must match the server (these files are all 44.1 kHz). Raw IR gain
is preserved: Bitwig normalization, trims, fades and stereo-width settings are not
yet reproduced. Legacy/full-load mode computes all six processors even at zero
output gain. Opt-in Verb profile mode now suspends each branch after its tail
drains, as described below. Generated 2.5/4/8-second stand-ins remain
available through the runner's `--ir-mode=generated` for the earlier baseline.

`source-snapshot.json` is a bounded copy of the seven observed track records used
by this adapter, retaining the original capture path/hash. The runner uses it by
default; `--snapshot` can explicitly choose another capture. The independent
inspector worktree is not needed to reproduce this set.

`prepared/first-pass.json` retains observed plugin parameters, displays, source
locators, matrix/fader levels and unresolved items. `source-provenance.json`
retains the input capture and plugin-cache hashes plus selected device trees.
Displayed dB values are converted to amplitude for sends/faders; host-normalized
fader values are not interpreted as linear gain. Installed plugin parameter
indices are matched by name, preferring VST2 when both formats are available.
Cross-format state equivalence and hidden plugin state are not established.

The capture is a stopped host-cache observation, not an atomic plugin-state
export. Some normalized/display pairs disagree: the upper pitch delay reports
`wetdry = 0` alongside display `73.5`, for example. Do not treat captured mode as
an exact preset reconstruction. Verb’s twenty Select-4 branch-volume targets are now captured and implemented
in the opt-in profile layer below. Full device states, Deci/Sparkle use the new captured control graph below; proven send destination
edges and hidden-state transfer still have separate reconstruction limits. File hashes and original/used frame counts are retained in `irProvenance`.

## Full-load mode

Use `fullLoad: true` for the requested test configuration. It enables every
parallel branch at unity, sets outer wet mixes and tail mix to 100%, sets plugin
`wetdry`/`wetDry`/`Mix` parameters to normalized 1, and sets explicit `Bypass`
parameters to 0. Other plugin parameters and captured output gains stay intact;
each return and the master retain limiting. This is the full active graph of
this prototype with the chosen IR cap, not a proven upper bound for the original set or longer IRs.

The source snapshot is copied and remains unchanged by overrides. With fullLoad
off, audition mode defaults on: legacy Deci wet is opened and Verb's captured -Inf input
Tool is opened. For the literal observed static values use both
`fullLoad: false, audition: false`; the unresolved capture limitations still apply.

## Use

Add this folder to a chosen SC configuration alongside the actual AWB framework,
`apps/rack/sc/classes`, `apps/core/sc/classes`, `apps/chain/sc/classes`
and VSTPlugin classes, then recompile that configuration.
The class stays outside the default rack classes so ordinary rack tests do not
acquire a VSTPlugin dependency. No live configuration installation is performed.

Set the real-time pool before server boot: 256 MiB (`memSize = 262144`) for the real-IR mode. Generated stand-ins retain the earlier 128 MiB minimum. This is separate from Buffer
memory and is not an overall RAM limit. The helper never boots/reboots the server
or sets the audio device. See `example.scd`; open after boot, wait for readiness,
then connect explicitly chosen zero-based hardware input indices. Actual VC/Pro 2
MOTU port numbers have not been verified.

`set.gui` opens the standard Shell Rack. `set.rack` is the native Tool;
`set.instance` is its ToolInstance. `setEffect(slot, key, value)` validates native
FX controls, and `plugin(role)` exposes the original VSTPluginController for
direct SC/pattern use. Dynamic plugin clones use `plugin(role, slot)` and keep
separate controller identities. Their opening is asynchronous; replacement is
not yet gated until a newly loaded plugin is ready, so allow setup time and test
onsets before relying on hot-swapping during a performance. Closing the native
instance also closes the adapter and frees its generated IR assets/buffers.

## Reproduce validation

Offline only; no audio device, Electron window or live class configuration change:

```sh
python3 /Users/willy/awb/apps/rack/sc/sets/awb52/run.py \
  --output /private/tmp/awb52-FRESH
```

The runner copies actual framework/rack classes into a fresh private library,
regenerates the read-only projection with actual IR files capped at 30 seconds, renders all selected original plugin
processors and verifies routing, finite audio, mute/solo, tails, stable-pipe
replacement and complete silence after close. It preserves the installed VST
cache. A pre-existing invalid FL Studio cache entry is retained and reported as a
warning; any other server/plugin error fails validation.

A live CPU reading is opt-in and requires an agreed clear machine:

```sh
python3 /Users/willy/awb/apps/rack/sc/sets/awb52/run.py \
  --output /private/tmp/awb52-LIVE-FRESH --live-cpu --quiet-window
```

This boots one owned server at 44.1 kHz, four outputs, three inputs, 64-frame SC
blocks, requested 512 hardware frames and a 256 MiB pool. Hardware output is muted
while the full internal graph processes synthetic input. It takes an idle reading
and two silent/active graph repeats. The GUI stays closed. `avgCPU` is SC's DSP
load percentage, not total machine CPU. It does not record a MOTU return or audit
callback faults and cannot establish dropout safety. See `validation.json` for
the current focused results and short prototype CPU readings. The earlier generated-IR baseline is retained separately in `validation.json` and `evidence`; the actual-file repeat is in `real-ir-30s-validation.json` and `evidence-real-ir-30s`.

To change only the convolution duration limit:

```sh
python3 /Users/willy/awb/apps/rack/sc/sets/awb52/run.py \
  --ir-max-seconds=20 --output /private/tmp/awb52-IR20-FRESH
```

Set `--ir-max-seconds=180` to allow all three complete source files, or
`--ir-mode=generated` to reproduce the original short-IR baseline. The configured
cap is bounded to 180 seconds. The old generated benchmark is historical evidence;
its 22.8% DSP reading must not be presented as the real-IR result.

Inchindown source: acs272, Freesound sound 214216, Creative Commons Attribution
3.0, as recorded in the local pack's `_readme_and_license.txt`. Original audio is
referenced on disk, not copied into this repository.

## Measured dropout result

The real-IR graph now has an output-callback audit and independent MOTU return
capture: three steady 60-second windows are clean at 45.37–46.14% average SC DSP
and 82.13–84.67% reported peak. One startup callback overruns during asynchronous
plugin loading (20.35 ms against an 11.61 ms period), with a skipped output interval
and a corresponding return discontinuity episode. IR preparation itself is clean
in this boot. Peak steady callbacks occur well after source creation. See
[`dropout-real-ir-30s.md`](dropout-real-ir-30s.md) for timings, the tested boundary
and the opt-in `dropout-run.mjs --run --quiet-window` reproduction command. The GUI
and data bridge stay off in this DSP-only test.


## BaseLaunch control-send bank

`example.scd` now opts into `controlSends: true`: C1–C4, B1/B2/A1/A2,
Splutter, Sparkle, Deci, Fuzz, Verb, and the separate Mast / UM / Stutter pipes.
These are the sixteen KR inputs read by the active BaseLaunch follower setup.
Every pipe has an audio input, Peak detector, stable KR output and 0–100% amount
fader. Detector settings are +14.4 dB, 5.62 ms rise, 23.4 ms fall; independent
EnvDetect3 envelopes reproduce the active AWFollower presets. Both rack renderers
inherit the new amount controls and pause switches from the standard Rack tool.

The option configures zero spare control slots by default: eight FX destinations
plus sixteen control destinations gives 24 audio writers per channel. Optional
`controlSpareCount` adds explicitly reserved capacity. Audio routes into the
control pipes remain explicit; names do not automatically sample FX returns.
`AWBControlSendProfile.baseLaunchBuses(set.rack)` exposes the original `ef_*` keys.

The historical dropout run did not contain this bank. Offline verification with
it enabled passes 24 first-pass SC contracts and 24 FX/routing audio assertions;
private evidence: `/private/tmp/awb52-control-routing-cost-20261005`.
Use `python3 run.py --control-sends` to repeat offline verification;
`python3 run.py --measure-controls --quiet-window` also performs the owned,
muted live 8-versus-24 writer / detector / envelope comparison. Live results
must be assessed separately from the previous two-input DSP fixture.


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


## Verb selector and mix profiles — 6 October 2026

Enable `verbProfiles: true, fullLoad: false` to use one selector AWParam receiving
an existing follower/blender output, continuous Select-4 weights, and five branch
AWParams. The upstream AWFollower/AWBlender formula is unchanged. Connections
are explicit; this does not rewrite or launch the existing BaseLaunch set.

`verb-profile.json` retains all twenty captured depths with full hierarchical
addresses, line references and the source capture hash. `prepare.py --verb-profile`
projects its configuration into the set specification; the runner does this
by default. `verbMix:` options override the specification for experiments.

| Profile | Earth | Composite | Texture | Shimmer | Inchindown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base normalized value | .495 | 0 | .14 | .14 | 0 |
| S1 depth | .03 | .78 | -.34 | -.42 | .40 |
| S2 depth | -.87 | 1 | .51 | .24 | .31 |
| S3 depth | -.99 | .45 | -.22 | .73 | .92 |
| S4 depth | -1.02 | -.26 | -1 | -.56 | 1.12 |

These are normalized parameter modulation depths, not amplitude gains. Weights
interpolate the depths; each branch adds its base and clips to 0..1, then converts
to amplitude. The current conversion `(2 * normalized)^3` matches the captured
Tool Volume pairs (.5 = 0 dB, .495 = -.3 dB, .14 = -33.2 dB and .11 = -39.5 dB)
to display rounding. This is an inferred compatibility law, not verified Bitwig
DSP equivalence across the complete range. There is no sum-to-one normalization.

Branch Volume and static Tool Gain act **before** each effect: Earth +2.5 dB,
Composite -.4 dB, the other three 0 dB. Convolution wet gains remain on the
returns: 0, -8.4 and -20 dB respectively. Closing a branch input therefore leaves
its convolution/plugin tail running until the branch guard suspends it. Input-level
and overall return controls remain independent. Profile mode reads each branch
AWParam's effective output bus; old `*Level` controls belong to the separate
legacy/full-load mode and do not set the profile.

The current zero-position assumption is configurable and unconfirmed:
`basePole: true` gives the unmodulated base mix at zero and S1–S4 at normalized
positions .25/.5/.75/1. `basePole: false` gives four poles starting with S1 at zero.
Both interpolate adjacent poles continuously. Bitwig’s [Select-4 description](https://www.bitwig.com/userguide/bws44-504/modulator/)
establishes continuous crossfading, but does not establish these exact locations
or the matching kernel. Host/listening comparison remains necessary.

```supercollider
// After opening with verbProfiles: true and waiting for readiness:
~verbMix = ~awb52.verbMix;
~verbMix.selector.setBase(0.5, 2);  // normalized selector position, duration
~verbMix.selector.setAmount(0.4, 1);
~verbMix.selector.setModCurve(-2);

// Existing BaseLaunch b owns the blender. Borrow its output; leave it unchanged.
~blender = b.blenders[\verb_sSC];
~verbMix.addModulation(\verbSC, ~blender.bus);
// Plain Bus attachment assumes the producer runs before this profile.
// For a checked attachment, register its bus + controller in AWModulationRegistry
// and pass that AWModulationSource descriptor instead. The upstream owner survives
// detachment, FX replacement, profile closure and rack closure.

~verbMix.branch(\texture).setBase(0.2, 1);
~verbMix.setProfile(0, [0.03, 0.78, -0.34, -0.42, 0.4]); // S1, branch order above
~verbMix.selector.removeModulation(\verbSC);
```

Internal scheduling is owned and explicit: selector Param → SelectN → per-branch
route writers → branch Params → audio FX. `bindTo` puts the complete profile Group
immediately before its same-parent consumer. Existing borrowed producers are not
moved. Use the registration timing policy when deliberately allowing a previous
block; a plain bus does not establish upstream scheduling. `configuration` stores
target values and the matrix, not live envelope state or the borrowed connection.

Every dynamic Verb generation gets its own profile and control buses. Rack
processor factories now expose `ctx[\onDispose]` for language resources that must
close when their generation finishes its tail. The callback runs once on normal
disposal, construction failure or rack closure. Generation retirement remains
separate from the new per-branch tail gate.

Profile mode and `fullLoad: true` are mutually exclusive, to avoid presenting a
selective profile as the all-branches workload. The existing full-load behaviour
remains the default for the baseline runner. No CPU/dropout result is inferred
from this functional slice. The dedicated profile GUI and legacy MIDI/remote
rewiring remain next steps.

```sh
/usr/bin/python3 apps/rack/sc/sets/awb52/run.py --verb-profiles \
  --control-sends --output /private/tmp/awb52-VERB-FRESH
```

The runner now copies the VST cache into its evidence directory and sets the
plugin-supported `XDG_DATA_HOME` for its child processes. The original cache hash
must remain unchanged. One earlier attempt passed SC contracts and audio but
failed this guard after a cache rewrite; it is retained as a failed attempt in
`/private/tmp/awb52-verb-profile-20261006-b`. The isolated repeat passes in
`/private/tmp/awb52-verb-profile-20261006-c`: 26 set contracts, 24 audio checks,
real IRs capped at 30 seconds, actual installed VST processors, dynamic clone
cleanup, tails and silence after close. No hardware audio or installed class paths
are changed. Existing source snapshot limitations, convolution trims and hidden
plugin-state differences remain.

Final repeats: profile plus all sixteen control-send inputs/envelopes passes
28 set contracts and 24 actual FX/audio assertions in
`/private/tmp/awb52-verb-controls-20261006-final`. Separate all-branches full-load
mode passes 22 set contracts and 24 audio assertions in
`/private/tmp/awb52-verb-legacy-20261006-final`. Both preserve the installed cache.
Profile gain conversion is selected when compiling the per-instance SynthDef,
so profile-disabled mode does not compute unused conversions at runtime.


### Deselect → drain → pause

With `verbProfiles: true`, each of the five branches now has its own processor
Group, wrapped by a reusable `AWFXTailGate`. At **effective mix zero**, input fades
closed over 20 ms, the existing tail continues to return, and the Group pauses
only after both its minimum tail time and 250 ms below -90 dB. An initially
unselected branch pauses immediately. Any positive effective mix cancels draining
or resumes the Group before new input is delivered; the return fades open.
AWParam's base/amount transitions and the upstream follower/blender remain intact.
There is no language polling or OSC stream of pause commands.

Convolution minimums are the complete used IR duration plus two FFT lengths:
about 10.593 / 21.911 / 30.093 seconds at 44.1 kHz. Texture and Shimmer minimums
are 1 and 2 seconds; they must also become quiet. A noisy/nondecaying plugin
therefore stays running by default. `maxTail: 0` means **no forced cut-off**.
Override per-branch policy when opening, for example:

```supercollider
verbTails: (
    texture: (minTail: 1, quietDb: -80, quietHold: 0.5),
    shimmer: (minTail: 2, maxTail: 20), // explicit forced fade/pause at 20 sec
    earth: (enabled: false) // keep this processor running
)
```

`~awb52.verbBranch(\texture)` exposes the guard and its `processorGroup`;
`configuration` returns its tail settings. These are construction settings, not
live GUI controls. Pausing retains processor/plugin state and allocated buffers;
it freezes remaining delay/envelope state rather than resetting/reloading it.
A forced cut-off can consequently retain residual state for the next resume.
The always-running ingress/return guards remain small DSP nodes. Plugin-owned
background threads are outside this pause guarantee; CPU savings still need the
agreed hardware load measurement. The implementation currently covers the five
Verb branches, not internal Spark/Deci/Fuzz selection.

Verification: `/private/tmp/awb-tail-gate-20261006-final` passes 15 tail contracts
and 35 offline DSP checks, alongside 290 existing Core/registration/selector
checks. Processor progress counters prove DSP stops and resumes, beyond merely
checking silence. Tests cover timed AWParam changes, cancellation during draining,
server-driven modulation, initial zero, quiet tails, explicit hard cap, borrowed
buses and cleanup. `/private/tmp/awb52-tail-verb-20261006-verified` exercises actual
convolution/VST routing and independent branch/generation ownership with all 16
control sends: 36 contracts and 24 audio checks pass. Legacy/full-load render
passes 22 contracts and 24 audio checks separately in
`/private/tmp/awb52-tail-legacy-20261006-final`. No real-time audio, CPU/dropout
measurement or live class installation is claimed.


### Restored MDMX Fuzz baseline capture — 6 October 2026

`fuzz-baseline.json` records 20 distinct displayed settings supplied by the user
from the restored MDMX Fuzz Stereo parameter panel. Input is +0.7 dB, Gain -2.1 dB,
Output -3.6 dB, Mix 53.9 and Blend 75.4. Rack/container gain is separately -5 dB,
matching the existing SC `containerGains.fuzz` amplitude of 0.5623413252.
It also retains the four EQ gains and all
visible mode/character settings. The repeated pinned M/S Input row is recorded
once. These are display values, not guessed normalized values or a plugin state
export. The capture is ready for conversion/host validation; the adapter still
uses its native Fuzz approximation until that implementation step.

The current SC plugin cache has no MDMX entry. Next integration must resolve the
restored WaveShell child and its actual parameter identities, then verify every
setting by plugin readback. Display-string setters exist in VSTPlugin, but their
support is plugin-dependent. Existing modulation routes remain separate from
these baseline settings.


### Restored Cello 1 Scheps 73 Mono baseline — 6 October 2026

`scheps73-baseline.json` records 18 distinct displayed settings from four user
screenshots. PreAmp is -45M, Drive Off and PreAmp On. High/Mid/Low sections are
On, with gains +0.3 / +2.9 / 0 dB; Low Frequency is 110 Hz. High Pass is set to
50 Hz but Off. EQ is In, Phase Out, Input +1.7 dB, Output +1.3 dB, Link I/O
Unlinked. The captured Mid Frequency label reads 1.6 Hz; the user identifies the
plugin GUI value 1.6 as likely 1.6 kHz (1600 Hz). That intended frequency is stored
separately; the selector and all normalized settings are now verified below. The repeated pinned PreAmp
row is recorded once. The user confirms all Scheps controls are static, with no
modulation routes. This is a display capture, not normalized values or hidden
plugin state. The optional Scheps input route and actual readback verification
are implemented in the checkpoint below.


## Cello, Deci and Sparkle migration — 6 October 2026

Implemented in `AWBFirstPassSet.sc` and `AWBFXMixProfile.sc`; the standard Rack
ToolInstance still owns the complete graph. `prepared/first-pass.scd` and
`example.scd` now include the verified Scheps baseline and both FX configurations.
No installed SC class paths or Bitwig set files were changed.

**Cello:** mono hardware/voice input → actual Scheps 73 Mono → stereo duplication
→ VC rack channel → its fader and independent audio/control sends. Use
`set.inputFor(\vc)` for a mono source before Scheps; `set.rack.inputFor(\vc)`
is the processed stereo bus and deliberately bypasses the input processor.
Pro 2 remains stereo. All eighteen Scheps settings are static. Normalized values
were verified against the restored WaveShell 17.1 child, including -45M, switches,
EQ In, Phase Out and gains. The middle selector normalized 1/3 returns the same
Waves label “1.6 Hz” seen in Bitwig; the user's intended 1600 Hz is retained
separately rather than inferred from that incorrect display unit.

Waves requires a main-thread native window even with `editor:false`; direct
in-process loading crashed the owned probe. `mode:sandbox` successfully hosts
Scheps in a dedicated VSTPlugin subprocess. `scheps73-plugin.ini` registers only
this verified child in `prepared/waves-cache`, read into the selected server.
The installed plugin cache is preserved. The external host's CPU, waiting and
startup cost must be included in the next load/dropout measurement.

**Deci:** captured four-pole Math-B, mixer and gain profiles, follower × amount,
wet modulation, depth/folding offsets and SC depths, and Lo Rolloff. Its sole LFO
is a free-running bipolar sine, phase zero, base rate 0.04 Hz, base amount zero.
Select-4 supplies amount depths 0 / .175 / .35 / .695. Math3's captured rate factor
is implemented as `0.04 * 2.187^Math3`; its exact Bitwig rate law still needs an
A/B check. Math A inputs `a`, `aDepth` and `aFolding` are independent; they are
never silently coupled. The native crossover/EQ is an approximation of EQ-DJ.

**Sparkle:** no LFO. Three main selector roles remain separate: Select-4 1 profiles
Math amounts plus mixer/gain; Select-4 2 profiles delay/spiral wet/dry; the pitch
selector profiles upper/lower wet/dry. The nested tail-delay selector also
controls feedback, SC feedback depth and envelope modulation. Math multiplies
independent follower inputs by their base + selected amounts. Captured gain,
pitch/octave/cents/feedback/time and tail Decimate routes are applied. Parallel
branches sum; captured subrack gain and wet/dry mixing are retained. Disabled
Sparkle EQ-DJ stages remain omitted. Nothing was replaced with an invented LFO.

Public controls are named AWParams: `set.fxMix(\deci).param(\shape).set(0.5,1)`
and `set.fxMix(\spark).param(\tailMix).set(0.5,1)` accept base transitions.
Each AWParam also retains amount/curve controls and registered modulation inputs.
`profile.addModulation(control,id,source,amount,curve,timing)` borrows existing
AWBase follower/blender outputs. `example.scd` uses actual blender names verified
in `live sets/current live set/BaseLaunch with efKR.scd`, and notes the mismatch
between older comments and current root remote targets. Full BaseLaunch startup,
MIDI takeover assignments and upstream blender construction are not automatically
replaced. Plain buses cannot prove producer order; use registered sources for
checked timing. Rack-owned followers execute after FX, so an FX reading those
outputs intentionally receives the preceding control block.

All continuous modulation runs server-side. Profiles map normalized KR buses
straight to plugin parameters with VSTPlugin `/map`; no language automation
stream is generated. Per-instance profile SynthDefs are installed only on the
selected server before use. Dynamic FX generations own independent profile
Groups, AWParams and buses; disposal releases those while preserving borrowed
sources. `setEffect` forwards exposed wet/level/tailMix edits into those AWParams.
Verb retains its tested per-branch tail/pause policy. Deci/Sparkle branch DSP
pausing has not been added in this pass.

### Remaining reconstruction choices

`fx-modulation-profile.json` preserves hierarchical target addresses, capture
hash and the user's clarifications. Uncaptured Math B and mixer-volume baselines
start at zero and are editable AWParams. Tool volume taper remains inferred as
`(2 * normalized)^3`; selector zero retains the Verb empty-pole policy
(`basePole:false` selects a different four-pole interpretation). Cyclic edges
use explicit previous-block values; Bitwig's evaluation timing is unverified.
The earlier normalized/display discrepancies and hidden plugin state remain.
These are first-pass migration choices, not a claim of audible preset equivalence.
MDMX Fuzz remains the native stand-in, despite the restored child being found.

### Validation

`fx-migration-validation.json` records source hashes and
`/private/tmp/awb52-fx-migration-final`: **45 ownership/routing contracts,
24 offline audio checks, 55 measured modulation checks, 34 actual plugin
readbacks pass**. Audio covers cello processing/duplication, separate Pro 2,
every return, master, mute/solo, tails, stable-pipe replacement and cleanup.
Control checks inspect actual rendered KR outputs across every profile pole,
a 25-second sine cycle, borrowed follower input and timed AWParam changes.
Readbacks compare bus mapping with each plugin's direct setter; Decimate folding
quantizes its normalized value, and both paths agree exactly. All eighteen
Scheps values were also read back inside the complete live graph.

Reproduce offline audio/control checks:

```sh
/usr/bin/python3 apps/rack/sc/sets/awb52/run.py \
  --output /private/tmp/awb52-FRESH \
  --verb-profiles --fx-profiles --cello-scheps --control-sends
```

Add `--plugin-readback` for a short **owned muted hardware server**; this is a
functional readback check, not a CPU/dropout benchmark, and never connects ADC
inputs. Live listening, boundary/load testing including the Waves subprocess,
and live class installation remain separate. Legacy/full-load mode remains
available without the profile flags.

Legacy/full-load regression also passes **22 contracts and 24 audio checks** in
`/private/tmp/awb52-fx-migration-legacy-final`, with the installed cache unchanged.


## Shared UM / stereo Scheps capture — 6 October 2026

`master-profile.json` records the clarified migration contract. The Bitwig Master
track placement is a control-script/integration convenience and need not become
a corresponding SC owner. Preserve the captured audio topology independently:
Mast/Fuzz/Splutter/Deci/Sparkle feed the shared chain, while Verb, Environment and
Record join after it. EQ is deferred at the user's request; the first pass can
use UM → stereo Scheps in a separately owned chain. That opt-in implementation
is now present in `AWBFirstPassSet.sc`, as recorded in the 7 October checkpoint below.

UM Main control's depth **4.0** addresses Select. The other depth **0.48** addresses
**Signal B of the UM main modulation Math**, rather than that selector again.
The raw inspection evidence is retained; the correction is explicit in the
profile. The exact Math display name still needs resolving before generating
full-address mappings.

`scheps73-stereo-baseline.json` transcribes all 31 distinct displayed settings
from seven supplied screenshots, separately from the verified cello mono
baseline. Both sides: preamp -25M; high +5.1 dB; mid 1.6 kHz intended / +3.6 dB;
low 110 Hz / -5.2 dB; high-pass 160 Hz but Off; input +6.5 dB; output -16.5 dB.
Drive, preamp, high/mid/low and EQ are On/In; phases Out; monitor/EQ mode Stereo;
Link I/O Unlinked. The external container mix modulation remains separate.

The initial capture was screenshot transcription only. Stereo indexes, normalized
values and actual plugin readbacks are now verified in the 7 October checkpoint
below. CPU and dropout measurements remain separate.


## Fuzz and shared UM / stereo Scheps — 7 October 2026

Enable `fuzzPlugin: true, sharedFX: true` alongside `fxProfiles: true`. The
prepared example includes the installed WaveShell 17.1 child descriptors and
verified normalized baselines: twenty Fuzz settings and thirty-one distinct
stereo Scheps settings. Waves runs in VSTPlugin `sandbox` mode because its native
UI initialization crashes scsynth when hosted in-process on this machine.
The private descriptor cache is loaded without rewriting the installed cache.

`set.fxMix(\fuzz)` exposes named AWParams. `set.sharedMix` exposes independent
UM bases, selectors, Math A inputs and B amounts. KR outputs map straight to
plugin parameters; the existing follower/blender envelope remains upstream.
`set.sharedChain.gui` opens its native Chain Tool panel. The Chain borrows its
ports and owns its processors, internal bus and AWParams. Its fixed construction
factory is registered for that instance's lifetime; saved configurations are not
yet portable across fresh sessions. No custom Fuzz parameter panel is added here.

Earth owns the Drive bank; innerRate owns the VibRate/DetRate bank; innerDepth
owns the VibDepth/DetDepth bank; Main owns the screenshot's .25/.40/.66/.75
Depth bank; Diffusion owns its Diffusion/Enable/Size bank. The remaining Shaper →
Depth-bank assignment is inferred. Main's .48 contribution is assigned provisionally
to Mix Math B, independently from its selector. Set `sharedFX.mainMathTarget`
in the prepared specification to `mix`, `depth`, `rate` or `wonk` to change that
assignment. These two inferred identities need confirmation before claiming an
exact Bitwig modulation reconstruction.

Fuzz's captured LFO routes are implemented, but `lfoEnabled` defaults to zero:
its waveform, rate and base amount remain unconfirmed. The provisional sine,
.04 Hz and zero base amount are configurable. This is not the confirmed Deci
LFO specification. Captured numeric depths are preserved; host taper, clipping,
feedback timing and audible equivalence still need side-by-side audition.

The shared Chain processes the selected returns before the master; Verb joins
after it. `rack.setReturnDestination(id, privateAudioBus)` borrows a compatible
bus and retains that route through active/retiring generations and replacement.
Pass nil to restore the rack master before freeing a borrowed destination.
Closing the shared Chain restores direct returns; closing the rack closes both.

BaseLaunch is the authority for exported modulation sources, not every follower.
The exported Fuzz/UM source correspondence is:

| BaseLaunch source | New control |
| --- | --- |
| fuzz_shp | Fuzz aFuzz |
| f_um | UM aMix |
| um_nz | UM aNoise |
| um_dep | UM aDepth |
| um_r8 | UM aRate |
| um_wnk | UM aWonk |
| umShaper | UM shape |
| fuzz_schrt2 | External Scheps schertlerMix |

This slice does not instantiate the whole old BaseLaunch blender network or send
its old remote OSC messages. Borrow chosen output buses using `addModulation`;
arrange checked producer order, or explicitly accept previous-block input for
feedback paths. `aDrive` remains an independent source. Intermediate envelopes
are not automatically attached to plugin controls.

Reproduce functional checks, including the muted plugin readback probe:

```sh
python3 apps/rack/sc/sets/awb52/run.py \
  --output /private/tmp/awb52-NEW-FRESH \
  --verb-profiles --fx-profiles --cello-scheps \
  --fuzz-plugin --shared-fx --control-sends --plugin-readback
```

Offline renders test actual audio routing and every captured Fuzz/UM selector
bank, independent Math inputs, borrowed-source ownership and AWParam transitions.
The short real-time probe verifies bus mapping against direct plugin setters,
including plugin quantization. It is muted, uses no hardware input and closes its
owned server. This is functional verification, not a CPU or dropout measurement.

Verified result: `fx-migration-validation.json`, evidence
`/private/tmp/awb52-additional-complete`: 60 native contracts, 27 audio checks,
55 existing Deci/Sparkle modulation checks, 92 new Fuzz/UM checks and 119 actual
plugin readbacks pass. The audio run opens UM and the external stereo Scheps wet
blend after the initial clean-route check. The installed cache remains unchanged.
Rack regressions pass 31 Node tests, 88 audio and 17 control assertions; Chain
regressions pass 11 Node tests plus native fixed/managed graph and audio checks.
Original mode also passes with generated IRs; this is a compatibility check,
not a new convolution performance result. Shell panels were not reopened in this
pass, and no classes were installed into the live configuration.


## Access from the ordinary SC IDE

SC uses the checked-out files on disk, independently of the Git branch name.
The mixer checkpoint can therefore be auditioned from `integration/bw-sc` or
`main`. The current default interpreter configuration does not include these
folders. Add them in SC IDE → Preferences → Interpreter → Include paths:

```
/Users/willy/awb/apps/core/sc/classes
/Users/willy/awb/apps/chain/sc/classes
/Users/willy/awb/apps/rack/sc/classes
/Users/willy/awb/apps/rack/sc/sets/awb52
```

Also add this folder to **Exclude paths**, because it contains an archived
instrumented copy of `AWBFirstPassSet`:

```
/Users/willy/awb/apps/rack/sc/sets/awb52/evidence-dropout-real-ir-30s
```

Keep the existing AWB framework and installed VSTPlugin extension paths. Recompile
the class library, then open this folder's `example.scd`. Set server options before
boot as shown there; select the actual input indices explicitly. Merging this
checkpoint does not change the interpreter configuration, boot the server or
connect live audio inputs.
