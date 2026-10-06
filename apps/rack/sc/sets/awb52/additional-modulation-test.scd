// Actual KR outputs for all captured Fuzz/UM selector banks; no audio device.
(
var dir=thisProcess.nowExecutingPath.dirname,server,events=List.new,now=0.1,seq=0,emit,spec,fuzz,um,borrowed,opts,reset;
emit={|m|seq=seq+1;events.add([if(m[0]==\d_recv){0}{now},seq,m])};
server=Server(\additionalNRT,NetAddr("127.0.0.1",59994),ServerOptions.new.numOutputBusChannels_(33));
spec=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
opts=(sendFunction:emit);events.add([0.05,0,[\g_new,1,0,0]]);
try {
    var def;
    fuzz=AWBFXMixProfile(\fuzz,server.defaultGroup,server,spec[\fxMixes][\fuzz],opts);
    um=AWBFXMixProfile(\um,server.defaultGroup,server,spec[\sharedFX],opts);
    borrowed=Bus.control(server,1);emit.value(borrowed.setMsg(0));
    fuzz.addModulation(\aFuzz,\borrowedFollower,borrowed,1);
    def=SynthDef(\additionalMonitor,{|fuzzBus=0,umBus=0,input=0|Out.ar(0,K2A.ar(In.kr(fuzzBus,12)++In.kr(umBus,20)++In.kr(input,1)))});
    emit.value([\d_recv,def.asBytes]);emit.value([\s_new,def.name,9997,1,1,\fuzzBus,fuzz.outputBus.index,\umBus,um.outputBus.index,\input,borrowed.index]);
    reset={um.params.keysValuesDo{|id,param|param.set(if(id==\level){1}{0})}};
    4.do{|i|now=1+i;fuzz.param(\shape).set(i/3)};
    [\earth,\innerRate,\innerDepth,\main,\diffusion,\shape].do{|id,bank|
        4.do{|i|now=5+(bank*4)+i;reset.value;um.param(id).set((i+1)/4);if(id==\shape){[\aMix,\aDepth,\aRate].do{|key|um.param(key).set(1)}}};
    };
    now=29;reset.value;emit.value(borrowed.setMsg(0.2));fuzz.param(\shape).set(0.2);fuzz.param(\amount).set(0.1);
    um.param(\earth).set(0.5);um.param(\main).set(0.5);um.param(\shape).set(0.5);um.param(\wonk).set(0.3);
    [\aMix,\aDrive,\aNoise,\aDepth,\aRate,\aWonk].do{|id|um.param(id).set(0.4)};
    um.param(\schertlerMix).set(0.8);um.param(\aSchertler).set(0.5);
    now=30;um.param(\aMix).set(0.8,1);
    now=32;fuzz.free;um.free;
    if(fuzz.closed.not or:{um.closed.not} or:{fuzz.outputBus.index.notNil} or:{um.outputBus.index.notNil}){Error("Profile resources not released").throw};
    if(borrowed.index.isNil){Error("Freed borrowed follower bus").throw};
    emit.value(borrowed.setMsg(0.7));now=33;emit.value([\n_free,9997]);emit.value([\c_set,0,0]);
    Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,dir+/+"additional-modulation.osc");
    "AWB_ADDITIONAL_MODULATION_CONTRACT=PASS".postln;0.exit;
}{|e|e.reportError;1.exit};
)
