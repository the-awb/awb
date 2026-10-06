// Load AWB framework, apps/rack/sc/classes, apps/core/sc/classes,
// apps/chain/sc/classes, this folder, and VSTPlugin classes
// in your chosen SC configuration first. This example never reboots your server.
(
~awb52Root = "/Users/willy/awb/apps/rack/sc/sets/awb52";
~awb52Spec = thisProcess.interpreter.executeFile(~awb52Root +/+ "prepared/first-pass.scd");
~awb52 = AWBFirstPassSet.open(~awb52Spec, (
    server: s,
    controlSends: true, // sixteen BaseLaunch control sends: 8 FX + 16 = 24 destinations
    verbProfiles: true,
    fxProfiles: true,
    fuzzPlugin: true,
    sharedFX: true,
    celloScheps: true, // static verified Scheps 73 Mono before VC rack input
    fullLoad: false, // musical profile graph; keep full-load benchmarking separate
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
// ~awb52.fxMix(\fuzz).param(\shape).set(0.5, 1);
// ~awb52.plugin(\upper).set(9, 0.8); // plugin parameter index 9: wetdry
// ~awb52.rack.setFX(\fx1, \awb52_fuzz); // reuse a dynamic input pipe
// A cloned Fuzz profile is available through ~awb52.fxMix(\fx1).
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


// For the musical Verb profile instead of the all-branches load test, open with:
// fullLoad: false, verbProfiles: true, verbMix: (basePole: true)
// ~verbMix = ~awb52.verbMix; // after readiness
// ~verbMix.selector.setBase(0.5, 2);
// ~verbMix.selector.setAmount(0.4, 1);
// ~verbMix.addModulation(\verbSC, b.blenders[\verb_sSC].bus);
// This borrows the existing blender output; it does not move/free its producer.
// Arrange that producer before the profile or use a registered timing policy.
// ~verbMix.branch(\texture).setBase(0.2, 1);
// ~verbMix.setProfile(0, [0.03, 0.78, -0.34, -0.42, 0.4]);
// ~verbMix.selector.removeModulation(\verbSC);

// Verb profile mode also pauses each deselected branch after its tail drains.
// Optional open settings: verbTails: (shimmer: (minTail: 2, maxTail: 20))
// maxTail defaults to 0 (no forced truncation); convolution minimums cover IRs.
// ~awb52.verbBranch(\texture).configuration; // inspect guard policy

// Deci and Sparkle: named AWParam bases accept (value, duration, curve).
// ~deci = ~awb52.fxMix(\deci);
// ~spark = ~awb52.fxMix(\spark);
// ~deci.param(\shape).set(0.5, 1);
// ~deci.param(\amount).set(0.2, 2); // base Math B; captured selector adds its depth
// ~spark.param(\tailMix).set(0.5, 1); // amount bank, Select-4 1
// ~spark.param(\shape).set(0.5, 1); // main wet/dry bank, Select-4 2
// ~spark.param(\pitchSelect).set(0.5, 1); // upper/lower pitch wet/dry bank
// Borrow existing AWBase blender outputs, preserving their envelope and mix:
// ~deci.addModulation(\a, \deciSC, b.blenders[\deci_3].bus);
// ~spark.addModulation(\aSpark, \sparkSC, b.blenders[\spk_1].bus);
// ~spark.addModulation(\aPitch, \pitchSC, b.blenders[\spk_3].bus);
// ~spark.addModulation(\aTail, \tailSC, b.blenders[\spk_2].bus);
// ~spark.addModulation(\aTailShape, \tailShapeSC, b.blenders[\spk_4].bus);
// Names and root remote targets follow BaseLaunch with efKR and the observed
// bank: spk_1 -> root A~Spark, spk_2 -> A~TailMix, spk_3 -> A~Pitch delay,
// spk_4 -> A~tail shaper. Its older pd/pd-shape comment labels differ.
// aShape is independent; choose its source or set its base explicitly.
// Deci depth/folding Math A inputs are independently exposed as aDepth/aFolding.
// Existing deci_1/deci_2 blended macro outputs can instead feed the depth/folding
// AWParams directly at amount 0.5 for bipolar-to-normalized conversion.
// Plain buses do not prove producer order. Use registered sources for checked
// ordering; a rack follower produced after FX supplies its previous-block value.
// For test voices or samples, use ~awb52.inputFor(\vc) (mono, before Scheps),
// or ~awb52.inputFor(\pro2) (stereo). rack.inputFor(\vc) is AFTER Scheps.
// ~awb52.plugin(\celloScheps).editor; // actual plugin UI, optional
// Actual restored MDMX Fuzz Stereo; -5 dB rack gain stays separate.
// ~fuzz = ~awb52.fxMix(\fuzz);
// ~fuzz.addModulation(\aFuzz, \fuzzSC, ~fuzzEnvelopeBus);
// ~fuzz.param(\amount).set(0.2, 1);
// Fuzz LFO is disabled pending its wave/rate/base amount confirmation.
// ~fuzz.param(\lfoEnabled).set(1); // only after choosing those settings
// UM and stereo Scheps belong to their own native Chain ToolInstance:
// ~um = ~awb52.sharedMix;
// ~awb52.sharedChain.gui;
// ~um.param(\main).set(0.5, 2);
// ~um.param(\earth).set(0.25, 2);
// ~um.param(\diffusion).set(0.75, 1);
// ~um.addModulation(\aMix, \umFollower, ~umFollowerBus);
// ~um.addModulation(\aDepth, \umDepth, ~umDepthBlenderBus);
// Borrow actual exported BaseLaunch buses; do not attach every envelope.
// Main .48 → Mix Math B and Shaper bank ownership remain provisional.
// ~awb52.plugin(\stereoScheps).editor;
// Closing just this Chain restores the selected FX returns to direct master:
// ~awb52.sharedChain.close;
