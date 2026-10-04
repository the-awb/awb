# Shared Loop 0.1.0 artifact

Derived on 2026-10-01 from `/Users/willy/dev/sc-shared-looper-demo` with shell integration sources
maintained in this artifact. The standalone checkout is unchanged. This artifact includes native
UGen/Node binaries built for this Mac against installed SC 3.12.2 headers, plus a compiled SynthDef.
It does not import the mutable demo checkout.

Shell adaptations: a trusted runtime receives the active shell SC host; a bounded sclang bridge
allocates and frees instrument resources through the language's allocators. The runtime inherits
host audio devices, actual sample rate and channel options. SC-to-Node shared memory and Node-to-UI
SSE are retained. The shell-managed bootstrap loads the bridge and extends default plugin discovery
through SC_PLUGIN_PATH. Attached-IDE preparation is explicit and refuses to alter a running server.
No live class-library recompile or global plugin installation is needed. This compiled-host path
is not yet wired into SynthDef analysis or NodeManager.

Rebuild with Node 22: `npm run build --prefix tool-artifacts/shared-loop/0.1.0` from AWB.
Set `SC_SOURCE`, `NODE_HEADERS` and `SC_APP` as needed. SynthDef compilation uses a temporary isolated
sclang library and never boots an audio server. SHA256SUMS.json records the current installation;
it is provenance metadata, not signature enforcement.


Live scope additions: built-in SC ScopeOut2 transport via a matching-header native reader;
compiled mic/stereo output tap; root-tail ordering; sandboxed owner-bound mic/output windows and
SSE fan-out. SC's server_shm/scope_buffer headers retain their GPL notices in the upstream checkout;
SC's license is included as COPYING-SuperCollider. The compiled bus-probe SynthDefs are test fixtures
only and are never instantiated by the instrument. The standalone checkout remains untouched.

The shell artifact now adds horizontal scope zoom/pan and an optional test-owned cost measurement
in `tests/assessment.mjs`. `ASSESSMENT.md` records the 2026-10-01 findings and unproven stability
boundaries. These edits remain local to this installed artifact; the original demo checkout is unchanged.

The artifact also includes an implementation/reuse guide and isolated Electron/Qt component
benchmark with captured results. The trusted bridge helper accepts a bounded optional update
interval for measurements; ordinary launches still use 33 ms. Native binaries are unchanged.

Scope transport now uses a shared binary codec and the declared `ws` dependency (8.21.3 in the
artifact lockfile and current AWB installation). Original native binaries/SC producer code remain
unchanged. Node/browser sample conversion was removed; independent binary/socket tests and the
real Electron bus-probe gate validate the new path. Historical JSON benchmark data is preserved.

The wider/control update extends the matching native reader with min/max reduction and owned
completed-frame caching, adds a private control bus/ScopeBuffer to the host, and rebuilds the
addon/SynthDefs. Its codec is awb.scope.v2. WIDE_SCOPES.md records provenance and current checks;
the original demo source checkout remains untouched.

The control array extends the existing private bus/ScopeBuffer to six channels and adds independent
LFNoise0.kr generators plus a 10 Hz sine alongside the original 1 Hz sine. The native reader,
compiled scope SynthDef and v3 browser codec were rebuilt together. Historical mono-control
benchmark JSON is preserved and labelled; its costs do not describe the new six-lane view.

The rolling update replaces giant captures with 1,024-frame audio / 32-frame control chunks,
private source-counter channels (physical 2/3/7; visible 1/2/6), native step 1/4/16 reduction,
and a bounded source-indexed browser history with explicit gaps. The rebuilt reader/SynthDef
and awb.scope.v4 codec ship together; loop summary remains SSE. Scope polling is independently
8 ms; ordinary loop-summary polling remains 33 ms. WIDE_SCOPES.md supersedes earlier allocation,
transport/cadence and cost descriptions above. Historical measurements remain unchanged.

The multichannel audio experiment adds only reproducible measurement tooling and evidence.
Its runner copies the installed artifact into a temporary fixture, rebuilds an adapted addon
there, and scopes six synthetic SinOsc.ar signals without hardware output. The ordinary
stereo reader/codec/GUI/host are byte-checked before/after. AUDIO_CHANNEL_COSTS.md separates
fixed-feed lane rendering costs from actual source-channel scaling, and retains raw evidence.


The canvas/window experiment adds only tests/layout-bench tooling, a 71-phase result set,
six focused screenshots and LAYOUT_COSTS.md. A temporary six-channel fixture reuses the
installed plotting/history/transport path and holds total waveform area fixed while
comparing shared canvas, separate canvases and separate windows. CPU clocks now include
Electron GPU/Utility helpers; GPU-process CPU is not GPU hardware utilization. The production
addon, native reader, codec, GUI and host passed before/after hash guards unchanged.


The 2026-10-02 native Qt comparison adds test-only qt-bench tooling, 58 paired phases,
eight smoke cases, screenshots and QT_COSTS.md. It uses the installed SC 3.12.2 ScopeView
in an isolated sclang library/server and private counter-free scope indices. All adapted
addon/codec/SC/renderer files live only in a temporary copy under production hash guards.
Native wide captures have lower fresh-data cadence than browser rolling history.

2026-10-02 shell signal sharing: hosted protocol v2 delegates audio/control observers to
`apps/awb-shell/src/signalCaptureBroker.mjs` and `sc/AWBScBusAudio.scd`. Scope viewers own leases,
not private copies of compatible taps. The control-only v2 SynthDef is demand-created, scopes
derive display min/max from shared raw PCM in Node, and Lissajous keeps its raw binary format.
The scope renderer caches its grid, reuses display storage, builds history per paint and stops
frozen painting. `server.mjs` retains its legacy reader path for standalone/measurement fixtures.
The matching generic shell reader is built in `apps/awb-shell/.build/sc-bus-reader.node`; the
looper UGen and old scope reader binaries were not changed. Historical measurements are retained
and do not measure the new broker. See the shell [shared-engine guide](../../../apps/awb-shell/docs/shared-signal-engine.md).


2026-10-02 shared display optimisation: `subscribeDerived` shares scope joining/minmax/levels
for matching raw-source/display profiles. Scope v5 adds physical channel IDs and selected
planes; each transport caches snapshot/mask packets. History remaps retained lanes and preserves
gaps, while subset freeze restricts selection to saved lanes. Raw SC Bus/Lissajous codecs and
other audio routes are unchanged. The shell native reader now rejects preceding-writer cached
startup blocks; both cost versions include this correction. The compiled matching shell addon
is rebuilt in `.build/sc-bus-reader.node`, outside this artifact. Loop UGen/loop reader binaries
were not rebuilt. The focused 96-phase comparison, retained before sources, raw evidence and
replication harness are in the shell [optimisation report](../../../apps/awb-shell/docs/scope-optimisation-costs.md).
Historical cost reports/results remain byte-identical. Work remains uncommitted.


2026-10-02 scope cadence slice: `public/scope-painter.js` adds per-window Auto/30/15 fps dirty
painting against steady animation-frame deadlines; Auto remains default. Data decode/history
append/acknowledgement and raw signal acquisition are unchanged. Controls request immediate
next-frame drawing; freeze continues history without paints; closure cancels its pending work.
The GUI gains a Refresh selector. This needs a new JS-serving route, not SC/native rebuilding.
Five scheduler tests, the actual-shell gate and a 72-phase interleaved cadence comparison
provide bounded evidence; [full report](../../../apps/awb-shell/docs/scope-cadence-costs.md).
Previous cost reports/results and native/Lissajous assets remain byte-identical. Uncommitted.
