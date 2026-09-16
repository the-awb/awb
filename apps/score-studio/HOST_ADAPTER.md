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
