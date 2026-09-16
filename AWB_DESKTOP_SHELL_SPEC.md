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
- sclang can launch it with a score path, ToolSession ID and OSC endpoint;
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
management remain outside its first hosted surface.

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

- `ToolDefinition`, `ToolLauncher`, `ToolSession` and NodeManager semantics;
- identity of an SC-launched ToolSession;
- desktop score execution through `PTimelineOSCBridge`/`PScoreTimelinePlayer`;
- SC-side objects, Patterns, Synths and explicit preset promotion;
- whether an sclang process is attached or explicitly shell-owned.

The shell never infers authored score membership from NodeManager and never treats receipt of an
OSC parameter as proof that a ToolSession is valid. NodeManager remains authoritative for realized
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
`toolID`, `toolSessionID`, NodeManager `toolSource` and `toolInstance`; the shell never guesses it
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
toolSessionID      optional running session supplied by ToolLauncher
documentID         optional tool-owned document identity, such as scoreID
clientID           one transport connection incarnation
```

The shell addresses a view by `viewID`. It may use `(toolID, toolSessionID)` as the idempotent key
for an SC launch when a ToolSession exists. It must not use a score ID, visual-session ID or file
path as a universal session identity.

Multiple Score Studio views may host different scores and their independent desktop players.
Multiple Lissajous ToolSessions may coexist. Whether a future UI presents these views as windows or
tabs does not alter their identities.

## 9. Launch context

Each renderer receives one frozen context before application mount:

```javascript
{
  shellProtocol: 1,
  shellInstanceID,
  viewID,
  tool: { id, version },
  toolSessionID: null,
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
2. A repeated request for the same `(toolID, toolSessionID)` focuses the existing view and does not
   create a duplicate session.
3. Different ToolSessions create distinct views unless a later, explicit tool policy groups them.
4. Renderer readiness includes matching `toolID`, `viewID`, protocol and ToolSession identity.
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
  NodeManager bridge: ready | reconnecting | unavailable
```

An attached sclang is observed and never terminated. Tools remain usable in standalone mode when
the host or NodeManager is unavailable; hosted transport, live tracking and runtime-container
features become visibly unavailable rather than preventing launch.

For NodeManager, the shell owns one adapter connection per complete host configuration. It may keep
one lightweight `all / summary / coalesced` subscription for Toolkit Home, then fan out explicitly
scoped tool or container projections to views. A view requesting detailed `values` receives a
separate bounded subscription so every tool does not pay that cost. Snapshot sequence numbers,
completion markers and gap recovery remain those of the authoritative NodeManager protocol.

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
  path to the selected tool. `New` creates a tool session with a tool-owned empty document or
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
ToolSession IDs where present
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

1. Map the current score path, ToolSession, endpoint and owner PID into the generic launch context.
2. Move score-specific native file calls behind Score Studio wrappers over `host.request`.
3. Preserve named-score load, hosted handshake, authoritative desktop transport, guarded pair save,
   owner-loss handling and web mode.
4. Change `ScoreStudioTool` to launch the neutral shell with `toolID: score-studio`.
5. Remove the old shell only after all real hosted and native-file checks pass.

### Slice 3 — Lissajous integration (implemented)

1. Consume the versioned Lissajous renderer artifact and manifest.
2. Launch the reduced system-audio profile with multichannel preference.
3. Bind lifecycle readiness to the named ToolSession and parameter traffic to the existing
   Lissajous protocol.
4. Run Score Studio and Lissajous concurrently and close either without disturbing the other.

Implemented on the `feature/lissajous-neutral-shell` and
`feature/neutral-awb-shell-adapter` branches. The installed 0.1.0 renderer is a reduced
system-audio profile. It does not request cross-origin isolation because this profile excludes
`scsynth.wasm` and threaded export; multichannel Web Audio capture itself does not require
`SharedArrayBuffer`.

### Slice 4 — shared host, live containers and document launchers

1. Add the shell-level SuperCollider host broker with separate sclang, scsynth-readiness and
   NodeManager status.
2. Move shared WebSocket/OSC adapter ownership out of individual tool views while preserving each
   tool's semantic address vocabulary.
3. Consume the existing NodeManager snapshot/delta protocol and show explicitly associated tool
   containers beneath active or discoverable ToolSessions.
4. Add manifest-declared document kinds and per-tool `New`, `Recent` and `Browse` launcher actions.
5. Persist bounded recent-file descriptors without making Toolkit Home a document authority.

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
5. repeated launch of one ToolSession focuses rather than duplicates it;
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

## 21. First handoff

The shell engineer owns Slices 1 and 2 in `~/awb`. The Lissajous engineer owns its host adapter and
renderer artifact. The awbCollider engineer owns SC tool descriptors and ToolSession bindings.

Before implementation, freeze only these joins:

- `awb.tool/1` manifest fixture;
- shell launch-context fixture;
- base preload method names;
- view/ToolSession identity and idempotent launch rule;
- renderer ready/close lifecycle messages.

Do not wait for one universal tool-state schema, automation design, tabs, headless sclang or final
installer packaging. Those are later decisions and would obscure the useful first test: two real
tools, one shell, no duplicated ownership.
