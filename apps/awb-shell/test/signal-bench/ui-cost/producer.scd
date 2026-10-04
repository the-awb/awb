// Private mono audio plus six control signals; no device/rate override and no hardware output.
(
var s = Server.default;
s.waitForBoot({Routine({
 SynthDef(\awbOneLinePrivate, {Out.ar(32, SinOsc.ar(113.37) * SinOsc.kr(1.37).range(0.03, 0.1)); Out.kr(32, [SinOsc.kr(1), SinOsc.kr(10), LFNoise0.kr(1), LFNoise0.kr(5), LFNoise0.kr(20), LFNoise0.kr(100)])}).send(s);
 s.sync; Synth(\awbOneLinePrivate); s.sync;
 File.use("UI_COST_SESSION".getenv, "w", {|f| f.write("{\"port\":" ++ s.addr.port ++ ",\"sampleRate\":" ++ s.sampleRate ++ ",\"blockSize\":" ++ s.options.blockSize ++ ",\"scPID\":" ++ s.pid ++ "}")});
}).play});
)
