// Semantic names and MIDI input bindings only. No remote banks or bus allocation.
AWTrackControls {
    var <name,<p,<metadata,<closed=false;
    *new { |name|^super.new.init(name) }
    init { |id|name=id.asSymbol;p=IdentityDictionary.new;metadata=IdentityDictionary.new;^this }
    add { |id,param,label,midi|
        if(closed or:{param.isKindOf(AWParam).not} or:{param.closed}){Error("Track controls need a live AWParam").throw};
        id=id.asSymbol;if(p[id].notNil and:{p[id]!==param}){Error("Track control name already registered").throw};
        p[id]=param;metadata[id]=(id:id,label:label ? id.asString,midi:(midi ? ()).copy,status:\bound);^param;
    }
    unavailable { |id,label,midi|id=id.asSymbol;metadata[id]=(id:id,label:label ? id.asString,midi:(midi ? ()).copy,status:\unavailable);^this }
    param { |id|^p[id.asSymbol] ?? {Error("Track control is not bound: "++name++"/"++id).throw} }
    attachMidi { |id,source,install=true|
        var m=metadata[id.asSymbol][\midi];if(m[\cc].isNil){Error("No MIDI input mapping for control").throw};
        ^this.param(id).createMidiSource(source,m[\channel],m[\cc],m[\lo] ? 0,m[\hi] ? 127,m[\pickup] ? true,install);
    }
    free {closed=true;p.clear;metadata.clear;^this}
}
