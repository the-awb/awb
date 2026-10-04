# Shared Loop demo

**2026-10-02 hosted update:** Shared Loop scopes now acquire feeds through the shell's shared
SC signal broker. This supersedes the per-instrument three-scope ownership/cadence described
below for ordinary shell launches. Legacy standalone/benchmark paths remain available.
Scopes now use selected-channel v5 packets and shared display profiles. See the
[current measured optimisation report](../../../apps/awb-shell/docs/scope-optimisation-costs.md).
See [current architecture, setup, reuse and validation](../../../apps/awb-shell/docs/shared-signal-engine.md).


A macOS / SuperCollider 3.12.2 demo of a normal mono loop Buffer, a custom C++ looper UGen, and a Node-hosted browser GUI. Recording and overdubbing update the actual SC Buffer. The UGen publishes min/max waveform summaries into a custom POSIX shared-memory region; a Node-API addon consumes those summaries. There is no SC fork and no waveform transfer over OSC.

## Run

Requires Node 22+, Xcode command-line tools, SuperCollider.app, and source headers matching the installed SC version. The artifact declares the `ws` dependency for binary scope delivery; use `npm ci` in a standalone copy. No global plugin installation is needed.

```sh
nvm use # if using nvm
npm ci
npm run build
npm start
```

Open http://127.0.0.1:8793. Press **Record**: one complete four-second pass is recorded, then playback begins. Change the test-tone frequency and press **Overdub** to add a layer. Set feedback below 1 to attenuate the previous layer during overdubbing. Set tone level to zero and feedback to zero to erase it in one pass. **Stop** pauses the read/write head; **Clear** zeros storage incrementally and resets the visual.

The source defaults to a test tone. **Mic / input 1** selects the first channel of SC's input device. Playback uses SC's default output device (on the validation machine this was BlackHole 16ch). Choose input/output devices using `SC_INPUT_DEVICE` / `SC_OUTPUT_DEVICE` if needed; macOS may request microphone access. The first recording pass is not monitored through the output.

```sh
SC_INPUT_DEVICE='Your input device' SC_OUTPUT_DEVICE='Your output device' npm start
LOOP_SECONDS=8 SC_PORT=57983 PORT=8793 npm start
SC_SOURCE=/path/to/supercollider NODE_HEADERS=/path/to/node/include/node npm run build
SC_APP=/Applications/SuperCollider.app npm start
```

Ctrl-C performs ordered shutdown: free synth, release shared region, free Buffer, quit this server, detach Node. An existing SC server on the selected port is rejected. The launcher creates a private class-library copy under `build/`, disables user startup loading in that copy, and excludes live extensions. It does not edit SuperCollider.app or the user's extension folders.

## Pieces

- `native/SharedLooper.cpp`: recording, playback, feedback overdub, incremental clear, waveform bin recomputation; async plugin commands create/free shared regions outside audio processing.
- `sc/SharedLooper.sc`: the sclang UGen class.
- `sc/demo.scd`: allocates the Buffer, creates the region, constructs the SynthDef and starts the synth.
- `native/shared.hpp`: versioned three-slot, single-producer/single-consumer shared protocol.
- `native/addon.cpp`: Node-API attach/read/detach. Returns JS-owned Float32Arrays, never shared pointers.
- `server.mjs`: isolated sclang process, OSC controls, shared-memory polling and HTTP/SSE looper transport and binary scope sockets.
- `public/`: canvas waveform, playhead and controls.

OSC invokes `/cmd loop_view_alloc ID` and `/cmd loop_view_free ID`; it does not carry waveform samples. Allocation runs in asynchronous stage 2; the registry is installed in real-time stage 3. A `/done` reply acknowledges readiness. Native reader attachment opens `/awbloop_ID` and validates format/generation. The GUI receives snapshots from Node via local SSE: the shared-memory boundary is SC → Node, not Node → browser.

## Validation

```sh
npm test
npm run test:live
```

Live checks run two server generations, with output muted. They exercise recording, accumulation, feedback erasure, stopping, clear, reader reattachment, duplicate-reader rejection and region release. `/b_getn` is used only by validation to independently inspect the actual Buffer; it is never the GUI data path.

## Verified on 2026-10-01

Built against the local SC 3.12.2 headers and exercised against SuperCollider.app 3.12.2. Two protocol tests and 28 live checks passed across two server generations on the same port. The shared waveform min/max was checked against the actual overdubbed Buffer. Normal shutdown acknowledged `/quit`, unlinked the shared region and exited the test process. The Node GUI HTTP controls and live SSE feed were exercised. The installed AWB shell artifact was also exercised through real Electron: Home launch, recording, shared waveform, overdub, stop and isolated shutdown passed. Its captured UI was visually inspected. Microphone input and audible output were not tested; live validation muted output.

## Demo boundaries

Mono, fixed loop duration 0.5–8 seconds, 512 min/max bins, about 30 publications/second. This implements a new looper, not a generic observer of an arbitrary existing looper. Only this UGen may edit its Buffer, and the host must free the UGen before freeing or reallocating that Buffer. It targets scsynth, not supernova.

Initial recording replaces the loop and automatically finishes after one pass. There is no variable-length capture, undo, crossfade at the loop boundary, persistence, stereo, or NodeManager integration. Audio is clipped to ±1 before storage; loop-boundary clicks are possible. Waveform updates may skip intermediate publications, intentionally. Freshness comes from sequence numbers; consumers cannot infer sample-clock timing from publication intervals.

Shared-region allocation and page initialization occur outside the audio callback. Publishing copies a fixed 4 KiB envelope. Changed bins are recomputed from stored samples, so shrinking peaks are reflected. Clear performs at most 4,096 sample writes per callback. This is a functional demonstration, not a benchmark or guarantee against audio dropouts under load.

One writer and one reader per region are enforced. A normally detached reader can reattach; a killed reader can leave its claim set. A forcibly killed SC server can leave an orphan region: POSIX shared memory persists until unlink. Each launch uses a fresh ID, and normal shutdown unlinks it. Crash recovery and multi-reader support remain open work. Do not unlink arbitrary regions belonging to other running sessions.

## AWB shell access

The installed instrument is **Toolkit Home → Shared Loop → Open looper**. It uses the shell's
active SC server and inherits its system/default audio configuration, including actual sample rate.
Start the shell headless host first, or prepare an attached IDE before boot with `sc/prepare-host.scd`.
Neither the runtime nor the preparation script boots a private server or changes audio settings.
The shell headless supervisor extends normal plugin discovery with this artifact's plugin path;
restart an older shell/owned host to pick it up. No automatic reboot of a live host is performed.

`sc/host.scd` allocates the Buffer through the language's allocator, loads
`build/awbSharedLoopV1.scsyndef`, and creates the looper synth on that server. The server's actual
sample rate determines Buffer frames and waveform timing. The Node runtime receives a trusted
shell host binding. Closing the view frees only its synth, Buffer, region and HTTP/reader service.
Shell quit releases the instrument before its owned host. No global extension installation or
live class-library recompile is required. The compiled-host path does not currently register the
SynthDef for language analysis or NodeManager; `SharedLooper.sc` is available for direct sclang use.

Shell `npm start --workspace @awb/desktop-shell` now launches without building. Run the root
`npm run build` explicitly after installation or workspace changes requiring compilation.
Scope HTML/JS/CSS edits need only reopening scope windows.

The standalone `npm start` path above remains a separate demo entry point. This artifact's
standalone script also leaves sample rate at the SC default; the original standalone demo checkout
is unchanged. See `apps/awb-shell/README.md` in AWB for shell launch and validation commands.

Current shared-host validation (2026-10-01): 50 shell unit tests, Electron Home and the shared-host
looper Electron gate passed. The gate verifies same-server identity/rate, record/overdub/stop,
Buffer/synth/region release, survival of another SC node, and quit with an active looper. Attached-IDE
preparation preserved audio settings and did not boot a server in a sclang check. The separate
existing Score Studio host smoke reports no runtime realization with both the original and updated
bootstrap; it is not a passing regression gate. The system-default “1248” interface reported 48 kHz
in this run, inherited by the looper. Mic capture and audible looper playback remain untested.

## Shell live scope windows

Click **Mic / input 1 ↗**, **Audio out / 1–2 ↗** or **Control / LFO + Noise ↗** in the hosted looper. The first captures raw
hardware input 1, independently of looper source/gain. The second captures the final stereo
hardware output bus mix, including other SC instruments. The third reads six owned control buses through ScopeOut2.kr: 1/10 Hz sine LFOs
and four independent LFNoise0 signals at nominal 1/5/20/100 Hz. Audio defaults to 1,024 captured samples, separate from the stored-loop mirror. The **Y zoom** slider (¹⁄₁₆×–64×) changes only visual amplitude.
**Trace** selects Connected (default) or Stepped for all individual-sample traces, regardless of source. This changes visual interpolation only. Missing samples remain gaps. Reduced audio keeps its peak-preserving min/max envelope, with the selector disabled until raw samples are shown again. Freeze holds the display. The logarithmic **X zoom** slider spans ¹⁄₁₆×–8×, with fractional positions and live multiplier readouts. Double-click either slider to reset to 1×. Audio uses the supported raw/min/max profiles while control history stays raw. **Position** pans for inward zoom; inward zoom works while frozen. Widening beyond a frozen snapshot or changing audio resolution resumes the viewer and refills history from short chunks. Capture cadence stays fixed. Scope-window closure does not stop the instrument. Instrument closure
closes its windows and frees the scope synth, ScopeBuffer indices, control bus and native reader.

`native/scopes.cpp` consumes SC's existing scope transport using matching `common/server_shm.hpp`,
`common/scope_buffer.hpp`, Boost and TLSF headers. `scopeview.node` is bundled for this Mac/SC 3.12.2.
The build script uses the SC_SOURCE checkout's matching dependencies. One reader per scope is
required; UI windows share Node's owned copies over binary WebSockets with acknowledgements. Do not attach a second native or Qt reader
to these private scope indices. No new SC plugin or global extension is needed for scopes.

The shell host bridge loads a compiled `awbSharedLoopScopesV1` tap, allocates indices through
ScopeBuffer, and keeps the synth at the root-group tail after other root-node changes. It never
writes audio out or changes audio settings. The browser-only standalone demo path has no scope
allocation. Restart the shell/owned host to load the updated bridge. See the shell README for IDE
reload and validation details. Deterministic mic/output bus probes and captured Electron windows
passed; physical microphone/speaker checks and sustained load tolerance remain unverified.

See [ASSESSMENT.md](ASSESSMENT.md) for measured costs, stability limits, and the optional
`AWB_SHARED_LOOP_ASSESS=1` Electron measurement gate. Current results support a working proof
with low audio-side cost; scope sample JSON has since been replaced with binary delivery. Canvas/Chromium cost, crash recovery and version portability need further work.

## Implementation guide and component measurements

[GUIDE.md](GUIDE.md) explains the two shared-memory paths, file map, startup/shutdown contract,
and how to adapt scopes or a stored-buffer mirror to existing code.
[COMPONENT_COSTS.md](COMPONENT_COSTS.md) reports isolated looper, one-scope, two-scope, lower-rate
and real Qt comparisons, plus binary encoding costs; raw results and the optional harness are included.

## Binary scope transport

Scope sample delivery now uses a versioned Float32 WebSocket packet, with small JSON status/acks
and bounded latest-frame delivery. Loop waveform SSE and controls remain unchanged.
See [BINARY_TRANSPORT.md](BINARY_TRANSPORT.md) for measured traffic/CPU, protocol and restart details.
The real Electron gate verifies binary samples against independent SC bus probes, zoom/freeze and
resource cleanup. Fourteen protocol/transport/history tests cover bytes, identities, origin checks, slow viewers, gaps and frozen snapshots.

## Wider scopes and control bus

¼× and ¹⁄₁₆× retain reduced short chunks in a bounded rolling history. A third
button displays two LFOs and a four-channel noise array captured directly at control rate. See
[WIDE_SCOPES.md](WIDE_SCOPES.md) for durations, publication cadence, v4 format and historical measured costs.
The rebuilt addon and host allocations require restarting the shell and its owned SC host.
The focused looper test now launches no Field or Studio tool.

For measured active-bridge/idle-connection overhead and the increment from one to four/six
visible control lanes, see [CONTROL_COSTS.md](CONTROL_COSTS.md). The dedicated benchmark mode
uses the same six-channel feed and no audio viewers; it changes test-only painting/selection.

[Multichannel audio measurements](AUDIO_CHANNEL_COSTS.md) compare 1/2/4/6 drawn audio lanes
from a fixed six-channel SC feed, in raw and wide modes. The isolated fixture leaves the
normal stereo instrument and live host unchanged; it is measurement tooling, not a deployed
arbitrary-channel scope API.


[Canvas/window comparison](LAYOUT_COSTS.md) measures 1/2/4/6 control and audio lanes in raw/wide
views on one canvas, separate canvases in one window and separate windows. The 71-phase
isolated fixture includes GPU-process/helper CPU and retains equal total waveform area.
Separate canvases share feed/history; separate windows duplicate full-feed processing.
Production scope files and the live host are unchanged.


[Current native Qt comparison](QT_COSTS.md) pairs stock ScopeView and the binary rolling browser
path at approximately 30 Hz, fixed waveform area, short/wide control/audio spans and
one/six lanes. The 58-phase run includes Electron GPU/helper CPU, repeat ranges, memory,
freshness differences and retained screenshots. Wide native captures are not equivalent
to continuously updated browser history. Production runtime and the live host are unchanged.


The [drawing/capture follow-up](../../../apps/awb-shell/docs/scope-next-costs.md) measures
Connected/Stepped and four drawing/history stages, then isolates capture jitter and a Node
worker experiment. Conservative held-run geometry and cached labels/dividers are shipped;
history and reader experiments remain test-only. No audio-route/native change. Reopen only
scopes, keeping the instrument and host running. Full results and reproduction are linked.
