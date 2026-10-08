// Startup coordinator. Musical choices come from BaseLaunch; the base owns DSP.
AWBLiveSet {
    var <root,<directory,<backend=\sc,<server,<base,<instance,audio,<view,<ready=false,<closed=false,<failure;
    var baseObserver,settings,inputs,spec,configuration,plan,buildAction,readyAction,errorAction,routine,gui=true,physicalInputs=true,viewSettings;
    // The scene page supplies musical content; BaseLaunch supplies the editable rig.
    *openPage { |directory,content,baseDirectory|
        var env=currentEnvironment,previous=env[\awbLivePageBuild],result;
        if(content.isKindOf(Function).not){Error("A live page needs a content Function").throw};
        if(env[\awbSet].notNil and:{env[\awbSet].closed.not}){Error("Close the current set with ~awbSet.close before opening another page").throw};
        baseDirectory=baseDirectory ? (PathName(directory).parentPath+/+" live set sc migration");
        protect {
            env[\awbLivePageBuild]={|base|content.value(base,directory)};
            (baseDirectory+/+"BaseLaunch with efKR.scd").load;
            result=env[\awbSet];
        } {env[\awbLivePageBuild]=previous};
        ^result;
    }
    *new { |directory,root="/Users/willy/awb"|^super.new.init(directory,root)}
    init { |folder,repository|
        directory=folder;root=repository;server=Server.default;
        settings=(device:"1248",rate:44100,block:256,hardware:512,memory:262144,outputs:4,workers:2,nodes:4096);
        inputs=(vc:[0],mic:[1],pro2:[4,5]);
        spec=(root+/+"apps/rack/sc/sets/awb52/prepared/first-pass.scd").load.deepCopy;
        spec[\rack][\maxGain]=1;spec[\rack][\maxLevel]=1;spec[\rack][\dynamicFX]=0;spec[\rack][\spareFollowers]=0;
        spec[\fxMixes][\deci][\fullParameterRanges]=true;spec[\fxMixes][\deci][\foldedEnvelopeParams]=true;
        [\depth,\folding].do{|key|spec[\fxMixes][\deci][\defaults][key]=spec[\fxMixes][\deci][\pluginBases][\deci][key]};
        spec[\rack][\channels]=spec[\rack][\channels]++[(id:"mic",label:"Mic"),(id:"patterns",label:"Patterns")];
        spec[\initialMix][\channels]=spec[\initialMix][\channels]++[(id:"mic",level:1,sends:(mast:1)),(id:"patterns",level:1,sends:(mast:1))];
        spec=AWBDelayRack.configure(spec,[]);
        spec[\rack][\channels]=spec[\rack][\channels]++[\mast,\fuzz,\deci,\spark,\verb].collect{|id|(id:"fx-"++id,label:id.asString.toUpper++" FX",returnOf:id)};
        configuration=(root+/+"apps/live-set/sc/plans/live-configuration.scd").load;
        plan=(root+/+"apps/live-set/sc/plans/live-44100.scd").load;^this;
    }
    backend_ { |value|if(routine.notNil or:{ready}){Error("Backend is selected at launch").throw};if([\sc,\bitwig].includes(value).not){Error("Unknown backend").throw};backend=value;^this}
    hardware { |device="1248",rate=44100,block=256,buffer=512,memory=262144,outputs=4,workers=2,nodes=4096|settings=(device:device,rate:rate,block:block,hardware:buffer,memory:memory,outputs:outputs,workers:workers,nodes:nodes);^this}
    input { |id,channels|inputs[id]=channels;^this}
    physicalInputs_ { |enabled|physicalInputs=enabled;^this}
    pluginPath { |role,path|if(spec[\components][role].isNil){Error("Unknown plugin role").throw};spec[\components][role][\path]=path;^this}
    profileTables { |kind,tables|if(kind==\um){spec[\sharedFX][\tables]=tables}{spec[\fxMixes][kind][\tables]=tables};^this}
    gui_ { |enabled|gui=enabled;^this}
    viewOptions { |options|viewSettings=(options ? ()).copy;^this}
    convolution { |fft=4096,earth=5,composite=30,echo=20|spec[\fftSize]=fft;spec[\irMaxSecondsByBranch]=(earth:earth,composite:composite,echo:echo);^this}
    ir { |branch,path,gain=1|var i=[\earth,\composite,\echo].indexOf(branch);if(i.isNil){Error("Unknown convolution branch").throw};spec[\irFiles][i]=path;spec[\irEnvelopes]=(spec[\irEnvelopes] ? ()).copy;spec[\irEnvelopes][branch]=(spec[\irEnvelopes][branch] ? ()).copy.put(\gainDb,gain.ampdb);^this}
    plugin { |role,values|
        var item=spec[\components][role],pairs,names;
        if(item.isNil){Error("Unknown plugin role").throw};pairs=item[\params].clump(2);names=item[\parameterNames];
        values.keysValuesDo{|key,value|var i=names.indexOfEqual(key.asString),pair;if(i.isNil){Error("Unknown plugin parameter: "++key).throw};pair=pairs.detect{|pair|pair[0]==i};if(pair.isNil){pairs=pairs.add([i,value])}{pair[1]=value}};
        item[\params]=pairs.flat;^this;
    }
    stutter { |configuration|spec[\celloStutter]=AWBCelloStutter.settings(configuration);^this}
    onBase { |action|buildAction=action;^this}
    profile { |kind,values|var target=if(kind==\um){spec[\sharedFX]}{spec[\fxMixes][kind]};target[\defaults]=(target[\defaults] ? ()).putAll(values);^this}
    delay { |id,seconds=8,mode=2,position=1,input=0,feedback=0.5,fx=1|
        var cell=configuration[\cells].detect{|c|c[\id]==id.asString.toUpper};if(cell.isNil){Error("Unknown delay cell").throw};
        cell.putAll((seconds:seconds,inputGain:input,feedback:feedback,effectLevel:fx));cell[\legacyMode]=mode;cell[\legacyPosition]=position;^this;
    }
    tapeheads { |id,rate=0.035,second=0.08,fourth = -0.13|
        var cell=configuration[\cells].detect{|c|c[\id]==id.asString.toUpper};
        [rate,second,fourth].do{|v|AWParam.finite(v,"head erosion")};if(cell.isNil or:{rate<=0} or:{rate>2} or:{second.abs>0.5} or:{fourth.abs>0.5}){Error("Invalid tapehead erosion settings").throw};cell[\headErosion]=(rate:rate,second:second,fourth:fourth);^this;
    }
    route { |channel,destination,gain=0|var row=spec[\initialMix][\channels].detect{|c|c[\id].asSymbol==channel};if(row.isNil){row=(id:channel,level:1,sends:());spec[\initialMix][\channels]=spec[\initialMix][\channels].add(row)};row[\sends][destination]=gain;^this}
    waitFor { |predicate,label|var limit=Main.elapsedTime+120;while{predicate.value.not}{if(failure.notNil){failure.throw};if(closed){Error("Launch cancelled").throw};if(Main.elapsedTime>limit){Error("Timed out waiting for "++label).throw};0.05.wait};^this}
    launch { |build,onReady,onError|
        if(routine.notNil or:{ready} or:{closed}){Error("Live set already launched or closed").throw};
        buildAction=build ? buildAction;readyAction=onReady;errorAction=onError;
        routine=Routine({
            var booted=false,audited=false;
            try {
                this.configureServer;
                server.waitForBoot({booted=true},200,{failure=Error("Live set server boot failed")});this.waitFor({booted},"server");
                VSTPlugin.initDSPThreads(server,settings[\workers]);
                instance=AWBaseTool.open((name:"AWB LiveSet",backend:backend,params:[]),(server:server));base=instance.tool;baseObserver={|object,what|if(what==\closed){this.close}};base.addDependant(baseObserver);this.waitFor({base.ready},"AWBase");
                audio=AWBFirstPassSet.open(spec,(server:server,controlSends:true,controlSpareCount:0,verbProfiles:true,fxProfiles:true,fuzzPlugin:true,sharedFX:true,celloScheps:true,celloStutter:true,modulationRegistry:base.modulationRegistry,fullLoad:false,onError:{|error|failure=error}));
                // Own immediately: cancellation/failure during asynchronous startup cleans up.
                base.adopt(\firstPassSet,audio,{|object|object.close});this.waitFor({audio.ready},"rack and FX");base.bindFirstPass(audio);
                base.instance.own(audio.instance,\toolInstance,(name:"Live rack",lifetime:\explicit));base.instance.own(audio.sharedChain.instance,\toolInstance,(name:"UM / Scheps chain",lifetime:\explicit));
                base.bindDelays(plan,configuration,{|object,error|failure=error});this.waitFor({base.liveDelays.notNil and:{base.liveDelays.ready}},"delay cells");
                AWBLiveControlGraph(base,audio);server.sync;buildAction.value(base,this);server.sync;this.waitFor({base.modulationRegistry.connections.every{|c|c[\status]!=\pending}},"modulation registration");
                if(base.modulationRegistry.registrationErrors.notEmpty){Error("Live set modulation failed: "++base.modulationRegistry.registrationErrors.first[\error].errorString).throw};
                server.sync;base.validateModulationOrder({|reports,error|
                    if(error.notNil){failure=error}{if(reports.any{|r|r[\valid].not}){failure=Error("Live set has an invalid or missing modulation node")}};audited=true;
                });this.waitFor({audited},"modulation node audit");if(failure.notNil){failure.throw};
                if(physicalInputs and:{inputs.notNil}){audio.connectInputs(inputs[\vc],inputs[\pro2],inputs[\mic])};
                if(gui){view=base.gui((shellRoot:root).putAll(viewSettings ? ()))};ready=true;routine=nil;base.log("LiveSet ready: "++directory);readyAction.value(base,this);
            }{|error|failure=error;routine=nil;this.close;error.reportError;errorAction.value(error)};
        }).play(SystemClock);^this;
    }
    configureServer {
        var o=server.options,count=(inputs[\vc]++inputs[\mic]++inputs[\pro2]).maxItem+1;
        if(settings[\rate]!=44100){Error("This prepared delay plan requires 44100 Hz").throw};
        if(server.serverRunning){
            if(server.sampleRate!=settings[\rate] or:{o.blockSize!=settings[\block]} or:{o.hardwareBufferSize!=settings[\hardware]} or:{o.maxNodes<settings[\nodes] or:{o.memSize<settings[\memory]}} or:{o.numOutputBusChannels!=settings[\outputs]} or:{o.numInputBusChannels<count} or:{(o.ugenPluginsPath ? "").contains(root+/+"apps/live-set/.build").not}){Error("Running server settings differ; stop it before launching this set").throw};
        }{
            Server.scsynth;o.device=settings[\device];o.sampleRate=settings[\rate];o.blockSize=settings[\block];o.hardwareBufferSize=settings[\hardware];o.memSize=settings[\memory];o.maxNodes=settings[\nodes];o.numOutputBusChannels=settings[\outputs];o.numInputBusChannels=count;
            o.ugenPluginsPath=[Platform.resourceDir+/+"plugins",Platform.systemExtensionDir,Platform.userExtensionDir,root+/+"apps/live-set/.build"].join(":");
        };^this;
    }
    close {if(closed){^this};closed=true;ready=false;if(routine!==thisThread){routine.tryPerform(\stop)};routine=nil;if(base.notNil and:{baseObserver.notNil}){base.removeDependant(baseObserver)};instance.tryPerform(\close);if(instance.isNil){audio.tryPerform(\close)};^this}
}
