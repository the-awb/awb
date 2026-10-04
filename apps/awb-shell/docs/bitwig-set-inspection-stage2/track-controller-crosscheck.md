# Screenshot and OSC-controller cross-check

4 October 2026. Reference evidence for the fixed `awb 5.2 (ef script)` instance.
The expanded mapper has not yet produced a live capture.

## What the screenshots establish

The three supplied views collectively show 65 tracks, after deduplicating the repeated
C1–C4 rows. This agrees with the Stage 1 API count. The first sixteen names and their
order match the live probe exactly, including `Pro2` at flat index 6 with its mute lit.
The open tab reads `New 2*`; that is a UI label, not a resolved instance file path/hash.

The visible sequence distinguishes the primary FX tracks (`Splutter 5.0 (remote)`,
`Spiral Sparkle`, `Shaped Decimate`, `FUZZ`, `Reverb`, `Mast`) from the later bus tracks
and the separate `Master`. The final bus section shows C1–C4, B1/A1/A2/B2 SC BUS,
Stutter, Splutter, Ubermod, Sparkle, Decimate, Fuzz, Verb, Mast, P2 SC and Environment
buses, then `---BLANK---` and `Master`.

[`screenshot-track-reference.json`](screenshot-track-reference.json) retains all 65
visually transcribed labels and their inferred flat order. Index 43 is visibly truncated;
its full name is unresolved. Indentation supports a hierarchy check but is not promoted
to a complete API parent tree. Grey styling is not assigned an invented activity/bypass meaning.

## Installed controller provenance

Installed file: `/Users/willy/Documents/Bitwig Studio/Extensions/OSCControllerforAWB.bwextension`.
SHA-256: `33dc3f363f52ef5e888817470edbe4b93e39beb1a7289eb45a1999b1efc19adc`.
It identifies its hardware as **Armed With Bow / OSCAWBGlue01**, matching the right-hand
controller entry in the screenshot. The packaged metadata selects API 16 and version 0.1.

Source is at `/Volumes/ARMED WITH SOUND/Bitwig Scripting/OSC Controller for AWB`.
Its Git HEAD is `d9d4c2bccaced6c8fa5e4bb8b5d667f2186d840b`, with dirty source/build files.
All thirteen local compiled class files match their installed counterparts byte for byte.
Key mappings were also read from installed bytecode. Source hashes, copied source and
bytecode evidence are retained so this does not rely on a supposedly clean Git revision.
No rebuild, reinstall, MIDI input or OSC message was sent to the live controller.

## Track modules actually configured

`InterfaceGroup` uses flat `createTrackBank(..., true)` and resolves each module at
`startIndex + trackOffset`. The audio group starts at 0; the FX group starts at 21.
These are controller configuration positions, cross-checked against screenshot order.
Only the first sixteen positions currently also have live API name observations.

| Module | Flat index | Visible track | MIDI channel, zero-based | Effect-bank indices for bus controls/followers |
| --- | --- | --- | --- | --- |
| vcfx | 2 | Cello In | 1 | none |
| vcin | 3 | Line 1 (VC) Group | 0 | 0, 1, 2, 3 |
| pro2 | 5 | Pro 2 | 7 | 16 |
| b1 | 9 | DelB.1 | 2 | 4 |
| a1 | 10 | DelA.1 | 3 | 5 |
| a2 | 11 | DelA.2 | 4 | 6 |
| b2 | 12 | DelB.2 | 5 | 7 |
| bus | 8 | Cello Delay BUS | 6 | none |
| splut | 21 | Splutter 5.0 (remote) | 8 | 9 |
| spark | 22 | Spiral Sparkle | 10 | 11 |
| deci | 23 | Shaped Decimate | 11 | 12 |
| fuzz | 24 | FUZZ | 12 | 13 |
| verb | 25 | Reverb | 13 | 14 |
| mast | 26 | Mast | 14 | 15, 10, 8 |

Flat track indices, effect-bank bus indices, send indices and local OSC bus indices are
different coordinate systems. The controller's use of these positions is observed in
its configuration; destination names are not automatically verified signal edges.

## Send and parameter contracts

The source configures **six FX sends at indices 0–5** and **eighteen bus sends at 6–23**.
FX-send controls use CC 80–85; bus-send controls use CC 100–117 on each module's MIDI
channel. The mapper now allocates **32 send slots**, with actual host counts and explicit
truncation reporting, rather than cutting off this 24-send contract at sixteen slots.

Device controls use **eight remote controls on the current cursor page**, rather than
all direct parameters. Routing uses CC base 0; parameter slots use 10/20/30; modulation
slots use 40/50/60. These labels describe what the controller binds to, not a decoded
modulation-assignment graph. The mapper now captures current remote-page names, selected
index, eight control names, base values, modulated values and display strings as well
as direct parameters. Other remote pages remain untraversed. The mapper's current API
page is not an independent read of an existing OSC controller cursor's selection.

## Device paths that matter for checking

- Delay modules b1/a1/a2/b2 bind routing to root device 0, then use a UUID-filtered
  Instrument Layer bank for outer modulation and layer-0 child devices for control/time.
- vcfx and pro2 use UUID-filtered FX Layer banks. Splutter and Sparkle bind their outer
  FX Layer remote controls for modulation and layer-0 child device 0 for parameters.
- deci, fuzz and verb bind root device 0 directly.
- The **mast module's track is `Mast`, but its parameter devices come from a separate
  `createMasterTrack(0)` bank**. The code filters that bank for FX Layers, traverses an
  inner layer for the Ubermod controls/modulation, and binds another outer FX Layer for
  `stut 2`. These indices are in filtered banks; they cannot be copied directly as
  unfiltered device-chain positions.

The FX Layer UUID is `a0913b7f-096b-4ac9-bddd-33c775314b42`; the Instrument Layer UUID
is `5024be2e-65d6-4d40-bbfe-8b2ea993c445`. These are source matchers, not newly measured
plugin IDs for every device in the open set.

## Envelope OSC output

The controller watches a UUID-matched Tool device in each configured effect-bank bus.
It sends remote control **0's modulated value**, rounded to increments of 1/512, to
`127.0.0.1:9000` at `/envelopes/{moduleKey}/{localBusIndex}`. Remote control **2** is
bound to the bus gain knob. Local indices run over each module's configured bus array;
they are not global bus-track indices. For example, mast's three configured positions
15/10/8 correspond to `/envelopes/mast/0`, `/envelopes/mast/1`, `/envelopes/mast/2`.
The actual remote-control targets, Tool state and live values still need host/UI proof.

This explains why collecting direct parameters alone would miss part of the interface
Willy uses. The source provides a concrete checklist for the nested device and remote
control capture without pretending to recover hidden routing from control labels.

Next: activate the prepared one-shot controller in the stopped target, compare all 65
captured names/order against this reference, then verify these device paths and fill
the remaining routing annotations from the UI.
