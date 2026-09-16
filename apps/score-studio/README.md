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
- a score-derived instrument panel showing each referenced SynthDef, usage, authored controls,
  compiled browser controls and catalogued envelope roles;
- a separate live Instruments workspace with one controllable browser synth per catalogue entry;
- guarded File System Access saves, with JSON download fallback and local recovery drafts;
- a bundled eleven-event Sonic Attunement demo plus a session-local folder browser for `.score.json` files;
- an editor-owned pair-save coordinator: canonical JSON first, identity-bound SC projection second,
  with recoverable partial success;
- explicit hosted/standalone mode surfaces;
- a token-protected localhost WebSocket-to-OSC sidecar for hosted desktop execution;
- browser-owned standalone playback through scsynth.wasm, with app-owned compiled SynthDefs;
- the extracted `@awb/sc-console` editor and post window;
- a read-only slot for generated SC working documents, with desktop-score and browser-Pseq targets
  retained in local app data by score ID, revision and projection kind.

The desktop agent owns SC normalization, `PTimelineOSCBridge`, transport reporting, command
deduplication, chunked loading, NodeManager correlation and generated SC documents. This app does
not duplicate those responsibilities. The app-owned sidecar forwards the frozen
`/awb/timeline/...` vocabulary between WebSocket JSON frames and local OSC; it contains no score
or scheduling policy. Standalone scheduling stays in the browser and does not pass through the
desktop bridge.

## Playback readiness

Connection, score installation and playback readiness are separate states. `@awb/sc-runtime`
defines their shared result shape and `canPlay` policy, but it does not implement a handshake.
The browser adapter retains the Web Audio/scsynth.wasm boot sequence, including AudioContext state
and SynthDef loading. The desktop adapter retains sclang `Server` and SynthDescLib checks and
reports them through `/awb/timeline/runtime`.

Hosted Play is disabled and the bridge rejects `play` or `resume` while the desktop server is
offline, the selected revision is absent or a required SynthDef is unknown to the language.
Standalone mode exposes the same readiness meaning from its different evidence. A `ready` report
means that the selected host can accept and realize the score; it is not proof that an external
audio device or loudspeaker is producing sound.

Desktop definition checking currently uses `SynthDescLib`: it proves that sclang knows the
definition, while the bridge separately proves that the server is running. scsynth has no
side-effect-free “is this SynthDef installed?” query. A server restarted outside the normal
definition-restoration path can therefore invalidate that inference; an eventual score-project
dependency loader should own sending the definitions and `/sync`, then report stronger evidence.

## Timeline views and editing

The synth lifecycle view is a projection of the canonical entries, not another score model. Each
authored `note` is one stable row and one bar. The bar's left edge is its create time and, when the
event contains `dur`, its right edge is that authored event-duration boundary. It is not silently
relabelled as gate time, sustain or node completion. A release boundary marks when the gate closes;
an explicit `free` ends the runtime node immediately. `set`, `release` and
`free` entries appear as compact ticks; disclosing the row reveals labelled authored boundaries
that can be selected and dragged. A derived auto-release is shown, but cannot be dragged because
there is no separate canonical entry to edit. Such a boundary exists only when the instrument
catalog contains an explicit score-duration-to-gate contract.

Dragging a structural event or synth bar changes that entry's absolute `time`; dragging a
disclosed boundary changes the canonical control entry shared by every affected synth row. Existing
multi-selection moves rigidly. Row order is view state and remains stable while and after times are
changed. Zoom preserves the visible time around the viewport centre, while Fit shows the complete
working duration.

The collapsed row shows the amplitude envelope. Expanding it shows every envelope currently
declared for the SynthDef, labelled by function and target. The Substrates therefore disclose
amplitude, beat-modulation and tremolo envelopes, including their actual release-delay expressions;
`resonantBassEnv2` discloses its gated amplitude ASR, `dur`-length frequency triangle and phase
percussion envelope. Only the amplitude EnvGen with `Done.freeSelf` is node-completion authority.
The other envelopes describe parameter motion, but `resonantBassEnv2` deliberately also consumes
the standard Event `dur` value so that motion tracks the Event span. Its eventual lifecycle
projection must combine Event duration resolution with the SynthDef's `sustain`-based amplitude
EnvGen.

For SynthDefs with directly editable `attackT` and `releaseT` controls, dragging amplitude handles
writes those values through to the payload inspector live. The document revision and undo history
are committed once, on pointer release. Derived or coupled boundaries remain inspector edits rather
than pretending the SynthDef has an independent control. The main bar's duration handle always
edits canonical `dur` directly. It never manufactures `sustain` or `legato`, and an explicit
release trigger remains a separate authored event. Envelope strips are a timing projection of the
declared graph, not sampled curvature; arbitrary envelope-shape editing remains later work.

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

The Instruments panel is likewise a projection rather than a second document model. It deduplicates
the `def`/`instrument` references in the current score, reports their entry count, time span and
paths, and distinguishes controls actually authored in Event payloads from the complete settable
control surface recorded in the compiled SynthDef manifest. Catalogued envelope roles come from
`@awb/instruments`; an uncatalogued SynthDef still appears. Browser-bundle presence is known
locally. Hosted availability is labelled unknown because the timeline protocol's aggregate
readiness result does not expose a per-definition desktop inventory.

## Live instrument workspace

The main **Instruments** tab is deliberately not the score-derived inspector described above. It
is a browser-local live rack over the complete `@awb/instruments` catalogue. Each instrument gets
one owned scsynth node, the full scalar control surface from the compiled SynthDef manifest, and
catalogue-aware sliders or boolean controls where semantic editor metadata exists. Uncatalogued
test definitions do not appear in this rack.

**Start** boots/resumes scsynth, loads all four library SynthDefs and creates that instrument with
the visible values. Control edits reach the running node immediately through `/n_set`. Pause uses
`/n_run`; Release sends `gate=0` and waits for the SynthDef's own envelope/done action; Free sends
`/n_free` immediately. Reset restores the actual manifest defaults, including `amp`. The rack must
not quietly attenuate that control: these SynthDefs already contain their own output scaling, so an
extra `0.1` made them practically silent. Each card reports its catalogue-derived amplitude attack
and release timing; `running` means that the node exists, not that a 12- or 30-second attack has
reached an audible level. Release all and Free all operate only on rack-owned library nodes, not
score realizations.

This remains browser-local even when the selected score mode is Hosted. The timeline bridge is a
score execution protocol, not a generic remote-control channel. Desktop live instrument control
belongs on the NodeManager tool route when that adapter is added.

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
Automatic gate release is currently scheduled only when `@awb/instruments` declares an explicit
lifecycle mapping for that SynthDef. The existing executor does not inject `sustain` or assume a
default `legato`. That leaves `resonantBassEnv2` incomplete: its `dur` is both Event timing and an
intentionally matching modulation control, while its freeing amplitude EnvGen is based on
Event-resolved `sustain`. Reproducing that Event-to-SynthDef mapping is the next lifecycle adapter
correction; the current player still requires an authored release/free boundary for this def.
Pause uses `/n_run`; stop and event-boundary seek hard-free only nodes belonging to this execution
session.

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

**Generate SC document** is available in every mode. With a hosted connection it installs the
current revision when necessary, requests the desktop identity-checked projection, and opens its
read-only working-document view without saving it. Local generation offers two explicit targets:

- **Desktop score** preserves the absolute-time entry and lifecycle vocabulary in a generated
  `PScoreTimelinePlayer` document.
- **Browser Pseq reduction** emits only note events as a finite `Pseq` for the bundled sclang. It
  converts absolute onset gaps to `delta`, preserves authored `dur`, `sustain` and `legato`
  unchanged, and names every omitted non-note lifecycle entry in the header. In particular it does
  not manufacture `sustain` when the score has none. It is deliberately not described as a lossless
  score projection.

Both local outputs are stored in browser app data under score ID, canonical revision and target;
Generate no longer opens a save picker or forces a download. Reopening the matching canonical
revision restores its stored working document. Ordinary Save remains the explicit filesystem
operation.
**Open SC document** remains hosted-only: it installs first, then asks desktop SuperCollider to
generate and open the document. Ordinary Save remains the operation that persists canonical JSON
and the hosted `.score.scd` as a guarded pair.

A fresh browser connection may not yet know which revision desktop sclang already holds. Before
installing in that state, the client issues an unguarded read-only `state` command for the score ID,
then uses the returned revision as the guarded snapshot expectation. `-1` is retained only for an
`unknownScore` response. Reconnecting therefore cannot mistake an existing score for a new one or
blindly overwrite it.

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

`dev:hosted` starts both Vite and a localhost sidecar on an OS-assigned free port, generates a
fresh capability token, and injects its endpoint into the app. The dynamic sidecar port prevents
an abandoned or concurrent editor session from blocking a new launch; `--ws-port PORT` remains
available when a fixed port is specifically required. Port 57120 is sclang's usual language port;
pass the actual port used by the desktop bridge when it differs. A separately hosted UI can run
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
