// Non-destructive IR preparation. Envelope time is normalized across the used crop.
AWBConvolutionIR {
    *branchIDs { ^[\earth,\composite,\echo] }
    *settings { |given|
        var s=(times:[0,0.05,0.25,0.5,0.8,1],levels:[1,1,1,1,1,1],curve:0,gainDb:0);
        if(given.notNil){
            if(given.isKindOf(Dictionary).not or:{given.keys.any{|k|s.includesKey(k).not}}){Error("IR envelope: unknown settings").throw};
            s.putAll(given);
        };
        s=s.deepCopy;
        if(s[\times].isArray.not or:{s[\levels].isArray.not} or:{s[\times].size<2} or:{s[\times].size>32} or:{s[\levels].size!=s[\times].size}){Error("IR envelope: need 2..32 matching time/level points").throw};
        (s[\times]++s[\levels]++[s[\curve],s[\gainDb]]).do{|v|if(v.isNumber.not or:{v.isNaN} or:{v.abs==inf}){Error("IR envelope: finite numbers required").throw}};
        if(s[\times].first!=0 or:{s[\times].last!=1} or:{s[\times].differentiate.drop(1).any{|v|v<=0}}
            or:{s[\levels].any{|v|v<0 or:{v>1}}} or:{s[\curve].abs>8} or:{s[\gainDb]< -60} or:{s[\gainDb]>24}){Error("IR envelope: ordered 0..1 times/levels, curve -8..8, gain -60..24 dB required").throw};
        ^s;
    }
    *shape { |data,channels,frames,given|
        var s=this.settings(given),envelope;
        if([1,2].includes(channels).not or:{frames.isInteger.not} or:{frames<s[\times].size} or:{data.size!=(frames*channels)}){Error("IR envelope: invalid frame/channel layout").throw};
        envelope=Env(s[\levels],s[\times].differentiate.drop(1),s[\curve]).discretize(frames);
        // One envelope per frame, identical on the two preserved stereo sides.
        ^Signal.newFrom(data)*Signal.newFrom(Array.newFrom(envelope).stutter(channels))*s[\gainDb].dbamp;
    }
    *write { |source,destination,frames,rate,given|
        var file=SoundFile.new,out=SoundFile.new,data,channels;
        if(source==destination){Error("IR envelope: refuse to overwrite original").throw};
        if(File.exists(destination)){Error("IR envelope: destination already exists").throw};
        if(file.openRead(source).not){Error("IR envelope: cannot read source").throw};
        try {
            channels=file.numChannels;
            if(file.sampleRate!=rate or:{frames>file.numFrames}){Error("IR envelope: crop/sample rate mismatch").throw};
            data=FloatArray.newClear(frames*channels);file.readData(data);file.close;
            data=this.shape(data,channels,frames,given);
            out.headerFormat="WAV";out.sampleFormat="float";out.sampleRate=rate;out.numChannels=channels;
            if(out.openWrite(destination).not){Error("IR envelope: cannot write prepared copy").throw};out.writeData(data);out.close;
        }{|error|file.close;out.close;File.delete(destination);error.throw};
        ^destination;
    }
}
