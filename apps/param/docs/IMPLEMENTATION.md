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

The 7 October live attempt stopped before launch because another agent held the hardware reservation. On 8 October the lock was absent but the user had an active IDE/server session. Recheck both reservations and active engine ownership before running the pending live gates.

1. Run `python3 apps/param/test/run-live.py` against installed scsynth and supernova in a private class path with the audio slot reserved. Verify real command/route/ramp/source closure and browser output end to end; preserve system device/rate.
2. Measure 16/32/128 independent parameters at 8/15 Hz, stopped observation, feed-only, SVG, Canvas and opacity. Hold dimensions/DPR/visibility fixed, repeat/interleave phases and include all owned Electron/helper + language/engine CPU. Verify pixels/value advancement and cleanup. Separately label fan-out, source-panel and automation phases. No winner has been selected.
3. Run the existing combined audio deadline/headroom qualification when reserved; no new full DSP sweep required.
4. Live class-library installation and live qualification remain separate gates. Repository integration is recorded below.

Vault and Telegram connectors are unavailable in this tool session, so no vault mirror or Telegram notification has been sent.

## Shared checkout integration — 7 October 2026

AWParam `da72790` and the composite live surface are now merged into `/Users/willy/awb` on `integration/bw-sc` (`411b64d`). Parameter, rack and composite renderer bundles and both native bus-reader addons were rebuilt there. This supersedes the original isolated-checkout status above. Existing local work is preserved. No installed SC engine/interpreter or class-path configuration was changed; the live audio/GUI qualification gates above remain pending.

## Display and polarity revision — 8 October 2026

The outer green ring is a read-only effective-output display using existing observation index 2. Overall amount is a blue/orange radial marker with a 4 CSS pixel stroke in both SVG and Canvas; signed depth above ±1 retains the overflow cue and full numeric ±8 editing. The marker can be dragged independently. A zero-output tick remains visible. The consumed renderer bundle was rebuilt in this isolated worktree.

Verification: five model tests and 26 synthetic Electron browser checks pass, including exact output-ring placement independent of base/amount, read-only ring gestures, marker dragging, keyboard/focus, rendered-pixel advancement, lease release and unavailable values. No additional sample acquisition is introduced. These are synthetic tests, not live audio qualification or cost measurements.

AWParam now owns normalized polarity, explicit-spec ownership, `setPolarity`, `setNormalized`, `normalizedValue` and `nativeValue`. Bare controls use the selected normalized multiplier range directly. Switching a bare negative control to unipolar clamps its base target to zero and ends its base ramp; explicitly specified native ranges and active ramps remain intact. Core presets retain and reconstruct polarity/spec ownership, validate the entire list before applying changes, and notify only the affected entry. Inspector metadata carries polarity/range/spec ownership once per change; the sparse three-field recurring feed is unchanged.

Final checks: **14 focused Node tests**, **30 SC parameter/inspector contract checks**, **41 offline rendered DSP checks**, existing Core/registry/OSC/select/tail regressions and **75 shell unit tests** pass. DSP checks verify positive-value preservation, negative bipolar output and zero clamping in actual offline scsynth rendering. Language serialization and localhost OSC tests verify the new metadata positions and authoritative polarity updates. Canvas tests inspect actual rendered pixels for centered bipolar zero and the unipolar endpoint.

Evidence:

- `/private/tmp/awb-param-polarity-core-verified-20261008/` and `/private/tmp/awb-param-polarity-core-verified.log`
- `/private/tmp/awb-param-polarity-node-final.log`
- `/private/tmp/awb-param-polarity-shell.log`
- `/private/tmp/awb-param-browser/results.json`, `svg.png`, `canvas.png`

The reservation directory was absent on 8 October, but an existing IDE/language PID54989 and scsynth PID58259 on port57110 were active. They were left untouched. No live engine was launched by this revision. The two-engine live harness now includes polarity and negative readback checks, but remains **unrun**, as do controlled GUI cost and audio headroom comparisons. No shared checkout, live class library or SC executable has been modified.


## Polarity integration — 8 October 2026

The display/polarity revision (`5802244`) is integrated with `integration/bw-sc` starting at `8394e6e`, through a clean worktree. Named bindings, borrowed delay views and compact knobs from the integration branch are retained. Compact controls expose polarity inside their Sources popup, keeping the tape layout intact. Polarity changes wait for authoritative owner metadata in both standalone and embedded interfaces.

Merged validation passes **104 top-level Node tests** across parameter, live-set and shell services, **26 inspector browser checks**, **21 embedded delay browser checks**, **30 SC parameter/inspector contracts**, **41 offline DSP assertions**, and the existing Core/registration/OSC/select/tail checks. Parameter and live-set renderer builds and native-reader compilation pass. Evidence: `/private/tmp/awb-param-integration-focused-final.log`, `/private/tmp/awb-param-merged-core-20261008/`, `/private/tmp/awb-param-browser/results.json`, and `/private/tmp/awb-delay-param-gui/`.

The first broad command included seven unrelated shell Electron tests, which failed on the clean worktree's missing `dist/render-worker/index.html`. A recursive follow-up also picked up four archived benchmark copies with stale relative paths. These runs are retained in `/private/tmp/awb-param-integration-node.log` and `/private/tmp/awb-param-integration-focused.log`; neither is counted as a passing full suite. The final top-level service suite excludes those unrelated Electron and archived tests. No hardware or live engine qualification is claimed.

Shared local edits are preserved separately from this merge. Consumed parameter/live-set bundles are rebuilt after integration. Active SC processes and class-path configuration are left untouched; using the new language methods requires loading the updated classes in a suitable language instance. Vault/Telegram MCP tools remain unavailable.


### Shared-checkout verification

Merge commit `67594eb` is on `integration/bw-sc` in `/Users/willy/awb`. Parameter and live-set bundles were rebuilt from the merged sources plus preserved local edits. All **30 shared-checkout parameter/live-set Node tests**, **26 inspector browser checks** and **21 embedded browser checks** pass. Logs: `/private/tmp/awb-param-shared-integration-tests.log`, `/private/tmp/awb-param-shared-browser-serial.log`, and `/private/tmp/awb-param-shared-delay-browser-final.log`.

Two concurrent browser runs timed out; separate runs passed the inspector. One separate embedded run timed out at the synthetic numeric amount edit after successfully verifying polarity; a diagnostic run and an unchanged separate rerun both passed all 21 checks. These intermittent browser timeouts remain visible in the retained logs. Follow-up: stabilize the synthetic focus/input checks before treating them as an unattended CI gate. No product change or rollback of local UI work was made to obtain the passing rerun.

Preservation was checked before and after builds: 46 unrelated dirty tracked files remain byte-identical, three overlapping local edits are carried forward, all 380 original untracked paths remain, and the index contains no local edits. Backup and verification manifest: `/private/tmp/awb-param-merge-preservation/`. Pre-existing sclang PID54989 and scsynth PID58259 were confirmed still running. No live class-library reload, engine installation, hardware or GUI cost qualification was performed.


## Polarity-bounded amount and larger handles — 8 October 2026

Overall amount is enforced in AWParam and the command bridge: unipolar 0…1, bipolar −1…1. Selecting unipolar clamps a negative amount target to zero; DSP clips the current ramp to the selected domain. Valid amount ramps continue, and explicitly specified native base ranges/ramps remain unchanged. Presets validate amount against the incoming polarity before any mutation. Source-route gains keep their independent ±8 range; scope/audio transport and observation cadence are unchanged. Older overall amounts outside the new range must be adjusted, and negative amounts require bipolar polarity.

Both renderers map amount using the current polarity and clear stale gesture previews when that metadata arrives. The base radius is reduced from 31 to 26; the amount handle spans radii 30…43, with its 4 CSS pixel marker at 32…40. Sampled output moves to radius 46 and remains read-only. Compact embedded knobs consume the same component. Synthetic numeric tests now wait a display frame after entering a draft before sending Enter.

Validation: 28 parameter/live-set Node tests, 35 SC parameter/inspector checks, 43 rendered DSP assertions and the existing Core/registry/OSC/select/tail suite pass. 32 inspector and 21 embedded browser checks pass, covering polarity positions, bounded sliders, broad-band dragging, read-only output and compact source edits. Evidence: `/private/tmp/awb-param-amount-core-20261008/`, `/private/tmp/awb-param-amount-node.log`, `/private/tmp/awb-param-amount-browser.log`, `/private/tmp/awb-param-amount-delay-browser.log`. No live audio host or device was started or reset. The shell bundles are rebuilt for use; recompile the language and recreate parameter synths to use the updated DSP contract.

The integration branch advanced during this revision with live-set commit `04cf85c`. That commit is retained in the merge. Validation against the combined sources passes 31 parameter/live-set Node tests, 32 inspector checks, 21 embedded checks and the full Core offline suite. Combined evidence uses `/private/tmp/awb-param-amount-integrated-*.log` and `/private/tmp/awb-param-amount-integrated-core-20261008/`.
