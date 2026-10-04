// Build-time only: this process never boots an audio server.
(
SynthDef(\awbSharedLoopV1, { |bufnum, sharedId, record=0, play=1,
    overdub=0, clear=0, feedback=1, inputGain=1, outputGain=0.25,
    source=0, frequency=220, toneLevel=0.25|
    var tone = SinOsc.ar(frequency) * toneLevel;
    var input = Select.ar(source, [tone, SoundIn.ar(0)]);
    var loop = SharedLooper.ar(input, bufnum, sharedId, record, play,
        overdub, clear, feedback, inputGain, outputGain);
    Out.ar(0, loop ! 2);
}).writeDefFile("LOOP_DEF_DIRECTORY".getenv);
SynthDef(\awbSharedLoopScopesV1, { |micScope, outScope, controlScope, controlBus|
    var mic = SoundIn.ar(0), output = In.ar(0, 2);
    // Exact, bounded integer counters travel in a private final scope channel.
    var audioClock = Phasor.ar(0, 1, 0, 4194304);
    var controlClock = Phasor.kr(0, 1, 0, 4194304);
    Out.kr(controlBus, [SinOsc.kr(1), SinOsc.kr(10)] ++ LFNoise0.kr([1, 5, 20, 100]));
    ScopeOut2.ar([mic, audioClock], micScope, 2048, 1024);
    ScopeOut2.ar(output ++ [audioClock], outScope, 2048, 1024);
    ScopeOut2.kr(In.kr(controlBus, 6) ++ [controlClock], controlScope, 256, 32);
}).writeDefFile("LOOP_DEF_DIRECTORY".getenv);
// Hosted v2 uses shell signal observers; this synth only owns the demonstration controls.
SynthDef(\awbSharedLoopControlsV2, { |controlBus|
    Out.kr(controlBus, [SinOsc.kr(1), SinOsc.kr(10)] ++ LFNoise0.kr([1, 5, 20, 100]));
}).writeDefFile("LOOP_DEF_DIRECTORY".getenv);
thisProcess.interpreter.executeFile(thisProcess.nowExecutingPath.dirname.dirname +/+ "tests/build-scope-probes.scd");
0.exit;
)
