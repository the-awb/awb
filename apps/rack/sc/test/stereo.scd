(
var instance,rack,server,events=List.new,now=0.1,seq=0,emit,dir;
dir=thisProcess.nowExecutingPath.dirname;
emit={|msg|seq=seq+1;events.add([if(msg[0]==\d_recv){0}{now},seq,msg])};
try {
    server=Server(\rackStereo,NetAddr("127.0.0.1",59998),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(8));
    events.add([0.05,0,[\g_new,1,0,0]]);
    instance=AWBSendRackTool.open((width:2,channels:[\a],fixedFX:[\mast],dynamicFX:0,fixedFollowers:[],spareFollowers:0,masterLimit:true),
        (server:server,sendFunction:emit,track:false));rack=instance.tool;
    rack.prepareVoice(\stereo,{|amp=1|DC.ar([0.2,0.4])*amp*EnvGen.ar(Env.linen(0.002,0.3,0.002),doneAction:2)});
    now=0.2;rack.playVoice(\stereo,(mast:0.5));
    now=0.6;rack.playVoice(\stereo,(mast:1),[\amp,10]);
    now=1.1;instance.close;
    now=1.3;emit.value([\c_set,0,0]);
    events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};
    Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"stereo.osc");
    "AWB_RACK_STEREO_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
