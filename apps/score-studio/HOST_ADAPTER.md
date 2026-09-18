# Score Studio host adapter

`src/host/hostContract.js` defines the application host seam and requires explicit capability
reporting. `src/host/browserHost.js` is the reference implementation. It owns browser file and
directory pickers, file-input and download fallbacks, recovery storage, hosted launch values, and
the unsupported browser window-focus/close operations. `main.jsx` injects that host and a separate
`HostedScoreClient` factory into the React application.

The split is deliberate: the host may establish and report a connection, but it does not own OSC
request semantics, transport state or clocks. Pair-save ordering, canonical validation, projection
identity checks and external-change guards also remain outside the contract or are passed into its
save operations as data.

## Live revision and execution frontier

The open editor document and a running execution projection may legitimately have different
revisions. A document edit must not implicitly stop playback, clear runtime realizations, reset the
playhead or install a whole new player. The execution adapter reports both revisions when they
differ, for example `editing r16 / playing r15`.

An executor exposes three separate positions:

1. **audible position** — the latest authoritative transport position;
2. **committed frontier** — the first boundary after every event already evaluated and dispatched;
3. **editable future** — authored material at or beyond that frontier which has not been pulled.

For desktop SuperCollider, `EventStreamPlayer` evaluates one event at a clock wake-up, calls
`Event.play`, and uses that event's delta to schedule its next wake-up. `Event.play` may already
have sent a timestamped server bundle using server latency, timing offset, lag or strum. A stream
replacement can therefore change the next unevaluated event, but cannot retract the event whose
OSC command is already committed. Browser execution must expose the equivalent boundary even
though its scheduler is implemented in JavaScript.

Two operations must remain distinct:

- **replace future** preserves the run, clock and existing nodes, swaps only unconsumed material,
  and performs no smart-seek reconstruction;
- **seek** changes transport time, reconciles nodes belonging to the old execution position, and
  may reconstruct authored notes logically alive at the requested target.

Smart-seek reconstruction currently guarantees the logical state and terminal timing, not the
instantaneous DSP state. The shared planner folds deterministic note/set/release/free history and
computes remaining gate or release lifetime. Both executors then create fresh nodes. A
sustain-phase reconstruction therefore currently restarts the original amplitude attack and
oscillator phase; a release-phase reconstruction starts a fresh envelope, immediately gates it off
and gives it the correct remaining release time. Runtime metadata correctly classifies these as
`lifecycleCorrect` and names the approximation.

The next adapter stage is envelope-aware. The plan will carry elapsed envelope position and the
calculated level at the seek target. An editable `envArray` may be replaced ephemerally with its
remaining segments beginning at that level. A parametric or baked envelope that cannot restore an
internal EnvGen position must use a bounded short anti-click attack, preserve the calculated
terminal boundaries, and remain `lifecycleCorrect`. This reconstruction data never mutates the
canonical score. Hosted and standalone adapters must consume the same strategy; host-specific code
only creates and tracks the resulting nodes.

If the first event in a replacement occurs after the committed frontier, the executor preserves
that exact gap rather than snapping it to the frontier. Edits moved into the committed past are
deferred to a later run or explicitly rejected; they are never replayed into the current run.
Existing nodes may still receive future identity-bound `set`, `release` or `free` commands.

There is one pending future projection, not a queue of revisions. If revisions 16, 17 and 18 are
accepted before the player reaches its next pull boundary, each replacement supersedes the previous
tail and revision 18 is what the player reads. Every request uses compare-and-swap execution
generation/frontier guards. If a wake-up occurs between replacements, any Event already pulled from
the earlier accepted revision is committed; the next request must use the newly reported frontier.

Each engine has exactly one realization-lifecycle authority. Hosted tracked execution uses
NodeManager; browser standalone uses `createNodeRegistry()` from `@awb/sc-runtime`, its
engine-local pushed node registry.
When NodeManager is deliberately
disabled, ordinary desktop playback may continue untracked, but it must not revive a hidden
self-tracking registry inside the player. Normal lifecycle is pushed to the player and UI. Queries
are reserved for initial snapshots, reconnect/gap recovery and inspection, never a second
competing registry inside the player.

This contract is implemented by protocol v2 in the desktop adapter and by `replaceFuture()` in the
standalone executor. Both use generation/frontier guards and latest-tail-wins replacement. The
browser registry deliberately stops at node lifecycle, explicit ownership and lightweight
semantic containers/memberships. Those containers preserve cross-tool discovery and scoped control
when one browser host injects the same registry into several tools. It does not imitate
NodeManager's language-object inspection, GUI model, tool catalogue or discovery of externally
created nodes. Separate windows or processes still require a host broker to share this authority.

The host contract exposes that authority through `engineNodeRegistry()`. A standalone-capable host
must return one stable registry object; Score Studio passes it to score and audition executors with
different owner IDs. Hosted-only desktop adapters return `null` because NodeManager is authoritative
for their execution. This is dependency injection within one JavaScript realm, not an IPC protocol.

## Remaining browser-only assumptions

- The file-input element used when File System Access is unavailable.
- Browser `localStorage` used for generated projection app data, separate from recovery drafts.
- Browser scsynth/sclang WASM import and audio-start interaction policy.
- Pointer, download and dialog behaviour exercised by the browser integration tests.
- Development-only `window.__scoreSc` and `window.__standaloneScore` test/debug handles.

Timeline pointer listeners and the root DOM mount are UI implementation details shared by browser
and webview hosts, not filesystem, process or score-authority decisions.

## Contract responsibilities

| Surface | Why it is host-owned |
| --- | --- |
| `kind`, `capabilities` | Lets the shared editor render literal support without guessing its container. |
| `initialScore()` | Resolves a launch-supplied score without giving the editor arbitrary filesystem access. |
| `openScore()`, `openScoreDirectory()` and directory reads | Encapsulates browser handles versus native paths and dialogs. |
| `saveCanonical(document, guard)` | Performs the host write while retaining the editor-supplied external-change guard. |
| `saveProjection(text, identity, guard)` | Writes only already-generated projection text; generation and pair ordering stay outside. |
| `hostedLaunchContext()` | Supplies the endpoint and ToolSession identity without environment reads in the editor. |
| `reportSessionState(state)`, `shellState()` | Reports editor state and exposes process/window state without becoming score authority. |
| `focusWindow()`, `closeWindow()` | Real operations in the desktop shell and explicit unsupported no-ops in a browser. |

Fallback file input, bundled-score loading, recovery drafts and discard confirmation are included
because their mechanisms also differ by container. They do not validate, revise or execute scores.

## Desktop shell spike

The reversible spike uses Electron `44.4.1`, pinned exactly. Electron was chosen over a Tauri
command layer for this experiment because the existing local sidecar, tests and workspace are
already Node-based. The main process can reuse `hosted-bridge.mjs`, native filesystem APIs and the
same built React application without copying editor code. The renderer remains sandboxed with
context isolation and receives only named preload operations.

The shell accepts:

```text
--score /absolute/path/piece.score.json
--tool-session SESSION_ID
--osc-port PORT
--ws-port PORT                 optional fixed sidecar port
--endpoint ws://.../TOKEN      optional already-running sidecar instead of --osc-port
--owner-pid PID
--dev-url http://127.0.0.1:5201
```

`--osc-port` starts the existing token-protected WebSocket-to-OSC bridge inside the Electron main
process. `HostedScoreClient` in the shared renderer still owns the frozen `/awb/timeline/...`
request semantics and consumes authoritative bridge/player state. The shell never creates a second
timeline executor. `--owner-pid` only closes this shell if its launching owner disappears; it never
terminates sclang.

Run the built-source spike and its gates from the repository root with Node 22 first in `PATH`:

```sh
npm run shell:start --workspace @awb/score-studio -- --score /path/piece.score.json --osc-port 57120 --tool-session SESSION_ID
npm run test:shell --workspace @awb/score-studio
npm run test:shell-hosted-real --workspace @awb/score-studio
```

This is a shell spike, not a signed installer. Packaging metadata, icons, notarisation, Windows
atomic-replace behaviour, Studio-owned headless sclang, attached-process discovery, multi-score
tabs and packaged standalone-WASM audio remain deliberately unimplemented or unverified.
