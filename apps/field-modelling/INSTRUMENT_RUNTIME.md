# Field instrument runtime boundary

Field Modelling owns authored instrument configuration and Field-specific presentation. It does not
discover desktop synths, query scsynth or infer runtime ownership.

`App` accepts an `instrumentRuntime` projection from its composition root:

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
adapter or, for authoring, native SuperCollider tooling.
