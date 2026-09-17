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

`start` builds the workspace packages, including the native-audio helper and Score Studio renderer,
before Electron starts. Packaged external tools such as Lissajous are already installed as complete
renderer artifacts.

An external launch uses the same router as Toolkit Home:

```sh
npm start --workspace @awb/desktop-shell -- \
  --tool score-studio --tool-session session-1 --score /path/to/example.score.json
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
- explicit `toolID`/`toolSessionID` to `toolSource`/`toolInstance` bindings, never name-based
  inference;
- bounded health probes and reconnect backoff for shell-first startup and attached bridge restarts;
- manifest-declared document kinds which produce `New`, `Recent` and `Browse` actions on each
  applicable tool card;
- bounded recent-file references while parsing, validation, revision state and canonical saves
  remain owned by the selected tool.

The Home status strip reports sclang attachment, scsynth readiness, SynthDef-context readiness and
NodeManager connectivity separately. A ready language context is not presented as proof that a
definition is installed on the active server.

When sclang and scsynth are ready, **Test tone** asks that exact host to compile and play a short
440 Hz sine on hardware outputs 0 and 1. It deliberately bypasses Score Studio, the instrument
library, NodeManager and tool sessions. Hearing it proves the shell-to-sclang-to-scsynth output
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
and subscriptions but never stops, releases or frees sound objects. A ToolSession Track request
reactivates the manager and its external bridge under `when needed`; `manual` refuses implicit
activation.

Score Studio's desktop launch profiles are now literal: **Use SuperCollider IDE** requires an
attached `AWBHostControl`, while **Use headless SuperCollider** starts the shell-owned native host.
In either case the shell asks sclang to create a named `ToolSession`, supplies that identity to the
renderer, and closes only that shell-owned session with the view. Multiple score views therefore
have separate sessions and `PScoreTimelinePlayer` instances while sharing the selected language and
server host. The Electron renderer exposes hosted execution only; it cannot silently boot
scsynth.wasm. Browser Score Studio retains its standalone WASM mode.

Field Modelling follows the same ownership boundary. **New analytic field** needs no audio host;
**Use SuperCollider IDE** and **Use headless SuperCollider** ask the selected native sclang host to
create a named `fieldModelling:*` ToolSession. Authored Field instruments are then created and
controlled through that session. A Field view opened from a score project instead observes the
named score run and does not duplicate it with a second authored-instrument playback path.

## Lissajous config documents

The hosted Lissajous tool declares `lissajous-config` as a first-class document kind. These JSON
documents contain complete visual state and live stereo-pair routing, but no audio asset, score
relationship, device identity, recording or automation. Toolkit Home exposes New, Recent and
Browse actions; the renderer reads and writes through opaque per-view grants and guarded atomic
writes. A future score-container resolver may reference the same config without changing its
meaning or making the shell interpret the document.
