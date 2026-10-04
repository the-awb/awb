// Evaluate after loading sc/classes alongside your real Tool/NodeManager classes.
// The selected server must already be booted.
(
~rackInstance = AWBSendRackTool.open((
    name: "My sends", libraryID: "my-live-set", width: 2,
    channels: [\drums, \texture],
    fixedFX: [\splut, \spark, \deci, \fuzz, \verb, \mast],
    dynamicFX: 3, fixedFollowers: [\env1], spareFollowers: 3
), (server: s));
~rack = ~rackInstance.tool;
~rack.gui;
)

// Persistent channel: write upstream of the channel strip, into its input bus.
(
~rack.whenReady({ |rack|
    var source;
    source=SynthDef(\rackTexture, { |out=0,amp=0.08,gate=1|
        var audio=SinOsc.ar([110,110.4])*amp*EnvGen.kr(Env.asr,gate,doneAction:2);
        Out.ar(out,audio);
    });
    source.add;
    Routine({
        s.sync;
        rack.synth(\rackTexture,[\out,rack.inputFor(\texture).index],rack.sourceGroup,"Texture");
        rack.setSend(\texture,\mast,1);
    }).play(SystemClock);
});
)

// User FX can contain several Synths/groups. Route through the provided buses.
(
~rack.whenReady({ |rack|
    var reverb;
    reverb=SynthDef(\rackDemoVerb,{ |in=0,out=0,wet=0.3|
        var input=In.ar(in,2);
        Out.ar(out,FreeVerb2.ar(input[0],input[1],wet,0.8,0.5));
    });
    reverb.add;
    Routine({
        s.sync;
        rack.registerProcessor(\demo_verb,{ |ctx|
            ctx[\synth].value(\rackDemoVerb,[\in,ctx[\input].index,\out,ctx[\output].index]);
        });
        rack.setFX(\verb,\demo_verb,(tail:6));
        rack.setSend(\texture,\verb,0.5);
        // Click Sync from SC to refresh the GUI's processor list and assignment.
    }).play(SystemClock);
});
)

// One-shot source functions return audio. They don't call Out themselves.
// Prepare a full wrapper and a packed two-port grain variant ONCE, before notes.
(
~rack.whenReady({ |rack|
    rack.prepareVoice(\grain,{ |freq=440,amp=0.08,hold=0.08|
        var envelope=EnvGen.ar(Env.perc(0.005,hold),doneAction:2);
        SinOsc.ar(freq!2)*amp*envelope;
    });
    rack.prepareVariant(\grain,[\mast,\verb]);
    Routine({
        s.sync;
        rack.playVoice(\grain,(mast:0.7,verb:0.3),[\freq,330],[\mast,\verb]);
        ~grains=Pbind(
            \type,\awbSendVoice,\rack,rack,\voiceID,\grain,
            \destinations,Pfunc{[\mast,\verb]},
            \mix,Pfunc{(mast:rrand(0.2,0.7),verb:rrand(0.1,0.6))},
            \args,Pfunc{[\freq,rrand(220,880),\hold,rrand(0.03,0.12)]},
            \dur,0.1
        ).play;
    }).play(SystemClock);
});
)

// Fixed buses survive processor swaps; old processes retire with tails.
// ~rack.setFX(\fx1,\demo_verb,(fade:0.02,tail:6));
// ~rack.clearFX(\fx1);
// ~rack.setFollower(\follow1,(curve:\log,attack:0.01,release:0.1));
// ~rack.setSend(\texture,\follow1,1);
// ~rack.controlFor(\follow1) // stable control bus for mapping synth controls
// ~rack.postFor(\texture)   // stable sounding-signal tap for an audio recorder

// Stop patterns, then close the native ToolInstance (audio, buses, owned view).
// ~grains.stop; ~rackInstance.close;
