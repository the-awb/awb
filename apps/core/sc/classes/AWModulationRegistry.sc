// Borrowed source identity and scheduling unit; never owns the producer or bus.
AWModulationSource {
    var <registry,<name,<bus,<producer,<active=true,hook;
    *new { |registry,name,bus,producer|^super.new.init(registry,name,bus,producer) }
    init { |r,id,b,p|registry=r;name=id;bus=b;producer=p;^this }
    watch {hook={|node,what|if(what==\n_end){registry.unregisterSource(name)}};producer.register;producer.addDependant(hook);^this}
    invalidate {active=false;if(hook.notNil){producer.removeDependant(hook);hook=nil};^this}
    connect { |param,id,amount=1,curve=0,timing=\sameBlock,action|^registry.connect(this,param,id,amount,curve,timing,action) }
}

AWModulationRegistry {
    var <server,<sources,<connections,<destinations,<parameters,<closed=false,options,pending,responders,generation=0,orderQueue,orderRunning=false,<registrationErrors;
    *new { |server,options|^super.new.init(server,options) }
    init { |s,opts|server=s;options=(opts ? ()).copy;sources=IdentityDictionary.new;connections=IdentitySet.new;destinations=IdentitySet.new;parameters=IdentityDictionary.new;pending=List.new;responders=List.new;orderQueue=List.new;registrationErrors=List.new;^this }
    requireAlive {if(closed){Error("AWModulationRegistry is closed").throw};^this}
    registerParameter { |param|
        var hook;this.requireAlive;if(parameters[param].notNil){^param};
        if(param.server!==server){Error("AWModulationRegistry: foreign parameter").throw};
        hook={|p,what|if(what==\closed){parameters.removeAt(p);p.removeDependant(hook)}};
        parameters[param]=hook;param.addDependant(hook);^param;
    }
    registerSource { |id,bus,producer|
        var source;this.requireAlive;id=id.asSymbol;
        if(sources[id].notNil or:{sources.size>=1024}){Error("AWModulationRegistry: duplicate source").throw};
        if(bus.isKindOf(Bus).not or:{bus.server!==server} or:{bus.rate!=\control} or:{bus.numChannels!=1} or:{bus.index.isNil}){Error("AWModulationRegistry: source needs an allocated mono control bus on this server").throw};
        if(producer.isKindOf(Node).not or:{producer.server!==server}){Error("AWModulationRegistry: source needs a producer Synth or Group on this server").throw};
        source=AWModulationSource(this,id,bus,producer);sources[id]=source;generation=generation+1;
        if(options[\sendFunction].isNil){source.watch};^source;
    }
    source { |id|this.requireAlive;^sources[id.asSymbol] ?? {Error("AWModulationRegistry: unknown source").throw} }
    unregisterSource { |id|
        var source=sources.removeAt(id.asSymbol);
        if(source.notNil){source.invalidate;generation=generation+1;connections.copy.select{|c|c[\source]===source}.do{|c|this.disconnect(c,Error("AWModulationRegistry: source removed"))}};^source;
    }
    // Parse an actual controls=false g_queryTree reply into subtree intervals.
    *treeOrder { |msg|
        var at=2,position=0,order=Dictionary.new,visit;
        if(msg.size<4 or:{msg[1]!=0}){Error("AWModulationRegistry: invalid node-tree reply").throw};
        visit={
            var id,count,start=position;
            if(at+1>=msg.size){Error("AWModulationRegistry: truncated node tree").throw};
            id=msg[at];count=msg[at+1];at=at+2;
            if(id.isInteger.not or:{count.isInteger.not} or:{count< -1} or:{order[id].notNil}){Error("AWModulationRegistry: invalid/duplicate tree node").throw};
            position=position+1;order[id]=(start:start,end:start);
            if(count>=0){count.do{visit.value}}{if(at>=msg.size){Error("AWModulationRegistry: missing synth name").throw};at=at+1};
            order[id][\end]=position-1;
        };
        visit.value;if(at!=msg.size){Error("AWModulationRegistry: trailing tree data").throw};^order;
    }
    requestOrder { |action|
        var responder,done=false,finish;this.requireAlive;
        finish={|order,error|if(done.not){done=true;responder.tryPerform(\free);responders.remove(responder);pending.remove(finish);action.value(order,error)}};
        pending.add(finish);
        if(options[\queryFunction].notNil){
            options[\queryFunction].value({|msg,error|var order;if(error.isNil){try{order=this.class.treeOrder(msg)}{|e|error=e}};finish.value(order,error)});
        }{
            if(options[\sendFunction].notNil){finish.value(nil,Error("AWModulationRegistry: score transport needs an explicit node-tree query fixture"))}{
                this.queueServerOrder(finish);
            };
        };
        if(options[\queryFunction].notNil){SystemClock.sched(1,{finish.value(nil,Error("AWModulationRegistry: node-tree query timed out"));nil})};^this;
    }
    // One tree reply per construction burst. Large concurrent replies can overflow
    // the UDP receive queue. Calls arriving after dispatch use the next snapshot.
    queueServerOrder { |finish|
        orderQueue.add(finish);if(orderRunning.not){orderRunning=true;SystemClock.sched(0,{this.sendOrderBatch;nil})};^this;
    }
    sendOrderBatch {
        var callbacks,responder,done=false,finish;
        if(closed){orderQueue.clear;orderRunning=false;^this};
        callbacks=orderQueue.copy;orderQueue.clear;
        finish={|order,error|if(done.not){
            done=true;responder.tryPerform(\free);responders.remove(responder);
            callbacks.do{|callback|callback.value(order,error)};
            if(orderQueue.notEmpty and:{closed.not}){SystemClock.sched(0,{this.sendOrderBatch;nil})}{orderRunning=false};
        }};
        responder=OSCFunc({|msg|var order,error;try{order=this.class.treeOrder(msg)}{|e|error=e};finish.value(order,error)},'/g_queryTree.reply',server.addr,argTemplate:[0,0]);
        responders.add(responder);server.sendMsg(\g_queryTree,0,0);
        SystemClock.sched(0.2,{if(done.not){responder.free;responders.remove(responder);this.requestNodeOrder(finish)};nil});^this;
    }
    // macOS can reject a complete tree reply once it exceeds its UDP datagram
    // ceiling. Query only dependency nodes, their ancestors and left siblings.
    // The reduced tree retains their actual relative order and containment.
    requestNodeOrder { |action|
        var wanted=Set[0],records=Dictionary.new,inFlight=Set.new,responder,done=false,finish,pump;
        sources.values.do{|s|wanted.add(s.producer.nodeID)};connections.do{|c|if(c[\node].notNil){wanted.add(c[\node].nodeID)}};
        parameters.keys.do{|p|[p.group,p.sourceGroup,p.synth].do{|n|wanted.add(n.nodeID)};p.modulationWriters.values.do{|w|wanted.add(w[\node].nodeID)}};
        destinations.do{|d|wanted.add(d[\node].nodeID)};
        finish={|error|if(done.not){
            var tree=List['/g_queryTree.reply',0],children=Dictionary.new,visit,order;
            done=true;responder.tryPerform(\free);responders.remove(responder);
            if(error.isNil){try{
                records.keysValuesDo{|id,r|if(r[\parent]>=0){children[r[\parent]]=(children[r[\parent]] ? List.new).add(id)}};
                visit={|id|
                    var r=records[id],list=children[id] ? [],remaining=list.as(Set),sorted=List.new,current;
                    if(r.isNil){Error("AWModulationRegistry: incomplete node order").throw};
                    while{remaining.notEmpty}{
                        current=remaining.detect{|nid|records[nid][\previous]<0 or:{sorted.includes(records[nid][\previous])}};
                        if(current.isNil){Error("AWModulationRegistry: node order changed during query").throw};sorted.add(current);remaining.remove(current);
                    };
                    tree.add(id);if(r[\isGroup]){tree.add(sorted.size);sorted.do(visit)}{tree.add(-1);tree.add("queriedSynth")};
                };visit.value(0);order=this.class.treeOrder(tree.asArray);
            }{|e|error=e}};action.value(order,error);
        }};
        pump={
            var batch;
            if(closed){finish.value(Error("AWModulationRegistry closed during node query"))}{
                batch=wanted.reject{|id|records.includesKey(id) or:{inFlight.includes(id)}}.asArray.copyFromStart(47);
                if(batch.notEmpty){batch.do{|id|inFlight.add(id)};server.sendMsg(\n_query,*batch)}{
                    if(inFlight.isEmpty){finish.value(nil)};
                };
            };
        };
        responder=OSCFunc({|msg|
            var id=msg[1];if(inFlight.includes(id) and:{done.not}){
                records[id]=(parent:msg[2],previous:msg[3],isGroup:msg[5]==1);inFlight.remove(id);
                [msg[2],msg[3]].do{|other|if(other>=0){wanted.add(other)}};
                if(inFlight.isEmpty){SystemClock.sched(0,{if(done.not){pump.value};nil})};
            };
        },'/n_info',server.addr);responders.add(responder);pump.value;
        SystemClock.sched(5,{finish.value(Error("AWModulationRegistry: node order query timed out"));nil});^this;
    }
    orderError { |source,param,order,timing,route|
        var producer=order[source.producer.nodeID],processor=order[param.synth.nodeID],reader=if(route.notNil){order[route.nodeID]}{processor},writers=order[param.sourceGroup.nodeID];
        if(source.active.not or:{source.bus.index.isNil}){^Error("AWModulationRegistry: source is no longer allocated")};
        if(producer.isNil or:{processor.isNil} or:{reader.isNil}){^Error("AWModulationRegistry: producer, route or parameter absent from server tree")};
        if(writers.isNil or:{writers[\end]>=processor[\start]}){^Error("AWModulationRegistry: source group must finish before parameter processor")};
        if(route.notNil and:{reader[\start]<=writers[\start] or:{reader[\end]>writers[\end]}}){^Error("AWModulationRegistry: route must remain inside parameter source group")};
        if(route.isNil and:{timing==\sameBlock} and:{producer[\start]<=writers[\start] and:{producer[\end]>=writers[\end]}}){^Error("AWModulationRegistry: producer unit contains route group; register the individual writer instead")};
        if(timing==\sameBlock and:{producer[\end]>=reader[\start]}){^Error("AWModulationRegistry: producer must finish before reader; reorder explicitly or choose previousBlock")};
        ^nil;
    }
    cycle { |source,param|
        var edges=Dictionary.new,seen=Set.new,walk;
        connections.do{|c|if(c[\timing]==\sameBlock){var from=c[\source].producer.nodeID;edges[from]=(edges[from] ? [])++[c[\param].group.nodeID]}};
        walk={|id|if(id==source.producer.nodeID){true}{if(seen.includes(id)){false}{seen.add(id);(edges[id] ? []).any{|next|walk.value(next)}}}};
        ^walk.value(param.group.nodeID);
    }
    connect { |source,param,id,amount,curve,timing,action|
        var record;this.requireAlive;param.requireAlive;id=id.asSymbol;
        if(source.registry!==this or:{source.active.not} or:{param.server!==server}){Error("AWModulationRegistry: inactive/foreign source or parameter").throw};
        if([\sameBlock,\previousBlock].includes(timing).not){Error("AWModulationRegistry: timing must be sameBlock or previousBlock").throw};
        if(param.modulationConnections[id].notNil or:{param.hasModulation(id)} or:{(param.pendingModulationCount+param.modulationCount)>=64}){Error("AWModulationRegistry: duplicate connection").throw};
        amount=param.checkSourceAmount(amount);curve=AWParam.curve(curve);
        if(timing==\sameBlock and:{this.cycle(source,param)}){Error("AWModulationRegistry: same-block dependency cycle; designate a previousBlock connection").throw};
        record=(id:id,source:source,param:param,amount:amount,curve:curve,timing:timing,status:\pending,action:action);
        this.registerParameter(param);connections.add(record);param.modulationConnections[id]=record;generation=generation+1;param.changed(\routes);
        this.requestOrder({|order,error|
            if(record[\status]==\pending){
                if(error.isNil){error=this.orderError(source,param,order,timing)};
                if(error.isNil){
                    try{record[\node]=param.addBusModulation(id,source.bus,amount,curve);record[\status]=\connected;
                        if(options[\sendFunction].isNil){record[\hook]={|node,what|if(what==\n_end){this.disconnect(record,Error("AWModulationRegistry: route ended"))}};record[\node].register;record[\node].addDependant(record[\hook])}
                    }{|e|error=e};
                };
                if(error.notNil){registrationErrors.add((source:source.name,param:param.name,error:error));this.disconnect(record,error)}{this.complete(record,nil)};
            };
        });^record;
    }
    complete { |record,error|var action=record.removeAt(\action);if(action.notNil){action.value(record,error)};if(record[\source].notNil){record[\param].changed(\routes)};^this }
    disconnect { |record,error|
        if(connections.includes(record)){
            connections.remove(record);generation=generation+1;
            record[\param].modulationConnections.removeAt(record[\id]);
            if(record[\hook].notNil){record[\node].removeDependant(record[\hook]);record[\hook]=nil};
            if(record[\node].notNil){record[\param].removeBusModulation(record[\id])};
            record[\status]=\removed;record[\error]=error;this.complete(record,error ? Error("AWModulationRegistry: connection removed"));
        };^record;
    }
    // Opt-in checked effective-output mapping. Existing mapTo stays compatible.
    mapParameter { |param,node,control,timing=\sameBlock,action|
        var record;this.requireAlive;param.requireAlive;
        if(param.server!==server or:{node.isKindOf(Synth).not} or:{node.server!==server}){Error("AWModulationRegistry: foreign/non-Synth destination").throw};
        if([\sameBlock,\previousBlock].includes(timing).not){Error("AWModulationRegistry: invalid destination timing").throw};
        if(destinations.any{|d|d[\param]===param and:{d[\node]===node} and:{d[\control]==control.asSymbol}}){Error("AWModulationRegistry: duplicate checked mapping").throw};
        record=(registry:this,param:param,node:node,control:control.asSymbol,timing:timing,status:\pending,action:action);
        this.registerParameter(param);destinations.add(record);param.checkedMappings.add(record);generation=generation+1;
        this.requestOrder({|order,error|if(record[\status]==\pending){
            if(error.isNil){error=this.destinationError(record,order)};
            if(error.isNil){try{param.mapTo(node,control);record[\status]=\connected}{|e|error=e}};
            if(error.notNil){this.removeDestination(record,error)}{this.complete(record,nil)};
        }});^record;
    }
    destinationError { |record,order|
        var producer=order[record[\param].synth.nodeID],consumer=order[record[\node].nodeID];
        if(producer.isNil or:{consumer.isNil}){^Error("AWModulationRegistry: parameter or destination absent from server tree")};
        if(record[\timing]==\sameBlock and:{producer[\end]>=consumer[\start]}){^Error("AWModulationRegistry: parameter must execute before destination; reorder explicitly or choose previousBlock")};^nil;
    }
    removeDestination { |record,error,send=true|
        if(destinations.includes(record)){
            destinations.remove(record);record[\param].checkedMappings.remove(record);generation=generation+1;
            if(record[\status]==\connected){record[\param].unmapFrom(record[\node],record[\control],send)};
            record[\status]=\removed;record[\error]=error;this.complete(record,error ? Error("AWModulationRegistry: checked mapping removed"));
        };^record;
    }
    // Revalidate after explicit moves. Report only unless detachment is requested.
    // This registry never moves a borrowed producer or scheduling unit.
    validateOrder { |action,disconnectInvalid=false|
        var epoch=generation;this.requestOrder({|order,error|
            var reports=List.new;
            if(error.isNil and:{epoch!=generation}){error=Error("AWModulationRegistry: graph changed during audit")};
            if(error.isNil){connections.copy.do{|c|var issue=this.orderError(c[\source],c[\param],order,c[\timing],c[\node]);
                reports.add((source:c[\source].name,param:c[\param].name,id:c[\id],timing:c[\timing],valid:issue.isNil,error:issue));
                if(issue.notNil and:{disconnectInvalid}){this.disconnect(c,issue)};
            };destinations.copy.do{|d|var issue=this.destinationError(d,order);
                reports.add((param:d[\param].name,destination:d[\node].nodeID,control:d[\control],timing:d[\timing],valid:issue.isNil,error:issue));
                if(issue.notNil and:{disconnectInvalid}){this.removeDestination(d,issue)};
            };parameters.keys.copy.do{|p|p.modulationWriters.keys.copy.do{|id|
                var record=p.modulationWriters[id],writer=order[record[\node].nodeID],processor=order[p.synth.nodeID],writers=order[p.sourceGroup.nodeID],issue;
                if(writer.isNil or:{processor.isNil} or:{writers.isNil}){issue=Error("AWModulationRegistry: owned writer or parameter absent from tree")}{
                    if(writer[\start]<=writers[\start] or:{writer[\end]>writers[\end]} or:{writer[\end]>=processor[\start]}){issue=Error("AWModulationRegistry: owned writer must remain before processor inside source group")};
                };
                reports.add((param:p.name,writer:id,valid:issue.isNil,error:issue));if(issue.notNil and:{disconnectInvalid}){p.removeModulationWriter(id)};
            }}};action.value(reports.asArray,error);
        });^this;
    }
    content {^(sources:sources.values.collect{|s|(id:s.name,bus:s.bus.index,producer:s.producer.nodeID)},
        destinations:destinations.collect{|d|(param:d[\param].name,node:d[\node].nodeID,control:d[\control],timing:d[\timing],status:d[\status])},
        connections:connections.collect{|c|(id:c[\id],source:c[\source].name,param:c[\param].name,timing:c[\timing],status:c[\status])})}
    close {
        if(closed){^this};closed=true;
        connections.copy.do{|c|this.disconnect(c,Error("AWModulationRegistry closed"))};
        destinations.copy.do{|d|this.removeDestination(d,Error("AWModulationRegistry closed"))};
        parameters.keysValuesDo{|p,hook|p.removeDependant(hook)};parameters.clear;
        sources.values.do(_.invalidate);sources.clear;
        pending.copy.do{|finish|finish.value(nil,Error("AWModulationRegistry closed during query"))};responders.do(_.free);responders.clear;^this;
    }
}
