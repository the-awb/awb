// After the set and server are ready. No reboot, duplicate engine or MIDI init.
// Add apps/live-set/sc/classes plus AWParam/Tool dependencies to your chosen library.
(
~liveBaseInstance = AWBaseTool.open((name:"AWB live set",params:[]),(server:s));
~liveBase = ~liveBaseInstance.tool;
~liveBase.whenReady({|base|
    base.bindFirstPass(~awb52, own:true); // explicit ownership of the existing set
    base.log("AWB live surface ready");
    ~liveView = base.gui((shellRoot:"/private/tmp/awb-live-set-surface"));
});
)
// Semantic access remains a dictionary of the same objects:
// ~liveBase.t[\deci].p[\deciShaper].set(0.5, 1);
// MIDI is input only, attached explicitly after you initialize/select your source:
// ~liveBase.t[\deci].attachMidi(\deciShaper, ~fcb);
// Shared pedal CCs in BaseLaunch remain shared; do not auto-install every mapping.
// ~liveView.close; // only the GUI/observation closes
// ~liveBaseInstance.close; // closes owned set, child tools and resources
