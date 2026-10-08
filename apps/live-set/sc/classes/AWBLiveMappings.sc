// Legacy semantic aliases point to actual parameters; unsupported controls stay explicit.
AWBLiveMappings {
    *bindFirstPass { |base,set|
        var rows=this.rows,entries;
        if(set.ready.not){Error("Wait for first-pass set readiness before binding controls").throw};
        entries=rows.collect{|r|
            var target=r[3],parameter,midi=(device:r[4],channel:r[5],cc:r[6],lo:r[7],hi:r[8],pickup:r[9]);
            if(target!="unavailable"){
                var pieces=target.split($:),slot=pieces[0].asSymbol,key=pieces[1].asSymbol;
                parameter=if(slot==\verb){set.verbMix.perform(key)}{if(slot==\um){set.sharedMix.param(key)}{set.fxMix(slot).param(key)}};
            };
            if(parameter.notNil){
                var existing=base.t[r[0].asSymbol].tryPerform(\p).tryPerform(\at,r[1].asSymbol);
                if(parameter.isKindOf(AWParam).not or:{parameter.closed} or:{existing.notNil and:{existing!==parameter}}){Error("Invalid or conflicting live parameter alias: "++r[0]++"/"++r[1]).throw};
            };[r,parameter,midi];
        };
        entries.do{|entry|var r=entry[0],parameter=entry[1],midi=entry[2];if(parameter.notNil){base.track(r[0]).add(r[1],parameter,r[2],midi)}{base.track(r[0]).unavailable(r[1],r[2],midi)}};
        base.log("First-pass FX controls bound; unavailable legacy controls retained as metadata.");^base;
    }
    *rows {^[
        ["mast","mastEQShaper","EQ","unavailable","fcb",3,10,0,127,true],
        ["mast","schertlerMix","Scheps mix","um:schertlerMix","fcb",3,104,0,127,true],
        ["verb","verbIn","Input gain","verb:inputGain","fcb",3,105,0,127,true],
        ["verb","verbSelect","Mode","verb:selector","fcb",3,11,0,127,true],
        ["fuzz","fuzzShaper","Fuzz","fuzz:shape","fcb",3,12,0,127,true],
        ["deci","deciShaper","Shape","deci:shape","fcb",3,13,0,127,true],
        ["deci","depthOf","Depth","deci:depth","fcb",3,43,0,127,true],
        ["deci","foldOf","Folding","deci:folding","fcb",3,44,0,127,true],
        ["deci","depthSc","~ depth","deci:depthSC","fcb",3,53,0,127,true],
        ["deci","foldSc","~ folding","deci:foldingSC","fcb",3,54,0,127,true],
        ["spark","sparkleShaper","Sparkle","spark:sparkle","fcb",3,14,0,127,true],
        ["spark","spark","Spark","spark:shape","fcb",3,46,0,127,true],
        ["spark","sparkTailMix","Tail mix","spark:tailMix","fcb",3,45,0,127,true],
        ["spark","sparkPD","Pitch select","spark:pitchSelect","fcb",3,55,0,127,true],
        ["spark","sparkTailShapr","Tail shape","spark:tailShape","fcb",3,56,0,127,true],
        ["mast","umMix","Mix","um:mix","fcb",3,50,0,127,true],
        ["mast","umMainControl","Main","um:main","fcb",3,49,0,127,true],
        ["mast","umEarth","Earth","um:earth","fcb",3,60,0,127,true],
        ["mast","umDiffusion","Diffuse","um:diffusion","fcb",3,59,0,127,true],
        ["mast","umInnerDep","Depth","um:innerDepth","fcb",3,47,0,127,true],
        ["mast","umInnerR8","Rate","um:innerRate","fcb",3,48,0,127,true],
        ["mast","umwonkSC","Wonk","um:wonk","fcb",3,58,0,127,true],
        ["mast","umOverMod","Overmod","um:overMod","fcb",3,57,0,127,true],
        ["mast","umShaper","Shaper","um:shape","fcb",3,15,0,127,true],
        ["vcfx","submarine","Submarine","unavailable","fcb",3,103,0,127,true],
        ["vcfx","stut1AMT","Stutter","unavailable","fcb",3,17,0,127,true],
        ["splut","splut1","1","unavailable","fcb",3,42,0,127,true],
        ["splut","splut2","2","unavailable","fcb",3,41,0,127,true],
        ["splut","splutenvMod","~ envelope","unavailable","fcb",3,52,0,127,true],
        ["splut","splutDiv","~ time","unavailable","fcb",3,51,0,127,true]
    ]}
}
