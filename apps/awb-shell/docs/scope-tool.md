# Standalone Scope tool — 2026-10-03

Scope is now an independently launchable shell tool. It observes selected SC audio/control buses without requiring the looper, creating a private audio server or changing device/sample-rate settings.

## Use

Restart the shell once to load the new installed-tool entry and runtime wiring. No rebuild is required for this change; `npm start` remains separate from build.

From the AWB root:

```sh
npm start --workspace @awb/desktop-shell
# Or open the tool directly:
npm start --workspace @awb/desktop-shell -- --tool scope --profile hosted
```

Open **Toolkit Home → Scope → Open scope**. The window opens stopped, including when SC is unavailable. Start the shell's headless SC host from Home, or use an attached AWB-enabled IDE with a running local server. Opening Scope does not boot a server. If Listen finds no prepared host, it shows an error and can be retried after the host is ready.

For an **attached IDE host**, install the bus bridge once in that IDE session before Listen:

```supercollider
"/Users/willy/awb/apps/awb-shell/sc/prepare-sc-bus.scd".load;
```

The post window should print `AWB_SC_BUS_AUDIO_READY`. Then press Listen again. Hosted mode selects the available host; it does not automatically install this responder into an attached IDE. A shell-owned headless host loads it automatically. Repeat after recompiling the IDE class library. The command preserves the server/device/rate and does not reboot audio. An `/awb/sc-bus/open timed out` error can indicate this setup is missing; first load the bridge in the attached host rather than starting another server.

Select **Audio** or **Control**, enter **First bus** and **Channels** (1–16), then press **Listen**. The range is consecutive: first bus 32 with four channels reads 32–35. Editing the fields does not change capture until Listen. The header always identifies the applied range. A failed replacement leaves the prior capture running; Stop or closing the window releases only this window's lease.

Open the Home card again for another independent scope window. Identical host/rate/bus/count ranges share the shell's physical reader. Identical reduction profiles also share derived display work. Different ranges have independent captures. Partial overlaps are not merged.

The controls retain:

- Logarithmic X/Y zoom, with double-click reset to 1×. Y changes display gain only.
- Freeze/Resume and position within the captured span. Freeze keeps receiving; Stop releases capture.
- Connected and Stepped connections between measured samples, without source-character assumptions.
- Auto / 30 / 15 fps waveform painting; 15 Hz canvas meters and approximately 8 Hz text labels.
- Ordered raw control history at every zoom; widened audio uses peak-preserving min/max envelopes and disables the raw trace-mode selector until raw samples return.

The sample rate and block size come from the active server. The tool does not impose 48 kHz. It reads the shell's current local server; it has no remote-server selector or named-bus catalogue in this version.

## Compact per-bus meters

**View → Waves + meters** is the default. Waves only hides the widgets; Meters only stops waveform painting while retaining the same capture subscription. Each selected bus has its own small canvas, updated at up to 15 Hz through a shared browser-frame callback and clock phase with waveforms. Under a steady feed, this puts meters on every second 30 Hz waveform frame, or every fourth 60 Hz browser frame. Unchanged widgets skip painting. Text labels retain their separate 8 Hz timer. Busy/background windows or missing packets can lower actual cadence; no frames are invented.

Audio bars show RMS in dBFS (display floor −60 dBFS), with a peak marker held for 600 ms. RMS is sample-weighted over received windows since the last meter update; peaks retain the maximum from those windows. The widgets are practical RMS/peak meters, without calibrated mechanical VU ballistics. Control widgets show the latest signed value on a −1…+1 scale, with the observed interval's minimum/maximum shaded. Values beyond that scale remain numerically visible. Control values use their original units rather than dB.

Meters stay live when the waveform is frozen or waiting for a trigger. Stop/disconnection clears them. X/Y zoom and trace interpolation do not change their level scale. Explicit UI actions can flush text immediately; meter paints retain their frame-aligned cadence. Both modes reuse existing packet data; audio needs only the transmitted RMS/peak values, while control also examines its ordered samples. No extra SC tap, subscription or transport is created. Meters only still transports PCM through the current scope engine; it is not yet a level-only capture path.

Reopen Scope to load the 15 Hz cadence; this change needs no build or server restart. The earlier 8 Hz meter milestone rebuilt the native reader for a scope-storage startup fix: restart the shell once to load that addon, without rebuilding. An attached IDE/audio server can stay running. The existing attached-IDE preparation step above still applies. The default 800 × 720 layout fits with 16 widgets; narrower windows can scroll.

The widget helpers are reusable exports from the shared `scope-metadata.js` module; `ScopePainter` and `ScopeFrameClock` are exported from `scope-painter.js`. With a container styled as a small canvas grid and a decoded observation packet:

```js
const meters = new CanvasBusMeters(container);
meters.configure({bus: 0, channels: 2, rate: 'audio'});
const frameClock = new ScopeFrameClock();
const frameOptions = {
  requestFrame: fn => frameClock.request(fn),
  cancelFrame: id => frameClock.cancel(id),
  phase: () => frameClock.epoch,
};
const meterUI = new ScopePainter({...frameOptions, fps: 15, paint: () => meters.render()});
// Give the waveform ScopePainter the same frameOptions to share its clock.
// In the existing observation callback, independent of waveform freeze:
meters.append(packet);
meterUI.invalidate();
// On teardown: close every consumer, then frameClock.close(); meters.clear();
```

Configure Control instead for signed values. Audio packets need per-channel `peaks`, `rms` and `sourceFrames`; control also needs ordered planar `samples` and `frames`. Data keeps its original rate/units. This adds a view consumer; the shell capture remains owned by its broker lease, which still needs releasing on Stop/close.

The [15 Hz comparison](scope-meter-15hz.md) compares the new frame-aligned cadence with the previous 8 Hz timer. The original [8 Hz meter cost report](scope-meter-costs.md) separates capture, waveform and widget costs at 1/4/16 audio/control buses and includes the GPU helper process. It documents the exact rates, sizes and measurement limits.

## Channel-linked opacity examples

Choose **View → Opacity widgets** or **Waves + opacity**. The selected audio/control buses drive small knob-like DOM elements at 24, 48 and 96 px, with individual-size or all-size selection and an 8/15 Hz cadence switch. Only opacity changes; pointers are fixed and no control commands are sent. Audio RMS −60…0 dBFS and signed control −1…+1 map to opacity 0.12…1. The latter is a demo range, which an application's real control mapping may need to change.

They reuse the existing packets and shared frame clock, remain live with frozen waves, and clear on Stop. This is still the full PCM scope feed rather than a latest-value-only subscriber. Reopen Scope to load the demo; no build/server restart is required. See the [implementation and measured opacity costs](scope-opacity-costs.md).

## Holding a waveform steady

The default is **Free running**: each redraw starts at the newest capture window, without aligning signal phase. Successive phases can appear doubled in motion even though a screenshot contains one trace. Adjusting refresh or X zoom can find a temporary beat between signal and display; it does not provide a stable phase reference.

Choose **Trigger → Rising edge**, **On → the bus to align to**, **Level → 0.00** as a starting point. Falling edge is also available. The measured crossing sits one quarter of the way across the plot; all other lanes retain the same time range, rather than being independently shifted. X zoom determines the visible time span. Level uses the original signal amplitude, before Y display gain.

Connected mode locates the threshold between adjacent measured samples and shifts their existing trace by that fractional amount; it does not filter or resample the signal. Stepped mode uses the actual held-value transition. Both work without source-specific frequency/waveform assumptions. Freeze preserves the chosen data and alignment; changed trigger settings apply on Resume. Position is disabled while a triggered range is displayed.

**Waiting for crossing** means no complete suitable raw window is available. After a successful trigger, **Waiting · holding trace** explicitly identifies a retained view while capture continues. Gaps never become invented crossing data. A periodic waveform should settle; complex mixtures, noise or changing frequencies may still vary, and unrelated channels need not share the selected bus's phase.

Triggering is available for ordered raw samples (audio at X ≥ 1× and control at all zooms). Widened audio is a min/max envelope, which loses within-bin sample ordering; the status says **Unavailable · envelope** and the view runs freely. Return X to 1× or above to restore triggering. The longest raw control span uses nearly all available history and leaves little spare room to search for another aligned window.

This is renderer-only observation over the existing bounded history, with no new capture profile, SC node or transport work. A one-lane search is bounded by history capacity, and only the chosen display window is copied. Existing callers of the shared history API still default to the newest endpoint. Reopen Scope windows to load the changes; no build, shell restart or audio-host restart is required.

Validation: 14 Scope unit tests, the actual-shell gate and all 41 existing scope tests pass (56 unique tests). New checks cover 44.1/48 kHz, arbitrary non-integer-period waves, both edges, selected channels, gaps, DC, envelopes, ring wrap and fractional/held transitions. The live gate verifies a fixed threshold crossing in canvas pixels across multiple newly acquired traces, unreachable-threshold waiting, return to Free running, shared raw peers and full default-window layout. No unrelated app is opened. This does not claim a new end-to-end CPU measurement.

[Trigger live log](../test/scope-tool/results/2026-10-03-trigger/live.log), [triggered screenshot](../test/scope-tool/results/2026-10-03-trigger/scope-trigger.png), [source guard](../test/scope-tool/results/2026-10-03-trigger/runtime-guard.json) and [validation](../test/scope-tool/results/2026-10-03-trigger/validation.json).

## Bus numbering

Audio and control buses have separate index spaces. For a language `Bus` object, use `bus.index` and `bus.numChannels`. Hardware audio outputs occupy indices starting at zero; hardware inputs start at `s.options.numOutputBusChannels`; private audio buses start after the configured output and input counts. Do not assume input bus 2 unless the server actually has two output bus channels. These rules match [SuperCollider's Bus documentation](https://docs.supercollider.online/Classes/Bus.html).

For example, listening to an existing four-channel private audio bus `b` means choosing Audio, First bus `b.index`, Channels `b.numChannels`. To inspect a control bus, choose Control with its corresponding index/count. The existing server bridge validates the whole range against that server's actual bus limits.

## Implementation and reuse

Installed artifact: [`tool-artifacts/scope/0.1.0`](../../../tool-artifacts/scope/0.1.0).

| Part | Role |
|---|---|
| [Manifest](../../../tool-artifacts/scope/0.1.0/tool-manifest.json) | Home card, hosted profile, multiple independent views |
| [Runtime entry](../../../tool-artifacts/scope/0.1.0/shell-runtime.mjs) | Receives the shell broker and a lazy trusted host resolver |
| [Capture lease](../../../tool-artifacts/scope/0.1.0/capture.mjs) | Validates ranges, serializes transactional replacements, fences closure during allocation |
| [Local server](../../../tool-artifacts/scope/0.1.0/server.mjs) | Same-origin loopback HTTP/WS, bounded ACK delivery, guaranteed socket cleanup on lease errors |
| [Generic codec](../../../tool-artifacts/scope/0.1.0/public/protocol.js) | `awb.bus-scope.v1`, up to 16 planar Float32 lanes and per-channel levels |
| [Scope UI](../../../tool-artifacts/scope/0.1.0/public/scope.js) | Bus controls, owned history/freeze, cached lane backgrounds and waveform painting |

The existing [SignalCaptureBroker](../src/signalCaptureBroker.mjs), native source and SC observer bridge are reused unchanged. Capture keys include host identity, rate, bus and channel count. The new tool uses the same `scope:<base>:<step>` derivation profiles as the looper; a compatible raw client retains original 512-sample PCM while scope audio combines pairs into 1,024-sample display chunks. Control capture publishes 32 control samples per chunk, with a 128-sample base display.

Shared `ScopeHistory`, `ScopePainter`, `ScopeMetadata`, `paintScopeTrace` and base style assets are served from the installed Shared Loop artifact. This is a code dependency on that versioned artifact, not a dependency on a running looper. The standalone renderer has its own generic bus selection and wire codec; the looper's fixed-source binary v5 protocol/UI remain untouched. Renderers do not receive the native-host credentials or unrestricted Node access.

Host shutdown refuses active captures. Press Stop or close dependent views before stopping the owned host; an idle Scope window does not block host stop. A renderer disconnection releases its capture; after reconnecting, press Listen to resume. Native cleanup errors still close the runtime HTTP/WebSocket sockets and are reported.

This keeps the existing observation semantics: it reads buses, not stored Buffer contents. Shared-memory scope publication can miss intermediate windows; gaps remain visible in bounded rolling history. It is not a lossless recording route. No new CPU benchmark is claimed for this 1–16-channel UI; see the earlier [drawing/capture measurements](scope-next-costs.md) for their measured configurations.

## Verification

- Eight focused tests pass: 1–16-channel binary round trips, raw/control/envelope dimensions, malformed frames, shared physical/derived capture, transactional rollback, close during allocation, disconnection recovery, origin/ACK checks and socket cleanup after lease failure.
- The new actual-shell gate passes. It opens Scope through its Home card before SC starts, verifies the missing-host retry, then reads private audio ranges with 1/4/16 channels and 16 control lanes. Every control lane is checked in a decoded live packet. Audio levels match the private source amplitudes and waveform pixels actually change.
- Two independent scope windows plus a raw PCM client share one physical tap. Changing one scope's zoom does not replace that tap or alter the other scope/raw peer. Freeze/trace changes operate on the same captured samples. Switching buses/rates updates routing and an invalid replacement preserves the previous range.
- Stop, close and last-subscriber release restore SC node/group counts, stop polling and leave the host/raw peer alive as appropriate. The renderer is sandboxed and the complete default 800 × 720 window fits without scrolling. No Field, Studio or Lissajous view is opened by this gate.
- Thirty-four existing manifest/router/runtime/capture/Home/looper checks and all 41 existing scope tests pass. The looper's three scopes, sliders, selection, cadence and raw-peer isolation remain intact.
- Within the 52-source pre-change runtime inventory, only shell `main.mjs` and `tools.json` change. Native/SC/broker/Lissajous and looper display/transport code were byte-identical at the initial standalone-tool milestone. The later optional-trigger change adds endpoint/point reads to shared history; existing default history behavior is covered by its regression tests. New artifact/tests, the test script and Home icon are additive. Disposable benchmark fixtures now include the fifth catalogue entry; earlier measurement results are not rewritten.

The isolated live host detected 48,000 Hz/block 64 in this run. It used device defaults, no hardware output from the test producer, random owned ports and temporary user data. The normal live shell/host was not restarted. Synthetic codec/capture checks also cover 44.1 kHz.

Run from the AWB root with Node 22 first in PATH:

```sh
npm run test:scope --workspace @awb/desktop-shell
```

[Live gate log](../test/scope-tool/results/2026-10-03/live.log) and [screenshot](../test/scope-tool/results/2026-10-03/scope.png), [validation summary](../test/scope-tool/results/2026-10-03/validation.json), [runtime source guard](../test/scope-tool/results/2026-10-03/runtime-guards.json). The initial live run caught a default-window overflow; the final layout and smoke assertion check full page height/width, with no scrolling at the default size.

Vault MCP and Telegram were not callable in this session; no external update or direct vault-file write was made.

The [32/64/128-widget comparison](scope-opacity-scaling.md) measures extra visible opacity elements with a fixed sixteen-channel source feed. These expanded banks are fixture-only; the normal bus selector stays at 1–16 channels.

## Headless audio deadline tests

See the [audio deadline and focus-switch comparison](scope-headless-dropouts.md). Average widget CPU alone does not establish audio safety: steady 128-widget updates were clean at both tested loads, but cross-app focus switching failed at the heavier load. A persistent-helper control reproduced this; helper-launch no-op controls were clean.
