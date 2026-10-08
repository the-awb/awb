// A borrowed/owned control process, retaining the old dictionary access shape.
AWBLiveSignal {
    var <base,<name,<bus,<controller,<source,<settings,writer,output;
    *new { |base,name,bus,node,settings,writer|^super.newCopyArgs(base,name,bus,node,nil,(settings ? ()).copy,writer).init}
    init {source=base.registerModulationSource(name,bus,controller);^this}
    outputBus {^bus}
    scale {^settings[\scale] ? settings[\staticScalar] ? 1}
    setScale { |value|AWParam.finite(value,"scale");settings[\scale]=value;if(writer.notNil){writer.value((scale:value))}{base.dispatch(controller.setMsg(\staticScalar,value))};^this}
    setBlend { |value|settings[\blend]=value;if(writer.notNil){writer.value((blend:value))}{base.dispatch(controller.setMsg(\blend,value))};^this}
    setOffset { |value|settings[\offset]=value;base.dispatch(controller.setMsg(\offset,value));^this}
    setActive { |enabled|base.dispatch(controller.runMsg(enabled));^this}
    connect { |param,amount=1,curve=0|param.addModulation(name,source,amount,curve,\previousBlock,{|record,error|if(error.notNil and:{base.closed.not}){base.log("Modulation connection failed: "++name++" -> "++param.name++": "++error.errorString,\error);error.errorString.postln}});^this}
}
