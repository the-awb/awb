(
SynthDef(\awbScopeToolSmoke, { |gain=1|
 Out.ar(32, SinOsc.ar(Array.series(16, 110.3, 55.4)) * Array.series(16, 0.05, 0.025) * gain);
 Out.kr(32, Array.series(16, 0.03125, 0.03125) * gain);
}).writeDefFile("AWB_SCOPE_TEST_DIR".getenv);
0.exit;
)
