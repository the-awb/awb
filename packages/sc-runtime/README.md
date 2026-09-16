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
