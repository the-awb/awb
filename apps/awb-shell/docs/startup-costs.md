# Shell startup costs — 2026-10-03

**Implemented follow-up:** the shell `prestart` hook is now removed. `npm start --workspace @awb/desktop-shell` launches existing artifacts; run `npm run build` separately when needed. The measurements below describe the previous automatic-build setup.

The main measured delay was the launch command: `npm start --workspace @awb/desktop-shell` ran a full root workspace build in `prestart`. Every launch rebuilt 17 workspaces, including package bundles, the native audio helper, the SC bus addon, the hidden render-worker bundle, Field and Score Studio bundles. The full-build prestart hook was already present in Git HEAD. Our bridge work added the unconditional SC addon compile, measured at 2.46–2.91 s by itself; that is a real additional startup cost. The SC addon compiler has no incremental check. Field/Studio are **built**, not opened, by this command.

## Measurements

All builds and launches below used disposable workspace copies. No live shell, user instrument, device, sample rate, or production artifact was changed. Four repetitions per launch variant alternate ordering; each gets fresh userData. OS caches were not flushed. Home has four valid tools, no active tool views, no captures and no owned SC process. Reported launch times include the Electron process startup and module imports. 'Visible Home' measures its ready-to-show event followed by the show call, not physical presentation latency through WindowServer. Home catalogue readiness additionally waits for its first snapshot to render; the existing Home-ready IPC fires before that.

| Measurement | Time |
|---|---:|
| Full prestart build, unchanged sources, warm Swift cache | **9.62 s** |
| Full prestart build, clean Swift cache | **87.81 s** |
| Visible Home, current startup, mean (range) | **0.763 s (0.734–0.789)** |
| First Home catalogue rendered, current startup | **0.744 s (0.719–0.767)** |
| Visible Home, hidden worker deferred, mean (range) | **0.623 s (0.603–0.654)** |
| First Home catalogue rendered, hidden worker deferred | **0.673 s (0.595–0.736)** |
| SC bus addon alone, unconditional rebuild, two runs | **2.91 / 2.46 s** |

Warm prestart components include 1.11 s for the Swift helper's incremental build, 3.26 s for the shell workspace (SC addon + worker bundle), 0.55 s for Field and 0.49 s for Score Studio. The remaining package builds and npm orchestration account for the rest. Clean Swift compilation accounted for 79.10 s of the cold run. These are workspace boundary timings, including subprocess overhead, rather than pure compiler timings.

Once Electron runs, manifest discovery averages 25.25 ms, recent-store loading 0.5 ms, host service setup 6.5 ms, and hidden-worker load 204.25 ms. The worker uses the Field renderer library even at Home, but no Field app or render job is launched. Its first Chromium renderer partly warms startup: deferring it saves **140 ms to visible Home**, rather than the entire worker-load duration. Catalogue readiness saves 70.5 ms in this small fixture. Treat this as a prototype measurement, not a production optimisation already applied.

The separate measured warm build and current Home stages imply roughly **10.4 seconds** before visible Home through the previous automatic-build command. That sum is an estimate: a single end-to-end `npm start` hook-to-Home run was not measured, and npm wrapper overhead is not included.

## Recommended order

1. Separate build from launch. Keep an explicit build/prepare command and a fast launch for already-built artifacts. This addresses the measured multi-second delay without changing runtime audio.
2. Add incremental SC addon builds keyed to C++ source, included SC headers, Node headers and compiler options. Skipping merely because an output exists risks stale binaries after header changes.
3. Create the hidden render executor on the first render job, or let Home show first. Preserve executor readiness, job queuing, cancellation and shutdown before changing production code; a reordered fixture proves only startup potential.
4. Manifest parallelisation would target about 25 ms here and is a lower priority. If launching a specific tool is still slow, measure its renderer and owned SC boot separately; these Home-only timings do not cover tool readiness or SC class-library compilation.

The approved scope UI is not loaded during Home startup. Its eight-Hz metadata scheduler and trace helper are browser modules loaded only by scope windows; the recent rendering changes are not a cause of the full prestart build. A scope before/after cost report is separate.

## Separate build and start — implemented 2026-10-03

From the AWB root, build after installation or source/native/dependency changes that require
rebuilding, then launch as often as needed:

```sh
npm run build
npm start --workspace @awb/desktop-shell
```

The shell's former `prestart` hook is removed. The Electron entry and runtime startup ordering
are unchanged. Existing startup flags still pass through after `--`. Missing/stale build outputs
must be prepared explicitly; launch does not repair them. This removes the measured build work,
not all Electron launch latency. Scope HTML/JS/CSS edits need only reopening their windows.
The narrower shell workspace build rebuilds its addon/worker only, while the root build prepares
all workspace dependencies. The separate `pretest:electron` build hook is retained.

Verification launches Toolkit Home through the actual npm workspace command with disposable
user data, confirms its Home-ready/projection markers, and exits successfully with no build
lifecycle output. No tool view or SC host is started. The historical timing tables were not
regenerated and are not a fresh measurement of npm startup latency.

## Evidence and reproduction

- [Successful npm start without a build: launch log](../test/startup-cost/results/npm-start-no-build-2026-10-03.log)

- [Startup raw timings and 138-file source guards](../test/startup-cost/results/startup-2026-10-03.json)
- [Cold/warm workspace timings and source guards](../test/startup-cost/results/prestart-2026-10-03.json)
- [Cold build log](../test/startup-cost/results/prestart-cold-2026-10-03.log) / [warm build log](../test/startup-cost/results/prestart-warm-2026-10-03.log)
- [Launch fixture](../test/startup-cost/run.mjs) / [private build fixture](../test/startup-cost/full-build.mjs)

With Node 22 first in PATH, run `node apps/awb-shell/test/startup-cost/run.mjs`, then `node apps/awb-shell/test/startup-cost/full-build.mjs`. Run them outside CPU measurement intervals. The first full-build attempt rejected the copied Swift PCH cache because it held absolute paths; its failed log is retained, and the final fixture explicitly clears only the private copied cache before its cold run. Both final builds succeed and 138 protected originals match their pre-run hashes.

Changes remain uncommitted on `design/score-studio-layout`. Vault/Telegram MCP tools are unavailable, so external updates were not performed.
