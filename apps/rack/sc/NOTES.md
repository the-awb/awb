# Send rack implementation notes — 2026-10-03

The user's routing discussion, build instruction and Tool-base correction are the implementation authorization. [../docs/SC_RACK_SPEC.md](../docs/SC_RACK_SPEC.md) records the agreed first pass.

- [x] Real `Tool` base, registered `ToolDefinition`, actual `ToolInstance`, NodeManager ownership/projection and cleanup.
- [x] Persistent private input buses, sounding-signal taps, channel faders/mute/solo.
- [x] Stable semantic FX destinations and reserved dynamic slots.
- [x] Processor groups, gated replacement, old-tail returns, bounded retirement, optional return/master limiters.
- [x] Fixed/spare followers with stable control output, reset on clear, explicit log/linear/sqrt curves.
- [x] Full and packed direct-voice wrappers; prepared variants; Event/pattern route; explicit bus overrides.
- [x] Existing SVG/canvas views and sparse/full local mix editor connected through one-way OSC and explicit Sync.
- [x] Actual framework tests, offline audio checks, real sclang OSC bridge, renderer checks and the normal Shell boundary.
- [ ] Hardware/live-set rehearsal and migration into the main checkouts.
- [ ] Audio recorder UI using the existing post-channel taps.
- [ ] Detailed native mix-command recording/replay and autonomous SC timed transitions.
- [ ] Generic Shell native-directory launch/discovery and embedded GUI-contract support.
- [ ] Explicit FX-to-FX graph/order/feedback design for the eventual full live routing matrix.

No live class installation, Bitwig extension change or shared-main merge has been performed. Existing comparison work and data remain in place. Vault and Telegram tools were not attached, so the external project note and notifications could not be updated through those tools.

Final verification: 47 native contracts, 26 Node tests, 88 audio assertions, both renderers and the ordinary Shell passed. [Results](test/test_results.md).

## ToolInstance refactor adaptation — 4 October 2026

The native rack now uses `instance.instanceID`, `toolInstanceID` and `--tool-instance`
through its OSC binding, GUI launch and readiness report. The isolated framework
manifest uses the renamed ToolInstance controls/record codec and removes ToolSession.
The adapted rack passed 47 SC contracts, 88 offline audio assertions and 26 Node tests
against the exact `a2f3a80` framework sources. Evidence:
`/private/tmp/awb-native-tool-instance-validation-20261004`. Post-merge renderer and ordinary Shell GUI gates also passed, including exact
ToolInstance/owner identity, both renderers, native import/export and sparse recall
with explicit Sync. These GUI tests use real sclang with stubbed server dispatch. No hardware audio or live class installation
was performed. The paired shell refactor is `0c200e6`.
