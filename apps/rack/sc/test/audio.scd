(
var rack,instance,server,events=List.new,timers=List.new,now=0.1,seq=0,emit,advance,def,dir;
dir=thisProcess.nowExecutingPath.dirname;
emit={|msg|seq=seq+1;events.add([if(msg[0]==\d_recv){0}{now},seq,msg])};
advance={|time|
    while{timers.notEmpty and:{timers.collect(_[0]).minItem<=time}}{
        var next=timers.sort{|a,b|a[0]<b[0]}.removeAt(0);
        now=next[0];next[1].value;
    };now=time;
};
try {
    server=Server(\rackAudio,NetAddr("127.0.0.1",59998),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(8));
    events.add([0.05,0,[\g_new,1,0,0]]);
    instance=AWBSendRackTool.open((width:1,channels:[\a,\b],fixedFX:[\mast],dynamicFX:1,fixedFollowers:[\env],spareFollowers:0,masterLimit:false,tail:0.4),
        (server:server,sendFunction:emit,scheduleFunction:{|delay,action|timers.add([now+delay,action])},track:false));
    rack=instance.tool;
    [SynthDef(\rackAudioSource,{|out=0,amp=0.1|Out.ar(out,DC.ar(amp))}),
     SynthDef(\rackAudioEcho,{|in=0,out=0|Out.ar(out,DelayN.ar(In.ar(in,1),0.3,0.2))}),
     SynthDef(\rackAudioMonitor,{|a=0,b=0,env=0|Out.ar(1,[In.ar(a,1),In.ar(b,1),K2A.ar(In.kr(env,1))])})].do{|d|emit.value([\d_recv,d.asBytes])};
    rack.registerProcessor(\echo,{|ctx|ctx[\synth].value(\rackAudioEcho,[\in,ctx[\input].index,\out,ctx[\output].index])});
    rack.prepareVoice(\grain,{|amp=0.4|DC.ar(amp)*EnvGen.ar(Env.linen(0.002,0.1,0.002),doneAction:2)});
    rack.prepareVariant(\grain,[\mast]);
    advance.value(0.2);
    rack.synth(\rackAudioSource,[\out,rack.inputFor(\a).index,\amp,0.1],rack.sourceGroup,"A source");
    rack.synth(\rackAudioSource,[\out,rack.inputFor(\b).index,\amp,0.2],rack.sourceGroup,"B source");
    emit.value([\g_new,9999,1,1]);
    emit.value([\s_new,\rackAudioMonitor,9998,1,9999,\a,rack.postFor(\a).index,\b,rack.postFor(\b).index,\env,rack.controlFor(\env).index]);
    rack.setSend(\a,\env,1);rack.setFollower(\env,(curve:\linear,attack:0.01,release:0.02));
    advance.value(0.4);rack.setSend(\a,\mast,1);rack.setSend(\b,\mast,1);
    advance.value(0.7);rack.setLevel(\a,0.5);rack.setSend(\a,\fx1,0.5);
    advance.value(1.0);rack.setMute(\a,true);
    advance.value(1.3);rack.setMute(\a,false);rack.setSolo(\b,true);
    advance.value(1.8);rack.setSolo(\a,true);rack.setSolo(\b,false);
    advance.value(2.1);rack.setSolo(\a,false);
    advance.value(2.4);rack.setFollower(\env,(curve:\log,attack:0.01,release:0.02,floorDb: -60));
    advance.value(2.7);rack.clearFollower(\env);
    advance.value(3.0);rack.setFX(\fx1,\pass,(limiter:false));
    advance.value(3.3);rack.setFX(\fx1,\echo,(limiter:false));
    advance.value(3.6);rack.clearFX(\fx1);
    advance.value(4.1);rack.setFX(\fx1,\pass,(limiter:false));
    advance.value(4.3);rack.playVoice(\grain,(mast:0.5),[\amp,0.4],[\mast]);
    advance.value(4.6);rack.setLevel(\b,0.25);
    advance.value(4.65);rack.playVoice(\grain,(mast:0.5),[\amp,0.4],[\mast],(mast:rack.inputFor(\b)));
    advance.value(4.9);instance.close;
    advance.value(5.2);emit.value([\n_free,9999]);
    events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};
    Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"audio.osc");
    "AWB_RACK_AUDIO_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
