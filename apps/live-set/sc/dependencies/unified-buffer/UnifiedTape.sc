UnifiedTape : MultiOutUGen {
    *ar { |left, right, bufnum, sharedLeft, sharedRight, seconds=4,
        feedback=1, inputGain=0, running=1, clear=0,
        head0=0.5, head1=0.5, head2=1, head3=1,
        gain0=1, gain1=1, gain2=1, gain3=1, takeBuffer= -1, takeSerial=0, takeFrames=0, takeAbort=0,
        gestureMode=0, gestureHigh=0.02, gestureLow=0.01, gestureGap=0.04, gestureMin=0.03, gestureMax=64, gestureRelease=0.01, takeGeneration= -1|
        ^this.multiNew('audio', left, right, bufnum, sharedLeft, sharedRight,
            seconds, feedback, inputGain, running, clear,
            head0, head1, head2, head3, gain0, gain1, gain2, gain3, takeBuffer, takeSerial, takeFrames, takeAbort,
            gestureMode, gestureHigh, gestureLow, gestureGap, gestureMin, gestureMax, gestureRelease, takeGeneration)
    }
    init { |... inputs|
        this.inputs = inputs;
        ^this.initOutputs(2, rate)
    }
}
