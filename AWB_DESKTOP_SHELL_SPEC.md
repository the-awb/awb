# AWB Desktop Shell Specification

Status: implementation specification, 16 September 2026

## 1. Purpose

AWB needs one desktop application capable of hosting several independently developed studio tools.
The shell provides native windows, process supervision, filesystem and media permissions, packaged
renderer discovery, and connection plumbing. It does not become a combined application model and
does not absorb the musical meaning of the tools it hosts.

Score Studio is the working shell prototype. Lissajous Viz is the second consumer that makes the
neutral boundary testable. The implementation should extract the reusable Electron machinery from
Score Studio into an AWB shell rather than copying that shell into Lissajous or adding one Electron
application per tool.

The required outcome is:

```text
one installed AWB application
  one Electron main process
  one Toolkit Home hub
  zero or more independently addressable tool views
    Score Studio
    Lissajous Viz
    later AWB tools
```

Each renderer remains buildable for the web. Shell integration is an additional host, not a fork of
the application.

## 2. Decisions fixed by this specification

- There is one neutral AWB shell, not one shell per tool.
- The shell has a Toolkit Home hub from which installed tools and sessions can be opened, focused
  and closed.
- Tool UI, state, validation and semantic protocols remain tool-owned.
- A tool view is the shell's unit of launch, focus, close and failure isolation.
- The first neutral implementation may use one `BrowserWindow` per view. Tabs may be added later
  without changing view identity or session routing.
- Packaged tools are discovered from versioned manifests and built renderer assets, never from
  another repository's working source tree.
- Every native capability is explicit. Renderers do not infer desktop support from user-agent data
  or receive unrestricted Node access.
- SuperCollider may launch a view, but the shell must also support desktop-first and no-SC views.
- One shell-level host broker owns shared desktop sclang, scsynth-readiness and NodeManager
  connections. Tool views receive scoped logical connections and never start competing copies of
  shared host infrastructure.
- Process ownership is recorded per view or service. An attached process is never terminated.
- Closing one tool must not close unrelated tools or shared services still in use.
- The shell transports tool messages but does not reinterpret score events, Lissajous parameters,
  presets, NodeManager state or audio samples.

## 3. Existing systems and migration boundary

### Score Studio prototype

`apps/score-studio/shell/` already proves:

- Electron can load the same built editor used by the web application;
- sclang can launch it with a score path, ToolInstance ID and OSC endpoint;
- a token-protected WebSocket-to-OSC bridge can run in the main process;
- a sandboxed preload can expose named filesystem and window operations;
- canonical score and generated projection writes can retain external-change guards;
- a shell launched by sclang can watch its owner process and close cleanly.

Those mechanisms are source material for extraction. The current single-window, single-score,
Score-Studio-named process is not the neutral architecture.

### Lissajous consumer

The first Lissajous shell profile is a live visual instrument using system audio. It defaults to
multichannel capture and permits an explicit stereo mode or visible stereo-only fallback. File
management, file/URL playback, browser SuperCollider, deterministic export and durable automation
management remain outside its first hosted surface. Native SC Bus capture is now a separate
capability-gated source alongside hardware input and system loopback (see the adaptation below).

Lissajous automation is later work and is conceptually a recorded control take, comparable to a
BusRecorder take. It is not silently converted into Score Studio timeline events.

## 4. Ownership

### The shell owns

- Electron application and main-process lifetime;
- the Toolkit Home catalogue and active-view/session index;
- tool manifest discovery and validation;
- creation, identity, focus and closure of tool views;
- a sandboxed, versioned preload contract;
- native dialogs and bounded filesystem operations granted to a view;
- media permission policy and reporting of acquired capabilities;
- owned bridge and child-process supervision;
- attachment to an existing desktop SuperCollider host and, later, explicitly owned headless
  sclang processes;
- one shared, reference-counted NodeManager subscription adapter with per-view filtered
  projections;
- immutable launch-context delivery;
- routing between a named view and its external session endpoint;
- reference counting and disposal of shared services;
- packaged asset versions and integrity metadata;
- shell-level diagnostics and recovery information.

### Each tool owns

- its React application and presentation;
- its document or runtime state and revision model;
- interpretation and validation of tool-specific launch payloads;
- semantic commands, request handling and error responses;
- browser-host behaviour;
- tool-specific persistence policy;
- tool-specific OSC addresses and state projections;
- cleanup of its WebGL, AudioContext, media-stream, worker and timer resources.
- validation and interpretation of its own document formats, including whether a recent file is
  still meaningful to that tool.

### Desktop SuperCollider owns

- `Tool`, `ToolLauncher`, `ToolInstance` and NodeManager semantics;
- identity of an SC-launched ToolInstance;
- desktop score execution through `PTimelineOSCBridge`/`PScoreTimelinePlayer`;
- SC-side objects, Patterns, Synths and explicit preset promotion;
- whether an sclang process is attached or explicitly shell-owned.

The shell never infers authored score membership from NodeManager and never treats receipt of an
OSC parameter as proof that a ToolInstance is valid. NodeManager remains authoritative for realized
language-side objects and their container membership. The shell holds only a replaceable projection
for display and routing.

## 5. Toolkit Home

Toolkit Home is the shell's user-facing hub. It makes the desktop application useful when it is
opened directly rather than launched from SuperCollider.

It displays:

- installed tools, their versions and available launch profiles;
- active tool views and their connection/lifecycle status;
- whether a view is standalone, attached to SuperCollider or backed by an owned process;
- shared host status, reported separately for sclang, scsynth readiness and NodeManager;
- tool-applicable NodeManager containers and their live entry counts;
- recent project/document references grouped by tool and document kind;
- capability or dependency failures that prevent a requested mode;
- per-tool `New`, `Recent` and `Browse` actions where the manifest declares document support;
- actions to launch, focus and close a tool view.

Toolkit Home may initiate a session in either direction:

```text
SC first       ToolLauncher requests a tool view; Home reflects the resulting session.
Desktop first  Home requests a new tool view; the tool runs standalone or uses an explicit
               attach/owned-host workflow supported by that tool.
```

The hub owns shell navigation, not tool truth. It does not hold score revisions, Lissajous groups,
NodeManager objects, presets or playback clocks. Its active-session cards join three disposable
projections: the view registry, bounded renderer status and NodeManager container summaries.
Selecting a card focuses its view; closing a card invokes the normal view shutdown path.

Tool/container association is explicit. A desktop handshake supplies the mapping between
`toolID`, `toolInstanceID`, NodeManager `toolSource` and `toolInstance`; the shell never guesses it
from a SynthDef name, process ID or window title. A tool container with no open view may be shown
with an `Open interface` action. Containers without a tool binding belong in a separate optional
live-runtime/unassigned section rather than being attached to an arbitrary tool card.

Opening AWB with no launch request shows Toolkit Home. An external launch may open/focus the named
tool directly while keeping Home available. Closing Home does not close active tools. Closing the
last tool returns to or reopens Home unless the user explicitly quits the application. Explicit
Quit applies the ownership rules in this specification and never terminates attached processes.

Recent items are convenience references, not canonical storage. A tool publishes a redacted,
bounded recent-item descriptor containing its tool ID, document kind, display name, last-opened
time and a shell-owned locator or opaque grant. The shell does not parse or index document content.
The owning tool remains responsible for reopening and validating it. The shell must tolerate moved
or missing files without deleting tool data or manufacturing replacements.

## 6. Repository layout

The target layout is:

```text
apps/
  awb-shell/                 neutral Electron main/preload and shell tests
  score-studio/              Score Studio renderer and web host
tool-artifacts/
  lissajous/<version>/       installed versioned renderer artifact
packages/
  ...                        existing portable packages
```

Lissajous Viz remains in its application repository. It supplies a built, versioned renderer
artifact and manifest for installation or vendoring by the shell. Score Studio may initially be a
workspace-local tool artifact, but it must use the same manifest and launch path as an external
tool. The shell must not contain imports into a tool's React source.

Do not extract a generic npm package merely to move files. `apps/awb-shell` is the first canonical
owner. Extract smaller packages only after repeated consumers reveal a stable boundary.

## 7. Tool manifest

Every hosted renderer supplies a JSON manifest with this minimum shape:

```json
{
  "schema": "awb.tool/1",
  "id": "score-studio",
  "name": "Score Studio",
  "version": "0.1.0",
  "renderer": {
    "entry": "index.html",
    "preloadProtocol": 1,
    "crossOriginIsolated": false
  },
  "view": {
    "defaultWidth": 1440,
    "defaultHeight": 900,
    "allowMultiple": true
  },
  "launchProfiles": [
    { "id": "standalone", "label": "New standalone session" },
    { "id": "attached", "label": "Attach to SuperCollider" }
  ],
  "documents": [
    {
      "id": "score",
      "label": "Score",
      "extensions": ["score.json"],
      "actions": ["new", "recent", "browse"]
    }
  ],
  "capabilities": {
    "filesystem": ["open-file", "open-directory", "save-file"],
    "media": [],
    "connections": ["hosted-timeline"]
  }
}
```

Lissajous will declare media capture and any cross-origin-isolation requirement in its own
manifest. A capability declaration is a request, not automatic authority. The shell grants the
intersection of manifest request, platform support and user permission and reports that result in
the launch context.

Manifest rules:

- `id`, schema and renderer version are immutable for a loaded artifact;
- renderer paths resolve inside that artifact and cannot escape it;
- unknown fields are ignored for forward compatibility;
- unsupported schema or preload protocol versions fail visibly;
- development URLs are explicit loopback-only overrides, never packaged defaults;
- a manifest cannot request arbitrary IPC channel names or unrestricted filesystem access.
- launch profiles advertise possible entry points to Toolkit Home; availability is still determined
  from current capabilities and connection state.
- document declarations advertise launcher actions and native-dialog constraints; they do not give
  the shell authority to parse, migrate or overwrite the document.

## 8. Identity model

The following identities are distinct:

```text
shellInstanceID    one running AWB main process
viewID             one renderer view owned by that process
toolID             stable tool kind from the manifest
toolInstanceID      optional running ToolInstance supplied by ToolLauncher
documentID         optional tool-owned document identity, such as scoreID
clientID           one transport connection incarnation
```

The shell addresses a view by `viewID`. It may use `(toolID, toolInstanceID)` as the idempotent key
for an SC launch when a ToolInstance exists. It must not use a score ID, visual-session ID or file
path as a universal session identity.

Multiple Score Studio views may host different scores and their independent desktop players.
Multiple Lissajous ToolInstances may coexist. Whether a future UI presents these views as windows or
tabs does not alter their identities.

## 9. Launch context

Each renderer receives one frozen context before application mount:

```javascript
{
  shellProtocol: 1,
  shellInstanceID,
  viewID,
  tool: { id, version },
  toolInstanceID: null,
  launchOrigin: "supercollider" | "desktop" | "web",
  owner: {
    kind: "attached-process" | "owned-process" | "none",
    pid: null
  },
  grantedCapabilities: {
    filesystem: [],
    media: [],
    connections: []
  },
  connections: {},
  payload: {}
}
```

`payload` is validated by the named tool. For Score Studio it may contain the initial score path or
new-score identity. For Lissajous it may contain the reduced feature profile, system-audio channel
mode and initial visual selection. The shell validates only boundedness and safe transport; it does
not interpret those meanings.

Secrets are supplied only where needed and are never copied into logs or renderer-visible state
snapshots. Unknown context fields are ignored. A renderer must reject a mismatched `tool.id` or
unsupported shell protocol visibly.

## 10. Preload host contract

All tools receive the same small base contract:

```javascript
host.kind                         // "desktop"
host.capabilities()
host.initialLaunchContext()
host.reportReady(state)
host.reportSessionState(state)
host.reportDetailedState(state)
host.onCommand(handler)           // returns unsubscribe
host.request(operation, payload)  // named, capability-checked operation
host.focusView()
host.closeView()
host.shellState()
```

The browser version of each application supplies a compatible adapter with explicit unsupported
operations. Tool-specific helpers may wrap `request`, but the shell preload does not grow methods
such as `saveScore`, `setLissajousGroup` or `playTimeline`.

Filesystem operations use opaque grants or explicit paths returned by native dialogs. A renderer
cannot read or write arbitrary paths merely because it is hosted by Electron. Atomic writes and
external-change guards remain available, but the tool supplies the expected hash/text and decides
what a successful save means.

## 11. Tool view lifecycle

The generic state machine is:

```text
requested -> loading -> ready -> disconnected/reconnecting -> closing -> closed
                         |                     |
                         +-------- failed -----+
```

Requirements:

1. A launch request receives a request ID and an explicit accepted, focused-existing or failed
   result.
2. A repeated request for the same `(toolID, toolInstanceID)` focuses the existing view and does not
   create a duplicate session.
3. Different ToolInstances create distinct views unless a later, explicit tool policy groups them.
4. Renderer readiness includes matching `toolID`, `viewID`, protocol and ToolInstance identity.
5. Renderer crash, connection loss and owner loss are separate states.
6. Closing a view asks the renderer to dispose, waits for bounded acknowledgement, then tears down
   its resources even if acknowledgement never arrives.
7. Closing the last view may quit the application according to shell preference; it is not allowed
   to terminate attached external processes.

The current Score Studio single-instance lock should become a shell-level launch router. A second
launch is routed to the existing main process, which focuses or creates the requested view. It must
not reject a different score merely because another Score Studio view exists.

Toolkit Home consumes this same registry. It does not maintain a parallel list of sessions.

## 12. Connections and shared services

Connections are declared by manifest and instantiated from launch context. Keep these planes
separate:

- shell lifecycle: launch, ready, focus, close, health and bounded state snapshots;
- tool semantic protocol: Score Studio timeline messages or Lissajous parameter messages;
- media: system audio capture or future native streams;
- bulk artifacts: files and future recording/render outputs.

The shell host broker is the preferred desktop owner of these shared host facts:

```text
SuperCollider host
  sclang process: attached | owned | absent
  scsynth: ready | booting | unavailable
  SynthDef context: ready | stale | unavailable
  NodeManager bridge: ready | reconnecting | unavailable
```

An attached sclang is observed and never terminated. Tools remain usable in standalone mode when
the host or NodeManager is unavailable; hosted transport, live tracking and runtime-container
features become visibly unavailable rather than preventing launch.

The SynthDef context is a read-only projection of `SynthDescLib.global` in the attached sclang
process. It supplies a point-in-time inventory, exact `SynthDesc.def.asBytes` graph data and
separate `ControlSpec` metadata through `/awb/synthdef/...`. This establishes what the language
context can describe; it does **not** prove that the definition has been sent to the current
scsynth. Server readiness remains a separate fact and continues to gate playback.

The shell owns the shared connection lifecycle, request coalescing and transport cache for this
context. It does not interpret graph meaning. Tool renderers use `@awb/synthdef-interface` to derive
controls, functional roles and envelopes from the exact bytes and specs. `@awb/instruments` may add
practice-specific annotations, but it is neither the runtime inventory nor an allow-list: an
uncatalogued context-owned SynthDef remains valid.

Cached descriptions are keyed by exact-byte fingerprint and scoped to one host-context
incarnation. An inventory refresh removes descriptions no longer present, and late responses from
an obsolete request generation cannot repopulate the new context. Inventory and description
transfers are retryable, bounded and recoverable after missing UDP chunks. Several views requesting
the same description must not cause duplicate graph transfers.

For NodeManager, the shell owns one adapter connection per complete host configuration. It may keep
one lightweight `all / summary / coalesced` subscription for Toolkit Home, then fan out explicitly
scoped tool or container projections to views. A view requesting detailed `values` receives a
separate bounded subscription so every tool does not pay that cost. Snapshot sequence numbers,
completion markers and gap recovery remain those of the authoritative NodeManager protocol.

A NodeManager entry may be enriched with the matching SynthDef description for controls and
display. Exact SynthDef-name equality is sufficient for that descriptive join, but never for tool
ownership: tool/container association still requires the explicit `toolID`/`toolInstanceID` to
`toolSource`/`toolInstance` binding.

The shell may supervise generic WebSocket/UDP relays, but address vocabularies and command meaning
remain tool-owned. The existing Score Studio `/awb/timeline/...` protocol is not generalized into a
universal tool protocol. Lissajous retains `/lissajous/<groupId>/<field>` for its parameter plane.

Shared services are keyed by their complete safe configuration and reference-counted. Closing one
view releases its reference; it does not stop a bridge used by another view. Fixed ports are not
assumed. Port allocation, readiness, credentials, process IDs and terminal errors are reported.

State-changing messages carry request IDs and are idempotent. Large snapshots use bounded chunks,
entry counts or hashes, a completion marker and a recovery request. High-rate audio samples, point
buffers and rendered frames do not pass through lifecycle IPC or OSC.

## 13. Process ownership

Every process record declares:

```text
processID
kind
ownership: attached | owned
owner view/service IDs
readiness state
exit status
```

Rules:

- attached sclang or bridge processes are observed but never killed by the shell;
- the shell may terminate a process it explicitly spawned and marked owned;
- an SC owner PID belongs to a view, not globally to the shell;
- owner loss closes only the views whose policy requires it;
- an owned shared service exits only after its final reference is released;
- stale PID detection is not treated as proof of identity where a stronger token/handshake exists;
- stdout/stderr and exit codes remain available in diagnostics without exposing tokens.

Studio-owned headless sclang remains a later capability. It must use these ownership rules rather
than being hidden inside Score Studio.

## 14. Audio and media

The shell grants and reports media-device access; each renderer owns its audio graph and routing.
For the first Lissajous integration:

- source is system/hardware capture only;
- multichannel is requested by default;
- stereo is an explicit mode and the required fallback where only two channels are acquired;
- the renderer reports requested and actual channel counts;
- file audio, URLs, external streams and scsynth buffer access are not implied;
- closing the view stops its media tracks and AudioContext.

Electron does not magically expose desktop scsynth buffers or buses. A future native audio tap is a
separate transport with measured latency, channel and backpressure behaviour.

## 15. Persistence

The shell provides bounded filesystem mechanisms, not a universal document model.

- Score Studio retains canonical `awb.score/1` ownership and paired projection rules.
- Lissajous retains its existing visual-session/library semantics; the first hosted profile does
  not migrate them.
- Project-local files should be supported so tool material can travel with the project that owns
  it.
- Tool manifests declare zero or more document kinds. Toolkit Home derives `New`, `Recent` and
  `Browse` actions from those declarations; tools without canonical files expose no false file
  controls.
- `Browse` uses a capability-checked native dialog and passes an opaque grant or explicit approved
  path to the selected tool. `New` creates a ToolInstance with a tool-owned empty document or
  initial payload. `Recent` repeats the same validated launch path; it is not a shortcut around
  permissions or external-change checks.
- Shell preferences, recent items and window placement may live in shell application data, but
  project documents must not become canonical there by accident.
- Crash recovery is tool-owned data stored through an explicitly granted shell facility.

## 16. Security

Every renderer view uses:

```text
contextIsolation: true
nodeIntegration: false
sandbox: true
```

Additionally:

- deny unrequested navigation and window creation;
- validate the sending `webContents` against its `viewID` for every IPC call;
- validate payload shape and size in the main process;
- allow packaged files only beneath the registered artifact root;
- allow development URLs only on loopback hosts;
- never expose raw `ipcRenderer`, Node modules or generic command execution;
- scope credentials to the view and connection that need them;
- make permission denial a normal visible capability state.

## 17. Diagnostics

The shell exposes a non-semantic diagnostic snapshot:

```text
shell version and PID
loaded tool artifact versions
view IDs and lifecycle states
ToolInstance IDs where present
owned/attached process records
bridge endpoints with secrets redacted
granted capabilities
last connection/process error
```

It must not dump authored documents, raw audio, tokens or arbitrary renderer state. Tools expose
their own detailed diagnostic snapshot through their versioned adapter.

## 18. Implementation sequence

### Slice 1 — neutral shell skeleton

1. Add `apps/awb-shell` with Toolkit Home, the manifest loader, launch router, view registry and
   base preload.
2. Move or adapt the generic process/window/IPC machinery from the Score Studio prototype.
3. Keep the existing Score Studio shell runnable until parity is proven.
4. Register Score Studio through an `awb.tool/1` manifest and load its existing production build.
5. Prove Toolkit Home can launch, focus and close two independently addressable Score Studio views.

### Slice 2 — Score Studio parity and cutover

1. Map the current score path, ToolInstance, endpoint and owner PID into the generic launch context.
2. Move score-specific native file calls behind Score Studio wrappers over `host.request`.
3. Preserve named-score load, hosted handshake, authoritative desktop transport, guarded pair save,
   owner-loss handling and web mode.
4. Change `ScoreStudioTool` to launch the neutral shell with `toolID: score-studio`.
5. Remove the old shell only after all real hosted and native-file checks pass.

### Slice 3 — Lissajous integration (implemented)

1. Consume the versioned Lissajous renderer artifact and manifest.
2. Launch the reduced system-audio profile with multichannel preference.
3. Bind lifecycle readiness to the named ToolInstance and parameter traffic to the existing
   Lissajous protocol.
4. Run Score Studio and Lissajous concurrently and close either without disturbing the other.

Implemented on the `feature/lissajous-neutral-shell` and
`feature/neutral-awb-shell-adapter` branches. The installed 0.1.0 renderer is a reduced
system-audio profile. It does not request cross-origin isolation because this profile excludes
`scsynth.wasm` and threaded export; multichannel Web Audio capture itself does not require
`SharedArrayBuffer`.

### Slice 4 — shared host, live containers and document launchers

1. Add the shell-level SuperCollider host broker with separate sclang, scsynth-readiness and
   NodeManager status. Include SynthDef-context status as a distinct language-side capability, not
   as proof of server installation.
2. Move shared WebSocket/OSC adapter ownership out of individual tool views while preserving each
   tool's semantic address vocabulary.
3. Incorporate AWB commit `c215f91` and awbCollider commit `4cf3f0d`: share and coalesce the
   read-only `/awb/synthdef/...` transport while leaving graph interpretation in
   `@awb/synthdef-interface` and the consuming tool.
4. Invalidate removed or superseded SynthDef descriptions on inventory refresh, reject late results
   from an older host-context generation, and add bounded retry/recovery for incomplete inventory or
   graph transfers.
5. Consume the existing NodeManager snapshot/delta protocol and show explicitly associated tool
   containers beneath active or discoverable ToolInstances.
6. Add manifest-declared document kinds and per-tool `New`, `Recent` and `Browse` launcher actions.
7. Persist bounded recent-file descriptors without making Toolkit Home a document authority.

### Slice 5 — packaging and reverse launch

1. Add icons, version metadata, packaged artifact inventory and macOS signing/notarisation work.
2. Refine Toolkit Home's recent views and connection controls without giving it semantic document
   ownership.
3. Add explicit attach-to-SC and owned-headless-SC services using the process ownership model.
4. Evaluate tabs after real multi-tool use; do not block the first neutral shell on them.

## 19. Acceptance

Automated checks must prove:

1. malformed manifests, escaping asset paths and unsupported protocols are rejected;
2. direct application launch opens Toolkit Home and exposes only valid installed-tool profiles;
3. Home and external SC launches project into the same view registry;
4. renderer IPC is accepted only from its registered view;
5. repeated launch of one ToolInstance focuses rather than duplicates it;
6. two distinct Score Studio sessions can coexist;
7. Score Studio and Lissajous can coexist in one shell process;
8. closing Home leaves active tools functional, and closing the last tool returns to Home;
9. closing either tool view leaves the other functional;
10. owner loss affects only the appropriate view and never kills attached sclang;
11. a shared bridge survives until its final consumer closes;
12. browser builds retain their existing adapters and behaviour;
13. Score Studio's current shell, hosted-real, transport and guarded-save gates remain green through
    cutover;
14. Lissajous full-studio browser, OSC and deterministic-render gates remain green;
15. the hosted Lissajous profile requests multichannel audio, exposes stereo mode and reports the
    actual acquired channel count/fallback;
16. closing Lissajous disposes WebGL, AudioContext, media streams, workers and timers;
17. no renderer gains unrestricted Node, filesystem, IPC or process access.
18. one NodeManager adapter serves multiple views while applying independent scopes and data modes;
19. container cards are associated through explicit tool/session metadata, never SynthDef-name
    inference;
20. loss of sclang or NodeManager degrades hosted features without disabling standalone tools;
21. `New`, `Recent` and `Browse` appear only for declared document kinds, and reopening a recent
    item still passes through tool validation and shell permission checks.
22. SynthDef-context presence, scsynth readiness and NodeManager connectivity are reported as
    separate facts;
23. two views requesting one SynthDef description share one bounded host transfer while each tool
    receives the exact bytes/specs it requested;
24. inventory refresh removes stale descriptions, and delayed responses from the previous context
    cannot restore them;
25. an uncatalogued SynthDef can be inspected, while `@awb/instruments` annotations remain optional;
26. joining a NodeManager entry to SynthDef metadata never creates or changes tool ownership.

Manual acceptance must exercise real desktop sclang, realistic sustained OSC traffic, active
multichannel audio and both tools visible together. A build, unit test or screenshot alone does not
establish useful desktop behaviour.

## 20. Explicit non-goals

- A single React root or global state store for every AWB tool.
- Making Toolkit Home a global document, transport or musical-state store.
- Copying Electron code into each tool repository.
- Replacing the tools' web applications.
- Generalizing every semantic protocol into one message vocabulary.
- Passing audio or visual sample buffers through lifecycle IPC.
- Direct JavaScript access to desktop scsynth buffers.
- Moving Lissajous file/library/export workflows into its first hosted view.
- Saving Lissajous automation in the first integration.
- Making NodeManager or the shell the owner of authored tool content.
- Choosing tabs over windows before the multi-tool workflow has been used.

## 21. Current handoff — shared host and Toolkit Home

Slices 1–3 are implemented. The shell engineer now owns Slice 4 in `~/awb`, starting from the
neutral shell plus AWB commit `c215f91`. The awbCollider side of the read-only SynthDef-context
protocol is commit `4cf3f0d`. The Lissajous engineer continues to own its renderer artifact and
host adapter; unrelated in-progress system-audio changes must be preserved during this work.

The handoff must retain these boundaries:

- one shell-owned host connection lifecycle, with scoped logical connections for tools;
- distinct sclang, scsynth-readiness, SynthDef-context and NodeManager status;
- opaque transport and caching in the shell, with semantic graph analysis in
  `@awb/synthdef-interface` and tool renderers;
- `@awb/instruments` as optional authored annotation rather than a universal registry or execution
  allow-list;
- explicit ToolInstance/container ownership, never inferred from SynthDef names;
- tools remaining launchable when desktop SC, SynthDef context or NodeManager is unavailable;
- manifest-driven document actions without shell ownership of document content.

The first implementation checkpoint is one attached desktop host serving two concurrent tool views
without duplicate SynthDef graph transfers or NodeManager subscriptions. It must demonstrate stale
context invalidation, independent playback readiness, view-local teardown and continued standalone
operation. Do not wait for a universal tool-state schema, automation design, tabs, headless sclang
or final installer packaging.


## 22. Shared Loop instrument — implemented 2026-10-01

Toolkit Home exposes Shared Loop through a hosted launch profile. It uses the active local SC
server and inherits audio devices, channel counts, block size and actual sample rate. It does not
boot a second scsynth or request 48 kHz. The shell-managed host extends normal plugin discovery
with the installed SharedLooper plugin and loads the bounded allocation bridge. An attached IDE
requires explicit preparation before boot; live hosts are never rebooted automatically.

The trusted optional manifest runtime is `awb.local-runtime/1`: a contained ES-module entry
receives shell-provided context and returns a loopback HTTP URL and a stop method. Renderer Node
privileges remain disabled, and host credentials remain in the trusted runtime. The shared-memory
waveform is a min/max mirror of the mono looper Buffer, not direct access to Buffer backing storage.

The SC bridge allocates Buffer/node identities through the language's allocators. View closure
releases only the looper synth, Buffer, region and Node service, preserving its host and unrelated
nodes. Runtime teardown precedes owned-host shutdown on shell quit. Host-stop requests are blocked
while the instrument runtime is active. The versioned artifact contains native binaries, sources
and a compiled SynthDef; SynthDef analysis/NodeManager registration remain outside this slice.

Validation: 50 shell unit tests, Electron Home and the real shared-host looper Electron gate passed.
The latter verifies same-server identity, inherited sample rate, record/overdub/waveform, resource
release, an unrelated surviving SC node, and shell quit with an active looper. IDE preparation was
evaluated in sclang and preserved audio options without booting a server. The system-selected
interface in this run was “1248”, reporting 48 kHz; that rate was not requested by the instrument.
The existing headless Score Studio/Field test fails with “Hosted score played but reported no runtime
realization” both with this bridge and against the original bootstrap without it; that separate
failure remains unresolved. Mic capture and audible looper output remain unverified. See the shell
README for startup and preparation instructions. Vault status update is pending MCP reauthentication.


### Shared Loop live scopes — implemented 2026-10-01

Two owner-bound auxiliary windows expose raw mic/input 1 and final SC output buses 1–2. They
use built-in ScopeOut2 transport and language-allocated ScopeBuffers; one native reader copies
1,024-frame snapshots into owned JS storage and fans them out over binary WebSocket packets. The output tap is
kept at the root-group tail when root nodes are created or moved. This observes hardware bus audio,
not the looper Buffer's waveform, and writes no audio or device/rate configuration.

The fixed `scope.open` request accepts only mic/output from the Shared Loop owner. Scope windows
have no Node integration, preload or additional host grants. Closing/reopening a scope affects only
its window; closing the instrument closes its scopes and releases readers, writers and allocated
scope indices. Freeze and display gain are visualization controls. Validation passed 50 shell
unit tests, Electron Home, and the extended real Electron looper/scope gate with independent bus
probes, sandbox checks, freeze/reopen, resource release and an unrelated surviving SC node. Captures
were inspected. Physical mic capture and audible output are not established by those probe checks.
Vault updates remain pending MCP reauthentication; no direct vault-file writes were used.


### Shared Loop scope zoom and cost assessment — 2026-10-01

Scope windows remain separate. Each has 1×/2×/4×/8× horizontal zoom and a position slider
within the existing 1,024-frame snapshot, usable while live or frozen. Zoom changes only display
coordinates and time labels. The real Electron gate checks both viewers' zoom/pan/reset, routing,
normal teardown and host/node isolation.

The original JSON/SSE test-owned measurement run reported about 0.36% average SC audio CPU with scopes and 0.45%
while overdubbing; visible scope renderers each used roughly 8–9% of one core, and two scope SSE
feeds carried 1.92 MiB/s of JSON. Shell main used about 9% of one core including other host/tool
work. The assessment records measurement limits, memory/copy budgets, native ABI dependence,
reader ownership, stale producer status, unbounded SSE backpressure and incomplete crash/reboot
recovery. Binary bounded scope delivery has since been implemented; one host-owned tap and recovery
remain follow-up work before scaling.
See `tool-artifacts/shared-loop/0.1.0/ASSESSMENT.md` for evidence and reproduction. These short
measurements establish neither load tolerance nor long-session stability. Vault MCP remains
unauthenticated; no local vault-file fallback was used.


### Shared Loop reuse guide and component cost evidence — 2026-10-01

The artifact now includes `GUIDE.md` with a source map, startup/teardown contract and adaptation
paths for existing instruments and GUIs. `COMPONENT_COSTS.md` and captured JSON record a minimal
Electron/SC sweep without Studio/Field: looper playback/overdub, one mic or stereo viewer, two
viewers, lower delivery/sample counts, capped painting, and real SC Qt ScopeView comparisons.
Both Node readers are detached before Qt uses the same scope indices. The benchmark is optional
and owns its own processes; it does not restart the user's host. Production quality defaults are unchanged.

The original JSON/SSE sweep reported playback SC audio CPU about 0.22% (0.15% probe baseline); overdub about 0.29%. One Electron
scope renderer used about 10% of one core; Qt used about 3% in sclang. Two Electron scopes used
about 19% renderer + 3% main versus 4.3% sclang/Qt; matched 30 Hz capped painting reduced the
Electron renderers to 14%. Raw binary payloads are about 5.5 times smaller than sample JSON, and
a copied binary encoding microbenchmark was about 27 times faster than JSON encoding. These
are short implementation-specific observations, not a whole-app/framework or production guarantee.
The existing N-API typed arrays are reused by the binary scope transport described below.
Vault status remains pending MCP reauthentication.


### Shared Loop binary scope delivery — 2026-10-01

Scope sample JSON/SSE is replaced with WebSocket subprotocol `awb.scope.v1`, a versioned
48-byte header and planar Float32 samples. The browser views its received ArrayBuffer directly.
Small status changes and frame acknowledgements use JSON; loop waveform SSE and audio/native
producer behavior remain unchanged. `/api/scopes` exposes metadata/counters, not sample arrays.

Each viewer has at most one unacknowledged frame; updates while blocked replace the latest
snapshot, and a viewer without acknowledgement is terminated after five seconds. Same-origin
loopback upgrades, kind/protocol, packet dimensions/version/identity and ACKs are validated.
Eight protocol/socket tests pass, as does the real Electron binary probe/zoom/freeze/cleanup gate.
The first Electron attempt failed its existing unrelated Field isolation assertion; retry passed.

The binary scope-only run measured 0.353 MiB/s for both viewers versus the earlier 1.92 MiB/s
JSON baseline (81.5% less traffic). Full packet encoding measured 14.08 µs/pair versus 227.96 µs
JSON. Main CPU was 2.72% and combined renderer CPU 17.65% of one core: a modest observed CPU
reduction in short separate runs, not an 82% CPU saving. The implementation/reuse guide and
binary transport document retain raw results, layout, dependency and measurement commands. Restarting the shell loads the changed backend; user hosts were not
restarted by this work. End-to-end zero-copy, GPU rendering and crash/reboot recovery are outside
this change. Historical JSON/Qt benchmark data remains available for comparison. Vault status
is still pending MCP reauthentication.


### Shared Loop wider scopes and control-bus comparison — 2026-10-01

Outward zoom ¼× / ¹⁄₁₆× increases audio captures to 4,096 / 16,384 samples and reduces them
to 1,024 min/max bins in the native reader. Peak/RMS use all source samples. A third sandboxed
window shows a private 1 Hz control-bus LFO through In.kr → ScopeOut2.kr, using actual audio
rate / block size. Native read-slot caching reuses completed owned snapshots until SC publishes
again, avoiding repeated reduction/allocation/transport. Wider blocks publish on completion,
not as a rolling 30 Hz history. The UI labels source points/bin, actual rates and capture duration.

Protocol awb.scope.v2 uses a 64-byte header with sourceFrames, format/domain flags, block size
and actual audio rate. The host owns/frees the additional bus and scope; no audio routing or
device options change. Restart shell/owned SC host to load rebuilt native code and new allocation.
WIDE_SCOPES.md records replication, cost evidence and limits. The looper smoke no longer opens
Field Modelling or any unrelated app; host/node isolation is verified with a simple test SC group.
Vault updates remain pending MCP authentication.

The isolated scope-only wide sweep measured both audio viewers at 0.353 → 0.074 MiB/s,
18.01 → 8.98% combined renderer CPU and 3.10 → 0.98% main CPU (one core). The widest
control view used 3.15 KiB/s and 7.04% renderer CPU. Five-second sequential measurements
are indicative; larger captures sacrifice freshness and increase shared sample allocation.
Raw current-mode results are preserved beside WIDE_SCOPES.md.


### Shared Loop control noise array and fast LFO — 2026-10-01

The existing control window now shows six private control-bus channels: SinOsc.kr at 1/10 Hz
and four independent LFNoise0.kr generators at nominal 1/5/20/100 Hz. Stacked colored lanes
and an all/noise/slow/fast selector preserve freeze, gain and capture zoom. Selecting lanes
changes drawing/selected-channel meters only; native capture and transport retain all six.

SC allocation, scopeview.node and compiled tap were rebuilt together. awb.scope.v3 carries a
96-byte header with six peak/RMS slots; the audio codecs and renderer are updated in the same
artifact. Prior mono-control cost tables are historical, not six-channel CPU measurements.
WIDE_SCOPES.md records layout, calculated payload budgets, source provenance and replication.
Focused validation uses only Shared Loop/scopes and its owned test SC host; no Field or Studio
launches. Vault update remains pending MCP authentication.


### Shared Loop rolling chunk history — 2026-10-01

The large completed captures are superseded by fixed 1,024-sample audio and 32-value control
chunks. Native step 1/4/16 min/max reduction feeds bounded browser rings over up to 16 baseline
windows. Private per-source counter channels give exact source intervals; duplicate chunks are
ignored and lost intervals remain gaps. Freeze owns a composite copy while collection continues.
Scope collection polls independently every 8 ms; loop summary stays at 33 ms. Capture duration
and publication cadence no longer grow with outward zoom.

Physical ScopeBuffer channels are 2/3/7; native output strips counter channels to 1/2/6.
awb.scope.v4 adds a Float64 exclusive sourceEnd in a 104-byte header. Source clocks unwrap
ordinary counter rollover but do not provide epochs or whole-period-stall/crash recovery.
Sources are explicit: raw hardware input 1, final stereo hardware output, and demo-generated
SinOsc.kr 1/10 Hz plus LFNoise0.kr [1,5,20,100] on six private control buses. Recorded-loop
summary remains a separate custom-UGen path. All 14 unit tests and the real Electron composite,
signal, freeze/sandbox and cleanup gate pass. No Field or Studio tool is opened. Installed native
binaries and SynthDefs are rebuilt; activation requires shell/owned-host restart. Current guide
and WIDE_SCOPES.md explain reuse and distinguish budgets/current evidence from historical costs.
Vault write remains pending MCP authentication; no direct vault write is used.


An isolated rolling scope sweep (no unrelated tools) measured the audio pair at 581 → 82 KiB/s
for 1× → ¹⁄₁₆×, maintaining ~47 source chunks/s per kind. Combined visible renderer CPU was
18.35 → 15.20% of one core; main 5.27 → 4.87%. Six-lane control was 20.3 → 4.64 KiB/s and
~7.8% renderer CPU. Short sequential phases, all taps/readers active, no sustained-load/Qt
comparison claim. Raw rolling results are retained; historical JSON/giant-capture results remain.


### Shared Loop connection and control-lane cost separation — 2026-10-01

A focused minimal-host benchmark mode (--control-cost-only) measures cached idle connection,
streaming with Canvas painting suspended, and 1/4/6 drawn control lanes in forward/reverse sweeps.
No production behavior change and no unrelated tools opened. Six channels remain captured and
transmitted; audio taps/readers remain active without viewers. Main baseline was 2.93% of one
core with the bridge versus 0.39% idle. Idle connected renderer was below timer resolution;
streaming without Canvas painting ~4.2%; drawing one lane ~7.7%, six ~8.4%. Five additional
visible lines cost ~0.7 percentage points in this short run, with fixed ~4.7 KiB/s feed. These
are drawing increments, not measured changes in SC generator count or channel transport.
CONTROL_COSTS.md and retained raw results record methods, repetitions and limitations.
The 12-phase run passed diagnostic assertions and normal owned-resource cleanup (exit 0).
Vault update remains blocked by MCP authentication. No commits/merges or live-host restarts.


### Shared Loop multichannel audio marginal-cost experiment — 2026-10-01

An isolated six-channel SinOsc.ar scope fixture tests 1/2/4/6 drawn lanes at raw 1× and reduced
wide ¹⁄₁₆×, with forward/reverse sweeps and idle/no-paint baselines. Real audio-rate SC signals,
no hardware output, no Field/Studio launch, no live host or production stereo changes. Native
addon/codec/UI adaptations are built only in a temporary test copy, under hash guards.
The 24-phase run passed channel/rate/peak/format, drawing and normal-cleanup checks. Renderer
CPU averaged 11.51→12.70% raw and 10.84→13.45% wide for one→six visible lanes (one core).
The five-lane increment is ~1.2/~2.6 percentage points versus ~0.7 for control. Audio no-paint
renderer was ~7.7%; feed stays six channels (~1.1 MiB/s raw, ~147 KiB/s wide) for all lane counts.
This measures drawing increments, not source-count scaling or sustained-load certification.
AUDIO_CHANNEL_COSTS.md retains raw evidence, fixture/reproduction and limits, including one
SC peak outlier. The normal shell still provides mono mic/stereo output scopes.
Vault update remains blocked by MCP authentication; no commits or merges.

The separate six-lane visual gate passed raw/wide source spans, fixed display-bin count, live
state, single repaint-loop cadence and reachable controls/footer. Both screenshots and the
visual-only results are retained separately from the cost sweep; production hash guards passed.


### Shared Loop canvas/window cost comparison — 2026-10-01

An isolated 71-phase fixture measures control and six-channel synthetic audio at raw/wide
zoom, with 1/2/4/6 lanes: one shared canvas, separate canvases sharing a page/feed/history,
and separate per-channel Electron windows with independent full six-channel subscriptions.
Total waveform area is fixed at 620 × 240 CSS pixels; extra window UI area is not fixed.
Endpoints one/six have two repeats; two/four have one. Production reader/addon/codec/GUI/host
hash guards passed unchanged, normal owned cleanup exited 0, and no Field/Studio/live host
was launched or restarted. Six-case smoke and all 71 phase assertions passed.
Including GPU/Utility process CPU, six wide control lanes cost 30.6/40.5/97.7% of one core
for shared canvas/separate canvases/separate windows; wide audio 57.6/68.4/142.1%.
Separate canvases add ~9–12 points across raw/wide cases, mostly GPU-process CPU; six windows
duplicate renderer/feed/history work and aggregate payload approximately sixfold.
Renderer RSS is ~87/89/518 MiB for wide control and ~99/99/600 MiB for wide audio, including
shared pages. GPU-process CPU is not GPU hardware utilization; WindowServer is unmeasured.
Wide audio saves ~87% payload yet costs more total display CPU than raw with this min/max
renderer. Six painted wide-control endpoints contained 1–4 missing chunks, preserved as
gaps; audio endpoints were complete. One SC peak was 15.53%; no dropout/load guarantee.
LAYOUT_COSTS.md retains methods, baselines, ranges, screenshots, raw data and reproduction.
Potential repaint-on-change or selected-channel fanout savings remain unimplemented.
Vault MCP update remains blocked: "MCP authentication required. Reconnect to continue using
this server." No direct vault-file fallback, commits or merges.


### Shared Loop native Qt comparison — 2026-10-02

58 paired phases plus an eight-case smoke gate compare installed Qt ScopeView with the
binary browser path, using 620 × 240 total plot area, approximately 30 Hz settings,
short/wide control/audio, six lanes in shared/separate plots/windows and one-lane short
references. The native Qt widget is unchanged; fixture adaptations are temporary.
control short, six shared lanes: Qt language CPU 3.0% versus total Electron 20.9% of one core.
control wide, six shared lanes: Qt language CPU 5.0% versus total Electron 24.6% of one core.
output short, six shared lanes: Qt language CPU 5.0% versus total Electron 33.1% of one core.
output wide, six shared lanes: Qt language CPU 5.2% versus total Electron 42.7% of one core.
Wide Qt completes full captures (control .366 / audio 2.930 Hz) while browser rolling
chunks update at 23.438 / 46.875 Hz; no feature-equivalent framework multiplier is claimed.
Qt shares one language process across windows; Electron duplicates full-feed processing.
QT_COSTS.md retains raw results, methods, RSS, ranges, private reader ownership, drawing
checks and limitations. SC reported average audio CPU was .22–.39%, with one 46.72%
peak in a Qt wide-control phase; no underrun/deadline or loaded-stability claim follows. Normal cleanup/hash guards passed; no Field/Studio/live host was
launched or restarted. Vault MCP update remains blocked by authentication. No commits/merges.


### Lissajous native SC Bus source — implemented 2026-10-02

The `sc-bus-audio` media capability exposes bounded view-owned capture of 2–16 audio channels
from the existing local native host. A language-allocated ScopeOut2 tap publishes 512 raw frames
with an extra source clock channel; a matching-header N-API reader owns snapshots and sends planar
Float32 PCM over binary WebSocket. The Lissajous source type is `sc-bus`, separate from native
hardware capture, Electron system loopback and browser WASM synthesis. Its existing pair-drain
and rendering engine are reused. The per-pattern multichannel pair selector shows absolute SC
bus numbers, retaining unavailable saved pairs as disabled choices. Actual server sample rate is inherited; neither 48 nor 44.1 kHz
is requested. The complete versioned renderer artifact and source hashes have been updated.

Allocation/closure races are serialized; source switching and view closure detach the reader
before freeing only their tap/scope. Observer ordering ignores other tap moves to avoid feedback.
Host disconnect/stalled producer stops capture, slow viewers drop old data with source-clock gap
reporting, and explicit Start recovers. This is a latest-block visual feed, not lossless recording
or arbitrary SC Buffer mapping. Compatible views now share taps through the shell capture broker (see the following milestone).

The focused real Electron gate verifies raw private-bus channel identity, SC gain changing the
rendered image, concurrent taps, bus-range switching, original synth count after closure and
surviving host identity, with no Field/Studio launches. Binary fixtures cover 44.1 kHz; the actual
system-selected test host reported 48 kHz. Long-session stability, crash recovery and adaptation
The initial adaptation did not measure CPU/RSS. The single-pattern comparison below now
provides a bounded measurement. Source branches remain uncommitted.
See [implementation and reuse guide](apps/awb-shell/docs/sc-bus-audio.md). Vault and Telegram MCP
tools are absent in this session, so the milestone has not been written to the vault or notified
through Telegram. No direct vault-file fallback was used.

### Shared SC signal engine — implemented 2026-10-02

The shell now owns a reference-counted signal capture broker used only by Shared Loop scopes
and Lissajous SC Bus. Identical host/rate/bus/channel requests share one ScopeOut2 allocation,
N-API reader and source clock. One 4 ms timer services active sources; the final subscriber
frees its source and the final source stops polling. Overlapping ranges are not coalesced yet.
One observer group/order controller per server replaces per-tap tail-following. Normal closure
restores the original synth/group counts and leaves unrelated producers/host alive.

Hosted Shared Loop protocol v2 creates no scope tap or LFO/noise producer before a scope opens.
Scope windows demand their individual feeds, and the control generator follows control-view
lifetime. Scope audio combines consecutive 512-frame raw captures into 1,024-frame display
chunks and applies its own step 1/4/16 reduction. Lissajous retains raw paired PCM. Scope history
views are built once per paint with reusable storage; grids are cached and frozen viewers stop
painting. Publication freshness follows source clocks instead of cached-read timestamps.
The legacy reader remains available to standalone/benchmark paths.

The slice changes no hardware-input, system-loopback, browser/file/WASM routing, device options
or rate selection; Lissajous source/artifact and Field code are unchanged. Validation passed
60 shell tests, 19 scope units, 3 native-audio units, 32 Lissajous route/codec/config checks and
two focused Electron gates. The scope gate proves capture sharing, raw PCM unaffected by zoom,
peer survival after looper closure, final-release cleanup, and no frozen painting. The Lissajous
gate checks drawing/pair routing and both synth/group restoration. No Field/Studio app opened.

This first slice had no new CPU/RSS comparison; the next milestone below now provides one.
Physical-device regression under load, crash/reboot recovery and long-session soaks remain unmeasured. Historical cost reports are preserved; their results do
not measure this new broker. No global renderer/GPU context, range coalescing or zero-copy
MessagePort path is implemented. See [architecture, reuse and evidence](apps/awb-shell/docs/shared-signal-engine.md).
Changes remain uncommitted on `design/score-studio-layout`. Vault and Telegram MCP tools are
absent, so no vault write or Telegram notification was made; no direct vault fallback was used.


### Shared scope derivation and selected delivery — implemented and measured 2026-10-02

Trusted adapters now use `SignalCaptureBroker.subscribeDerived` to share joining, peak/RMS and
min/max work across identical display profiles. Raw SC Bus subscribers retain their original
512-frame paired PCM and codec. Scope v5 has a 112-byte header with a physical channel mask;
viewers receive only selected lanes. Packet variants are cached per snapshot/mask within a
transport; history remaps retained physical lanes and keeps unavailable past values as gaps.
Frozen subset views offer only saved channels until resumed. Zoom changes display profiles
without releasing the physical source; per-kind zoom remains shared within one runtime.

Repeated allocation exposed preceding-writer cached data in reused SC ScopeBuffer slots.
The native reader now waits for a fresh compatible startup publication. Both measured versions
include that correction; it is not counted as an optimisation saving. Native build passed.

The focused comparison contains 96 measured phases (24 cases, two 8-second samples per version).
No Studio or Field apps opened; private SC test producers, equal waveform area and unchanged
source cadence/rate. One selected audio lane: 1129 → 192 KiB/s (~83% saved), Electron total
30.0 → 28.2% of one core. Six separate raw audio windows: 6806 → 1149 KiB/s (~83%), total
127.7 → 114.2%. Two compatible wide adapters demonstrably share one transform per raw frame,
but main CPU remained ~6.3% and total ~91%; CPU benefit is not established there. Capture-only
CPU differences are also not attributable to the display optimisation. Full-channel v5 frames
add eight header bytes. Repeat ranges, gaps, SC CPU, RSS and measurement limits are retained.

Validation: 65 shell units, 24 scope units, 3 native-audio units, 32 Lissajous route/decoder/
worklet/config checks, two actual-shell Electron gates, and full before/after runs. The gates
check actual all/noise/slow/fast selection, subset freeze, raw-peer survival and cleanup.
77 protected audio-route/Lissajous source/artifact files and 19 historical report/result files
match their pre-change hashes. Hardware-device regressions and long-session reliability remain
unmeasured; latest-publication audio gaps occur and are preserved, not hidden.

See [full current cost report and raw evidence](apps/awb-shell/docs/scope-optimisation-costs.md)
and [architecture/API/reuse](apps/awb-shell/docs/shared-signal-engine.md). The harness supports
fixture-only `--before` replay from retained pre-optimisation sources. Restart the shell to load
Node/native changes; no automatic restart of the user's host was performed.

The 30/15 Hz comparison is now complete in the following milestone, including separate-window
layouts and every available ingress chunk retained. GPU/compositor and renderer costs dominate several cases; inspect
actual graphics feature status and draw work before choosing shaders. Range coalescing,
worker/MessagePort transport, independent per-socket zoom and long-session/crash testing remain
unimplemented. Other audio routes and Field are unchanged. Work remains uncommitted on
`design/score-studio-layout`; Vault and Telegram MCP are unavailable in this session.


### Scope painting cadence — implemented and measured 2026-10-02

Scope Refresh now offers Auto/30/15 fps per window; Auto remains default. `ScopePainter` schedules
dirty display views against steady animation-frame deadlines, keeping decode/history append/
acknowledgements outside the limiter. It skips missed deadlines, does no idle work, redraws
controls on the next animation frame and cancels pending timers/frames on closure. Frozen
views keep receiving history without painting. Sample/bin resolution and capture cadence stay
unchanged; lower refresh trades visual freshness and fluidity for lower drawing cost.

The focused test interleaves Auto/30/15 and reverses the order for two 8-second samples across
12 audio/control × short/wide × one-canvas/separate-canvases/separate-windows cases: 72 phases.
Only test-owned hosts/windows and private producers; no Field/Studio or live-host restart.
Actual audio paint rates were ~47 → 30 → 15 Hz while ingress remained ~47 Hz. Control ingress
was ~23.5 Hz; 30 fps does not save its drawing work, while 15 fps does.

CPU means (whole test-owned Electron tree, percentages of one core): one raw audio scope
30.3 → 26.4 → 20.7%; six raw audio canvases 46.0 → 36.5 → 26.6%; six raw audio windows
120.6 → 96.3 → 71.6%; six wide audio windows 131.2 → 106.1 → 70.9%. The last case saves
about 46% at 15 fps. CPU benefits mainly occur in renderers/GPU process; capture/transport costs
remain. The largest observed paint interval was 116.7 ms; largest sampled endpoint source lag
85.3 ms. Source-publication gaps remain visible; this is not a lossless or long-session guarantee.

29 scope unit tests and the actual-shell gate pass, including raw-peer isolation, rate changes,
freeze and changing canvas pixels. The six-case smoke and all 72 measured phases complete
with expected synth/group cleanup. One early smoke hung during case switching and was stopped;
bounded test-cleanup diagnostics were added and later runs completed. Its cause was not established.
122 protected source/native/audio/SC/Lissajous/historical artifact files and six prior shell
measurement files remain byte-identical. No native build, audio route or sample-rate change.
The test host chose 48 kHz from defaults; user's normal 44.1 kHz configuration was not replaced.

[Full cadence report, raw results and replication](apps/awb-shell/docs/scope-cadence-costs.md).
Restart the shell for its new asset route and reopen scope windows; no SC reboot is needed.
Changes remain uncommitted on `design/score-studio-layout`. Next useful work is a browser trace
that separates canvas path/raster/upload, per-packet DOM work and per-window compositor overhead
before choosing a shader or MessagePort rewrite. Long-session and physical-device/load tests
remain unmeasured. Vault/Telegram tools are absent, so those MCP updates were not possible.


### True mono scope routing baseline — measured 2026-10-02

One captured mono audio channel is measured, rather than one drawn channel from a six-channel
source. A disposable actual-shell instance keeps its normal Home, hidden render-worker, services
and owned SC supervisor, with no catalogue tool views/jobs. It is compared with a minimal host;
within each host, current direct native-source polling and the broker share a 4 ms collector,
1,024-frame reduction, v5 transport/history, fixed 620 × 240 plot and 30 fps painter. Direct
bypasses the broker; this does not replay the historical custom reader/JSON/SSE implementation.

Four forward/reverse repetitions, 12-second samples: 20 phases per host, 40 total plus ten smoke
phases. Actual-shell total Electron CPU means (percent of one core): idle
1.9%; mono capture-only through broker
6.6%; one drawn line direct
27.7%, broker
28.0%. Minimal drawn-line direct/broker:
25.9/25.9%. Paired actual-shell
broker-minus-direct total mean +0.31 percentage points, observed repeat range
-0.33 to +0.97. All current Electron processes/helpers are counted; SC CPU is separate.
The historical 12.51% main+renderer figure excluded GPU/helpers and used another workload.
These results do not establish the historical backend increase's exact cause.

All phases pass mono/source contracts, live rate/clock/pixel checks and owned capture/SC node
cleanup; 136 protected production/native/audio/SC/Lissajous/historical files match pre-run hashes.
No production code, native build or audio settings/routes change. Both test hosts report
48 kHz from defaults; no 44.1 kHz measurements or physical-device/long-soak/load guarantee.
Full shell's normal extension/plugin warnings remain; fixture startup fixes are measurement-only.

[Full mono baseline, CPU components, paired ranges, source gaps, memory and reproduction](apps/awb-shell/docs/one-line-scopes-costs.md). Changes remain uncommitted on
`design/score-studio-layout`. The baseline question is now measured; the next optimisation
question remains Canvas/raster/compositor and capture/poll cost, rather than assuming broker
routing explains the large historical-looking CPU jump. Vault/Telegram MCP tools are absent.


### Single live 5,000-point Lissajous comparison — measured 2026-10-02

The current published Lissajous artifact was launched through the actual shell with its distinct
SC Bus source, one default pattern and 5,000 active points. A stereo private bus producer feeds
XY; a mono scope reads the first channel. Both plots are verified at 620 × 240/DPR 1, in
1,100 × 700 windows. Home/hidden worker stay loaded; no Field or Studio view/render job opens.

Four forward/reverse repetitions (16 measured phases, four successful smoke phases) give total
Electron CPU means of 27.1% of one core for the 1,024-point scope at 30 fps, 35.7% for the
5,000-point pattern at ~60 point draws/s, and 28.1% with a fixture-only 30 fps RAF cap. The
cap saves 21.3% of normal-pattern total CPU. Its paired difference from the scope averages
+0.98 points, observed range -1.75 to +3.96, so comparable cost is supported; consistent
superiority is not. Geometry uploads at normal refresh are ~38.7/s despite ~59.9 point draws/s.
The existing geometry-frame-rate control alone therefore does not bound actual scene painting.

The test uses the current native source/broker/binary SC Bus path without a native rebuild,
asset republication or production route/renderer edit. All 143 original source/native/published/
historical guards match. Every viewer phase checks live clocks, changed pixels, draw/upload
activity and bounded paint gaps; closure restores source node/group counts and stops polling.
Measured SC rate was 48 kHz selected by the test host, with no forced rate/device option; the
user's normal 44.1 kHz setup is not claimed as measured. Process CPU excludes WindowServer
and GPU hardware load. Short samples are not a loaded-audio or long-soak stability guarantee.

[Full report, CPU components, observed ranges, memory and raw evidence](apps/awb-shell/docs/lissajous-scope-costs.md).
Changes remain uncommitted on `design/score-studio-layout`. A production painting cadence
option is a possible follow-up, not implemented by this measurement. Vault/Telegram MCP tools
are absent from this session, so those external updates/notifications were not performed.


### Scope metadata separation and trace polish — implemented 2026-10-03

Scope meters and rolling text use an independent 8 Hz scheduler, with immediate connection
transitions and user-action feedback. Waveforms keep their Auto/30/15 fps scheduler. Binary
delivery/ACKs, native source, broker, SC tap, reduction and source-indexed history are unchanged.
Rounded raw traces and connected, lightly filled min/max envelopes replace fragmented bin
strokes; real gaps remain separate. The later trace-mode update below replaces automatic
control steps with explicit, source-independent connections.

Validation passes 36 scope units and the actual-shell shared-loop Electron gate, including
raw-peer isolation, zoom/freeze/cadence and lifecycle cleanup. An inspected, retained synthetic
before/after fixture measures text changes at 8.0/s versus 29.9/s before, with 29.9/s waveform
painting retained. All 142 other guarded originals from the preceding comparison match; only
the intended scope.js changes within that inventory. Server/benchmark adapters also gain two
static module routes. CPU was not measured at this initial validation; the later 36-phase recheck below supplies current results. Published Lissajous
assets and all other audio routes remain unchanged.

[Implementation, screenshots, evidence and reproduction](apps/awb-shell/docs/scope-display-polish.md).
Reopening Shared Loop is required for the module routes; closing the demo releases its loop
buffer, so do this between takes. No manual SC reboot, native rebuild or forced rate/device
is required. Changes remain uncommitted on `design/score-studio-layout`. Vault/Telegram MCP
tools are absent; repository documentation is updated and external updates remain unavailable.


### Control-scope single-line regression corrected — 2026-10-03

The initial min/max polish incorrectly drew two outlines on widened control lanes. Control
scopes now keep the existing raw step-1 profile and compose up to 2,048 ordered control
samples. The initial correction drew one open stepped trace per channel; the later trace-mode
update below makes the connection style user-selectable. Quarter zoom retains the same duration with 512 points. The meter/text scheduler
remains 8 Hz. Physical capture, SC rates/devices, native/broker implementation, audio-scope
reduction and Lissajous are unchanged. Widened control traffic and vertex counts increase
relative to the old reduced profile; their CPU cost is quantified by the later recheck below.

All 37 scope units and the live shell gate pass. A new quarter-zoom canvas geometry check
verifies six open control traces, zero closed polygons, with raw full-history and LFO/noise
fidelity checks retained. The corrected live screenshot was inspected.
[Correction and evidence](apps/awb-shell/docs/scope-display-polish.md#control-single-line-correction--2026-10-03).
Reopen only the control scope to load this fix; the looper/SC host can stay running. Changes
remain uncommitted; Vault/Telegram MCP tools are unavailable in this session.


### Shell startup diagnosis — measured 2026-10-03

At the time of this measurement, the npm `prestart` hook rebuilt all 17 workspaces before every launch. An isolated
unchanged-source warm build takes 9.62 s; a clean Swift-helper build takes 87.81 s. The bridge
work adds an unconditional SC addon compile, measured separately at 2.46–2.91 s. That is a
real additional startup cost even though the latest scope UI modules are not loaded at Home.

Four current-startup repetitions reach Home's show event in 0.763 s (0.734–0.789), with the
first catalogue snapshot rendered in 0.744 s. Deferring the normal hidden render worker in a
fixture saves 140 ms to the show event and 70.5 ms to catalogue readiness. Manifest loading
averages 25.25 ms, so parallel manifest loading is a lower priority.

Priorities: separate build/launch, correctly invalidate incremental native addon builds, then
create the render executor on demand while preserving job readiness/cancellation/shutdown.
These were recommendations at measurement time; that investigation changed no production
startup ordering or npm script. Build/start separation is now implemented below. Eight isolated Home
launches and both private workspace builds pass; 138 guarded originals are unchanged, with
no tool views, SC boot or audio capture during the Home tests.

[Full startup report, retained timings, logs and reproduction](apps/awb-shell/docs/startup-costs.md).
Changes remain uncommitted on `design/score-studio-layout`; Vault/Telegram MCP tools remain
unavailable, so the repository reports are retained and external updates are pending.


### Approved scope UI before/after recheck — measured 2026-10-03

Thirty-six actual-shell phases compare pre-polish/current UI with matched native source,
broker, transport, history, canvas and 30-fps cap. Total Electron CPU means include GPU and
helpers: mono audio 34.83 → 23.77%, widened audio 36.08 → 26.98%, one widened control LFO
21.91 → 20.33%, and six controls at ¹⁄₁₆× 24.03 → 35.24%. Mean paired relative changes are
−31.8%, −25.2%, −7.4% and +47.7%. The widest-control increase is mostly GPU-process CPU
(11.52 → 22.01%) after retaining ordered 2,048-sample traces per lane. The next drawing target
is exact compression of held runs/collinear geometry while preserving history and gaps.

All cases check actual changing pixels, rates, profiles, sandboxing, source freshness and
cleanup; maximum observed paint interval is 116.7 ms. Meter-label mutations are about 8/s;
waveform painting remains about 30/s for audio and follows ~23.4/s publications for control.
Audio publication gaps occur in both versions and are more numerous on average after the
changes in this run. Polling-jitter causality and long-session stability remain unresolved;
cheaper overall UI CPU is not a claim of improved capture reliability. Full per-case counts,
paired ranges, CPU components and limitations are retained.

The test-owned host detects 48 kHz / block 64 without a rate/device override; the user's normal
44.1 kHz route is unchanged. No Field/Studio/Lissajous tool view is opened. The host survives
case cleanup; 140 guarded original files are unchanged. The approved UI stays intact.
[Full recheck and raw evidence](apps/awb-shell/docs/scope-ui-costs.md). Changes remain
uncommitted; Vault/Telegram tools are unavailable and those external updates are pending.


### Scope X/Y zoom sliders — implemented 2026-10-03

Scope menus are replaced by logarithmic X (¹⁄₁₆×–8×) and Y (¹⁄₁₆×–64×) sliders with live
readouts, keyboard control and double-click reset. Fractional X spans align to complete source
bins within the bounded ring. Audio retains step-1/4/16 profiles and control retains raw history;
Y changes only drawing. Superseded/duplicate queued capture requests are skipped. Dragging
respects paint caps, and frozen zoom/pan within the held span preserves its source clock.

37 scope units and the live shell gate pass. New checks cover both fractional reduction bands,
independent Y pixel changes, X/pan/freeze/reset, profile-request coalescing and viewport fit for
all three scope types. Physical capture generations stay unchanged and the raw SC peer is not
degraded. 138 other guarded originals remain unchanged; no unrelated tool view opens. Live
and synthetic screenshots/activity are retained. Reopen only the scopes; no looper/SC restart.
[Guide and evidence](apps/awb-shell/docs/scope-zoom-sliders.md).

The slider review also found a limitation in the earlier matched CPU fixture: its imported base
stylesheet was not served. Both versions shared the omission, but absolute GUI CPU costs
need rechecking with the complete stylesheet. The fixture now serves it and the historical
report documents the limitation; earlier raw numbers are preserved. No new CPU claim is made.
Changes remain uncommitted; Vault/Telegram tools are unavailable and external updates pending.


### Scope trace connection modes — implemented 2026-10-03

Every individual-sample scope trace defaults to direct linear connections between measured
points. A per-window Trace selector also offers Stepped, applied uniformly to audio/control
samples without expected-source classification. Gaps split paths in both modes. Reduced
audio keeps the existing min/max envelope; its selector is disabled until raw samples return,
retaining the selected mode. No sample smoothing, source-rate increase, capture request or
new transport is introduced. The existing metadata and waveform schedulers remain separate.

38 focused scope tests, the synthetic Electron UI fixture and the actual-shell Shared Loop
gate pass. Mode changes preserve frozen sample clocks, gaps, levels and zoom/pan, and
switching back restores identical canvas pixels. Production window sizes fit, including
stereo levels. The live gate retains raw-peer isolation, all three scopes and lifecycle checks.
No unrelated tool view opens. Of 46 guarded sources, only the four intended scope UI assets
change; native/SC/broker/transport and shell main remain unchanged. No new CPU benchmark
or saving is claimed. Reopen only scopes; the looper and SC host can remain running.
[Implementation and evidence](apps/awb-shell/docs/scope-display-polish.md#trace-connection-modes--2026-10-03).
Changes remain uncommitted. Vault/Telegram MCP tools are unavailable, so external updates
and notifications were not sent; the vault file was not edited directly.


### Five scope optimisation investigations — completed 2026-10-03

Connected/Stepped costs, redundant geometry, static drawing, history copying and capture/worker
jitter have now been measured in 99 full phases (three repetitions per case), plus 16 smoke
phases. The complete base stylesheet is served; historical UI costs remain separately qualified.
Connected costs 29.00% versus Stepped 36.77% of one core for six widest control lanes, including
Electron GPU/helpers. The separate staged comparison falls from 28.33% to 27.36% after the two
shipped changes: conservative held-run geometry and cached lane labels/dividers. Audio results
are mixed; no audio CPU saving is claimed. No source-character assumptions or history reduction.

Bulk history lowers its own small work cost without a reliable whole-app benefit and remains
fixture-only. Worker attachment/transfer works in isolation but still loses publications in
some full runs, including a power-assertion check. Neither worker migration nor a shell-wide
power policy is shipped. Observation gaps also occur with drawing disabled; they do not prove
audible SC dropouts. Production reader, SC, broker, transport, looper and Lissajous are unchanged.

41 scope units, the 7,200-view experimental history comparison, 72 page/252 trace pixel checks
and the actual-shell gate pass. Pixels match at DPR 1/1.25/2; channel/background invalidation,
freeze, raw-peer isolation and resource cleanup are retained. Only two runtime JS files change
within a 51-source final guard. No unrelated tool opens. Reopen only scopes; keep the instrument
and host running. [Full report, decisions, raw results and reproduction](apps/awb-shell/docs/scope-next-costs.md).

The remaining capture question is source-clock loss versus reader/OS scheduling and whether a
producer queue is needed. Current worker experiments do not establish a reliable fix. Vault MCP
was unavailable; this milestone has not been written to the vault through a direct-file fallback.


### Build and start separated — implemented 2026-10-03

The shell workspace no longer has a `prestart` hook. `npm start --workspace @awb/desktop-shell`
launches Electron from existing artifacts. Run the root `npm run build` explicitly after install
or changes needing compilation; routine starts do not rebuild. The shell's narrower build still
compiles its native SC addon/render worker, while root build prepares workspace dependencies.
Electron startup ordering, CLI flags and the explicit Electron-test build hook are unchanged.

The actual npm workspace launch passes the isolated Toolkit Home smoke check with existing
artifacts and no build lifecycle output. No other tool, SC host or capture starts. Scope rendering
and both Connected/Stepped choices are untouched. Historical startup figures are retained and
qualified in the [startup guide](apps/awb-shell/docs/startup-costs.md). Vault/Telegram tools remain
unavailable, so this repository milestone has no external write or notification.


### Standalone Scope tool — implemented 2026-10-03

A fifth installed tool, `scope`, exposes audio/control rate, a first bus index and 1–16 adjacent
channels through Toolkit Home. It opens stopped, including without SC, and resolves the current
local shell host only on Listen. Multiple independent windows share compatible physical taps
and matching derived display profiles through the unchanged SignalCaptureBroker. Replacements
are transactional; invalid ranges preserve the old capture. Stop/close/renderer disconnect
release this window's lease; host shutdown refuses active captures. The tool does not boot a
private server or override device/rate settings.

The browser reuses the tested history/painter/metadata/trace modules, with generic bus labels,
X/Y sliders, freeze/pan and Connected/Stepped choice. A separate bounded Float32 bus protocol
supports 16 channels without changing the looper's fixed-source v5 format or other audio routes.
Native/SC/broker/Lissajous/looper code is byte-identical in the runtime guard; shell context,
catalogue, a Home icon, new tool/tests and compatible disposable fixtures are added.

Eight new units, the new actual-shell bus gate, 34 existing shell/capture/Home/looper checks and
41 existing scope units pass. Live checks cover 1/4/16 audio channels, 16 control lanes, actual
packet values, image changes, freeze, two scopes sharing a tap/transform, isolated raw PCM peers,
failed replacement and cleanup. No unrelated tool view opens. The complete default window fits.
Restart the shell once for the new catalogue/runtime; no rebuild required and start remains
build-free. [Guide, exact boundaries and evidence](apps/awb-shell/docs/scope-tool.md).
Vault/Telegram MCP tools remain unavailable; no external update or notification was sent.


### Scope phase alignment — implemented 2026-10-03

Standalone Scope now offers optional Rising/Falling threshold triggering on a selected bus.
The crossing is positioned one quarter across the plot, using measured raw sample crossings
and a fractional display shift for Connected mode; Stepped mode uses the held transition.
All channels retain their common time range. Free running remains the default. Missing chunks
are rejected, waiting/held traces are identified, and widened audio envelopes run freely because
their bins do not preserve sample order. No frequency or source-character assumptions are used.

The selected renderer searches one lane of its bounded history and copies the chosen window.
Shared history gains optional endpoint/point reads with unchanged defaults for other consumers;
native/SC/broker/transport and looper renderer/trace code are unchanged in the source guard.
Fourteen Scope units, its actual-shell gate and all 41 existing scope units pass. The live gate
checks stable crossing pixels while new traces continue arriving, threshold waiting, Free running,
raw-peer isolation and layout. No full CPU comparison is claimed. Reopen Scope windows only;
no build or audio-server restart is required. See the [Scope guide](apps/awb-shell/docs/scope-tool.md).
Vault/Telegram MCP tools are unavailable; no external update or notification was sent.


### Attached-IDE Scope setup clarification — 2026-10-03

The standalone Scope guide and artifact README now include the existing one-time attached-IDE
preparation command (`apps/awb-shell/sc/prepare-sc-bus.scd`). Hosted mode uses an attached IDE
when available; unlike the owned headless bootstrap, IDE host startup does not automatically
load the bus responders. An unprepared IDE can advertise scsynth ready while Scope's
`/awb/sc-bus/open` times out. Evaluate the preparation script in that IDE and retry Listen;
no shell/server restart, build, device change or alternate server is needed. Repeat after IDE
class-library recompilation. Runtime code and audio routes are unchanged.


### Per-bus canvas meters and measured cost — implemented 2026-10-03

Standalone Scope adds compact per-channel canvas audio RMS/held-peak and signed control widgets,
with Waves + meters / Waves only / Meters only. The original measured baseline used 8 Hz (the
following milestone updates meters to 15 Hz). That baseline cadence was independent
of waveform painting; unchanged widget paints are skipped. Freeze leaves meters live. Existing
binary packets and shared subscriptions supply the data, so no additional SC tap or transport
payload is created. Meters-only skips wave drawing but still carries PCM and appends history.

A complete actual-shell cost matrix measures 1/4/16 audio/control buses in capture-only, waves,
meters and combined views: 50 phases, two reversed-order passes at roughly six seconds per phase.
Totals include Electron GPU/helper CPU and exclude SC. At 16 channels, meters-only averages
20.90% of one core for audio / 16.12% for control; combined averages 38.57% / 25.71%. Adding
16 meters to waves adds 6.18 / 4.98 percentage points, versus 1.92 / 2.67 at four channels.
The meter canvas calls themselves take about 3.1–3.4 ms/sec for 16 widgets; process overhead is
mostly outside those calls. See the [full cost report](apps/awb-shell/docs/scope-meter-costs.md),
raw phases, limits and proposed next comparisons. These are not a rerun of the Qt comparison.

Stressful range cycling exposed a native cached-startup clock failure. Only before accepting
its first frame, the rebuilt reader now waits past invalid cached clocks for valid advancing
publication. Active-clock corruption remains an error. An old-addon native probe reproduces
the bug; the new probe and final 50-phase run pass. Restart the shell once for this addon;
an attached IDE/audio server can remain running. No full build or device/rate change is needed.

Seventeen Scope units, the native guard probe, the actual-shell widget/trigger/raw-peer gate
and 41 existing scope units pass (60 checks). No unrelated app is opened by the cost matrix.
No SC bridge, broker, codec, looper renderer or other audio-route configuration changes.
Native reader startup validation and its addon are the explicit shared-runtime exception;
shared metadata gains the widget helpers, with existing metadata scheduling unchanged.
Vault MCP/Telegram are unavailable; no external update or notification was made.


### 15 Hz frame-aligned Scope meters — implemented 2026-10-03

Scope's canvas meters now have a separate 15 Hz painter, sharing browser-frame callbacks and
clock phase with its waveform painter. Text labels retain the independent 8 Hz scheduler.
With sufficient incoming data, this aligns meters with every second 30 Hz wave frame or every
fourth 60 Hz browser frame. Frozen/hidden/waiting waves do not stop meters; idle/closed views
schedule no recurring work. Existing ScopePainter consumers retain their default behavior.
Reopen Scope for this renderer change; no build, native reload or SC restart is needed.

Matched 8 Hz timer versus 15 Hz shared-frame comparisons completed 52 phases, two opposite-order
passes per schedule, at 1/16 audio/control buses. Totals include Electron helper CPU and exclude
SC (100% = one core). At 16 buses, meters-only averaged 21.69 → 27.26% audio and 16.29 → 22.06%
control; waves + meters averaged 38.09 → 39.72% and 26.36 → 30.77%. Adding meters relative to the
wave-only baseline rose from 5.68 → 8.20 percentage points audio and 5.40 → 12.36 control.
Actual updates are approximately 15 Hz. Audio meter/wave callbacks share frames ~98–99.5% of
the time; control shares ~36%, with waveform painting limited by its ~23 Hz publication feed.
Faster updates are enabled as requested; this is not a demonstrated cost saving.

See the [full 15 Hz comparison](apps/awb-shell/docs/scope-meter-15hz.md), including paired ranges,
wave-only baseline shifts and raw evidence. Sixty-three checks pass (20 Scope units, native
clock probe, actual-shell gate and 41 existing scope units). Capture/native/SC/codec/history,
other app audio routes and interpolation are unchanged. Only Scope uses the new optional
frame clock. Tests open no unrelated tool or modify the user's live host. Vault MCP/Telegram
remain unavailable; no external update or notification was sent.


### Channel-linked CSS opacity examples — implemented 2026-10-03

Standalone Scope adds View → Opacity widgets / Waves + opacity, with 24/48/96 px or all-size
knob-like DOM indicators, driven individually by selected audio/control buses. Only opacity
changes. Audio packet RMS −60…0 dBFS and signed controls −1…+1 map to opacity 0.12…1. Static
labels/pointers remain fixed. The user can select 8 or 15 Hz; shared frame scheduling is opt-in
and existing painter rate validation remains unchanged. Frozen/waiting waves do not stop the
indicators. Stop clears them, and view/size/cadence switches keep the capture lease.

A complete actual-shell matrix passed 54 phases, two opposite-order passes at ~six seconds
per phase, with 1/16 audio/control channels and all individual sizes/rates. Total Electron CPU
includes helpers and excludes SC (100% = one core). At sixteen 48 px indicators, audio totals
were 21.71% / 22.85% at 8/15 Hz, versus 13.45% capture-only and 30.56% canvas-meters-only
at 15 Hz. Control totals were 15.05% / 17.49%, versus 8.71% capture-only and 24.95% canvas meters.
There was no monotonic size-cost increase; 15 Hz was consistently heavier than 8 Hz. The actual style-update function
took 0.29–0.85 ms/sec for 16 elements; that excludes later browser presentation work.

See the [full opacity demo/cost guide](apps/awb-shell/docs/scope-opacity-costs.md) for all sizes,
paired increments/ranges, waveform combinations, reproduction and raw evidence. An endpoint-only
pixel assertion initially caught matching periodic brightness; final probes can check a later
rendered frame outside CPU sampling. The failed partial run is retained and excluded from costs.

Sixty-seven checks pass (24 Scope units, native probe, actual-shell gate, 41 existing scope units).
Audio/native/SC/broker/codec/history/looper hashes are unchanged; no extra tap or transport is
created. Only opt-in renderer widgets use the added painter rate list. Scope's inherited canvas
margin is corrected so the default view still fits 16 meters. Reopen Scope; no build/server
restart is needed. Full PCM/history transport remains; no latest-value-only API is claimed.
No unrelated tool or user's live host is opened/reconfigured. Vault MCP/Telegram remain unavailable.


### Opacity widget count scaling — measured 2026-10-03

A benchmark-only extension completed 102 actual-shell phases at 16/32/64/128 visible widgets,
24/48/96 px and 8/15 Hz for audio/control, with two opposite-order passes. Sixteen source buses
remain fixed; extra elements repeat those source bindings. This measures display fan-out,
not 128 independent SC channels. Normal Scope's 1–16 channel selector remains unchanged.

Fresh 48 px total Electron CPU at 16 → 128 elements: audio 20.66 → 24.54% at 8 Hz and
21.16 → 29.64% at 15 Hz; control 14.81 → 18.79% and 16.56 → 23.52%. Totals include helper
CPU and exclude SC (100% = one core). Counts are compared within a fixed 2250 × 1250 window,
DPR 1 and compact sixteen-column grid; earlier smaller-window totals are not mixed in.

The [full scaling report](apps/awb-shell/docs/scope-opacity-scaling.md) contains every size,
paired ranges, process breakdown, screenshot, raw phases and reproducible commands. All faces
fit and update; no waveform/canvas-meter painting is active. The 128 × 96 px smoke check also
passed seven phases. Sixteen protected production hashes match before/after; capture/node/group
cleanup passes. Only disposable fixture instrumentation and benchmark/docs/evidence were added.
Audio/native/SC/broker/transport and other tools remain unchanged. No build or live-host restart
is required. Vault MCP/Telegram were unavailable; no external write or notification was sent.

### Headless audio deadlines and focus transitions — measured 2026-10-03

Completed 18 isolated 30-second phases at two fixed DSP graphs, followed by six focus-automation control phases. Steady 128 × 96 px audio-driven opacity widgets at 15 Hz were clean at approximately 31% and 65% SC load. Cross-app switching was clean at the lower load and repeatedly failed at the heavier load, with output timestamp gaps, silent/broken pilot callbacks and overload notifications.

A persistent helper reproduced the failure in two further passes. Keeping Scope focused was clean with either persistent or freshly launched helpers; helper process startup does not explain the focus result alone. This does not diagnose the scheduler/driver or establish widget painting as the cause. The existing user server remained active; no SC IDE/Bitwig focus comparison was performed. Preserve DSP headroom rather than inferring audio safety from average GUI CPU.

The [full report](apps/awb-shell/docs/scope-headless-dropouts.md) links raw phases, compressed native callback records, positive detector checks, timing/CPU tables, controls and reproduction. The interrupted concurrent run is archived and excluded. Actual default settings were 48 kHz / 512 hardware frames / 64-sample DSP blocks; no device/rate setting was imposed. All 16 production guards match, private captures/nodes/groups/server/helper are cleaned up, and the temporary server’s executable code matches installed SC. Changes are confined to benchmark fixtures/evidence/docs; existing audio routes remain unchanged. Vault MCP/Telegram were unavailable.

### Headless-only dropout rerun — measured 2026-10-03

The user closed the SC IDE and its server. Completed 18 more phases with the same 20/52-node graphs, three conditions and three passes, using a persistent focus helper. Twenty SC process-inventory snapshots contain only the benchmark-owned headless language/server. With the IDE and its server closed, the previously observed output silence and signal-break events did not reproduce. Heavy-load app switching still recorded 57 timestamp gaps and 111 buffer-budget overruns; dropout-free operation is not established.

The [full rerun report](apps/awb-shell/docs/scope-headless-dropouts-ide-closed.md) contains matched earlier comparisons, raw native callback evidence, inventories and verification. System rate is confirmed by the user as 48 kHz; device defaults remain unchanged. All 16 production hashes match, owned SC/language/helper processes exit, and no existing audio route is changed. Earlier IDE-present numbers remain preserved separately. Vault MCP/Telegram remain unavailable.

### Headless MOTU-return load and graphics comparison — measured 3–4 October 2026

Completed 96 comparison phases, plus the five-profile V2 smoke test, using the existing MOTU output 2–9 → input 6–13 digital return. The native input recorder uses a locked queue/separate writer; all completed V2 captures have zero queue loss, continuous input timestamps and recorder callbacks inside their budget. Injected mute/phase faults were detected. Every recorded SC inventory contains only the benchmark-owned headless language/server; earlier concurrent/interrupted runs are excluded.

Heavy sustained drawing can fail without app switching: the largest profile (128 canvases + 512 opacity widgets) had return faults at about 71% SC load and only managed 14–15 fps even at baseline DSP load. Engine-only capture-stopped operation had a fault around 80%; usable 16/64-canvas profiles failed at higher DSP graphs. Switching also produced a fault with capture stopped, so widget drawing is not necessary for the switching failure.

Longer checks (two 45-second passes per row) were clean for sustained 16/64-canvas rendering at 36/44 DSP nodes, approximately 47–59% reported SC load. Switching was clean around 50%, but a ~61% switching pass had two return discontinuity callbacks. Practical starting budgets for this measured configuration are roughly 55–60% SC load for sustained heavy GUI use and nearer 50% when frequent switching matters; finite captures do not establish a universal safe ceiling.

The [full report, cost tables and evidence](apps/awb-shell/docs/scope-motu-loopback-load.md) distinguish SC load from total Electron CPU, actual drawing cadence from requested limits, and return failures from continuous software buffers. Sixteen source buses stay constant across display fan-out. All 16 protected production hashes pass, installed SC code matches the temporary probe executable, owned processes/captures/nodes are cleaned up, and no production audio route/settings or unrelated tool was changed/launched. Vault MCP and Telegram are unavailable.

Offline gap-length analysis confirms real zero-sample spans in the returned pilot: roughly 32 ms in the failed ~61% switching pass and the failed ~71% sustained heavy-display pass, reaching 64 ms at the strongest overload. These are measured delivery dropouts; recordings were not subjectively graded as clicks/pops. The full report links the per-phase silence analysis, separately from callback timing and discontinuity counts.

### Scope work integrated with ToolInstance — 4 October 2026

Scope, Shared Loop, the shared capture engine, native SC-bus Lissajous source and
benchmark/report work now integrate on the Tool/ToolInstance main contract. Capture
shutdown guards survive the migration; no ToolSession compatibility path is added.
Lissajous source commit `6ecc30b` updates all hosted identity reports and produces
the rebuilt renderer artifact. Shell tests 65/65, scope suites 72/72, native-clock
1/1, Lissajous host 7/7, format 9/9 and browser 14/14 pass. New SC main's language
class check confirms Tool/ToolInstance and absence of ToolSession. The full workspace
build, actual Electron Home gate and migrated benchmark prepare-only check also pass.

The [integration handoff](apps/awb-shell/docs/scope-tool-instance-integration.md)
records source/checkout coordination still needed for the separate Rack lane and
Lissajous source tree. The mixer developer has now brought the active SC checkout
to the migrated `a2f3a80`, preserving dirty live-set files; its source matches the
SC main used for the class check. Their shared-host test readiness fix `470ada8`
is retained here too. The shared dirty checkouts and live sets are
preserved. Historical MOTU figures retain their original provenance; raw recordings
remain local rather than entering Git. Runtime audio gates need a quiet window.

## Bitwig set documentation investigation (4 October 2026)

The [Stage 1 review](apps/awb-shell/docs/bitwig-set-inspection-stage1/stage1-review.md)
compares Beat Twin and Bitwig Control Deck against the installed 4.3.10 host (API 17).
Willy confirmed the open template instance and authorized a custom one-shot mapper.
The [implementation and capture instructions](apps/awb-shell/docs/bitwig-set-inspection-stage2/README.md)
are prepared: offline traversal/renderer checks pass; the expanded live capture awaits
controller activation. Generic routing destinations and modulation assignments still
need human annotation. This does not change shell ownership or gate the active mixer,
SC bridge, follower, and audio/GUI load-testing work.

### Rack Instruments preparation — 4 October 2026

The unexplained audio overrun wall remains step 0. Xcode System/Audio System Trace
capability probes and an isolated phase-marker/clock-alignment harness are prepared;
no new hardware load results are claimed. Definitive captures await an agreed quiet
window with other builds/tests, downloads and Bitwig audio activity paused.

The native rack's isolated functional preflight passed 47 SC contracts, 88 offline
audio assertions and 26 Node tests. Continuous SC-originated value feedback is still
a separate implementation boundary; the current bridge supports edits plus explicit
sync. The [readiness and measurement protocol](apps/awb-shell/docs/rack-instruments-readiness.md)
records commands, evidence boundaries and pending topology/follower questions.
Bitwig inspection is owned by the separate agent; production renderers and the live
SC class library have not been changed by this preparation.

### ToolInstance integration — 4 October 2026

The integration branch incorporates AWB runtime-contract commit `0c200e6`, paired
with awbCollider commit `a2f3a80`. The merge preserves genuine score/host/recording
session terminology while making tool runtime ownership use `ToolInstance`.
Eighteen targeted Node tests passed, including Score Studio's 50/50 transport
assertions. Existing scope/rack work is reconciled separately in the working tree;
this merge does not promote the WIP SC classes or claim a new hardware load result.

The combined shell/scope working-tree unit suite passed 65/65. Its shared-host test now waits for the subscription reply and closes its resources on failure; the prior request-only readiness assertion was a race. Hardware and GUI load measurements still await the quiet window.

Post-merge native rack renderer and normal-shell gates passed against the migrated framework: both renderers, exact ToolInstance/owner identity, native import/export and sparse SC recall/explicit sync. Server command dispatch is stubbed in those GUI checks; no hardware audio was booted. The Instruments prepare-only fixture also passed again with 16 protected production hashes unchanged. Native rack source is checkpointed separately in `/Users/willy/awb-rack-comparison` (`8ad3a83`, shell merge `444d377`).


## BW–SC integration working branch — 4 October 2026

The next mixer/Bitwig/SC workstream uses the shared local branch `integration/bw-sc`
in `/Users/willy/awb`. It combines scope main `66890bb` with the mixer preparation
and ToolInstance integration lane through `50a4f35`. Both histories are retained;
main is unchanged by creating this workstream. Pending rack, Bitwig mapper and
benchmark work stays available in the working checkout and is not automatically
committed by this branch move. The separately committed native rack remains in
`/Users/willy/awb-rack-comparison` at `d95fa01`; SC source is at `a2f3a80`.

Step 0 remains the Instruments investigation of the overrun wall during an agreed
quiet window. The subsequent scope remains integrated SC bridge cost, mixed GUI
loads, the eight-instrument/eight-destination rig, AWFollower input and the first
SC FX migration. Bitwig set documentation is handled by the separate investigator.
Vault and Telegram tools are unavailable in this session; no external update is
claimed for this branch move.

### Shared working-tree checkpoint — 4 October 2026

The shell Rack workspace, Toolkit Home registration, local mix editor, benchmark
harnesses and compact knob/renderer/refresh evidence are now checkpointed on
`integration/bw-sc`. This is the existing HTML/SVG and Three.js comparison rack;
Canvas2D and the 15/30 Hz rate gate remain benchmark fixtures. The separately
validated native SC Rack is still in `/Users/willy/awb-rack-comparison` at `d95fa01`;
this checkpoint does not promote it into the shell workspace.

The Bitwig documentation, candidate-source evidence and prepared one-shot mapper
are checkpointed here too. The expanded live mapper capture still awaits controller
activation; the repository fixture is explicitly mock evidence. The existing live
controller and original template are unchanged by this commit.

Checkpoint validation: Rack production build, 24/24 Rack model/mix/runtime tests,
65/65 shell unit tests, all 12 additional benchmark syntax checks, Bitwig mapper
mock traversal, 3/3 capture-renderer tests and installed-API initialization diagnostic.
Bitwig tests ran in a disposable copy so their regenerated evidence did not replace
the investigator's original captures. No hardware audio/load test was run. Step 0
remains the Instruments investigation in an agreed quiet window. Raw PCM and bulk
callback recordings stay local; obsolete unreferenced Lissajous builds are excluded.
Vault and Telegram are unavailable in this session; no external update is claimed.

### Native Rack and SC feedback integration — 4 October 2026

The native rack is now in the shared `apps/rack` workspace on `integration/bw-sc`.
Its `AWBSendRackTool : Tool` owns persistent channel input/post buses, faders,
mute/solo, fixed/spare FX and follower destinations, tail-retiring processors and
full/packed voice wrappers. `.gui` defaults to the standard shell in `~/awb`, with
exact ToolInstance/owner identity. The legacy comparison launch and library remain
separate. The bundled classes require loading/recompilation in the chosen SC
language configuration; no live class-path installation was performed.

The OSC bridge now carries coalesced changed-control feedback, rather than polling
every value. SC edits reach both renderers without React rack rebuilding or OSC
echo. A language-side edit overrides only its control during a mix recall; revision
fences reject already queued GUI writes that would reclaim it. Full Sync handles
attach, processor metadata and incomplete/gapped updates. Subscription heartbeats
and close notifications detect connection loss and disarm output. This is SC
command-state feedback, with no Bitwig state readback or audio modulation polling.

Validation: 47 SC contracts, 88 real offline audio assertions, 28 Node tests, actual
HTML/SVG and Three.js SC-feedback gates with zero React app/rack renders, and the
normal Shell import/export/ToolInstance gate. Evidence is retained in
`/private/tmp/awb-rack-feedback-shared-20261004`; GUI/OSC server dispatch is stubbed
and no hardware audio/load test was run. Step 0 remains the quiet-window Instruments
investigation. The realistic eight-channel rig, mixed GUI workload, AWFollower
input and first FX migration remain subsequent work. Vault/Telegram are unavailable.
