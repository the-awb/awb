// Local scene actions. The GUI/OSC are clients of the same actions.
AWBLiveScene {
    var <base,<symbol,<num,<closed=false,onStartFunc,onEndFunc,<onNextFunc,routines, <transitionDuration=0;
    *new { |base,symbol,num|^super.newCopyArgs(base,symbol,num).init}
    init {routines=List.new;^this}
    def { |onStart,onEnd,onNext|onStartFunc=onStart ? {};onEndFunc=onEnd ? {};onNextFunc=onNext ? {};^this}
    run { |func|var task;if(closed){Error("Scene closed").throw};task=Routine({protect{func.value}{routines.remove(thisThread)}});routines.add(task);task.play(SystemClock);^task}
    transition_ { |seconds|AWParam.finite(seconds,"scene duration");if(seconds<0 or:{seconds>3600}){Error("Invalid scene duration").throw};transitionDuration=seconds;^this}
    runStart { |finished|^this.run({try{onStartFunc.value;finished.value(nil)}{|error|finished.value(error)}})}
    start {^base.launchScene(this)}
    end {^this.run(onEndFunc)}
    next {^this.run(onNextFunc)}
    launchScene {^this.start}
    close {if(closed){^this};closed=true;routines.do(_.stop);routines.clear;^this}
}
