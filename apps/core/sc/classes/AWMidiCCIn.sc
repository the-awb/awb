// An attachable input source, following Param/MidiCCIn's API shape.
// Pickup uses observed unmodulated base; pending CC candidates are coalesced.
AWMidiCCIn {
    var <param,<midiInClient,<chanIn,<ccIn,<lo,<hi,<passthru,<sourceUID;
    var <latched=false,<closed=false;
    var responder,observer,latestCC,readPending=false,writing=false,lastDifference,generation=0;
    *new { |param,midiInClient,chanIn,ccIn,lo=0,hi=127,passthru=false|
        ^super.new.init(param,midiInClient,chanIn,ccIn,lo,hi,passthru)
    }
    init { |aParam,client,channel,cc,low,high,pickup|
        if(cc.isInteger.not or:{cc<0} or:{cc>127}
            or:{channel.notNil and:{channel.isInteger.not or:{channel<0} or:{channel>15}}}){Error("AWMidiCCIn: invalid CC/channel").throw};
        [low,high].do{|v|AWParam.finite(v,"MIDI range");if(v<0 or:{v>127}){Error("AWMidiCCIn: range must be within 0..127").throw}};
        midiInClient=client;sourceUID=if(client.respondsTo(\midiClient)){client.midiClient}{client};
        if(sourceUID.notNil and:{sourceUID.isInteger.not}){Error("AWMidiCCIn: use a MIDI source UID or MIDISource object").throw};
        chanIn=channel;ccIn=cc;lo=low;hi=high;passthru=pickup==true;
        observer={|object,what|if(what==\baseTarget and:{writing.not}){this.resync};if(what==\closed){this.free}};
        this.resync;if(aParam.notNil){aParam.addSource(this)};^this;
    }
    param_ { |aParam|
        var previous;
        if(aParam===param){^this};
        if(aParam.notNil and:{closed or:{aParam.isKindOf(AWParam).not} or:{aParam.closed}}){Error("AWMidiCCIn: attach to an open AWParam").throw};
        previous=param;param=nil;this.resync;
        if(previous.notNil){previous.removeDependant(observer);previous.removeSource(this,false)};
        param=aParam;if(param.notNil){param.addDependant(observer)}{responder.tryPerform(\free);responder=nil};^this;
    }
    // No MIDIClient.init side effect. Safe to call repeatedly.
    midiDef {
        if(closed or:{param.isNil}){Error("AWMidiCCIn: attach source before installing MIDI callback").throw};
        if(responder.isNil){responder=MIDIFunc.cc({|value|this.receiveCC(value)},ccIn,chanIn,sourceUID)};^this;
    }
    resync {generation=generation+1;latestCC=nil;lastDifference=nil;latched=passthru.not;^this}
    receiveCC { |value|
        if(closed or:{param.isNil}){^this};
        if(value.isInteger.not or:{value<0} or:{value>127}){Error("AWMidiCCIn: CC value must be within 0..127").throw};
        value=value.linlin(0,127,lo,hi);
        if(latched){this.write(value)}{latestCC=value;this.requestBase};^this;
    }
    requestBase {
        var requestGeneration;
        if(readPending or:{latestCC.isNil} or:{closed} or:{param.isNil}){^this};
        readPending=true;requestGeneration=generation;
        try{param.getBase({|base,error|
            var value=latestCC;readPending=false;
            if(closed.not and:{param.notNil} and:{error.isNil} and:{requestGeneration==generation} and:{value.notNil}){
                latestCC=nil;this.acceptBase(value,base);
            };
            if(error.notNil and:{requestGeneration==generation}){latestCC=nil;if(closed.not){this.changed(\readError,error)}};
            if(closed.not and:{param.notNil} and:{latestCC.notNil}){this.requestBase};
        })}{|error|readPending=false;latestCC=nil;error.throw};^this;
    }
    acceptBase { |value,base|
        var difference,crossed;
        if(closed or:{param.isNil}){^false};
        difference=(value/127)-param.spec.unmap(base);
        crossed=lastDifference.notNil and:{difference.sign!=lastDifference.sign};
        if(difference.abs<=(1/127) or:{crossed}){latched=true;this.write(value)};
        lastDifference=difference;^latched;
    }
    write { |value|writing=true;protect{param.setM(value)}{writing=false};^this}
    free {if(closed){^this};closed=true;this.param_(nil);responder.tryPerform(\free);responder=nil;latestCC=nil;^this}
}
