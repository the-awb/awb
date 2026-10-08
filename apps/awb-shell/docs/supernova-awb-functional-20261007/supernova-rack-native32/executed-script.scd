(
var root="AWB_FUNCTIONAL_ROOT".getenv,s,instance,rack,buffer,voice,silencer,finish,checks=0,failed=List.new,check,read,reading,value;
Archive.archiveDir=root;Server.program="exec "++"AWB_FUNCTIONAL_ENGINE".getenv.shellQuote;
s=Server(\rackFunctional,NetAddr("127.0.0.1","AWB_FUNCTIONAL_PORT".getenv.asInteger),ServerOptions.new.device_("1248").sampleRate_(44100).hardwareBufferSize_(512).blockSize_(128).numInputBusChannels_(0).numOutputBusChannels_(4).numAudioBusChannels_(2048).numControlBusChannels_(16384).memSize_(262144).threads_(2));
s.options.ugenPluginsPath=[root+/+"plugins"];Server.default=s;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failed.add(label);("FAIL "++label).postln}};
read={|bus|reading=false;bus.get{|v|value=v;reading=true};while{reading.not}{0.01.wait};value};
finish={|code|Routine({voice.tryPerform(\free);silencer.tryPerform(\free);buffer.tryPerform(\free);instance.tryPerform(\close);s.sync;s.quit;("NATIVE_RACK_CHECKS="++checks++" FAILED="++failed.size).postln;SystemClock.sched(1,{code.exit;nil})}).play(SystemClock)};
SystemClock.sched(140,{"NATIVE_RACK_TIMED_OUT".postln;finish.value(1);nil});
s.waitForBoot({Routine({try{
 var config=AWBControlSendProfile.configure(AWBSendRackTool.defaults),before,signal,slots;
 config[\channels]=[(id:\vc,label:"VC") ,(id:\pro2,label:"PRO2")]++Array.fill(6,{|i|(id:("input"++i).asSymbol,label:"Spare "++i)});
 config[\fixedFX]=[\verb,\deci,\spark,\fuzz,\mast];config[\dynamicFX]=3;config[\spareFollowers]=("AWB_FUNCTIONAL_SPARES".getenv ? "0").asInteger;
 config[\libraryID]="native-rack-functional";config[\tail]=0.05;config[\fade]=0.005;
 instance=AWBSendRackTool.open(config,(server:s,track:true));rack=instance.tool;while{rack.ready.not}{0.01.wait};
 AWBControlSendProfile.install(rack);s.sync;
 check.value(rack.channels.size==8,"F4 native eight channels");check.value(rack.slotIDs.size==(24+config[\spareFollowers]),"F4 native destination capacity");
 check.value(AWBControlSendProfile.baseLaunchBuses(rack).size==16,"F4 BaseLaunch input bank");
 before=rack.slotAt(\fx1)[\bus].index;rack.setFX(\fx1,\pass);s.sync;rack.clearFX(\fx1);s.sync;0.1.wait;
 check.value(rack.slotAt(\fx1)[\bus].index==before and:{rack.slotAt(\fx1)[\active].isNil},"F6 dynamic clear keeps stable bus");
 rack.setFX(\fx1,\pass);s.sync;rack.setFX(\fx1,\pass);s.sync;0.1.wait;
 check.value(rack.slotAt(\fx1)[\bus].index==before and:{rack.slotAt(\fx1)[\retiring].isEmpty},"F6 replacement retains address and retires previous generation");
 SynthDef(\nativeRackSilentHardware,{ReplaceOut.ar(0,DC.ar(0)!4)}).send(s);s.sync;silencer=Synth(\nativeRackSilentHardware,target:rack.rootGroup,addAction:\addAfter);
 buffer=Buffer.readChannel(s,"/Volumes/ARMED WITH SOUND/Samples/Ali March 22/Cello 1-bounce-1.wav",channels:[0]);s.sync;
 SynthDef(\nativeRackCello,{|out=0,buf=0|Out.ar(out,(PlayBuf.ar(1,buf,BufRateScale.kr(buf),loop:1)*0.1)!2)}).send(s);s.sync;
 voice=Synth(\nativeRackCello,[\out,rack.inputFor(\vc).index,\buf,buffer.bufnum],rack.rootGroup,\addBefore);
 rack.setSend(\vc,\mast,1);AWBControlSendProfile.sendIDs.do{|id|rack.setSend(\vc,id,1)};s.sync;0.3.wait;
 signal=read.value(rack.measurementFor(\c1));check.value(signal>0 and:{signal.isNaN.not},"F4 actual audio drives control-send detector");
 rack.setMute(\vc,true);s.sync;0.3.wait;check.value(read.value(rack.measurementFor(\c1))<0.001,"F4 mute stops detector source");
 rack.setMute(\vc,false);rack.setSolo(\pro2,true);s.sync;0.3.wait;check.value(read.value(rack.measurementFor(\c1))<0.001,"F4 other-channel solo stops detector source");
 rack.setSolo(\pro2,false);s.sync;0.3.wait;check.value(read.value(rack.measurementFor(\c1))>0,"F4 clearing solo restores control source");
 rack.setReturn(\c1,0);s.sync;0.1.wait;check.value(read.value(rack.measurementFor(\c1))<0.00001,"F4 control-send amount fader reaches zero");rack.setReturn(\c1,1);s.sync;
 AWBHostControl.start(\manual,\ide,"AWB_FUNCTIONAL_TOKEN".getenv);thisProcess.interpreter.executeFile("/Users/willy/awb/apps/awb-shell/sc/AWBScBusAudio.scd");
 OSCdef(\functionalEngineVerify,{|msg,time,addr|
 if(msg[1].asString=="AWB_FUNCTIONAL_TOKEN".getenv){Routine({
 var r=rack,pending,bad=List.new;pending=r.channels.size;s.sync;
 r.channels.keysValuesDo{|id,ch|ch[\node].getn(\sendGains,r.slotIDs.size,{|values|
  if(values.size!=ch[\gains].size or:{values.collect{|v,i|(v-ch[\gains][i]).abs}.maxItem>1.1e-6}){bad.add(id)};pending=pending-1;
 })};
 while{pending>0}{0.01.wait};addr.sendMsg('/awb/functional/verified',msg[1].asString,bad.size,r.channels.size*r.slotIDs.size);
 }).play(SystemClock)};
 },'/awb/functional/verify');
 File.use(root+/+"rack-binding.json","w",{|f|f.write("{\"instanceID\":\""++instance.instanceID++"\",\"port\":"++NetAddr.langPort++",\"enginePort\":"++s.addr.port++",\"masterBus\":"++rack.masterBus.index++",\"controlBus\":"++rack.followerFor('mod-deci',\f_deci).index++",\"libraryID\":\""++config[\libraryID]++"\"}")});
 OSCdef(\nativeFinish,{|msg|if(msg[1].asString=="AWB_FUNCTIONAL_TOKEN".getenv){finish.value(if(failed.isEmpty){0}{1})}},'/awb/functional/finish');
 OSCdef(\nativeEdit,{|msg,time,addr|if(msg[1].asString=="AWB_FUNCTIONAL_TOKEN".getenv){rack.setSend(\vc,\mast,0.625);addr.sendMsg('/awb/functional/done',"external")}},'/awb/functional/external');
 "AWB_NATIVE_RACK_READY".postln;
}{|e|e.reportError;finish.value(1)}}).play(SystemClock)});
)
