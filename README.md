# AWB

Shared, application-independent foundations for the Acoustic Workbench.

```text
packages/
  score/                absolute-time, payload-blind score editing and renderer contracts
  sc-runtime/           host-neutral SC playback-readiness state and policy
  sc-envelope/          JSON-safe SuperCollider Env definition and exact array projection
  sc-wasm/              browser scsynth lifecycle, audio tap and sclang bridge
  sc-console/           shared sclang evaluator, editor and React lifecycle machinery
  synthdef-interface/   arbitrary SynthDef graph parsing and rich interface derivation
  instruments/          current shared-context annotations; not a runtime inventory
  field-engine/         renderer-neutral analytic field projection and propagation
  lissajous-engine/     React-free visual core with R3F, vanilla and browser adapters
  render-pipeline/      provider-neutral resolved jobs and indexed render scheduling
apps/
  awb-shell/            planned neutral Electron host for independently packaged AWB tools
  score-studio/         clean score authoring and browser-runtime development host
tool-artifacts/
  lissajous/            installed versioned renderer builds; editable source stays in lissajous-viz
```

The packages live here because more than one application needs them. Score Studio lives here too:
it develops the shared score workflow without coupling it to a field or Lissajous application.
Project-specific studios remain in their own repositories. `field_modelling` and `lissajous-viz`
are consumers, not subdirectories of this repository.

## Commands

```sh
npm install
npm run verify
npm run test:browser   # optional Playwright static-distribution check
npm run pack:packages  # writes private, consumer-ready tarballs to artifacts/
```

Node 22 is pinned in `.nvmrc`. This repository is the canonical source for every `@awb/*` package
listed above. Package exports point at built `dist/` files; `files` limits tarballs to those files
and the package README. Packages remain private and distributable with `npm pack`; publishing to a
registry is a later decision.

Cross-repository consumers vendor the exact tarball they use and commit npm's integrity record.
They must not depend on this repository's working `src/` tree. That boundary prevents an
uncommitted change here from silently entering a build elsewhere.

See [MIGRATION.md](./MIGRATION.md) for provenance and the transition boundary.
The shared desktop host contract and extraction sequence are specified in
[AWB_DESKTOP_SHELL_SPEC.md](./AWB_DESKTOP_SHELL_SPEC.md). The current Score Studio Electron code is
the working prototype, not a one-shell-per-tool precedent.
The current OSC/WebSocket inventory and extraction boundary are recorded in
[`apps/score-studio/server/README.md`](./apps/score-studio/server/README.md).
