(
var serverPort, token, options, server, loopRoot, liveHost, audioPath, audioConfig, audioValid=true;

serverPort = ("AWB_HEADLESS_SERVER_PORT".getenv ? "57110").asInteger;
token = "AWB_HEADLESS_TOKEN".getenv ? "";
options = ServerOptions.new;
// Explicit shell settings override system defaults. The environment path allows
// isolated hosts/tests and non-default Electron profiles to supply their own file.
audioPath = "AWB_HEADLESS_AUDIO_CONFIG".getenv ?? {
    Platform.userHomeDir +/+ "Library/Application Support/AWB Toolkit/sc-audio.json"
};
if(File.exists(audioPath)) {
    audioConfig = JSONlib.convertToSC(File.readAllString(audioPath), postWarnings:false);
    if(audioConfig.isKindOf(Dictionary).not) { Error("Invalid shell audio settings").throw };
    options.inDevice = audioConfig[\inputDevice] !? (_.asString);
    options.outDevice = audioConfig[\outputDevice] !? (_.asString);
    options.sampleRate = audioConfig[\sampleRate];
    options.numInputBusChannels = audioConfig[\inputChannels] ? 2;
    options.numOutputBusChannels = audioConfig[\outputChannels] ? 2;
    ("AWB audio: input=" ++ options.inDevice ++ " output=" ++ options.outDevice
        ++ " rate=" ++ options.sampleRate).postln;
};
loopRoot = (thisProcess.nowExecutingPath.dirname +/+ "../../../tool-artifacts/shared-loop/0.1.0").standardizePath;
server = Server(\awbHeadless, NetAddr("127.0.0.1", serverPort), options);
Server.default = server;

AWBHostControl.start(\whenNeeded, \headless, token);
if(audioConfig.notNil){audioValid=AWBHostControl.default.audioControl.configureInitial(audioConfig)};
thisProcess.interpreter.executeFile(loopRoot +/+ "sc/host.scd");
thisProcess.interpreter.executeFile(thisProcess.nowExecutingPath.dirname +/+ "AWBScBusAudio.scd");
liveHost = thisProcess.nowExecutingPath.dirname +/+ "../../live-set/sc/host.scd";
if(File.exists(liveHost)) { thisProcess.interpreter.executeFile(liveHost) };
if(audioValid and:{("AWB_HEADLESS_DEFER_SERVER_BOOT".getenv ? "0") != "1"}) {
AWBHostControl.default.audioControl.perform(\start,NetAddr("127.0.0.1",NetAddr.langPort),"bootstrap","initial-boot");
Routine({
    var deadline;
    deadline=Main.elapsedTime+32;
    while{[\booting,\stopping].includes(AWBHostControl.default.audioControl.state) and:{Main.elapsedTime<deadline}}{0.1.wait};
    if(AWBHostControl.default.audioControl.state==\ready){"AWB_HEADLESS_SERVER_READY".postln}{"AWB_HEADLESS_SERVER_FAILED".error};
}).play(AppClock);
};
)
