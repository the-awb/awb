SharedLooper : UGen {
    *ar { |input, bufnum, sharedId, record=0, play=1, overdub=0, clear=0,
        feedback=1, inputGain=1, outputGain=0.25|
        ^this.multiNew('audio', input, bufnum, sharedId, record, play, overdub,
            clear, feedback, inputGain, outputGain)
    }
}
