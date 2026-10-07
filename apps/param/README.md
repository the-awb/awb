# AWParam GUI

Reusable React knob/panel plus a standalone Electron inspector. AWParam is still a plain SC class: embedding a knob creates no ToolInstance. One optional `param` inspector Tool borrows one or many parameters and closes independently of their DSP.

The shell shares one native reader per local server between inspector views. It reads sparse current control values at 8/15 Hz (default 15), then sends changed fields in binary batches. Base, overall amount and effective output are measured; the browser does not reconstruct ramps. No ScopeOut tap or periodic AWParam reply is enabled. Existing `watch/getState` clients retain their settings.

## Build and use

Use Node 22. Build separately from launch:

```sh
npm run build:sc-bus --workspace @awb/desktop-shell
npm run build --workspace @awb/param
npm start --workspace @awb/desktop-shell
```

Add `apps/core/sc/classes` and `apps/param/sc/classes` alongside the existing Tool framework to a **private** sclang configuration. The isolated regression harness creates a suitable class path without installing anything:

```sh
python3 apps/core/sc/test/run.py --output /private/tmp/awb-param-classes
/Applications/SuperCollider.app/Contents/MacOS/sclang -l /private/tmp/awb-param-classes/sclang_conf.yaml
```

Open [the demo](sc/examples/demo.scd) in that language instance and evaluate its first block. It uses the default system device/rate. Pass `(shellRoot:"/absolute/path/to/this/checkout")` to `core.paramGUI` or `param.gui` when working outside `~/awb`. Build the checkout named by `shellRoot`.

```supercollider
// An existing owner and its named parameters:
view = core.paramGUI([\frequency, \gain], (shellRoot:"/path/to/awb"));
// Convenience uses the param's owning Tool identity when it has one:
view = param.gui((shellRoot:"/path/to/awb"));
view.close; // releases the inspector; param remains alive
```

Toolkit Home's Parameter Inspector entry opens an unbound window with instructions; it does not manufacture or boot a parameter engine. A bound window is opened by the language examples above. Restart a shell to pick up its catalog/build changes.

## Embed in an existing GUI

Import `AWParamKnob` / `AWParamPanel` from `src/widgets.jsx` and `createStore` from `src/model.mjs`. Supply one store per bound parameter and your parent Tool's validated `edit(id,field,value,source)` callback. Put metadata changes through `store.patch(...)` and actual `[base,amount,effective]` observations through `store.observe(...)`. This separates React configuration/focus work from imperative primitive updates. The standalone app in `src/main.jsx` is a concrete connection example.

Use `renderer="svg"` or `renderer="canvas"`. Canvas uses one panel surface and retains DOM keyboard/numeric controls. Both share mapping/geometry/state; `onProcess({paramID,producer,node})` optionally connects source rows to the parent Tool's NodeManager navigation. Standalone navigation is not wired; the disabled process button still shows the truthful ID.

`setModulationAmount/Curve` edit ordinary and registered routes consistently. Pending routes reject edits until validation completes. Custom writers are read-only unless the creator calls `declareModulationWriterControls(id,[...])` with valid control-rate fields/ranges. GUI edits cannot change a writer's assigned output.

The signed amount ring saturates at ±1 for legibility; numeric amount retains the full ±8 range and an overflow dot marks larger depth. White follows current base, blue/orange current signed amount, green spans current base to effective output. Drag the central knob for base, or the outer ring for amount. Local drag/key edits paint on the next frame; telemetry is slower. No smoothing transitions are added.

## Validation and limits

Run `npm test --workspace @awb/param`, `python3 apps/core/sc/test/run.py`, and the explicit Electron scripts in `test/`. The synthetic browser test does not boot audio. `python3 apps/param/test/run-live.py` prepares a frozen class path, reserves the shared lock and checks both installed engines. The inner `test/live.mjs` boots a private silent engine and requires the shared audio-test reservation; never run it alongside a sensitive test.

See [implementation status](docs/IMPLEMENTATION.md). Native transport is local/macOS and compiled against matching SC shared-memory headers. Copied float values are safe to retain in JS but are not an atomic, block-coherent multi-bus transaction. GUI observation is latest-value display telemetry, not a cross-server audio transport. No active class library, engine binary or shared checkout is installed/modified by this feature branch.
