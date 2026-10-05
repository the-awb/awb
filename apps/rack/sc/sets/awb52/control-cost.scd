// Owned, muted hardware run. No GUI/bridge; compare detector and envelope DSP
// First compare 8 versus 24 channel audio writers with detectors paused,
// then enable detection and envelopes separately on the 24-destination topology.
(
var dir=thisProcess.nowExecutingPath.dirname,server,setup,rows=List.new,finish,phase;
var options=ServerOptions.new.numInputBusChannels_(3).numOutputBusChannels_(4).memSize_(262144).sampleRate_(44100).hardwareBufferSize_(512);
options.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins",dir+/+"plugins"];
server=Server(\awbControlCost,NetAddr("127.0.0.1",59278),options);
finish={|code|setup.tryPerform(\close);server.quit;SystemClock.sched(1,{code.exit;nil})};
phase={|rack,mode,repeat|
    var ids=if(mode==\eight){rack.fxIDs}{rack.slotIDs},defName=if(mode==\eight){\costChannels8}{\costChannels24};
    // Replace only the strips, at the same node positions. Sources/FX stay running.
    rack.channels.values.do{|channel|
        var old=channel[\node],node=Synth.basicNew(defName,server),args;
        args=[\in,channel[\input].index,\post,channel[\post].index,\level,channel[\level],\fade,rack.config[\fade],
            \sendBuses,ids.collect{|id|rack.destinationFor(id).index},\sendGains,ids.collect{|id|channel[\gains][rack.slotIDs.indexOf(id)]}];
        rack.dispatch(node.newMsg(old,args,\addReplace));
        rack.own(node,\synth,(name:"Cost strip",parent:old.group));channel[\node]=node;
    };
    AWBControlSendProfile.sendIDs.do{|id|
        var slot=rack.slotAt(id);
        rack.setControlSendEnabled(id,[\detectors,\full].includes(mode));
        slot[\consumers].values.do{|consumer|rack.dispatch(consumer[\node].runMsg(mode==\full))};
    };
    server.sync;3.wait;
    40.do{rows.add([mode.asString,repeat,server.avgCPU,server.peakCPU,server.numSynths,server.numUGens]);0.2.wait};
    ("CONTROL_COST_PHASE="++mode++" repeat="++repeat).postln;
};
SystemClock.sched(150,{"Control cost run timed out".error;finish.value(1);nil});
server.waitForBoot({
    server.mute;
    Routine({
        try {
            var specification;
            specification=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
            specification[\rack][\channels]=[\vc,\pro2,\test3,\test4,\test5,\test6,\test7,\test8];
            setup=AWBFirstPassSet.open(specification,(server:server,track:false,controlSends:true,fullLoad:true,assetDirectory:dir+/+"control-cost-irs",onError:{|error,set|finish.value(1)},onReady:{|set|
                Routine({
                    try {
                        var rack=set.rack,def,contents;
                        def=SynthDef(\awbControlCostSource,{|out=0,frequency=221|
                            Out.ar(out,(SinOsc.ar([frequency,frequency*1.337])*0.025)+(PinkNoise.ar(0.005)!2));
                        });rack.installDef(def.name,def);
                        [8,24].do{|size|
                            rack.installDef(("costChannels"++size).asSymbol,SynthDef(("costChannels"++size).asSymbol,{|in=0,post=0,level=1,enabled=1,fade=0.02|
                                var signal=In.ar(in,2)*Lag.kr(level*enabled,fade);
                                var buses=NamedControl.ir(\sendBuses,Array.fill(size,0)).asArray;
                                var gains=NamedControl.kr(\sendGains,Array.fill(size,0.0)).asArray;
                                ReplaceOut.ar(post,signal);
                                size.do{|i|Out.ar(buses[i],signal*Lag.kr(gains[i],fade))};
                            }));
                        };server.sync;
                        [\vc,\pro2,\test3,\test4,\test5,\test6,\test7,\test8].do{|id,index|
                            (rack.fxIDs++AWBControlSendProfile.sendIDs).do{|send|rack.setSend(id,send,1)};
                            rack.synth(def.name,[\out,rack.inputFor(id).index,\frequency,221+(index*67)],rack.sourceGroup,"Control cost source");
                        };
                        [\eight,\twentyfour,\detectors,\full,\full,\detectors,\twentyfour,\eight].do{|mode,index|phase.value(rack,mode,index.div(4)+1)};
                        contents="{\"sampleRate\":"++server.sampleRate++",\"outputChannels\":4,\"hardwareFramesRequested\":512,\"blockSize\":64,\"hardwareOutputMuted\":true,\"instrumentChannels\":8,\"fxDestinations\":8,\"controlDestinations\":16,\"gui\":false,\"rows\":[";
                        contents=contents++rows.collect{|row|"["++row.collect{|value|if(value.isString){value.asCompileString}{value.asString}}.join(",")++"]"}.join(",")++"]}";
                        File.use(dir+/+"control-cost.json","w",{|file|file.write(contents)});
                        "AWB_CONTROL_COST_RESULT=PASS".postln;finish.value(0);
                    }{|error|error.reportError;finish.value(1)};
                }).play(SystemClock);
            }));
        }{|error|error.reportError;finish.value(1)};
    }).play(SystemClock);
},100,{"Control cost server boot failed".error;finish.value(1)});
server.boot;
)
