// Base is a native value at the API boundary. Modulation depth is a
// fraction of the parameter's full normalized range. No legacy Param overrides.
AWParam {
    classvar definition, routeDefinition, mappingOwners;
    var <name, <server, <spec, <group, <sourceGroup, <synth, <inputBus, <outputBus;
    var <baseTarget, <amountTarget, <modCurve, <closed=false, <snapshot;
    var options, baseSerial=0, amountSerial=0, defaultBaseCurve, defaultAmountCurve;
    var responder, quitHook, nodeHook, pendingReads, readGeneration=0, watchRate=0;
    var mappings, ownedNodes, modulationNodes;
    var <sources,<modulationConnections,<modulationWriters,<checkedMappings;

    *initClass { mappingOwners=Dictionary.new }
    *new { |name,base,spec=\unipolar,amount=0,modCurve=0,target,server,options|
        ^super.new.init(name,base,spec,amount,modCurve,target,server,options)
    }
    // State is internal LocalIn, not externally allocated buses. Explicit
    // command serials also retrigger identical targets and adjacent-block edits.
    *signals { |baseTarget,amountTarget,baseSerial,amountSerial,baseDur,amountDur,baseCurve,amountCurve,inputBus,modCurve,lo,hi,exponential|
        var previous=LocalIn.kr(8,[baseTarget,amountTarget,baseTarget,amountTarget,0,0,0,0]);
        var baseChanged=(baseSerial-previous[6]).abs>0, amountChanged=(amountSerial-previous[7]).abs>0;
        var baseStart=Select.kr(baseChanged,[previous[2],previous[0]]);
        var amountStart=Select.kr(amountChanged,[previous[3],previous[1]]);
        var baseTime=Select.kr(baseChanged,[(previous[4]+ControlDur.ir).min(baseDur),0]);
        var amountTime=Select.kr(amountChanged,[(previous[5]+ControlDur.ir).min(amountDur),0]);
        var basePhase=(baseTime/baseDur.max(ControlDur.ir)).clip(0,1);
        var amountPhase=(amountTime/amountDur.max(ControlDur.ir)).clip(0,1);
        var base=Select.kr(baseDur<=0,[baseStart+((baseTarget-baseStart)*this.shape(basePhase,baseCurve)),baseTarget]);
        var amount=Select.kr(amountDur<=0,[amountStart+((amountTarget-amountStart)*this.shape(amountPhase,amountCurve)),amountTarget]);
        var modulation=In.kr(inputBus,1),magnitude=modulation.abs;
        // Preserve additive depth above one full range; bend the first range
        // and extend linearly beyond it, rather than saturating the input sum.
        var shaped=this.shape(magnitude.min(1),modCurve)+(magnitude-1).max(0);
        var normalized=(base+(amount*modulation.sign*shaped)).clip(0,1);
        var effective=Select.kr(exponential,[lo+((hi-lo)*normalized),lo*(hi/lo.max(1e-20)).pow(normalized)]);
        var nativeBase=Select.kr(exponential,[lo+((hi-lo)*base),lo*(hi/lo.max(1e-20)).pow(base)]);
        LocalOut.kr([base,amount,baseStart,amountStart,baseTime,amountTime,baseSerial,amountSerial]);
        ^[nativeBase,amount,effective];
    }
    *shape { |phase,curve|
        // SC numeric Env curvature: 0=linear, positive=slow rise, negative=fast.
        var c;if(curve.isNumber){if(curve.abs<0.001){^phase}{^((phase*curve).exp-1)/(curve.exp-1)}};
        c=Select.kr(curve.abs<0.001,[curve,0.001]);
        ^Select.kr(curve.abs<0.001,[((phase*c).exp-1)/(c.exp-1),phase]);
    }
    *synthDef {
        ^definition ?? {definition=SynthDef(\awParam_v1,{|inputBus=0,out=1,baseTarget=0,amountTarget=0,
            baseSerial=0,amountSerial=0,baseDur=0,amountDur=0,baseCurve=0,amountCurve=0,
            modCurve=0,lo=0,hi=1,exponential=0,replyRate=0|
            var values=AWParam.signals(baseTarget,amountTarget,baseSerial,amountSerial,baseDur,amountDur,baseCurve,amountCurve,inputBus,modCurve,lo,hi,exponential);
            ReplaceOut.kr(out,values[2]);
            SendReply.kr(Impulse.kr(replyRate),'/awb/param/state',values++[baseSerial,amountSerial]);
            // Writers execute BEFORE this processor. Clear AFTER consuming so
            // removal of the last writer cannot leave stale modulation.
            ReplaceOut.kr(inputBus,0);
        })};
    }
    *routeDef {^routeDefinition ?? {routeDefinition=SynthDef(\awParamRoute_v1,{|out=0,value=0,amount=1,curve=0|
        var signal=value.clip(-1,1);Out.kr(out,signal.sign*AWParam.shape(signal.abs,curve)*amount);
    })}}
    *prepare { |server|server=server ? Server.default;[this.synthDef,this.routeDef].do{|def|def.send(server)};^this }
    *finite { |value,label|if(value.isNumber.not or:{value.isNaN} or:{value.abs==inf}){Error("AWParam: "++label++" must be finite").throw};^value }
    *curve { |value|if([\lin,\linear].includes(value)){^0};this.finite(value,"curve");if(value.abs>16){Error("AWParam: numeric curve must be within -16..16").throw};^value }
    *duration { |value|this.finite(value,"duration");if(value<0 or:{value>86400}){Error("AWParam: duration must be within 0..86400 seconds").throw};^value }
    init { |id,base,aSpec,amount,shape,target,aServer,opts|
        name=id.asSymbol;server=aServer ? target.tryPerform(\server) ? Server.default;options=(opts ? ()).copy;
        spec=aSpec.asSpec.copy;spec.step=0;modCurve=this.class.curve(shape);
        if(spec.minval.isNumber.not or:{spec.maxval.isNumber.not}){Error("AWParam: invalid ControlSpec").throw};
        this.class.finite(spec.minval,"minimum");this.class.finite(spec.maxval,"maximum");
        if(spec.minval>=spec.maxval or:{[\lin,\linear,\exp,\exponential].includes(spec.warp.asSpecifier).not}
            or:{[\exp,\exponential].includes(spec.warp.asSpecifier) and:{spec.minval<=0}}){Error("AWParam: use an ascending linear or positive exponential ControlSpec").throw};
        baseTarget=this.checkBase(base ? spec.default);amountTarget=this.checkAmount(amount);
        defaultBaseCurve=this.class.curve(options[\baseCurve] ? 0);defaultAmountCurve=this.class.curve(options[\amountCurve] ? 0);
        if(options[\sendFunction].isNil and:{server.serverRunning.not}){Error("AWParam: boot server and call AWParam.prepare first").throw};
        target=target ? server.defaultGroup;
        if(target.isKindOf(Group).not or:{target.server!==server}){Error("AWParam: target must be a Group on the selected server").throw};
        pendingReads=List.new;mappings=List.new;ownedNodes=List.new;sources=List.new;checkedMappings=IdentitySet.new;modulationConnections=IdentityDictionary.new;modulationWriters=IdentityDictionary.new;modulationNodes=IdentityDictionary.new;
        try {
            inputBus=Bus.control(server,1);outputBus=Bus.control(server,1);
            if(inputBus.index.isNil or:{outputBus.index.isNil}){Error("AWParam: control bus allocation exhausted").throw};
            group=Group.basicNew(server);sourceGroup=Group.basicNew(server);synth=Synth.basicNew(\awParam_v1,server);
            this.dispatchBundle([
                [\c_set,inputBus.index,0,outputBus.index,baseTarget],
                group.newMsg(target,\addToTail),sourceGroup.newMsg(group,\addToHead),
                synth.newMsg(group,[\inputBus,inputBus.index,\out,outputBus.index,\baseTarget,spec.unmap(baseTarget),
                    \amountTarget,amountTarget,\modCurve,modCurve,\lo,spec.minval,\hi,spec.maxval,
                    \exponential,[\exp,\exponential].includes(spec.warp.asSpecifier).asInteger],\addToTail)
            ]);
            [group,sourceGroup,synth].do{|node|this.own(node,if(node.isKindOf(Group)){\container}{\synth})};
            responder=OSCFunc({|msg|if(msg[1]==synth.nodeID){this.receiveState(msg)}},'/awb/param/state',server.addr);
            quitHook={this.free(false)};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].isNil){nodeHook={|node,what|if(what==\n_end){this.free(false)}};group.register;group.addDependant(nodeHook)};
        }{|error|this.free;error.throw};^this;
    }
    own { |node,type|ownedNodes.add(node);options[\ownFunction].value(node,type,(name:name.asString,parent:node.group));^node }
    dispatchBundle { |messages|if(options[\sendFunction].notNil){messages.do{|m|options[\sendFunction].value(m)}}{server.sendBundle(nil,*messages)};^this }
    dispatch { |message|^this.dispatchBundle([message]) }
    requireAlive {if(closed){Error("AWParam is closed").throw};^this}
    checkBase { |value|
        var epsilon=spec.minval.abs.max(spec.maxval.abs).max(1e-38)*1.2e-7;
        this.class.finite(value,"base");if(value<(spec.minval-epsilon) or:{value>(spec.maxval+epsilon)}){Error("AWParam: base is outside ControlSpec").throw};^value.clip(spec.minval,spec.maxval);
    }
    checkAmount { |value|this.class.finite(value,"amount");if(value.abs>8){Error("AWParam: amount must be within -8..8 full ranges").throw};^value }
    setBase { |value,dur=0,curve|
        this.requireAlive;value=this.checkBase(value);dur=this.class.duration(dur);curve=this.class.curve(curve ? defaultBaseCurve);
        baseSerial=(baseSerial+1)%1000000;baseTarget=value;
        this.dispatch(synth.setMsg(\baseTarget,spec.unmap(value),\baseDur,dur,\baseCurve,curve,\baseSerial,baseSerial));
        this.changed(\baseTarget,(value:value,dur:dur,curve:curve));^this;
    }
    set { |value,dur=0,curve|^this.setBase(value,dur,curve) }
    setI { |value,dur=0,curve|^this.setBase(value,dur,curve) }
    setM { |value,dur=0,curve|this.class.finite(value,"MIDI value");if(value<0 or:{value>127}){Error("AWParam: MIDI value outside 0..127").throw};^this.setBase(spec.map(value/127),dur,curve) }
    setAmount { |value,dur=0,curve|
        this.requireAlive;value=this.checkAmount(value);dur=this.class.duration(dur);curve=this.class.curve(curve ? defaultAmountCurve);
        amountSerial=(amountSerial+1)%1000000;amountTarget=value;
        this.dispatch(synth.setMsg(\amountTarget,value,\amountDur,dur,\amountCurve,curve,\amountSerial,amountSerial));
        this.changed(\amountTarget,(value:value,dur:dur,curve:curve));^this;
    }
    setModCurve { |value|this.requireAlive;modCurve=this.class.curve(value);this.dispatch(synth.setMsg(\modCurve,modCurve));this.changed(\modCurve,modCurve);^this }
    transitionCurves { |base=0,amount=0|defaultBaseCurve=this.class.curve(base);defaultAmountCurve=this.class.curve(amount);this.changed(\transitionCurves);^this }
    asBus {this.requireAlive;^outputBus}
    asMap {^this.asBus.asMap}
    asControlInput {^this.asMap}
    asNodeArg {^this.asMap}
    kr {^In.kr(this.asBus.index,1)}
    asUGenInput {^this.kr}
    cachedBase {^snapshot.tryPerform(\at,\base)}
    cachedAmount {^snapshot.tryPerform(\at,\amount)}
    cachedEffective {^snapshot.tryPerform(\at,\effective)}
    readRate {^if(pendingReads.notEmpty){watchRate.max(64)}{watchRate}}
    syncReadRate {if(closed.not){this.dispatch(synth.setMsg(\replyRate,this.readRate))};^this}
    watch { |rate=8|this.requireAlive;this.class.finite(rate,"watch rate");if(rate<=0 or:{rate>30}){Error("AWParam: watch rate must be within 0..30 Hz").throw};watchRate=rate;this.syncReadRate;^this }
    stopWatching {watchRate=0;this.syncReadRate;^this}
    getState { |action|
        var generation;this.requireAlive;if(action.isKindOf(Function).not){Error("AWParam: read needs a callback").throw};
        if(options[\sendFunction].notNil){Error("AWParam: live readback unavailable with a score/capture transport").throw};
        if(pendingReads.size>=64){Error("AWParam: too many pending reads").throw};
        pendingReads.add(action);
        if(pendingReads.size==1){readGeneration=readGeneration+1;generation=readGeneration;this.syncReadRate;
            SystemClock.sched(1,{if(closed.not and:{readGeneration==generation} and:{pendingReads.notEmpty}){this.finishReads(nil,Error("AWParam: readback timed out"))};nil})};^this;
    }
    getBase { |action|^this.getState({|state,error|action.value(state.tryPerform(\at,\base),error)}) }
    getAmount { |action|^this.getState({|state,error|action.value(state.tryPerform(\at,\amount),error)}) }
    getEffective { |action|^this.getState({|state,error|action.value(state.tryPerform(\at,\effective),error)}) }
    receiveState { |msg|
        if(closed or:{msg.size!=8} or:{msg[1]!=synth.nodeID} or:{msg.copyRange(3,5).any{|v|v.isNumber.not or:{v.isNaN} or:{v.abs==inf}}}){^this};
        snapshot=(base:msg[3],amount:msg[4],effective:msg[5],baseSerial:msg[6],amountSerial:msg[7],observedAt:Main.elapsedTime);
        this.changed(\state,snapshot.copy);if(pendingReads.notEmpty and:{msg[6]==baseSerial} and:{msg[7]==amountSerial}){this.finishReads(snapshot.copy)};^this;
    }
    finishReads { |state,error|var reads=pendingReads.copy;pendingReads.clear;readGeneration=readGeneration+1;this.syncReadRate;reads.do{|action|try{action.value(state,error)}{|e|e.reportError}};^this }
    mappingKey { |node,control|^server.name.asString++":"++node.nodeID++":"++control.asString }
    mapToChecked { |node,control,timing=\sameBlock,action,registry|
        registry=registry ? options[\modulationRegistry];
        if(registry.isNil){Error("AWParam: checked mapping needs a modulation registry").throw};
        ^registry.mapParameter(this,node,control,timing,action);
    }
    mapTo { |node,control|
        var desc,key,item,previousOwner;this.requireAlive;if(node.isKindOf(Synth).not or:{node.server!==server}){Error("AWParam: destination must be a Synth on selected server").throw};
        desc=SynthDescLib.global.at(node.defName);
        if(desc.notNil and:{desc.controls.any{|c|c.name.asSymbol==control.asSymbol and:{c.rate==\control}}.not}){Error("AWParam: destination must be a control-rate Synth control").throw};
        key=this.mappingKey(node,control);previousOwner=mappingOwners[key];if(previousOwner.notNil and:{previousOwner!==this}){previousOwner.unmapFrom(node,control,false)};mappingOwners[key]=this;
        item=mappings.detect{|m|m[\key]==key};if(item.isNil){item=(node:node,control:control.asSymbol,key:key);mappings.add(item);
            if(options[\sendFunction].isNil){item[\hook]={|n,what|if(what==\n_end){this.unmapFrom(node,control,false)}};node.register;node.addDependant(item[\hook])}};
        this.dispatch(node.mapMsg(control,outputBus.index));^this;
    }
    unmapFrom { |node,control,send=true|
        var key=this.mappingKey(node,control);
        if(checkedMappings.notNil){checkedMappings.copy.select{|d|d[\node]===node and:{d[\control]==control.asSymbol}}.do{|d|
            d[\registry].removeDestination(d,nil,false)
        }};
        if(mappingOwners[key]===this){mappingOwners.removeAt(key);if(send){this.dispatch(node.mapMsg(control,-1))}};
        mappings.select{|item|item[\key]==key}.do{|item|if(item[\hook].notNil){node.removeDependant(item[\hook])}};
        mappings=mappings.reject{|item|item[\key]==key}.as(List);^this;
    }
    pendingModulationCount {^modulationConnections.values.count{|c|c[\status]==\pending}}
    modulationCount {^modulationNodes.size+modulationWriters.size}
    hasModulation { |id|^modulationNodes[id.asSymbol].notNil or:{modulationWriters[id.asSymbol].notNil} }
    addModulation { |id,source,amount=1,curve=0,timing=\sameBlock,action|
        if(source.isKindOf(AWModulationSource)){^source.connect(this,id,amount,curve,timing,action)};
        if(modulationConnections[id.asSymbol].notNil){Error("AWParam: duplicate modulation connection").throw};
        ^this.addBusModulation(id,source,amount,curve);
    }
    addBusModulation { |id,source,amount=1,curve=0|
        var node;this.requireAlive;id=id.asSymbol;
        if(this.hasModulation(id) or:{this.modulationCount>=64}){Error("AWParam: duplicate/excess modulation connection").throw};
        if(source.isKindOf(Bus).not or:{source.server!==server} or:{source.rate!=\control} or:{source.numChannels!=1} or:{source.index.isNil}){Error("AWParam: modulation source must be a mono control Bus on selected server").throw};
        amount=this.checkAmount(amount);curve=this.class.curve(curve);node=Synth.basicNew(\awParamRoute_v1,server);
        this.dispatchBundle([node.newMsg(sourceGroup,[\out,inputBus.index,\amount,amount,\curve,curve],\addToTail),node.mapMsg(\value,source.index)]);
        modulationNodes[id]=this.own(node,\synth);^node;
    }
    removeModulation { |id|
        var connection;this.requireAlive;connection=modulationConnections[id.asSymbol];
        if(connection.notNil){connection[\source].registry.disconnect(connection);^connection};
        ^this.removeBusModulation(id);
    }
    removeBusModulation { |id|var node;node=modulationNodes.removeAt(id.asSymbol);
        if(node.notNil){this.dispatch(node.freeMsg);ownedNodes.remove(node);options[\disownFunction].value(node)};^node;
    }
    // An owned writer built inside sourceGroup is ordered by construction.
    // Its declared out control must write additive Out.kr to the supplied bus.
    createModulationWriter { |id,defName,args,outControl=\out|
        var desc,node,record;this.requireAlive;id=id.asSymbol;outControl=outControl.asSymbol;
        if(this.hasModulation(id) or:{modulationConnections[id].notNil} or:{this.modulationCount+this.pendingModulationCount>=64}){Error("AWParam: duplicate modulation writer").throw};
        desc=SynthDescLib.global.at(defName);
        if(desc.isNil or:{desc.controls.any{|c|c.name.asSymbol==outControl and:{c.rate==\control}}.not}){Error("AWParam: writer needs a known SynthDef with a control-rate out control").throw};
        args=args ? [];if(args.isArray.not or:{args.size.odd}){Error("AWParam: writer args must be key/value pairs").throw};
        if(args.clump(2).any{|pair|pair[0].asSymbol==outControl}){Error("AWParam: writer output is assigned by the parameter").throw};
        node=Synth.basicNew(defName,server);record=(node:node,defName:defName,outControl:outControl);
        this.dispatch(node.newMsg(sourceGroup,args++[outControl,inputBus.index],\addToTail));
        modulationWriters[id]=record;this.own(node,\synth);
        if(options[\sendFunction].isNil){record[\hook]={|n,what|if(what==\n_end){this.removeModulationWriter(id,false)}};node.register;node.addDependant(record[\hook])};^node;
    }
    removeModulationWriter { |id,send=true|
        var record=modulationWriters.removeAt(id.asSymbol),node;
        if(record.notNil){node=record[\node];if(record[\hook].notNil){node.removeDependant(record[\hook])};
            if(send){this.dispatch(node.freeMsg)};ownedNodes.remove(node);options[\disownFunction].value(node)};^node;
    }
    // Same attachment shape as legacy Param; MIDI is one kind of source.
    createMidiSource { |midiInClient,chanIn,ccIn,lo=0,hi=127,passthru=false,install=true|
        var source;this.requireAlive;
        source=AWMidiCCIn(nil,midiInClient,chanIn,ccIn,lo,hi,passthru);
        this.addSource(source);
        try{if(install){source.midiDef}}{|error|this.removeSource(source);error.throw};^source;
    }
    addSource { |source|
        this.requireAlive;
        if(source.respondsTo(\param).not or:{source.respondsTo(\param_).not} or:{source.respondsTo(\free).not}){Error("AWParam: source needs param, param_ and free methods").throw};
        source.param=this;if(sources.includes(source).not){sources.add(source)};^source;
    }
    removeSource { |source,dispose=true|
        if(sources.includes(source)){
            sources.remove(source);if(source.param===this){source.param=nil};
            if(dispose){source.free};
        };^source;
    }
    configuration {^(id:name,base:baseTarget,min:spec.minval,max:spec.maxval,warp:spec.warp.asSpecifier,amount:amountTarget,modCurve:modCurve,baseCurve:defaultBaseCurve,amountCurve:defaultAmountCurve)}
    free { |send=true|
        var buses;if(closed){^this};closed=true;
        if(checkedMappings.notNil){checkedMappings.copy.do{|d|d[\registry].removeDestination(d,Error("AWParam closed"),send)}};
        if(modulationConnections.notNil){modulationConnections.values.copy.do{|c|c[\source].registry.disconnect(c,Error("AWParam closed"))}};
        if(modulationWriters.notNil){modulationWriters.keys.copy.do{|id|this.removeModulationWriter(id,false)}};
        responder.tryPerform(\free);ServerQuit.remove(quitHook,server);if(nodeHook.notNil){group.removeDependant(nodeHook);group.unregister};
        if(sources.notNil){sources.copy.do{|source|this.removeSource(source)}};
        if(pendingReads.notNil){this.finishReads(nil,Error("AWParam closed during read"))};
        if(mappings.notNil){mappings.copy.do{|item|this.unmapFrom(item[\node],item[\control],send and:{server.serverRunning or:{options[\sendFunction].notNil}})}};
        if(send and:{group.notNil}){this.dispatch(group.freeMsg)};
        ownedNodes.do{|node|options[\disownFunction].value(node)};ownedNodes.clear;
        buses=[inputBus,outputBus].reject(_.isNil);
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){buses.do{|bus|if(bus.index.notNil){bus.free}}}
        {Routine({server.sync;buses.do{|bus|if(bus.index.notNil){bus.free}}}).play(SystemClock)};
        this.changed(\closed);^this;
    }
}
