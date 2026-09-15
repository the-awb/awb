# @awb/sc-console

Reusable sclang console machinery for AWB applications.

- `@awb/sc-console/core` contains the pure SuperCollider line and region selection rules.
- `@awb/sc-console/hook` contains `useScLang` without pulling CodeMirror into the initial bundle.
- `@awb/sc-console/react` contains the lazy-loadable CodeMirror console panel.

The host still owns its shell, its initial document and policy, and the matched `scsynth`/`sclang`
assets. It injects the asset loaders into `useScLang`; the package never guesses URLs or reads a
Vite global. Applications should lazy-load the React entry because CodeMirror is deliberately not
part of an app's initial bundle.

```jsx
const sclang = useScLang(sc, {
  importSclang,
  locateFile: locateSclangFile,
  exposeDevGlobals: import.meta.env.DEV
});

<ScConsolePanel
  sclang={sclang}
  sc={sc}
  onAttach={sclang.attach}
  storageKey="my-app.console.scd"
  initialDocument="{ SinOsc.ar(60, 0, 0.2) ! 2 }.play;"
/>
```

`Cmd/Ctrl/Alt-.` is installed document-wide after attachment, matching SuperCollider's panic
gesture. It runs `CmdPeriod.run`, so app-created nodes on the shared server stop as well.
