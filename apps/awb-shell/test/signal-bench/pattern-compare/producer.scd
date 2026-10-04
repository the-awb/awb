// Private mono signal only; no audio device options and no hardware output.
(
var s = Server.default;
s.waitForBoot({Routine({
 SynthDef(\awbOneLinePrivate, {Out.ar(32, SinOsc.ar([113.37, 170.03]) * SinOsc.kr(1.37).range(0.03, 0.1))}).send(s);
 s.sync; Synth(\awbOneLinePrivate); s.sync;
 File.use("ONE_LINE_SESSION".getenv, "w", {|f| f.write("{\"port\":" ++ s.addr.port ++ ",\"sampleRate\":" ++ s.sampleRate ++ ",\"blockSize\":" ++ s.options.blockSize ++ ",\"scPID\":" ++ s.pid ++ "}")});
}).play});
)
