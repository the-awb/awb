// AWB live set — evaluate this whole block once (Cmd+Return).
// Rack + FX + control sends/followers + four delays + one composite GUI.
// Set physical inputs once before opening, using zero-based MOTU indices:
// Defaults: VC 0, Mic 1, Pro 2 4/5 (zero-based). Optional override:
// ~awbLiveInputs = (vc: [0], mic: [1], pro2: [4, 5]);
// ~awbLiveClose.value; closes this set and its views, leaving the server running.
(
var root, server = s, spec, plan, configuration, inputs, required, missing;
var checkOnly = "AWB_LIVE_CHECK_ONLY".getenv == "1", openView, waitFor, booted = false, failure;
root = PathName(thisProcess.nowExecutingPath ?? { \Document.asClass.tryPerform(\current).tryPerform(\path) }
    ?? { "/Users/willy/awb/apps/live-set/open.scd" }).pathOnly;
root = PathName(root).parentPath; // apps
root = PathName(root).parentPath; // repository
~awbRoot = root;
inputs = ~awbLiveInputs ?? { (vc: [0], mic: [1], pro2: [4, 5]) };
required = [
    "apps/rack/sc/sets/awb52/prepared/first-pass.scd",
    "apps/live-set/sc/plans/live-44100.scd",
    "apps/live-set/sc/plans/live-configuration.scd",
    "apps/live-set/.build/UnifiedTape.scx",
    "apps/live-set/.build/unifiedview.node",
    "apps/live-set/dist/index.html",
    "apps/live-set/.build/delay-widgets/delay-widgets.js",
    "apps/rack/dist/index.html"
];
missing = required.select { |file| File.exists(root +/+ file).not };
if(missing.notEmpty) { Error("Live set needs prepared/built files: " ++ missing.join(", ")).throw };
spec = (root +/+ required[0]).load;
spec[\rack][\channels] = spec[\rack][\channels] ++ [(id:"mic", label:"Mic (mono)")];
spec[\initialMix][\channels] = spec[\initialMix][\channels] ++ [(id:"mic", level:1, sends:(mast:1))];
spec = AWBDelayRack.configure(spec, []);
spec[\rack][\channels] = spec[\rack][\channels] ++ [\mast,\fuzz,\deci,\spark,\verb].collect { |id|
    (id: "fx-" ++ id.asString, label: id.asString.toUpper ++ " FX", returnOf: id)
};
spec[\fftSize] = 4096;
spec[\irMaxSecondsByBranch] = (spec[\irMaxSecondsByBranch] ? ()).copy.putAll((earth: 5, echo: 20));
plan = (root +/+ required[1]).load;
configuration = (root +/+ required[2]).load;
if(inputs.notNil) {
    if(inputs[\vc].isArray.not or: { inputs[\vc].size != 1 }
        or: { inputs[\pro2].isArray.not } or: { inputs[\pro2].size != 2 }
        or: { inputs[\mic].isArray.not } or: { inputs[\mic].size != 1 }
        or: { (inputs[\vc] ++ inputs[\pro2] ++ inputs[\mic]).any { |i| i.isKindOf(Integer).not or: { i < 0 } } }) {
        Error("~awbLiveInputs needs vc: [one index], pro2: [left index, right index], mic: [one index]").throw;
    };
};
spec[\irFiles].do { |file| if(File.exists(file).not) { Error("Missing convolution file: " ++ file).throw } };
spec[\components].values.do { |item| if(File.exists(item[\path]).not) { Error("Missing FX plugin: " ++ item[\path]).throw } };

~awbLiveClose = {
    ~awbLiveRoutine.tryPerform(\stop); ~awbLiveRoutine = nil;
    ~awbLiveStarting = false;
    ~liveView.tryPerform(\close); ~liveView = nil;
    ~liveBaseInstance.tryPerform(\close); ~liveBaseInstance = nil; ~liveBase = nil;
    ~awb52.tryPerform(\close); ~awb52 = nil;
    "AWB live set closed; server retained.".postln;
};
openView = {
    ~liveView.tryPerform(\close);
    ~liveView = ~liveBase.gui((shellRoot: root));
};
waitFor = { |ready, label|
    var deadline = Main.elapsedTime + 120;
    while { ready.value.not } {
        if(failure.notNil) { failure.throw };
        if(Main.elapsedTime > deadline) { Error("Timed out waiting for " ++ label).throw };
        0.05.wait;
    };
    if(failure.notNil) { failure.throw };
};

if(checkOnly) {
    "AWB_LIVE_OPENER_PREFLIGHT=PASS".postln;
    "SC 256 / MOTU 512; 44100 Hz; FFT 4096; Earth 5s / Echo 20s; 2 VST workers.".postln;
} {
    if(~awbLiveStarting ? false) {
        "AWB live set is already starting.".postln;
    } {
        if(server.serverRunning and: { ~liveBase.notNil } and: { ~liveBase.closed.not }
            and: { ~awb52.notNil } and: { ~awb52.ready } and: { ~awb52.closed.not }) {
            if(~awb52.rack.channels[\mic].isNil or: { ~awb52.rack.channels[\sc1].notNil }
                or: { ~awb52.rack.channels[\sc2].notNil }
                or: { ~awb52.rack.channels['fx-verb'].isNil }) {
                Error("Existing set has the old input topology. Run ~awbLiveClose.value before loading this opener again.").throw;
            };
            openView.value;
            "Existing AWB live set reopened.".postln;
        } {
            if(~awb52.notNil and: { ~awb52.closed.not }) {
                Error("An existing ~awb52 set has no complete live surface. Close that set first; the opener will not duplicate it.").throw;
            };
            if(server.serverRunning) {
                // Never reboot or clear someone else's graph to change boot settings.
                if(server.options.blockSize != 256 or: { server.sampleRate != 44100 }
                    or: { server.options.hardwareBufferSize != 512 }
                    or: { server.options.memSize < 262144 }
                    or: { server.options.numOutputBusChannels != 4 }
                    or: { (server.options.ugenPluginsPath ? "").asString.contains(root +/+ "apps/live-set/.build").not }) {
                    Error("Running server has different settings/plugin paths. Stop it before opening the set; this opener will not reboot it.").throw;
                };
                if(inputs.notNil and: { (inputs[\vc] ++ inputs[\pro2] ++ inputs[\mic]).maxItem >= server.options.numInputBusChannels }) {
                    Error("Configured input index exceeds the running server's input count.").throw;
                };
            } {
                Server.scsynth;
                server.options.device = "1248";
                server.options.memSize = 262144;
                server.options.sampleRate = 44100;
                server.options.blockSize = 256;
                server.options.hardwareBufferSize = 512;
                server.options.numInputBusChannels = if(inputs.isNil) { 3 } { 3.max((inputs[\vc] ++ inputs[\pro2] ++ inputs[\mic]).maxItem + 1) };
                server.options.numOutputBusChannels = 4;
                server.options.ugenPluginsPath = [Platform.resourceDir +/+ "plugins",
                    Platform.systemExtensionDir, Platform.userExtensionDir,
                    root +/+ "apps/live-set/.build"].join(":");
            };
            ~awbLiveStarting = true;
            ~awbLiveRoutine = Routine {
                try {
                    server.waitForBoot({ booted = true }, 200, { failure = Error("AWB server boot failed") });
                    waitFor.value({ booted }, "server boot");
                    VSTPlugin.initDSPThreads(server, 2);
                    ~awb52Spec = spec;
                    ~awb52 = AWBFirstPassSet.open(spec, (
                        server: server, controlSends: true, verbProfiles: true, fxProfiles: true,
                        fuzzPlugin: true, sharedFX: true, celloScheps: true, fullLoad: false,
                        onError: { |error| failure = error }
                    ));
                    waitFor.value({ ~awb52.ready }, "FX rack and followers");
                    ~liveBaseInstance = AWBaseTool.open((name: "AWB live set", params: []), (server: server));
                    ~liveBase = ~liveBaseInstance.tool;
                    waitFor.value({ ~liveBase.ready }, "AWBase");
                    ~liveBase.bindFirstPass(~awb52, own: true);
                    ~liveBase.bindDelays(plan, configuration, { |delays, error| failure = error });
                    waitFor.value({ ~liveBase.liveDelays.notNil and: { ~liveBase.liveDelays.ready } }, "four delays");
                    if(inputs.notNil) { ~awb52.connectInputs(inputs[\vc], inputs[\pro2], inputs[\mic]) };
                    ~liveBase.log(if(inputs.isNil) {
                        "Full set ready. Hardware inputs unconnected: set ~awbLiveInputs and connectInputs."
                    } { "Full set ready; VC, Mic and Pro 2 inputs connected." });
                    openView.value;
                    ~awbLiveStarting = false;
                    ~awbLiveRoutine = nil;
                } { |error|
                    // Clear the handle first: cleanup must not stop its own error handler.
                    ~awbLiveRoutine = nil;
                    ~awbLiveClose.value;
                    error.reportError;
                };
            }.play(SystemClock);
        };
    };
};
)
