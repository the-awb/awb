(
var dir=thisProcess.nowExecutingPath.dirname,server,setup,pilot,silencer,sources=List.new,responder,token,finish,options;
token="AWB52_DROPOUT_TOKEN".getenv;
options=ServerOptions.new.device_("1248").numInputBusChannels_(3).numOutputBusChannels_(4).memSize_(262144).sampleRate_(44100).hardwareBufferSize_(512);
options.ugenPluginsPath=["/Applications/SuperCollider.app/Contents/Resources/plugins",dir+/+"plugins"];
Server.program="exec "++(dir+/+"audit-launch").shellQuote;
server=Server(\awb52Dropout,NetAddr("127.0.0.1","AWB52_DROPOUT_PORT".getenv.asInteger),options);
finish={|code|
    Routine({
        responder.tryPerform(\free);setup.tryPerform(\close);pilot.tryPerform(\free);silencer.tryPerform(\free);
        if(server.serverRunning){server.sync};server.quit;
        SystemClock.sched(1,{code.exit;nil});
    }).play(SystemClock);
};
SystemClock.sched(1100,{"AWB52 dropout timed out".error;finish.value(1);nil});
server.waitForBoot({
    Routine({
        try {
            SynthDef(\awb52Pilot,{|gain=1,phase=0|Out.ar(2,SinOsc.ar([997,733],phase)*0.00316227766*gain)}).send(server);
            server.sync;pilot=Synth(\awb52Pilot,target:server.defaultGroup);server.sync;
            responder=OSCFunc({|msg,time,address|
                ("AWB52_COMMAND ip="++address.ip++" tokenMatch="++(msg[1].asString==token)++" op="++msg[2]).postln;
                if(address.ip=="127.0.0.1" and:{msg[1].asString==token}){
                    address.sendMsg('/awb52/stage',token,"command received "++msg[2]);
                    switch(msg[2].asSymbol,
                        \load,{
                            if(setup.isNil){
                                var spec=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
                                spec[\rack][\out]=0;
                                setup=AWBFirstPassSet.open(spec,(server:server,track:false,fullLoad:true,benchmarkPhase:{|label|address.sendMsg('/awb52/stage',token,label)},onError:{|error,set|finish.value(1)},onReady:{|set|
                                    Routine({
                                        try {
                                            var rack=set.rack,def;address.sendMsg('/awb52/stage',token,"all plugins ready / voices begin");
                                            def=SynthDef(\awb52DropoutVoice,{|out=0,amp=1,frequency=221|Out.ar(out,((SinOsc.ar([frequency,frequency*1.337])*0.025)+(PinkNoise.ar(0.005)!2))*amp)});
                                            rack.installDef(def.name,def);
                                            SynthDef(\awb52ClearFXOutput,{ReplaceOut.ar(0,DC.ar(0)!2)}).send(server);server.sync;
                                            silencer=Synth(\awb52ClearFXOutput,target:server.defaultGroup,addAction:\addToTail);server.sync;
                                            [\vc,\pro2].do{|id,index|
                                                [\verb,\deci,\spark,\fuzz,\mast].do{|fx|rack.setSend(id,fx,1)};
                                                sources.add(rack.synth(def.name,[\out,rack.inputFor(id).index,\frequency,if(index==0){221}{331}],rack.sourceGroup,"Dropout source"));
                                            };
                                            server.sync;address.sendMsg('/awb52/stage',token,"voices created / full processing");File.use(dir+/+"loaded.json","w",{|file|file.write("{\"ready\":true,\"masterOutputBus\":0,\"fxOutputCleared\":true}")});
                                            "AWB52_DROPOUT_RACK_READY".postln;
                                        }{|error|error.reportError;finish.value(1)};
                                    }).play(SystemClock);
                                }));
                            };
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
