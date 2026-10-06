(
var dir=thisProcess.nowExecutingPath.dirname,spec,server,events=List.new,seq=0,now=0.1,emit,deci,spark,borrowed,opts;
emit={|m|seq=seq+1;events.add([if(m[0]==\d_recv){0}{now},seq,m])};
server=Server(\fxModulationNRT,NetAddr("127.0.0.1",59995),ServerOptions.new.numOutputBusChannels_(36));
spec=thisProcess.interpreter.executeFile(dir+/+"source/prepared/first-pass.scd");
opts=(sendFunction:emit);events.add([0.05,0,[\g_new,1,0,0]]);
try {
    var def;
    deci=AWBFXMixProfile(\deci,server.defaultGroup,server,spec[\fxMixes][\deci],opts);
    spark=AWBFXMixProfile(\spark,server.defaultGroup,server,spec[\fxMixes][\spark],opts);
    borrowed=Bus.control(server,1);emit.value(borrowed.setMsg(0));
    deci.addModulation(\a,\borrowedFollower,borrowed,1);
    def=SynthDef(\awbFXMonitor,{|deciBus=0,sparkBus=0,input=0|Out.ar(0,K2A.ar(In.kr(deciBus,11)++In.kr(sparkBus,24)++In.kr(input,1)))});
    emit.value([\d_recv,def.asBytes]);emit.value([\s_new,def.name,9998,1,1,\deciBus,deci.outputBus.index,\sparkBus,spark.outputBus.index,\input,borrowed.index]);
    spark.param(\aSpark).set(1);spark.param(\aPitch).set(1);spark.param(\aTailShape).set(1);spark.param(\aTail).set(0);
    4.do{|i|now=1+(i*2);deci.param(\shape).set((i+1)/4,0.25);spark.param(\tailMix).set((i+1)/4,0.25)};
    now=9;deci.param(\shape).set(0);spark.param(\tailMix).set(0);
    now=10;deci.param(\shape).set(1);spark.param(\tailMix).set(0.5);spark.param(\aSpark).set(0);
    now=35;emit.value(borrowed.setMsg(0.6));deci.param(\amount).set(0.1); // same borrowed follower now drives Math3
    now=36;spark.param(\aSpark).set(1,1); // inspect real AWParam envelope at 36.5
    now=38;spark.free;deci.free;
    if(borrowed.index.isNil){Error("Profile freed borrowed follower bus").throw};
    emit.value([\n_free,9998]);now=39;emit.value([\c_set,0,0]);
    Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,dir+/+"modulation.osc");
    "AWB_FX_MODULATION_CONTRACT=PASS".postln;0.exit;
}{|e|e.reportError;1.exit};
)
