# One-shot Bitwig set mapper

The scripts select API 15; the installed host reports maximum API 17.

The read-only capture of Willy's open `New 2*` instance of `awb 5.2 (ef script)` completed on 4 October 2026 in Bitwig 4.3.10. Start with [the capture overview](target-capture/overview.md), [the full map](target-capture/set-map.md), or [the JSON snapshot](target-capture/snapshot.json). [Capture review](capture-review.md) records exact coverage, runtime fixes and remaining gaps.

This documents a fixed template. The open instance's path/hash remains unknown; the source template hash is recorded separately. Positional locators identify this capture, not stable DAW object IDs. Human annotations remain in [annotations.json](annotations.json) and are never overwritten by the renderer.

## Captured evidence and source

- `AWBSetMapper.control.js`: paginated tracks, nested devices, sends, direct parameters and current remote controls; project/group main-track identity pass.
- `AWBParameterPass.control.js`: targeted repair of initially unresolved parameter records, retaining the current host-observer cache when unchanged values do not emit new callbacks.
- `AWBHierarchyPass.control.js`: explicit group/root effect banks and root Master identity, joined to the first capture by `createEqualsValue()`.
- `AWBTrackStates.control.js`: activation, arm and monitoring state, root effect-bank order, and the exact FX Layer UUID matcher used by the existing OSC controller.
- `live-evidence/`: raw events, source snapshots for failed attempts, the audio-device error, and an explicitly incomplete checkpoint preserved during the run.
- `target-capture/provenance.json` and `artifact-manifest.json`: source evidence paths and hashes; comparable musical-content hash excludes incidental session metadata.

The one-shot sources share a controller identity so replacing only this inspection file reloads the next phase. No existing controller was changed. Each phase stops automatically on completion. The installed inspection file is removed after evidence is preserved.

## Reproduction

The dated output directory must exist. Keep the fixed target open and playback stopped. Install only the mapper into its separate `Controller Scripts/AWBSetMapper` folder and enable **AWB Investigation → One Shot Set Mapper** once. After the main `done` event, replace only that file with the parameter, track-state and hierarchy follow-up sources, waiting for each `done` event before proceeding. The scratch `finish-passes.py` automates that sequential replacement with ownership checks; it does not launch Bitwig or change audio settings.

Render the retained completed evidence:

```sh
python3 render-capture.py live-evidence/live-capture.jsonl \
  --parameter-pass live-evidence/parameter-pass.jsonl \
  --track-states live-evidence/track-states.jsonl \
  --hierarchy-pass live-evidence/hierarchy-pass.jsonl \
  --annotations annotations.json --out target-capture
python3 summarize-target.py target-capture/snapshot.json \
  --references . --out target-capture
```

The renderer accepts the latest completed run only. It rejects incomplete/aborted latest runs, mismatched source runs or identities, conflicting observed parents, and changed mute/volume/pan between the main and track-state passes. Remove only the installed inspector after capture; preserve other controller files and project state.

## Observation boundaries

All proxies are created during `init()`. Banks contain eight items and are paginated. Navigation waits at least 450 ms and requires three equal reads, bounded by 12 attempts. The main reader clears direct-parameter caches on rebind, which loses unchanged callbacks; the required parameter follow-up preserves current ID/name/numeric observations across rebind. Changed fields receive callbacks; unchanged fields retain their values. Display strings are requested in groups of 64. Zero, false and empty values remain distinct from missing data.

These are asynchronous observations of an unchanged, stopped template. The passes do not establish an atomic snapshot or independent UI verification of every parameter. Playback, count changes or navigation timeouts abort the main/follow-up traversal. The capture reports 512-track, 256-device-chain, 128-layer/pad, 12-level, 4,096-device/parameter and 32-send limits.

Generic input/output destinations, verified send edges, modulation assignments/amounts, plugin versions and hidden plugin/Grid state remain gaps. An observed empty direct-parameter list is not proof that a plugin has no controls. Current remote pages, page names and eight controls are captured; other pages remain untraversed. Named slots that retain their parent are unresolved rather than claimed empty. Human routing annotations must state their source.

## Verification

The mock traversal fixture has 19 tracks and 24 devices, duplicate names, an eleven-device chain, nine layers, nested slots/pads, disabled devices, zero/empty/NaN values, missing callbacks and playback refusal. The persistent-cache reader also handles callbacks emitted only when values change. Eight renderer tests cover annotation preservation, latest-run refusal, musical hashes and supplement identity/coherence checks.

```sh
node --check AWBSetMapper.control.js
node test-mapper.mjs
node test-mapper.mjs AWBParameterPass.control.js
python3 test-render.py
node check-interface.mjs
```

Interface checks compare initialization calls with the installed 4.3.10 Java interfaces; they are not host execution. The fixture is explicitly mock evidence. Actual host results and the screenshot/OSC comparison are documented in [the reference cross-check](track-controller-crosscheck.md).
