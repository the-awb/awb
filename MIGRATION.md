# Initial package migration

## Imported 14 September 2026

| Package | Source repository | Source revision | State |
|---|---|---|---|
| `@awb/score` | `field_modelling/packages/score` | `88e56ef` package introduction; copied from workspace at `8343cca` | Canonical source moves here after consumer cutover |
| `@awb/lissajous-engine` | `lissajous-viz/packages/lissajous-engine` | `85a349a` | Canonical source moves here after consumer cutover |
| `@awb/render-pipeline` | `lissajous-viz/packages/render-pipeline` | `85a349a` | Canonical source moves here after consumer cutover |

The first commit copies source and package-level verification without deleting either origin copy.
That is a deliberate two-phase migration, not permission for permanent forks:

1. Make this workspace build and test independently.
2. Choose a pinned cross-repository distribution mechanism.
3. Point each existing application at AWB artifacts and run its integration/browser gates.
4. Delete the origin package copy only after that consumer is green.

`@awb/sc-wasm` is excluded because its extraction is actively in progress in `field_modelling`.
`@awb/field-engine` does not exist yet. Import each only from a clean, committed extraction rather
than copying a working tree mid-refactor.

Application-owned checks remain with their applications. In particular, exact R3F/vanilla pixel
parity, decoded WebCodecs frame content, the production export UI, SuperCollider lifecycle and
field-renderer behavior are integration gates, not package-unit tests.
