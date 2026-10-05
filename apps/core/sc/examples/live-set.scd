// WIP class library only: Tool framework + apps/core/sc/classes.
// Explicit audio destinations; this example has no hardware/Master output.
(
SynthDef(\awCoreExampleVoice,{|out=0,freq=220,amp=0.1|
    Out.ar(out,SinOsc.ar(freq)!2 * amp * EnvGen.kr(Env.perc(0.01,0.3),doneAction:2));
}).add;
~coreInstance=AWBCoreTool.open((name:"Core example"),(server:s));
~core=~coreInstance.tool;
~core.whenReady({
    var voice=~core.createBus(\voice,\audio,2);
    ~level=~core.createParam(\level,0.2,ControlSpec(0,1),0.5);
    ~level.transitionCurves(-4,0);
    ~level.set(0.7,2);
    ~level.setAmount(0.2,1);
    ~core.playTracked((instrument:\awCoreExampleVoice,out:voice.index,amp:~level.asMap));
    ~core.playTracked(Pbind(\instrument,\awCoreExampleVoice,\out,voice.index,\amp,~level.asMap,\dur,0.5));
    // Explicitly route voice.index through your rack/Chain; nothing goes to out 0.
});
)
// ~level.getState({|state,error|[state,error].postln});
// ~core.stopPlayback;
// ~coreInstance.close;
