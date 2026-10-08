// Signed envelope × captured LFO checks on the actual profile DSP.
{|base,view|
    Routine({
        var set=base.resourceAt(\firstPassSet),profile=set.fxMix(\deci),server=base.server,checks=0,failures=0,read,check;
        read={|bus|
            var done=false,value,limit=Main.elapsedTime+2;
            bus.getn(bus.numChannels,{|values|value=values[0];done=true});
            while{done.not and:{Main.elapsedTime<limit}}{0.002.wait};
            if(done.not){Error("Deci LFO probe bus read timeout").throw};value;
        };
        check={|actual,expected,label|
            checks=checks+1;if((actual-expected).abs>0.0001){failures=failures+1;("DECI_LFO|FAIL|"++label++"|"++actual++"|"++expected).postln}{("DECI_LFO|PASS|"++label++"|"++actual++"|"++expected).postln};
        };
        try {
            base.rack.masterGroup.set(\level,0);
            base.followers.values.do{|signal|signal.controller.run(false)};
            base.blenders.values.do{|signal|signal.controller.run(false)};
            base.blenders.keys.do{|id|base.b[id].set(0)};
            profile.param(\shape).setBase(0);profile.param(\a).setBase(0);
            profile.param(\lfoAmount).setBase(0.7);profile.param(\lfoRate).setBase(0.04);
            profile.param(\depthAmount).setBase(0);profile.param(\foldingAmount).setBase(0);
            base.b[\deci_1].set(0.3);base.b[\deci_2].set(0.3);
            [0.3,1.3,-0.3].do{|sourceValue|
            base.b[\deci_1].set(sourceValue);base.b[\deci_2].set(sourceValue);
            [-1,-0.5,0,0.5,1].do{|amount|
                profile.node.run(true);
                [\depth,\folding].do{|id|profile.param(id).setBase(0.5);profile.param(id).setAmount(amount);profile.param(id).setModCurve(0)};
                server.sync;0.3.wait;profile.node.run(false);server.sync;
                {
                    var lfo=read.value(profile.bus(\lfo)),source=sourceValue.clip(-1,1);
                    var depthBase=(0.5+(amount*source*0.2)).clip(0,1),foldBase=(0.5+(amount*source*0.53)).clip(0,1);
                    var depth=(depthBase-(lfo*0.044)+(source*((amount+(lfo*0.6)).clip(if(amount<0){-1}{0},1)-amount)*0.2)).clip(0,1);
                    var fold=(foldBase+(lfo*0.1166)+(source*((amount-(lfo*0.5)).clip(if(amount<0){-1}{0},1)-amount)*0.53)).clip(0,1);
                    check.value(read.value(profile.param(\depth).outputBus),depthBase,"signed depth envelope "++amount++" source "++sourceValue);
                    check.value(read.value(profile.param(\folding).outputBus),foldBase,"signed folding envelope "++amount++" source "++sourceValue);
                    check.value(read.value(profile.bus(\depth)),depth,"depth envelope plus LFO "++amount++" source "++sourceValue);
                    check.value(read.value(profile.bus(\folding)),fold,"folding envelope plus LFO "++amount++" source "++sourceValue);
                }.value;
            };
            };
            ~awbLiveClose.value;server.sync;
            ("AWB_DECI_ENVELOPE_LFO_RESULT="++if(failures==0){"PASS"}{"FAIL"}++" checks="++checks++" failures="++failures).postln;
            ("AWB_MIGRATION_FUNCTIONAL_RESULT="++if(failures==0){"PASS"}{"FAIL"}++" checks="++checks).postln;
            server.quit;1.wait;if(failures==0){0.exit}{1.exit};
        }{|error|error.reportError;~awbLiveClose.value;server.quit;1.wait;1.exit};
    }).play(SystemClock);
}
