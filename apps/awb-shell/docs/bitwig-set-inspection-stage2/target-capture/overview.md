# awb 5.2: capture overview

Bitwig 4.3.10 / API 17. 65/65 tracks, 290 inspected devices, 57 disabled devices.

Screenshot name checks: {'match': 64, 'partial_match': 1}. OSC module track checks: 14/14.

Direct-parameter coverage by device: {'observed': 290}. Unresolved named device slots: 131.

See [the complete map](set-map.md) for every captured value and locator, [reference checks](reference-checks.json) for discrepancies, and [the snapshot](snapshot.json) for the structured hierarchy. Values come from a stopped, static host-cache capture; no atomic snapshot or independent device-parameter UI check is claimed.

## Track tree and ordered root devices

| Track | Parent | Root device order (disabled marked) |
| --- | --- | --- |
| flat/0: Audio group | project root | empty |
| flat/1: INS | flat/0 | empty |
| flat/2: Cello In | flat/1 | Time [disabled] → FX Layer |
| flat/3: Line 1 (VC) Group | flat/2 | empty |
| flat/4: Cello 1 | flat/3 | Scheps 73 Mono |
| flat/5: Pro 2 | flat/1 | Time [disabled] |
| flat/6: Pro2 | flat/5 | empty |
| flat/7: Delays | flat/0 | empty |
| flat/8: Cello Delay BUS | flat/7 | Scheps 73 Stereo [disabled] |
| flat/9: DelB.1 | flat/7 | FX Layer → Minimal Delay → FX Layer [disabled] |
| flat/10: DelA.1 | flat/7 | FX Layer → Minimal Delay |
| flat/11: DelA.2 | flat/7 | FX Layer → Minimal Delay → Peak Limiter |
| flat/12: DelB.2 | flat/7 | FX Layer → Minimal Delay |
| flat/13: SC IN | flat/0 | empty |
| flat/14: SC IN 1 | flat/13 | empty |
| flat/15: SC IN 2 | flat/13 | empty |
| flat/16: SC IN 3 | flat/13 | empty |
| flat/17: SC IN 4 | flat/13 | empty |
| flat/18: Ambient sounds | flat/0 | empty |
| flat/19: Ambient 01 | flat/18 | empty |
| flat/20: LH DRIVE | flat/0 | FX Layer → FX Grid → FX Layer |
| flat/21: Splutter 5.0 (remote) | flat/0 | FX Layer → EQ-5 → Things Texture |
| flat/22: Spiral Sparkle | flat/0 | FX Layer → Things Texture |
| flat/23: Shaped Decimate | flat/0 | FX Layer |
| flat/24: FUZZ | flat/0 | Instrument Layer |
| flat/25: Reverb | flat/0 | FX Layer |
| flat/26: Mast | flat/0 | empty |
| flat/27: Midi guitar + Bass | project root | Partial phase panning → Compressor → Time → Instrument Layer |
| flat/28: AudioToMidi Stream | project root | Note FX Layer [disabled] → Note FX Layer → Note FX Selector → Velocity Curve [disabled] |
| flat/29: Mic | project root | FabFilter Pro-Q 2 [disabled] |
| flat/30: Group 5 | project root | empty |
| flat/31: Audio 1 | flat/30 | empty |
| flat/32: Audio 2 | flat/30 | empty |
| flat/33: Record | project root | empty |
| flat/34: Mast Record | flat/33 | empty |
| flat/35: Master Record A | flat/34 | Compressor [disabled] → FabFilter Pro-Q 2 [disabled] → Dynamics [disabled] → Scheps 73 Stereo [disabled] → FabFilter Pro-Q 3 [disabled] → Ozone Imager 2 [disabled] → Convology XT [disabled] → Center Stereo [disabled] |
| flat/36: Master Record B | flat/34 | Compressor [disabled] → FabFilter Pro-Q 2 [disabled] → Dynamics [disabled] → Scheps 73 Stereo [disabled] → FabFilter Pro-Q 3 [disabled] → Ozone Imager 2 [disabled] → Convology XT [disabled] → Center Stereo [disabled] |
| flat/37: Master Record C | flat/34 | Compressor [disabled] → FabFilter Pro-Q 2 [disabled] → Dynamics [disabled] → Scheps 73 Stereo [disabled] → FabFilter Pro-Q 3 [disabled] → Ozone Imager 2 [disabled] → Convology XT [disabled] → Center Stereo [disabled] |
| flat/38: Reverb RETURN | flat/34 | empty |
| flat/39: P2 record | flat/33 | empty |
| flat/40: AL Capture | flat/33 | empty |
| flat/41: Group 7 | project root | empty |
| flat/42: Windy reeds & trains 04 | flat/41 | FabFilter Pro-Q 3 [disabled] → ++spectralcompand [disabled] |
| flat/43: constructiona t batersea heavy ambient noise | flat/41 | FX Layer [disabled] |
| flat/44: bell | flat/41 | FX Layer [disabled] |
| flat/45: C1 | project root | Gate → Compressor → Tool |
| flat/46: C2 | project root | Gate → Compressor → Tool |
| flat/47: C3 | project root | Gate → Compressor → Tool |
| flat/48: C4 | project root | Gate → Compressor → Tool |
| flat/49: B1 SC BUS | project root | Gate → Compressor → Tool |
| flat/50: A1 SC BUS | project root | Gate → Compressor → Tool |
| flat/51: A2 SC BUS | project root | Gate → Compressor → Tool |
| flat/52: B2 SC BUS | project root | Gate → Compressor → Tool |
| flat/53: Stutter BUS | project root | Gate → Compressor → Tool |
| flat/54: Splutter BUS | project root | Gate → Compressor → Tool |
| flat/55: Ubermod BUS | project root | Gate → Compressor → Tool |
| flat/56: Sparkle BUS | project root | Gate → Compressor → Tool |
| flat/57: Decimate BUS | project root | Gate → Compressor → Tool |
| flat/58: Fuzz BUS | project root | Gate → Compressor → Tool |
| flat/59: Verb BUS | project root | Gate → Compressor → Tool |
| flat/60: Mast BUS | project root | Gate → Compressor → Tool |
| flat/61: P2 SC BUS | project root | Gate → Compressor → Tool |
| flat/62: Environment BUS | project root | Tool → Tool |
| flat/63: ---BLANK--- | project root | Note FX Layer [disabled] → FX Layer [disabled] |
| flat/64: Master | project root | FX Layer → Multiband FX-3 [disabled] → Tool [disabled] |

## Sends with nonzero normalized levels

These are observed send controls and labels. Destination edges remain unverified.

| Source track | Send index | Label | Host display | Normalized | Mode |
| --- | --- | --- | --- | --- | --- |
| Cello In | 4 | Reverb | -18.3 dB | 0.4960629940032959 | AUTO |
| Cello In | 5 | Mast | 0.0 dB | 1 | AUTO |
| Cello In | 8 | C3 | -20.8 dB | 0.45000000000000007 | AUTO |
| Cello In | 9 | C4 | -26.3 dB | 0.365 | AUTO |
| Cello In | 23 | Environment BUS | -10.5 dB | 0.6692913174629211 | AUTO |
| Line 1 (VC) Group | 23 | Environment BUS | 0.0 dB | 1 | AUTO |
| Pro 2 | 4 | Reverb | -18.3 dB | 0.4960629940032959 | AUTO |
| Pro 2 | 5 | Mast | 0.0 dB | 1 | AUTO |
| Pro2 | 5 | Mast | 0.0 dB | 1 | AUTO |
| Pro2 | 9 | C4 | 0.0 dB | 1 | AUTO |
| Pro2 | 21 | Mast BUS | 0.0 dB | 1 | AUTO |
| SC IN 1 | 4 | Reverb | -30.9 dB | 0.30499999999999955 | AUTO |
| SC IN 1 | 5 | Mast | 0.0 dB | 1 | AUTO |
| SC IN 2 | 4 | Reverb | -36.7 dB | 0.24500000000000002 | AUTO |
| SC IN 2 | 5 | Mast | -0.8 dB | 0.9700000000000004 | AUTO |
| SC IN 3 | 5 | Mast | 0.0 dB | 1 | AUTO |
| SC IN 4 | 5 | Mast | 0.0 dB | 1 | AUTO |
| LH DRIVE | 5 | Mast | -0.7 dB | 0.9750000000000002 | AUTO |
| Shaped Decimate | 4 | Reverb | -2.2 dB | 0.9200000000000002 | AUTO |
| Master Record A | 17 | Environment BUS | 0.0 dB | 1 | AUTO |
| Master Record B | 17 | Environment BUS | 0.0 dB | 1 | AUTO |
| Master Record C | 17 | Environment BUS | 0.0 dB | 1 | AUTO |

## OSC module controls present in the capture

Current remote pages are captured at each device, including nested devices. The table retains only assigned remote controls. Page labels are resolved from the observed page-name array when the page proxy itself reports an empty name.

| Module / track | Device locator | Page | Assigned controls (index: name = display) |
| --- | --- | --- | --- |
| vcfx / Cello In | Time [{"track":2,"device":0}] | CC Value | 0: K1 Value = 0.00; 1: K2 Value = 0.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 0.00; 4: K5 Value = 0.00; 5: K6 Value = 0.00; 6: K7 Value = 4.45; 7: K8 Value = 2.00 |
| vcfx / Cello In | FX Layer [{"track":2,"device":1}] | Perform | 0: On/Off = Off; 1: Stut_SC_Amount = 100 %; 5: Stut SC In = 0.00 % |
| vcfx / Cello In | FX Layer [{"track":2,"device":1},{"kind":"layer","container":0,"device":2}] | Perform | 0: Stut_SC_Amount = 100 %; 4: Stut SC In = 0.00 % |
| vcfx / Cello In | Tool [{"track":2,"device":1},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 4.00 %; 2: St. Width = 107 %; 4: L- = Off; 5: R- = Off |
| pro2 / Pro 2 | Time [{"track":5,"device":0}] | CC Value | 0: K1 Value = 0.00; 1: K2 Value = 0.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 0.00; 4: K5 Value = 0.00; 5: K6 Value = 0.00; 6: K7 Value = 4.45; 7: K8 Value = 2.00 |
| b1 / DelB.1 | FX Layer [{"track":9,"device":0}] | Perform | 0: Vc &gt; DB.1 = 100 %; 4: TB &gt; DB.1 = 0.00 % |
| b1 / DelB.1 | Audio Receiver [{"track":9,"device":0},{"kind":"layer","container":0,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b1 / DelB.1 | Audio Receiver [{"track":9,"device":0},{"kind":"layer","container":1,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b1 / DelB.1 | Minimal Delay [{"track":9,"device":1}] | Perform | 4: TH pos offset = 0.00 %; 5: TH LFO Mod = 0.00 % |
| b1 / DelB.1 | Main Control [{"track":9,"device":1},{"kind":"layer","container":0,"device":0}] | CC Value | 0: K1 Value = 127.00; 1: K2 Value = 122.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 0.00; 4: K5 Value = 0.00; 5: K6 Value = 1.00; 6: K7 Value = 0.00; 7: K8 Value = 0.00 |
| b1 / DelB.1 | Main Control [{"track":9,"device":1},{"kind":"layer","container":0,"device":1}] | CC Value | 0: K1 Value = 16.00; 1: K2 Value = 2.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 63.00; 4: K5 Value = 20.00; 5: K6 Value = 127.00; 6: K7 Value = 0.00; 7: K8 Value = 127.00 |
| b1 / DelB.1 | FX Layer [{"track":9,"device":2}] | Perform | 0: Del Bus Mix = 15.7 %; 1: env SC = 2.00 %; 2: Delay_A-S = 0.79 %; 3: Delay_D-R = 63.0 % |
| b1 / DelB.1 | Tool [{"track":9,"device":2},{"kind":"layer","container":0,"device":0}] | Tool | 0: Gain = +0.0 dB; 1: Pan = -1.00 %; 2: St. Width = 104 %; 4: L- = Off; 5: R- = Off |
| b1 / DelB.1 | Tremolo [{"track":9,"device":2},{"kind":"layer","container":0,"device":1}] | Ampmod | 0: Rate = 5.79 Hz; 1: Wave = Sine; 2: Retrig = Off; 3: Depth = 5.50 % |
| a1 / DelA.1 | FX Layer [{"track":10,"device":0}] | Perform | 0: Vc &gt; DA1 = 100 %; 1: DB1 &gt; DA1 = 0.00 %; 2: A.2 &gt; DA1 = 0.00 %; 3: B2 &gt; DA1 = 0.00 %; 4: SC IN1 = 64.0 %; 5: SC IN2 = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":0,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":1,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":2,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":3,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":4,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":5,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":6,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":7,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Audio Receiver [{"track":10,"device":0},{"kind":"layer","container":8,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a1 / DelA.1 | Minimal Delay [{"track":10,"device":1}] | Perform | 4: TH pos offset = 25.2 %; 5: TH LFO Mod = 25.2 % |
| a1 / DelA.1 | Main Control [{"track":10,"device":1},{"kind":"layer","container":0,"device":0}] | CC Value | 0: K1 Value = 49.00; 1: K2 Value = 127.00; 2: A.2_Fdbk-DIR = 16.00; 3: K4 Value = 0.00; 4: K5 Value = 2.00; 5: K6 Value = 0.00; 6: K7 Value = 0.00; 7: K8 Value = 0.00 |
| a1 / DelA.1 | Main Control [{"track":10,"device":1},{"kind":"layer","container":0,"device":1}] | CC Value | 0: K1 Value = 8.00; 1: K2 Value = 4.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 63.00; 4: K5 Value = 1.00; 5: K6 Value = 4.00; 6: K7 Value = 0.00; 7: K8 Value = 127.00 |
| a2 / DelA.2 | FX Layer [{"track":11,"device":0}] | Perform | 0: Vc  &gt; DA2 = 100 %; 1: DB1  &gt; DA2 = 50.4 %; 4: TB  &gt; DA2 = 0.00 %; 5: Drums Live &gt; A2 = 0.00 % |
| a2 / DelA.2 | Audio Receiver [{"track":11,"device":0},{"kind":"layer","container":0,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a2 / DelA.2 | Audio Receiver [{"track":11,"device":0},{"kind":"layer","container":1,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a2 / DelA.2 | Audio Receiver [{"track":11,"device":0},{"kind":"layer","container":2,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a2 / DelA.2 | Audio Receiver [{"track":11,"device":0},{"kind":"layer","container":3,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a2 / DelA.2 | Audio Receiver [{"track":11,"device":0},{"kind":"layer","container":4,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a2 / DelA.2 | Audio Receiver [{"track":11,"device":0},{"kind":"layer","container":5,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| a2 / DelA.2 | Minimal Delay [{"track":11,"device":1}] | Perform | 4: TH pos offset = 15.0 %; 5: TH LFO Mod = 40.2 % |
| a2 / DelA.2 | Main Control [{"track":11,"device":1},{"kind":"layer","container":0,"device":0}] | CC Value | 0: K1 Value = 0.00; 1: K2 Value = 102.00; 2: A.2_Fdbk-DIR = 127.00; 3: K4 Value = 0.00; 4: K5 Value = 2.00; 5: K6 Value = 0.00; 6: K7 Value = 0.00; 7: K8 Value = 0.00 |
| a2 / DelA.2 | Main Control [{"track":11,"device":1},{"kind":"layer","container":0,"device":1}] | CC Value | 0: K1 Value = 4.00; 1: K2 Value = 2.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 63.00; 4: K5 Value = 10.00; 5: K6 Value = 40.00; 6: K7 Value = 0.00; 7: K8 Value = 127.00 |
| a2 / DelA.2 | Peak Limiter [{"track":11,"device":2}] | Limiter | 0: Gain = +0.1 dB; 1: Ceiling = -1.0 dB; 2: Release = 1.35 s; 3: Release Bias = 0.00 % |
| b2 / DelB.2 | FX Layer [{"track":12,"device":0}] | Perform | 0: Vc &gt; DB2 = 100 %; 1: DB1 &gt; DB2 = 0.00 %; 2: DA2 &gt; DB2 = 59.8 %; 4: TB &gt; DB2 = 0.00 % |
| b2 / DelB.2 | Audio Receiver [{"track":12,"device":0},{"kind":"layer","container":0,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b2 / DelB.2 | Audio Receiver [{"track":12,"device":0},{"kind":"layer","container":1,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b2 / DelB.2 | Audio Receiver [{"track":12,"device":0},{"kind":"layer","container":2,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b2 / DelB.2 | FX Layer [{"track":12,"device":0},{"kind":"layer","container":2,"device":1}] | Page 1 | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b2 / DelB.2 | Compressor [{"track":12,"device":0},{"kind":"layer","container":2,"device":1},{"kind":"layer","container":0,"device":0}] | Comp | 0: Input = +5.8 dB; 1: Threshold = -48.3 dB; 3: Attack = 0.20 ms; 4: Release = 374 ms; 6: Ratio = 9.09:1; 7: Output = +12.6 dB |
| b2 / DelB.2 | EQ-2 [{"track":12,"device":0},{"kind":"layer","container":2,"device":1},{"kind":"layer","container":0,"device":2}] | EQ | 0: Lo Type = High-pass (2-pole); 1: Lo Gain = 0.0 dB; 2: Lo Freq = 39.5 Hz; 3: Lo Q = 0.71; 4: Hi Type = Low-pass (4-pole); 5: Hi Gain = +0.7 dB; 6: Hi Freq = 948 Hz; 7: Hi Q = 0.71 |
| b2 / DelB.2 | Audio Receiver [{"track":12,"device":0},{"kind":"layer","container":3,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b2 / DelB.2 | Tool [{"track":12,"device":0},{"kind":"layer","container":3,"device":1}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 0.00 %; 2: St. Width = 81.0 %; 4: L- = Off; 5: R- = Off |
| b2 / DelB.2 | Audio Receiver [{"track":12,"device":0},{"kind":"layer","container":4,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| b2 / DelB.2 | FX Layer [{"track":12,"device":0},{"kind":"layer","container":4,"device":1}] | Page 1 | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| b2 / DelB.2 | Compressor [{"track":12,"device":0},{"kind":"layer","container":4,"device":1},{"kind":"layer","container":0,"device":0}] | Comp | 0: Input = +5.8 dB; 1: Threshold = -48.3 dB; 3: Attack = 0.20 ms; 4: Release = 374 ms; 6: Ratio = 9.09:1; 7: Output = +12.6 dB |
| b2 / DelB.2 | EQ-2 [{"track":12,"device":0},{"kind":"layer","container":4,"device":1},{"kind":"layer","container":0,"device":2}] | EQ | 0: Lo Type = High-pass (2-pole); 1: Lo Gain = 0.0 dB; 2: Lo Freq = 39.5 Hz; 3: Lo Q = 0.71; 4: Hi Type = Low-pass (4-pole); 5: Hi Gain = +0.7 dB; 6: Hi Freq = 948 Hz; 7: Hi Q = 0.71 |
| b2 / DelB.2 | Minimal Delay [{"track":12,"device":1}] | Perform | 4: TH pos offset = 0.00 %; 5: TH LFO Mod = 0.00 % |
| b2 / DelB.2 | Main Control [{"track":12,"device":1},{"kind":"layer","container":0,"device":0}] | CC Value | 0: K1 Value = 0.00; 1: K2 Value = 75.00; 2: A.2_Fdbk-DIR = 127.00; 3: K4 Value = 0.00; 4: K5 Value = 0.00; 5: K6 Value = 1.00; 6: K7 Value = 0.00; 7: K8 Value = 0.00 |
| b2 / DelB.2 | Main Control [{"track":12,"device":1},{"kind":"layer","container":0,"device":1}] | CC Value | 0: K1 Value = 16.00; 1: K2 Value = 2.00; 2: A.2_Fdbk-DIR = 0.00; 3: K4 Value = 63.00; 4: K5 Value = 20.00; 5: K6 Value = 127.00; 6: K7 Value = 0.00; 7: K8 Value = 127.00 |
| splut / Splutter 5.0 (remote) | FX Layer [{"track":21,"device":0}] | Perform | 0: A~splutShaper = 0.00 %; 1: A~Shaper2 = 0.00 %; 3: A~g8 = 0.00 %; 7: A~lopass = 0.00 % |
| splut / Splutter 5.0 (remote) | FX Grid [{"track":21,"device":0},{"kind":"layer","container":0,"device":0}] | Perform | 0: Splutter Shape = 0.79 %; 1: Steps = 77.2 %; 2: Time div SC = -37.0 %; 3: gate length = 77.2 %; 4: Splutter Shaper 2 = 0.00 %; 5: Env Mod = -100 %; 6: Phase mod amt = 77.2 % |
| splut / Splutter 5.0 (remote) | EQ-5 [{"track":21,"device":1}] | Gain | 0: 1 Gain = -8.3 dB; 1: 2 Gain = -9.7 dB; 2: 3 Gain = -4.0 dB; 3: 4 Gain = +2.2 dB; 4: 5 Gain = 0.0 dB; 5: Amount = 100 %; 6: Shift = 0.00 st; 7: Output = -2.1 dB |
| spark / Spiral Sparkle | FX Layer [{"track":22,"device":0}] | Perform | 0: A~Sparkle shaper = 0.00 %; 4: A~Spark = 0.00 %; 5: A~TailMix = 34.6 %; 6: A~Pitch delay = 0.00 %; 7: A~tail shaper = 0.00 % |
| spark / Spiral Sparkle | FX Layer [{"track":22,"device":0},{"kind":"layer","container":0,"device":0}] | Perform | 0: Sparkle Shape = 0.00 %; 4: Sparkle = 0.00 %; 5: Tail Mix = 0.00 %; 6: Pitch delay select = 0.00 %; 7: d++ tail shaper = 0.00 % |
| spark / Spiral Sparkle | EQ-DJ [{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}] | EQ-DJ | 0: Lo Gain = -2.5 dB; 1: Mid Gain = -10.0 dB; 2: Hi Gain = 0.0 dB; 3: Lo Freq = 339 Hz; 4: Lo On = Off; 5: Mid On = Off; 6: Hi On = Off; 7: Hi Freq = 3.89 kHz |
| spark / Spiral Sparkle | FX Layer [{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":1}] | Page 1 | 0: Gain = -6.7 dB; 1: Mix = 100 % |
| spark / Spiral Sparkle | FX Layer [{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":3}] | Page 1 | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| spark / Spiral Sparkle | EQ-DJ [{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":3},{"kind":"layer","container":0,"device":0}] | EQ-DJ | 0: Lo Gain = +0.0 dB; 1: Mid Gain = +0.0 dB; 2: Hi Gain = 0.0 dB; 3: Lo Freq = 339 Hz; 4: Lo On = Off; 5: Mid On = Off; 6: Hi On = Off; 7: Hi Freq = 3.89 kHz |
| deci / Shaped Decimate | FX Layer [{"track":23,"device":0}] | Perform | 0: DeciShape = 0.00 %; 1: depth = -0.79 %; 2: folding = -0.79 %; 3: Lo Rolloff = 0.00 %; 4: A~DeciShape = 0.00 % |
| deci / Shaped Decimate | EQ-DJ [{"track":23,"device":0},{"kind":"layer","container":0,"device":0}] | EQ-DJ | 0: Lo Gain = +0.0 dB; 1: Mid Gain = +0.0 dB; 2: Hi Gain = 0.0 dB; 3: Lo Freq = 339 Hz; 4: Lo On = Off; 5: Mid On = Off; 6: Hi On = Off; 7: Hi Freq = 3.89 kHz |
| deci / Shaped Decimate | Gate [{"track":23,"device":0},{"kind":"layer","container":0,"device":2}] | Gate | 0: Threshold = -55.2 dB; 1: Depth = +120 dB; 2: Attack = 0.91 ms; 3: Release = 126 ms |
| fuzz / FUZZ | Instrument Layer [{"track":24,"device":0}] | Perform | 0: Fuzz Control = 0.00 %; 4: A~Fuzz = 0.00 % |
| verb / Reverb | FX Layer [{"track":25,"device":0}] | Perform | 0: verb in = 50.4 %; 1: verb selector = 0.00 %; 4: A~VbIn = 0.00 %; 5: A~VbMod = -0.79 % |
| verb / Reverb | Instrument Layer [{"track":25,"device":0},{"kind":"layer","container":0,"device":1}] | Gain | 7: Gain = 0.0 dB |
| verb / Reverb | Tool [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":0}] | Tool | 0: Gain = +2.5 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |
| verb / Reverb | Convolution [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":1}] | Page 1 | 0: Tune = 0.00 st; 1: Tone = 0.0 dB; 2: St. Width = 5.25 %; 3: Wet Gain = 0.0 dB; 4: Pre-delay = 0.00 ms; 7: Mix = 100 % |
| verb / Reverb | Tool [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":1,"device":0}] | Tool | 0: Gain = -0.4 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |
| verb / Reverb | Convolution [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":1,"device":1}] | Page 1 | 0: Tune = 0.00 st; 1: Tone = 0.0 dB; 2: St. Width = 99.3 %; 3: Wet Gain = -8.4 dB; 4: Pre-delay = 0.00 ms; 7: Mix = 100 % |
| verb / Reverb | Tool [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":2,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |
| verb / Reverb | Tool [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":3,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |
| verb / Reverb | Tool [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":4,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |
| verb / Reverb | Convolution [{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":4,"device":1}] | Page 1 | 0: Tune = 0.00 st; 1: Tone = 0.0 dB; 2: St. Width = 100 %; 3: Wet Gain = -20.0 dB; 4: Pre-delay = 0.00 ms; 7: Mix = 100 % |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":0}] | Perform | 0: mastEQSel = 0.00 %; 1: schertler mix = 0.00 %; 4: A~mastEQ = 0.00 %; 5: ~a schertler mix = 11.0 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":1,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":2,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":3,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":4,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":0},{"kind":"layer","container":0,"device":1}] | Perform | 0: A~Mix = 0.00 %; 1: UM_SC Shaper = 0.00 %; 2: A~Noise = 0.00 %; 3: A~Drive = 0.00 %; 4: A~innerDepth = 0.00 %; 5: A~innerRate = 0.00 %; 6: A~wonk = 0.00 % |
| Master devices used by mast / Master | ValhallaUberMod [{"track":64,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":0}] | Perform | 0: Mix = 0.00 %; 1: Main control = 0.00 %; 2: Earth = 0.00 %; 3: Diffusio = 0.00 %; 4: UM_innerDepth = 0.00 %; 5: UM_Rate = 0.00 %; 6: Wonk SC = 0.00 %; 7: OverMod = 0.00 % |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":0},{"kind":"layer","container":0,"device":2}] | Page 1 | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | EQ-DJ [{"track":64,"device":0},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":0}] | EQ-DJ | 0: Lo Gain = -0.5 dB; 1: Mid Gain = 0.0 dB; 2: Hi Gain = +0.3 dB; 3: Lo Freq = 339 Hz; 4: Lo On = Off; 5: Mid On = Off; 6: Hi On = Off; 7: Hi Freq = 3.89 kHz |
| Master devices used by mast / Master | Tool [{"track":64,"device":0},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":2}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":0},{"kind":"layer","container":0,"device":3}] | Page 1 | 0: Gain = 0.0 dB; 1: Mix = 0.00 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":1,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":2,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Audio Receiver [{"track":64,"device":0},{"kind":"layer","container":3,"device":0}] | Mix | 0: Gain = 0.0 dB; 1: Mix = 100 % |
| Master devices used by mast / Master | Multiband FX-3 [{"track":64,"device":1}] | Perform | 0: Stut_SC_Amount = 48.0 %; 1: Stut_SC_Amount = 67.5 %; 2: Stut_SC_Amount = 100 %; 4: Stut SC In = 100 %; 5: Stut SC In = 100 %; 6: Stut SC In = 100 %; 7: Mix = 100 % |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":1},{"kind":"slot","container":"LOW","device":0}] | Perform | 0: Stut_SC_Amount = 48.0 %; 4: Stut SC In = 100 % |
| Master devices used by mast / Master | Tool [{"track":64,"device":1},{"kind":"slot","container":"LOW","device":0},{"kind":"layer","container":0,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 4.00 %; 2: St. Width = 107 %; 4: L- = Off; 5: R- = Off |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":1},{"kind":"slot","container":"HIGH","device":0}] | Perform | 0: Stut_SC_Amount = 100 %; 4: Stut SC In = 100 % |
| Master devices used by mast / Master | Tool [{"track":64,"device":1},{"kind":"slot","container":"HIGH","device":0},{"kind":"layer","container":0,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 4.00 %; 2: St. Width = 107 %; 4: L- = Off; 5: R- = Off |
| Master devices used by mast / Master | FX Layer [{"track":64,"device":1},{"kind":"slot","container":"MID","device":0}] | Perform | 0: Stut_SC_Amount = 67.5 %; 4: Stut SC In = 100 % |
| Master devices used by mast / Master | Tool [{"track":64,"device":1},{"kind":"slot","container":"MID","device":0},{"kind":"layer","container":0,"device":0}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 4.00 %; 2: St. Width = 107 %; 4: L- = Off; 5: R- = Off |
| Master devices used by mast / Master | Tool [{"track":64,"device":2}] | Tool | 0: Gain = 0.0 dB; 1: Pan = 0.00 %; 2: St. Width = 100 %; 4: L- = Off; 5: R- = Off |

## Root effect-bank order used by OSC

The dedicated API effect bank reports 19 tracks. These positions are independent of flat positions and send indices.

| Effect-bank index | Host track name |
| --- | --- |
| 0 | C1 |
| 1 | C2 |
| 2 | C3 |
| 3 | C4 |
| 4 | B1 SC BUS |
| 5 | A1 SC BUS |
| 6 | A2 SC BUS |
| 7 | B2 SC BUS |
| 8 | Stutter BUS |
| 9 | Splutter BUS |
| 10 | Ubermod BUS |
| 11 | Sparkle BUS |
| 12 | Decimate BUS |
| 13 | Fuzz BUS |
| 14 | Verb BUS |
| 15 | Mast BUS |
| 16 | P2 SC BUS |
| 17 | Environment BUS |
| 18 | ---BLANK--- |

## OSC device-target check

The exact native FX Layer matcher from the installed controller is `a0913b7f-096b-4ac9-bddd-33c775314b42`.

- `pro2`: 0 matching root FX Layers on `Pro 2`. The source binds filtered FX Layer index 0.
- `mast`: 1 matching root FX Layers on Master. The source binds filtered root index 0 for mast and index 1 for `stut 2`.

An absent filtered target is a configuration mismatch with this open template instance. This check does not send MIDI or prove which controls are used during performance.

## Track state supplement

Inactive tracks: `Ambient sounds`, `LH DRIVE`, `Splutter 5.0 (remote)`, `Midi guitar + Bass`, `AudioToMidi Stream`, `P2 record`, `AL Capture`, `Group 7`, `P2 SC BUS`, `Environment BUS`.
Armed tracks: `DelB.1`, `LH DRIVE`, `Midi guitar + Bass`, `AudioToMidi Stream`, `Master Record A`.
All 65 track names, mute states, volume and pan values agreed between the main and state passes.

## Remaining gaps

Input/output destinations, verified send edges, modulation assignment targets/amounts, plugin versions and hidden device state need separate evidence. Remaining unresolved parameter observations are explicitly marked in the full map. Slot navigation that retained its parent is unresolved rather than claimed empty. Other remote pages were not traversed. These gaps limit reproduction of the original DSP and routing.
