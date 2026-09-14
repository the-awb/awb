# AWB

Shared, application-independent foundations for the Acoustic Workbench.

```text
packages/
  score/                absolute-time, payload-blind score editing and renderer contracts
  lissajous-engine/     React-free visual core with R3F, vanilla and browser adapters
  render-pipeline/      provider-neutral resolved jobs and indexed render scheduling
apps/                   future shared AWB applications; intentionally empty today
```

The packages live here because more than one application needs them. Project studios remain in
their own repositories until a shared application proves it can replace their working interfaces.
`field_modelling` and `lissajous-viz` are consumers, not subdirectories of this repository.

## Commands

```sh
npm install
npm run verify
npm run test:browser   # optional Playwright static-distribution check
```

Node 22 is pinned in `.nvmrc`. Packages remain private and distributable with `npm pack`; publishing
to a registry is a later decision. Do not make cross-repository consumers depend directly on an
uncommitted `src/` tree. Use a packed artifact or a future private registry release.

See [MIGRATION.md](./MIGRATION.md) for provenance and the transition boundary.
