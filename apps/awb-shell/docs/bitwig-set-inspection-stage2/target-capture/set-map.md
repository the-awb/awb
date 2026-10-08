# awb 5.2 (ef script): open-set map

Host: Bitwig 4.3.10 / API 17. Capture run: `1791142098490`.

Captured 65 of 65 flat-bank tracks and 290 inspected devices. 57 devices are disabled. 0 devices have partial, unavailable or uninspected parameter coverage.

The open set is human-confirmed as an instance of the named template. Its file path and hash are unresolved; the template hash identifies the source template separately. Locators identify positions within this capture and are not stable Bitwig object IDs.

Comparable content SHA-256: `6130ba6a8eae4bd4d1c43b4221ff3b9d11210a6f239acfd5fa1d52946a86a9d5`.

## Coverage

- **tracks:** observed
- **hierarchy:** observed
- **routing:** Generic input/output and verified send destinations unavailable; manual annotation required
- **modulation:** Assignment targets and amounts unavailable through generic API
- **pluginVersions:** unavailable
- **remotePages:** Current page and page names observed; remaining pages unimplemented
- **coherence:** Static stopped template; bounded host-cache settling; no atomic snapshot or UI comparison claimed

Bank and traversal limits: `{"bank": 8, "chain": 256, "depth": 12, "devices": 4096, "displayPage": 64, "layers": 128, "minimumWaitMs": 450, "pads": 128, "parameters": 4096, "sends": 32, "tracks": 512, "waitAttempts": 12, "waitMs": 150}`.

Track volumes and sends retain normalized values and host display strings. Send labels are not verified routing destinations. Empty strings, zero and disabled states are retained. Missing callbacks and API NaN values have explicit status.

## Tracks and groups

| Capture ID | Parent | Name | Type | Volume | Mute | Solo | Activated | Armed | Monitor | Top-level devices |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| flat/0 | project root | Audio group | Group | 0.0 dB | False | False | True | False | AUTO | 0 |
| flat/1 | flat/0 | INS | Group | 0.0 dB | False | False | True | False | AUTO | 0 |
| flat/2 | flat/1 | Cello In | Group | 0.0 dB | False | False | True | False | OFF | 2 |
| flat/3 | flat/2 | Line 1 (VC) Group | Group | 0.0 dB | False | False | True | False | ON | 0 |
| flat/4 | flat/3 | Cello 1 | Hybrid | +0.6 dB | False | False | True | False | OFF | 1 |
| flat/5 | flat/1 | Pro 2 | Group | 0.0 dB | False | False | True | False | OFF | 1 |
| flat/6 | flat/5 | Pro2 | Audio | -0.8 dB | True | False | True | False | AUTO | 0 |
| flat/7 | flat/0 | Delays | Group | +0.5 dB | False | False | True | False | AUTO | 0 |
| flat/8 | flat/7 | Cello Delay BUS | Hybrid | -Inf dB | False | False | True | False | ON | 1 |
| flat/9 | flat/7 | DelB.1 | Hybrid | -0.3 dB | False | False | True | True | OFF | 3 |
| flat/10 | flat/7 | DelA.1 | Hybrid | +0.1 dB | False | False | True | False | OFF | 2 |
| flat/11 | flat/7 | DelA.2 | Hybrid | 0.0 dB | False | False | True | False | OFF | 3 |
| flat/12 | flat/7 | DelB.2 | Instrument | +0.0 dB | False | False | True | False | OFF | 2 |
| flat/13 | flat/0 | SC IN | Group | -4.2 dB | False | False | True | False | AUTO | 0 |
| flat/14 | flat/13 | SC IN 1 | Audio | 0.0 dB | False | False | True | False | ON | 0 |
| flat/15 | flat/13 | SC IN 2 | Audio | 0.0 dB | False | False | True | False | ON | 0 |
| flat/16 | flat/13 | SC IN 3 | Audio | 0.0 dB | False | False | True | False | ON | 0 |
| flat/17 | flat/13 | SC IN 4 | Audio | 0.0 dB | False | False | True | False | ON | 0 |
| flat/18 | flat/0 | Ambient sounds | Group | -0.6 dB | False | False | False | False | AUTO | 0 |
| flat/19 | flat/18 | Ambient 01 | Audio | -10.0 dB | False | False | True | False | AUTO | 0 |
| flat/20 | flat/0 | LH DRIVE | Instrument | +0.4 dB | False | False | False | True | AUTO | 3 |
| flat/21 | flat/0 | Splutter 5.0 (remote) | Effect | 0.0 dB | False | False | False | False | AUTO | 3 |
| flat/22 | flat/0 | Spiral Sparkle | Effect | -1.2 dB | False | False | True | False | AUTO | 2 |
| flat/23 | flat/0 | Shaped Decimate | Effect | -2.6 dB | False | False | True | False | OFF | 1 |
| flat/24 | flat/0 | FUZZ | Effect | -2.8 dB | False | False | True | False | AUTO | 1 |
| flat/25 | flat/0 | Reverb | Effect | -0.6 dB | False | False | True | False | OFF | 1 |
| flat/26 | flat/0 | Mast | Effect | -0.2 dB | False | False | True | False | OFF | 0 |
| flat/27 | project root | Midi guitar + Bass | Hybrid | -1.5 dB | False | False | False | True | OFF | 4 |
| flat/28 | project root | AudioToMidi Stream | Instrument | +0.3 dB | False | False | False | True | ON | 4 |
| flat/29 | project root | Mic | Audio | 0.0 dB | False | False | True | False | OFF | 1 |
| flat/30 | project root | Group 5 | Group | 0.0 dB | False | False | True | False | AUTO | 0 |
| flat/31 | flat/30 | Audio 1 | Audio | -55.3 dB | False | False | True | False | OFF | 0 |
| flat/32 | flat/30 | Audio 2 | Audio | -47.4 dB | False | False | True | False | AUTO | 0 |
| flat/33 | project root | Record | Group | 0.0 dB | False | False | True | False | AUTO | 0 |
| flat/34 | flat/33 | Mast Record | Group | 0.0 dB | False | False | True | False | AUTO | 0 |
| flat/35 | flat/34 | Master Record A | Audio | -1.1 dB | True | False | True | True | OFF | 8 |
| flat/36 | flat/34 | Master Record B | Audio | -1.1 dB | True | False | True | False | OFF | 8 |
| flat/37 | flat/34 | Master Record C | Audio | -1.1 dB | True | False | True | False | OFF | 8 |
| flat/38 | flat/34 | Reverb RETURN | Audio | -1.0 dB | False | False | True | False | OFF | 0 |
| flat/39 | flat/33 | P2 record | Group | 0.0 dB | False | False | False | False | AUTO | 0 |
| flat/40 | flat/33 | AL Capture | Group | +1.0 dB | False | False | False | False | OFF | 0 |
| flat/41 | project root | Group 7 | Group | 0.0 dB | False | False | False | False | AUTO | 0 |
| flat/42 | flat/41 | Windy reeds & trains 04 | Audio | -0.1 dB | False | False | True | False | AUTO | 2 |
| flat/43 | flat/41 | constructiona t batersea heavy ambient noise | Audio | +0.1 dB | False | False | True | False | AUTO | 1 |
| flat/44 | flat/41 | bell | Audio | -11.0 dB | False | False | True | False | AUTO | 1 |
| flat/45 | project root | C1 | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/46 | project root | C2 | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/47 | project root | C3 | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/48 | project root | C4 | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/49 | project root | B1 SC BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/50 | project root | A1 SC BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/51 | project root | A2 SC BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/52 | project root | B2 SC BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/53 | project root | Stutter BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/54 | project root | Splutter BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/55 | project root | Ubermod BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/56 | project root | Sparkle BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/57 | project root | Decimate BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/58 | project root | Fuzz BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/59 | project root | Verb BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/60 | project root | Mast BUS | Effect | -Inf dB | False | False | True | False | AUTO | 3 |
| flat/61 | project root | P2 SC BUS | Effect | -Inf dB | False | False | False | False | AUTO | 3 |
| flat/62 | project root | Environment BUS | Effect | -0.5 dB | False | False | False | False | AUTO | 2 |
| flat/63 | project root | ---BLANK--- | Effect | +0.2 dB | False | False | True | False | OFF | 2 |
| flat/64 | project root | Master | Master | -0.7 dB | False | False | True | False | OFF | 3 |

## flat/0: Audio group

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/1: INS

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/2: Cello In

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -18.3 dB | 0.4960629940032959 | AUTO | False | unresolved |
| 5 | Mast | 0.0 dB | 1 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -20.8 dB | 0.45000000000000007 | AUTO | False | unresolved |
| 9 | C4 | -26.3 dB | 0.365 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -10.5 dB | 0.6692913174629211 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### Time — disabled

Locator: `[{"track":2,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":2,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: VC chain 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | On/Off | 0 | 0 | Off | True |
| 1 | Stut_SC_Amount | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 | Stut SC In | 0 | 0 | 0.00 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Submarine Mono: 3 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Submarine Mono — disabled

Locator: `[{"track":2,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Submarine Stereo — disabled

Locator: `[{"track":2,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FX Layer — enabled

Locator: `[{"track":2,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Stutter standalone 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Stut_SC_Amount | 1 | 1 | 100 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | Stut SC In | 0 | 0 | 0.00 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Instrument SC stutter 4.1: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":2,"device":1},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Instrument SC stutter 4.1.

Remote controls: current page **Tool** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.49014649126264787 | 0.0 dB | True |
| 1 | Pan | 0.5200000000000004 | 0.5652343556284904 | 4.00 % | True |
| 2 | St. Width | 0.5349999999999999 | 0.7385827898979183 | 107 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5349999999999999 | 107 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5200000000000004 | 4.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/3: Line 1 (VC) Group

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | 0.0 dB | 1 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/4: Cello 1

Type: Hybrid. Chain coverage: **observed**. Volume: +0.6 dB (0.8137005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### Scheps 73 Mono — enabled

Locator: `[{"track":4,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/5: Pro 2

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -18.3 dB | 0.4960629940032959 | AUTO | False | unresolved |
| 5 | Mast | 0.0 dB | 1 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### Time — disabled

Locator: `[{"track":5,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.078125 | 9 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>


## flat/6: Pro2

Type: Audio. Chain coverage: **observed**. Volume: -0.8 dB (0.7707418735600998); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | 0.0 dB | 1 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | 0.0 dB | 1 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | 0.0 dB | 1 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/7: Delays

Type: Group. Chain coverage: **observed**. Volume: +0.5 dB (0.8100000000000002); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/8: Cello Delay BUS

Type: Hybrid. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### Scheps 73 Stereo — disabled

Locator: `[{"track":8,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/9: DelB.1

Type: Hybrid. Chain coverage: **observed**. Volume: -0.3 dB (0.7837005259840999); pan: -0.79 % (0.49606299212598426).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":9,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: delb1 routing 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Vc &gt; DB.1 | 1 | 1 | 100 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | TB &gt; DB.1 | 0 | 0 | 0.00 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Cello In: 1 devices (observed); Mic: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":9,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 1 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":9,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Minimal Delay — enabled

Locator: `[{"track":9,"device":1}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: minimal delay 5.0 (remote).

Remote controls: current page **** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | TH pos offset | 0 | 0 | 0.00 % | True |
| 5 | TH LFO Mod | 0 | 0 | 0.00 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): August Looper Main Control: 3 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.5049999999999999 | +0.2 dB | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":9,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 1 | 1 | 127.00 | True |
| 1 | K2 Value | 0.9606299212598425 | 0.9606299212598425 | 122.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0.007874015748031496 | 0.007874015748031496 | 1.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 0 | 0 | 0.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.4453125 | 56 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.390625 | 49 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.3671875 | 46 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.359375 | 45 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.9606299212598425 | 122.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0.007874015748031496 | 1.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5546875 | 70 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.5625 | 71 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.3203125 | 40 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.5703125 | 72 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":9,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0.12598425196850394 | 0.12598425196850394 | 16.00 | True |
| 1 | K2 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0.49606299212598426 | 0.49606299212598426 | 63.00 | True |
| 4 | K5 Value | 0.15748031496062992 | 0.15748031496062992 | 20.00 | True |
| 5 | K6 Value | 1 | 1 | 127.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 1 | 1 | 127.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.46875 | 59 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.6171875 | 78 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.34375 | 43 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3359375 | 42 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0.49606299212598426 | 63.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0.12598425196850394 | 16.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0.15748031496062992 | 20.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5859375 | 74 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.59375 | 75 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.6015625 | 76 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.578125 | 73 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Augustus Loop Fx Loop — enabled

Locator: `[{"track":9,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: Default Delay Early 2022 Awb 4.

Remote controls: current page **** (index 0, 7 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Unknown parameter | 0 | 0 |  | False |
| 1 | Unknown parameter | 0 | 0 |  | False |
| 2 | Unknown parameter | 0 | 0 |  | False |
| 3 | Unknown parameter | 0 | 0 |  | False |
| 4 | Unknown parameter | 0 | 0 |  | False |
| 5 | Unknown parameter | 0 | 0 |  | False |
| 6 | Unknown parameter | 0 | 0 |  | False |
| 7 | Unknown parameter | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FX Layer — disabled

Locator: `[{"track":9,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Env Gen 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Del Bus Mix | 0.15748031437397003 | 0.15748031437397003 | 15.7 % | True |
| 1 | env SC | 0.5099999999999999 | 0.5099999999999999 | 2.00 % | True |
| 2 | Delay_A-S | 0.007874015718698502 | 0.007874015718698502 | 0.79 % | True |
| 3 | Delay_D-R | 0.6299212574958801 | 0.6299212574958801 | 63.0 % | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): DelB.1 Env: 2 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — disabled

Locator: `[{"track":9,"device":2},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Env stutter.

Remote controls: current page **Tool** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | +0.0 dB | True |
| 1 | Pan | 0.49500000000000005 | 0.49500000000000005 | -1.00 % | True |
| 2 | St. Width | 0.5199999999999997 | 0.5199999999999997 | 104 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | +0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5199999999999997 | 104 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.49500000000000005 | -1.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.11000000000000006 | -39.5 dB | observed / observed / observed |

</details>

### Tremolo — disabled

Locator: `[{"track":9,"device":2},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Ampmod** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Rate | 0.7892857142857139 | 0.7892857142857139 | 5.79 Hz | True |
| 1 | Wave | 0 | 0 | Sine | True |
| 2 | Retrig | 0 | 0 | Off | True |
| 3 | Depth | 0.05500000000000048 | 0.05500000000000048 | 5.50 % | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/RATE | Rate | 0.7892857142857139 | 5.79 Hz | observed / observed / observed |
| CONTENTS/LFO_WAVEFORM | LFO Waveform | 0 | Sine | observed / observed / observed |
| CONTENTS/DEPTH | Depth | 0.05500000000000048 | 5.50 % | observed / observed / observed |
| CONTENTS/RETRIG | Note Retrigger | 0 | Off | observed / observed / observed |

</details>


## flat/10: DelA.1

Type: Hybrid. Chain coverage: **observed**. Volume: +0.1 dB (0.7978740157480315); pan: 0.24 % (0.5011811023622047).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":10,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: delA.1 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Vc &gt; DA1 | 1 | 1 | 100 % | True |
| 1 | DB1 &gt; DA1 | 0 | 0 | 0.00 % | True |
| 2 | A.2 &gt; DA1 | 0 | 0 | 0.00 % | True |
| 3 | B2 &gt; DA1 | 0 | 0 | 0.00 % | True |
| 4 | SC IN1 | 0.6400000000000001 | 0.6400000000000001 | 64.0 % | True |
| 5 | SC IN2 | 0 | 0 | 0.00 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Cello In: 1 devices (observed); B.1 Del Out: 1 devices (observed); SC1: 1 devices (observed); SC2: 1 devices (observed); AWD.kick: 1 devices (observed); A.2 Out: 1 devices (observed); B.2 Out: 1 devices (observed); AWD.hats: 1 devices (observed); AMBIENT: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 1 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0.6399999856948853 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":5,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":6,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":7,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":10,"device":0},{"kind":"layer","container":8,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Minimal Delay — enabled

Locator: `[{"track":10,"device":1}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: minimal delay 5.0 (remote).

Remote controls: current page **** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | TH pos offset | 0.25196850299835205 | 0.25196850299835205 | 25.2 % | True |
| 5 | TH LFO Mod | 0.25196850299835205 | 0.25196850299835205 | 25.2 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): August Looper Main Control: 3 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.5049999999999999 | +0.2 dB | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":10,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0.3858267716535433 | 0.3858267716535433 | 49.00 | True |
| 1 | K2 Value | 1 | 1 | 127.00 | True |
| 2 | A.2_Fdbk-DIR | 0.12598425196850394 | 0.12598425196850394 | 16.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 0 | 0 | 0.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.4453125 | 56 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.390625 | 49 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.3671875 | 46 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.359375 | 45 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0.12598425196850394 | 16.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0.3858267716535433 | 49.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5546875 | 70 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.5625 | 71 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.3203125 | 40 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.5703125 | 72 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":10,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0.06299212598425197 | 0.06299212598425197 | 8.00 | True |
| 1 | K2 Value | 0.031496062992125984 | 0.031496062992125984 | 4.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0.49606299212598426 | 0.49606299212598426 | 63.00 | True |
| 4 | K5 Value | 0.007874015748031496 | 0.007874015748031496 | 1.00 | True |
| 5 | K6 Value | 0.031496062992125984 | 0.031496062992125984 | 4.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 1 | 1 | 127.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.46875 | 59 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.6171875 | 78 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.34375 | 43 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3359375 | 42 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0.49606299212598426 | 63.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.031496062992125984 | 4.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0.06299212598425197 | 8.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0.031496062992125984 | 4.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0.007874015748031496 | 1.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5859375 | 74 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.59375 | 75 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.6015625 | 76 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.578125 | 73 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Augustus Loop Fx Loop — enabled

Locator: `[{"track":10,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: Default Delay Early 2022 Awb 4.

Remote controls: current page **** (index 0, 7 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Unknown parameter | 0 | 0 |  | False |
| 1 | Unknown parameter | 0 | 0 |  | False |
| 2 | Unknown parameter | 0 | 0 |  | False |
| 3 | Unknown parameter | 0 | 0 |  | False |
| 4 | Unknown parameter | 0 | 0 |  | False |
| 5 | Unknown parameter | 0 | 0 |  | False |
| 6 | Unknown parameter | 0 | 0 |  | False |
| 7 | Unknown parameter | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/11: DelA.2

Type: Hybrid. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 3.94 % (0.5196850393700787).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":11,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: delA.2 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Vc  &gt; DA2 | 1 | 1 | 100 % | True |
| 1 | DB1  &gt; DA2 | 0.5039370059967041 | 0.5039370059967041 | 50.4 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | TB  &gt; DA2 | 0 | 0 | 0.00 % | True |
| 5 | Drums Live &gt; A2 | 0 | 0 | 0.00 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Cello In: 1 devices (observed); B.1 Del Out: 1 devices (observed); Pro2 Out: 1 devices (observed); SC3: 1 devices (observed); Mic: 1 devices (observed); Drums Live: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0.9921259842519685 | 99.2 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":11,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 1 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":11,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0.5039370059967041 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":11,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":11,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":11,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":11,"device":0},{"kind":"layer","container":5,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Minimal Delay — enabled

Locator: `[{"track":11,"device":1}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: minimal delay 5.0 (remote).

Remote controls: current page **** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | TH pos offset | 0.14960630238056183 | 0.14960630238056183 | 15.0 % | True |
| 5 | TH LFO Mod | 0.4015747904777527 | 0.4015747904777527 | 40.2 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): August Looper Main Control: 3 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.5049999999999999 | +0.2 dB | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":11,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0.8031496062992126 | 0.8031496062992126 | 102.00 | True |
| 2 | A.2_Fdbk-DIR | 1 | 1 | 127.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 0 | 0 | 0.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.4453125 | 56 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.390625 | 49 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.3671875 | 46 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.359375 | 45 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.8031496062992126 | 102.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5546875 | 70 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.5625 | 71 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.3203125 | 40 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.5703125 | 72 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":11,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0.031496062992125984 | 0.031496062992125984 | 4.00 | True |
| 1 | K2 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0.49606299212598426 | 0.49606299212598426 | 63.00 | True |
| 4 | K5 Value | 0.07874015748031496 | 0.07874015748031496 | 10.00 | True |
| 5 | K6 Value | 0.31496062992125984 | 0.31496062992125984 | 40.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 1 | 1 | 127.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.46875 | 59 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.6171875 | 78 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.34375 | 43 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3359375 | 42 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0.49606299212598426 | 63.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0.031496062992125984 | 4.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0.31496062992125984 | 40.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0.07874015748031496 | 10.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5859375 | 74 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.59375 | 75 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.6015625 | 76 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.578125 | 73 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Augustus Loop Fx Loop — enabled

Locator: `[{"track":11,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: Default Delay Early 2022 Awb 4.

Remote controls: current page **** (index 0, 7 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Unknown parameter | 0 | 0 |  | False |
| 1 | Unknown parameter | 0 | 0 |  | False |
| 2 | Unknown parameter | 0 | 0 |  | False |
| 3 | Unknown parameter | 0 | 0 |  | False |
| 4 | Unknown parameter | 0 | 0 |  | False |
| 5 | Unknown parameter | 0 | 0 |  | False |
| 6 | Unknown parameter | 0 | 0 |  | False |
| 7 | Unknown parameter | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Peak Limiter — enabled

Locator: `[{"track":11,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Limiter** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5020833333333333 | 0.5020833333333333 | +0.1 dB | True |
| 1 | Ceiling | 0.9716666666666666 | 0.9716666666666666 | -1.0 dB | True |
| 2 | Release | 0.7099999999999999 | 0.7099999999999999 | 1.35 s | True |
| 3 | Release Bias | 0.5 | 0.5 | 0.00 % | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CEILING | Ceiling | 0.9716666666666666 | -1.0 dB | observed / observed / observed |
| CONTENTS/GAIN | Input Gain | 0.5020833333333333 | +0.1 dB | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.7099999999999999 | 1.35 s | observed / observed / observed |
| CONTENTS/RELEASE_BIAS | Release Bias | 0.5 | 0.00 % | observed / observed / observed |

</details>


## flat/12: DelB.2

Type: Instrument. Chain coverage: **observed**. Volume: +0.0 dB (0.7950000000000002); pan: 0.79 % (0.5039370078740157).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":12,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: delB.2 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Vc &gt; DB2 | 1 | 1 | 100 % | True |
| 1 | DB1 &gt; DB2 | 0 | 0 | 0.00 % | True |
| 2 | DA2 &gt; DB2 | 0.5984252095222473 | 0.5984252095222473 | 59.8 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | TB &gt; DB2 | 0 | 0 | 0.00 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Cello In: 1 devices (observed); Mic In: 1 devices (observed); DelB.1 Out: 2 devices (observed); DelA.2 Out: 2 devices (observed); Pro2 Out: 2 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 1 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — disabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":2,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Pro2 Percussion Mod.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Compressor: 3 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Compressor — disabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":2,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.6449999997019769 | 0.6449999997019769 | +5.8 dB | True |
| 1 | Threshold | 0.19499997456868468 | 0.19499997456868468 | -48.3 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0 | 0 | 0.20 ms | True |
| 4 | Release | 0.6300000035457124 | 0.6300000035457124 | 374 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.8899999999999999 | 0.8899999999999999 | 9.09:1 | True |
| 7 | Output | 0.8149999999999998 | 0.8149999999999998 | +12.6 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.8149999999999998 | +12.6 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0 | 0.20 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.6300000035457124 | 374 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.8899999999999999 | 9.09:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.19499997456868468 | -48.3 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.6449999997019769 | +5.8 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 2 — disabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":2,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### EQ-2 — disabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":2,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **EQ** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Type | 0 | 0 | High-pass (2-pole) | True |
| 1 | Lo Gain | 0.5 | 0.5 | 0.0 dB | True |
| 2 | Lo Freq | 0.09867094302319375 | 0.09867094962080143 | 39.5 Hz | True |
| 3 | Lo Q | 0.3266996153846154 | 0.3266996153846154 | 0.71 | True |
| 4 | Hi Type | 0.3333333333333333 | 0.3333333333333333 | Low-pass (4-pole) | True |
| 5 | Hi Gain | 0.5145833333333333 | 0.5145833330849806 | +0.7 dB | True |
| 6 | Hi Freq | 0.5585848522814154 | 0.5585848283513772 | 948 Hz | True |
| 7 | Hi Q | 0.3266996153846154 | 0.3266996153846154 | 0.71 | True |

Slots (observed): .

Parameters: **observed**, host count 10.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LO_GAIN | Lo Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/LO_FREQ | Lo Freq | 0.09867094302319375 | 39.5 Hz | observed / observed / observed |
| CONTENTS/LO_Q | Lo Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/TYPE1 | Lo Type | 0 | High-pass (2-pole) | observed / observed / observed |
| CONTENTS/LO_ENABLE | Lo On | 1 | On | observed / observed / observed |
| CONTENTS/HI_TYPE | Hi Type | 0.3333333333333333 | Low-pass (4-pole) | observed / observed / observed |
| CONTENTS/HI_FREQ | Hi Freq | 0.5585848522814154 | 948 Hz | observed / observed / observed |
| CONTENTS/HI_GAIN | Hi Gain | 0.5145833333333333 | +0.7 dB | observed / observed / observed |
| CONTENTS/HI_Q | Hi Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/HI_ENABLE | Hi On | 1 | On | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0.5984252095222473 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":3,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.405 | 0.405 | 81.0 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.405 | 81.0 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — disabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":4,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Pro2 Percussion Mod.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Compressor: 3 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":4,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.6449999997019769 | 0.6449999997019769 | +5.8 dB | True |
| 1 | Threshold | 0.19499997456868468 | 0.19499997456868468 | -48.3 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0 | 0 | 0.20 ms | True |
| 4 | Release | 0.6300000035457124 | 0.6300000035457124 | 374 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.8899999999999999 | 0.8899999999999999 | 9.09:1 | True |
| 7 | Output | 0.8149999999999998 | 0.8149999999999998 | +12.6 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.8149999999999998 | +12.6 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0 | 0.20 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.6300000035457124 | 374 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.8899999999999999 | 9.09:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.19499997456868468 | -48.3 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.6449999997019769 | +5.8 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 2 — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":4,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### EQ-2 — enabled

Locator: `[{"track":12,"device":0},{"kind":"layer","container":4,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **EQ** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Type | 0 | 0 | High-pass (2-pole) | True |
| 1 | Lo Gain | 0.5 | 0.5 | 0.0 dB | True |
| 2 | Lo Freq | 0.09867094962080143 | 0.09867094962080143 | 39.5 Hz | True |
| 3 | Lo Q | 0.3266996153846154 | 0.3266996153846154 | 0.71 | True |
| 4 | Hi Type | 0.3333333333333333 | 0.3333333333333333 | Low-pass (4-pole) | True |
| 5 | Hi Gain | 0.5145833330849806 | 0.5145833330849806 | +0.7 dB | True |
| 6 | Hi Freq | 0.5585848522814154 | 0.5585848283513772 | 948 Hz | True |
| 7 | Hi Q | 0.3266996153846154 | 0.3266996153846154 | 0.71 | True |

Slots (observed): .

Parameters: **observed**, host count 10.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LO_GAIN | Lo Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/LO_FREQ | Lo Freq | 0.09867094302319375 | 39.5 Hz | observed / observed / observed |
| CONTENTS/LO_Q | Lo Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/TYPE1 | Lo Type | 0 | High-pass (2-pole) | observed / observed / observed |
| CONTENTS/LO_ENABLE | Lo On | 1 | On | observed / observed / observed |
| CONTENTS/HI_TYPE | Hi Type | 0.3333333333333333 | Low-pass (4-pole) | observed / observed / observed |
| CONTENTS/HI_FREQ | Hi Freq | 0.5585848522814154 | 948 Hz | observed / observed / observed |
| CONTENTS/HI_GAIN | Hi Gain | 0.5145833333333333 | +0.7 dB | observed / observed / observed |
| CONTENTS/HI_Q | Hi Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/HI_ENABLE | Hi On | 1 | On | observed / observed / observed |

</details>

### Minimal Delay — enabled

Locator: `[{"track":12,"device":1}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: minimal delay 5.0 (remote).

Remote controls: current page **** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | TH pos offset | 0 | 0 | 0.00 % | True |
| 5 | TH LFO Mod | 0 | 0 | 0.00 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): August Looper Main Control: 3 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.5049999999999999 | +0.2 dB | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":12,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0.5905511811023622 | 0.5905511811023622 | 75.00 | True |
| 2 | A.2_Fdbk-DIR | 1 | 1 | 127.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0.007874015748031496 | 0.007874015748031496 | 1.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 0 | 0 | 0.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.4453125 | 56 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.390625 | 49 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.3671875 | 46 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.359375 | 45 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.5905511811023622 | 75.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0.007874015748031496 | 1.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5546875 | 70 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.5625 | 71 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.3203125 | 40 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.5703125 | 72 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Main Control — enabled

Locator: `[{"track":12,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: August Looper Main Control.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0.12598425196850394 | 0.12598425196850394 | 16.00 | True |
| 1 | K2 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0.49606299212598426 | 0.49606299212598426 | 63.00 | True |
| 4 | K5 Value | 0.15748031496062992 | 0.15748031496062992 | 20.00 | True |
| 5 | K6 Value | 1 | 1 | 127.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 1 | 1 | 127.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0.46875 | 59 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0.6171875 | 78 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0.34375 | 43 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3359375 | 42 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0.49606299212598426 | 63.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0.12598425196850394 | 16.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0.15748031496062992 | 20.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 1 | 127.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0.5859375 | 74 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0.59375 | 75 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0.6015625 | 76 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0.578125 | 73 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Augustus Loop Fx Loop — enabled

Locator: `[{"track":12,"device":1},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: Default Delay Early 2022 Awb 4.

Remote controls: current page **** (index 0, 7 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Unknown parameter | 0 | 0 |  | False |
| 1 | Unknown parameter | 0 | 0 |  | False |
| 2 | Unknown parameter | 0 | 0 |  | False |
| 3 | Unknown parameter | 0 | 0 |  | False |
| 4 | Unknown parameter | 0 | 0 |  | False |
| 5 | Unknown parameter | 0 | 0 |  | False |
| 6 | Unknown parameter | 0 | 0 |  | False |
| 7 | Unknown parameter | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/13: SC IN

Type: Group. Chain coverage: **observed**. Volume: -4.2 dB (0.6749999999999999); pan: 3.94 % (0.5196850393700787).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/14: SC IN 1

Type: Audio. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -30.9 dB | 0.30499999999999955 | AUTO | False | unresolved |
| 5 | Mast | 0.0 dB | 1 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/15: SC IN 2

Type: Audio. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -36.7 dB | 0.24500000000000002 | AUTO | False | unresolved |
| 5 | Mast | -0.8 dB | 0.9700000000000004 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/16: SC IN 3

Type: Audio. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | 0.0 dB | 1 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/17: SC IN 4

Type: Audio. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | 0.0 dB | 1 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/18: Ambient sounds

Type: Group. Chain coverage: **observed**. Volume: -0.6 dB (0.7758661417322836); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/19: Ambient 01

Type: Audio. Chain coverage: **observed**. Volume: -10.0 dB (0.5407418735600996); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/20: LH DRIVE

Type: Instrument. Chain coverage: **observed**. Volume: +0.4 dB (0.8057418735600999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -0.7 dB | 0.9750000000000002 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":20,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: LH DRIVE.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): VC: 1 devices (observed); Drums: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":20,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":20,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Grid — enabled

Locator: `[{"track":20,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 21 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Level 1 | 0.8000000000000007 | 0.8000000000000007 | +0.2 dB | True |
| 1 | Level 2 | 0.4199999999999988 | 0.4199999999999988 | -16.6 dB | True |
| 2 | Level 3 | 0.25000000000000083 | 0.24999998882708804 | -30.1 dB | True |
| 3 | Level 4 | 0.6200000000000001 | 0.6200000000000001 | -6.5 dB | True |
| 4 | Pan 1 | 0.48499999999999993 | 0.48499999999999993 | -3.00 % | True |
| 5 | Pan 2 | 0.27 | 0.27 | -46.0 % | True |
| 6 | Pan 3 | 0.7249999999999998 | 0.7249999999999998 | 45.0 % | True |
| 7 | Pan 4 | 0.505 | 0.505 | 1.00 % | True |

Slots (observed): Post FX: None devices (unresolved); Pre FX: None devices (unresolved).

Parameters: **observed**, host count 9.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PITCH_TRANSPOSE | Pitch | 0.5 | 0.00 | observed / observed / observed |
| CONTENTS/SHUFFLE | Device Ø Shuffle | 0 | Off | observed / observed / observed |
| CONTENTS/LENGTH | Device Ø Length | 0.15306122448979592 | 16 | observed / observed / observed |
| CONTENTS/OFFSET | Device Ø Offset | 0.5 | 0 | observed / observed / observed |
| CONTENTS/TIMEBASE | Device Ø Timebase | 0.8 | 16th note | observed / observed / observed |
| CONTENTS/MIX | Mix | 0.6400000000000002 | 64.0 % | observed / observed / observed |
| CONTENTS/FREERUN | Free-run when stopped | 1 | On | observed / observed / observed |
| CONTENTS/NOTE_THRU | Note Thru | 1 | On | observed / observed / observed |
| CONTENTS/CONTROL_THRU | Control Thru | 1 | On | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":20,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Compressor: 2 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":20,"device":2},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.505 | 0.505 | +0.2 dB | True |
| 1 | Threshold | 0.3166666666666679 | 0.3166666666666679 | -41.0 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 1 | 1 | 70.8 ms | True |
| 4 | Release | 0.28500000000000036 | 0.28500000000000036 | 108 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.4349999999999995 | 0.4349999999999995 | 1.77:1 | True |
| 7 | Output | 0.5 | 0.5 | 0.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 1 | 70.8 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.28500000000000036 | 108 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.4349999999999995 | 1.77:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.3166666666666679 | -41.0 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 0 | Off | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.505 | +0.2 dB | observed / observed / observed |

</details>

### Peak Limiter — enabled

Locator: `[{"track":20,"device":2},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Limiter** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Ceiling | 0.7756666666666678 | 0.7756666666666678 | -8.1 dB | True |
| 2 | Release | 0.7099999999999999 | 0.7099999999999999 | 1.35 s | True |
| 3 | Release Bias | 0.5 | 0.5 | 0.00 % | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CEILING | Ceiling | 0.7756666666666678 | -8.1 dB | observed / observed / observed |
| CONTENTS/GAIN | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.7099999999999999 | 1.35 s | observed / observed / observed |
| CONTENTS/RELEASE_BIAS | Release Bias | 0.5 | 0.00 % | observed / observed / observed |

</details>


## flat/21: Splutter 5.0 (remote)

Type: Effect. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | POST | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":21,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Splutter 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | A~splutShaper | 0 | 0 | 0.00 % | True |
| 1 | A~Shaper2 | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 | A~g8 | 0 | 0 | 0.00 % | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 | A~lopass | 0 | 0 | 0.00 % | True |

Layers (observed): Splutter 5.0 (remote): 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Grid — enabled

Locator: `[{"track":21,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Splutter 5.0 (remote).

Remote controls: current page **** (index 0, 14 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Splutter Shape | 0.007874015718698502 | 0.007874015718698502 | 0.79 % | True |
| 1 | Steps | 0.7716535329818726 | 0.7716535329818726 | 77.2 % | True |
| 2 | Time div SC | 0.31496062874794006 | 0.31496062874794006 | -37.0 % | True |
| 3 | gate length | 0.7716535329818726 | 0.7716535329818726 | 77.2 % | True |
| 4 | Splutter Shaper 2 | 0 | 0 | 0.00 % | True |
| 5 | Env Mod | 0 | 0 | -100 % | True |
| 6 | Phase mod amt | 0.7716535329818726 | 0.7716535329818726 | 77.2 % | True |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Post FX: None devices (unresolved); Pre FX: 1 devices (observed).

Parameters: **observed**, host count 9.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PITCH_TRANSPOSE | Pitch | 0.5000000000000001 | 0.00 | observed / observed / observed |
| CONTENTS/SHUFFLE | Device Ø Shuffle | 0 | Off | observed / observed / observed |
| CONTENTS/LENGTH | Device Ø Length | 0.15306122448979592 | 16 | observed / observed / observed |
| CONTENTS/OFFSET | Device Ø Offset | 0.5 | 0 | observed / observed / observed |
| CONTENTS/TIMEBASE | Device Ø Timebase | 0.8 | 16th note | observed / observed / observed |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/FREERUN | Free-run when stopped | 1 | On | observed / observed / observed |
| CONTENTS/NOTE_THRU | Note Thru | 1 | On | observed / observed / observed |
| CONTENTS/CONTROL_THRU | Control Thru | 1 | On | observed / observed / observed |

</details>

### Echo — disabled

Locator: `[{"track":21,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"slot","container":"Pre FX","device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MONO | Monophonic | 0 | Off | observed / observed / observed |
| CONTENTS/REPEAT_TIMES | Echo Count | 0 | ≤ 0 | observed / observed / observed |
| CONTENTS/DELAY_LEVEL | Echo Velocity | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/FEEDBACK_VELOCITY | Feedback Velocity | 0.3828125 | -15 | observed / observed / observed |
| CONTENTS/FEEDBACK_TRANSPOSE | Feedback Transpose | 0.7083333333333334 | 5 | observed / observed / observed |
| CONTENTS/FEEDBACK_DELAY | Feedback Delay Time | 0.42857142857142855 | 0.00 % | observed / observed / observed |
| CONTENTS/FEEDBACK_GATETIME | Feedback Gate Time | 0.49999999999999994 | -0.00 % | observed / observed / observed |
| CONTENTS/TIME | Length in Time | 0.008216432865731463 | 51.0 ms | observed / observed / observed |
| CONTENTS/SYNC | Set in 16ᵗʰ Notes | 0 | Off | observed / observed / observed |
| CONTENTS/OFFSET | Beat Time Offset | 0.5019716880341881 | 0.13 % | observed / observed / observed |
| CONTENTS/SYNC_DELAY | Length in Beats | 0.13333333333333333 | 3 / 16 | observed / observed / observed |
| CONTENTS/KEY_WRAP_FLOOR | Feedback Pitch Minimum | 0 | Min: 0 | observed / observed / observed |
| CONTENTS/KEY_WRAP_CEILING | Feedback Pitch Maximum | 1 | Max: 127 | observed / observed / observed |
| CONTENTS/RANDOM | Feedback Delay Time Randomization | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/MUTE_INITIAL_NOTE | Mute Initial Note | 0 | Off | observed / observed / observed |
| CONTENTS/INFINTE_REPEAT | Infinite Repeat | 0 | Off | observed / observed / observed |
| CONTENTS/REPEAT_MOD | Repeat Mode | 0 | x | observed / observed / observed |

</details>

### EQ-5 — enabled

Locator: `[{"track":21,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gain** (index 0, 7 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | 1 Gain | 0.32706766917293223 | 0.32706766917293223 | -8.3 dB | True |
| 1 | 2 Gain | 0.29699248120300764 | 0.29699248120300764 | -9.7 dB | True |
| 2 | 3 Gain | 0.41729323308270677 | 0.41729323308270677 | -4.0 dB | True |
| 3 | 4 Gain | 0.5451127819548872 | 0.5451127819548872 | +2.2 dB | True |
| 4 | 5 Gain | 0.5 | 0.5 | 0.0 dB | True |
| 5 | Amount | 1 | 1 | 100 % | True |
| 6 | Shift | 0.5 | 0.5 | 0.00 st | True |
| 7 | Output | 0.45625 | 0.45625 | -2.1 dB | True |

Slots (observed): .

Parameters: **observed**, host count 29.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN1 | Band 1 Gain | 0.32706766917293223 | -8.3 dB | observed / observed / observed |
| CONTENTS/FREQ1 | Band 1 Freq | 0.25006110765773004 | 113 Hz | observed / observed / observed |
| CONTENTS/Q1 | Band 1 Q | 0.32669977453726895 | 0.71 | observed / observed / observed |
| CONTENTS/TYPE1 | Band 1 Type | 1 | Low-shelf | observed / observed / observed |
| CONTENTS/ENABLE1 | Band 1 On | 1 | On | observed / observed / observed |
| CONTENTS/TYPE2 | Band 2 Type | 0 | Bell | observed / observed / observed |
| CONTENTS/FREQ2 | Band 2 Freq | 0.3365692196416711 | 205 Hz | observed / observed / observed |
| CONTENTS/GAIN2 | Band 2 Gain | 0.29699248120300764 | -9.7 dB | observed / observed / observed |
| CONTENTS/Q2 | Band 2 Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/TYPE3 | Band 3 Type | 0 | Bell | observed / observed / observed |
| CONTENTS/FREQ3 | Band 3 Freq | 0.5579813159501762 | 944 Hz | observed / observed / observed |
| CONTENTS/GAIN3 | Band 3 Gain | 0.41729323308270677 | -4.0 dB | observed / observed / observed |
| CONTENTS/Q3 | Band 3 Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/TYPE4 | Band 4 Type | 0 | Bell | observed / observed / observed |
| CONTENTS/TYPE5 | Band 5 Type | 0.6666666666666666 | Bell | observed / observed / observed |
| CONTENTS/FREQ4 | Band 4 Freq | 0.7665444895380983 | 3.99 kHz | observed / observed / observed |
| CONTENTS/GAIN4 | Band 4 Gain | 0.5451127819548872 | +2.2 dB | observed / observed / observed |
| CONTENTS/Q4 | Band 4 Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/FREQ5 | Band 5 Freq | 0.9255307786166642 | 12.0 kHz | observed / observed / observed |
| CONTENTS/GAIN5 | Band 5 Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/Q5 | Band 5 Q | 0.3266996153846154 | 0.71 | observed / observed / observed |
| CONTENTS/ENABLE2 | Band 2 On | 1 | On | observed / observed / observed |
| CONTENTS/ENABLE3 | Band 3 On | 1 | On | observed / observed / observed |
| CONTENTS/ENABLE4 | Band 4 On | 1 | On | observed / observed / observed |
| CONTENTS/ENABLE5 | Band 5 On | 1 | On | observed / observed / observed |
| CONTENTS/OUTPUT_GAIN | Output Gain | 0.45625 | -2.1 dB | observed / observed / observed |
| CONTENTS/GLOBAL_AMOUNT | Global Amount | 1 | 100 % | observed / observed / observed |
| CONTENTS/GLOBAL_SHIFT | Global Shift | 0.5 | 0.00 st | observed / observed / observed |
| CONTENTS/SPECTRUM_SELECTOR | Spectrum Display | 1 | Both | observed / observed / observed |

</details>

### Things Texture — enabled

Locator: `[{"track":21,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/22: Spiral Sparkle

Type: Effect. Chain coverage: **observed**. Volume: -1.2 dB (0.7587005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":22,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Sparkle 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | A~Sparkle shaper | 0 | 0 | 0.00 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | A~Spark | 0 | 0 | 0.00 % | True |
| 5 | A~TailMix | 0.34645670652389526 | 0.34645670652389526 | 34.6 % | True |
| 6 | A~Pitch delay | 0 | 0 | 0.00 % | True |
| 7 | A~tail shaper | 0 | 0 | 0.00 % | True |

Layers (observed): Spiral Sparkle 4.3: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Spiral Sparkle 4.3.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Sparkle Shape | 0 | 0 | 0.00 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | Sparkle | 0 | 0 | 0.00 % | True |
| 5 | Tail Mix | 0 | 0 | 0.00 % | True |
| 6 | Pitch delay select | 0 | 0 | 0.00 % | True |
| 7 | d++ tail shaper | 0 | 0 | 0.00 % | True |

Layers (observed): EQ-DJ: 4 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.33999999999999986 | -7.7 dB | observed / observed / observed |

</details>

### EQ-DJ — disabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **EQ-DJ** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Gain | 0.45500000000000007 | 0.45500000000000007 | -2.5 dB | True |
| 1 | Mid Gain | 0.34000000000000025 | 0.34000000000000025 | -10.0 dB | True |
| 2 | Hi Gain | 0.5 | 0.5 | 0.0 dB | True |
| 3 | Lo Freq | 0.6400000000000009 | 0.6400000000000009 | 339 Hz | True |
| 4 | Lo On | 0 | 0 | Off | True |
| 5 | Mid On | 0 | 0 | Off | True |
| 6 | Hi On | 0 | 0 | Off | True |
| 7 | Hi Freq | 0.485 | 0.485 | 3.89 kHz | True |

Slots (observed): .

Parameters: **observed**, host count 8.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LOW_FREQ | Low Crossover Frequency | 0.6400000000000009 | 339 Hz | observed / observed / observed |
| CONTENTS/HIGH_FREQ | High Crossover Frequency | 0.485 | 3.89 kHz | observed / observed / observed |
| CONTENTS/KILL_LOWS | Low Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_MIDS | Mid Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_HIGHS | High Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/LOW_GAIN | Low Band Gain | 0.45500000000000007 | -2.5 dB | observed / observed / observed |
| CONTENTS/MID_GAIN | Mid Band Gain | 0.34000000000000025 | -10.0 dB | observed / observed / observed |
| CONTENTS/HIGH_GAIN | High Band Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.36000000000000004 | 0.36000000000000004 | -6.7 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): ++spiralstretch: 1 devices (observed); ++pitchdelay upper: 1 devices (observed); ++pitchdelay lower: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.36000000000000004 | -6.7 dB | observed / observed / observed |

</details>

### ++spiralstretch — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PIDfd4e705 | stretch | 0.6142458915710449 | 15.1 | observed / observed / observed |
| CONTENTS/PID484c2d9b | repeat | 0.7348299622535706 | 1.3 | observed / observed / observed |
| CONTENTS/PID592c0de | bands | 0.4000000059604645 | 128.0 | observed / observed / observed |
| CONTENTS/PID2e7beafc | grainsize | 0.7529201507568359 | 1.2 | observed / observed / observed |
| CONTENTS/PID55e3bf8 | grainvariation | 0.5210546255111694 | 52.1 | observed / observed / observed |
| CONTENTS/PID2e7abd55 | grainpvoc | 0 | granular | observed / observed / observed |
| CONTENTS/PID1ded6fcc | midilock | 0 | 0 | observed / observed / observed |
| CONTENTS/PID4fa94581 | voices | 0.1666666716337204 | 3.0 | observed / observed / observed |
| CONTENTS/PID50d63885 | wetdry | 0.48407572507858276 | 48.4 | observed / observed / observed |
| CONTENTS/PID396b3e24 | ingain | 0.5457705855369568 | 1.8 | observed / observed / observed |
| CONTENTS/PID3e0da3cd | outgain | 0.5 | 0.0 | observed / observed / observed |
| CONTENTS/PID5a72f63 | color | 0 | 0.0000000 | observed / observed / observed |

</details>

### ++pitchdelay — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID3652cd | time | 0.46702447533607483 | 269.6 | observed / observed / observed |
| CONTENTS/PID6f41b142 | pitchshift | 0.5 | 0c | observed / observed / observed |
| CONTENTS/PID5a2abcb | cents | 0.6200000047683716 | 24.0 | observed / observed / observed |
| CONTENTS/PID431339b0 | octave | 1 | 3.0 | observed / observed / observed |
| CONTENTS/PID7495eb85 | feedback | 0.005 | 1.0 | observed / observed / observed |
| CONTENTS/PID4c248a9f | loopdepth | 0.9162613153457642 | 91.6 | observed / observed / observed |
| CONTENTS/PID6415052e | delaylock | 0 | 0 | observed / observed / observed |
| CONTENTS/PID31f4ec | just | 0 | 12tet | observed / observed / observed |
| CONTENTS/PID5a72f63 | color | 0 | 0.0000000 | observed / observed / observed |
| CONTENTS/PID50d63885 | wetdry | 0 | 73.5 | observed / observed / observed |
| CONTENTS/PID396b3e24 | ingain | 0.6078574657440186 | 4.3 | observed / observed / observed |
| CONTENTS/PID3e0da3cd | outgain | 0.5 | 0.0 | observed / observed / observed |

</details>

### ++pitchdelay — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID3652cd | time | 0.579268753528595 | 567.4 | observed / observed / observed |
| CONTENTS/PID6f41b142 | pitchshift | 0 | -1200c | observed / observed / observed |
| CONTENTS/PID5a2abcb | cents | 0.5 | 0.0 | observed / observed / observed |
| CONTENTS/PID431339b0 | octave | 0.3333333432674408 | -2.0 | observed / observed / observed |
| CONTENTS/PID7495eb85 | feedback | 0 | 145.0 | observed / observed / observed |
| CONTENTS/PID4c248a9f | loopdepth | 0.7944561243057251 | 79.4 | observed / observed / observed |
| CONTENTS/PID6415052e | delaylock | 0 | 0 | observed / observed / observed |
| CONTENTS/PID31f4ec | just | 0 | 12tet | observed / observed / observed |
| CONTENTS/PID5a72f63 | color | 0 | 0.0000000 | observed / observed / observed |
| CONTENTS/PID50d63885 | wetdry | 0 | 53.1 | observed / observed / observed |
| CONTENTS/PID396b3e24 | ingain | 0.6045340299606323 | 4.2 | observed / observed / observed |
| CONTENTS/PID3e0da3cd | outgain | 0.5 | 0.0 | observed / observed / observed |

</details>

### ++delay — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 19.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID3652cd | time | 0.331573486328125 | 253.3 | observed / observed / observed |
| CONTENTS/PID7495eb85 | feedback | 0.28222527623176563 | 86.6 | observed / observed / observed |
| CONTENTS/PID5be16a85 | modspeed | 0.4510473310947418 | 0.7 | observed / observed / observed |
| CONTENTS/PID5b093501 | moddepth | 0.34804075956344604 | 0.5 | observed / observed / observed |
| CONTENTS/PID5bddb9df | modshape | 0 | sine | observed / observed / observed |
| CONTENTS/PID5bb373b9 | modphase | 0.5921059846878052 | 33.2 | observed / observed / observed |
| CONTENTS/PID695006c6 | envmodulate | 0.006030708085745573 | 0.9 | observed / observed / observed |
| CONTENTS/PID7ff28cd | filterlopfreq | 1 | 20000.0 | observed / observed / observed |
| CONTENTS/PID2a29280f | filterhipfreq | 0.1382075995206833 | 22.7 | observed / observed / observed |
| CONTENTS/PID4bf9be07 | filterreson | 0.44596579670906067 | 44.6 | observed / observed / observed |
| CONTENTS/PID159b307e | feedbackpositive | 0 | feedback + | observed / observed / observed |
| CONTENTS/PID34843a97 | freeze | 0 | 0 | observed / observed / observed |
| CONTENTS/PID6415052e | delaylock | 0 | 0 | observed / observed / observed |
| CONTENTS/PID57e44e0 | lfolock | 0 | 0 | observed / observed / observed |
| CONTENTS/PID49b08a2c | twohead | 1 | twohead | observed / observed / observed |
| CONTENTS/PID5a72f63 | color | 0.7049999833106995 | 0.7050000 | observed / observed / observed |
| CONTENTS/PID50d63885 | wetdry | 0 | 14.2 | observed / observed / observed |
| CONTENTS/PID396b3e24 | ingain | 0.5252603888511658 | 1.0 | observed / observed / observed |
| CONTENTS/PID3e0da3cd | outgain | 0.5 | 0.0 | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":3}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): EQ-DJ: 2 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### EQ-DJ — disabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":3},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **EQ-DJ** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Gain | 0.5000000000000001 | 0.5 | +0.0 dB | True |
| 1 | Mid Gain | 0.5000000000000001 | 0.5 | +0.0 dB | True |
| 2 | Hi Gain | 0.5 | 0.5 | 0.0 dB | True |
| 3 | Lo Freq | 0.6400000000000009 | 0.6400000000000009 | 339 Hz | True |
| 4 | Lo On | 0 | 0 | Off | True |
| 5 | Mid On | 0 | 0 | Off | True |
| 6 | Hi On | 0 | 0 | Off | True |
| 7 | Hi Freq | 0.485 | 0.485 | 3.89 kHz | True |

Slots (observed): .

Parameters: **observed**, host count 8.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LOW_FREQ | Low Crossover Frequency | 0.6400000000000009 | 339 Hz | observed / observed / observed |
| CONTENTS/HIGH_FREQ | High Crossover Frequency | 0.485 | 3.89 kHz | observed / observed / observed |
| CONTENTS/KILL_LOWS | Low Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_MIDS | Mid Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_HIGHS | High Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/LOW_GAIN | Low Band Gain | 0.5000000000000001 | +0.0 dB | observed / observed / observed |
| CONTENTS/MID_GAIN | Mid Band Gain | 0.5000000000000001 | +0.0 dB | observed / observed / observed |
| CONTENTS/HIGH_GAIN | High Band Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### ++decimate — enabled

Locator: `[{"track":22,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":3},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: shaped decimate.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 5.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID5b0cac3 | depth | 0.8156200647354126 | 14.6 | observed / observed / observed |
| CONTENTS/PID57468041 | folding | 0.23353227972984314 | 2.0 | observed / observed / observed |
| CONTENTS/PID5a72f63 | color | 0.27412793040275574 | 0.3 | observed / observed / observed |
| CONTENTS/PID396b3e24 | ingain | 0.5131566524505615 | 0.5 | observed / observed / observed |
| CONTENTS/PID3e0da3cd | outgain | 0.5 | 0.0 | observed / observed / observed |

</details>

### Things Texture — enabled

Locator: `[{"track":22,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 6.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID22152b9f | MidSide | 0 | off | observed / observed / observed |
| CONTENTS/PID45f96ba5 | Diffusion | 1 | BIG | observed / observed / observed |
| CONTENTS/PID498d320 | Pitch | 0.5 | OFF | observed / observed / observed |
| CONTENTS/PID4f0106bc | Balance | 0.5322184562683105 | 53% | observed / observed / observed |
| CONTENTS/PID12e3c | Mix | 1 | 100% | observed / observed / observed |
| CONTENTS/PID777d5908 | Bypass | 1 | on | observed / observed / observed |

</details>


## flat/23: Shaped Decimate

Type: Effect. Chain coverage: **observed**. Volume: -2.6 dB (0.7187005259840998); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -2.2 dB | 0.9200000000000002 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":23,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Shaped decimate 5.0 (remote).

Remote controls: current page **** (index 0, 4 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | DeciShape | 0 | 2.75820997111546e-19 | 0.00 % | True |
| 1 | depth | 0.49606299214065075 | 0.49606299214065075 | -0.79 % | True |
| 2 | folding | 0.49606299214065075 | 0.49606299214065075 | -0.79 % | True |
| 3 | Lo Rolloff | 0 | 0 | 0.00 % | True |
| 4 | A~DeciShape | 0 | 0 | 0.00 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): EQ-DJ: 3 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.2849999999999997 | -10.3 dB | observed / observed / observed |

</details>

### EQ-DJ — enabled

Locator: `[{"track":23,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **EQ-DJ** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Gain | 0.5000000000000001 | 0.5 | +0.0 dB | True |
| 1 | Mid Gain | 0.5000000000000001 | 0.5 | +0.0 dB | True |
| 2 | Hi Gain | 0.5 | 0.5 | 0.0 dB | True |
| 3 | Lo Freq | 0.6400000000000009 | 0.6400000000000009 | 339 Hz | True |
| 4 | Lo On | 0 | 0 | Off | True |
| 5 | Mid On | 0 | 0 | Off | True |
| 6 | Hi On | 0 | 0 | Off | True |
| 7 | Hi Freq | 0.485 | 0.485 | 3.89 kHz | True |

Slots (observed): .

Parameters: **observed**, host count 8.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LOW_FREQ | Low Crossover Frequency | 0.6400000000000009 | 339 Hz | observed / observed / observed |
| CONTENTS/HIGH_FREQ | High Crossover Frequency | 0.485 | 3.89 kHz | observed / observed / observed |
| CONTENTS/KILL_LOWS | Low Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_MIDS | Mid Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_HIGHS | High Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/LOW_GAIN | Low Band Gain | 0.5000000000000001 | +0.0 dB | observed / observed / observed |
| CONTENTS/MID_GAIN | Mid Band Gain | 0.5000000000000001 | +0.0 dB | observed / observed / observed |
| CONTENTS/HIGH_GAIN | High Band Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### ++decimate — enabled

Locator: `[{"track":23,"device":0},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: shaped decimate.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 5.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID5b0cac3 | depth | 0.723594605922699 | 10.8 | observed / observed / observed |
| CONTENTS/PID57468041 | folding | 0.6636084914207458 | 32.0 | observed / observed / observed |
| CONTENTS/PID5a72f63 | color | 0.27412793040275574 | 0.3 | observed / observed / observed |
| CONTENTS/PID396b3e24 | ingain | 0.6160423159599304 | 4.6 | observed / observed / observed |
| CONTENTS/PID3e0da3cd | outgain | 0.4810158610343933 | -0.8 | observed / observed / observed |

</details>

### Gate — disabled

Locator: `[{"track":23,"device":0},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.12 | 0.12 | -55.2 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.31999999999999984 | 0.31999999999999984 | 0.91 ms | True |
| 3 | Release | 0.6999999999999998 | 0.6999999999999998 | 126 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.12 | -55.2 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.31999999999999984 | 0.91 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.6999999999999998 | 126 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>


## flat/24: FUZZ

Type: Effect. Chain coverage: **observed**. Volume: -2.8 dB (0.7140944937735744); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### Instrument Layer — enabled

Locator: `[{"track":24,"device":0}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: Shaped Fuzz 5.0 (remote).

Remote controls: current page **** (index 0, 4 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Fuzz Control | 0 | 0 | 0.00 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | A~Fuzz | 0 | 0 | 0.00 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): MDMX Fuzz Stereo: 1 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.395 | -5.0 dB | observed / observed / observed |

</details>

### MDMX Fuzz Stereo — enabled

Locator: `[{"track":24,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/25: Reverb

Type: Effect. Chain coverage: **observed**. Volume: -0.6 dB (0.7743307068486227); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.

### FX Layer — enabled

Locator: `[{"track":25,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Verb 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | verb in | 0.5039370059967041 | 0.5039370059967041 | 50.4 % | True |
| 1 | verb selector | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | A~VbIn | 0 | 0 | 0.00 % | True |
| 5 | A~VbMod | 0.49606299214065075 | 0.49606299214065075 | -0.79 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): verb selection 4.5: 2 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: verb awb 5.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0 | -Inf dB | observed / observed / observed |

</details>

### Instrument Layer — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: verb selection 4.5.

Remote controls: current page **Gain** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 | Gain | 0.5 | 0.5 | 0.0 dB | True |

Layers (observed): Conv earth: 2 devices (observed); Earth comp: 2 devices (observed); Things texture: 2 devices (observed); Shimmer: 2 devices (observed); Inichindown: 3 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5349999999999998 | 0.5349999999999998 | +2.5 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5349999999999998 | +2.5 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.4950000000000002 | -0.3 dB | observed / observed / observed |

</details>

### Convolution — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Mulching 1.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Tune | 0.5 | 0.5 | 0.00 st | True |
| 1 | Tone | 0.5 | 0.5 | 0.0 dB | True |
| 2 | St. Width | 0.035 | 0.035 | 5.25 % | True |
| 3 | Wet Gain | 1 | 1 | 0.0 dB | True |
| 4 | Pre-delay | 0 | 0 | 0.00 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 | Mix | 1 | 1 | 100 % | True |

Slots (observed): Wet FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/WIDTH | Stereo Width | 0.035 | 5.25 % | observed / observed / observed |
| CONTENTS/GAIN | Wet Gain | 1 | 0.0 dB | observed / observed / observed |
| CONTENTS/PRE_DELAY | Pre-delay | 0 | 0.00 ms | observed / observed / observed |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/START_LEVEL | Start Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/MID_LEVEL | Mid Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/END_LEVEL | End Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/END_TIME | End Time | 0.25791855203619907 | 25.8 % | observed / observed / observed |
| CONTENTS/MID_TIME | Mid Time | 0.5 | 50.0 % | observed / observed / observed |
| CONTENTS/TUNE | Tune | 0.5 | 0.00 st | observed / observed / observed |
| CONTENTS/START_TIME | Start Time | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/BRIGHTNESS | Brightness | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.495 | 0.495 | -0.4 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.495 | -0.4 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0 | -Inf dB | observed / observed / observed |

</details>

### Convolution — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":1,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: composite earth b.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Tune | 0.5 | 0.5 | 0.00 st | True |
| 1 | Tone | 0.5 | 0.5 | 0.0 dB | True |
| 2 | St. Width | 0.661666666666667 | 0.661666666666667 | 99.3 % | True |
| 3 | Wet Gain | 0.7250000000000003 | 0.7250000000000003 | -8.4 dB | True |
| 4 | Pre-delay | 0 | 0 | 0.00 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 | Mix | 1 | 1 | 100 % | True |

Slots (observed): Wet FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/WIDTH | Stereo Width | 0.661666666666667 | 99.3 % | observed / observed / observed |
| CONTENTS/GAIN | Wet Gain | 0.7250000000000003 | -8.4 dB | observed / observed / observed |
| CONTENTS/PRE_DELAY | Pre-delay | 0 | 0.00 ms | observed / observed / observed |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/START_LEVEL | Start Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/MID_LEVEL | Mid Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/END_LEVEL | End Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/END_TIME | End Time | 0.38009049773755704 | 38.0 % | observed / observed / observed |
| CONTENTS/MID_TIME | Mid Time | 0.5 | 50.0 % | observed / observed / observed |
| CONTENTS/TUNE | Tune | 0.5 | 0.00 st | observed / observed / observed |
| CONTENTS/START_TIME | Start Time | 0.03619909502262444 | 3.62 % | observed / observed / observed |
| CONTENTS/BRIGHTNESS | Brightness | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.1399999999999997 | -33.2 dB | observed / observed / observed |

</details>

### Things Texture — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":2,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 6.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID22152b9f | MidSide | 0 | off | observed / observed / observed |
| CONTENTS/PID45f96ba5 | Diffusion | 1 | BIG | observed / observed / observed |
| CONTENTS/PID498d320 | Pitch | 1 | +12 | observed / observed / observed |
| CONTENTS/PID4f0106bc | Balance | 0.4437207281589508 | 44% | observed / observed / observed |
| CONTENTS/PID12e3c | Mix | 0.8038708567619324 | 80% | observed / observed / observed |
| CONTENTS/PID777d5908 | Bypass | 1 | on | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.1399999999999996 | -33.2 dB | observed / observed / observed |

</details>

### ValhallaShimmer — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":3,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PARAM0 | wetDry | 1 | 1.00 | observed / observed / observed |
| CONTENTS/PARAM1 | shift | 0.5 | 0.50 | observed / observed / observed |
| CONTENTS/PARAM2 | feedback | 0.33799999952316284 | 0.34 | observed / observed / observed |
| CONTENTS/PARAM3 | diffusion | 0.8565656542778015 | 0.86 | observed / observed / observed |
| CONTENTS/PARAM4 | size | 0.6100000143051147 | 0.61 | observed / observed / observed |
| CONTENTS/PARAM5 | lowCut | 0 | 0.00 | observed / observed / observed |
| CONTENTS/PARAM6 | highCut | 0.5302013158798218 | 0.53 | observed / observed / observed |
| CONTENTS/PARAM7 | modRate | 0.10000000149011612 | 0.10 | observed / observed / observed |
| CONTENTS/PARAM8 | modDepth | 0 | 0.00 | observed / observed / observed |
| CONTENTS/PARAM9 | reverbMode | 0.5 | 0.50 | observed / observed / observed |
| CONTENTS/PARAM10 | shiftMode | 0 | 0.00 | observed / observed / observed |
| CONTENTS/PARAM11 | colorMode | 0 | 0.00 | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":4,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0 | -Inf dB | observed / observed / observed |

</details>

### Convolution — enabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":4,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: 214216__acs272__world-s-longest-echo-4th-impulse.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Tune | 0.5 | 0.5 | 0.00 st | True |
| 1 | Tone | 0.5 | 0.5 | 0.0 dB | True |
| 2 | St. Width | 0.6666666666666666 | 0.6666666666666666 | 100 % | True |
| 3 | Wet Gain | 0.464 | 0.464 | -20.0 dB | True |
| 4 | Pre-delay | 0 | 0 | 0.00 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 | Mix | 1 | 1 | 100 % | True |

Slots (observed): Wet FX: None devices (unresolved).

Parameters: **observed**, host count 12.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/WIDTH | Stereo Width | 0.6666666666666666 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Wet Gain | 0.464 | -20.0 dB | observed / observed / observed |
| CONTENTS/PRE_DELAY | Pre-delay | 0 | 0.00 ms | observed / observed / observed |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/START_LEVEL | Start Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/MID_LEVEL | Mid Level | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/END_LEVEL | End Level | 0 | -Inf dB | observed / observed / observed |
| CONTENTS/END_TIME | End Time | 0.6244343891402716 | 62.4 % | observed / observed / observed |
| CONTENTS/MID_TIME | Mid Time | 0.34615384615384664 | 34.6 % | observed / observed / observed |
| CONTENTS/TUNE | Tune | 0.5 | 0.00 st | observed / observed / observed |
| CONTENTS/START_TIME | Start Time | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/BRIGHTNESS | Brightness | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Convology XT — disabled

Locator: `[{"track":25,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":4,"device":2}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/26: Mast

Type: Effect. Chain coverage: **observed**. Volume: -0.2 dB (0.7874015748031495); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Splutter 5.0 (remote) | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | Spiral Sparkle | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | Shaped Decimate | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | FUZZ | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | Reverb | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | Mast | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 19 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 20 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 21 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 22 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 23 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 24 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 25.


## flat/27: Midi guitar + Bass

Type: Hybrid. Chain coverage: **observed**. Volume: -1.5 dB (0.7480314960629921); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Partial phase panning — enabled

Locator: `[{"track":27,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Cello In: 1 devices (observed); DelB.1 In: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":27,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":27,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":27,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.495 | 0.495 | -0.2 dB | True |
| 1 | Threshold | 0.228333333333331 | 0.228333333333331 | -46.3 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.5550000000000025 | 0.5550000000000025 | 5.24 ms | True |
| 4 | Release | 0.2699999999999998 | 0.2699999999999998 | 103 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.26999999999999946 | 0.26999999999999946 | 1.37:1 | True |
| 7 | Output | 0.485 | 0.485 | -0.6 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.485 | -0.6 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.5550000000000025 | 5.24 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.2699999999999998 | 103 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.26999999999999946 | 1.37:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.228333333333331 | -46.3 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.495 | -0.2 dB | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":27,"device":2}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0 | 0 | 0.00 | True |
| 7 | K8 Value | 0 | 0 | 0.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.5078125 | 64 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0 | 1 | observed / observed / observed |

</details>

### Instrument Layer — enabled

Locator: `[{"track":27,"device":3}]`. Type: instrument; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gain** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 | Gain | 0.5 | 0.5 | 0.0 dB | True |

Layers (observed): MIDI Bass: 2 devices (observed); MIDI Guitar 2: 2 devices (observed).

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 1.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### MIDI Bass — enabled

Locator: `[{"track":27,"device":3},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Note Filter — enabled

Locator: `[{"track":27,"device":3},{"kind":"layer","container":0,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Filter** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Key | 0 | 0 | 0 | True |
| 1 | Hi Key | 0.3779527559055118 | 0.3779527559055118 | 48 | True |
| 2 | Lo Vel | 0 | 0 | 0 | True |
| 3 | Hi Vel | 1 | 1 | 127 | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 5.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIN_KEY | Lowest Allowed Key | 0 | 0 | observed / observed / observed |
| CONTENTS/MAX_KEY | Highest Allowed Key | 0.3779527559055118 | 48 | observed / observed / observed |
| CONTENTS/MIN_VELOCITY | Lowest Allowed Velocity | 0 | 0 | observed / observed / observed |
| CONTENTS/MAX_VELOCITY | Highest Allowed Velocity | 1 | 127 | observed / observed / observed |
| CONTENTS/MODE | Filter Mode | 0 | Keep | observed / observed / observed |

</details>

### MIDI Guitar 2 — enabled

Locator: `[{"track":27,"device":3},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Note Filter — enabled

Locator: `[{"track":27,"device":3},{"kind":"layer","container":1,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Filter** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Key | 0.3858267716535433 | 0.3858267716535433 | 49 | True |
| 1 | Hi Key | 1 | 1 | 127 | True |
| 2 | Lo Vel | 0 | 0 | 0 | True |
| 3 | Hi Vel | 1 | 1 | 127 | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 5.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIN_KEY | Lowest Allowed Key | 0.3858267716535433 | 49 | observed / observed / observed |
| CONTENTS/MAX_KEY | Highest Allowed Key | 1 | 127 | observed / observed / observed |
| CONTENTS/MIN_VELOCITY | Lowest Allowed Velocity | 0 | 0 | observed / observed / observed |
| CONTENTS/MAX_VELOCITY | Highest Allowed Velocity | 1 | 127 | observed / observed / observed |
| CONTENTS/MODE | Filter Mode | 0 | Keep | observed / observed / observed |

</details>


## flat/28: AudioToMidi Stream

Type: Instrument. Chain coverage: **observed**. Volume: +0.3 dB (0.8031496062992126); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Note FX Layer — disabled

Locator: `[{"track":28,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Latch: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 0.

### Latch — enabled

Locator: `[{"track":28,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MONO | Monophonic | 0 | Off | observed / observed / observed |
| CONTENTS/TRIGGER | Trigger Mode | 1 | of Velocity | observed / observed / observed |
| CONTENTS/VELOCITY_THRESHOLD | Velocity Threshold | 0 | ≥ 0 | observed / observed / observed |
| CONTENTS/STOP_ON_TRANSPORT | Kill on Transport Stop | 0 | Off | observed / observed / observed |

</details>

### Note FX Layer — enabled

Locator: `[{"track":28,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): bass reciever: 1 devices (observed); mg reciever: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 0.

### Note Receiver — enabled

Locator: `[{"track":28,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MUTE | Mute Source | 0 | Off | observed / observed / observed |
| CONTENTS/MUTE_IN | Mute Input | 0 | Off | observed / observed / observed |

</details>

### Note Receiver — enabled

Locator: `[{"track":28,"device":1},{"kind":"layer","container":1,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MUTE | Mute Source | 0 | Off | observed / observed / observed |
| CONTENTS/MUTE_IN | Mute Input | 0 | Off | observed / observed / observed |

</details>

### Note FX Selector — enabled

Locator: `[{"track":28,"device":2}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 0.

### Velocity Curve — disabled

Locator: `[{"track":28,"device":3}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 5.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/X1 | Middle Velocity Input | 0.4606198347107441 | 46.1 % | observed / observed / observed |
| CONTENTS/Y0 | Minimum Velocity Output | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/Y2 | Maximum Velocity Output | 1 | 100 % | observed / observed / observed |
| CONTENTS/Y1 | Middle Velocity Output | 0.4603960396039606 | 46.0 % | observed / observed / observed |
| CONTENTS/RANDOM | Randomization | 0 | 0.00 % | observed / observed / observed |

</details>


## flat/29: Mic

Type: Audio. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: -81.1 % (0.09448818897637795).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### FabFilter Pro-Q 2 — disabled

Locator: `[{"track":29,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/30: Group 5

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/31: Audio 1

Type: Audio. Chain coverage: **observed**. Volume: -55.3 dB (0.0949999999999994); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/32: Audio 2

Type: Audio. Chain coverage: **observed**. Volume: -47.4 dB (0.12870052598409926); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/33: Record

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/34: Mast Record

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/35: Master Record A

Type: Audio. Chain coverage: **observed**. Volume: -1.1 dB (0.759567307692308); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | 0.0 dB | 1 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Compressor — disabled

Locator: `[{"track":35,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.7283333333333325 | 0.7283333333333325 | -16.3 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.2716535433070837 | 0.2716535433070837 | 1.00 ms | True |
| 4 | Release | 0.2749999999999996 | 0.2749999999999996 | 104 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.7799999999999999 | 0.7799999999999999 | 4.55:1 | True |
| 7 | Output | 0.5 | 0.5 | 0.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.2716535433070837 | 1.00 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.2749999999999996 | 104 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.7799999999999999 | 4.55:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.7283333333333325 | -16.3 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 2 — disabled

Locator: `[{"track":35,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Dynamics — disabled

Locator: `[{"track":35,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Dyn** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Hi Thresh | 0.8205704971475141 | 0.8205704971475141 | -10.8 dB | True |
| 1 | Hi Ratio | 0.5125 | 0.5125 | 1:1.03 | True |
| 2 | Hi Knee | 0.3499999999999996 | 0.3499999999999996 | +8.4 dB | True |
| 3 | Attack | 0.41142857142857253 | 0.41142857142857253 | 2.75 ms | True |
| 4 | Lo Thresh | 0.5983333333333338 | 0.5983333333333338 | -24.1 dB | True |
| 5 | Lo Ratio | 0.64 | 0.64 | 1:1.39 | True |
| 6 | Lo Knee | 0.8416666666666665 | 0.8416666666666665 | +20.2 dB | True |
| 7 | Release | 0.4239999999999998 | 0.4239999999999998 | 115 ms | True |

Slots (observed): Sc FX: None devices (unresolved).

Parameters: **observed**, host count 11.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/ATTACK | Attack | 0.41142857142857253 | 2.75 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4239999999999998 | 115 ms | observed / observed / observed |
| CONTENTS/DETECTOR_TYPE | Averaging Mode | 0 | Peak | observed / observed / observed |
| CONTENTS/LOW_THRESHOLD | Low Threshold | 0.5983333333333338 | -24.1 dB | observed / observed / observed |
| CONTENTS/LOW_RATIO | Low Ratio | 0.64 | 1:1.39 | observed / observed / observed |
| CONTENTS/LOW_KNEE | Low Knee | 0.8416666666666665 | +20.2 dB | observed / observed / observed |
| CONTENTS/HIGH_THRESHOLD | High Threshold | 0.8205704971475141 | -10.8 dB | observed / observed / observed |
| CONTENTS/HIGH_RATIO | High Ratio | 0.5125 | 1:1.03 | observed / observed / observed |
| CONTENTS/HIGH_KNEE | High Knee | 0.3499999999999996 | +8.4 dB | observed / observed / observed |
| CONTENTS/OUTPUT_GAIN | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/INPUT_GAIN | Input Gain | 0.4400000000000001 | -2.9 dB | observed / observed / observed |

</details>

### Scheps 73 Stereo — disabled

Locator: `[{"track":35,"device":3}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FabFilter Pro-Q 3 — disabled

Locator: `[{"track":35,"device":4}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: 4-pole slow oscillating eq.

Remote controls: current page **LFO** (index 0, 5 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Rate | 0 | 0 | 0.02 | True |
| 1 | Timebase | 0 | 0 | Hertz | True |
| 2 | Tilt | 0.5 | 0.5 | 0.00 % | True |
| 3 | Curve | 1 | 1 | 100 % | True |
| 4 | Delay | 0 | 0 | 0.00 ms | True |
| 5 | Fade-in | 0 | 0 | 0.00 ms | True |
| 6 | Mode | 0 | 0 | Free | True |
| 7 | Amount | 1 | 1 | 100 % | True |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 320.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PARAM0 | Band 1 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM1 | Band 1 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM2 | Band 1 Frequency | 0.5209649801254272 | 647.83 Hz | observed / observed / observed |
| CONTENTS/PARAM3 | Band 1 Gain | 0.5765541195869446 | +4.59 dB | observed / observed / observed |
| CONTENTS/PARAM4 | Band 1 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM5 | Band 1 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM6 | Band 1 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM7 | Band 1 Q | 0.4800833463668823 | 0.863 | observed / observed / observed |
| CONTENTS/PARAM8 | Band 1 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM9 | Band 1 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM10 | Band 1 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM11 | Band 1 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM13 | Band 2 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM14 | Band 2 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM15 | Band 2 Frequency | 0.20013383030891418 | 49.647 Hz | observed / observed / observed |
| CONTENTS/PARAM16 | Band 2 Gain | 0.5984588861465454 | +5.91 dB | observed / observed / observed |
| CONTENTS/PARAM17 | Band 2 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM18 | Band 2 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM19 | Band 2 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM20 | Band 2 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM21 | Band 2 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM22 | Band 2 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM23 | Band 2 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM24 | Band 2 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM26 | Band 3 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM27 | Band 3 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM28 | Band 3 Frequency | 0.8607001304626465 | 9834.6 Hz | observed / observed / observed |
| CONTENTS/PARAM29 | Band 3 Gain | 0.4009721875190735 | -5.94 dB | observed / observed / observed |
| CONTENTS/PARAM30 | Band 3 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM31 | Band 3 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM32 | Band 3 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM33 | Band 3 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM34 | Band 3 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM35 | Band 3 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM36 | Band 3 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM37 | Band 3 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM39 | Band 4 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM40 | Band 4 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM41 | Band 4 Frequency | 0.3236381709575653 | 133.45 Hz | observed / observed / observed |
| CONTENTS/PARAM42 | Band 4 Gain | 0.47047004103660583 | -1.77 dB | observed / observed / observed |
| CONTENTS/PARAM43 | Band 4 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM44 | Band 4 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM45 | Band 4 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM46 | Band 4 Q | 0.6556388735771179 | 3.153 | observed / observed / observed |
| CONTENTS/PARAM47 | Band 4 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM48 | Band 4 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM49 | Band 4 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM50 | Band 4 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM52 | Band 5 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM53 | Band 5 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM54 | Band 5 Frequency | 0.46045029163360596 | 399.06 Hz | observed / observed / observed |
| CONTENTS/PARAM55 | Band 5 Gain | 0.4288165867328644 | -4.27 dB | observed / observed / observed |
| CONTENTS/PARAM56 | Band 5 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM57 | Band 5 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM58 | Band 5 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM59 | Band 5 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM60 | Band 5 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM61 | Band 5 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM62 | Band 5 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM63 | Band 5 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM65 | Band 6 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM66 | Band 6 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM67 | Band 6 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM68 | Band 6 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM69 | Band 6 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM70 | Band 6 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM71 | Band 6 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM72 | Band 6 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM73 | Band 6 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM74 | Band 6 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM75 | Band 6 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM76 | Band 6 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM78 | Band 7 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM79 | Band 7 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM80 | Band 7 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM81 | Band 7 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM82 | Band 7 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM83 | Band 7 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM84 | Band 7 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM85 | Band 7 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM86 | Band 7 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM87 | Band 7 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM88 | Band 7 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM89 | Band 7 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM91 | Band 8 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM92 | Band 8 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM93 | Band 8 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM94 | Band 8 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM95 | Band 8 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM96 | Band 8 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM97 | Band 8 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM98 | Band 8 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM99 | Band 8 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM100 | Band 8 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM101 | Band 8 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM102 | Band 8 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM104 | Band 9 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM105 | Band 9 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM106 | Band 9 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM107 | Band 9 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM108 | Band 9 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM109 | Band 9 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM110 | Band 9 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM111 | Band 9 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM112 | Band 9 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM113 | Band 9 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM114 | Band 9 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM115 | Band 9 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM117 | Band 10 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM118 | Band 10 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM119 | Band 10 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM120 | Band 10 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM121 | Band 10 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM122 | Band 10 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM123 | Band 10 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM124 | Band 10 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM125 | Band 10 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM126 | Band 10 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM127 | Band 10 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM128 | Band 10 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM130 | Band 11 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM131 | Band 11 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM132 | Band 11 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM133 | Band 11 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM134 | Band 11 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM135 | Band 11 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM136 | Band 11 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM137 | Band 11 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM138 | Band 11 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM139 | Band 11 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM140 | Band 11 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM141 | Band 11 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM143 | Band 12 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM144 | Band 12 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM145 | Band 12 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM146 | Band 12 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM147 | Band 12 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM148 | Band 12 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM149 | Band 12 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM150 | Band 12 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM151 | Band 12 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM152 | Band 12 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM153 | Band 12 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM154 | Band 12 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM156 | Band 13 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM157 | Band 13 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM158 | Band 13 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM159 | Band 13 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM160 | Band 13 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM161 | Band 13 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM162 | Band 13 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM163 | Band 13 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM164 | Band 13 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM165 | Band 13 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM166 | Band 13 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM167 | Band 13 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM169 | Band 14 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM170 | Band 14 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM171 | Band 14 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM172 | Band 14 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM173 | Band 14 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM174 | Band 14 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM175 | Band 14 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM176 | Band 14 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM177 | Band 14 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM178 | Band 14 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM179 | Band 14 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM180 | Band 14 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM182 | Band 15 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM183 | Band 15 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM184 | Band 15 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM185 | Band 15 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM186 | Band 15 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM187 | Band 15 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM188 | Band 15 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM189 | Band 15 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM190 | Band 15 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM191 | Band 15 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM192 | Band 15 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM193 | Band 15 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM195 | Band 16 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM196 | Band 16 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM197 | Band 16 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM198 | Band 16 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM199 | Band 16 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM200 | Band 16 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM201 | Band 16 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM202 | Band 16 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM203 | Band 16 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM204 | Band 16 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM205 | Band 16 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM206 | Band 16 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM208 | Band 17 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM209 | Band 17 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM210 | Band 17 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM211 | Band 17 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM212 | Band 17 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM213 | Band 17 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM214 | Band 17 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM215 | Band 17 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM216 | Band 17 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM217 | Band 17 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM218 | Band 17 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM219 | Band 17 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM221 | Band 18 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM222 | Band 18 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM223 | Band 18 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM224 | Band 18 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM225 | Band 18 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM226 | Band 18 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM227 | Band 18 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM228 | Band 18 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM229 | Band 18 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM230 | Band 18 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM231 | Band 18 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM232 | Band 18 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM234 | Band 19 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM235 | Band 19 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM236 | Band 19 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM237 | Band 19 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM238 | Band 19 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM239 | Band 19 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM240 | Band 19 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM241 | Band 19 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM242 | Band 19 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM243 | Band 19 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM244 | Band 19 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM245 | Band 19 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM247 | Band 20 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM248 | Band 20 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM249 | Band 20 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM250 | Band 20 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM251 | Band 20 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM252 | Band 20 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM253 | Band 20 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM254 | Band 20 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM255 | Band 20 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM256 | Band 20 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM257 | Band 20 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM258 | Band 20 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM260 | Band 21 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM261 | Band 21 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM262 | Band 21 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM263 | Band 21 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM264 | Band 21 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM265 | Band 21 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM266 | Band 21 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM267 | Band 21 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM268 | Band 21 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM269 | Band 21 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM270 | Band 21 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM271 | Band 21 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM273 | Band 22 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM274 | Band 22 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM275 | Band 22 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM276 | Band 22 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM277 | Band 22 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM278 | Band 22 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM279 | Band 22 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM280 | Band 22 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM281 | Band 22 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM282 | Band 22 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM283 | Band 22 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM284 | Band 22 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM286 | Band 23 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM287 | Band 23 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM288 | Band 23 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM289 | Band 23 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM290 | Band 23 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM291 | Band 23 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM292 | Band 23 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM293 | Band 23 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM294 | Band 23 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM295 | Band 23 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM296 | Band 23 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM297 | Band 23 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM299 | Band 24 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM300 | Band 24 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM301 | Band 24 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM302 | Band 24 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM303 | Band 24 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM304 | Band 24 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM305 | Band 24 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM306 | Band 24 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM307 | Band 24 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM308 | Band 24 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM309 | Band 24 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM310 | Band 24 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM314 | Gain Scale | 0.5 | 100.0% | observed / observed / observed |
| CONTENTS/PARAM315 | Output Level | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM316 | Output Pan | 0.5 | Left: 0 dB / Right: 0 dB | observed / observed / observed |
| CONTENTS/PARAM317 | Output Pan Mode | 0 | Left/Right | observed / observed / observed |
| CONTENTS/PARAM318 | Bypass | 0 | Not Bypassed | observed / observed / observed |
| CONTENTS/PARAM319 | Output Invert Phase | 0 | Normal | observed / observed / observed |
| CONTENTS/PARAM320 | Auto Gain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM332 | Receive Midi | 0 | Enabled | observed / observed / observed |
| CONTENTS/PARAM334 | Band 1 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM335 | Band 2 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM336 | Band 3 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM337 | Band 4 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM338 | Band 5 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM339 | Band 6 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM340 | Band 7 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM341 | Band 8 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM342 | Band 9 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM343 | Band 10 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM344 | Band 11 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM345 | Band 12 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM346 | Band 13 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM347 | Band 14 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM348 | Band 15 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM349 | Band 16 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM350 | Band 17 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM351 | Band 18 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM352 | Band 19 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM353 | Band 20 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM354 | Band 21 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM355 | Band 22 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM356 | Band 23 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM357 | Band 24 External Side Chain | 0 | Off | observed / observed / observed |

</details>

### Ozone Imager 2 — disabled

Locator: `[{"track":35,"device":5}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 3.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID1 | Enable Stereoize | 1 | On | observed / observed / observed |
| CONTENTS/PID2 | Stereoize Amt | 0.565789520740509 | 11.75 | observed / observed / observed |
| CONTENTS/PID3 | Width | 0.7978261709213257 | 59.57 | observed / observed / observed |

</details>

### Convology XT — disabled

Locator: `[{"track":35,"device":6}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Center Stereo — disabled

Locator: `[{"track":35,"device":7}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/36: Master Record B

Type: Audio. Chain coverage: **observed**. Volume: -1.1 dB (0.759567307692308); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | 0.0 dB | 1 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Compressor — disabled

Locator: `[{"track":36,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.7283333333333325 | 0.7283333333333325 | -16.3 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.2716535433070837 | 0.2716535433070837 | 1.00 ms | True |
| 4 | Release | 0.2749999999999996 | 0.2749999999999996 | 104 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.7799999999999999 | 0.7799999999999999 | 4.55:1 | True |
| 7 | Output | 0.5 | 0.5 | 0.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.2716535433070837 | 1.00 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.2749999999999996 | 104 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.7799999999999999 | 4.55:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.7283333333333325 | -16.3 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 2 — disabled

Locator: `[{"track":36,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Dynamics — disabled

Locator: `[{"track":36,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Dyn** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Hi Thresh | 0.8205704971475141 | 0.8205704971475141 | -10.8 dB | True |
| 1 | Hi Ratio | 0.5125 | 0.5125 | 1:1.03 | True |
| 2 | Hi Knee | 0.3499999999999996 | 0.3499999999999996 | +8.4 dB | True |
| 3 | Attack | 0.41142857142857253 | 0.41142857142857253 | 2.75 ms | True |
| 4 | Lo Thresh | 0.5983333333333338 | 0.5983333333333338 | -24.1 dB | True |
| 5 | Lo Ratio | 0.64 | 0.64 | 1:1.39 | True |
| 6 | Lo Knee | 0.8416666666666665 | 0.8416666666666665 | +20.2 dB | True |
| 7 | Release | 0.4239999999999998 | 0.4239999999999998 | 115 ms | True |

Slots (observed): Sc FX: None devices (unresolved).

Parameters: **observed**, host count 11.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/ATTACK | Attack | 0.41142857142857253 | 2.75 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4239999999999998 | 115 ms | observed / observed / observed |
| CONTENTS/DETECTOR_TYPE | Averaging Mode | 0 | Peak | observed / observed / observed |
| CONTENTS/LOW_THRESHOLD | Low Threshold | 0.5983333333333338 | -24.1 dB | observed / observed / observed |
| CONTENTS/LOW_RATIO | Low Ratio | 0.64 | 1:1.39 | observed / observed / observed |
| CONTENTS/LOW_KNEE | Low Knee | 0.8416666666666665 | +20.2 dB | observed / observed / observed |
| CONTENTS/HIGH_THRESHOLD | High Threshold | 0.8205704971475141 | -10.8 dB | observed / observed / observed |
| CONTENTS/HIGH_RATIO | High Ratio | 0.5125 | 1:1.03 | observed / observed / observed |
| CONTENTS/HIGH_KNEE | High Knee | 0.3499999999999996 | +8.4 dB | observed / observed / observed |
| CONTENTS/OUTPUT_GAIN | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/INPUT_GAIN | Input Gain | 0.4400000000000001 | -2.9 dB | observed / observed / observed |

</details>

### Scheps 73 Stereo — disabled

Locator: `[{"track":36,"device":3}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FabFilter Pro-Q 3 — disabled

Locator: `[{"track":36,"device":4}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: 4-pole slow oscillating eq.

Remote controls: current page **LFO** (index 0, 5 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Rate | 0 | 0 | 0.02 | True |
| 1 | Timebase | 0 | 0 | Hertz | True |
| 2 | Tilt | 0.5 | 0.5 | 0.00 % | True |
| 3 | Curve | 1 | 1 | 100 % | True |
| 4 | Delay | 0 | 0 | 0.00 ms | True |
| 5 | Fade-in | 0 | 0 | 0.00 ms | True |
| 6 | Mode | 0 | 0 | Free | True |
| 7 | Amount | 1 | 1 | 100 % | True |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 320.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PARAM0 | Band 1 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM1 | Band 1 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM2 | Band 1 Frequency | 0.5209649801254272 | 647.83 Hz | observed / observed / observed |
| CONTENTS/PARAM3 | Band 1 Gain | 0.5765541195869446 | +4.59 dB | observed / observed / observed |
| CONTENTS/PARAM4 | Band 1 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM5 | Band 1 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM6 | Band 1 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM7 | Band 1 Q | 0.4800833463668823 | 0.863 | observed / observed / observed |
| CONTENTS/PARAM8 | Band 1 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM9 | Band 1 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM10 | Band 1 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM11 | Band 1 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM13 | Band 2 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM14 | Band 2 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM15 | Band 2 Frequency | 0.20013383030891418 | 49.647 Hz | observed / observed / observed |
| CONTENTS/PARAM16 | Band 2 Gain | 0.5984588861465454 | +5.91 dB | observed / observed / observed |
| CONTENTS/PARAM17 | Band 2 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM18 | Band 2 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM19 | Band 2 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM20 | Band 2 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM21 | Band 2 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM22 | Band 2 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM23 | Band 2 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM24 | Band 2 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM26 | Band 3 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM27 | Band 3 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM28 | Band 3 Frequency | 0.8607001304626465 | 9834.6 Hz | observed / observed / observed |
| CONTENTS/PARAM29 | Band 3 Gain | 0.4009721875190735 | -5.94 dB | observed / observed / observed |
| CONTENTS/PARAM30 | Band 3 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM31 | Band 3 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM32 | Band 3 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM33 | Band 3 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM34 | Band 3 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM35 | Band 3 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM36 | Band 3 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM37 | Band 3 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM39 | Band 4 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM40 | Band 4 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM41 | Band 4 Frequency | 0.3236381709575653 | 133.45 Hz | observed / observed / observed |
| CONTENTS/PARAM42 | Band 4 Gain | 0.47047004103660583 | -1.77 dB | observed / observed / observed |
| CONTENTS/PARAM43 | Band 4 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM44 | Band 4 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM45 | Band 4 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM46 | Band 4 Q | 0.6556388735771179 | 3.153 | observed / observed / observed |
| CONTENTS/PARAM47 | Band 4 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM48 | Band 4 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM49 | Band 4 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM50 | Band 4 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM52 | Band 5 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM53 | Band 5 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM54 | Band 5 Frequency | 0.46045029163360596 | 399.06 Hz | observed / observed / observed |
| CONTENTS/PARAM55 | Band 5 Gain | 0.4288165867328644 | -4.27 dB | observed / observed / observed |
| CONTENTS/PARAM56 | Band 5 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM57 | Band 5 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM58 | Band 5 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM59 | Band 5 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM60 | Band 5 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM61 | Band 5 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM62 | Band 5 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM63 | Band 5 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM65 | Band 6 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM66 | Band 6 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM67 | Band 6 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM68 | Band 6 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM69 | Band 6 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM70 | Band 6 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM71 | Band 6 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM72 | Band 6 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM73 | Band 6 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM74 | Band 6 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM75 | Band 6 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM76 | Band 6 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM78 | Band 7 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM79 | Band 7 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM80 | Band 7 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM81 | Band 7 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM82 | Band 7 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM83 | Band 7 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM84 | Band 7 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM85 | Band 7 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM86 | Band 7 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM87 | Band 7 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM88 | Band 7 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM89 | Band 7 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM91 | Band 8 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM92 | Band 8 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM93 | Band 8 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM94 | Band 8 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM95 | Band 8 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM96 | Band 8 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM97 | Band 8 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM98 | Band 8 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM99 | Band 8 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM100 | Band 8 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM101 | Band 8 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM102 | Band 8 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM104 | Band 9 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM105 | Band 9 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM106 | Band 9 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM107 | Band 9 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM108 | Band 9 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM109 | Band 9 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM110 | Band 9 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM111 | Band 9 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM112 | Band 9 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM113 | Band 9 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM114 | Band 9 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM115 | Band 9 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM117 | Band 10 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM118 | Band 10 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM119 | Band 10 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM120 | Band 10 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM121 | Band 10 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM122 | Band 10 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM123 | Band 10 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM124 | Band 10 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM125 | Band 10 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM126 | Band 10 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM127 | Band 10 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM128 | Band 10 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM130 | Band 11 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM131 | Band 11 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM132 | Band 11 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM133 | Band 11 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM134 | Band 11 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM135 | Band 11 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM136 | Band 11 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM137 | Band 11 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM138 | Band 11 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM139 | Band 11 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM140 | Band 11 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM141 | Band 11 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM143 | Band 12 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM144 | Band 12 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM145 | Band 12 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM146 | Band 12 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM147 | Band 12 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM148 | Band 12 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM149 | Band 12 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM150 | Band 12 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM151 | Band 12 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM152 | Band 12 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM153 | Band 12 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM154 | Band 12 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM156 | Band 13 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM157 | Band 13 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM158 | Band 13 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM159 | Band 13 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM160 | Band 13 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM161 | Band 13 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM162 | Band 13 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM163 | Band 13 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM164 | Band 13 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM165 | Band 13 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM166 | Band 13 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM167 | Band 13 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM169 | Band 14 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM170 | Band 14 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM171 | Band 14 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM172 | Band 14 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM173 | Band 14 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM174 | Band 14 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM175 | Band 14 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM176 | Band 14 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM177 | Band 14 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM178 | Band 14 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM179 | Band 14 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM180 | Band 14 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM182 | Band 15 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM183 | Band 15 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM184 | Band 15 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM185 | Band 15 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM186 | Band 15 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM187 | Band 15 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM188 | Band 15 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM189 | Band 15 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM190 | Band 15 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM191 | Band 15 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM192 | Band 15 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM193 | Band 15 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM195 | Band 16 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM196 | Band 16 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM197 | Band 16 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM198 | Band 16 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM199 | Band 16 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM200 | Band 16 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM201 | Band 16 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM202 | Band 16 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM203 | Band 16 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM204 | Band 16 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM205 | Band 16 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM206 | Band 16 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM208 | Band 17 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM209 | Band 17 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM210 | Band 17 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM211 | Band 17 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM212 | Band 17 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM213 | Band 17 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM214 | Band 17 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM215 | Band 17 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM216 | Band 17 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM217 | Band 17 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM218 | Band 17 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM219 | Band 17 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM221 | Band 18 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM222 | Band 18 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM223 | Band 18 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM224 | Band 18 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM225 | Band 18 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM226 | Band 18 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM227 | Band 18 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM228 | Band 18 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM229 | Band 18 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM230 | Band 18 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM231 | Band 18 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM232 | Band 18 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM234 | Band 19 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM235 | Band 19 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM236 | Band 19 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM237 | Band 19 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM238 | Band 19 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM239 | Band 19 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM240 | Band 19 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM241 | Band 19 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM242 | Band 19 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM243 | Band 19 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM244 | Band 19 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM245 | Band 19 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM247 | Band 20 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM248 | Band 20 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM249 | Band 20 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM250 | Band 20 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM251 | Band 20 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM252 | Band 20 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM253 | Band 20 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM254 | Band 20 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM255 | Band 20 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM256 | Band 20 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM257 | Band 20 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM258 | Band 20 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM260 | Band 21 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM261 | Band 21 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM262 | Band 21 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM263 | Band 21 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM264 | Band 21 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM265 | Band 21 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM266 | Band 21 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM267 | Band 21 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM268 | Band 21 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM269 | Band 21 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM270 | Band 21 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM271 | Band 21 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM273 | Band 22 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM274 | Band 22 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM275 | Band 22 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM276 | Band 22 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM277 | Band 22 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM278 | Band 22 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM279 | Band 22 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM280 | Band 22 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM281 | Band 22 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM282 | Band 22 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM283 | Band 22 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM284 | Band 22 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM286 | Band 23 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM287 | Band 23 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM288 | Band 23 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM289 | Band 23 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM290 | Band 23 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM291 | Band 23 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM292 | Band 23 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM293 | Band 23 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM294 | Band 23 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM295 | Band 23 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM296 | Band 23 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM297 | Band 23 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM299 | Band 24 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM300 | Band 24 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM301 | Band 24 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM302 | Band 24 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM303 | Band 24 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM304 | Band 24 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM305 | Band 24 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM306 | Band 24 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM307 | Band 24 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM308 | Band 24 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM309 | Band 24 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM310 | Band 24 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM314 | Gain Scale | 0.5 | 100.0% | observed / observed / observed |
| CONTENTS/PARAM315 | Output Level | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM316 | Output Pan | 0.5 | Left: 0 dB / Right: 0 dB | observed / observed / observed |
| CONTENTS/PARAM317 | Output Pan Mode | 0 | Left/Right | observed / observed / observed |
| CONTENTS/PARAM318 | Bypass | 0 | Not Bypassed | observed / observed / observed |
| CONTENTS/PARAM319 | Output Invert Phase | 0 | Normal | observed / observed / observed |
| CONTENTS/PARAM320 | Auto Gain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM332 | Receive Midi | 0 | Enabled | observed / observed / observed |
| CONTENTS/PARAM334 | Band 1 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM335 | Band 2 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM336 | Band 3 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM337 | Band 4 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM338 | Band 5 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM339 | Band 6 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM340 | Band 7 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM341 | Band 8 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM342 | Band 9 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM343 | Band 10 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM344 | Band 11 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM345 | Band 12 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM346 | Band 13 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM347 | Band 14 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM348 | Band 15 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM349 | Band 16 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM350 | Band 17 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM351 | Band 18 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM352 | Band 19 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM353 | Band 20 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM354 | Band 21 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM355 | Band 22 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM356 | Band 23 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM357 | Band 24 External Side Chain | 0 | Off | observed / observed / observed |

</details>

### Ozone Imager 2 — disabled

Locator: `[{"track":36,"device":5}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 3.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID1 | Enable Stereoize | 1 | On | observed / observed / observed |
| CONTENTS/PID2 | Stereoize Amt | 0.565789520740509 | 11.75 | observed / observed / observed |
| CONTENTS/PID3 | Width | 0.7978261709213257 | 59.57 | observed / observed / observed |

</details>

### Convology XT — disabled

Locator: `[{"track":36,"device":6}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Center Stereo — disabled

Locator: `[{"track":36,"device":7}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/37: Master Record C

Type: Audio. Chain coverage: **observed**. Volume: -1.1 dB (0.759567307692308); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | 0.0 dB | 1 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Compressor — disabled

Locator: `[{"track":37,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.7283333333333325 | 0.7283333333333325 | -16.3 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.2716535433070837 | 0.2716535433070837 | 1.00 ms | True |
| 4 | Release | 0.2749999999999996 | 0.2749999999999996 | 104 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0.7799999999999999 | 0.7799999999999999 | 4.55:1 | True |
| 7 | Output | 0.5 | 0.5 | 0.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.2716535433070837 | 1.00 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.2749999999999996 | 104 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0.7799999999999999 | 4.55:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.7283333333333325 | -16.3 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 2 — disabled

Locator: `[{"track":37,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Dynamics — disabled

Locator: `[{"track":37,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Dyn** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Hi Thresh | 0.8205704971475141 | 0.8205704971475141 | -10.8 dB | True |
| 1 | Hi Ratio | 0.5125 | 0.5125 | 1:1.03 | True |
| 2 | Hi Knee | 0.3499999999999996 | 0.3499999999999996 | +8.4 dB | True |
| 3 | Attack | 0.41142857142857253 | 0.41142857142857253 | 2.75 ms | True |
| 4 | Lo Thresh | 0.5983333333333338 | 0.5983333333333338 | -24.1 dB | True |
| 5 | Lo Ratio | 0.64 | 0.64 | 1:1.39 | True |
| 6 | Lo Knee | 0.8416666666666665 | 0.8416666666666665 | +20.2 dB | True |
| 7 | Release | 0.4239999999999998 | 0.4239999999999998 | 115 ms | True |

Slots (observed): Sc FX: None devices (unresolved).

Parameters: **observed**, host count 11.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/ATTACK | Attack | 0.41142857142857253 | 2.75 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4239999999999998 | 115 ms | observed / observed / observed |
| CONTENTS/DETECTOR_TYPE | Averaging Mode | 0 | Peak | observed / observed / observed |
| CONTENTS/LOW_THRESHOLD | Low Threshold | 0.5983333333333338 | -24.1 dB | observed / observed / observed |
| CONTENTS/LOW_RATIO | Low Ratio | 0.64 | 1:1.39 | observed / observed / observed |
| CONTENTS/LOW_KNEE | Low Knee | 0.8416666666666665 | +20.2 dB | observed / observed / observed |
| CONTENTS/HIGH_THRESHOLD | High Threshold | 0.8205704971475141 | -10.8 dB | observed / observed / observed |
| CONTENTS/HIGH_RATIO | High Ratio | 0.5125 | 1:1.03 | observed / observed / observed |
| CONTENTS/HIGH_KNEE | High Knee | 0.3499999999999996 | +8.4 dB | observed / observed / observed |
| CONTENTS/OUTPUT_GAIN | Output Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/INPUT_GAIN | Input Gain | 0.4400000000000001 | -2.9 dB | observed / observed / observed |

</details>

### Scheps 73 Stereo — disabled

Locator: `[{"track":37,"device":3}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FabFilter Pro-Q 3 — disabled

Locator: `[{"track":37,"device":4}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: 4-pole slow oscillating eq.

Remote controls: current page **LFO** (index 0, 5 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Rate | 0 | 0 | 0.02 | True |
| 1 | Timebase | 0 | 0 | Hertz | True |
| 2 | Tilt | 0.5 | 0.5 | 0.00 % | True |
| 3 | Curve | 1 | 1 | 100 % | True |
| 4 | Delay | 0 | 0 | 0.00 ms | True |
| 5 | Fade-in | 0 | 0 | 0.00 ms | True |
| 6 | Mode | 0 | 0 | Free | True |
| 7 | Amount | 1 | 1 | 100 % | True |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 320.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PARAM0 | Band 1 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM1 | Band 1 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM2 | Band 1 Frequency | 0.5209649801254272 | 647.83 Hz | observed / observed / observed |
| CONTENTS/PARAM3 | Band 1 Gain | 0.5765541195869446 | +4.59 dB | observed / observed / observed |
| CONTENTS/PARAM4 | Band 1 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM5 | Band 1 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM6 | Band 1 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM7 | Band 1 Q | 0.4800833463668823 | 0.863 | observed / observed / observed |
| CONTENTS/PARAM8 | Band 1 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM9 | Band 1 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM10 | Band 1 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM11 | Band 1 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM13 | Band 2 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM14 | Band 2 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM15 | Band 2 Frequency | 0.20013383030891418 | 49.647 Hz | observed / observed / observed |
| CONTENTS/PARAM16 | Band 2 Gain | 0.5984588861465454 | +5.91 dB | observed / observed / observed |
| CONTENTS/PARAM17 | Band 2 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM18 | Band 2 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM19 | Band 2 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM20 | Band 2 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM21 | Band 2 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM22 | Band 2 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM23 | Band 2 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM24 | Band 2 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM26 | Band 3 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM27 | Band 3 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM28 | Band 3 Frequency | 0.8607001304626465 | 9834.6 Hz | observed / observed / observed |
| CONTENTS/PARAM29 | Band 3 Gain | 0.4009721875190735 | -5.94 dB | observed / observed / observed |
| CONTENTS/PARAM30 | Band 3 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM31 | Band 3 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM32 | Band 3 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM33 | Band 3 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM34 | Band 3 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM35 | Band 3 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM36 | Band 3 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM37 | Band 3 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM39 | Band 4 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM40 | Band 4 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM41 | Band 4 Frequency | 0.3236381709575653 | 133.45 Hz | observed / observed / observed |
| CONTENTS/PARAM42 | Band 4 Gain | 0.47047004103660583 | -1.77 dB | observed / observed / observed |
| CONTENTS/PARAM43 | Band 4 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM44 | Band 4 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM45 | Band 4 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM46 | Band 4 Q | 0.6556388735771179 | 3.153 | observed / observed / observed |
| CONTENTS/PARAM47 | Band 4 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM48 | Band 4 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM49 | Band 4 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM50 | Band 4 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM52 | Band 5 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM53 | Band 5 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM54 | Band 5 Frequency | 0.46045029163360596 | 399.06 Hz | observed / observed / observed |
| CONTENTS/PARAM55 | Band 5 Gain | 0.4288165867328644 | -4.27 dB | observed / observed / observed |
| CONTENTS/PARAM56 | Band 5 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM57 | Band 5 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM58 | Band 5 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM59 | Band 5 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM60 | Band 5 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM61 | Band 5 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM62 | Band 5 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM63 | Band 5 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM65 | Band 6 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM66 | Band 6 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM67 | Band 6 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM68 | Band 6 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM69 | Band 6 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM70 | Band 6 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM71 | Band 6 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM72 | Band 6 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM73 | Band 6 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM74 | Band 6 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM75 | Band 6 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM76 | Band 6 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM78 | Band 7 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM79 | Band 7 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM80 | Band 7 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM81 | Band 7 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM82 | Band 7 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM83 | Band 7 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM84 | Band 7 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM85 | Band 7 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM86 | Band 7 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM87 | Band 7 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM88 | Band 7 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM89 | Band 7 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM91 | Band 8 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM92 | Band 8 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM93 | Band 8 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM94 | Band 8 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM95 | Band 8 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM96 | Band 8 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM97 | Band 8 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM98 | Band 8 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM99 | Band 8 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM100 | Band 8 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM101 | Band 8 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM102 | Band 8 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM104 | Band 9 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM105 | Band 9 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM106 | Band 9 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM107 | Band 9 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM108 | Band 9 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM109 | Band 9 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM110 | Band 9 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM111 | Band 9 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM112 | Band 9 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM113 | Band 9 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM114 | Band 9 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM115 | Band 9 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM117 | Band 10 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM118 | Band 10 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM119 | Band 10 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM120 | Band 10 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM121 | Band 10 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM122 | Band 10 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM123 | Band 10 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM124 | Band 10 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM125 | Band 10 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM126 | Band 10 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM127 | Band 10 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM128 | Band 10 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM130 | Band 11 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM131 | Band 11 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM132 | Band 11 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM133 | Band 11 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM134 | Band 11 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM135 | Band 11 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM136 | Band 11 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM137 | Band 11 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM138 | Band 11 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM139 | Band 11 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM140 | Band 11 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM141 | Band 11 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM143 | Band 12 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM144 | Band 12 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM145 | Band 12 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM146 | Band 12 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM147 | Band 12 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM148 | Band 12 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM149 | Band 12 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM150 | Band 12 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM151 | Band 12 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM152 | Band 12 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM153 | Band 12 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM154 | Band 12 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM156 | Band 13 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM157 | Band 13 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM158 | Band 13 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM159 | Band 13 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM160 | Band 13 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM161 | Band 13 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM162 | Band 13 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM163 | Band 13 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM164 | Band 13 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM165 | Band 13 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM166 | Band 13 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM167 | Band 13 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM169 | Band 14 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM170 | Band 14 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM171 | Band 14 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM172 | Band 14 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM173 | Band 14 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM174 | Band 14 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM175 | Band 14 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM176 | Band 14 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM177 | Band 14 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM178 | Band 14 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM179 | Band 14 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM180 | Band 14 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM182 | Band 15 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM183 | Band 15 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM184 | Band 15 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM185 | Band 15 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM186 | Band 15 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM187 | Band 15 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM188 | Band 15 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM189 | Band 15 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM190 | Band 15 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM191 | Band 15 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM192 | Band 15 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM193 | Band 15 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM195 | Band 16 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM196 | Band 16 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM197 | Band 16 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM198 | Band 16 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM199 | Band 16 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM200 | Band 16 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM201 | Band 16 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM202 | Band 16 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM203 | Band 16 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM204 | Band 16 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM205 | Band 16 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM206 | Band 16 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM208 | Band 17 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM209 | Band 17 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM210 | Band 17 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM211 | Band 17 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM212 | Band 17 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM213 | Band 17 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM214 | Band 17 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM215 | Band 17 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM216 | Band 17 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM217 | Band 17 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM218 | Band 17 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM219 | Band 17 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM221 | Band 18 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM222 | Band 18 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM223 | Band 18 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM224 | Band 18 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM225 | Band 18 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM226 | Band 18 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM227 | Band 18 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM228 | Band 18 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM229 | Band 18 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM230 | Band 18 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM231 | Band 18 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM232 | Band 18 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM234 | Band 19 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM235 | Band 19 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM236 | Band 19 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM237 | Band 19 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM238 | Band 19 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM239 | Band 19 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM240 | Band 19 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM241 | Band 19 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM242 | Band 19 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM243 | Band 19 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM244 | Band 19 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM245 | Band 19 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM247 | Band 20 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM248 | Band 20 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM249 | Band 20 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM250 | Band 20 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM251 | Band 20 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM252 | Band 20 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM253 | Band 20 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM254 | Band 20 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM255 | Band 20 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM256 | Band 20 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM257 | Band 20 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM258 | Band 20 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM260 | Band 21 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM261 | Band 21 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM262 | Band 21 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM263 | Band 21 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM264 | Band 21 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM265 | Band 21 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM266 | Band 21 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM267 | Band 21 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM268 | Band 21 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM269 | Band 21 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM270 | Band 21 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM271 | Band 21 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM273 | Band 22 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM274 | Band 22 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM275 | Band 22 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM276 | Band 22 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM277 | Band 22 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM278 | Band 22 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM279 | Band 22 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM280 | Band 22 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM281 | Band 22 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM282 | Band 22 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM283 | Band 22 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM284 | Band 22 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM286 | Band 23 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM287 | Band 23 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM288 | Band 23 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM289 | Band 23 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM290 | Band 23 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM291 | Band 23 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM292 | Band 23 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM293 | Band 23 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM294 | Band 23 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM295 | Band 23 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM296 | Band 23 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM297 | Band 23 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM299 | Band 24 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM300 | Band 24 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM301 | Band 24 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM302 | Band 24 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM303 | Band 24 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM304 | Band 24 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM305 | Band 24 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM306 | Band 24 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM307 | Band 24 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM308 | Band 24 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM309 | Band 24 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM310 | Band 24 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM314 | Gain Scale | 0.5 | 100.0% | observed / observed / observed |
| CONTENTS/PARAM315 | Output Level | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM316 | Output Pan | 0.5 | Left: 0 dB / Right: 0 dB | observed / observed / observed |
| CONTENTS/PARAM317 | Output Pan Mode | 0 | Left/Right | observed / observed / observed |
| CONTENTS/PARAM318 | Bypass | 0 | Not Bypassed | observed / observed / observed |
| CONTENTS/PARAM319 | Output Invert Phase | 0 | Normal | observed / observed / observed |
| CONTENTS/PARAM320 | Auto Gain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM332 | Receive Midi | 0 | Enabled | observed / observed / observed |
| CONTENTS/PARAM334 | Band 1 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM335 | Band 2 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM336 | Band 3 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM337 | Band 4 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM338 | Band 5 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM339 | Band 6 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM340 | Band 7 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM341 | Band 8 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM342 | Band 9 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM343 | Band 10 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM344 | Band 11 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM345 | Band 12 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM346 | Band 13 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM347 | Band 14 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM348 | Band 15 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM349 | Band 16 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM350 | Band 17 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM351 | Band 18 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM352 | Band 19 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM353 | Band 20 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM354 | Band 21 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM355 | Band 22 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM356 | Band 23 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM357 | Band 24 External Side Chain | 0 | Off | observed / observed / observed |

</details>

### Ozone Imager 2 — disabled

Locator: `[{"track":37,"device":5}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 3.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID1 | Enable Stereoize | 1 | On | observed / observed / observed |
| CONTENTS/PID2 | Stereoize Amt | 0.565789520740509 | 11.75 | observed / observed / observed |
| CONTENTS/PID3 | Width | 0.7978261709213257 | 59.57 | observed / observed / observed |

</details>

### Convology XT — disabled

Locator: `[{"track":37,"device":6}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Center Stereo — disabled

Locator: `[{"track":37,"device":7}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/38: Reverb RETURN

Type: Audio. Chain coverage: **observed**. Volume: -1.0 dB (0.7637005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/39: P2 record

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/40: AL Capture

Type: Group. Chain coverage: **observed**. Volume: +1.0 dB (0.8237005259840999); pan: -0.79 % (0.49606299212598426).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/41: Group 7

Type: Group. Chain coverage: **observed**. Volume: 0.0 dB (0.7937005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.


## flat/42: Windy reeds & trains 04

Type: Audio. Chain coverage: **observed**. Volume: -0.1 dB (0.7907418735600998); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### FabFilter Pro-Q 3 — disabled

Locator: `[{"track":42,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### ++spectralcompand — disabled

Locator: `[{"track":42,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/43: constructiona t batersea heavy ambient noise

Type: Audio. Chain coverage: **observed**. Volume: +0.1 dB (0.7957418735600997); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### FX Layer — disabled

Locator: `[{"track":43,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): FX Layer: 2 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":43,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): FabFilter Pro-Q 3: 1 devices (observed); FabFilter Pro-Q 3: 1 devices (observed); FabFilter Pro-Q 3: 1 devices (observed); ++spectralcompand: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 3 — enabled

Locator: `[{"track":43,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FabFilter Pro-Q 3 — enabled

Locator: `[{"track":43,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### FabFilter Pro-Q 3 — enabled

Locator: `[{"track":43,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### ++spectralcompand — enabled

Locator: `[{"track":43,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### ++spectralcompand — disabled

Locator: `[{"track":43,"device":0},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/44: bell

Type: Audio. Chain coverage: **observed**. Volume: -11.0 dB (0.5207418735600996); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### FX Layer — disabled

Locator: `[{"track":44,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): ++spectralcompand: 1 devices (observed); ++spectralcompand 2: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### ++spectralcompand — enabled

Locator: `[{"track":44,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### ++spectralcompand — enabled

Locator: `[{"track":44,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.


## flat/45: C1

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":45,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":45,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":45,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/46: C2

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":46,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":46,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":46,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/47: C3

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":47,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":47,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":47,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/48: C4

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":48,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":48,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":48,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/49: B1 SC BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":49,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":49,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":49,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/50: A1 SC BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":50,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":50,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":50,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/51: A2 SC BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":51,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":51,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":51,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/52: B2 SC BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":52,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":52,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":52,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/53: Stutter BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":53,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":53,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":53,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/54: Splutter BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":54,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":54,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":54,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/55: Ubermod BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":55,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":55,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":55,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/56: Sparkle BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":56,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":56,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":56,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/57: Decimate BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":57,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":57,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":57,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/58: Fuzz BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":58,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":58,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":58,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8700000000000001 | 0.8700000000000001 | +14.4 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/59: Verb BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":59,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":59,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":59,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 1 | 1 | +18.1 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/60: Mast BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":60,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":60,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":60,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 1 | 1 | +18.1 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/61: P2 SC BUS

Type: Effect. Chain coverage: **observed**. Volume: -Inf dB (0); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Gate — enabled

Locator: `[{"track":61,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Gate** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Threshold | 0.11000000000000004 | 0.11000000000000004 | -57.5 dB | True |
| 1 | Depth | 1 | 1 | +120 dB | True |
| 2 | Attack | 0.1850000000000005 | 0.1850000000000005 | 0.36 ms | True |
| 3 | Release | 0.4750000000000001 | 0.4750000000000001 | 26.6 ms | True |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Sidechain FX: None devices (unresolved).

Parameters: **observed**, host count 4.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/THRESHOLD_LEVEL | Threshold | 0.11000000000000004 | -57.5 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.1850000000000005 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.4750000000000001 | 26.6 ms | observed / observed / observed |
| CONTENTS/DEPTH | Gain Reduction Amount | 1 | +120 dB | observed / observed / observed |

</details>

### Compressor — enabled

Locator: `[{"track":61,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Comp** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Input | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Threshold | 0.28833333333333316 | 0.28833333333333316 | -42.7 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 | Attack | 0.09499999999999999 | 0.09499999999999999 | 0.36 ms | True |
| 4 | Release | 0.12000000000000015 | 0.12000000000000015 | 59.9 ms | True |
| 5 |  | 0 | 0 |  | False |
| 6 | Ratio | 0 | 0 | 1:1 | True |
| 7 | Output | 0.6500000000000001 | 0.6500000000000001 | +6.0 dB | True |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/OUTPUT | Output Gain | 0.6500000000000001 | +6.0 dB | observed / observed / observed |
| CONTENTS/ATTACK | Attack | 0.09499999999999999 | 0.36 ms | observed / observed / observed |
| CONTENTS/RELEASE | Release | 0.12000000000000015 | 59.9 ms | observed / observed / observed |
| CONTENTS/RATIO | Ratio | 0 | 1:1 | observed / observed / observed |
| CONTENTS/THRESHOLD | Threshold | 0.28833333333333316 | -42.7 dB | observed / observed / observed |
| CONTENTS/MAKEUP_GAIN | Makeup Gain | 1 | On | observed / observed / observed |
| CONTENTS/INPUT | Input Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":61,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 1 | 1 | +18.1 dB | True |
| 2 | Amt | 0 | 0 | 0.00 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>


## flat/62: Environment BUS

Type: Effect. Chain coverage: **observed**. Volume: -0.5 dB (0.7795669435777897); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Tool — enabled

Locator: `[{"track":62,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.8000000000000002 | 0.8000000000000002 | +12.2 dB | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":62,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: EnveloperTool.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Envelope | 0 | 0 | 0.00 % | True |
| 1 | Gain | 0.7999999999999998 | 0.7999999999999998 | +12.2 dB | True |
| 2 | Vol | 1 | 1 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0 | -Inf dB | observed / observed / observed |

</details>


## flat/63: ---BLANK---

Type: Effect. Chain coverage: **observed**. Volume: +0.2 dB (0.7987005259840999); pan: 0.00 % (0.5).

| Send index | Label | Display | Normalized | Mode | Pre-fader | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | C1 | -Inf dB | 0 | AUTO | False | unresolved |
| 1 | C2 | -Inf dB | 0 | AUTO | False | unresolved |
| 2 | C3 | -Inf dB | 0 | AUTO | False | unresolved |
| 3 | C4 | -Inf dB | 0 | AUTO | False | unresolved |
| 4 | B1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 5 | A1 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 6 | A2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 7 | B2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 8 | Stutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 9 | Splutter BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 10 | Ubermod BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 11 | Sparkle BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 12 | Decimate BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 13 | Fuzz BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 14 | Verb BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 15 | Mast BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 16 | P2 SC BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 17 | Environment BUS | -Inf dB | 0 | AUTO | False | unresolved |
| 18 | ---BLANK--- | -Inf dB | 0 | AUTO | False | unresolved |

Send coverage: observed; host count 19.

### Note FX Layer — disabled

Locator: `[{"track":63,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Audio Busses: 1 devices (observed); Follower Busses: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 0.

### Note FX Layer — disabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): VC: 1 devices (observed); P2: 1 devices (observed); B1: 1 devices (observed); B2: 1 devices (observed); A2: 1 devices (observed); A1: 1 devices (observed); SPLUT: 1 devices (observed); UM: 1 devices (observed); SPARK: 1 devices (observed); FUZZ: 1 devices (observed); DECI: 1 devices (observed); Verb: 1 devices (observed); Master: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 0.

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0078125 | 0 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.015625 | 1 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.09375 | 11 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.1015625 | 12 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":5,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.109375 | 13 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":6,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.1171875 | 14 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":7,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.125 | 15 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":8,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.1328125 | 16 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":9,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.140625 | 17 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":10,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.1484375 | 18 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":11,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.15625 | 19 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":12,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.1640625 | 20 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Note FX Layer — disabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): C1: 1 devices (observed); C2: 1 devices (observed); C3: 1 devices (observed); C4: 1 devices (observed); B1: 1 devices (observed); B2: 1 devices (observed); A2: 1 devices (observed); A1: 1 devices (observed); STUT: 1 devices (observed); SPLUT: 1 devices (observed); UM: 1 devices (observed); SPARK: 1 devices (observed); DECI: 1 devices (observed); FUZZ: 1 devices (observed); VERB: 1 devices (observed); MAST: 1 devices (observed); P2: 1 devices (observed); ENV: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 0.

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.4765625 | 60 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.484375 | 61 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.4921875 | 62 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.5 | 63 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.2421875 | 30 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":5,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.25 | 31 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":6,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.2578125 | 32 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":7,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.265625 | 33 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":8,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3203125 | 40 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":9,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.328125 | 41 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":10,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3359375 | 42 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":11,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.34375 | 43 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":12,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3515625 | 44 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":13,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.359375 | 45 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":14,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3671875 | 46 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":15,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.375 | 47 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":16,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.3828125 | 48 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":0},{"kind":"layer","container":1,"device":0},{"kind":"layer","container":17,"device":0}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.390625 | 49 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### FX Layer — disabled

Locator: `[{"track":63,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Mast: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Mast: 1 devices (observed); Mast: 2 devices (observed); Fuzz: 2 devices (observed); Splutter: 2 devices (observed); Decimate: 2 devices (observed); Sparkle: 4 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":1,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":2,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":3,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":4,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":5,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":5,"device":1}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":5,"device":2}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>

### Time — enabled

Locator: `[{"track":63,"device":1},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":5,"device":3}]`. Type: note-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **CC Value** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | K1 Value | 0 | 0 | 0.00 | True |
| 1 | K2 Value | 0 | 0 | 0.00 | True |
| 2 | A.2_Fdbk-DIR | 0 | 0 | 0.00 | True |
| 3 | K4 Value | 0 | 0 | 0.00 | True |
| 4 | K5 Value | 0 | 0 | 0.00 | True |
| 5 | K6 Value | 0 | 0 | 0.00 | True |
| 6 | K7 Value | 0.035 | 0.035 | 4.45 | True |
| 7 | K8 Value | 0.015748031496062992 | 0.015748031496062992 | 2.00 | True |

Slots (observed): .

Parameters: **observed**, host count 17.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/CC4 | Knob 4 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC3 | Knob 3 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC2 | Knob 2 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC1 | Knob 1 Controller | 0.0859375 | 10 | observed / observed / observed |
| CONTENTS/P4 | Knob 4 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P3 | Knob 3 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P2 | Knob 2 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P1 | Knob 1 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P6 | Knob 6 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P5 | Knob 5 Value | 0 | 0.00 | observed / observed / observed |
| CONTENTS/P7 | Knob 7 Value | 0.035 | 4.45 | observed / observed / observed |
| CONTENTS/P8 | Knob 8 Value | 0.015748031496062992 | 2.00 | observed / observed / observed |
| CONTENTS/CC5 | Knob 5 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC6 | Knob 6 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC7 | Knob 7 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/CC8 | Knob 8 Controller | 0 | -1 | observed / observed / observed |
| CONTENTS/MIDI_CHANNEL | MIDI Channel | 0.06666666666666667 | 2 | observed / observed / observed |

</details>


## flat/64: Master

Type: Master. Chain coverage: **observed**. Volume: -0.7 dB (0.7737005259840999); pan: -2.00 % (0.48999999999999994).

### FX Layer — enabled

Locator: `[{"track":64,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Master chain 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | mastEQSel | 0 | 0 | 0.00 % | True |
| 1 | schertler mix | 0 | 0 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | A~mastEQ | 0 | 0 | 0.00 % | True |
| 5 | ~a schertler mix | 0.11023622006177902 | 0.11023622006177902 | 11.0 % | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Mast: 4 devices (observed); Verb: 1 devices (observed); Environment: 1 devices (observed); Record: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Mast: 1 devices (observed); Fuzz: 1 devices (observed); Splutter: 1 devices (observed); Decimate: 1 devices (observed); Sparkle: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":0},{"kind":"layer","container":4,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: UM 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | A~Mix | 0 | 0 | 0.00 % | True |
| 1 | UM_SC Shaper | 0 | 0 | 0.00 % | True |
| 2 | A~Noise | 0 | 0 | 0.00 % | True |
| 3 | A~Drive | 0 | 0 | 0.00 % | True |
| 4 | A~innerDepth | 0 | 0 | 0.00 % | True |
| 5 | A~innerRate | 0 | 0 | 0.00 % | True |
| 6 | A~wonk | 0 | 0 | 0.00 % | True |
| 7 |  | 0 | 0 |  | False |

Layers (observed): UberMod controlled 4.1: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### ValhallaUberMod — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":1},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: UberMod controlled 4.1.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Mix | 0 | 0 | 0.00 % | True |
| 1 | Main control | 0 | 0 | 0.00 % | True |
| 2 | Earth | 0 | 0 | 0.00 % | True |
| 3 | Diffusio | 0 | 0 | 0.00 % | True |
| 4 | UM_innerDepth | 0 | 0 | 0.00 % | True |
| 5 | UM_Rate | 0 | 0 | 0.00 % | True |
| 6 | Wonk SC | 0 | 0 | 0.00 % | True |
| 7 | OverMod | 0 | 0 | 0.00 % | True |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 35.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PID30 | Mix | 0 | 0.00 %  | observed / observed / observed |
| CONTENTS/PID31 | Depth | 0 | 0.00 %  | observed / observed / observed |
| CONTENTS/PID32 | StereoWidth | 0.37700000405311584 | 75.40 %  | observed / observed / observed |
| CONTENTS/PID33 | Delay | 0.011900000274181366 | 11.90 ms  | observed / observed / observed |
| CONTENTS/PID34 | Feedback | 0.032999999821186066 | 3.30 %  | observed / observed / observed |
| CONTENTS/PID35 | Spread | 0.3790000081062317 | 37.90 %  | observed / observed / observed |
| CONTENTS/PID36 | Slope | 0.6514999866485596 | 30.30 %  | observed / observed / observed |
| CONTENTS/PID37 | Skew | 0.5 | 0.00 %  | observed / observed / observed |
| CONTENTS/PID38 | Random | 0 | 0.00 %  | observed / observed / observed |
| CONTENTS/PID39 | TapGain | 0.5 | 0.00 dB  | observed / observed / observed |
| CONTENTS/PID61f | Diffusion | 0 | 0.00 %  | observed / observed / observed |
| CONTENTS/PID620 | DiffSize | 0.33175957202911377 | 172.56 ms  | observed / observed / observed |
| CONTENTS/PID621 | DiffModRate | 0.03500000014901161 | 0.36 Hz  | observed / observed / observed |
| CONTENTS/PID622 | DiffModDepth | 0.5 | 50.00 %  | observed / observed / observed |
| CONTENTS/PID623 | LowCut | 0 | 10.00 Hz  | observed / observed / observed |
| CONTENTS/PID624 | HighCut | 1 | 20000.00 Hz  | observed / observed / observed |
| CONTENTS/PID625 | SpatialXover | 0.3819095492362976 | 770.00 Hz  | observed / observed / observed |
| CONTENTS/PID626 | DetuneRate | 0.1411411464214325 | 1.42 Hz  | observed / observed / observed |
| CONTENTS/PID627 | DetuneDepth | 0.28821849822998047 | 28.82  | observed / observed / observed |
| CONTENTS/PID628 | VibratoRate | 0.05405472218990326 | 3.49 Hz  | observed / observed / observed |
| CONTENTS/PID63e | VibratoDepth | 0 | 0.00  | observed / observed / observed |
| CONTENTS/PID63f | OverMod | 0 | 1.00 X  | observed / observed / observed |
| CONTENTS/PID640 | DriveInGain | 0 | 0.00 dB  | observed / observed / observed |
| CONTENTS/PID641 | DriveOutGain | 1 | 0.00 dB  | observed / observed / observed |
| CONTENTS/PID642 | DriveNoiseGain | 0.013333333656191826 | -118.80 dB  | observed / observed / observed |
| CONTENTS/PID643 | FeedbackRotate | 0.5019999742507935 | 50.20 %  | observed / observed / observed |
| CONTENTS/PID644 | SmoothingTime | 0.09909909963607788 | 100.00 ms  | observed / observed / observed |
| CONTENTS/PID645 | ColorMode | 0 | Bright | observed / observed / observed |
| CONTENTS/PID646 | DelaySync | 0.05882352963089943 | 1.00 | observed / observed / observed |
| CONTENTS/PID647 | type | 0.0833333358168602 | 2.00 | observed / observed / observed |
| CONTENTS/PID65d | DiffEnable | 1 | On | observed / observed / observed |
| CONTENTS/PID65e | Drive | 1 | On | observed / observed / observed |
| CONTENTS/PID65f | DrivePrePost | 1 | Post | observed / observed / observed |
| CONTENTS/PID660 | Speed | 0 | 1X | observed / observed / observed |
| CONTENTS/PID661 | InputPan | 0 | 0.00 | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: mast eq sc.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Eq control 4.1: 3 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### EQ-DJ — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Eq control 4.1.

Remote controls: current page **EQ-DJ** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Lo Gain | 0.49000000000000016 | 0.49000000000000016 | -0.5 dB | True |
| 1 | Mid Gain | 0.5 | 0.5 | 0.0 dB | True |
| 2 | Hi Gain | 0.5050000000000001 | 0.5050000000000001 | +0.3 dB | True |
| 3 | Lo Freq | 0.6400000000000009 | 0.6400000000000009 | 339 Hz | True |
| 4 | Lo On | 0 | 0 | Off | True |
| 5 | Mid On | 0 | 0 | Off | True |
| 6 | Hi On | 0 | 0 | Off | True |
| 7 | Hi Freq | 0.485 | 0.485 | 3.89 kHz | True |

Slots (observed): .

Parameters: **observed**, host count 8.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LOW_FREQ | Low Crossover Frequency | 0.6400000000000009 | 339 Hz | observed / observed / observed |
| CONTENTS/HIGH_FREQ | High Crossover Frequency | 0.485 | 3.89 kHz | observed / observed / observed |
| CONTENTS/KILL_LOWS | Low Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_MIDS | Mid Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/KILL_HIGHS | High Band Enable | 0 | Off | observed / observed / observed |
| CONTENTS/LOW_GAIN | Low Band Gain | 0.49000000000000016 | -0.5 dB | observed / observed / observed |
| CONTENTS/MID_GAIN | Mid Band Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/HIGH_GAIN | High Band Gain | 0.5050000000000001 | +0.3 dB | observed / observed / observed |

</details>

### FabFilter Pro-Q 3 — disabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":1}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 320.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/PARAM0 | Band 1 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM1 | Band 1 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM2 | Band 1 Frequency | 0.5914999842643738 | 1139.5 Hz | observed / observed / observed |
| CONTENTS/PARAM3 | Band 1 Gain | 0.5552092790603638 | +3.31 dB | observed / observed / observed |
| CONTENTS/PARAM4 | Band 1 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM5 | Band 1 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM6 | Band 1 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM7 | Band 1 Q | 0 | 0.025 | observed / observed / observed |
| CONTENTS/PARAM8 | Band 1 Shape | 0.75 | Band Pass | observed / observed / observed |
| CONTENTS/PARAM9 | Band 1 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM10 | Band 1 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM11 | Band 1 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM13 | Band 2 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM14 | Band 2 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM15 | Band 2 Frequency | 0.48538938164711 | 487.26 Hz | observed / observed / observed |
| CONTENTS/PARAM16 | Band 2 Gain | 0.499318391084671 | -0.04 dB | observed / observed / observed |
| CONTENTS/PARAM17 | Band 2 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM18 | Band 2 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM19 | Band 2 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM20 | Band 2 Q | 0.018030356615781784 | 0.029 | observed / observed / observed |
| CONTENTS/PARAM21 | Band 2 Shape | 0.75 | Band Pass | observed / observed / observed |
| CONTENTS/PARAM22 | Band 2 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM23 | Band 2 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM24 | Band 2 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM26 | Band 3 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM27 | Band 3 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM28 | Band 3 Frequency | 0.4883367419242859 | 498.89 Hz | observed / observed / observed |
| CONTENTS/PARAM29 | Band 3 Gain | 0.4952685236930847 | -0.28 dB | observed / observed / observed |
| CONTENTS/PARAM30 | Band 3 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM31 | Band 3 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM32 | Band 3 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM33 | Band 3 Q | 0.1064809188246727 | 0.055 | observed / observed / observed |
| CONTENTS/PARAM34 | Band 3 Shape | 0.75 | Band Pass | observed / observed / observed |
| CONTENTS/PARAM35 | Band 3 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM36 | Band 3 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM37 | Band 3 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM39 | Band 4 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM40 | Band 4 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM41 | Band 4 Frequency | 0.11183598637580872 | 24.483 Hz | observed / observed / observed |
| CONTENTS/PARAM42 | Band 4 Gain | 0.495105117559433 | -0.29 dB | observed / observed / observed |
| CONTENTS/PARAM43 | Band 4 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM44 | Band 4 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM45 | Band 4 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM46 | Band 4 Q | 0.4857035279273987 | 0.900 | observed / observed / observed |
| CONTENTS/PARAM47 | Band 4 Shape | 0.25 | Low Cut | observed / observed / observed |
| CONTENTS/PARAM48 | Band 4 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM49 | Band 4 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM50 | Band 4 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM52 | Band 5 Used | 1 | Used | observed / observed / observed |
| CONTENTS/PARAM53 | Band 5 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM54 | Band 5 Frequency | 0.9631608128547668 | 22337 Hz | observed / observed / observed |
| CONTENTS/PARAM55 | Band 5 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM56 | Band 5 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM57 | Band 5 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM58 | Band 5 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM59 | Band 5 Q | 0.5000854134559631 | 1.001 | observed / observed / observed |
| CONTENTS/PARAM60 | Band 5 Shape | 0.5 | High Cut | observed / observed / observed |
| CONTENTS/PARAM61 | Band 5 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM62 | Band 5 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM63 | Band 5 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM65 | Band 6 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM66 | Band 6 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM67 | Band 6 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM68 | Band 6 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM69 | Band 6 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM70 | Band 6 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM71 | Band 6 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM72 | Band 6 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM73 | Band 6 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM74 | Band 6 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM75 | Band 6 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM76 | Band 6 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM78 | Band 7 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM79 | Band 7 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM80 | Band 7 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM81 | Band 7 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM82 | Band 7 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM83 | Band 7 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM84 | Band 7 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM85 | Band 7 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM86 | Band 7 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM87 | Band 7 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM88 | Band 7 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM89 | Band 7 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM91 | Band 8 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM92 | Band 8 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM93 | Band 8 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM94 | Band 8 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM95 | Band 8 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM96 | Band 8 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM97 | Band 8 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM98 | Band 8 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM99 | Band 8 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM100 | Band 8 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM101 | Band 8 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM102 | Band 8 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM104 | Band 9 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM105 | Band 9 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM106 | Band 9 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM107 | Band 9 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM108 | Band 9 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM109 | Band 9 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM110 | Band 9 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM111 | Band 9 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM112 | Band 9 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM113 | Band 9 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM114 | Band 9 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM115 | Band 9 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM117 | Band 10 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM118 | Band 10 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM119 | Band 10 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM120 | Band 10 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM121 | Band 10 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM122 | Band 10 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM123 | Band 10 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM124 | Band 10 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM125 | Band 10 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM126 | Band 10 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM127 | Band 10 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM128 | Band 10 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM130 | Band 11 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM131 | Band 11 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM132 | Band 11 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM133 | Band 11 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM134 | Band 11 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM135 | Band 11 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM136 | Band 11 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM137 | Band 11 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM138 | Band 11 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM139 | Band 11 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM140 | Band 11 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM141 | Band 11 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM143 | Band 12 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM144 | Band 12 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM145 | Band 12 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM146 | Band 12 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM147 | Band 12 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM148 | Band 12 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM149 | Band 12 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM150 | Band 12 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM151 | Band 12 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM152 | Band 12 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM153 | Band 12 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM154 | Band 12 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM156 | Band 13 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM157 | Band 13 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM158 | Band 13 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM159 | Band 13 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM160 | Band 13 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM161 | Band 13 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM162 | Band 13 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM163 | Band 13 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM164 | Band 13 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM165 | Band 13 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM166 | Band 13 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM167 | Band 13 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM169 | Band 14 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM170 | Band 14 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM171 | Band 14 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM172 | Band 14 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM173 | Band 14 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM174 | Band 14 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM175 | Band 14 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM176 | Band 14 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM177 | Band 14 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM178 | Band 14 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM179 | Band 14 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM180 | Band 14 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM182 | Band 15 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM183 | Band 15 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM184 | Band 15 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM185 | Band 15 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM186 | Band 15 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM187 | Band 15 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM188 | Band 15 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM189 | Band 15 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM190 | Band 15 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM191 | Band 15 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM192 | Band 15 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM193 | Band 15 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM195 | Band 16 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM196 | Band 16 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM197 | Band 16 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM198 | Band 16 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM199 | Band 16 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM200 | Band 16 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM201 | Band 16 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM202 | Band 16 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM203 | Band 16 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM204 | Band 16 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM205 | Band 16 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM206 | Band 16 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM208 | Band 17 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM209 | Band 17 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM210 | Band 17 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM211 | Band 17 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM212 | Band 17 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM213 | Band 17 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM214 | Band 17 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM215 | Band 17 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM216 | Band 17 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM217 | Band 17 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM218 | Band 17 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM219 | Band 17 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM221 | Band 18 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM222 | Band 18 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM223 | Band 18 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM224 | Band 18 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM225 | Band 18 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM226 | Band 18 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM227 | Band 18 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM228 | Band 18 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM229 | Band 18 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM230 | Band 18 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM231 | Band 18 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM232 | Band 18 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM234 | Band 19 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM235 | Band 19 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM236 | Band 19 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM237 | Band 19 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM238 | Band 19 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM239 | Band 19 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM240 | Band 19 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM241 | Band 19 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM242 | Band 19 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM243 | Band 19 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM244 | Band 19 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM245 | Band 19 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM247 | Band 20 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM248 | Band 20 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM249 | Band 20 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM250 | Band 20 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM251 | Band 20 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM252 | Band 20 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM253 | Band 20 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM254 | Band 20 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM255 | Band 20 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM256 | Band 20 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM257 | Band 20 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM258 | Band 20 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM260 | Band 21 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM261 | Band 21 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM262 | Band 21 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM263 | Band 21 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM264 | Band 21 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM265 | Band 21 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM266 | Band 21 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM267 | Band 21 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM268 | Band 21 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM269 | Band 21 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM270 | Band 21 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM271 | Band 21 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM273 | Band 22 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM274 | Band 22 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM275 | Band 22 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM276 | Band 22 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM277 | Band 22 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM278 | Band 22 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM279 | Band 22 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM280 | Band 22 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM281 | Band 22 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM282 | Band 22 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM283 | Band 22 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM284 | Band 22 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM286 | Band 23 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM287 | Band 23 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM288 | Band 23 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM289 | Band 23 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM290 | Band 23 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM291 | Band 23 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM292 | Band 23 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM293 | Band 23 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM294 | Band 23 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM295 | Band 23 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM296 | Band 23 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM297 | Band 23 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM299 | Band 24 Used | 0 | Unused | observed / observed / observed |
| CONTENTS/PARAM300 | Band 24 Enabled | 1 | Enabled | observed / observed / observed |
| CONTENTS/PARAM301 | Band 24 Frequency | 0.5751884579658508 | 1000.0 Hz | observed / observed / observed |
| CONTENTS/PARAM302 | Band 24 Gain | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM303 | Band 24 Dynamic Range | 0.5 | 0.00 dB | observed / observed / observed |
| CONTENTS/PARAM304 | Band 24 Dynamics Enabled | 1 | Dynamics Enabled | observed / observed / observed |
| CONTENTS/PARAM305 | Band 24 Threshold | 1 | Auto | observed / observed / observed |
| CONTENTS/PARAM306 | Band 24 Q | 0.5 | 1.000 | observed / observed / observed |
| CONTENTS/PARAM307 | Band 24 Shape | 0 | Bell | observed / observed / observed |
| CONTENTS/PARAM308 | Band 24 Slope | 0.1111111119389534 | 12 dB/oct | observed / observed / observed |
| CONTENTS/PARAM309 | Band 24 Stereo Placement | 0.5 | Stereo | observed / observed / observed |
| CONTENTS/PARAM310 | Band 24 Speakers | 0.10000000149011612 | All (excl. LFE) | observed / observed / observed |
| CONTENTS/PARAM314 | Gain Scale | 0.48827776312828064 | 97.66% | observed / observed / observed |
| CONTENTS/PARAM315 | Output Level | 0.4997499883174896 | -0.02 dB | observed / observed / observed |
| CONTENTS/PARAM316 | Output Pan | 0.5 | Left: 0 dB / Right: 0 dB | observed / observed / observed |
| CONTENTS/PARAM317 | Output Pan Mode | 0 | Left/Right | observed / observed / observed |
| CONTENTS/PARAM318 | Bypass | 0 | Not Bypassed | observed / observed / observed |
| CONTENTS/PARAM319 | Output Invert Phase | 0 | Normal | observed / observed / observed |
| CONTENTS/PARAM320 | Auto Gain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM332 | Receive Midi | 0 | Enabled | observed / observed / observed |
| CONTENTS/PARAM334 | Band 1 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM335 | Band 2 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM336 | Band 3 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM337 | Band 4 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM338 | Band 5 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM339 | Band 6 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM340 | Band 7 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM341 | Band 8 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM342 | Band 9 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM343 | Band 10 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM344 | Band 11 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM345 | Band 12 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM346 | Band 13 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM347 | Band 14 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM348 | Band 15 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM349 | Band 16 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM350 | Band 17 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM351 | Band 18 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM352 | Band 19 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM353 | Band 20 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM354 | Band 21 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM355 | Band 22 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM356 | Band 23 External Side Chain | 0 | Off | observed / observed / observed |
| CONTENTS/PARAM357 | Band 24 External Side Chain | 0 | Off | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":2},{"kind":"layer","container":0,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":3}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 0 | 7.589783799079485e-17 | 0.00 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Scheps 73 Stereo: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 0 | 0.00 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Scheps 73 Stereo — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":0,"device":3},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: True. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 0 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 |  | False |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): FX: None devices (unresolved).

Parameters: **observed**, host count 0.

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":1,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":2,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Audio Receiver — enabled

Locator: `[{"track":64,"device":0},{"kind":"layer","container":3,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Mix** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Mix | 1 | 1 | 100 % | True |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 |  | 0 | 0 |  | False |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): Source FX: None devices (unresolved).

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Multiband FX-3 — disabled

Locator: `[{"track":64,"device":1}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Stut_SC_Amount | 0.47999999999999954 | 0.47999999999999954 | 48.0 % | True |
| 1 | Stut_SC_Amount | 0.6749999999999997 | 0.6749999999999997 | 67.5 % | True |
| 2 | Stut_SC_Amount | 1 | 1 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | Stut SC In | 1 | 1 | 100 % | True |
| 5 | Stut SC In | 1 | 1 | 100 % | True |
| 6 | Stut SC In | 1 | 1 | 100 % | True |
| 7 | Mix | 1 | 1 | 100 % | True |

Slots (observed): LOW: 1 devices (observed); HIGH: 1 devices (observed); MID: 1 devices (observed).

Parameters: **observed**, host count 6.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/LOW_MID_SPLIT | Low Crossover Frequency | 0.3595870807624734 | 232 Hz | observed / observed / observed |
| CONTENTS/MID_HIGH_SPLIT | High Crossover Frequency | 0.38146520698155917 | 1.02 kHz | observed / observed / observed |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/LOW | Low Band Gain | 0.49938144329896905 | -0.0 dB | observed / observed / observed |
| CONTENTS/MID | Mid Band Gain | 0.5050000000000003 | +0.3 dB | observed / observed / observed |
| CONTENTS/HIGH | High Band Gain | 0.4915463917525771 | -0.4 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":1},{"kind":"slot","container":"LOW","device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Stutter standalone 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Stut_SC_Amount | 0.47999999999999954 | 0.47999999999999954 | 48.0 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | Stut SC In | 1 | 1 | 100 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Instrument SC stutter 4.1: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":64,"device":1},{"kind":"slot","container":"LOW","device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Instrument SC stutter 4.1.

Remote controls: current page **Tool** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5200000000000004 | 0.5200000000000004 | 4.00 % | True |
| 2 | St. Width | 0.5349999999999999 | 0.5349999999999999 | 107 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5349999999999999 | 107 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5200000000000004 | 4.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":1},{"kind":"slot","container":"HIGH","device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Stutter standalone 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Stut_SC_Amount | 1 | 1 | 100 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | Stut SC In | 1 | 1 | 100 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Instrument SC stutter 4.1: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":64,"device":1},{"kind":"slot","container":"HIGH","device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Instrument SC stutter 4.1.

Remote controls: current page **Tool** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5200000000000004 | 0.5200000000000004 | 4.00 % | True |
| 2 | St. Width | 0.5349999999999999 | 0.5349999999999999 | 107 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5349999999999999 | 107 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5200000000000004 | 4.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### FX Layer — enabled

Locator: `[{"track":64,"device":1},{"kind":"slot","container":"MID","device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Stutter standalone 5.0 (remote).

Remote controls: current page **** (index 0, 2 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Stut_SC_Amount | 0.6749999999999997 | 0.6749999999999997 | 67.5 % | True |
| 1 |  | 0 | 0 |  | False |
| 2 |  | 0 | 0 |  | False |
| 3 |  | 0 | 0 |  | False |
| 4 | Stut SC In | 1 | 1 | 100 % | True |
| 5 |  | 0 | 0 |  | False |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Layers (observed): Instrument SC stutter 4.1: 1 devices (observed).

Slots (observed): .

Parameters: **observed**, host count 2.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/MIX | Mix | 1 | 100 % | observed / observed / observed |
| CONTENTS/GAIN | Gain | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — enabled

Locator: `[{"track":64,"device":1},{"kind":"slot","container":"MID","device":0},{"kind":"layer","container":0,"device":0}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: Instrument SC stutter 4.1.

Remote controls: current page **Tool** (index 0, 3 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5200000000000004 | 0.5200000000000004 | 4.00 % | True |
| 2 | St. Width | 0.5349999999999999 | 0.5349999999999999 | 107 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.5349999999999999 | 107 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5200000000000004 | 4.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

### Tool — disabled

Locator: `[{"track":64,"device":2}]`. Type: audio-effect; plugin: False. Inspection: observed.

presetName: init.

Remote controls: current page **Tool** (index 0, 1 pages). Current API cursor page only; other pages not traversed, existing OSC page selection not independently read.

| Remote index | Name | Normalized | Modulated | Host display | Exists |
| --- | --- | --- | --- | --- | --- |
| 0 | Gain | 0.5 | 0.5 | 0.0 dB | True |
| 1 | Pan | 0.5 | 0.5 | 0.00 % | True |
| 2 | St. Width | 0.49999999999999967 | 0.49999999999999967 | 100 % | True |
| 3 |  | 0 | 0 |  | False |
| 4 | L- | 0 | 0 | Off | True |
| 5 | R- | 0 | 0 | Off | True |
| 6 |  | 0 | 0 |  | False |
| 7 |  | 0 | 0 |  | False |

Slots (observed): .

Parameters: **observed**, host count 7.

<details><summary>Exposed direct parameters</summary>

| ID | Name | Normalized | Host display | Name / numeric / display status |
| --- | --- | --- | --- | --- |
| CONTENTS/AMPLITUDE | Gain | 0.5 | 0.0 dB | observed / observed / observed |
| CONTENTS/WIDTH | Stereo Width | 0.49999999999999967 | 100 % | observed / observed / observed |
| CONTENTS/INVERT_LEFT | Invert Left | 0 | Off | observed / observed / observed |
| CONTENTS/INVERT_RIGHT | Invert Right | 0 | Off | observed / observed / observed |
| CONTENTS/PAN | Pan | 0.5 | 0.00 % | observed / observed / observed |
| CONTENTS/PAN_SWAP | Swap L/R | 0 | Off | observed / observed / observed |
| CONTENTS/VOLUME | Volume | 0.5 | 0.0 dB | observed / observed / observed |

</details>

## Human annotations

These entries come from the separate annotation file. They do not replace controller observations.

No annotations recorded yet. Input/output destinations, send edges, modulation assignments and any hidden device state need targeted UI inspection.
