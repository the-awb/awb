# Modulation UI capture: status (2026-10-05)

Method: select the device, then read every modulator and target row in the Inspector. Hover each row with calibrated positions (name rows and modulation rows have different pitches) and check that the tooltip belongs to the highlighted row. Infer only when a single target is possible. Logs: `modulation-ui-capture.jsonl` and `audio-receiver-ui-capture.jsonl`. Records marked `supersededBy` are replaced.

## Verified (hover sweep)
- Delays: input macros and receivers for all four delays. The full rack comes from DelB.1 and DelA.1 (Augustus targets are "Unknown parameter" because the plugin is missing).
- Cello In: Time, nested FX Layer, and the stutter Tool (all 31 rows re-verified).
- Pro 2 (Time), Cello 1 and Cello Delay BUS: no modulators beyond Time.
- Spiral Sparkle: every device verified.
- Splutter: Phase mod amt, all Select-4 S1–S4 blocks, Shaper 1 select through Time div SC; EQ-5 and Things Texture have none.

## Re-verified 2026-10-06
- LH DRIVE FX Grid: every row re-swept; all matched the log.
- Splutter FX Grid top section: re-swept; all matched.
- Shaped Decimate: complete (FX Layer modulators; EQ-DJ, ++decimate, Gate have none).

## Still to spot-check
- Splutter root FX Layer A~ macros and LH DRIVE DRIVE macros (1–2 rows each, low risk).

## Not started
FUZZ (next: Instrument Layer has Fuzz Control, A~Fuzz, MUL, LFO), Reverb, Master, Midi guitar + Bass, AudioToMidi Stream, Mic, Master Record A/B/C, Group 7 tracks, C1–C4 and the SC BUS tracks (Gate/Compressor/Tool), Environment BUS, ---BLANK---.

## Notes
- Grid tooltips name the module type only (e.g. "AD › Attack"), not which instance.
- The transport was started twice during the session by something other than me; it was left alone.

## 2026-10-07 progress
- FUZZ: MDMX targets resolved after plugin restore (no unknowns left).
- Reverb: complete (Tool, Instrument Layer 20 Vol rows, all layer devices).
- Midi guitar + Bass: complete (inactive track; nested MIDI Bass/Guitar chains not openable).
- AudioToMidi Stream Note FX Selector: PARTIAL. Logged top section (blank → MD.1 Time decay SC). Still to do: MD.1 Time (Select/Delay ×6), MD.1 Vel decay (Vel decay/Pitch mod ×6), MD.1 Vel decay SC, MD.1 Vel SC, MD.2 block, Midi_VC_SC_AMT, Octave SC/select, Pattern select, Pitch mod ×6, S1–S4 (8 On/Off rows each), SC Arp Gate/Vel, Sdchain Invert, Select midi chain, Step mod depth, Steps. Deferred behind active tracks.

## 2026-10-07 later
- Mic done (no modulators). Master Record A/B/C and all tracks below them skipped at user request (except Master).
- Master: IN PROGRESS. Done: root FX Layer (none), Mast receivers FX Layer (none), UberMod FX Layer A~ macros, ValhallaUberMod rows through S1 blocks.
  Next: ValhallaUberMod S2–S4 blocks (S2 Drive block order is DriveNoi, DriveInG — hover each), then Eq control 4.1 FX Layer, Scheps 73 FX Layer, Verb/Environment/Record layers, Multiband FX-3, Tool.
- AudioToMidi Stream Note FX Selector lower half still outstanding (see above).
- Bitwig was reopened from template between sessions; Mast layer view needs re-navigating (Master track > FX Layer > Mast layer > UberMod FX Layer > ValhallaUberMod).

## 2026-10-07 Master progress
- ValhallaUberMod: complete (S1–S4 B-row orders differ per block; each hovered).
- Eq control FX Layer, EQ-DJ (S-block Select-4 ownership not exposed), Tool, Pro-Q 3: done.
- Scheps FX Layer: done. Multiband FX-3 container: none. Root Tool [off]: logged (some row pairing uncertain).
- Remaining on Master: Verb / Environment / Record layers of root FX Layer; Multiband band FX Layers + their stutter Tools (expected same as Cello In stutter rack).
