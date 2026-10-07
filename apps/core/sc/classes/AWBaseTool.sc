// A live-set root on the existing Tool/Core lifecycle. The GUI borrows its objects.
AWBaseTool : AWBCoreTool {
    var <liveDelays,<t,<logHistory,<logSequence=0,baseResponder,baseWatchers,baseEpoch,views,liveRack;
    *register {^ToolRegistry.at(\awbBase) ?? {ToolRegistry.register(ToolDefinition(\awbBase,"AWB Live Base",version:"0.1.0",
        interfaceKind:\native,capabilities:[\liveSet,\parameters,\trackedPlayback,\ownership,\logging],defaultConfig:AWBCoreTool.defaults,
        dependencies:(nodeManager:\required),multipleInstances:true,cleanupPolicy:\terminateOwned,
        factory:{|instance,config,opts|AWBaseTool(instance,config,opts).open},closeAction:{|instance|instance.tool.tryPerform(\close)}))}}
    *open { |config,opts|this.register;opts=(opts ? ()).copy;opts[\gui]=false;opts[\track]=opts[\track] ? true;^ToolLauncher.open(\awbBase,config,opts) }
    init { |instance,config,opts|super.init(instance,config,opts);t=IdentityDictionary.new;logHistory=List.new;baseWatchers=Dictionary.new;views=IdentitySet.new;baseEpoch=thisProcess.pid.asString++":"++UniqueID.next;^this}
    open {
        super.open;
        baseResponder=OSCdef(("awbBaseConsole"++UniqueID.next).asSymbol,{|msg,time,address|
            if(address.ip=="127.0.0.1" and:{msg.size>=5} and:{msg[1].asString==this.instance.instanceID}){
                var token=msg[3].asString,request=msg[4].asString,w;
                try{
                    this.requireAlive;this.pruneLogWatchers;
                    if(token.size>64 or:{request.size>64}){Error("Invalid console subscription").throw};
                    if(msg[2].asString=="bind"){
                        if(baseWatchers.size>=16 and:{baseWatchers[address.port].isNil}){Error("Console subscriptions full").throw};
                        baseWatchers[address.port]=(address:address,token:token,seen:Main.elapsedTime);this.sendConsoleState(address,token,request)
                    }{
                        w=baseWatchers[address.port];if(w.isNil or:{w[\token]!=token} or:{msg[5].asString!=baseEpoch}){Error("Stale console subscription").throw};
                        switch(msg[2].asString,"alive",{w[\seen]=Main.elapsedTime;address.sendMsg('/awb/base/alive',this.instance.instanceID,token,baseEpoch)},
                            "unwatch",{baseWatchers.removeAt(address.port)},{Error("Unknown console command").throw})
                    }
                }{|error|address.sendMsg('/awb/base/error',this.instance.instanceID,token,request,error.errorString)};
            }
        },'/awb/base/control');^this;
    }
    track { |id|this.requireAlive;id=this.id(id);^t[id] ?? {t[id]=AWTrackControls(id);t[id]} }
    log { |message,level=\info|
        var entry;this.requireAlive;if([\info,\warn,\error].includes(level).not){Error("Log level must be info, warn or error").throw};
        logSequence=logSequence+1;entry=(seq:logSequence,time:Main.elapsedTime,level:level,text:message.asString.keep(2048));logHistory.add(entry);
        if(logHistory.size>500){logHistory.removeAt(0)};this.pruneLogWatchers;
        baseWatchers.values.do{|w|this.sendLog(w[\address],w[\token],entry)};this.changed(\log,entry);^entry;
    }
    pruneLogWatchers {baseWatchers.keys.copy.do{|key|if(Main.elapsedTime-baseWatchers[key][\seen]>10){baseWatchers.removeAt(key)}};^this}
    sendLog { |address,token,entry|address.sendMsg('/awb/base/log',this.instance.instanceID,token,baseEpoch,entry[\seq],entry[\time],entry[\level].asString,entry[\text]);^this}
    sendConsoleState { |address,token,request|
        address.sendMsg('/awb/base/begin',this.instance.instanceID,token,baseEpoch,request,logSequence);
        t.keys.asArray.sort.do{|trackID|t[trackID].metadata.keys.asArray.sort.do{|id|
            var row=t[trackID].metadata[id],m=row[\midi];
            address.sendMsg('/awb/base/mapping',this.instance.instanceID,token,baseEpoch,trackID.asString,id.asString,row[\label],m[\channel] ? -1,m[\cc] ? -1,m[\lo] ? 0,m[\hi] ? 127,(m[\pickup] ? true).asInteger,row[\status].asString)
        }};
        logHistory.do{|entry|this.sendLog(address,token,entry)};
        address.sendMsg('/awb/base/end',this.instance.instanceID,token,baseEpoch,request);^this;
    }
    // These persistent resources are containers, not playing streams. Object's
    // default isPlaying=false must not let NodeManager discard their ownership.
    // Closing the base runs cleanup; closing a view does not.
    adopt { |id,object,cleanup|this.ownResource(id,object,cleanup);this.instance.own(object,\container,(name:id.asString,lifetime:\explicit));^object }
    bindFirstPass { |set,own=false|
        var result=\AWBLiveMappings.asClass.perform(\bindFirstPass,this,set);
        liveRack=set.rack;
        if(own){this.adopt(\firstPassSet,set,{|object|object.close})};^result;
    }
    bindDelays { |plan,configuration,action|
        var delayClass=\AWBDelayRack.asClass;
        if(delayClass.isNil){Error("Load the live-set delay classes before binding delays").throw};
        if(liveDelays.notNil){Error("Delays already attached").throw};if(liveRack.isNil){Error("Bind the set before delays").throw};
        liveDelays=delayClass.perform(\open,this,liveRack,plan,configuration,{|result,error|
            if(error.isNil){this.adopt(\delays,result,{|object|object.close})}{liveDelays=nil};action.value(result,error);
        });^liveDelays;
    }
    namedParameters {
        var result=IdentityDictionary.new;
        t.keys.asArray.sort.do{|trackID|var track=t[trackID];track.p.keys.asArray.sort.do{|id|var p=track.p[id];if(p.closed.not and:{result.values.includes(p).not}){result[(trackID.asString++"/"++id).asSymbol]=p}}};
        ^result;
    }
    gui { |opts|
        var view,params=this.namedParameters,options=(opts ? ()).copy,launch=(opts ? ())[\launch] ? true;
        if(params.isEmpty){Error("Register track/FX AWParams before opening the live surface").throw};
        if(liveDelays.notNil and:{liveDelays.ready}){options[\delayBinding]=true};
        options.putAll((launch:false,guiTool:"live-set",baseInstanceID:this.instance.instanceID));
        if(liveRack.notNil){options[\rackBinding]=(instanceID:liveRack.instance.instanceID,libraryID:liveRack.config[\libraryID])};
        view=AWParamInspector.openNamed(params,options,this.instance);views.add(view);view.addDependant({|object,what|if(what==\closed){views.remove(object)}});
        if(launch){view.tool.gui(options)};^view;
    }
    close {
        if(this.closed){^this};liveDelays.tryPerform(\close);views.copy.do(_.close);views.clear;
        baseWatchers.values.do{|w|w[\address].sendMsg('/awb/base/closed',this.instance.instanceID,w[\token],baseEpoch)};baseWatchers.clear;baseResponder.tryPerform(\free);
        t.values.do(_.free);t.clear;super.close;^this;
    }
}
