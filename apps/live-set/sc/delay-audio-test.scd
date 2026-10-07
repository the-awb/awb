(
var server,root,config,rackInstance,rack,baseInstance,base,delays,sourceA,sourceB,sourceC,sourceD,checks=0,closing=false,fullSet,parameterView;
var check,finish,run,capture,runSetup;
root="AWB_DELAY_ROOT".getenv;
server=Server(\awbDelayIntegration,NetAddr("127.0.0.1",57975));
Server.program="exec "++(Platform.resourceDir+/+"scsynth").shellQuote;
server.options.ugenPluginsPath=(Platform.resourceDir+/+"plugins")++":"++(root+/+"apps/live-set/.build")++":"++(Platform.systemExtensionDir+/+"EnvDetect3")++":"++(Platform.systemExtensionDir+/+"VSTPlugin/plugins");
server.options.sampleRate=44100;server.options.blockSize=128;server.options.memSize=262144;
server.options.numInputBusChannels=3;server.options.numOutputBusChannels=4;server.options.loadDefs=false;server.options.zeroConf=false;
check={|label,ok|if(ok.not){Error("FAIL "++label).throw};checks=checks+1;("PASS "++label).postln};
finish={|code|
 if(closing.not){closing=true;sourceA.tryPerform(\free);sourceB.tryPerform(\free);sourceC.tryPerform(\free);sourceD.tryPerform(\free);delays.tryPerform(\close);baseInstance.tryPerform(\close);rackInstance.tryPerform(\close);
  if(fullSet.notNil){check.value("base closure closes its adopted FX set",fullSet.closed and:{fullSet.sharedChain.closed})};
  Routine({1.wait;("AWB_DELAY_AUDIO_RESULT="++if(code==0){"PASS"}{"FAIL"}++" checks="++checks).postln;server.quit;1.wait;code.exit}).play(SystemClock);
 }
};
OSCdef(\delayTestClose,{finish.value(0)},'/awb/test/close');
OSCdef(\delayTestVerify,{|msg,time,addr|
 var id=msg[1];Routine({try{
   check.value("GUI changes actual B1 AWParam",(delays.params["B1/feedback"].baseTarget-0.31).abs<0.0001);
   check.value("other cell baseline retained",delays.params["A2/feedback"].baseTarget==0);
   check.value("GUI preserves modulation input",delays.params["B1/feedback"].routeMetadata.notEmpty);
   addr.sendMsg('/awb/test/verified',id,checks);
 }{|e|e.reportError;finish.value(1)}}).play(SystemClock);
},'/awb/test/verify');
capture={|bus|
 var buffer=Buffer.alloc(server,4410,2),condition=Condition.new,data;
 server.sync;Synth.tail(server.defaultGroup,\awbDelayTestCapture,[\in,bus.index,\bufnum,buffer.bufnum]);0.14.wait;
 buffer.loadToFloatArray(action:{|array|data=array;});buffer.free;server.sync;
 [0,1].collect{|ch|data.clump(2).collect{|f|f[ch]}.sum/4410};
};
run={
 Routine({try{
  var before,after,p,modBus,modNode,observed,channels=#[\vc,\pro2,\delbus,\b1,\a2,\b2,\a1,\sc1,\sc2],a,b,aggregate;
  check.value("nine named persistent channels",channels.every{|id|rack.inputFor(id).notNil});
  check.value("all rack channels expose 24 destinations",rack.slotIDs.size==24);
  check.value("single graph on the same server",delays.graph.server===rack.server);
  check.value("four independent stereo buffers",delays.graph.graphBuffers.size==4 and:{delays.graph.graphBuffers.every{|v|v[\buffer].numChannels==2}});
  check.value("rack post outputs are explicit one-block source reads",delays.graph.port("clean","out").numChannels==2);
  check.value("legacy DAG order B1 A2 B2 A1",delays.graph.plan[\order].collect{|i|delays.graph.plan[\nodes][i]}.select{|n|n[\kind]=="cell"}.collect{|n|n[\id]}==["B1","A2","B2","A1"]);
  check.value("route AWParam range matches the shared surface",delays.params["clean:B1"].spec.minval==0 and:{delays.params["clean:B1"].spec.maxval==1});
  check.value("delay timing AWParam range matches the shared surface",delays.params["B1/seconds"].spec.minval==0.01 and:{delays.params["B1/seconds"].spec.maxval==32});
  check.value("SC1/SC2 input pipes are independent",rack.inputFor(\sc1).index!=rack.inputFor(\sc2).index);
  delays.state[\cells].do{|c|["h3","h4"].do{|h|delays.setField("head",c[\id],h++"/enabled",0)};delays.setField("head",c[\id],"h1/left",1);delays.setField("head",c[\id],"h2/right",1);delays.setField("cell",c[\id],"seconds",0.03);delays.setField("cell",c[\id],"feedback",0);delays.setField("cell",c[\id],"inputGain",1)};
  delays.setField("route","clean:B1","",1);delays.setField("route","pro2:A2","",1);
  sourceA=Synth.head(rack.sourceGroup,\awbDelayTestSource,[\out,rack.inputFor(\vc).index,\left,0.1,\right,0.2]);
  sourceB=Synth.head(rack.sourceGroup,\awbDelayTestSource,[\out,rack.inputFor(\pro2).index,\left,0.3,\right,0.4]);
  0.5.wait;a=capture.value(delays.graph.port("B1","wet"));b=capture.value(delays.graph.port("A2","wet"));
  check.value("VC reaches B1 with stereo preserved",(a[0]-0.1).abs<0.005 and:{(a[1]-0.2).abs<0.005});
  check.value("Pro2 independently reaches A2",(b[0]-0.3).abs<0.005 and:{(b[1]-0.4).abs<0.005});
  aggregate=capture.value(rack.postFor(\delbus));check.value("Delay Bus sums routed wet returns once",(aggregate[0]-0.32).abs<0.01 and:{(aggregate[1]-0.48).abs<0.01});
  check.value("cell return also reaches its own persistent channel",(capture.value(rack.postFor(\b1))[0]-0.1).abs<0.005);
  check.value("independent cell sends start at zero",rack.channels[\b1][\gains].sum==0);
  rack.setMute(\vc,true);0.25.wait;check.value("muted source stops new delay input",capture.value(delays.graph.port("B1","wet")).abs.maxItem<0.002);rack.setMute(\vc,false);
  delays.setField("route","B1:B2","",1);0.3.wait;check.value("internal B1 to B2 route works",(capture.value(delays.graph.port("B2","wet"))[0]-0.1).abs<0.005);
  sourceC=Synth.head(rack.sourceGroup,\awbDelayTestSource,[\out,rack.inputFor(\sc1).index,\left,0.05,\right,0.07]);
  sourceD=Synth.head(rack.sourceGroup,\awbDelayTestSource,[\out,rack.inputFor(\sc2).index,\left,0.08,\right,0.11]);
  delays.setField("route","sc1:A1","",1);delays.setField("route","sc2:A1","",1);0.3.wait;
  a=capture.value(delays.graph.port("A1","wet"));check.value("SC1 and SC2 reach A1 as independent stereo sources",(a[0]-0.13).abs<0.005 and:{(a[1]-0.18).abs<0.005});
  rack.setMute(\sc1,true);0.2.wait;a=capture.value(delays.graph.port("A1","wet"));check.value("SC1 mute preserves SC2 delay input",(a[0]-0.08).abs<0.005 and:{(a[1]-0.11).abs<0.005});rack.setMute(\sc1,false);
  sourceC.free;sourceC=nil;sourceD.free;sourceD=nil;
  rack.setLevel(\delbus,0.4);0.15.wait;check.value("rack fader updates same Delay Bus AWParam",delays.params["master"].baseTarget==0.4);
  p=delays.params["B1/feedback"];modBus=Bus.control(server,1);modBus.set(0.1);p.addBusModulation(\testFeedback,modBus,1);p.setAmount(0.5);server.sync;0.1.wait;
  check.value("real feedback modulation registered",p.routeMetadata.notEmpty);
  p.outputBus.get({|v|observed=v});while({observed.isNil},{0.01.wait});check.value("modulation actually changes effective feedback",(observed-0.055).abs<0.002);
  parameterView=base.gui((launch:false));
  File.use("AWB_DELAY_BINDING".getenv,"w",{|file|file.write(AWBDelayRack.json((instanceID:base.instance.instanceID,port:NetAddr.langPort,paramInstanceID:parameterView.instanceID,rackInstanceID:rack.instance.instanceID,rackLibraryID:rack.config[\libraryID],checks:checks)))});
  if(fullSet.notNil){check.value("persistent set ownership survives NodeManager polling",base.resourceAt(\firstPassSet)===fullSet)};
  "AWB_DELAY_WAITING_FOR_NODE".postln;
 }{|e|e.reportError;finish.value(1)}}).play(SystemClock);
};
runSetup={
 rack.masterGroup.run(false);
 baseInstance=AWBaseTool.open((name:"Delay integration test",params:[]),(server:server,track:false));base=baseInstance.tool;
 base.whenReady({
  var callback={|value,error|if(error.notNil){error.reportError;finish.value(1)}{if(fullSet.isNil){base.adopt(\delays,value,{|v|v.close})};run.value}};
  if(fullSet.notNil){base.bindFirstPass(fullSet,own:true);delays=base.bindDelays((root+/+"apps/live-set/sc/plans/44100.scd").load,(root+/+"apps/live-set/sc/plans/configuration.scd").load,callback)}{
   delays=AWBDelayRack.open(base,rack,(root+/+"apps/live-set/sc/plans/44100.scd").load,(root+/+"apps/live-set/sc/plans/configuration.scd").load,callback);
  };
 });
};
server.waitForBoot({Routine({try{
 SynthDef(\awbDelayTestSource,{|out=0,left=0.1,right=0.2|Out.ar(out,DC.ar([left,right]))}).send(server);
 SynthDef(\awbDelayTestCapture,{|in=0,bufnum=0|RecordBuf.ar(In.ar(in,2),bufnum,loop:0,doneAction:2)}).send(server);server.sync;
 if("AWB_FULL_SET".getenv=="1"){
  var specification=AWBDelayRack.configure((root+/+"apps/rack/sc/sets/awb52/prepared/first-pass.scd").load);
  specification[\fftSize]=4096;VSTPlugin.initDSPThreads(server,2);server.sync;
  fullSet=AWBFirstPassSet.open(specification,(server:server,track:false,controlSends:true,verbProfiles:true,fxProfiles:true,fuzzPlugin:true,sharedFX:true,celloScheps:true,
   onReady:{|set|rackInstance=set.instance;rack=set.rack;runSetup.value},onError:{|error|error.reportError;finish.value(1)}));
 }{
  config=AWBSendRackTool.defaults.copy.putAll((channels:[(id:\vc,label:"VC"),(id:\pro2,label:"Pro2")],fixedFX:[\verb,\deci,\spark,\fuzz,\mast],dynamicFX:3,fixedFollowers:[],spareFollowers:0));
  config=AWBDelayRack.configure((rack:config))[\rack];config=AWBControlSendProfile.configure(config);
  rackInstance=AWBSendRackTool.open(config,(server:server,track:false));rack=rackInstance.tool;
  rack.whenReady({AWBControlSendProfile.install(rack);runSetup.value});
 };
 }{|e|e.reportError;finish.value(1)}}).play(SystemClock)});
SystemClock.sched(120,{if(closing.not){"TEST_TIMEOUT".postln;finish.value(1)};nil});
)
