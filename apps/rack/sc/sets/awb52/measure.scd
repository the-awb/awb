(
var dir=thisProcess.nowExecutingPath.dirname,server,setup,rows=List.new,sources=List.new,record,measure,finish;
var options=ServerOptions.new.numInputBusChannels_(3).numOutputBusChannels_(4).memSize_(262144).sampleRate_(44100).hardwareBufferSize_(512);
options.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins",dir+/+"plugins"];
server=Server(\awb52Measure,NetAddr("127.0.0.1",59277),options);
record={|label,repeat|
    rows.add([label,repeat,server.avgCPU,server.peakCPU,server.numSynths,server.numUGens]);
};
measure={|label,repeat|
    3.wait;32.do{record.value(label,repeat);0.25.wait};
    ("MEASURED "++label++" repeat="++repeat).postln;
};
finish={|code|
    setup.tryPerform(\close);server.quit;SystemClock.sched(1,{code.exit;nil});
};
SystemClock.sched(100,{"AWB52 measure timed out".error;finish.value(1)});
server.waitForBoot({
    // Hardware output is muted; the complete internal graph still processes audio.
    server.mute;
    Routine({
        try {
            var specification;
            measure.value("idle",0);
            specification=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
            setup=AWBFirstPassSet.open(specification,(server:server,track:false,fullLoad:true,assetDirectory:dir+/+"live-irs",onError:{|error,set|finish.value(1)},onReady:{|set|
                Routine({
                    try {
                        var rack=set.rack,def,contents;
                        def=SynthDef(\awb52MeasureVoice,{|out=0,amp=0,frequency=221|
                            Out.ar(out,((SinOsc.ar([frequency,frequency*1.337])*0.025)+(PinkNoise.ar(0.005)!2))*amp);
                        });rack.installDef(def.name,def);server.sync;
                        [\vc,\pro2].do{|id,index|
                            [\verb,\deci,\spark,\fuzz,\mast].do{|fx|rack.setSend(id,fx,1)};
                            sources.add(rack.synth(def.name,[\out,rack.inputFor(id).index,\frequency,if(index==0){221}{331}],rack.sourceGroup,"Cost source"));
                        };
                        2.do{|repeat|
                            sources.do{|node|node.set(\amp,0)};measure.value("fully-wet-silent-input",repeat+1);
                            sources.do{|node|node.set(\amp,1)};measure.value("fully-wet-active-input",repeat+1);
                        };
                        contents="{\"sampleRate\":"++server.sampleRate++",\"memoryPoolKiB\":262144,\"outputChannels\":4,\"blockSize\":"++server.options.blockSize++",\"hardwareFramesRequested\":512,\"hardwareOutputMuted\":true,\"gui\":false,\"rows\":[";
                        contents=contents++rows.collect{|row|"["++row.collect{|value|if(value.isString){value.asCompileString}{value.asString}}.join(",")++"]"}.join(",")++"]}";
                        File.use(dir+/+"live-cpu.json","w",{|file|file.write(contents)});
                        "AWB52_LIVE_CPU=PASS".postln;finish.value(0);
                    }{|error|error.reportError;finish.value(1)};
                }).play(SystemClock);
            }));
        }{|error|error.reportError;finish.value(1)};
    }).play(SystemClock);
},100,{"AWB52 owned server boot failed".error;finish.value(1)});
server.boot;
)
