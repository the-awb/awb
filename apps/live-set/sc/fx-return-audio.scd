// Non-real-time render; never opens the hardware device.
(
var server, rack, instance, score=List.new, at=0.0, source, observer;
try {
 server=AWBCoreTestServer(\returnRender,NetAddr("127.0.0.1",59993));
 server.options.numInputBusChannels=0;server.options.numOutputBusChannels=4;
 score.add([0.0,[\g_new,1,0,0]]);
 instance=AWBSendRackTool.open((width:2,channels:[\input,(id:'fx-a',returnOf:\a),(id:'fx-b',returnOf:\b)],fixedFX:[\a,\b],dynamicFX:0,fixedFollowers:[\env],spareFollowers:0,cleanSlot:false,fade:0,tail:0,masterLimit:false),
  (server:server,track:false,scheduleFunction:{|delay,action|var saved=at;at=at+delay+0.01;action.value;at=saved},sendFunction:{|msg|score.add([at,msg])}));rack=instance.tool;
 rack.installDef(\testSource,SynthDef(\returnTestSource,{|out=0|Out.ar(out,DC.ar(0.1)!2)}));
 rack.installDef(\testObserver,SynthDef(\returnTestObserver,{|bus=0,post=0|Out.ar(2,K2A.ar(In.kr(bus)));Out.ar(3,In.ar(post,1))}));
 at=0.1;source=rack.synth(\returnTestSource,[\out,rack.inputFor(\input).index],rack.sourceGroup,"Test source");
 rack.setSend(\input,\a,1);rack.setFX(\a,\pass,(limiter:false));rack.setFX(\b,\pass,(limiter:false));
 rack.setDetector(\env,(rise:0.00562,fall:0.0234,gainDb:0));
 observer=rack.synth(\returnTestObserver,[\bus,rack.measurementFor(\env).index,\post,rack.postFor('fx-a').index],rack.masterGroup,"Detector capture");
 at=1; rack.setSend('fx-a',\a,0.5);
 at=2; rack.setSend('fx-a',\b,0.25);rack.setSend('fx-a',\env,0.3);
 at=3; rack.setFX(\a,\pass,(limiter:false));
 at=4; rack.clearFX(\a,0,0);
 at=5; score.add([at,[\c_set,0,0]]);
 Score(score.asArray).write("/private/tmp/awb-fx-return.osc");
 "AWB_FX_RETURN_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
