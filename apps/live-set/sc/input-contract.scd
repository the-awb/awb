// Captured server messages only: no engine or hardware device.
(
var server, spec, set, messages=List.new, checks=0;
var check={|ok,label|if(ok.not){Error(label).throw};checks=checks+1;("PASS "++label).postln};
server=AWBCoreTestServer(\inputContract,NetAddr("127.0.0.1",59994));
server.options.numInputBusChannels=6;server.options.memSize=262144;server.options.sampleRate=44100;
spec="/Users/willy/awb/apps/rack/sc/sets/awb52/prepared/first-pass.scd".load;
spec[\rack][\channels]=spec[\rack][\channels]++[(id:"mic",label:"Mic")];
spec[\initialMix][\channels]=spec[\initialMix][\channels]++[(id:"mic",level:1,sends:(mast:1))];
spec=AWBDelayRack.configure(spec,[]);
spec[\rack][\channels]=spec[\rack][\channels]++[\mast,\fuzz,\deci,\spark,\verb].collect{|id|(id:"fx-"++id.asString,label:id.asString,returnOf:id)};spec[\irFiles]=nil;spec[\irSeconds]=[0.02,0.02,0.02];spec[\pluginCacheDirectory]=nil;
set=AWBFirstPassSet.open(spec,(server:server,track:false,controlSends:true,sampleRate:44100,sendFunction:{|msg|messages.add(msg)},onError:{|e|e.reportError;1.exit},onReady:{|ready|
 try {
  var sourceMessages, micMessage, desc, oldCount, gen, tap;
  check.value(ready.rack.channels.keys.as(Set)==[\vc,\pro2,\mic,\delbus,\b1,\a2,\b2,\a1,'fx-mast','fx-fuzz','fx-deci','fx-spark','fx-verb'].as(Set),"Thirteen rack channels contain Mic and five FX returns, no SC1/SC2");
  check.value(ready.rack.slotIDs.size==24,"Mic shares all twenty-four destinations");
  oldCount=messages.size;check.value(try{ready.connectInputs([0],[4,5],[6]);false}{true},"Invalid Mic port rejected");check.value(messages.size==oldCount,"Invalid input creates no partial source graph");
  ready.connectInputs([0],[4,5],[1]);
  sourceMessages=messages.select{|msg|msg[0]==9 and:{["VC","Pro2","Mic"].any{|suffix|msg[1].asString.endsWith(suffix)}}};
  check.value(sourceMessages.size==3,"Three hardware sources created");
  micMessage=sourceMessages.detect{|msg|msg[1].asString.endsWith("Mic")};
  check.value(micMessage[micMessage.indexOf(\channel)+1]==1 and:{micMessage[micMessage.indexOf(\out)+1]==ready.rack.inputFor(\mic).index},"Mic reads input 1 into its own rack pipe");
  desc=SynthDescLib.global.at(micMessage[1].asSymbol);check.value(desc.def.children.detect{|ugen|ugen.class==Out}.inputs.size==3,"Mono Mic is duplicated to a stereo rack pipe");
  check.value(try{ready.connectInputs([0],[4,5],[1]);false}{true},"Repeated connection cannot duplicate sources");
  oldCount=messages.count{|msg|msg[0]==11};ready.disconnectInputs;
  check.value(messages.count{|msg|msg[0]==11}==(oldCount+3),"Disconnect retires all three hardware sources");
  [\mast,\fuzz,\deci,\spark,\verb].do{|id|
   var channel=("fx-"++id.asString).asSymbol, defName, msg;
   tap=ready.rack.inputFor(channel).index;gen=ready.rack.slotAt(id)[\active];
   msg=messages.detect{|m|m[0]==9 and:{m[2]==gen[\return].nodeID}};
   check.value(msg[msg.indexOf(\tap)+1]==tap,"FX return tap "++id);
   msg=messages.detect{|m|m[0]==9 and:{m[2]==ready.rack.channelAt(channel)[\node].nodeID}};
   desc=SynthDescLib.global.at(msg[1].asSymbol);
   check.value(desc.def.children.any{|u|u.isKindOf(InFeedback)},"Feedback row reads previous block "++id);
   check.value(ready.rack.channelAt(channel)[\gains].every{|v|v==0},"Extra FX sends begin at zero "++id);
   ready.rack.setSend(channel,id,0.1);ready.rack.setSend(channel,'mod-verb',0.2);
  };
  ready.close;("AWB_INPUT_CONTRACT=PASS checks="++checks).postln;0.exit;
 }{|error|error.reportError;ready.close;1.exit};
}));
)
