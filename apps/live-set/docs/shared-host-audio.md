# Shared-host delay/rack integration — 2026-10-07

The composite now borrows actual SC-hosted audio and controls. AWBaseTool owns the prepared FX set and one UBPGraphController delay graph. Nine rack channels expose 24 destinations each; four separate delay returns and Delay Bus are wired. No private delay engine or duplicate internal routing is launched by the composite viewer.

## Functional evidence

The final test used the real first-pass set: Verb file convolution capped at 30 seconds with FFT 4096; Deci, Sparkle, restored Fuzz, UM and mono/stereo Scheps enabled. Required plugin controllers became ready. A pre-existing VST cache entry reported `FL Studio VSTi.vst: not a plugin`; it was unrelated to the loaded set. No server command failures or duplicate resource-free errors occurred in the final run.

Test settings: scsynth, 44.1 kHz, SC block 128, existing hardware buffer 512, three input/four output channels, 262144 KiB real-time pool and two VST DSP workers. The rack master group was paused; test signals were DC sources captured in private SC buffers. This verifies routing and control behaviour, not audible quality or full FX signal-path parity. The full FX graph was allocated and active. No runMidi, global MIDI initialisation or physical-input connector was started.

| Gate | Passed | Evidence |
| --- | ---: | --- |
| Actual SC/audio assertions | 26 | `shared-host-verification/engine.log` |
| Actual Node/SC bridge assertions | 11 | `shared-host-verification/node-results.json` |
| Actual Electron GUI assertions | 8 | `shared-host-verification/browser-results.json` |
| Focused Node tests | 23 | `shared-host-verification/node-tests.log` |
| Isolated SC contracts | 15 | `shared-host-verification/sc-contracts.log` |

The audio assertions measured VC → B1 and Pro2 → A2 independently, stereo preservation, both SC inputs → A1, one aggregate sum, separate wet returns, source mute and an internal B1 → B2 route. Feedback modulation was registered and measured on the output bus; a GUI edit changed its baseline without removing the modulation input. The rack fader changed the same Delay Bus AWParam used by the delay view.

The actual Electron test opened four native stereo waveform views, the SC rack, AWParam sources and AWBase logs. It checked SC-origin reconciliation, keyboard edits, retained timing metadata, GUI-close borrowing and owner-loss reader detachment. The captured composite is `shared-host-verification/composite.png`.

## Bugs corrected during integration

- Persistent set ownership was being discarded by NodeManager's generic playback poll: `Object.isPlaying` defaults to false. AWBase now adopts resources with explicit container lifetimes. This keeps first-pass set cleanup ordered before parent rack teardown.
- Per-head sends had GUI values of zero but native edge defaults of one. They are now explicitly initialised from the configuration.
- Graph retirement is asynchronous. Closing the base now disowns native graph resources and moves the paused graph out of its parent before retirement, avoiding duplicate frees.
- OSC strings arrive as Symbols. Metadata is normalised and string membership uses equality rather than identity.
- Observed seconds must not be recomputed from rhythmic UI metadata. SC snapshots and deltas preserve the authoritative timing parameter.
- A failed viewer startup releases partially attached readers; owner loss detaches all eight handles.

## Repeat and limitations

From the AWB root under Node 22, after building the native readers, delay plugin, rack and live-set bundles:

```sh
python3 apps/live-set/sc/test-run.py --output /private/tmp/awb-live-delay-classes
AWB_FULL_SET=1 AWB_DELAY_GUI=1 python3 apps/live-set/test/run-delay-audio.py
node --test --test-concurrency=1 apps/live-set/test/*.test.mjs apps/rack/test/model.test.mjs
```

The functional fixture has private UDP ports 57975/57976 and refuses an existing exclusive audio-test lock. It must not overlap another use of these fixture ports. It freezes the selected SC classes and uses per-server plugin paths, leaving the installed class library unchanged. Its test engine and language process exited cleanly. The pre-existing interactive preview was preserved. No sample-rate or device-buffer change was made.

The next performance run should compare the same live-set audio baseline with the composite, sparse AWParam observation, rack edits/transitions and shared scopes enabled. It needs actual cello playback, live follower/modulation activity and delay record/feedback operations, with dropout measurement and the required audio-only headroom separated from GUI cost. This pass makes no quiet-machine or CPU capacity claim.

Still to review: physical MOTU input indices/audition; translations of legacy delay blender/envelope/tap controls; final GUI layout; detailed tail/click policy. The currently selected feed-forward cell topology intentionally excludes reverse routing cycles. Persistent delay-input reads add one SC block; rearranging this order would require an explicit routing-policy change.
