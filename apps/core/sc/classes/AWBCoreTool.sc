// New live-set root. Existing AWBase/AWBCore and their classes remain untouched.
// Runtime resources are separate from reconstructible Tool configuration.
AWBCoreTool : Tool {
    var <instance,<server,<config,<group,<groups,<params,<buses,<tools,<players;
    var <ready=false,<closed=false,<clock,<modulationRegistry;
    var options,resources,ownedNodes,ownedBuses,quitHook,nodeHook,paramObservers,paramRevision=0;
    *defaults {^(name:"AWB live set",groups:[\input,\voices,\routing,\detectors,\parameters,\fx,\output],params:[])}
    *register {
        ^ToolRegistry.at(\awbCore) ?? {ToolRegistry.register(ToolDefinition(\awbCore,"AWB Core",version:"0.1.0",
            interfaceKind:\native,capabilities:[\liveSet,\parameters,\trackedPlayback,\ownership],defaultConfig:this.defaults,
            dependencies:(nodeManager:\required),multipleInstances:true,cleanupPolicy:\terminateOwned,
            factory:{|instance,config,opts|AWBCoreTool(instance,config,opts).open},
            closeAction:{|instance|instance.interfaceObject.tryPerform(\close)}))};
    }
    *open { |config,opts|this.register;opts=(opts ? ()).copy;opts[\gui]=false;opts[\track]=opts[\track] ? true;^ToolLauncher.open(\awbCore,config,opts) }
    *new { |instance,config,opts|^super.new.init(instance,config,opts)}
    init { |anInstance,configuration,opts|
        instance=anInstance;config=configuration.deepCopy;options=(opts ? ()).copy;server=options[\server] ? Server.default;clock=options[\clock] ? TempoClock.default;
        groups=IdentityDictionary.new;params=IdentityDictionary.new;buses=IdentityDictionary.new;tools=IdentityDictionary.new;players=IdentitySet.new;
        modulationRegistry=AWModulationRegistry(server,(sendFunction:options[\sendFunction],queryFunction:options[\queryFunction]));
        resources=IdentityDictionary.new;paramObservers=IdentityDictionary.new;ownedNodes=IdentitySet.new;ownedBuses=List.new;this.validate;^this;
    }
    registerModulationSource { |id,bus,producer|this.requireAlive;^modulationRegistry.registerSource(this.id(id),bus,producer) }
    modulationSource { |id|^modulationRegistry.source(id) }
    unregisterModulationSource { |id|^modulationRegistry.unregisterSource(id) }
    validateModulationOrder { |action,disconnectInvalid=false|^modulationRegistry.validateOrder(action,disconnectInvalid) }
    definition {^this.class.register}
    id { |value|if(value.isNil or:{"^[a-zA-Z][a-zA-Z0-9_/-]{0,95}$".matchRegexp(value.asString).not}){Error("AWBCoreTool: invalid resource ID").throw};^value.asSymbol}
    validate {
        var ids;if(config[\name].isString.not or:{config[\name].size>120}){Error("AWBCoreTool: invalid name").throw};
        ids=config[\groups];if(ids.isArray.not or:{ids.isEmpty} or:{ids.size>32}){Error("AWBCoreTool: needs 1..32 ordered groups").throw};
        ids=ids.collect{|key|this.id(key)};if(ids.as(Set).size!=ids.size){Error("AWBCoreTool: duplicate group").throw};
        config[\groups]=ids;
        if(config[\params].isArray.not or:{config[\params].size>1024}){Error("AWBCoreTool: invalid parameter list").throw};
        ids=config[\params].collect{|item|this.id(item[\id])};if(ids.as(Set).size!=ids.size){Error("AWBCoreTool: duplicate parameter").throw};
        if(config[\params].notEmpty and:{config[\groups].includes(\parameters).not}){Error("AWBCoreTool: parameters need a parameters group").throw};
        if(options[\target].notNil and:{options[\target].isKindOf(Group).not or:{options[\target].server!==server}}){Error("AWBCoreTool: invalid target Group").throw};^this;
    }
    dispatch { |message|if(options[\sendFunction].notNil){options[\sendFunction].value(message)}{server.sendMsg(*message)};^message}
    ownNode { |node,type=\synth,metadata|ownedNodes.add(node);instance.own(node,type,metadata ? ());^node}
    disownNode { |node|ownedNodes.remove(node);instance.disown(node);^node}
    open {
        if(options[\sendFunction].isNil and:{server.serverRunning.not}){Error("AWBCoreTool: boot the selected server first").throw};
        try {
            [AWParam.synthDef,AWParam.routeDef].do{|def|this.dispatch([\d_recv,def.asBytes])};
            group=Group.basicNew(server);this.dispatch(group.newMsg(options[\target] ? server.defaultGroup,\addToTail));this.ownNode(group,\container,(name:config[\name]));
            config[\groups].do{|id|var node=Group.basicNew(server);this.dispatch(node.newMsg(group,\addToTail));groups[id]=this.ownNode(node,\container,(name:id.asString,parent:group))};
            quitHook={instance.close};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].isNil){nodeHook={|node,what|if(what==\n_end and:{closed.not}){group=nil;instance.close}};group.register;group.addDependant(nodeHook)};
            if(options[\sendFunction].notNil){this.finishOpen}{Routine({try{server.sync;if(closed.not){this.finishOpen;server.sync;ready=closed.not;this.changed(\ready)}}{|error|instance.close;error.reportError}}).play(SystemClock)};
        }{|error|this.close;error.throw};^this;
    }
    finishOpen {config[\params].do{|item|this.buildParam(item)};if(options[\sendFunction].notNil){ready=true;this.changed(\ready)};^this}
    whenReady { |action|SystemClock.sched(0.01,{if(closed){nil}{if(ready){action.value(this);nil}{0.01}}});^this}
    requireAlive {if(closed or:{group.isNil}){Error("AWBCoreTool is closed").throw};^this}
    groupAt { |id|this.requireAlive;^groups[id.asSymbol] ?? {Error("AWBCoreTool: unknown group").throw} }
    buildParam { |item|
        var id=this.id(item[\id]),param,opts=(ownerInstance:instance,modulationRegistry:modulationRegistry,sendFunction:options[\sendFunction],
            ownFunction:{|node,type,metadata|this.ownNode(node,type,metadata)},disownFunction:{|node|this.disownNode(node)},
            baseCurve:item[\baseCurve] ? 0,amountCurve:item[\amountCurve] ? 0);
        if(params[id].notNil){Error("AWBCoreTool: duplicate parameter").throw};
        param=AWParam(id,item[\base],ControlSpec(item[\min] ? 0,item[\max] ? 1,item[\warp] ? \lin),
            item[\amount] ? 0,item[\modCurve] ? 0,this.groupAt(\parameters),server,opts);
        modulationRegistry.registerParameter(param);params[id]=param;paramObservers[param]={|object,what|
            if(what==\closed and:{closed.not} and:{params[id]===object}){
                params.removeAt(id);object.removeDependant(paramObservers.removeAt(object));this.syncParamConfig
            };
            if([\baseTarget,\amountTarget,\modCurve,\transitionCurves].includes(what) and:{closed.not}){this.syncParamEntry(id)}
        };param.addDependant(paramObservers[param]);^param;
    }
    createParam { |id,base,spec=\unipolar,amount=0,modCurve=0|
        var p;this.requireAlive;if(ready.not){Error("AWBCoreTool: wait for readiness before creating parameters").throw};if(params.size>=1024){Error("AWBCoreTool: parameter capacity reached").throw};spec=spec.asSpec;
        p=this.buildParam((id:id,base:base,min:spec.minval,max:spec.maxval,warp:spec.warp.asSpecifier,amount:amount,modCurve:modCurve));this.syncParamConfig;^p;
    }
    param { |id|this.requireAlive;^params[id.asSymbol] ?? {Error("AWBCoreTool: unknown parameter").throw} }
    removeParam { |id|var param=this.param(id);params.removeAt(id.asSymbol);param.removeDependant(paramObservers.removeAt(param));param.free;this.syncParamConfig;^param}
    syncParamConfig {config[\params]=params.keys.asArray.sort.collect{|id|params[id].configuration};instance.updateState((params:config[\params].deepCopy));^this}
    syncParamEntry { |id|
        var entry=params[id].configuration,index=config[\params].detectIndex{|p|p[\id].asSymbol==id};
        if(index.isNil){^this.syncParamConfig};config[\params][index]=entry;
        instance.config[\params][index]=entry.deepCopy;paramRevision=paramRevision+1;
        instance.publishEvent(\paramChanged,(id:id,entry:entry.deepCopy,paramRevision:paramRevision));this.changed(\paramChanged,id,entry);^this;
    }
    paramGUI { |ids,options|^\AWParamInspector.asClass.perform(\openMany,ids.collect{|id|this.param(id)},options,instance)}
    createBus { |id,rate=\control,width=1|
        var bus;this.requireAlive;id=this.id(id);if(buses[id].notNil){Error("AWBCoreTool: duplicate bus").throw};
        if([\control,\audio].includes(rate).not or:{width.isInteger.not} or:{width<1} or:{width>64}){Error("AWBCoreTool: invalid bus rate/width").throw};
        bus=if(rate==\audio){Bus.audio(server,width)}{Bus.control(server,width)};
        if(bus.index.isNil){Error("AWBCoreTool: bus allocation exhausted").throw};buses[id]=bus;ownedBuses.add(bus);^bus;
    }
    borrowBus { |id,bus|this.requireAlive;id=this.id(id);if(buses[id].notNil or:{bus.isKindOf(Bus).not} or:{bus.server!==server} or:{bus.index.isNil}){Error("AWBCoreTool: invalid/duplicate borrowed bus").throw};buses[id]=bus;^bus}
    busAt { |id|this.requireAlive;^buses[id.asSymbol] ?? {Error("AWBCoreTool: unknown bus").throw} }
    ownResource { |id,object,cleanup|
        this.requireAlive;id=this.id(id);if(resources[id].notNil or:{object.isNil} or:{cleanup.isKindOf(Function).not}){Error("AWBCoreTool: invalid/duplicate owned resource").throw};
        resources[id]=(object:object,cleanup:cleanup);^object;
    }
    resourceAt { |id|^resources[id.asSymbol].tryPerform(\at,\object)}
    addSynth { |id,defName,args,phase=\voices|
        var node;this.requireAlive;id=this.id(id);if(resources[id].notNil){Error("AWBCoreTool: duplicate resource").throw};
        node=Synth.basicNew(defName,server);this.dispatch(node.newMsg(this.groupAt(phase),args ? [],\addToTail));this.ownNode(node,\synth,(name:id.asString,defName:defName,parent:groups[phase]));
        this.ownResource(id,node,{|n|this.dispatch(n.freeMsg);this.disownNode(n)});^node;
    }
    openTool { |id,toolID,configuration,opts,phase=\fx|
        var definition,child,childOpts,childGroup;this.requireAlive;id=this.id(id);this.groupAt(phase);
        if(tools[id].notNil){Error("AWBCoreTool: duplicate child tool").throw};definition=ToolRegistry.at(toolID);
        if(definition.isNil or:{definition.supportsInterface(\native).not}){Error("AWBCoreTool: register a native Tool first").throw};
        childOpts=(opts ? ()).copy;childOpts[\server]=server;childOpts[\target]=groups[phase];childOpts[\gui]=false;
        childOpts[\track]=childOpts[\track] ? instance.trackingEnabled;
        if(options[\sendFunction].notNil){childOpts[\sendFunction]=options[\sendFunction]};
        child=ToolLauncher.open(toolID,configuration,childOpts);
        childGroup=child.tool.tryPerform(\rootGroup) ? child.tool.tryPerform(\group);
        if(childGroup.notNil and:{childGroup.server===server}){this.dispatch(childGroup.addToTailMsg(groups[phase]))};
        tools[id]=child;instance.own(child,\toolInstance,(name:id.asString,parent:group));^child;
    }
    openChain { |id,configuration,opts,phase=\fx|\AWBChain.asClass.perform(\register);^this.openTool(id,\chain,configuration,opts,phase)}
    openRack { |id,configuration,opts,phase=\routing|\AWBSendRackTool.asClass.perform(\register);^this.openTool(id,\sendRack,configuration,opts,phase)}
    closeTool { |id|var child=tools.removeAt(id.asSymbol);if(child.notNil){child.close;instance.disown(child)};^child}
    ownedObjectEnded { |object,reason,origin|
        players.remove(object);ownedNodes.remove(object);
        resources.keys.copy.do{|id|if(resources[id][\object]===object){resources.removeAt(id)}};
        tools.keys.copy.do{|id|if(tools[id]===object){tools.removeAt(id)}};^this;
    }
    // The core supplies lifecycle and provenance, never an implicit audio out.
    // A note Event/Pattern requires an explicit out bus/control in its data.
    playTracked { |thing,overrides,phase=\voices,clock,quant|
        var player,event,target,pattern;this.requireAlive;if(NodeManager.ensureEnabled.not){Error("AWBCoreTool: tracked playback requires enabled NodeManager").throw};target=this.groupAt(phase);overrides=(overrides ? ()).copy;
        overrides[\server]=server;overrides[\group]=target;
        overrides[\__toolSource]=\awbCore;overrides[\__toolInstance]=instance.instanceID;
        if(thing.isKindOf(Pattern) or:{thing.isKindOf(Stream)}){
            pattern=if(thing.isKindOf(Pattern)){thing}{Prout({|inval|thing.embedInStream(inval)})};
            pattern=Pcollect({|e|var next=e.copy.putAll(overrides);this.checkPlayableEvent(next);next},pattern);
            player=EventStreamPlayerWithTracking(pattern.asStream,Event.default);
            instance.own(player,\EventStreamPlayerWithTracking,(name:config[\name]++" playback",parent:target,streamContainer:player));players.add(player);
            player.addDependant({|source,what,event|
                if(what==\eventStarted and:{closed.not} and:{event[\id].notNil}){
                    instance.own(event,\streamEvent,(server:server,nodeIDs:event[\id].asArray,streamPlayer:source,streamContainer:source,parent:target));players.add(event)
                }
            });
            ^player.play(clock ? this.clock,false,quant);
        };
        if(thing.isKindOf(EventPreset)){thing=thing.event.copy.put(\__preset,thing.name)};
        if(thing.isKindOf(Event)){
            event=thing.copy.putAll(overrides);this.checkPlayableEvent(event);event=event.play;
            if(event[\id].notNil){instance.own(event,\toolEvent,(name:event[\instrument].asString,parent:target,server:server,nodeIDs:event[\id].asArray));players.add(event)};^event;
        };
        if(thing.isKindOf(Function)){
            if(overrides[\out].isNil){Error("AWBCoreTool: tracked Function requires explicit output destination").throw};
            if(options[\sendFunction].notNil){Error("AWBCoreTool: Function.play requires a live server").throw};
            player=thing.play(target,overrides[\out],overrides[\fadeTime] ? 0.02,\addToTail);
            this.ownNode(player,\tempSynth,(name:"Function",parent:target));players.add(player);^player;
        };
        Error("AWBCoreTool: playTracked accepts Event, EventPreset, Pattern, event Stream or UGen Function").throw;
    }
    checkPlayableEvent { |event|if((event[\type] ? \note)==\note and:{event.keys.includes(\out).not or:{event[\out].isNil}}){Error("AWBCoreTool: tracked notes require an explicit output destination").throw};^event}
    stopPlayback {players.copy.do{|player|if(player.isKindOf(Event)){player[\id].asArray.do{|id|this.dispatch([\n_free,id])};player[\id]=nil}{if(player.isKindOf(Node)){this.dispatch(player.freeMsg)}{player.stop}};instance.disown(player)};players.clear;^this}
    content {^(modulation:modulationRegistry.content,configuration:config.deepCopy,ready:ready,closed:closed,groups:groups.keys.asArray,params:params.collect(_.configuration),buses:buses.collect{|b|(rate:b.rate,width:b.numChannels,index:b.index)},tools:tools.collect{|i|i.instanceID},players:players.size)}
    promotionCandidate {
        var configuration=config.deepCopy;configuration[\params]=params.keys.asArray.sort.collect{|id|params[id].configuration};
        ^(toolID:\awbCore,definitionVersion:"0.1.0",config:configuration,selectedState:(),
            metadata:(scope:\coreParametersAndGroups,runtimeTools:tools.keys.asArray,runtimeBuses:buses.keys.asArray));
    }
    applyPresetConfig { |configuration,selectedState|
        var specs;this.requireAlive;if(configuration[\groups]!=config[\groups]){Error("AWBCoreTool: applying group topology requires reconstruction").throw};
        specs=configuration[\params];if(specs.isArray.not or:{specs.collect{|p|p[\id].asSymbol}.as(Set)!=params.keys.as(Set)}){Error("AWBCoreTool: parameter topology differs").throw};
        specs.do{|p|var param=this.param(p[\id]);if(param.spec.minval!=p[\min] or:{param.spec.maxval!=p[\max]} or:{param.spec.warp.asSpecifier!=p[\warp]}){Error("AWBCoreTool: parameter range differs").throw};param.checkBase(p[\base]);param.checkAmount(p[\amount]);AWParam.curve(p[\modCurve]);AWParam.curve(p[\baseCurve]);AWParam.curve(p[\amountCurve])};
        specs.do{|p|this.param(p[\id]).setBase(p[\base]).setAmount(p[\amount]).setModCurve(p[\modCurve]).transitionCurves(p[\baseCurve],p[\amountCurve])};this.syncParamConfig;^this;
    }
    close {
        var busList;if(closed){^this};closed=true;ready=false;ServerQuit.remove(quitHook,server);
        if(nodeHook.notNil){group.removeDependant(nodeHook);group.unregister};
        modulationRegistry.close;this.stopPlayback;tools.keys.copy.do{|id|this.closeTool(id)};
        params.values.do{|param|param.removeDependant(paramObservers[param]);param.free};params.clear;paramObservers.clear;
        resources.values.do{|r|try{r[\cleanup].value(r[\object])}{|error|error.reportError}};resources.clear;
        if(group.notNil){this.dispatch(group.freeMsg)};ownedNodes.copy.do{|node|this.disownNode(node)};
        busList=ownedBuses.asArray;ownedBuses.clear;
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){busList.do{|bus|if(bus.index.notNil){bus.free}}}{Routine({server.sync;busList.do{|bus|if(bus.index.notNil){bus.free}}}).play(SystemClock)};
        groups.clear;buses.clear;this.changed(\closed);^this;
    }
}
