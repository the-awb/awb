// Owned muted server: plugin readback only, not CPU/dropout benchmarking.
(
var dir=thisProcess.nowExecutingPath.dirname,s,setup,finished=false,count=0,finish,readBus,readParam;
s=Server(\awb52PluginReadback,NetAddr("127.0.0.1",59379),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(2).memSize_(262144));
s.options.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins",dir+/+"plugins"];
finish={|code|if(finished.not){finished=true;setup.tryPerform(\close);s.quit;SystemClock.sched(1,{code.exit;nil})}};
readBus={|bus|var value,wait=Condition.new(false);bus.get{|v|value=v;wait.test=true;wait.signal};wait.wait;value};
readParam={|controller,index|var value,wait=Condition.new(false);controller.get(index,{|v|value=v;wait.test=true;wait.signal});wait.wait;value};
SystemClock.sched(75,{"Plugin readback timed out".error;finish.value(1)});
s.waitForBoot({s.mute;Routine({
    try {
        var specification=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
        setup=AWBFirstPassSet.open(specification,(server:s,track:false,verbProfiles:true,fxProfiles:true,celloScheps:specification[\components][\celloScheps].notNil,fuzzPlugin:specification[\components][\fuzz].notNil,sharedFX:specification[\sharedFX].notNil,controlSends:false,onError:{|e,set|finish.value(1)},onReady:{|set|
            Routine({
                try {
                    var maps=[[\deci,\depth,\depth],[\deci,\folding,\folding],[\spiral,\wetdry,\spiralWet],[\upper,\wetdry,\upperWet],[\lower,\wetdry,\lowerWet],[\delay,\wetdry,\delayWet],[\delay,\feedback,\delayFeedback],[\tailDeci,\depth,\tailDepth]];
                    var previous=List.new;
                    if(set.plugin(\fuzz).notNil){maps=maps++[[\fuzz,\Mix,\mix],[\fuzz,\Gain,\gain],[\fuzz,\Output,\output],[\fuzz,\Input,\input],[\fuzz,'Low-Mid Gain',\lowMidGain],[\fuzz,'High-Mid Gain',\highMidGain]]};
                    if(set.plugin(\um).notNil){maps=maps++[[\um,\Mix,\mix],[\um,\Depth,\depth],[\um,\DetuneDepth,\detuneDepth],[\um,\DetuneRate,\detuneRate],[\um,\VibratoDepth,\vibratoDepth],[\um,\VibratoRate,\vibratoRate],[\um,\DriveInGain,\driveInGain],[\um,\DriveNoiseGain,\driveNoiseGain],[\um,\DiffEnable,\diffEnable],[\um,\Diffusion,\diffusion],[\um,\DiffSize,\diffSize],[\um,\Delay,\delay],[\um,\Feedback,\feedback],[\um,\OverMod,\overMod]]};
                    2.do{|pass|
                        set.fxMix(\deci).param(\shape).set(0.25);set.fxMix(\deci).param(\depth).set(if(pass==0){0.8}{0.2});
                        set.fxMix(\spark).param(\tailMix).set(if(pass==0){0.5}{1});set.fxMix(\spark).param(\aSpark).set(0.4);
                        set.fxMix(\spark).param(\pitchSelect).set(if(pass==0){0.5}{1});
                        if(set.plugin(\fuzz).notNil){set.fxMix(\fuzz).param(\shape).set(if(pass==0){0.2}{0.6});set.fxMix(\fuzz).param(\aFuzz).set(if(pass==0){0.2}{0.7})};
                        if(set.plugin(\um).notNil){
                            [\main,\earth,\diffusion,\innerRate,\innerDepth,\shape,\wonk].do{|id|set.sharedMix.param(id).set(if(pass==0){0.25}{0.75})};
                            [\aMix,\aDrive,\aNoise,\aDepth,\aRate,\aWonk].do{|id|set.sharedMix.param(id).set(0.4)};
                        };
                        s.sync;0.25.wait;
                        maps.do{|entry,i|
                            var role=entry[0],key=entry[1],profile=if(role==\um){set.sharedMix}{set.fxMix(if(role==\deci){\deci}{if(role==\fuzz){\fuzz}{\spark}})};
                            var index=set.spec[\components][role][\parameterNames].indexOfEqual(key.asString);
                            var controller=set.plugin(role),expected=readBus.value(profile.bus(entry[2])),actual=readParam.value(controller,index),canonical;
                            // Plugins may quantize normalized inputs (Decimate folding does).
                            // Compare mapping with the SAME value sent through the direct setter.
                            controller.unmap(index);controller.set(index,expected);s.sync;0.03.wait;canonical=readParam.value(controller,index);
                            controller.map(index,profile.bus(entry[2]));
                            if((actual-canonical).abs>1e-5){Error("Plugin bus mapping mismatch: "++role++"/"++key++" "++actual++" != direct "++canonical).throw};
                            if(pass==0){previous.add(actual)}{if([0,3,4].includes(i) and:{(actual-previous[i]).abs<0.05}){Error("Mapped plugin did not respond to changed profile").throw}};
                            count=count+1;("READBACK "++pass++" "++role++"/"++key++" actual="++actual++" input="++expected++" direct="++canonical).postln;
                        };
                    };
                    if(set.plugin(\celloScheps).notNil){
                        set.spec[\components][\celloScheps][\params].clump(2).do{|pair|
                            var actual=readParam.value(set.plugin(\celloScheps),pair[0]);
                            if((actual-pair[1]).abs>1e-5){Error("Scheps static readback mismatch at "++pair[0]).throw};count=count+1;
                        };
                    };
                    [\fuzz,\stereoScheps].do{|role|
                        var controller=set.plugin(role),mapped=if(role==\fuzz){[1,2,3,6,11,12]}{[]};
                        if(controller.notNil){set.spec[\components][role][\params].clump(2).do{|pair|
                            var actual;if(mapped.includes(pair[0]).not){actual=readParam.value(controller,pair[0]);if((actual-pair[1]).abs>1e-5){Error("Static stereo plugin readback mismatch "++role++"/"++pair[0]).throw};count=count+1};
                        }};
                    };
                    ("AWB_PLUGIN_READBACK=PASS count="++count).postln;finish.value(0);
                }{|e|e.reportError;finish.value(1)};
            }).play(SystemClock);
        }));
    }{|e|e.reportError;finish.value(1)};
}).play(SystemClock)},30,{finish.value(1)});s.boot;
)
