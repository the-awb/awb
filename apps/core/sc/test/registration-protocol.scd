(
var server,instance,core,p,q,bus,producer,source,connection,condition,checks=0,failed=List.new,check,callbacks=0,consumer;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failed.add(label);("FAIL "++label).postln}};
server=AWBCoreTestServer(\registrationUDP,NetAddr("127.0.0.1","AWB_CORE_TEST_PORT".getenv.asInteger),ServerOptions.new.numOutputBusChannels_(0).numInputBusChannels_(0));
Routine({try{
 instance=AWBCoreTool.open((),(server:server,track:true));core=instance.tool;while({core.ready.not},{0.01.wait});
 p=core.createParam(\gain,0.2,\unipolar,0.5);q=core.createParam(\other,0.3);
 bus=core.createBus(\envelope);producer=core.addSynth(\producer,\udpModProducer,[\out,bus.index],\detectors);
 source=core.registerModulationSource(\envelope,bus,producer);
 condition=Condition.new;connection=p.addModulation(\env,source,action:{|c,error|check.value(error.isNil and:{c[\status]==\connected},"registered connection handles real UDP tree reply");condition.unhang});condition.hang;
 check.value(connection[\node].group===p.sourceGroup,"UDP-validated route is inside parameter source group");
 // A sibling parameter can share the same source without taking ownership.
 condition=Condition.new;q.addModulation(\env,source,action:{|c,error|check.value(error.isNil,"second parameter shares registered producer");condition.unhang});condition.hang;
 condition=Condition.new;core.validateModulationOrder({|reports,error|check.value(error.isNil and:{reports.size==2} and:{reports.every{|r|r[\valid]}},"UDP audit sees both actual routing nodes");condition.unhang});condition.hang;
 server.sendMsg(\n_free,producer.nodeID);0.2.wait;
 check.value(source.active.not and:{p.modulationConnections.isEmpty} and:{q.modulationConnections.isEmpty},"producer end notification removes all registered routes");
 check.value(bus.index.notNil,"producer end preserves borrowed bus allocation");
 producer=core.addSynth(\producer2,\udpModProducer,[\out,bus.index],\detectors);source=core.registerModulationSource(\envelope2,bus,producer);
 connection=p.addModulation(\cancel,source,action:{|c,error|callbacks=callbacks+1;check.value(error.notNil,"pending cancellation resolves callback with error")});p.removeModulation(\cancel);0.25.wait;
 check.value(connection[\status]==\removed and:{connection[\node].isNil} and:{callbacks==1},"late UDP tree reply cannot restart cancelled connection");
 server.sendMsg('/awb/test/dropTree',1);condition=Condition.new;
 connection=p.addModulation(\timeout,source,action:{|c,error|check.value(error.notNil and:{c[\node].isNil},"missing UDP tree reply times out without creating route");condition.unhang});condition.hang;
 server.sendMsg('/awb/test/dropTree',0);
 SynthDescLib.global.add(SynthDef(\udpModConsumer,{|gain=0|Out.ar(0,DC.ar(gain))}).asSynthDesc);
 consumer=core.addSynth(\consumer,\udpModConsumer,[],\fx);condition=Condition.new;
 connection=p.mapToChecked(consumer,\gain,action:{|c,error|check.value(error.isNil,"checked destination handles real UDP tree reply");condition.unhang});condition.hang;
 server.sendMsg(\n_free,consumer.nodeID);0.2.wait;
 check.value(p.checkedMappings.isEmpty and:{core.modulationRegistry.destinations.isEmpty},"destination end removes checked mapping registration");
 connection=p.addModulation(\closing,source,action:{|c,error|callbacks=callbacks+1;check.value(error.notNil,"closing resolves in-flight registry callback")});instance.close;0.25.wait;
 check.value(connection[\node].isNil and:{callbacks==2} and:{core.modulationRegistry.closed},"registry closure leaves no late route or callback");
 ("AWB_MODULATION_PROTOCOL_CHECKS="++checks).postln;if(failed.isEmpty){"AWB_MODULATION_PROTOCOL_RESULT=PASS".postln;0.exit}{1.exit};
}{|error|error.reportError;instance.tryPerform(\close);1.exit}}).play(SystemClock);
)
