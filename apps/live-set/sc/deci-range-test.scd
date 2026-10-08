// Offline DSP check: no audio device and no live server.
(
var root="AWB_RANGE_ROOT".getenv,out="AWB_RANGE_OUT".getenv,server,spec,full,legacy,config,events=List.new,seq=0,now=0.1,emit,def;
emit={|m|seq=seq+1;events.add([if(m[0]==\d_recv){0}{now},seq,m])};
server=Server(\deciRangeNRT,NetAddr("127.0.0.1",59995),ServerOptions.new.numOutputBusChannels_(4));
spec=(root+/+"apps/rack/sc/sets/awb52/prepared/first-pass.scd").load;
events.add([0.05,0,[\g_new,1,0,0]]);
try {
    config=spec[\fxMixes][\deci].deepCopy;config[\fullParameterRanges]=true;
    full=AWBFXMixProfile(\deci,server.defaultGroup,server,config,(sendFunction:emit));
    legacy=AWBFXMixProfile(\deci,server.defaultGroup,server,spec[\fxMixes][\deci],(sendFunction:emit));
    def=SynthDef(\awbDeciRangeMonitor,{|full=0,legacy=0|
        Out.ar(0,K2A.ar(In.kr(full+3,2)++In.kr(legacy+3,2)))});
    emit.value([\d_recv,def.asBytes]);emit.value([\s_new,def.name,9998,1,1,\full,full.outputBus.index,\legacy,legacy.outputBus.index]);
    full.param(\depth).set(0);full.param(\folding).set(0);
    now=1;full.param(\depth).set(1);full.param(\folding).set(1);
    now=2;full.param(\depth).set(0.25);full.param(\folding).set(0.75);
    now=3;full.param(\folding).set(0.5);full.param(\aDepth).set(1);full.param(\aFolding).set(1);full.param(\depthSC).set(0.5);full.param(\foldingSC).set(0.5);
    now=4;full.param(\depth).set(0.95);full.param(\folding).set(0.95);
    now=5;full.param(\aDepth).set(0);full.param(\aFolding).set(0);full.param(\depth).set(0.25,0.5);full.param(\folding).set(0.75,0.5);
    now=6;full.free;legacy.free;emit.value([\n_free,9998]);now=6.1;emit.value([\c_set,0,0]);
    Score.write(events.sort{|a,b|if(a[0]==b[0]){a[1]<b[1]}{a[0]<b[0]}}.collect{|e|[e[0],e[2]]}.asArray,out+/+"deci-range.osc");
    "AWB_DECI_RANGE_SCORE=PASS".postln;0.exit;
}{|e|e.reportError;1.exit};
)
