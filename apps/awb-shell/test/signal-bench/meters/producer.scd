// All sources are private. No interface/rate changes or hardware output writes.
(
var server=Server.default;
server.waitForBoot({Routine({
 SynthDef(\awbMeterPrivate, {
  Out.ar(32,SinOsc.ar(Array.series(16,113.37,55.4))*SinOsc.kr(Array.series(16,0.63,0.031)).range(0.06,0.2));
  Out.kr(32,SinOsc.kr(Array.series(16,1.3,0.57))*0.9);
 }).send(server);server.sync;Synth(\awbMeterPrivate);server.sync;
 File.use("METER_COST_SESSION".getenv,"w",{|f| f.write("{\"port\":"++server.addr.port++",\"sampleRate\":"++server.sampleRate++",\"blockSize\":"++server.options.blockSize++",\"scPID\":"++server.pid++"}")});
}).play});
)
