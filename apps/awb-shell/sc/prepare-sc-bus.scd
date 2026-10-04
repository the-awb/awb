// Evaluate in the attached IDE. Safe with a running local server; no reboot or audio setting change.
(
if(AWBHostControl.default.isNil) { AWBHostControl.start(\whenNeeded, \ide) };
thisProcess.interpreter.executeFile(thisProcess.nowExecutingPath.dirname +/+ "AWBScBusAudio.scd");
)
