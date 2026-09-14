# @awb/lissajous-engine

Canonical source lives in the `~/awb` workspace. Applications consume a built private artifact;
they do not keep an editable copy of this package.

Workspace package for the portable Lissajous renderer.

- `@awb/lissajous-engine/core` — React-free state, automation, sample and Three.js rendering code.
- `@awb/lissajous-engine/r3f` — thin React Three Fiber mounting and frame-scheduling adapter.
- `@awb/lissajous-engine/vanilla` — canvas-owning Three.js renderer with an optional OrbitControls
  host, owned animation loop, and synchronous indexed frame stepping.
- `@awb/lissajous-engine/browser` — self-contained browser ESM; includes Three.js and needs no
  bundler or import map.

The normal `/core`, `/r3f` and `/vanilla` imports are compiled ESM and keep their peer runtimes
external. This lets an existing Three.js or R3F tool share its installed `three`, `react` and R3F
instances rather than loading duplicates.

For a bundler-less module page:

```html
<script type="module">
  import { createLissajousEngine } from './dist/lissajous-engine.browser.js';
  const engine = createLissajousEngine({ canvas: document.querySelector('canvas') });
</script>
```

For a classic single-script embed:

```html
<script src="./dist/lissajous-engine.global.js"></script>
<script>
  const engine = AWBLissajous.createLissajousEngine({
    canvas: document.querySelector('canvas')
  });
</script>
```

The classic bundle deliberately includes its own Three.js runtime and is intended for standalone
embeds. Use `/vanilla` or `/core` inside an existing Three.js application. Run `npm run build -w
@awb/lissajous-engine` to regenerate all files in `dist/`. `npm pack` runs that build automatically
and includes only the compiled distribution plus this README and the package manifest.

The core owns visual behaviour and GPU resources, but not a canvas, camera or animation loop.
Adapters must call the same core rather than reproduce point, trail or persistence logic.

`setState(snapshot)` is the non-recordable bulk-restore path. Interactive automatable changes
remain the host application's responsibility and must continue through its recording funnel.
