(
var serverPort, token, options, server;

serverPort = ("AWB_HEADLESS_SERVER_PORT".getenv ? "57110").asInteger;
token = "AWB_HEADLESS_TOKEN".getenv ? "";
options = ServerOptions.new;
server = Server(\awbHeadless, NetAddr("127.0.0.1", serverPort), options);
Server.default = server;

AWBHostControl.start(\whenNeeded, \headless, token);
server.waitForBoot({
    "AWB_HEADLESS_SERVER_READY".postln;
}, 100, {
    "AWB_HEADLESS_SERVER_FAILED".error;
});
server.boot;
)
