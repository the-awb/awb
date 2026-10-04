# Scope 0.1.0

Standalone AWB shell oscilloscope for selected local SuperCollider buses. It does not need a running looper.

Restart the shell once, then **Toolkit Home → Scope → Open scope**. Choose Audio/Control, a first bus and 1–16 consecutive channels, then Listen. Start/prepare the shell's SC host first. Opening the window does not boot a server. Stop/close releases this scope's subscription; identical scopes share capture through the shell engine.

```sh
# From the AWB root; no automatic build:
npm start --workspace @awb/desktop-shell -- --tool scope --profile hosted
npm run test:scope --workspace @awb/desktop-shell
```

If Toolkit Home says **sclang attached**, evaluate this once in that SC IDE session, then press Listen:

```supercollider
"/Users/willy/awb/apps/awb-shell/sc/prepare-sc-bus.scd".load;
```

Expect `AWB_SC_BUS_AUDIO_READY` in the post window. Repeat after class-library recompilation. No server restart is required. Hosted mode uses the available IDE/headless host; only owned headless startup automatically installs the bus bridge.

View → Waves + meters / Waves only / Meters only selects compact per-bus canvas widgets. Audio shows RMS dBFS with held peaks; control shows signed values. Widgets update at ≤15 Hz on a shared browser-frame clock with waves; text labels stay at 8 Hz. Meters remain live while the waveform is frozen. Reopen Scope to load the cadence change; no build or server restart is required. Meters-only keeps the same capture but skips waveform painting.

X/Y zoom, freeze/pan, Connected/Stepped and Auto/30/15 fps are available. For a steady periodic trace, choose Trigger → Rising edge, select a bus, and start with Level 0. Triggering uses measured raw crossings; widened audio envelopes run freely. Reopen Scope for renderer updates. Restart the shell once for the native startup fix; an attached IDE/audio server can remain running. Actual SC rate/block settings drive the timeline. The installed Shared Loop artifact supplies common rendering/history/reduction modules; its running instrument is not required. Existing looper scopes and other audio routes keep their behavior; shared history gains optional endpoint reads with the existing newest-window default.

[Full guide, bus numbering, architecture and verification](../../../apps/awb-shell/docs/scope-tool.md).

[Canvas-meter cost report, process breakdown and raw evidence](../../../apps/awb-shell/docs/scope-meter-costs.md).

See the [15 Hz versus 8 Hz cost comparison](../../../apps/awb-shell/docs/scope-meter-15hz.md).

View → Opacity widgets / Waves + opacity adds channel-linked knob-like indicators with 24/48/96 px or all sizes, updated at 8 or 15 Hz. Audio uses RMS level; control uses a signed −1…+1 mapping. Only opacity changes, with no extra capture. See the [opacity demo and cost analysis](../../../apps/awb-shell/docs/scope-opacity-costs.md). Reopen Scope to load it.

[32/64/128 opacity-widget scaling costs](../../../apps/awb-shell/docs/scope-opacity-scaling.md) test extra visible elements with a fixed sixteen-channel feed. Expanded widget banks are benchmark-only.
