(
var dir=thisProcess.nowExecutingPath.dirname,server,events=List.new,serial=0,now=0.1,emit,check,checks=0;
var source,destination,secondDestination,mixBus,modBus,counter,secondCounter,param,gate,second,monitor,owned=IdentitySet.new,opts,buses;
check={|label,ok|if(ok.not){Error("Tail test: "++label).throw};checks=checks+1;("PASS "++label).postln};
emit={|msg|serial=serial+1;events.add([if(msg[0]==\d_recv){0}{now},serial,msg])};
try {
    server=Server(\tailNRT,NetAddr("127.0.0.1",59995),ServerOptions.new.numOutputBusChannels_(8).numInputBusChannels_(0));
    check.value("no hard cap by default",AWFXTailGate.settings[\maxTail]==0);
    check.value("unsafe cap before minimum rejected",try{AWFXTailGate.settings((minTail:1,maxTail:0.5));false}{true});
    check.value("non-finite tail rejected",try{AWFXTailGate.settings((minTail:inf));false}{true});
    check.value("invalid quiet setting rejected",try{AWFXTailGate.settings((quietDb: -5));false}{true});
    source=Bus.audio(server,2);destination=Bus.new(\audio,0,2,server);secondDestination=Bus.audio(server,2);
    mixBus=Bus.control(server);modBus=Bus.control(server);counter=Bus.control(server);secondCounter=Bus.control(server);
    opts=(sendFunction:emit,ownFunction:{|n|owned.add(n)},disownFunction:{|n|owned.remove(n)});
    now=0.05;emit.value([\g_new,1,0,0]);now=0.1;
    [AWParam.synthDef,AWParam.routeDef,SynthDef(\tailSource,{|out|Out.ar(out,DC.ar(0.1)!2)}),
     SynthDef(\tailDelay,{|in,out,counter|Out.ar(out,DelayN.ar(In.ar(in,2),0.3,0.15));ReplaceOut.kr(counter,Sweep.kr(0,1))}),
     SynthDef(\tailInfinite,{|out,counter|Out.ar(out,DC.ar(0.1)!2);ReplaceOut.kr(counter,Sweep.kr(0,1))}),
     SynthDef(\tailMonitor,{|state,secondState,counter,secondCounter,secondOut|
        Out.ar(2,K2A.ar([In.kr(state+1),In.kr(state+2),In.kr(counter),In.kr(secondState+1),In.kr(secondCounter)])++[In.ar(secondOut)]);
     })].do{|def|emit.value([\d_recv,def.asBytes]);SynthDescLib.global.add(def.asSynthDesc)};
    emit.value([\c_set,mixBus.index,0,modBus.index,0.5,counter.index,0,secondCounter.index,0]);
    emit.value([\s_new,\tailSource,99001,1,1,\out,source.index]);
    param=AWParam(\tailMix,0.5,\unipolar,0,0,server.defaultGroup,server,opts);
    gate=AWFXTailGate(source,param.outputBus,destination,server.defaultGroup,(minTail:0.3,quietHold:0.05,fade:0.01),opts);
    gate.createProcessor(\tailDelay,[\counter,counter.index]);
    second=AWFXTailGate(source,mixBus,secondDestination,server.defaultGroup,(minTail:0.05,maxTail:0.2,quietHold:0.05,fade:0.01),opts);
    second.createProcessor(\tailInfinite,[\counter,secondCounter.index]);
    check.value("routing override rejected",try{gate.createProcessor(\tailDelay,[\out,0]);false}{true});
    check.value("odd processor arguments rejected",try{gate.createProcessor(\tailDelay,[\counter]);false}{true});
    check.value("five nodes owned per branch",owned.size==13); // 2*(root,FX group,ingress,return,FX) + Param's 3
    check.value("processor sits inside independent Group",gate.processorGroup.group===gate.group);
    check.value("guard precedes processor",gate.ingress.group===gate.group and:{gate.returnNode.group===gate.group});
    check.value("borrowed mix remains allocated",param.outputBus.index.notNil);
    buses=[gate.inputBus,gate.outputBus,gate.stateBus,gate.measurementBus,second.inputBus,second.outputBus,second.stateBus,second.measurementBus];
    monitor=Synth.basicNew(\tailMonitor,server);emit.value(monitor.newMsg(server.defaultGroup,[\state,gate.stateBus.index,\secondState,second.stateBus.index,\counter,counter.index,\secondCounter,secondCounter.index,\secondOut,secondDestination.index],\addToTail));
    now=0.3;emit.value([\c_set,mixBus.index,0.5]);
    param.baseSmoothing=0;
    now=0.5;param.setBase(0,0.1);
    now=0.6;emit.value([\c_set,mixBus.index,0]);
    now=1.2;param.setBase(0.5,0);
    now=1.6;param.setBase(0,0);
    now=1.75;param.setBase(0.5,0); // cancel drain before suspension
    now=2.1;param.setBase(0,0);param.setAmount(1);param.addModulation(\serverMix,modBus);
    now=2.4;emit.value([\c_set,modBus.index,0]);
    now=3.2;emit.value([\c_set,modBus.index,0.5]);
    now=3.6;gate.free;second.free;
    check.value("branch buses released",buses.every{|b|b.index.isNil});
    check.value("borrowed Param survives branch closure",param.closed.not and:{param.outputBus.index.notNil});
    check.value("source and destination remain borrowed",source.index.notNil and:{secondDestination.index.notNil} and:{modBus.index.notNil});
    param.free;check.value("owned node registry empty",owned.isEmpty);
    gate.free;second.free;check.value("close is idempotent",owned.isEmpty);
    emit.value(monitor.freeMsg);emit.value([\n_free,99001]);[source,secondDestination,mixBus,modBus,counter,secondCounter].do(_.free);
    now=3.8;emit.value([0]);
    Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,dir+/+"tail.osc");
    ("AWB_TAIL_CONTRACT=PASS count="++checks).postln;0.exit;
}{|error|error.reportError;1.exit};
)
