// Trusted shell signal observers. No device options, server boot or audio output writes.
(
var sessions = Library.at(\awbScBusSessions) ? Dictionary.new;
var controllers = Library.at(\awbSignalObservers) ? IdentityDictionary.new;
var valid, release;
Library.put(\awbScBusSessions, sessions);
Library.put(\awbSignalObservers, controllers);
valid = { |msg, addr| var host = AWBHostControl.default;
 host.notNil and: { host.allowedAddress(addr) } and: { host.tokenMatches(msg.last) }
};
release = { |entry|
 var server = entry[\server], controller = entry[\controller];
 if(server.serverRunning and: { server.pid == entry[\pid] }) {
  entry[\synth].tryPerform(\free); server.sync;
  entry[\scope].tryPerform(\free);
 };
 if(controller.notNil) {
  controller[\users] = controller[\users] - 1;
  entry[\controller] = nil;
  if(controller[\users] == 0) {
   controller[\order].tryPerform(\do, { |responder| responder.free });
   if(server.serverRunning and: { server.pid == controller[\pid] }) { controller[\group].free; server.sync };
   if(controllers[server] === controller) { controllers.removeAt(server) };
  };
 };
};
OSCdef(\awbScBusOpen, { |msg, time, addr|
 var legacy = msg.size == 6 and: { msg[4] == 1 };
 var modern = msg.size == 7 and: { msg[5] == 2 };
 if((legacy or: { modern }) and: { valid.value(msg, addr) }) {
  var id = msg[1].asInteger, bus = msg[2].asInteger, channels = msg[3].asInteger;
  var isControl = modern and: { msg[4] == 1 };
  if(id > 0 and: { id < 16777216 } and: { legacy or: { [0, 1].includes(msg[4]) } }) {
   if(sessions.includesKey(id)) { addr.sendMsg('/awb/sc-bus/error', id, "Tap ID already allocated") } {
    var entry = (server: Server.default, owner: addr);
    sessions[id] = entry;
    Routine({ var server = entry[\server], errorText, defName, controller, limit;
     try {
      if(server.serverRunning.not or: { server.addr.ip != "127.0.0.1" }) { Error("SC signal needs a running local server").throw };
      limit = if(isControl) { server.options.numControlBusChannels } { server.options.numAudioBusChannels };
      if(bus < 0 or: { channels < 1 or: { channels > 16 or: { (bus + channels) > limit or: { legacy and: { channels < 2 or: { channels.odd } } } } } }) { Error("Invalid SC signal bus range").throw };
      entry[\pid] = server.pid;
      entry[\scope] = ScopeBuffer.alloc(server, channels + 1);
      if(entry[\scope].isNil) { Error("No free SC scope buffer").throw };
      defName = ("awbSignalTap" ++ if(isControl) { "Kr" } { "Ar" } ++ channels).asSymbol;
      SynthDef(defName, { |bus=0, scope=0|
       if(isControl) {
        ScopeOut2.kr(In.kr(bus, channels).asArray ++ [Phasor.kr(0, 1, 0, 4194304)], scope, 256, 32);
       } {
        ScopeOut2.ar(In.ar(bus, channels).asArray ++ [Phasor.ar(0, 1, 0, 4194304)], scope, 1024, 512);
       };
      }).send(server); server.sync;
      controller = controllers[server];
      if(controller.notNil and: { controller[\pid] != server.pid }) {
       controller[\order].do({ |responder| responder.free }); controllers.removeAt(server); controller = nil;
      };
      if(controller.isNil) {
       controller = (group: Group.tail(RootNode(server)), users: 0, pid: server.pid);
       controllers[server] = controller;
       // One tail-following group per server. Observers never chase each other.
       controller[\order] = ['/n_go', '/n_move'].collect({ |path| OSCFunc({ |notification|
        var nodeID = notification[1];
        var loops = Library.at(\awbSharedLoopSessions) ? Dictionary.new;
        var owned = nodeID == controller[\group].nodeID
         or: { sessions.values.any({ |tap| tap[\synth].notNil and: { tap[\synth].nodeID == nodeID } }) }
         or: { loops.values.any({ |tap| tap[\scopeSynth].notNil and: { tap[\scopeSynth].nodeID == nodeID } }) };
        if(notification[2] == 0 and: { owned.not }) { controller[\group].moveToTail(RootNode(server)) };
       }, path, server.addr) });
      };
      controller[\users] = controller[\users] + 1; entry[\controller] = controller;
      entry[\synth] = Synth(defName, [\bus, bus, \scope, entry[\scope].index], controller[\group], \addToTail);
      server.sync;
     } { |error| errorText = error.errorString };
     if(errorText.isNil) {
      addr.sendMsg('/awb/sc-bus/ready', id, server.addr.port, entry[\scope].index,
       if(isControl) { server.sampleRate / server.options.blockSize } { server.sampleRate },
       channels, bus, entry[\synth].nodeID, entry[\pid] ? 0, server.sampleRate, server.options.blockSize);
     } {
      try { release.value(entry) } { |error| error.reportError };
      sessions.removeAt(id); addr.sendMsg('/awb/sc-bus/error', id, errorText);
     };
    }).play(AppClock);
   };
  };
 };
}, '/awb/sc-bus/open');
OSCdef(\awbScBusClose, { |msg, time, addr|
 if(msg.size == 3 and: { valid.value(msg, addr) }) {
  var id = msg[1].asInteger, entry = sessions[id];
  if(entry.isNil) { addr.sendMsg('/awb/sc-bus/closed', id) } {
   if(entry[\owner] == addr) { Routine({ var errorText;
    try { release.value(entry) } { |error| errorText = error.errorString };
    if(errorText.isNil) { sessions.removeAt(id); addr.sendMsg('/awb/sc-bus/closed', id) }
    { addr.sendMsg('/awb/sc-bus/error', id, errorText) };
   }).play(AppClock) };
  };
 };
}, '/awb/sc-bus/close');
"AWB_SC_BUS_AUDIO_READY".postln;
)
