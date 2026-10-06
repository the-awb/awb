AWBChain : Tool {
    classvar factories,stageFactories;
    var <instance,<server,<config,<group,<input,<output,<nodes,<controls,<values,<ready=false,<closed=false;
    var <stages,<routing,<routes,<editing=false;
    var retiringStages,stageMap,controlOwners,graphFinish,pendingGraph,structuralPending=false;
    var options,bindings,ownedNodes,ownedBuses,watchers,pending,revision=0,responder,quitHook,shellPID,publishPending=false,graphSynced=false,dependencies=0,closeActions;
    *initClass { factories=IdentityDictionary.new;stageFactories=IdentityDictionary.new }
    *registerFactory { |id,factory|
        if(factory.isKindOf(Function).not){Error("Chain factory must be a Function").throw};
        factories[id.asSymbol]=factory;^factory;
    }
    *unregisterFactory { |id|factories.removeAt(id.asSymbol);^this }
    *registerStageFactory { |id,definition,factory|
        var spec=(name:id.asString,inputWidth:2,outputWidth:2,controls:[]).putAll(definition ? ());
        if("^[a-zA-Z][a-zA-Z0-9_-]{0,63}$".matchRegexp(id.asString).not or:{id.asSymbol==\output}){Error("Invalid stage factory ID").throw};
        if(factory.isKindOf(Function).not or:{spec[\name].isString.not} or:{spec[\name].size>120}){Error("Invalid stage factory").throw};
        [\inputWidth,\outputWidth].do{|key|if(spec[key].isInteger.not or:{spec[key]<1} or:{spec[key]>32}){Error("Stage ports support 1..32 channels").throw}};
        if(spec[\controls].isArray.not){Error("Invalid stage controls").throw};
        if(stageFactories.size>=64 and:{stageFactories[id.asSymbol].isNil}){Error("Stage factory catalogue is full").throw};spec[\factory]=factory;stageFactories[id.asSymbol]=spec;^spec;
    }
    *stageDefinition { |id|^stageFactories[id.asSymbol] ?? {Error("Unknown stage factory").throw} }
    *defaults { ^(name:"Chain",factory:\none,width:2,controls:[],stages:[],routes:(),aliases:(),shellRoot:Platform.userHomeDir+/+"awb") }
    *register {
        ^ToolRegistry.at(\chain) ?? {
            ToolRegistry.register(ToolDefinition(\chain,"Chain",version:"0.1.0",interfaceKind:\native,
                capabilities:[\processing,\parameters],defaultConfig:this.defaults,multipleInstances:true,
                cleanupPolicy:\terminateOwned,factory:{|instance,config,opts|AWBChain(instance,config,opts).open},
                closeAction:{|instance|instance.interfaceObject.tryPerform(\close)}));
        };
    }
    *open { |config,opts|this.register;opts=(opts ? ()).copy;opts[\gui]=false;opts[\track]=opts[\track] ? true;^ToolLauncher.open(\chain,config,opts) }
    *new { |instance,config,opts|^super.new.init(instance,config,opts) }
    init { |anInstance,configuration,opts|
        instance=anInstance;config=configuration.deepCopy;options=opts ? ();server=options[\server] ? Server.default;
        nodes=IdentityDictionary.new;controls=IdentityDictionary.new;values=IdentityDictionary.new;bindings=IdentityDictionary.new;
        closeActions=List.new;ownedNodes=IdentitySet.new;ownedBuses=List.new;watchers=Dictionary.new;pending=IdentityDictionary.new;
        stages=List.new;retiringStages=List.new;stageMap=IdentityDictionary.new;controlOwners=IdentityDictionary.new;routes=(config[\routes] ? ()).copy;
        this.validate;^this;
    }
    definition { ^this.class.register }
    id { |value|
        if(value.isNil or:{"^[a-zA-Z][a-zA-Z0-9_-]{0,63}(/[a-zA-Z][a-zA-Z0-9_-]{0,63})?$".matchRegexp(value.asString).not}){Error("Invalid Chain ID").throw};^value.asSymbol;
    }
    localID { |value|var key=this.id(value);if(key.asString.find("/").notNil){Error("Invalid stage/node ID").throw};^key }
    managed {^config[\factory].asSymbol==\serial}
    canonicalID { |key|^((config[\aliases] ? ())[key.asSymbol] ? key).asSymbol}
    validate {
        if([1,2].includes(config[\width]).not){Error("Chain width must be 1 or 2").throw};
        if(config[\name].isString.not or:{config[\name].size>120}){Error("Invalid Chain name").throw};
        this.id(config[\factory]);if(this.managed.not and:{factories[config[\factory].asSymbol].isNil}){Error("Register the Chain factory before opening it").throw};
        if(config[\controls].isArray.not or:{config[\controls].size>128}){Error("Chain supports up to 128 controls").throw};
        config[\controls].do{|item|
            var key=this.id(item[\id]),spec=(label:key.asString,min:0,max:1,default:0,step:0.001,curve:\linear,unit:"",section:"Controls").putAll(item);
            if(controls.includesKey(key)){Error("Duplicate Chain control").throw};
            [\min,\max,\default,\step].do{|field|if(spec[field].isNumber.not or:{spec[field].isNaN} or:{spec[field].abs==inf}){Error("Control range must be finite").throw}};
            if(spec[\min]>=spec[\max] or:{spec[\step]<=0} or:{spec[\default]<spec[\min]} or:{spec[\default]>spec[\max]}){Error("Invalid control range/default").throw};
            if([\linear,\log].includes(spec[\curve].asSymbol).not or:{spec[\curve].asSymbol==\log and:{spec[\min]<=0}}){Error("Invalid control curve").throw};
            [\label,\unit,\section].do{|field|if(spec[field].isString.not or:{spec[field].size>120}){Error("Invalid control text").throw}};
            controls[key]=spec;values[key]=spec[\default];
        };
        if(this.managed){this.validateStages(config[\stages]);AWBChainRouting.plan(config[\stages],config[\width],routes)};
        [options[\input],options[\output]].reject(_.isNil).do{|bus|
            if(bus.isKindOf(Bus).not or:{bus.server!==server} or:{bus.rate!=\audio} or:{bus.numChannels!=config[\width]} or:{bus.index.isNil} or:{bus.index<(server.options.numOutputBusChannels+server.options.numInputBusChannels)}){Error("Chain ports need matching private audio buses on the selected server").throw};
        };
        if(options[\target].notNil and:{options[\target].isKindOf(Group).not or:{options[\target].server!==server}}){Error("Chain target must be a Group on the selected server").throw};
    }
    validateStages { |specs|
        var count=0;
        if(specs.isArray.not){Error("Stages must be an Array").throw};
        specs.do{|spec|var definition;this.localID(spec[\id]);definition=AWBChain.stageDefinition(this.localID(spec[\factory]));count=count+definition[\controls].size};
        if(count+config[\controls].size>128){Error("Chain supports up to 128 controls").throw};^specs;
    }
    dispatchBundle { |messages|if(options[\sendFunction].notNil){messages.do{|message|this.dispatch(message)}}{server.sendBundle(nil,*messages)};^messages}
    disownNode { |node|ownedNodes.remove(node);instance.disown(node);^node}
    recycle { |buses,actions|
        buses.do{|bus|ownedBuses.remove(bus)};
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){actions.do{|action|try{action.value}{|error|error.reportError}};buses.do{|bus|if(bus.index.notNil){bus.free}}}{Routine({server.sync;actions.do{|action|try{action.value}{|error|error.reportError}};buses.do{|bus|if(bus.index.notNil){bus.free}}}).play(SystemClock)};^this;
    }
    dispatch { |message|if(options[\sendFunction].notNil){options[\sendFunction].value(message)}{server.sendMsg(*message)};^message }
    ownResource { |object,cleanup|
        if(closed or:{cleanup.isKindOf(Function).not}){Error("Resource ownership requires an open Chain and cleanup Function").throw};
        closeActions.add({cleanup.value(object)});^object;
    }
    own { |node,type=\synth,metadata|
        ownedNodes.add(node);instance.own(node,type,metadata ? ());
        if(options[\sendFunction].isNil or:{options[\watchNodes]==true}){node.onFree({ownedNodes.remove(node);instance.disown(node);if(node===group and:{closed.not}){group=nil;instance.close}})};^node;
    }
    bus { |width|
        var bus;if(closed){Error("Chain closed").throw};bus=Bus.audio(server,width ? config[\width]);if(bus.isNil or:{bus.index.isNil}){Error("Chain bus allocation exhausted").throw};ownedBuses.add(bus);^bus;
    }
    open {
        if(options[\sendFunction].isNil and:{server.serverRunning.not}){Error("Boot the selected server first").throw};
        try {
            input=options[\input] ?? {this.bus};output=options[\output] ?? {this.bus};
            group=Group.basicNew(server);this.dispatch(group.newMsg(options[\target] ? server.defaultGroup,\addToTail));
            this.own(group,\container,(name:config[\name],parent:options[\target] ? server.defaultGroup));
            if(this.managed){
                routing=AWBChainRouting(this);config[\stages].do{|spec|var stage=AWBChainStage(this,spec);stageMap[stage.id]=stage;stages.add(stage);stage.build};
                pendingGraph=AWBChainRouting.plan(config[\stages],config[\width],routes);routing.prepare(pendingGraph);
            }{factories[config[\factory].asSymbol].value(this)};if(closed){Error("Chain factory aborted").throw};
            if(controls.keys.any{|id|bindings[id].isNil}){Error("Every Chain control needs a binding").throw};
            this.attachOSC;
            quitHook={if(closed.not){instance.close}};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].notNil){graphSynced=true;if(dependencies==0){this.finishOpen}}{Routine({server.sync;graphSynced=true;this.tryReady}).play(SystemClock)};
        }{|error|this.close;error.throw};^this;
    }
    holdReady {if(closed or:{ready and:{editing.not}}){Error("Cannot defer a ready/closed Chain").throw};dependencies=dependencies+1;^this }
    releaseReady {if(closed){^this};if(dependencies<=0){Error("No pending Chain dependency").throw};dependencies=dependencies-1;this.tryReady;^this }
    fail { |error|this.close;instance.close;error.reportError;^this }
    tryReady {
        if(closed.not and:{graphSynced} and:{dependencies==0}){try{if(ready.not){this.finishOpen}{if(graphFinish.notNil){var finish=graphFinish;graphFinish=nil;finish.value}}}{|error|this.fail(error)}};^this;
    }
    finishOpen {
        controls.keysValuesDo{|id,spec|bindings[id][\setter].value(values[id])};
        if(this.managed){routing.apply(pendingGraph);pendingGraph=nil};ready=true;this.changed(\ready);^this;
    }
    checkSynthControl { |node,param|
        var desc=SynthDescLib.global.at(node.defName),control;
        if(desc.notNil){control=desc.controls.detect{|c|c.name.asSymbol==param.asSymbol};if(control.isNil or:{control.rate==\scalar}){Error("Unknown or init-only synth control").throw}};^this;
    }
    stageAt { |id|^stageMap[id.asSymbol] ?? {Error("Unknown Chain stage").throw} }
    installStageControls { |stage|
        stage.definition[\controls].do{|item|
            var key=stage.controlID(item[\id]),spec=(label:item[\id].asString,min:0,max:1,default:0,step:0.001,curve:\linear,unit:"",section:stage.definition[\name]).putAll(item).put(\id,key).put(\stage,stage.id);
            if(controls[key].notNil){Error("Duplicate stage control").throw};
            [\min,\max,\default,\step].do{|field|if(spec[field].isNumber.not or:{spec[field].isNaN} or:{spec[field].abs==inf}){Error("Control range must be finite").throw}};
            if(spec[\min]>=spec[\max] or:{spec[\step]<=0} or:{spec[\default]<spec[\min]} or:{spec[\default]>spec[\max]}){Error("Invalid stage control range").throw};
            if([\linear,\log].includes(spec[\curve].asSymbol).not or:{spec[\curve].asSymbol==\log and:{spec[\min]<=0}}){Error("Invalid stage curve").throw};
            [\label,\unit,\section].do{|field|if(spec[field].isString.not or:{spec[field].size>120}){Error("Invalid stage control text").throw}};
            controls[key]=spec;controlOwners[key]=stage;values[key]=spec[\default];
        };^this;
    }
    setInitial { |id,value|values[id]=this.checkValue(id,value);^this }
    applyInitial { |id|bindings[id][\setter].value(values[id]);^this }
    removeStageControls { |stageID,owner|
        controls.keys.copy.do{|id|if(controls[id][\stage]==stageID and:{owner.isNil or:{controlOwners[id]===owner}}){controlOwners.removeAt(id);controls.removeAt(id);values.removeAt(id);bindings.removeAt(id);pending.removeAt(id)}};^this;
    }
    mergedRoutes { |patch|
        var result=routes.copy; (patch ? ()).keysValuesDo{|key,value|if(value.isNil or:{value==\direct} or:{value=="direct"}){result.removeAt(key.asSymbol)}{result[key.asSymbol]=value.deepCopy}};^result;
    }
    graphSpecs {^stages.collect{|stage|stage.spec.deepCopy}.asArray}
    requireEditable {this.requireOpen;if(this.managed.not or:{editing}){Error("Chain is not editable or an edit is still pending").throw};^this}
    insertStage { |spec,index,matrices|
        var specs,newRoutes,plan,stage,oldDependencies;
        this.requireEditable;spec=spec.deepCopy;spec[\id]=this.localID(spec[\id]);spec[\factory]=this.localID(spec[\factory]);
        index=index ? stages.size;if(index.isInteger.not or:{index<0} or:{index>stages.size}){Error("Invalid insertion index").throw};
        specs=this.graphSpecs.as(List);specs.insert(index,spec);specs=specs.asArray;this.validateStages(specs);newRoutes=this.mergedRoutes(matrices);plan=AWBChainRouting.plan(specs,config[\width],newRoutes);
        oldDependencies=dependencies;editing=true;
        try {stage=AWBChainStage(this,spec);stage.build}{|error|stage.tryPerform(\dispose);dependencies=oldDependencies;editing=false;error.throw};
        stageMap[stage.id]=stage;stages.insert(index,stage);^this.commitGraph(plan,newRoutes,[],[stage]);
    }
    removeStage { |id,matrices|
        var stage,specs,newRoutes,plan;
        this.requireEditable;stage=this.stageAt(id);specs=this.graphSpecs.reject{|spec|spec[\id].asSymbol==stage.id};newRoutes=this.mergedRoutes(matrices);newRoutes.removeAt(stage.id);
        plan=AWBChainRouting.plan(specs,config[\width],newRoutes);stages.remove(stage);stageMap.removeAt(stage.id);
        ^this.commitGraph(plan,newRoutes,[stage]);
    }
    reorder { |ids,matrices|
        var next,specs,newRoutes,plan;
        this.requireEditable;if(ids.isArray.not or:{ids.size!=stages.size} or:{ids.collect(_.asSymbol).as(Set)!=stageMap.keys.as(Set)}){Error("Order must contain every stage exactly once").throw};
        next=ids.collect{|id|this.stageAt(id)};specs=next.collect{|stage|stage.spec};newRoutes=this.mergedRoutes(matrices);plan=AWBChainRouting.plan(specs,config[\width],newRoutes);stages=next.as(List);
        ^this.commitGraph(plan,newRoutes);
    }
    moveStage { |id,index,matrices|
        var ids=this.graphSpecs.collect{|s|s[\id].asSymbol}.as(List),key=id.asSymbol;
        this.requireEditable;if(ids.includes(key).not or:{index.isInteger.not} or:{index<0} or:{index>=ids.size}){Error("Invalid move").throw};ids.remove(key);ids.insert(index,key);^this.reorder(ids.asArray,matrices);
    }
    setRoute { |target,matrix|
        var next;this.requireEditable;next=routes.copy;
        if(matrix.isNil){next.removeAt(target.asSymbol)}{next[target.asSymbol]=matrix};
        ^this.commitGraph(AWBChainRouting.plan(this.graphSpecs,config[\width],next),next);
    }
    replaceStage { |id,spec,matrices|
        var old,specs,next,plan,stage,index,oldControls,oldValues,oldBindings,oldOwners,oldNodes,oldDependencies;
        this.requireEditable;old=this.stageAt(id);index=stages.indexOf(old);spec=spec.deepCopy;spec[\id]=old.id;
        specs=this.graphSpecs;specs[index]=spec;this.validateStages(specs);next=this.mergedRoutes(matrices);plan=AWBChainRouting.plan(specs,config[\width],next);
        oldControls=controls.copy;oldValues=values.copy;oldBindings=bindings.copy;oldOwners=controlOwners.copy;oldNodes=nodes.copy;oldDependencies=dependencies;editing=true;
        this.removeStageControls(old.id,old);
        try{stage=AWBChainStage(this,spec);stage.build}{|error|
            stage.tryPerform(\dispose);controls=oldControls;values=oldValues;bindings=oldBindings;controlOwners=oldOwners;nodes=oldNodes;dependencies=oldDependencies;editing=false;error.throw;
        };
        stageMap[old.id]=stage;stages[index]=stage;^this.commitGraph(plan,next,[old],[stage]);
    }
    commitGraph { |plan,newRoutes,retired,added|
        editing=true;routes=newRoutes;retired=retired ? [];added=added ? [];retiringStages.addAll(retired);routing.prepare(plan);graphSynced=false;
        graphFinish={if(closed.not){added.do(_.applyDefaults);routing.apply(plan);retired.do{|stage|stage.dispose;retiringStages.remove(stage)};
            config[\stages]=this.graphSpecs;config[\routes]=routes.deepCopy;
            (config[\aliases] ? ()).keys.copy.do{|key|if(controls[this.canonicalID(key)].isNil){config[\aliases].removeAt(key)}};
            instance.updateState((stages:config[\stages].deepCopy,routes:routes.deepCopy,aliases:config[\aliases].deepCopy));
            if(options[\sendFunction].notNil){this.finishGraph}{Routine({server.sync;if(closed.not){this.finishGraph}}).play(SystemClock)};
        }};
        if(options[\sendFunction].notNil){graphSynced=true;this.tryReady}{Routine({server.sync;graphSynced=true;this.tryReady}).play(SystemClock)};^this;
    }
    finishGraph {editing=false;revision=revision+1;this.publishStructure;this.changed(\topology);^this}
    publishStructure {
        if(structuralPending.not){structuralPending=true;SystemClock.sched(0.02,{structuralPending=false;if(closed.not){watchers.values.do{|w|w[\address].sendMsg('/awb/chain/topology',instance.instanceID,w[\token],revision)}};nil})};^this;
    }
    orderedControlIDs {^if(this.managed){stages.collect{|s|s.definition[\controls].collect{|c|s.controlID(c[\id])}}.flat++config[\controls].collect{|c|c[\id].asSymbol}}{config[\controls].collect{|c|c[\id].asSymbol}}}
    whenSettled { |action|SystemClock.sched(0.01,{if(closed){nil}{if(editing.not and:{ready}){action.value(this);nil}{0.01}}});^this}

    requireOpen {if(closed or:{ready.not}){Error("Chain is closed or not ready").throw};^this }
    addSynth { |id,defName,args|
        var node;if(closed or:{group.isNil}){Error("Chain graph is unavailable").throw};id=this.id(id);if(nodes.includesKey(id)){Error("Duplicate Chain node ID").throw};
        node=Synth.basicNew(defName,server);args=args ? [];
        this.dispatch(node.newMsg(group,args,\addToTail));nodes[id]=this.own(node,\synth,(name:id.asString,defName:defName,synthDefName:defName,args:args.copy,parent:group));^node;
    }
    bind { |id,nodeID,param|
        var node=nodes[nodeID.asSymbol],desc,control;id=this.id(id);
        if(node.isNil){Error("Unknown Chain node").throw};
        desc=SynthDescLib.global.at(node.defName);
        if(desc.notNil){control=desc.controls.detect{|c|c.name.asSymbol==param.asSymbol};if(control.isNil or:{control.rate==\scalar}){Error("Unknown or init-only synth control").throw}};
        ^this.bindSetter(id,{|value|this.dispatch(node.setMsg(param,value))},(node:nodeID,param:param,kind:\synth));
    }
    bindSetter { |id,setter,metadata|
        if(closed){Error("Chain closed").throw};id=this.id(id);if(controls[id].isNil or:{bindings[id].notNil} or:{setter.isKindOf(Function).not}){Error("Invalid or duplicate Chain control binding").throw};
        bindings[id]=(setter:setter,metadata:metadata ? ());^bindings[id];
    }
    controlBinding { |id|var binding;id=this.canonicalID(id);binding=bindings[id];if(binding.isNil){Error("Unknown Chain control").throw};^binding.copy.put(\setter,{|value|this.set(id,value)}).put(\get,{this.get(id)}) }
    get { |id|this.requireOpen;id=this.canonicalID(id);if(controls[id.asSymbol].isNil){Error("Unknown Chain control").throw};^values[id.asSymbol] }
    checkValue { |id,value|
        var spec=controls[this.canonicalID(id)],epsilon;if(spec.isNil or:{value.isNumber.not} or:{value.isNaN} or:{value.abs==inf}){Error("Unknown Chain control or value outside range").throw};epsilon=spec[\min].abs.max(spec[\max].abs).max(1e-38)*1.2e-7;if(value<(spec[\min]-epsilon) or:{value>(spec[\max]+epsilon)}){Error("Unknown Chain control or value outside range").throw};^value.clip(spec[\min],spec[\max]);
    }
    set { |id,value,origin=""|
        this.requireOpen;if(editing){Error("Chain topology edit is pending").throw};id=this.canonicalID(id);value=this.checkValue(id,value);
        if(values[id]!=value){bindings[id][\setter].value(value);values[id]=value;revision=revision+1;pending[id]=(value:value,origin:origin);this.publish;this.changed(\value,(id:id,value:value))};^value;
    }
    applyValues { |settings|
        this.requireOpen;settings.keysValuesDo{|id,value|this.checkValue(id,value)};
        settings.keysValuesDo{|id,value|this.set(id,value)};^this;
    }
    content {^(configuration:config.deepCopy,stages:this.graphSpecs,routes:routes.deepCopy,values:values.copy,ready:ready,closed:closed) }
    promotionCandidate {^(toolID:\chain,definitionVersion:"0.1.0",config:config.deepCopy,selectedState:(values:values.copy)) }
    applyPresetConfig { |configuration,selectedState|
        if(configuration!=config){Error("A different Chain graph/configuration requires a new instance").throw};
        this.applyValues(selectedState[\values] ? ());^this;
    }
    pruneWatchers {watchers.keys.do{|key|if((Main.elapsedTime-watchers[key][\seen])>12){watchers.removeAt(key)}};^this }
    publish {
        if(publishPending.not){publishPending=true;SystemClock.sched(0.02,{
            var changes=pending.copy;publishPending=false;pending.clear;
            if(closed.not){watchers.keysValuesDo{|key,watcher|
                if((Main.elapsedTime-watcher[\seen])>12){watchers.removeAt(key)}{
                    changes.keysValuesDo{|id,item|if(item[\origin]!=watcher[\token]){watcher[\address].sendMsg('/awb/chain/value',instance.instanceID,watcher[\token],revision,id.asString,item[\value])}};
                };
            }};nil;
        })};^this;
    }
    parseMatrixJSON { |text|^this.coerceMatrix(text.parseJSON) }
    parseRoutesJSON { |text|
        var data=text.parseJSON,result=IdentityDictionary.new;
        if(data.isKindOf(Dictionary).not){Error("Expected route map").throw};
        data.keysValuesDo{|key,value|result[key.asSymbol]=if(value=="direct" or:{value.isNil}){\direct}{this.coerceMatrix(value)}};^result;
    }
    coerceMatrix { |matrix|
        if(matrix.isArray.not){Error("Expected a routing matrix array").throw};
        ^matrix.collect{|row|if(row.isArray.not){Error("Expected matrix rows").throw};row.collect{|v|
            if(v.isNumber){v}{if(v.isString.not or:{"^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$".matchRegexp(v).not}){Error("Expected numeric matrix gain").throw};v.asFloat}
        }};
    }
    matrixJSON { |matrix|^if(matrix.isNil){"null"}{"["++matrix.collect{|row|"["++row.collect(_.asString).join(",")++"]"}.join(",")++"]"} }
    sendState { |address,requestID|
        if(editing){this.whenSettled({this.sendState(address,requestID)});^this};
        address.sendMsg('/awb/chain/state',instance.instanceID,requestID,"begin",config[\name],config[\factory].asString,config[\width],controls.size,revision,this.managed.asInteger,stages.size,stageFactories.size);
        this.orderedControlIDs.do{|id,index|var s=controls[id];
            address.sendMsg('/awb/chain/state',instance.instanceID,requestID,"control",id.asString,s[\label],s[\min],s[\max],s[\default],s[\step],s[\curve].asString,s[\unit],s[\section],values[id],index,(s[\stage] ? "").asString);
        };
        stages.do{|stage,index|address.sendMsg('/awb/chain/state',instance.instanceID,requestID,"stage",stage.id.asString,stage.factoryID.asString,stage.definition[\name],stage.inputWidth,stage.outputWidth,index,this.matrixJSON(routes[stage.id]))};
        stageFactories.keys.asArray.sort.do{|id,index|var d=stageFactories[id];address.sendMsg('/awb/chain/state',instance.instanceID,requestID,"factory",id.asString,d[\name],d[\inputWidth],d[\outputWidth],index)};
        address.sendMsg('/awb/chain/state',instance.instanceID,requestID,"route",this.matrixJSON(routes[\output]));
        address.sendMsg('/awb/chain/state',instance.instanceID,requestID,"end",revision);
    }
    handleEdit { |msg,address|
        var watcher=watchers[address.ip++":"++address.port],token=msg[3].asString,request=msg[4].asString,patch;
        try{
            if(watcher.isNil or:{watcher[\token]!=token} or:{request.size>64}){Error("Edit requires its subscription token").throw};
            switch(msg[5].asString,
                "insert",{this.insertStage((id:msg[6].asSymbol,factory:msg[7].asSymbol),msg[8],if(msg[9].notNil){this.parseRoutesJSON(msg[9].asString)}{()})},
                "remove",{this.removeStage(msg[6].asSymbol,if(msg[7].notNil){this.parseRoutesJSON(msg[7].asString)}{()})},
                "move",{this.moveStage(msg[6].asSymbol,msg[7],if(msg[8].notNil){this.parseRoutesJSON(msg[8].asString)}{()})},
                "replace",{this.replaceStage(msg[6].asSymbol,(factory:msg[7].asSymbol),if(msg[8].notNil){this.parseRoutesJSON(msg[8].asString)}{()})},
                "route",{this.setRoute(msg[6].asSymbol,if(msg[7].asString=="null"){nil}{this.parseMatrixJSON(msg[7].asString)})},
                {Error("Unknown topology operation").throw});
            this.whenSettled({address.sendMsg('/awb/chain/edit',instance.instanceID,token,request,"ok",revision)});
        }{|error|address.sendMsg('/awb/chain/edit',instance.instanceID,token,request,"error",error.errorString)};^this;
    }
    attachOSC {
        responder=OSCdef(("awbChain"++UniqueID.next).asSymbol,{|msg,time,address|
            if(address.ip=="127.0.0.1" and:{msg.size>=3} and:{msg[1].asString==instance.instanceID}){
                try {this.requireOpen;switch(msg[2].asString,
                    "sync",{this.sendState(address,msg[3].asString)},
                    "watch",{var key=address.ip++":"++address.port;this.pruneWatchers;if((msg[3].isString or:{msg[3].isKindOf(Symbol)}).not or:{msg[3].asString.size>64} or:{watchers.size>=8 and:{watchers[key].isNil}}){Error("Invalid or full Chain subscription").throw};watchers[key]=(address:address,token:msg[3].asString,seen:Main.elapsedTime);address.sendMsg('/awb/chain/alive',instance.instanceID,msg[3].asString,revision)},
                    "unwatch",{var key=address.ip++":"++address.port,watcher=watchers[key];if(watcher.notNil and:{msg[3].asString==watcher[\token]}){watchers.removeAt(key)}},
                    "edit",{this.handleEdit(msg,address)},
                    "set",{var watcher=watchers[address.ip++":"++address.port];if(watcher.isNil or:{msg.size!=6} or:{msg[5].asString!=watcher[\token]}){Error("Chain edit requires its subscription token").throw};this.set(msg[3].asSymbol,msg[4],watcher[\token])},
                    {Error("Unknown Chain operation").throw});
                }{|error|address.sendMsg('/awb/chain/error',instance.instanceID,error.errorString)};
            };
        },'/awb/chain/control');
    }
    whenReady { |action|
        if(closed){Error("Chain closed").throw};if(ready){action.value(this)}{SystemClock.sched(0.01,{if(closed){nil}{if(ready){action.value(this);nil}{0.01}}})};^this;
    }
    gui { |opts|
        var root=config[\shellRoot],command,runner;opts=opts ? ();
        if(ready.not){this.whenReady({this.gui(opts)});^this};this.requireOpen;if(shellPID.notNil){^shellPID};
        command="exec /usr/bin/env -u ELECTRON_RUN_AS_NODE AWB_CHAIN_SC_PORT=% AWB_CHAIN_INSTANCE_ID=% % % --tool=chain --profile=standalone --origin=supercollider --tool-instance=% --owner-pid=% --osc-port=0 --user-data-dir=%".format(
            NetAddr.langPort,instance.instanceID.shellQuote,(root+/+"node_modules/electron/dist/Electron.app/Contents/MacOS/Electron").shellQuote,
            (root+/+"apps/awb-shell/shell/main.mjs").shellQuote,instance.instanceID.shellQuote,thisProcess.pid,
            (root+/+".chain-user-data"+/+(thisProcess.pid.asString++"-"++instance.instanceID)).shellQuote);
        runner=opts[\processRunner] ? {|cmd|cmd.unixCmd({shellPID=nil})};shellPID=runner.value(command);^shellPID;
    }
    close {
        if(closed){^this};closed=true;ready=false;
        watchers.values.do{|w|w[\address].sendMsg('/awb/chain/closed',instance.instanceID,w[\token])};watchers.clear;pending.clear;
        responder.tryPerform(\free);responder=nil;if(quitHook.notNil){ServerQuit.remove(quitHook,server);quitHook=nil};
        if(group.notNil){this.dispatch(group.freeMsg)};(stages++retiringStages).do{|stage|stage.dispose(false)};stages.clear;retiringStages.clear;stageMap.clear;closeActions.do{|action|try{action.value}{|error|error.reportError}};closeActions.clear;ownedNodes.copy.do{|node|instance.disown(node)};ownedNodes.clear;
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){ownedBuses.do(_.free);ownedBuses.clear}{Routine({server.sync;ownedBuses.do(_.free);ownedBuses.clear}).play(SystemClock)};
        if(shellPID.notNil){("kill -TERM "++shellPID.asInteger).unixCmd;shellPID=nil};^this;
    }
    free {^instance.close}
}
