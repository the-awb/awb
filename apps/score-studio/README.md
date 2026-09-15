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
authored `note` is one stable row and one bar. The bar's left edge is its create time and its right
edge is the earliest explicit `release`/`free` or derived sustain boundary. `set`, `release` and
`free` entries appear as compact ticks; disclosing the row reveals labelled authored boundaries
that can be selected and dragged. A derived auto-release is shown, but cannot be dragged because
there is no separate canonical entry to edit.

Dragging a structural event or synth bar changes that entry's absolute `time`; dragging a
disclosed boundary changes the canonical control entry shared by every affected synth row. Existing
multi-selection moves rigidly. Row order is view state and remains stable while and after times are
changed. Zoom preserves the visible time around the viewport centre, while Fit shows the complete
working duration.

A frequency-lane view is a later projection over the same score, not a new score format. Its
vertical axis may be continuous Hz or an explicit just-intonation lattice. The JI form must carry
an explicit reference frequency and allowed ratios; the editor must not infer a tonic or collapse
non-ratio frequencies onto a scale silently.

The inspector offers typed controls for event type, SynthDef/target, existing scalar fields, and
numeric or boolean controls declared by `@awb/instruments`. They edit the same draft shown in the
raw JSON area and enter the canonical document together on Apply. Arrays, envelopes and nested
objects remain raw JSON until their semantics justify a dedicated editor. This UI belongs in Score
Studio; payload-blind `@awb/score` remains unchanged.

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

`src/engine/scorePairSave.js` fixes the order and failure semantics before the desktop protocol is
extended. The editor writes canonical JSON first. Only after that succeeds does it call a
transport-neutral projection provider with `scoreID`, `revision`, canonical `contentHash` and
projection kind. Returned SC text is rejected unless all three source-identity fields match.

The editor then writes or downloads the `.score.scd` projection. If generation or the second write
fails, the result is explicitly `partial`: canonical data remains safely saved and the exact
identity needed to retry is retained. Retry is refused after any document mutation. A canonical
write failure requests no projection at all.

Desktop `ScoreSclangConnector.savePair` is useful for desktop-owned files, but it should not be
exposed wholesale to this editor: sending canonical paths to sclang would make the execution host
a persistence authority. The hosted protocol still needs a bounded projection-text response that
implements the browser's `requestProjection(identity)` interface.

The matched PR #7440 wasm assets are app-owned under `public/scsynth` and `public/sclang`; the
reusable lifecycle and console machinery remains in `@awb/sc-wasm` and `@awb/sc-console`.

```sh
cd ~/awb
npm install
npm run dev --workspace @awb/score-studio
npm run dev:hosted --workspace @awb/score-studio -- --osc-port 57120
npm run test:hosted-real --workspace @awb/score-studio
npm run test:hosted-browser-real --workspace @awb/score-studio
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

`test:hosted-real` temporarily derives a test language configuration from the user's live config,
removing only the exact `classes WIP` exclusion without modifying the live file. It starts the real
desktop bridge fixture, sends the eleven-event `sonic-attunement-01` document through the same
Score Studio client and WebSocket sidecar, seeks to its 773-second final onset, and exits without
playing the fourteen-minute work.

`test:hosted-browser-real` adds the actual Chromium editor surface to that path: it opens the real
document through the file-input fallback, verifies eleven timeline entries, connects, installs the
revision and drives the UI playhead/seek to 773 seconds. It likewise never presses Play.

Each WebSocket connection receives its own UDP reply socket. Frames are exactly
`{ "address": "/awb/timeline/...", "args": [...] }`; other OSC namespaces, non-scalar arguments,
oversize frames, non-loopback WebSocket access and clients without the generated token are
rejected. The browser retries timed-out commands with the same request ID and restarts a complete
snapshot after incomplete-snapshot rejection.
