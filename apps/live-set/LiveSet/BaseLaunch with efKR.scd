// Evaluate this block once. Recompile classes after changing the repository code.
// Editable live-set configuration; boot, allocation and ownership live in AWBLiveSet.
(
var pageBuild = ~awbLivePageBuild;

~awbSetDirectory = PathName(thisProcess.nowExecutingPath).pathOnly;
~awbSet = AWBLiveSet(~awbSetDirectory, "/Users/willy/awb");
~awbSet.backend = \sc; // \bitwig enables the optional IAC remote-control output below.
~awbSet.hardware("1248", 44100, 256, 512, 262144, 4, 2, nodes:4096);
///////////////////////////////////////////////////////
///////////////////////////////////////////////
////////////////////////////////////////
//>>>>>>>>>> AUDIO INS <<<<<<<<<<<
//////////////////////////////
////////////////////
///////////

~awbSet.input(\vc, [0]);
~awbSet.input(\mic, [1]);
~awbSet.input(\pro2, [4, 5]);
~awbSet.gui = true;
~awbSet.viewOptions((launch:~awbLiveOpenGUI ? true));
~awbSet.physicalInputs = ~awbLivePhysicalInputs ? true;
if(~awbLiveInputs.notNil) {~awbLiveInputs.keysValuesDo {|id, channels|~awbSet.input(id, channels)}};
~awbSet.convolution(4096, earth:5, composite:30, echo:20);

~awbSet.ir(\earth, "/Volumes/ARMED WITH SOUND/Samples/Convology samples/Mulching 1.wav", gain:1);
~awbSet.ir(\composite, "/Volumes/ARMED WITH SOUND/Samples/Convology samples/composite earth b.wav", gain:1);
~awbSet.ir(\echo, "/Volumes/ARMED WITH SOUND/Samples/Convology samples/214216__acs272__world-s-longest-echo-4th-impulse.wav", gain:1);

//\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\                  .                           ///////////////////////////
//\\\\\\\\\\\\\\\\\\\\\\%%%%%%%%%%%%%%%%%%%%%%%                         $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
//&&&&&&&&&&&&&&££££££££££££££££££££                  **  *                      ##############################3
//###########################                                       `               ]]]]]]]]]]]]]]]]]]]]]]]
//((((((((((((((((((((((((((((((((((((((((((((((((((((((   F X   )))))))))))))))))))))))))))))))))))
// ~```````````````````````````````````````~~``````````````````````````````~~~``````````~`````~`
//_____________________________________________________________________________$__________________

// VST parameters are normalized 0–1; names match the plugin exports.
// spiral: ++spiralstretch
~awbSet.pluginPath(\spiral, "/Library/Audio/Plug-Ins/VST/++spiralstretch.vst");
~awbSet.plugin(\spiral, (
    'stretch': 0.6142458915710449,
    'repeat': 0.7348299622535706,
    'bands': 0.4000000059604645,
    'grainsize': 0.7529201507568359,
    'grainvariation': 0.5210546255111694,
    'grainpvoc': 0,
    'midilock': 0,
    'voices': 0.1666666716337204,
    'wetdry': 0.48407572507858276,
    'ingain': 0.5457705855369568,
    'outgain': 0.5,
    'color': 0
));
// upper: ++pitchdelay
~awbSet.pluginPath(\upper, "/Library/Audio/Plug-Ins/VST/++pitchdelay.vst");
~awbSet.plugin(\upper, (
    'time': 0.46702447533607483,
    'pitchshift': 0.5,
    'cents': 0.6200000047683716,
    'octave': 1,
    'feedback': 0.005,
    'loopdepth': 0.9162613153457642,
    'delaylock': 0,
    'just': 0,
    'color': 0,
    'wetdry': 0,
    'ingain': 0.6078574657440186,
    'outgain': 0.5
));
// lower: ++pitchdelay
~awbSet.pluginPath(\lower, "/Library/Audio/Plug-Ins/VST/++pitchdelay.vst");
~awbSet.plugin(\lower, (
    'time': 0.579268753528595,
    'pitchshift': 0,
    'cents': 0.5,
    'octave': 0.3333333432674408,
    'feedback': 0,
    'loopdepth': 0.7944561243057251,
    'delaylock': 0,
    'just': 0,
    'color': 0,
    'wetdry': 0,
    'ingain': 0.6045340299606323,
    'outgain': 0.5
));
// delay: ++delay
~awbSet.pluginPath(\delay, "/Library/Audio/Plug-Ins/VST/++delay.vst");
~awbSet.plugin(\delay, (
    'time': 0.331573486328125,
    'feedback': 0.28222527623176563,
    'modspeed': 0.4510473310947418,
    'moddepth': 0.34804075956344604,
    'modshape': 0,
    'modphase': 0.5921059846878052,
    'envmodulate': 0.006030708085745573,
    'filterlopfreq': 1,
    'filterhipfreq': 0.1382075995206833,
    'filterreson': 0.44596579670906067,
    'feedbackpositive': 0,
    'freeze': 0,
    'delaylock': 0,
    'lfolock': 0,
    'twohead': 1,
    'color': 0.7049999833106995,
    'wetdry': 0,
    'ingain': 0.5252603888511658,
    'outgain': 0.5
));
// tailDeci: ++decimate
~awbSet.pluginPath(\tailDeci, "/Library/Audio/Plug-Ins/VST/++decimate.vst");
~awbSet.plugin(\tailDeci, (
    'depth': 0.8156200647354126,
    'folding': 0.23353227972984314,
    'color': 0.27412793040275574,
    'ingain': 0.5131566524505615,
    'outgain': 0.5
));
// deci: ++decimate
~awbSet.pluginPath(\deci, "/Library/Audio/Plug-Ins/VST/++decimate.vst");
~awbSet.plugin(\deci, (
    'depth': 0.723594605922699,
    'folding': 0.6636084914207458,
    'color': 0.27412793040275574,
    'ingain': 0.6160423159599304,
    'outgain': 0.4810158610343933
));
// sparkTexture: Things Texture
~awbSet.pluginPath(\sparkTexture, "/Library/Audio/Plug-Ins/VST3/ThingsTexture.vst3");
~awbSet.plugin(\sparkTexture, (
    'MidSide': 0,
    'Diffusion': 1,
    'Pitch': 0.5,
    'Balance': 0.5322184562683105,
    'Mix': 1,
    'Bypass': 1
));
// verbTexture: Things Texture
~awbSet.pluginPath(\verbTexture, "/Library/Audio/Plug-Ins/VST3/ThingsTexture.vst3");
~awbSet.plugin(\verbTexture, (
    'MidSide': 0,
    'Diffusion': 1,
    'Pitch': 1,
    'Balance': 0.4437207281589508,
    'Mix': 0.8038708567619324,
    'Bypass': 1
));
// shimmer: ValhallaShimmer
~awbSet.pluginPath(\shimmer, "/Library/Audio/Plug-Ins/VST/ValhallaShimmer_x64.vst");
~awbSet.plugin(\shimmer, (
    'wetDry': 1,
    'shift': 0.5,
    'feedback': 0.33799999952316284,
    'diffusion': 0.8565656542778015,
    'size': 0.6100000143051147,
    'lowCut': 0,
    'highCut': 0.5302013158798218,
    'modRate': 0.10000000149011612,
    'modDepth': 0,
    'reverbMode': 0.5,
    'shiftMode': 0,
    'colorMode': 0
));
// um: ValhallaUberMod
~awbSet.pluginPath(\um, "/Library/Audio/Plug-Ins/VST/ValhallaUberMod_x64.vst");
~awbSet.plugin(\um, (
    'Mix': 0,
    'Depth': 0,
    'StereoWidth': 0.37700000405311584,
    'Delay': 0.011900000274181366,
    'Feedback': 0.032999999821186066,
    'Spread': 0.3790000081062317,
    'Slope': 0.6514999866485596,
    'Skew': 0.5,
    'Random': 0,
    'TapGain': 0.5,
    'Diffusion': 0,
    'DiffSize': 0.33175957202911377,
    'DiffModRate': 0.03500000014901161,
    'DiffModDepth': 0.5,
    'LowCut': 0,
    'HighCut': 1,
    'SpatialXover': 0.3819095492362976,
    'DetuneRate': 0.1411411464214325,
    'DetuneDepth': 0.28821849822998047,
    'VibratoRate': 0.05405472218990326,
    'VibratoDepth': 0,
    'OverMod': 0,
    'DriveInGain': 0,
    'DriveOutGain': 1,
    'DriveNoiseGain': 0.013333333656191826,
    'FeedbackRotate': 0.5019999742507935,
    'SmoothingTime': 0.09909909963607788,
    'ColorMode': 0,
    'DelaySync': 0.05882352963089943,
    'type': 0.0833333358168602,
    'DiffEnable': 1,
    'Drive': 1,
    'DrivePrePost': 1,
    'Speed': 0,
    'InputPan': 0
));
// Cello Stutter: native gain chopping and pan movement after Scheps.
// Provisional rate/panRate: the capture did not include those LFO settings.
~awbSet.stutter((
    rate: 4,
    waveform: \tri, // \tri, \pulse, \sine, \saw, \custom
    pulseWidth: 0.5,
    depthDb: 45.4,
    panAmount: 0.52,
    panRate: 0.1,
    panDepth: 0.39,
    rateMultiplier: 30.34,
    rateMod: 0.6,
    smoothing: 0.002,
    custom: [0, 0, 1, 1, 0, 1, 0, 0] // Attenuation cycle, 0=open / 1=depthDb.
));
// celloScheps: Scheps 73 Mono
~awbSet.pluginPath(\celloScheps, "/Library/Audio/Plug-Ins/VST3/WaveShell1-VST3 17.1.vst3");
~awbSet.plugin(\celloScheps, (
    'PreAmp': 0.65,
    'PreAmp Drive': 0,
    'PreAmp On/Off': 1,
    'High On/Off': 1,
    'High Gain': 0.51,
    'Mid On/Off': 1,
    'Mid Frequency': 0.3333333333333333,
    'Mid Gain': 0.5966666667,
    'Low On/Off': 1,
    'Low Frequency': 0.6666666666666666,
    'Low Gain': 0.5,
    'High Pass': 0,
    'High Pass On/Off': 0,
    'EQ': 1,
    'Phase': 0,
    'Input': 0.7138888889,
    'Output': 0.7027777778,
    'Link I/O': 0
));
// fuzz: MDMX Fuzz Stereo
~awbSet.pluginPath(\fuzz, "/Library/Audio/Plug-Ins/VST3/WaveShell1-VST3 17.1.vst3");
~awbSet.plugin(\fuzz, (
    'M/S Input': 0.5,
    'Input': 0.51458334922791,
    'Output': 0.42500001192093,
    'Mix': 0.53899997472763,
    'Stereo Mode': 0.0,
    'Blend': 0.75400000810623,
    'Gain': 0.54750001430511,
    'HD': 0.0,
    'Temperature': 0.44400000572205,
    'Threshold': 0.31700000166893,
    'Low Gain': 0.33333334326744,
    'Low-Mid Gain': 0.46666666865349,
    'High-Mid Gain': 0.64999997615814,
    'High Gain': 0.68333333730698,
    'Low Cut': 0.0,
    'Punch Mode': 0.0,
    'Type': 0.0,
    'Low-Mid Freq': 0.0,
    'High-Mid Freq': 0.0,
    'Punch/Rider': 1.0
));
// stereoScheps: Scheps 73 Stereo
~awbSet.pluginPath(\stereoScheps, "/Library/Audio/Plug-Ins/VST3/WaveShell1-VST3 17.1.vst3");
~awbSet.plugin(\stereoScheps, (
    'PreAmp L/M': 0.36842104792595,
    'PreAmp R/S': 0.36842104792595,
    'PreAmp Drive': 1.0,
    'PreAmp On/Off': 1.0,
    'High On/Off': 1.0,
    'High Gain L/M': 0.6700000166893,
    'High Gain R/S': 0.6700000166893,
    'Mid On/Off': 1.0,
    'Mid Frequency L/M': 0.33333334326744,
    'Mid Frequency R/S': 0.33333334326744,
    'Mid Gain L/M': 0.62000000476837,
    'Mid Gain R/S': 0.62000000476837,
    'Low On/Off': 1.0,
    'Low Frequency L/M': 0.66666668653488,
    'Low Frequency R/S': 0.66666668653488,
    'Low Gain L/M': 0.32666665315628,
    'Low Gain R/S': 0.32666665315628,
    'High Pass L/M': 0.66666668653488,
    'High Pass R/S': 0.66666668653488,
    'High Pass L/M On/Off': 0.0,
    'High Pass R/S On/Off': 0.0,
    'EQ': 1.0,
    'Phase L/M': 0.0,
    'Phase R/S': 0.0,
    'Monitor': 0.5,
    'EQ Mode': 0.0,
    'Input L/M': 0.84722220897675,
    'Input R/S': 0.84722220897675,
    'Output L/M': 0.20833332836628,
    'Output R/S': 0.20833332836628,
    'Link I/O': 0.0
));

// deci select/mix profile and captured target depths.
~awbSet.profile(\deci, (
    'depth': 0.49606299214065075,
    'folding': 0.49606299214065075,
    'lfoRate': 0.04
));
~awbSet.profileTables(\deci, (

));

// spark select/mix profile and captured target depths.
~awbSet.profile(\spark, (
    'aTail': 0.34645670652389526,
    'tailDepth': 0.5,
    'tailFolding': 0.5
));
~awbSet.profileTables(\spark, (

));

// fuzz select/mix profile and captured target depths.
~awbSet.profile(\fuzz, (
    'lfoRate': 0.04,
    'lfoAmount': 0
));
~awbSet.profileTables(\fuzz, (
    'fuzz': (
        'mathAmount': [0.74, 0.36, 0.48, 0.35],
        'lfoAmount': [0.215, 0.34, 0.48, 0.47],
        'volume': [0.5, 0.6, 0.75, 0.75],
        'output': [0.165, 0.2, 0.3, 0.325],
        'input': [0, 0, 0.095, 0.105]
    )
));
~awbSet.profile(\um, (
    'aSchertler': 0.11023622006177902
));
~awbSet.profileTables(\um, (
    'vib': (
        'vibRate': [-0.0, 0.19, 0.37, 0.63],
        'detRate': [0.15, 0.15, 0.5, 1.0]
    ),
    'drive': (
        'drive': [0.45, 0.51, 0.74, 0.4],
        'noise': [-0.0, 0.65, 0.8, 1.0],
        'driveAmount': [0.36, 0.65, 0.53, 0.84],
        'noiseAmount': [0.66, 0.37, 0.86, 0.72]
    ),
    'vibDepth': (
        'vibDepth': [0.66, 1.0, 0.75, 0.5],
        'detDepth': [0.0, 0.25, 0.75, 1.0]
    ),
    'depth': (
        'depth': [0.33, 0.5, 0.5, 0.5],
        'depthAmount': [0.16, 0.35, 0.89, 0.82],
        'rateAmount': [0.2, 0.49, 0.6, 1.01],
        'mixAmount': [0.72, 0.8, 0.8, 0.9]
    ),
    'main': (
        'depth': [0.25, 0.4, 0.66, 0.75],
        'innerDepth': [0, 0, 0.365, 0.355],
        'innerRate': [0, 0, 0.165, 0.445],
        'vibRate': [0, 0.14, 0, 0]
    ),
    'diff': (
        'enabled': [1.0, 1.0, 1.0, 1.0],
        'diffusion': [0, 0.275, 0.425, 0.605],
        'size': [0, 0.16, 0.37, 0.635]
    )
));

////  << XXXXXXXXXXXX  i n i t i a l i s e   d e l a y s   XXXXXXXXXXXXXXXXX >>

// Independent enable modes and timing layouts; all four cells share one engine.
// Mode: 0=A heads, 1=B heads, 2=all, 3=all with unequal amounts.
// Position: 0=quarter grid, 1=paired halves, 2=full length.
~awbSet.delay(\b1, 8, mode:1, position:1);
~awbSet.delay(\a2, 2, mode:2, position:0);
~awbSet.delay(\b2, 0.5, mode:1, position:1);
~awbSet.delay(\a1, 16, mode:2, position:0);

/////////  DEL ROUTING  /////////

// Initial sends. 1 = unity. Faders span silence to unity (0 dB), with no extra headroom.
~awbSet.route(\vc, \mast, 1);
~awbSet.route(\pro2, \mast, 1);
~awbSet.route(\mic, \mast, 1);
~awbSet.route(\delbus, \mast, 0); // this is ONLY the gated cello feed to the delays
[\b1, \a2, \b2, \a1].do { |id| ~awbSet.route(id, \mast, 0) };

// Smooth tapehead erosion: rate (Hz), head-2 and head-4 position excursion (fractions).
[\b1, \a2, \b2, \a1].do {|id|~awbSet.tapeheads(id, 0.035, 0.08, -0.13)};

// Input device and scene bank are explicit. Bank number is not a MIDI channel.
~awbMidiDevice = "MIDISPORT 2x2 Anniv";
~awbMidiPort = "A ";
// Threshold pickup stays enabled. Zero wait/fade bypasses the soft takeover.
~awbPickupEnabled = true;
~awbPickupWait = 0.0;
~awbPickupFade = 0.0;
// Preset note bank follows the original ParamValues definitions (all MIDI channels).
~awbPresetNotes = Dictionary[
    66 -> [\dmod, \reset],
    67 -> [\dmod, \allGrow],
    68 -> [\dmod, \condenserAB],
    69 -> [\dmod, \mod1],
    70 -> [\dmod, \switchIn],
    71 -> [\time, \shortGridLoopers],
    72 -> [\time, \stackedLengths],
    73 -> [\time, \shortShimmer1],
    74 -> [\time, \freeCloud1],
    75 -> [\time, \classicLong],
    76 -> [\routing, \allOff],
    77 -> [\routing, \ABPar],
    78 -> [\routing, \BABA],
    79 -> [\routing, \cloud1],
    80 -> [\routing, \cloud2]
];
~awbSceneChannel = nil; // any channel, restricted to the FCB source below
~awbSceneNotes = [90, 81, 82, 83, 84, 85, 86, 87, 88, 89]; // scenes 0..9; set nil to disable
~awbLoadMusicalAssets = false; // original synths/patterns/autobuffers retained below

// Legacy eight-slot remote layout. Entries borrow the same semantic controls.
// Nil entries stay reserved; missing effects are not invented in this migration.
~awbRemoteChannels = (
    vcin:0,
    vcfx:1,
    b1:2,
    a1:3,
    a2:4,
    b2:5,
    delbus:6,
    tbfx:7,
    splut:8,
    spark:10,
    deci:11,
    fuzz:12,
    verb:13,
    mast:14
);
~awbRemoteDevice = "IAC Driver";
~awbRemotePort = "Bus 4";
~awbRemoteRate = 32;
~awbRemoteBanks = [
    [\mast, \controls, 0, #[mastEQShaper, schertlerMix]],
    [\mast, \controls, 1, #[umMix, umMainControl, umEarth, umDiffusion, umInnerDep, umInnerR8, umwonkSC, umOverMod]],
    [\mast, \mods, 1, #[nil, umShaper]],
    [\verb, \controls, 0, #[verbIn, verbSelect]],
    [\fuzz, \controls, 0, #[fuzzShaper]],
    [\deci, \controls, 0, #[deciShaper, depthOf, foldOf]],
    [\deci, \mods, 0, #[depthOf, foldOf, depthSc, foldSc]],
    [\spark, \controls, 0, #[sparkleShaper, nil, nil, nil, spark, sparkTailMix, sparkPD, sparkTailShapr]],
    [\vcfx, \controls, 0, #[submarine, stut1AMT]],
    [\splut, \controls, 0, #[splut1, nil, splutDiv, nil, splut2, splutenvMod]]
];
~awbRemoteSignals = [
    [\mast, \mods, 1, 0, \f_um],
    [\mast, \mods, 1, 2, \um_nz],
    [\mast, \mods, 1, 4, \um_dep],
    [\mast, \mods, 1, 5, \um_r8],
    [\mast, \mods, 1, 6, \um_wnk],
    [\mast, \controls, 0, 4, \mast_mod],
    [\mast, \controls, 0, 5, \fuzz_schrt2],
    [\mast, \controls, 2, 4, \f_stut],
    [\vcfx, \controls, 0, 5, \f_stut_vc],
    [\verb, \controls, 0, 4, \f_verb],
    [\verb, \controls, 0, 5, \verb_sSC],
    [\fuzz, \controls, 0, 4, \fuzz_shp],
    [\deci, \controls, 0, 4, \deci_3],
    [\spark, \mods, 0, 0, \f_spark],
    [\spark, \mods, 0, 4, \spk_1],
    [\spark, \mods, 0, 5, \spk_2],
    [\spark, \mods, 0, 6, \spk_3],
    [\spark, \mods, 0, 7, \spk_4],
    [\splut, \mods, 0, 0, \f_splut],
    [\splut, \mods, 0, 1, \splut_2],
    [\splut, \mods, 0, 2, \splut_1],
    [\splut, \mods, 0, 7, \splut_3]
];

~awbSet.onBase { |base|
    var graph, port;
    b = base;
    ~liveBase = base;
    ~liveBaseInstance = base.instance;
    graph = base.controlGraph;
    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////
    ////////////////////////////////////////
    //////////// CONTAINERS ///////////
    //////////////////////////////
    //////////////////////
    //////////////

    [\b1, \a2, \b2, \a1, \verb, \fuzz, \deci, \spark, \mast, \delbus, \vcfx, \splut].do { |id|
        currentEnvironment.put(id, b.containers[id] ? b.track(id));
    };
    ~out = base.rack.inputFor(\patterns).index;
    b.makeBus(\0).set(0);
    b.makeBus(\1).set(1);
    b.makeBus(\n1).set(-1);
    b.makeBus(\vcAcc).set(0);
    b.makeBus(\vcAccStepper).set(0);

    /////////////////////////////////////////////
    //////////////////////
    ////////////////                AUDIO FOLLOWERS & GENERAL DYNAMIC CCS
    //////////////////
    ///////////////////////////
    //////////////////////////////////

    // Borrow existing detectors and the same 25 follower instances from the rack.

    b.createKRFollower(\c1s, \ef_m0, 0.2, 0.4, 0.66, 1.0, "c1 - s", "#c1e856");
    b.createKRFollower(\c1m, \ef_m0, 1.2, 2.4, 0.66, 2.0,  "c1 - m", "#c1e856");
    b.createKRFollower(\c1l, \ef_m0, 8.0, 9.0, 0.66, 2.5, "c1 - l", "#c1e856");
    b.createKRFollower(\c2s, \ef_m1, 0.2, 0.4, 0.66, 1.0, "c2 - s", "#a4e856");
    b.createKRFollower(\c2m, \ef_m1, 1.2, 2.4, 0.66, 2.0, "c2 - m", "#a4e856");
    b.createKRFollower(\c2l, \ef_m1, 8.0, 9.0, 0.66, 2.5, "c2 - l", "#a4e856");
    b.createKRFollower(\c3s, \ef_m2, 0.2, 0.4, 0.66, 1.0, "c3 - s", "#56e898");
    b.createKRFollower(\c3m, \ef_m2, 1.2, 2.4, 0.66, 2.0, "c3 - m", "#56e898");
    b.createKRFollower(\c3l, \ef_m2, 8.0, 9.0, 0.66, 2.5, "c3 - l", "#56e898");
    b.createKRFollower(\c4s, \ef_m3, 0.2, 0.4, 0.66, 1.0, "c4 - s", "#56e8e3");
    b.createKRFollower(\c4m, \ef_m3, 1.2, 2.4, 0.66, 2.0, "c4 - m", "#56e8e3");
    b.createKRFollower(\c4l, \ef_m3, 8.0, 9.0, 0.66, 2.5, "c4 - l", "#56e8e3");
    b.createKRFollower(\f_b1, \ef_b1, 1.35, 6.6, 0.2, 4.55, "b1 follower");
    b.createKRFollower(\f_b2, \ef_b2, 1.35, 6.6, 0.2, 4.55, "b2 follower");
    b.createKRFollower(\f_a2, \ef_a2, 0.8, 2.2, 0.7, 4.55, "a2 follower");
    b.createKRFollower(\f_a1, \ef_a1, 0.4, 5.1, 0.7, 3.0, "a1 follower");
    b.createKRFollower(\f_stut, \ef_mast2, 0.65, 1.2, 0.2, 0.0, "stutter follower mast");
    b.createKRFollower(\f_stut_vc, \ef_mast2, 0.65, 1.2, 0.2, 1.4, "stutter follower vc");
    b.createKRFollower(\f_splut, \ef_splut, 1.75, 4.0, 0.67, 1.85, "splutter follower" );
    b.createKRFollower(\f_um, \ef_mast1, 1.5, 2.0, 0.5, 2.2, "um follower"         );
    b.createKRFollower(\f_spark, \ef_spark, 7.3, 7.0, 0.67, 1.75,  "sparkle follower"   );
    b.createKRFollower(\f_deci, \ef_deci, 5.0, 4.5, 0.45, 2.2, "deci follower"       );
    b.createKRFollower(\f_fuzz, \ef_fuzz, 3.25, 3.8, 0.5, 1.5, "fuzz follower"       );
    b.createKRFollower(\f_verb, \ef_verb, 11, 15.5, 0.75, 2.0, "verb follower"      );
    b.createKRFollower(\f_mast, \ef_mast0, 7.5, 11.5, 0.75, 2.5, "mast follower");

    // Independent instrument followers use the instrument buses, not return buses.
    b.createAudioFollower(\vcaf, b.inputFor(\vc), 0.1, 0.2, 0.66, 1);
    b.createAudioFollower(\p2af, base.rack.inputFor(\pro2), 0.1, 0.2, 0.66, 1);
    b.createAudioFollower(\micaf, base.rack.inputFor(\mic), 0.1, 0.2, 0.66, 1);

    //   //   ///  ///// /////  //////  ///   //   ^    \\    \\\\  \\\\\  \\\\ \\\  \\\ \\ \\
    //  //   ///  ///// /////  //////    D Y N A M I C  C C S  \\\\\  \\\\ \\\  \\\ \\ \\  \ \\
    // //   ///  ///// /////  //////                             \\\\\  \\\\ \\\  \\\ \\ \\  \ \\
    //   //    //    //    ///    //     //        '       \\\     \     \\   \\\\     \\\    \\\\

    // Intermediate blenders and output blenders. Offset now lives in each AWParam.

    b.createBlender(\d_1a, \c1s, \c1l, 1, 0, 0.35, 0, \1, \0, \1, "1A responsive support");
    b.createBlender(\d_1b, \c1m, \c1l, 1, 0, 0.5, 0, \1, \0, \1, "1B responsive support");
    b.createBlender(\d_2a, \c2s, \c2l, 1, 0, 0.35, 0, \1, \0, \1, "2A responsive support");
    b.createBlender(\d_2b, \c2m, \c2l, 1, 0, 0.5, 0, \1, \0, \1, "2B responsive support");
    b.createBlender(\d_3a, \c3s, \c3l, 1, 0, 0.35, 0, \1, \0, \1, "3A responsive support");
    b.createBlender(\d_3b, \c3m, \c3l, 1, 0, 0.5, 0, \1, \0, \1, "3B responsive support");
    b.createBlender(\d_4a, \c4s, \c4l, 1, 0, 0.35, 0, \1, \0, \1, "4A responsive support");
    b.createBlender(\d_4b, \c4m, \c4l, 1, 0, 0.5, 0, \1, \0, \1, "4B responsive support");
    /////////////////////////////////////////////
    //////////////////////
    ////////////////                B1
    //////////////////
    ///////////////////////////
    //////////////////////////////////

    b.createBlender(\b1_in, \d_1a, \c1l, 1.0, 0, 0.66, 0, \f_b1, \0, \1, "del B1:IN");
    b.createBlender(\b1_fx, \d_2b, \c2l, 1.1, 0, 0.8, 0, \f_b1, \0, \1, "del B1:FX");
    b.createBlender(\b1_fb, \d_3b, \c3l, 1.1, 0, 0.75, 0, \f_b1, \0, \1, "del B1:FB");
    b.createBlender(\b1_t, \d_4b, \c4l, 1.1, 0, 0.3, 0, \f_b1, \0, \1, "del B1:T");
    /////////////////////////////////////////////
    //////////////////////
    ////////////////                A2
    //////////////////
    ///////////////////////////
    //////////////////////////////////

    b.createBlender(\a2_in, \d_1a, \c1l, 1.0, 0, 0.66, 0, \f_a2, \0, \1, "del A2:IN");
    b.createBlender(\a2_fx, \d_2a, \c2l, 1.1, 0, 0.8, 0, \f_a2, \0, \1, "del A2:FX");
    b.createBlender(\a2_fb, \d_3b, \c3l, 1.1, 0, 0.5, 0, \f_a2, \0, \1, "del A2:FB");
    b.createBlender(\a2_t, \d_4b, \c4l, 1.1, 0, 0.75, 0, \f_a2, \0, \1, "del A2:T");
    /////////////////////////////////////////////
    //////////////////////
    ////////////////                A1
    //////////////////
    ///////////////////////////
    //////////////////////////////////

    b.createBlender(\a1_in, \d_1a, \c1l, 1.05, 0, 0.66, 0, \f_a1, \0, \1, "del A1:IN");
    b.createBlender(\a1_fx, \d_2a, \c2l, 1.1, 0, 1.0, 0, \f_a1, \0, \1, "del A1:FX");
    b.createBlender(\a1_fb, \d_3b, \c3l, 1.1, 0, 0.7, 0, \f_a1, \0, \1, "del A1:FB");
    b.createBlender(\a1_t, \d_4b, \c4l, 1.1, 0, 0.65, 0, \f_a1, \0, \1, "del A1:T");
    /////////////////////////////////////////////
    //////////////////////
    ////////////////                B2
    //////////////////
    ///////////////////////////
    //////////////////////////////////

    b.createBlender(\b2_in, \d_1b, \c1l, 1.0, 0, 0.0, 0, \f_b2, \0, \1, "del B2:IN");
    b.createBlender(\b2_fx, \d_2a, \c2l, 1.1, 0, 0.8, 0, \f_b2, \0, \1, "del B2:FX");
    b.createBlender(\b2_fb, \d_3b, \c3s, 1.1, 0, 0.4, 0, \f_b2, \0, \1, "del B2:FB");
    b.createBlender(\b2_t, \d_4b, \c4l, 1.1, 0, 0.3, 0, \f_b2, \0, \1, "del B2:T");
    // ///// __ U M   M O D    C N T R L ```````` ~~~

    b.createBlender(\um_nz, \c1m, \d_1b, 1.0, 0, 0.35, 0, \f_um, \0, \1, "um: noiz");
    b.createBlender(\um_r8, \d_2a, \d_2b, 1.0, 0, 0.35, 0, \f_um, \0, \1, "um: r8");
    b.createBlender(\um_dep, \d_3a, \d_3b, 1.0, 0, 0.35, 0, \f_um, \0, \1, "um: depth");
    b.createBlender(\um_wnk, \d_4a, \d_4b, 1.0, 0, 0.35, 0, \f_um, \0, \1, "um: wonk");
    // ____  s p a r k l e   m o d   c t r l  ~~~~

    b.createBlender(\spk_1, \d_1a, \d_1b, 1.0, 0, 0.45, 0, \f_spark, \0, \1, "spk: pd");
    b.createBlender(\spk_2, \d_2a, \d_2b, 1.0, 0, 0.45, 0, \f_spark, \0, \1, "spk: tail mix");
    b.createBlender(\spk_3, \d_3a, \d_3b, 1.0, 0, 0.45, 0, \f_spark, \0, \1, "spk: pd shape");
    b.createBlender(\spk_4, \d_4a, \d_4b, 1.0, 0, 0.45, 0, \f_spark, \0, \1, "spk: d++ shape");
    //  - - - d e c i   m o d   c t r l \\\\\\\      #

    b.createBlender(\deci_1, \c1m, \c1s, 1.0, 0, 0.35, 0, \f_deci, \0, \1, "deci: depth");
    b.createBlender(\deci_2, \d_2a, \d_2b, 1.0, 0, 0.35, 0, \f_deci, \0, \1, "deci: fold");
    b.createBlender(\deci_3, \d_3a, \d_3b, 1.0, 0, 0.35, 0, \f_deci, \0, \1, "deci: shaper");
    // ` ` ` ` <  f u z z   m o d   c t r l  ` ` `  >

    b.createBlender(\fuzz_shp, \d_1a, \d_1b, 0.8, 0, 0.35, 0, \f_fuzz, \0, \1, "fuzz: shapr");
    b.createBlender(\fuzz_schrt2, \d_4a, \d_4b, 1.0, 0, 0.35, 0, \f_fuzz, \0, \1, "fuzz: schert 2");
    // "" ' "  ' '' "" " ` s P L u T T `  m o d   `  c t r l ~ / /

    b.createBlender(\splut_1, \d_1a, \d_1b, 1.0, 0, 0.35, 0, \f_splut, \0, \1, "splut: g8");
    b.createBlender(\splut_2, \d_2a, \d_2b, 1.0, 0, 0.35, 0, \f_splut, \0, \1, "splut: splut 2");
    b.createBlender(\splut_3, \d_3a, \d_3b, 1.0, 0, 0.35, 0, \f_splut, \0, \1, "splut: lo pass");
    // ( ( ( ( (   (    v    e  r b m  o   d   c   t     r    l   )  )  )  )    )      )

    b.createBlender(\verb_sSC, \c4l, \d_4b, 1.0, 0, 0.15, 0, \f_verb, \0, \1, "verb mod SC");
    // *#<@"""_=~```_  M A S T   M O D  C T R L

    b.createBlender(\mast_mod, \c3m, \c3l, 1.1, 0, 0.4, 0, \f_mast, \0, \1, "mast mod");

    // Baseline / modulation amount pairs refer to one AWParam per audible control.
    [\b1, \a2, \b2, \a1].do { |id|
        var track = base.track(id), prefix = id.asString;
        [
            ["in", \inOf],
            ["fx", \fxOf],
            ["fb", \fbOf],
            ["t", \sliOf]
        ].do { |row|
            graph.bind((prefix++"_"++row[0]).asSymbol, track.p[row[1]], 1);
        };
        base.liveDelays.setLegacyMode(prefix.toUpper, base.liveDelays.params[prefix.toUpper++"/thM"].baseTarget.asInteger);
        base.liveDelays.setLegacyPosition(prefix.toUpper, base.liveDelays.params[prefix.toUpper++"/thP"].baseTarget.asInteger);
    };
    ~verb.p[\verbSelect].setAmount(0);
    ~verb.field(\verbSelectMod, ~verb.p[\verbSelect], \amount, "~ selector");
    graph.bind(\verb_sSC, ~verb.p[\verbSelect]);
    graph.bindFollower(\f_stut_vc, b.fxMix(\vcfx).param(\envelope));
    graph.bindFollower(\f_spark, b.fxMix(\spark).param(\aSpark));
    graph.bind(\spk_1, b.fxMix(\spark).param(\aShape));
    graph.bind(\spk_2, b.fxMix(\spark).param(\aTail));
    graph.bind(\spk_3, b.fxMix(\spark).param(\aPitch));
    graph.bind(\spk_4, b.fxMix(\spark).param(\aTailShape));
    graph.bind(\deci_1, b.fxMix(\deci).param(\depth), 0.2);
    b.fxMix(\deci).borrowInput(\aDepth, base.b[\deci_1]);
    graph.bind(\deci_2, b.fxMix(\deci).param(\folding), 0.53);
    b.fxMix(\deci).borrowInput(\aFolding, base.b[\deci_2]);
    graph.bind(\deci_3, b.fxMix(\deci).param(\a));
    graph.bind(\fuzz_shp, b.fxMix(\fuzz).param(\aFuzz));
    graph.bind(\um_nz, b.sharedMix.param(\aDrive));
    graph.bind(\um_nz, b.sharedMix.param(\aNoise));
    graph.bind(\um_r8, b.sharedMix.param(\aRate));
    graph.bind(\um_dep, b.sharedMix.param(\aDepth));
    graph.bind(\um_wnk, b.sharedMix.param(\aWonk));
    graph.bindFollower(\f_um, b.sharedMix.param(\aMix));
    graph.bind(\fuzz_schrt2, b.sharedMix.param(\aSchertler));

    // The namespace owns access to its envelope fader as well as its chain controls.
    [\verb, \fuzz, \deci, \spark, \mast, \b1, \a2, \b2, \a1].do { |id|
        base.bindEnvelopeFader(id, ("mod-"++id).asSymbol, 1);
    };
    [\c1, \c2, \c3, \c4, \um, \splut, \stut].do { |id|
        base.bindEnvelopeFader(id, if([\c1, \c2, \c3, \c4].includes(id)){id}{("mod-"++id).asSymbol}, 1);
    };

    ~awbRemoteBanks.do{|row|row[3].do{|id, i|if(id.notNil){base.track(row[0]).bank(row[1], row[2], i, id)}}};
    [\b1, \a2, \b2, \a1].do{|id|
        var track = base.track(id);
        #[in, fx, fb, dry, thM, thP, fade, rev].do{|name, i|track.bank(\controls, 0, i, name)};
        #[beats, tDiv, trip, tSli, sliMin, sliMax, tapRec, host].do{|name, i|track.bank(\controls, 1, i, name)};
        #[inSc, fxSc, fbSc, sliSc, thPMod, thAMod].do{|name, i|track.bank(\mods, 0, i, name)};
        #[vcIn, b1In, a2In, b2In, p2In, sc1In, sc2In].do{|name, i|track.bank(\routing, 0, i, name)};
    };
    ~awbRemoteSignals.do{|row|var signal = base.blenders[row[4]] ? base.followers[row[4]];if(signal.notNil){base.track(row[0]).signalBank(row[1], row[2], row[3], signal)}};

    // CC mappings bind the actual shared parameters, with pickup on their baselines.
    MIDIClient.init;
    if(base.backend==\bitwig) {
        AWBRemoteControls(base, MIDIOut.newByName(~awbRemoteDevice, ~awbRemotePort).latency_(0.02), ~awbRemoteChannels, ~awbRemoteRate);
    };
    ~fcb = nil;
    port = MIDIIn.findPort(~awbMidiDevice, ~awbMidiPort);
    if(port.notNil) {
        ~fcb = port.uid;
        MIDIIn.connect(0, port.uid);
        base.t.values.do { |track| track.metadata.keys.do { |id|
            if(track.p[id].notNil and:{track.metadata[id][\midi][\cc].notNil}) {
                if(~awbPickupEnabled.not) {track.metadata[id][\midi][\pickup] = false};
                track.attachMidi(id, ~fcb).softPickup(~awbPickupWait, ~awbPickupFade);
            };
        }};
        if(~awbSceneNotes.notNil) {base.bindSceneMidi(~fcb, ~awbSceneChannel, ~awbSceneNotes)};
    } { base.log("FCB input unavailable; GUI remains usable", \warn) };

    // Definitions only: original scenes are never launched on boot.
    (~awbSetDirectory +/+ "ParamValues.scd").load;
    if(pageBuild.isNil) {
        (~awbSetDirectory +/+ "scenes [template].scd").load;
    };
    base.adopt(\musicalPresets, p, {|banks|banks.values.do{|bank|bank.values.do{|entry|if(entry.isKindOf(Routine)){entry.stop}}}});
    if(port.notNil) {
        base.bindPresetMidi(~fcb, ~awbPresetNotes.collect {|path|{
            var preset = p[path[0]][path[1]];
            if(preset.isKindOf(Routine)){preset.run(0)}{preset.value(3)};
        }});
    };
    if(~awbLoadMusicalAssets and:{pageBuild.isNil}) {
        (~awbSetDirectory +/+ "synths.scd").load;
        (~awbSetDirectory +/+ "patterns.scd").load;
        (~awbSetDirectory +/+ "autobuffers.scd").load;
    };
    base.log("BaseLaunch configuration complete");
};
~awbSet.launch(nil, {|base, liveSet|
    ~liveView = liveSet.view;
    ~awbLiveStarting = false;
    ~awbLiveOnReady.value(base, liveSet.view);
    // Run the musical page only after the full startup has completed and returned.
    if(pageBuild.notNil) {base.runTask({
        try {pageBuild.value(base);base.log("Musical page setup complete")} {
            |error|base.log("Musical page setup failed: "++error.errorString, \error);
            error.reportError;
        };
    })};
}, { |error|
    ~awbLiveStarting = false;
    ~awbLiveOnError.value(error)
});
)

// Close only this set: ~awbSet.close;
// Open another view: ~liveBase.gui;
// Pattern playback: ~liveBase.playTracked(pattern, (out:~out));
