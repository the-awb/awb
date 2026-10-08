// Set configuration, separate from upstream AWFollower/AWBlender and audio FX.
// All internal dependencies are ordered by construction in this private Group:
// selector AWParam -> SelectN -> branch route writers -> branch AWParams -> FX.
AWBVerbMixProfile {
    var <server,<group,<selector,<inputGain,<select,<branches,<closed=false,options,profiles,bases,hook,routes,quitHook;
    *branchIDs {^[\earth,\composite,\texture,\shimmer,\echo]}
    *controlNames {^[\earthVolume,\compositeVolume,\textureVolume,\shimmerVolume,\echoVolume]}
    *defaultBases {^[0.495,0,0.14,0.14,0]}
    *defaultProfiles {^[[0.03,0.78,-0.34,-0.42,0.40],[-0.87,1,0.51,0.24,0.31],[-0.99,0.45,-0.22,0.73,0.92],[-1.02,-0.26,-1,-0.56,1.12]]}
    // Inferred from captured Tool normalized/display pairs, not an exact host law.
    *amplitude { |normalized|^(normalized.clip(0,1)*2).pow(3)}
    *prepare { |server|AWParam.prepare(server);AWSelectN.prepare(server,4);^this }
    *new { |target,server,options|^super.new.init(target,server,options) }
    *validateProfiles { |rows|
        if(rows.isArray.not or:{rows.size!=4} or:{rows.any{|row|row.isArray.not or:{row.size!=5} or:{row.any{|v|v.isNumber.not or:{v.isNaN} or:{v.abs>8}}}}}){Error("Verb: four profiles of five finite depths within -8..8 required").throw};^rows.deepCopy;
    }
    init { |target,s,opts|
        var parameterOptions;options=(opts ? ()).copy;server=s ? target.tryPerform(\server) ? Server.default;
        target=target ? server.defaultGroup;profiles=this.class.validateProfiles(options[\profiles] ? this.class.defaultProfiles);
        bases=(options[\bases] ? this.class.defaultBases).copy;
        if(bases.size!=5 or:{bases.any{|v|v.isNumber.not or:{v.isNaN} or:{v<0} or:{v>1}}}){Error("Verb: five base values within 0..1 required").throw};
        AWSelectN.weightsAt(0,4,options[\basePole] ? true);
        if(target.isKindOf(Group).not or:{target.server!==server}){Error("Verb: target must be a Group on this server").throw};
        branches=IdentityDictionary.new;routes=IdentityDictionary.new;
        parameterOptions=options.copy.put(\polarity,\unipolar);parameterOptions.removeAt(\basePole);parameterOptions.removeAt(\bases);parameterOptions.removeAt(\profiles);
        try {
            if(options[\sendFunction].notNil){[AWParam.synthDef,AWParam.routeDef].do{|def|this.dispatch([\d_recv,def.asBytes]);SynthDescLib.global.add(def.asSynthDesc)}};
            group=Group.basicNew(server);this.dispatch(group.newMsg(target,\addToTail));options[\ownFunction].value(group,\container,(name:"Verb mix profile",parent:target));
            inputGain=AWParam(\verbIn,options[\inputGain] ? 1,nil,0,0,group,server,parameterOptions);
            selector=AWParam(\verbSelect,options[\base] ? 0,nil,options[\amount] ? 0,options[\modCurve] ? 0,group,server,parameterOptions);
            select=AWSelectN(4,options[\basePole] ? true,group,server,parameterOptions);selector.mapTo(select.synth,\position);
            this.class.branchIDs.do{|id,column|
                var param=AWParam(id,bases[column],nil,1,0,group,server,parameterOptions);branches[id]=param;
                routes[id]=4.collect{|pole|param.addModulation(("s"++(pole+1)).asSymbol,select.busAt(pole),profiles[pole][column])};
            };
            quitHook={this.free(false)};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].isNil){hook={|node,what|if(what==\n_end){this.free(false)}};group.register;group.addDependant(hook)};
        }{|error|this.free;error.throw};^this;
    }
    dispatch { |msg|if(options[\sendFunction].notNil){options[\sendFunction].value(msg)}{server.sendMsg(*msg)};^this }
    // Consumer must be appended AFTER this profile Group in the same parent.
    // Registry-checked arbitrary external mappings can use branch(id).mapToChecked.
    bindTo { |node|
        if(closed or:{node.isKindOf(Synth).not} or:{node.server!==server} or:{node.group!==group.group}){Error("Verb: append FX after profile in its parent Group").throw};
        this.dispatch(group.moveBeforeMsg(node));
        this.class.branchIDs.do{|id,i|branches[id].mapTo(node,this.class.controlNames[i])};^this;
    }
    branch { |id|if(closed){Error("Verb profile is closed").throw};^branches[id.asSymbol] ?? {Error("Unknown Verb branch").throw} }
    // Source is borrowed. Registered sources validate order; plain mono KR buses
    // retain the AWParam unchecked contract. Existing upstream blender is untouched.
    addModulation { |id,source,amount=1,curve=0,timing=\sameBlock,action|^selector.addModulation(id,source,amount,curve,timing,action) }
    setProfile { |index,depths|
        var updated=profiles.deepCopy,messages=List.new;
        if(closed or:{index.isInteger.not} or:{index<0} or:{index>3}){Error("Verb: profile index must be 0..3").throw};
        updated[index]=depths;updated=this.class.validateProfiles(updated);
        this.class.branchIDs.do{|id,column|messages.add(routes[id][index].setMsg(\amount,updated[index][column]))};
        if(options[\sendFunction].notNil){messages.do{|msg|this.dispatch(msg)}}{server.sendBundle(nil,*messages)};profiles=updated;^this;
    }
    valuesAt { |position|
        var weights=AWSelectN.weightsAt(position,4,select.basePole);
        ^this.class.branchIDs.collect{|id,column|(branches[id].baseTarget+4.collect{|pole|weights[pole]*profiles[pole][column]}.sum).clip(0,1)};
    }
    configuration {^(inputGain:inputGain.baseTarget,base:selector.baseTarget,amount:selector.amountTarget,modCurve:selector.modCurve,basePole:select.basePole,bases:this.class.branchIDs.collect{|id|branches[id].baseTarget},profiles:profiles.deepCopy)}
    free { |send=true|
        if(closed){^this};closed=true;ServerQuit.remove(quitHook,server);
        if(hook.notNil){group.removeDependant(hook);group.unregister};
        branches.values.do{|param|param.free(send)};selector.tryPerform(\free,send);inputGain.tryPerform(\free,send);select.tryPerform(\free,send);
        if(send and:{group.notNil}){this.dispatch(group.freeMsg)};if(group.notNil){options[\disownFunction].value(group)};^this;
    }
}
