// Loaded paired test: retain both graphs; atomic switches; ABBA then BAAB.
(
var dir=thisProcess.nowExecutingPath.dirname,bench,server,states=IdentityDictionary.new,records=List.new;
var cases=("AWB_SEND_LAYOUT_CASES".getenv ? "").split($,).collect{|v|v.split($:).collect(_.asInteger)};
var loadNodes=("AWB_SEND_LAYOUT_LOAD_NODES".getenv ? "60").asInteger,seconds=("AWB_SEND_LAYOUT_SECONDS".getenv ? "6").asInteger;
var loadGroup,loadBus,finish,done=false,json,opts;
opts=ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(4).sampleRate_(44100)
 .blockSize_(64).hardwareBufferSize_(512).memSize_(262144);
opts.device="1248";opts.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins"];
Server.program="AWB_SEND_LAYOUT_ENGINE".getenv;
server=Server(\sendLayoutInPlace,NetAddr("127.0.0.1","AWB_SEND_LAYOUT_PORT".getenv.asInteger),opts);
bench=thisProcess.interpreter.executeFile(dir+/+"definitions.scd");
json={|v|if(v.isString){v.asCompileString}{if(v.isArray){"["++v.collect{|x|json.value(x)}.join(",")++"]"}{v.asString}}};
finish={|code|if(done.not){done=true;states.values.do{|state|bench[\close].value(state)};
 loadGroup.tryPerform(\free);loadBus.tryPerform(\free);server.quit;SystemClock.sched(1,{code.exit;nil})}};
SystemClock.sched(900,{"In-place send comparison timed out".error;finish.value(1);nil});
server.waitForBoot({server.mute;Routine({try{
 var idle=List.new,measure,keyFor;
 keyFor={|size,layout|(size.asString++"-"++layout).asSymbol};
 SynthDef(\sendLayoutLoad,{|out=0|var x=SinOsc.ar(Array.series(32,103,41.7));
  x=RLPF.ar(x,Array.series(32,401,137.9),0.3);Out.ar(out,Mix((x*3).tanh)*0.00001);
 }).send(server);server.sync;
 loadBus=Bus.audio(server,1);loadGroup=Group.basicNew(server);
 server.sendMsg(*loadGroup.newMsg(server.defaultGroup,\addToHead));
 loadNodes.do{var node=Synth.basicNew(\sendLayoutLoad,server);server.sendMsg(*node.newMsg(loadGroup,[\out,loadBus.index],\addToTail))};
 cases.collect(_[0]).as(Set).asArray.sort.do{|size|[\monolithic,\split].do{|layout|
  var state=bench[\make].value(server,size,layout),consumer;
  state[\pauseZero]=layout==\split;
  consumer=SynthDef(("inPlaceConsumer"++state[\rack].rootGroup.nodeID).asSymbol,{
   Out.ar(0,Mix(state[\rack].slotIDs.collect{|id|In.ar(state[\rack].destinationFor(id).index,2)})/size);
  });state[\rack].installDef(\diagnostic,consumer);server.sync;
  state[\rack].synth(consumer.name,[],state[\rack].rootGroup,"Matched reader");
  server.sendMsg(*state[\rack].rootGroup.runMsg(false));
  states[keyFor.value(size,layout)]=state;
 }};
 server.sync;"INPLACE_WARMUP seconds=60".postln;60.wait;
 20.do{idle.add([Main.elapsedTime,server.avgCPU,server.peakCPU]);0.2.wait};
 measure={|size,active,layout,cycle|
  var state=states[keyFor.value(size,layout)],rows=List.new,start,messages;
  messages=bench[\update].value(state,\sparse);
  server.sendBundle(nil,*states.values.collect{|other|other[\rack].rootGroup.runMsg(other===state)});
  server.sync;2.wait;start=Main.elapsedTime;
  (seconds*5).do{rows.add([Main.elapsedTime-start,server.avgCPU,server.peakCPU,server.numSynths,server.numUGens]);0.2.wait};
  records.add([cycle,size,"active"++active,layout.asString++if(layout==\split){"Paused"}{""},0,messages,rows.asArray]);
  File.use(dir+/+"phase-rows.jsonl","a",{|f|f.write(json.value(records.last)++"\n")});
  ("LAYOUT_PHASE repeat="++cycle++" sends="++size++" profile=active"++active++" layout="++layout
   ++" avg="++rows.collect(_[1]).mean++" peak="++rows.collect(_[2]).maxItem++" synths="++rows.last[3]++" ugens="++rows.last[4]).postln;
 };
 [cases,cases.reverse].do{|order,index|order.do{|entry|
  var size=entry[0],active=entry[1],layouts=if(index==0){[\monolithic,\split,\split,\monolithic]}{[\split,\monolithic,\monolithic,\split]};
  [\monolithic,\split].do{|layout|states[keyFor.value(size,layout)][\activeCount]=active};
  layouts.do{|layout|measure.value(size,active,layout,index+1)};
 }};
 File.use(dir+/+"live-rows.json","w",{|f|f.write("{\"sampleRate\":"++server.sampleRate++",\"blockSize\":64,\"requestedHardwareFrames\":512,\"hardwareOutputMuted\":true,\"channels\":8,\"width\":2,\"loadNodes\":"++loadNodes++",\"measureSeconds\":"++seconds++",\"mode\":\"in-place ABBA/BAAB\",\"idle\":"++json.value(idle.asArray)++",\"records\":"++json.value(records.asArray)++"}")});
 "SEND_LAYOUT_LIVE=PASS".postln;finish.value(0);
}{|error|error.reportError;finish.value(1)}}).play(SystemClock);
},100,{"In-place server boot failed".error;finish.value(1)});
server.boot;
)
