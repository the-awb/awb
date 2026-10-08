# Capture review: awb 5.2 (ef script)

4 October 2026. The authorized read-only capture of the open `New 2*` template instance is complete. [Overview](target-capture/overview.md), [full device/parameter map](target-capture/set-map.md), [structured snapshot](target-capture/snapshot.json), and [provenance](target-capture/provenance.json).

## Result and checked boundaries

- **65/65 tracks and 290 devices**, including disabled devices, nested layers and named slots. **All 65 parent identities are observed** after explicit effect-bank and Master follow-ups.
- **3,094 direct-parameter records**. All 290 devices have an observed direct-ID outcome; 44 returned an empty list. Empty lists do not establish that the device has no controls or hidden state. Current remote pages/page names and eight control slots are also retained.
- **57 disabled devices**, ten inactive tracks and five armed tracks. All 65 names, mute states, volume and pan values matched exactly between the main and state captures. Inactive status is separate from device enablement, mute and parent activation.
- Screenshots: 64 exact name/order matches plus the matching prefix of the truncated index-43 label, now resolved as `constructiona t batersea heavy ambient noise`.
- OSC controller: **14/14 module track bindings and 17/17 configured bus positions agree**. The dedicated root effect bank contains 19 tracks (C1 through `---BLANK---`); nested tracks expose 25 sends, including the six group FX, while root tracks expose 19. The installed controller configures six FX plus eighteen bus sends and does not bind the final blank send.
- Actual host traversal reached **18 layers** (beyond the eight-item bank) and **five nested levels**. The largest observed chain has eight devices. No traversal cap was reached. Eleven-device chains and drum pads are fixture-tested, not claimed as exercised by this target.

## Existing OSC controller: concrete mismatches

The installed extension and all thirteen matching compiled classes were checked against the retained dirty source. No rebuild, controller edit, MIDI or OSC test message was sent.

The exact FX Layer UUID matcher `a0913b7f-096b-4ac9-bddd-33c775314b42` reports:

- `Pro 2` at flat index 5 has **zero matching root FX Layers**. Installed source binds filtered index 0 to `p2 params`; that target is absent in this template instance. Its actual root chain contains the note device `Time`.
- Master has **one matching root FX Layer**. The `mast params` root index-0 binding has a target; the `stut 2` filtered root index-1 binding has none. The Master root also contains disabled Multiband FX-3 and Tool devices. Its nested UberMod container and ValhallaUberMod are captured; filtered indices must not be copied as raw chain positions.

These are configuration-to-template mismatches, not evidence about whether Willy uses those controls in performance. The controller's module track `Mast` is distinct from its parameter-device source, **Master**.

## Runtime fixes and evidence

| Evidence stream | Latest successful run | Start UTC | Completion counts |
| --- | --- | --- | --- |
| `capture.jsonl` | `1791142098490` | 2026-10-04T19:28:18+00:00 | `{"tracks":65,"devices":290}` |
| `parameter-pass.jsonl` | `1791145787283` | 2026-10-04T20:29:47+00:00 | `{"devices":108}` |
| `track-states.jsonl` | `1791146757845` | 2026-10-04T20:45:57+00:00 | `{"tracks":65,"effectTracks":19}` |
| `hierarchy-pass.jsonl` | `1791146597214` | 2026-10-04T20:43:17+00:00 | `{"tracks":65,"unresolved":0}` |

The main traversal took 60.9 minutes. Raw streams retain earlier attempts and phase exit events; rendering chooses the latest completed run, never silently falls back after a newer failure.

1. Layer navigation encountered the actual host's ambiguous integer/String overload. The conventional explicit Java signature was also unavailable in this script host. Pre-created layer/pad child-bank proxies were selected directly instead. Both failures, their exact source and raw events remain in `live-evidence/`.
2. The main parameter reader cleared callbacks at each cursor rebind. Unchanged ID lists need not trigger a new callback, leaving 108 devices unresolved. A targeted pass preserved current host ID/name/numeric caches across rebind and recovered all 108, adding 291 parameter records. This was a reader defect, not an API inability to expose those parameters.
3. The first OSC-state probe scrolled its dedicated track bank before its count had initialized; it remained at index 0 (`Audio group`). The renderer rejected that supplement. Scrolling after initialization and requiring the intended offset in settling fixed the binding; the entire state pass was rerun. Rejected raw evidence and reconstructed first-pass source are retained separately.
4. At **21:06:43 London / 20:06:43 UTC**, Bitwig logged `Audio thread died: Device is no longer alive`, stopped the engine for New 2, and reported `Audio System No Longer Available`. No cause is assigned to the inspector. The main static capture continued to completion. Bringing the existing Bitwig window forward later was followed by faster progress; this is not a measured performance result. Audio settings were not changed. The error and intermediate incomplete checkpoint remain evidence, not the final map.

The installed inspection file and its empty folder were removed after the final pass. Each completed phase emitted an exit record. The original template SHA-256 remains `c41ab2729aa00efa82586602705380d5b880542b2e7ecc1e26de1308d5cdae94`; installed OSC extension SHA-256 remains `33dc3f363f52ef5e888817470edbe4b93e39beb1a7289eb45a1999b1efc19adc`. Existing controllers and the original template are unchanged. No musical setters or save calls were used; observed control equality is narrower evidence than a saved-project byte comparison.

## Remaining documentation gaps

**131 named slots are unresolved** because navigation retained the parent cursor: empty and inaccessible are not distinguished. Other remote pages are untraversed. Generic track inputs/outputs, verified send destination edges, modulation assignment targets/amounts, plugin versions and hidden plugin/Grid state remain unavailable or unimplemented. Audio Receiver names, layer labels and send names are useful clues, not independently verified routing destinations.

The instance path/hash remains unknown. Template association is Willy's confirmation; the source template hash is not assigned to the open instance. Every locator is positional within this fixed capture. Multi-pass caches are adequate for this static investigation but do not prove atomicity or support live-use claims.

For a complete reproduction graph, the concrete remaining work is to annotate the track input/output choices, receiver sources, significant slot contents and modulation mappings from UI/project evidence. Keep human facts in `annotations.json` with their source. No migration, universal binary decoder or live inspector was built.

## Verification

The 19-track/24-device traversal fixture passes, including unchanged-only callbacks, long chains, nine layers, nested slots/pads, duplicate names, disabled/zero/empty/NaN values, absent callbacks and playback refusal. Eight renderer tests pass, including annotation preservation, latest-run refusal, comparable hashes and supplement identity/control/parent conflict guards. Initialization interface checks have no missing installed-API methods; those checks remain offline evidence. Actual host completion, parent identities, track control equality, screenshot and controller checks supply the runtime boundary.

Repository roadmap and handoff status are updated. Vault MCP and Telegram tools were unavailable in the final session, so the corresponding note update and notification could not be sent.
