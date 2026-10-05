(
var server=Server.default, instance, rack, reservation, responder, work, controls, channels, fixed, large, wide;
large=("AWB_NATIVE_RACK_SIZE".getenv ? "small")=="large";wide="AWB_NATIVE_RACK_SIZE".getenv=="32";
channels=Array.fill(if(large){14}{if(wide){32}{8}},{|i|("ch"++i).asSymbol});
fixed=if(large){Array.fill(21,{|i|("fixed"++i).asSymbol})}{[\splut,\spark,\deci,\fuzz,\verb,\mast]};
Routine({var channelJSON,slotJSON,json,sourceJSON, tone=Library.at(\awbBenchTone);
 reservation=Bus.audio(server,256); // Keep existing explicit source/load buses outside the rack allocation.
 NodeManager.enable;
 instance=AWBSendRackTool.open((name:"Live rack bridge benchmark",libraryID:"live-bridge-bench",width:2,channels:channels,fixedFX:fixed,dynamicFX:3,fixedFollowers:[],spareFollowers:0,cleanSlot:false,out:8), (server:server,track:true));
 rack=instance.tool;while{rack.ready.not}{0.01.wait};
 rack.fxIDs.do{|id|rack.setFX(id,\pass,(fade:0.02,tail:0,limiter:false))};server.sync;
 SynthDef(\awbBenchRackVoice,{|out=0,freq=110|Out.ar(out,SinOsc.ar([freq,freq+0.7])*0.00001)}).send(server);server.sync;
 channels.do{|id,i|rack.synth(\awbBenchRackVoice,[\out,rack.inputFor(id).index,\freq,113+(i*41)],rack.sourceGroup,"Benchmark source")};server.sync;0.1.wait;
 controls=[];rack.slotIDs.do{|slot|channels.do{|channel|controls=controls.add([\send,channel,slot])}};
 rack.fxIDs.copyRange(0,if(large){17}{8}).do{|slot|controls=controls.add([\return,nil,slot])};
 if(large.not){channels.do{|channel|controls=controls.add([\level,channel,nil])}};
 responder=OSCFunc({|msg,time,address|
  if(address.ip=="127.0.0.1"){
   var op=msg[1].asString;
   if(op=="reset"){Routine({
    work.tryPerform(\stop);controls.do{|c|switch(c[0],\send,{rack.setSend(c[1],c[2],0)},\return,{rack.setReturn(c[2],0)},\level,{rack.setLevel(c[1],0)})};server.sync;address.sendMsg('/awb/rack/bench-reset',instance.instanceID);
   }).play(SystemClock)};
   if(op=="run"){var frames=msg[2].asInteger;
    work.tryPerform(\stop);work=Routine({var started=Main.elapsedTime, batchTotal=0, batchMax=0, lateFrames=0, lateMax=0;
     frames.do{|frame|var tick=Main.elapsedTime,late=(tick-(started+(frame*0.032))).max(0);lateMax=lateMax.max(late);if(late>0.002){lateFrames=lateFrames+1};
      controls.do{|c,k|var p=(frame+1+(k*7))%62,value=(1+(4*if(p<=31){p}{62-p}))/127;value=value.round(0.001);
       switch(c[0],\send,{rack.setSend(c[1],c[2],value)},\return,{rack.setReturn(c[2],value)},\level,{rack.setLevel(c[1],value)});
      };
      batchTotal=batchTotal+(Main.elapsedTime-tick);batchMax=batchMax.max(Main.elapsedTime-tick);(started+((frame+1)*0.032)-Main.elapsedTime).max(0.0001).wait;
     };server.sync;address.sendMsg('/awb/rack/bench-done',instance.instanceID,frames,controls.size,Main.elapsedTime-started,batchTotal/frames*1000,batchMax*1000,lateFrames,lateMax*1000);
    }).play(SystemClock);
   };
  };
 },'/awb/rack/bench');
 channelJSON=channels.collect{|id|"{\"id\":\"%\",\"node\":%}".format(id,rack.channels[id][\node].nodeID)}.join(",");
 slotJSON=rack.fxIDs.collect{|id|"{\"id\":\"%\",\"node\":%}".format(id,rack.slots[id][\active][\return].nodeID)}.join(",");
 sourceJSON=[ToolInstance,Tool,NodeManager].collect{|class|class.filenameSymbol.asString.asCompileString}.join(",");
 json="{\"port\":%,\"sampleRate\":%,\"blockSize\":%,\"scPID\":%,\"toneNode\":%,\"rackPort\":%,\"instanceID\":\"%\",\"libraryID\":\"live-bridge-bench\",\"rackChannels\":[%],\"rackSlots\":[%],\"movingControls\":%,\"nodeManagerEnabled\":%,\"nodeManagerTracked\":%,\"ownedObjects\":%,\"coreClassSources\":[%]}".format(server.addr.port,server.sampleRate,server.options.blockSize,server.pid,tone.nodeID,NetAddr.langPort,instance.instanceID,channelJSON,slotJSON,controls.size,NodeManager.isEnabled.asString,NodeManager.instance.registry.includesKey(instance).asString,instance.ownedObjects.size,sourceJSON);
 File.use("METER_COST_SESSION".getenv,"w",{|f|f.write(json)});
 Library.put(\awbBenchRack,instance);Library.put(\awbBenchRackReserve,reservation);Library.put(\awbBenchRackResponder,responder);
 "AWB_NATIVE_RACK_BENCH_READY".postln;
}).play(SystemClock);
)
