# Chain

`AWBChain : Tool` wraps an SC Group, its processing stages, controls and private
ports. Its React editor runs in the normal AWB Shell. AWBase,
DynamicTrackContainer and existing rack/follower ownership remain unchanged.

## Editable stages

A managed Chain uses `factory: \serial`. Every stage owns a Group and an output
bus. Moving it preserves that Group, bus, controls and processing state. Matching
ports borrow the predecessor's output directly; an explicit channel matrix
handles mixing, splitting or conversion. The Chain owns connection and execution
order. Its external output bus stays fixed, including when the Chain is empty
(input passes through to output).

Stages can contain one Synth, multiple Synths, owned subgroups and internal buses.
The editor manages the serial connections between these stages; internal parallel
routing belongs to the stage factory. Stage port sizes are declared when the
factory is registered, because SC SynthDef channel counts are fixed.

The panel supports insertion, removal, movement, replacement, live control edits
and per-input/output routing matrices. A width-changing edit presents both
boundaries for explicit mapping before it changes the live graph. Matrix rows are
destination channels; columns are source channels. Missing channels are silent
unless you explicitly route into them. Summed routes are not automatically
normalised or limited.

Structural changes reconnect and order the graph in one server bundle after new
nodes and held resources are ready. Replaced/removed groups are then freed and
owned buses recycled after server acknowledgement. These switches are immediate;
click suppression and tail retirement are the next policy decisions. Replacement
creates new processing state and stage output; movement retains the existing ones.

## Use

Add `apps/chain/sc/classes` to an isolated/WIP SC class path alongside the current
Tool framework, then recompile. The private test runner does this without
installing live classes. Build the consumed renderer with Node 22:

```sh
npm --prefix apps/chain run build
```

```supercollider
// In a Routine, after booting the selected server:
AWBChainFuzz.register(s);
s.sync;
~fuzzInstance = AWBChain.open(AWBChainFuzz.managedConfig, (
    server: s, input: inputBus, output: outputBus, target: processorGroup
));
~fuzz = ~fuzzInstance.tool;
~fuzz.whenReady({ ~fuzz.gui });
~fuzz.set('shape/drive', 12);
~fuzz.controlBinding('shape/drive')[\setter].value(6);
// The Fuzz example also provides aliases such as \drive.

~fuzz.insertStage((id: \extra, factory: \fuzzTone), 1);
~fuzz.whenSettled({
    ~fuzz.stageAt(\extra).set(\level, 0.5);
    ~fuzz.moveStage(\extra, 3);
});
// Wait for each edit before starting another, or use the GUI's busy state.
~fuzz.whenSettled({ ~fuzz.removeStage(\extra) });
~fuzzInstance.close;
```

Other operations: `reorder([\filter, \shape, \tone])`,
`replaceStage(\shape, (factory: \fuzzShape))`, and
`setRoute(\tone, [[0, 1], [1, 0]])`. `setRoute(\tone, nil)` returns to direct
connection when widths match. Structural methods accept an optional route patch;
use `\direct` to remove an old matrix in SC Events (which discard nil values).
For example, inserting a 4-channel stage between stereo stages requires a 4×2
matrix for its input and a 2×4 matrix for its successor. The GUI previews these.

Register an ordinary SC construction function with declared ports and controls:

```supercollider
SynthDef(\myGain, { |in=0, out=0, gain=1|
    Out.ar(out, In.ar(in, 2) * gain)
}).add;
AWBChain.registerStageFactory(\gain, (
    name: "Gain", inputWidth: 2, outputWidth: 2,
    controls: [(id: \gain, min: 0, max: 2, default: 1, step: 0.001)]
), { |stage|
    stage.addSynth(\process, \myGain,
        [\in, stage.input.index, \out, stage.output.index]);
    stage.bindInput(\process, \in); // runtime-settable input bus control
    stage.bind(\gain, \process, \gain);
});
```

For several internal nodes, use `stage.bus(width)` and
`stage.addGroup(id, target)`, pass owned groups as `addSynth` targets, bind only
the external input readers, and write the final signal to `stage.output`.
`stage.free` removes the stage through Chain routing. Use the Chain APIs for
structural edits rather than independently freeing its managed stage groups.

For asynchronous initialization, call `stage.holdReady` before loading and
`stage.releaseReady` on success, or `stage.chain.fail(error)` on failure.
Defaults and reconnection wait for held dependencies. `ownResource(object,
cleanup)` covers buffers and plugin controllers, including cancelled replacement
and Chain closure. Actual VST loading/mapping is not exercised here.

## Ownership, controls and persistence

External Chain ports must be private mono/stereo audio buses of the configured
width on the selected server; they remain the caller's property. Arrange audio
producers before the Chain and readers after it. There is no implicit hardware
or Master output. Internal stage ports support 1–32 channels; the managed graph
is bounded to 32 stages, 128 scalar controls and 4096 matrix coefficients.

`bindSetter` adapts other APIs. `controlBinding(id)` exposes the authoritative
setter/getter and target metadata for optional language-side/MIDI integration;
no Param wrapper is required. GUI writes are coalesced through the Shell's
bounded OSC bundle output and excluded from their own SC feedback; another view
still receives them. SC-origin value and topology edits update the panel.
React subscribes per control: a value edit leaves its parent and siblings alone.

Native ToolInstance/NodeManager ownership and settings promotion include the
edited stage order, routes and values. A promoted configuration can reconstruct
a new instance after its factories/SynthDefs are registered. Applying values to
an existing instance requires matching configuration. Presets do not serialize
executable functions; version factory IDs when changing construction or meaning.
`AWBChainFuzz.config` retains the original fixed-factory interface;
`managedConfig` enables editable stages.

A rack slot may lend its generation's ports/group to a Chain. The enclosing rack
still owns ingress gates, limiter, slot buses and generation tail retirement.
Freeing the parent Group closes the ToolInstance. Existing rack processors and
DTC Params are not automatically migrated.

## Verification

```sh
python3 apps/chain/sc/test/run.py --shell
```

Focused checks cover native lifecycle, graph validation/rollback, async readiness,
preset reconstruction, actual offline DSP after structural edits, real sclang
OSC acknowledgements and feedback, and both fixed and editable panels through
the normal Shell. The UI check includes channel previews, matrix editing and
per-control render counts. These are functional tests, not a hardware
CPU/dropout benchmark or a live class installation. Test evidence records source
hashes, logs, audio, transport results and panel screenshots.
