# AWB 5.2 — first SC-only slice

Optional prototype around `AWBSendRackTool : Tool`; the existing Rack ToolInstance
owns the graph and standard Shell GUI. It does not add another host or change the
installed SC class library. VC is a mono input duplicated into the stereo rack;
Pro 2 is a separate stereo input. UM and the input Scheps processing are omitted.

The fixed destinations are Verb, Deci, Spark, Fuzz and explicit clean/Mast. Three
dynamic FX pipes and three spare follower pipes remain available. Destination
buses stay stable when processors change. All FX return to the limited master.
Current Shell routing/mix editing and its batched, origin-aware SC bridge are
inherited from the Rack Tool. This slice adds no bespoke FX parameter panels.

## Graph and source boundaries

| Destination | First pass |
| --- | --- |
| Deci | Installed `++decimate`, captured parameters and outer gain |
| Spark | Parallel `++spiralstretch` and two `++pitchdelay` instances, then `++delay`, optional tail `++decimate`, then Things Texture |
| Fuzz | Native HPF → biased tanh → DC removal → LPF approximation of MDMX Fuzz |
| Verb | Three stereo partitioned convolution branches, Things Texture and ValhallaShimmer in parallel |
| Mast | Explicit clean route through the existing rack master |

There are nine hosted plugin instances and six `PartConv` processors, with FFT
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
yet reproduced. All six processors compute even at zero output gain; selector-based
suspension/activation is later work. Generated 2.5/4/8-second stand-ins remain
available through the runner's `--ir-mode=generated` for the earlier baseline.

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
an exact preset reconstruction. Select-4/modulator targets, layer mixer gains,
full device states and proven send destination edges are still unavailable. File hashes and original/used frame counts are retained in `irProvenance`.

## Full-load mode

Use `fullLoad: true` for the requested test configuration. It enables every
parallel branch at unity, sets outer wet mixes and tail mix to 100%, sets plugin
`wetdry`/`wetDry`/`Mix` parameters to normalized 1, and sets explicit `Bypass`
parameters to 0. Other plugin parameters and captured output gains stay intact;
each return and the master retain limiting. This is the full active graph of
this prototype with the chosen IR cap, not a proven upper bound for the original set or longer IRs.

The source snapshot is copied and remains unchanged by overrides. With fullLoad
off, audition mode defaults on: Deci wet is opened and Verb's captured -Inf input
Tool is opened. For the literal observed static values use both
`fullLoad: false, audition: false`; the unresolved capture limitations still apply.

## Use

Add this folder to a chosen SC configuration alongside the actual AWB framework,
`apps/rack/sc/classes` and VSTPlugin classes, then recompile that configuration.
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
