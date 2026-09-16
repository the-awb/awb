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
