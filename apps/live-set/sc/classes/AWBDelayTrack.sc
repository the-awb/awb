// Delay-specific convenience namespace; all resources stay on the shared engine.
AWBDelayTrack : AWTrackControls {
    delayInitMode { |mode=0|^this.setHeadMode(mode)}
    setLoopControl { |mode=0|base.liveDelays.setLoopMode(name.asString.toUpper,mode);^this}
    setHeadMode { |mode|base.liveDelays.setLegacyMode(name.asString.toUpper,mode);^this}
    setHeadPosition { |position|base.liveDelays.setLegacyPosition(name.asString.toUpper,position);^this}
}
