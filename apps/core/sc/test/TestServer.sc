// Test-only UDP peer. Never installed into the user's class library.
AWBCoreTestServer : Server {
    var initialized=false;
    init { |name,addr,options,clientID|super.init(name,addr,options,clientID);initialized=true;^this}
    serverRunning { ^initialized }
    sync { ^this }
}

// Same UID accessor as the unchanged legacy MIDISource.
AWBCoreTestMidiSource {
    var <midiClient;
    *new { |uid|^super.newCopyArgs(uid) }
}

// Captures the language serializer without an engine or network listener.
AWParamTestAddress {
    var <messages;
    *new {^super.new.init}
    init {messages=List.new;^this}
    sendMsg { |...args|messages.add(args);^this}
}
