// Scene definitions only. Loading this file does not launch a scene.
(
b.createScene(\init,0).transition_(10).def(
    onStart:{
        b.log("Setting FX, routing and delay modulation to zero");
        p[\fx][\allOff].run(0);p[\routing][\allOff].run(0);
        p[\dmod][\reset].run(0);p[\fx][\delFxOff].run(0);
        b.clock.tempo=1;10.wait;
        ~b1.setLoopControl(0);~a2.setLoopControl(0);~b2.setLoopControl(0);
    },onEnd:{b.log("Initial configuration complete")}
);
b.createScene(\SC1_nothing,1).def(onStart:{},onEnd:{});
)
// The original experimental instrument/acceleration setup and scratch commands
// are preserved in SourceArchive/scenes [template].scd.txt, not run at launch.
