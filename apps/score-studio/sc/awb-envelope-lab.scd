// A deliberately explicit editable-envelope contract for the Score Studio instrument rack.
// Four stages are allocated in the control array; the Env header's stage count selects how many
// are active. gate defaults to zero so clients can install the array before beginning playback.
SynthDef(\awbEnvelopeLab, {
    var envelope, shaped, signal;
    // The zero-time stage reserves a fourth segment in the compiled control surface. EnvGen uses
    // the array header's stage count, so shorter envelopes can safely leave that tail inactive.
    var defaultEnvelope = Env(
        [0, 1, 0.65, 0.65, 0], [0.08, 0.2, 0, 0.5], \sin,
        releaseNode: 3
    ).asArray;
    var out = \out.kr(0);
    var gate = \gate.kr(0);
    var freq = \freq.kr(220, spec: ControlSpec(20, 20000, \exp, 0, 220, " Hz"));
    var amp = \amp.kr(0.1, spec: ControlSpec(0, 0.5, \amp, 0, 0.1));

    envelope = \env.kr(defaultEnvelope);
    shaped = EnvGen.kr(envelope, gate, doneAction: Done.freeSelf);
    signal = SinOsc.ar(freq) * shaped * amp;
    Out.ar(out, signal ! 2);
}).add;
