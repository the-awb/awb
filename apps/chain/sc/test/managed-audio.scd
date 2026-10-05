(
var server,instance,c,input,output,events=List.new,now=0,seq=0,emit,dir=thisProcess.nowExecutingPath.dirname;
emit={|msg|seq=seq+1;events.add([if(msg[0]==\d_recv){0}{now},seq,msg])};
try{
 server=Server(\managedNRT,NetAddr("127.0.0.1",59999),ServerOptions.new.numOutputBusChannels_(4).numInputBusChannels_(0));
 [SynthDef(\managedSource,{|out|Out.ar(out,[DC.ar(0.2),DC.ar(0.4)])}),SynthDef(\managedGain,{|in,out,gain=1|Out.ar(out,In.ar(in,2)*gain)}),SynthDef(\managedBias,{|in,out,bias=0.1|Out.ar(out,In.ar(in,2)+bias)}),SynthDef(\managedWide,{|in,out|Out.ar(out,In.ar(in,4))}),SynthDef(\managedMonitor,{|in|Out.ar(0,In.ar(in,2))})].do{|def|emit.value([\d_recv,def.asBytes]);SynthDescLib.global.add(def.asSynthDesc)};
 AWBChain.registerStageFactory(\gain,(controls:[(id:\gain,min:0,max:2,default:0.25)]),{|s|s.addSynth(\node,\managedGain,[\in,s.input.index,\out,s.output.index]);s.bindInput(\node);s.bind(\gain,\node,\gain);});
 AWBChain.registerStageFactory(\bias,(controls:[(id:\bias,min: -1,max:1,default:0.1)]),{|s|var inner=s.addGroup(\inner);s.addSynth(\node,\managedBias,[\in,s.input.index,\out,s.output.index],inner);s.bindInput(\node);s.bind(\bias,\node,\bias);});
 AWBChain.registerStageFactory(\wide,(inputWidth:4,outputWidth:4),{|s|s.addSynth(\node,\managedWide,[\in,s.input.index,\out,s.output.index]);s.bindInput(\node);});
 now=0.05;emit.value([\g_new,1,0,0]);input=Bus.audio(server,2);output=Bus.audio(server,2);emit.value([\s_new,\managedSource,95001,1,1,\out,input.index]);
 now=0.1;instance=AWBChain.open((factory:\serial,stages:[(id:\gain,factory:\gain),(id:\bias,factory:\bias)]),(server:server,input:input,output:output,sendFunction:emit,track:false));c=instance.tool;emit.value([\s_new,\managedMonitor,95002,1,1,\in,output.index]);
 now=0.4;c.moveStage(\bias,0);now=0.7;c.removeStage(\bias);now=1;c.insertStage((id:\bias,factory:\bias),1);now=1.3;c.replaceStage(\gain,(factory:\gain,values:(gain:0.5)));
 now=1.6;c.setRoute(\bias,[[0,1],[1,0]]);now=1.9;c.setRoute(\bias,nil);
 now=2.2;c.insertStage((id:\four,factory:\wide),1,(four:[[1,0],[0,1],[1,0],[0,1]],bias:[[0.5,0,0.5,0],[0,0.5,0,0.5]]));
 now=2.5;c.removeStage(\four,(bias:\direct));now=2.8;c.removeStage(\bias);c.removeStage(\gain);now=3.1;instance.close;now=3.4;emit.value([\n_free,95001,95002]);
 events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"managed-audio.osc");"AWB_CHAIN_MANAGED_AUDIO_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
