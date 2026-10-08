// A language-only view of one field on an existing AWParam. No DSP or buses.
AWParamField {
    var <param,<field;
    *new { |param,field=\amount|^super.newCopyArgs(param,field) }
    closed {^param.closed}
    outputBus {^if(field==\amount){Bus.new(\control,param.observationBus.index+1,1,param.server)}{param.outputBus}}
    set { |value,dur=0,curve|^this.setI(value,dur,curve)}
    setI { |value,dur=0,curve|if(field==\amount){param.setAmount(value,dur ? 0,curve)}{param.setBase(value,if(field==\choice){dur ? 0}{dur},curve)};^this}
    setITransition { |value,dur=0|^this.setI(value,dur)}
    setM { |value,dur=0,curve|
        if(field==\amount){this.setI(value.linlin(0,127,param.normalizedMinimum,1),dur,curve)}{
            if(field==\choice){this.setI(value,dur,curve)}{param.setM(value,dur,curve)}
        };^this;
    }
    getI {^if(field==\amount){param.amountTarget}{param.baseTarget}}
    setBiPolar { |enabled=true|param.setPolarity(if(enabled){\bipolar}{\unipolar});^this}
    createMidiSource { |client,channel,cc,lo=0,hi=127,pickup=false,install=true|
        var source=AWMidiCCIn(nil,client,channel,cc,lo,hi,pickup,field);param.addSource(source);if(install){source.midiDef};^source;
    }
    free {^this} // borrowed field; the AWParam owner frees its resources
}
