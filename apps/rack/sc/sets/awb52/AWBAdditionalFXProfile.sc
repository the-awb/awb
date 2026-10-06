// Set-specific captured Fuzz and UM graphs. Public source/amount controls are
// AWParams in AWBFXMixProfile. Only the Fuzz selector feedback uses LocalIn.
AWBAdditionalFXProfile {
    *controls { |kind|
        ^if(kind==\fuzz){[\shape,\aFuzz,\amount,\mixerBase,\level,\lfoRate,\lfoAmount,\lfoEnabled]}{
            [\mix,\main,\earth,\diffusion,\innerDepth,\innerRate,\wonk,\overMod,\shape,
             \aMix,\aDrive,\aNoise,\aDepth,\aRate,\aWonk,\amountMix,\amountDrive,\amountNoise,\amountDepth,\amountRate,\amountWonk,
             \depthBase,\detDepthBase,\detRateBase,\vibDepthBase,\vibRateBase,\driveBase,\noiseBase,
             \schertlerMix,\aSchertler,\level]};
    }
    *outputNames { |kind|
        ^if(kind==\fuzz){[\mix,\gain,\output,\input,\lowMidGain,\highMidGain,\volume,\level,\lfo,\rate,\position,\math]}{
            [\mix,\depth,\detuneDepth,\detuneRate,\vibratoDepth,\vibratoRate,\driveInGain,\driveNoiseGain,\diffEnable,\diffusion,\diffSize,\delay,\feedback,\overMod,\schepsMix,\level,\mixMath,\depthMath,\rateMath,\wonkMath]};
    }
    *compile { |kind,configuration|
        var ids=this.controls(kind),base=configuration[\pluginBases],tables=configuration[\tables];
        var pole=(configuration[\basePole] ? true).asInteger;
        ^SynthDef(("awb52Profile_"++kind++UniqueID.next).asSymbol,{|out=0|
            var values=In.kr(NamedControl.kr(\buses,Array.fill(ids.size,0)),1),c=IdentityDictionary.new,result;
            var mix={|weights,bank,target|AWBFXMixProfile.mix(weights,tables[bank][target] ? [0,0,0,0])};
            ids.do{|id,i|c[id]=values[i]};
            if(kind==\fuzz){
                var previous=LocalIn.kr(1,0).asArray,position,weights,math,rate,lfo;
                // Captured Select depth is 3: zero is S1, rather than an empty pole.
                position=(c[\shape]+(previous[0]*(1.52/3))).clip(0,1);
                weights=AWSelectN.signals(position,4,0);
                math=c[\aFuzz]*(c[\amount]+(c[\shape]*0.51)+mix.value(weights,\fuzz,\mathAmount));
                rate=(c[\lfoRate]*2.558.pow(math)).clip(0.001,20);
                lfo=SinOsc.kr(rate,0)*c[\lfoEnabled]*(c[\lfoAmount]+mix.value(weights,\fuzz,\lfoAmount)+(math*0.285)).clip(0,1);
                result=[(base[\Mix]+(math*0.44)+(lfo*0.065)).clip(0,1),
                    (base[\Gain]+(math*0.105)).clip(0,1),
                    (base[\Output]+mix.value(weights,\fuzz,\output)+(math*0.035)).clip(0,1),
                    (base[\Input]+mix.value(weights,\fuzz,\input)).clip(0,1),
                    (base['Low-Mid Gain']+(lfo*0.045)).clip(0,1),
                    (base['High-Mid Gain']+(lfo*0.02)).clip(0,1),
                    AWBVerbMixProfile.amplitude(c[\mixerBase]+mix.value(weights,\fuzz,\volume)+(math*0.15)),
                    configuration[\gainDb].dbamp*c[\level],lfo,rate,position,math];
                LocalOut.kr([math]);
            }{
                var main=AWSelectN.signals(c[\main],4,pole),earth=AWSelectN.signals(c[\earth],4,pole),diff=AWSelectN.signals(c[\diffusion],4,pole);
                var depth=AWSelectN.signals(c[\shape],4,pole),drive,noise,dm,rm,mm,wm,innerDepth,innerRate,vibDepth,vibRate;
                var vibDepthWeights,vibWeights,assign=(configuration[\mainMathTarget] ? \mix).asSymbol;
                drive=c[\aDrive]*(c[\amountDrive]+mix.value(earth,\drive,\driveAmount));
                noise=c[\aNoise]*(c[\amountNoise]+mix.value(earth,\drive,\noiseAmount));
                dm=c[\aDepth]*(c[\amountDepth]+mix.value(depth,\depth,\depthAmount)+if(assign==\depth){c[\main]*0.48}{0});
                rm=c[\aRate]*(c[\amountRate]+mix.value(depth,\depth,\rateAmount)+if(assign==\rate){c[\main]*0.48}{0});
                mm=c[\aMix]*(c[\amountMix]+mix.value(depth,\depth,\mixAmount)+if(assign==\mix){c[\main]*0.48}{0});
                wm=c[\aWonk]*(c[\amountWonk]+c[\wonk]+if(assign==\wonk){c[\main]*0.48}{0});
                innerDepth=(c[\innerDepth]+dm+mix.value(main,\main,\innerDepth)).clip(0,1);
                innerRate=(c[\innerRate]+(rm*0.92)+mix.value(main,\main,\innerRate)).clip(0,1);
                vibDepthWeights=AWSelectN.signals(innerDepth,4,pole);vibWeights=AWSelectN.signals(innerRate,4,pole);
                vibDepth=(c[\vibDepthBase]+mix.value(vibDepthWeights,\vibDepth,\vibDepth)+(dm*0.18)).clip(0,1);
                vibRate=(c[\vibRateBase]+mix.value(vibWeights,\vib,\vibRate)+mix.value(main,\main,\vibRate)+(rm*0.255)).clip(0,1);
                result=[(base[\Mix]+c[\mix]+(mm*0.5)).clip(0,1),
                    (base[\Depth]+c[\depthBase]+mix.value(depth,\depth,\depth)+mix.value(main,\main,\depth)).clip(0,1),
                    (base[\DetuneDepth]+((c[\detDepthBase]+mix.value(vibDepthWeights,\vibDepth,\detDepth)).clip(0,1)*0.645)).clip(0,1),
                    (base[\DetuneRate]+((c[\detRateBase]+mix.value(vibWeights,\vib,\detRate)).clip(0,1)*0.64)).clip(0,1),
                    (base[\VibratoDepth]+vibDepth).clip(0,1),(base[\VibratoRate]+(vibRate*0.515)).clip(0,1),
                    (base[\DriveInGain]+((c[\driveBase]+mix.value(earth,\drive,\drive)+drive).clip(0,1)*0.425)).clip(0,1),
                    (base[\DriveNoiseGain]+c[\noiseBase]+mix.value(earth,\drive,\noise)+noise).clip(0,1),
                    (base[\DiffEnable]+mix.value(diff,\diff,\enabled)).clip(0,1),
                    (base[\Diffusion]+mix.value(diff,\diff,\diffusion)).clip(0,1),(base[\DiffSize]+mix.value(diff,\diff,\size)).clip(0,1),
                    (base[\Delay]+(wm*0.44)).clip(0,1),(base[\Feedback]+(wm*0.27)).clip(0,1),(base[\OverMod]+c[\overMod]).clip(0,1),
                    (c[\schertlerMix]*c[\aSchertler]*0.66).clip(0,1),c[\level],mm,dm,rm,wm];
            };
            ReplaceOut.kr(out,result);
        });
    }
}
