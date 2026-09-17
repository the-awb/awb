# `@awb/sc-envelope`

A host-neutral, JSON-safe definition of SuperCollider `Env` data. It exists so editors, browser
executors and desktop projections can agree on one envelope before deciding how that envelope is
used.

```js
import { normalizeScEnv, scEnvAsArray, scEnvValueAt } from '@awb/sc-envelope';

const envelope = normalizeScEnv( {
  levels: [ 0, 1, 0.25, 0 ],
  times: [ 0.1, 0.2, 0.3 ],
  curves: [ 'lin', 'sin', -4 ],
  releaseNode: 2
} );
```

The canonical `sc.env/1` object contains fully expanded `levels`, `times` and per-segment
`curves`, plus `releaseNode`, `loopNode` and `offset`. Normalization mirrors `Env.new`: short time
and curve arrays wrap to the required segment count, familiar aliases such as `linear`, `sine`
and `welch` become stable short names, and numeric curvature remains numeric.

`scEnvAsArray()` reproduces `Env#asArray`, including SC's curve shape numbers and `-99` sentinel
for absent release/loop nodes. `scEnvFromArray()` reverses that representation.
`scEnvAsControlArray()` pads that serialization to a SynthDef's fixed maximum segment count;
the active stage count stays in the Env header and the unused tail is inert. Its inverse,
`scEnvFromControlArray()`, reads only the active stages. `scEnvValueAt()`
matches `Env#at` for the fixed segment sequence and all nine curve forms; it deliberately does not
simulate an `EnvGen` gate, release loop, control-rate stepping or done action.

## Boundary

This package defines an envelope value, not its use:

- an `Env` embedded as a pattern stream produces sampled values over pattern time;
- an `Env` stored in an Event is converted by sclang to `Env#asArray` when sent to a matching
  SynthDef array control;
- a fixed envelope baked into a SynthDef is instrument implementation rather than authored data.

Those are separate adapters over the same definition. This package does not choose between them,
does not mutate score payloads, and does not claim that an envelope controls amplitude or node
lifetime. `doneAction`, `timeScale`, `levelScale`, `levelBias` and Event duration resolution belong
to the consuming EnvGen/runtime contract.

V1 is deliberately single-channel and finite-valued. SuperCollider multichannel envelope
expansion and UGen-valued construction are runtime graph features, not JSON authoring values.

The tests pin arrays and curve samples captured from SuperCollider 3.12.2. Run `npm test` here.
