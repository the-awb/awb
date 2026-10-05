# Rack Instruments preparation — 4 October 2026

## Current checkpoint — 5 October 2026

The historical preparation below is superseded by the [native bridge/Xcode
results](rack-motu-native-bridge-and-xcode.md) and [corrected eight-channel,
32-send results](rack-motu-sends32-bridge.md). Xcode narrowed the overrun wall:
long DSP callbacks spent almost all their time assigned to a CPU; the hardware
cause remains unresolved. Dense GUI-origin traffic overflowed the UDP receiver.

Outgoing OSC batching is now implemented by default in the shared Shell sender
and Rack runtime: a 2 ms collection window, immediate bundles bounded at 1,200
bytes, preserved command order, bounded queues and drained shutdown. Existing
16 ms rack coalescing remains. Validation passes 75 Shell and 29 Rack checks,
including actual sclang reception and the 296-command/21-packet boundary test.
The shutdown logger also tolerates a closed launcher pipe (EPIPE).

Next: compare the previous and batched 8-channel/32-send heavy transport with
actual sclang classes and stubbed audio dispatch, while Bitwig work continues.
This is a transport-correctness gate; CPU/audio performance awaits a quiet window.
SC's repeated per-send gain-vector writes and transition step scheduling remain
separate follow-ups. The user's live class configuration remains unchanged.

## Historical preparation

Step 0 remains finding the unexplained audio overrun wall with Xcode tools. No new MOTU load measurements have been made during this preparation. This checkpoint commits the Instruments wrapper and runbook; it depends on the existing rack/scope benchmark work in this working checkout, checkpointed on `integration/bw-sc` at `94c4265`. Willy has another agent working on Bitwig set inspection; its work can continue while the load tests wait for a quiet window.

## Ready and verified

- Xcode at `/Applications/Xcode.app` can record and export System Trace and Audio System Trace through `xctrace`. Commands use a local `DEVELOPER_DIR`, without changing global developer settings.
- System Trace exposes scheduler/context-switch and thread-state tables. Audio System Trace exposes audio HAL client/hardware I/O cycle tables as well as scheduler tables. Short capability captures establish tool availability, not the completeness of future SC-specific data.
- The new `test/signal-bench/dropout/instruments-run.mjs` wraps the existing matched refresh benchmark in a disposable fixture. Prepare-only is the default; measured runs require both `--run` and `--quiet-window`. The flag records operator acknowledgement; it does not prove that the machine is idle.
- Phase capture waits for the actual Darwin tracing-started notification. Native `AWBPhase` signposts bracket each measurement. Automatic XML export validates marker identity, PID, clock-offset consistency and callback audit coverage. Callback mach timestamps can then be mapped to Instruments time with a recorded interval of uncertainty. Wall-clock timestamps are not used for fault alignment.
- The capture window is explicitly set to phase duration plus 60 seconds. The default System Trace template retained only a rolling five-second window, which would have lost the beginning of longer phases.
- No renderer/store/control-rate optimisation is included. The same phase hooks are used in `off` mode for an untraced comparator. Trace startup, shutdown and XML export sit outside the original timed CPU interval; profiler cost during recording still contributes to machine load.

## Functional preflight, separate from performance

An isolated copy of the native rack at `/private/tmp/awb-rack-integration-ready-20261004/apps/rack` passed 47 SC contracts, 88 offline audio assertions and 26 Node tests, including its real sclang OSC bridge test. Evidence is in `/private/tmp/awb-rack-functional-preflight-20261004/test/`. SC audio was rendered offline; no hardware device or live class library was changed.

The native rack is now integrated into `apps/rack`, with SC-originated changed-control
feedback coalesced at 33 ms. Revision-fenced writes prevent stale GUI commands from
overwriting an SC edit. Processor changes and missed batches resync; GUI echoes do
not interrupt recalls or loop back to SC. The integrated verification passes 47 SC
contracts, 88 offline audio assertions, 28 Node tests, both actual GUI renderers
and the normal Shell gate. Both renderers update SC-originated values with zero
React app/rack renders. Evidence is in `/private/tmp/awb-rack-feedback-shared-20261004`.
The GUI/OSC tests use stubbed server dispatch; DSP correctness is verified separately
by real offline audio. Integrated live bridge cost remains unmeasured until the
quiet-window stage. The user's installed language class paths remain unchanged.

## Quiet-window measurement protocol

Agree the window with Willy. Pause the other agent's builds/tests, downloads, archive extraction and other intentional heavy work. Bitwig's audio engine and unrelated SC hosts should be stopped by their owners. Keep the test window visible and do not switch apps or resize it. Necessary OS processes remain running and are included in the trace; do not call this a perfectly idle machine.

Start close to the previously observed limit: 60 synthetic load nodes, all 354 rack controls changing at the existing 32 ms cadence, with 15/30 Hz display coalescing. Do not resweep the full load range. First run an untraced comparator, then System Trace at the same graph/conditions; reverse order on a later paired pass if capture overhead or drift matters. Include idle, SVG and Canvas2D conditions. Use 56 nodes only if 60 is too unstable to distinguish causes. Use Audio System Trace for selected reproducible faulty/clean conditions after the initial scheduler comparison.

Keep existing 48 kHz / 512 hardware frame / 64 SC block settings and MOTU pilot output 2 → returned input 6. Preserve the existing MOTU routing. The runner verifies clean pilot capture plus injected mute/phase faults, recorder continuity/loss, fixed window dimensions and exclusive benchmark-owned SC processes. A completed capture is accepted only with its protected-source checks and teardown. Failure evidence remains partial, not a valid completed cost result.

Prepare now, without launching SC or Electron:

```sh
cd /Users/willy/awb
env DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
 /Users/willy/.nvm/versions/node/v22.23.2/bin/node \
 apps/awb-shell/test/signal-bench/dropout/instruments-run.mjs \
 '--trace-mode=System Trace' --load-nodes=60 --seconds=45 --repeats=2 \
 --conditions=idle,svg-15,svg-30,canvas2d-15,canvas2d-30 --exclusive-sc \
 --output=/private/tmp/rack-trace-prepared-FRESH.json
```

During the agreed quiet window, use fresh paths for every run. The existing private audit/recorder binaries from `prepare.sh` must be present and their hashes recorded. Example System Trace run:

```sh
env -u ELECTRON_RUN_AS_NODE \
 PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH \
 DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
 AWB_AUDIO_AUDIT=/private/tmp/rack-system-FRESH.audit \
 AWB_AUDIO_AUDIT_LIBRARY=/private/tmp/awb-callback-audit.dylib \
 AWB_AUDIO_AUDIT_CHANNEL=2 AWB_PILOT_BUS=2 \
 AWB_LOOPBACK_RECORD=/private/tmp/rack-system-FRESH.input \
 node apps/awb-shell/test/signal-bench/dropout/instruments-run.mjs \
 --run --quiet-window '--trace-mode=System Trace' \
 --load-nodes=60 --seconds=45 --repeats=2 --exclusive-sc \
 --conditions=idle,svg-15,svg-30,canvas2d-15,canvas2d-30 \
 --output=/private/tmp/rack-system-FRESH.json
```

Use `--trace-mode=off` and different evidence paths for the untraced comparator. The hook defaults to off; `--run --quiet-window` still launches the real workload even when tracing is off. Prepare-only paths must not be reused for actual runs.

Each traced phase retains `.trace`, `.toc.xml`, `.signposts.xml`, `.phase.json`, logs and event metadata under `<output>.instruments/`. Read the phase's `clockAlignment` to convert callback mach timestamps into trace-relative nanoseconds. Inspect real pilot discontinuities alongside callback DSP duration, output delivery gaps, runnable-but-unscheduled intervals, preemption, coreaudiod/driver activity, WindowServer, Electron helpers, background work and I/O. Correlation alone does not establish a mechanism.

## Next boundaries

After the trace explains or narrows the wall, continue the agreed main stream: integrated SC bridge cost; mixer with 32 medium opacity controls, eight waveforms and both; realistic eight-channel routing; AWFollower internal-input work; then the first SC version of the Bitwig FX setup. The separate Bitwig investigator owns capability discovery and set documentation.

Two details await Willy's answer: whether the eight destinations include the explicit clean/Mast slot, and whether the AWFollower addition means an internal audio bus or another control/modulation input. Do not change the user's live follower class while either meaning is unresolved. Rendering CPU totals do not establish GPU utilisation, power or a universal safe SC load ceiling.
