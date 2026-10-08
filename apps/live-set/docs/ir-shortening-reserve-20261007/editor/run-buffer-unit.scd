(
var r="/private/tmp/awb-earth5-echo20-prep/31_buffer_ownership.scd".load;
("AWB_BUFFER_OWNERSHIP="++r.asCompileString).postln;
if(r[\success]){0.exit}{1.exit};
)
