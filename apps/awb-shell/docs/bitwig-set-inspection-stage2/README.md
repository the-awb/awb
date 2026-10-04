# One-shot Bitwig set mapper

Willy authorized the custom capture after the Stage 1 comparison on 4 October 2026.
The target is the open instance of `awb 5.2 (ef script)`. This is an investigation
of a fixed template; continuous feedback, project writes and SC migration are outside scope.

Status: implemented and tested offline. Actual Bitwig 4.3.10 capture pending controller
activation. The earlier Stage 1 probe is live evidence for a subset of these APIs;
it does not establish that this expanded controller has run successfully.

## Run the prepared capture

1. Keep the target open with playback stopped. Do not run an audio load-test concurrently.
2. In Settings → Controllers, add **AWB Investigation → One Shot Set Mapper**.
   The installed controller lives in its own `Controller Scripts/AWBSetMapper` folder.
3. The controller starts once and writes
   `/private/tmp/bitwig-set-mapper-20261004/capture.jsonl`.
   It displays a completion notification. Bank traversal may take several minutes.
4. Render the latest completed run:

   ```sh
   python3 render-capture.py /private/tmp/bitwig-set-mapper-20261004/capture.jsonl \
     --out ./target-capture --annotations ./annotations.json
   ```

5. Disable the inspection controller once capture completes. Remove only this mapper's
   controller file/folder after retaining its source and evidence. Do not alter other controllers.

The scratch output directory must exist and be writable before activation. The controller
has no MIDI ports, networking, services, musical parameter setters or project save calls.
Named track/device cursors are independent of editor selection; bank scrolling and cursor
pinning/navigation are the only API writes. This behavior still needs a live check.

## What the capture attempts

- Paginate the flat track bank, including groups, effect tracks and master where the host
  supplies them; retain type, order, volume, pan, mute, solo, input flags and sends.
- Paginate root chains, layer chains, drum-pad chains and named device slots recursively.
  Retain enabled and disabled devices; capture preset/sample labels and exposed direct parameters.
- Match project-root and group child tracks to the flat bank with `createEqualsValue()`.
  Names and cursor-relative positions do not establish parent identity.
- Write ordered evidence events and a final snapshot, then stop automatically.
- Render JSON, Markdown and provenance, without overwriting human annotation files.

Each locator is a position in this static capture, not a stable DAW object identifier.
The instance file path/hash is unknown. The original source template identity is documented
separately in Stage 1; it must not be assigned to the open instance.

## Observation and coverage limits

All proxies are created during `init()`. Traversal reuses banks of eight. Navigation waits
at least 450 ms and requires three equal reads; a maximum of 12 attempts bounds each wait.
Each parameter rebind clears callback caches. The ID observer is registered before the
display observer, as required by the actual 4.3.10 host. Display observations are paged in
groups of 64. Missing callbacks are unresolved; NaN numeric values are unavailable. Zero,
false and empty strings retain their values.

This is bounded cache settling for an unchanged, stopped template. It is not an atomic
snapshot, proof of callback causality or a claim of live-update support. The controller
aborts when playback starts, counted banks change or a navigation wait times out.

Hard limits are recorded in the capture: 512 tracks, 256 devices per chain, 128 layers,
128 pads, 12 nested levels, 4,096 inspected devices, 4,096 parameters per device and
32 sends per track. Exceeding a limit is explicit. Empty/inaccessible named slots that
retain the parent cursor are unresolved rather than recursively mistaken for the parent.

Generic input/output destinations, verified send edges, modulation assignment targets
and amounts, plugin versions and hidden plugin/Grid state remain gaps. The current remote-control
page, its eight controls and page names are captured alongside direct parameters;
remaining remote pages are untraversed. UI inspection
must supply the missing routing facts. Put those facts in `annotations.json` under `notes`,
keyed by a capture track ID or serialized device locator, with their human source stated.

## Checks

```sh
node --check AWBSetMapper.control.js
node test-mapper.mjs
python3 test-render.py
node check-interface.mjs
```

The mock fixture contains 19 tracks and 24 devices: duplicate names, long chains,
nine layers, nested slots, drum pads, disabled devices, zero/empty/NaN values,
missing callbacks and playback refusal. The renderer tests cover human annotation
preservation, ignoring an older success when the latest run is incomplete, and
comparable hashes that ignore session duration but detect musical changes.

`check-interface.mjs` checks initialization calls against the installed 4.3.10 Java
interfaces saved by Stage 1. It does not execute actual host observations. The fixture
report is explicitly a mock example and must never be presented as the target map.

## Screenshot and existing OSC-controller reference

[The cross-check](track-controller-crosscheck.md) records the supplied 65-track UI
reference and the installed OSC Controller for AWB configuration. It established the
24-send contract and the need to retain current remote controls; the mapper now
allocates 32 sends and captures those controls. No existing controller was changed.
