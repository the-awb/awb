// Load AWB framework, apps/rack/sc/classes, this folder, and VSTPlugin classes
// in your chosen SC configuration first. This example never reboots your server.
(
~awb52Root = "/Users/willy/awb/apps/rack/sc/sets/awb52";
~awb52Spec = thisProcess.interpreter.executeFile(~awb52Root +/+ "prepared/first-pass.scd");
~awb52 = AWBFirstPassSet.open(~awb52Spec, (
    server: s,
    controlSends: true, // sixteen BaseLaunch control sends: 8 FX + 16 = 24 destinations
    fullLoad: true, // every branch on, wet/dry 100%, plugin bypass off
    onReady: { |set|
        "AWB52 ready. Choose hardware input indices before connecting.".postln;
        set.gui;
    },
    onError: { |error, set| error.errorString.warn }
));
)

// Set before boot in your SC-only configuration, then boot normally:
// s.options.memSize = 262144; // 256 MiB real-time pool; buffers are separate
// s.options.numInputBusChannels = 3; // or enough for your chosen physical indices
// s.options.numOutputBusChannels = 4;
// s.options.sampleRate = 44100;
// s.options.hardwareBufferSize = 512;

// Explicit zero-based hardware indices: VC [one index], Pro 2 [left, right].
// These numbers illustrate the API; they are NOT verified MOTU port mappings.
// ~awb52.connectInputs([0], [1, 2]);
// ~awb52.disconnectInputs;

// The standard Rack panel controls sends, faders, mute/solo and local mix presets.
// Direct SC controls require no Param intermediary:
// ~awb52.rack.setSend(\vc, \deci, 1);
// ~awb52.setEffect(\fuzz, \drive, 12);
// ~awb52.plugin(\upper).set(9, 0.8); // plugin parameter index 9: wetdry
// ~awb52.rack.setFX(\fx1, \awb52_fuzz); // reuse a dynamic input pipe
// ~awb52.setEffect(\fx1, \drive, 6);
// ~awb52.rack.clearFX(\fx1); // closes ingress, retains tails, then frees
// ~awb52.close; // native ToolInstance closes GUI, graph and owned IR buffers

// Control send knobs choose which sources reach each independent pipe.
// ~awb52.rack.setSend(\vc, \c1, 1);
// ~awb52.rack.setSend(\pro2, 'mod-spark', 0.5);
// Each shared amount fader acts AFTER its detector, BEFORE all its envelopes.
// ~awb52.rack.setControlAmount(\c1, 0.75);
// ~efInputs = AWBControlSendProfile.baseLaunchBuses(~awb52.rack);
// ~efInputs[\ef_m0] is the stable KR Bus for the existing BaseLaunch source name.
// These are separate input pipes; no automatic observation of an FX return.
