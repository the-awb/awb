# Open Bitwig set: verified partial description

4 October 2026. Actual controller observations from Bitwig **4.3.10 / API 17**.
**Willy confirms this is the set to map, instantiated from `awb 5.2 (ef script)`.**
The template file hash is separate provenance; the open instance’s path/hash were not captured.
Comparison of the observed values with the UI remains outstanding.

The probe captured **16 of 65 flat-bank entries**, at offsets 0 and 8. It captured
**15 top-level devices**, including **four disabled devices**. Names and positions are
locations in their recorded contexts, not persistent project IDs.

| Flat position | Track | Type | Ordered top-level chain |
| --- | --- | --- | --- |
| 0 | Audio group | Group | (observed empty chain) |
| 1 | INS | Group | (observed empty chain) |
| 2 | Cello In | Group | Time (disabled) → FX Layer (enabled) |
| 3 | Line 1 (VC) Group | Group | (observed empty chain) |
| 4 | Cello 1 | Hybrid | Scheps 73 Mono (enabled) |
| 5 | Pro 2 | Group | Time (disabled) |
| 6 | Pro2 | Audio | (observed empty chain) |
| 7 | Delays | Group | (observed empty chain) |
| 8 | Cello Delay BUS | Hybrid | Scheps 73 Stereo (disabled) |
| 9 | DelB.1 | Hybrid | FX Layer (enabled) → Minimal Delay (enabled) → FX Layer (disabled) |
| 10 | DelA.1 | Hybrid | FX Layer (enabled) → Minimal Delay (enabled) |
| 11 | DelA.2 | Hybrid | FX Layer (enabled) → Minimal Delay (enabled) → Peak Limiter (enabled) |
| 12 | DelB.2 | Instrument | FX Layer (enabled) → Minimal Delay (enabled) |
| 13 | SC IN | Group | (observed empty chain) |
| 14 | SC IN 1 | Audio | (observed empty chain) |
| 15 | SC IN 2 | Audio | (observed empty chain) |

## Selected FX Layer

The selected FX Layer is enabled, with preset label `delb1 routing 5.0 (remote)`. Its
owning track was not captured, so the preset label is not used to assign it to a track.

| Layer index | Layer | Ordered child chain |
| --- | --- | --- |
| 0 | Cello In | Audio Receiver (enabled) |
| 1 | Mic | Audio Receiver (enabled) |

Both observed layer children are nested `Audio Receiver` devices at position 0 in
their own layer. Their duplicate names/positions do not make them the same instance.
Both expose a `Source FX` slot; its contents and receiver source targets were not read.

| Direct parameter ID | Name | Normalized | Display |
| --- | --- | --- | --- |
| `CONTENTS/MIX` | Mix | 1 | 100 % |
| `CONTENTS/GAIN` | Gain | 0.5 | 0.0 dB |

## Sends

The probe read **128 send slots** across the sampled tracks, preserving zero values,
display strings, effective pre-fader flags and send modes. The labels below are
**not verified destination edges**. All listed nonzero sends report mode `AUTO`
and effective pre-fader `false`.

| Track | Send index | Observed label | Normalized | Display |
| --- | --- | --- | --- | --- |
| Cello In | 4 | Reverb | 0.4960629940032959 | -18.3 dB |
| Cello In | 5 | Mast | 1 | 0.0 dB |
| Pro 2 | 4 | Reverb | 0.4960629940032959 | -18.3 dB |
| Pro 2 | 5 | Mast | 1 | 0.0 dB |
| Pro2 | 5 | Mast | 1 | 0.0 dB |
| SC IN 1 | 4 | Reverb | 0.30499999999999955 | -30.9 dB |
| SC IN 1 | 5 | Mast | 1 | 0.0 dB |
| SC IN 2 | 4 | Reverb | 0.24500000000000002 | -36.7 dB |
| SC IN 2 | 5 | Mast | 0.9700000000000004 | -0.8 dB |

## Gaps

The remaining 49 flat-bank entries, their chains, all nested containers and all-device
parameters are not captured. Group parent proxies were read, but their context-relative
positions and group-master behavior need comparison before building a parent tree.
Hardware input/output destinations, receiver/sidechain targets and modulation assignments
remain unresolved. No gain law, physical-value conversion or signal path is inferred.
Twelve-device chains and eight sends/layers are fixed limits; longer cases remain untested.

See [host-partial.json](evidence/host-partial.json) for the raw observed fields and
[target-partial.json](evidence/target-partial.json) for separate file/dependency evidence.
