(
var root="/Users/willy/awb",dir=thisProcess.nowExecutingPath.dirname,server,setup,source,meter,monitorBus,editor,checks=0,failures=List.new,failResponder;
var check={|label,ok|if(ok.not){Error("IR live check failed: "++label).throw};checks=checks+1;("PASS "++label).postln},finish;
server=Server(\awbIRFunctional,NetAddr("127.0.0.1",57973),ServerOptions.new.device_("1248").numInputBusChannels_(3).numOutputBusChannels_(4).memSize_(262144).sampleRate_(44100).hardwareBufferSize_(512).blockSize_(128));
Server.program="/Applications/SuperCollider.app/Contents/Resources/scsynth";
finish={|code|Routine({{editor.tryPerform(\close)}.defer;source.tryPerform(\free);meter.tryPerform(\free);setup.tryPerform(\close);monitorBus.tryPerform(\free);failResponder.tryPerform(\free);if(server.serverRunning){server.sync};server.quit;0.5.wait;code.exit}).play(SystemClock)};
SystemClock.sched(100,{"IR live test timeout".error;finish.value(1);nil});
server.waitForBoot({Routine({try{
    var spec=(root+/+"apps/rack/sc/sets/awb52/prepared/first-pass.scd").load;
    spec[\fftSize]=4096;VSTPlugin.initDSPThreads(server,2);
    failResponder=OSCFunc({|msg|failures.add(msg)},'/fail',server.addr);
    // Keep hardware silent for the entire functional run; inspect private branch output.
    SynthDef(\irFunctionalClear,{ReplaceOut.ar(0,DC.ar(0)!4)}).send(server);server.sync;
    setup=AWBFirstPassSet.open(spec,(server:server,track:false,verbProfiles:true,fxProfiles:true,celloScheps:true,fuzzPlugin:true,sharedFX:true,controlSends:true,onError:{finish.value(1)},onReady:{|set|
        Routine({try{
            var gate=set.verbBranch(\earth),groupID=gate.processorGroup.nodeID,done=false,error,oldNode,newNode,baseBuffers,observed=nil,configs,applied=false;
            var nodes={set.instance.ownedObjects.select{|node|node.isKindOf(Synth) and:{node.group===gate.processorGroup}}.asArray};
            Synth.tail(RootNode(server),\irFunctionalClear);
            SynthDef(\irFunctionalSource,{|out=0|Out.ar(out,SinOsc.ar(221)*0.01)}).send(server);
            SynthDef(\irFunctionalMeter,{|in=0,out=0|ReplaceOut.kr(out,Amplitude.kr(In.ar(in,2).abs.reduce(\max),0.01,0.05))}).send(server);server.sync;
            source=set.rack.synth(\irFunctionalSource,[\out,set.inputFor(\vc).index],set.rack.sourceGroup,"IR functional source");server.sendMsg(*source.moveBeforeMsg(set.rack.rootGroup));
            set.rack.setSend(\vc,\verb,1);set.verbMix.selector.setBase(0);set.verbMix.selector.setAmount(0);set.verbMix.branch(\earth).setBase(0.5);
            monitorBus=Bus.control(server,1);meter=Synth.tail(gate.group,\irFunctionalMeter,[\in,gate.outputBus.index,\out,monitorBus.index]);server.sync;0.5.wait;
            oldNode=nodes.value.first;baseBuffers=set.instance.ownedObjects.count{|object|object.isKindOf(Buffer)};
            check.value("one original Earth convolution processor",nodes.value.size==1);
            check.value("IR buffers are owned by native ToolInstance",baseBuffers==6);
            set.applyConvolution(\earth,(times:[0,0.05,0.8,1],levels:[0,1,1,0],gainDb: -6),{|e|error=e;done=true});
            check.value("concurrent IR apply rejected",try{set.applyConvolution(\echo,());false}{true});
            while{done.not}{0.1.wait};if(error.notNil){error.throw};server.sync;0.1.wait;
            check.value("processor group identity retained",set.verbBranch(\earth).processorGroup.nodeID==groupID);
            check.value("previous processor retained for its tail",nodes.value.size==2);
            check.value("old and new spectra owned during tail",set.instance.ownedObjects.count{|object|object.isKindOf(Buffer)}==(baseBuffers+2));
            oldNode.get(\inputGate,{|value|observed=value});while{observed.isNil}{0.01.wait};check.value("old convolution stops accepting new input",observed==0);
            observed=nil;monitorBus.get({|value|observed=value});while{observed.isNil}{0.01.wait};check.value("edited convolution produces finite nonzero audio",observed.isNaN.not and:{observed>0});
            check.value("settings recorded without compounding source gain",set.convolutionSettings(\earth)[\gainDb]== -6);
            5.5.wait;server.sync;
            check.value("old processor freed after complete tail",nodes.value.size==1);
            check.value("retired spectra freed after tail",set.instance.ownedObjects.count{|object|object.isKindOf(Buffer)}==baseBuffers);
            // A clone must use current spectra rather than stale SynthDef defaults.
            newNode=nodes.value.first;observed=nil;newNode.get(\irLeft,{|value|observed=value});while{observed.isNil}{0.01.wait};
            set.rack.setFX(\fx1,\awb52_verb,(fade:0.02,tail:0));server.sync;0.8.wait;
            done=nil;set.instance.ownedObjects.select{|node|node.isKindOf(Synth) and:{node.group===set.verbBranch(\earth,\fx1).processorGroup}}.asArray.first.get(\irLeft,{|value|done=value==observed});while{done.isNil}{0.01.wait};
            check.value("future dynamic clone uses edited spectrum",done==true);
            set.rack.clearFX(\fx1,0.02,0);0.2.wait;server.sync;
            {try{
                editor=set.convolutionGUI;editor.branchMenu.valueAction=1;editor.branchMenu.valueAction=0;
                check.value("waveform and envelope fit editor bounds",editor.waveform.bounds.right<=editor.window.bounds.width and:{editor.envelope.bounds.right<=editor.window.bounds.width});
                check.value("editor gain reflects applied setting",editor.gainBox.value== -6);
                editor.save(dir+/+"saved-settings.scd");configs=(dir+/+"saved-settings.scd").load;
                check.value("saved settings are loadable SC data",configs[\earth][\gainDb]== -6 and:{configs.size==3});
                AppClock.sched(0.7,{Image.fromWindow(editor.window).write(dir+/+"convolution-editor.png","png");applied=true;nil});
            }{|e|error=e;applied=true}}.defer;
            while{applied.not}{0.1.wait};if(error.notNil){error.throw};check.value("no server command failures",failures.isEmpty);
            ("AWB_IR_EDITOR_LIVE=PASS count="++checks).postln;finish.value(0);
        }{|error|error.reportError;finish.value(1)}}).play(SystemClock);
    }));
}{|error|error.reportError;finish.value(1)}}).play(SystemClock)},60,{finish.value(1)});server.boot;
)
