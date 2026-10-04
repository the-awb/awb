# Rack comparison tool

Run `./launch-rack.sh` from the isolated checkout. It launches the normal AWB
Electron shell with a separate profile, opens Rack, and disables the shell's SC
host connection. Rack output starts off. This checkout includes a snapshot of
the existing AWB working files; it has not been merged into the live checkout.
Dependencies currently link to `/Users/willy/awb/node_modules`.

## Available controls

- One send rack per channel, with all channel racks shown by default. Each strip is 52px wide with 32px send rows, comparable to the existing 55px o-s-c channel panels. Shared bus levels retain the larger 60×88px controls, arranged horizontally below the send strips. Instruments have a stable ID and display name; add/remove instruments.
- Each channel can override its mapping regions and send count independently. Choose its rack in Define; shared defaults apply to channels without overrides.
- Regions: label, send count, destinations, per-channel/global scope, knob or
  fader, OSC address template, range, quantisation, and linear/log/breakpoint curve.
- HTML/SVG, one Three.js WebGL canvas, or both views side by side. Both operate
  the same values. Instrument/region filters and scrolling work in either view.
- Vertical dragging, wheel adjustment, keyboard arrows/Home/End, fine dragging
  with Shift/Ctrl, reset by double-click, and numeric entry. Canvas numeric entry
  uses the selected-control field below the rack. Tab navigates canvas controls.
- Local JSON library, automatic persistence, shell-native import/export, and
  import of the existing `osc-config/config.json` scene data.
- A mixes panel on the main rack selects and recalls mixes. Associate an SC scene ID without defining or launching an SC composition.
- **Snapshot all** captures all sends and destination levels, including zeros. **Select snapshot** temporarily turns control clicks into selection toggles in either renderer; dragging, wheel adjustment, stepping and resets are blocked. **Make snapshot** captures only selected controls. Unselected controls persist as null and remain unchanged on recall. Captures include filtered-out controls when using Snapshot all; selection spans filters and views.
- Capture defaults set overall mix time, target time and Start/Centre/End alignment. Target time is in seconds and must fit inside the overall window. Legacy J remains a start-aligned transition, matching the existing OSC bridge.
- **Edit mix** uses the existing rack surface, with per-control amount text boxes and expandable time/alignment fields. There is no separate matrix editor. Both renderers show the same mix draft; changing an amount immediately updates the live commanded value through the normal output adapter (when armed). Timing/alignment edits and clearing a target to blank change only the definition; the canvas gets native HTML fields only during editing. Blank amounts mean unchanged, and zero is an explicit target. Expanding a blank target shows disabled timing fields until an amount is entered.
- In edit mode, arrows navigate the visual grid and focus the next control's amount text box without stepping a knob. Tab and Shift-Tab cycle amount/time/alignment within the cell, expanding fields when needed. The larger horizontal level bank follows the same rules. Controls use more room during editing; the regular compact layout is unchanged.
- Save edits persists the draft without sending control values. Save & recall applies its transition; Recall immediately saves then jumps to it. Done saves and exits, Discard exits without saving the mix definition and keeps the live values already sent, and Delete mix removes the definition. Changing overall mix time scales existing target times; Apply default timing updates only defined targets. Manual live movement removes just that control from the current transition.
- Command monitor and rendering counters.

The fixture has 14 source lines, six FX sends, 18 bus sends, 18 bus levels, and
11 imported mix snapshots: 354 controls. Sheet amounts are normalised fractions;
the importer uses the existing bridge's `truncate(amount * 127)` conversion.
Mix snapshots associate settings with SC scene IDs; they do not define or launch
SC compositions, or use Bitwig clip scenes. Capture records commanded values,
with no continuous Bitwig readback.

## Output

Enable output explicitly after reviewing the adapter and destination port in
Define. Changing configuration or disconnecting the final client disarms it.

**Existing o-s-c → Bitwig:** UDP OSC `/SET <widget address> <0..127>` to the
existing o-s-c server, default port 8080. Its loaded client and `transition.js`
perform the existing MIDI conversion. The rack emits OSC only; this comparison
adapter retains the current downstream MIDI bridge. It does not update the
Bitwig extension. Native OSC input requires a future extension change.

This adapter preserves the current FX/bus ordering and rejects incompatible
regions. ENVIR has no mapping in the current bridge and output is blocked for
that destination. The DECI/FUZZ source-channel discrepancy between transition.js
and the extension is recorded in Define; the live mapping has not been changed.

**Direct OSC:** each region emits its address and numeric value to a configurable
local UDP port. Templates accept `{instrument}`, `{destination}`, and zero-based
`{index}`. This is suitable for an OSC-capable receiver; the current Bitwig
extension does not supply one. **Preview only** emits no OSC.

The library is `rack-library.json` in the shell profile's `tool-runtimes` folder.
With the launcher this is `.rack-user-data/tool-runtimes/rack-library.json`.
The original o-s-c configuration and sheet data are never overwritten.

## Rendering and verification

React 18, Vite, Node, the standard shell preload/manifest/runtime contract, and
Three.js. React builds the SVG rack structure. Each control subscribes directly
to its own store value and queues a ref-based SVG/text paint in one shared
`requestAnimationFrame`; only dirty controls paint, with repeated same-frame
changes coalesced to the latest value. Value changes cause no React control
renders or structural DOM changes. The selected inspector remains a small React
subscription. Numeric readouts are text nodes that open a native number editor
on click or focus; native stepping and keyboard entry remain available. One
composited rack layer reduces browser work; per-control CSS containment was
measured and discarded because it did not help.
Three.js uses instanced geometry, static label/glyph atlases, partial attribute
uploads, and demand rendering. The complete rack image lives in an explicit WebGL render target. Up to 32 changed tiles are drawn into that retained texture with scissoring; larger simultaneous changes redraw its contents. Each changed frame presents the complete cached image through one textured quad, so browser framebuffer discard cannot erase unchanged controls. Idle racks draw no frames. The WebGL canvas uses pixel ratio 1 for a bounded comparison; SVG remains
resolution-independent. Full-screen canvas text accessibility is less complete
than the individual SVG slider semantics.

Limits: 64 channels, 16 regions, 64 destinations per region, 96 controls per
row, and 4096 controls total. A full-canvas frame can still cost more than a small
DOM update; render counters are evidence of update isolation, not a claim that
Three.js is faster. The recorded frame cadence is not a comparative CPU/GPU
benchmark.

```sh
npm run build --workspace @awb/rack
npm test --workspace @awb/rack
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/electron.mjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/shell-smoke.mjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/canvas-visible.mjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/svg-visible.mjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/mixes-electron.mjs
```

The GUI check mounts 354 controls, changes one control on 100 animation frames,
asserts zero React app/rack/control renders and no unrelated or structural DOM mutations, checks
that canvas pixels change only within the affected tile, tests gestures, send
count editing and snapshot recall, and verifies OSC bytes at a local dummy UDP
receiver. The shell check verifies actual registration/preload/runtime and
native file grants. Screenshots and JSON results are in `test/artifacts`.
The onscreen canvas regression reproduced the disappearing-controls bug before the fix and now verifies that edits preserve unchanged pixels, earlier controls, and the complete idle image after browser composition. Offscreen capture alone did not expose that bug. The onscreen SVG check uses native Chromium pointer/text/keyboard input, tests Tab/blur, checks same-frame coalescing and pending-frame unmount/remount, and verifies that pixel changes stay inside the edited control. The mix GUI check uses native Chromium input in both renderers: complete/selected capture, selection highlights and blocked value changes, arrow/Tab navigation, collapsed timing fields, blank/zero destination levels, live amount edits with dummy OSC output, definition-only timing/blank edits, discard semantics, invalid timing, save and sparse/full recall. Its results are in `test/artifacts/mixes.json`. Tests do not operate the live Bitwig mixer or SC audio engine.

Files added: `apps/rack/` and `launch-rack.sh`. Registration adds `../rack` to
`apps/awb-shell/tools.json`; `package-lock.json` records the new workspace.
All other working-file differences in this isolated checkout predate the rack.

## HTML/SVG optimisation measurements (2026-10-03)

Three repeats per case, 354 mounted controls, 32 ms update cadence for six seconds,
700 ms warmup, Electron 44.4.1 / Chromium 152. Values are renderer plus Chromium
GPU-process CPU; 100% means one core. Browser/main, runtime/server, WindowServer
and hardware GPU utilisation are excluded. Output was disabled.

| Moving controls | Previous CPU | Updated CPU | Reduction | Previous p95 frame interval | Updated p95 |
|---:|---:|---:|---:|---:|---:|
| 1 | 37.4% | 32.5% | 13.1% | 17.4 ms | 17.5 ms |
| 5 | 40.3% | 33.9% | 15.8% | 17.5 ms | 17.4 ms |
| 10 | 42.9% | 35.8% | 16.6% | 17.3 ms | 17.4 ms |
| 25 | 48.3% | 39.2% | 19.0% | 17.4 ms | 17.5 ms |
| 50 | 55.9% | 43.8% | 21.6% | 17.5 ms | 17.5 ms |
| 100 | 88.5% | 50.8% | 42.7% | 17.6 ms | 17.4 ms |
| 354 | 144.5% | 95.6% | 33.8% | 34.2 ms | 17.5 ms |

These are medians from 42 completed measurements, with zero final model, slider
ARIA or displayed-value mismatches. The updated rack painted every requested
control value in these runs, with no React control renders. The p95 figure is an
animation-frame interval, not input latency or hardware GPU time.

The baseline remains frozen in `test/fixtures/react-baseline`. The benchmark
builds both implementations in temporary directories and uses separate,
output-disabled runtime data. No live app files or profiles are used.

```sh
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/benchmark-react.mjs
node apps/rack/test/summarize-react.mjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron apps/rack/test/benchmark-react.mjs --profile --variants=readout --label=profiles-readout
```

CPU profiles, Chromium timeline traces, screening results, screenshots, the
full comparison and summary are in `test/artifacts/react-investigation`.
Stable React subscriptions alone and CSS containment did not reduce measured
cost. Direct SVG updates helped under load; lighter readouts and rack compositing
provided the remaining gains. The single-canvas view remains substantially
cheaper in the earlier scaling comparison. Browser rendering still sets the
HTML/SVG cost floor.

Matched diagnostic profiles at full load reduced recorded JavaScript time from
1.51 s to 0.49 s and layout time from 1.08 s to 0.58 s per six-second workload.
Those profiles include profiling overhead and endpoint checks; they explain the
result but are not used for the CPU percentages above. At one moving control,
JavaScript remained a small cost and compositor layer preparation dominated.

## Native SuperCollider send rack

The rack now has a real `AWBSendRackTool : Tool` routing backend: persistent channel input buses, faders/mute/solo, stable FX/follower pipes, tail-preserving FX replacement, and prepared full/packed per-voice wrappers. Both existing renderers and mix editors operate this backend through OSC. SC-originated control changes follow automatically through bounded, coalesced feedback; attach and explicit Sync refresh the complete command state.

See [sc/README.md](sc/README.md) for setup, examples, native Tool/NodeManager ownership, the isolated verification command and first-pass boundaries. The SC classes are bundled in this shell workspace; the comparison checkout remains a separate experimental lane. They are not installed into the live class path automatically.
