# Lissajous tool config in AWB Desktop

The first durable Lissajous filesystem document is `awb.lissajous-config/1`, normally stored as
`*.lissajous.json`.

It captures the complete reusable live visual setup:

- stable pattern IDs, names, visibility, positions and rotations;
- stereo `sourcePair` routing;
- audio scale, point size and opacity, persistence, warp, depth, brightness and colour controls;
- visualization mode, camera, canvas and frame rate.

It deliberately excludes audio files and URLs, score relationships, physical device identifiers,
playback state, recordings and automation. Audio capture remains a launch/runtime concern. Score
and audio containers can refer to a config later; automation will be redesigned as a separate
contract.

The shell grants each renderer an opaque file handle. It owns native dialogs, recent-document
references and atomic writes; Lissajous owns validation and the document schema. Toolkit Home uses
the manifest's `lissajous-config` document kind for New, Recent and Browse actions.
