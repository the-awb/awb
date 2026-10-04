// Test-owned server only. No AWB startup or live extension loading.
(
var root = "BENCH_ROOT".getenv, port = "BENCH_PORT".getenv.asInteger;
var id = "BENCH_ID".getenv.asInteger, output = "BENCH_SESSION".getenv;
var s = Server(\componentBench, NetAddr("127.0.0.1", port));
var windows = List.new;
Server.program = "exec " ++ (Platform.resourceDir +/+ "scsynth").shellQuote;
s.options.ugenPluginsPath = (Platform.resourceDir +/+ "plugins") ++ ":" ++ (root +/+ "build");
s.options.numInputBusChannels = 2; s.options.numOutputBusChannels = 2;
s.options.loadDefs = false; s.options.zeroConf = false;
s.waitForBoot({ Routine({
 var buffer, loop, mic, out, control, controlBus, tap, condition;
 buffer = Buffer.alloc(s, (s.sampleRate * 4).asInteger, 1); s.sync;
 condition = Condition.new;
 OSCFunc({ |msg| if(msg[1].asString == "loop_view_alloc") {condition.unhang} }, '/done', s.addr).oneShot;
 s.sendMsg('/cmd', 'loop_view_alloc', id); condition.hang;
 ["awbSharedLoopV1", "awbSharedLoopScopesV1", "awbScopeMicProbeV1", "awbScopeOutputProbeV1"].do({ |name| s.sendMsg('/d_load', root +/+ "build" +/+ (name ++ ".scsyndef")) }); s.sync;
 loop = Synth(\awbSharedLoopV1, [\bufnum, buffer.bufnum, \sharedId, id, \outputGain, 0], s.defaultGroup, \addToTail);
 loop.run(false);
 Synth(\awbScopeMicProbeV1, [], RootNode(s), \addToHead);
 Synth(\awbScopeOutputProbeV1, [], RootNode(s), \addToTail);
 mic = ScopeBuffer.alloc(s, 2); out = ScopeBuffer.alloc(s, 3); control = ScopeBuffer.alloc(s, 7); controlBus = Bus.control(s, 6);
 tap = Synth(\awbSharedLoopScopesV1, [\micScope, mic.index, \outScope, out.index, \controlScope, control.index, \controlBus, controlBus.index], RootNode(s), \addToTail);
 tap.run(false); s.sync;
 OSCdef(\componentQt, { |msg, time, addr|
  var kind = msg[1].asString, interval = msg[2].asInteger;
  { windows.do({ |pair| pair[1].stop; pair[0].close }); windows.clear;
    if(kind != "none") {
     (if(kind == "both") { ["mic", "output"] } { [kind] }).do({ |which, i|
      var win = Window("Qt component scope " ++ which, Rect(20 + (i*740), 40, 668, 210)).front;
      var view = ScopeView(win, Rect(20, 20, 628, 160));
      view.server = s; view.bufnum = if(which == "mic") {mic.index} {out.index};
      view.style = 1; view.fill = false; view.yZoom = 16;
      view.setProperty(\updateInterval, interval); view.start;
      windows.add([win, view]);
     });
    };
    addr.sendMsg('/bench/qt/ready', kind, interval);
  }.defer;
 }, '/bench/qt');
 File.use(output, "w", { |f| f.write("{\"port\":" ++ port ++ ",\"sharedId\":" ++ id ++ ",\"sampleRate\":" ++ s.sampleRate ++ ",\"nodeId\":" ++ loop.nodeID ++ ",\"bufnum\":" ++ buffer.bufnum ++ ",\"micScope\":" ++ mic.index ++ ",\"outScope\":" ++ out.index ++ ",\"scopeNodeId\":" ++ tap.nodeID ++ ",\"controlScope\":" ++ control.index ++ ",\"controlBus\":" ++ controlBus.index ++ ",\"blockSize\":" ++ s.options.blockSize ++ ",\"scPID\":" ++ s.pid ++ "}"); });
}).play }, 100, {1.exit});
ServerQuit.add({0.exit}, s);
)
