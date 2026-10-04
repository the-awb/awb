# AWB Desktop Shell

The neutral Electron owner for AWB Toolkit Home and hosted tool views.

```sh
npm start --workspace @awb/desktop-shell
```

A plain shell launch probes the standard local sclang OSC endpoint at
`127.0.0.1:57120`. Use `--osc-host` and `--osc-port` (or `AWB_SC_OSC_PORT`) to
target a different language process. The AWB OSC bridges must also be running
inside that sclang process; starting SuperCollider alone does not install their
responders.

`start` launches Electron using the existing built artifacts; it does **not** run a build.
After installation or source/native/dependency changes that require rebuilding, run this
separately from the AWB root:

```sh
npm run build
```

Then launch normally:

```sh
npm start --workspace @awb/desktop-shell
```

The root build prepares workspace packages, the native-audio helper, matching-header SC bus
addon and app renderers. Packaged external tools such as Lissajous retain their own artifact
build/install workflow. `npm run build --workspace @awb/desktop-shell` builds only the shell's
SC addon and render-worker bundle; it does not replace the root build for changed dependencies.
Fresh checkouts need a successful build before launch. Shared Loop HTML/JS/CSS changes need
only reopening the affected views.

[Startup measurements](docs/startup-costs.md) found a historical 9.62 s warm workspace build
and 87.81 s with a clean Swift cache. Removing the automatic `prestart` build avoids that work
on routine launches. The existing Electron startup ordering is unchanged; the historical
roughly 0.76 s Home measurement excludes npm wrapper overhead. The explicit Electron test
command still retains its build hook.

An external launch uses the same router as Toolkit Home:

```sh
npm start --workspace @awb/desktop-shell -- \
  --tool score-studio --tool-instance instance-1 --score /path/to/example.score.json
```

Tool renderers receive only the frozen `awbHost` preload contract. The shell discovers workspace
artifacts from `tools.json`; each artifact must provide a valid `awb.tool/1` manifest whose renderer
entry remains inside that artifact.

The installed Lissajous Viz renderer lives under `../../tool-artifacts/lissajous/`. Its editable
source remains in `~/lissajous-viz`; rebuild it there with `npm run build:tool`, then replace the
complete versioned artifact and update `SOURCE.md`. The first desktop profile requests audio-input
permission, defaults to multichannel capture and excludes file workflows, browser SuperCollider,
automation persistence and deterministic export. It also declares `system-audio`: the shell grants
its explicit System Output action a stereo macOS loopback stream while keeping display capture
unavailable to tools that do not declare that capability. On macOS 14.2 and later this uses
Electron's CoreAudio Tap path and requires Screen & System Audio Recording permission.

Run the neutral unit and desktop gates with:

```sh
npm test --workspace @awb/desktop-shell
npm run test:electron --workspace @awb/desktop-shell
npm run test:neutral-shell-hosted-real --workspace @awb/score-studio
```

The Electron suite includes a two-tool gate which launches Score Studio and Lissajous together,
checks the latter's multichannel request and audio-input grant, and closes each view independently.

## Native multichannel audio

The shell owns the reusable `@awb/native-audio` service. An authorised tool declares the
`native-audio` media capability and uses the frozen host request boundary:

```js
const devices = await awbHost.request('native-audio.devices');
const capture = await awbHost.request('native-audio.start', {
  deviceUID: devices.find((device) => device.name === '1248').uid
});
const socket = new WebSocket(capture.endpoint);
```

`native-audio.status` reports helper state and `native-audio.stop` releases the view's capture.
Closing a view also releases it. The helper opens the selected Core Audio input device directly;
it neither creates nor selects an aggregate device. The renderer receives only a tokenised loopback
WebSocket endpoint carrying versioned Float32 PCM frames.

## Headless render jobs

Tools declaring `capabilities.rendering: ["local-render"]` may submit a resolved job through:

```js
const render = await awbHost.request('render.submit', {
  job,
  executionTarget: 'local',
  suggestedName: 'field-preview.mp4'
});
```

The shell asks for an output file, validates the job and queues it independently of the visible tool
view. Local field previews run in a separately authenticated hidden Chromium worker: WebGL, canvas
and WebCodecs remain available, but no editor UI is shown. Closing the submitting view therefore
does not cancel its job. A later cloud executor leases the same immutable job through the same
broker contract.

`render.status`, `render.list` and `render.cancel` are available only to tools with the capability.
Toolkit Home can also cancel a queued or running job. Frame sources, PCM and encoded media never
pass through lifecycle IPC; executors report only bounded progress and a final receipt. Encoded
chunks use a dedicated back-pressured message port and shell-owned positioned writes to a temporary
file. The temporary file is atomically renamed only after the muxer closes successfully.

The local worker currently executes `field` `analytic-preview` jobs with the same React-free WebGL
scene controller used by the live Field application. Its smoke gate checks repeatable pixels,
landmark-time phase progression and live/export scene parity before accepting the encoded output.
Granted input resolution, Lissajous audio rendering, persisted receipts and remote adapters remain
subsequent slices.

## Shared desktop host

Toolkit Home is the junction between tool documents, hosted SuperCollider and live NodeManager
state without owning any of them:

- one shell-owned host service per SC endpoint survives individual view closure, carries tool-owned
  transport through per-view manifest grants, and intercepts the read-only SynthDef-context protocol
  for shell-side request coalescing and exact-byte/spec caching;
- SynthDef inventories establish cache generations: refresh invalidates prior descriptions and late
  transfers cannot restore stale state;
- a lightweight shared NodeManager subscription which the shell filters into per-tool and
  per-session container summaries;
- explicit `toolID`/`toolInstanceID` to `toolSource`/`toolInstance` bindings, never name-based
  inference;
- bounded health probes and reconnect backoff for shell-first startup and attached bridge restarts;
- manifest-declared document kinds which produce `New`, `Recent` and `Browse` actions on each
  applicable tool card;
- bounded recent-file references while parsing, validation, revision state and canonical saves
  remain owned by the selected tool.

Score Studio documents also have one deliberately narrow native dependency operation. Given the
view's opaque grant for a canonical `*.score.json`, the shell checks only for an optional sibling
named `synths.scd`. When present, that file is authoritative for the score: the shell asks the
view's native Score Studio ToolInstance to load and synchronize it before accepting the document.
The renderer cannot submit an arbitrary path or SuperCollider source string. When the sibling is
absent, the score uses definitions already installed in the connected desktop context; normal
runtime readiness still blocks playback and names any definition which is genuinely missing.

The Home status strip reports sclang attachment, scsynth readiness, SynthDef-context readiness and
NodeManager connectivity separately. A ready language context is not presented as proof that a
definition is installed on the active server.

When sclang and scsynth are ready, **Test tone** asks that exact host to compile and play a short
440 Hz sine on hardware outputs 0 and 1. It deliberately bypasses Score Studio, the instrument
library, NodeManager and ToolInstances. Hearing it proves the shell-to-sclang-to-scsynth output
path; the acknowledgement alone proves only that scsynth accepted the synchronized definition and
node request, not that the selected hardware outputs are audible.

Tools without a SuperCollider host or canonical document must still launch normally; unavailable
hosted, tracking or file actions are shown as capabilities, not treated as application failures.

## Native SuperCollider hosts

Electron uses native SuperCollider; the WASM language and engine remain browser implementations.
Toolkit Home offers two full language hosts:

- **Open SuperCollider** launches or activates the real IDE. That process, its documents and its
  server remain user-owned and are never terminated by the shell.
- **Start headless host** launches an explicit tool-only native sclang and scsynth pair. The shell
  owns that pair, authenticates its control connection and shuts it down when requested or when the
  shell quits. It is not presented as a replacement code editor.

The headless process uses the installed SuperCollider class-library configuration and therefore
expects `AWBHostControl` and the other awbCollider classes to be available. Override discovery with
`AWB_SCLANG_PATH` and, when testing another checkout, `AWB_SCLANG_CONFIG`. Its scsynth port is
selected away from an occupied default, or fixed with `AWB_HEADLESS_SERVER_PORT`.

The lightweight host-control responder is separate from NodeManager. Toolkit Home can select
`when needed`, `always on`, or `off / manual`. Turning NodeManager off removes tracking responders
and subscriptions but never stops, releases or frees sound objects. A ToolInstance Track request
reactivates the manager and its external bridge under `when needed`; `manual` refuses implicit
activation.

Score Studio exposes one **Open hosted** action. Attached IDE versus shell-owned headless is a
shell-level host choice, selected in Toolkit Home rather than repeated on each tool card. A hosted
launch reuses whichever native host is active and asks its sclang to create a named `ToolInstance`;
if no host exists, it reports that the user must open SuperCollider or start the headless host.
The shell supplies the ToolInstance identity to the renderer and closes only that shell-owned instance
with the view. Multiple score views therefore have separate sessions and `PScoreTimelinePlayer`
instances while sharing the selected language and server host. The Electron renderer exposes
hosted execution only; it cannot silently boot scsynth.wasm. Browser Score Studio retains its
standalone WASM mode.

Field Modelling follows the same ownership boundary. **New analytic field** needs no audio host;
**Open hosted** reuses the shell's active native host and creates a named `fieldModelling:*`
ToolInstance. Authored Field instruments are then created and controlled through that instance. An
active hosted Score Studio card exposes **Open Field for this score**. That view observes the
score's current and subsequent runs while retaining its separate Field ToolInstance: score
realizations and Field-authored instruments can therefore coexist without confusing their
ownership or lifecycle.

## Lissajous config documents

The hosted Lissajous tool declares `lissajous-config` as a first-class document kind. These JSON
documents contain complete visual state and live stereo-pair routing, but no audio asset, score
relationship, device identity, recording or automation. Toolkit Home exposes New, Recent and
Browse actions; the renderer reads and writes through opaque per-view grants and guarded atomic
writes. A future score-container resolver may reference the same config without changing its
meaning or making the shell interpret the document.

## Shared Loop instrument

Toolkit Home includes **Shared Loop → Open looper**. It uses the shell's active native SC
host. Start the headless host from Home first, or attach an IDE host prepared as described below.
The instrument never starts a separate audio server or changes device, sample-rate, channel-count,
or block-size options. Buffer duration and waveform timing follow the server's actual sample rate.
Mic input reads hardware channel 1; mono playback goes to output channels 1 and 2. Node/Electron
handles the shared waveform and controls; SC handles the audio interface.

The shell-managed headless host adds the installed looper plugin to `SC_PLUGIN_PATH`, preserving
normal plugin discovery and the existing environment. Its bootstrap loads the bounded looper
allocation bridge. Restart an older shell/owned host to load this support. Existing hosts are not
rebooted automatically. For an attached IDE, evaluate the artifact's `sc/prepare-host.scd` before
booting its local `Server.default`, then boot normally. That setup adds plugin discovery and the
bridge without selecting audio devices or a rate. It refuses to change a running server.

Closing the looper frees only its synth, Buffer, shared region and Node HTTP/reader service.
The host and unrelated nodes/views stay alive. Host-stop requests are refused while the looper
runtime is active; quitting the shell releases instrument runtimes before stopping its owned host.
An attached IDE remains owned by the user. Failed startup cards can be closed and retried.

The self-contained artifact is `tool-artifacts/shared-loop/0.1.0`. Its trusted
`awb.local-runtime/1` entry point receives shell-provided host context and serves a loopback HTTP
renderer in the existing sandbox. The renderer receives neither raw host credentials nor Node
privileges. The compiled SynthDef avoids recompiling the live class library; `SharedLooper.sc`
is included for direct sclang use, but this compiled-host path is not yet integrated with
SynthDef analysis or NodeManager. Native binaries target this Mac/SC 3.12.2; the loop is mono and
four seconds. Source, provenance and rebuild instructions are included in the artifact.

With Node 22, from the AWB root:

```sh
npm start --workspace @awb/desktop-shell
# After starting/preparing the shell host, open the instrument directly:
npm start --workspace @awb/desktop-shell -- --tool shared-loop --profile hosted
# Real Electron + shell-managed native SC integration gate (quiet bus probes):
npm run test:shared-loop --workspace @awb/desktop-shell
```

The gate checks missing-host recovery, Home launch, matching shell-server identity and actual
sample rate, record, shared waveform, overdub and stop. After view closure it verifies the Buffer,
synth and region are released while another SC node and tool remain alive. It also quits with a
reopened active looper and verifies region removal and owned-server shutdown. Mic capture and
audible playback remain unverified on the intended interface.

### Live mic, output and control scopes

Shared Loop's **Mic / input 1 ↗**, **Audio out / 1–2 ↗** and **Control / LFO + Noise ↗** buttons open three independent
scope windows. Mic reads raw hardware input 1 before looper input gain, even when the looper
uses its test tone. Output reads the final stereo SC hardware output bus mix, including other
instruments; it is not the stored-loop waveform. The shell observer group sits at the root-group tail and is moved
back to the tail when other ordinary root nodes are added or moved. It never writes to the output buses.

Audio scopes show a baseline 1,024-sample window; control shows 128 values across six lanes.
¼× / ¹⁄₁₆× zoom keeps reduced short chunks in a rolling composite window, while 2×/4×/8×
crops inward with frozen panning. Missing chunks remain visible gaps. Hosted SC capture lengths are
512 raw audio / 32 control values; scopes combine consecutive audio chunks into 1,024 samples. Scope closure leaves the instrument running; instrument closure
releases all three windows and their subscriptions plus its private control buses/generator.
Compatible SC Bus viewers keep their shared output tap alive until their own final release. Restart the
shell/owned SC host to load the rebuilt addon, SynthDefs and physical counter-channel allocation.

The scopes use SC's existing `ScopeOut2` shared-memory transport and language-allocated
`ScopeBuffer` indices. A native reader built against matching SC 3.12.2/Boost headers makes owned
JS sample copies; binary WebSocket packets feed the windows. Small status messages and frame acknowledgements remain JSON. There is one native reader per scope, shared by
all UI subscribers. The auxiliary windows are sandboxed, have no Node integration or host preload,
and accept only the fixed mic/output/control kind from their owner. Audio device/rate settings are untouched.
The standalone demo entry point does not allocate these scopes; they are a shell-hosted feature.

The real Electron gate also checks distinct mic/stereo bus probes while the looper is stopped,
window sandboxing, X zoom/pan/reset on frozen data, Freeze, close/reopen, and scope synth/buffer/window cleanup without stopping
another SC node. Captured scope windows were visually inspected. These are deterministic SC bus
checks; physical microphone capture, audible output and performance under load remain separate
manual checks. The existing unrelated Score Studio realization smoke failure is unchanged.

The cost/stability assessment and optional measurement command are in
[`ASSESSMENT.md`](../../tool-artifacts/shared-loop/0.1.0/ASSESSMENT.md). The original JSON/SSE measurements
found low SC audio CPU (0.36% with scopes, 0.45% while overdubbing), approximately 8–9% of one
CPU core per visible scope renderer, and 1.92 MiB/s of local scope JSON before the transport update. These are indicative
measurements, not sustained-load certification. Crash/reboot recovery, scope ABI portability and
production recovery remain follow-up work; scope delivery is now bounded by one outstanding acknowledged frame per viewer, while the loop waveform still uses SSE; ordinary teardown passes the integration gate.

For implementation/reuse, see [Shared Loop guide](../../tool-artifacts/shared-loop/0.1.0/GUIDE.md).
For isolated looper/one-scope costs, Qt comparisons and lower resolution/binary transport budgets,
see [component measurements](../../tool-artifacts/shared-loop/0.1.0/COMPONENT_COSTS.md). The optional
component harness launches a minimal test-owned Electron/SC setup, without Studio or Field.

The scopes now use [binary sample delivery](../../tool-artifacts/shared-loop/0.1.0/BINARY_TRANSPORT.md).
The isolated binary run measured 0.353 MiB/s for both scopes, 81.5% less traffic at unchanged
resolution; CPU improved modestly. Restart the shell to load the new backend, then reopen Shared Loop and its scopes. The original binary-only update required no native
rebuild; the wider/control update below includes rebuilt native code and new host allocation; the runtime releases its owned
resources normally when closing. Resolution, zoom, freeze and Canvas rendering are unchanged.

Wider **¼× / ¹⁄₁₆×** rolling views and a **Control / LFO + Noise** scope are described in
[WIDE_SCOPES.md](../../tool-artifacts/shared-loop/0.1.0/WIDE_SCOPES.md). Outward zoom reduces short chunks in C++ and assembles source-indexed rolling history in JS;
capture length/cadence stays fixed.
Restart the shell and its owned SC host for the rebuilt reader and new host allocation.
`test:shared-loop` is focused on this instrument and launches no unrelated tool.

The control window now shows six stacked channels: 1 Hz / 10 Hz sine LFOs and an independent
LFNoise0 array at nominal 1 / 5 / 20 / 100 Hz. Use its Signals selector for all channels, just
noise, or either LFO. Selection works while frozen. Restart the shell/owned SC host to load
the six-channel allocation and rebuilt reader; the v4 layout described in the historical report has since been superseded by selected-channel v5. These generators were explicitly added for the demo;
they are not existing application control buses discovered automatically.

The current isolated rolling audio-pair measurement was about 581 KiB/s at 1× and 82 KiB/s
at ¹⁄₁₆× while keeping about 47 source chunks/s per scope. Visible renderer CPU was 18.35%
combined at 1× and 15.20% wide (one core); short-run evidence and raw results are in WIDE_SCOPES.md.


For control/audio costs with one canvas, separate canvases and separate windows, see
[layout measurements](../../tool-artifacts/shared-loop/0.1.0/LAYOUT_COSTS.md). This isolated
71-phase test includes GPU-process/helper CPU and fixed total waveform area. It adds
measurement tooling only; ordinary shell scope windows and the live host are unchanged.


For the current stock Qt versus binary browser cost comparison, see
[QT_COSTS.md](../../tool-artifacts/shared-loop/0.1.0/QT_COSTS.md). The paired test includes
GPU/helper CPU, fixed plot area, approximately 30 Hz settings and explicit wide-view
freshness differences. It adds isolated measurement tooling only.

## Lissajous SC Bus source

Lissajous now has **Source → SC Bus** alongside Native Audio and System Output. It captures raw,
sample-aligned audio from the shell's existing local SC server, with a starting bus and 2–16
channels. Bus 0 is the first SC output; private instrument buses can be visualized without hardware
loopback. The displayed sample rate comes from that server.

The owned host loads the bridge automatically. For an already running attached IDE, evaluate
`"/Users/willy/awb/apps/awb-shell/sc/prepare-sc-bus.scd".load;`. No server reboot is needed.
See [setup, ownership, binary format and reuse](docs/sc-bus-audio.md). The native build requires
matching `SC_SOURCE` headers; the focused gate is `npm run test:sc-bus --workspace @awb/desktop-shell`.
It opens only Lissajous and a test-owned SC host.

### Shared capture and quieter scope rendering

Shared Loop scopes and Lissajous SC Bus now use one shell-owned signal broker. Identical source
requests share capture/attachment/polling. Scope zoom reduces only display data; Lissajous keeps
raw aligned PCM. Opening the looper alone starts no scope taps, closing a scope releases its feed,
and frozen scopes stop painting while history continues receiving data. Other audio routes and
Field Modelling are unchanged. Restart the shell for this Node/native update; attached host setup
and the verified boundaries are in the [shared-engine guide](docs/shared-signal-engine.md).
Historical performance numbers are not new measurements of this implementation.


### Shared display profiles and selected-channel costs

Scopes now share display reduction between compatible adapters and send only selected physical
channels (`awb.scope.v5`). One selected audio lane and six separate one-lane windows each saved
about 83% in sample transport; CPU gains were smaller and layout-dependent. Full results,
repeat ranges, freshness gaps, and isolated looper/capture cases are in the
[current optimisation report](docs/scope-optimisation-costs.md). Historical Qt/layout reports
remain unchanged. The [engine guide](docs/shared-signal-engine.md) documents the derived lease
API and raw PCM isolation. Restart the shell for the Node/native reader update.


### Scope refresh comparison

Each scope now has **Refresh → Auto / 30 fps / 15 fps**. Painting waits for its deadline;
source capture, packet delivery and history append continue at their usual rates. Auto remains
the default. Lower refresh saves drawing/compositor work with slower visual updates. The
[72-phase comparison](docs/scope-cadence-costs.md) separates paint rate from incoming data,
CPU components, pauses and source lag. Restart the shell for the new asset route and reopen
scopes; this change needs no SC reboot, native rebuild or audio rate/device change.


### One-line routing baseline

[The mono baseline](docs/one-line-scopes-costs.md) measures one captured audio channel in both a
minimal host and the actual shell. It compares direct native-source polling with the shell broker
at identical 30 fps painting, includes main/renderer/GPU/utility CPU, and separates idle,
capture-only and visible-scope costs. This is 40 measured phases plus ten smoke phases; the
historical 12.51% stereo figure omitted GPU/helper CPU. No production/audio route changes.

### Single Lissajous pattern comparison

[The 5,000-point comparison](docs/lissajous-scope-costs.md) measures the published Lissajous
SC Bus view alongside a mono scope in the actual shell, at matching 620 × 240/DPR 1 plot size.
Total Electron CPU means are 27.1% of one core for the 30 fps scope, 35.7% for normal-refresh
Lissajous, and 28.1% for a fixture-only 30 fps Lissajous cap. The report retains four-repeat
ranges and process components; no production renderer/audio route was changed.

### Scope text cadence and trace polish

Meters/rolling labels now update at 8 Hz independently of Auto/30/15 fps wave painting.
Zoomed-out waveforms use connected min/max envelopes, raw traces have rounded joins, and
real data gaps remain visible. Raw traces now default to Connected, with a user-selectable Stepped mode. [Before/after and verification](docs/scope-display-polish.md).
Reopen Shared Loop between takes so its backend serves the new modules; closing it releases
the demo loop buffer. No manual SC reboot or native rebuild is needed.

The subsequent [control single-line correction](docs/scope-display-polish.md#control-single-line-correction--2026-10-03)
retains ordered raw control history at every zoom, removing doubled envelope outlines.
Load this correction by closing/reopening only the control scope; keep the looper running.


### Scope UI performance recheck

[The matched 36-phase recheck](docs/scope-ui-costs.md) compares the archived pre-polish UI and
current UI in the actual shell. Total Electron CPU means (one core, including GPU/helpers):
mono audio 34.8 → 23.8%, widened audio 36.1 → 27.0%, one widened control LFO 21.9 → 20.3%,
and six widest control lanes 24.0 → 35.2%. The last increase comes mainly from drawing the
ordered 2,048-sample control traces. Painting remains live and labels update at about 8 Hz.
Publication gaps still occur; the report retains rates, ranges and polling-jitter limitations.
The subsequent [five-thread investigation](docs/scope-next-costs.md) measures and implements conservative held-run geometry, preserving raw history.
No production UI/audio route changed during this investigation.


### Scope zoom sliders

Scopes now have logarithmic X (¹⁄₁₆×–8×) and Y (¹⁄₁₆×–64×) sliders with live multiplier
readouts. Double-click a slider to reset to 1×. X uses fractional display spans while keeping
supported capture profiles; Y affects drawing only. Close/reopen the scope windows to load
this update, keeping the looper and SC host running. [Details and live verification](docs/scope-zoom-sliders.md).


### Scope trace connections

The **Trace** selector offers Connected (default) and Stepped for every individual-sample
trace, without source-specific assumptions. Mode changes redraw the same samples, including
while frozen; gaps stay visible. Widened audio retains its min/max envelope and disables this
selector until raw samples return. Reopen only the scope windows, keeping the looper and SC
host running. [Screenshots and verification](docs/scope-display-polish.md#trace-connection-modes--2026-10-03).


### Scope drawing and capture follow-up

[The five-thread report](docs/scope-next-costs.md) retains 99 measured phases for Connected versus
Stepped, geometry, static backgrounds, history copying and worker/jitter checks. Six wide control
lanes fall from 28.3% to 27.4% total Electron CPU after conservative geometry compression and
cached labels/dividers; audio savings are not established. Bulk history and the worker/power
experiments remain fixture-only. 41 scope tests, pixel equivalence at three display scales and
the actual-shell gate pass. Reopen only scope windows; keep the looper and SC host running.


### Standalone bus scopes

**Toolkit Home → Scope → Open scope** now opens an independent oscilloscope. Select Audio or
Control, a first bus and 1–16 consecutive channels, then Listen. Each window has zoom,
freeze/pan, Connected/Stepped and Auto/30/15 fps. Open the card again for another scope;
identical ranges share capture and matching display derivation through the shell engine.
The looper need not be open. Start the shell host or prepare an attached IDE first.

Restart the shell once to load the new card/runtime; no rebuild is needed. Normal start stays
separate from build. [Bus numbering, implementation and checks](docs/scope-tool.md).

```sh
npm start --workspace @awb/desktop-shell -- --tool scope --profile hosted
npm run test:scope --workspace @awb/desktop-shell
```

### ToolInstance integration

The shell and published Lissajous renderer now use Tool/ToolInstance identity.
Scope and Shared Loop retain their shared capture/backend lifecycles without a
ToolSession fallback. Read the [integration handoff](docs/scope-tool-instance-integration.md)
before moving a dirty checkout: it lists the paired SC class-path update, separate
Rack work and the pinned Lissajous source commit. Build once explicitly, then use
`npm start --workspace @awb/desktop-shell`.

## Rack mixer

Toolkit Home includes **Rack → Open Rack**. The workspace source is in
[`../rack`](../rack/README.md). It supplies per-channel send strips, shared
destination levels, HTML/SVG and single-canvas views, local mixes, complete or
selected snapshots, and inline amount/time/alignment editing. Amount edits update
live commanded values immediately; output must be explicitly enabled to send OSC.
The tool needs no SC host and defines mix presets associated with SC scene IDs.

Rack starts with the existing 354-control/11-mix fixture when there is no saved
library. Its library lives in the toolkit profile's `tool-runtimes/rack-library.json`;
the comparison launcher's separate `.rack-user-data` library is kept separate.
Import/Export in Rack can transfer a library between those profiles. Closing Rack
stops its local runtime and reopening restores its saved definition and commanded
values with output off.

The renderer is already built in this installation. After rack source changes,
run `npm run build --workspace @awb/rack` from the AWB root, then reopen Rack.

The [headless audio deadline comparison](docs/scope-headless-dropouts.md) tests steady widgets and app-focus switching under two DSP loads, with native callback evidence and a separate focus-automation control. Steady widgets were clean; heavy-load focus switching produced interruptions.

[Headless-only audio rerun](docs/scope-headless-dropouts-ide-closed.md): 18 comparison phases after closing the SC IDE and its server, with a persistent focus helper and recorded SC process inventories.
