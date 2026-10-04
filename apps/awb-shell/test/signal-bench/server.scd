// Isolated measurement host; synthetic sources use private buses, never hardware output.
(
var root = "BENCH_ROOT".getenv, serverPort = "BENCH_PORT".getenv.asInteger;
var s = Server(\signalBench, NetAddr("127.0.0.1", serverPort));
Server.default = s;
Server.program = "exec " ++ (Platform.resourceDir +/+ "scsynth").shellQuote;
s.options.ugenPluginsPath = (Platform.resourceDir +/+ "plugins") ++ ":" ++ (root +/+ "tool-artifacts/shared-loop/0.1.0/build");
s.options.loadDefs = false; s.options.zeroConf = false;
AWBHostControl.start(\whenNeeded, \headless, "BENCH_TOKEN".getenv);
thisProcess.interpreter.executeFile(root +/+ "apps/awb-shell/sc/AWBScBusAudio.scd");
thisProcess.interpreter.executeFile(root +/+ "tool-artifacts/shared-loop/0.1.0/sc/host.scd");
s.waitForBoot({Routine({
 var controls = Bus.control(s, 6);
 SynthDef(\awbSignalBenchAudio, {Out.ar(32, SinOsc.ar([110,220,330,440,550,660]) * [0.1,0.12,0.14,0.16,0.18,0.20])}).send(s);
 SynthDef(\awbSignalBenchControl, { |bus| Out.kr(bus, [SinOsc.kr(1),SinOsc.kr(10)] ++ LFNoise0.kr([1,5,20,100]))}).send(s);
 s.sync;
 Synth(\awbSignalBenchAudio); Synth(\awbSignalBenchControl,[\bus,controls.index]); s.sync;
 File.use("BENCH_SESSION".getenv,"w",{|f| f.write("{\"port\":" ++ serverPort ++ ",\"sampleRate\":" ++ s.sampleRate ++ ",\"blockSize\":" ++ s.options.blockSize ++ ",\"scPID\":" ++ s.pid ++ ",\"controlBus\":" ++ controls.index ++ "}")});
}).play},100,{1.exit});
ServerQuit.add({0.exit},s);
)
