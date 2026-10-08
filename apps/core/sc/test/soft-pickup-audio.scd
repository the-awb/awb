(
var dir=thisProcess.nowExecutingPath.dirname,server,core,p,a,m,ma,events=List.new,serial=0,started,emit,monitor,timing=List.new;
started=Main.elapsedTime;
emit={|msg|serial=serial+1;events.add([if(msg[0]==\d_recv){0}{0.1+(Main.elapsedTime-started)},serial,msg])};
Routine({try{
    server=Server(\softPickupNRT,NetAddr("127.0.0.1",59995),ServerOptions.new.numOutputBusChannels_(2).numInputBusChannels_(0));
    emit.value([\d_recv,SynthDef(\softPickupMonitor,{|baseBus,amountBus|Out.ar(0,K2A.ar([In.kr(baseBus),In.kr(amountBus)]))}).asBytes]);
    events.add([0.05,0,[\g_new,1,0,0]]);
    core=AWBCoreTool.open((),(server:server,sendFunction:emit,track:false)).tool;
    p=core.createParam(\gain,0.5);a=core.createParam(\amount,0.2,\unipolar,-0.5,polarity:\bipolar);
    p.baseSmoothing=0;a.baseSmoothing=0;
    monitor=Synth.basicNew(\softPickupMonitor,server);emit.value(monitor.newMsg(core.groupAt(\output),[\baseBus,p.observationBus.index,\amountBus,a.observationBus.index+1],\addToTail));
    p.addDependant({|o,what,value|if(what==\pickupBase){timing.add("base-"++value++" "++(0.1+(Main.elapsedTime-started)))}});
    a.addDependant({|o,what,value|if(what==\pickupAmount){timing.add("amount-"++value++" "++(0.1+(Main.elapsedTime-started)))}});
    m=p.createMidiSource(nil,0,1,0,127,true,false);ma=AWMidiCCIn(nil,nil,0,2,0,127,true,\amount);a.addSource(ma);
    0.2.wait;started=Main.elapsedTime-0.2;
    m.acceptBase(20,0.5);m.acceptBase(80,0.5);m.receiveCC(100);
    ma.acceptBase(0,-0.5);ma.acceptBase(80,-0.5);ma.receiveCC(100);
    1.25.wait;timing.add("controller-move "++(0.1+(Main.elapsedTime-started)));m.receiveCC(110);ma.receiveCC(110);
    0.65.wait;core.close;0.1.wait;emit.value([0]);
    events=events.sort{|x,y|if(x[0]==y[0]){x[1]<y[1]}{x[0]<y[0]}};
    File.use(dir+/+"soft-pickup-timing.txt","w",{|file|file.write(timing.join(Char.nl))});
    Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"soft-pickup.osc");
    "AWB_SOFT_PICKUP_AUDIO_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit}}).play(SystemClock);
)
