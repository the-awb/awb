# Score Studio GUI restructure and smart-seek handoff

Status: approved next GUI direction; implementation not started here.

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
- Apply creates one canonical score revision and one undo step. Revert restores the current
  canonical event.
- If the document changes externally while the draft is open, compare its source revision and
  entry identity before applying. Do not overwrite a newer event silently.

Audition uses a copy of the draft, including unapplied values if that is made visually explicit.
It never uses the authored entry ID as runtime identity.

### 4.2 SynthDef focus

- Seed a note-like audition draft from the exact selected SynthDef interface and defaults.
- Use hosted SynthDesc/compiled-graph specs in hosted mode and the installed browser binary in
  standalone mode.
- Expose the full relevant control surface without pretending that an unknown control has musical
  semantics.
- No score entry exists. A later “Add to score” action may create one, but it is outside this
  slice and must be explicit.

### 4.3 Audition lifecycle and identity

Every press of Play creates a fresh audition realization:

```text
auditionContextID + draftID + auditionRunID + realizationID
```

This identity is separate from `scoreID + revision + runID + score-entry realizationID`. Multiple
audition voices may coexist. The panel should display how many it owns and provide:

- **Play** — create another realization from the current draft;
- **Stop** — immediately free all audition realizations owned by this panel scope.

Do not target `@all`, do not reuse the score event ID as the node owner, and do not let Stop touch
score playback, rack nodes, another view, or another audition draft. Hosted audition nodes belong
to the Score Studio ToolContext/ToolSession with explicit audition metadata so NodeManager can
observe them without confusing them with score realizations. Browser-standalone nodes require the
same logical ownership even though their server node IDs are browser-local; the shell never exposes
this path.

Natural node completion removes that realization from the audition controller. Changing focus must
not orphan still-running audition nodes: retain their ownership record until completion or an
explicit stop. Closing the Score Studio view frees every audition node owned by that view.

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
3. for each note logically alive at `T` with an exact state adapter, create a new realization with a
   fresh realization ID; report every other logically alive note as skipped;
4. apply the latest deterministic control values that should be in force at `T`;
5. calculate remaining gate, release, free and event-duration boundaries relative to `T`;
6. schedule future authored entries from `T` normally.

The authored event and original realization are never reused. Reconstructed nodes belong to the
new run and must be reported as `reconstruction: exact` in runtime metadata.

### 5.1 Reconstruction capability levels

Smart seek cannot honestly be universal. Reconstruction is binary for this workflow:

- **exact state adapter** — the instrument exposes enough controls to restore oscillator/sample
  phase, envelope position, effective controls and remaining lifetime;
- **unsupported** — the note is omitted from reconstruction and reported as skipped.

The planner may fold deterministic note/set/release/free history to identify notes logically alive
at `T`, but it must emit a reconstruction only when an exact adapter can restore that note's audible
state. A shorter duration, a fresh baked EnvGen, a short anti-click attack or a phase-reset oscillator
is a restart, not reconstruction, and must therefore be excluded. For an editable `envArray`, an
exact adapter may evaluate the envelope at `elapsed` and construct the remaining envelope beginning
at that level, but it must also restore every other audible state the instrument declares relevant.

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
surface is well understood. It should report skipped notes and the missing exact-state capability;
it must not offer or label approximate reconstruction.

### 5.3 Planner and executor ownership

`buildSeekReconstructionPlan(document, target, capabilities)` is a pure JS/domain function. It
folds authored deterministic state and returns exact reconstructions, skipped-note diagnostics and
future authored boundaries; it does not create nodes or own a clock. In both headless-hosted and
connected-hosted shell contexts, `PTimelinePlayer`/`PScoreTimelinePlayer` remains the authoritative
scheduler and atomically applies the plan to a fresh run. Only an explicit browser-standalone host
uses `StandaloneScoreExecutor` to apply the same plan. The React tool selects seek mode and displays
the report; it never performs reconstruction itself.

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

- add `AuditionController` and identity model;
- Play creates fresh hosted audition realizations, or browser-standalone realizations only when the
  browser host explicitly enables that mode;
- Stop frees only the current draft's audition nodes;
- integrate the compact `envArray` editor where authorised;
- project hosted audition nodes through NodeManager with explicit origin metadata.

### Slice D — smart-seek plan and exact reconstruction

- implement and fixture-test the pure reconstruction planner first;
- add the hosted execution adapter over the plan, plus the optional browser-standalone adapter;
- reconstruct only through exact state adapters and expose skipped-note reports;
- validate run/realization isolation against late lifecycle messages.

## 8. Acceptance criteria

- Left Document and Instruments tabs work in the shared renderer without desktop/browser forks.
- Embedded shell mode has no redundant New/Open/Demo controls; browser ingress remains available
  where its host still owns it.
- Instrument list ordering is score-pinned, loaded, then remaining, with no duplicates and working
  search.
- System/context SynthDefs can be admitted and auditioned when their exact compiled interface and
  runtime lifecycle support it; unsupported definitions remain visible with a concrete reason.
- Selecting one instrument builds only that detailed interface model.
- Event selection and SynthDef selection produce the correct, visibly named bottom-panel scope.
- Applying an event draft creates exactly one document revision; auditioning creates none.
- Every audition Play has a fresh runtime identity; Stop cannot free score nodes or other tools'
  nodes.
- Natural completion, focus changes and view closure leave no unowned audition nodes.
- Envelope UI matches `envArray`/`parametric`/`inspectOnly` capability and never offers a control
  that cannot reach the selected SynthDef.
- Left, right and bottom panels collapse independently; resizing does not touch canonical data.
- Smart seek never mutates authored entries, never reuses old realization IDs, excludes every note
  without an exact state adapter and reports each skipped note honestly.
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
5. **Do not reconstruct without an exact adapter.** Restarting an oscillator or baked EnvGen with a
   shorter duration does not restore its phase or envelope position and must be reported as skipped.
6. **Keep draft and canonical state separate.** Raw JSON, typed controls, envelope controls and
   audition must share one focus draft; only Apply changes the score.
7. **Guard focus changes.** A late hosted reply, SynthDef inventory refresh or score revision must
   not write into a newly selected draft.
8. **Keep ownership narrow.** Stop/free operations need view, draft and realization scope; broad
   server targets are unacceptable.
9. **Preserve mode strictness.** Hosted loss disables hosted audition. It must not wake the browser
   engine as a surprise fallback.
10. **Treat panel persistence as disposable UI state.** Corrupt or stale layout preferences should
    reset safely and never block opening a score.
