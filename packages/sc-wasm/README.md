# @awb/sc-wasm

Canonical private AWB package: SuperCollider running in the page as WebAssembly — the engine, the
audio tap, and the sclang bridge.

- `@awb/sc-wasm/core` — no React. Boot, OSC, the def cache, the tap, the bridge.
- `@awb/sc-wasm/react` — a thin hook over the core. React is an **optional** peer.

Extracted from `field_modelling/react-app` on 14 September 2026 and moved to its canonical home in
`~/awb` on 15 September. Consumers install a built package artifact; they do not import this source
tree. The host still owns the matching wasm assets and their served URLs.

## The contract

Pinned before any code moved, because the hook-to-core conversion is a lifecycle refactor rather
than a move and the decisions below are the refactor.

### 1. Public surface

The core returns commands, readers and an immutable state snapshot; it returns **no refs**. The
hook only subscribes React to that snapshot.

```js
const engine = createScEngine({ importScsynth });

// lifecycle
await engine.boot(options)   engine.stop()   engine.shutdown()   engine.dispose()

// messaging
engine.sendOsc(address, args)        // → boolean
await engine.sync()                  // resolves when scsynth answers /synced
await engine.loadSynthDef(bytes)     // → /done
await engine.reloadSynthDefs()

// nodes
engine.playSynth(def, args)   engine.pauseSynth(def)   engine.resumeSynth(def)
engine.freeSynth(def)         engine.freeAll()

// audio
engine.drainNewSamples()             // destructive: every sample delivered exactly once
engine.readRecentSamples(seconds)    // NON-destructive: measuring is not consuming

// observation
engine.subscribeOscReply(fn)         // → unsubscribe
engine.subscribePrint(fn)            // → unsubscribe
engine.subscribe(fn)                 // → unsubscribe. State changed.
engine.getState()                    // → { isBooted, status, error, log, nodes }
engine.getEngine()                   // the raw scsynth object, or null
engine.getBootOptions()              // what it was actually booted with, or null
engine.setMonitoring(on)
```

**`getEngine()` and `getBootOptions()` replace two leaked refs.** The hook used to return `scRef`
and `bootOptionsRef` directly, which a core cannot do — a ref is a React object. Consumers that
held `scRef.current` hold `getEngine()` instead. This is the only behavioural change in the public
surface, and it is why the app diff touches more files than the move alone would.

### 2. State subscription

Five values are reactive: `isBooted`, `status` (`idle | loading | booting | ready | failed`),
`error`, `log`, `nodes`.

The core holds them in **one frozen object, replaced rather than mutated** on every change, and
`getState()` returns that object. That is what makes it a valid `useSyncExternalStore` snapshot: an
object rebuilt on every call would loop forever, and a mutated one would never re-render. The hook
is then three lines.

`subscribeOscReply` and `subscribePrint` already existed and are unchanged. They exist because the
engine gives **one** slot for OSC replies and **one** for printed lines, and a second consumer
assigning over them makes `/sync` never resolve and `loadSynthDef` hang forever, with the engine
running perfectly and nothing at all in the log.

### 3. Asset location — the reason this could not stay as it was

`createScEngine` takes `importScsynth()`. The **host performs the dynamic import**; there is no
default that guesses an asset path.

The extracted code read `import.meta.env.BASE_URL`, a **Vite-specific global**. A package that does
that is not portable — it only works inside a Vite build — which breaks the rule
`lissajous-engine-extraction.md` §1 states as *no build-tool assumption*. And `public/scsynth/` and
`public/sclang/` are app-owned static assets, 1.9 MB of sclang class library among them, which a
package has no business shipping.

So the app supplies the import:

```js
createScEngine({ importScsynth: () => import('/scsynth/scsynth.js') })
```

Passing a URL to code inside the package was tried and failed: Vite rewrote the dynamic import
relative to the linked package and turned the static emscripten asset into a module request. The
host-owned import keeps that build decision in the host.

**`locateFile` is not optional for sclang**, separately from this: sclang's 1.9 MB `.data` package
is resolved by emscripten against the *page's* path, not the module's. Without it the loader fetches
`/sclang.data`, gets the dev server's index page with a `200`, and fails somewhere much less
obvious than a 404.

### 4. Disposal

`dispose()` tears down the AudioContext, the worklet node, the tap and the def cache, and drops
every subscriber. It is idempotent — safe to call twice, safe to call before `boot`.

`stop()` and `shutdown()` keep their existing meanings and are **not** disposal: a shutdown engine
can be booted again, a disposed one cannot. The React adapter exposes `dispose()` but does not call
it during React's development-only effect replay; the owner calls it when the engine's real
lifetime ends.

## What is NOT in here

- **The React panels, the console, the editor.** The seam is react-or-not, and it is the seam
  `shared-files.mjs` already documents: pure logic is shared, React components are not, because that
  is where the two apps' audiences actually differ.
- **`tools/compile-synthdefs.mjs`.** It is a build tool, not runtime. It stays copied between repos
  and `shared-files.mjs` keeps watching it; shipping a CLI from this package is a separate decision.
- **The field physics.** That is `@awb/field-engine`, a different package with a different trigger.
- **The AWB instrument vocabulary.** That is `@awb/instruments`; this engine accepts arbitrary
  SynthDefs and does not decide what their controls mean.

## Do not simplify this code

`createScEngine` looks over-complicated and is not. The constructor capture, the retrying `/sync`,
and the order of resume-then-wait are each fixing a boot race that fails **silently** — the engine
runs, `/d_recv` returns `/done`, and the tap reads pure silence. Reproduce the failure before
changing any of them.

The same applies to the bridge: `s.boot` on a live server is a *reboot*, `/notify` from an
already-registered client is *fatal*, and `maxLogins` must be ≥ 2 and ≤ 32. Each is measured, and
each is recorded in `docs/scsynth-wasm-findings.md` and `FINDINGS-osc-runtime.md`.

## Tests

`npm test` checks the stable frozen snapshot, subscriptions, node state and idempotent disposal.
`tools/verify/package-boundary.mjs` in `react-app` asserts the exports map, React-free core, thin
adapter, absence of app-local copies, and Node resolution. The behavioural checks are the app's
harnesses — `sc-smoke`, `instrument-voices`, `sclang-handshake`, `sclang-reboot`,
`sclang-console` — because what matters about this package is whether it makes a sound, and only a
browser can answer that.
