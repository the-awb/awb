# Score Studio SynthDef assets

These are host-owned compiled assets for standalone browser playback. They are the same
`.scsyndef` bytes consumed by desktop scsynth, generated from `field_modelling/basic_synthdefs.sc`
at commit `faa775e208b903683ec7f5a9d34825dc6ec2f730` and already checked against scsynth.wasm's runtime
UGen gate there.

They are not another instrument catalog. `@awb/instruments` owns serialisable vocabulary;
Score Studio owns where its browser host serves executable assets. Recompile and replace this
whole directory when the canonical SynthDef source changes—do not hand-edit binaries or allow the
manifest to describe different bytes.

`awbTestTone` and `awbSchedulerPulse` are test machinery, not authored instrument types. The
starter score uses `awbTestTone` deliberately: its 5 ms attack makes browser audio health visible
without misdiagnosing the musical instruments' 2–30 second attacks as silence.
