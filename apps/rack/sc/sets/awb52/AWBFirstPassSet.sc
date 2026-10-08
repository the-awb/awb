// Optional set adapter. The underlying AWBSendRackTool : Tool remains the native
// ToolInstance/NodeManager/Shell owner; this class does not create another host.
AWBFirstPassSet {
    var <instance, <rack, <server, <spec, <ready=false, <closed=false, <failure, <irInfo;
    var options, prefix, buffers, assets, nodes, controllers, dependant, setupRoutine, pending=0;
    var <verbMixes,allVerbMixes,verbBranchGates,allVerbGates;
    var <fxMixes,allFXMixes,<celloInputBus,<celloSourceGroup,profileDefinitions;
    var <sharedChain,<sharedInputBus,sharedDefinitions;
    var <celloStutter,celloProcessedBus;
    var irSpectra,irPreparedPaths,irProcessorRecords,irEditingBusy=false,irEditRoutine,irCleanupRoutines;
    *open { |specification, opts| ^super.new.init(specification,opts ? ()) }
    init { |specification, opts|
        spec=specification.deepCopy;options=opts;server=opts[\server] ? Server.default;
        if(options[\controlSends] ? false){spec[\rack]=AWBControlSendProfile.configure(spec[\rack]);spec[\rack][\spareFollowers]=options[\controlSpareCount] ? 0};
        prefix="awbFirstPass"++thisProcess.pid++"_"++UniqueID.next;buffers=List.new;assets=List.new;
        nodes=IdentityDictionary.new;controllers=IdentityDictionary.new;verbMixes=IdentityDictionary.new;allVerbMixes=IdentitySet.new;verbBranchGates=IdentityDictionary.new;allVerbGates=IdentitySet.new;irInfo=List.new;
        fxMixes=IdentityDictionary.new;allFXMixes=IdentitySet.new;profileDefinitions=IdentityDictionary.new;sharedDefinitions=IdentityDictionary.new;
        irSpectra=Array.newClear(6);irPreparedPaths=IdentityDictionary.new;irProcessorRecords=IdentityDictionary.new;irCleanupRoutines=List.new;
        [\earth,\composite,\echo].do{|id|irProcessorRecords[id]=List.new};
        this.validate;
        instance=AWBSendRackTool.open(spec[\rack],opts);rack=instance.tool;
        dependant=SimpleController(instance).put(\closed,{this.closedByInstance});
        rack.whenReady({
            setupRoutine=Routine({
                try {
                    if(options[\controlSends] ? false){AWBControlSendProfile.install(rack)};
                    if(spec[\pluginCacheDirectory].notNil){this.emit(VSTPlugin.readCacheMsg(spec[\pluginCacheDirectory]));if(options[\sendFunction].isNil){server.sync}};
                    this.prepareIRs;this.makeDefs;
                    if(options[\verbProfiles] ? false){if(options[\sendFunction].isNil){AWBVerbMixProfile.prepare(server);AWFXTailGate.prepare(server,2)}};
                    if(options[\sendFunction].isNil){server.sync};
                    if((options[\fxProfiles] ? false) or:{options[\celloStutter] ? false}){if(options[\sendFunction].isNil){AWParam.prepare(server);server.sync}};
                    if(closed.not){this.install;this.finishIfReady};
                }{|error|failure=error.errorString;error.reportError;this.close;options[\onError].value(error,this)};
            }).play(SystemClock);
        });^this;
    }
    validate {
        var fft=spec[\fftSize],sizes=spec[\irSeconds],files=spec[\irFiles],cap=spec[\irMaxSeconds] ? 30,rate=this.irRate;
        var branchCaps=spec[\irMaxSecondsByBranch] ? (),branchIDs=[\earth,\composite,\echo];
        if((options[\verbProfiles] ? false) and:{options[\fullLoad] ? false}){Error("Verb profiles and all-branches fullLoad are separate modes").throw};
        if((options[\fxProfiles] ? false) and:{spec[\fxMixes].isNil or:{options[\fullLoad] ? false}}){Error("FX profiles need prepared fxMixes and cannot use fullLoad").throw};
        if((options[\celloScheps] ? false) and:{spec[\components][\celloScheps].isNil}){Error("Prepare celloScheps before enabling it").throw};
        if(spec[\schema]!=1 or:{spec[\rack][\width]!=2}){Error("First-pass set needs schema 1 and a stereo rack").throw};
        if(fft.isKindOf(Integer).not or:{[512,1024,2048,4096,8192].includes(fft).not} or:{fft.div(2)%server.options.blockSize!=0} or:{fft.div(2)<(server.options.blockSize*2)}){Error("Invalid convolution FFT/block combination").throw};
        if(files.notNil){
            if(files.size!=3 or:{cap.isNumber.not} or:{cap.isNaN} or:{cap<=0} or:{cap>180}){Error("Need three IR files and a duration cap in (0, 180] seconds").throw};
            if(branchCaps.isKindOf(Dictionary).not){Error("IR branch caps must be a dictionary").throw};
            branchCaps.keysValuesDo{|id,value|
                if(branchIDs.includes(id).not or:{value.isNumber.not} or:{value.isNaN} or:{value<=0} or:{value>180}){Error("IR branch caps need known branch IDs and durations in (0, 180] seconds").throw};
            };
            files.do{|path,i|
                var file=SoundFile.new,info,branchCap=cap.min(branchCaps[branchIDs[i]] ? cap);
                if(path.isString.not or:{file.openRead(path).not}){Error("Cannot read IR file: "++path).throw};
                info=(path:path,sourceFrames:file.numFrames,sourceChannels:file.numChannels,sampleRate:file.sampleRate);
                file.close;
                if([1,2].includes(info[\sourceChannels]).not or:{info[\sampleRate]!=rate} or:{info[\sourceFrames]<=0}){Error("IR needs mono/stereo audio at the server sample rate: "++path).throw};
                info[\frames]=info[\sourceFrames].min((branchCap*rate).floor.asInteger);
                if(info[\frames]<1){Error("IR cap leaves no audio frames").throw};
                irInfo.add(info);
            };
        }{
            if(sizes.size!=3 or:{sizes.any{|v|v.isNumber.not or:{v.isNaN} or:{v<=0} or:{v>30}}}){Error("Need three bounded IR durations").throw};
        };
        (spec[\irEnvelopes] ? ()).keysValuesDo{|id,given|if(AWBConvolutionIR.branchIDs.includes(id).not){Error("Unknown IR envelope branch").throw};AWBConvolutionIR.settings(given)};
        if(server.options.memSize<if(files.notNil){262144}{131072}){Error("First-pass rack needs memSize >= 262144 KiB with file IRs, or 131072 with stand-ins").throw};
        if(options[\fuzzPlugin] ? false){if(spec[\components][\fuzz].isNil){Error("Prepare restored Fuzz before enabling it").throw}};
        if(options[\sharedFX] ? false){if(spec[\sharedFX].isNil or:{(options[\fxProfiles] ? false).not}){Error("Shared FX needs prepared sharedFX and fxProfiles").throw}};
        spec[\components].values.do{|item|
            if(File.exists(item[\path]).not){Error("Required FX plugin missing: "++item[\path]).throw};
            if(item[\params].size.odd or:{item[\params].clump(2).any{|pair|pair[0].isKindOf(Integer).not or:{pair[0]<0} or:{pair[1].isNumber.not} or:{pair[1].isNaN} or:{pair[1]<0} or:{pair[1]>1}}}){Error("Invalid normalized plugin parameters").throw};
        };^this;
    }
    emit { |message|rack.dispatch(message);^message }
    irRate {
        var rate=options[\sampleRate] ? server.sampleRate;
        if(rate.isNil or:{rate<=0}){rate=server.options.sampleRate ? 44100};^rate;
    }
    prepareIRs {
        var rate=this.irRate,dir=options[\assetDirectory] ?? { ("TMPDIR".getenv ? "/tmp")+/+prefix };
        var fft=spec[\fftSize],files=spec[\irFiles];
        File.mkdir(dir);
        if(files.notNil){
            files=files.copy;3.do{|i|var settings=(spec[\irEnvelopes] ? ())[AWBConvolutionIR.branchIDs[i]],path;
                if(settings.notNil){path=dir+/+("shaped-ir"++i++".wav");AWBConvolutionIR.write(files[i],path,irInfo[i][\frames],rate,settings);assets.add(path);files[i]=path;irPreparedPaths[AWBConvolutionIR.branchIDs[i]]=path};
            };
        };
        3.do{|i|
            2.do{|channel|
                var frames,data,path,file,raw,spectrum,sourceChannel;
                if(closed){Error("Set closed during IR preparation").throw};
                if(files.notNil){
                    frames=irInfo[i][\frames];path=files[i];
                    sourceChannel=if(irInfo[i][\sourceChannels]==1){0}{channel};
                }{
                    frames=(spec[\irSeconds][i]*rate).asInteger;
                    thisThread.randSeed=5100+(i*2)+channel;
                    data=FloatArray.fill(frames,{|j|(1.0.rand2)*exp(-6.9*j/frames)});
                    data[0]=data[0]+1;data=(data/(data.squared.sum.sqrt.max(1e-12))).as(FloatArray);
                    path=dir+/+("ir"++i++"-"++channel++".wav");file=SoundFile.new;
                    file.sampleRate=rate;file.numChannels=1;file.headerFormat="WAV";file.sampleFormat="float";
                    if(file.openWrite(path).not){Error("Cannot write stand-in IR: "++path).throw};
                    file.writeData(data);file.close;assets.add(path);sourceChannel=0;
                };
                raw=Buffer.new(server,frames,1);spectrum=Buffer.new(server,fft*((frames/(fft/2)).ceil.asInteger),1);
                instance.own(raw,\buffer,(name:"IR preparation input"));
                irSpectra[i*2+channel]=spectrum;buffers.add(spectrum);instance.own(spectrum,\buffer,(name:"Verb IR "++i++" / "++channel));
                this.emit(raw.allocReadChannelMsg(path,0,frames,[sourceChannel]));this.emit(spectrum.allocMsg);
                if(options[\sendFunction].isNil){server.sync};
                this.emit([\b_gen,spectrum.bufnum,\PreparePartConv,raw.bufnum,fft]);
                if(options[\sendFunction].isNil){server.sync};
                this.emit(raw.freeMsg);instance.disown(raw);
            };
        };
    }
    def { |id,function|
        var name=(prefix++id.asString).asSymbol;
        rack.installDef((prefix++id).asSymbol,SynthDef(name,function));^name;
    }
    makeDefs {
        var gains=spec[\containerGains],fft=spec[\fftSize],irs=buffers.collect(_.bufnum).asArray,profileMode=options[\verbProfiles] ? false;
        if(options[\fxProfiles] ? false){([\deci,\spark]++if(options[\fuzzPlugin] ? false){[\fuzz]}{[]}).do{|id|
            var definition=AWBFXMixProfile.compile(id,spec[\fxMixes][id]);
            profileDefinitions[id]=definition;rack.installDef(definition.name,definition);
        }};
        if(options[\sharedFX] ? false){
            var definition=AWBFXMixProfile.compile(\um,spec[\sharedFX]);
            sharedDefinitions[\profile]=definition;rack.installDef(definition.name,definition);
            this.def(\UM,{|in=0,out=0|Out.ar(out,VSTPlugin.ar(In.ar(in,2),2,id:\um))});
            this.def(\StereoScheps,{|in=0,out=0,profileBus=0|
                var input=In.ar(in,2),wet=VSTPlugin.ar(input,2,id:\stereoScheps),controls=In.kr(profileBus,20);
                Out.ar(out,input.blend(wet,Lag.kr(controls[14],0.02))*Lag.kr(controls[15],0.02));
            });
        };
        if(options[\sharedFX] ? false){sharedDefinitions[\um]=SynthDescLib.global.at((prefix++"UM").asSymbol);sharedDefinitions[\scheps]=SynthDescLib.global.at((prefix++"StereoScheps").asSymbol)};
        if(options[\celloStutter] ? false){
            var definition=AWBCelloStutter.compile((prefix++"CelloStutter").asSymbol,spec[\celloStutter],if(options[\celloScheps] ? false){2}{1});
            profileDefinitions[\vcfx]=definition;rack.installDef(definition.name,definition);
        };
        this.def(\VC,{|out=0,channel=0,gain=1|Out.ar(out,SoundIn.ar(channel)*Lag.kr(gain,0.02)*if((options[\celloScheps] ? false) or:{options[\celloStutter] ? false}){1}{[1,1]})});
        if(options[\celloScheps] ? false){this.def(\CelloScheps,{|in=0,out=0|Out.ar(out,VSTPlugin.ar(In.ar(in,1),1,id:\celloScheps)!2)})};
        this.def(\Mic,{|out=0,channel=0,gain=1|Out.ar(out,(SoundIn.ar(channel)*Lag.kr(gain,0.02))!2)});
        this.def(\Pro2,{|out=0,left=0,right=1,gain=1|Out.ar(out,SoundIn.ar([left,right])*Lag.kr(gain,0.02))});
        if(options[\fxProfiles] ? false){
            this.def(\Deci,{|in=0,out=0,profileBus=0,wet=0,level=1|
                var controls=In.kr(profileBus,11),input=In.ar(in,2),low,mid,high,filtered,fx;
                low=LPF.ar(input,339);high=HPF.ar(input,3890);mid=input-low-high;
                filtered=low*controls[5].dbamp+mid*controls[6].dbamp+high;
                fx=VSTPlugin.ar(filtered*Lag.kr(controls[2],0.02),2,id:\deci);
                Out.ar(out,input.blend(fx,Lag.kr(controls[0],0.02))*Lag.kr(controls[1],0.02)*Lag.kr(level,0.02));
            });
            this.def(\Spark,{|in=0,out=0,profileBus=0,level=1|
                var controls=In.kr(profileBus,24),input=In.ar(in,2),parallel,delayed,tail,signal,pre;
                pre=input*Lag.kr(controls[20],0.02);
                parallel=VSTPlugin.ar(pre,2,id:\spiral)+VSTPlugin.ar(pre,2,id:\upper)+VSTPlugin.ar(pre,2,id:\lower);
                signal=pre.blend(parallel,Lag.kr(controls[17],0.02))*controls[21];
                delayed=VSTPlugin.ar(signal,2,id:\delay);tail=VSTPlugin.ar(delayed,2,id:\tailDeci);
                signal=delayed.blend(tail,Lag.kr(controls[18],0.02))*Lag.kr(controls[19],0.02);
                Out.ar(out,VSTPlugin.ar(signal,2,id:\sparkTexture)*Lag.kr(level,0.02));
            });
        }{
        this.def(\Deci,{|in=0,out=0,wet=0,level=1|
            var input=In.ar(in,2),fx=VSTPlugin.ar(input,2,id:\deci);
            Out.ar(out,input.blend(fx,Lag.kr(wet,0.02))*gains[\deci]*Lag.kr(level,0.02));
        });
        this.def(\Spark,{|in=0,out=0,spiralLevel=0.333333,upperLevel=0.333333,lowerLevel=0.333333,tailMix=0,level=1|
            var input=In.ar(in,2),parallel,delayed,tail,signal;
            parallel=(VSTPlugin.ar(input,2,id:\spiral)*Lag.kr(spiralLevel,0.02))
                +(VSTPlugin.ar(input,2,id:\upper)*Lag.kr(upperLevel,0.02))
                +(VSTPlugin.ar(input,2,id:\lower)*Lag.kr(lowerLevel,0.02));
            delayed=VSTPlugin.ar(parallel,2,id:\delay);
            tail=VSTPlugin.ar(delayed,2,id:\tailDeci);
            signal=delayed.blend(tail,Lag.kr(tailMix,0.02))*gains[\spark];
            Out.ar(out,VSTPlugin.ar(signal,2,id:\sparkTexture)*Lag.kr(level,0.02));
        });
        };
        if(options[\fuzzPlugin] ? false){
            if(options[\fxProfiles] ? false){
                this.def(\Fuzz,{|in=0,out=0,profileBus=0,level=1|
                    var controls=In.kr(profileBus,12),input=In.ar(in,2)*Lag.kr(controls[6],0.02);
                    Out.ar(out,VSTPlugin.ar(input,2,id:\fuzz)*Lag.kr(controls[7],0.02)*Lag.kr(level,0.02));
                });
            }{
                this.def(\Fuzz,{|in=0,out=0,level=1|Out.ar(out,VSTPlugin.ar(In.ar(in,2),2,id:\fuzz)*gains[\fuzz]*Lag.kr(level,0.02))});
            };
        }{
        this.def(\Fuzz,{|in=0,out=0,drive=8,bias=0,highpass=40,lowpass=12000,level=1|
            var input=HPF.ar(In.ar(in,2),highpass),fx;
            fx=(input*Lag.kr(drive,0.02)+Lag.kr(bias,0.02)).tanh-bias.tanh;
            Out.ar(out,LPF.ar(LeakDC.ar(fx),lowpass)*gains[\fuzz]*Lag.kr(level,0.02));
        });
        };
        if(profileMode){
            // Control hub retains the public inputLevel/level controls. The
            // five heavy processors live in independently pauseable Groups.
            this.def(\Verb,{|in=0,out=0,levelOut=0,inputLevel=1,level=1|
                Out.ar(out,In.ar(in,2)*Lag.kr(inputLevel,0.02));
                ReplaceOut.kr(levelOut,Lag.kr(level,0.02));
            });
            [[\VerbEarth,0],[\VerbComposite,2],[\VerbEcho,4]].do{|entry|
                var start=entry[1];this.def(entry[0],{|in=0,out=0,inputGate=1,outputGate=1|
                    var input=In.ar(in,2)*Lag.kr(inputGate,0.02),irIDs=[\irLeft.ir(0),\irRight.ir(0)];
                    Out.ar(out,Array.fill(2,{|i|PartConv.ar(input[i],fft,irIDs[i])})*Lag.kr(outputGate,0.05));
                });
            };
            this.def(\VerbTexture,{|in=0,out=0|Out.ar(out,VSTPlugin.ar(In.ar(in,2),2,id:\verbTexture))});
            this.def(\VerbShimmer,{|in=0,out=0|Out.ar(out,VSTPlugin.ar(In.ar(in,2),2,id:\shimmer))});
        }{
        this.def(\Verb,{|in=0,out=0,earthLevel=1,compositeLevel=0,textureLevel=0.021878,shimmerLevel=0.021878,echoLevel=0,inputLevel=1,level=1,
            earthVolume=0.495,compositeVolume=0,textureVolume=0.14,shimmerVolume=0.14,echoVolume=0|
            var input=In.ar(in,2)*Lag.kr(inputLevel,0.02),earth,composite,echo,texture,shimmer,pre;
            // In profile mode, Tool Vol + static Gain act BEFORE each processor.
            // Wet gain remains on the return; tails are never cut by profile gain.
            pre={|volume,gain=0|if(profileMode){AWBVerbMixProfile.amplitude(Lag.kr(volume,0.02))*gain.dbamp}{1}};
            earth=Array.fill(2,{|i|PartConv.ar(input[i]*pre.value(earthVolume,2.5),fft,irs[i])})
                *if(profileMode){1}{2.2.dbamp*Lag.kr(earthLevel,0.02)};
            composite=Array.fill(2,{|i|PartConv.ar(input[i]*pre.value(compositeVolume,-0.4),fft,irs[2+i])})
                *if(profileMode){(-8.4).dbamp}{(-8.8).dbamp*Lag.kr(compositeLevel,0.02)};
            texture=VSTPlugin.ar(input*pre.value(textureVolume),2,id:\verbTexture)
                *if(profileMode){1}{Lag.kr(textureLevel,0.02)};
            shimmer=VSTPlugin.ar(input*pre.value(shimmerVolume),2,id:\shimmer)
                *if(profileMode){1}{Lag.kr(shimmerLevel,0.02)};
            echo=Array.fill(2,{|i|PartConv.ar(input[i]*pre.value(echoVolume),fft,irs[4+i])})
                *(-20).dbamp*if(profileMode){1}{Lag.kr(echoLevel,0.02)};
            Out.ar(out,(earth+composite+texture+shimmer+echo)*Lag.kr(level,0.02));
        });
        };
    }
    verbTailSettings { |id|
        var position=[\earth,\composite,\echo].indexOf(id),minimum;
        minimum=if(position.notNil){
            (if(irInfo.notEmpty){irInfo[position][\frames]/this.irRate}{spec[\irSeconds][position]})+(2*spec[\fftSize]/this.irRate)
        }{if(id==\shimmer){2}{1}};
        ^AWFXTailGate.settings((minTail:minimum).putAll((options[\verbTails] ? ())[id] ? ()));
    }
    buildVerbProfile { |ctx|
        var mixOptions=(spec[\verbMix] ? ()).copy.putAll(options[\verbMix] ? ());
        var mix,hub,source=rack.bus,level=rack.bus(\control,1),gates=IdentityDictionary.new,controls=IdentityDictionary.new;
        var cleanup,buses=[source,level];
        cleanup={
            irProcessorRecords.values.do{|records|records.copy.do{|record|if(gates.values.includes(record[\gate])){records.remove(record)}}};
            gates.values.copy.do{|gate|gate.free(false);allVerbGates.remove(gate)};
            mix.tryPerform(\free,false);allVerbMixes.remove(mix);
            if(verbMixes[ctx[\slotID]]===mix){verbMixes.removeAt(ctx[\slotID]);verbBranchGates.removeAt(ctx[\slotID])};
            if(options[\sendFunction].notNil or:{server.serverRunning.not}){buses.do{|bus|if(bus.index.notNil){rack.releaseBus(bus)}}}{
                Routine({server.sync;buses.do{|bus|if(bus.index.notNil){rack.releaseBus(bus)}}}).play(SystemClock);
            };
        };
        ctx[\onDispose].value(cleanup);
        mixOptions[\sendFunction]=options[\sendFunction];
        mixOptions[\ownFunction]={|n,type,metadata|rack.own(n,type,metadata)};
        mixOptions[\disownFunction]={|n|instance.disown(n)};
        mix=AWBVerbMixProfile(ctx[\group],server,mixOptions);
        allVerbMixes.add(mix);verbMixes[ctx[\slotID]]=mix;verbBranchGates[ctx[\slotID]]=gates;
        hub=ctx[\synth].value((prefix++"Verb").asSymbol,[\in,ctx[\input].index,\out,source.index,\levelOut,level.index,\inputLevel,if(options[\audition] ? true){1}{0}]);
        mix.inputGain.mapTo(hub,\inputLevel);
        [[\earth,\VerbEarth,2.5,0],[\composite,\VerbComposite,-0.4,-8.4],[\texture,\VerbTexture,0,0],[\shimmer,\VerbShimmer,0,0],[\echo,\VerbEcho,0,-20]].do{|entry|
            var id=entry[0],gateOpts=mixOptions.copy,gate,processor;
            gateOpts[\name]="Verb / "++id;gateOpts[\gain]=entry[2].dbamp;gateOpts[\wetGain]=entry[3].dbamp;gateOpts[\levelBus]=level;
            gate=AWFXTailGate(source,mix.branch(id).outputBus,ctx[\output],ctx[\group],this.verbTailSettings(id),gateOpts);
            gates[id]=gate;allVerbGates.add(gate);
            if(AWBConvolutionIR.branchIDs.includes(id)){
                var position=AWBConvolutionIR.branchIDs.indexOf(id);
                processor=gate.createProcessor((prefix++entry[1]).asSymbol,[\irLeft,irSpectra[position*2].bufnum,\irRight,irSpectra[position*2+1].bufnum]);
                irProcessorRecords[id].add((gate:gate,node:processor));
            }{processor=gate.createProcessor((prefix++entry[1]).asSymbol)};
            if([\texture,\shimmer].includes(id)){controls.putAll(VSTPluginController.collect(processor))};
        };
        if(options[\sendFunction].isNil){mix.group.onFree({if(verbMixes[ctx[\slotID]]===mix){verbMixes.removeAt(ctx[\slotID])}})};
        ^(node:hub,controllers:controls);
    }
    install {
        [[\deci,\Deci,[\deci]],[\spark,\Spark,[\spiral,\upper,\lower,\delay,\tailDeci,\sparkTexture]],
         [\fuzz,\Fuzz,if(options[\fuzzPlugin] ? false){[\fuzz]}{[]}],[\verb,\Verb,[\verbTexture,\shimmer]]].do{|entry|
            var slot=entry[0],definition=(prefix++entry[1]).asSymbol,roles=entry[2];
            rack.registerProcessor(("awb52_"++slot).asSymbol,{|ctx|
                var args=[\in,ctx[\input].index,\out,ctx[\output].index],node,controls,result,profile;
                if((options[\fxProfiles] ? false) and:{([\deci,\spark]++if(options[\fuzzPlugin] ? false){[\fuzz]}{[]}).includes(slot)}){
                    var profileOptions=options.copy;profileOptions[\definition]=profileDefinitions[slot];profileOptions[\ownFunction]={|n,type,metadata|rack.own(n,type,metadata)};profileOptions[\disownFunction]={|n|instance.disown(n)};
                    profile=AWBFXMixProfile(slot,ctx[\group],server,spec[\fxMixes][slot],profileOptions);allFXMixes.add(profile);fxMixes[ctx[\slotID]]=profile;
                    ctx[\onDispose].value({profile.free(false);allFXMixes.remove(profile);if(fxMixes[ctx[\slotID]]===profile){fxMixes.removeAt(ctx[\slotID])}});
                    args=args.addAll([\profileBus,profile.outputBus.index]);
                };
                if(slot==\deci){args=args.addAll([\wet,if((options[\fullLoad] ? false) or:{options[\audition] ? true}){1}{0}])};
                if(slot==\verb){args=args.addAll([\inputLevel,if((options[\fullLoad] ? false) or:{options[\audition] ? true}){1}{0}])};
                if(options[\fullLoad] ? false){
                    if(slot==\spark){args=args.addAll([\spiralLevel,1,\upperLevel,1,\lowerLevel,1,\tailMix,1])};
                    if(slot==\verb){args=args.addAll([\earthLevel,1,\compositeLevel,1,\textureLevel,1,\shimmerLevel,1,\echoLevel,1])};
                };
                if(slot==\verb and:{options[\verbProfiles] ? false}){
                    result=this.buildVerbProfile(ctx);node=result[\node];controls=result[\controllers];
                }{
                    node=ctx[\synth].value(definition,args);controls=if(roles.isEmpty){()}{VSTPluginController.collect(node)};
                };
                nodes[ctx[\slotID]]=node;
                roles.do{|role|
                    var controller=controls[role],item=spec[\components][role];
                    var key=if(ctx[\slotID]==slot){role}{(ctx[\slotID].asString++"/"++role).asSymbol};
                    controllers[key]=controller;
                    if(options[\sendFunction].notNil){
                        this.emit(controller.openMsg(item[\key] ? item[\path],editor:false,mode:item[\mode]));this.emit(controller.setMsg(*this.parameterValues(role)));
                        if(profile.notNil){this.bindFXPlugin(profile,role,controller)};
                    }{
                        pending=pending+1;
                        controller.open(item[\key] ? item[\path],editor:false,mode:item[\mode],action:{|vst,ok|
                            if(closed.not){
                                if(ok){this.emit(vst.setMsg(*this.parameterValues(role)));if(profile.notNil){this.bindFXPlugin(profile,role,vst)};pending=pending-1;this.finishIfReady}{
                                    failure="Plugin failed to open: "++item[\path];failure.error;this.close;options[\onError].value(Error(failure),this);
                                };
                            };
                        });
                    };
                };
                node;
            });
            rack.setFX(slot,("awb52_"++slot).asSymbol,(tail:8));
        };
        if((options[\celloScheps] ? false) or:{options[\celloStutter] ? false}){this.installCello};
        if(options[\sharedFX] ? false){this.installShared};
        rack.applyMix(spec[\initialMix]);
        if((options[\fullLoad] ? false) or:{options[\audition] ? true}){if((options[\fxProfiles] ? false).not){this.setEffect(\deci,\wet,1)}}{
            // Literal snapshot: Deci's outer wet mix is zero and Verb input Tool is -Inf.
            this.setEffect(\verb,\inputLevel,0);
        };
    }
    // Each FX generation owns its own profile. Plugin mappings are server KR
    // reads, not a stream of language-side OSC parameter edits.
    bindFXPlugin { |profile,role,controller|
        var maps=(deci:[\depth,\depth,\folding,\folding],spiral:[\wetdry,\spiralWet],
            upper:[\wetdry,\upperWet,\octave,\upperOctave,\pitchshift,\upperPitch,\feedback,\upperFeedback,\cents,\upperCents,\time,\upperTime],
            lower:[\wetdry,\lowerWet,\octave,\lowerOctave,\pitchshift,\lowerPitch,\feedback,\lowerFeedback],
            delay:[\wetdry,\delayWet,\feedback,\delayFeedback,\envmodulate,\delayAuto,\time,\delayTime],
            tailDeci:[\depth,\tailDepth,\folding,\tailFolding],
            fuzz:[\Mix,\mix,\Gain,\gain,\Output,\output,\Input,\input,'Low-Mid Gain',\lowMidGain,'High-Mid Gain',\highMidGain]);
        var pairs=maps[role] ? [],args=List.new,names=spec[\components][role][\parameterNames];
        pairs.clump(2).do{|pair|var i=names.indexOfEqual(pair[0].asString);if(i.isNil){Error("Missing FX modulation parameter: "++role++"/"++pair[0]).throw};args.add(i).add(profile.bus(pair[1]))};
        if(args.notEmpty){controller.mapMsg(*args.asArray).do{|message|this.emit(message)}};^this;
    }
    fxMix { |slot|if(slot.asSymbol==\vcfx){^celloStutter ?? {Error("Enable celloStutter and wait for readiness").throw}};^fxMixes[slot.asSymbol] ?? {Error("Enable fxProfiles and wait for this slot").throw} }
    installShared {
        var chainOptions=options.copy;
        sharedInputBus=rack.bus;pending=pending+1;
        [\mast,\fuzz,\deci,\spark].do{|id|rack.setReturnDestination(id,sharedInputBus)};
        chainOptions[\definitions]=sharedDefinitions;
        chainOptions[\onReady]={|shared|if(closed.not){pending=pending-1;if(options[\sendFunction].isNil){this.finishIfReady}}};
        chainOptions[\onError]={|error,shared|failure=error.errorString;this.close;options[\onError].value(error,this)};
        chainOptions[\onClosed]={|shared|
            if(closed.not and:{rack.closed.not} and:{rack.ready}){[\mast,\fuzz,\deci,\spark].do{|id|rack.setReturnDestination(id,nil)}};
        };
        sharedChain=AWBSharedFXChain.open(spec,sharedInputBus,rack.masterBus,rack.rootGroup,rack.masterGroup,chainOptions);^this;
    }
    sharedMix {^sharedChain.tryPerform(\profile) ?? {Error("Enable sharedFX and wait for readiness").throw}}
    installCello {
        var item=spec[\components][\celloScheps],controller,stutterOptions;
        celloInputBus=rack.bus(\audio,1);celloSourceGroup=rack.group(rack.sourceGroup,"Cello input / Scheps / Stutter");
        celloProcessedBus=if((options[\celloStutter] ? false) and:{options[\celloScheps] ? false}){rack.bus(\audio,2)}{rack.inputFor(\vc)};
        if(options[\celloStutter] ? false){
            stutterOptions=options.copy;stutterOptions[\definition]=profileDefinitions[\vcfx];
            stutterOptions[\ownFunction]={|node,type,metadata|rack.own(node,type,metadata)};
            stutterOptions[\disownFunction]={|node|instance.disown(node)};
            if(options[\sendFunction].notNil){[AWParam.synthDef,AWParam.routeDef].do{|def|this.emit([\d_recv,def.asBytes])}};
        };
        if(options[\celloScheps] ? false){
            nodes[\celloScheps]=rack.synth((prefix++"CelloScheps").asSymbol,[\in,celloInputBus.index,\out,celloProcessedBus.index],celloSourceGroup,"Cello 1 Scheps 73 Mono");
            controller=VSTPluginController.collect(nodes[\celloScheps])[\celloScheps];controllers[\celloScheps]=controller;
            if(options[\sendFunction].notNil){
                this.emit(controller.openMsg(item[\key],editor:false,mode:item[\mode]));this.emit(controller.setMsg(*item[\params]));
            }{
                pending=pending+1;
                controller.open(item[\key],editor:false,mode:item[\mode],action:{|vst,ok|
                    if(closed.not){if(ok){this.emit(vst.setMsg(*item[\params]));pending=pending-1;this.finishIfReady}{failure="Cello Scheps failed to open";this.close;options[\onError].value(Error(failure),this)}};
                });
            };
        };
        if(options[\celloStutter] ? false){celloStutter=AWBCelloStutter(if(options[\celloScheps] ? false){celloProcessedBus}{celloInputBus},rack.inputFor(\vc),celloSourceGroup,spec[\celloStutter],stutterOptions)};^this;
    }
    // Apply only wet/dry and bypass overrides; do not turn every plugin parameter up.
    parameterValues { |role|
        var item=spec[\components][role.asSymbol],values=item[\params].copy,names=item[\parameterNames];
        if(options[\fullLoad] ? false){
            names.do{|name,index|
                var target,normalized=name.toLower;
                // Search parameter keys rather than possibly identical numeric values.
                target=values.clump(2).detectIndex{|pair|pair[0]==index};
                if(target.notNil){
                    if(["wetdry","mix"].includesEqual(normalized)){values[target*2+1]=1};
                    if(normalized=="bypass"){values[target*2+1]=0};
                };
            };
        };^values;
    }
    finishIfReady {
        if(closed.not and:{pending==0} and:{[\deci,\spark,\fuzz,\verb].every{|id|nodes[id].notNil}} and:{ready.not} and:{(options[\celloStutter] ? false).not or:{celloStutter.notNil}} and:{(options[\sharedFX] ? false).not or:{sharedChain.notNil and:{sharedChain.ready}}}){
            ready=true;this.changed(\ready);options[\onReady].value(this);
        };
    }
    setEffect { |slot,key,value|
        var limits=(wet:[0,1],tailMix:[0,1],spiralLevel:[0,4],upperLevel:[0,4],lowerLevel:[0,4],earthLevel:[0,4],compositeLevel:[0,4],textureLevel:[0,4],shimmerLevel:[0,4],echoLevel:[0,4],inputLevel:[0,4],level:[0,4],drive:[0.1,64],bias:[-1,1],highpass:[10,2000],lowpass:[2000,20000]);
        var node=nodes[slot.asSymbol],range=limits[key.asSymbol],desc;
        if(closed or:{node.isNil}){Error("FX unavailable").throw};
        desc=SynthDescLib.global.at(node.defName);
        if(range.isNil or:{desc.controls.any{|c|c.name==key.asSymbol}.not} or:{value.isNumber.not} or:{value.isNaN} or:{value<range[0]} or:{value>range[1]}){Error("Invalid FX control or value").throw};
        if(slot.asSymbol==\verb and:{key.asSymbol==\inputLevel} and:{verbMixes[slot.asSymbol].notNil}){verbMixes[slot.asSymbol].inputGain.setBase(value);^value};
        if(fxMixes[slot.asSymbol].notNil and:{fxMixes[slot.asSymbol].params[key.asSymbol].notNil}){fxMixes[slot.asSymbol].param(key).setBase(value)}{this.emit([\n_set,node.nodeID,key,value])};^value;
    }
    connectInputs { |vc,pro2,mic|
        if(ready.not or:{closed}){Error("Wait for set readiness before connecting inputs").throw};
        if(vc.size!=1 or:{pro2.size!=2} or:{(vc++pro2).any{|i|i.isKindOf(Integer).not or:{i<0} or:{i>=server.options.numInputBusChannels}}}){Error("VC needs one and Pro 2 two valid zero-based hardware input indices").throw};
        if(mic.notNil){
            if(mic.isArray.not or:{mic.size!=1} or:{mic[0].isKindOf(Integer).not} or:{mic[0]<0} or:{mic[0]>=server.options.numInputBusChannels}){Error("Mic needs one valid zero-based hardware input index").throw};
            rack.inputFor(\mic); // validate destination before creating any source nodes
        };
        if(nodes[\vc].notNil or:{nodes[\pro2].notNil} or:{nodes[\mic].notNil}){Error("Hardware inputs already connected; disconnect first").throw};
        nodes[\vc]=rack.synth((prefix++"VC").asSymbol,[\out,(celloInputBus ? rack.inputFor(\vc)).index,\channel,vc[0]],celloSourceGroup ? rack.sourceGroup,"VC hardware input");
        if(celloSourceGroup.notNil){this.emit(nodes[\vc].moveBeforeMsg(nodes[\celloScheps] ?? {celloStutter.group}))};
        nodes[\pro2]=rack.synth((prefix++"Pro2").asSymbol,[\out,rack.inputFor(\pro2).index,\left,pro2[0],\right,pro2[1]],rack.sourceGroup,"Pro 2 hardware input");
        if(mic.notNil){nodes[\mic]=rack.synth((prefix++"Mic").asSymbol,[\out,rack.inputFor(\mic).index,\channel,mic[0]],rack.sourceGroup,"Mic hardware input")};^this;
    }
    // Use this adapter entry point for voices/samples as well as hardware.
    // Cello is mono before Scheps; the rack-facing processed signal is stereo.
    inputFor { |id|
        if(ready.not or:{closed}){Error("Wait for set readiness before writing inputs").throw};
        ^if(id.asSymbol==\vc and:{celloInputBus.notNil}){celloInputBus}{rack.inputFor(id)};
    }
    disconnectInputs {
        [\vc,\pro2,\mic].do{|id|var node=nodes.removeAt(id);if(node.notNil){this.emit(node.freeMsg)}};^this;
    }
    verbMix { |slot=\verb|^verbMixes[slot.asSymbol] ?? {Error("Enable verbProfiles and wait for this slot").throw} }
    verbBranch { |id,slot=\verb|^verbBranchGates[slot.asSymbol].tryPerform(\at,id.asSymbol) ?? {Error("Unknown/unavailable Verb branch").throw} }
    plugin { |role,slot|if([\um,\stereoScheps].includes(role.asSymbol) and:{slot.isNil}){^sharedChain.tryPerform(\plugin,role)};^controllers[if(slot.isNil){role.asSymbol}{(slot.asString++"/"++role).asSymbol}] }
    convolutionSettings { |id|
        if(AWBConvolutionIR.branchIDs.includes(id.asSymbol).not){Error("Unknown convolution branch").throw};
        ^AWBConvolutionIR.settings((spec[\irEnvelopes] ? ())[id.asSymbol]);
    }
    convolutionSource { |id|
        var position=AWBConvolutionIR.branchIDs.indexOf(id.asSymbol);
        if(position.isNil or:{irInfo.isEmpty}){Error("Convolution editor requires file IRs").throw};^irInfo[position].copy.put(\preparedPath,irPreparedPaths[id.asSymbol]);
    }
    convolutionGUI { if((options[\verbProfiles] ? false).not){Error("Convolution editor requires Verb profile mode").throw};^AWBConvolutionEditor.open(this) }
    applyConvolution { |id,given,action|
        var position,settings,info;
        id=id.asSymbol;position=AWBConvolutionIR.branchIDs.indexOf(id);
        if(closed or:{ready.not} or:{irEditingBusy} or:{position.isNil} or:{irInfo.isEmpty} or:{(options[\verbProfiles] ? false).not}){Error("Wait for a ready file-IR Verb profile; one IR edit at a time").throw};
        settings=AWBConvolutionIR.settings(given);info=this.convolutionSource(id);irEditingBusy=true;
        irEditRoutine=Routine({
            var path=("TMPDIR".getenv ? "/tmp")+/+(prefix++"-edited-"++UniqueID.next++".wav");
            var fft=spec[\fftSize],fresh=List.new,rawBuffers=List.new,old=irSpectra.copyRange(position*2,position*2+1),previous=List.new,cleanup,editError;
            try {
                AWBConvolutionIR.write(info[\path],path,info[\frames],this.irRate,settings);assets.add(path);
                2.do{|channel|
                    var raw=Buffer.new(server,info[\frames],1),spectrum=Buffer.new(server,fft*((info[\frames]/(fft/2)).ceil.asInteger),1);
                    rawBuffers.add(raw);instance.own(raw,\buffer,(name:"IR edit preparation input"));fresh.add(spectrum);buffers.add(spectrum);instance.own(spectrum,\buffer,(name:"Edited Verb IR "++id++" / "++channel));
                    this.emit(raw.allocReadChannelMsg(path,0,info[\frames],[if(info[\sourceChannels]==1){0}{channel}]));this.emit(spectrum.allocMsg);
                    if(options[\sendFunction].isNil){server.sync};this.emit([\b_gen,spectrum.bufnum,\PreparePartConv,raw.bufnum,fft]);
                    if(options[\sendFunction].isNil){server.sync};this.emit(raw.freeMsg);instance.disown(raw);rawBuffers.remove(raw);
                };
                if(closed){Error("Set closed during IR preparation").throw};
                // Defaults in the SynthDef are never reused: every clone receives current buffers.
                fresh.do{|buffer,i|irSpectra[position*2+i]=buffer};
                irProcessorRecords[id].copy.do{|record|
                    if(record[\gate].closed.not){
                        var node=record[\gate].createProcessor((prefix++[\VerbEarth,\VerbComposite,\VerbEcho][position]).asSymbol,
                            [\irLeft,fresh[0].bufnum,\irRight,fresh[1].bufnum,\outputGate,0]);
                        previous.add(record.copy.put(\replacement,node));record[\node]=node;
                        this.emit(node.setMsg(\outputGate,1));this.emit(previous.last[\node].setMsg(\inputGate,0));
                    };
                };
                spec[\irEnvelopes]=(spec[\irEnvelopes] ? ()).copy.put(id,settings);irPreparedPaths[id]=path;
                cleanup={
                    if(closed.not){
                        previous.do{|record|if(record[\gate].closed.not){record[\gate].releaseProcessor(record[\node])}};
                        old.do{|buffer|this.emit(buffer.freeMsg);instance.disown(buffer);buffers.remove(buffer)};
                    };
                };
                // Stop feeding the old IR; its full remaining tail stays on the return.
                if(options[\sendFunction].notNil){options[\irScheduleFunction].value((info[\frames]/this.irRate)+(2*fft/this.irRate)+0.1,cleanup)}{
                    var routine;routine=Routine({((info[\frames]/this.irRate)+(2*fft/this.irRate)+0.1).wait;cleanup.value;irCleanupRoutines.remove(thisThread)}).play(SystemClock);irCleanupRoutines.add(routine);
                };
                irEditingBusy=false;
            }{|error|
                if(closed.not){
                    old.do{|buffer,i|irSpectra[position*2+i]=buffer};
                    previous.do{|oldRecord|var current=irProcessorRecords[id].detect{|record|record[\gate]===oldRecord[\gate]};
                        if(current.notNil and:{oldRecord[\gate].closed.not}){oldRecord[\gate].releaseProcessor(oldRecord[\replacement]);current[\node]=oldRecord[\node];this.emit(oldRecord[\node].setMsg(\inputGate,1))};
                    };
                    rawBuffers.do{|buffer|this.emit(buffer.freeMsg);instance.disown(buffer)};
                    fresh.do{|buffer|this.emit(buffer.freeMsg);instance.disown(buffer);buffers.remove(buffer)};
                };
                irEditingBusy=false;editError=error;error.reportError;
            };
            action.value(editError);if(editError.isNil){this.changed(\convolution,id)};
        }).play(SystemClock);^this;
    }

    gui { |opts|if(ready.not){Error("Wait for set readiness before opening its GUI").throw};^rack.gui(opts) }
    closedByInstance {
        closed=true;ready=false;irEditRoutine.tryPerform(\stop);irCleanupRoutines.do(_.stop);irCleanupRoutines.clear;irProcessorRecords.values.do(_.clear);if(setupRoutine!==thisThread){setupRoutine.tryPerform(\stop)};dependant.tryPerform(\remove);dependant=nil;
        if(options[\sendFunction].isNil){assets.do{|p|File.delete(p)}};
        allVerbGates.copy.do{|gate|gate.free(false)};allVerbGates.clear;verbBranchGates.clear;
        allVerbMixes.copy.do{|mix|mix.free(false)};allVerbMixes.clear;verbMixes.clear;
        allFXMixes.copy.do{|mix|mix.free(false)};allFXMixes.clear;fxMixes.clear;
        sharedChain.tryPerform(\close);celloStutter.tryPerform(\free,false);
        controllers.clear;nodes.clear;this.changed(\closed);
    }
    close {
        if(closed){^this};
        if(options[\sendFunction].notNil){buffers.do{|b|instance.disown(b);if(b.bufnum.notNil){this.emit(b.freeMsg)}}};
        allVerbGates.copy.do{|gate|gate.free};allVerbGates.clear;verbBranchGates.clear;
        allVerbMixes.copy.do{|mix|mix.free};allVerbMixes.clear;verbMixes.clear;
        allFXMixes.copy.do{|mix|mix.free};allFXMixes.clear;fxMixes.clear;
        sharedChain.tryPerform(\close);celloStutter.tryPerform(\free);
        instance.close;^this;
    }
    free { ^this.close }
}
