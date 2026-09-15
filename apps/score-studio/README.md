# AWB Score Studio

A clean development host for the canonical AWB score. It deliberately has no source or runtime
dependency on `field_modelling`: that application may consume finished score packages and
artifacts later, but it is not the development shell for this work.

Current first slice:

- canonical `awb.score/1` JSON documents from `@awb/score`;
- authored document revisions kept separate from runtime/realization state;
- an absolute-time score view exposing all seven canonical time/structure verbs;
- switchable structural and one-row-per-authored-synth lifecycle projections, with timeline zoom;
- direct timeline dragging of authored entries and disclosed synth control boundaries;
- direct time, path and typed/raw payload editing with revision-safe undo/redo;
- guarded File System Access saves, with JSON download fallback and local recovery drafts;
- a bundled eleven-event Sonic Attunement demo plus a session-local folder browser for `.score.json` files;
- an editor-owned pair-save coordinator: canonical JSON first, identity-bound SC projection second,
  with recoverable partial success;
- explicit hosted/standalone mode surfaces;
- a token-protected localhost WebSocket-to-OSC sidecar for hosted desktop execution;
- browser-owned standalone playback through scsynth.wasm, with app-owned compiled SynthDefs;
- the extracted `@awb/sc-console` editor and post window;
- a read-only slot for the generated `.score.scd` working document.

The desktop agent owns SC normalization, `PTimelineOSCBridge`, transport reporting, command
deduplication, chunked loading, NodeManager correlation and generated SC documents. This app does
not duplicate those responsibilities. The app-owned sidecar forwards the frozen
`/awb/timeline/...` vocabulary between WebSocket JSON frames and local OSC; it contains no score
or scheduling policy. Standalone scheduling stays in the browser and does not pass through the
desktop bridge.

## Timeline views and editing

The synth lifecycle view is a projection of the canonical entries, not another score model. Each
authored `note` is one stable row and one bar. The bar's left edge is its create time. A release
boundary marks when the gate closes; the right edge includes the SynthDef's amplitude-envelope
release tail and therefore marks predicted node completion. An explicit `free` still ends it
immediately. `set`, `release` and
`free` entries appear as compact ticks; disclosing the row reveals labelled authored boundaries
that can be selected and dragged. A derived auto-release is shown, but cannot be dragged because
there is no separate canonical entry to edit.

Dragging a structural event or synth bar changes that entry's absolute `time`; dragging a
disclosed boundary changes the canonical control entry shared by every affected synth row. Existing
multi-selection moves rigidly. Row order is view state and remains stable while and after times are
changed. Zoom preserves the visible time around the viewport centre, while Fit shows the complete
working duration.

A thin strip below each synth bar shows coarse attack, gate-open and release lengths. For
SynthDefs with independent `attackT` and `releaseT` controls, dragging its handles writes those
values through to the payload inspector live. The document revision and undo history are committed
once, when the handle is released, rather than once per pointer movement. `resonantBassEnv2` is deliberately shown as coupled:
both sides derive from `sustain * ampEnvRatio`, so those controls are edited in the inspector
rather than presenting independent handles the SynthDef does not actually have. This is a duration
model, not sampled envelope curvature; shaped envelope editing remains later work.

The handle on the main bar marks the gate boundary rather than the end of the release tail. For a
derived auto-release it edits authored `sustain`, or `dur` through the current `legato` when
`sustain` is absent. When an explicit `release` entry owns the boundary, the same handle moves that
entry instead. This keeps note duration, envelope release and final node completion visibly
separate.

Ruler intervals adapt to zoom using 1/2/5 steps with a minimum label spacing. A fitted fourteen-
minute score therefore uses minute-scale labels instead of drawing five-second text on top of
itself; close zoom progressively exposes seconds and fractional seconds. Synth lifecycle is the
default score layout, and each newly opened/replaced document is fitted once when that layout is
shown. Fit may go below one pixel per second for long scores; the zoom readout retains decimals in
that range. Ordinary edits preserve the user's current zoom and scroll position.

A frequency-lane view is a later projection over the same score, not a new score format. Its
vertical axis may be continuous Hz or an explicit just-intonation lattice. The JI form must carry
an explicit reference frequency and allowed ratios; the editor must not infer a tonic or collapse
non-ratio frequencies onto a scale silently.

The inspector offers typed controls for event type, SynthDef/target, existing scalar fields, and
numeric or boolean controls declared by `@awb/instruments`. They edit the same draft shown in the
raw JSON area and enter the canonical document together on Apply. Arrays, envelopes and nested
objects remain raw JSON until their semantics justify a dedicated editor. This UI belongs in Score
Studio; payload-blind `@awb/score` remains unchanged.

## Score files and demo

**Demo score** opens a bundled canonical snapshot of the real eleven-event, fourteen-minute Sonic
Attunement 01 score. Its source and pinned awbCollider commit are recorded under
`public/examples/`; it is ready to play without navigating to another repository.

**Open folder…** asks for a local directory and lists its top-level `.score.json` files in the
sidebar. Opening one retains its file handle, so ordinary Save writes back through the existing
external-change guard. The directory handle is intentionally session-local for this first slice;
persisting filesystem permission in IndexedDB is later work. Chromium supports directory access;
other browsers keep the ordinary Open file fallback.

The file boundary also recognises the narrow pre-schema AWB shape `{ scoreID, revision, entries }`
used by the original real-score example. It adds required schema/default metadata, marks the result
unsaved, and requires an explicit Save to replace or create a canonical `awb.score/1` document.
Other invalid documents remain errors rather than being guessed into shape.

Plain SuperCollider source import is not implemented in Score Studio. The desktop connector can
normalize an already-evaluated collection of supported score entries and can generate the paired
`.score.scd` projection, but neither side currently performs the inverse projection. In
particular, the browser must not parse or execute arbitrary `.scd`. A future compatibility import
should run in desktop sclang, accept only connector-generated `PScoreTimelinePlayer` or explicitly
supported literal shapes, and return canonical data for review before the editor adopts it.

## Standalone execution

`src/engine/StandaloneScoreExecutor.js` plays the same canonical revision directly through the
browser's scsynth.wasm. It schedules every boundary from one absolute score-time anchor rather
than accumulating delays. Stable same-time document order is preserved.

The first adapter handles `note`, `set`, `release` and `free`. Note control arrays use
SuperCollider-style wrap expansion, producing one browser-owned realization per expanded value.
Targets may be an authored note entry ID, a browser node ID, `@prev`, `@all`, or an array of those.
An omitted `sustain` follows SC's ordinary `dur * legato` rule with `legato = 0.8`. Pause uses
`/n_run`; stop and event-boundary seek hard-free only nodes belonging to this execution session.

This is intentionally not full state-reconstructing seek: a note that began before the target is
not recreated. Array-expanded `set` controls and path/group targeting are also refused or absent
rather than guessed. Unsupported event types fail score loading instead of disappearing silently.

Compiled assets live under `public/synthdefs/`, with provenance recorded beside them. They are
host assets, like `public/scsynth/` and `public/sclang/`; neither `@awb/score` nor `@awb/sc-wasm`
owns authored instrument implementations.

## Hosted save ownership

`src/engine/scorePairSave.js` fixes the order and failure semantics. The editor writes canonical
JSON first. Only after that succeeds does it call the desktop through the bounded
`/awb/timeline/projection/...` exchange, supplying `scoreID`, `revision`, canonical `contentHash`
and projection kind. Returned SC text is rejected unless all three source-identity fields match.

The editor then writes or downloads the `.score.scd` projection. If generation or the second write
fails, the result is explicitly `partial`: canonical data remains safely saved and the exact
identity needed to retry is retained. Retry is refused after any document mutation. A canonical
write failure requests no projection at all.

Desktop `ScoreSclangConnector.savePair` is useful for desktop-owned files, but it should not be
exposed wholesale to this editor: sending canonical paths to sclang would make the execution host
a persistence authority. Score Studio instead implements `requestProjection(identity)` over the
protocol added in awbCollider `f56a4d5`. Missing text chunks keep the request pending and cause an
idempotent retry; the bridge then replays the same cached begin/chunks/end/result response.

The matched PR #7440 wasm assets are app-owned under `public/scsynth` and `public/sclang`; the
reusable lifecycle and console machinery remains in `@awb/sc-wasm` and `@awb/sc-console`.

```sh
cd ~/awb
npm install
npm run dev --workspace @awb/score-studio
npm run dev:hosted --workspace @awb/score-studio -- --osc-port 57120
npm run dev:hosted --workspace @awb/score-studio -- --osc-port 57120 --vite-port 5201 --score /path/to/piece.score.json --tool-session SESSION_ID --open
npm run test:hosted-real --workspace @awb/score-studio
npm run test:hosted-browser-real --workspace @awb/score-studio
npm run test:launched-hosted-real --workspace @awb/score-studio
npm run test:standalone-audio --workspace @awb/score-studio
npm run test:standalone-real --workspace @awb/score-studio
```

The dev server is pinned to <http://localhost:5201> and supplies the cross-origin isolation headers
required by scsynth.wasm.

`dev:hosted` starts both Vite and the localhost sidecar, generates a fresh capability token, and
injects its endpoint into the app. Port 57120 is sclang's usual language port; pass the actual port
used by the desktop bridge when it differs. A separately hosted UI can run
`npm run hosted-bridge --workspace @awb/score-studio -- --osc-port PORT` and paste the printed
token-bearing endpoint into the Hosted runtime panel.

The optional `--score` path is validated as a canonical `awb.score/1` document and exposed only at
the development server's fixed initial-score endpoint; it is not embedded in the browser URL and
does not enable general filesystem access. `--tool-session` makes the browser identify the
language-side ToolSession during its OSC hello. With both values present, Score Studio loads the
source document, connects, and installs its revision automatically. `--open` asks Vite to open the
system browser.

`test:hosted-real` temporarily derives a test language configuration from the user's live config,
removing only the exact `classes WIP` exclusion without modifying the live file. It starts the real
desktop bridge fixture, sends the eleven-event `sonic-attunement-01` document through the same
Score Studio client and WebSocket sidecar, validates a bounded generated `PScoreTimelinePlayer`
projection, seeks to its 773-second final onset, and exits without playing the fourteen-minute work.

`test:hosted-browser-real` adds the actual Chromium editor surface to that path: it opens the real
document through the file-input fallback, verifies eleven timeline entries, connects, installs the
revision, downloads canonical JSON plus the identity-matched generated SC projection, displays that
projection as the working document, and drives the UI playhead/seek to 773 seconds. It likewise
never presses Play.

`test:launched-hosted-real` covers the desktop entry point itself: real sclang creates the
`ScoreStudioTool` ToolSession, the hosted process receives its session ID and canonical source-score
path, Chromium loads the score, handshakes with that exact session and installs the revision without
manual Connect or Load actions.

Each WebSocket connection receives its own UDP reply socket. Frames are exactly
`{ "address": "/awb/timeline/...", "args": [...] }`; other OSC namespaces, non-scalar arguments,
oversize frames, non-loopback WebSocket access and clients without the generated token are
rejected. The browser retries timed-out commands with the same request ID and restarts a complete
snapshot after incomplete-snapshot rejection.
