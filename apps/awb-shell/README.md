# AWB Desktop Shell

The neutral Electron owner for AWB Toolkit Home and hosted tool views.

```sh
npm start --workspace @awb/desktop-shell
```

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

Tools without a SuperCollider host or canonical document must still launch normally; unavailable
hosted, tracking or file actions are shown as capabilities, not treated as application failures.
