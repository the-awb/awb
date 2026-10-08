AWBSendRackTool : Tool {
    var <instance, <server, <config, <channels, <slots, <slotIDs, <fxIDs, <followerIDs;
    var <rootGroup, <sourceGroup, channelGroup, fxGroup, detectorGroup, followerGroup, <masterGroup, <masterBus;
    var <ready=false, <closed=false, prefix, definitions, sources, variants, processors;
    var ownedNodes, ownedBuses, options, responder, shellPID, closePending=false, publishPending=false, quitHook, <revision=0;
    var watchers, feedbackValues, metadataPending=false, publishedRevision=0, commandSource;

    *initClass {
        Event.addEventType(\awbSendVoice, {
            ~rack.playVoice(~voiceID, ~mix ? (), ~args ? [], ~destinations, ~busOverrides, ~releaseAfter);
        });
    }
    *defaults {
        ^(name:"SC send rack",libraryID:"sc-rack",width:2,out:0,maxGain:4,masterLimit:true,
          channels:[(id:\in0,label:"IN 0"),(id:\in1,label:"IN 1")],
          fixedFX:[\splut,\spark,\deci,\fuzz,\verb,\mast],dynamicFX:3,
          fixedFollowers:[\env1,\env2],spareFollowers:3,cleanSlot:\mast,
          fade:0.02,tail:6,maxRetiring:2,maxVariants:64,
          shellRoot:Platform.userHomeDir +/+ "awb");
    }
    *register {
        var existing=ToolRegistry.at(\sendRack);
        if(existing.notNil){^existing};
        ^ToolRegistry.register(ToolDefinition(\sendRack,"SC Send Rack",version:"0.1.0",
            interfaceKind:\native,capabilities:[\routing,\mixPresets,\directVoices,\followers],
            defaultConfig:this.defaults,emissionTypes:[\routingChanged,\processorChanged,\voiceStarted],
            dependencies:(nodeManager:\required,application:\rack),multipleInstances:true,
            cleanupPolicy:\terminateOwned,
            factory:{|session,configuration,opts|AWBSendRackTool(session,configuration,opts).open},
            closeAction:{|session|session.interfaceObject.tryPerform(\close)}));
    }
    *open { |configuration, opts|
        this.register;
        opts=(opts ? ()).copy;
        opts[\track]=opts[\track] ? true;opts[\gui]=false;
        ^ToolLauncher.open(\sendRack,configuration,opts);
    }
    *new { |anInstance, configuration, opts| ^super.new.init(anInstance,configuration,opts) }
    init { |anInstance, configuration, opts|
        instance=anInstance;config=configuration.deepCopy;options=opts ? ();
        server=options[\server] ? Server.default;
        this.validateConfig;
        prefix=("awbRack" ++ UniqueID.next).asSymbol;
        definitions=IdentityDictionary.new;sources=IdentityDictionary.new;variants=Dictionary.new;
        channels=IdentityDictionary.new;slots=IdentityDictionary.new;processors=IdentityDictionary.new;
        ownedNodes=IdentitySet.new;ownedBuses=List.new;
        watchers=Dictionary.new;feedbackValues=Dictionary.new;
        ^this;
    }
    definition { ^this.class.register }
    validateConfig {
        var ids=List.new,total,fxCount;
        if([1,2].includes(config[\width]).not){Error("Rack width must be 1 or 2; conversion is explicit").throw};
        [\dynamicFX,\spareFollowers].do{|key|
            var n=config[key];
            if(n.isKindOf(Integer).not or:{n<0} or:{n>32}){Error("Invalid reserved slot capacity").throw};
        };
        if(config[\channels].isArray.not or:{config[\channels].isEmpty} or:{config[\channels].size>64}){Error("Rack needs 1-64 channels").throw};
        config[\channels].do{|item|ids.add(this.itemID(item))};
        if(ids.as(Set).size!=ids.size){Error("Channel IDs must be unique").throw};
        [\fixedFX,\fixedFollowers].do{|key|
            if(config[key].isArray.not or:{config[key].size>64}){Error("Invalid fixed slot list").throw};
            config[key].do{|item|this.itemID(item)};
        };
        fxCount=config[\fixedFX].size+config[\dynamicFX];
        total=fxCount+config[\fixedFollowers].size+config[\spareFollowers];
        if(total<1 or:{total>64} or:{(config[\channels].size*(total+3))+fxCount>4096} or:{fxCount+config[\channels].size>96}){Error("Rack topology exceeds Shell control capacity").throw};
        [\fade,\tail].do{|key|if(config[key].isNumber.not or:{config[key].isNaN} or:{config[key]<0} or:{config[key]>60}){Error("Invalid fade/tail time").throw}};
        if(config[\maxRetiring].isKindOf(Integer).not or:{config[\maxRetiring]<0} or:{config[\maxRetiring]>8}){Error("Invalid retiring-generation budget").throw};
        if(config[\maxVariants].isKindOf(Integer).not or:{config[\maxVariants]<1} or:{config[\maxVariants]>256}){Error("Invalid wrapper cache budget").throw};
        if(config[\out].isKindOf(Integer).not or:{config[\out]<0} or:{config[\out]+config[\width]>server.options.numOutputBusChannels}){Error("Output exceeds configured hardware output width").throw};
        this.itemID(config[\libraryID]);
        ids=config[\fixedFX].collect{|item|this.itemID(item)}++Array.fill(config[\dynamicFX],{|i|("fx"++(i+1)).asSymbol})
            ++config[\fixedFollowers].collect{|item|this.itemID(item)}++Array.fill(config[\spareFollowers],{|i|("follow"++(i+1)).asSymbol});
        if(ids.as(Set).size!=ids.size){Error("Destination IDs must be unique, including reserved slots").throw};
        // An optional channel borrows a post-processor FX tap. One return row per slot.
        ids=List.new;
        config[\channels].do{|item|
            var source=if(item.isKindOf(Dictionary)){item[\returnOf]}{nil};
            if(source.notNil){
                source=source.asSymbol;
                if((config[\fixedFX].collect{|fx|this.itemID(fx)}++Array.fill(config[\dynamicFX],{|i|("fx"++(i+1)).asSymbol})).includes(source).not
                    or:{ids.includes(source)}){Error("Return channel needs a unique FX destination").throw};
                ids.add(source);
            };
        };

        if(config[\cleanSlot].notNil and:{config[\cleanSlot]!=false} and:{config[\fixedFX].collect{|item|this.itemID(item)}.includes(config[\cleanSlot].asSymbol).not}){Error("Clean slot must name a fixed FX destination").throw};
        if(config[\name].isString.not or:{config[\name].size>120}){Error("Invalid rack name").throw};
        AWBSendRackVoice.gain(config[\maxGain]);
        if(config[\maxGain]<=0){Error("Rack maximum gain must be positive").throw};
        ^this;
    }
    itemID { |item|
        var id=if(item.isKindOf(Dictionary)){item[\id]}{item};
        if(id.isNil or:{"^[a-z0-9][a-z0-9_-]{0,63}$".matchRegexp(id.asString).not}){Error("Invalid rack ID").throw};
        ^id.asSymbol;
    }
    itemLabel { |item| ^if(item.isKindOf(Dictionary)){item[\label] ? this.itemID(item).asString}{item.asString} }
    bus { |rate=\audio,width|
        var b=Bus.alloc(rate,server,width ? config[\width]);
        if(b.isNil){Error("Rack bus allocation exhausted").throw};
        ownedBuses.add(b);^b;
    }
    dispatch { |msg|
        if(options[\sendFunction].notNil){options[\sendFunction].value(msg)}{server.sendMsg(*msg)};
        ^msg;
    }
    dispatchBundle { |messages|
        if(options[\sendFunction].notNil){messages.do{|msg|this.dispatch(msg)}}{server.sendBundle(nil,*messages)};
        ^this;
    }
    schedule { |delay, action|
        if(options[\scheduleFunction].notNil){options[\scheduleFunction].value(delay,action)}{
            SystemClock.sched(delay,{action.value;nil});
        };
    }
    own { |node,type=\synth,metadata|
        ownedNodes.add(node);instance.own(node,type,metadata ? ());
        if(options[\watchNodes] ? options[\sendFunction].isNil){node.onFree({
            ownedNodes.remove(node);instance.disown(node);
            if(node===rootGroup and:{closed.not}){rootGroup=nil;instance.close};
        })};
        ^node;
    }
    group { |target,label|
        var group=Group.basicNew(server);
        this.dispatch(group.newMsg(target,\addToTail));
        ^this.own(group,\container,(name:label,parent:target));
    }
    synth { |name,args,target,label|
        var node=Synth.basicNew(name,server);
        this.dispatch(node.newMsg(target,args,\addToTail));
        ^this.own(node,\synth,(name:label,defName:name,synthDefName:name,args:args.copy,parent:target));
    }
    installDef { |key,def|
        definitions[key]=def;SynthDescLib.global.add(def.asSynthDesc);
        this.dispatch([\d_recv,def.asBytes]);^def;
    }
    addSlot { |id,label,kind,fixed|
        if(slots.includesKey(id)){Error("Duplicate destination ID").throw};
        slots[id]=(id:id,label:label,kind:kind,fixed:fixed,bus:this.bus,
            controlBus:if(kind==\follower){this.bus(\control,1)}{nil},
            measurementBus:if(kind==\follower){this.bus(\control,1)}{nil},detector:nil,controlEnabled:true,
            consumers:IdentityDictionary.new,level:1.0,
            active:nil,retiring:List.new);
        slotIDs=slotIDs.add(id);
    }
    open {
        var channelIDs;
        if(options[\sendFunction].isNil and:{server.serverRunning.not}){Error("Boot the selected server before opening an SC rack").throw};
        try {
            slotIDs=[];
            config[\fixedFX].do{|item|this.addSlot(this.itemID(item),this.itemLabel(item),\fx,true)};
            config[\dynamicFX].do{|i|this.addSlot(("fx"++(i+1)).asSymbol,"FX "++(i+1),\fx,false)};
            config[\fixedFollowers].do{|item|this.addSlot(this.itemID(item),this.itemLabel(item),\follower,true)};
            config[\spareFollowers].do{|i|this.addSlot(("follow"++(i+1)).asSymbol,"FOLLOW "++(i+1),\follower,false)};
            if(slotIDs.isEmpty or:{slotIDs.size>64}){Error("Rack needs 1-64 total destinations").throw};
            fxIDs=slotIDs.select{|id|slots[id][\kind]==\fx};
            followerIDs=slotIDs.select{|id|slots[id][\kind]==\follower};
            masterBus=this.bus;
            config[\channels].do{|item|
                var id=this.itemID(item);
                channels[id]=(id:id,label:this.itemLabel(item),input:this.bus,post:this.bus,
                    level:1.0,mute:false,solo:false,gains:Array.fill(slotIDs.size,0.0),
                    returnOf:if(item.isKindOf(Dictionary)){if(item[\returnOf].notNil){item[\returnOf].asSymbol}{nil}}{nil});
                if(channels[id][\returnOf].notNil){slots[channels[id][\returnOf]][\returnChannel]=id};
            };
            this.makeSupportDefs;
            processors[\pass]={|ctx|ctx[\synth].value(definitions[\pass].name,[\in,ctx[\input].index,\out,ctx[\output].index])};
            if(options[\sendFunction].notNil){this.makeGraph}{
                Routine({
                    server.sync;
                    if(closed.not){try{this.makeGraph}{|error|instance.close;error.reportError}};
                }).play(SystemClock);
            };
            this.attachOSC;
            quitHook={if(closed.not){instance.close}};ServerQuit.add(quitHook,server);
        }{|error|this.close;error.throw};
        ^this;
    }
    makeSupportDefs {
        var width=config[\width],size=slotIDs.size,detectorClass,def;
        [false,true].do{|feedback|
        this.installDef(if(feedback){\returnChannel}{\channel},SynthDef((prefix++if(feedback){"ReturnChannel"}{"Channel"}).asSymbol,{|in=0,post=0,level=1,enabled=1,fade=0.02|
            // Return taps are written later in FX: every extra send has exactly one block delay.
            var signal=if(feedback){InFeedback.ar(in,width)}{In.ar(in,width)}*Lag.kr(level*enabled,fade);
            var buses=NamedControl.ir(\sendBuses,Array.fill(size,0)).asArray;
            var gains=NamedControl.kr(\sendGains,Array.fill(size,0.0)).asArray;
            ReplaceOut.ar(post,signal);
            size.do{|i|Out.ar(buses[i],signal*Lag.kr(gains[i],fade))};
        }));
        };
        this.installDef(\ingress,SynthDef((prefix++"Ingress").asSymbol,{|in=0,out=0,gate=1,fade=0.02|
            // Start at zero: fade a newly installed processor in without a hard onset.
            var gain=Lag.kr(gate,fade)*EnvGen.kr(Env([0,1],[fade]));
            Out.ar(out,In.ar(in,width)*gain);
        }));
        this.installDef(\pass,SynthDef((prefix++"Pass").asSymbol,{|in=0,out=0|Out.ar(out,In.ar(in,width))}));
        [false,true].do{|limit|[false,true].do{|tapped|
            var key=if(limit){"returnLimited"}{"return"}++if(tapped){"Tapped"}{""};
            this.installDef(key.asSymbol,SynthDef((prefix++key).asSymbol,{|in=0,out=0,tap=0,level=1,fade=0.02,ceiling=0.99|
                var signal=In.ar(in,width)*Lag.kr(level,fade);
                if(limit){signal=Limiter.ar(signal,ceiling,0.01)};
                Out.ar(out,signal);
                if(tapped){Out.ar(tap,signal)};
            }));
        }};
        this.installDef(\master,SynthDef((prefix++"Master").asSymbol,{|in=0,out=0,level=1|
            var sig=In.ar(in,width)*level;if(config[\masterLimit] ? true){sig=Limiter.ar(sig,0.99,0.01)};Out.ar(out,sig)
        }));
        // Match AWFollower's krFollower, including its linear/sqrt blend.
        // This optional path requires the existing EnvDetect3 plugin.
        if(\EnvDetect3.asClass.notNil){
            detectorClass=\EnvDetect3.asClass;
            def=SynthDef((prefix++"ControlFollower").asSymbol,{|in=0,out=0,attack=0.2,release=0.4,scale=1,blend=0.66|
                var signal=detectorClass.kr(In.kr(in,1)*scale,attack,release);
                ReplaceOut.kr(out,(blend*signal)+((1-blend)*signal.sqrt));
            });
            this.installDef(\controlFollower,def);
        };
        // A control send receives mixed audio. Keep the short detector separate
        // from the musical envelope; never measure individual voices here.
        this.installDef(\measurement,SynthDef((prefix++"Measurement").asSymbol,{|in=0,out=0,rise=0.00562,fall=0.0234,gainDb=14.4,amount=1|
            var signal=Mix(In.ar(in,width).abs)/width;
            ReplaceOut.kr(out,Amplitude.kr(signal*gainDb.dbamp,rise,fall)*amount);
        }));
        this.installDef(\follower,SynthDef((prefix++"Follower").asSymbol,{|in=0,out=0,attack=0.01,release=0.1,scale=1,blend=1,curve=1,floorDb = -60,amount=1|
            var amplitude=Amplitude.kr(Mix(In.ar(in,width).abs)/width,attack,release)*amount*scale;
            var linear=amplitude.clip(0,1);
            var logCurve=amplitude.max(1e-12).ampdb.clip(floorDb,-0.00001).linlin(floorDb,0,0,1);
            var shaped=Select.kr(curve,[linear,logCurve,linear.sqrt]);
            ReplaceOut.kr(out,linear.blend(shaped,blend).clip(0,1));
        }));
    }
    makeGraph {
        if(closed){^this};
        rootGroup=this.group(server.defaultGroup,"Send rack");
        sourceGroup=this.group(rootGroup,"Voices");
        channelGroup=this.group(rootGroup,"Channels");
        fxGroup=this.group(rootGroup,"FX");
        detectorGroup=this.group(rootGroup,"Control send detectors");
        followerGroup=this.group(rootGroup,"Followers");
        masterGroup=this.group(rootGroup,"Master");
        fxIDs.do{|id|slots[id][\group]=this.group(fxGroup,"Slot "++id)};
        followerIDs.do{|id|slots[id][\group]=this.group(followerGroup,"Slot "++id)};
        channels.values.do{|channel|
            channel[\node]=this.synth(definitions[if(channel[\returnOf].notNil){\returnChannel}{\channel}].name,[\in,channel[\input].index,\post,channel[\post].index,
                \sendBuses,slotIDs.collect{|id|slots[id][\bus].index},\sendGains,channel[\gains],\fade,config[\fade]],channelGroup,channel[\label]);
        };
        this.synth(definitions[\master].name,[\in,masterBus.index,\out,config[\out]],masterGroup,"Master output");
        followerIDs.do{|id|
            this.dispatch(slots[id][\controlBus].setMsg(0));
            this.dispatch(slots[id][\measurementBus].setMsg(0));
        };
        ready=true;
        if(config[\cleanSlot].notNil and:{config[\cleanSlot]!=false}){this.setFX(config[\cleanSlot],\pass,(limiter:false,fade:config[\fade]))};
        this.publish;
        ^this;
    }
    requireOpen { if(closed or:{ready.not}){Error("Rack is closed or not ready").throw};^this }
    channelAt { |id|var item=channels[id.asSymbol];if(item.isNil){Error("Unknown channel").throw};^item }
    slotAt { |id|var item=slots[id.asSymbol];if(item.isNil){Error("Unknown destination").throw};^item }
    inputFor { |id|this.requireOpen;^this.channelAt(id)[\input] }
    postFor { |id|this.requireOpen;^this.channelAt(id)[\post] }
    destinationFor { |id|this.requireOpen;^this.slotAt(id)[\bus] }
    controlFor { |id|var slot=this.slotAt(id);this.requireOpen;if(slot[\kind]!=\follower){Error("Not a follower slot").throw};^slot[\controlBus] }
    measurementFor { |id|
        var slot=this.slotAt(id);this.requireOpen;
        if(slot[\kind]!=\follower){Error("Not a control send").throw};^slot[\measurementBus];
    }
    setDetector { |id,settings|
        var slot=this.slotAt(id),current,args;
        this.requireOpen;if(slot[\kind]!=\follower){Error("Not a control send").throw};
        current=(mode:\peak,rise:0.00562,fall:0.0234,gainDb:14.4);
        if(slot[\detector].notNil){current.putAll(slot[\detector][\settings])};
        settings=settings ? ();
        if(settings.keys.any{|key|[\mode,\rise,\fall,\gainDb].includes(key).not}){Error("Unknown detector setting").throw};
        current.putAll(settings);
        if(current[\mode]!=\peak){Error("Only Peak detector mode is implemented").throw};
        [\rise,\fall].do{|key|
            var value=current[key];
            if(value.isNumber.not or:{value.isNaN} or:{value<0} or:{value>1}){Error("Detector time must be finite, 0-1 seconds").throw};
        };
        if(current[\gainDb].isNumber.not or:{current[\gainDb].isNaN} or:{current[\gainDb]< -60} or:{current[\gainDb]>60}){Error("Detector gain must be finite, -60 to 60 dB").throw};
        args=[\rise,current[\rise],\fall,current[\fall],\gainDb,current[\gainDb]];
        if(slot[\detector].isNil){
            slot[\detector]=(node:this.synth(definitions[\measurement].name,
                [\in,slot[\bus].index,\out,slot[\measurementBus].index,\amount,slot[\level]]++args,detectorGroup,"Detector "++id),settings:current);
        }{
            this.dispatch(slot[\detector][\node].setMsg(*args));slot[\detector][\settings]=current;
        };
        if(slot[\controlEnabled].not){this.dispatch(slot[\detector][\node].runMsg(false))};
        this.publish;^slot[\detector];
    }
    clearDetector { |id|
        var slot=this.slotAt(id),detector=slot[\detector];
        this.measurementFor(id);
        if(detector.notNil){this.removeControlNode(detector[\node])};
        slot[\detector]=nil;this.dispatch(slot[\measurementBus].setMsg(0));this.publish;^this;
    }
    setControlSendEnabled { |id,enabled|
        var slot=this.slotAt(id);this.measurementFor(id);
        if(enabled.isKindOf(Boolean).not){Error("Control send enabled must be a Boolean").throw};
        slot[\controlEnabled]=enabled;
        if(slot[\detector].notNil){this.dispatch(slot[\detector][\node].runMsg(enabled))};
        this.dispatch(slot[\group].runMsg(enabled));
        if(enabled.not){
            this.dispatch(slot[\measurementBus].setMsg(0));this.dispatch(slot[\controlBus].setMsg(0));
            slot[\consumers].values.do{|consumer|this.dispatch(consumer[\bus].setMsg(0))};
        };
        this.publish;^this;
    }
    removeControlNode { |node|
        this.dispatch(node.freeMsg);instance.disown(node);ownedNodes.remove(node);^this;
    }
    setControlFollower { |sendID,id,settings|
        var slot=this.slotAt(sendID),current,consumer,args;
        this.measurementFor(sendID);id=this.itemID(id);settings=settings ? ();
        consumer=slot[\consumers][id];
        current=(attack:0.2,release:0.4,scale:1,blend:0.66);
        if(consumer.notNil){current.putAll(consumer[\settings])};
        if(settings.keys.any{|key|[\attack,\release,\scale,\blend].includes(key).not}){Error("Unknown control follower setting").throw};
        current.putAll(settings);
        [\attack,\release].do{|key|
            var value=current[key];
            if(value.isNumber.not or:{value.isNaN} or:{value<0} or:{value>60}){Error("Follower time must be finite, 0-60 seconds").throw};
        };
        if(current[\scale].isNumber.not or:{current[\scale].isNaN} or:{current[\scale]<0} or:{current[\scale]>64}){Error("Follower scale must be finite, 0-64").throw};
        if(current[\blend].isNumber.not or:{current[\blend].isNaN} or:{current[\blend]<0} or:{current[\blend]>1}){Error("Follower blend must be finite, 0-1").throw};
        if(consumer.isNil and:{slot[\consumers].size>=32}){Error("Control send follower capacity exceeded").throw};
        if(definitions[\controlFollower].isNil){Error("Control followers require the EnvDetect3 class and server plugin").throw};
        args=[\attack,current[\attack],\release,current[\release],\scale,current[\scale],\blend,current[\blend]];
        if(slot[\detector].isNil){this.setDetector(sendID)};
        if(consumer.isNil){
            consumer=(bus:this.bus(\control,1),node:nil,settings:current);
            slot[\consumers][id]=consumer;
        };
        if(consumer[\node].isNil){
            consumer[\node]=this.synth(definitions[\controlFollower].name,
                [\in,slot[\measurementBus].index,\out,consumer[\bus].index]++args,slot[\group],"Follower "++sendID++"/"++id);
        }{this.dispatch(consumer[\node].setMsg(*args))};
        consumer[\settings]=current;this.publish;^consumer;
    }
    followerFor { |sendID,id|
        var consumer;this.measurementFor(sendID);consumer=this.slotAt(sendID)[\consumers][id.asSymbol];
        if(consumer.isNil){Error("Unknown control follower").throw};^consumer[\bus];
    }
    clearControlFollower { |sendID,id|
        var consumer;this.measurementFor(sendID);consumer=this.slotAt(sendID)[\consumers][id.asSymbol];
        if(consumer.isNil){Error("Unknown control follower").throw};
        if(consumer[\node].notNil){this.removeControlNode(consumer[\node]);consumer[\node]=nil};
        // Retain the output address so downstream mappings never point at a reused bus.
        this.dispatch(consumer[\bus].setMsg(0));this.publish;^this;
    }
    setSend { |channelID,destinationID,gain|
        var channel=this.channelAt(channelID),index=slotIDs.indexOf(destinationID.asSymbol);
        this.requireOpen;gain=AWBSendRackVoice.gain(gain);
        if(index.isNil or:{gain>config[\maxGain]}){Error("Unknown destination or gain exceeds rack range").throw};
        channel[\gains][index]=gain;
        this.dispatch([\n_setn,channel[\node].nodeID,\sendGains,slotIDs.size]++channel[\gains]);
        this.publishValue(channelID.asString++"/"++if(slots[destinationID.asSymbol][\kind]==\fx){"fx"}{"followers"}++"/"++destinationID.asString,gain);^gain;
    }
    // Borrow the control; the rack fader and MIDI change the same AWParam baseline.
    bindLevelParam { |id,param|
        var channel=this.channelAt(id),hook;this.requireOpen;
        if(param.server!==server or:{param.closed} or:{param.spec.minval>0} or:{param.spec.maxval>config[\maxGain]}){Error("Invalid rack level parameter").throw};
        if(channel[\levelParam].notNil){Error("Rack level parameter already bound").throw};
        param.mapTo(channel[\node],\level);channel[\levelParam]=param;
        hook={|o,what,data|if(what==\baseTarget and:{closed.not}){channel[\level]=param.baseTarget;this.publishValue("global/channel-levels/"++id.asString,param.baseTarget)};if(what==\closed and:{closed.not}){this.unbindLevelParam(id)}};
        channel[\levelHook]=hook;param.addDependant(hook);channel[\level]=param.baseTarget;^this;
    }
    unbindLevelParam { |id|
        var channel=this.channelAt(id),p=channel[\levelParam];
        if(p.notNil){p.removeDependant(channel[\levelHook]);if(p.closed.not){p.unmapFrom(channel[\node],\level)};channel[\levelParam]=nil;channel[\levelHook]=nil;this.dispatch(channel[\node].setMsg(\level,channel[\level]))};^this;
    }
    setLevel { |id,value|
        var channel=this.channelAt(id);
        this.requireOpen;value=AWBSendRackVoice.gain(value);
        if(value>config[\maxGain]){Error("Channel level exceeds rack range").throw};
        channel[\level]=value;if(channel[\levelParam].notNil){channel[\levelParam].setBase(value)}{this.dispatch([\n_set,channel[\node].nodeID,\level,value]);this.publishValue("global/channel-levels/"++id.asString,value)};^value;
    }
    setMute { |id,value|this.requireOpen;if(value.isKindOf(Boolean).not){Error("Mute requires a Boolean").throw};this.channelAt(id)[\mute]=value==true;this.publishValue(id.asString++"/state/mute",value.asInteger);this.updateEnabled;^this }
    setSolo { |id,value|this.requireOpen;if(value.isKindOf(Boolean).not){Error("Solo requires a Boolean").throw};this.channelAt(id)[\solo]=value==true;this.publishValue(id.asString++"/state/solo",value.asInteger);this.updateEnabled;^this }
    updateEnabled {
        var soloing=channels.values.any{|channel|channel[\solo]};
        this.requireOpen;
        channels.values.do{|channel|
            var enabled=channel[\mute].not and:{soloing.not or:{channel[\solo]}};
            this.dispatch([\n_set,channel[\node].nodeID,\enabled,if(enabled){1}{0}]);
        };
        this.publish(false);
    }
    registerProcessor { |id,factory|
        if(factory.isKindOf(Function).not){Error("Processor factory must be a Function").throw};
        id=this.itemID(id);
        if(processors.includesKey(id).not and:{processors.size>=64}){Error("Processor registry is full").throw};
        processors[id]=factory;if(ready){this.publish};^this;
    }
    setControlAmount { |id,value|
        var slot=this.slotAt(id);this.measurementFor(id);value=AWBSendRackVoice.gain(value);
        if(value>1){Error("Control send amount must be 0-1").throw};
        slot[\level]=value;
        [slot[\detector],slot[\active]].reject(_.isNil).do{|processor|
            this.dispatch(processor[\node].setMsg(\amount,value));
        };
        this.publishValue("global/control-levels/"++id.asString,value);^value;
    }
    setReturn { |id,value|
        var slot=this.slotAt(id);
        this.requireOpen;if(slot[\kind]==\follower){^this.setControlAmount(id,value)};value=AWBSendRackVoice.gain(value);
        if(slot[\kind]!=\fx or:{value>config[\maxGain]}){Error("Invalid FX return level").throw};
        slot[\level]=value;
        ([slot[\active]]++slot[\retiring]).reject(_.isNil).do{|gen|this.dispatch([\n_set,gen[\return].nodeID,\level,value])};
        this.publishValue("global/levels/"++id.asString,value);^value;
    }
    // Borrow a private audio destination for an FX return. The slot keeps this
    // routing across replacements and applies it to retiring generations too.
    // Destination ownership remains with the caller; restore before freeing it.
    setReturnDestination { |id,bus|
        var slot=this.slotAt(id),messages=List.new;
        this.requireOpen;
        bus=bus ? masterBus;
        if(slot[\kind]!=\fx or:{bus.isKindOf(Bus).not} or:{bus.server!==server} or:{bus.rate!=\audio} or:{bus.numChannels!=config[\width]} or:{bus.index.isNil} or:{bus.index<(server.options.numOutputBusChannels+server.options.numInputBusChannels)}){Error("FX return needs a matching private audio bus on this server").throw};
        slot[\returnBus]=bus;
        ([slot[\active]]++slot[\retiring]).reject(_.isNil).do{|gen|messages.add(gen[\return].setMsg(\out,bus.index))};
        if(messages.notEmpty){this.dispatchBundle(messages.asArray)};^bus;
    }
    returnDestinationFor { |id|this.requireOpen;^this.slotAt(id)[\returnBus] ? masterBus }
    setFX { |id,processor,settings|
        var slot=this.slotAt(id),factory,gen,ctx,result,old,fade,tail,switchMessages;
        this.requireOpen;settings=settings ? ();
        if(slot[\kind]!=\fx){Error("FX requires an FX slot").throw};
        factory=if(processor.isKindOf(Function)){processor}{processors[processor.asSymbol]};
        if(factory.isNil){Error("Unknown registered processor").throw};
        fade=settings[\fade] ? config[\fade];tail=settings[\tail] ? config[\tail];
        if([fade,tail].any{|v|v.isNumber.not or:{v.isNaN} or:{v<0} or:{v>60}}){Error("Invalid processor timing").throw};
        gen=(nodes:List.new,buses:List.new,disposeActions:List.new,processor:if(processor.isKindOf(Function)){\custom}{processor.asSymbol});
        try {
            gen[\group]=this.group(slot[\group],"FX "++id);gen[\nodes].add(gen[\group]);
            gen[\input]=this.bus;gen[\output]=this.bus;gen[\buses].addAll([gen[\input],gen[\output]]);
            gen[\ingress]=this.synth(definitions[\ingress].name,[\in,slot[\bus].index,\out,gen[\input].index,\gate,0,\fade,fade],gen[\group],"FX ingress");
            gen[\nodes].add(gen[\ingress]);
            gen[\processors]=this.group(gen[\group],"Processor");gen[\nodes].add(gen[\processors]);
            ctx=(slotID:id,input:gen[\input],output:gen[\output],group:gen[\processors],server:server,
                settings:settings,onDispose:{|action|if(action.isKindOf(Function).not){Error("FX disposal needs a Function").throw};gen[\disposeActions].add(action)},synth:{|name,args|
                    var node=this.synth(name,args,gen[\processors],"FX process");gen[\nodes].add(node);node
                });
            result=factory.value(ctx);
            result.asArray.reject(_.isNil).do{|node|
                if(node.isKindOf(Node) and:{ownedNodes.includes(node).not}){this.own(node,\synth,(parent:gen[\processors],defName:node.tryPerform(\defName)));gen[\nodes].add(node)};
            };
            gen[\return]=this.synth(definitions[(if(settings[\limiter] ? true){"returnLimited"}{"return"}++if(slot[\returnChannel].notNil){"Tapped"}{""}).asSymbol].name,
                [\in,gen[\output].index,\out,(slot[\returnBus] ? masterBus).index,\level,slot[\level],\fade,fade]
                ++if(slot[\returnChannel].notNil){[\tap,channels[slot[\returnChannel]][\input].index]}{[]},gen[\group],"FX return");
            gen[\nodes].add(gen[\return]);
        }{|error|this.disposeGeneration(gen);error.throw};
        old=slot[\active];slot[\active]=gen;
        switchMessages=[[\n_set,gen[\ingress].nodeID,\gate,1]];
        if(old.notNil){switchMessages=switchMessages.add([\n_set,old[\ingress].nodeID,\gate,0,\fade,fade])};
        this.dispatchBundle(switchMessages);
        if(old.notNil){this.retire(slot,old,fade,tail,false)};
        this.publish;^gen;
    }
    clearFX { |id,fade,tail|
        var slot=this.slotAt(id),old;
        this.requireOpen;
        if(slot[\kind]!=\fx){Error("Not an FX slot").throw};
        fade=fade ? config[\fade];tail=tail ? config[\tail];
        if([fade,tail].any{|v|v.isNumber.not or:{v.isNaN} or:{v<0} or:{v>60}}){Error("Invalid processor timing").throw};
        old=slot[\active];slot[\active]=nil;
        if(old.notNil){this.retire(slot,old,fade,tail)};
        this.publish;^this;
    }
    retire { |slot,gen,fade,tail,stopInput=true|
        if(stopInput){this.dispatch([\n_set,gen[\ingress].nodeID,\gate,0,\fade,fade])};
        slot[\retiring].add(gen);
        while{slot[\retiring].size>config[\maxRetiring]}{
            var oldest=slot[\retiring].removeAt(0);this.disposeGeneration(oldest);
        };
        this.schedule(fade+tail,{
            if(closed.not and:{slot[\retiring].includes(gen)}){
                slot[\retiring].remove(gen);this.disposeGeneration(gen);this.publish;
            };
        });
    }
    finishGenerationResources { |gen|
        var actions=gen.removeAt(\disposeActions);if(actions.notNil){actions.do{|action|try{action.value}{|error|error.reportError}}};^this;
    }
    disposeGeneration { |gen|
        if(gen[\group].notNil){this.dispatch(gen[\group].freeMsg)};
        this.finishGenerationResources(gen);
        (gen[\nodes] ? []).do{|node|instance.disown(node);ownedNodes.remove(node)};
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){
            (gen[\buses] ? []).do{|bus|this.releaseBus(bus)};
        }{
            Routine({server.sync;(gen[\buses] ? []).do{|bus|this.releaseBus(bus)}}).play(SystemClock);
        };
    }
    releaseBus { |bus|
        if(bus.index.notNil){bus.free};ownedBuses.remove(bus);
    }
    setFollower { |id,settings|
        var slot=this.slotAt(id),args,curve;
        this.requireOpen;settings=settings ? ();
        if(slot[\kind]!=\follower){Error("Not a follower slot").throw};
        curve=settings[\curve] ? \log;
        if([\linear,\log,\sqrt].includes(curve).not){Error("Follower curve must be linear, log or sqrt").throw};
        [\attack,\release].do{|key|if(settings[key].notNil and:{settings[key].isNumber.not or:{settings[key].isNaN} or:{settings[key]<0} or:{settings[key]>60}}){Error("Invalid follower time").throw}};
        if(settings[\scale].notNil){AWBSendRackVoice.gain(settings[\scale]);if(settings[\scale]>config[\maxGain]){Error("Follower scale exceeds range").throw}};
        if(settings[\blend].notNil and:{settings[\blend].isNumber.not or:{settings[\blend].isNaN} or:{settings[\blend]<0} or:{settings[\blend]>1}}){Error("Follower blend must be 0-1").throw};
        if(settings[\floorDb].notNil and:{settings[\floorDb].isNumber.not or:{settings[\floorDb].isNaN} or:{settings[\floorDb]>=0} or:{settings[\floorDb]< -120}}){Error("Follower floor must be negative dB").throw};
        this.clearFollower(id);
        args=[\in,slot[\bus].index,\out,slot[\controlBus].index,\amount,slot[\level],\curve,[\linear,\log,\sqrt].indexOf(curve)];
        [\attack,\release,\scale,\blend,\floorDb].do{|key|if(settings[key].notNil){args=args.addAll([key,settings[key]])}};
        slot[\active]=(node:this.synth(definitions[\follower].name,args,slot[\group],"Follower "++id),settings:settings.copy.put(\curve,curve));
        this.publish;^slot[\active];
    }
    clearFollower { |id|
        var slot=this.slotAt(id),active=slot[\active];
        this.requireOpen;if(slot[\kind]!=\follower){Error("Not a follower slot").throw};
        if(active.notNil){this.dispatch(active[\node].freeMsg);instance.disown(active[\node]);ownedNodes.remove(active[\node])};
        slot[\active]=nil;this.dispatch(slot[\controlBus].setMsg(0));this.publish;^this;
    }
    portsFor { |ids|
        ids=ids ? slotIDs;
        if(ids.isArray.not or:{ids.isEmpty} or:{ids.as(Set).size!=ids.size}
            or:{ids.any{|id|slotIDs.includes(id.asSymbol).not}}){Error("Wrapper needs known unique destination IDs").throw};
        ids=ids.collect(_.asSymbol);
        if(ids.as(Set).size!=ids.size){Error("Duplicate destination alias").throw};
        ^slotIDs.select{|id|ids.includes(id)}.collect{|id|(id:id,bus:slots[id][\bus])};
    }
    variantKey { |id,ports| ^id.asString++":"++ports.collect{|p|p[\id].asString}.join(",") }
    prepareVoice { |id,source,ids|
        this.requireOpen;id=this.itemID(id);
        if(source.isKindOf(Function).not){Error("Voice source must be a Function").throw};
        if(sources.includesKey(id) and:{sources[id]!==source}){Error("Use a new voice ID to replace a source function").throw};
        sources[id]=source;
        ^this.prepareVariant(id,ids);
    }
    prepareVariant { |id,ids|
        var ports=this.portsFor(ids),key=this.variantKey(id,ports),def,variant;
        this.requireOpen;id=id.asSymbol;
        if(variants.includesKey(key)){^variants[key]};
        if(sources[id].isNil){Error("Register the voice source first").throw};
        if(variants.size>=config[\maxVariants]){Error("Prepared wrapper cache is full").throw};
        def=AWBSendRackVoice.build((prefix++"Voice"++UniqueID.next).asSymbol,sources[id],ports);
        variant=(def:def,ports:ports,ids:ports.collect{|p|p[\id]});
        this.installDef(def.name,def);variants[key]=variant;^variant;
    }
    preparedVariant { |id,ids|
        var ports=this.portsFor(ids),variant=variants[this.variantKey(id,ports)];
        if(variant.isNil){Error("Prepare the wrapper variant before playing; notes never compile graphs").throw};
        ^variant;
    }
    voiceArguments { |id,profile,ids,overrides|
        var variant=this.preparedVariant(id,ids);
        ^AWBSendRackVoice.argumentsFor(variant[\ports],profile,overrides);
    }
    playVoice { |id,profile,args,ids,overrides,releaseAfter|
        var variant,node,controls;
        this.requireOpen;variant=this.preparedVariant(id,ids);
        controls=(args ? [])++AWBSendRackVoice.argumentsFor(variant[\ports],profile,overrides);
        node=this.synth(variant[\def].name,controls,sourceGroup,"Voice "++id);
        if(releaseAfter.notNil){this.schedule(releaseAfter,{if(closed.not and:{instance.ownedObjects.includes(node)}){this.dispatch([\n_set,node.nodeID,\gate,0])}})};
        ^node;
    }
    voiceEvent { |id,profile,args,ids,overrides|
        this.preparedVariant(id,ids);
        ^(type:\awbSendVoice,rack:this,voiceID:id,mix:profile ? (),args:args ? [],destinations:ids,busOverrides:overrides);
    }
    snapshot {
        ^(channels:channels.values.collect{|channel|
            (id:channel[\id],level:channel[\level],mute:channel[\mute],solo:channel[\solo],
                sends:Dictionary.newFrom(slotIDs.collect{|id,i|[id,channel[\gains][i]]}.flat))
        }.asArray,returns:Dictionary.newFrom(slotIDs.collect{|id|[id,slots[id][\level]]}.flat));
    }
    applyMix { |mix|
        var actions=List.new;
        this.requireOpen;
        (mix[\channels] ? []).do{|item|
            var channel=this.channelAt(item[\id]);
            if(item[\level].notNil){AWBSendRackVoice.gain(item[\level]);if(item[\level]>config[\maxGain]){Error("Mix level exceeds range").throw};actions.add({this.setLevel(item[\id],item[\level])})};
            (item[\sends] ? ()).keysValuesDo{|id,value|
                if(value.notNil){this.slotAt(id);AWBSendRackVoice.gain(value);if(value>config[\maxGain]){Error("Mix gain exceeds range").throw};actions.add({this.setSend(item[\id],id,value)})};
            };
            [\mute,\solo].do{|key|if(item[key].notNil){if(item[key].isKindOf(Boolean).not){Error("Mix mute/solo must be booleans").throw};actions.add({if(key==\mute){this.setMute(item[\id],item[key])}{this.setSolo(item[\id],item[key])}})}};
        };
        (mix[\returns] ? ()).keysValuesDo{|id,value|
            if(value.notNil){AWBSendRackVoice.gain(value);if(value>if(this.slotAt(id)[\kind]==\follower){1}{config[\maxGain]}){Error("Return exceeds range").throw};actions.add({this.setReturn(id,value)})};
        };
        actions.do(_.value);^this;
    }
    content { ^(configuration:config.deepCopy,mix:this.snapshot,ready:ready,closed:closed) }
    promotionCandidate { ^(toolID:this.definition.id,definitionVersion:this.definition.version,config:config.deepCopy,selectedState:this.snapshot) }
    applyPresetConfig { |configuration,selectedState|
        if(configuration!=config){Error("Changing stable rack topology requires a new ToolInstance").throw};
        if(selectedState.notNil){this.applyMix(selectedState)};^this;
    }
    publishValue { |id,value|
        feedbackValues[id]=[value,commandSource ? ""];
        this.publish(false);
        watchers.values.do{|watcher|if(watcher[\token]!=commandSource){watcher[\fences][id]=revision}};
        ^this;
    }
    acceptControl { |message,address|
        var op=message[2].asString,id,watcher=watchers[this.watchKey(address)];
        if(message.size<7 or:{message[6].isKindOf(Integer).not}){Error("Rack control requires its observed revision").throw};
        id=switch(op,
            "send",{message[3].asString++"/"++if(this.slotAt(message[4])[\kind]==\fx){"fx"}{"followers"}++"/"++message[4].asString},
            "level",{"global/channel-levels/"++message[3].asString},
            "return",{"global/"++if(this.slotAt(message[4])[\kind]==\follower){"control-levels"}{"levels"}++"/"++message[4].asString},
            {message[3].asString++"/state/"++op});
        ^watcher.isNil or:{message[6]>=(watcher[\fences][id] ? 0)};
    }
    watchKey { |address| ^address.ip++":"++address.port }
    watch { |address,token|
        var key=this.watchKey(address);
        this.requireOpen;
        watchers.keys.copy.do{|k|if(watchers[k][\expires]<Main.elapsedTime){watchers.removeAt(k)}};
        if(token.size!=36){Error("Invalid rack watch token").throw};
        if(watchers.includesKey(key).not and:{watchers.size>=8}){Error("Rack watcher capacity reached").throw};
        if(watchers[key].isNil or:{watchers[key][\token]!=token}){watchers[key]=(address:address,token:token,fences:Dictionary.new)};
        watchers[key][\expires]=Main.elapsedTime+12;
        address.sendMsg('/awb/rack/watch',instance.instanceID,token,revision);
    }
    publish { |metadata=true|
        metadataPending=metadataPending or:{metadata};
        revision=revision+1;
        if(publishPending.not){
            publishPending=true;
            SystemClock.sched(0.033,{
                publishPending=false;
                if(closed.not and:{instance.status!=\closed}){
                    instance.updateState((rackReady:ready,rackRevision:revision));
                    this.changed(\routingChanged,revision);
                    watchers.keys.copy.do{|key|
                        var watcher=watchers[key],address=watcher[\address],token=watcher[\token];
                        var changes=feedbackValues.reject{|item|item[1]==token};
                        if(watcher[\expires]<Main.elapsedTime){watchers.removeAt(key)}{
                            // The originating GUI already owns these values. An empty frame
                            // acknowledges its revision without echoing control values.
                            address.sendMsg('/awb/rack/update',instance.instanceID,token,revision.asString,"begin",publishedRevision,revision,changes.size,metadataPending.asInteger);
                            changes.keysValuesDo{|id,item|address.sendMsg('/awb/rack/update',instance.instanceID,token,revision.asString,"value",id,item[0],item[1])};
                            address.sendMsg('/awb/rack/update',instance.instanceID,token,revision.asString,"end",revision);
                        };
                    };
                    publishedRevision=revision;feedbackValues.clear;metadataPending=false;
                };nil;
            });
        };
    }
    attachOSC {
        responder=OSCFunc({|message,time,address|
            if(address.ip=="127.0.0.1" and:{message[1].asString==instance.instanceID}){
                commandSource=watchers[this.watchKey(address)].tryPerform(\at,\token);
                try {
                    if(["send","level","mute","solo","return"].includesEqual(message[2].asString).not or:{this.acceptControl(message,address)}){
                    switch(message[2].asString,
                        "watch",{this.watch(address,message[3].asString)},
                        "unwatch",{var key=this.watchKey(address);if(watchers[key].tryPerform(\at,\token)==message[3].asString){watchers.removeAt(key)}},
                        "sync",{this.sendState(address,message[3].asString)},
                        "send",{this.setSend(message[3].asSymbol,message[4].asSymbol,message[5])},
                        "level",{this.setLevel(message[3].asSymbol,message[5])},
                        "mute",{this.setMute(message[3].asSymbol,message[5]>=0.5)},
                        "solo",{this.setSolo(message[3].asSymbol,message[5]>=0.5)},
                        "return",{this.setReturn(message[4].asSymbol,message[5])},
                        "set-fx",{this.setFX(message[3].asSymbol,message[4].asSymbol)},
                        "clear-fx",{this.clearFX(message[3].asSymbol)},
                        "set-follower",{this.setFollower(message[3].asSymbol,if(message.size>4){(curve:message[4].asSymbol,attack:message[5],release:message[6],scale:message[7],blend:message[8],floorDb:message[9])}{nil})},
                        "clear-follower",{this.clearFollower(message[3].asSymbol)},
                        "enable-control-send",{if([0,1].includes(message[4]).not){Error("Control send enabled must be 0 or 1").throw};this.setControlSendEnabled(message[3].asSymbol,message[4]==1)},
                        {Error("Unknown rack operation").throw});};
                }{|error|address.sendMsg('/awb/rack/error',instance.instanceID,error.errorString)};
                commandSource=nil;
            };
        },'/awb/rack/control');
    }
    sendState { |address,requestID|
        this.requireOpen;
        address.sendMsg('/awb/rack/state',instance.instanceID,requestID,"begin",revision,config[\name],config[\libraryID],config[\maxGain],channels.size,slotIDs.size,processors.size,1);
        config[\channels].do{|item,order|
            var channel=this.channelAt(this.itemID(item));
            address.sendMsg('/awb/rack/state',instance.instanceID,requestID,"channel",channel[\id].asString,channel[\label],channel[\level],channel[\mute].asInteger,channel[\solo].asInteger,order);
        };
        slotIDs.do{|id,order|
            var slot=slots[id],settings=slot[\active].tryPerform(\at,\settings) ? (),detector=slot[\detector].tryPerform(\at,\settings) ? ();
            address.sendMsg('/awb/rack/state',instance.instanceID,requestID,"slot",id.asString,slot[\label],slot[\kind].asString,slot[\fixed].asInteger,slot[\active].notNil.asInteger,slot[\level],if(slot[\active].isNil){""}{if(slot[\kind]==\fx){slot[\active][\processor].asString}{slot[\active][\settings][\curve].asString}},order,settings[\attack] ? 0.01,settings[\release] ? 0.1,settings[\scale] ? 1,settings[\blend] ? 1,settings[\floorDb] ? -60,slot[\detector].notNil.asInteger,detector[\rise] ? 0.00562,detector[\fall] ? 0.0234,detector[\gainDb] ? 14.4,slot[\consumers].values.count{|consumer|consumer[\node].notNil},slot[\controlEnabled].asInteger);
        };
        channels.values.do{|channel|address.sendMsg('/awb/rack/state',instance.instanceID,requestID,"sends",channel[\id].asString,*channel[\gains])};
        processors.keys.do{|id|address.sendMsg('/awb/rack/state',instance.instanceID,requestID,"processor",id.asString)};
        address.sendMsg('/awb/rack/state',instance.instanceID,requestID,"end",revision);
    }
    whenReady { |action|
        if(closed){Error("Rack is closed").throw};
        if(ready){action.value(this)}{
            SystemClock.sched(0.01,{
                if(closed){nil}{if(ready){action.value(this);nil}{0.01}};
            });
        };^this;
    }
    gui { |launchOptions|
        var root=config[\shellRoot],electron,main,command,runner;
        if(closed){Error("Rack is closed").throw};
        if(ready.not){this.whenReady({this.gui(launchOptions)});^this};
        this.requireOpen;launchOptions=launchOptions ? ();
        if(shellPID.notNil){^shellPID};
        electron=root +/+ "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron";
        main=root +/+ "apps/awb-shell/shell/main.mjs";
        if(File.exists(electron).not or:{File.exists(main).not}){Error("Rack Shell checkout/executable unavailable").throw};
        command="exec /usr/bin/env -u ELECTRON_RUN_AS_NODE AWB_RACK_SC_PORT=% AWB_RACK_INSTANCE_ID=% AWB_RACK_LIBRARY_ID=% AWB_RACK_SC_LIBRARY_ROOT=% % % --tool=rack --profile=standalone --origin=supercollider --tool-instance=% --owner-pid=% --osc-port=0 --user-data-dir=%".format(
            NetAddr.langPort,instance.instanceID.shellQuote,config[\libraryID].asString.shellQuote,(root+/+".rack-sc-libraries").shellQuote,electron.shellQuote,main.shellQuote,instance.instanceID.shellQuote,thisProcess.pid,(root+/+".rack-sc-user-data"+/+(thisProcess.pid.asString++"-"++instance.instanceID)).shellQuote);
        runner=launchOptions[\processRunner] ? {|cmd|cmd.unixCmd({|code|shellPID=nil})};
        shellPID=runner.value(command);^shellPID;
    }
    close {
        if(closed){^this};channels.keys.do{|id|this.unbindLevelParam(id)};closed=true;ready=false;
        watchers.values.do{|watcher|watcher[\address].sendMsg('/awb/rack/closed',instance.instanceID,watcher[\token])};watchers.clear;feedbackValues.clear;
        responder.tryPerform(\free);responder=nil;
        if(quitHook.notNil){ServerQuit.remove(quitHook,server);quitHook=nil};
        if(rootGroup.notNil){this.dispatch(rootGroup.freeMsg)};
        slots.values.do{|slot|([slot[\active]]++slot[\retiring]).reject(_.isNil).do{|gen|this.finishGenerationResources(gen)}};
        ownedBuses.select{|bus|bus.rate==\control and:{bus.index.notNil}}.do{|bus|this.dispatch(bus.setMsg(0))};
        ownedNodes.copy.do{|node|instance.disown(node)};ownedNodes.clear;
        // Do not return addresses to the allocator until the server has acknowledged graph removal.
        if(options[\sendFunction].notNil or:{server.serverRunning.not}){
            ownedBuses.copy.do{|bus|this.releaseBus(bus)};
        }{
            Routine({server.sync;ownedBuses.copy.do{|bus|this.releaseBus(bus)}}).play(SystemClock);
        };
        if(shellPID.notNil){("kill -TERM "++shellPID.asInteger).unixCmd;shellPID=nil};
        if(definitions.notNil){definitions.values.do{|def|this.dispatch([\d_free,def.name]);SynthDescLib.global.removeAt(def.name)}};
        ^this;
    }
    free { ^instance.close }
}
