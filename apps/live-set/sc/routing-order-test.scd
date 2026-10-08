// Offline execution-order probe: real rack channels and wrapper pipes, no audio device.
(
var out="AWB_ROUTE_OUT".getenv,server,instance,rack,graph,feed,input,ret,ports,definition,source,probe,tail;
var events=List.new,seq=0,now=0.1,emit;
emit={|m|seq=seq+1;events.add([if(m[0]==\d_recv){0}{now},seq,m])};
server=Server(\sameBlockRoutingNRT,NetAddr("127.0.0.1",59995),ServerOptions.new.numOutputBusChannels_(4));
events.add([0.05,0,[\g_new,1,0,0]]);
try {
    instance=AWBSendRackTool.open((channels:[\vc,\pro2,\delbus,\b1,\a2,\b2,\a1],fixedFX:[\mast],dynamicFX:0,fixedFollowers:[],spareFollowers:0,maxGain:1,masterLimit:false),
        (server:server,track:false,sendFunction:emit));rack=instance.tool;
    graph=Group.basicNew(server);emit.value(graph.newMsg(rack.sourceGroup,\addToTail));
    AWBDelayRack.routingOrderMessages(rack,graph,["clean","pro2"]).do(emit);
    definition=AWBDelayRack.pipeDef;emit.value([\d_recv,definition.asBytes]);ports=Bus.audio(server,2);
    feed=Synth.basicNew(definition.name,server);emit.value(feed.newMsg(rack.channelAt(\vc)[\node],
        [\in,rack.postFor(\vc).index,\out,rack.inputFor(\delbus).index],\addAfter));
    emit.value(rack.channelAt(\delbus)[\node].moveAfterMsg(feed));
    input=Synth.basicNew(definition.name,server);emit.value(input.newMsg(graph,
        [\in,rack.postFor(\delbus).index,\out,ports.index],\addBefore));
    ret=Synth.basicNew(definition.name,server);emit.value(ret.newMsg(graph,
        [\in,ports.index,\out,rack.inputFor(\b1).index],\addAfter));
    source=SynthDef(\awbRoutingImpulse,{|out=0|Out.ar(out,Impulse.ar(1000)!2)});
    emit.value([\d_recv,source.asBytes]);emit.value([\s_new,source.name,9900,0,rack.sourceGroup.nodeID,\out,rack.inputFor(\vc).index]);
    probe=SynthDef(\awbRoutingGraphProbe,{|in=0,reference=0|Out.ar(0,[In.ar(in,2)[0],In.ar(reference,2)[0]])});
    emit.value([\d_recv,probe.asBytes]);emit.value([\s_new,probe.name,9901,1,graph.nodeID,\in,ports.index,\reference,rack.postFor(\vc).index]);
    tail=SynthDef(\awbRoutingReturnProbe,{|in=0,reference=0|Out.ar(2,[In.ar(in,2)[0],In.ar(reference,2)[0]])});
    emit.value([\d_recv,tail.asBytes]);emit.value([\s_new,tail.name,9902,3,rack.channelAt(\b1)[\node].nodeID,\in,rack.postFor(\b1).index,\reference,rack.postFor(\vc).index]);
    rack.setLevel(\delbus,0.5);
    now=1;rack.setMute(\delbus,true);
    now=2;rack.setMute(\delbus,false);rack.setLevel(\delbus,1);
    now=3;instance.close;emit.value([\d_free,definition.name]);ports.free;
    now=3.1;emit.value([\c_set,0,0]);
    Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,out+/+"routing-order.osc");
    "AWB_ROUTING_ORDER_SCORE=PASS".postln;0.exit;
}{|e|e.reportError;1.exit};
)
