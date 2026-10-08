// Set-specific control graph. Public bases/depths are AWParams; the captured
// selector/Math network runs at KR. LocalIn is used ONLY for its feedback edges.
// Plugin outputs are normalized KR buses mapped directly with VSTPlugin.mapMsg.
AWBFXMixProfile {
    var <kind,<server,<group,<node,<params,<outputBus,<closed=false,options,outputs,hook,quitHook,ownsDefinition=false,definitionName;
    *new { |kind,target,server,configuration,options|^super.new.init(kind,target,server,configuration,options) }
    *controls { |kind|
        if([\fuzz,\um].includes(kind)){^AWBAdditionalFXProfile.controls(kind)};
        ^if(kind==\deci){
            [\shape,\a,\aDepth,\aFolding,\depth,\folding,\depthSC,\foldingSC,\amount,\depthAmount,\foldingAmount,\wet,\level,\lfoRate,\lfoAmount,\rolloff,\mixerBase]
        }{
            [\sparkle,\shape,\tailMix,\pitchSelect,\tailShape,\aSpark,\aShape,\aTail,\aPitch,\aTailShape,\amountSpark,\amountShape,\amountTail,\amountPitch,\amountTailShape,\upperA,\lowerA,\upperB,\lowerB,\delaySC,\aDelayFeedback,\delayFeedbackAmount,\pitchTime,\delayTime,\tailDepth,\tailFolding,\level,\mixerBase]
        };
    }
    *outputNames { |kind|
        if([\fuzz,\um].includes(kind)){^AWBAdditionalFXProfile.outputNames(kind)};
        ^if(kind==\deci){[\wet,\gain,\volume,\depth,\folding,\lowDb,\midDb,\lfo,\rate,\position,\math]}{
            [\spiralWet,\upperWet,\lowerWet,\delayWet,\upperOctave,\upperPitch,\upperFeedback,\upperCents,\upperTime,\lowerOctave,\lowerPitch,\lowerFeedback,\delayFeedback,\delayAuto,\delayTime,\tailDepth,\tailFolding,\pitchMix,\tailMix,\gain,\volume,\pitchGain,\position,\math]
        };
    }
    *mix { |weights,depths|^weights.collect{|w,i|w*depths[i]}.sum }
    *compile { |kind,configuration|
        var ids=this.controls(kind),bases=configuration[\pluginBases],pole=(configuration[\basePole] ? true).asInteger;
        if([\fuzz,\um].includes(kind)){^AWBAdditionalFXProfile.compile(kind,configuration)};
        ^SynthDef(("awb52Profile_"++kind++UniqueID.next).asSymbol,{|out=0|
            var values=In.kr(NamedControl.kr(\buses,Array.fill(ids.size,0)),1),c,previous,weights,math,position,result;
            c=IdentityDictionary.new;ids.do{|id,i|c[id]=values[i]};
            if(kind==\deci){
                var lfo,rate,depthSC,foldSC,depth,fold,roll,full=configuration[\fullParameterRanges] ? false;
                previous=LocalIn.kr(1,0).asArray;
                position=(c[\shape]+(previous[0]*0.53)).clip(0,1);
                weights=AWSelectN.signals(position,4,pole);
                math=c[\a]*(c[\amount]+AWBFXMixProfile.mix(weights,[0.4,0.7,0.85,1]));
                rate=c[\lfoRate]*2.187.pow(math);
                lfo=SinOsc.kr(rate,0)*(c[\lfoAmount]+AWBFXMixProfile.mix(weights,[0,0.175,0.35,0.695])).clip(0,1);
                depthSC=(c[\depthSC]+(lfo*0.6)).clip(0,1);
                foldSC=(c[\foldingSC]-(lfo*0.5)).clip(0,1);
                if(full){
                    // Full plugin bases, retaining the captured modulation depths.
                    depth=(c[\depth]-(lfo*0.044)+(c[\aDepth]*(c[\depthAmount]+depthSC)*0.2)).clip(0,1);
                    fold=(c[\folding]+(lfo*0.1166)+(c[\aFolding]*(c[\foldingAmount]+foldSC)*0.53)).clip(0,1);
                }{
                    depth=((c[\depth]-(lfo*0.22)+(c[\aDepth]*(c[\depthAmount]+depthSC))).clip(0,1)*2)-1;
                    fold=((c[\folding]+(lfo*0.22)+(c[\aFolding]*(c[\foldingAmount]+foldSC))).clip(0,1)*2)-1;
                };
                roll=(c[\rolloff]-(math*0.29)).clip(0,1);
                result=[(c[\wet]+(c[\shape]*0.395)+math).clip(0,1),
                    (configuration[\gainDb]+AWBFXMixProfile.mix(weights,[6,6,6.48,8.4])+(math*8.4)).dbamp*c[\level],
                    AWBVerbMixProfile.amplitude(c[\mixerBase]+AWBFXMixProfile.mix(weights,[0.583,0.726,0.919,1.033])),
                    if(full){depth}{(bases[\deci][\depth]+(depth*0.1)).clip(0,1)},if(full){fold}{(bases[\deci][\folding]+(fold*0.265)).clip(0,1)},
                    roll*(-16.8),roll*(-6.96),lfo,rate,position,math];
                LocalOut.kr([math]);
            }{
                var shape,tail,wetWeights,pitchWeights,tailWeights,spark,shapeMath,tailMath,pitchMath,tailShapeMath;
                var pitch,tailShape,upperA=c[\upperA],lowerA=c[\lowerA],upperB=c[\upperB],lowerB=c[\lowerB],time,fb;
                previous=LocalIn.kr(4,0); // sparkle math, shape macro, tail math, shape math
                shape=(c[\shape]+(previous[3]*0.505)).clip(0,1);
                tail=(c[\tailMix]+(previous[2]*0.185)).clip(0,1);
                weights=AWSelectN.signals(tail,4,pole); // amount bank (user: Select-4 1)
                wetWeights=AWSelectN.signals((shape+(previous[0]*0.84)).clip(0,1),4,pole);
                spark=c[\aSpark]*(c[\amountSpark]+AWBFXMixProfile.mix(weights,[0.65,0.6,1.05,0.65]));
                shapeMath=(c[\aShape]+(previous[1]*0.42)).clip(0,1)*(c[\amountShape]+AWBFXMixProfile.mix(weights,[0.35,0.5,1.05,0.65]));
                tailMath=c[\aTail]*(c[\amountTail]+AWBFXMixProfile.mix(weights,[0.26,0.64,0.75,0.82]));
                pitchMath=c[\aPitch]*(c[\amountPitch]+AWBFXMixProfile.mix(weights,[0,0.4,0.91,1.1]));
                tailShapeMath=c[\aTailShape]*(c[\amountTailShape]+AWBFXMixProfile.mix(weights,[0.28,0.28,0.44,0.86]));
                pitch=(c[\pitchSelect]+(pitchMath*0.555)).clip(0,1);
                pitchWeights=AWSelectN.signals(pitch,4,pole);
                tailShape=(c[\tailShape]+(tailShapeMath*0.34)).clip(0,1);
                tailWeights=AWSelectN.signals(tailShape,4,pole);
                time=(c[\pitchTime]+(spark*0.51)+(shape*0.48)).clip(0,1);
                fb=c[\aDelayFeedback]*(c[\delayFeedbackAmount]+c[\delaySC]+AWBFXMixProfile.mix(tailWeights,[0,0.225,0.64,1]));
                result=[
                    (bases[\spiral][\wetdry]+AWBFXMixProfile.mix(wetWeights,[0.52,0.78,0.665,0.34])).clip(0,1),
                    (bases[\upper][\wetdry]+AWBFXMixProfile.mix(pitchWeights,[0.5,0.66,0.85,0.15])).clip(0,1),
                    (bases[\lower][\wetdry]+AWBFXMixProfile.mix(pitchWeights,[0,0.33,0.84,1])).clip(0,1),
                    (bases[\delay][\wetdry]+AWBFXMixProfile.mix(wetWeights,[0.18,0.43,0.665,0.75])).clip(0,1),
                    (bases[\upper][\octave]+(upperA*0.15)).clip(0,1),
                    (bases[\upper][\pitchshift]+(upperA*0.225)+(upperB*0.28)).clip(0,1),
                    (bases[\upper][\feedback]+(upperA*0.28)+(upperB*0.11)).clip(0,1),
                    (bases[\upper][\cents]+(upperB*0.06)).clip(0,1),
                    (bases[\upper][\time]+(time*0.11)).clip(0,1),
                    (bases[\lower][\octave]-(lowerB*0.21)).clip(0,1),
                    (bases[\lower][\pitchshift]-(lowerA*0.5)).clip(0,1),
                    (bases[\lower][\feedback]+(lowerA*0.135)+(lowerB*0.59)).clip(0,1),
                    (bases[\delay][\feedback]+AWBFXMixProfile.mix(tailWeights,[0.215,0.15,0.055,0.045])+(fb*0.495)).clip(0,1),
                    (bases[\delay][\envmodulate]+(AWBFXMixProfile.mix(tailWeights,[0,0.205,0.53,0.035])*0.015)).clip(0,1),
                    (bases[\delay][\time]+(c[\delayTime]*0.065)).clip(0,1),
                    (bases[\tailDeci][\depth]+((c[\tailDepth]*2-1)*0.11)).clip(0,1),
                    (bases[\tailDeci][\folding]+((c[\tailFolding]*2-1)*0.185)).clip(0,1),
                    (c[\sparkle]+(spark*0.395)).clip(0,1),tail,
                    (configuration[\gainDb]+AWBFXMixProfile.mix(weights,[6,6,6.48,6.24])+(spark*3.12)).dbamp*c[\level],
                    AWBVerbMixProfile.amplitude(c[\mixerBase]+AWBFXMixProfile.mix(weights,[0.6,0.85,0.9,0.85])),
                    (-6.7).dbamp,tail, spark];
                LocalOut.kr([spark,shape,tailMath,shapeMath]);
            };
            ReplaceOut.kr(out,result);
        });
    }
    init { |id,target,s,configuration,opts|
        var def,defaults,ids;kind=id.asSymbol;options=(opts ? ()).copy.put(\polarity,\unipolar);server=s ? target.server;
        if([\deci,\spark,\fuzz,\um].includes(kind).not){Error("Unknown FX profile").throw};
        ids=this.class.controls(kind);outputs=this.class.outputNames(kind);params=IdentityDictionary.new;
        defaults=configuration[\defaults] ? ();ownsDefinition=options[\definition].isNil;def=options[\definition] ?? {this.class.compile(kind,configuration)};definitionName=def.name;
        try {
            group=Group.basicNew(server);this.dispatch(group.newMsg(target,\addToTail));options[\ownFunction].value(group,\container,(name:kind.asString++" modulation",parent:target));
            SynthDescLib.global.add(def.asSynthDesc);
            if(options[\sendFunction].notNil){[AWParam.synthDef,AWParam.routeDef].do{|d|SynthDescLib.global.add(d.asSynthDesc);this.dispatch([\d_recv,d.asBytes])};if(ownsDefinition){this.dispatch([\d_recv,def.asBytes])}};
            ids.do{|key|
                // All authored macro/source values are unipolar. Signed LFO signals
                // and captured target depths belong to the profile DSP, not these knobs.
                var spec=if(key==\lfoRate){ControlSpec(0.001,20,\exp)}{if(key.asString.beginsWith("amount") or:{[\amount,\depthAmount,\foldingAmount].includes(key)}){ControlSpec(0,2)}{if(key==\level){ControlSpec(0,4)}{nil}}};
                params[key]=AWParam(key,defaults[key] ? if(key==\level){1}{if(key==\lfoRate){0.04}{0}},spec,1,0,group,server,options);
            };
            outputBus=Bus.control(server,outputs.size);if(outputBus.index.isNil){Error("FX modulation bus allocation exhausted").throw};
            node=Synth.basicNew(def.name,server);
            if(ownsDefinition and:{options[\sendFunction].isNil}){
                def.send(server,node.newMsg(group,[\out,outputBus.index,\buses,ids.collect{|key|params[key].outputBus.index}],\addToTail));
            }{this.dispatch(node.newMsg(group,[\out,outputBus.index,\buses,ids.collect{|key|params[key].outputBus.index}],\addToTail))};
            options[\ownFunction].value(node,\synth,(name:kind.asString++" profile DSP",parent:group));
            quitHook={this.free(false)};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].isNil){hook={|n,what|if(what==\n_end){this.free(false)}};group.register;group.addDependant(hook)};
        }{|e|this.free;e.throw};^this;
    }
    dispatch { |msg|if(options[\sendFunction].notNil){options[\sendFunction].value(msg)}{server.sendMsg(*msg)};^this }
    param { |id|if(closed){Error("FX profile closed").throw};^params[id.asSymbol] ?? {Error("Unknown FX macro: "++id).throw} }
    bus { |id|var i=outputs.indexOf(id.asSymbol);if(closed or:{i.isNil}){Error("Unknown/closed FX output").throw};^Bus.new(\control,outputBus.index+i,1,server) }
    // Borrowed upstream follower/blender; AWParam retains base, amount and curve.
    addModulation { |control,id,source,amount=1,curve=0,timing=\sameBlock,action|^this.param(control).addModulation(id,source,amount,curve,timing,action) }
    before { |consumer|this.dispatch(group.moveBeforeMsg(consumer));^this }
    free { |send=true|
        if(closed){^this};closed=true;ServerQuit.remove(quitHook,server);
        if(hook.notNil){group.removeDependant(hook);group.unregister};
        params.values.do{|p|p.free(send)};
        if(send and:{group.notNil}){this.dispatch(group.freeMsg)};
        if(ownsDefinition and:{definitionName.notNil}){if(send){this.dispatch([\d_free,definitionName])};SynthDescLib.global.removeAt(definitionName)};
        [node,group].reject(_.isNil).do{|n|options[\disownFunction].value(n)};
        if(outputBus.notNil and:{outputBus.index.notNil}){
            if(options[\sendFunction].notNil or:{server.serverRunning.not}){outputBus.free}{Routine({server.sync;if(outputBus.index.notNil){outputBus.free}}).play(SystemClock)};
        };^this;
    }
}
