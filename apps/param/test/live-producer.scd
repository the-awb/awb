(
var server,core,view,count="AWB_PARAM_COUNT".getenv.asInteger,replies=0,replyObserver;
server=Server(\paramLiveTest,NetAddr("127.0.0.1","AWB_PARAM_SERVER_PORT".getenv.asInteger));
server.options.numInputBusChannels=0;server.options.numOutputBusChannels=2;server.options.numControlBusChannels=4096;server.options.memSize=65536;server.options.loadDefs=false;
Server.program="AWB_PARAM_ENGINE".getenv;
server.waitForBoot({Routine({try{
 SynthDef(\paramTestLFO,{|out=0,rate=0.7|Out.kr(out,SinOsc.kr(rate,0,0.5))}).add;
 SynthDef(\paramTestWriter,{|out=0|Out.kr(out,LFNoise1.kr(2)*0.1)}).add;
 server.sync;
 core=AWBCoreTool.open((params:count.collect{|i|if(i==0){(id:\p0,base:0.25,amount:0.2)}{(id:("p"++i).asSymbol,min:if(i.even){0}{100},max:if(i.even){1}{10000},warp:if(i.even){\lin}{\exp},base:if(i.even){0.25}{316.227766},amount:0.2)}}),(server:server,track:false));
 core.tool.whenReady{|c|Routine({
  count.do{|i|var bus=c.createBus(("source"++i).asSymbol),producer=c.addSynth(("lfo"++i).asSymbol,\paramTestLFO,[\out,bus.index,\rate,0.7+(i*0.031)],\detectors),p=c.param(("p"++i).asSymbol);
   if(i<2){p.addModulation(\lfo,c.registerModulationSource(("lfo"++i).asSymbol,bus,producer))}{p.addModulation(\lfo,bus)};
  };
  c.param(\p0).createModulationWriter(\custom,\paramTestWriter);
  server.sync;0.2.wait;
  view=AWParamInspector.openMany(c.params.values.asArray,(launch:false),core);
  replyObserver=OSCFunc({replies=replies+1},'/awb/param/state',server.addr);
  ("PARAM_READY "++view.instanceID++" "++server.pid++" "++server.sampleRate++" "++server.options.blockSize).postln;
  OSCFunc({|msg|switch(msg[1].asString,
   "ramps",{c.param(\p0).setBase(0.8,1,2).setAmount(-0.5,1,-2)},
   "interrupt",{c.param(\p0).setBase(0.4,0.4,-2).setAmount(0.7,0.4,2)},
   "static",{c.params.values.do{|p|p.removeModulation(\lfo)};c.param(\p0).removeModulationWriter(\custom)},
   "freeSource",{c.resourceAt(\lfo0).free},
   "freeParam",{c.param(\p0).free},
   "stats",{("PARAM_REPLIES "++replies).postln},
   "quit",{view.close;core.close;replyObserver.free;server.quit;SystemClock.sched(0.5,{0.exit;nil})}
  )},'/awb/param/test');
 }).play(SystemClock)};
}{|error|error.reportError;server.quit;SystemClock.sched(0.5,{1.exit;nil})}}).play(SystemClock)},100);
)
