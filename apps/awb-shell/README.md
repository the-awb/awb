# AWB Desktop Shell

The neutral Electron owner for AWB Toolkit Home and hosted tool views.

```sh
npm run build --workspace @awb/score-studio
npm start --workspace @awb/desktop-shell
```

An external launch uses the same router as Toolkit Home:

```sh
npm start --workspace @awb/desktop-shell -- \
  --tool score-studio --tool-session session-1 --score /path/to/example.score.json
```

Tool renderers receive only the frozen `awbHost` preload contract. The shell discovers workspace
artifacts from `tools.json`; each artifact must provide a valid `awb.tool/1` manifest whose renderer
entry remains inside that artifact.

The installed Lissajous Viz renderer lives under `../../tool-artifacts/lissajous/`. Its editable
source remains in `~/lissajous-viz`; rebuild it there with `npm run build:tool`, then replace the
complete versioned artifact and update `SOURCE.md`. The first desktop profile requests audio-input
permission, defaults to multichannel capture and excludes file workflows, browser SuperCollider,
automation persistence and deterministic export.

Run the neutral unit and desktop gates with:

```sh
npm test --workspace @awb/desktop-shell
npm run test:electron --workspace @awb/desktop-shell
npm run test:neutral-shell-hosted-real --workspace @awb/score-studio
```

The Electron suite includes a two-tool gate which launches Score Studio and Lissajous together,
checks the latter's multichannel request and audio-input grant, and closes each view independently.
