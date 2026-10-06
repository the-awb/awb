(
var dir=thisProcess.nowExecutingPath.dirname,server,events=List.new,serial=0,now=0.1,emit,mix,monitor,borrowed,check,checks=0,owned=IdentitySet.new,config,buses,ids;
check={|label,ok|if(ok.not){Error("Select test: "++label).throw};checks=checks+1;("PASS "++label).postln};
emit={|msg|serial=serial+1;events.add([if(msg[0]==\d_recv){0}{now},serial,msg])};
try {
    server=Server(\selectNRT,NetAddr("127.0.0.1",59996),ServerOptions.new.numOutputBusChannels_(8).numInputBusChannels_(0));
    check.value("baseline at zero",AWSelectN.weightsAt(0,4,true)==[0,0,0,0]);
    check.value("S1 pole",AWSelectN.weightsAt(0.25,4,true)==[1,0,0,0]);
    check.value("S4 pole",AWSelectN.weightsAt(1,4,true)==[0,0,0,1]);
    check.value("between adjacent poles",AWSelectN.weightsAt(0.375,4,true)==[0.5,0.5,0,0]);
    check.value("four-pole alternative starts at S1",AWSelectN.weightsAt(0,4,false)==[1,0,0,0]);
    check.value("eight poles reusable",AWSelectN.weightsAt(0.5,8,true)==[0,0,0,1,0,0,0,0]);
    check.value("invalid selector width rejected",try{AWSelectN.weightsAt(0,1);false}{true});
    check.value("NaN rejected",try{AWSelectN.weightsAt(0/0);false}{true});
    check.value("invalid profile dimensions rejected",try{AWBVerbMixProfile.validateProfiles([[1]]);false}{true});
    check.value("invalid profile depth rejected",try{AWBVerbMixProfile.validateProfiles([[9,0,0,0,0]]!4);false}{true});
    check.value("0.5 Tool Vol is unity",AWBVerbMixProfile.amplitude(0.5)==1);
    check.value("Tool taper matches -33.2 dB capture",(AWBVerbMixProfile.amplitude(0.14).ampdb-(-33.2)).abs<0.05);
    now=0.05;emit.value([\g_new,1,0,0]);now=0.1;
    mix=AWBVerbMixProfile(server.defaultGroup,server,(sendFunction:emit,
        ownFunction:{|n|owned.add(n)},disownFunction:{|n|owned.remove(n)}));
    check.value("six AWParams plus selector nodes share ownership",owned.size==41);
    check.value("native baseline controls",mix.valuesAt(0)==AWBVerbMixProfile.defaultBases);
    check.value("depths apply to base and clip",mix.valuesAt(0.25)==[0.525,0.78,0,0,0.4]);
    check.value("interpolation in normalized space",(mix.valuesAt(0.375)-[0.075,0.89,0.225,0.05,0.355]).abs.maxItem<1e-6);
    config=mix.configuration;config[\profiles][0][0]=7;
    check.value("configuration does not mutate live data",mix.configuration[\profiles][0][0]==0.03);
    check.value("profile invalid index rejected",try{mix.setProfile(4,[0,0,0,0,0]);false}{true});
    check.value("profile edit validation before sending",try{mix.setProfile(0,[0,0]);false}{true});
    ids=AWBVerbMixProfile.branchIDs;
    buses=ids.collect{|id|mix.branch(id).outputBus}++[mix.selector.outputBus,mix.selector.inputBus,mix.select.outputBus];
    {var def=SynthDef(\selectMonitor,{|earthVolume=0,compositeVolume=0,textureVolume=0,shimmerVolume=0,echoVolume=0,position=0|
        var volumes=[earthVolume,compositeVolume,textureVolume,shimmerVolume,echoVolume],gain=AWBVerbMixProfile.amplitude(earthVolume);
        Out.ar(0,K2A.ar(volumes++[position])++[DelayN.ar(K2A.ar(gain),0.4,0.3),(K2A.ar(AWBVerbMixProfile.amplitude(textureVolume))*0.2).tanh]);
    });emit.value([\d_recv,def.asBytes]);SynthDescLib.global.add(def.asSynthDesc)}.value;
    monitor=Synth.basicNew(\selectMonitor,server);emit.value(monitor.newMsg(server.defaultGroup,[],\addToTail));mix.bindTo(monitor);mix.selector.mapTo(monitor,\position);
    now=0.4;mix.selector.setBase(0.25);
    now=0.8;mix.selector.setBase(0.375);
    now=1.2;mix.selector.setBase(0.5);
    now=1.6;mix.selector.setBase(0.75);
    now=2.0;mix.selector.setBase(1);
    now=2.4;mix.setProfile(3,[0,0,0,0,0]);
    now=2.8;mix.selector.setBase(0);mix.selector.setAmount(0.5);
    borrowed=Bus.control(server,1);emit.value([\c_set,borrowed.index,0.5]);mix.addModulation(\unchangedBlender,borrowed);
    now=3.2;mix.selector.removeModulation(\unchangedBlender);
    check.value("upstream bus remains borrowed",borrowed.index.notNil);
    now=3.4;mix.selector.setBase(0.5,0.4);
    now=4.0;mix.free;emit.value(monitor.freeMsg);
    check.value("all profile nodes disowned",owned.isEmpty);
    check.value("all profile buses released",buses.every{|b|b.index.isNil});
    check.value("upstream bus survives profile close",borrowed.index.notNil);borrowed.free;
    mix.free;check.value("free is idempotent",owned.isEmpty);
    check.value("closed edits rejected",try{mix.setProfile(0,[0,0,0,0,0]);false}{true});
    now=4.2;emit.value([0]);
    Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,dir+/+"select.osc");
    ("AWB_SELECT_CONTRACT=PASS count="++checks).postln;0.exit;
}{|error|error.reportError;1.exit};
)
