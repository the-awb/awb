// A stage owns one stable output, a Group, and its internal resources.
// Its input is borrowed from its predecessor, or from an explicit matrix route.
AWBChainStage {
    var <chain,<id,<factoryID,<definition,<spec,<group,<input,<output,<nodes,<closed=false;
    var buses,ownedNodes,resources,inputBindings,controlIDs,matrixBus;
    *new { |chain,spec|^super.new.init(chain,spec) }
    init { |owner,item|
        chain=owner;spec=item.deepCopy;id=chain.localID(item[\id]);factoryID=chain.localID(item[\factory]);
        definition=AWBChain.stageDefinition(factoryID);nodes=IdentityDictionary.new;
        buses=List.new;ownedNodes=List.new;resources=List.new;inputBindings=List.new;controlIDs=List.new;
        try {input=if(definition[\inputWidth]==chain.input.numChannels){chain.input}{this.bus(definition[\inputWidth])};
        output=this.bus(definition[\outputWidth]);group=Group.basicNew(chain.server);
        chain.dispatch(group.newMsg(chain.group,\addToTail));chain.dispatch(group.runMsg(false));
        ownedNodes.add(chain.own(group,\container,(name:definition[\name]++" ["++id++"]",parent:chain.group)));
        }{|error|this.dispose;error.throw};^this;
    }
    requireAlive {if(closed or:{chain.closed}){Error("Stage is closed").throw};^this}
    checkTarget { |target|this.requireAlive;if(target!==group and:{ownedNodes.includes(target).not} or:{target.isKindOf(Group).not}){Error("Stage nodes need an owned Group target").throw};^this}
    free {^chain.removeStage(id)}
    inputWidth {^definition[\inputWidth]}
    outputWidth {^definition[\outputWidth]}
    bus { |width|var bus;this.requireAlive;bus=chain.bus(width ? this.outputWidth);buses.add(bus);^bus}
    addGroup { |nodeID,target|
        var node=Group.basicNew(chain.server);nodeID=chain.localID(nodeID);
        if(nodes[nodeID].notNil){Error("Duplicate stage node").throw};target=target ? group;this.checkTarget(target);
        chain.dispatch(node.newMsg(target,\addToTail));nodes[nodeID]=node;
        ownedNodes.add(chain.own(node,\container,(name:nodeID.asString,parent:target)));^node;
    }
    addSynth { |nodeID,defName,args,target|
        var node;nodeID=chain.localID(nodeID);if(nodes[nodeID].notNil){Error("Duplicate stage node").throw};
        target=target ? group;this.checkTarget(target);node=Synth.basicNew(defName,chain.server);args=args ? [];
        chain.dispatch(node.newMsg(target,args,\addToTail));nodes[nodeID]=node;
        chain.nodes[(id.asString++"/"++nodeID).asSymbol]=node;
        ownedNodes.add(chain.own(node,\synth,(name:nodeID.asString,defName:defName,args:args.copy,parent:target)));^node;
    }
    bindInput { |nodeID,param=\in|
        var node=nodes[nodeID.asSymbol];if(node.isNil or:{node.isKindOf(Synth).not}){Error("Input binding needs a stage Synth").throw};
        chain.checkSynthControl(node,param);if(inputBindings.size>=16){Error("Stage supports up to 16 input readers").throw};inputBindings.add((node:node,param:param));^this;
    }
    inputMessages { |bus|
        if(bus.numChannels!=this.inputWidth){Error("Stage input width mismatch").throw};input=bus;
        ^inputBindings.collect{|binding|binding[\node].setMsg(binding[\param],bus.index)}.asArray;
    }
    matrixInput {matrixBus=matrixBus ?? {this.bus(this.inputWidth)};^matrixBus}
    controlID { |localID|^(id.asString++"/"++chain.localID(localID)).asSymbol}
    bind { |localID,nodeID,param|
        var node=nodes[nodeID.asSymbol];if(node.isNil){Error("Unknown stage node").throw};chain.checkSynthControl(node,param);
        ^this.bindSetter(localID,{|value|chain.dispatch(node.setMsg(param,value))},(kind:\synth,node:id.asString++"/"++nodeID,param:param));
    }
    bindSetter { |localID,setter,metadata|
        var key=this.controlID(localID);this.requireAlive;controlIDs.add(key);^chain.bindSetter(key,setter,(metadata ? ()).copy.put(\stage,id));
    }
    build {
        chain.installStageControls(this);
        try {definition[\factory].value(this);if(inputBindings.isEmpty){Error("A stage must bind its audio input").throw};
            definition[\controls].do{|c|if(chain.controlBinding(this.controlID(c[\id])).isNil){Error("Unbound stage control").throw}};
            (spec[\values] ? ()).keysValuesDo{|key,value|chain.setInitial(this.controlID(key),value)};
        }{|error|this.dispose;error.throw};^this;
    }
    applyDefaults {definition[\controls].do{|c|chain.applyInitial(this.controlID(c[\id]))};^this}
    set { |key,value|^chain.set(this.controlID(key),value)}
    get { |key|^chain.get(this.controlID(key))}
    holdReady {this.requireAlive;^chain.holdReady}
    releaseReady {if(closed or:{chain.closed}){^this};^chain.releaseReady}
    ownResource { |object,cleanup|this.requireAlive;if(cleanup.isKindOf(Function).not){Error("Resource cleanup needs a Function").throw};resources.add({cleanup.value(object)});^object}
    dispose { |sendFree=true|
        if(closed){^this};closed=true;if(sendFree and:{group.notNil}){chain.dispatch(group.freeMsg)};
        ownedNodes.do{|node|chain.disownNode(node)};nodes.keys.do{|key|var global=(id.asString++"/"++key).asSymbol;if(chain.nodes[global]===nodes[key]){chain.nodes.removeAt(global)}};
        chain.removeStageControls(id,this);chain.recycle(buses.asArray,resources.asArray);buses.clear;resources.clear;^this;
    }
}
