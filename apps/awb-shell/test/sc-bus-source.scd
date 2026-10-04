(
SynthDef(\awbScBusSmokeSource, { |gain=1| Out.ar(32, SinOsc.ar([110.3, 165.7, 220.9, 331.1]) * [0.1, 0.2, 0.3, 0.4] * gain) }).writeDefFile("AWB_SC_BUS_TEST_DIR".getenv);
0.exit;
)
