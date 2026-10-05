// Evaluate after adding apps/chain/sc/classes to a WIP class path and recompiling.
// This example allocates private ports. It does not connect to hardware outputs.
(
s.waitForBoot({Routine({
    AWBChainFuzz.register(s);s.sync;
    ~fuzzInstance=AWBChain.open(AWBChainFuzz.managedConfig,(server:s));
    ~fuzz=~fuzzInstance.tool;
    ~fuzz.whenReady({~fuzz.gui});
}).play(SystemClock)});
)
// Write stereo audio to ~fuzz.input; read ~fuzz.output downstream of ~fuzz.group.
// A channel/slot can instead lend its input/output buses and target Group:
// AWBChain.open(AWBChainFuzz.managedConfig,(server:s,input:inputBus,output:outputBus,target:processorGroup));
// ~fuzz.set(\drive,12);                       // language edit, GUI follows
// ~fuzz.controlBinding(\drive)[\setter].value(6); // same authoritative control
// ~fuzz.promotionCandidate;                 // native Tool preset payload
// ~fuzzInstance.close;                      // leaves borrowed buses alone

// Editable stages: movement retains the stage's node state and output bus.
// ~fuzz.moveStage(\shape,0);
// ~fuzz.whenSettled({~fuzz.insertStage((id:\extra,factory:\fuzzTone),1)});
// ~fuzz.whenSettled({~fuzz.removeStage(\extra)});
// ~fuzz.setRoute(\tone,[[0,1],[1,0]]); // explicit stereo swap
