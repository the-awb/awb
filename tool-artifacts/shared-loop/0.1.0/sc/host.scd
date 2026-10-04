// Loaded into the shell's language host. Never boots, quits or reconfigures SC.
// Uses a compiled SynthDef so the host need not recompile its class library.
(
var root = thisProcess.nowExecutingPath.dirname.dirname;
var sessions = Library.at(\awbSharedLoopSessions) ? Dictionary.new;
var valid, command, release;

Library.put(\awbSharedLoopSessions, sessions);
valid = { |msg, addr|
    var host = AWBHostControl.default;
    host.notNil and: { host.allowedAddress(addr) } and: {
        host.tokenMatches(msg.last)
    }
};
// Plugin commands need a bounded /done acknowledgement, not merely /sync.
command = { |server, name, id|
    var condition = Condition.new, complete = false, errorText;
    var done, failed;
    done = OSCFunc({ |msg|
        if(msg[1].asString == name) { complete = true; condition.unhang };
    }, '/done', server.addr);
    failed = OSCFunc({ |msg|
        if(msg[1].asString == "/cmd") { errorText = msg.asString; complete = true; condition.unhang };
    }, '/fail', server.addr);
    SystemClock.sched(4, {
        if(complete.not) { errorText = "Shared Loop plugin command timed out; restart the host with its plugin installed"; condition.unhang };
        nil
    });
    server.sendMsg('/cmd', name, id);
    condition.hang;
    done.free; failed.free;
    if(errorText.notNil) { Error(errorText).throw };
};
release = { |entry, id|
    var server = entry[\server];
    if(server.serverRunning and: { server.pid == entry[\pid] }) {
        entry[\scopeOrder].tryPerform(\do, { |responder| responder.free });
        entry[\scopeSynth].tryPerform(\free);
        entry[\controlSynth].tryPerform(\free);
        entry[\synth].tryPerform(\free);
        server.sync;
        if(entry[\region] == true) { command.value(server, "loop_view_free", id) };
        entry[\micScope].tryPerform(\free);
        entry[\outScope].tryPerform(\free);
        entry[\controlScope].tryPerform(\free);
        entry[\controlBus].tryPerform(\free);
        entry[\buffer].tryPerform(\free);
        server.sync;
    };
};
OSCdef(\awbSharedLoopOpen, { |msg, time, addr|
    var id, seconds;
    if(msg.size == 5 and: { valid.value(msg, addr) }) {
        id = msg[1].asInteger; seconds = msg[2].asFloat.clip(0.5, 8);
        // msg[3] is the protocol version, not a path or executable source.
        if(id > 0 and: { id < 16777216 } and: { [1, 2].includes(msg[3]) }) {
            if(sessions.includesKey(id)) {
                addr.sendMsg('/awb/loop/error', id, "Shared Loop ID already allocated");
            } {
                var entry = (server: Server.default, owner: addr, region: false, protocol: msg[3]);
                sessions[id] = entry;
                Routine({
                    var server = entry[\server], errorText;
                    try {
                        if(server.serverRunning.not) { Error("Shell SuperCollider server is not running").throw };
                        if(server.addr.ip != "127.0.0.1") { Error("Shared Loop requires a local shell server").throw };
                        if(server.options.sampleRate.notNil) { ("Shared Loop inherits host sample-rate option: " ++ server.options.sampleRate).postln };
                        entry[\pid] = server.pid;
                        entry[\buffer] = Buffer.alloc(server, (server.sampleRate * seconds).asInteger, 1);
                        server.sync;
                        command.value(server, "loop_view_alloc", id);
                        entry[\region] = true;
                        server.sendMsg('/d_load', root +/+ "build/awbSharedLoopV1.scsyndef");
                        server.sync;
                        entry[\synth] = Synth(\awbSharedLoopV1, [\bufnum, entry[\buffer].bufnum, \sharedId, id], server.defaultGroup, \addToTail);
                        server.sync;
                        entry[\controlBus] = Bus.control(server, 6);
                        if(entry[\protocol] == 1) {
                        entry[\micScope] = ScopeBuffer.alloc(server, 2);
                        entry[\outScope] = ScopeBuffer.alloc(server, 3);
                        entry[\controlScope] = ScopeBuffer.alloc(server, 7);
                        if(entry[\micScope].isNil or: { entry[\outScope].isNil or: { entry[\controlScope].isNil } }) { Error("No free SC scope buffers").throw };
                        server.sendMsg('/d_load', root +/+ "build/awbSharedLoopScopesV1.scsyndef");
                        server.sync;
                        entry[\scopeSynth] = Synth(\awbSharedLoopScopesV1, [
                            \micScope, entry[\micScope].index, \outScope, entry[\outScope].index,
                            \controlScope, entry[\controlScope].index, \controlBus, entry[\controlBus].index
                        ], RootNode(server), \addToTail);
                        // Keep the output tap after other root nodes, including newly created groups.
                        entry[\scopeOrder] = ['/n_go', '/n_move'].collect({ |path| OSCFunc({ |msg|
                            var observers = Library.at(\awbScBusSessions) ? Dictionary.new;
                            var groups = Library.at(\awbSignalObservers) ? IdentityDictionary.new;
                            var owned = sessions.values.any({ |tap| tap[\scopeSynth].notNil and: { tap[\scopeSynth].nodeID == msg[1] } })
                                or: { observers.values.any({ |tap| tap[\synth].notNil and: { tap[\synth].nodeID == msg[1] } }) }
                                or: { groups.values.any({ |group| group[\group].nodeID == msg[1] }) };
                            if(msg[2] == 0 and: { owned.not }) {
                                entry[\scopeSynth].moveToTail(RootNode(server));
                            };
                        }, path, server.addr) });
                        };
                        server.sync;
                    } { |error| errorText = error.errorString };
                    if(errorText.isNil) {
                        addr.sendMsg('/awb/loop/ready', id, server.addr.port,
                            entry[\buffer].bufnum, entry[\synth].nodeID, server.sampleRate,
                            entry[\micScope].tryPerform(\index) ? -1, entry[\outScope].tryPerform(\index) ? -1, entry[\scopeSynth].tryPerform(\nodeID) ? -1,
                            entry[\controlScope].tryPerform(\index) ? -1, entry[\controlBus].index, server.options.blockSize, server.options.numOutputBusChannels);
                    } {
                        try { release.value(entry, id) } { |error| error.reportError };
                        sessions.removeAt(id);
                        addr.sendMsg('/awb/loop/error', id, errorText);
                    };
                }).play(AppClock);
            };
        };
    };
}, '/awb/loop/open');
// Start demonstration generators only while the control scope has a subscriber.
OSCdef(\awbSharedLoopSignals, { |msg, time, addr|
 if(msg.size == 4 and: { valid.value(msg, addr) }) {
  var id = msg[1].asInteger, entry = sessions[id];
  if(entry.notNil and: { entry[\owner] == addr and: { entry[\protocol] == 2 } }) {
   Routine({ var server = entry[\server];
    if(server.serverRunning and: { server.pid == entry[\pid] }) {
     if(msg[2] == 1) {
      if(entry[\controlSynth].isNil) {
       server.sendMsg('/d_load', root +/+ "build/awbSharedLoopControlsV2.scsyndef"); server.sync;
       entry[\controlSynth] = Synth(\awbSharedLoopControlsV2, [\controlBus, entry[\controlBus].index], server.defaultGroup, \addToTail);
      };
     } { entry[\controlSynth].tryPerform(\free); entry[\controlSynth] = nil };
     server.sync; addr.sendMsg('/awb/loop/signals-ready', id, msg[2]);
    } { addr.sendMsg('/awb/loop/error', id, "SC host disconnected") };
   }).play(AppClock);
  } { addr.sendMsg('/awb/loop/error', id, "Unknown owned loop session") };
 };
}, '/awb/loop/signals');
OSCdef(\awbSharedLoopClose, { |msg, time, addr|
    var id, entry;
    if(msg.size == 3 and: { valid.value(msg, addr) }) {
        id = msg[1].asInteger; entry = sessions[id];
        if(entry.isNil) { addr.sendMsg('/awb/loop/closed', id) } {
            if(entry[\owner] == addr) {
                Routine({
                    var errorText;
                    try { release.value(entry, id) } { |error| errorText = error.errorString };
                    if(errorText.isNil) {
                        sessions.removeAt(id); addr.sendMsg('/awb/loop/closed', id);
                    } { addr.sendMsg('/awb/loop/error', id, errorText) };
                }).play(AppClock);
            };
        };
    };
}, '/awb/loop/close');
"AWB_SHARED_LOOP_HOST_READY".postln;
)
