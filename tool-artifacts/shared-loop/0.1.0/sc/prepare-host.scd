// Attached IDE setup: run before booting the user's local default server.
// This does not boot/reboot a server or change its audio configuration.
(
var root = thisProcess.nowExecutingPath.dirname.dirname;
var server = Server.default, paths;
if(server.serverRunning) { Error("Prepare Shared Loop before booting SC; close existing instruments before a manual host restart").throw };
if(server.addr.ip != "127.0.0.1") { Error("Shared Loop requires a local server").throw };
paths = server.options.ugenPluginsPath;
if(paths.isNil) {
    paths = [Platform.resourceDir +/+ "plugins", Platform.systemExtensionDir, Platform.userExtensionDir]
        ++ (("SC_PLUGIN_PATH".getenv ? "").split($:).reject(_.isEmpty));
} { if(paths.isString) { paths = [paths] } };
if(paths.includesEqual(root +/+ "build").not) { paths = paths ++ [root +/+ "build"] };
server.options.ugenPluginsPath = paths;
if(AWBHostControl.default.isNil) { AWBHostControl.start(\whenNeeded, \ide) };
thisProcess.interpreter.executeFile(root +/+ "sc/host.scd");
thisProcess.interpreter.executeFile(root.dirname.dirname.dirname +/+ "apps/awb-shell/sc/AWBScBusAudio.scd");
"Shared Loop prepared; boot Server.default using your normal audio settings.".postln;
)
