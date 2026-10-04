# Loopback setup and interrupted attempts

The return is SC output bus 2 -> MOTU mixer input 12 -> Mix Post FX 12 -> SC input bus 6 (zero-based). No interface routing was changed. The pilot is 997 Hz, approximately -50 dBFS.

- `smoke`: fixture incorrectly exposed only two outputs; source-audit validation failed. Excluded.
- `smoke2`: ten-output-channel fixture validated the returned tone, injected mute and phase jumps; three short phases completed.
- `sweep`: eight phases completed, then an inappropriate CPU-range assertion stopped a fixed-graph step. Excluded from load-ceiling conclusions.
- `sweep2`: 21 phases completed before the exclusive-SC guard found another SC process, PID 86244. Incomplete; not evidence of a completed or isolated maximum-load sweep.

The V1 recorder directly copied into a prefaulted file mapping from its audio callback. A low-load stopped-capture/focus phase included an 11.805 ms recorder callback and an input timestamp gap. That phase cannot establish an output failure: the recorder itself could have missed input data. The recorder is being changed to a locked memory queue with a separate writer.

In a 36-node focus phase (~54.85% mean SC load), the return has two discontinuities without input timestamp gaps. Both occur ~0.1876 ms after the corresponding SC output host timestamp; the SC callbacks completed late. This is useful detector evidence, but the other SC process discovered at the next phase boundary prevents treating this partial run as a clean load-ceiling determination.

`events.json` maps discontinuities to callback timing and audio snippets. Original snippets preserve the quiet recorded level; `-boosted.wav` versions multiply it by 100 (40 dB) for inspection. These snippets are not normal listening-level calibration. The compressed `.input` files preserve the used header, callback metadata and mono Float32 recording. Full binary field layout is in the recorder source. `.audit` files preserve the sender callback audit. Calibration and injected faults are outside measurement phases.
