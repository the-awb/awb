# Field instrument runtime boundary

Field Modelling owns authored instrument configuration and Field-specific presentation. It does not
discover desktop synths, query scsynth or infer runtime ownership.

`App` accepts an `instrumentRuntime` projection from its composition root for externally owned
NodeManager entries:

```js
{
  externalNodes: [{
    entryID,
    synthDefName,
    ownership: 'external',
    active,
    controls,
    synthDefInterface,
    actions: { release, free, setControl }
  }],
  voices,
  isSounding(instrumentID),
  synthDefFor(synthDefName),
  command(entryID, action),
  setControl(entryID, controlName, value)
}
```

On desktop, the native-SC integration should construct this projection from NodeManager plus the
shared SynthDef-context analysis. On the web, a WASM adapter may construct the equivalent projection
from its local runtime. The Field application consumes the same shape in either case.

Authored Field instruments use a narrower path in a hosted desktop session. The shell creates one
named `fieldModelling:*` ToolSession and grants the renderer the bounded timeline instrument
protocol. The renderer sends semantic `start`, `set`, `pause`, `resume`, `release` and `free`
commands; sclang creates and owns the Synths, validates controls against `SynthDescLib`, and reports
their node IDs and lifecycle. Those synths are associated with the Field ToolSession and therefore
remain visible to NodeManager without making the browser a second node allocator.

This path remains available when the Field view is attached to a score. Score realizations are
observed as externally owned voices, while instruments authored in the Field document remain owned
by its separate `fieldModelling:*` ToolSession. They may therefore coexist deliberately. The UI and
runtime projection must keep those ownership classes distinct so that a score realization is never
respawned, released or drawn twice as though it were a Field-authored instrument.

Natural completion or an external free reconciles the authored instrument back to `Play`; it is
not silently respawned. A bridge disconnect does not make the same claim—the synth may still exist
in scsynth—so reconnect recovers the ToolSession state instead of changing authored play state.

Active externally-owned nodes whose SynthDefs have a declared `@awb/instruments` field mapping are
projected into the shared Field renderer. Owned nodes remain represented by the saved Field
instruments and `voicesRef`; appending them again would draw the same sound twice. Unknown SynthDefs
remain visible and controllable in the runtime list but are not assigned invented field physics.
Supplying `voices` also switches the live canvas out of analytic-preview mode; the desktop adapter
therefore owns the sounding set while the Field renderer continues to own the visual projection.

Ownership and available actions are mandatory host facts. They must not be inferred from node-ID
ranges, SynthDef names, the presence of a `gate` control or which renderer observed the node first.
The desktop adapter should use explicit ToolSession/NodeManager bindings.

The shared SynthDef interface describes real controls and graph evidence. `@awb/instruments` adds
curated practice meaning and the explicit acoustic projection. An arbitrary analysed SynthDef is
therefore inspectable and controllable, but it is not drawn in the Field unless a declared mapping
exists.

The desktop artifact intentionally contains no embedded sclang/JavaScript console, WASM manifest
loader, direct `/g_queryTree` client or browser-owned server lifecycle. Those belong to the runtime
adapter or, for authoring, native SuperCollider tooling. Standalone analytic Field mode remains
usable without SuperCollider; choosing either native profile is an explicit request for the
attached IDE or shell-owned headless sclang/scsynth path.
