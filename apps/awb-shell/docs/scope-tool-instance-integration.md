# Scope integration with Tool / ToolInstance — 4 October 2026

The Scope tool, Shared Loop demo, shared SC capture broker, SC-bus Lissajous source,
canvas meters/opacity widgets and benchmark harnesses are integrated on top of AWB
main's `0c200e6` ToolInstance migration. No ToolSession alias or runtime fallback is added.

## Runtime boundary

The shell uses `toolInstanceID`, `openToolInstance` and `closeToolInstance` for native
Tool launches and ownership. Capture-aware host-stop guards and ordered capture/runtime
cleanup are retained. Scope and Shared Loop remain trusted manifest-local runtimes;
that registry manages their Node backend lifetime and is not an SC ToolSession registry.
Their SC observation/allocation bridges operate directly on Synth/ScopeBuffer/Buffer
allocations. Registering the demo looper as a semantic SC Tool/ToolInstance with
NodeManager metadata remains separate from this existing proof-of-concept boundary.

Lissajous source commit `6ecc30b` on `integration/sc-bus-tool-instance` adopts
`toolInstanceID` for launch, ready, lightweight and detailed state. The complete artifact
is rebuilt from that source; ordinary hardware, system-output and browser audio routes
are retained. Two browser assertions were stale presentation strings and also failed
against the unchanged artifact; they now check restored config and actual command state.

## Checks

- Full workspace build passes; shell native reader and looper plugin build passes.
- Shell unit tests: 65/65. The mixer developer's shared-host readiness/cleanup
  correction from `470ada8` is also retained, avoiding timing-based test startup.
- Actual Electron Toolkit Home: 1/1, without booting audio.
- Migrated dropout fixture prepare-only passes; 16 production hashes unchanged and
  no Electron or SC process launched.
- Scope/looper display, history, transport, lifecycle and stress-renderer tests: 72/72.
- Synthetic native shared-memory clock/invalid-publication test: 1/1; no audio server.
- Lissajous host contracts: 7/7; SC-bus binary format: 9/9.
- Rebuilt Lissajous browser gate: 14/14, including ToolInstance ready and state identity.
- New SC main class library compiles; runtime lookup verifies Tool and ToolInstance
  exist and ToolSession does not. A private language configuration uses the isolated
  main checkout, preserves installed dependencies and disables host autostart.

Hardware stress measurements are historical results for their recorded checkout.
No new hardware load ceiling or audio-dropout claim follows from this integration.
Raw callback/return captures stay in the original checkout; see
[storage and restore](../test/signal-bench/dropout/results/RAW_RECORDINGS.md).

## Other work requiring a coordinated update

- `/Users/willy/awb` now uses the shared `integration/bw-sc` workstream, combining
  scope main `66890bb` and the mixer preparation/integration lane through `50a4f35`.
  The formerly separate committed AWB histories are reconciled. The subsequent
  shared working-tree checkpoint records the shell Rack workspace, Bitwig inspector
  preparation and mixer benchmark evidence on this branch. The native SC Rack
  remains a separately committed comparison checkout; raw recordings stay local.
- The active SC checkout was initially on the pre-migration recovery commit, but
  the mixer developer has now fast-forwarded it to `a2f3a80`, preserving dirty live-set
  files. Its awbCollider source matches the tested new SC main (`00c5ccc`). The
  earlier class-path blocker is resolved; any already-running old language process
  still requires a normal recompile/restart before it can use the new class library.
- The shared Lissajous source checkout remains on `design/shell-visual-language`
  with dirty work. Its reviewed SC-bus adaptation plus ToolInstance contract is
  committed on `integration/sc-bus-tool-instance`; integrate that source branch
  before publishing another renderer, or the old checkout will reintroduce legacy
  identity fields. The AWB artifact is already updated and source-pinned.
- After the AWB/Lissajous source checkouts are coordinated, run the focused Scope, Shared Loop and
  SC-bus Electron gates in a quiet audio window. Repeat the MOTU load matrix only
  if a post-migration performance comparison is wanted.

No Rack/Bitwig files or mixer benchmark additions are included in this scope commit.
