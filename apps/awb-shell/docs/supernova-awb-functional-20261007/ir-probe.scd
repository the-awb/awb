(
var root="AWB_FUNCTIONAL_ROOT".getenv,s,raw,spectrum,fft=4096,finished=false;
Archive.archiveDir=root;Server.program="exec "++"AWB_FUNCTIONAL_ENGINE".getenv.shellQuote;
s=Server(\irProbe,NetAddr("127.0.0.1","AWB_FUNCTIONAL_PORT".getenv.asInteger),ServerOptions.new.device_("1248").sampleRate_(44100).hardwareBufferSize_(512).blockSize_(128).numInputBusChannels_(0).numOutputBusChannels_(4).memSize_(262144));
s.options.ugenPluginsPath=[root+/+"plugins"];Server.default=s;
s.waitForBoot({Routine({
 var done=false,values;
 raw=Buffer.alloc(s,8192,1);spectrum=Buffer.alloc(s,fft*4,1);s.sync;
 raw.set(0,1);s.sync;"IR_PROBE_BUFFERS_READY".postln;
 s.sendMsg('/b_gen',spectrum.bufnum,'PreparePartConv',raw.bufnum,fft);s.sync;"IR_PROBE_PREPARED".postln;
 spectrum.getn(0,8,{|v|values=v;done=true});while{done.not}{0.01.wait};values.postln;
 ("IR_PROBE_PASS="++values.every{|v|v.isNumber and:{v.isNaN.not}}).postln;
 raw.free;spectrum.free;s.sync;s.quit;finished=true;SystemClock.sched(1,{0.exit;nil});
}).play(SystemClock)});
SystemClock.sched(15,{if(finished.not){"IR_PROBE_TIMED_OUT".postln;s.quit;1.exit};nil});
)
