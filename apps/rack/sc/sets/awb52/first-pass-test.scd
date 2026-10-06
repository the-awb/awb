(
var server,events=List.new,seq=0,now=0.1,emit,spec,setup,checks=0,check,profileMode=("AWB52_VERB_PROFILES".getenv=="1");
var fxMode=("AWB52_FX_PROFILES".getenv=="1"),celloMode=("AWB52_CELLO_SCHEPS".getenv=="1");
var fuzzMode=("AWB52_FUZZ_PLUGIN".getenv=="1"),sharedMode=("AWB52_SHARED_FX".getenv=="1");
var dir=thisProcess.nowExecutingPath.dirname;
check={|label,ok|if(ok.not){Error("First-pass test failed: "++label).throw};checks=checks+1;("PASS "++label).postln};
emit={|msg|seq=seq+1;events.add([if(msg[0]==\d_recv){0}{now},seq,msg])};
server=Server(\firstPassNRT,NetAddr("127.0.0.1",59997),ServerOptions.new.numInputBusChannels_(3).numOutputBusChannels_(14).memSize_(262144).sampleRate_(44100));
events.add([0.05,0,[\g_new,1,0,0]]);
spec=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
SystemClock.sched(35,{"First-pass setup timed out".error;1.exit;nil});
setup=AWBFirstPassSet.open(spec,(server:server,controlSends:("AWB52_CONTROL_SENDS".getenv=="1"),sendFunction:emit,track:false,verbProfiles:profileMode,fxProfiles:fxMode,celloScheps:celloMode,fuzzPlugin:fuzzMode,sharedFX:sharedMode,fullLoad:(profileMode or:fxMode).not,sampleRate:44100,assetDirectory:dir+/+"irs",scheduleFunction:{|delay,action|nil},onError:{|error,set|1.exit},onReady:{|set|
    var rack=set.rack,select,mastBus,expectedReads=List.new,actualReads,vcSource;
    try {
        check.value("native ToolInstance",set.instance.tool===rack);
        check.value("ready",set.ready);check.value("two channels",rack.channels.size==2);
        check.value("five fixed FX plus three dynamic slots",rack.fxIDs.size==8);
        check.value("fixed control bank or legacy spare slots",rack.followerIDs.size==if("AWB52_CONTROL_SENDS".getenv=="1"){16}{3});
        if("AWB52_CONTROL_SENDS".getenv=="1"){
            check.value("all BaseLaunch inputs exposed",AWBControlSendProfile.baseLaunchBuses(rack).size==16);
            check.value("all shared detectors created",rack.slots.values.count{|slot|slot[\detector].notNil}==16);
        };
        check.value("nine original plugin instances",[\deci,\spiral,\upper,\lower,\delay,\tailDeci,\sparkTexture,\verbTexture,\shimmer].every{|id|set.plugin(id).notNil});
        check.value("plugin wet override or captured profile mode",set.parameterValues(\upper).clump(2).detect{|pair|pair[0]==9}[1]==if(profileMode or:fxMode){0}{1});
        check.value("plugin bypass override or captured profile mode",set.parameterValues(\sparkTexture).clump(2).detect{|pair|pair[0]==5}[1]==if(profileMode or:fxMode){set.spec[\components][\sparkTexture][\params].clump(2).detect{|pair|pair[0]==5}[1]}{0});
        check.value("source snapshot remains intact",set.spec[\components][\upper][\params].clump(2).detect{|pair|pair[0]==9}[1]==0);
        if(spec[\irFiles].notNil){
            check.value("file IR metadata covers all branches",set.irInfo.size==3);
            check.value("complete short IRs and capped long IR",set.irInfo.collect{|info|info[\frames]}==spec[\irProvenance].collect{|info|info[\usedFrames]});
            check.value("stereo IR sides retained and mono echoed on both",set.irInfo.collect{|info|info[\sourceChannels]}==[2,2,1]);
            set.irInfo.do{|info|2.do{|channel|expectedReads.add([info[\path],0,info[\frames],if(info[\sourceChannels]==1){0}{channel}])}};
            actualReads=events.select{|e|e[2][0]=="/b_allocReadChannel"}.collect{|e|e[2].copyRange(2,5)};
            check.value("file reads use correct paths, caps and stereo sides",actualReads.asArray==expectedReads.asArray);
        };
        check.value("dry is explicit Mast",rack.channels[\vc][\gains][rack.slotIDs.indexOf(\mast)]==1);
        check.value("displayed dB send conversion",(rack.channels[\vc][\gains][rack.slotIDs.indexOf(\verb)]-(-18.3).dbamp).abs<1e-7);
        check.value("invalid input width rejected",try{set.connectInputs([0,1],[1,2]);false}{true});
        check.value("invalid input index rejected",try{set.connectInputs([3],[1,2]);false}{true});
        check.value("invalid FX control rejected",try{set.setEffect(\fuzz,\wet,1);false}{true});
        check.value("invalid FX value rejected",try{set.setEffect(\deci,\wet,2);false}{true});
        set.connectInputs([0],[1,2]);check.value("valid ADC graph accepted",set.instance.ownedObjects.size>20);
        set.disconnectInputs;
        select={|destination|
            [\vc,\pro2].do{|channel|[\mast,\deci,\fuzz,\spark,\verb].do{|id|rack.setSend(channel,id,if(id==destination){1}{0})}};
        };
        [SynthDef(\awbFirstPassTestVC,{|out=0|Out.ar(out,SinOsc.ar(221)*0.03*if(celloMode){1}{[1,1]})}),
         SynthDef(\awbFirstPassTestPro2,{|out=0|Out.ar(out,SinOsc.ar([331,443])*0.025)}),
         SynthDef(\awbFirstPassTestMonitor,{|vc=0,pro2=0,deci=0,fuzz=0,spark=0,verb=0|Out.ar(2,In.ar(vc,2));Out.ar(4,In.ar(pro2,2));Out.ar(6,In.ar(deci,2));Out.ar(8,In.ar(fuzz,2));Out.ar(10,In.ar(spark,2));Out.ar(12,In.ar(verb,2))})].do{|def|rack.installDef(def.name,def)};
        now=0.1;select.value(\mast);now=1;
        vcSource=rack.synth(\awbFirstPassTestVC,[\out,(set.celloInputBus ? rack.inputFor(\vc)).index],set.celloSourceGroup ? rack.sourceGroup,"Test VC");
        if(celloMode){emit.value(vcSource.moveBeforeMsg(set.plugin(\celloScheps).synth))};
        rack.synth(\awbFirstPassTestPro2,[\out,rack.inputFor(\pro2).index],rack.sourceGroup,"Test Pro 2");
        emit.value([\g_new,9999,1,1]);emit.value([\s_new,\awbFirstPassTestMonitor,9998,1,9999,\vc,rack.postFor(\vc).index,\pro2,rack.postFor(\pro2).index,\deci,rack.slots[\deci][\active][\output].index,\fuzz,rack.slots[\fuzz][\active][\output].index,\spark,rack.slots[\spark][\active][\output].index,\verb,rack.slots[\verb][\active][\output].index]);
        if(celloMode){
            check.value("Scheps has one input and duplicated mono output",set.celloInputBus.numChannels==1 and:{set.plugin(\celloScheps).notNil});
            check.value("all eighteen Scheps baseline settings retained",set.parameterValues(\celloScheps).size==36);
            check.value("verified middle frequency selector",(set.parameterValues(\celloScheps).clump(2).detect{|pair|pair[0]==6}[1]-(1/3)).abs<1e-6);
            check.value("Scheps uses separate host mode",set.spec[\components][\celloScheps][\mode]=="sandbox");
        };
        if(fxMode){
            check.value("independent Deci and Sparkle profiles",set.fxMix(\deci)!==set.fxMix(\spark));
            check.value("Deci sine base rate and zero depth",set.fxMix(\deci).param(\lfoRate).baseTarget==0.04 and:{set.fxMix(\deci).param(\lfoAmount).baseTarget==0});
            check.value("Sparkle has no LFO control",set.fxMix(\spark).params[\lfoRate].isNil);
            check.value("plugin KR mapping commands emitted",events.count{|e|e[2].includesEqual('/map')}>=6);
            set.fxMix(\deci).param(\shape).setBase(0.5,0.5);set.fxMix(\deci).param(\a).setBase(0.6,0.5);
            set.fxMix(\spark).param(\tailMix).setBase(0.5,0.5);set.fxMix(\spark).param(\shape).setBase(0.5,0.5);
            [\aSpark,\aShape,\aPitch,\aTailShape].do{|id|set.fxMix(\spark).param(id).setBase(0.5,0.5)};
        };
        if(fuzzMode){
            check.value("restored actual Fuzz controller",set.plugin(\fuzz).notNil);
            check.value("twenty verified Fuzz baseline settings",set.parameterValues(\fuzz).size==40);
            check.value("Fuzz -5dB container distinct from plugin gain",spec[\fxMixes][\fuzz][\gainDb]== -5);
            check.value("Fuzz profile output is independent",set.fxMix(\fuzz)!==set.fxMix(\deci));
            set.fxMix(\fuzz).param(\shape).set(0.5,0.5);set.fxMix(\fuzz).param(\aFuzz).set(0.4,0.5);
        };
        if(sharedMode){
            check.value("shared processing is a native Chain Tool",set.sharedChain.instance.tool===set.sharedChain.chain);
            check.value("shared Chain ready",set.sharedChain.ready);
            check.value("UM and stereo Scheps controllers",set.plugin(\um).notNil and:{set.plugin(\stereoScheps).notNil});
            check.value("31 stereo baseline settings",set.parameterValues(\stereoScheps).size==62);
            check.value("selected FX returns enter shared pipe",[\mast,\fuzz,\deci,\spark].every{|id|rack.returnDestinationFor(id)===set.sharedInputBus});
            check.value("Verb bypasses shared pipe",rack.returnDestinationFor(\verb)===rack.masterBus);
            check.value("reserved dynamic slots retain direct return",rack.returnDestinationFor(\fx1)===rack.masterBus);
            check.value("control-rate bus cannot become FX return",try{rack.setReturnDestination(\mast,set.sharedMix.outputBus);false}{true});
        };
        if(sharedMode){now=2.4;set.sharedMix.param(\level).set(0);now=2.8;set.sharedMix.param(\level).set(1)};
        now=3;select.value(\deci);
        if(sharedMode){
            set.sharedMix.param(\mix).set(0.6);set.sharedMix.param(\main).set(0.5);
            set.sharedMix.param(\schertlerMix).set(0.8);set.sharedMix.param(\aSchertler).set(0.5);
        };
        now=6;select.value(\fuzz);
        now=9;select.value(\spark);
        now=12;select.value(\verb);
        if(profileMode){
            var branches=[\earth,\composite,\texture,\shimmer,\echo],gates=branches.collect{|id|set.verbBranch(id)};
            set.verbMix.selector.setBase(0.5,1);check.value("native Verb profile active",set.verbMix.branches.size==5);
            check.value("five independent processor Groups",gates.collect(_.processorGroup).as(IdentitySet).size==5);
            check.value("guards stay outside paused processor Groups",gates.every{|gate|gate.ingress.group===gate.group and:{gate.returnNode.group===gate.group}});
            check.value("Texture plugin belongs to its processor Group",set.plugin(\verbTexture).synth.group===set.verbBranch(\texture).processorGroup);
            check.value("Shimmer plugin belongs to its processor Group",set.plugin(\shimmer).synth.group===set.verbBranch(\shimmer).processorGroup);
            check.value("convolution tails cover every complete used IR",[\earth,\composite,\echo].collect{|id|set.verbBranch(id).configuration[\minTail]}.every{|duration,i|duration>=(set.irInfo[i][\frames]/44100)});
            check.value("no forced tail truncation by default",gates.every{|gate|gate.configuration[\maxTail]==0});
        };
        if(sharedMode){now=13;set.sharedMix.param(\level).set(0);now=15.5;set.sharedMix.param(\level).set(1)};
        now=16;select.value(\mast);rack.setMute(\vc,true);
        now=18;rack.setMute(\vc,false);rack.setSolo(\vc,true);
        now=20;rack.setSolo(\vc,false);select.value(\deci);
        mastBus=rack.destinationFor(\deci).index;
        now=22;
        if(fxMode){var old=set.fxMix(\deci);rack.setFX(\deci,\awb52_deci,(fade:0.02,tail:0));check.value("replacement gets independent FX profile",old!==set.fxMix(\deci))}{rack.setFX(\deci,\awb52_deci,(fade:0.02,tail:0))};
        if(sharedMode){check.value("replacement preserves shared return route",rack.returnDestinationFor(\deci)===set.sharedInputBus)};
        check.value("FX replacement preserves destination",rack.destinationFor(\deci).index==mastBus);
        now=24;select.value(\mast);
        if(profileMode){
            var gen,clone,cloneGates;
            now=24.5;gen=rack.setFX(\fx1,\awb52_verb,(fade:0,tail:0));clone=set.verbMix(\fx1);
            cloneGates=[\earth,\composite,\texture,\shimmer,\echo].collect{|id|set.verbBranch(id,\fx1)};
            check.value("dynamic clone has independent profile",clone!==set.verbMix);
            rack.clearFX(\fx1,0,0);rack.disposeGeneration(gen);
            check.value("generation disposal closes profile and its buses",clone.closed and:{clone.select.outputBus.index.isNil});
            check.value("generation disposal closes all branch gates and owned buses",cloneGates.every{|gate|gate.closed and:{gate.inputBus.index.isNil} and:{gate.outputBus.index.isNil} and:{gate.stateBus.index.isNil} and:{gate.measurementBus.index.isNil}});
            check.value("generation disposal preserves main Verb profile",set.verbMix.closed.not);
            check.value("generation disposal preserves main Verb gates",[\earth,\composite,\texture,\shimmer,\echo].every{|id|set.verbBranch(id).closed.not});
        };
        if(sharedMode){now=25.2;set.sharedChain.close;check.value("closing shared Chain restores direct returns",[\mast,\fuzz,\deci,\spark].every{|id|rack.returnDestinationFor(id)===rack.masterBus})};
        now=26;set.close;
        if(sharedMode){check.value("shared Chain closes with rack",set.sharedChain.closed and:{set.sharedMix.closed})};emit.value([\n_free,9999]);
        check.value("close reaches native ToolInstance",set.closed and:{set.instance.status==\closed});
        now=27;emit.value([\c_set,0,0]);
        Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,dir+/+"first-pass.osc");
        ("AWB_FIRSTPASS_CONTRACT=PASS count="++checks).postln;0.exit;
    }{|error|error.reportError;set.close;1.exit};
}));
)
