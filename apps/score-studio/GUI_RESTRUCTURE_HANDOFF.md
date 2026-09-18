# Score Studio GUI restructure and smart-seek handoff

Status: Slices A, B, C, C.1, D and E are present in the current integration history. Smart seek is
temporally correct but not yet acoustically position-aware: a reconstructed sustain-phase note is
a fresh Synth and therefore currently restarts its authored attack and oscillator phase. This is
audible as an unintended soft fade when seeking into the middle of a long note. Slice F below is
the remaining envelope-aware reconstruction stage. The restructured UI still requires continuing
live acceptance. The old all-instrument rack remains available only to the browser host as a
compatibility surface. It is not exposed by the hosted-only shell.

Definition-library policy: desktop sclang/scsynth has one active process-global SynthDef library.
Tools and scores may legitimately provide different compiled graphs under the same visible symbol.
Loading the most recent tool or score therefore replaces that symbol after an explicit user warning;
it is not rejected and hidden server aliases are not introduced. A successful replacement advances
the host definition generation, invalidates cached interface models and makes the newly loaded graph
authoritative for subsequent score and audition realizations. Existing nodes keep the graph with
which they were created, as scsynth normally does.

This document describes the next Score Studio interface slice after commits `00004b1` and
`bac870e`. It is a layout and interaction refactor over the existing score, instrument and host
contracts. It must not create a second score model, executor, SynthDef registry or envelope format.

## 1. Purpose

Score Studio currently exposes the right machinery, but too much of it at once. The next pass
should make the timeline the main working surface and turn the surrounding panels into contextual
workspaces:

- the left rail owns document/runtime context and access to the instrument library;
- the centre owns transport and the score timeline;
- the bottom panel owns editing and audition for whatever is in focus;
- the right rail continues to show runtime inventories and realizations for now.

The interface should support two related actions without conflating them:

1. edit an authored score event;
2. audition a temporary realization of either that event or an arbitrary SynthDef.

Auditioning is disposable runtime activity. It does not create a score member until the user
explicitly performs a future insertion action.

## 2. Existing ownership that must remain intact

- Canonical authored data is the open `awb.score/1` document. While open, the editor owns its live
  revision. A saved file is a persistence checkpoint, not a competing in-memory authority.
- `PTimelinePlayer`/`PScoreTimelinePlayer` owns shell scheduling and transport. Every shell runtime
  is hosted: either shell-managed headless SuperCollider or a connection to an existing desktop
  context. The standalone executor owns scheduling only for a browser host that explicitly
  advertises it. The renderer must not invent a second clock.
- NodeManager observes and controls realized desktop objects through their owning context. It does
  not own score membership.
- The current execution context's SynthDef inventory is authoritative for availability. Interface
  models are built lazily from exact compiled bytes and keyed by fingerprint, not just name.
- `@awb/instruments` may add useful semantics for known definitions, but it is not the inventory of
  everything desktop SuperCollider can play.
- `@awb/sc-envelope` defines envelope values. `@awb/synthdef-interface` decides whether an actual
  SynthDef exposes an `envArray`, parametric envelope, or inspect-only baked envelope.
- The shell exposes only `hosted` execution. Headless versus connected is hosted topology reported
  by the host, not a score execution mode. Browser hosts may separately advertise standalone
  `scsynth.wasm`; hosted controls must never fall back silently to it.
- Hosted audition is a shell service with its own stable tool identity, provisionally
  `synthdef-audition`; it is not an extra role of `score-studio`, `PTimelineOSCBridge` or a
  score-owning ToolSession. Any authorised shell tool may submit an explicit audition request to a
  client-scoped audition session. The service must never discover or adopt unrelated shell voices.

Relevant implementation surfaces:

- `src/App.jsx` — current shell layout, file actions, runtime status and contextual state;
- `src/components/ScoreTimeline.jsx` — score selection, cursor and lifecycle projection;
- `src/components/InstrumentWorkspace.jsx` — current all-instrument live rack;
- `src/components/InstrumentPanel.jsx` — score/runtime instrument information;
- `src/components/EventPayloadEditor.jsx` — typed event payload controls;
- `src/components/EnvelopeEditor.jsx` — full editor for an authorised `envArray` envelope;
- `src/engine/StandaloneScoreExecutor.js` and `src/engine/HostedScoreClient.js` — execution seams.

## 3. Target layout

```text
+----+-----------+--------------------------------------+----------------+
|Act.| Left      | Transport                            | Right rail     |
|rail| content   +--------------------------------------+ loaded/runtime |
|[D] | panel     |                                      | instruments    |
|[I] |           | Score timeline                       | realizations   |
|    |collapsible|                                      | collapsible    |
+----+-----------+--------------------------------------+----------------+
| Bottom edit and audition panel — collapsible and vertically resizable       |
+------------------------------------------------------------------------------+
```

The left side follows the VS Code pattern: a narrow persistent activity rail owns the Document and
Instruments tabs, and a distinct adjacent content panel shows the selected tab. Collapsing the left
content panel leaves the activity rail visible. The left content panel, right rail and bottom panel
must each be independently collapsible. The bottom panel should also be vertically resizable. Panel
dimensions and collapsed state are view state, not score data; persist them per Score Studio view
when the host offers view preferences.

The existing transport strip remains above the timeline controls. Timeline cursor and playhead
remain separate: single click places/focuses, double-click seeks.

### 3.1 Left rail: Document tab

Move the following into the first left-rail tab:

- score title and document metadata;
- file name, score ID, revision, entry count and dirty/saved state;
- Save and Save As;
- SC projection state and generation actions where still useful;
- hosted topology (headless or connected), connection and readiness details;
- hosted Connect/Disconnect, Load revision, State and Open SC document actions;
- browser-only standalone engine/language preparation and shutdown actions when that host
  capability is present.

Toolkit Home is the desktop source of New, Open, Browse and Recents. Therefore the embedded AWB
shell view should not repeat New, Open or Demo score. Do not delete browser ingress blindly:
standalone web use still needs a host-provided Open/New route unless and until a web Toolkit Home
owns it. This should be expressed as host capabilities rather than a forked React tree.

### 3.2 Left rail: Instruments tab

Replace the current wall of fully expanded instrument cards with one searchable inventory and one
selection at a time.

Ordering is stable and deduplicated by definition identity:

1. SynthDefs referenced by the open score, pinned at the top;
2. other SynthDefs already loaded into Score Studio's working/audition context;
3. all other known/available instrument definitions.

Here **loaded** means selected, modelled, auditioned or otherwise admitted to this Score Studio
view—not merely present in `SynthDescLib.global`. In a hosted desktop context every inventory name
may already exist in `SynthDescLib`, which would otherwise make “loaded” and “all” the same list.
Score-referenced definitions stay pinned even when currently missing so the problem remains visible.

Definitions present in more than one category appear once, in their highest-priority category.
The list should show compact rows: name, source/category, availability, and fingerprint-change or
missing-state badges where relevant. Keep the search bar; search filters the unified list without
changing category ownership.

Opening the tab may refresh the cheap name inventory. Compiled graph transfer and
`@awb/synthdef-interface` construction remain lazy: build the detailed model only when a row is
selected, referenced by the score, or explicitly refreshed. Do not eagerly model hundreds of
SynthDefs merely to draw the list.

System and execution-context SynthDefs must appear in the available inventory even when the score
does not reference them and `@awb/instruments` does not catalogue them. Selecting or explicitly
loading one admits its exact name, context generation and fingerprint into this Score Studio view's
loaded set and creates an audition draft from the transferred compiled graph. System provenance
alone must not make a definition inspect-only: it is auditionable whenever its actual interface and
runtime lifecycle can be driven safely. If it cannot be auditioned, keep it visible and state the
specific missing control, routing or lifecycle capability. Browser-standalone mode may offer only
system definitions whose exact compiled binary is installed in that browser context.

Availability does not imply audible audition. Classify the transferred graph by its actual output
rate: **audio** has an audio-rate `Out`/`ReplaceOut`/`OffsetOut`; **control** has only control-rate
output; **utility** has no audio/control output path; **unknown** has not been modelled yet. Keep all
four visible because control and utility SynthDefs may still belong in a score. Only audio definitions
may proceed to the audition capability check, and audio output alone is not sufficient: routing and
lifecycle must also be safe. Never give a control or utility SynthDef a Play action that implies it
will produce sound.

Clicking an instrument row puts a SynthDef audition draft into the bottom panel. It does not start
a node and does not alter the score.

### 3.3 Centre

Keep the current transport strip and timeline toolbars above the timeline. Remove the event editor
from the right rail and place it in the bottom contextual panel.

Selection rules:

- single-clicking an authored event focuses it in the bottom panel and moves/selects according to
  the current timeline interaction;
- double-clicking timeline space or an event seeks through the selected executor;
- selecting an instrument in the left rail replaces bottom-panel scope with an instrument draft;
- clearing selection leaves the panel empty or showing its last scope according to an explicit UI
  policy; it must never edit a hidden arbitrary event.

### 3.4 Right rail

Keep the current runtime-oriented information here for this slice:

- loaded/active instrument information;
- runtime realizations and node state;
- missing-definition or execution diagnostics that belong to realized state.

This rail is a runtime projection, not an alternative instrument picker. Later work may simplify
it once the left inventory and bottom audition workflow have proved themselves.

## 4. Bottom edit and audition panel

The panel has exactly one explicit focus scope:

```text
none
scoreEvent { scoreID, documentRevision, entryID, draftID }
synthDef   { contextGeneration, synthDefName, fingerprint, draftID }
```

Changing focus must dispose or retain the previous draft by a stated rule. If it contains
uncommitted score edits, prompt or preserve it; never silently apply it to another event.

### 4.1 Score-event focus

- Seed the draft from the selected canonical event.
- Show time, path, event kind, SynthDef/target and typed payload controls.
- Raw JSON and typed controls remain two editors over one draft, as they are now.
- Valid typed edits and valid raw JSON update the open working score immediately. There is no
  redundant Apply button. Blur, Command/Ctrl-Enter, Save or a focus transition seals the current
  edit as one canonical revision and one undo step; invalid JSON remains visibly local and cannot
  enter the score.
- If the document changes externally while the draft is open, compare its source revision and
  entry identity before applying. Do not overwrite a newer event silently.

Audition uses a copy of the current working event. It never uses the authored entry ID as runtime
identity. **Play synth copy** instantiates the resolved SynthDef controls directly. **Play event**
passes the complete payload through native sclang Event semantics, so pitch, scale, sustain,
legato and other Event keys are interpreted by SuperCollider. Native Event audition is hosted-only
until a standalone adapter can honestly implement the same contract.

### 4.2 SynthDef focus

- Seed a note-like audition draft from the exact selected SynthDef interface and defaults.
- Use hosted SynthDesc/compiled-graph specs in hosted mode and the installed browser binary in
  standalone mode.
- Expose the full relevant control surface without pretending that an unknown control has musical
  semantics.
- No score entry exists. A later “Add to score” action may create one, but it is outside this
  slice and must be explicit.

### 4.3 Audition lifecycle and identity

Hosted audition must use a distinct shell-wide ToolDefinition/tool ID, provisionally
`synthdef-audition`, and a transport namespace owned by that service such as `/awb/audition/*`.
The service is headless: it does not create another renderer view or appear as a score executor.
The shell grants a requesting view a separate audition ToolSession and records the requesting
`toolID`, `viewID` and, when present, parent `toolSessionID` as provenance. Score Studio is one
client of this contract; other shell tools must be able to use the same service without borrowing
Score Studio's player or session.

This is not a catch-all container for every shell node that lacks another owner. The service owns
only realizations created in response to explicit audition requests. A voice that is neither score
playback, tool-owned nor the result of such a request remains visibly unowned/orphaned in
NodeManager. The audition service must not adopt it, hide it or clean it up.

An audition request is admissible only after the service has inspected the exact compiled graph.
Audio-output SynthDefs may continue to the routing and lifecycle checks. Control-output,
utility/no-output and unknown definitions are inspectable or usable by their owning tools, but the
generic service must reject them as audible audition targets with a concrete reason.

Every press of Play submits one request and creates one fresh audition realization:

```text
requestingToolID + viewID + auditionContextID + draftID + auditionRunID + realizationID
```

This identity is separate from `scoreID + revision + runID + score-entry realizationID`. An
audition realization is the lifecycle result of one explicit request, not necessarily one node or
one musical note. The first implementation may create one SynthDef instance per request. Array
expansion, a chord or another explicitly supported event expansion may later create several nodes;
all resulting node IDs remain members of the same owned realization. Multiple audition
realizations may coexist. The panel should display how many it owns and provide:

- **Play** — create another realization from the current draft;
- **Stop** — immediately free all audition realizations owned by this panel scope.

Do not target `@all`, do not reuse the score event ID as the node owner, and do not let Stop touch
score playback, rack nodes, another view, another audition draft or unowned nodes. Hosted audition
nodes belong to the dedicated audition ToolSession only through their explicit realization
membership, with requester, view, draft and realization metadata so NodeManager can observe them
without confusing them with score or tool-native realizations. Browser-standalone nodes require the
same logical ownership even though their server node IDs are browser-local; the shell never exposes
this path.

Natural node completion removes that node from its realization. The realization completes only
when all of its member nodes have ended. Changing focus must not orphan still-running audition
nodes: retain their ownership record until completion or an explicit stop. Closing the Score Studio
view frees every audition realization requested by that view and only those realizations.

Changing a control after Play affects the draft. Whether it also updates already-running audition
voices must be explicit. Recommended first slice: send safe scalar changes to every live voice
owned by the current draft, while structural/array changes apply on the next Play unless the
interface provides a valid `/n_setn` adapter.

### 4.4 Envelope editor integration

The current Envelope Lab should become a compact section of this bottom panel, shown only when the
focused SynthDef interface authorises it:

- `envArray`: show the smaller point/segment editor, canonical `sc.env/1` data and audition through
  the existing complete-array adapter;
- `parametric`: show compact controls for the actual scalar parameters and the projected envelope;
  do not present arbitrary points as editable;
- `inspectOnly`: show a compact read-only envelope projection and its functional role.

For a score event, the envelope editor writes the event draft only when the score/runtime adapter
for that control exists. For a SynthDef audition draft, it writes the audition payload. Reuse
`EnvelopeEditor`; do not embed the large standalone Envelope Lab card unchanged.

## 5. Smart seeking

The current seek is deliberately event-boundary seeking: it frees active nodes and resumes from
the next authored boundary. Smart seek must be an additional ephemeral reconstruction plan, not a
mutation of the score.

At target score time `T`:

1. fold all deterministic note/set/release/free entries before `T` into a logical runtime state;
2. discard notes already released/freed/completed before `T`;
3. for each note logically alive at `T` whose remaining lifetime and essential state are known,
   create a new realization with a fresh realization ID and classify its reconstruction quality;
   report every other logically alive note as skipped;
4. apply the latest deterministic control values that should be in force at `T`;
5. calculate remaining gate, release, free and event-duration boundaries relative to `T`;
6. schedule future authored entries from `T` normally.

The authored event and original realization are never reused. Reconstructed nodes belong to the
new run and must report `reconstruction: exact` or `reconstruction: lifecycleCorrect` in runtime
metadata. If an original 30-second note has 3 seconds remaining at `T`, its reconstruction must end
in 3 seconds. It must never restart with a fresh 30-second lifetime.

### 5.1 Reconstruction capability levels

Smart seek cannot honestly be universal. Temporal correctness is mandatory; acoustic-state
fidelity is graded:

- **exact reconstruction** — the adapter restores the correct remaining lifetime, deterministic
  controls and internal audible state, including declared envelope/oscillator/sample position;
- **lifecycle-correct reconstruction** — the adapter restores the correct remaining lifetime and
  deterministic controls, while explicitly reported envelope position, oscillator phase or other
  non-essential audible state may restart or be approximated;
- **unsupported** — remaining lifetime or essential state cannot be determined, so the note is
  omitted from reconstruction and reported as skipped.

The planner may fold deterministic note/set/release/free history to identify notes logically alive
at `T`. It may emit a lifecycle-correct reconstruction with a fresh baked EnvGen, short anti-click
attack or phase-reset oscillator only when the remaining gate/release/free boundaries and current
deterministic control values remain correct. Those approximations must be named in the report. For
an editable `envArray`, an exact adapter may evaluate the envelope at `elapsed` and construct the
remaining envelope beginning at that level. In both quality levels, release/free boundaries and all
future authored events retain their original score times relative to `T`.

Current implementation boundary: the planner preserves the original note controls, replaces
`sustain` with the remaining gate time and names `attack and oscillator phase restart at the seek
point` as an approximation. Because the executor creates a fresh Synth, its EnvGen begins at its
initial level and runs the original attack again. Release-phase reconstruction likewise creates a
fresh envelope and immediately releases it using the correct remaining release lifetime rather
than restoring the original EnvGen's instantaneous state. This is lifecycle-correct, but the long
restarted attack is not the desired final listening behaviour.

Seeking while paused must continue to free the suspended nodes before reconstruction. Seeking
while playing should atomically replace the old run: stop/free old owned nodes, install the new
anchor and reconstruction plan, then resume. No old `/n_end` may attach to the new run.

### 5.2 Smart-seek exclusions for the first slice

- nondeterministic native patterns not committed as finite score entries;
- arbitrary control-bus history or live modulation state;
- sample playback position without a declared seek control;
- external MIDI/OSC state;
- side effects from arbitrary sclang Functions;
- reconstructing notes whose lifetime contract is unknown.

The UI should distinguish ordinary boundary seek from smart seek until the latter's supported
surface is well understood. It should distinguish exact, lifecycle-correct and skipped notes,
report every acoustic approximation, and name the missing lifetime or essential-state capability
for every skipped note.

### 5.3 Planner and executor ownership

`buildSeekReconstructionPlan(document, target, capabilities)` is a pure JS/domain function. It
folds authored deterministic state and returns exact/lifecycle-correct reconstructions, skipped-note
diagnostics and future authored boundaries; it does not create nodes or own a clock. In both
headless-hosted and connected-hosted shell contexts, `PTimelinePlayer`/`PScoreTimelinePlayer`
remains the authoritative scheduler and atomically applies the plan to a fresh run. Only an
explicit browser-standalone host uses `StandaloneScoreExecutor` to apply the same plan. The React
tool selects seek mode and displays the report; it never performs reconstruction itself.

### 5.4 Envelope-aware acoustic reconstruction

The next stage refines the reconstruction event without weakening the temporal contract:

1. calculate the note's elapsed authored time, logical envelope phase and expected amplitude level
   at `T` from the declared instrument-envelope contract and folded control history;
2. for an editable `envArray`, build a residual envelope whose initial level is the calculated level
   and whose remaining segments retain their authored timing; classify this as exact only when the
   adapter can also account for every audible state it claims to restore;
3. for a parametric or baked envelope that cannot start at an arbitrary internal position, replace
   the original long attack with a configurable short anti-click attack and, where safe, apply the
   calculated level through a declared gain control. Keep the result `lifecycleCorrect` and report
   the substituted attack and any phase reset;
4. reconstruct a release-phase note from its calculated current level and remaining release time
   where the interface permits it; otherwise use the same bounded anti-click approximation or skip
   it if doing so would falsify its terminal timing;
5. apply the same adapter and report schema in hosted and browser-standalone execution.

Do not mutate the authored event to achieve this. Envelope overrides belong only to the ephemeral
reconstruction event. Do not claim exactness merely because the initial amplitude is close: an
oscillator, filter, modulation envelope or sample cursor that restarts still makes the audible state
an approximation.

### 5.5 Live editing during playback

Editing the open score while it plays must not install the new revision by stopping the player and
starting over. It must not clear realization UI before the engine reports those nodes ended. The
editor may be on a newer authored revision than the running projection and should show that fact
literally, for example `editing r16 / playing r15`.

The transport model distinguishes:

- **audible position** — the engine-authoritative playhead;
- **committed frontier** — the next boundary after all events already evaluated and dispatched;
- **editable future** — entries not yet pulled by the current executor.

In hosted SuperCollider, `EventStreamPlayer` pulls an event only at its clock wake-up. It then plays
that event and schedules its next wake-up from the returned delta. The server command for the
pulled event may already be timestamped ahead by latency or event timing offsets, so that event is
committed even if its sound has not yet reached the output. Replacing the player's stream changes
the next pull; it cannot retract the already dispatched event. The browser executor must model the
same frontier explicitly rather than using UI render time as a substitute.

An explicit `replaceFuture(newDocument, frontier)` operation should:

1. preserve the current run ID, clock anchor and every existing realization;
2. retain the already scheduled wake-up at `frontier`;
3. build a replacement stream/schedule only from entries at or after that frontier;
4. preserve an exact initial rest when the first replacement entry occurs later;
5. reject or defer newly moved entries that now fall before the frontier;
6. tag newly created realizations with the source revision/generation that supplied them.

Future replacement never invokes smart seek. Smart seek is reserved for an explicit transport
move and may reconcile and reconstruct nodes. A future edit merely replaces material that has not
started; it must neither duplicate an overlapping live note nor alter its existing node identity.
Later authored `set`, `release` and `free` commands may still target that live realization by stable
run/realization identity.

Only one replacement tail is pending at a time. Several document revisions accepted before the
next stream pull simply replace that tail repeatedly; the latest accepted revision wins. Requests
use expected execution generation and frontier guards. If the player pulls an Event between two
requests, that Event is committed from the earlier revision and the next replacement begins at the
new frontier rather than attempting to undo it.

Hosted NodeManager and the browser-local node registry are alternative lifecycle authorities, not
parallel registries. If NodeManager is deliberately disabled, ordinary desktop playback may
continue untracked; the player does not restore its own lifecycle registry as a fallback. The
selected registry pushes start, pause, release, end and membership changes. The player may cache a
derived projection for UI, while snapshot queries remain recovery/inspection operations. The
browser authority is `createNodeRegistry()` from `@awb/sc-runtime`; the browser host exposes one
stable instance through `engineNodeRegistry()`, and Score Studio passes it into standalone score
and audition execution with different owner IDs. Consequently one
tool cannot stop or dispose another tool's nodes. A browser host may inject the same instance into
other tools to share lightweight semantic containers. Cross-window/process sharing remains a host
broker concern.

## 6. State and component boundaries

Do not make `App.jsx` larger. This refactor is the right moment to extract:

- `ScoreStudioLeftRail` with Document and Instruments tabs;
- `InstrumentInventory` for categorisation, search and lazy selection;
- `ScoreFocusPanel` for the bottom scope/draft/audition state machine;
- `ScoreRuntimeRail` for loaded definitions and realizations;
- `PanelLayout` for collapse/resize view state;
- an engine-side `AuditionController` with a hosted adapter and an optional browser-standalone
  adapter;
- an engine-side pure `buildSeekReconstructionPlan(document, target, capabilities)`.

Canonical score mutations still go through `scoreSessionReducer`. Shell runtime state remains in
the hosted client; browser-only standalone state remains in its executor. Panel geometry, active
tabs, search text and focus drafts are editor/view state and must not be serialized into the score.

## 7. Implementation slices

### Slice A — layout without semantic changes

- extract collapsible left/right/bottom layout;
- move existing document and runtime UI into the left Document tab;
- move the existing event editor into the bottom panel;
- leave existing execution behavior intact;
- add host-capability-driven visibility for New/Open/Demo.

### Slice B — instrument inventory and focus

- build the categorised searchable compact list;
- include system/execution-context SynthDefs and allow explicit admission to the loaded set;
- retain lazy interface loading and fingerprint invalidation;
- selecting an event or SynthDef establishes explicit bottom-panel scope;
- embed compact parametric/read-only envelope projections.

### Slice C — isolated audition

- register the shell-wide `\synthdefAudition` tool/service and its dedicated ToolSession/transport
  contract;
- add `AuditionController` and requester-scoped identity model;
- Play creates fresh hosted audition realizations, or browser-standalone realizations only when the
  browser host explicitly enables that mode;
- apply ordinary SuperCollider multichannel expansion on Play: square-bracket arrays expand,
  scalars broadcast and shorter arrays wrap; `Ref([...])` denotes one literal array control;
- keep the compact bracket expression canonical in the editor; an expanded voice list is optional
  inspection, not the primary editing surface;
- display symbols with one source-level prefix such as `\substrate`; JSON/transport escaping must
  never appear as a second visible backslash;
- one Play owns every SynthDef node produced by that expansion as one realization;
- Stop frees only the current draft's audition realizations and their member nodes;
- integrate the compact `envArray` editor where authorised;
- project hosted audition nodes through NodeManager with explicit origin metadata.

### Slice C.1 — authored synth lifecycle commands

- remove the authored release command from the seed score; finite notes retain only their derived
  lifecycle boundary;
- expose `+ note`, `+ synth`, `+ set`, `+ release` and `+ free` in the score command palette;
- expose Duplicate for exactly one selected authored entry; it preserves time, path and payload,
  assigns a fresh entry identity and selects the copy (a duplicated note therefore owns a new
  lifecycle row rather than another reference to the source);
- require every note to declare `dur`; an indefinitely sustained synth is represented explicitly as
  `dur: "inf"`, never by an absent duration;
- project `set`, `release` and `free` as editable child markers of their targeted synth lane while
  retaining flat, absolute-time canonical score entries linked by `event.target`;
- render an unclosed `dur: "inf"` synth as a finite label followed by a gradient continuation arrow;
  the infinite tail does not affect Fit, while finite child-command positions do;
- map `"inf"` to native sclang `inf` in generated projections and suppress Event's automatic gate
  message without hiding the realized SynthDef's actual gate capability;
- preserve native Event timing: `dur` is event duration/spacing, gate-off is explicit `sustain` or
  `dur * legato` (default legato 0.8), and the SynthDef envelope release remains an independent tail
  after gate-off; multichannel envelope controls retain per-voice attack and release projections;
- apply authored set controls directly to every realized voice, broadcasting scalars and wrapping
  shorter arrays using ordinary SuperCollider multichannel semantics.

### Slice D — smart-seek plan and temporally correct reconstruction

- implemented `scoreSeekPlan.js` as the shared, data-only reconstruction planner;
- the hosted adapter sends one revision-bound JSON plan to `PScoreTimelinePlayer`; browser
  standalone applies the same plan directly;
- deterministic `set` history, SuperCollider-style wrapped voices, remaining gate time and
  remaining release tails are folded before reconstruction;
- current adapters emit `lifecycleCorrect` realizations and name their acoustic approximations;
  unknown finite lifetimes and unreconstructable release tails are skipped;
- stopped/paused seeks retain a pending exact-position plan; seeking during playback frees the old
  owned run and creates a fresh run/realization identity;
- smart seek anchors at the requested timestamp without snapping to an authored boundary; when no
  note needs reconstruction, the scheduler preserves the exact gap to the next authored entry;
- boundary seek remains available as an explicit UI fallback. Standalone shows reconstructed and
  skipped counts; a richer hosted report/details surface remains UI polish rather than scheduler
  work.

### Slice E — live future replacement

Implemented in the native and browser executors:

- authored revision, execution generation and committed frontier are separate adapter state;
- edits during playback or pause replace only the unconsumed tail and preserve the run and live
  NodeManager/browser-registry realizations;
- compare-and-swap generation/frontier guards reject a replacement raced by a stream pull;
- several edits before the next boundary collapse to one pending tail, with the latest revision
  winning and an exact Rest preserving any gap;
- new realizations carry their source revision/generation, while existing voices retain theirs;
- ordinary future replacement does not invoke smart-seek reconstruction;
- protocol v2 reports the generation/frontier and extends realization notifications without
  changing the frozen v1 contract.

Natural completion still requires both source exhaustion and zero live realizations. The browser
registry now pushes start, pause/resume, release, set and end transitions. It includes only
lightweight semantic containers and membership, and remains deliberately smaller than NodeManager:
there is no language-object inspection, GUI model, tool catalogue or discovery of nodes the JS host
did not create.

### Slice F — envelope-aware smart-seek reconstruction

Not yet implemented:

- add elapsed note/envelope position and expected amplitude to the data-only seek plan;
- add capability-specific residual-envelope adapters rather than a SynthDef-name special case;
- reconstruct editable `envArray` envelopes from the calculated level and remaining segments;
- substitute a short, configurable anti-click attack for parametric/baked envelopes instead of
  replaying their original long attack;
- preserve the already-correct remaining gate, release, free and future-event boundaries;
- include the chosen envelope strategy, calculated source phase and every acoustic approximation
  in runtime metadata and the hosted/standalone seek report;
- cover sustain-phase, attack-phase and release-phase seeks, polyphonic wrapped voices, explicit
  `set` history and `dur: "inf"` notes with shared planner fixtures and both executor gates.

## 8. Acceptance criteria

- Left Document and Instruments tabs work in the shared renderer without desktop/browser forks.
- Embedded shell mode has no redundant New/Open/Demo controls; browser ingress remains available
  where its host still owns it.
- Instrument list ordering is score-pinned, loaded, then remaining, with no duplicates and working
  search.
- System/context SynthDefs can be admitted and auditioned when their exact compiled interface and
  runtime lifecycle support it; unsupported definitions remain visible with a concrete reason.
- Inventory rows distinguish audio, control, utility and not-yet-modelled definitions from the
  compiled graph; control/utility definitions remain usable in scores but are not presented as
  audible audition targets.
- Selecting one instrument builds only that detailed interface model.
- Event selection and SynthDef selection produce the correct, visibly named bottom-panel scope.
- A valid event edit reaches the open working document without an Apply action and seals as one
  document revision at the stated commit boundary; auditioning creates no document revision.
- Every audition Play has a fresh runtime identity; Stop cannot free score nodes or other tools'
  nodes.
- Hosted audition runs under the dedicated `\synthdefAudition` tool identity; its NodeManager
  projection retains the requesting tool/view provenance and is never attributed to Score Studio's
  score ToolSession.
- Every node owned by the audition service belongs to an explicit audition realization. Unrelated
  unowned voices remain visible as unowned/orphaned in NodeManager and are never adopted.
- One realization may own several nodes; it remains active until every member node ends or that
  realization is explicitly stopped.
- Natural completion, focus changes and view closure leave no unowned audition nodes.
- Envelope UI matches `envArray`/`parametric`/`inspectOnly` capability and never offers a control
  that cannot reach the selected SynthDef.
- Left, right and bottom panels collapse independently; resizing does not touch canonical data.
- Smart seek never mutates authored entries, never reuses old realization IDs or changes remaining
  note/event timing. It classifies exact and lifecycle-correct reconstruction, reports acoustic
  approximations, and skips notes whose remaining lifetime or essential state is unknown.
- A sustain-phase smart seek must not replay an authored multi-second attack. An `envArray` adapter
  begins from its calculated residual level; other supported envelopes use the declared bounded
  anti-click strategy and remain labelled `lifecycleCorrect` unless all audible state is restored.
- Hosted and standalone smart seek must produce the same envelope strategy and terminal boundaries
  from the same reconstruction plan, even though node creation and lifecycle reporting differ.
- Editing during playback changes only the uncommitted future. It does not reset transport, replace
  the run, recreate live notes, clear lifecycle state or replay an entry moved into the past.
- Hosted and standalone executors report equivalent audible-position and committed-frontier
  semantics despite using different schedulers and lifecycle registries.
- Existing hosted readiness, save, transport, typed/raw event editing, browser smoke and real hosted
  sclang gates remain green. Browser-standalone gates remain green for the web host; the shell must
  not expose that mode.

## 9. Main gotchas

1. **Do not let audition become a second score executor.** It owns disposable voices, not score
   transport or score membership.
2. **Do not key SynthDefs by name alone.** A score-local `synths.scd` may override a same-named
   global definition; focus drafts must retain context generation and fingerprint.
3. **Do not eagerly analyse the whole desktop library.** Listing names is cheap; transferring and
   parsing every compiled graph is not.
4. **Do not make the envelope picture promise editability.** Graph capability decides which
   controls exist.
5. **Temporal correctness outranks acoustic exactness.** A lifecycle-correct reconstruction may
   restart or approximate phase/envelope state, but it must preserve remaining lifetime, control
   state and future boundaries. The present implementation also replays the original attack; that
   is a known interim behaviour, not the target anti-click reconstruction. If timing cannot be
   preserved, skip the note; never restart the original full duration.
6. **Keep invalid text separate from canonical state.** Raw JSON, typed controls, envelope controls
   and audition share one focus draft. Valid changes update the open working score immediately;
   invalid text remains local until corrected and must never replace the last valid event.
7. **Guard focus changes.** A late hosted reply, SynthDef inventory refresh or score revision must
   not write into a newly selected draft.
8. **Keep ownership narrow.** Stop/free operations need view, draft and realization scope; broad
   server targets are unacceptable.
9. **Preserve mode strictness.** Hosted loss disables hosted audition. It must not wake the browser
   engine as a surprise fallback.
10. **Treat panel persistence as disposable UI state.** Corrupt or stale layout preferences should
    reset safely and never block opening a score.
11. **Do not disguise audition as a score command.** The shell-wide audition ToolSession owns its
    disposable voices; `PTimelineOSCBridge` and the score ToolSession do not.
12. **Do not turn audition into an orphan bucket.** Ownership starts with an explicit audition
    request and extends only to the nodes created for that realization.
13. **Do not confuse audible time with editable time.** Server latency and event timing offsets may
    commit an event before it is heard; only entries beyond the executor's reported frontier are
    safe to replace.
