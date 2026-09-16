# Field Modelling tool import

**Status:** proposed implementation handoff · **Written:** 16 September 2026

**Target:** `~/awb` desktop toolkit and reusable packages

**Source application:** `~/field_modelling/react-app`
**Depends on:** `AWB_DESKTOP_SHELL_SPEC.md`, `RENDER_PIPELINE.md`,
`@awb/field-engine`, `@awb/field-renderer`, `@awb/instruments`, `@awb/score`,
Score Studio's hosted connector, awbCollider `ToolSession`/NodeManager, and the shell-owned
native-audio service.

## 1. Goal

Bring the existing Field Modelling application into AWB as a first-class tool which can:

- open and save its own field configuration;
- be durably associated with one particular canonical score;
- attach to one particular live score session and run, never to an ambiguous global transport;
- project supported score realizations into the analytic acoustic field;
- observe the actual SuperCollider signal before the master output so phase can be measured and
  periodically corrected rather than guessed;
- continue to support a standalone analytic mode without desktop SuperCollider;
- use the shared render pipeline for deterministic output without making that offline pipeline own
  live audio, ToolSessions or score playback.

The import is application-preserving. The existing field renderer, instrument-specific projection,
room/speaker geometry, surfaces, probes and phase refusal behaviour are the baseline. The task is
to put them behind the current AWB document, host and session boundaries—not redesign the physics.

## 2. Settled decisions

1. **The score remains musical.** Field configuration and tool associations do not enter the
   canonical score document or increment its musical revision.
2. **Association is durable and local to the work.** A score-project sidecar stored beside the
   score links it to one or more Field and Lissajous configurations using relative paths.
3. **Runtime attachment is explicit.** A Field view binds to a concrete shell score session and
   `runID`; it does not follow “whatever score is currently playing”.
4. **NodeManager supplies lifecycle and visibility, not audio truth.** Score realization identity,
   NodeManager state and SynthDef context describe what exists. Samples are still required for
   phase alignment.
5. **Field-specific instrument projection stays.** `@awb/synthdef-interface` can describe an
   arbitrary compiled graph, but it cannot infer a defensible acoustic-field decomposition from
   one. Unknown SynthDefs remain audible and visible as unsupported; the renderer does not invent
   components for them.
6. **The Field Tool is an observed premaster submix.** Supported realizations write to private
   internal stereo buses. A stable score-session mixer sums them to the listening outputs. The
   Field Tool attaches observation/capture nodes before that master mix.
7. **Closing a renderer must not stop or mute sound.** The browser window does not own the final
   mixer. Releasing a Field view removes its capture/observation layer and leaves the score audio
   path intact.
8. **Phase is measured from waveform data.** The first desktop implementation reuses the existing
   validated JavaScript joint-stereo phase fitter. SC-side phase estimation is a possible later
   optimisation, not a shortcut in the first migration.
9. **Physical output count is not realization identity.** Private audio buses and server buffers
   may exceed the hardware output count. Only the final listening mix is required on physical
   outputs.
10. **Live and offline rendering share a renderer, not a lifecycle.** The live ToolSession and the
    deterministic render scheduler are separate adapters around common Field renderer state.

## 3. What exists today

### Already canonical in `~/awb`

- `@awb/instruments`: curated practice vocabulary and control meaning.
- `@awb/field-engine`: renderer-neutral field projection, propagation, shaders, probes and room
  helpers.
- `@awb/sc-wasm`: standalone browser SC engine and sample tap.
- `@awb/score`: canonical score document and editing contracts.
- `@awb/field-renderer`: the React-free Three.js/WebGL scene controller shared by the live adapter
  and deterministic render-pipeline producer.
- `@awb/render-pipeline`: typed resolved inputs, fixed-frame scheduling, sinks and receipts.
- AWB shell: tool manifests, opaque file grants, shared hosted-SC services and native audio.
- Score Studio: hosted score installation, authoritative desktop transport and
  `entryID -> realizationID -> nodeID` reporting.

### Application state retained by Field Modelling

- application state and panels for room, instruments, surfaces, probes and display;
- glue from live queried nodes to field instruments;
- old localStorage file handling;
- an obsolete app-owned score/timeline surface;
- direct ownership of scsynth.wasm and browser sclang in the application shell.

The old timeline is not migrated as a second score editor. Score Studio owns score authoring. The
Field tool consumes a score session and may expose navigation or field-specific mapping controls.

## 4. Documents and durable association

### 4.1 Field configuration

Introduce `awb.field-config/1`, normally `*.field.json`. It owns reusable visual and acoustic-model
configuration:

- room and speaker geometry;
- surfaces, probes and body pose/display choices;
- camera and display state;
- field-supported instrument mappings and deliberate overrides;
- phase-lock policy such as resynchronisation interval;
- premaster route presentation such as mute/solo/display inclusion, where these are Field-tool
  concerns rather than score authorship.

It excludes:

- the canonical score document;
- a mutable copy of score events;
- live node IDs, run IDs or ToolSession IDs;
- physical Core Audio device identity;
- recordings, automation takes and rendered outputs.

### 4.2 Score-project association

Introduce `awb.score-project/1`, normally `<name>.awb-project.json` beside the score:

```json
{
  "schema": "awb.score-project/1",
  "projectID": "sonic-attunement-01",
  "score": {
    "path": "./attunement-01.score.json",
    "scoreID": "attunement-01"
  },
  "tools": [
    {
      "bindingID": "field-main",
      "tool": "field-modelling",
      "config": "./field/main-room.field.json",
      "role": "primary"
    },
    {
      "bindingID": "lissajous-main",
      "tool": "lissajous",
      "config": "./visuals/primary.lissajous.json",
      "role": "primary"
    }
  ]
}
```

Paths are relative by default. The shell may cache these relationships for Recents, but the cache
is not canonical. Saving a Field config must not rewrite the score; saving the score must not
rewrite its tool configs.

### 4.3 Runtime binding

The shell resolves a durable binding into a live attachment:

```text
projectID + scoreID + bindingID
                 |
                 v
scoreSessionID + runID + toolViewID + toolSessionID
```

Several scores and several Field views may coexist. Every message and sample capture carries enough
identity to reject cross-session and late-run data.

## 5. Runtime ownership

```text
AWB shell
  |- project/config file grants
  |- score-session registry
  |- hosted SC and NodeManager brokers
  |- Field sample-transfer broker
  `- view lifecycle

desktop sclang / scsynth
  |- PScoreTimelinePlayer: score execution and transport
  |- ScoreAudioSession: groups, private buses and fail-safe master mixer
  `- FieldModellingTool ToolSession
       |- associates routes with realization/node identity
       |- installs/removes capture nodes
       `- produces bounded, simultaneous sample windows

Field renderer
  |- field config and camera/display state
  |- score transport and realization projection
  |- instrument-specific field component expansion
  |- phase fitting and refusal
  `- live Three.js or deterministic render adapter
```

NodeManager remains optional for ordinary tool operation. Advanced hosted realization visibility
and tracking depend on it. Disabling Track changes projection/recording visibility; it never stops
sound or tears down the score-session mixer.

## 6. SuperCollider audio topology

The required ordering is explicit:

```text
root
  score source group
    realization synths -> allocated private stereo buses
  field observation group
    capture/monitor synths read those buses
  score master group
    mixer sums private buses -> hardware output 0/1
```

`ScoreAudioSession` owns the source and master groups and survives Field view closure. The Field
Tool owns only its observation nodes and associated buffers.

### 6.1 Reroutability

Before creating a private route, inspect the exact compiled SynthDef interface. Send an output-bus
argument only when the SynthDef declares one. scsynth silently ignores unknown controls, so
blindly sending `out` is forbidden.

Classify every realization as:

- `isolated`: routed to its own private stereo bus;
- `shared`: intentionally shares a declared route with other realizations;
- `master-only`: audible in the final mix but not isolatable;
- `unsupported`: no defensible Field projection.

Fixed-output legacy SynthDefs may continue to play. They must not be presented as isolated or
phase-verified. Refactoring them to accept an output bus is separate, named work.

### 6.2 Resource policy

Audio-bus allocation is internal to scsynth and independent of physical output count, but it is
still bounded. Allocation failure must be visible and recoverable. The first implementation may
set a conservative maximum number of simultaneous isolated routes; it must never alias two routes
silently.

## 7. Phase observation and sample transfer

The current fitter solves all known components jointly against synchronised left/right samples,
tests conditioning, rejects contamination and applies one coherent phase correction. Preserve
those semantics.

### 7.1 Capture behaviour

- All channels in one capture share the same start/end sample boundary.
- Capture occurs before the final hardware output.
- Begin with the complete stereo premaster mix. Add separated private routes only when the joint
  fit reports unresolved components or excessive residual.
- Capture is armed when the component signature changes and periodically while visual sync is on.
- Start with the shortest useful window and grow only when the fit says it is unresolved.
- Capture/transfer happens off the audio thread; the server writes to buffers and completion is
  reported asynchronously.

### 7.2 Logical protocol

The transport may use bounded OSC chunks relayed through the shell or a later local binary service,
but the semantic framing is fixed:

```text
request:
  clientID requestID toolSessionID scoreSessionID runID
  routingGeneration requestedSeconds

begin:
  requestID captureID scoreSessionID runID routingGeneration
  sampleRate frameCount routeCount chunkCount

route metadata:
  captureID routeID channelCount realizationCount realizationIDs...

chunks:
  captureID routeID channel chunkIndex values...

end:
  captureID frameCount routeCount chunkCount
```

Requirements:

- bounded frames, routes, chunks and total bytes;
- idempotent request IDs;
- complete-snapshot retry after a missing or malformed chunk;
- atomic publication only after every chunk and identity field validates;
- stale `runID` or `routingGeneration` captures are discarded;
- no unbounded float arrays in JSON lifecycle IPC;
- sample payloads do not pass through Electron main-process state snapshots.

The first transport spike must measure a representative 0.5 s stereo capture and an eight-stereo-
route capture before fixing chunk sizes or resynchronisation cadence.

### 7.3 Phase-fit package

The earlier extraction plan correctly left `phaseFit.js`/`phaseLock.js` application-local because
there was only one consumer. That condition has now changed. During cutover both the existing app
and the AWB Field tool require the same validated fitter, and deterministic Field rendering needs
the same phase-anchor interpretation.

Extract a React-free `@awb/phase-fit` package without changing the maths. Preserve the existing
phase-fit, phase-lock and headed real-audio gates before adding desktop capture support.

### 7.4 SC-side calculation

Do not replace the fitter with independent FFT bins, `Pitch`, or one demodulator per frequency.
Those do not preserve the joint stereo conditioning which separates close components. An SC-side
implementation is acceptable later only if it reproduces the existing fixtures, refusal cases,
residual measure and shared time reference.

## 8. Score and NodeManager projection

For every supported live realization, derive a Field voice from:

- canonical score event and stable `entryID`;
- `scoreID + revision + runID + realizationID`;
- concrete `nodeID` values reported by the executor;
- exact SynthDef interface from the hosted context;
- Event-resolved parameters and array expansion;
- subsequent set/release/free events;
- NodeManager-reported commanded state where available;
- Field-config mapping and instrument-specific projection adapter.

Do not infer score membership from NodeManager. Do not merge unscored live nodes into the authored
score. They may appear as explicitly external live sources when a supported projection exists.

The render clock advances analytic phase between waveform anchors. Release and completion follow
realization lifecycle rather than the end of score emission.

## 9. AWB Field tool

Add an installable tool artifact and manifest, provisionally:

```json
{
  "schema": "awb.tool/1",
  "id": "field-modelling",
  "name": "Field Modelling",
  "version": "0.1.0",
  "renderer": {
    "entry": "dist/index.html",
    "preloadProtocol": 1,
    "crossOriginIsolated": false
  },
  "view": {
    "defaultWidth": 1440,
    "defaultHeight": 900,
    "allowMultiple": true
  },
  "launchProfiles": [
    { "id": "standalone", "label": "New analytic field" },
    { "id": "attached", "label": "Attach to score session" }
  ],
  "capabilities": {
    "filesystem": ["open-file", "save-file"],
    "media": [],
    "connections": ["hosted-field"]
  },
  "documentKinds": [
    {
      "id": "field-config",
      "label": "Field Config",
      "extensions": ["field.json"],
      "actions": ["new", "recent", "browse"],
      "profileID": "standalone"
    }
  ]
}
```

The final connection policy must grant only the field, SynthDef-context and required scoped
NodeManager prefixes. It must not inherit Score Studio's complete command grant by convenience.

Toolkit Home and an open score project expose:

- New Field setup;
- Open/Recent Field setup;
- Add existing config to score project;
- Open an associated setup attached to this score session;
- detach the live view without deleting its config or stopping audio.

## 10. Shared render pipeline

The implementation in `feature/shared-render-pipeline` is the correct offline boundary, with one
necessary terminology correction.

There are two Field render modes:

- **analytic preview:** no runtime input required; phases are declared in producer state and evolve
  from the deterministic render clock;
- **realized score field:** bound to a score/config pair and supplied with waveform-derived phase
  observations or an equivalent validated phase track.

Therefore “Field requires no inputs” must not become a universal fidelity claim. Schema-v2 typed
inputs already support the correct form:

```json
{
  "inputs": [
    {
      "id": "score",
      "kind": "score",
      "artifactHash": "sha256:...",
      "locator": "./attunement-01.score.json",
      "metadata": { "scoreID": "attunement-01", "revision": 7 }
    },
    {
      "id": "phase-observations",
      "kind": "field-phase-track",
      "artifactHash": "sha256:...",
      "locator": "./field/attunement-01.phase.json",
      "metadata": { "sampleRate": 48000 }
    }
  ]
}
```

A render-job resolver reads the score-project association, freezes the Field config and resolves
the required artifacts. Rendering or capturing SuperCollider audio is an upstream job and is not
hidden inside the visual producer.

The live adapter and analytic export producer now use the same React-free Three.js/WebGL controller
in `@awb/field-renderer`. The Electron parity gate checks repeat stability, phase advancement and
live/export pixels at landmark frames. This does not widen the current analytic-only claim or add
the future phase-observation contract.

## 11. Migration slices

### F0 — freeze the baseline

- Run the existing field package, phase-fit, real headed phase-lock, instrument voice, browser,
  build and lint gates under Node 22.
- Capture representative screenshots and numeric probe readings for two known configurations.
- Record the exact source commit and keep the old application runnable through the migration.

### F1 — documents and association

- Define and test `awb.field-config/1`.
- Define and test `awb.score-project/1` with guarded relative-path resolution.
- Add shell New/Recent/Browse handling and associated-tool actions.
- Prove save/reopen without changing the score revision.

### F2 — application-preserving shell port

- Create the Field tool artifact and neutral host adapter.
- Port the existing panels and reducer behind shell file grants.
- Remove localStorage as canonical persistence; an explicit one-time importer may preserve old
  saved setups.
- Keep standalone analytic operation working before adding hosted attachment.

### F3 — WebGL renderer extraction

- Move the Three.js scene, camera and frame tick into `@awb/field-renderer` without changing the
  field maths or appearance.
- Keep React as an adapter around the renderer.
- Run both live and fixed-frame consumers through the same renderer core.
- Establish landmark-frame parity before deleting the source copy.

### F4 — hosted semantic attachment

- Attach one Field view to one score session.
- Consume transport, revision and realization lifecycle.
- Project known instruments through `@awb/field-engine`.
- Show unsupported and master-only realizations honestly.
- Prove two simultaneous score sessions cannot cross-attach.

### F5 — score audio session and routing

- Add ordered source/observation/master groups.
- Add private stereo-bus allocation for explicitly reroutable SynthDefs.
- Add the fail-safe master mixer.
- Prove attaching, detaching or crashing the Field renderer does not interrupt the listening mix.
- Measure resource limits and expose allocation failure.

### F6 — sample capture and phase lock

- Implement simultaneous premaster `RecordBuf` capture.
- Implement bounded recoverable transfer through the shell.
- Extract `@awb/phase-fit` unchanged, then adapt it to captured desktop windows.
- Preserve signature-change debounce, silence/envelope/splice refusal, residual reporting and
  periodic resynchronisation.
- Add separated routes only after the master-mix fit demonstrates a real failure case.

### F7 — deterministic rendering

- Resolve a score project plus Field config into a schema-v2 render job.
- Materialise or select phase observations when the output claims realized-audio correspondence.
- Render through the shared pipeline and store an execution receipt naming score, config, producer,
  phase artifact and output hashes.
- Keep analytic-preview output explicitly distinguishable.

### F8 — cutover

- Run old and new applications side by side against the same setup and live score.
- Confirm physics, camera, probes, phase lock and audio remain equivalent.
- Make AWB canonical only after parity gates pass.
- Leave `field_modelling` as a pinned consumer/reference until its own repository documentation and
  browser/audio integration gates point to the committed AWB artifact.

## 12. Acceptance gates

The import is not complete merely because the tool opens.

### Documents and sessions

- A score project reopens the same score, Field config and Lissajous config using relative paths.
- Saving a visual config does not change the score revision.
- Two open scores with two Field views retain distinct session/run identity.
- A stale capture from a previous run is rejected visibly.

### Audio safety

- With no Field view open, the score plays through the ordinary master path.
- Attaching and detaching the Field Tool produces no silence, duplicate mix or level jump.
- Closing or crashing the renderer leaves sound playing.
- Unknown or fixed-output SynthDefs are never falsely labelled isolated.
- Bus exhaustion fails explicitly and does not alias routes.

### Field fidelity

- Package projection/probe tests remain unchanged.
- Two saved source configurations match numeric probe readings after import.
- WebGL landmark frames match the source application within an agreed image tolerance.
- The real headed phase gate passes against desktop SC audio, not only synthetic fixtures.
- Phase correction refuses silence, unstable envelopes, contaminated residuals and malformed
  captures rather than applying confident bad locks.
- A long run demonstrates bounded phase drift with periodic resynchronisation.

### Render fidelity

- Analytic preview renders without an audio input and is labelled analytic.
- A realized-score render records score, config and phase-observation hashes.
- Lissajous and Field jobs use the same scheduler/sink contract without sharing producer policy.
- Fixed frame counts, cancellation, cleanup and receipts remain valid locally and through any later
  provider adapter.

## 13. Explicitly out of scope

- Replacing Score Studio or adding a second score editor to the Field tool.
- Inferring a physical field from arbitrary SynthDefs.
- Turning the Field Tool into a general DAW mixer.
- Streaming continuous raw audio over the timeline or NodeManager OSC protocols.
- Making physical output channels correspond one-to-one with score voices.
- Rewriting the phase algorithm during extraction.
- Body solver integration, room-measurement acquisition or automation recording.
- Replacing Lissajous's continuous native-audio path with Field's sparse phase captures.
- Packaging/signing or remote rendering beyond the shared pipeline interfaces already defined.

## 14. Handoff boundaries

This work can be split without conflicting ownership:

- **AWB shell/document lane:** schemas, score-project resolver, manifests, file grants and associated
  tool launch UI.
- **Field renderer lane:** Three.js extraction, live adapter, deterministic producer and parity
  gates.
- **awbCollider lane:** `ScoreAudioSession`, groups, bus allocation, fail-safe mixer,
  `FieldModellingTool` and sample capture.
- **Transport lane:** bounded sample protocol and shell broker, with real volume/recovery tests.
- **Integration lane:** score realization projection, phase-fit adapter, two-score isolation and
  long-run audio/visual verification.

No lane should silently change the canonical score schema, the SynthDefs, the existing Field maths
or the shared render-job contract. Any required change to one of those is a named prerequisite with
its own fixtures and migration note.
