// Optional set adapter. The underlying AWBSendRackTool : Tool remains the native
// ToolInstance/NodeManager/Shell owner; this class does not create another host.
AWBFirstPassSet {
    var <instance, <rack, <server, <spec, <ready=false, <closed=false, <failure, <irInfo;
    var options, prefix, buffers, assets, nodes, controllers, dependant, setupRoutine, pending=0;
    *open { |specification, opts| ^super.new.init(specification,opts ? ()) }
    init { |specification, opts|
        spec=specification.deepCopy;options=opts;server=opts[\server] ? Server.default;
        if(options[\controlSends] ? false){spec[\rack]=AWBControlSendProfile.configure(spec[\rack]);spec[\rack][\spareFollowers]=options[\controlSpareCount] ? 0};
        prefix="awbFirstPass"++UniqueID.next;buffers=List.new;assets=List.new;
        nodes=IdentityDictionary.new;controllers=IdentityDictionary.new;irInfo=List.new;
        this.validate;
        instance=AWBSendRackTool.open(spec[\rack],opts);rack=instance.tool;
        dependant=SimpleController(instance).put(\closed,{this.closedByInstance});
        rack.whenReady({
            setupRoutine=Routine({
                try {
                    if(options[\controlSends] ? false){AWBControlSendProfile.install(rack)};
                    this.prepareIRs;this.makeDefs;
                    if(options[\sendFunction].isNil){server.sync};
                    if(closed.not){this.install;this.finishIfReady};
                }{|error|failure=error.errorString;error.reportError;this.close;options[\onError].value(error,this)};
            }).play(SystemClock);
        });^this;
    }
    validate {
        var fft=spec[\fftSize],sizes=spec[\irSeconds],files=spec[\irFiles],cap=spec[\irMaxSeconds] ? 30,rate=this.irRate;
        if(spec[\schema]!=1 or:{spec[\rack][\width]!=2}){Error("First-pass set needs schema 1 and a stereo rack").throw};
        if(fft.isKindOf(Integer).not or:{[512,1024,2048,4096,8192].includes(fft).not} or:{fft.div(2)%server.options.blockSize!=0} or:{fft.div(2)<(server.options.blockSize*2)}){Error("Invalid convolution FFT/block combination").throw};
        if(files.notNil){
            if(files.size!=3 or:{cap.isNumber.not} or:{cap.isNaN} or:{cap<=0} or:{cap>180}){Error("Need three IR files and a duration cap in (0, 180] seconds").throw};
            files.do{|path|
                var file=SoundFile.new,info;
                if(path.isString.not or:{file.openRead(path).not}){Error("Cannot read IR file: "++path).throw};
                info=(path:path,sourceFrames:file.numFrames,sourceChannels:file.numChannels,sampleRate:file.sampleRate);
                file.close;
                if([1,2].includes(info[\sourceChannels]).not or:{info[\sampleRate]!=rate} or:{info[\sourceFrames]<=0}){Error("IR needs mono/stereo audio at the server sample rate: "++path).throw};
                info[\frames]=info[\sourceFrames].min((cap*rate).floor.asInteger);
                if(info[\frames]<1){Error("IR cap leaves no audio frames").throw};
                irInfo.add(info);
            };
        }{
            if(sizes.size!=3 or:{sizes.any{|v|v.isNumber.not or:{v.isNaN} or:{v<=0} or:{v>30}}}){Error("Need three bounded IR durations").throw};
        };
        if(server.options.memSize<if(files.notNil){262144}{131072}){Error("First-pass rack needs memSize >= 262144 KiB with file IRs, or 131072 with stand-ins").throw};
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
        if(files.isNil){File.mkdir(dir)};
        3.do{|i|
            2.do{|channel|
                var frames,data,path,file,raw,spectrum,sourceChannel;
                if(closed){Error("Set closed during IR preparation").throw};
                if(files.notNil){
                    frames=irInfo[i][\frames];path=irInfo[i][\path];
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
                buffers.add(spectrum);instance.own(spectrum,\buffer,(name:"Verb IR "++i++" / "++channel));
                this.emit(raw.allocReadChannelMsg(path,0,frames,[sourceChannel]));this.emit(spectrum.allocMsg);
                if(options[\sendFunction].isNil){server.sync};
                this.emit([\b_gen,spectrum.bufnum,\PreparePartConv,raw.bufnum,fft]);
                if(options[\sendFunction].isNil){server.sync};
                this.emit(raw.freeMsg);
            };
        };
    }
    def { |id,function|
        var name=(prefix++id.asString).asSymbol;
        rack.installDef((prefix++id).asSymbol,SynthDef(name,function));^name;
    }
    makeDefs {
        var gains=spec[\containerGains],fft=spec[\fftSize],irs=buffers.collect(_.bufnum).asArray;
        this.def(\VC,{|out=0,channel=0,gain=1|Out.ar(out,SoundIn.ar(channel)!2*Lag.kr(gain,0.02))});
        this.def(\Pro2,{|out=0,left=0,right=1,gain=1|Out.ar(out,SoundIn.ar([left,right])*Lag.kr(gain,0.02))});
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
        this.def(\Fuzz,{|in=0,out=0,drive=8,bias=0,highpass=40,lowpass=12000,level=1|
            var input=HPF.ar(In.ar(in,2),highpass),fx;
            fx=(input*Lag.kr(drive,0.02)+Lag.kr(bias,0.02)).tanh-bias.tanh;
            Out.ar(out,LPF.ar(LeakDC.ar(fx),lowpass)*gains[\fuzz]*Lag.kr(level,0.02));
        });
        this.def(\Verb,{|in=0,out=0,earthLevel=1,compositeLevel=0,textureLevel=0.021878,shimmerLevel=0.021878,echoLevel=0,inputLevel=1,level=1|
            var input=In.ar(in,2)*Lag.kr(inputLevel,0.02),earth,composite,echo,texture,shimmer;
            earth=Array.fill(2,{|i|PartConv.ar(input[i],fft,irs[i])})*2.2.dbamp*Lag.kr(earthLevel,0.02);
            composite=Array.fill(2,{|i|PartConv.ar(input[i],fft,irs[2+i])})*(-8.8).dbamp*Lag.kr(compositeLevel,0.02);
            texture=VSTPlugin.ar(input,2,id:\verbTexture)*Lag.kr(textureLevel,0.02);
            shimmer=VSTPlugin.ar(input,2,id:\shimmer)*Lag.kr(shimmerLevel,0.02);
            echo=Array.fill(2,{|i|PartConv.ar(input[i],fft,irs[4+i])})*(-20).dbamp*Lag.kr(echoLevel,0.02);
            Out.ar(out,(earth+composite+texture+shimmer+echo)*Lag.kr(level,0.02));
        });
    }
    install {
        [[\deci,\Deci,[\deci]],[\spark,\Spark,[\spiral,\upper,\lower,\delay,\tailDeci,\sparkTexture]],
         [\fuzz,\Fuzz,[]],[\verb,\Verb,[\verbTexture,\shimmer]]].do{|entry|
            var slot=entry[0],definition=(prefix++entry[1]).asSymbol,roles=entry[2];
            rack.registerProcessor(("awb52_"++slot).asSymbol,{|ctx|
                var args=[\in,ctx[\input].index,\out,ctx[\output].index],node,controls;
                if(slot==\deci){args=args.addAll([\wet,if((options[\fullLoad] ? false) or:{options[\audition] ? true}){1}{0}])};
                if(slot==\verb){args=args.addAll([\inputLevel,if((options[\fullLoad] ? false) or:{options[\audition] ? true}){1}{0}])};
                if(options[\fullLoad] ? false){
                    if(slot==\spark){args=args.addAll([\spiralLevel,1,\upperLevel,1,\lowerLevel,1,\tailMix,1])};
                    if(slot==\verb){args=args.addAll([\earthLevel,1,\compositeLevel,1,\textureLevel,1,\shimmerLevel,1,\echoLevel,1])};
                };
                node=ctx[\synth].value(definition,args);
                nodes[ctx[\slotID]]=node;controls=if(roles.isEmpty){()}{VSTPluginController.collect(node)};
                roles.do{|role|
                    var controller=controls[role],item=spec[\components][role];
                    var key=if(ctx[\slotID]==slot){role}{(ctx[\slotID].asString++"/"++role).asSymbol};
                    controllers[key]=controller;
                    if(options[\sendFunction].notNil){
                        this.emit(controller.openMsg(item[\path],editor:false));this.emit(controller.setMsg(*this.parameterValues(role)));
                    }{
                        pending=pending+1;
                        controller.open(item[\path],editor:false,action:{|vst,ok|
                            if(closed.not){
                                if(ok){this.emit(vst.setMsg(*this.parameterValues(role)));pending=pending-1;this.finishIfReady}{
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
        rack.applyMix(spec[\initialMix]);
        if((options[\fullLoad] ? false) or:{options[\audition] ? true}){this.setEffect(\deci,\wet,1)}{
            // Literal snapshot: Deci's outer wet mix is zero and Verb input Tool is -Inf.
            this.setEffect(\verb,\inputLevel,0);
        };
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
        if(closed.not and:{pending==0} and:{nodes.size==4} and:{ready.not}){
            ready=true;this.changed(\ready);options[\onReady].value(this);
        };
    }
    setEffect { |slot,key,value|
        var limits=(wet:[0,1],tailMix:[0,1],spiralLevel:[0,4],upperLevel:[0,4],lowerLevel:[0,4],earthLevel:[0,4],compositeLevel:[0,4],textureLevel:[0,4],shimmerLevel:[0,4],echoLevel:[0,4],inputLevel:[0,4],level:[0,4],drive:[0.1,64],bias:[-1,1],highpass:[10,2000],lowpass:[2000,20000]);
        var node=nodes[slot.asSymbol],range=limits[key.asSymbol],desc;
        if(closed or:{node.isNil}){Error("FX unavailable").throw};
        desc=SynthDescLib.global.at(node.defName);
        if(range.isNil or:{desc.controls.any{|c|c.name==key.asSymbol}.not} or:{value.isNumber.not} or:{value.isNaN} or:{value<range[0]} or:{value>range[1]}){Error("Invalid FX control or value").throw};
        this.emit([\n_set,node.nodeID,key,value]);^value;
    }
    connectInputs { |vc,pro2|
        if(ready.not or:{closed}){Error("Wait for set readiness before connecting inputs").throw};
        if(vc.size!=1 or:{pro2.size!=2} or:{(vc++pro2).any{|i|i.isKindOf(Integer).not or:{i<0} or:{i>=server.options.numInputBusChannels}}}){Error("VC needs one and Pro 2 two valid zero-based hardware input indices").throw};
        if(nodes[\vc].notNil or:{nodes[\pro2].notNil}){Error("Hardware inputs already connected; disconnect first").throw};
        nodes[\vc]=rack.synth((prefix++"VC").asSymbol,[\out,rack.inputFor(\vc).index,\channel,vc[0]],rack.sourceGroup,"VC hardware input");
        nodes[\pro2]=rack.synth((prefix++"Pro2").asSymbol,[\out,rack.inputFor(\pro2).index,\left,pro2[0],\right,pro2[1]],rack.sourceGroup,"Pro 2 hardware input");^this;
    }
    disconnectInputs {
        [\vc,\pro2].do{|id|var node=nodes.removeAt(id);if(node.notNil){this.emit(node.freeMsg)}};^this;
    }
    plugin { |role,slot|^controllers[if(slot.isNil){role.asSymbol}{(slot.asString++"/"++role).asSymbol}] }
    gui { |opts|if(ready.not){Error("Wait for set readiness before opening its GUI").throw};^rack.gui(opts) }
    closedByInstance {
        closed=true;ready=false;if(setupRoutine!==thisThread){setupRoutine.tryPerform(\stop)};dependant.tryPerform(\remove);dependant=nil;
        if(options[\sendFunction].isNil){assets.do{|p|File.delete(p)}};
        controllers.clear;nodes.clear;this.changed(\closed);
    }
    close {
        if(closed){^this};
        if(options[\sendFunction].notNil){buffers.do{|b|instance.disown(b);if(b.bufnum.notNil){this.emit(b.freeMsg)}}};
        instance.close;^this;
    }
    free { ^this.close }
}
