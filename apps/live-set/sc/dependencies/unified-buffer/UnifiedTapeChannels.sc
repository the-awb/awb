// Width/head slots are compiled structure. Buffer and bus identities are runtime controls.
UnifiedTapeChannels : MultiOutUGen {
    *ar { |channels, headSlots, bufnum, audio, sharedIDs, seconds=4, feedback=1, inputGain=0,
        running=1, clear=0, sources, delays, returns|
        ^this.multiNewList(['audio',headSlots.max(1),bufnum,channels,headSlots,seconds,feedback,inputGain,running,clear]
            ++audio.asArray++sharedIDs.asArray++sources.asArray++delays.asArray++returns.asArray)
    }
    init { |numOutputs ... theInputs|
        inputs=theInputs;^this.initOutputs(numOutputs,rate)
    }
    argNamesInputsOffset { ^2 }
}
