(
var server,instance,chain,file,dir=thisProcess.nowExecutingPath.dirname;
server=Server(\stageBridgeFixture,NetAddr("127.0.0.1",59999),ServerOptions.new.numOutputBusChannels_(4).numInputBusChannels_(0));
AWBChainFuzz.register(server,false);
SynthDescLib.global.add(SynthDef(\fixtureWide,{|in=0,out=0|Out.ar(out,In.ar(in,4))}).asSynthDesc);
AWBChain.registerStageFactory(\wide,(name:"Four channels",inputWidth:4,outputWidth:4),{|s|s.addSynth(\process,\fixtureWide,[\in,s.input.index,\out,s.output.index]);s.bindInput(\process);});
instance=AWBChain.open(AWBChainFuzz.managedConfig,(server:server,sendFunction:{},track:true));chain=instance.tool;
file=File(dir+/+"stage-ready.json","w");file.write("{\"port\":"++NetAddr.langPort++",\"instanceID\":\""++instance.instanceID++"\"}");file.close;
OSCdef(\stageFixture,{|msg|switch(msg[1].asString,"move",{chain.moveStage(msg[2].asSymbol,msg[3])},"close",{instance.close},"exit",{instance.close;0.exit})},'/chain-stage-fixture');
"AWB_CHAIN_STAGE_BRIDGE_READY".postln;
)
