// Additive compiled working-ring backend. Inputs and outputs are PRIVATE buses.
// Receives a validated channels-v2 plan from graph-compiler.mjs, not a raw graph.
// No boot, hardware Out, retained readers, gestures, FX or graph swapping here.
UBPGraphController : UnifiedBufferController {
    classvar nextGraph=0;
    var <plan,<ports,<definitions,<cellNodes,<graphBuffers,clearCounts,nodeNodes;
    *new { |server,plan,toolInstance| ^super.new(server,UnifiedBufferController.defaults,toolInstance).initPlan(plan) }
    initPlan { |value|
        plan=value.deepCopy;
        if(plan[\version]!=1 or:{plan[\backend]!="channels-v2"}){Error("UBPGraph: executable plan required").throw};
        if(plan[\sampleRate]!=server.sampleRate){Error("UBPGraph: sample-rate mismatch; recompile plan").throw};
        ports=Array.newClear(plan[\nodes].size);cellNodes=Array.newClear(plan[\nodes].size);
        nodeNodes=Array.newClear(plan[\nodes].size);graphBuffers=Array.newClear(plan[\buffers].size);clearCounts=Array.fill(plan[\nodes].size,0);^this;
    }
    // Cell input ports are inside its definition; source outputs and sinks have buses.
    requireGraph {
        if(closed or:{starting} or:{group.isNil}){Error("UBPGraph: graph unavailable").throw};^this;
    }
    port { |nodeID,portID|
        var node,index;
        this.requireGraph;
        node=plan[\nodes].detect{|item|item[\id]==nodeID};
        if(node.isNil){Error("UBPGraph: unknown node").throw};
        index=node[\ports].detectIndex{|item|item[\id]==portID};
        if(index.isNil or:{ports[node[\index]][index].isNil}){Error("UBPGraph: port has no external bus").throw};
        ^ports[node[\index]][index];
    }
    cellIndex { |id|
        var node;
        node=plan[\nodes].detect{|item|item[\id]==id and:{item[\kind]=="cell"}};
        if(node.isNil){Error("UBPGraph: unknown cell").throw};^node[\index];
    }
    key { |index,field| ^("graph"++index++"_"++field).asSymbol }
    // Each incoming edge reads an earlier node; return cycles are rejected in JS.
    inputSignals { |node|
        var signals;
        signals=node[\ports].collect{|port|Array.fill(port[\channels],{DC.ar(0)})};
        node[\incoming].do{|edge,i|
            var read,sourcePort,amount;
            sourcePort=plan[\nodes][edge[\fromNode]][\ports][edge[\fromPort]];
            read=In.ar(NamedControl.kr(("edgeBus"++i).asSymbol,0),sourcePort[\channels]).asArray;
            amount=NamedControl.kr(("edgeGain"++i).asSymbol,1).lag(0.02);
            edge[\mapping].do{|map|
                signals[edge[\toPort]][map[\to]]=signals[edge[\toPort]][map[\to]]+(read[map[\from]]*map[\gain]*amount);
            };
        };^signals;
    }
    definition { |node,name|
        ^SynthDef(name,{
            var signals,memory,channels,audio,shared,sources,delays,heads,outputs,seconds,returns,levels,mix,dry,fade,gate;
            signals=this.inputSignals(node);
            if(node[\kind]=="cell"){
                memory=plan[\buffers][node[\buffer]];channels=memory[\channels];
                audio=Array.fill(channels,{DC.ar(0)});
                node[\writerMapping].do{|map|audio[map[\to]]=audio[map[\to]]+(signals[node[\writerPort]][map[\from]]*map[\gain])};
                shared=Array.fill(channels,{|ch|NamedControl.ir(("region"++ch).asSymbol,0)});
                seconds=NamedControl.kr(\seconds,node[\periodSeconds]);
                sources=Array.fill(node[\headSlots],{|h|if(h<node[\heads].size){NamedControl.kr(("headSource"++h).asSymbol,node[\heads][h][\source])}{-1}});
                delays=Array.fill(node[\headSlots],{|h|
                    var head,value,relative;
                    if(h<node[\heads].size){
                        head=node[\heads][h];
                        value=NamedControl.kr(("headTime"++h).asSymbol,head[\delay][\value]);
                        relative=NamedControl.kr(("headRelative"++h).asSymbol,if(head[\delay][\unit]=="fraction"){1}{0});
                        Select.kr(relative,[value,seconds*value]);
                    }{seconds};
                });
                levels=Array.fill(node[\headSlots],{|h|NamedControl.kr(("headLevel"++h).asSymbol,if(h<node[\heads].size){node[\heads][h][\level]}{0}).lag(0.02)});
                returns=Array.fill(node[\headSlots],{|h|Array.fill(channels,{|ch|
                    var route;
                    route=if(h<node[\heads].size){node[\heads][h][\returns].detect{|r|r[\channel]==ch}}{nil};
                    NamedControl.kr(("headReturn"++h++"c"++ch).asSymbol,if(route.isNil){0}{route[\gain]}).lag(0.02)*levels[h];
                })}).flat;
                heads=UnifiedTapeChannels.ar(channels,node[\headSlots],NamedControl.ir(\bufnum,0),audio,shared,
                    seconds,NamedControl.kr(\feedback,1),NamedControl.kr(\inputGain,0),NamedControl.kr(\running,1),NamedControl.kr(\clearSerial,0),sources,delays,returns).asArray;
                outputs=node[\ports].collect{|port|Array.fill(port[\channels],{DC.ar(0)})};
                node[\heads].do{|head,h|node[\ports].do{|port,p|
                    if(port[\direction]=="out"){port[\channels].do{|ch|
                        var destination,gain;
                        destination=head[\destinations].detect{|d|(d[\port]==p) and:{d[\channel]==ch}};
                        gain=NamedControl.kr(("headGain"++h++"p"++p++"c"++ch).asSymbol,if(destination.isNil){0}{destination[\gain]}).lag(0.02);
                        outputs[p][ch]=outputs[p][ch]+(heads[h]*gain*levels[h]);
                    }};
                }};
                mix=node[\mix];
                if(mix.notNil){
                    dry=Array.fill(node[\ports][mix[\output]][\channels],{DC.ar(0)});
                    mix[\mapping].do{|m|dry[m[\to]]=dry[m[\to]]+(signals[mix[\input]][m[\from]]*m[\gain])};
                    gate=NamedControl.kr(\fadeGate,1);
                    fade=K2A.ar(VarLag.kr(gate,Select.kr(gate,[NamedControl.kr(\fadeOut,2),NamedControl.kr(\fadeIn,2)]),warp:\lin));
                    outputs[mix[\output]]=(outputs[mix[\output]]*NamedControl.kr(\effectLevel,1).lag(0.02)*fade)+(dry*NamedControl.kr(\dryLevel,0).lag(0.02));
                };
                node[\ports].do{|port,p|if(port[\direction]=="out"){Out.ar(NamedControl.kr(("portBus"++p).asSymbol,0),outputs[p])}};
            }{
                node[\ports].do{|port,p|Out.ar(NamedControl.kr(("portBus"++p).asSymbol,0),signals[p])};
            };
        });
    }
    start { |action|
        if(closed or:{started}){Error("UBPGraph: already started or closed").throw};
        if(server.serverRunning.not){Error("UBPGraph: running host required").throw};
        started=true;starting=true;
        ^Routine({
            var failure,names;
            try {
                this.checkConstruction;
                nextGraph=nextGraph+1;names=Array.newClear(plan[\nodes].size);definitions=List.new;
                plan[\nodes].do{|node|
                    if(node[\kind]!="input"){
                        names[node[\index]]=("ubpg"++nextGraph++"n"++node[\index]).asSymbol;
                        definitions.add(this.definition(node,names[node[\index]]));
                    };
                };
                definitions.do{|def|def.send(server)};server.sync;this.checkConstruction;
                group=this.own(Group.tail(server),\container);
                plan[\nodes].do{|node|
                    ports[node[\index]]=node[\ports].collect{|port|
                        var bus;
                        if(port[\direction]=="out" or:{node[\kind]=="output"}){
                            bus=this.own(Bus.audio(server,port[\channels]),\audioBus);audioBuses.add(bus);bus;
                        }{nil};
                    };
                };
                plan[\buffers].do{|memory,i|
                    var buffer,ids;
                    this.checkConstruction;
                    buffer=this.own(Buffer.alloc(server,memory[\frames],memory[\channels]),\buffer);buffers.add(buffer);server.sync;this.checkConstruction;
                    ids=Array.fill(memory[\channels],{UnifiedBufferController.regionID});
                    ids.do{|id|this.waitCommand('unified_view_alloc',id);regions.add(id);this.checkConstruction};
                    graphBuffers[i]=(buffer:buffer,regions:ids);
                };
                server.makeBundle(nil,{
                    plan[\order].do{|index|
                        var node,args,synth,memory;
                        node=plan[\nodes][index];args=List.new;
                        if(node[\kind]!="input"){
                            node[\incoming].do{|edge,i|args.addAll([("edgeBus"++i).asSymbol,ports[edge[\fromNode]][edge[\fromPort]].index])};
                            node[\ports].do{|port,p|if(ports[index][p].notNil){args.addAll([("portBus"++p).asSymbol,ports[index][p].index])}};
                            if(node[\kind]=="cell"){
                                memory=graphBuffers[node[\buffer]];args.addAll([\bufnum,memory[\buffer].bufnum]);
                                memory[\regions].do{|id,ch|args.addAll([("region"++ch).asSymbol,id])};
                            };
                            synth=this.own(Synth.tail(group,names[index],args.asArray),\synth);nodes.add(synth);nodeNodes[index]=synth;
                            if(node[\kind]=="cell"){
                                cellNodes[index]=synth;
                            };
                        };
                    };
                });
                server.sync;this.checkConstruction;
            }{|error|failure=error};
            starting=false;
            if(failure.notNil or:{closed}){
                this.free({|error|action.value(nil,error ? failure ? Error("UBPGraph: closed during construction"))});
            }{action.value(this,nil)};
        }).play(SystemClock);
    }
    // Ordinary named controls: the caller owns modulation buses and processors.
    target { |synth,control,lo,hi|
        ^(owner:this,synth:synth,control:control.asSymbol,rate:\control,min:lo,max:hi);
    }
    cellTarget { |id,field|
        var index,node,bounds;
        this.requireGraph;index=this.cellIndex(id);node=plan[\nodes][index];
        bounds=switch(field.asSymbol,
            \seconds,{[node[\periodBounds][\min],node[\periodBounds][\max]]},
            \effectLevel,{if(node[\mix].isNil){Error("UBPGraph: no wet/dry mix declared").throw};[0,2]},
            \dryLevel,{if(node[\mix].isNil){Error("UBPGraph: no wet/dry mix declared").throw};[0,1]},
            \fadeGate,{if(node[\mix].isNil){Error("UBPGraph: no wet mix declared").throw};[0,1]},\fadeIn,{[0.01,30]},\fadeOut,{[0.01,30]},
            \feedback,{[0,1.1]},\inputGain,{[0,2]},\running,{[0,1]},
            {Error("UBPGraph: unsupported cell control").throw});
        ^this.target(cellNodes[index],field,bounds[0],bounds[1]);
    }
    routeTarget { |id|
        var node,index;
        this.requireGraph;
        node=plan[\nodes].detect{|item|item[\incoming].any{|edge|edge[\id]==id}};
        if(node.isNil){Error("UBPGraph: unknown route").throw};
        index=node[\incoming].detectIndex{|edge|edge[\id]==id};
        ^this.target(nodeNodes[node[\index]],("edgeGain"++index).asSymbol,-2,2);
    }
    headTarget { |id,headID,field,portID,channel=0|
        var index,node,h,p,control,lo=0,hi;
        this.requireGraph;index=this.cellIndex(id);node=plan[\nodes][index];
        h=node[\heads].detectIndex{|head|head[\id]==headID};
        if(h.isNil){Error("UBPGraph: unknown declared head").throw};
        switch(field.asSymbol,
            \level,{control=("headLevel"++h).asSymbol;hi=1},
            \time,{control=("headTime"++h).asSymbol;lo=0.000001;hi=plan[\buffers][node[\buffer]][\capacitySeconds]},
            \relative,{control=("headRelative"++h).asSymbol;hi=1},
            \source,{control=("headSource"++h).asSymbol;lo= -1;hi=plan[\buffers][node[\buffer]][\channels]-1},
            \return,{
                hi=plan[\buffers][node[\buffer]][\channels];
                if(channel.isInteger.not or:{channel<0} or:{channel>=hi}){Error("UBPGraph: invalid head return channel").throw};
                control=("headReturn"++h++"c"++channel).asSymbol;lo= -2;hi=2;
            },
            \gain,{
                p=node[\ports].detectIndex{|port|port[\id]==portID and:{port[\direction]=="out"}};
                if(p.isNil){Error("UBPGraph: unknown head output port").throw};
                if(channel.isInteger.not or:{channel<0} or:{channel>=node[\ports][p][\channels]}){Error("UBPGraph: invalid head output channel").throw};
                control=("headGain"++h++"p"++p++"c"++channel).asSymbol;lo= -2;hi=2;
            },{Error("UBPGraph: unsupported head control").throw});
        ^this.target(cellNodes[index],control,lo,hi);
    }
    checkTarget { |target|
        this.requireGraph;
        if(target[\owner]!==this or:{nodes.includes(target[\synth]).not}){Error("UBPGraph: control belongs to another graph").throw};^target;
    }
    mapTarget { |target,bus|
        this.checkTarget(target);
        if(bus.isKindOf(Bus).not or:{bus.server!==server} or:{bus.rate!=\control} or:{bus.numChannels!=1} or:{bus.index.isNil}){
            Error("UBPGraph: map a live single-channel control bus on this server").throw;
        };
        target[\synth].map(target[\control],bus);^this;
    }
    setTarget { |target,value|
        this.checkTarget(target);UnifiedBufferController.check(value,target[\min],target[\max],target[\control].asString);
        // Literal takeover explicitly removes a prior external mapping.
        server.makeBundle(nil,{target[\synth].map(target[\control],-1);target[\synth].set(target[\control],value)});^this;
    }
    mapCell { |id,field,bus| ^this.mapTarget(this.cellTarget(id,field),bus) }
    setCell { |id,field,value| ^this.setTarget(this.cellTarget(id,field),value) }
    setRoute { |id,gain| ^this.setTarget(this.routeTarget(id),gain) }
    // Legacy parent parameter factory is deliberately disabled for this backend.
    parameter { Error("UBPGraph: parameter ownership is external; map an ordinary control bus").throw }
    setHead { |id,headID,enabled,value,relative,gains|
        var index,node,h,args;
        this.requireGraph;index=this.cellIndex(id);node=plan[\nodes][index];
        h=node[\heads].detectIndex{|head|head[\id]==headID};
        if(h.isNil){Error("UBPGraph: unknown declared head").throw};
        if(value.isNumber.not or:{value.isNaN} or:{value<=0} or:{value>plan[\buffers][node[\buffer]][\capacitySeconds]}){Error("UBPGraph: invalid head delay").throw};
        if(gains.size!=node[\ports].size or:{gains.every{|lane,p|lane.size==node[\ports][p][\channels]}.not}){Error("UBPGraph: head destination widths differ").throw};
        if(gains.flat.every{|gain|gain.isNumber and:{gain.isNaN.not} and:{gain.abs<=2}}.not){Error("UBPGraph: invalid head destination gain").throw};
        args=[("headSource"++h).asSymbol,if(enabled){node[\heads][h][\source]}{-1},("headTime"++h).asSymbol,value,("headRelative"++h).asSymbol,relative.binaryValue];
        node[\ports].do{|port,p|if(port[\direction]=="out"){port[\channels].do{|ch|args=args++[("headGain"++h++"p"++p++"c"++ch).asSymbol,gains[p][ch]]}}};
        cellNodes[index].set(*args);^this;
    }
    clear { |id|
        var index;
        this.requireGraph;index=this.cellIndex(id);clearCounts[index]=clearCounts[index]+1;
        cellNodes[index].set(\clearSerial,clearCounts[index]);^this;
    }
    pause { |id,paused=true|
        this.requireGraph;cellNodes[this.cellIndex(id)].set(\running,if(paused){0}{1});^this;
    }
    finishRetirement { |error|
        if(definitions.notNil and:{definitions.notEmpty} and:{server.serverRunning}){
            Routine({
                var failure=error;
                try{definitions.do{|def|server.sendMsg('/d_free',def.name)};server.sync;definitions.clear}
                {|caught|failure=failure ? caught};
                this.finishDefinitionsRetirement(failure);
            }).play(SystemClock);
        }{this.finishDefinitionsRetirement(error)};
    }
    finishDefinitionsRetirement { |error| super.finishRetirement(error) }
    // Do not inherit two-cell or stereo-take operations with incompatible semantics.
    apply { Error("UBPGraph: compiled layout changes require a new graph; live swap pending").throw }
    pool { Error("UBPGraph: generalized pool not connected yet").throw }
    retain { Error("UBPGraph: generalized take retention not connected yet").throw }
    playTake { Error("UBPGraph: generalized retained readers not connected yet").throw }
    stopTake { Error("UBPGraph: generalized retained readers not connected yet").throw }
    applyHeads { Error("UBPGraph: runtime head editing not exposed yet").throw }
    applyCapture { Error("UBPGraph: generalized gesture mode not connected yet").throw }
}
