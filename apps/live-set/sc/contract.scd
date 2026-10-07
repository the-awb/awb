(
var server,base,instance,p,q,view,check,checks=0,failures=List.new,messages=List.new,cleaned=0,command;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failures.add(label);("FAIL "++label).postln}};
try {
    server=AWBCoreTestServer(\liveSetContract,NetAddr("127.0.0.1",59994));
    instance=AWBaseTool.open((params:[(id:\gain,base:0.2)]),(server:server,sendFunction:{|msg|messages.add(msg)},track:false));base=instance.tool;p=base.param(\gain);
    check.value(base.ready and:{instance.definition.id==\awbBase},"AWBaseTool uses Core Tool ownership");
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
    base.log("hello");check.value(base.logHistory.last[\text]=="hello","AWBase-style logging retains actual messages");
    505.do{|i|base.log(i)};check.value(base.logHistory.size==500 and:{base.logSequence==506},"console history is bounded with monotonic sequence");
    base.adopt(\example,Ref.new,{cleaned=cleaned+1});
    instance.close;check.value(base.closed and:{p.closed} and:{cleaned==1},"base closure retires owned resources once");
    q.free;check.value(q.closed,"externally borrowed parameter remains independently owned");
    ("AWB_LIVE_SURFACE_CONTRACT_RESULT="++if(failures.isEmpty){"PASS"}{"FAIL"}++" checks="++checks).postln;if(failures.isEmpty){0.exit}{1.exit};
}{|error|error.reportError;instance.tryPerform(\close);q.tryPerform(\free);1.exit};
)
