(
var root = thisProcess.nowExecutingPath.dirname, spec, server, profiles = IdentityDictionary.new;
var params = List.new, audit = List.new, opts = (sendFunction: {}, polarity: \bipolar), count=0, normalized=0, native=0;
var reject = { |action| var rejected=false; try { action.value } { rejected=true }; if(rejected.not) { Error("Invalid negative macro value accepted").throw } };
server = Server(\polarityAudit, NetAddr("127.0.0.1",59991));
spec = (root +/+ "source/prepared/first-pass.scd").load;
try {
    [\deci,\spark,\fuzz,\um].do { |kind|
        var profile = AWBFXMixProfile(kind,server.defaultGroup,server,if(kind==\um){spec[\sharedFX]}{spec[\fxMixes][kind]},opts);
        profiles[kind] = profile;
        profile.params.keys.asArray.sort.do { |key| params.add([kind,key,profile.param(key)]) };
    };
    profiles[\verb] = AWBVerbMixProfile(server.defaultGroup,server,opts.copy.putAll(spec[\verbMix]));
    params.add([\verb,\selector,profiles[\verb].selector]);
    profiles[\verb].branches.keys.asArray.sort.do { |key|params.add([\verb,key,profiles[\verb].branch(key)]) };
    params.do { |row|
        var p=row[2], minimum=p.spec.minval, maximum=p.spec.maxval, old=p.baseTarget;
        if(p.polarity!=\unipolar or: {p.normalizedMinimum!=0}) {Error("Incorrect polarity: "++row[0]++"/"++row[1]).throw};
        reject.value({p.setAmount(-0.01)});
        reject.value({p.setBase(minimum-0.01)});
        p.setBase(minimum);p.setBase(maximum);p.setBase(old);
        p.setAmount(0);p.setAmount(1);
        if(p.nativeSpec){native=native+1}{
            normalized=normalized+1;
            if(minimum!=0 or: {maximum!=1}) {Error("Normalized macro has native range").throw};
        };
        audit.add((chain:row[0],control:row[1],polarity:p.polarity,min:minimum,max:maximum,warp:p.spec.warp.asSpecifier,nativeSpec:p.nativeSpec));
        count=count+1;
    };
    // Negative captured routes must continue to reduce unipolar branch output.
    if(profiles[\verb].valuesAt(0.5)[0]>=profiles[\verb].branch(\earth).baseTarget) {Error("Negative Verb route lost").throw};
    File.use(root+/+"inventory.json","w",{|file|file.write(audit.asArray.asJSON)});
    ("CHAIN_POLARITY_RESULT=PASS parameters="++count++" normalized="++normalized++" native="++native++" bipolar=0").postln;
    profiles.values.do(_.free);0.exit;
} { |error|profiles.values.do(_.free);error.reportError;1.exit };
)
