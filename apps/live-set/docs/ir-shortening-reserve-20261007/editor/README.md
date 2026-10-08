# Convolution envelope/gain editor verification

Entry after recompiling the class library and reopening the file-IR set with Verb profiles:

```supercollider
~awb52.convolutionGUI;
```

Native Qt first pass: waveform of the actual crop; draggable normalized envelope; curve; dB gain; explicit Apply; Save settings. Settings are computed from the original IR, never compounded. Apply swaps PartConv processors in their existing branch groups; stops feeding the previous IR; retains its complete tail; then frees old processors/spectra. Dynamic Verb clones receive current spectra. Existing plugin instances and fixed buses remain. The editor adds no observation loop. Closing the set closes the window. The editor window was closed during scored performance tests.

14 shaping checks, 16 live checks, and 5 language-only Buffer ownership checks passed. Live checks exercised real audio privately, an Earth IR replacement, old-tail/spectra cleanup, new dynamic Verb creation, waveform/envelope bounds, saved settings reload and actual native window capture. Original IR files stayed untouched. Apply during a stressed performance window was not dropout-qualified.

A real NodeManager bug was fixed: generic player polling interpreted Buffer's inherited `Object.isPlaying = false` as completion and discarded ownership. Buffers now have explicit owner-controlled lifetime; their owners free/disown them, or terminate them on close. Raw IR preparation inputs are owned until freed, including early-close cleanup. This fix is in the parent SC repository. `31_buffer_ownership.scd` is registered in its live unit runner. The rest of that runner was not rerun.

Existing first-pass contract/audio/modulation checks totaled 234 PASS before editor support was added; they are not claimed as a post-editor full-suite run.
