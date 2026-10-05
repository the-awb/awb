(
var server,events=List.new,seq=0,now=0.1,emit,spec,setup,checks=0,check;
var dir=thisProcess.nowExecutingPath.dirname;
check={|label,ok|if(ok.not){Error("First-pass test failed: "++label).throw};checks=checks+1;("PASS "++label).postln};
emit={|msg|seq=seq+1;events.add([if(msg[0]==\d_recv){0}{now},seq,msg])};
server=Server(\firstPassNRT,NetAddr("127.0.0.1",59997),ServerOptions.new.numInputBusChannels_(3).numOutputBusChannels_(14).memSize_(262144).sampleRate_(44100));
events.add([0.05,0,[\g_new,1,0,0]]);
spec=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
SystemClock.sched(35,{"First-pass setup timed out".error;1.exit;nil});
setup=AWBFirstPassSet.open(spec,(server:server,controlSends:("AWB52_CONTROL_SENDS".getenv=="1"),sendFunction:emit,track:false,fullLoad:true,sampleRate:44100,assetDirectory:dir+/+"irs",scheduleFunction:{|delay,action|nil},onError:{|error,set|1.exit},onReady:{|set|
    var rack=set.rack,select,mastBus,expectedReads=List.new,actualReads;
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
        check.value("full-load wet override",set.parameterValues(\upper).clump(2).detect{|pair|pair[0]==9}[1]==1);
        check.value("full-load plugin bypass disabled",set.parameterValues(\sparkTexture).clump(2).detect{|pair|pair[0]==5}[1]==0);
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
        [SynthDef(\awbFirstPassTestVC,{|out=0|Out.ar(out,SinOsc.ar(221)*0.03!2)}),
         SynthDef(\awbFirstPassTestPro2,{|out=0|Out.ar(out,SinOsc.ar([331,443])*0.025)}),
         SynthDef(\awbFirstPassTestMonitor,{|vc=0,pro2=0,deci=0,fuzz=0,spark=0,verb=0|Out.ar(2,In.ar(vc,2));Out.ar(4,In.ar(pro2,2));Out.ar(6,In.ar(deci,2));Out.ar(8,In.ar(fuzz,2));Out.ar(10,In.ar(spark,2));Out.ar(12,In.ar(verb,2))})].do{|def|rack.installDef(def.name,def)};
        now=0.1;select.value(\mast);now=1;
        rack.synth(\awbFirstPassTestVC,[\out,rack.inputFor(\vc).index],rack.sourceGroup,"Test VC");
        rack.synth(\awbFirstPassTestPro2,[\out,rack.inputFor(\pro2).index],rack.sourceGroup,"Test Pro 2");
        emit.value([\g_new,9999,1,1]);emit.value([\s_new,\awbFirstPassTestMonitor,9998,1,9999,\vc,rack.postFor(\vc).index,\pro2,rack.postFor(\pro2).index,\deci,rack.slots[\deci][\active][\output].index,\fuzz,rack.slots[\fuzz][\active][\output].index,\spark,rack.slots[\spark][\active][\output].index,\verb,rack.slots[\verb][\active][\output].index]);
        now=3;select.value(\deci);
        now=6;select.value(\fuzz);
        now=9;select.value(\spark);
        now=12;select.value(\verb);
        now=16;select.value(\mast);rack.setMute(\vc,true);
        now=18;rack.setMute(\vc,false);rack.setSolo(\vc,true);
        now=20;rack.setSolo(\vc,false);select.value(\deci);
        mastBus=rack.destinationFor(\deci).index;
        now=22;rack.setFX(\deci,\awb52_deci,(fade:0.02,tail:0));
        check.value("FX replacement preserves destination",rack.destinationFor(\deci).index==mastBus);
        now=24;select.value(\mast);
        now=26;set.close;emit.value([\n_free,9999]);
        check.value("close reaches native ToolInstance",set.closed and:{set.instance.status==\closed});
        now=27;emit.value([\c_set,0,0]);
        Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,dir+/+"first-pass.osc");
        ("AWB_FIRSTPASS_CONTRACT=PASS count="++checks).postln;0.exit;
    }{|error|error.reportError;set.close;1.exit};
}));
)
