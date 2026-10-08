// Real rack return DSP and AWParam mappings; offline, no hardware audio.
(
var out="AWB_FADER_OUT".getenv,server,instance,rack,a,b,mast,p,verb,hub,verbBus,definition,source;
var events=List.new,scheduled=List.new,seq=0,now=0.1,emit,checks=0,check,before;
emit={|m|seq=seq+1;events.add([if(m[0]==\d_recv){0}{now},seq,m])};
check={|ok,label|if(ok.not){Error(label).throw};checks=checks+1;("PASS "++label).postln};
server=Server(\fxFadersNRT,NetAddr("127.0.0.1",59995),ServerOptions.new.numOutputBusChannels_(6));
events.add([0.05,0,[\g_new,1,0,0]]);
try {
    instance=AWBSendRackTool.open((channels:[\vc,(id:'fx-a',returnOf:\a),(id:'fx-b',returnOf:\b),(id:'fx-mast',returnOf:\mast)],
        fixedFX:[\a,\b,\mast],dynamicFX:0,fixedFollowers:[\env],spareFollowers:0,maxGain:1,masterLimit:false,fade:0),
        (server:server,track:false,sendFunction:emit,scheduleFunction:{|delay,action|scheduled.add(action)}));rack=instance.tool;
    a=Bus.audio(server,2);b=Bus.audio(server,2);mast=Bus.audio(server,2);verbBus=Bus.audio(server,2);
    rack.setReturnDestination(\a,a);rack.setReturnDestination(\b,b);rack.setReturnDestination(\mast,mast);
    rack.setFX(\a,\pass,(fade:0,limiter:false));rack.setFX(\b,\pass,(fade:0,limiter:false));
    // Replace the default clean return with the same un-limited probe processor.
    rack.setFX(\mast,\pass,(fade:0,limiter:false));scheduled.clear;
    [\a,\b,\mast].do{|id|rack.setSend(\vc,id,1)};rack.setSend('fx-a',\env,1);
    source=SynthDef(\awbFaderSource,{|out=0|Out.ar(out,DC.ar(0.1)!2)});emit.value([\d_recv,source.asBytes]);
    emit.value([\s_new,source.name,9900,0,rack.sourceGroup.nodeID,\out,rack.inputFor(\vc).index]);
    verb=AWBVerbMixProfile(rack.sourceGroup,server,(sendFunction:emit));
    definition=SynthDef(\awbVerbInputGainProbe,{|out=0,inputLevel=1|Out.ar(out,DC.ar(0.1)!2*Lag.kr(inputLevel,0.02))});
    emit.value([\d_recv,definition.asBytes]);hub=Synth.basicNew(definition.name,server);
    emit.value(hub.newMsg(rack.sourceGroup,[\out,verbBus.index],\addToTail));verb.inputGain.mapTo(hub,\inputLevel);
    check.value(verb.inputGain.spec.minval==0 and:{verb.inputGain.spec.maxval==1},"Verb gain uses 0..1");
    check.value(verb.configuration[\inputGain]==1,"Verb gain persists in profile configuration");
    definition=SynthDef(\awbFaderMonitor,{|a=0,b=0,mast=0,post=0,send=0,verb=0|
        Out.ar(0,[a,b,mast,post,send,verb].collect{|bus|In.ar(bus,2)[0]})});emit.value([\d_recv,definition.asBytes]);
    emit.value([\s_new,definition.name,9901,1,rack.masterGroup.nodeID,\a,a.index,\b,b.index,\mast,mast.index,\post,rack.postFor('fx-a').index,\send,rack.slotAt(\env)[\bus].index,\verb,verbBus.index]);
    now=1;rack.setLevel('fx-a',0.5);verb.inputGain.set(0.5);
    now=2;rack.setMute('fx-a',true);verb.inputGain.set(0);
    now=3;rack.setMute('fx-a',false);rack.setSolo('fx-a',true);verb.inputGain.set(1);
    now=4;rack.setSend('fx-b',\a,0.5);
    now=5;rack.setSolo('fx-a',false);rack.setSend('fx-b',\a,0);rack.setLevel('fx-a',1);rack.setMute(\vc,true);
    now=6;rack.setMute(\vc,false);p=AWParam(\fxLevel,0.4,nil,0,0,rack.sourceGroup,server,(sendFunction:emit));rack.bindLevelParam('fx-a',p);

    now=7;p.set(0.6);
    now=8;rack.unbindLevelParam('fx-a');
    now=9;rack.bindLevelParam('fx-a',p);rack.setFX(\a,\pass,(fade:0,tail:1,limiter:false));p.set(0.2);

    now=10;scheduled.do{|action|action.value};
    now=11;rack.setMute('fx-a',true);rack.setFX(\a,\pass,(fade:0,tail:1,limiter:false));
    now=12;rack.setMute('fx-a',false);rack.setSolo('fx-b',true);rack.setFX(\a,\pass,(fade:0,tail:1,limiter:false));
    now=13;rack.unbindLevelParam('fx-a');before=events.size;p.free;check.value(events.copyRange(before,events.size-1).any{|e|e[2][0]==\n_map}.not,"retirement and unbinding release borrowed parameter mappings");verb.free;instance.close;
    now=13.1;emit.value([\c_set,0,0]);
    Score.write(events.sort{|x,y|if(x[0]==y[0]){x[1]<y[1]}{x[0]<y[0]}}.collect{|e|[e[0],e[2]]}.asArray,out+/+"fx-faders.osc");
    ("AWB_FX_FADER_SCORE=PASS checks="++checks).postln;0.exit;
}{|e|e.reportError;1.exit};
)
