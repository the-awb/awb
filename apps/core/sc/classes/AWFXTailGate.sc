// Owns a pauseable processor Group and always-running ingress/return guards.
// Borrowed input, mix and optional return-level buses are never freed here.
AWFXTailGate {
    classvar ingressDefs,returnDefs;
    var <server,<group,<processorGroup,<ingress,<returnNode,<inputBus,<outputBus,<stateBus,<measurementBus,<closed=false;
    var options,settings,ownedNodes,hook,quitHook;
    *initClass { ingressDefs=Dictionary.new;returnDefs=Dictionary.new }
    *settings { |given|
        var s=(minTail:0.1,maxTail:0,quietDb: -90,quietHold:0.25,fade:0.02,enabled:true).putAll(given ? ());
        [\minTail,\maxTail,\quietDb,\quietHold,\fade].do{|key|AWParam.finite(s[key],key.asString)};
        if(s[\minTail]<0 or:{s[\minTail]>3600} or:{s[\maxTail]<0} or:{s[\maxTail]>3600}
            or:{s[\maxTail]>0 and:{s[\maxTail]<s[\minTail]}}
            or:{s[\quietDb]< -140} or:{s[\quietDb]> -20}
            or:{s[\quietHold]<0.005} or:{s[\quietHold]>10}
            or:{s[\fade]<0.001} or:{s[\fade]>1} or:{[true,false].includes(s[\enabled]).not}){
            Error("AWFXTailGate: invalid tail/quiet/fade settings").throw;
        };^s;
    }
    *signals { |mix,measured,minTail,maxTail,quietDb,quietHold,fade,enabled|
        var active=mix>0,everActive=SetResetFF.kr(active,0),inactive=1-active;
        var smoothed=Lag.kr(mix.clip(0,1),fade),faded=smoothed<=1e-5;
        var age=Sweep.kr(inactive,1)*inactive;
        var quiet=(measured<=quietDb.dbamp)*inactive*faded;
        var quietAge=Sweep.kr(quiet,1)*quiet;
        var expired=(age>=minTail)*(quietAge>=quietHold)*quiet;
        var capped=(maxTail>0)*(age>=maxTail)*inactive;
        var wanted=1-((1-everActive).max(expired).max(capped)*enabled).clip(0,1);
        var returnGain=LagUD.kr(wanted,fade,fade);
        var running=wanted.max(returnGain>1e-5);
        ^[Select.kr(faded,[smoothed,0]),returnGain,running,active,age];
    }
    *ingressDef { |width=2|
        var def;if(width.isInteger.not or:{width<1} or:{width>8}){Error("AWFXTailGate: width must be 1..8").throw};
        def=ingressDefs[width];if(def.notNil){^def};
        def=SynthDef(("awFXTailIngress_"++width).asSymbol,{|in=0,out=0,mixBus=0,stateBus=0,measurementBus=0,processorID=0,
            gain=1,volumeScale=2,volumeExponent=3,minTail=0.1,maxTail=0,quietDb= -90,quietHold=0.25,fade=0.02,enabled=1|
            var mix=In.kr(mixBus),measured=In.kr(measurementBus);
            var state=AWFXTailGate.signals(mix,measured,minTail,maxTail,quietDb,quietHold,fade,enabled);
            // The guard executes before the Group: resume precedes new input.
            Pause.kr(state[2],processorID);
            ReplaceOut.kr(stateBus,state.copyRange(1,4));
            Out.ar(out,In.ar(in,width)*(state[0]*volumeScale).pow(volumeExponent)*gain);
        });ingressDefs[width]=def;^def;
    }
    *returnDef { |width=2|
        var def;this.ingressDef(width);def=returnDefs[width];if(def.notNil){^def};
        def=SynthDef(("awFXTailReturn_"++width).asSymbol,{|in=0,out=0,stateBus=0,measurementBus=0,wetGain=1,level=1|
            var signal=In.ar(in,width)*wetGain,gate=In.kr(stateBus);
            // Always executes, including when the processor Group is paused.
            ReplaceOut.kr(measurementBus,Amplitude.kr(signal.abs.reduce(\max),0.005,0.02));
            Out.ar(out,signal*gate*level);
        });returnDefs[width]=def;^def;
    }
    *prepare { |server,width=2|[this.ingressDef(width),this.returnDef(width)].do{|def|SynthDescLib.global.add(def.asSynthDesc);def.send(server ? Server.default)};^this }
    *new { |source,mix,destination,target,tailSettings,options|^super.new.init(source,mix,destination,target,tailSettings,options) }
    init { |source,mix,destination,target,tailSettings,opts|
        var width,defs,args,levelBus;options=(opts ? ()).copy;settings=this.class.settings(tailSettings);ownedNodes=List.new;
        server=source.tryPerform(\server);width=source.tryPerform(\numChannels);
        if(source.isKindOf(Bus).not or:{server.isNil} or:{source.rate!=\audio} or:{source.index.isNil}
            or:{destination.isKindOf(Bus).not} or:{destination.server!==server} or:{destination.rate!=\audio} or:{destination.index.isNil} or:{destination.numChannels!=width}
            or:{mix.isKindOf(Bus).not} or:{mix.server!==server} or:{mix.rate!=\control} or:{mix.numChannels!=1} or:{mix.index.isNil}
            or:{target.isKindOf(Group).not} or:{target.server!==server}){Error("AWFXTailGate: need matching audio buses, mono KR mix and parent Group").throw};
        levelBus=options[\levelBus];if(levelBus.notNil and:{levelBus.isKindOf(Bus).not or:{levelBus.server!==server} or:{levelBus.rate!=\control} or:{levelBus.numChannels!=1} or:{levelBus.index.isNil}}){Error("AWFXTailGate: invalid borrowed return level bus").throw};
        [\gain,\wetGain,\volumeScale,\volumeExponent].do{|key|var value=options[key] ? if(key==\volumeScale){2}{if(key==\volumeExponent){3}{1}};AWParam.finite(value,key.asString);if(value<0 or:{value>64} or:{key==\volumeExponent and:{value<=0}}){Error("AWFXTailGate: invalid gain/taper").throw}};
        if(options[\sendFunction].isNil and:{server.serverRunning.not}){Error("AWFXTailGate: boot and prepare before creating").throw};
        defs=[this.class.ingressDef(width),this.class.returnDef(width)];
        try {
            defs.do{|def|SynthDescLib.global.add(def.asSynthDesc);if(options[\sendFunction].notNil){this.dispatch([\d_recv,def.asBytes])}};
            inputBus=Bus.audio(server,width);outputBus=Bus.audio(server,width);stateBus=Bus.control(server,4);measurementBus=Bus.control(server,1);
            if([inputBus,outputBus,stateBus,measurementBus].any{|b|b.index.isNil}){Error("AWFXTailGate: bus allocation exhausted").throw};
            group=Group.basicNew(server);processorGroup=Group.basicNew(server);
            this.dispatch(group.newMsg(target,\addToTail));this.own(group,\container);
            this.dispatch(processorGroup.newMsg(group,\addToTail));this.own(processorGroup,\container);
            ingress=Synth.basicNew(defs[0].name,server);returnNode=Synth.basicNew(defs[1].name,server);
            this.dispatch([\c_set,measurementBus.index,0,stateBus.index,0,stateBus.index+1,1,stateBus.index+2,0,stateBus.index+3,0]);
            args=[\in,source.index,\out,inputBus.index,\mixBus,mix.index,\stateBus,stateBus.index,\measurementBus,measurementBus.index,\processorID,processorGroup.nodeID,
                \gain,options[\gain] ? 1,\volumeScale,options[\volumeScale] ? 2,\volumeExponent,options[\volumeExponent] ? 3];
            settings.keysValuesDo{|key,value|args=args++[key,if(value.isKindOf(Boolean)){value.asInteger}{value}]};
            this.dispatch(ingress.newMsg(processorGroup,args,\addBefore));this.own(ingress);
            this.dispatch(returnNode.newMsg(processorGroup,[\in,outputBus.index,\out,destination.index,\stateBus,stateBus.index,\measurementBus,measurementBus.index,\wetGain,options[\wetGain] ? 1],\addAfter));this.own(returnNode);
            if(levelBus.notNil){this.dispatch(returnNode.mapMsg(\level,levelBus.index))};
            quitHook={this.free(false)};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].isNil){hook={|node,what|if(what==\n_end){this.free(false)}};group.register;group.addDependant(hook)};
        }{|error|this.free;error.throw};^this;
    }
    own { |node,type=\synth|ownedNodes.add(node);options[\ownFunction].value(node,type,(name:options[\name] ? "FX tail gate",parent:node.group,defName:node.tryPerform(\defName)));^node }
    dispatch { |msg|if(options[\sendFunction].notNil){options[\sendFunction].value(msg)}{server.sendMsg(*msg)};^this }
    createProcessor { |defName,args|
        var node;if(closed){Error("AWFXTailGate is closed").throw};args=args ? [];
        if(args.isArray.not or:{args.size.odd} or:{args.clump(2).any{|pair|[\in,\out].includes(pair[0].asSymbol)}}){
            Error("AWFXTailGate: processor args must be pairs and cannot override in/out pipes").throw;
        };
        node=Synth.basicNew(defName,server);
        this.dispatch(node.newMsg(processorGroup,[\in,inputBus.index,\out,outputBus.index]++args,\addToTail));^this.own(node);
    }
    configuration {^settings.copy}
    free { |send=true|
        var buses;if(closed){^this};closed=true;ServerQuit.remove(quitHook,server);
        if(hook.notNil){group.removeDependant(hook);group.unregister};
        if(send and:{group.notNil}){this.dispatch(group.freeMsg)};
        ownedNodes.do{|node|options[\disownFunction].value(node)};ownedNodes.clear;
        buses=[inputBus,outputBus,stateBus,measurementBus].reject(_.isNil);
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){buses.do{|bus|if(bus.index.notNil){bus.free}}}
        {Routine({server.sync;buses.do{|bus|if(bus.index.notNil){bus.free}}}).play(SystemClock)};^this;
    }
}
