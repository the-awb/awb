// A live-set root on the existing Tool/Core lifecycle. The GUI borrows its objects.
AWBaseTool : AWBCoreTool {
    var <backend, <rack, <chains, <b, <g, <followers, <blenders, <s, <>currentScene, <controlGraph;
    var <transitioning=false, transitionUntil=0, transitionGeneration=0, sceneMidi, sceneTask, presetMidi;
    var firstPass,ownsClock,ownedTasks;
    var <inputs;
    var <liveDelays,<t,<logHistory,<logSequence=0,baseResponder,baseWatchers,baseEpoch,views,liveRack;
    *register {^ToolRegistry.at(\awbBase) ?? {ToolRegistry.register(ToolDefinition(\awbBase,"AWB Live Base",version:"0.1.0",
        interfaceKind:\native,capabilities:[\liveSet,\parameters,\trackedPlayback,\ownership,\logging],defaultConfig:AWBCoreTool.defaults,
        dependencies:(nodeManager:\required),multipleInstances:true,cleanupPolicy:\terminateOwned,
        factory:{|instance,config,opts|AWBaseTool(instance,config,opts).open},closeAction:{|instance|instance.tool.tryPerform(\close)}))}}
    *open { |config,opts|this.register;opts=(opts ? ()).copy;opts[\gui]=false;opts[\track]=opts[\track] ? true;^ToolLauncher.open(\awbBase,config,opts) }
    init { |instance,config,opts|
        opts=(opts ? ()).copy;ownsClock=opts[\clock].isNil;
        if(ownsClock){opts[\clock]=TempoClock.new(config[\tempo] ? 1).permanent_(true)};
        super.init(instance,config,opts);
        backend=(config[\backend] ? \sc).asSymbol;
        if([\sc,\bitwig].includes(backend).not){Error("AWBase backend must be sc or bitwig").throw};
        ownedTasks=List.new;inputs=IdentityDictionary.new;b=IdentityDictionary.new;g=IdentityDictionary.new;followers=IdentityDictionary.new;blenders=IdentityDictionary.new;s=IdentityDictionary.new;chains=IdentityDictionary.new;t=IdentityDictionary.new;logHistory=List.new;baseWatchers=Dictionary.new;views=IdentitySet.new;presetMidi=List.new;baseEpoch=thisProcess.pid.asString++":"++UniqueID.next;^this}
    open {
        super.open;
        if(ownsClock){this.adopt(\setClock,this.clock,{|clock|clock.stop})};
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
                            "launch-scene",{
                                var problem;
                                if(msg.size!=8){Error("Invalid scene launch request").throw};
                                problem=this.sceneLaunchError(msg[6]);
                                if(problem.notNil){address.sendMsg('/awb/base/error',this.instance.instanceID,token,request,problem)}{
                                    this.launchScene(msg[6],msg[7]);address.sendMsg('/awb/base/scene-result',this.instance.instanceID,token,baseEpoch,request)
                                }
                            },
                            "unwatch",{baseWatchers.removeAt(address.port)},{Error("Unknown console command").throw})
                    }
                }{|error|address.sendMsg('/awb/base/error',this.instance.instanceID,token,request,error.errorString)};
            }
        },'/awb/base/control');^this;
    }
    // Background scene work uses seconds by default and dies with the base.
    runTask { |function,clock|
        var task;this.requireAlive;
        task=Routine({protect{function.value}{ownedTasks.remove(thisThread)}});
        ownedTasks.add(task);task.play(clock ? SystemClock);^task;
    }
    containers { ^t }
    delays { ^liveDelays }
    inputFor { |id|this.requireAlive;^inputs[id.asSymbol] ?? {Error("Unknown set input: "++id).throw} }
    fxMix { |id|this.requireAlive;^firstPass.fxMix(id) }
    sharedMix {this.requireAlive;^firstPass.sharedMix}
    plugin { |role,slot|this.requireAlive;^firstPass.plugin(role,slot)}
    convolutionGUI {this.requireAlive;^firstPass.convolutionGUI}
    track { |id|this.requireAlive;id=this.id(id);^t[id] ?? {t[id]=if([\b1,\b2,\a1,\a2].includes(id)){(\AWBDelayTrack.asClass ? AWTrackControls).new(id)}{AWTrackControls(id)}.bindBase(this);t[id]} }
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
        if(liveRack.notNil and:{liveRack.closed.not}){liveRack.followerIDs.do{|id|
            var slot=liveRack.slotAt(id);
            if(slot[\kind]==\follower){address.sendMsg('/awb/base/meter',this.instance.instanceID,token,baseEpoch,
                "global/control-levels/"++id.asString,slot[\measurementBus].index)};
        }};
        this.sendSceneState(address,token);s.values.do{|scene|address.sendMsg('/awb/base/scene-entry',this.instance.instanceID,token,baseEpoch,scene.num,scene.symbol.asString,scene.transitionDuration)};
        logHistory.do{|entry|this.sendLog(address,token,entry)};
        address.sendMsg('/awb/base/end',this.instance.instanceID,token,baseEpoch,request);^this;
    }
    // These persistent resources are containers, not playing streams. Object's
    // default isPlaying=false must not let NodeManager discard their ownership.
    // Closing the base runs cleanup; closing a view does not.
    adopt { |id,object,cleanup|this.ownResource(id,object,cleanup);this.instance.own(object,\container,(name:id.asString,lifetime:\explicit));^object }
    bindFirstPass { |set,own=false|
        var result=\AWBLiveMappings.asClass.perform(\bindFirstPass,this,set);
        firstPass=set;liveRack=set.rack;rack=liveRack;
        [\vc,\pro2,\mic,\patterns].do{|id|if(rack.channels.includesKey(id)){inputs[id]=set.inputFor(id)}};
        if(own){this.instance.own(set.instance,\toolInstance,(name:"Live rack",lifetime:\explicit));
            if(set.sharedChain.notNil){this.instance.own(set.sharedChain.instance,\toolInstance,(name:"UM / Scheps chain",lifetime:\explicit))}};
        [\verb,\deci,\spark,\fuzz].do{|id|this.track(id).bindChain(set, id)};
        if(set.celloStutter.notNil){this.track(\vcfx).bindChain(set.celloStutter,\vcfx)};
        if(set.sharedChain.notNil){chains[\mast]=set.sharedChain.chain;this.track(\mast).bindChain(set.sharedChain.chain,\mast)};
        liveRack.fxIDs.do{|id|liveRack.setReturn(id,1)};
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
    attachControlGraph { |object|
        if(controlGraph.notNil){Error("Control graph already attached").throw};controlGraph=object;
        this.adopt(\controlGraph,object,{|o|o.close});^object;
    }
    makeBus { |id|var bus=this.createBus(("signal/"++id).asSymbol);b[id.asSymbol]=bus;^bus}
    createBlender { |id,a,busB,scale=1,offset=0,blend=0.5,mode=0,scalar=\1,offsetSource=\0,blendSource=\1,label,color,target|
        ^controlGraph.blender(id,a,busB,scale,offset,blend,mode,scalar,offsetSource,blendSource,label);
    }
    createKRFollower { |id,source,attack=1,release=1,blend=0.66,scale=1,label,color|
        var send=\AWBControlSendProfile.asClass.perform(\inputMap)[source],consumer=if(id.asString.size==3 and:{id.asString[0]==$c}){switch(id.asString[2],$s,{\short},$m,{\medium},$l,{\long},{id})}{id};
        if(send.isNil){Error("Unknown rack control-send source: "++source).throw};^controlGraph.follower(id,send,(attack:attack,release:release,blend:blend,scale:scale),consumer);
    }
    createAudioFollower { |id,bus,attack=0.1,release=0.2,blend=0.66,scale=1,label|^controlGraph.audioFollower(id,bus,(attack:attack,release:release,blend:blend,scale:scale))}
    bindEnvelopeFader { |trackID,sendID,value=1|
        var track=this.track(trackID),p=this.createParam((trackID.asString++"EnvelopeFader").asSymbol,value,ControlSpec(0,rack.config[\maxLevel]));
        p.midiRange(0,1);rack.bindControlAmountParam(sendID,p);track.fader=p;track.add(\fader,p,"Envelope amount");^p;
    }
    dynamicCC {^blenders}
    createScene { |id,num|var scene;id=this.id(id);if(s.includesKey(id) or:{s.values.any{|item|item.num==num}}){Error("Duplicate scene name or number").throw};scene=AWBLiveScene(this,id,num);s[id]=scene;this.adopt(("scene/"++id).asSymbol,scene,{|o|o.close});this.publishSceneRegistry;^scene}
    // Pages may register their scenes after the shell has connected.
    publishSceneRegistry {
        this.pruneLogWatchers;baseWatchers.values.do{|w|
            var address=w[\address],token=w[\token];
            address.sendMsg('/awb/base/scenes-begin',this.instance.instanceID,token,baseEpoch);
            s.values.do{|scene|address.sendMsg('/awb/base/scene-entry',this.instance.instanceID,token,baseEpoch,scene.num,scene.symbol.asString,scene.transitionDuration)};
            address.sendMsg('/awb/base/scenes-end',this.instance.instanceID,token,baseEpoch);
        };^this;
    }
    findScene { |id|
        var scene=if(id.isKindOf(AWBLiveScene)){id}{s[id.asSymbol] ?? {s.values.detect{|candidate|candidate.num.asString==id.asString}}};
        if(scene.isNil or:{scene.base!==this} or:{scene.closed}){^nil};^scene;
    }
    sceneAt { |id|var scene=this.findScene(id);if(scene.isNil){Error("Unknown scene: "++id).throw};^scene}
    // Expected client rejections are replies, not exceptions with native backtraces.
    sceneLaunchError { |id|
        if(transitioning){^"A scene transition is already in progress"};
        if(this.findScene(id).isNil){^"Unknown scene: "++id};^nil;
    }
    launchScene { |id,duration|
        var scene,generation,done=false;
        this.requireAlive;if(transitioning){Error("A scene transition is already in progress").throw};
        scene=this.sceneAt(id);duration=duration ? scene.transitionDuration;AWParam.finite(duration,"scene transition duration");
        if(duration<0 or:{duration>3600}){Error("Scene duration must be 0-3600 seconds").throw};
        transitioning=true;transitionGeneration=transitionGeneration+1;generation=transitionGeneration;transitionUntil=Main.elapsedTime+duration;
        try {
            if(currentScene.notNil and:{currentScene!==scene}){currentScene.next};currentScene=scene;
            this.log("Scene "++scene.num++": "++scene.symbol);this.publishSceneState;
            sceneTask=scene.runStart({|error|
                if(error.notNil){this.finishScene(generation,error)}{done=true;if(Main.elapsedTime>=transitionUntil){this.finishScene(generation)}};
            });
            SystemClock.sched(duration,{if(this.closed.not and:{generation==transitionGeneration} and:{done}){this.finishScene(generation)};nil});
        }{|error|this.finishScene(generation,error);error.throw};^scene;
    }
    finishScene { |generation,error|
        if(this.closed or:{generation!=transitionGeneration} or:{transitioning.not}){^this};
        transitioning=false;transitionUntil=0;sceneTask=nil;
        if(error.notNil){this.log("Scene failed: "++error.errorString,\error)}{this.log("Scene "++currentScene.num++" launch complete");currentScene.end};
        this.publishSceneState;^this;
    }
    sendSceneState { |address,token|
        address.sendMsg('/awb/base/scene-state',this.instance.instanceID,token,baseEpoch,
            currentScene.tryPerform(\num) ? -1,if(currentScene.isNil){""}{currentScene.symbol.asString},transitioning.asInteger,(transitionUntil-Main.elapsedTime).max(0));^this;
    }
    publishSceneState {this.pruneLogWatchers;baseWatchers.values.do{|w|this.sendSceneState(w[\address],w[\token])};this.changed(\scene);^this}
    bindSceneMidi { |source,channel,notes|
        var uid=if(source.respondsTo(\midiClient)){source.midiClient}{source};
        this.requireAlive;
        if(uid.isInteger.not){Error("Scene MIDI requires a specific source UID").throw};
        if(notes.isArray.not or:{notes.isEmpty} or:{notes.any{|n|n.isInteger.not or:{n<0} or:{n>127}}}){Error("Provide the FCB scene note list").throw};
        sceneMidi.tryPerform(\free);
        sceneMidi=MIDIFunc.noteOn({|velocity,note|
            var id=notes.indexOf(note),problem;
            if(velocity>0){problem=this.sceneLaunchError(id);if(problem.notNil){this.log(problem,\warn)}{
                try{this.launchScene(id)}{|error|this.log(error.errorString,\warn)}
            }}
        },notes,channel,uid);^this;
    }
    bindPresetMidi { |source,actions,channel|
        var uid=if(source.respondsTo(\midiClient)){source.midiClient}{source};
        actions.keysValuesDo{|note,action|if(note.isInteger.not or:{note<0} or:{note>127} or:{action.isKindOf(Function).not}){Error("Invalid preset MIDI action").throw};presetMidi.add(MIDIFunc.noteOn({|velocity|if(velocity>0){action.value}},note,channel,uid))};^this;
    }
    namedParameters {
        var result=IdentityDictionary.new;
        t.keys.asArray.sort.do{|trackID|
            var track=t[trackID],names=track.p.keys.asArray.sort;
            names=names.select{|id|track.metadata[id][\canonical] ? false}++names.reject{|id|track.metadata[id][\canonical] ? false};
            names.do{|id|
            var value=track.p[id],p=if(value.isKindOf(AWParam)){value}{value.tryPerform(\param)};
            if(p.notNil and:{p.closed.not} and:{result.values.includes(p).not}){result[(trackID.asString++"/"++id).asSymbol]=p}
        }};
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
        ownedTasks.copy.do{|task|if(task!==thisThread){task.stop}};ownedTasks.clear;
        if(this.closed){^this};this.modulationRegistry.close;transitionGeneration=transitionGeneration+1;sceneTask.tryPerform(\stop);sceneMidi.tryPerform(\free);presetMidi.do(_.free);presetMidi.clear;controlGraph.tryPerform(\close);liveDelays.tryPerform(\close);views.copy.do(_.close);views.clear;
        baseWatchers.values.do{|w|w[\address].sendMsg('/awb/base/closed',this.instance.instanceID,w[\token],baseEpoch)};baseWatchers.clear;baseResponder.tryPerform(\free);
        t.values.do(_.free);t.clear;super.close;inputs.clear;firstPass=nil;^this;
    }
}
