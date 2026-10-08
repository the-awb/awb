(
var server,core,instance,events=List.new,now=0,serial=0,emit,dir=thisProcess.nowExecutingPath.dirname,p=Array.newClear(8),writers=Array.newClear(8),monitor,step=64/44100,sourceA,sourceB,registeredProducer,queryReply;
emit={|msg|serial=serial+1;events.add([if(msg[0]==\d_recv){0}{now},serial,msg])};
try{
 server=Server(\coreNRT,NetAddr("127.0.0.1",59998),ServerOptions.new.numOutputBusChannels_(8).numInputBusChannels_(0));
 [SynthDef(\paramWriter,{|out,value=0|Out.kr(out,value)}),SynthDef(\paramMonitor,{|b0,b1,b2,b3,b4,b6,b7,gain=0.05|
    Out.ar(0,K2A.ar([In.kr(b0),In.kr(b1),In.kr(b2),In.kr(b3),In.kr(b4),gain,In.kr(b6),In.kr(b7)]));
 })].do{|def|emit.value([\d_recv,def.asBytes]);SynthDescLib.global.add(def.asSynthDesc)};
 now=0.05;emit.value([\g_new,1,0,0]);now=0.1;
 instance=AWBCoreTool.open((),(server:server,sendFunction:emit,queryFunction:{|action|action.value(queryReply,nil)},track:false));core=instance.tool;
 p[0]=core.createParam(\base,0.2);p[1]=core.createParam(\amount,0.2,\unipolar,0,polarity:\bipolar);
 p[2]=core.createParam(\sum,0.2,\unipolar,0.5);p[3]=core.createParam(\curve,0.5,\unipolar,0.5,4);
 p[4]=core.createParam(\frequency,200,ControlSpec(20,20000,\exp),0.2);
 p[5]=core.createParam(\mapped,0.4);p[6]=core.createParam(\rapid,0.2);p[7]=core.createParam(\stale,0.2,\unipolar,0.5);
 p.do{|param|param.baseSmoothing=0};
 [1,2,3,4,7].do{|i|writers[i]=Synth.basicNew(\paramWriter,server);emit.value(writers[i].newMsg(p[i].sourceGroup,[\out,p[i].inputBus.index,\value,if(i==1){1}{0.5}],\addToTail))};
 // Exercise the registered writer helper against the real NRT server.
 emit.value(writers[2].freeMsg);writers[2]=p[2].createModulationWriter(\ownedWriter,\paramWriter,[\value,0.5]);
 // Two independent contributors sum before the processor; adjust original to .2.
 emit.value(writers[2].setMsg(\value,0.2));emit.value([\s_new,\paramWriter,99001,1,p[2].sourceGroup.nodeID,\out,p[2].inputBus.index,\value,0.3]);
 monitor=Synth.basicNew(\paramMonitor,server);emit.value(monitor.newMsg(core.groupAt(\output),[\b0,p[0].outputBus.index,\b1,p[1].outputBus.index,\b2,p[2].outputBus.index,\b3,p[3].outputBus.index,\b4,p[4].outputBus.index,\b6,p[6].outputBus.index,\b7,p[7].outputBus.index],\addToTail));p[5].mapTo(monitor,\gain);
 now=0.4;p[0].setBase(0.8,1);p[1].setAmount(0.5,1);
 now=0.6;emit.value(writers[3].setMsg(\value,-0.5));emit.value(writers[7].freeMsg);
 now=0.7;p[0].setBase(0.1,0.5);p[1].setAmount(-0.1,0.5);
 now=0.8;emit.value(writers[2].setMsg(\value,-0.2));
 // Adjacent control-block edits: no positive-edge retrigger dependency.
 6.do{|i|now=0.9+(step*i);p[6].setBase(0.4+(i*0.05),0.1,if(i.odd){4}{-4})};
 now=1.0;p[3].setModCurve(0);p[5].setBase(0.9,0.2);
 now=1.1;emit.value(writers[2].setMsg(\value,0.8));emit.value([\n_set,99001,\value,0.8]);p[2].setAmount(0.2);
 sourceA=core.createBus(\modA);sourceB=core.createBus(\modB);emit.value([\c_set,sourceA.index,0.3,sourceB.index,0.4]);
 registeredProducer=core.addSynth(\sourceA,\paramWriter,[\out,sourceA.index,\value,0.3],\input);
 // Minimal declared order fixture for score generation; the rendered DSP below
 // independently verifies the source/route/Param/monitor path in scsynth.
 queryReply=['/g_queryTree.reply',0,0,2,registeredProducer.nodeID,-1,'paramWriter',p[7].group.nodeID,2,p[7].sourceGroup.nodeID,0,p[7].synth.nodeID,-1,'awParam_v1'];
 p[7].addModulation(\a,core.registerModulationSource(\sourceA,sourceA,registeredProducer),0.5);p[7].addModulation(\b,sourceB,-0.5);
 now=1.3;p[0].setBase(0.9,0);p[1].setAmount(0,0);
 now=1.4;p[6].setPolarity(\bipolar);p[0].setBase(0.3,0.6,4);p[1].setAmount(0.5,0.6,-4);
 now=1.5;p[7].removeModulation(\a);
 now=1.6;p[6].setNormalized(-0.25,0);
 now=1.9;p[6].setPolarity(\unipolar);p[1].setAmount(-0.6);
 now=2.0;p[1].setPolarity(\unipolar);
 now=2.05;p[1].setAmount(0.5);
 now=1.7;p[0].setBase(0.3,0.6,0); // same target restarts from current value
 now=1.8;p[7].removeModulation(\b);
 now=2.1;p[5].free;
 now=2.4;instance.close;now=2.7;emit.value([0]);
 events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};
 Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"audio.osc");"AWB_CORE_AUDIO_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
