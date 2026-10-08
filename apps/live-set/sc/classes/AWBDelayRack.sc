// One borrowed SC host, four independent cells, persistent rack inputs/returns.
AWBDelayRack {
    var <base,<rack,<server,<graph,<ready=false,<closed=false,<state,<params,<epoch;
    var adapter,feeders,returns,parameterGroup,hooks,responder,watchers,revision=0,starting=false,pipeDefinition,headDrivers,headModDefinition,headSourceIDs,clockObserver;
    *configure { |spec,extraInputs = #[sc1,sc2]|
        var copy=spec.deepCopy,ids=[\delbus,\b1,\a2,\b2,\a1]++extraInputs;
        if(copy[\rack][\channels].any{|c|ids.includes(c[\id].asSymbol)}){Error("Delay channels already declared").throw};
        copy[\rack][\channels]=copy[\rack][\channels]++ids.collect{|id|(id:id.asString,label:if(id==\delbus){"Delay Bus"}{id.asString.toUpper})};^copy;
    }
    *open { |base,rack,plan,configuration,action|^super.new.init(base,rack,plan,configuration).start(action)}
    *midi { |track,name|
        var row;
        row=this.midiRows.detect{|m|m[\track]==track.asString and:{m[\name]==name.asString}};
        ^if(row.isNil){()}{if([\thM,\thP].includes(name.asSymbol)){(channel:3,cc:row[\cc],pickup:false,lo:0,hi:3)}{(channel:3,cc:row[\cc],pickup:true)}};
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
        [\delbus,\b1,\a2,\b2,\a1].do{|id|rack.inputFor(id)};
        state=configuration.deepCopy;state[\routes]=Dictionary.new;configuration[\routes].do{|pair|state[\routes][pair[0]]=pair[1]};
        params=Dictionary.new;hooks=IdentityDictionary.new;feeders=List.new;returns=List.new;watchers=Dictionary.new;headDrivers=List.new;headSourceIDs=List.new;
        epoch=thisProcess.pid.asString++":"++UniqueID.next;
        graph=UBPGraphController(server,plan,base.instance);^this;
    }
    *pipeDef {
        ^SynthDef(("awbDelayPipe"++UniqueID.next).asSymbol,{|in=0,out=0,gain=1|Out.ar(out,In.ar(in,2)*gain)});
    }
    // Put source channels before the graph and delay/FX return channels after it.
    // Build messages first so missing inputs cannot leave a partially moved graph.
    *routingOrderMessages { |rack,group,inputIDs|
        var upstream=[\vc]++inputIDs.reject{|id|id=="clean"}.collect(_.asSymbol)++[\delbus];
        var before=upstream.collect{|id|rack.channelAt(id)[\node]},after,messages=List.new;
        after=rack.channels.values.reject{|c|upstream.includes(c[\id])}.collect{|c|c[\node]}.asArray;
        messages.add(group.moveBeforeMsg(rack.channelAt(\b1)[\node]));
        before.do{|node|messages.add(node.moveBeforeMsg(group))};
        after.reverseDo{|node|messages.add(node.moveAfterMsg(group))};
        ^messages.asArray;
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
                        server.sendBundle(nil,*this.class.routingOrderMessages(rack,graph.group,
                            graph.plan[\nodes].select{|item|item[\kind]=="input"}.collect{|item|item[\id]}));
                        parameterGroup=Group.head(base.group);base.instance.own(parameterGroup,\group,(name:"Delay parameters"));
                        adapter=UBPGraphAWParamAdapter(graph);
                        bridge=this.class.pipeDef;
                        pipeDefinition=bridge;bridge.send(server);AWParam.prepare(server);server.sync;
                        // Enforce VC channel -> cello feed -> Delay Bus channel order.
                        // Delay inputs and cells then read these current-block post buses.
                        feeders.add(Synth.after(rack.channelAt(\vc)[\node],bridge.name,[\in,rack.postFor(\vc).index,\out,rack.inputFor(\delbus).index]));
                        rack.channelAt(\delbus)[\node].moveAfter(feeders.last);
                        base.instance.own(feeders.last,\synth,(name:"Cello feed to Delay Bus"));
                        graph.plan[\nodes].select{|item|item[\kind]=="input"}.do{|item|
                            var id=item[\id];
                            var source=if(id=="clean"){\delbus}{id.asSymbol},node;
                            node=Synth.before(graph.group,bridge.name,[\in,rack.postFor(source).index,\out,graph.port(id,"out").index]);feeders.add(node);base.instance.own(node,\synth,(name:"Delay input "++source));
                        };
                        // Each cell reaches hardware only through its own explicit rack sends.
                        ["B1","A2","B2","A1"].do{|id|
                            var node=Synth.after(graph.group,bridge.name,[\in,graph.port(id,"wet").index,\out,rack.inputFor(id.toLower.asSymbol).index]);returns.add(node);base.instance.own(node,\synth,(name:"Delay return "++id));
                        };
                        this.bindParameters;
                        rack.setSend(\delbus,\mast,0);rack.setLevel(\delbus,state[\globalInput]);
                        server.sync;ready=true;starting=false;this.installResponder;
                        clockObserver={|clock,what|if(what==\tempo and:{closed.not}){this.syncClock}};
                        base.clock.addDependant(clockObserver);this.syncClock;
                        if(closed){this.close;action.value(nil,Error("Delay owner closed during startup"))}{base.log("Four delays connected; configured rack inputs, explicit cell returns and cello-only Delay Bus");action.value(this,nil)};
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
    *feedbackCeiling { |cell|^if(cell[\heads].count{|head|head[\enabled]}>2){0.5}{1} }
    syncFeedbackRange { |cell|
        var p=params[cell[\id]++"/feedback"];
        if(p.notNil){p.rescaleLinearRange(0,this.class.feedbackCeiling(cell))};^this;
    }
    bindParameters {
        var names=(inputGain:\inOf,feedback:\fbOf,effectLevel:\fxOf,seconds:\sliOf,dryLevel:\dryOf);
        state[\cells].do{|cell|
            var id=cell[\id],track=base.track(id.toLower.asSymbol);
            [\seconds,\inputGain,\feedback,\effectLevel,\dryLevel,\fadeGate,\fadeIn,\fadeOut,\running].do{|field|
                var value=cell[field],p,target=graph.cellTarget(id,field);if(field==\fadeGate or:{field==\running}){value=value.binaryValue};
                if(field==\seconds){target=target.copy.put(\min,0.01)};
                if(field==\inputGain){target=target.copy.put(\max,1);value=value.clip(0,1);cell[field]=value};
                if(field==\feedback){target=target.copy.put(\max,this.class.feedbackCeiling(cell));value=value.clip(0,target[\max]);cell[field]=value};
                if(field==\effectLevel){target=target.copy.put(\max,1)}; // Live wet/output gain stops at unity.
                p=this.addParam(id++"/"++field,target,value,{|v|cell[field]=if([\fadeGate,\running].includes(field)){v>=0.5}{v}});
                if(names[field].notNil){track.add(names[field],p,field.asString,this.class.midi(id.toLower,names[field]));track.canonical(names[field])};
            };
        };
        state[\cells].do{|cell|cell[\heads].do{|h|
            var id=cell[\id],name=(h[\id]++"Amount").asSymbol;
            var p=this.addParam(id++"/"++h[\id]++"/amount",graph.headTarget(id,h[\id],\level),h[\amount],{|v|h[\amount]=v});
            base.track(id.toLower.asSymbol).add(name,p,"Head "++h[\id]++" amount");
            if(h[\enabled].not){graph.setTarget(graph.headTarget(cell[\id],h[\id],\source),-1)};h[\sends].keysValuesDo{|to,gain|graph.setRoute(cell[\id]++"/"++h[\id]++":"++to.asString,gain)}}};
        state[\routes].keysValuesDo{|id,value|
            var p=this.addParam(id,graph.routeTarget(id).copy.putAll((min:0,max:1)),value,{|v|state[\routes][id]=v}),parts=id.split($:),names=(clean:\vcIn,pro2:\p2In,sc1:\sc1In,sc2:\sc2In,mic:\micIn,patterns:\patternsIn,B1:\b1In,A2:\a2In,B2:\b2In);
            if(parts[1]!="monitor"){base.track(parts[1].toLower.asSymbol).add(names[parts[0].asSymbol],p,id,this.class.midi(parts[1].toLower,names[parts[0].asSymbol]))};
        };
        this.bindLegacyControls;
        this.class.midiRows.do{|row|var track=base.track(row[\track]),id=row[\name].asSymbol;if(track.p[id].isNil){track.unavailable(id,row[\name],this.class.midi(row[\track],id))}};
        [\globalInput].do{|field|
            var p=AWParam(field,state[field],ControlSpec(0,1),target:parameterGroup,server:server,options:(ownerInstance:base.instance,ownFunction:{|n,type,meta|base.instance.own(n,type,meta)},disownFunction:{|n|base.instance.disown(n)}));
            p.midiRange(0,1);params[field.asString]=p;
            rack.bindLevelParam(\delbus,p);base.track(\delbus).fader=p;base.track(\delbus).add(\fader,p,"Cello to delays",(channel:3,cc:32,pickup:true));
            hooks[p]={|o,what,data|if(what==\baseTarget and:{closed.not}){state[field]=p.baseTarget;revision=revision+1;this.notifyValue(field.asString,p.baseTarget)}};p.addDependant(hooks[p]);
        };
    }
    legacyParam { |cell,id,value,lo=0,hi=1,action,choice=false|
        var key=cell[\id]++"/"++id,param=AWParam(key.asSymbol,value,ControlSpec(lo,hi),target:parameterGroup,server:server,
            options:(baseSmoothing:if(choice){0}{0.5},ownerInstance:base.instance,ownFunction:{|n,type,m|base.instance.own(n,type,m)},disownFunction:{|n|base.instance.disown(n)}));
        params[key]=param;hooks[param]={|p,what,data|if(what==\baseTarget and:{closed.not}){action.value(p.baseTarget,data);revision=revision+1;this.notifyValue(key,p.baseTarget)}};param.addDependant(hooks[param]);
        if(choice){base.track(cell[\id].toLower.asSymbol).field(id,param,\choice,id.asString,this.class.midi(cell[\id].toLower,id))}{base.track(cell[\id].toLower.asSymbol).add(id,param,id.asString,this.class.midi(cell[\id].toLower,id))};^param;
    }
    bindLegacyControls {
        headModDefinition=SynthDef(("awbHeadErosion"++UniqueID.next).asSymbol,{|out=0,amountBus=0,positionBus=0,rate=0.035,second=0.08,fourth = -0.13|
            var amount=In.kr(amountBus),position=In.kr(positionBus),erosion=LFNoise2.kr([1,1.17,0.83,1.31]*rate).range(-1,0)*amount;
            // Smooth negative level erosion; heads 2 and 4 wander off their grid.
            ReplaceOut.kr(out,erosion++[LFNoise2.kr(rate*0.7)*position*second,LFNoise2.kr(rate*0.9)*position*fourth]);
        });headModDefinition.send(server);server.sync;
        state[\cells].do{|cell|
            var id=cell[\id],track=base.track(id.toLower.asSymbol),amount,position,bus,node,amountMap=(inputGain:\inSc,feedback:\fbSc,effectLevel:\fxSc,seconds:\sliSc);
            amountMap.keysValuesDo{|field,name|var p=params[id++"/"++field];p.setPolarity(\bipolar);p.setAmount(0);track.field(name,p,\amount,name.asString,this.class.midi(id.toLower,name))};
            this.legacyParam(cell,\thM,cell[\legacyMode] ? 2,0,3,{|v|this.setLegacyMode(id,v.round.asInteger)},true);
            this.legacyParam(cell,\thP,cell[\legacyPosition] ? 1,0,3,{|v|this.setLegacyPosition(id,v.round.asInteger)},true);
            cell[\sliderMinimum]=0;cell[\sliderMaximum]=1;cell[\sliderPosition]=cell[\seconds]/32;
            this.legacyParam(cell,\host,0,0,1,{|v|cell[\timingMode]=if(v>=0.5){"beats"}{"seconds"};this.updateLegacyTime(cell)});
            this.legacyParam(cell,\beats,cell[\beats],0.001,256,{|v|cell[\beats]=v;this.updateLegacyTime(cell)},true);
            this.legacyParam(cell,\tDiv,cell[\divisor],1,64,{|v|cell[\divisor]=v;this.updateLegacyTime(cell)},true);
            this.legacyParam(cell,\trip,cell[\triplet].asInteger,0,1,{|v|cell[\triplet]=v>=0.5;this.updateLegacyTime(cell)});
            this.legacyParam(cell,\sliMin,0,0,1,{|v|cell[\sliderMinimum]=v;this.updateLegacyTime(cell)});
            this.legacyParam(cell,\sliMax,1,0,1,{|v|cell[\sliderMaximum]=v;this.updateLegacyTime(cell)});
            this.legacyParam(cell,\tSli,cell[\sliderPosition],0,1,{|v,data|cell[\sliderPosition]=v;this.updateLegacyTime(cell,data[\dur] ? 0,data[\curve] ? 0)});
            track.add(\in,params[id++"/inputGain"]);track.add(\fb,params[id++"/feedback"]);track.add(\fx,params[id++"/effectLevel"]);track.add(\dry,params[id++"/dryLevel"]);track.add(\fade,params[id++"/fadeGate"]);
            this.legacyParam(cell,\loopControl,0,0,3,{|v|this.setLoopMode(id,v.round.asInteger)},true);
            track.metadata[\loopControl][\midi]=(channel:3,cc:switch(id,"B1",{40},"A2",{36},"B2",{38},"A1",{nil}),pickup:false,lo:0,hi:3);
            amount=this.legacyParam(cell,\thAMod,0,0,1);position=this.legacyParam(cell,\thPMod,0,0,1);
            bus=base.createBus((id++"HeadErosion").asSymbol,\control,6);
            node=Synth.tail(parameterGroup,headModDefinition.name,[\out,bus.index,\amountBus,amount.outputBus.index,\positionBus,position.outputBus.index,\rate,(cell[\headErosion] ? ())[\rate] ? 0.035,\second,(cell[\headErosion] ? ())[\second] ? 0.08,\fourth,(cell[\headErosion] ? ())[\fourth] ? -0.13]);headDrivers.add(node);base.instance.own(node,\synth,(name:id++" tapehead erosion",parent:parameterGroup));
            cell[\heads].do{|head,i|
                var p=params[id++"/"++head[\id]++"/amount"],time;
                p.setAmount(1);headSourceIDs.add((id++head[\id]++"Erosion").asSymbol);p.addModulation(headSourceIDs.last,base.registerModulationSource(headSourceIDs.last,Bus.new(\control,bus.index+i,1,server),node),1,0,\previousBlock);
                time=this.addParam(id++"/"++head[\id]++"/time",graph.headTarget(id,head[\id],\time),head[\value],{|v|head[\value]=v});
                if([1,3].includes(i)){time.setAmount(1);headSourceIDs.add((id++head[\id]++"Position").asSymbol);time.addModulation(headSourceIDs.last,base.registerModulationSource(headSourceIDs.last,Bus.new(\control,bus.index+4+(i==3).asInteger,1,server),node),1/(time.spec.maxval-time.spec.minval),0,\previousBlock)};
            };
        };^this;
    }
    syncClock {
        state[\tempo]=base.clock.tempo*60;
        state[\cells].do{|cell|if(cell[\timingMode]=="beats"){this.updateLegacyTime(cell)}};
        revision=revision+1;this.notifyValue("tempo",state[\tempo]);^this;
    }
    updateLegacyTime { |cell,duration=0,curve=0|
        var full=if(cell[\timingMode]=="beats"){(cell[\beats]*4/cell[\divisor]/base.clock.tempo)*if(cell[\triplet]){2/3}{1}}{32};
        var lo=cell[\sliderMinimum] ? 0,hi=cell[\sliderMaximum] ? 1;
        params[cell[\id]++"/seconds"].setBase((full*cell[\sliderPosition].linlin(0,1,lo.min(hi),lo.max(hi))).clip(0.01,32),duration,curve);^this;
    }
    setLoopMode { |id,mode|
        var settings=[[0,0],[1,0],[1,1],[0,1]],cell=state[\cells].detect{|c|c[\id]==id};
        if(cell.isNil){Error("Unknown delay cell").throw};
        if(mode.isInteger.not or:{mode<0} or:{mode>3}){Error("Delay loop mode is 0-3").throw};
        this.setField("cell",id,"inputGain",settings[mode][0]);this.setField("cell",id,"feedback",settings[mode][1]*this.class.feedbackCeiling(cell));^this;
    }
    setLegacyMode { |id,mode|
        var cell=state[\cells].detect{|c|c[\id]==id},levels;
        if(cell.isNil or:{[0,1,2,3].includes(mode).not}){Error("Invalid head mode").throw};
        levels=if(mode==3){[0.6,0.75,0.5,0.9]}{[1,1,1,1]};
        cell[\heads].do{|head,i|this.setHead(id,head[\id]++"/enabled",if(mode==0){(i<2).asInteger}{if(mode==1){(i>=2).asInteger}{1}});this.setHead(id,head[\id]++"/amount",levels[i])};^this;
    }
    setLegacyPosition { |id,mode|
        var values=[[0.25,0.5,0.75,1],[0.5,0.5,1,1],[1,1,1,1]],cell=state[\cells].detect{|c|c[\id]==id};
        if(cell.isNil or:{[0,1,2,3].includes(mode).not}){Error("Invalid head position").throw};
        if(mode==3){^this}; // Original Lua leaves positions unchanged for the fourth choice.
        cell[\heads].do{|head,i|this.setHead(id,head[\id]++"/unit",1);this.setHead(id,head[\id]++"/value",values[mode][i])};^this;
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
        if(id=="" and:{field=="tempo"}){UnifiedBufferController.check(value,20,400,"tempo");base.clock.tempo=value/60}{
            if(cell.isNil){Error("Unknown delay metadata cell").throw};
            switch(field,
                "timingMode",{value=value.asString;if(["seconds","beats"].includesEqual(value).not){Error("Invalid timing mode").throw}},
                "beats",{UnifiedBufferController.check(value,0.001,256,"beats")},
                "divisor",{if([1,2,4,8,16,32,64].includes(value).not){Error("Invalid divisor").throw}},
                "triplet",{if([0,1].includes(value).not){Error("Invalid triplet").throw};value=value==1},
                "preset",{value=value.asString;if(["AB","A","B","quad","custom"].includesEqual(value).not){Error("Invalid preset").throw}},
                {Error("Unknown delay metadata").throw});
            cell[key]=value;
            if(["timingMode","beats","divisor","triplet"].includesEqual(field)){this.updateLegacyTime(cell)};
        };revision=revision+1;this.notifyValue(if(id==""){field}{id++"/"++field},if(value.isKindOf(Boolean)){value.binaryValue}{value});^this;
    }
    setHead { |id,field,value|
        var keys=field.split($/),cell=state[\cells].detect{|c|c[\id]==id},head,index,target;
        if(cell.isNil or:{keys.size<2}){Error("Unknown head").throw};head=cell[\heads].detect{|h|h[\id]==keys[0]};if(head.isNil){Error("Unknown head").throw};
        switch(keys[1],
            "value",{if(params[id++"/"++keys[0]++"/time"].notNil){params[id++"/"++keys[0]++"/time"].setBase(value)}{target=graph.headTarget(id,keys[0],\time);graph.setTarget(target,value)};head[\value]=value},
            "amount",{params[id++"/"++keys[0]++"/amount"].setBase(value)},
            "enabled",{
                if([0,1].includes(value).not){Error("Invalid head enabled").throw};
                target=graph.headTarget(id,keys[0],\source);graph.checkTarget(target);
                index=if(value!=0){graph.plan[\nodes][graph.cellIndex(id)][\heads].detect{|h|h[\id]==keys[0]}[\source]}{-1};
                head[\enabled]=value!=0;
                // Ceiling and head activation arrive together at the block boundary.
                server.makeBundle(nil,{this.syncFeedbackRange(cell);graph.setTarget(target,index)});
            },
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
        if(clockObserver.notNil){base.clock.removeDependant(clockObserver);clockObserver=nil};
        watchers.values.do{|w|w[\address].sendMsg('/awb/delay/closed',base.instance.instanceID,w[\token],epoch)};watchers.clear;responder.tryPerform(\free);
        if(rack.closed.not){rack.unbindLevelParam(\delbus)};adapter.tryPerform(\free);params.values.do{|p|p.removeDependant(hooks[p]);p.free};params.clear;hooks.clear;
        (feeders++returns).do{|n|n.free;base.instance.disown(n)};feeders.clear;returns.clear;
        headSourceIDs.do{|id|base.unregisterModulationSource(id)};headSourceIDs.clear;headDrivers.do{|n|n.free;base.instance.disown(n)};headDrivers.clear;if(headModDefinition.notNil and:{server.serverRunning}){server.sendMsg('/d_free',headModDefinition.name)};
        parameterGroup.tryPerform(\free);if(parameterGroup.notNil){base.instance.disown(parameterGroup)};
        // Native retirement owns asynchronous Buffer/region release. Prevent the
        // parent Tool's synchronous terminateOwned pass from freeing these twice.
        ([graph.group]++graph.nodes.asArray++graph.buffers.asArray++graph.ports.collect{|ports|ports.reject(_.isNil)}.flat).reject(_.isNil).do{|object|base.instance.disown(object)};
        if(graph.group.notNil and:{server.serverRunning}){graph.group.run(false);graph.group.moveToTail(server.defaultGroup)};
        graph.free;if(pipeDefinition.notNil and:{server.serverRunning}){server.sendMsg('/d_free',pipeDefinition.name)};pipeDefinition=nil;^this;
    }
}
