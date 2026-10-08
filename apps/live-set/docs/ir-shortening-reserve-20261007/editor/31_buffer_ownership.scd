// Language-only regression: allocated Buffer handles have an explicit lifetime.
// No server boot, allocation message or audio device is needed.
(
var passed=0,failed=0,check,buffer,entry,manager=NodeManager.instance,result;
check={|label,ok|if(ok){passed=passed+1;("PASS "++label).postln}{failed=failed+1;("FAIL "++label).postln}};
NodeManager.ensureEnabled;
buffer=Buffer.new(Server.default,128,1);
try {
    entry=NodeManager.watch(buffer,\buffer,(name:"Buffer ownership regression"));
    check.value("buffer registered as an active explicit resource",entry.notNil and:{entry[\active]==true});
    check.value("buffer has no player polling monitor",entry[\monitor].isNil);
    manager.removeFinished;
    check.value("ordinary cleanup retains a live buffer",manager.watchedEntries[buffer]===entry);
    check.value("registration leaves the buffer handle valid",buffer.bufnum.notNil);
    buffer.freeMsg;NodeManager.forget(buffer);
    check.value("explicit release removes the registry entry",manager.watchedEntries[buffer].isNil and:{buffer.bufnum.isNil});
}{|error|failed=failed+1;error.reportError};
NodeManager.forget(buffer);if(buffer.bufnum.notNil){buffer.freeMsg};
result=(passed:passed,failed:failed,success:failed==0);result;
)
