// Semantic names, borrowed remote-shaped banks and MIDI input bindings. No bus allocation.
AWTrackControls {
    var <base,<chain,<slot, <controls,<mods,<routing,<>fader;
    var <name,<p,<metadata,<closed=false;
    *new { |name|^super.new.init(name) }
    init { |id|name=id.asSymbol;p=IdentityDictionary.new;metadata=IdentityDictionary.new;controls=Dictionary.new;mods=Dictionary.new;3.do{|i|controls[i.asSymbol]=Array.newClear(8);mods[i.asSymbol]=Array.newClear(8)};routing=Array.newClear(8);^this }
    add { |id,param,label,midi|
        if(closed or:{param.isKindOf(AWParam).not} or:{param.closed}){Error("Track controls need a live AWParam").throw};
        id=id.asSymbol;if(p[id].notNil and:{p[id]!==param}){Error("Track control name already registered").throw};
        p[id]=param;metadata[id]=(id:id,label:label ? id.asString,midi:(midi ? ()).copy,status:\bound);^param;
    }
    // Choose the stable GUI/bridge name while keeping language aliases intact.
    canonical { |id|
        var param=this.param(id);
        if(param.isKindOf(AWParam).not){Error("Canonical track name needs the full AWParam").throw};
        p.keys.do{|key|if(p[key]===param){metadata[key][\canonical]=(key==id.asSymbol)}};^param;
    }
    unavailable { |id,label,midi|id=id.asSymbol;metadata[id]=(id:id,label:label ? id.asString,midi:(midi ? ()).copy,status:\unavailable);^this }
    param { |id|^p[id.asSymbol] ?? {Error("Track control is not bound: "++name++"/"++id).throw} }
    attachMidi { |id,source,install=true|
        var m=metadata[id.asSymbol][\midi];if(m[\cc].isNil){Error("No MIDI input mapping for control").throw};
        ^this.param(id).createMidiSource(source,m[\channel],m[\cc],m[\lo] ? 0,m[\hi] ? 127,m[\pickup] ? true,install);
    }
    bindBase { |owner|base=owner;^this}
    bindChain { |object,id|chain=object;slot=id;^this}
    field { |id,param,field=\amount,label,midi|
        var alias=AWParamField(param,field);id=id.asSymbol;p[id]=alias;
        metadata[id]=(id:id,label:label ? id.asString,midi:(midi ? ()).copy,status:\bound,field:field);^alias;
    }
    bank { |kind,bank,index,id|
        var target=switch(kind,\controls,{controls[bank.asSymbol]},\mods,{mods[bank.asSymbol]},\routing,{routing},{Error("Unknown remote bank").throw});
        if(target.isNil or:{index<0} or:{index>=8}){Error("Invalid remote bank slot").throw};target[index]=p[id.asSymbol];^this;
    }
    signalBank { |kind,bank,index,signal|
        var target=switch(kind,\controls,{controls[bank.asSymbol]},\mods,{mods[bank.asSymbol]},{Error("Invalid signal bank").throw});
        if(target.isNil or:{index<0} or:{index>=8}){Error("Invalid signal bank slot").throw};target[index]=signal;^this;
    }
    setLoopControl { |mode=0|if(base.liveDelays.isNil){Error("No delay engine attached").throw};base.liveDelays.setLoopMode(name.asString.toUpper,mode);^this}
    free {closed=true;p.clear;metadata.clear;^this}
}
