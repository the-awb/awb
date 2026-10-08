// Native cello gain/pan chopper. Configuration is authored in BaseLaunch.
// This is a first-pass replacement: Bitwig's uncaptured Polynom is not guessed.
AWBCelloStutter {
    var <server,<group,<node,<params,<closed=false,options,definitionName,ownsDefinition;
    *waveforms { ^[\tri,\pulse,\sine,\saw,\custom] }
    *settings { |given|
        var config=(rate:4,waveform:\tri,pulseWidth:0.5,depthDb:45.4,panAmount:0.52,
            panRate:0.1,panDepth:0.39,rateMultiplier:30.34,rateMod:0.6,smoothing:0.002,
            custom:[0,0,1,1,0,1,0,0]);
        config.putAll(given ? ());
        if(this.waveforms.includes(config[\waveform]).not){Error("Stutter waveform must be tri, pulse, sine, saw or custom").throw};
        [(\rate -> [0.05,200]),(\pulseWidth -> [0.01,0.99]),(\depthDb -> [0,60]),
            (\panAmount -> [0,1]),(\panRate -> [0.001,20]),(\panDepth -> [0,1]),
            (\rateMultiplier -> [1,100]),(\rateMod -> [0,1]),(\smoothing -> [0.0001,0.05])].do{|pair|
            var value=config[pair.key],bounds=pair.value;
            AWParam.finite(value,pair.key.asString);
            if(value<bounds[0] or:{value>bounds[1]}){Error("Stutter setting out of range: "++pair.key).throw};
        };
        if(config[\custom].isArray.not or:{config[\custom].size<2} or:{config[\custom].size>128}){Error("Stutter custom shape needs 2..128 values in 0..1").throw};
        config[\custom].do{|value|AWParam.finite(value,"custom shape");if(value<0 or:{value>1}){Error("Stutter custom shape values must be in 0..1").throw}};
        ^config;
    }
    *compile { |name,given,width=2|
        var config=this.settings(given),shape=config[\custom];
        if([1,2].includes(width).not){Error("Stutter input must be mono or stereo").throw};
        ^SynthDef(name,{|in=0,out=0,amount=0,waveform=0,rate=4,envelope=0|
            var input=In.ar(in,width),depth=Lag.kr(amount.clip(0,1),0.005),phase,waves,wave,gain,pan;
            var frequency=(rate.clip(0.05,200)*config[\rateMultiplier].pow(envelope.clip(0,1)*config[\rateMod])).clip(0.05,200);
            phase=LFSaw.ar(frequency,1).range(0,1);
            waves=[1-((phase*2)-1).abs,phase<config[\pulseWidth],(1-(phase*2pi).cos)*0.5,phase,
                IEnvGen.ar(Env(shape++[shape[0]],Array.fill(shape.size,1/shape.size),\lin),phase)];
            wave=Select.ar(waveform.round.clip(0,4),waves).clip(0,1);
            gain=Lag.ar((wave*(0-config[\depthDb])*depth).dbamp,config[\smoothing]);
            pan=Lag.ar((((wave*2)-1)*config[\panAmount]+SinOsc.ar(config[\panRate],0,config[\panDepth]))*depth,config[\smoothing]).clip(-1,1);
            if(width==1){input=input!2};
            // Centre is exact unity per channel; panning only attenuates. No gain boost.
            Out.ar(out,input*gain*[1-pan.max(0),1+pan.min(0)]);
        });
    }
    *new { |input,output,target,configuration,opts|^super.new.init(input,output,target,configuration,opts ? ()) }
    init { |input,output,target,given,opts|
        var config=this.class.settings(given),def;
        options=opts.copy.put(\polarity,\unipolar);server=target.server;params=IdentityDictionary.new;
        if(input.rate!=\audio or:{output.rate!=\audio} or:{output.numChannels!=2} or:{input.server!==server} or:{output.server!==server}){Error("Stutter needs audio buses on its server and stereo output").throw};
        ownsDefinition=options[\definition].isNil;
        def=options[\definition] ?? {this.class.compile(("awbCelloStutter"++UniqueID.next).asSymbol,config,input.numChannels)};
        definitionName=def.name;
        try {
            SynthDescLib.global.add(def.asSynthDesc);
            if(ownsDefinition){if(options[\sendFunction].notNil){this.dispatch([\d_recv,def.asBytes])}{def.send(server);server.sync}};
            group=Group.basicNew(server);this.dispatch(group.newMsg(target,\addToTail));options[\ownFunction].value(group,\container,(name:"Cello Stutter",parent:target));
            params[\amount]=AWParam(\stutter,0,target:group,server:server,options:options);
            params[\waveform]=AWParam(\stutterWave,this.class.waveforms.indexOf(config[\waveform]),ControlSpec(0,4),target:group,server:server,options:options.copy.put(\baseSmoothing,0));
            params[\rate]=AWParam(\stutterRate,config[\rate],ControlSpec(0.05,200,\exp),target:group,server:server,options:options);
            params[\envelope]=AWParam(\stutterEnvelope,0,amount:1,target:group,server:server,options:options);
            node=Synth.basicNew(def.name,server);this.dispatch(node.newMsg(group,[\in,input.index,\out,output.index],\addToTail));options[\ownFunction].value(node,\synth,(name:"Cello Stutter gain/pan",parent:group));
            params.keysValuesDo{|id,param|
                if(options[\modulationRegistry].notNil){param.mapToChecked(node,id,registry:options[\modulationRegistry])}{param.mapTo(node,id)};
            };
        }{|error|this.free;error.throw};^this;
    }
    param { |id|if(closed){Error("Cello Stutter closed").throw};^params[id.asSymbol] ?? {Error("Unknown cello Stutter control").throw} }
    dispatch { |message|if(options[\sendFunction].notNil){options[\sendFunction].value(message)}{server.sendMsg(*message)};^this }
    free { |send=true|
        if(closed){^this};closed=true;params.values.do{|param|param.free(send)};
        if(send and:{group.notNil}){this.dispatch(group.freeMsg)};
        [node,group].reject(_.isNil).do{|owned|options[\disownFunction].value(owned)};
        if(ownsDefinition and:{definitionName.notNil}){if(send){this.dispatch([\d_free,definitionName])};SynthDescLib.global.removeAt(definitionName)};^this;
    }
}
