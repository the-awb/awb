(
var rack,instance,server,events=List.new,now=0.1,seq=0,emit,dir,source,negative,monitor;
dir=thisProcess.nowExecutingPath.dirname;
emit={|msg|seq=seq+1;events.add([if(msg[0]==\d_recv){0}{now},seq,msg])};
try {
    server=Server(\controlSendAudio,NetAddr("127.0.0.1",59998),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(8));
    events.add([0.05,0,[\g_new,1,0,0]]);
    instance=AWBSendRackTool.open((width:1,channels:[\a,\b],fixedFX:[\mast],dynamicFX:0,fixedFollowers:[\c1],spareFollowers:0,masterLimit:false,fade:0),
        (server:server,sendFunction:emit,track:false));rack=instance.tool;
    [SynthDef(\controlSource,{|out=0,amp=0.1|Out.ar(out,DC.ar(1)*amp)}),
     SynthDef(\controlMonitor,{|raw=0,short=0,long=0|
         var input=In.kr(raw,1),reference=EnvDetect3.kr(input,0.02,0.1);
         Out.ar(1,K2A.ar([input,In.kr(short,1),In.kr(long,1),reference]));
     })].do{|def|emit.value([\d_recv,def.asBytes])};
    rack.setDetector(\c1);
    rack.setControlFollower(\c1,\short,(attack:0.02,release:0.1,blend:1));
    rack.setControlFollower(\c1,\long,(attack:0.5,release:0.8,blend:1));
    rack.setSend(\a,\c1,1);rack.setSend(\b,\c1,1);
    source=nil;
    emit.value([\g_new,9999,1,1]);
    emit.value([\s_new,\controlMonitor,9998,1,9999,\raw,rack.measurementFor(\c1).index,\short,rack.followerFor(\c1,\short).index,\long,rack.followerFor(\c1,\long).index]);
    now=0.2;source=rack.synth(\controlSource,[\out,rack.inputFor(\a).index],rack.sourceGroup,"positive");
    now=0.8;negative=rack.synth(\controlSource,[\out,rack.inputFor(\b).index,\amp,-0.1],rack.sourceGroup,"negative");
    now=1.2;emit.value(negative.freeMsg);
    now=1.6;emit.value(source.setMsg(\amp,0));
    now=1.9;emit.value(source.setMsg(\amp,0.1));
    now=2.0;rack.setControlAmount(\c1,0);
    now=2.4;rack.setControlAmount(\c1,0.5);
    now=2.8;rack.clearControlFollower(\c1,\short);
    now=3.0;rack.setControlFollower(\c1,\short);
    now=3.4;instance.close;
    now=3.6;emit.value([\n_free,9999]);
    events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};
    Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"control-sends.osc");
    "AWB_CONTROL_SEND_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
