# SC DSP history

Open **DSP History** from AWB Toolkit Home after restarting the shell. Default server OSC endpoint is 127.0.0.1:57110; set the port for a different scsynth server. This observes scsynth directly, without booting, muting, mapping or stopping it. It works with an IDE-launched or headless server.

One shared UDP observer per port polls `/status` at 4 Hz. Views obtain incremental history at 2 Hz and draw one Canvas2D surface on display frames, at most 2 Hz. Views whose Page Visibility API reports hidden stop HTTP requests and painting; collection continues until the final view closes. Maximum since Clear can outlive the five-minute ring. Freeze pauses the display while recording continues. Clear resets shared history for that port. CSV contains the currently retained display samples. Disconnects create gaps; old numeric readouts remain labelled unavailable rather than being fabricated as zero.

These are **SC-reported DSP percentages**, not whole-machine CPU or a dropout measurement. scsynth holds its peak for approximately one second, so a spike can appear in several adjacent samples. Polling cannot recover individual callback durations or guarantee capture of every spike. The audited audio benchmark records exact callback timing separately. History is not a synthesis graph and does not create a language-side ToolInstance.

No Qt/browser cost comparison is claimed. The default graph shows 1200 samples; no React tree updates or per-knob render loops are involved. Actual renderer overhead is measured separately from the five-minute audio tests.

Tests: `node --test apps/dsp-history/test/*.test.mjs`.

Electron validation at the declared 960×460 window checks data, bounded paint rate, freeze/resume, clear, and simulated page visibility. Native hide/minimize did not reliably report `document.hidden` in this Electron/macOS probe, so native hidden-window suspension remains unverified. The panel itself fits the default window.

Real-cello capacity results and allocation/steady-state peak separation: [rack capacity report](../awb-shell/docs/awb52-cello-capacity.md).
