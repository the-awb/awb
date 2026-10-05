(
var server,instance,c,input,output,events=List.new,now=0,seq=0,emit,dir=thisProcess.nowExecutingPath.dirname;
emit={|message|seq=seq+1;events.add([now,seq,message])};
try{
 server=Server(\chainNRT,NetAddr("127.0.0.1",59999),ServerOptions.new.numOutputBusChannels_(4).numInputBusChannels_(0));
 [SynthDef(\chainSource,{|out|Out.ar(out,[DC.ar(0.2),DC.ar(0.4)])}),SynthDef(\chainStage,{|in,out,gain=1|Out.ar(out,In.ar(in,2)*gain)}),SynthDef(\chainMonitor,{|in,out=0|Out.ar(out,In.ar(in,2))})].do{|def|emit.value([\d_recv,def.asBytes]);SynthDescLib.global.add(def.asSynthDesc)};
 AWBChainFuzz.definitions.do{|def|emit.value([\d_recv,def.asBytes])};emit.value([\d_recv,SynthDef(\chainTone,{|out|Out.ar(out,SinOsc.ar([500,900])*0.02)}).asBytes]);
 now=0.05;emit.value([\g_new,1,0,0]);input=Bus.audio(server,2);output=Bus.audio(server,2);emit.value([\s_new,\chainSource,90001,1,1,\out,input.index]);
 AWBChain.registerFactory(\nrt,{|chain|var middle=chain.bus;chain.addSynth(\a,\chainStage,[\in,chain.input.index,\out,middle.index]);chain.addSynth(\b,\chainStage,[\in,middle.index,\out,chain.output.index,\gain,0.5]);chain.bind(\gain,\a,\gain);});
 now=0.1;instance=AWBChain.open((factory:\nrt,controls:[(id:\gain,min:0,max:2,default:1)]),(server:server,input:input,output:output,sendFunction:emit,track:false));c=instance.tool;
 emit.value([\s_new,\chainMonitor,90002,1,1,\in,output.index]);now=0.4;c.set(\gain,0.25);now=0.7;c.applyValues((gain:2));now=1;instance.close;now=1.2;emit.value([\n_free,90001]);now=1.4;emit.value([\n_free,90002]);
 now=1.5;input=Bus.audio(server,2);output=Bus.audio(server,2);emit.value([\s_new,\chainTone,90003,1,1,\out,input.index]);AWBChainFuzz.register(server,false);
 now=1.6;instance=AWBChain.open(AWBChainFuzz.config,(server:server,input:input,output:output,sendFunction:emit,track:false));c=instance.tool;emit.value([\s_new,\chainMonitor,90004,1,1,\in,output.index,\out,2]);
 now=2;c.set(\drive,1);now=2.4;c.set(\drive,16);now=2.8;c.set(\level,0);now=3.2;c.set(\level,1);now=3.6;instance.close;now=4;emit.value([\n_free,90003,90004]);
 events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"audio.osc");"AWB_CHAIN_AUDIO_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
