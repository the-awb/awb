// Compiled test fixtures only; never instantiated by the instrument runtime.
(
SynthDef(\awbScopeMicProbeV1, {
    ReplaceOut.ar(NumOutputBuses.ir, SinOsc.ar(777) * 0.08);
}).writeDefFile("LOOP_DEF_DIRECTORY".getenv);
SynthDef(\awbScopeOutputProbeV1, {
    Out.ar(0, [SinOsc.ar(333) * 0.004, SinOsc.ar(555) * 0.002]);
}).writeDefFile("LOOP_DEF_DIRECTORY".getenv);
)
