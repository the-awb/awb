// An attachable input source, following Param/MidiCCIn's API shape.
// Pickup uses observed unmodulated base; pending CC candidates are coalesced.
AWMidiCCIn {
    var <param,<midiInClient,<chanIn,<ccIn,<lo,<hi,<passthru,<sourceUID;
    var <field;
    var <latched=false,<closed=false;
    var <pickupPhase=\idle,<pickupWait=1.0,<pickupFade=0.5;
    var pickupTask,heldCC,pickupDelta,pickupStarted;
    var responder,observer,latestCC,readPending=false,writing=false,lastDifference,generation=0;
    *new { |param,midiInClient,chanIn,ccIn,lo=0,hi=127,passthru=false,field=\base|
        ^super.new.init(param,midiInClient,chanIn,ccIn,lo,hi,passthru,field)
    }
    init { |aParam,client,channel,cc,low,high,pickup,parameterField=\base|
        if(cc.isInteger.not or:{cc<0} or:{cc>127}
            or:{channel.notNil and:{channel.isInteger.not or:{channel<0} or:{channel>15}}}){Error("AWMidiCCIn: invalid CC/channel").throw};
        [low,high].do{|v|AWParam.finite(v,"MIDI range");if(v<0 or:{v>127}){Error("AWMidiCCIn: range must be within 0..127").throw}};
        field=parameterField.asSymbol;if([\base,\amount,\choice].includes(field).not){Error("Unknown MIDI parameter field").throw};
        midiInClient=client;sourceUID=if(client.respondsTo(\midiClient)){client.midiClient}{client};
        if(sourceUID.notNil and:{sourceUID.isInteger.not}){Error("AWMidiCCIn: use a MIDI source UID or MIDISource object").throw};
        chanIn=channel;ccIn=cc;lo=low;hi=high;passthru=pickup==true;
        observer={|object,what|if((what==if(field==\amount){\amountTarget}{\baseTarget} or:{what==\polarity}) and:{writing.not}){this.resync};if(what==\closed){this.free}};
        this.resync;if(aParam.notNil){aParam.addSource(this)};^this;
    }
    param_ { |aParam|
        var previous;
        if(aParam===param){^this};
        if(aParam.notNil and:{closed or:{aParam.isKindOf(AWParam).not} or:{aParam.closed}}){Error("AWMidiCCIn: attach to an open AWParam").throw};
        previous=param;this.resync;param=nil;
        if(previous.notNil){previous.removeDependant(observer);previous.removeSource(this,false)};
        param=aParam;if(param.notNil){param.addDependant(observer)}{responder.tryPerform(\free);responder=nil};^this;
    }
    // No MIDIClient.init side effect. Safe to call repeatedly.
    midiDef {
        if(closed or:{param.isNil}){Error("AWMidiCCIn: attach source before installing MIDI callback").throw};
        if(responder.isNil){responder=MIDIFunc.cc({|value|this.receiveCC(value)},ccIn,chanIn,sourceUID)};^this;
    }
    // Continuous controls use soft pickup by default; choice controls stay discrete.
    softPickup { |wait=1,fade=0.5|
        pickupWait=AWParam.duration(wait);pickupFade=AWParam.duration(fade);this.resync;^this;
    }
    phase_ { |phase|
        if(pickupPhase!=phase){pickupPhase=phase;
            if(param.notNil){param.changed(if(field==\amount){\pickupAmount}{\pickupBase},param.midiPickupPhase(field))};
        };^this;
    }
    resync {
        generation=generation+1;pickupTask.tryPerform(\stop);pickupTask=nil;
        latestCC=nil;lastDifference=nil;heldCC=nil;pickupDelta=nil;pickupStarted=nil;latched=passthru.not;this.phase_(\idle);^this;
    }
    receiveCC { |value|
        if(closed or:{param.isNil}){^this};
        if(value.isInteger.not or:{value<0} or:{value>127}){Error("AWMidiCCIn: CC value must be within 0..127").throw};
        value=value.linlin(0,127,lo,hi);
        if([\warning,\ramping].includes(pickupPhase)){
            latestCC=value;
            if(pickupPhase==\ramping){
                // Movement is live at full sensitivity; only the fixed offset fades.
                this.writePickup;
            };
        }{if(latched){this.write(value)}{latestCC=value;this.requestBase}};^this;
    }
    requestBase {
        var requestGeneration;
        if(readPending or:{latestCC.isNil} or:{closed} or:{param.isNil} or:{latched} or:{pickupPhase!=\idle}){^this};
        readPending=true;requestGeneration=generation;
        try{param.perform(if(field==\amount){\getAmount}{\getBase},{|base,error|
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
        if(field==\base and:{base<param.midiSpec.minval or:{base>param.midiSpec.maxval}}){lastDifference=nil;^false};
        difference=if(field==\choice){(value-base)/(hi-lo).max(1)}{(value/127)-if(field==\amount){base.linlin(param.normalizedMinimum,1,0,1)}{param.midiSpec.unmap(base)}};
        crossed=lastDifference.notNil and:{difference.sign!=lastDifference.sign};
        if(difference.abs<=(1/127) or:{crossed}){
            if(field!=\choice and:{pickupWait+pickupFade>0}){this.startPickup(value,base)}{latched=true;this.write(value)};
        };
        lastDifference=difference;^latched;
    }
    startPickup { |value,base|
        var startGeneration=generation;
        heldCC=if(field==\amount){base.linlin(param.normalizedMinimum,1,0,127)}{param.midiSpec.unmap(base)*127};
        latestCC=value;
        // Freeze a running base/amount envelope at its observed value, without a jump.
        this.write(heldCC,0);this.phase_(\warning);
        pickupTask=Routine({
            var step=1/30,elapsed,delay;
            if(pickupWait>0){pickupWait.wait};
            if(startGeneration==generation and:{closed.not} and:{param.notNil}){
                // Capture once, after the hold, using the controller's position now.
                pickupDelta=latestCC-heldCC;pickupStarted=Main.elapsedTime;
                latched=true;this.phase_(\ramping);
                while{startGeneration==generation and:{closed.not} and:{param.notNil} and:{Main.elapsedTime-pickupStarted<pickupFade}}{
                    elapsed=Main.elapsedTime-pickupStarted;delay=step.min((pickupFade-elapsed).max(0));
                    this.writePickup(delay);delay.wait;
                };
                if(startGeneration==generation and:{closed.not} and:{param.notNil}){this.write(latestCC,0);this.phase_(\idle)};
            };
            if(startGeneration==generation){pickupTask=nil};
        }).play(SystemClock);^this;
    }
    writePickup { |dur=0|
        var progress=((Main.elapsedTime-pickupStarted+dur)/pickupFade).clip(0,1);
        // In normalized MIDI space: live controller minus a decaying fixed delta.
        this.write((latestCC-(pickupDelta*(1-progress))).clip(0,127),dur);^this;
    }
    write { |value,dur=0|writing=true;protect{if(field==\choice){param.setBase(value.round.asInteger.clip(param.spec.minval,param.spec.maxval),0)}{if(field==\amount){param.setAmount(value.linlin(0,127,param.normalizedMinimum,1),dur ? 0,0)}{param.setM(value,dur,0)}}}{writing=false};^this}
    free {if(closed){^this};closed=true;this.param_(nil);responder.tryPerform(\free);responder=nil;latestCC=nil;^this}
}
