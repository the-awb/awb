// Electron attachment Tool: borrows parameters; never adopts their DSP/buses.
// ToolGUIContract belongs to Qt views, so this uses Chain/Rack's shell lifecycle.
AWParamInspector : Tool {
    var <instance,<server,<params,<closed=false,<epoch,<owner;
    var options,responder,observers,watchers,ownerHook,shellPID,revision=0,origin="";
    *register {^ToolRegistry.at(\param) ?? {ToolRegistry.register(ToolDefinition(\param,"Parameter Inspector",version:"0.1.0",interfaceKind:\native,
        capabilities:[\parameters,\observation],defaultConfig:(name:"Parameters"),multipleInstances:true,
        factory:{|instance,config,opts|AWParamInspector(instance,opts).attach},closeAction:{|instance|instance.tool.tryPerform(\close)}))}}
    *open { |param,options|^this.openMany([param],options,param.ownerInstance)}
    *openMany { |params,options,owner|
        var instance;this.register;options=(options ? ()).copy.putAll((params:params,owner:owner,gui:false,track:false));
        instance=ToolLauncher.open(\param,(name:"Parameters"),options);
        if(options[\launch] ? true){instance.tool.gui};^instance;
    }
    *new { |instance,opts|^super.new.init(instance,opts)}
    init { |i,opts|
        instance=i;options=opts ? ();owner=options[\owner];params=IdentityDictionary.new;observers=IdentityDictionary.new;watchers=Dictionary.new;
        if(options[\params].isArray.not or:{options[\params].isEmpty} or:{options[\params].size>128}){Error("Inspector needs 1..128 AWParams").throw};
        options[\params].do{|p|if(p.isKindOf(AWParam).not or:{p.closed} or:{params[p.name].notNil}){Error("Inspector needs unique live AWParams").throw};params[p.name]=p};
        server=options[\params][0].server;if(params.values.any{|p|p.server!==server}){Error("Inspector parameters must share a server").throw};
        epoch=thisProcess.pid.asString++":"++UniqueID.next;^this;
    }
    ids {^params.keys.asArray.sort}
    requireOpen {if(closed or:{owner.notNil and:{owner.status==\closed}} or:{server.serverRunning.not}){Error("Parameter binding is closed or server unavailable").throw};^this}
    attach {
        params.keysValuesDo{|id,p|var hook={|object,what,data|
            if(what==\closed){instance.close}{if([\baseTarget,\amountTarget,\modCurve,\transitionCurves,\polarity,\routes,\routeField,\writerField].includes(what)){revision=revision+1;
                this.prune;watchers.values.do{|w|
                    if([\routeField,\writerField].includes(what)){
                        w[\address].sendMsg('/awb/param/routeDelta',instance.instanceID,w[\token],epoch,revision,id.asString,data[\id].asString,
                            if(what==\writerField){"writer:"++data[\field]}{if(data[\field]==\amount){"sourceAmount"}{"sourceCurve"}},data[\value],origin)
                    }{if(what==\routes){this.sendRoutes(w[\address],w[\token],id)}{
                        if([\transitionCurves,\polarity].includes(what)){this.sendParam(w[\address],w[\token],id,"metadata")}{
                            w[\address].sendMsg('/awb/param/delta',instance.instanceID,w[\token],epoch,revision,id.asString,what.asString,
                                if(data.isKindOf(Event)){data[\value]}{data},if(data.isKindOf(Event)){data[\dur]}{0},if(data.isKindOf(Event)){data[\curve]}{0},origin)
                        }
                    }}
                }
            }}
        };observers[p]=hook;p.addDependant(hook)};
        if(owner.notNil){ownerHook={|o,what|if(o.status==\closed){instance.close}};owner.addDependant(ownerHook)};
        responder=OSCdef(("awbParamInspector"++UniqueID.next).asSymbol,{|msg,time,address|
            if(address.ip=="127.0.0.1" and:{msg.size>=5} and:{msg[1].asString==instance.instanceID}){
                var request=msg[4].asString;
                try{this.requireOpen;this.prune;
                    if(msg[2].asString=="bind"){
                        if(msg.size!=5 or:{msg[3].asString.size>64} or:{request.size>64} or:{watchers.size>=16 and:{watchers[address.port].isNil}}){Error("Invalid/full subscription").throw};
                        watchers[address.port]=(address:address,token:msg[3].asString,seen:Main.elapsedTime);this.sendState(address,msg[3].asString,request)
                    }{
                        var w=watchers[address.port];
                        if(w.isNil or:{w[\token]!=msg[3].asString} or:{msg[5].asString!=epoch}){Error("Stale parameter binding").throw};
                        switch(msg[2].asString,
                            "alive",{w[\seen]=Main.elapsedTime;address.sendMsg('/awb/param/alive',instance.instanceID,w[\token],epoch,revision)},
                            "unwatch",{watchers.removeAt(address.port)},
                            "edit",{this.edit(msg,address)},
                            {Error("Unknown parameter command").throw})
                    }
                }{|e|address.sendMsg('/awb/param/result',instance.instanceID,msg[3].asString,request,"error",e.errorString)};
            }
        },'/awb/param/control');^this;
    }
    prune {watchers.keys.copy.do{|key|if(Main.elapsedTime-watchers[key][\seen]>10){watchers.removeAt(key)}};^this}
    sendParam { |address,token,id,kind="param"|
        var p=params[id],c=p.configuration;
        address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,kind,id.asString,c[\min],c[\max],c[\warp].asString,c[\base],c[\amount],c[\modCurve],c[\baseCurve],c[\amountCurve],*(p.observationIndices++[c[\polarity].asString,c[\nativeSpec].asInteger,revision]));
    }
    sendRoutes { |address,token,id|
        var rows=params[id].routeMetadata;
        address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,"routesBegin",id.asString,revision,rows.size);
        rows.do{|r|address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,"route",id.asString,r[\id].asString,r[\kind].asString,r[\label].asString,r[\bus] ? -1,r[\producer] ? -1,r[\node] ? -1,r[\amount] ? 0,r[\curve] ? 0,r[\status].asString,r[\error] ? "",r[\editable].asInteger,(r[\controls] ? []).size);
            (r[\controls] ? []).do{|c|address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,"writerControl",id.asString,r[\id].asString,c[\id].asString,c[\min],c[\max],c[\value])}
        };
        address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,"routesEnd",id.asString,revision);
    }
    sendState { |address,token,request|
        if(server.isLocal.not or:{server.pid.isNil}){Error("Shared observation requires a locally booted server with known PID").throw};
        address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,"begin",request,server.addr.port,server.options.numControlBusChannels,server.pid,revision,params.size,(owner.tryPerform(\instanceID) ? instance.instanceID));
        this.ids.do{|id|this.sendParam(address,token,id);this.sendRoutes(address,token,id)};
        address.sendMsg('/awb/param/meta',instance.instanceID,token,epoch,"end",request,revision);
    }
    edit { |msg,address|
        var p,id,field,value,dur,curve,request=msg[4].asString;
        if(msg.size!=12 or:{request.size>64}){Error("Invalid parameter edit").throw};
        id=msg[6].asSymbol;field=msg[7].asString;value=msg[8];dur=msg[10];curve=msg[11];p=params[id];
        if(p.isNil or:{p.closed}){Error("Parameter removed").throw};origin=request;
        protect {
            switch(field,"base",{p.setBase(value,dur,curve)},"amount",{p.setAmount(value,dur,curve)},"modCurve",{p.setModCurve(value)},"polarity",{p.setPolarity(value)},
                "sourceAmount",{p.setModulationAmount(msg[9].asSymbol,value)},"sourceCurve",{p.setModulationCurve(msg[9].asSymbol,value)},
                {if(field.beginsWith("writer:")){p.setModulationWriterControl(msg[9].asSymbol,field.drop(7).asSymbol,value)}{Error("Unknown parameter field").throw}});
            address.sendMsg('/awb/param/result',instance.instanceID,msg[3].asString,request,"ok",revision);
        }{origin=""};^this;
    }
    gui { |opts|
        var root=options[\shellRoot] ? (Platform.userHomeDir+/+"awb"),command;opts=opts ? ();
        if(shellPID.notNil){^shellPID};
        command="exec /usr/bin/env -u ELECTRON_RUN_AS_NODE AWB_PARAM_SC_PORT=% AWB_PARAM_INSTANCE_ID=% % % --tool=param --profile=standalone --origin=supercollider --tool-instance=% --owner-pid=% --osc-port=0 --user-data-dir=%".format(
            NetAddr.langPort,instance.instanceID.shellQuote,(root+/+"node_modules/electron/dist/Electron.app/Contents/MacOS/Electron").shellQuote,(root+/+"apps/awb-shell/shell/main.mjs").shellQuote,
            instance.instanceID.shellQuote,thisProcess.pid,(root+/+".param-user-data"+/+(thisProcess.pid.asString++"-"++instance.instanceID)).shellQuote);
        shellPID=(opts[\processRunner] ? {|cmd|cmd.unixCmd({shellPID=nil})}).value(command);^shellPID;
    }
    close {
        if(closed){^this};closed=true;
        watchers.values.do{|w|w[\address].sendMsg('/awb/param/closed',instance.instanceID,w[\token],epoch)};watchers.clear;
        responder.tryPerform(\free);observers.keysValuesDo{|p,hook|p.removeDependant(hook)};observers.clear;
        if(ownerHook.notNil){owner.removeDependant(ownerHook)};
        if(shellPID.notNil){("kill -TERM "++shellPID.asInteger).unixCmd;shellPID=nil};^this;
    }
}
