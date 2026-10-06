// Owned, muted, no GUI/bridge. Static routing and 15 Hz automation are separate.
(
var dir=thisProcess.nowExecutingPath.dirname,bench,server,records=List.new,state,consumer;
var pauseZero="AWB_SEND_LAYOUT_PAUSE_ZERO".getenv=="1",cases="AWB_SEND_LAYOUT_CASES".getenv ? "";
var sizes=if(pauseZero){[24]}{[8,16,24,32]},profiles=if(pauseZero){[\full,\zero,\sparse]}{[\full,\zero,\sparse,\moving]},sequence=List.new,finish,done=false,automation;
var loadNodes=("AWB_SEND_LAYOUT_LOAD_NODES".getenv ? "0").asInteger,seconds=("AWB_SEND_LAYOUT_SECONDS".getenv ? "6").asInteger,loadGroup,loadBus;
var opts=ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(4).sampleRate_(44100)
 .blockSize_(64).hardwareBufferSize_(512).memSize_(262144);
opts.device="1248";opts.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins"];
Server.program="AWB_SEND_LAYOUT_ENGINE".getenv;
server=Server(\sendLayoutLive,NetAddr("127.0.0.1","AWB_SEND_LAYOUT_PORT".getenv.asInteger),opts);
bench=thisProcess.interpreter.executeFile(dir+/+"definitions.scd");
finish={|code|
 if(done.not){done=true;automation.tryPerform(\stop);state.tryPerform(\at,\instance).tryPerform(\close);
  loadGroup.tryPerform(\free);loadBus.tryPerform(\free);server.quit;SystemClock.sched(1,{code.exit;nil})};
};
SystemClock.sched(900,{"Send layout live run timed out".error;finish.value(1);nil});
server.waitForBoot({
 server.mute;
 Routine({
  try {
   var idle=List.new,file,json;
   json={|value|if(value.isString){value.asCompileString}{if(value.isArray){"["++value.collect{|v|json.value(v)}.join(",")++"]"}{value.asString}}};
   if(loadNodes>0){
    SynthDef(\sendLayoutLoad,{|out=0|var x=SinOsc.ar(Array.series(32,103,41.7));
     x=RLPF.ar(x,Array.series(32,401,137.9),0.3);Out.ar(out,Mix((x*3).tanh)*0.00001);
    }).send(server);server.sync;
    loadBus=Bus.audio(server,1);loadGroup=Group.basicNew(server);
    server.sendMsg(*loadGroup.newMsg(server.defaultGroup,\addToHead));
    loadNodes.do{var node=Synth.basicNew(\sendLayoutLoad,server);server.sendMsg(*node.newMsg(loadGroup,[\out,loadBus.index],\addToTail))};
    server.sync;10.wait;
   };
   3.wait;20.do{idle.add([Main.elapsedTime,server.avgCPU,server.peakCPU]);0.2.wait};
   // Reverse the ENTIRE order in repeat 2, including layout order.
   if(cases.size>0){cases.split($,).do{|entry|var pair=entry.split($:).collect(_.asInteger);
    [\monolithic,\split].do{|layout|sequence.add([pair[0],\sparse,layout,pair[1]])};
   }}{sizes.do{|size|profiles.do{|profile|[\monolithic,\split].do{|layout|sequence.add([size,profile,layout])}}}};
   [sequence.asArray,sequence.asArray.reverse].do{|order,repeat|
    order.do{|entry,index|
     var size=entry[0],profile=entry[1],layout=entry[2],rows=List.new,start,phase=0,steps=0,messages=0,profileLabel;
     state=bench[\make].value(server,size,layout);
     state[\pauseZero]=pauseZero and:{layout==\split};
     if(entry.size>3){state[\activeCount]=entry[3]};
     profileLabel=if(entry.size>3){"active"++entry[3]}{profile.asString};
     consumer=SynthDef(("layoutLiveConsumer"++size).asSymbol,{
      var values=state[\rack].slotIDs.collect{|id|In.ar(state[\rack].destinationFor(id).index,2)};
      Out.ar(0,Mix(values)/size);
     });state[\rack].installDef(\diagnostic,consumer);server.sync;
     state[\rack].synth(consumer.name,[],state[\rack].rootGroup,"Matched downstream reader");
     messages=messages+bench[\update].value(state,profile,phase);server.sync;
     if(profile==\moving){automation=Routine({loop{
      phase=phase+0.11;messages=messages+bench[\update].value(state,profile,phase);steps=steps+1;(1/15).wait;
     }}).play(SystemClock)};
     3.wait;start=Main.elapsedTime;
     (seconds*5).do{rows.add([Main.elapsedTime-start,server.avgCPU,server.peakCPU,server.numSynths,server.numUGens]);0.2.wait};
     automation.tryPerform(\stop);automation=nil;
     records.add([repeat+1,size,profileLabel,layout.asString++if(state[\pauseZero]){"Paused"}{""},steps,messages,rows.asArray]);
     ("LAYOUT_PHASE repeat="++(repeat+1)++" sends="++size++" profile="++profileLabel++" layout="++layout
       ++" avg="++rows.collect(_[1]).mean++" peak="++rows.collect(_[2]).maxItem
       ++" synths="++rows.last[3]++" ugens="++rows.last[4]).postln;
     File.use(dir+/+"phase-rows.jsonl","a",{|checkpoint|checkpoint.write(json.value(records.last)++"\n")});
     bench[\close].value(state);state=nil;server.sync;0.2.wait;
    };
   };
   file=File(dir+/+"live-rows.json","w");
   file.write("{\"sampleRate\":"++server.sampleRate++",\"blockSize\":64,\"requestedHardwareFrames\":512,"
     ++"\"hardwareOutputMuted\":true,\"channels\":8,\"width\":2,\"loadNodes\":"++loadNodes++",\"measureSeconds\":"++seconds++",\"idle\":"++json.value(idle.asArray)
     ++",\"records\":"++json.value(records.asArray)++"}");file.close;
   "SEND_LAYOUT_LIVE=PASS".postln;finish.value(0);
  }{|error|error.reportError;finish.value(1)};
 }).play(SystemClock);
},100,{"Send layout server boot failed".error;finish.value(1)});
server.boot;
)
