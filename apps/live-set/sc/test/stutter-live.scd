// Silent functional probe on private UDP 57923. Never targets the running MOTU server.
// Requires the isolated class snapshot from sc/test-run.py; no hardware Out writers.
(
var server,options,failed=List.new,checks=0,failHook,stage,registry,root,input,output,sourceBus,source,check,finish;
">>>>> DEBUG START >>>>>".postln;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failed.add(label);("FAIL "++label).postln}};
options=ServerOptions.new.device_("AWB_STUTTER_TEST_DEVICE".getenv ? "BlackHole 2ch").numInputBusChannels_(2).numOutputBusChannels_(2).sampleRate_(44100).blockSize_(256).hardwareBufferSize_(512);
options.loadDefs=false;
options.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins"];
server=Server(\awbStutterIsolated,NetAddr("127.0.0.1",57923),options);
finish={|code|stage.tryPerform(\free);registry.tryPerform(\close);failHook.tryPerform(\free);if(server.serverRunning){server.quit};("AWB_STUTTER_REALTIME="++if(code==0){"PASS"}{"FAIL"}++" checks="++checks).postln;SystemClock.sched(0.5,{code.exit;nil})};
SystemClock.sched(35,{failed.add("timeout");finish.value(1);nil});
failHook=OSCFunc({|msg|failed.add(msg.asString);msg.postln},'/fail',server.addr);
server.waitForBoot({Routine({
    try {
        AWParam.prepare(server);SynthDef(\stutterLiveControl,{|out=0|ReplaceOut.kr(out,0.2)}).send(server);server.sync;
        root=Group.head(server);input=Bus.audio(server,2);output=Bus.audio(server,2);sourceBus=Bus.control(server);source=Synth.head(root,\stutterLiveControl,[\out,sourceBus.index]);
        registry=AWModulationRegistry(server);
        2.do{|i|
            var config=(),definition,parameter,state,error,condition,tree;
            if(i==1){definition=AWBCelloStutter.compile(\stutterPreinstalled,(),2);definition.send(server);server.sync;config[\definition]=definition};
            config[\modulationRegistry]=registry;
            stage=AWBCelloStutter(input,output,root,(),config);server.sync;0.2.wait;
            check.value(stage.params.values.every{|p|p.checkedMappings.size==1 and:{p.checkedMappings.asArray.first[\status]==\connected}},"all four checked mappings connect, startup "++i);
            condition=Condition.new;
            registry.requestOrder({|order,e|tree=order;error=e;condition.unhang});condition.hang;
            check.value(error.isNil and:{tree[stage.node.nodeID].notNil},"Stutter SynthDef instantiates on live server, startup "++i);
            parameter=stage.param(\amount);parameter.setBase(0.25);parameter.setAmount(0.5);
            registry.registerSource(("source"++i).asSymbol,sourceBus,source).connect(parameter,\live);
            server.sync;0.15.wait;condition=Condition.new;
            parameter.getState({|s,e|state=s;error=e;condition.unhang});condition.hang;
            check.value(error.isNil and:{(state[\base]-0.25).abs<0.001} and:{(state[\amount]-0.5).abs<0.001} and:{(state[\effective]-0.35).abs<0.001},"base, amount and effective modulation remain distinct, startup "++i);
            stage.free;stage=nil;server.sync;
            check.value(registry.destinations.isEmpty,"stage cleanup retires checked mappings, startup "++i);
        };
        check.value(failed.isEmpty,"no server /fail replies");finish.value(if(failed.isEmpty){0}{1});
    }{|error|error.reportError;failed.add(error.errorString);finish.value(1)};
}).play(SystemClock)},100,{failed.add("boot failed");finish.value(1)});
)
