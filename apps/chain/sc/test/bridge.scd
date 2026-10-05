(
var server,instance,chain,file,dir=thisProcess.nowExecutingPath.dirname;
server=Server(\chainBridgeFixture,NetAddr("127.0.0.1",59999),ServerOptions.new.numOutputBusChannels_(4).numInputBusChannels_(0));
AWBChain.registerFactory(\fixture,{|c|c.bindSetter(\gain,{|v|if(v==1.75){Error("fixture setter rejected edit").throw}});c.bindSetter(\freq,{|v|});});
instance=AWBChain.open((name:"Chain bridge fixture",factory:\fixture,controls:[(id:\gain,min:0,max:2,default:1,label:"Gain"),(id:\freq,min:20,max:20000,default:1000,curve:\log,unit:"Hz",label:"Cutoff")]),(server:server,sendFunction:{},track:true));chain=instance.tool;
file=File(dir+/+"bridge-ready.json","w");file.write("{\"port\":"++NetAddr.langPort++",\"instanceID\":\""++instance.instanceID++"\"}");file.close;
OSCdef(\chainFixture,{|msg|switch(msg[1].asString,"set",{chain.set(msg[2].asSymbol,msg[3])},"close",{instance.close},"exit",{instance.close;0.exit})},'/chain-fixture');
"AWB_CHAIN_BRIDGE_READY".postln;
)
