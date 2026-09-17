# `@awb/synthdef-interface`

Builds a useful, inspectable control and behaviour model from arbitrary compiled SuperCollider
SynthDefs. The SynthDef in the current execution context is authoritative; this package contains
no registry of approved instrument names and no AWB-specific instrument implementations.

```js
import {
  parseSynthDef,
  buildSynthDefInterface,
  synthDefFingerprint
} from '@awb/synthdef-interface';

const file = parseSynthDef( await response.arrayBuffer() );
const model = buildSynthDefInterface( file.definitions[ 0 ], {
  specs: {
    freq: { min: 20, max: 20000, warp: 'exp', unit: 'Hz' }
  }
} );
```

The parser preserves the complete `.scsyndef` graph: constants, parameter values and names,
control rates and channel widths, UGens, special indices, connections, output rates and variants.
The interface builder then applies SuperCollider domain knowledge to that graph. Version 1 traces
controls to known oscillator, filter, output, pan and `EnvGen` inputs; reconstructs symbolic
envelope expressions; identifies gated envelopes and `doneAction`; and distinguishes an envelope
used as output gain from one driving oscillator phase or another functional input.

Every control-role conclusion retains structural evidence (`ugen`, `ugenIndex`, `inputIndex`), and
every envelope names its source `EnvGen`. Control names may be useful to a human but are not
treated as proof of function.

Each envelope also reports its honest editor capability. `envArray` means the EnvGen graph is fed
by one contiguous multichannel control in SC's serialized Env layout and identifies that control
and its maximum stage count. `parametric` means named scalar controls influence the compiled
envelope expression. `inspectOnly` means the shape is baked into the graph. Only `envArray`
authorises a general curve editor; the other categories must not be presented as though arbitrary
point changes can reach the running Synth.

## Controls and specs are the primary interface

Controls, defaults and rates come from the compiled SynthDef. Author-supplied `ControlSpec` data,
when the context makes it available, governs editor range, warp, step and units. Graph analysis
adds functionality and lifecycle meaning; it does not replace those declarations.

`.scsyndef` bytes do not reliably carry the complete `ControlSpec` object. A compilation or hosted
inspection adapter should therefore serialise specs while sclang still has its `SynthDesc`. A
binary without that sidecar remains valid and receives conservative generic controls plus whatever
the graph proves.

## Context boundary

- A standalone browser analyses the exact binaries installed or imported into that application.
- A hosted editor analyses descriptions from the desktop sclang/scsynth context.
- A score projects the definitions it references against the selected context's inventory.
- Same-named definitions are distinguished with `synthDefFingerprint()` over their exact bytes.

The included tests use the current Basic, Substrate, Substrate 2, Resobass2 and explicit Env-array
lab binaries as demanding fixtures. They are examples of arbitrary graphs, not hard-coded package
knowledge.

The UGen knowledge table is intentionally extensible. An unrecognised UGen remains present in the
graph and interface rather than receiving invented semantics.
