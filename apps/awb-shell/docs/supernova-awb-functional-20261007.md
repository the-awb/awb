# AWB Supernova functional qualification — 7 October 2026

**The rack transport and scope paths work, but this Supernova build is not ready for the full migrated set.** Convolution IR preparation crashes, and notification/client registration has protocol and identity defects. These are functional findings. No CPU, headroom, dropout, latency, renderer-cost or clean-machine claim is made.

[Machine-readable summary](supernova-awb-functional-20261007/qualification-summary.json) · [cleanup](supernova-awb-functional-20261007/cleanup.json) · [retained artifact hashes](supernova-awb-functional-20261007/artifact-manifest.json)

## Tested configuration

User explicitly authorized functional testing with background work allowed and confirmed no other tests were running. Isolated same-revision SC 3.15 engines and sclang at revision `2e198c5c10207c991190ba15714a95510af03c11`; MOTU1248 at 44.1kHz/hardware512, SC128, no hardware inputs, four outputs. The engine build uses PortAudio (`NATIVE=OFF`). Supernova requested two DSP threads; the current rack uses ordinary serial Groups. This is not qualification of a new parallel rack layout.

Private class copies use real ToolInstance, NodeManager, host/projection, AWParam, rack, chain, follower and set implementations. Recorded cello is `/Volumes/ARMED WITH SOUND/Samples/Ali March 22/Cello 1-bounce-1.wav`; Pro2 and six extra channels remain silent. The full scsynth set uses its thirteen configured plugin instances, mono cello Scheps, stereo Scheps/UM, six original file convolutions capped at30seconds/FFT4096, and modulation-profile controls. The tests change base/profile controls and check their plugin mappings. The follower bank runs, but the complete follower-to-FX performance modulation script and MIDI/runMidi were not exercised here.

The native Supernova rack cases deliberately use pass routing instead of the plugin/convolution chains. They retain eight channels, eight FX slots, sixteen active audio-to-control detectors and25follower consumers. At32destinations, eight additional follower destinations are reserved but inactive. Full FX and native cases therefore demonstrate functional transport compatibility, not equivalent DSP workloads.

## Results

| Exercise | scsynth | Supernova |
|---|---|---|
| Ten boot/quit cycles; NodeWatcher/ToolInstance;1000tracked self-ending voices; persistent pause/resume/move/release; Event/Pattern; AWParam ordering, interrupted ramp, writer removal, getLive/unmap, detector |52/52language assertions |52/53; notify-off acknowledgement fails |
| Actual shell relay: two WebSocket clients,20connect/disconnect cycles, disable/enable, corrupted genuine batch-sequence recovery, NodeManager bridge restart |13/13 |13/13 |
| Native audio/control scope capture; advancing finite samples; two viewers share one tap; removing one keeps the other; last lease retires acquisition |Included in13/13 |Included in13/13 |
| Eight-channel24destination rack with actual runtime/WebSocket transport |Full FX set:119plugin readbacks +10bridge/scope assertions |Native rack:10routing assertions +10bridge/scope assertions |
| Eight-channel32destination rack with actual runtime/WebSocket transport |Full FX set:119plugin readbacks +10bridge/scope assertions |Native rack:10routing assertions +10bridge/scope assertions |
| Isolated small `PreparePartConv` impulse preparation, no rack/plugin instances |Pass |Fail; engine exits before preparation completes |

Each final rack case sends100full-matrix bursts:19,200logical edits at24destinations or25,600at32. After the burst sequence, **all192/256send gains are read back independently from engine synth controls** and match sclang's expected arrays. The runtime is also resynced and every final control checked. This is not just a GUI or language-cache assertion.

Every final case has zero transport failures and no GUI-value echo from SC. SC-originated edits reach the runtime without being resent. Sparse capture/recall preserves unselected targets. Real rack master-audio and follower-control scope streams remain active during traffic, with finite samples and no scope errors. This validates the acquisition path; no renderer is attached or visually assessed. Exact scope-frame and OSC message/packet/bundle counts are retained per case.

Native routing checks include BaseLaunch's16input buses, stable dynamic-slot addresses across replacement/clear, retiring-generation cleanup, detector response to real audio, mute/solo suppression, recovery, and the control-send amount fader reaching zero. The wider F1–F10 plan remains a backlog, not a passed suite. In particular, group churn/addReplace coverage, independent language-client allocation, actual engine reboot/rebinding, long scheduling, full live modulation, Supernova VST processing, parallel layouts and all performance gates remain pending.

## Blocking findings and repair targets

### Supernova notification acknowledgement

Supernova returns `['/done','/notify',0]` when notifications are disabled. `ServerStatusWatcher` interprets a returned client ID as a successful enable, so `statusWatcher.notified` remains true although the server has removed the subscriber. scsynth's disable reply has no client-ID field and the same language check succeeds. Supernova also omits maxLogins in its enable reply. The ten language maxLogins-option assertions are informational; they do **not** establish server enforcement.

Evidence: [Supernova language log](supernova-awb-functional-20261007/supernova/language.log), [initial notify failure](supernova-awb-functional-20261007/supernova-notify-failure/language.log). Source: pinned `server/supernova/sc/sc_osc_handler.cpp:945` and `SCClassLibrary/Common/Control/ServerStatus.sc:293`.

### Supernova client registry

With `maxLogins=1` and the primary language client already registered, scsynth rejects all additional OSC clients. Supernova accepts them. Register A→ID1, B→ID2; remove A; register C→ID2. B and C now hold the same returned ID. `add_observer` returns `observers.size()-1`, while `remove_observer` erases and shifts the vector. There is no stable client-slot allocation or configured-capacity enforcement in these methods.

Evidence: [Supernova raw replies](supernova-awb-functional-20261007/supernova-rack-native24/login-probe.json), [scsynth control](supernova-awb-functional-20261007/scsynth-plugins24/login-probe.json). Source: pinned `server/supernova/sc/sc_osc_handler.cpp:396–413`. Repair needs stable slots, capacity enforcement and replies compatible with sclang. Re-test simultaneous clients, disconnect/rejoin and disjoint node allocation. Two shell browsers share a language/engine host and passed; they do not each register as independent engine clients.

### Supernova convolution preparation

The full-set startup crashed with `SIGSEGV`; the macOS report points through `PreparePartConv → scfft_dofft → libvDSP`. A small8192sample impulse/FFT4096 reproducer also loses its engine before preparation completes. The identical scsynth probe prepares successfully and returns finite spectral values. This excludes the rack size and long IR duration as necessary triggers.

Source strongly suggests missing FFT thread initialization: `common/SC_fftlib.cpp` makes `splitBuf` thread-local under Supernova; the DSP/audio thread entry points call `scfft_thread_init()`, but `io_thread_init_functor` does not. `PreparePartConv` runs on the IO callback thread and reaches vDSP using that thread's scratch buffers. **This is a source-based diagnosis, not a repaired-and-verified engine.** No pinned engine source or binary was changed. A repair should initialize FFT scratch on the actual bufgen thread and cover preparation followed by live PartConv processing.

Evidence: [full-set crash report](supernova-awb-functional-20261007/supernova-plugins24/supernova-2026-10-07-173451.ips), [minimal failed probe](supernova-awb-functional-20261007/supernova-ir-probe/language.log), [scsynth probe](supernova-awb-functional-20261007/scsynth-ir-probe24/language.log), [reproducer](supernova-awb-functional-20261007/ir-probe.scd). The probe's language exit is1 after timeout; its engine's apparent “exit0” is not evidence of a clean shutdown.

## Dependency and harness preparation

Installed VSTPlugin binaries have SC plugin API3; these engines require API7. They were rejected. EnvDetect3 had no installed Supernova variant. Matching standard UGens, EnvDetect3 variants and the native scope reader were built privately against the pinned headers. VSTPlugin0.6.2 was built privately from the author's repository, using the official VST3 SDK and the free FST VST2 headers recommended by its build instructions. Installed runtimes/extensions were untouched.

Two private VST-host corrections were needed:

- Isolate the default plugin cache via `AWB_TEST_VST_CACHE`. An initial run loaded unrelated cached factories and crashed in CoreFoundation. Required Waves cache entries remain explicit and read-only.
- Allocate speaker arrangements from `offsetof(..., speakers)` plus actual capacity. FST declares a flexible speaker array; the host assumed eight embedded speakers and underallocated. One initial scsynth run happened to pass, but the32destination retry aborted with heap corruption in `VST2Plugin::setNumSpeakers`. The corrected private dependency passed both24/32full-set cases, including119readbacks each. That abort was a dependency-build mismatch, not evidence that32sends exceed routing capacity.

Exact dependency revisions, [private VST-host patch](supernova-awb-functional-20261007/vst-source-fixture.patch), compiler logs, failed attempts and rebuilt dependency archive are retained. These private binaries are test dependencies, not an installed upgrade or qualification of the existing installed VSTPlugin release.

Early harness attempts also had missing timeline-class dependencies, incorrect whole-registry counting of lazily retained virtual SynthDef containers, an incorrect host-status string and a receiver that failed to decode OSC bundles. Corrected tests count live/non-container ownership and use production bundle decoding. Those attempts remain archived and are not counted as product failures. The final direct-engine readback reruns are the accepted rack results.

## Cleanup and next work

All owned engines, sclang processes, test receivers and scope readers stopped. MOTU was read back at44.1kHz/512;59protected engine/class files retain their initial hashes. Own reservation released. No engine/class installation, commit or merge was performed. Telegram notification tool is unavailable in this chat.

Fix and requalify the Supernova notification/client registry and macOS FFT preparation before trying the full migrated set or its capacity comparison. Retain the current scsynth baseline and functioning rack/scope harness. The concurrent-use policy now distinguishes declared shared functional use, resource-specific exclusivity and quiet performance reservations; see [coordination](audio-testing-coordination.md#concurrent-use-policy--agreed-7-october-2026).
