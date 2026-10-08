(
Routine({
    var server=AWBCoreTestServer.new,instance,base,borrowed,other,checks=0,failures=List.new;
    var taskClock,sceneClock,sceneElapsed,start,later=false,borrowedTick=false;
    var check={|ok,label|checks=checks+1;if(ok.not){failures.add(label)};("CHECK "++ok++" "++label).postln};
    NodeManager.enable(false);
    instance=AWBaseTool.open((name:"Clock check",params:[]),(server:server,sendFunction:{|msg|},track:false));base=instance.tool;
    base.clock.tempo=0.1;
    base.runTask({taskClock=thisThread.clock});
    start=Main.elapsedTime;
    base.createScene(\clockProbe,100).run({sceneClock=thisThread.clock;0.04.wait;sceneElapsed=Main.elapsedTime-start});
    0.15.wait;
    check.value(taskClock===SystemClock,"owned background tasks use seconds");
    check.value(sceneClock===SystemClock and:{sceneElapsed.notNil and:{sceneElapsed<0.3}},"scene wait is seconds at 6 BPM");
    base.runTask({0.1.wait;later=true});instance.close;0.2.wait;
    check.value(later.not,"closing the base stops pending musical tasks");
    borrowed=TempoClock(1);other=AWBaseTool.open((name:"Borrowed clock",params:[]),(server:server,clock:borrowed,sendFunction:{|msg|},track:false));
    other.close;borrowed.sched(0.01,{borrowedTick=true;nil});0.15.wait;
    check.value(borrowedTick,"closing a base preserves a caller-owned clock");borrowed.stop;
    ("AWB_CLOCK_RESULT="++if(failures.isEmpty){"PASS"}{"FAIL"}++" checks="++checks).postln;
    if(failures.isEmpty){0.exit}{1.exit};
}).play(SystemClock);
)
