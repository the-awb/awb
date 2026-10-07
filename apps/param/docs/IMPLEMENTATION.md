# Parameter GUI implementation status

7 October 2026. Work is isolated in `/private/tmp/awb-awparam-gui`, branch `codex/awparam-gui`, based on `5349779`. Shared `/Users/willy/awb` has unrelated dirty work and has not been edited or merged by this implementation. No active SC class library or engine binary is installed.

## Implemented

- `awParam_v2` preserves the mono effective output and adds a separate two-channel publication of current native base/current overall amount. No browser ramp reconstruction. Existing watch/getState semantics stay intact.
- Ordinary/registered route amount and curve setters retain metadata; pending edits reject until connected. Custom writers expose only explicitly declared control-rate fields/ranges. Producer-unknown labels remain honest.
- Core updates only the affected canonical config entry for target changes and emits `paramChanged` with its own `paramRevision`. Full snapshots/preset export remain available. ToolInstance's broad `configRevision` still changes only through its existing `updateState`; consumers of parameter gestures must use `paramRevision`/bridge revision. No framework classes are modified.
- Optional inspector Tool borrows parameters and resolves edits by binding epoch/key. It does not make each AWParam a Tool. Closing an inspector preserves borrowed DSP; parameter/owner closure invalidates the binding. Electron follows Chain/Rack attachment conventions; Qt ToolGUIContract is not applied to the web view.
- One sparse native read per local server per observer tick, shared across views; changed-field binary delivery at 8/15 Hz, explicit heartbeat, sequence/generation checks, bounded backpressure, no subscribers means no polling. Hidden/offscreen controls release observation. Raw history/audio capture is unchanged.
- Reusable React SVG knob and shared-panel Canvas alternative, signed amount overflow cue, separate source/global controls, keyboard/numeric editing and source-panel focus return. Observation updates primitives without whole-panel React rerenders. Numeric strings and SVG attributes are deduplicated. Local commands coalesce at 16 ms.
- A source process callback is available for a parent Tool's NodeManager integration. Standalone process navigation is not wired; it shows the ID with a disabled button. Route presets/source graph editing are not added.

## Verified

- Native addons built in this worktree; the control reader also passed its shared-memory fixture directly inside Electron. Only Node addons/renderer bundles compiled; installed SC engines/interpreter unchanged.
- Shell unit suite: **75 passed**, including existing signal capture/audio access/runtime contracts. No unrelated Tool opened.
- Focused Node/model/broker/runtime/native-fixture tests: **11 passed**. Native fixture uses genuine shared memory without an audio engine to verify sparse copies, allocation bounds, detached handles and retained-array lifetime.
- Synthetic visible Electron browser test: **16 checks passed**. Actual SVG geometry and Canvas screenshot pixels advance; keyboard/focus, hidden/offscreen lease release and unavailable-value display checked. This is browser integration using synthetic data, not actual SC GUI qualification.
- Private SC class path: existing Core/registry contract tests, OSC protocol tests and offline audio/select/tail render checks pass. New parameter GUI contract: **17 checks passed**, including mono output compatibility, route/custom-writer validation, borrowed inspector lifecycle, owner identity and preserving an existing language watch.
- The earlier direct-native feasibility probe ran 128 independent AWParams / 384 values at 8/15 Hz on both installed scsynth and supernova. No periodic parameter replies were enabled. Its original test changed output allocation shape; this production branch instead preserves mono output and adds separate observations.

Local evidence (raw failures retained alongside later successful runs):

- `/private/tmp/param-shell-unit.log`
- `/private/tmp/param-node-finished.log`
- `/private/tmp/awb-param-core-tests-complete/` and `/private/tmp/param-core-complete.log`
- `/private/tmp/awb-param-browser/results.json`, `svg.png`, `canvas.png`
- `/private/tmp/awb-param-shm-probe-20261007/summary.json` (precursor only)

## Costs: known and still unmeasured

Changed-field wire payload is **12 bytes per batch header + 8 bytes per changed scalar** (index + Float32). These are calculations, excluding WebSocket/TCP overhead:

| 128 independent parameters, 15 Hz | Payload |
|---|---:|
| only effective output changes | 15,540 bytes/s |
| all base, amount and output fields change | 46,260 bytes/s |
| everything static, after initial values | 0 value-payload bytes/s |
| native read/copy of all three fields | 23,040 sample bytes/s internally |

Static output still costs the sparse native read/compare; changed-only delivery is not zero-cost acquisition. Heartbeat remains a separate rare metadata message. Native reads are not a transactional snapshot across bus values and the UI is not an audio-rate consumer.

The precursor read/allocate/copy median was about 13–14 microseconds for 384 values; it ran alongside an explicitly authorized non-sensitive session. It is not a controlled whole-GUI cost result and does not measure rendering, process wakeups or audio deadline headroom. This branch's extra two-channel publication and complete observer/renderer costs must be measured directly before performance claims.

## Outstanding gates

Another agent currently holds `/private/tmp/awb-audio-hardware-test.lock` for Supernova functional qualification. The live harness attempted reservation and stopped before launching an engine. Leave that reservation intact.

1. Run `python3 apps/param/test/run-live.py` against installed scsynth and supernova in a private class path with the audio slot reserved. Verify real command/route/ramp/source closure and browser output end to end; preserve system device/rate.
2. Measure 16/32/128 independent parameters at 8/15 Hz, stopped observation, feed-only, SVG, Canvas and opacity. Hold dimensions/DPR/visibility fixed, repeat/interleave phases and include all owned Electron/helper + language/engine CPU. Verify pixels/value advancement and cleanup. Separately label fan-out, source-panel and automation phases. No winner has been selected.
3. Run the existing combined audio deadline/headroom qualification when reserved; no new full DSP sweep required.
4. Review/install/merge only after these gates as appropriate. No production installation or merge performed by this slice.

Vault and Telegram connectors are unavailable in this tool session, so no vault mirror or Telegram notification has been sent.
