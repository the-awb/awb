AWBSendRackVoice {
    *build { |name, source, ports, mutable=false|
        var ids=ports.collect{|p|p[\id]}, def;
        if(source.isKindOf(Function).not or:{ports.isEmpty} or:{ids.as(Set).size!=ids.size}) {
            Error("Voice wrapper requires a source and unique nonempty ports").throw;
        };
        ports.do{|p|this.validateBus(p[\bus],ports[0][\bus].server,p[\bus].numChannels)};
        def=SynthDef(name,{
            var signal=SynthDef.wrap(source).asArray;
            var buses=NamedControl.ir(\sendBuses,ports.collect{|p|p[\bus].index}).asArray;
            var gains=NamedControl.perform(if(mutable){\kr}{\ir},\sendGains,Array.fill(ports.size,0.0)).asArray;
            ports.do{|p,i|
                if(signal.size!=p[\bus].numChannels){Error("Voice/destination widths differ; convert explicitly").throw};
                OffsetOut.ar(buses[i],signal*gains[i]);
            };
        });
        def.metadata.put(\awbSendRack,(slotIDs:ids,packed:true,mutable:mutable));
        ^def;
    }
    *validateBus { |bus, server, width|
        if(bus.isKindOf(Bus).not or:{bus.index.isNil} or:{bus.rate!=\audio}
            or:{bus.server!==server} or:{bus.numChannels!=width}
            or:{bus.index<(server.options.numInputBusChannels+server.options.numOutputBusChannels)}
            or:{bus.index+width>server.options.numAudioBusChannels}) {
            Error("Routing requires a live private audio Bus on this server with matching width").throw;
        };
        ^bus;
    }
    *gain { |value|
        if(value.isNumber.not or:{value.isNaN} or:{value.abs==inf} or:{value<0}) {
            Error("Gain must be a finite nonnegative amplitude").throw;
        };
        ^value;
    }
    *normaliseKeys { |input|
        var result=Dictionary.new;
        (input ? ()).keysValuesDo{|key,value|
            key=key.asSymbol;
            if(result.includesKey(key)){Error("Duplicate destination alias").throw};
            result[key]=value;
        };
        ^result;
    }
    *argumentsFor { |ports, profile, overrides|
        var ids=ports.collect{|p|p[\id]}, buses, gains;
        profile=this.normaliseKeys(profile);overrides=this.normaliseKeys(overrides);
        if(profile.keys.any{|k|ids.includes(k.asSymbol).not}){Error("Profile contains a destination outside this wrapper").throw};
        if(overrides.keys.any{|k|ids.includes(k.asSymbol).not}){Error("Unknown bus override").throw};
        buses=ports.collect{|p|
            var bus=overrides[p[\id]] ? p[\bus];
            this.validateBus(bus,p[\bus].server,p[\bus].numChannels).index
        };
        gains=ports.collect{|p|this.gain(profile[p[\id]] ? 0.0)};
        ^[\sendBuses,buses,\sendGains,gains];
    }
}
