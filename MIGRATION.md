# Canonical package migration

## Ownership

`~/awb` is the canonical source repository for the shared `@awb/*` modules. Application studios
are consumers. They may retain a packed release artifact, but not a second editable source tree.

| Package | Imported from | Provenance | Canonical state |
|---|---|---|---|
| `@awb/score` | `field_modelling/packages/score` | introduced at `88e56ef`; workspace source at `8343cca` | owned here; `field_modelling` consumes a packed artifact |
| `@awb/sc-wasm` | `field_modelling/packages/sc-wasm` | extraction `2d6b50f` / `2c2be66` | owned here; `field_modelling` consumes a packed artifact |
| `@awb/sc-console` | `field_modelling/react-app` console introduced at `1afc425` | extracted 15 September 2026; consumer cutovers recorded separately | owned here; application shells, policy and authored documents remain with each studio |
| `@awb/synthdef-interface` | introduced here | arbitrary `.scsyndef` graph parser and SC-aware interface derivation, 16 September 2026 | owned here; context SynthDefs remain authoritative |
| `@awb/instruments` | `field_modelling/packages/instruments` | extraction `aab2cef` | owned here; `field_modelling` consumes a packed artifact |
| `@awb/field-engine` | `field_modelling/packages/field-engine` | extraction `aab2cef` | owned here; `field_modelling` consumes a packed artifact |
| `@awb/field-renderer` | introduced here | first portable audio-free field producer, 16 September 2026 | owned here; Field Modelling's current Three.js renderer remains the future parity source |
| `@awb/lissajous-engine` | `lissajous-viz/packages/lissajous-engine` | extraction and distribution at `85a349a` | owned here; `lissajous-viz` consumes a packed artifact |
| `@awb/render-pipeline` | `lissajous-viz/packages/render-pipeline` | portable-pipeline source at `85a349a` | owned here; `lissajous-viz` consumes a packed artifact |

`apps/score-studio` is not another package migration. It is the clean development host for the
shared score workflow: canonical editing and persistence, a hosted connector client, a standalone
browser executor and browser integration tests. Field and Lissajous applications can import the
finished score pieces later without becoming the place where those pieces are developed.

The source comparisons were clean at cutover on 15 September 2026. Package-level tests moved with
the source. Application-owned browser, audio, rendering and lifecycle harnesses remain in their
application repositories and were rerun against the packed artifacts.

The cutover is recorded by these commits:

| Repository | Commit | Boundary established |
|---|---|---|
| `awb` | `8ce0ac9` | canonical source, builds, tests and packing for the original six packages |
| `awb` | `d31bbc5` | canonical `sc-console` evaluator, lifecycle and editor machinery |
| `field_modelling` | `e3c5ea2` | packed `score`, `sc-wasm`, `instruments` and `field-engine` consumer; editable copies removed |
| `field_modelling` | `c1f7a27` | packed `sc-console` consumer; local evaluator, lifecycle and editor copies removed |
| `lissajous-viz` | `ba08d7d` | packed `lissajous-engine` and `render-pipeline` consumer; editable copies removed |

## Distribution boundary

Every package is private and exports built files from `dist/`. Run:

```sh
npm run verify
npm run pack:packages
```

The second command rebuilds all workspace packages and writes their tarballs to ignored `artifacts/`. A
consumer copies the required tarball into its own `vendor/awb/` directory and depends on that file,
for example:

```json
"@awb/field-engine": "file:../vendor/awb/awb-field-engine-0.1.0.tgz"
```

The relative path is from the consuming package's `package.json`. The tarball is committed by the
consumer; `package-lock.json` records its integrity. This is deliberately less convenient than a
live `file:../../awb/packages/...` dependency: the latter points at a working tree and allows an
uncommitted canonical edit to ship from another repository without review or provenance.

Updating a consumer is an explicit release action:

1. Commit and verify the canonical package change here.
2. Run `npm run pack:packages`.
3. Replace the consumer's tarball, run `npm install` from its root, and commit the tarball plus
   lockfile together.
4. Run that application's own integration and browser gates before accepting the update.

The tarball filename contains the package version, so a changed package must receive a changed
version before distribution. A registry can replace the vendored-artifact transport later without
changing package ownership or public APIs.

## Deliberate exclusions

Application assets and policy do not move here merely because a package uses them. In particular:

- `scsynth.wasm`, `sclang.wasm` and their `.data` files remain host-served assets;
- Score Studio therefore owns pinned copies of its matched browser wasm assets while consuming
  engine and console behaviour from `@awb/sc-wasm` and `@awb/sc-console`;
- field and Lissajous scene shells, cameras, controls and UI remain application-owned;
- the sharing rule is responsibility, not framework: evaluator contracts and editor machinery may
  be shared, while application shells, audience-specific policy and authored content are not;
- the reusable practice-specific sclang layer is a host-loaded `.scd` of Event prototypes,
  instrument vocabulary, pattern-to-score commitment and `/fm/event` provenance. It runs in browser
  and desktop sclang and needs no npm packaging decision;
- browser/audio behavior is verified in the applications, not inferred from package unit tests;
- `body-acoustic-model` remains an independent repository and is not an AWB workspace package.
