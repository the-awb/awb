// Run through scripts/run-sclang.mjs: isolated library, no live extensions/startup.
(
var port = "LOOP_SC_PORT".getenv.asInteger;
var id = "LOOP_SHARED_ID".getenv.asInteger;
var root = "LOOP_DEMO_ROOT".getenv;
var runtimeRoot = "LOOP_RUNTIME_ROOT".getenv ? (root +/+ "build");
var seconds = ("LOOP_SECONDS".getenv ? "4").asFloat.clip(0.5, 8);
var s = Server(\sharedLooperDemo, NetAddr("127.0.0.1", port));
Server.program = "exec " ++ (Platform.resourceDir +/+ "scsynth").shellQuote;
s.options.ugenPluginsPath = (Platform.resourceDir +/+ "plugins") ++ ":" ++ (root +/+ "build");
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;
if("SC_INPUT_DEVICE".getenv.notNil) { s.options.inDevice = "SC_INPUT_DEVICE".getenv };
if("SC_OUTPUT_DEVICE".getenv.notNil) { s.options.outDevice = "SC_OUTPUT_DEVICE".getenv };
s.options.loadDefs = false;
s.options.zeroConf = false;
s.waitForBoot({
    Routine({
        var b, synth, ready;
        b = Buffer.alloc(s, (s.sampleRate * seconds).asInteger, 1);
        s.sync;
        ready = Condition.new;
        OSCFunc({ ready.unhang }, '/done', s.addr).oneShot;
        s.sendMsg('/cmd', 'loop_view_alloc', id);
        ready.hang;
        SynthDef(\sharedLooperDemo, { |bufnum, sharedId, record=0, play=1,
            overdub=0, clear=0, feedback=1, inputGain=1, outputGain=0.25,
            source=0, frequency=220, toneLevel=0.25|
            var tone = SinOsc.ar(frequency) * toneLevel;
            var input = Select.ar(source, [tone, SoundIn.ar(0)]);
            var loop = SharedLooper.ar(input, bufnum, sharedId, record, play,
                overdub, clear, feedback, inputGain, outputGain);
            Out.ar(0, loop ! 2);
        }).add;
        s.sync;
        synth = Synth(\sharedLooperDemo, [\bufnum, b.bufnum, \sharedId, id], s, \addToTail);
        s.sync;
        File.use(runtimeRoot +/+ "session.json", "w", { |f|
            f.write("{\"port\":" ++ port ++ ",\"sharedId\":" ++ id
                ++ ",\"nodeId\":" ++ synth.nodeID ++ ",\"bufnum\":" ++ b.bufnum ++ "}");
        });
        "Shared looper ready. Node GUI owns controls and shutdown.".postln;
    }).play;
}, 100, { "Server boot failed".postln; 1.exit });
// ServerQuit is also used when the Node host closes its own server.
ServerQuit.add({ 0.exit }, s);
)
