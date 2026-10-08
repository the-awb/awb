(
var check,checks=0,data,shaped,s,source,output,file,readback,frames=128,dir=thisProcess.nowExecutingPath.dirname;
check={|label,ok|if(ok.not){Error("IR editor check failed: "++label).throw};checks=checks+1;("PASS "++label).postln};
try {
 s=AWBConvolutionIR.settings;data=FloatArray.fill(frames*2,{|i|if(i.even){0.1}{0.2}});
 shaped=AWBConvolutionIR.shape(data,2,frames,s);
 check.value("flat envelope keeps the original stereo samples",(shaped-Signal.newFrom(data)).abs.maxItem<1e-7);
 shaped=AWBConvolutionIR.shape(data,2,frames,(times:[0,1],levels:[1,1],gainDb: -6));
 check.value("gain is exact linear amplitude derived from dB",(shaped[20]-(0.1*(-6).dbamp)).abs<1e-7);
 check.value("stereo ratio survives shaping",(shaped[21]/shaped[20]-2).abs<1e-6);
 shaped=AWBConvolutionIR.shape(data,2,frames,(times:[0,0.5,1],levels:[0,1,0]));
 check.value("both stereo sides fade from and to zero",shaped.copyRange(0,1).abs.maxItem<1e-7 and:{shaped.copyRange(shaped.size-2,shaped.size-1).abs.maxItem<1e-7});
 check.value("interior envelope retains nonzero audio",shaped[frames]>0.09);
 check.value("crossed envelope times rejected",try{AWBConvolutionIR.settings((times:[0,0.8,0.4,1],levels:[0,1,1,0]));false}{true});
 check.value("nonfinite gain rejected",try{AWBConvolutionIR.settings((gainDb:inf));false}{true});
 check.value("invalid gain rejected",try{AWBConvolutionIR.settings((gainDb:25));false}{true});
 check.value("unknown settings rejected",try{AWBConvolutionIR.settings((gain:1));false}{true});
 source=dir+/+"original.wav";output=dir+/+"shaped.wav";
 file=SoundFile.new.headerFormat_("WAV").sampleFormat_("float").sampleRate_(44100).numChannels_(2);file.openWrite(source);file.writeData(data);file.close;
 AWBConvolutionIR.write(source,output,frames,44100,(times:[0,1],levels:[1,1],gainDb: -6));
 file=SoundFile.new;file.openRead(output);readback=FloatArray.newClear(frames*2);file.readData(readback);
 check.value("processed copy preserves rate, channels and frame count",file.sampleRate==44100 and:{file.numChannels==2} and:{file.numFrames==frames});file.close;
 check.value("processed file carries requested gain",(readback[30]-(0.1*(-6).dbamp)).abs<1e-7);
 file.openRead(source);file.readData(readback);file.close;
 check.value("original audio file remains untouched",(Signal.newFrom(readback)-Signal.newFrom(data)).abs.maxItem<1e-7);
 check.value("original overwrite is rejected",try{AWBConvolutionIR.write(source,source,frames,44100,());false}{true});
 check.value("wrong sample rate is rejected",try{AWBConvolutionIR.write(source,dir+/+"wrong-rate.wav",frames,48000,());false}{true});
 ("AWB_IR_EDITOR_CONTRACT=PASS count="++checks).postln;0.exit;
}{|error|error.reportError;1.exit};
)
