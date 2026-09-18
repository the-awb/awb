# @awb/sc-runtime

Host-neutral playback-readiness semantics for SuperCollider runtimes.

This package does not boot or probe an engine. Browser/WASM and desktop/sclang hosts retain their
different handshakes and report the evidence they have into `createPlaybackReadiness()`.

The normalized report separates:

- engine lifecycle: `offline`, `booting`, `ready`, `failed`;
- browser audio state: `unknown`, `suspended`, `running`, `notApplicable`;
- selected score installation: `notLoaded`, `ready`;
- required definitions: `unknown`, `loading`, `ready`, `missing`, `failed`.

It derives `canPlay` and a user-facing blocking reason. It does not inspect Web Audio, send OSC,
load SynthDefs or claim that a physical output is audible.

## Engine-owned node registry

`createNodeRegistry()` is the minimal pushed lifecycle authority for JavaScript-owned SuperCollider
engines. It records live nodes, lightweight semantic containers and memberships; emits sequenced
start, transition, membership and terminal changes; and supplies a recovery snapshot. Score,
audition and other engine clients attach their own authored and realization identity to each record.

Desktop sclang does not run this registry beside NodeManager. NodeManager is the enriched desktop
implementation of the same fundamental pattern and remains authoritative there. The JS registry's
containers are only stable semantic scopes for cross-tool discovery and control. It deliberately
has no NodeManager GUI model, language-object inspection, tool catalogue or attempt to discover
nodes it did not create. Several tools share it only when their browser host injects the same
registry instance; separate windows/processes still require a host broker.

Application host contracts should expose the stable registry they own rather than letting each
tool construct one privately. Score Studio calls this host seam `engineNodeRegistry()`. The method
name belongs to the application contract, not this package; the registry itself remains independent
of React, Electron and any particular tool.
