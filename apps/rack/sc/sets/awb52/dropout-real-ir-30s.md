# AWB 5.2 actual-IR FX rack — dropout capture, 5 October 2026

Three 60-second steady captures are clean on both SC output and the MOTU return:
zero missed deadlines, skipped output intervals, pilot discontinuities, silent
callbacks or recorder loss. **One startup overrun occurred during plugin loading,
before the input voices were created.** The steady DSP peaks are real processing
peaks, separate from that loading fault.

## Workload and detector

MOTU 1248, observed 44,100 Hz / 512 hardware frames (11.610 ms per callback),
64-frame SC blocks, three input / four output channels, 256 MiB real-time pool.
Two persistent channels (mono VC duplicated to stereo, stereo Pro 2) feed every
active destination at unity using synthetic sine/noise input. Verb, Deci, Spark,
Fuzz and explicit Mast use nine VST instances and six PartConv processors; all
parallel branches are active and wet mixes are 100%. Actual IR lengths are
10.5 / 21.8182 / 30 s. Three dynamic FX and three follower pipes are reserved,
without active processors. FFT size is 2048.

The GUI is closed and there is no bridge motion or added synthetic stress-node
load. This is the current rough SC prototype, including its native Fuzz stand-in;
UM, input Scheps, selector/modulation fidelity and original Bitwig IR processing
are still outside it. Sources are synthetic, not the instruments' physical ADC
signals. The graph has 22 synths / 333 UGens including the continuity pilot and
one final FX-output clearing synth. The native Rack Tool graph is otherwise used
without output-validator changes or installation into live class paths.

A quiet -50 dBFS 997 Hz pilot goes from SC output 2 to MOTU input 6 (zero-based).
The FX master writes to hardware channels 0/1 and a final `ReplaceOut` clears those
channels after the full graph computes. Thus the detector observes uninterrupted
pilot audio and engine deadlines, not the FX waveform or effect fidelity. Output
is audited inside the owned SC callback, and the MOTU return is independently
captured with the v2 locked-ring recorder. Return recording reports zero dropped
buffers and no recorder deadline misses. Callback timing includes the synchronous
work inside the SC audio callback; it is not total machine CPU.

The idle pilot was clean. An injected 80 ms mute and two phase changes were
detected on both SC output and the return before loading the rack. Residual
threshold is 1e-5; silence detection requires 32 near-zero samples. Both detectors
therefore have a demonstrated response to a fault. All three steady captures
have rate/buffer change counts of zero and validated property listeners.

## Steady results

| Minute | Mean SC DSP | Reported SC peak | Longest callback DSP | Longest callback, seconds into minute | Faults on output / return |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 45.75% | 84.67% | 9.840 ms | 40.98 s | 0 |
| 2 | 45.37% | 84.46% | 9.814 ms | 22.47 s | 0 |
| 3 | 46.14% | 82.13% | 9.543 ms | 21.45 s | 0 |

The callbacks use 84.76%, 84.53% and 82.19% of their hardware periods at those
observed maxima. Peak callbacks occurred at 15:14:57.237, 15:15:39.868 and
15:16:40.029 BST respectively. The status display reported the corresponding
peak values about 76 / 226 / 134 ms later. These peaks are **normal processing**:
no nodes, plugins or buffers were created during the three steady capture windows.
No missed deadlines or output gaps occurred during the full 193.63 s after the
voices became ready, including warmup and the intervals between captures.

SC average/peak percentages are DSP timing figures, not overall system CPU usage.
This is three short windows from one boot, not proof of indefinite reliability
or an available budget for more instruments, GUI work or dynamic loading.

## Startup fault and peak timing

The measured phase timestamps distinguish startup work:

| Stage | Duration | Longest SC callback | Missed deadlines |
| --- | ---: | ---: | ---: |
| Rack allocation | 38 ms | 0.029 ms | 0 |
| IR reads and spectral preparation | 362 ms | 0.117 ms | 0 |
| SynthDef construction and synchronization | 35 ms | 0.059 ms | 0 |
| FX node creation / asynchronous plugin loading | 2.759 s | **20.347 ms** | **1** |
| Source creation | 67 ms | 5.597 ms | 0 |
| Warmup | 10.090 s | 9.044 ms | 0 |

The overrun occurs 1.470 s after the rack load request, while plugins are opening,
about 1.8 s before the input voices are ready. It consumes **175.25%** of the
11.610 ms hardware period and finishes 8.715 ms past its scheduled output time.
The next output callback skips 1,024 frames (two hardware periods, 23.22 ms), and
CoreAudio reports one overload. The return has three discontinuity callbacks
clustered around this episode, with no long silent run and no recorder loss.
The generated output samples remain sinusoidal: this does **not** mean SC was
on time, since skipped output slots cannot be detected by examining only the
samples SC did produce. The return fault coincides with a recorded SC deadline
failure; it cannot be dismissed as a return-only recording artefact.

The most recent fine-grained marker was `plugin open shimmer`, but several plugins
were opening asynchronously. That marker is not proof that Shimmer caused the
stall. This test locates the fault in startup/plugin loading; it does not identify
the allocation, UGen, plugin or scheduler path inside the 20 ms callback. A stack
trace/profile or isolated plugin-loading repeat would be needed for that attribution.
No corresponding deadline fault occurred during the earlier IR preparation.

For this static set, complete plugin preparation before performance. If dynamic
slots must load previously unopened plugins while other channels are sounding,
measure that boundary explicitly: readiness/onset gating alone does not guarantee
that opening the plugin cannot stall the existing audio callback.

## Evidence and reproduction

[`dropout-real-ir-30s.json`](dropout-real-ir-30s.json) retains timestamped CPU
samples, stage markers, native callback events, recorder reliability, calibration,
source/IR hashes and normal shutdown confirmation. Compact logs, the exact measured
SC fixture, instrumented private class, analysis and manifest are in
[`evidence-dropout-real-ir-30s`](evidence-dropout-real-ir-30s/manifest.json).
Raw callback and return-PCM files remain at `/private/tmp/awb52-dropout-realir30-20261005-e`; they are not committed.
Source classes and original IR hashes were unchanged at completion. All owned
SC/language/recorder processes exited. The live class configuration was unchanged.
Known unused SCMIR cached SynthDef warnings and the existing invalid FL Studio
VST cache entry appear in the log; the selected nine-plugin graph reached readiness.
No general shell test suite, live-ADC test, GUI/bridge test or plugin equivalence
claim is made by this run.

The reusable harness takes a fresh output directory, copies classes privately,
instruments phase markers only in that private copy, and builds its own audited
engine/recorder helpers:

```sh
/Users/willy/.nvm/versions/node/v22.23.2/bin/node \
  /Users/willy/awb/apps/rack/sc/sets/awb52/dropout-run.mjs \
  --run --quiet-window --seconds=60 --repeats=3 \
  --output=/private/tmp/awb52-DROPOUT-FRESH
```

The machine must already be at 44.1 kHz with the same physical output2/input6
return connection. The harness rejects another Bitwig/SC engine, validates the
pilot first and never stops unrelated processes. After this capture, only the
fixture's setup-error cleanup and adjacent-file default were improved; SC syntax
and Node syntax were checked without repeating the hardware run. Earlier rejected
fixture attempts never reached the loaded rack and are not included in results.
