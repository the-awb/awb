// Owned test server only. Quiet -50 dBFS pilot on outputs 0/1; load stays private.
(
var server=Server.default, pilotBus=("AWB_PILOT_BUS".getenv ? "0").asInteger;
if(pilotBus > 0) { server.options.numOutputBusChannels = 10; };
server.waitForBoot({Routine({var tone;
 SynthDef(\awbDropoutSources, {
  Out.ar(32,SinOsc.ar(Array.series(16,113.37,55.4))*SinOsc.kr(Array.series(16,0.63,0.031)).range(0.06,0.2));
  Out.kr(32,SinOsc.kr(Array.series(16,1.3,0.57))*0.9);
 }).send(server);
 SynthDef(\awbDropoutTone,{|gain=1,phase=0| Out.ar(pilotBus,SinOsc.ar([997,733],phase)*0.00316227766*gain)}).send(server);
 SynthDef(\awbDropoutLoad,{|bus=96|var x=SinOsc.ar(Array.series(32,103,41.7));x=RLPF.ar(x,Array.series(32,401,137.9),0.3);Out.ar(bus,Mix((x*3).tanh)*0.00001)}).send(server);
 server.sync;Synth(\awbDropoutSources);tone=Synth(\awbDropoutTone);server.sync;
 File.use("METER_COST_SESSION".getenv,"w",{|f| f.write("{\"port\":"++server.addr.port++",\"sampleRate\":"++server.sampleRate++",\"blockSize\":"++server.options.blockSize++",\"scPID\":"++server.pid++",\"toneNode\":"++tone.nodeID++"}")});
}).play});
)
