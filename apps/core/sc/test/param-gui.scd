(
var server,core,instance,p,q,bus,route,writer,view,messages=List.new,checks=0,failures=List.new,check,reject,events=List.new;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failures.add(label);("FAIL "++label).postln}};
reject={|fn,label|var caught=false;try{fn.value}{caught=true};check.value(caught,label)};
try{
 server=Server(\paramGUIContract,NetAddr("127.0.0.1",59996));
 instance=AWBCoreTool.open((params:[(id:\gain,base:0.2)]),(server:server,sendFunction:{|m|messages.add(m)},track:false));core=instance.tool;p=core.param(\gain);q=core.createParam(\second,0.5);
 check.value(p.asBus.numChannels==1 and:{p.observationBus.numChannels==2},"mono output preserved; observations use separate allocation");
 check.value(p.observationIndices==[p.observationBus.index,p.observationBus.index+1,p.outputBus.index],"explicit three-value observation order");
 SynthDef(\paramGUIWriter,{|out=0,rate=2|Out.kr(out,SinOsc.kr(rate)*0.1)}).add;
 p.createModulationWriter(\custom,\paramGUIWriter,[\rate,3]);
 p.declareModulationWriterControls(\custom,[(id:\rate,min:0.1,max:20)]);p.setModulationWriterControl(\custom,\rate,4);
 check.value(p.routeMetadata.detect{|r|r[\id]==\custom}[\controls][0][\value]==4,"declared writer controls retain edits");
 reject.value({p.setModulationWriterControl(\custom,\out,2)},"writer output cannot be edited");
 reject.value({p.declareModulationWriterControls(\custom,[(id:\missing,min:0,max:1)])},"undeclared writer controls rejected");
 p.removeModulationWriter(\custom);
 bus=core.createBus(\source);route=p.addModulation(\plain,bus,0.3,-2);
 p.setModulationAmount(\plain,-0.7);p.setModulationCurve(\plain,4);
 check.value(p.routeMetadata[0][\amount]==(-0.7) and:{p.routeMetadata[0][\curve]==4} and:{p.routeMetadata[0][\producer].isNil},"plain route edits retain truthful metadata");
 reject.value({p.setModulationAmount(\plain,9)},"source amount bounds enforced");
 reject.value({p.setModulationCurve(\plain,17)},"source curve bounds enforced");
 p.removeModulation(\plain);reject.value({p.setModulationAmount(\plain,1)},"removed source edits rejected");
 p.modulationConnections[\pending]=(status:\pending);reject.value({p.setModulationAmount(\pending,1)},"pending edits explicitly rejected");p.modulationConnections.removeAt(\pending);
 instance.addDependant({|o,what,payload|if(what==\toolEvent){events.add(payload)}});
 p.setBase(0.4);check.value(instance.config[\params].detect{|entry|entry[\id]==\gain}[\base]==0.4,"canonical snapshot retains changed entry");
 check.value(events.last[\kind]==\paramChanged and:{events.last[\payload][\entry][\id]==\gain} and:{events.last[\payload][\state].isNil},"gesture publishes parameter delta without full snapshot");
 view=AWParamInspector.openMany([p,q],(launch:false),instance);
 check.value(view.tool.owner===instance,"inspector panel retains owning Tool identity");
 check.value(view.tool.params.size==2 and:{p.isKindOf(Tool).not},"one inspector borrows multiple plain AWParams");
 p.watch(6);messages.clear;
 view.close;check.value(messages.isEmpty,"inspector closure does not alter a language watch client");check.value(p.closed.not and:{q.closed.not},"inspector closure preserves borrowed parameters");
 view=AWParamInspector.open(p,(launch:false));p.free;
 check.value(view.status==\closed,"parameter closure invalidates inspector binding");
 instance.close;
 ("AWB_PARAM_GUI_CONTRACT_RESULT="++if(failures.isEmpty){"PASS"}{"FAIL"}++" checks="++checks).postln;
 if(failures.notEmpty){1.exit}{0.exit};
}{|error|error.reportError;instance.tryPerform(\close);1.exit};
)
