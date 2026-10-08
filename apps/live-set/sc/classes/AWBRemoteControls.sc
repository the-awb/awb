// Optional Bitwig MIDI control output. Borrows parameters/signals; owns no DSP.
// Quantized changed values only. The SC backend never starts this reader.
AWBRemoteControls {
    var <base,<output,<entries,<closed=false,server,responder,pending=false,requestAt=0,lastValues;
    *new { |base,output,channels,rate=32|^super.new.init(base,output,channels,rate)}
    init { |owner,midi,channels,rate|
        base=owner;server=base.server;output=midi;entries=List.new;lastValues=Dictionary.new;
        if(rate<=0 or:{rate>60}){Error("Remote control rate must be 0-60 Hz").throw};
        channels.keysValuesDo{|id,channel|
            var track=base.track(id);
            if(channel.isInteger.not or:{channel<0} or:{channel>15}){Error("Invalid remote track channel").throw};
            [\controls,\mods].do{|kind|track.perform(kind).keysValuesDo{|bank,slots|slots.do{|source,i|
                if(source.notNil){entries.add((source:source,channel:channel,cc:if(kind==\controls){10}{40}+(bank.asInteger*10)+i))};
            }}};
            track.routing.do{|source,i|if(source.notNil){entries.add((source:source,channel:channel,cc:i))}};
            if(track.fader.notNil){entries.add((source:track.fader,channel:channel,cc:9,fader:true))};
        };
        entries.do{|entry|entry[\bus]=entry[\source].outputBus.index};
        responder=OSCFunc({|msg|
            if(pending and:{closed.not} and:{msg.size==((this.indices.size*2)+1)} and:{msg.copyToEnd(1).clump(2).collect(_[0])==this.indices}){
                var values=Dictionary.new;msg.copyToEnd(1).clump(2).do{|pair|values[pair[0]]=pair[1]};pending=false;
                entries.do{|entry|this.transmit(entry,values[entry[\bus]])};
            };
        },'/c_set',server.addr);
        base.adopt(\remoteControls,this,{|object|object.close});
        SystemClock.sched(0,{if(closed){nil}{if(pending.not or:{Main.elapsedTime-requestAt>0.5}){pending=true;requestAt=Main.elapsedTime;if(entries.notEmpty){server.sendMsg(\c_get,*this.indices)}};1/rate}});^this;
    }
    indices {^entries.collect(_[\bus]).as(Set).asArray.sort}
    transmit { |entry,value|
        var source=entry[\source],p,scaled,key,number;
        if(value.isNumber.not or:{value.isNaN} or:{value.abs==inf}){^this};
        p=if(source.isKindOf(AWParam)){source}{source.tryPerform(\param)};
        scaled=if(entry[\fader] ? false){value*100}{
            if(source.isKindOf(AWParamField) and:{source.field==\choice}){value}{
                if(source.isKindOf(AWParamField) and:{source.field==\amount}){value.linlin(p.normalizedMinimum,1,0,127)}{
                    if(p.notNil){p.spec.unmap(value)*127}{value*127};
                };
            };
        };
        number=scaled.round.asInteger.clip(0,127);key=(entry[\channel]*128)+entry[\cc];
        if(lastValues[key]!=number){lastValues[key]=number;output.control(entry[\channel],entry[\cc],number)};^this;
    }
    close {if(closed){^this};closed=true;responder.tryPerform(\free);pending=false;^this}
}
