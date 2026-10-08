# AWB audio testing coordination

Use this shared working note before starting audio tests, builds or other heavy work on Willy's Mac. It records reservations and results; the capacity report remains the detailed evidence record. Current branch: `integration/bw-sc`.

## Current reservation

Status: AWB functional qualification completed and its reservation released at 16:56:07 UTC, 7 October 2026; MOTU512/44.1kHz confirmed. This workstream has no active reservation. Check the live lock and active declarations for subsequent use. See [functional results](supernova-awb-functional-20261007.md).

The following configuration records the earlier MOTU256 capacity reservation; it is historical, not an active claim:

- Hardware: MOTU1248,44.1kHz. Initial buffer512; requested test buffer256. Restore512 after the session.
- Engine: isolated audited scsynth copy, SC block128, RT pool262144KiB,3inputs/4outputs. FFT4096, two VST workers, original IRs capped30seconds.
- Workload: recorded cello through the first-pass FX rack,16control sends and25followers, representative live server modulation. Pro2 silent; GUI and shell bridge excluded.
- Planned captures:300seconds rack-only, then300seconds with live-calibrated extra DSP of25–30percentage points. Repeat boundary results if needed.
- Results root: `/private/tmp/awb-motu256-session-20261007`. Raw native callback audit and physical-return continuity capture retained with each run.
- Live reservation: `/private/tmp/awb-audio-hardware-test.lock/owner.json`. Check the lock rather than assuming this note's last status is current.
- During the reservation, avoid other audio engines, DSP tests, compilation, large transfers/unzipping and graphics benchmarks. Light coordination messages are fine. An existing idle shell is retained; this is not a claim that the whole machine is perfectly isolated.

## Concurrent-use policy — agreed 7 October 2026

An active engine is not automatically an exclusive reservation. Every agent must declare its use and the isolation it needs:

- **Shared functional use:** non-sensitive interactive/development checks may coexist. Declare owner/PID, engine/ports/device, output routing and expected load here; use separate ports, node ownership and cleanup. Never reboot, quit, free nodes on, or change another owner’s engine without agreement. Sharing one engine requires agreed node/bus ownership; an independent engine must also declare hardware use.
- **Exclusive resource use:** request exclusivity for named resources (engine or audio device) when tests require it, including device-setting changes. Other independent/light work may continue unless explicitly excluded.
- **Quiet performance testing:** requires both exclusive audio/test resources and absence of other heavy SC or non-SC processes, including builds, graphics benchmarks, downloads/unzipping. Record contamination; background variation still exists.

The lock directory below represents exclusive use, not every engine session. Shared users record their active declaration without taking or deleting another owner’s lock, and must check whether it conflicts with any existing exclusive reservation. A lock must include `useMode` and `exclusiveResources`; quiet reservations also include `quietMachine: true`.

The completed AWB functional run used an exclusive MOTU test resource during isolated boot/quit cycles, `quietMachine: false`; light and non-conflicting development was allowed. It did not claim exclusive CPU use. Future functional tests may use a shared engine when ownership and restart requirements permit.

## Reservation protocol

1. Read this note and check for the lock directory. For exclusive hardware use, claim the hardware by atomically creating `/private/tmp/awb-audio-hardware-test.lock` before opening an engine or changing the interface. Failure to create it means another reservation exists.
2. Immediately write `owner.json` with owner/thread, controller PID, start time, configuration and output directory. Record the reservation here. The current controller handles this automatically.
3. Do not remove a lock merely because it is old. Verify its owner's PID and owned child processes, and resolve uncertain ownership before proceeding. A crash between directory creation and owner-file creation requires the same caution.
4. Keep startup, calibration, warmup and timed captures separate. Label contamination; do not quietly discard failed launches or runs.
5. Restore the agreed device settings, stop only owned processes, save results and update this note. Remove only your own owner file and lock directory after cleanup succeeds. If cleanup fails, retain the lock and record the exact problem.

This is a cooperative reservation. It does not forcibly prevent another application or non-participating agent from starting work. All agents performing hardware or CPU-sensitive tests should follow it. Sharing this path with other chats does not itself notify them.

## Pending work

- MOTU256 comparison completed; loaded workload failed. Unloaded repeat cancelled by the user; no further rack capacity tests queued.
- Supernova repairs/qualification: completed bounded functional gates in separate reservations. C++ 34/34, offline 59/59, realtime 4/4; capacity/physical-return tests pending. Repair summary: `/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider/Testing/temp/supernova-repairs-20261007/qualification-summary.json`. Original failure record remains in `supernova-qualification-20261007`.
- GUI plus instruments plus SC bridge: pending after capacity and latency checks.
- Latency and dry/wet alignment: not established by the continuous-pilot dropout test.

## Completed sessions

- Prior hardware512/scsynth tests: see [capacity report](awb52-cello-capacity.md). Two five-minute FFT4096/two-worker runs with more than25percentage points of additional DSP had zero steady native/return faults. Preparation still had allocation spikes; complete GUI/instrument workload remains unqualified.

## Supernova workstream overlap notice, 7 October 2026

Recorded at 11:44:19 UTC after this chat was given the coordination note. The MOTU reservation remains owned by PID79848; this workstream has not claimed or altered it.

- Isolated repair compilation ran 11:40:27.514–11:41:02.196 UTC.
- C++ and offline DSP qualification ran 11:42:21.589–11:43:12.609 UTC, then its process group80647 was stopped. No realtime Supernova device was opened.
- Capacity captures overlapping either interval must be labelled contaminated by this workstream. The capacity controller must resolve which preparation/calibration/timed stages overlapped; no clean capacity conclusion is asserted here.
- C++ 34/34 cases and ordering 30/30 probes passed before the stop. Lockup/EOF validation and realtime churn are pending until the reservation ends. No further builds or DSP tests will run under the current reservation.
- Exact overlap record: `/private/tmp/awb-supernova-qualification-20261007/repair-validation/evidence/reservation-overlap.json`. Telegram notification is unavailable in this chat.

Supernova offline reservation: 2026-10-07T11:56:48.768220+00:00, PID82157, serial build/tests; no audio device.

Supernova offline reservation ended 2026-10-07T11:58:43.421332+00:00; exit0; evidence `/private/tmp/awb-supernova-qualification-20261007/repair-validation/evidence/ctest-offline.log`.

## Supernova functional reservation

Started 2026-10-07T11:58:59.060988+00:00; owner thread `01a1159b-f0c7-7eb3-9442-f05f5812afd2`, PID82404. Silent private-bus churn, requested MOTU512/44.1kHz, SC64/128, threads1/2/4. Outputs `/private/tmp/awb-supernova-qualification-20261007/repair-validation/realtime`.

Supernova reservation ended 2026-10-07T11:59:03.352408+00:00: 0/4 configurations passed; cleanup succeeded. Requested device buffer remained512; no interface control-panel change. Evidence `/private/tmp/awb-supernova-qualification-20261007/repair-validation/realtime/summary.json`.

## Supernova functional reservation

Started 2026-10-07T11:59:50.756557+00:00; owner thread `01a1159b-f0c7-7eb3-9442-f05f5812afd2`, PID82459. Silent private-bus churn, requested MOTU512/44.1kHz, SC64/128, threads1/2/4. Outputs `/private/tmp/awb-supernova-qualification-20261007/repair-validation/realtime-retry`.

## Queued MOTU256 baseline repeat

The rack integration owner will wait for the Supernova functional lock to release, then claim it for one300-second rack-only repeat at44.1kHz/hardware256/SC128/FFT4096/two VST workers. Output: `/private/tmp/awb-motu256-baseline-repeat-20261007`. The first baseline overlapped the documented Supernova compilation and offline tests and is excluded from clean capacity conclusions. The loaded capture11:50:45–11:55:47UTC was after those jobs stopped, but its native logger filled during the last six seconds; its full physical-return capture failed251callbacks. Repeat probe capacity is200000rows with explicit coverage assertions. Restore512 and release the lock after cleanup.

Supernova reservation ended 2026-10-07T12:03:05.827151+00:00: 4/4 configurations passed; cleanup succeeded. Requested device buffer remained512; no interface control-panel change. Evidence `/private/tmp/awb-supernova-qualification-20261007/repair-validation/realtime-retry/summary.json`.

## Supernova repair qualification completed, 7 October 2026

C++ 34/34 cases; ordering 30/30, lockup/control 11/11, natural EOF 18/18; realtime 4/4 configurations passed. MOTU1248, 44100 Hz / hardware512, SC threads/block 1/64, 2/64, 4/64, 2/128. Four 45-second private-bus runs: 3006 churn cycles, 1202 DSP clock/value checks, 176 tree checks; all four populated-graph `/quit` shutdowns returned 0. Hardware buffer/sample rate confirmed unchanged, owned engines stopped, lock released.

One initial realtime oracle failure (incorrect expected ParGroup branch enumeration) is retained and corrected; no engine repair was added after offline qualification. The earlier overlap notice remains applicable to the prior rack capture; subsequent qualification ran in separate reservations. Protected 1474 files unchanged. No capacity, callback-deadline or physical-return claim. Exact configurations, source patch, failed/successful records and 280 verified archived hashes: `/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider/Testing/temp/supernova-repairs-20261007/qualification-summary.json`. Telegram tool unavailable.

## MOTU256 session outcome

Two scored five-minute runs completed. Initial rack-only capture:29.4%average/122.7%sampled peak,21native late callbacks and47return fault callbacks; excluded from clean capacity comparison because it overlapped the documented Supernova build/offline tests. Loaded capture11:50:45–11:55:47UTC:52.1%average/342.5%sampled peak, at least114native late callbacks and251return fault callbacks. Full physical return was reliable; native logger covered294.14seconds before its100000rows filled. The recorded loaded failure settles the decision to retain512.

The requested baseline repeat was cancelled during preparation after it acquired the released hardware. No scored repeat is counted. Its owned processes stopped, MOTU512/44.1kHz was restored and the rack lock was released. The private repeat probe increases audit capacity to200000rows and adds coverage assertions; a complete five-minute run of that revised probe has not been performed. The cancellation controller required manual cleanup; both its original error and completed manual restoration are retained in the session record.

See [the capacity report](awb52-cello-capacity.md#motu256-comparison-on-scsynth) and [retained evidence](awb52-cello-capacity-20261007/motu256/summary.json). Future long hardware256 tests must validate native coverage and handle controller cancellation without leaving child audio processes. No further test is currently queued by the rack workstream.

Combined-engine reservation: 2026-10-07T12:31:34.409900+00:00, stage setup, PID86442; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:31:38.461957+00:00, stage setup, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-setup.json`.

Combined-engine reservation: 2026-10-07T12:33:28.168916+00:00, stage build, PID86680; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:36:37.299877+00:00, stage build, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-build.json`.

Combined-engine reservation: 2026-10-07T12:37:21.457405+00:00, stage queries, PID87821; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:37:36.153736+00:00, stage queries, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-queries.json`.

Combined-engine reservation: 2026-10-07T12:38:39.770943+00:00, stage pinned-build, PID87979; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:39:17.042396+00:00, stage pinned-build, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-pinned-build.json`.

Combined-engine reservation: 2026-10-07T12:46:47.876660+00:00, stage revised-build, PID88885; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:47:24.071369+00:00, stage revised-build, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-revised-build.json`.

Combined-engine reservation: 2026-10-07T12:48:13.109606+00:00, stage revised-queries, PID89090; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:48:28.177701+00:00, stage revised-queries, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-revised-queries.json`.

Combined-engine reservation: 2026-10-07T12:49:29.757711+00:00, stage final-build, PID89184; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:50:04.690861+00:00, stage final-build, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-final-build.json`.

Unified-buffer reservation: 2026-10-07T12:51:16.410Z, phase build, PID89441; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T12:51:20.905Z, phase build, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-build.json`.

Unified-buffer reservation: 2026-10-07T12:51:44.105Z, phase units, PID89524; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T12:51:47.836Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Combined-engine reservation: 2026-10-07T12:51:51.192137+00:00, stage final-qualification, PID89551; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T12:54:01.184098+00:00, stage final-qualification, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-final-qualification.json`.

Unified-buffer reservation: 2026-10-07T12:54:56.626Z, phase lifecycle, PID89839; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T12:55:02.072Z, phase lifecycle, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-lifecycle.json`.

## Supernova functional reservation

Started 2026-10-07T12:55:10.169393+00:00; owner thread `01a1159b-f0c7-7eb3-9442-f05f5812afd2`, PID89864. Silent private-bus churn, requested MOTU512/44.1kHz, SC64/128, threads1/2/4. Outputs `/private/tmp/awb-combined-control-queries-20261007/realtime`.

Supernova reservation ended 2026-10-07T12:58:25.346645+00:00: 4/4 configurations passed; cleanup succeeded. Requested device buffer remained512; no interface control-panel change. Evidence `/private/tmp/awb-combined-control-queries-20261007/realtime/summary.json`.

Unified-buffer reservation: 2026-10-07T12:59:02.118Z, phase regression, PID90238; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T13:00:07.208Z, phase regression, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-regression.json`.

Combined-engine reservation: 2026-10-07T13:01:16.045873+00:00, stage archive, PID90454; output `/private/tmp/awb-combined-control-queries-20261007`.

Combined-engine reservation ended 2026-10-07T13:01:17.510984+00:00, stage archive, exit0, cleanup succeeded; evidence `/private/tmp/awb-combined-control-queries-20261007/evidence/stage-archive.json`.

Unified-buffer reservation: 2026-10-07T13:02:39.165Z, phase gui, PID90687; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T13:02:47.604Z, phase gui, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-gui.json`.

## Combined getMap/getLive and Supernova qualification completed, 7 October 2026

Isolated clean branch `codex/combined-control-query-supernova`, revision `2e198c5c10207c991190ba15714a95510af03c11` on upstream base `0b0dcfc06e55a4f58976a454b3c55a0e3a186bc8`. Both engines and matching headless sclang report 2e198c5. New queries append IDs 67–70, preserving existing 65/66. Updated getLive/getLiven contract: declared control rate only, mapped bus index or literal false; bus zero stays integer zero. Audio/initial-rate live queries are rejected; mapping queries remain available. Legacy get/getn handlers and stored-value behavior are unchanged.

Final gates: mapped-control C++ 5/5 (83 assertions); scsynth and Supernova each 24/24 integration cases including 29 language checks. Supernova C++ 34/34; offline 59/59 (ordering 30, lockup/control 11, natural EOF 18 without cleanup); realtime 4/4 at MOTU1248 / 44100 Hz / hardware512, threads/block 1/64, 2/64, 4/64, 2/128, 45 seconds each. Churn: 2939 cycles, 1221 DSP heartbeats, 176 tree checks, four populated-graph quit exits 0. Owned engines stopped, our lock released; hardware512/44100 confirmed unchanged. Another workstream's lock was respected before final validation and archival.

Installed engines and 1474 protected files unchanged; both input checkouts preserved. No capacity or physical-return claim. Exact binary paths, SHA256s, revision, source bundle/patch, retained porting conflict and test evidence: `/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider/Testing/temp/supernova-combined-control-queries-20261007/qualification-summary.json`. Patch reconstructs all 18 changed files; 333 archive hashes verified. Telegram unavailable.

Unified-buffer channel/backend reservation: 2026-10-07T13:26:38Z, PID92418; private muted tests/builds, no device changes; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`.


## Rack workstream live comparison design, 7 October 2026

The [capacity report](awb52-cello-capacity.md#supernova-live-comparison-suite--agreed-scope-7-october-2026) now holds the live Supernova/scsynth comparison design, pinned to combined revision2e198c5. Ten planned functional gates cover engine notifications, actual NodeManager/ToolInstance tracking and shell reconnects, modulation/plugin correctness, graph mutation,32destination transport, buffers, bounded failures and long-duration scheduling. NRT input-file rendering and shared RandID tests are excluded by the user. Performance follows those gates with a native scsynth reference, paired PortAudio controls, NovaT1/T2/T4, actual GUI/bridge and calibrated25-point additional DSP. The GUI boundary tracing backlog is retained.

Design only: no new harness implemented, no hardware/build reservation claimed, no tests launched and no installed engines or class-library files changed. Next implementation slice is the isolated F1–F3 controller/fixtures and EnvDetect3 Supernova prerequisite. Read the live lock before any builds or device tests; the other workstream reservation recorded above is not ours. Telegram/Vault tools are unavailable.

Unified-buffer channel/backend reservation ended 2026-10-07T14:02:42.184281Z; all owned test children exited, private UDP57971–57984 verified free, own lock released. Gates:83/83 Node cases,116/116 new SC engine checks,75/75 actual shared-waveform checks,128/128 retained stereo engine checks,17/17 actual GUI checks. No device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/channel-backend.md`. Guardian removed its lock then hit an old-Python marker-unlink API error; own marker removed and completion recorded manually. One first timed-out fixture left an unidentified named waveform allocation; no failed-run process/port remains, and no unrelated name was removed.

Live-library recovery reservation: 2026-10-07T14:15:50.095907+00:00, PID97504; installed sclang class compilation only, no server boot/device changes; output `/private/tmp/awb-combined-control-queries-20261007/live-compile-recovery`.

Live-library recovery reservation ended 2026-10-07T14:16:35.165529+00:00; installed class compilation failed; inspect retained log; owned interpreter exited, lock released, no server boot/device changes. Evidence `/private/tmp/awb-combined-control-queries-20261007/live-compile-recovery/result.json`.

Live-library recovery reservation: 2026-10-07T14:17:08.655207+00:00, PID97671; installed sclang class compilation only, no server boot/device changes; output `/private/tmp/awb-combined-control-queries-20261007/live-compile-recovery`.

Live-library recovery reservation ended 2026-10-07T14:17:11.607869+00:00; installed class compilation passed 6/6 core-class path checks; owned interpreter exited, lock released, no server boot/device changes. Evidence `/private/tmp/awb-combined-control-queries-20261007/live-compile-recovery/result.json`.

## Combined archive live-compilation failure corrected, 7 October 2026

This workstream caused the user's duplicate Node/AbstractGroup/Group/Synth/RootNode/ParGroup compile failure by archiving a real core Node.sc inside the recursively compiled AWB include root. The earlier existing-file hash checks missed this added file and did not establish live-library preservation. Installed files were unchanged, but live compilation was disrupted.

The archive snapshot is now `source/SCClassLibrary/Common/Control/Node.sc.txt`, byte-identical to the isolated revision. Archive generation makes .sc snapshots inert and rejects remaining .sc files; Testing/temp now has none. All333 earlier archived hashes were verified with the intentional filename change; updated manifest345 files verified.

Installed `/Applications/SuperCollider.app/Contents/MacOS/sclang` with unchanged normal sclang_conf.yaml, IDEscqt and private languageUDP57998 compiled1646 files in1.63seconds, no ERROR lines, six core-class paths passed, exit0. No audio server was booted or device settings changed; own interpreter exited and own reservation released. Installed interpreter/core Node.sc/config hashes unchanged. First CLI-mode probe timeout retained. Combined revision2e198c5c10207c991190ba15714a95510af03c11 and binaries unchanged. Evidence: `/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider/Testing/temp/supernova-combined-control-queries-20261007/live-compile-recovery/incident.json`. Telegram tool unavailable.

Unified-buffer reservation: 2026-10-07T14:21:38.328Z, phase network, PID98285; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:21:46.482Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:22:09.453Z, phase network, PID98385; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:22:19.491Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:22:45.180Z, phase network, PID98453; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:22:56.444Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:23:40.112Z, phase units, PID98563; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:23:43.662Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T14:24:27.976Z, phase channels, PID98677; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:24:40.490Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T14:27:01.996Z, phase network, PID98938; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:27:12.853Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:31:26.379Z, phase preview, PID99447; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:31:27.233Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer reservation: 2026-10-07T14:47:27.664Z, phase network, PID1113; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:47:39.253Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:48:31.362Z, phase network, PID1180; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:48:46.507Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:50:23.906Z, phase network, PID1405; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:50:40.559Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T14:51:28.455Z, phase units, PID1597; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:51:32.842Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer interactive audio reservation 2026-10-07T14:52:45.401Z, PID1746; user requested an audio-connected instrument. Private UDP57985/57986, HTTP50244, mono input selection, four mono buffers. Output initially muted; user can audition using Master. Stop audio on the panel or SIGTERM this controller to retire/release. No device settings or other processes changed.

Unified-buffer interactive audio ended 2026-10-07T14:57:26.033Z, PID1746; requested stop; own private ports free, no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/live-network-ended.json`.

Unified-buffer reservation: 2026-10-07T14:59:07.654Z, phase channels, PID2346; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:59:10.951Z, phase channels, exit1; channels exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T14:59:41.574Z, phase channels, PID2395; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T14:59:55.107Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T15:00:20.312Z, phase units, PID2458; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:00:24.341Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T15:00:40.738Z, phase network, PID2511; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:00:57.398Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer interactive audio reservation 2026-10-07T15:02:37.953Z, PID2726; user requested an audio-connected instrument. Private UDP57985/57986, HTTP50244, mono input selection, four mono buffers. Output initially muted; user can audition using Master. Stop audio on the panel or SIGTERM this controller to retire/release. No device settings or other processes changed.

Unified-buffer interactive audio ended 2026-10-07T15:19:48.249Z, PID2726; requested stop; own private ports free, no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/live-network-ended.json`.

Unified-buffer reservation: 2026-10-07T15:22:37.785Z, phase build, PID4005; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:22:44.606Z, phase build, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-build.json`.

Unified-buffer reservation: 2026-10-07T15:23:17.384Z, phase units, PID4120; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:23:22.359Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T15:23:47.955Z, phase channels, PID4185; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:24:02.228Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T15:25:12.273Z, phase network, PID4378; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:25:23.905Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T15:26:06.491Z, phase build, PID4483; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:26:12.810Z, phase build, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-build.json`.

Unified-buffer reservation: 2026-10-07T15:26:31.554Z, phase network, PID4616; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:26:48.472Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T15:27:09.529Z, phase units, PID4667; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:27:14.134Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T15:27:43.829Z, phase channels, PID4718; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:27:58.211Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T15:28:34.717Z, phase units, PID4826; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:28:38.520Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer interactive audio reservation 2026-10-07T15:30:09.094Z, PID5025; user requested an audio-connected instrument. Private UDP57985/57986, HTTP50244, mono input selection, four mono buffers. Output initially muted; user can audition using Master. Stop audio on the panel or SIGTERM this controller to retire/release. No device settings or other processes changed.

AWParam shared-control functional probe: 2026-10-07T15:37:08Z, PID5648; user explicitly authorized concurrent work alongside the non-sensitive interactive session. Its existing shared reservation is retained untouched. Isolated native addon/private silent engines, no requested device/buffer/rate changes. Not a clean performance/headroom measurement. Evidence `/private/tmp/awb-param-shm-probe-20261007`.

AWParam shared-control probe reservation ended 2026-10-07T15:37:54Z, PID5648; passed=True, protected files unchanged=True. Owned process groups stopped; no device settings requested/changed. Evidence `/private/tmp/awb-param-shm-probe-20261007/summary.json`.

Unified-buffer interactive audio ended 2026-10-07T15:40:07.853Z, PID5025; requested stop; own private ports free, no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/live-network-ended.json`.

Unified-buffer routing diagnostic reservation 2026-10-07T15:44:47.821440+00:00, PID6376; native kernel only, no engine/device.

Unified-buffer routing diagnostic ended 2026-10-07T15:44:48.838322+00:00; 6/6 native checks, no engine/device opened. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/feedback-routing-diagnostic.json`.

Unified-buffer reservation: 2026-10-07T15:51:11.367Z, phase build, PID7563; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:51:17.381Z, phase build, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-build.json`.

Unified-buffer reservation: 2026-10-07T15:51:24.360Z, phase units, PID7654; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:51:29.033Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T15:51:35.882Z, phase channels, PID7688; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:51:52.799Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T15:52:01.636Z, phase network, PID7718; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:52:24.065Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T15:53:26.032Z, phase network, PID7896; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:53:48.956Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T15:54:42.439Z, phase units, PID8069; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:54:46.055Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T15:55:23.855Z, phase network, PID8173; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:55:45.450Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T15:56:24.112Z, phase network, PID8276; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T15:56:46.757Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.


## AWB Supernova functional qualification reservation

Started 2026-10-07T16:05:55Z; owner thread `01a10182-c25b-77a3-a12b-2b5266ded6f7`, reservation keeper PID9442. User confirms no other tests; background work is allowed. Functionality only, no CPU/headroom claims. Isolated same-revision engines/plugins, private buses/ports, MOTU44100/hardware512. Boot/notify, real NodeManager/ToolInstance lifecycle, projection recovery, control/rack/plugin and scope compatibility gates. No production installation. Evidence `/private/tmp/awb-supernova-awb-functional-20261007-v1`; check live lock for ongoing ownership.

Unified-buffer user-authorised overlapping functional run: 2026-10-07T16:21:27.835Z, phase compile, PID13040; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer user-authorised functional run ended 2026-10-07T16:21:29.112Z, phase compile, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-compile.json`.

Unified-buffer user-authorised overlapping functional run: 2026-10-07T16:21:51.387Z, phase preview, PID13092; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer user-authorised functional run ended 2026-10-07T16:21:52.761Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer user-authorised overlapping functional run: 2026-10-07T16:22:00.897Z, phase units, PID13112; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer user-authorised functional run ended 2026-10-07T16:22:04.732Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer user-authorised overlapping functional run: 2026-10-07T16:22:12.674Z, phase channels, PID13217; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer user-authorised functional run ended 2026-10-07T16:22:34.247Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer user-authorised overlapping functional run: 2026-10-07T16:22:55.934Z, phase network, PID13398; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer user-authorised functional run ended 2026-10-07T16:23:26.273Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer shared functional interactive declaration 2026-10-07T16:53:56.897Z, PID18751; user requested an audio-connected instrument. Private UDP57985/57986, HTTP50244, mono input selection duplicated to four stereo buffers. UseMode shared-functional; device current SC/MOTU1248 at44100/512 unchanged; hardware output0/1 initially muted; expected load modest four-cell DSP plus20Hz GUI/waveform, unmeasured. User can audition using Master. Stop audio on the panel or SIGTERM this controller to retire/release. No device settings or other processes changed.


## AWB Supernova functional session completed

Completed 2026-10-07T16:56:07.813998+00:00. Own keeperPID9442 released after owned engines/language/receivers stopped; MOTU readback44.1kHz/512. No CPU/headroom measurement and no installed runtime changes. Native Supernova rack and scopes passed8channels×24/32destinations including engine control readback; scsynth full13plugin set passed119readbacks at each size. Supernova blockers: notify-off acknowledgement, maxLogins/client-ID reuse, macOS convolution preparation. [Functional report and retained evidence](supernova-awb-functional-20261007.md). Shared functional engine use is permitted as declared in the concurrency policy; no active reservation from this workstream. Telegram notifier unavailable.

Unified-buffer interactive audio ended 2026-10-07T17:09:21.040Z, PID18751; requested stop; own private ports free, no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/live-network-ended.json`.

Unified-buffer reservation: 2026-10-07T17:10:29.311Z, phase build, PID20750; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:10:36.820Z, phase build, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-build.json`.

Unified-buffer reservation: 2026-10-07T17:10:58.734Z, phase units, PID20895; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:11:03.804Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T17:11:09.458Z, phase preview, PID20941; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:11:10.673Z, phase preview, exit1; preview exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer reservation: 2026-10-07T17:11:26.762Z, phase channels, PID20962; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:11:48.538Z, phase channels, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-channels.json`.

Unified-buffer reservation: 2026-10-07T17:11:56.539Z, phase preview, PID21011; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:11:58.113Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer reservation: 2026-10-07T17:12:16.998Z, phase network, PID21039; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:12:27.656Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T17:13:17.547Z, phase network, PID21116; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:13:27.749Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T17:14:33.738Z, phase network, PID21202; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:14:45.004Z, phase network, exit1; network exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer reservation: 2026-10-07T17:15:09.072Z, phase units, PID21258; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:15:13.134Z, phase units, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-units.json`.

Unified-buffer reservation: 2026-10-07T17:15:16.656Z, phase network, PID21305; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:15:52.658Z, phase network, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-network.json`.

Unified-buffer shared functional interactive declaration 2026-10-07T17:16:32.258Z, PID21454; user requested an audio-connected instrument. Private UDP57985/57986, HTTP50244, mono input selection duplicated to four stereo buffers. UseMode shared-functional; device current SC/MOTU1248 at44100/512 unchanged; hardware output0/1 initially muted; expected load modest four-cell DSP plus20Hz GUI/waveform, unmeasured. User can audition using Master. Stop audio on the panel or SIGTERM this controller to retire/release. No device settings or other processes changed.

Unified-buffer reservation: 2026-10-07T17:21:36.092Z, phase preview, PID22043; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:21:37.788Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer interactive UI revision 2026-10-07T17:25:14.682237+00:00, existing guardian PID21454; same private engine/ports/device and muted Master.2048 waveform bins/channel (4x prior),20Hz publication with bounded visible-span HTTP feed; animation-frame display for active view only, maximum4stereo canvases. Shared functional use; load unmeasured, no capacity/performance claim. Test hosts/leases retired; user audition intentionally remains active.

Unified-buffer reservation: 2026-10-07T17:55:09.621Z, phase preview, PID27299; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:55:12.348Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer reservation: 2026-10-07T17:59:36.548Z, phase views, PID27920; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T17:59:43.152Z, phase views, exit1; views exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T18:01:03.604Z, phase views, PID28062; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T18:01:09.863Z, phase views, exit1; views exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T18:03:24.140Z, phase views, PID28338; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T18:03:28.395Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T18:05:06.840Z, phase views, PID28822; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T18:05:11.266Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T18:06:46.721Z, phase preview, PID29039; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T18:06:48.614Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Unified-buffer reservation: 2026-10-07T18:09:01.882Z, phase views, PID29160; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T18:09:07.112Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T18:09:17.915Z, phase preview, PID29208; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T18:09:19.910Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Composite delay integration functional declaration 2026-10-07T19:07:09.435773+00:00: private language PID 35676, UDP57975/57976, existing hardware/rate unchanged, output muted, nine-channel/24-destination routing and four stereo cells. Shared functional use; no capacity claim or exclusivity. Existing preview PID21454/engine21467 is left intact. Evidence `/private/tmp/awb-live-delay-audio`.

Unified-buffer reservation: 2026-10-07T19:18:57.315Z, phase views, PID36986; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T19:19:04.017Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T19:20:53.299Z, phase views, PID37227; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T19:20:55.271Z, phase views, exit1; views exited 1; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T19:21:30.751Z, phase views, PID37283; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T19:21:37.121Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T19:22:15.965Z, phase preview, PID37379; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T19:22:18.077Z, phase preview, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-preview.json`.

Composite delay integration functional reservation ended 2026-10-07T20:23:00.225079+00:00: PASS, 26 SC/audio assertions, 11 bridge checks, 8 real Electron checks, 23 focused Node tests and 15 SC contracts. Owned UDP57975/57976 fixture processes exited; preview PID21454/engine21467 preserved. Implementation 454bac4 on integration/bw-sc; shared native delay plugin and live/rack bundles rebuilt; 11 post-merge Node tests passed. No hardware/rate/buffer change or performance claim. Evidence apps/live-set/docs/shared-host-verification and docs/shared-host-audio.md.

Unified-buffer reservation: 2026-10-07T20:25:09.842Z, phase views, PID42121; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T20:25:18.266Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Unified-buffer reservation: 2026-10-07T20:26:20.596Z, phase views, PID42239; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T20:26:29.171Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Composite quick-load exclusive reservation 2026-10-07T20:27:39.459329+00:00, PID42355: preparing 30s audio-only/30s live GUI comparison; please defer further engine tests, builds and heavy background work until this lock ends. Existing preview awaiting user stop approval. No hardware/rate/buffer changes planned. Output /private/tmp/awb-live-quick-load.

Unified-buffer interactive audio ended 2026-10-07T20:30:19.048Z, PID21454; requested stop; own private ports free, no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/live-network-ended.json`.

Composite quick-load reservation ended 2026-10-07T20:37:12.364621+00:00, PID42355.

Unified-buffer reservation: 2026-10-07T20:37:56.457Z, phase views, PID43327; output `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification`; private verification, no device changes.

Unified-buffer reservation ended 2026-10-07T20:38:01.892Z, phase views, exit0; passed; owned private ports free; no device changes. Evidence `/Users/willy/.codex/worktrees/unified-buffer-first-pass/SuperCollider/prototypes/unified-buffer-tool/verification/reserved-views.json`.

Composite paired load completed: 150s audio-only (35.8% average/135.8% sampled peak, 16 engine/28 return discontinuity callbacks), 150s GUI+native scopes (37.4%/80.1%, zero engine/return faults). Calibration and recorder reliable; 13 plugins checked before/after, no OSC/browser failures. All owned processes exited and lock released; user-authorized preview stop remains stopped. This was a short sequential run, no calibrated reserve; early faults need warmed/reversed confirmation. Evidence apps/live-set/docs/paired-load-20261007/summary.json and /private/tmp/awb-live-paired-load-5min.

Audio-only pause/resume quiet reservation 2026-10-07T20:48:54.198621+00:00, PID44808: user says machine clear; existing57110 engine stopped. 90s warmup, baseline, individual FX/delay pauses and restored baseline, roughly7min. No GUI or scope readers; no rate/buffer changes. Please defer engine tests, builds and other heavy work until this lock ends. Output /private/tmp/awb-audio-pause-load.

Audio-only pause/resume reservation ended 2026-10-07T20:58:17.408679+00:00, PID44808.

Full GUI/reserve quiet reservation 2026-10-07T21:03:16.390962+00:00, PID46408: user says machine clear; existing57110 engine stopped. 90s GUI warmup, baseline, calibrated25% extra DSP, 5min loaded capture and restored baseline. Full GUI and scope readers; no rate/buffer changes. Please defer engine tests, builds and other heavy work until this lock ends. Output /private/tmp/awb-full-gui-reserve-load.

Full GUI/reserve reservation ended 2026-10-07T21:20:09.153297+00:00, PID46408.

Earth5/Echo20 full GUI/reserve quiet reservation 2026-10-07T21:27:27.590992+00:00, PID48422: user requested repeat. 90s GUI warmup, 90s baseline, calibrated25% extra DSP, 300s loaded, 30s restored. Please defer engine tests/builds/heavy work until this lock ends. Output /private/tmp/awb-earth5-echo20-load.

Earth5/Echo20 GUI/reserve reservation ended 2026-10-07T21:41:15.175221+00:00, PID48422, exit 0.

Convolution editor functional reservation 2026-10-07T21:43:57.212485+00:00, PID49675: silent hardware graph; test stereo shaping, live IR swap/tail cleanup, dynamic clone and native GUI. No performance claim.

Convolution editor functional reservation ended 2026-10-07T21:44:13.170924+00:00, exit 1.

Convolution editor functional reservation 2026-10-07T21:47:49.635611+00:00, PID50059: silent hardware graph; test stereo shaping, live IR swap/tail cleanup, dynamic clone and native GUI. No performance claim.

Convolution editor functional reservation ended 2026-10-07T21:48:03.271221+00:00, exit 1.

Convolution editor functional reservation 2026-10-07T21:48:37.202409+00:00, PID50139: silent hardware graph; test stereo shaping, live IR swap/tail cleanup, dynamic clone and native GUI. No performance claim.

Convolution editor functional reservation ended 2026-10-07T21:48:58.237767+00:00, exit 1.

Convolution editor functional reservation 2026-10-07T21:49:14.421453+00:00, PID50258: silent hardware graph; test stereo shaping, live IR swap/tail cleanup, dynamic clone and native GUI. No performance claim.

Convolution editor functional reservation ended 2026-10-07T21:49:37.021640+00:00, exit 0.

Earth5/Echo20 SC256 display-awake GUI/reserve quiet reservation 2026-10-07T21:49:53.988778+00:00, PID50322: user requested repeat. 90s GUI warmup, 90s baseline, calibrated25% extra DSP, 300s loaded, 30s restored. Please defer engine tests/builds/heavy work until this lock ends. Output /private/tmp/awb-earth5-echo20-sc256-awake.

Earth5/Echo20 GUI/reserve reservation ended 2026-10-07T22:02:10.882483+00:00, PID50322, exit 0.

Earth5/Echo20 SC256 display-awake GUI/reserve quiet reservation 2026-10-07T22:02:38.619674+00:00, PID51238: user requested repeat. 90s GUI warmup, 90s baseline, 35pp live calibration, 300s loaded, conditional45pp calibration and300s loaded, 30s restored. Please defer engine tests/builds/heavy work until this lock ends. Output /private/tmp/awb-earth5-echo20-sc256-reserve-ladder.

Earth5/Echo20 GUI/reserve reservation ended 2026-10-07T22:14:54.745136+00:00, PID51238, exit 0.

Earth5/Echo20 SC256 display-awake GUI/reserve quiet reservation 2026-10-07T22:15:36.411376+00:00, PID52115: user requested repeat. 90s GUI warmup, 90s baseline, calibrated30pp extra DSP, 300s loaded, 30s restored. Please defer engine tests/builds/heavy work until this lock ends. Output /private/tmp/awb-earth5-echo20-sc256-reserve30.

Earth5/Echo20 GUI/reserve reservation ended 2026-10-07T22:27:52.334507+00:00, PID52115, exit 0.

Delay AWParam module-GUI shared functional declaration 2026-10-07T23:11:24.648396+00:00: controller 58572; bounded private sclang/scsynth UDP57975/57976, SC128/44.1kHz, muted hardware output, no device/rate/buffer changes. Checks actual head base/modulation audio, module shared GUI and reader lifecycle. The audition engine remains stopped; no other engine is touched. No performance claim. Evidence /private/tmp/awb-live-delay-audio and /private/tmp/awb-delay-param-gui.

Delay AWParam module-GUI functional check ended 2026-10-07T23:13:14.579694+00:00: PASS,30 SC/audio assertions,11 Node audio-bridge checks,9 real Electron GUI checks,19 non-audio GUI checks and14 focused Node tests. Private engine exited0 and owned UDP57975/57976 are free. Audition remains stopped; no device settings changed. No performance claim.
