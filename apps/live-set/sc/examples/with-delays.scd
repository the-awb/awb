// Select the AWB Tool/Core/Param/Rack/Chain and awb52 class directories,
// plus apps/live-set/sc/classes and sc/dependencies/unified-buffer; recompile.
// Build once with Node 22:
// node apps/live-set/scripts/prepare-delay.mjs --native
// The plugin path below belongs to this server only. It must be set BEFORE boot.
// This example never reboots or clears an existing audio graph.
(
~awbRoot = "/Users/willy/awb";
if(s.serverRunning) { Error("Choose a stopped server before configuring its plugin path").throw };
s.options.memSize = 262144;
s.options.sampleRate = 44100;
s.options.blockSize = 128;
s.options.hardwareBufferSize = 512;
s.options.numInputBusChannels = 3;
s.options.numOutputBusChannels = 4;
s.options.ugenPluginsPath = [Platform.resourceDir +/+ "plugins",
    Platform.systemExtensionDir, Platform.userExtensionDir,
    ~awbRoot +/+ "apps/live-set/.build"].join(":");
s.boot;
)

// Evaluate once the server is ready. This creates the set without physical inputs.
(
~awb52Spec = AWBDelayRack.configure((~awbRoot +/+ "apps/rack/sc/sets/awb52/prepared/first-pass.scd").load);
~awb52Spec[\fftSize] = 4096;
~delayPlan = (~awbRoot +/+ "apps/live-set/sc/plans/44100.scd").load;
~delayConfiguration = (~awbRoot +/+ "apps/live-set/sc/plans/configuration.scd").load;
VSTPlugin.initDSPThreads(s, 2);
~awb52 = AWBFirstPassSet.open(~awb52Spec, (
    server:s, controlSends:true, verbProfiles:true, fxProfiles:true,
    fuzzPlugin:true, sharedFX:true, celloScheps:true,
    onReady:{|set|
        ~liveBaseInstance = AWBaseTool.open((name:"AWB live set",params:[]),(server:s));
        ~liveBase = ~liveBaseInstance.tool;
        ~liveBase.whenReady({|base|
            base.bindFirstPass(set,own:true);
            base.bindDelays(~delayPlan,~delayConfiguration,{|delays,error|
                if(error.notNil){error.reportError}{
                    base.log("Rack, FX and four delays ready; inputs await explicit routing");
                    ~liveView = base.gui((shellRoot:~awbRoot));
                };
            });
        });
    }, onError:{|error|error.reportError}
));
)

// Confirm actual zero-based MOTU physical indices before using connectInputs:
// ~awb52.connectInputs([vcIndex], [pro2LeftIndex, pro2RightIndex]);
// Use set.inputFor(\vc) for a mono source before cello Scheps; Pro2 is stereo.
// Other instruments have persistent stereo input pipes:
// ~awb52.rack.inputFor(\sc1); ~awb52.rack.inputFor(\sc2);
// They feed A1 through its independent SC1/SC2 routing controls.
// Delays begin with input route gains and inputGain at zero; choose both to record.
// ~liveBase.t[\b1].p[\vcIn].set(1); ~liveBase.t[\b1].p[\inOf].set(1);
// ~liveBase.t[\b1].p[\fbOf].set(0.5,1);
// ~liveBase.t[\delbus].p[\fader].set(0.8,1);
// ~liveBase.t[\b1].attachMidi(\fxOf, ~fcb); // explicit selected input only
// Each cell has its own return channel; these start unsent to avoid doubling.
// Delay Bus aggregates the selected wet returns and starts routed to clean Mast.
// ~awb52.rack.setSend(\delbus,\verb,0.5);
// ~liveView.close;         // closes observers/UI only; audio keeps running
// ~liveBaseInstance.close; // closes owned set, delays, parameters and buffers
