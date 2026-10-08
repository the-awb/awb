(
var server,group,input,output,stage,messages=List.new,owned=IdentitySet.new,score=List.new,options;
var check,checks=0,failed=List.new,rejected=false,source,changes,midi,panner;
">>>>> DEBUG START >>>>>".postln;
check={|ok,label|checks=checks+1;if(ok){("PASS "++label).postln}{failed.add(label);("FAIL "++label).postln}};
try {
    server=AWBCoreTestServer(\stutterFile,NetAddr("127.0.0.1",59993));group=Group.basicNew(server,100);
    input=Bus(\audio,20,2,server);output=Bus(\audio,0,2,server);
    stage=AWBCelloStutter(input,output,group,(panAmount:0,panDepth:0),
        (sendFunction:{|msg|messages.add(msg)},ownFunction:{|node|owned.add(node)},disownFunction:{|node|owned.remove(node)}));
    check.value(stage.param(\amount).baseTarget==0 and:{stage.param(\amount).spec.maxval==1},"amount defaults to zero, capped at unity");
    check.value(stage.param(\amount).polarity==\unipolar,"amount is unipolar");
    check.value(stage.param(\waveform).spec.maxval==4,"all five waveforms are selectable");
    check.value(owned.includes(stage.node) and:{owned.includes(stage.group)} and:{owned.size==14},"stage and four AWParams share explicit node ownership");
    try{AWBCelloStutter.settings((custom:[0,1.1]))}{|error|rejected=true};check.value(rejected,"invalid custom shape rejected");
    rejected=false;try{AWBCelloStutter.settings((waveform:\wrong))}{|error|rejected=true};check.value(rejected,"unknown waveform rejected");
    score.add([0,[\d_recv,AWParam.synthDef.asBytes],[\d_recv,AWParam.routeDef.asBytes],[\g_new,100,0,0]]);
    score.add([0.01]++messages.asArray);messages.clear;
    source=SynthDef(\stutterTestSource,{Out.ar(20,DC.ar(0.125)!2);Out.ar(2,DC.ar(0.0625)!2)});
    panner=AWBCelloStutter.compile(\stutterPanTest,(),2);
    score.add([0,[\d_recv,panner.asBytes]]);
    score.add([0.03,[\s_new,panner.name,102,1,100,\in,20,\out,4,\amount,1,\waveform,2]]);
    score.add([0.02,[\d_recv,source.asBytes],[\s_new,source.name,101,0,100]]);
    // Baseline, each waveform, timed amount ramp, and live envelope input.
    stage.param(\amount).setI(1);score.add([1]++messages.asArray);messages.clear;
    5.do{|i|stage.param(\waveform).setBase(i);score.add([1+i]++messages.asArray);messages.clear};
    stage.param(\amount).setI(0,0.5);score.add([6]++messages.asArray);messages.clear;
    stage.param(\amount).setBase(1);stage.param(\waveform).setBase(2);score.add([7]++messages.asArray);messages.clear;
    stage.param(\envelope).setBase(1);score.add([8]++messages.asArray);messages.clear;
    // Exercise the real MIDI dispatcher; FCB CC17 on channel 3, restricted UID.
    midi=stage.param(\amount).createMidiSource(98765,3,17,pickup:false,passthru:false);
    MIDIIn.doControlAction(98764,3,17,0);check.value(stage.param(\amount).baseTarget==1,"wrong MIDI source is ignored");
    MIDIIn.doControlAction(98765,3,17,0);check.value(stage.param(\amount).baseTarget==0,"FCB amount CC drives the actual AWParam");
    score.add([9,[\n_set,102,\amount,0]]++messages.asArray);messages.clear;
    stage.free;check.value(stage.closed and:{stage.params.values.every(_.closed)} and:{owned.isEmpty},"closing stage releases all owned nodes and parameters");
    score.add([10]++messages.asArray);score.add([10.1,[\c_set,0,0]]);
    if(failed.notEmpty){1.exit};
    ("STUTTER_LANGUAGE_CHECKS="++checks).postln;
    options=ServerOptions.new.numOutputBusChannels_(6).numInputBusChannels_(0).blockSize_(256);
    Score.recordNRT(score.asArray,"/private/tmp/awb-stutter-20261008/stutter.osc",
        "/private/tmp/awb-stutter-20261008/stutter.wav",sampleRate:44100,headerFormat:"WAV",sampleFormat:"float",options:options,duration:10.1,
        action:{"STUTTER_NRT_COMPLETE".postln;"<<<<< DEBUG END".postln;0.exit});
}{|error|error.reportError;stage.tryPerform(\free);1.exit};
)
