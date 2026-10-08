(
var server,core,events=List.new,now=0,serial=0,emit,dir=thisProcess.nowExecutingPath.dirname,d,i,c,m,source,monitor;
emit={|msg|serial=serial+1;events.add([if(msg[0]==\d_recv){0}{now},serial,msg])};
try {
    server=Server(\baseSmoothingNRT,NetAddr("127.0.0.1",59993),ServerOptions.new.numOutputBusChannels_(6).numInputBusChannels_(0));
    [SynthDef(\smoothWriter,{|out,value=0.5|Out.kr(out,value)}),SynthDef(\smoothMonitor,{|a,b,c,d,e,f|Out.ar(0,K2A.ar([In.kr(a),In.kr(b),In.kr(c),In.kr(d),In.kr(e),In.kr(f)]))})].do{|def|emit.value([\d_recv,def.asBytes])};
    now=0.05;emit.value([\g_new,1,0,0]);now=0.1;
    core=AWBCoreTool.open((),(server:server,sendFunction:emit,track:false)).tool;
    d=core.createParam(\default,0.2,amount:0.3);i=core.createParam(\immediate,0.2,baseSmoothing:0);c=core.createParam(\custom,0.2,baseSmoothing:0.1);m=core.createParam(\midi,0.2);
    source=Synth.basicNew(\smoothWriter,server);emit.value(source.newMsg(d.sourceGroup,[\out,d.inputBus.index],\addToTail));
    monitor=Synth.basicNew(\smoothMonitor,server);emit.value(monitor.newMsg(core.groupAt(\output),[\a,d.observationBus.index,\b,d.outputBus.index,\c,c.observationBus.index,\d,m.observationBus.index,\e,i.observationBus.index,\f,d.observationBus.index+1],\addToTail));
    m=m.createMidiSource(nil,0,1,0,127,true,false).softPickup(0,0);
    now=0.3;d.setBase(0.8);i.setBase(0.8);c.set(0.8);m.acceptBase(10,0.2);m.acceptBase(80,0.2);
    now=0.55;d.setI(0.1);
    now=0.7;m.receiveCC(20);
    now=0.8;d.setBase(0.9,0);
    now=0.9;d.setBase(0.3,0.2);
    now=1.2;c.baseSmoothing=0.25;c.setM(127);
    now=1.5;d.setAmount(0.6);
    now=1.65;emit.value(source.setMsg(\value,-0.5));
    now=1.8;core.close;now=2;emit.value([0]);
    events=events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}};
    Score.write(events.collect{|e|[e[0],e[2]]}.asArray,dir+/+"base-smoothing.osc");"AWB_BASE_SMOOTHING_SCORE=PASS".postln;0.exit;
}{|error|error.reportError;1.exit};
)
