(
var server,base,instance,p,q,view,check,checks=0,failures=List.new,messages=List.new,cleaned=0,command,rackInstance,rack,level,rejected=false,before,midi,cap,cc;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failures.add(label);("FAIL "++label).postln}};
try {
    server=AWBCoreTestServer(\liveSetContract,NetAddr("127.0.0.1",59994));
    instance=AWBaseTool.open((params:[(id:\gain,base:0.2)]),(server:server,sendFunction:{|msg|messages.add(msg)},track:false));base=instance.tool;p=base.param(\gain);
    check.value(base.ready and:{instance.definition.id==\awbBase},"AWBaseTool uses Core Tool ownership");
    check.value(base.containers===base.t,"b.containers is the existing namespace registry");
    check.value(base.clock!==TempoClock.default,"the set owns an independent musical clock");
    base.track(\deci).add(\deciShaper,p,"Shape",(channel:3,cc:13,pickup:true));
    check.value(base.t[\deci].p[\deciShaper]===p,"track dictionary refers to the actual AWParam");
    q=AWParam(\gain,0.4,target:base.groupAt(\parameters),server:server,options:(sendFunction:{|m|messages.add(m)}));
    base.track(\spark).add(\sparkleShaper,q,"Sparkle",(channel:3,cc:14,pickup:true));
    view=AWParamInspector.openNamed(base.namedParameters,(launch:false),instance);
    check.value(view.tool.params['deci/deciShaper']===p and:{view.tool.params['spark/sparkleShaper']===q},"namespaces disambiguate parameters with identical internal names");
    view.close;check.value(p.closed.not and:{q.closed.not},"view closure preserves borrowed DSP");
    base.track(\deci).unavailable(\missing,"Missing",(cc:55,channel:3));
    check.value(base.namedParameters.size==2 and:{base.t[\deci].metadata[\missing][\status]==\unavailable},"unavailable legacy controls allocate no extra parameters or buses");
    base.track(\deci).add(\alias,p,"Alias");check.value(base.namedParameters.size==2,"aliases do not duplicate observation");
    view=base.gui((processRunner:{|cmd|command=cmd;nil},delayURL:"http://127.0.0.1:12345/",cellViews:(b1:"http://127.0.0.1:12345/cell?cell=b1"),rackBinding:(instanceID:"sendRack:test",libraryID:"unit-rack")));
    check.value(command.notNil and:{command.contains("--tool='live-set'")},"base GUI launches the composite Tool by default");
    check.value(command.contains("AWB_RACK_INSTANCE_ID='sendRack:test'") and:{command.contains("AWB_RACK_LIBRARY_ID='unit-rack'")},"composite GUI forwards the existing native rack binding");
    check.value(command.contains("AWB_LIVE_CELL_VIEWS=") and:{command.contains("cell=b1")},"composite GUI forwards individually requested cell views");
    check.value(command.contains("AWB_LIVE_DELAY_URL='http://127.0.0.1:12345/'"),"composite forwards one existing delay instrument URL");
    check.value(command.contains("--tool-instance="++instance.instanceID.shellQuote),"composite NodeManager binding belongs to AWBaseTool");
    view.close;
    // Real launch has short aliases plus amount views of each delay parameter.
    [[\in,\inOf,\inSc],[\fx,\fxOf,\fxSc],[\fb,\fbOf,\fbSc],[\dry,\dryOf,\drySc]].do{|row|
        var parameter=base.createParam(("delay"++row[0]).asSymbol,0.5),track=base.track(\b1),named;
        track.add(row[1],parameter,"Delay "++row[0]);track.add(row[0],parameter);track.field(row[2],parameter,\amount);track.canonical(row[1]);named=base.namedParameters;
        check.value(named[("b1/"++row[1]).asSymbol]===parameter and:{named[("b1/"++row[0]).asSymbol].isNil},"delay "++row[0]++" keeps its canonical GUI name across aliases");
    };
    base.log("hello");check.value(base.logHistory.last[\text]=="hello","AWBase-style logging retains actual messages");
    505.do{|i|base.log(i)};check.value(base.logHistory.size==500 and:{base.logSequence==506},"console history is bounded with monotonic sequence");
    base.adopt(\example,Ref.new,{cleaned=cleaned+1});
    instance.close;check.value(base.closed and:{p.closed} and:{cleaned==1},"base closure retires owned resources once");
    // Borrowed faders reject invalid values without poisoning authoritative cache.
    rackInstance=AWBSendRackTool.open((channels:[\b1,\a2],fixedFX:[\mast],dynamicFX:0,fixedFollowers:[],spareFollowers:0),
        (server:server,sendFunction:{|m|messages.add(m)},track:false));rack=rackInstance.tool;
    level=AWParam(\master,0.8,ControlSpec(0,2),target:rack.sourceGroup,server:server,options:(sendFunction:{|m|messages.add(m)}));
    rack.bindLevelParam(\b1,level);before=messages.size;
    try{rack.setLevel(\b1,2.1)}{|error|rejected=true};
    check.value(rejected and:{rack.channelAt(\b1)[\level]==0.8} and:{level.baseTarget==0.8} and:{messages.size==before},"out-of-range rack edit leaves parameter, cached level and server commands unchanged");
    rack.unbindLevelParam(\b1);level.free;rackInstance.close;
    rackInstance=AWBSendRackTool.open((channels:[\vc],fixedFX:[\mast],dynamicFX:0,fixedFollowers:[],spareFollowers:0,maxGain:1),
        (server:server,sendFunction:{|m|messages.add(m)},track:false));rack=rackInstance.tool;
    rack.setSend(\vc,\mast,1);before=messages.size;rejected=false;
    try{rack.setSend(\vc,\mast,1.001)}{|error|rejected=true};
    check.value(rejected and:{rack.channelAt(\vc)[\gains][0]==1} and:{messages.size==before},"unity rack rejects gain above 100 percent without changing DSP or cache");
    rack.setLevel(\vc,1);rackInstance.close;
    cap=6.dbamp;
    rackInstance=AWBSendRackTool.open((channels:[\vc],fixedFX:[\mast],dynamicFX:0,fixedFollowers:[\env],spareFollowers:0,maxGain:1,maxLevel:cap),
        (server:server,sendFunction:{|m|messages.add(m)},track:false));rack=rackInstance.tool;
    rack.setLevel(\vc,cap);rack.setControlAmount(\env,cap);
    check.value(rack.channelAt(\vc)[\level]==cap and:{rack.slotAt(\env)[\level]==cap},"channel and control faders accept +6dB while send range stays at unity");
    p=AWParam(\fader,0.5,ControlSpec(0,cap),target:rack.sourceGroup,server:server,options:(sendFunction:{|m|messages.add(m)})).midiRange(0,1);
    midi=p.createMidiSource(12345,3,7,passthru:false);MIDIIn.doControlAction(12345,3,7,127);
    check.value(p.baseTarget==1,"actual MIDI callback reaches unity, not +6dB");
    p.setBase(cap);check.value(p.baseTarget==cap,"manual fader edit reaches +6dB");
    check.value(midi.acceptBase(127,cap).not,"pickup cannot latch above the MIDI unity ceiling");
    midi.free;p.free;rackInstance.close;
    q.free;check.value(q.closed,"externally borrowed parameter remains independently owned");
    ("AWB_LIVE_SURFACE_CONTRACT_RESULT="++if(failures.isEmpty){"PASS"}{"FAIL"}++" checks="++checks).postln;if(failures.isEmpty){0.exit}{1.exit};
}{|error|error.reportError;instance.tryPerform(\close);q.tryPerform(\free);1.exit};
)
