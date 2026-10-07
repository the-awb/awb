// One borrowed SC host, four independent cells, persistent rack inputs/returns.
AWBDelayRack {
    var <base,<rack,<server,<graph,<ready=false,<closed=false,<state,<params,<epoch;
    var adapter,feeders,returns,parameterGroup,hooks,responder,watchers,revision=0,starting=false,pipeDefinition;
    *configure { |spec|
        var copy=spec.deepCopy,ids=[\delbus,\b1,\a2,\b2,\a1,\sc1,\sc2];
        if(copy[\rack][\channels].any{|c|ids.includes(c[\id].asSymbol)}){Error("Delay channels already declared").throw};
        copy[\rack][\channels]=copy[\rack][\channels]++ids.collect{|id|(id:id.asString,label:if(id==\delbus){"Delay Bus"}{id.asString.toUpper})};^copy;
    }
    *open { |base,rack,plan,configuration,action|^super.new.init(base,rack,plan,configuration).start(action)}
    *midi { |track,name|
        var row;
        row=this.midiRows.detect{|m|m[\track]==track.asString and:{m[\name]==name.asString}};
        ^if(row.isNil){()}{(channel:3,cc:row[\cc],pickup:true)};
    }
    *midiRows {^[(track:"b1",name:"vcIn",cc:30),(track:"a2",name:"vcIn",cc:26),(track:"a2",name:"b1In",cc:25),(track:"b2",name:"vcIn",cc:29),(track:"b2",name:"b1In",cc:28),(track:"b2",name:"a2In",cc:27),(track:"a1",name:"vcIn",cc:24),(track:"a1",name:"b1In",cc:23),(track:"a1",name:"a2In",cc:22),(track:"a1",name:"b2In",cc:21),(track:"b1",name:"busMix",cc:61),(track:"b1",name:"envMod",cc:62),(track:"b1",name:"envAS",cc:71),(track:"b1",name:"envDR",cc:72),(track:"b1",name:"thPMod",cc:81),(track:"b1",name:"thAMod",cc:82),(track:"b1",name:"inSc",cc:70),(track:"b1",name:"fbSc",cc:80),(track:"b1",name:"fxSc",cc:69),(track:"b1",name:"sliSc",cc:79),(track:"b1",name:"fxOf",cc:39),(track:"b1",name:"thM",cc:90),(track:"b1",name:"thP",cc:89),(track:"b1",name:"host",cc:99),(track:"b1",name:"tapRec",cc:100),(track:"a2",name:"thPMod",cc:91),(track:"a2",name:"thAMod",cc:92),(track:"a2",name:"inSc",cc:66),(track:"a2",name:"fbSc",cc:65),(track:"a2",name:"fxSc",cc:76),(track:"a2",name:"sliSc",cc:75),(track:"a2",name:"fxOf",cc:35),(track:"a2",name:"sliOf",cc:96),(track:"a2",name:"thM",cc:86),(track:"a2",name:"thP",cc:85),(track:"a2",name:"host",cc:95),(track:"a1",name:"thPMod",cc:91),(track:"a1",name:"thAMod",cc:92),(track:"a1",name:"inOf",cc:34),(track:"a1",name:"fbOf",cc:33),(track:"a1",name:"sliOf",cc:94),(track:"a1",name:"inSc",cc:68),(track:"a1",name:"fbSc",cc:67),(track:"a1",name:"fxSc",cc:78),(track:"a1",name:"sliSc",cc:77),(track:"a1",name:"thM",cc:84),(track:"a1",name:"thP",cc:83),(track:"a1",name:"host",cc:93),(track:"b2",name:"thPMod",cc:81),(track:"b2",name:"thAMod",cc:82),(track:"b2",name:"inSc",cc:64),(track:"b2",name:"fbSc",cc:63),(track:"b2",name:"fxSc",cc:74),(track:"b2",name:"sliSc",cc:73),(track:"b2",name:"fxOf",cc:37),(track:"b2",name:"thM",cc:88),(track:"b2",name:"thP",cc:87),(track:"b2",name:"host",cc:97),(track:"b2",name:"tapRec",cc:98)]}
    *json { |value|
        if(value.isNil){^"null"};if(value.isKindOf(Boolean)){^if(value){"true"}{"false"}};
        if(value.isNumber){^value.asString};if(value.isString or:{value.isKindOf(Symbol)}){^value.asString.asCompileString};
        if(value.isArray){^"["++value.collect{|v|this.json(v)}.join(",")++"]"};
        ^"{"++value.keys.asArray.sort.collect{|k|this.json(k)++":"++this.json(value[k])}.join(",")++"}";
    }
    init { |owner,sendRack,plan,configuration|
        base=owner;rack=sendRack;server=base.server;
        if(rack.server!==server or:{rack.ready.not}){Error("Delays need a ready rack on the AWBase server").throw};
        [\delbus,\b1,\a2,\b2,\a1,\sc1,\sc2].do{|id|rack.inputFor(id)};
        state=configuration.deepCopy;state[\routes]=Dictionary.new;configuration[\routes].do{|pair|state[\routes][pair[0]]=pair[1]};
        params=Dictionary.new;hooks=IdentityDictionary.new;feeders=List.new;returns=List.new;watchers=Dictionary.new;
        epoch=thisProcess.pid.asString++":"++UniqueID.next;
        graph=UBPGraphController(server,plan,base.instance);^this;
    }
    requireOpen {if(closed or:{ready.not} or:{server.serverRunning.not}){Error("Delay binding unavailable").throw};^this}
    start { |action|
        starting=true;
        graph.start({|result,error|
            if(error.notNil or:{closed}){starting=false;this.close;action.value(nil,error ? Error("Delay owner closed during startup"))}{
                Routine({
                    var bridge;
                    try{
                        base.group.moveBefore(rack.rootGroup);
                        graph.group.moveToTail(rack.sourceGroup);
                        parameterGroup=Group.head(base.group);base.instance.own(parameterGroup,\group,(name:"Delay parameters"));
                        adapter=UBPGraphAWParamAdapter(graph);
                        bridge=SynthDef(("awbDelayPipe"++UniqueID.next).asSymbol,{|in=0,out=0,gain=1,previous=0|Out.ar(out,Select.ar(previous,[In.ar(in,2),InFeedback.ar(in,2)])*gain)});
                        pipeDefinition=bridge;bridge.send(server);AWParam.prepare(server);server.sync;
                        ["clean","pro2","sc1","sc2"].do{|id|
                            var source=if(id=="clean"){\vc}{id.asSymbol},node;
                            node=Synth.before(graph.group,bridge.name,[\in,rack.postFor(source).index,\out,graph.port(id,"out").index,\previous,1]);feeders.add(node);base.instance.own(node,\synth,(name:"Delay input "++source));
                        };
                        // Independent wet channels are initially unsent; Delay Bus is the aggregate.
                        ["B1","A2","B2","A1"].do{|id|
                            var node=Synth.after(graph.group,bridge.name,[\in,graph.port(id,"wet").index,\out,rack.inputFor(id.toLower.asSymbol).index]);returns.add(node);base.instance.own(node,\synth,(name:"Delay return "++id));
                        };
                        returns.add(Synth.after(graph.group,bridge.name,[\in,graph.port("monitor","in").index,\out,rack.inputFor(\delbus).index]));base.instance.own(returns.last,\synth,(name:"Delay Bus return"));
                        this.bindParameters;
                        rack.setSend(\delbus,\mast,1);rack.setLevel(\delbus,0.8);
                        server.sync;ready=true;starting=false;this.installResponder;
                        if(closed){this.close;action.value(nil,Error("Delay owner closed during startup"))}{base.log("Four delays connected; VC/Pro2/SC1/SC2 inputs, separate returns and Delay Bus");action.value(this,nil)};
                    }{|failure|starting=false;this.close;action.value(nil,failure)};
                }).play(SystemClock);
            };
        });^this;
    }
    addParam { |id,target,value,setter|
        var p=AWParam(id.asSymbol,value,ControlSpec(target[\min],target[\max]),target:parameterGroup,server:server,options:(ownerInstance:base.instance,ownFunction:{|n,type,meta|base.instance.own(n,type,meta)},disownFunction:{|n|base.instance.disown(n)}));
        params[id]=p;adapter.bind(target,p);
        hooks[p]={|object,what,data|if(what==\baseTarget and:{closed.not}){setter.value(p.baseTarget);revision=revision+1;this.notifyValue(id,p.baseTarget)}};p.addDependant(hooks[p]);^p;
    }
    bindParameters {
        var names=(inputGain:\inOf,feedback:\fbOf,effectLevel:\fxOf,seconds:\sliOf,dryLevel:\dryOf);
        state[\cells].do{|cell|
            var id=cell[\id],track=base.track(id.toLower.asSymbol);
            [\seconds,\inputGain,\feedback,\effectLevel,\dryLevel,\fadeGate,\fadeIn,\fadeOut,\running].do{|field|
                var value=cell[field],p,target=graph.cellTarget(id,field);if(field==\fadeGate or:{field==\running}){value=value.binaryValue};
                if(field==\seconds){target=target.copy.put(\min,0.01)};
                p=this.addParam(id++"/"++field,target,value,{|v|cell[field]=if([\fadeGate,\running].includes(field)){v>=0.5}{v}});
                if(names[field].notNil){track.add(names[field],p,field.asString,this.class.midi(id.toLower,names[field]))};
            };
        };
        state[\cells].do{|cell|cell[\heads].do{|h|
            var id=cell[\id],name=(h[\id]++"Amount").asSymbol;
            var p=this.addParam(id++"/"++h[\id]++"/amount",graph.headTarget(id,h[\id],\level),h[\amount],{|v|h[\amount]=v});
            base.track(id.toLower.asSymbol).add(name,p,"Head "++h[\id]++" amount");
            if(h[\enabled].not){graph.setTarget(graph.headTarget(cell[\id],h[\id],\source),-1)};h[\sends].keysValuesDo{|to,gain|graph.setRoute(cell[\id]++"/"++h[\id]++":"++to.asString,gain)}}};
        state[\routes].keysValuesDo{|id,value|
            var p=this.addParam(id,graph.routeTarget(id).copy.putAll((min:0,max:1)),value,{|v|state[\routes][id]=v}),parts=id.split($:),names=(clean:\vcIn,pro2:\p2In,sc1:\sc1In,sc2:\sc2In,B1:\b1In,A2:\a2In,B2:\b2In);
            if(parts[1]!="monitor"){base.track(parts[1].toLower.asSymbol).add(names[parts[0].asSymbol],p,id,this.class.midi(parts[1].toLower,names[parts[0].asSymbol]))};
        };
        this.class.midiRows.do{|row|var track=base.track(row[\track]),id=row[\name].asSymbol;if(track.p[id].isNil){track.unavailable(id,row[\name],this.class.midi(row[\track],id))}};
        [\globalInput,\master].do{|field|
            var p=AWParam(field,state[field],ControlSpec(0,if(field==\master){2}{1}),target:parameterGroup,server:server,options:(ownerInstance:base.instance,ownFunction:{|n,type,meta|base.instance.own(n,type,meta)},disownFunction:{|n|base.instance.disown(n)}));
            params[field.asString]=p;
            if(field==\globalInput){feeders.do{|n|p.mapTo(n,\gain)}}{rack.bindLevelParam(\delbus,p);base.track(\delbus).add(\fader,p,"Delay Bus",(channel:3,cc:32,pickup:true))};
            hooks[p]={|o,what,data|if(what==\baseTarget and:{closed.not}){state[field]=p.baseTarget;revision=revision+1;this.notifyValue(field.asString,p.baseTarget)}};p.addDependant(hooks[p]);
        };
    }
    setField { |kind,id,field,value|
        var cell,p;
        this.requireOpen;
        switch(kind.asString,
            "cell",{
                cell=state[\cells].detect{|c|c[\id]==id};if(cell.isNil){Error("Unknown delay cell").throw};
                p=params[id++"/"++field];if(p.isNil){Error("Unknown delay field").throw};p.setBase(value);
            },
            "route",{p=params[id];if(p.isNil){Error("Unknown delay route").throw};p.setBase(value)},
            "global",{p=params[field];if(p.isNil){Error("Unknown global delay control").throw};p.setBase(value)},
            "head",{this.setHead(id,field,value)},
            "meta",{this.setMetadata(id,field,value)},
            "clear",{graph.clear(id)},
            {Error("Unknown delay operation").throw});^this;
    }
    // UI timing metadata is retained by the SC owner; only seconds drives DSP.
    setMetadata { |id,field,value|
        var cell=state[\cells].detect{|c|c[\id]==id},key=field.asSymbol;
        if(id=="" and:{field=="tempo"}){UnifiedBufferController.check(value,20,400,"tempo");state[\tempo]=value}{
            if(cell.isNil){Error("Unknown delay metadata cell").throw};
            switch(field,
                "timingMode",{value=value.asString;if(["seconds","beats"].includesEqual(value).not){Error("Invalid timing mode").throw}},
                "beats",{UnifiedBufferController.check(value,0.001,256,"beats")},
                "divisor",{if([1,2,4,8,16,32,64].includes(value).not){Error("Invalid divisor").throw}},
                "triplet",{if([0,1].includes(value).not){Error("Invalid triplet").throw};value=value==1},
                "preset",{value=value.asString;if(["AB","A","B","quad","custom"].includesEqual(value).not){Error("Invalid preset").throw}},
                {Error("Unknown delay metadata").throw});
            cell[key]=value;
        };revision=revision+1;this.notifyValue(if(id==""){field}{id++"/"++field},if(value.isKindOf(Boolean)){value.binaryValue}{value});^this;
    }
    setHead { |id,field,value|
        var keys=field.split($/),cell=state[\cells].detect{|c|c[\id]==id},head,index,target;
        if(cell.isNil or:{keys.size<2}){Error("Unknown head").throw};head=cell[\heads].detect{|h|h[\id]==keys[0]};if(head.isNil){Error("Unknown head").throw};
        switch(keys[1],
            "value",{target=graph.headTarget(id,keys[0],\time);graph.setTarget(target,value);head[\value]=value},
            "amount",{params[id++"/"++keys[0]++"/amount"].setBase(value)},
            "enabled",{if([0,1].includes(value).not){Error("Invalid head enabled").throw};graph.setTarget(graph.headTarget(id,keys[0],\source),if(value!=0){graph.plan[\nodes][graph.cellIndex(id)][\heads].detect{|h|h[\id]==keys[0]}[\source]}{-1});head[\enabled]=value!=0},
            "unit",{if([0,1].includes(value).not){Error("Invalid head unit").throw};graph.setTarget(graph.headTarget(id,keys[0],\relative),value);head[\unit]=if(value==1){"fraction"}{"seconds"}},
            "left",{this.headGain(id,head,0,value);head[\left]=value},
            "right",{this.headGain(id,head,1,value);head[\right]=value},
            "send",{if(keys.size!=3){Error("Unknown head send").throw};graph.setRoute(id++"/"++keys[0]++":"++keys[2],value);head[\sends][keys[2].asSymbol]=value},
            {Error("Unknown head field").throw});revision=revision+1;watchers.values.do{|w|w[\address].sendMsg('/awb/delay/headDelta',base.instance.instanceID,w[\token],epoch,revision,id,field,value)};^this;
    }
    headGain { |id,head,ch,value|["wet","tap-"++head[\id]].do{|port|graph.setTarget(graph.headTarget(id,head[\id],\gain,port,ch),value)};^this}
    pruneWatchers {watchers.keys.copy.do{|key|if(Main.elapsedTime-watchers[key][\seen]>10){watchers.removeAt(key)}};^this}
    notifyValue { |id,value|
        this.pruneWatchers;watchers.values.do{|w|w[\address].sendMsg('/awb/delay/delta',base.instance.instanceID,w[\token],epoch,revision,id,value)};^this;
    }
    reply { |address,token,request|
        address.sendMsg('/awb/delay/state',base.instance.instanceID,token,epoch,request,revision,this.class.json(state),this.class.json(graph.graphBuffers.collect{|b|b[\regions]}));^this;
    }
    installResponder {
        responder=OSCdef(("awbDelays"++UniqueID.next).asSymbol,{|msg,time,address|
            if(address.ip=="127.0.0.1" and:{msg.size>=5} and:{msg[1].asString==base.instance.instanceID}){
                var token=msg[3].asString,request=msg[4].asString,key=address.port.asString++token;
                try{
                    this.requireOpen;this.pruneWatchers;
                    if(token.size>64 or:{request.size>64}){Error("Invalid delay subscription").throw};
                    if(msg[2].asString=="bind"){
                        if(watchers.size>=8 and:{watchers[key].isNil}){Error("Delay observer capacity reached").throw};watchers[key]=(address:address,token:token,seen:Main.elapsedTime);this.reply(address,token,request);
                    }{
                        if(watchers[key].isNil or:{msg[5].asString!=epoch}){Error("Stale delay token").throw};
                        switch(msg[2].asString,"alive",{watchers[key][\seen]=Main.elapsedTime;address.sendMsg('/awb/delay/alive',base.instance.instanceID,token,epoch)},"state",{this.reply(address,token,request)},"edit",{
                            this.setField(msg[6].asString,msg[7].asString,msg[8].asString,msg[9]);address.sendMsg('/awb/delay/accepted',base.instance.instanceID,token,epoch,request,revision);
                        },"unwatch",{watchers.removeAt(key)}, {Error("Unknown delay request").throw});
                    };
                }{|error|address.sendMsg('/awb/delay/error',base.instance.instanceID,token,epoch,request,error.errorString)};
            }
        },'/awb/delay/control');^this;
    }
    free {^this.close}
    close {
        if(closed and:{starting}){^this};if(closed and:{graph.closed}){^this};closed=true;ready=false;
        watchers.values.do{|w|w[\address].sendMsg('/awb/delay/closed',base.instance.instanceID,w[\token],epoch)};watchers.clear;responder.tryPerform(\free);
        if(rack.closed.not){rack.unbindLevelParam(\delbus)};adapter.tryPerform(\free);params.values.do{|p|p.removeDependant(hooks[p]);p.free};params.clear;hooks.clear;
        (feeders++returns).do{|n|n.free;base.instance.disown(n)};feeders.clear;returns.clear;
        parameterGroup.tryPerform(\free);if(parameterGroup.notNil){base.instance.disown(parameterGroup)};
        // Native retirement owns asynchronous Buffer/region release. Prevent the
        // parent Tool's synchronous terminateOwned pass from freeing these twice.
        ([graph.group]++graph.nodes.asArray++graph.buffers.asArray++graph.ports.collect{|ports|ports.reject(_.isNil)}.flat).reject(_.isNil).do{|object|base.instance.disown(object)};
        if(graph.group.notNil and:{server.serverRunning}){graph.group.run(false);graph.group.moveToTail(server.defaultGroup)};
        graph.free;if(pipeDefinition.notNil and:{server.serverRunning}){server.sendMsg('/d_free',pipeDefinition.name)};pipeDefinition=nil;^this;
    }
}
