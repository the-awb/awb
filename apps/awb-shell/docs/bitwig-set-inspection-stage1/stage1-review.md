# Bitwig template inspection: Stage 1 evidence

4 October 2026. Investigation only; no production inspector or migration authorized.

**Finding:** Bitwig 4.3.10 exposes enough of the older controller API to read tracks,
ordered device chains, sends, FX Layer children and direct device parameters. Neither
candidate currently implements the complete documentation task. A small one-shot
inspector is the best fit, subject to the remaining provenance/UI checks below.

This is a fixed-template extraction task. There is no requirement for continuous
synchronization. Settling is needed only when controller proxies are first populated
or rebound during navigation.

## Evidence and remaining proof

| Check | Result |
| --- | --- |
| Installed application | `/Applications/Bitwig Studio.app`, plist version **4.3.10** |
| Installed API maximum | **17**, found in installed runtime bytecode and confirmed by the live probe |
| Original target | `awb 5.2 (ef script).bwtemplate/template.bwproject`, **3,447,457 bytes** |
| Target SHA-256 | `c41ab2729aa00efa82586602705380d5b880542b2e7ecc1e26de1308d5cdae94` |
| File's recorded application version | `4.3.10`, exact header value bytes 109–114 |
| Control Deck unchanged | **Rejected in the actual Bitwig script scan:** `Cannot load API version 18: Supported version is 17` |
| Control Deck with API gate bypassed in an offline diagnostic | Next blocker: `Project.isModified()` is absent from installed interfaces; not a tested host adaptation |
| Beat Twin startup source/interface check | Reaches end of `init()` against installed-interface stand-ins; actual startup and RPC reads remain unverified |
| Minimal API-15 probe | Successful host capture on **4.3.10 / API 17**, after fixing one observer-registration precondition |
| Track pagination | Two eight-track windows, offsets **0 and 8**, **16 of 65** flat-bank entries |
| Selected nested FX Layer | Layers `Cello In` and `Mic`; each contains an enabled, nested `Audio Receiver` |
| Direct parameters on selected FX Layer | `CONTENTS/MIX`: normalized `1`, display `100 %`; `CONTENTS/GAIN`: normalized `0.5`, display `0.0 dB` |
| Live-set identity | **Confirmed by Willy:** the open set is the mapping target and an instance of `awb 5.2 (ef script)`. The template hash is separate from the instance file identity. |
| UI comparison | Selected-device display values have not yet been cross-checked by the user. |
| Controlled disposable fixture | Not completed. Long chains, bank edges with known contents and hierarchy semantics still need a controlled comparison |

Read [the partial snapshot](evidence/host-partial.json) and
[the readable description](set-description-partial.md). Raw host events are in
[live-probe.jsonl](evidence/live-probe.jsonl). These are deliberately partial results.
The count of 65 is the observed flat-bank item count, including entries such as groups;
it is not a claim that there are 65 ordinary instrument/audio channels.

## Pinned sources and licenses

Both projects are MIT licensed. Licenses and unchanged controller sources are retained
under `sources/`. No npm installation, candidate installer, dashboard, native wrapper,
MCP registration or launch agent was run.

- [Beat Twin at `802e4a400d4018e44dea39d08920125d4d2441ae`](https://github.com/LaurentHuzard/beat-twin/tree/802e4a400d4018e44dea39d08920125d4d2441ae).
  Its [API audit](https://github.com/LaurentHuzard/beat-twin/blob/802e4a400d4018e44dea39d08920125d4d2441ae/docs/BITWIG_CONTROLLER_API_COVERAGE.md)
  identifies its reference host as Bitwig 6.1.1, not 4.3.10. The package declares Node **26+**;
  the local Node used for diagnostics is **22.23.2**. Its controller source is generated
  from TypeScript; a maintained adaptation should edit those source modules.
- [Control Deck at `2043a61b9e9c77cafa85fd7360e5c7e22f869220`](https://github.com/remymazmanian/bitwig-control-deck/tree/2043a61b9e9c77cafa85fd7360e5c7e22f869220).
  Its README targets Bitwig **6 / API 18** and Node **20+**. The controller requires a
  stamped auth token before accepting requests; the checked-in placeholder refuses
  to start the bridge even after API compatibility is addressed.

Source-review conclusions, installed method availability, offline diagnostics and
host observations are distinct evidence categories throughout this review.

## Capability comparison

Source links: [Beat Twin controller](https://github.com/LaurentHuzard/beat-twin/blob/802e4a400d4018e44dea39d08920125d4d2441ae/bitwig-controller/BeatTwin/BeatTwin.control.js),
[Control Deck controller](https://github.com/remymazmanian/bitwig-control-deck/blob/2043a61b9e9c77cafa85fd7360e5c7e22f869220/controller/ControlDeck.control.js).
Line references below refer to these exact commits.

| Capability | Beat Twin implementation | Control Deck implementation | Installed 4.3.10 API / live boundary |
| --- | --- | --- | --- |
| Tracks and bank coverage | `createMainTrackBank(8,8,8)`; `track.list` reports positions and eight slots. Bank scroll methods exist, with settling guards. Lines 207–244, 749–805, 2221–2240. | `createMainTrackBank(128,0,8)`; reports total/returned/truncated, but no track-pagination export. Lines 222–246, 2389–2392. | `createTrackBank(...,true)` can include nested, FX and master entries. `Bank.itemCount`, `Scrollable.scrollPosition`, `getItemAt` exist. Minimal probe crossed offset 8. Main-track banks alone are not a complete set inventory. |
| Group hierarchy | No `createParentTrack`, group child-bank traversal or exported parent tree. | Type/name/position are exported, but no parent/group traversal. | `Track.isGroup`, `createParentTrack` (since 10), `createTrackBank(...,hasFlatTrackList)` exist. Raw parent proxies were observed, including group-master names and positions in different contexts; a clean hierarchy mapping is not yet verified. |
| Returns and master | Separate effect bank of eight and master proxy. Return list includes coverage; master-volume read exists. Lines 298–312, 1950–1966. No return-chain export or return-bank navigation tool found. | No separate effect/master bank. Main bank excludes those track kinds; selected-device reads are not an exhaustive return/master inventory. | Separate bank factories exist since 1. Whole-set probe was capped before reaching all returns/master. |
| Ordered chains and disabled devices | Eight devices per main-track slot; `device.list` returns name/index/enabled. No chain count, device pagination or truncation field in this result. Lines 243–254, 2576–2591. | 64-device cursor-track bank; name/type/position/enabled/plugin/nested/preset/sample fields; reports truncation. Lines 293–330, 2018–2024. | Device banks exist since 1; `deviceType` since 12. Probe retained **four disabled devices** among 15 top-level devices in the sampled tracks. It did not test a chain longer than eight. |
| Layers, slots, pads | Drum-pad names/mix states are implemented; no layer/slot device-tree traversal found. | Cursor-slot bank of 64, exposed through `selection_state`; no recursive walk over all slots/layers/pads. The `nest_device` operation moves devices and is excluded from inspection. Lines 320–330, 908–923, 1956–1964. | `createLayerBank` supports Layer/Selector devices; `getCursorSlot`, `slotNames`, `createDrumPadBank`, cursor `selectFirstInLayer/Slot` exist. Probe read two layer chains and duplicate `Audio Receiver` names without conflating their layer contexts. Deeper slot/selector/pad traversal remains untested. |
| Direct device parameters | Remote controls only; no direct-parameter ID/name/value observer use found. Page reads and selection are implemented. | ID/name/normalized/display observers for the selected device, with parameter-result pagination up to 200. Lines 390–397, 2079–2097, 2475–2496. | All four observer APIs are documented **since API 1** and present in the runtime. Successful native FX Layer reads prove this is usable on 4.3.10. `NaN` is documented for inaccessible numeric values; complete coverage for every native/third-party device remains unproven. |
| Send values and pre/post | Up to eight send levels per track. No verified destination edge, send mode/pre-fader capture or send pagination. Lines 233–240, 1935–1949. | Track bank has zero sends; no mixer-send export. Routing-like direct parameters on individual devices do not constitute track routing. | `Send.isPreFader` and `sendMode` exist since 10. Probe read labels, normalized/display levels and `AUTO`/effective pre-fader flags. A label/index is not a verified destination identity. |
| Inputs and outputs | No complete routing graph. | No complete routing graph. | `SourceSelector` exposes audio/note-input-selected flags, not the selected source identity. No general destination-enumeration getter was found in reviewed Track/Channel/SourceSelector interfaces. Targeted UI annotation remains necessary unless specific-device reads establish a route. |
| Modulation and sidechains | No assignment/amount graph. | No assignment/amount graph. | `ModulationSource` exposes name/isMapped/isMapping, not an assignment list with target IDs and amounts. Direct parameters may reveal individual settings; Grid internals/follower mappings are not proven readable. |
| Dependencies | No comprehensive plugin/sample/IR inventory. | Device preset/sample labels and a separate installed-plugin index exist; neither proves project dependency use or licensing. | `sampleName`/`presetName` expose labels. File inventory and embedded state archive supply separate evidence; plugin identity/version and device association remain unresolved. |
| Settling and identity | Observation versions/flush cycles and bank synchronization guards exist. Navigation tools are gated under `mixer_write` / `device_write`, not default read policy. See `index.ts` 761–774, 1078–1095. | Serial request queue; track selection waits 140 ms; device identity checks retry 12 times at 80 ms, then wait 100 ms for direct reads. Lines 277–385. Cache clearing does not prove every parameter callback has arrived. | For a fixed set, bounded settling and binding checks are sufficient. Position is context-relative; names and name/position strings are not persistent IDs. The probe reports raw locations and two equal snapshots, not universal completeness. |

The local method references, descriptions and version constraints are in
[api-capabilities.json](evidence/api-capabilities.json). Source review found one further
Control Deck method absent from the installed interfaces: `InsertionPoint.insertCLAPDevice`
(line 804), called only by its CLAP insertion tool. This is a deferred tool-call blocker,
not the startup failure, and it is outside the inspection task.

## Reproduction and exact failures

The working directory is `/private/tmp/bitwig-set-inspection-20261004`. A filesystem-cloned
copy of the complete target bundle is `target-copy.bwtemplate`; its project hash matches
the original. Auto-backups were copied with the bundle but never substituted for the
target. AWB's dirty worktree was inspected and left untouched.

1. Reverify application version and SHA-256 using the paths above. Run
   `python3 collect-file-evidence.py` for the bounded file scan and archive CRC check.
2. Run `python3 catalog-installed-api.py` to reproduce the local interface/reference
   catalogue. `javap -classpath '/Applications/Bitwig Studio.app/Contents/Java/bitwig.jar'` was used
   to catalogue installed interfaces. The host base class `OBl.getHostApiVersion()`
   returns 17; its `loadAPI` rejects versions above 17. Evidence includes the exact
   [bytecode and error-string constant](evidence/host-base.verbose.javap.txt).
3. Run `node interface-probe.mjs`. This evaluates unchanged source with typed stand-ins
   from installed signatures. It checks method presence/arity on the exercised startup
   path, not API semantics, callback timing, language interop or successful host startup.
   [Recorded outcomes](evidence/interface-probe.json): Beat Twin reaches the end;
   Control Deck hits API 18; bypassing that diagnostic gate hits missing `Project.isModified`.
   Explicitly skipping that missing call reaches the token-refusal branch. Neither
   bypass modifies or validates a candidate controller in Bitwig.
4. The unchanged Control Deck script was placed in an investigation-only controller
   folder. Bitwig's script scan rejected it with the API-18 error before activation.
   See [the actual scan failure](evidence/control-deck-host-scan-failure.log).
5. The minimal probe was manually enabled in Bitwig. The first revision failed because
   direct display observation was registered before ID observation. Exact host message:
   `You need to either add an observer to the direct parameter ids or mark them as interested first`.
   [Failed revision](evidence/InspectionProbe-failed-direct-observer-order.control.js) and
   [host log](evidence/live-probe-startup-failure.log) are retained. Registering the ID
   observer first fixed it. This demonstrates why interface matching alone is insufficient.
6. [InspectionProbe.control.js](InspectionProbe.control.js) records a finite capture to
   the fixed temporary evidence path. It has zero MIDI ports, no network, playback,
   musical-state writes or UI selection. It waits two seconds, then compares snapshots
   every 500 ms with at most eight attempts. It reads two track windows, at most twelve
   devices per chain, eight sends/layers and sixteen selected direct parameters. It
changes only its own track-bank offset. It aborts when playback is observed active.
7. A separate [bounded loopback witness](beat-twin-live-read-probe.mjs) listened on
   `127.0.0.1:8889` for 45 seconds, with six fixed read RPCs ready and no mutation or
   navigation dispatch. No controller connected, so **zero RPCs were sent**. The receiver
   exited successfully and closed its listener. This is a connection/enablement gap,
   not evidence that Beat Twin's startup failed. See [its log](evidence/beat-twin-live-read.jsonl).

The investigation controller files were subsequently removed using an exact-file,
hash-checked manifest: five files and three new folders. Original controller extensions
were not written. The temporary TCP receiver exited with status 0. Bitwig controller
preferences were not edited; any manually added investigation controller entries should
be removed in Settings. Removal of a source file alone is not presented as proof that
Bitwig has disposed an already-loaded controller instance. Reinstall from the retained
sources only when repeating the bounded proof.

All three controller files pass Node syntax checks. The local file scan validated all
**42 embedded archive entries with zero CRC failures**. Actual host observations and
offline stand-in results have separate files. Willy subsequently confirmed the open set as the requested template instance. A hand-built fixture, UI comparison,
Beat Twin startup/RPC proof and the instance’s file path/hash remain unrecorded.

## Partial dependency evidence

The bundle contains **52 WAV files and nine `.bwimpulse` files**. The project's appended
ZIP archive is readable using Python's standard `zipfile`; it contains **29 `.vstpreset`
and 13 `.fxb` entries**. This does not associate those states with device instances or
establish their current use.

Sixteen distinct absolute plugin-path strings were found. Thirteen exact paths currently
exist; these three do not:

- `/Library/Audio/Plug-Ins/VST/ExSlAugustusLoopFxLoop Wave.vst`
- `/Library/Audio/Plug-Ins/VST3/ConvologyXT.vst3`
- `/Library/Audio/Plug-Ins/VST3/FabFilter Pro-Q 2.vst3`

These are absent **at the stored paths**, not proof that equivalent plugins are absent
from the machine. No replacements were made. File existence does not establish plugin
loadability, version, licence or an active route. Exact string offsets and file inventory
are retained in [target-partial.json](evidence/target-partial.json).

## Proposed output

[snapshot-schema-proposal.json](snapshot-schema-proposal.json) is a discussion proposal,
not an approved production contract. It separates source/capture provenance, capture-local
locators, ordered device children by layer/slot/pad, routing endpoints, parameter ID/name/
normalized/display/raw/unit fields, dependency evidence, limits/coverage and human annotations.

Every field carries an observation status and evidence. Actual `0`, `false` and `""`
remain values; unknown collections must not be encoded as a falsely complete empty list.
Disabled devices remain in chains. Parent/route endpoints stay unresolved until identity
is justified. Plugin-state filenames and direct parameter IDs are not invented global
device UUIDs. Human annotations should live separately and survive capture refresh;
reassociation across changed source hashes requires explicit mapping, especially with
duplicate names. An unchanged source can be compared after timestamps/run metadata are removed.

## Three bounded options

| Option | Work and footprint | Unsupported areas / maintenance | Assessment |
| --- | --- | --- | --- |
| Use unchanged | Beat Twin: prove startup and selected RPC reads on 4.3.10, provide its supported Node 26 runtime and local relay/MCP path. Control Deck: cannot load unchanged on this host. | Neither exports the full hierarchy/routing/parameter document. Beat Twin's default reads do not enable bank/device navigation; enabling broad write policies needs a restricted caller. Both bring a controller, protocol and maintenance surface beyond a one-shot export. | Useful for a bounded partial inventory, insufficient for the requested set documentation. |
| Adapt a candidate | Prefer borrowing Control Deck's direct-parameter approach or adapting Beat Twin's compatible read bridge. Restrict dispatch to inspection/navigation; remove unrelated initialization; add all-track/FX/master coverage, hierarchy traversal, device/send pagination, scoped caches and an exporter. Retain MIT notices for copied code. | A Control Deck fork also needs API selection and removal/gating of missing project/CLAP APIs. Significant traversal and route annotation work remains in either choice. Upstream generated-source/protocol changes create ongoing merge work. | Viable if an ongoing MCP bridge is desired; otherwise most of the adaptation is new inspection logic. |
| Small standalone inspector | One temporary controller script plus a local JSON/Markdown collector, using this proven older API surface. First slice: exhaust tracks and ordered chains, then layers/slots, then device parameters; log explicit gaps and merge manual route annotations. No MCP/dashboard/native helper needed. | General routing destinations, modulation assignments, Grid internals and plugin-private state remain gaps. Need a controlled fixture, bounded recursion, duplicate-safe locators and a documented settling rule. Own a small, host-version-specific surface. | **Recommended for the fixed-template, one-shot task.** Live evidence supports feasibility of the basic reads; complete extraction remains to be implemented only after discussion. |

Resolve inaccessible routes through targeted UI annotation first. Keep the existing
bounded file scan for dependencies/provenance; do not expand this into open-ended binary
reverse engineering. A newer Bitwig export remains a fallback, with no upgrade required
for this investigation.

## Discussion checkpoint

Willy has confirmed the open set as the mapping target and a template instance. Compare
the selected FX Layer values with the UI, decide whether further candidate/fixture proofs
serve this one-shot task, then choose the first implementation slice and
where snapshots/annotations should live. This report does not authorize a production
inspector, MCP registration, project save, SC importer or migration. The active AWB mixer,
SC bridge, MOTU routing and performance baseline were not changed by the investigation.
