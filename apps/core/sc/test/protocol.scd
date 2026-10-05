(
var server,instance,core,p,q,checks=0,failed=List.new,check,condition,count=0,player,note,bus,func,presetNote,midi;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failed.add(label);("FAIL "++label).postln}};
server=AWBCoreTestServer(\coreUDP,NetAddr("127.0.0.1","AWB_CORE_TEST_PORT".getenv.asInteger),ServerOptions.new.numOutputBusChannels_(0).numInputBusChannels_(0));
Routine({
 try{
    instance=AWBCoreTool.open((),(server:server,track:true));core=instance.tool;
    while({core.ready.not},{0.01.wait});p=core.createParam(\observed,0.8,\unipolar,0.5);p.setBase(0.6,2);
    condition=Condition.new;
    p.getState({|state,error|check.value(error.isNil and:{(state[\base]-0.42).abs<1e-6} and:{(state[\effective]-0.9).abs<1e-6},"UDP readback gives current base separately from target/effective");condition.unhang});condition.hang;
    check.value(p.baseTarget==0.6 and:{(p.cachedBase-0.42).abs<1e-6},"readback does not replace requested target");
    condition=Condition.new;count=0;
    12.do{p.getBase({|base,error|check.value(error.isNil and:{(base-0.42).abs<1e-6},"coalesced callback reads base");count=count+1;if(count==12){condition.unhang}})};condition.hang;
    midi=p.createMidiSource(nil,0,21,0,127,true,false);
    midi.receiveCC(10);midi.receiveCC(30);midi.receiveCC(53);
    check.value(midi.latched.not and:{p.baseTarget==0.6},"MIDI pickup awaits observed base rather than target/cache");
    0.2.wait;
    check.value(midi.latched and:{(p.baseTarget-(53/127)).abs<1e-6},"pending MIDI candidates coalesce to latest CC using observed base");
    midi.receiveCC(60);check.value((p.baseTarget-(60/127)).abs<1e-6,"latched MIDI writes directly without another read");
    p.setBase(0.7,2);check.value(midi.latched.not,"external transition rearms attached source");
    midi.receiveCC(100);p.removeSource(midi);0.2.wait;
    check.value(p.baseTarget==0.7 and:{midi.closed},"late readback after MIDI removal cannot write parameter");
    q=core.createParam(\timeout,0.991);condition=Condition.new;
    q.getState({|state,error|check.value(state.isNil and:{error.notNil},"missing readback times out with explicit error");condition.unhang});condition.hang;
    condition=Condition.new;q.getState({|state,error|check.value(state.isNil and:{error.notNil},"closing parameter resolves pending read");condition.unhang});q.free;
    bus=core.createBus(\voices,\audio,2);
    SynthDescLib.global.add(SynthDef(\udpVoice,{|out=0,amp=0.1|Out.ar(out,DC.ar(amp))}).asSynthDesc);
    note=core.playTracked((instrument:\udpVoice,out:bus.index,dur:0.05));
    check.value(NodeManager.instance.watchedEntries[note].owner===instance,"single Event belongs to Core ToolInstance");
    presetNote=core.playTracked(EventPreset(\test,(instrument:\udpVoice,out:bus.index,dur:0.05)));
    check.value(NodeManager.instance.watchedEntries[presetNote].owner===instance,"EventPreset data plays under Core ownership");
    func=core.playTracked({DC.ar(0.1)},(out:bus.index));
    check.value(instance.ownedObjects.includes(func),"UGen Function Synth belongs to Core");
    core.stopPlayback;check.value(core.players.isEmpty,"stopping mixed Event/Function playback clears ownership");
    player=core.playTracked(Pbind(\instrument,\udpVoice,\out,bus.index,\dur,Pseq([0.05,0.05],1)));
    check.value(player.isKindOf(EventStreamPlayerWithTracking) and:{instance.ownedObjects.includes(player)},"Pattern uses existing tracked player under Core ownership");
    note=core.playTracked((instrument:\udpVoice,out:bus.index,dur:0.05));
    0.03.wait;
    check.value(core.players.any{|object|object.isKindOf(Event) and:{object!==note}},"stream emissions become Core-owned Events");
    check.value(NodeManager.eventsForStreamPlayer(player).every{|event|NodeManager.instance.watchedEntries[event].owner===instance},"stream Event ownership/provenance retained");
    0.3.wait;check.value(core.players.includes(note).not,"ended one-shot is removed from playback set");
    check.value(core.players.includes(player).not,"exhausted player removed after its events end");
    instance.close;0.05.wait;
    check.value(instance.ownedObjects.isEmpty and:{core.closed},"close clears native owned registry");
    ("AWB_CORE_PROTOCOL_CHECKS="++checks).postln;if(failed.isEmpty){"AWB_CORE_PROTOCOL_RESULT=PASS".postln;0.exit}{1.exit};
 }{|error|error.reportError;instance.tryPerform(\close);1.exit};
}).play(SystemClock);
)
