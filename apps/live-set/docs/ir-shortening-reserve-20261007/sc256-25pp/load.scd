(
var dir=thisProcess.nowExecutingPath.dirname,server,setup,pilot,silencer,sources=List.new,responder,token,finish,options,sample,meter,meterResponder,stressBus,stressGroup,stressNodes=List.new,baseInstance,base,delays,paramView,scopeBuffers=List.new,scopeNodes=List.new;
token="AWB52_DROPOUT_TOKEN".getenv;
options=ServerOptions.new.device_("1248").numInputBusChannels_(3).numOutputBusChannels_(4).memSize_(262144).sampleRate_(44100).hardwareBufferSize_(512).blockSize_("AWB52_BLOCK".getenv.asInteger);
options.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins",dir+/+"plugins","/Users/willy/awb/apps/live-set/.build"];
Server.program="exec "++(dir+/+"audit-launch").shellQuote;
server=Server(\awb52Dropout,NetAddr("127.0.0.1","AWB52_DROPOUT_PORT".getenv.asInteger),options);
finish={|code|
    Routine({
        baseInstance.tryPerform(\close);scopeNodes.do(_.free);scopeBuffers.do(_.free);meterResponder.tryPerform(\free);meter.tryPerform(\free);responder.tryPerform(\free);setup.tryPerform(\close);pilot.tryPerform(\free);silencer.tryPerform(\free);sample.tryPerform(\free);stressGroup.tryPerform(\free);stressBus.tryPerform(\free);
        if(server.serverRunning){server.sync};server.quit;
        SystemClock.sched(1,{code.exit;nil});
    }).play(SystemClock);
};
SystemClock.sched(1100,{"AWB52 dropout timed out".error;finish.value(1);nil});
server.waitForBoot({
    Routine({
        try {
            SynthDef(\awb52Pilot,{|gain=1,phase=0|var tone=SinOsc.ar([997,733])*0.00316227766;Out.ar(2,Select.ar(gain>0,[DC.ar(0)!2,Select.ar(phase>0,[tone,tone.neg])]))}).send(server);
            server.sync;pilot=Synth(\awb52Pilot,target:server.defaultGroup);server.sync;
            SynthDef(\awb52Reserve,{|bus=0|var x=SinOsc.ar(Array.series(32,103,41.7));x=RLPF.ar(x,Array.series(32,401,137.9),0.3);Out.ar(bus,Mix((x*3).tanh)*0.00001)}).send(server);
            stressBus=Bus.audio(server,1);stressGroup=Group.tail(server.defaultGroup);
            if(("AWB52_PLUGIN_WORKERS".getenv ? "0").asInteger>0){VSTPlugin.initDSPThreads(server,"AWB52_PLUGIN_WORKERS".getenv.asInteger)};server.sync;
            responder=OSCFunc({|msg,time,address|
                ("AWB52_COMMAND ip="++address.ip++" tokenMatch="++(msg[1].asString==token)++" op="++msg[2]).postln;
                if(address.ip=="127.0.0.1" and:{msg[1].asString==token}){
                    address.sendMsg('/awb52/stage',token,"command received "++msg[2]);
                    switch(msg[2].asSymbol,
                        \stress,{
                            Routine({
                                var count=(msg[3] ? 0).asInteger.clip(0,100);
                                while{stressNodes.size>count}{stressNodes.removeAt(stressNodes.size-1).free};
                                while{stressNodes.size<count}{stressNodes.add(Synth(\awb52Reserve,[\bus,stressBus.index],stressGroup))};
                                server.sync;File.use(dir+/+"stress-state.json","w",{|file|file.write("{\"count\":"++count++"}")});
                            }).play(SystemClock);
                        },
                        \checkPlugins,{
                            var checkID=msg[3].asInteger,rows=List.new;
                            setup.spec[\components].keys.do{|role|
                                var plugin=setup.plugin(role);
                                if(plugin.isNil or:{plugin.isOpen.not}){Error("Benchmark plugin not open: "++role).throw};
                                plugin.get(0,{|value|
                                    rows.add("{\"role\":\""++role++"\",\"open\":true,\"parameter0\":"++value++",\"latencySamples\":"++(plugin.latency ? 0)++"}");
                                    if(rows.size==13){File.use(dir+/+"plugin-state.json","w",{|file|file.write("{\"checkID\":"++checkID++",\"plugins\":["++rows.join(",")++"]}")})};
                                });
                            };
                        },                        \load,{
                            try { if(setup.isNil){
                                var spec=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
                                spec=AWBDelayRack.configure(spec);spec[\rack][\out]=0;
                                spec[\irMaxSeconds]=("AWB52_IR_CAP".getenv ? "30").asFloat;
                                spec[\fftSize]=("AWB52_FFT_SIZE".getenv ? "2048").asInteger;
                                setup=AWBFirstPassSet.open(spec,(server:server,track:false,fullLoad:false,verbProfiles:true,fxProfiles:true,fuzzPlugin:true,celloScheps:true,sharedFX:true,controlSends:true,benchmarkPhase:{|label|address.sendMsg('/awb52/stage',token,label)},onError:{|error,set|finish.value(1)},onReady:{|set|
                                    Routine({
                                        try {
                                            var rack=set.rack,def,voice,buses;
                                            File.use(dir+/+"actual-ir-info.json","w",{|f|f.write(AWBDelayRack.json((irInfo:set.irInfo.asArray))) });
                                            address.sendMsg('/awb52/stage',token,"all plugins ready / cello begin");
                                            sample=Buffer.readChannel(server,"AWB52_SAMPLE".getenv,channels:[0]);server.sync;
                                            def=SynthDef(\awb52CelloVoice,{|out=0,buf=0,amp=0.3|Out.ar(out,PlayBuf.ar(1,buf,BufRateScale.kr(buf),loop:1)*amp)});
                                            rack.installDef(def.name,def);server.sync;
                                            voice=rack.synth(def.name,[\out,set.inputFor(\vc).index,\buf,sample.bufnum],rack.sourceGroup,"Recorded cello before Scheps");
                                            server.sendMsg(*voice.moveBeforeMsg(rack.rootGroup));sources.add(voice);
                                            rack.slotIDs.do{|fx|rack.setSend(\vc,fx,1)};
                                            AWBControlSendProfile.sendIDs.do{|id|rack.setSend(\vc,id,1)};
                                            buses=AWBControlSendProfile.baseLaunchBuses(rack);
                                            set.verbMix.selector.setAmount(0.8);set.verbMix.addModulation(\celloFollower,rack.followerFor('mod-verb',\f_verb),0.4);
                                            set.fxMix(\deci).addModulation(\a,\celloFollower,rack.followerFor('mod-deci',\f_deci),0.4);
                                            [\aSpark,\aTail,\aPitch,\aTailShape].do{|id|set.fxMix(\spark).addModulation(id,\celloFollower,rack.followerFor('mod-spark',\f_spark),0.4)};
                                            set.fxMix(\fuzz).addModulation(\aFuzz,\celloFollower,rack.followerFor('mod-fuzz',\f_fuzz),0.4);
                                            [\aMix,\aDepth,\aRate,\aNoise,\aWonk].do{|id|set.sharedMix.addModulation(id,\celloFollower,rack.followerFor('mod-um',\f_um),0.4)};
                                            [\main,\earth,\diffusion,\innerDepth,\innerRate,\shape].do{|id|set.sharedMix.param(id).set(0.5)};
                                            set.sharedMix.param(\schertlerMix).set(1);set.sharedMix.param(\aSchertler).set(1);
                                            baseInstance=AWBaseTool.open((name:"Quick live-load test",params:[]),(server:server,track:false));base=baseInstance.tool;
                                            base.whenReady({base.bindFirstPass(set,own:false);delays=base.bindDelays("/Users/willy/awb/apps/live-set/sc/plans/44100.scd".load,"/Users/willy/awb/apps/live-set/sc/plans/configuration.scd".load,{|d,error|
                                                if(error.notNil){error.reportError;finish.value(1)}{
                                                    ["B1","A2","B2","A1"].do{|id|d.setField("route","clean:"++id,"",0.25);d.setField("cell",id,"inputGain",1);d.setField("cell",id,"feedback",0.4)};
                                                    paramView=base.gui((launch:false));base.log("Quick load: cello, FX, followers and four recording delays");
                                                    File.use(dir+/+"live-binding.json","w",{|f|f.write(AWBDelayRack.json((instanceID:base.instance.instanceID,port:NetAddr.langPort,paramInstanceID:paramView.instanceID,rackInstanceID:rack.instance.instanceID,rackLibraryID:rack.config[\libraryID])))})
                                                }
                                            })});
                                            while({paramView.isNil},{0.02.wait});
                                            SynthDef(\awb52AudioMeter,{|follow=0|SendReply.kr(Impulse.kr(1),'/awb52/audio',[Amplitude.kr(Mix(In.ar(0,2))).lag(0.1),In.kr(follow)])}).send(server);
                                            SynthDef(\awb52ClearFXOutput,{ReplaceOut.ar(0,DC.ar(0)!2)}).send(server);server.sync;
                                            meter=Synth(\awb52AudioMeter,[\follow,buses[\ef_verb].index],rack.rootGroup,\addAfter);
                                            meterResponder=OSCFunc({|msg|address.sendMsg(*msg)},'/awb52/audio',server.addr);
                                            silencer=Synth(\awb52ClearFXOutput,target:server.defaultGroup,addAction:\addToTail);server.sync;
                                            server.sync;address.sendMsg('/awb52/stage',token,"voices created / full processing");File.use(dir+/+"loaded.json","w",{|file|file.write("{\"ready\":true,\"masterOutputBus\":0,\"fxOutputCleared\":true}")});
                                            "AWB52_DROPOUT_RACK_READY".postln;
                                        }{|error|error.reportError;finish.value(1)};
                                    }).play(SystemClock);
                                }));
                            } }{|error|error.reportError;finish.value(1)};
                        },
                        \scopes,{
                            Routine({var indexes=List.new;
                                SynthDef(\quickScope,{|bus=0,scope=0|ScopeOut2.ar(In.ar(bus,2)++[Phasor.ar(0,1,0,4194304)],scope,1024,512)}).send(server);server.sync;
                                [\vc,\pro2,\b1,\a2,\b2,\a1,\delbus,\sc1].do{|id|var b=ScopeBuffer.alloc(server,3);scopeBuffers.add(b);indexes.add(b.index);scopeNodes.add(Synth.tail(RootNode(server),\quickScope,[\bus,setup.rack.postFor(id).index,\scope,b.index]))};
                                server.sync;File.use(dir+/+"scopes.json","w",{|f|f.write(AWBDelayRack.json((port:server.addr.port,indexes:indexes.asArray)))})
                            }).play(SystemClock);
                        },
                        \close,{finish.value(0)}
                    );
                };
            },'/awb52/dropout');
            File.use(dir+/+"session.json","w",{|file|
                file.write("{\"port\":"++server.addr.port++",\"langPort\":"++NetAddr.langPort++",\"sclangPID\":"++thisProcess.pid++",\"scPID\":"++server.pid++",\"toneNode\":"++pilot.nodeID++",\"sampleRate\":"++server.sampleRate++",\"blockSize\":"++server.options.blockSize++",\"outputChannels\":4,\"inputChannels\":3,\"memoryPoolKiB\":262144,\"pilotBus\":2}");
            });
            "AWB52_DROPOUT_PILOT_READY".postln;
        }{|error|error.reportError;finish.value(1)};
    }).play(SystemClock);
},100,{"AWB52 dropout owned server boot failed".error;finish.value(1)});
server.boot;
)
