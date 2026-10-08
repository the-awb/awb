(
var serverPort, token, options, server, loopRoot, liveHost;

serverPort = ("AWB_HEADLESS_SERVER_PORT".getenv ? "57110").asInteger;
token = "AWB_HEADLESS_TOKEN".getenv ? "";
options = ServerOptions.new;
// Preserve system audio defaults. Only extend the native UGen search path.
loopRoot = (thisProcess.nowExecutingPath.dirname +/+ "../../../tool-artifacts/shared-loop/0.1.0").standardizePath;
server = Server(\awbHeadless, NetAddr("127.0.0.1", serverPort), options);
Server.default = server;

AWBHostControl.start(\whenNeeded, \headless, token);
thisProcess.interpreter.executeFile(loopRoot +/+ "sc/host.scd");
thisProcess.interpreter.executeFile(thisProcess.nowExecutingPath.dirname +/+ "AWBScBusAudio.scd");
liveHost = thisProcess.nowExecutingPath.dirname +/+ "../../live-set/sc/host.scd";
if(File.exists(liveHost)) { thisProcess.interpreter.executeFile(liveHost) };
if(("AWB_HEADLESS_DEFER_SERVER_BOOT".getenv ? "0") != "1") {
server.waitForBoot({
    "AWB_HEADLESS_SERVER_READY".postln;
}, 100, {
    "AWB_HEADLESS_SERVER_FAILED".error;
});
server.boot;
};
)
