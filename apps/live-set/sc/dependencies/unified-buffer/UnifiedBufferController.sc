// Isolated first pass. No global MIDI callbacks, server boot, or startup side effects.
UnifiedBufferController {
    classvar commandLocks, nextRegionID;
    var <server, <config, <toolInstance, <params, <buffers, <nodes, <regions;
    var <group, <closed=false, <started=false, audioBuses, clearSerials;
    var <takePool, <takePlayers, takeBus, <capturePending=false, takeSerial=0, abortSerial=0;
    var <gestureStates,gestureResponder;
    var <starting=false, <retiring=false, <retired=false, retirementFinished=false, retirementError, closeActions, playerPending=0;

    *initClass { commandLocks=IdentityDictionary.new;nextRegionID=1000000.rand+1 }
    *commandLock { |server|
        var lock;
        lock=commandLocks[server];
        if(lock.isNil){lock=Semaphore(1);commandLocks[server]=lock};
        ^lock;
    }
    *regionID {
        // UGen controls are float32: integers above 2^24 cannot all be exact.
        nextRegionID=(nextRegionID%16000000)+1;^nextRegionID;
    }

    *captureDefaults { |capacity=64| ^(enabled:0,high:0.02,low:0.01,gap:0.04,minimum:0.03,maximum:capacity,release:0.01) }
    *defaults {
        ^(capacity:64, globalInput:1, master:0, source:0, frequency:220, toneLevel:0.1,
            cells:[
                (id:"A", seconds:4, inputGain:0, feedback:1, fx:0.4, cleanGain:1, routeGain:0,
                    running:1, layout:"AB", heads:[1,1,1,1],capture:this.captureDefaults),
                (id:"B", seconds:8, inputGain:0, feedback:1, fx:0.4, cleanGain:1, routeGain:0,
                    running:1, layout:"AB", heads:[1,1,1,1],capture:this.captureDefaults)
            ]);
    }
    *check { |value, lo, hi, label|
        if(value.isNumber.not or:{value.isNaN} or:{value.abs==inf} or:{value<lo} or:{value>hi}) {
            Error("UnifiedBuffer: invalid "++label).throw;
        };
        ^value;
    }
    *validate { |candidate|
        var c;
        c=candidate.deepCopy;
        this.check(c[\capacity],0.1,128,"capacity");
        [\globalInput,\master].do{|key|this.check(c[key],0,1,key.asString)};
        this.check(c[\source],0,1,"source");
        if(c[\source].asInteger!=c[\source]){Error("UnifiedBuffer: source must be 0 or 1").throw};
        this.check(c[\frequency],20,2000,"frequency");this.check(c[\toneLevel],0,0.5,"toneLevel");
        if(c[\cells].size!=2){Error("UnifiedBuffer: first pass requires two cells").throw};
        c[\cells].do{|cell,i|
            var g;
            if(cell[\id]!=if(i==0){"A"}{"B"}){Error("UnifiedBuffer: stable cell IDs required").throw};
            this.check(cell[\seconds],0.01,c[\capacity],"seconds");
            this.check(cell[\feedback],0,1.1,"feedback");this.check(cell[\inputGain],0,2,"inputGain");
            [\fx,\cleanGain,\routeGain,\running].do{|key|this.check(cell[key],0,1,key.asString)};
            if(cell[\running].asInteger!=cell[\running]){Error("UnifiedBuffer: running must be 0 or 1").throw};
            if(["AB","A","B","quad"].includesEqual(cell[\layout]).not){Error("UnifiedBuffer: unknown layout").throw};
            if(cell[\heads].size!=4){Error("UnifiedBuffer: four head gains required").throw};
            cell[\heads].do{|gain|this.check(gain,0,1,"head gain")};
            cell[\capture]=cell[\capture] ? this.captureDefaults(c[\capacity]);g=cell[\capture];
            if(g[\enabled]==0 and:{g[\maximum].isNumber}){g[\maximum]=g[\maximum].min(c[\capacity])};
            this.check(g[\enabled],0,1,"capture enabled");
            if(g[\enabled].asInteger!=g[\enabled]){Error("Capture enabled must be 0 or 1").throw};
            this.check(g[\high],0.000001,2,"capture high");this.check(g[\low],0,g[\high],"capture low");
            if(g[\low]>=g[\high]){Error("Capture closing threshold must be below opening threshold").throw};
            this.check(g[\gap],0,5.min(c[\capacity]),"capture gap");this.check(g[\release],0,2,"capture release");
            this.check(g[\minimum],0.001,c[\capacity],"capture minimum");this.check(g[\maximum],g[\minimum],c[\capacity],"capture maximum");
        };
        if(c[\cells][0][\routeGain]!=0){Error("UnifiedBuffer: first pass routes A to B only").throw};
        ^c;
    }
    *defs {
        ^[
            SynthDef(\ubpInput,{|out=0,source=0,frequency=220,toneLevel=0.1,globalInput=1|
                var audio;
                audio=Select.ar(source,[SinOsc.ar([frequency,frequency*1.5])*toneLevel,SoundIn.ar([0,1])]);
                Out.ar(out,audio*globalInput);
            }),
            SynthDef(\ubpCell,{|bufnum=0,sharedLeft=0,sharedRight=0,cleanBus=0,upstreamBus=0,out=0,
                seconds=4,feedback=1,inputGain=0,fx=0.4,cleanGain=1,routeGain=0,running=1,clearSerial=0,
                head0=0.5,head1=0.5,head2=1,head3=1,gain0=1,gain1=1,gain2=1,gain3=1,
                takeBuffer= -1,takeSerial=0,takeFrames=0,takeAbort=0,
                gestureMode=0,gestureHigh=0.02,gestureLow=0.01,gestureGap=0.04,gestureMin=0.03,gestureMax=64,gestureRelease=0.01,takeGeneration= -1|
                var source, audio;
                source=(In.ar(cleanBus,2)*cleanGain)+(In.ar(upstreamBus,2)*routeGain);
                audio=UnifiedTape.ar(source[0],source[1],bufnum,sharedLeft,sharedRight,
                    seconds,feedback,inputGain,running,clearSerial,head0,head1,head2,head3,gain0,gain1,gain2,gain3,
                    takeBuffer,takeSerial,takeFrames,takeAbort,gestureMode,gestureHigh,gestureLow,gestureGap,gestureMin,gestureMax,gestureRelease,takeGeneration);
                Out.ar(out,audio*fx);
            }),
            SynthDef(\ubpOutput,{|a=0,b=0,takes=0,takeGain=0,out=0,master=0|
                var mix;
                mix=(In.ar(a,2)+In.ar(b,2)+(In.ar(takes,2)*takeGain))*master;
                Out.ar(out,Limiter.ar(mix,0.8,0.01));
            })
        ];
    }
    *takeDef {
        ^SynthDef(\ubpTakePlayer,{|bufnum=0,out=0,validFrames=1,period=1,gain=0.4|
            var phase,audio;
            phase=Phasor.ar(0,BufRateScale.kr(bufnum),0,(period*SampleRate.ir).max(validFrames));
            audio=BufRd.ar(2,bufnum,phase.min(validFrames-1),loop:0,interpolation:2)*(phase<validFrames);
            Out.ar(out,audio*gain);
        });
    }
    *new { |server, config, toolInstance|
        ^super.new.init(server ? Server.default, config ? this.defaults, toolInstance)
    }
    init { |aServer, aConfig, instance|
        server=aServer;config=this.class.validate(aConfig);toolInstance=instance;
        params=Dictionary.new;buffers=List.new;nodes=List.new;regions=List.new;audioBuses=List.new;
        clearSerials=[0,0];closeActions=List.new;^this;
    }
    own { |object, type|
        if(toolInstance.notNil){toolInstance.own(object,type,(role:\unifiedBufferPrototype))};^object;
    }
    disown { |object|
        if(toolInstance.notNil){toolInstance.disown(object)};^object;
    }
    waitCommand { |command, id|
        var condition, responder, failed=false, complete=false,lock;
        lock=this.class.commandLock(server);lock.wait;
        if(command=='unified_view_alloc' and:{closed}){
            lock.signal;Error("UnifiedBuffer: closed while awaiting native allocation").throw;
        };
        condition=Condition.new;
        responder=OSCFunc({|message|
            if(message[1]==command){complete=true;condition.unhang}
        },'/done',server.addr);
        SystemClock.sched(5,{if(complete.not){failed=true;condition.unhang};nil});
        server.sendMsg('/cmd',command,id);condition.hang;responder.free;lock.signal;
        if(failed){Error("UnifiedBuffer: native command timed out: "++command).throw};
    }
    parameter { |key, value, lo=0, hi=1|
        var param;
        param=AWParam(key,value,ControlSpec(lo,hi,\lin),target:group,server:server,
            options:(ownFunction:{|node,type|this.own(node,type)},disownFunction:{|node|this.disown(node)}));
        params[key]=param;^param;
    }
    checkConstruction {
        if(closed){Error("UnifiedBuffer: closed during construction").throw};^this;
    }
    start { |action|
        if(closed or:{started}){Error("UnifiedBuffer: already started or closed").throw};
        if(server.serverRunning.not){Error("UnifiedBuffer: selected server must already be running").throw};
        started=true;starting=true;
        ^Routine({
            var input, output, cellNodes, clean, a, b, key, ids, buf, startupError;
            try {
                this.checkConstruction;
                this.class.defs.do{|def|def.send(server)};AWParam.prepare(server);server.sync;
                this.checkConstruction;
                group=this.own(Group.tail(server),\container);
                clean=this.own(Bus.audio(server,2),\audioBus);a=this.own(Bus.audio(server,2),\audioBus);b=this.own(Bus.audio(server,2),\audioBus);
                audioBuses.addAll([clean,a,b]);
                this.parameter(\globalInput,config[\globalInput]);this.parameter(\master,config[\master]);
                config[\cells].do{|cell,i|
                    [\inputGain,\feedback,\seconds,\fx,\cleanGain,\routeGain].do{|field|
                        key=("cell"++i++"_"++field).asSymbol;
                        this.parameter(key,cell[field],if(field==\seconds){0.01}{0},
                            switch(field,\inputGain,{2},\feedback,{1.1},\seconds,{config[\capacity]},{1}));
                    };
                };
                // All parameter processors precede input/cell/output nodes.
                input=this.own(Synth.tail(group,\ubpInput,[\out,clean.index,\source,config[\source],
                    \frequency,config[\frequency],\toneLevel,config[\toneLevel]]),\synth);nodes.add(input);
                params[\globalInput].mapTo(input,\globalInput);
                cellNodes=Array.newClear(2);
                gestureStates=Array.fill(2,{(generation:0,state:0,frames:0,event:0)});
                gestureResponder=OSCFunc({|msg|
                    2.do{|i|if(nodes.at(i+1).notNil and:{msg[1]==nodes[i+1].nodeID} and:{config[\cells][i][\capture][\enabled]>0}){
                        gestureStates[i]=(generation:msg[3],state:msg[4],frames:msg[5],event:msg[6]);
                    }};
                },'/ubp/gesture',server.addr);
                config[\cells].do{|cell,i|
                    this.checkConstruction;
                    buf=this.own(Buffer.alloc(server,(server.sampleRate*config[\capacity]).ceil.asInteger,2),\buffer);buffers.add(buf);server.sync;
                    this.checkConstruction;
                    ids=[this.class.regionID,this.class.regionID];
                    ids.do{|id|this.checkConstruction;this.waitCommand('unified_view_alloc',id);regions.add(id);this.checkConstruction};
                    cellNodes[i]=this.own(Synth.tail(group,\ubpCell,[\bufnum,buf.bufnum,\sharedLeft,ids[0],\sharedRight,ids[1],
                        \cleanBus,clean.index,\upstreamBus,if(i==0){clean.index}{a.index},\out,if(i==0){a.index}{b.index},\running,cell[\running]]),\synth);
                    nodes.add(cellNodes[i]);
                    [\inputGain,\feedback,\seconds,\fx,\cleanGain,\routeGain].do{|field|
                        params[("cell"++i++"_"++field).asSymbol].mapTo(cellNodes[i],field);
                    };
                    this.applyHeads(i);
                    this.applyCapture(i);
                };
                output=this.own(Synth.tail(group,\ubpOutput,[\a,a.index,\b,b.index]),\synth);nodes.add(output);
                params[\master].mapTo(output,\master);server.sync;this.checkConstruction;
            }{|error|startupError=error};
            starting=false;
            if(startupError.notNil or:{closed}){
                // Close during a yielding construction is deferred until this point.
                // Startup and every close waiter share one retirement completion.
                this.free({|error|
                    var failure;
                    failure=startupError ? Error("UnifiedBuffer: closed during construction");
                    if(error.notNil){failure=Error(failure.errorString++"; retirement failed: "++error.errorString)};
                    action.value(nil,failure);
                });
            }{
                action.value(this,nil);
            };
        }).play(SystemClock);
    }
    readParameters { |action|
        var remaining, states, firstError, complete;
        if(closed or:{starting} or:{group.isNil}){action.value(nil,Error("UnifiedBuffer: parameter readback unavailable"));^this};
        states=Dictionary.new;remaining=params.size;
        complete={|key,param,state,error|
            if(error.notNil){firstError=firstError ? error}{
                states[key]=(base:state[\base],amount:state[\amount],effective:state[\effective],
                    baseTarget:param.baseTarget,amountTarget:param.amountTarget);
            };
            remaining=remaining-1;
            if(remaining==0){
                if(closed){firstError=firstError ? Error("UnifiedBuffer: closed during parameter readback")};
                action.value(if(firstError.isNil){states}{nil},firstError);
            };
        };
        if(remaining==0){action.value(states,nil)}{
            params.keysValuesDo{|key,param|
                try{param.getState({|state,error|complete.value(key,param,state,error)})}
                {|error|complete.value(key,param,nil,error)};
            };
        };^this;
    }
    applyHeads { |index|
        var cell, fractions, gains, node;
        cell=config[\cells][index];fractions=if(cell[\layout]=="quad"){[0.25,0.5,0.75,1]}{[0.5,0.5,1,1]};
        gains=cell[\heads].copy;
        if(cell[\layout]=="A"){gains[2]=0;gains[3]=0};if(cell[\layout]=="B"){gains[0]=0;gains[1]=0};
        node=nodes.at(index+1);
        if(node.notNil){4.do{|h|node.set(("head"++h).asSymbol,fractions[h],("gain"++h).asSymbol,gains[h])}};
    }
    applyCapture { |index|
        var g,node;
        g=config[\cells][index][\capture];node=nodes.at(index+1);
        if(node.notNil){node.set(\gestureMode,g[\enabled],\gestureHigh,g[\high],\gestureLow,g[\low],
            \gestureGap,g[\gap],\gestureMin,g[\minimum],\gestureMax,g[\maximum],\gestureRelease,g[\release])};
    }
    apply { |candidate, duration=0.03|
        var next;
        if(closed){Error("UnifiedBuffer is closed").throw};
        next=this.class.validate(candidate);
        if(next[\capacity]!=config[\capacity]){Error("UnifiedBuffer: capacity change requires a new instance").throw};
        next[\cells].do{|cell,i|if(cell[\capture][\enabled]!=config[\cells][i][\capture][\enabled] and:{gestureStates.notNil}){
            gestureStates[i]=(generation:0,state:0,frames:0,event:0);
        }};
        config=next;
        [\globalInput,\master].do{|key|params[key].tryPerform(\setBase,config[key],duration)};
        config[\cells].do{|cell,i|
            [\inputGain,\feedback,\seconds,\fx,\cleanGain,\routeGain].do{|field|
                params[("cell"++i++"_"++field).asSymbol].tryPerform(\setBase,cell[field],duration);
            };
            if(nodes.at(i+1).notNil){nodes[i+1].run(true);nodes[i+1].set(\running,cell[\running]);this.applyHeads(i);this.applyCapture(i)};
        };
        if(nodes.notEmpty){nodes[0].set(\source,config[\source],\frequency,config[\frequency],\toneLevel,config[\toneLevel])};
        ^this;
    }
    clear { |index|
        if(closed or:{index.isInteger.not} or:{index<0} or:{index>1}){Error("UnifiedBuffer: invalid clear target").throw};
        if(capturePending){Error("Cannot clear while retaining a take").throw};
        if(gestureStates.notNil){gestureStates[index]=(generation:0,state:0,frames:0,event:0)};
        clearSerials[index]=clearSerials[index]+1;nodes.at(index+1).tryPerform(\set,\clearSerial,clearSerials[index]);^this;
    }
    pool {
        if(takePool.isNil){takePool=UBPTakePool(server,ownFunction:{|object,type|this.own(object,type)},
            disownFunction:{|object|this.disown(object)});takePlayers=Dictionary.new};^takePool;
    }
    retain { |index,action|
        var frames,ticket,gesture;
        if(closed or:{group.isNil} or:{capturePending}){Error("Instrument closed, unstarted or capture pending").throw};
        if(index.isInteger.not or:{index<0} or:{index>1}){Error("Invalid take source").throw};
        frames=(config[\cells][index][\seconds]*server.sampleRate).round.asInteger;
        if(config[\cells][index][\capture][\enabled]>0){
            gesture=gestureStates[index].copy;
            if(gesture[\state]!=2 or:{gesture[\frames]<=0}){Error("No completed gesture to retain").throw};
            frames=gesture[\frames].asInteger;
        };
        ticket=this.pool.reserve(frames,server.sampleRate);capturePending=true;
        ^Routine({
            var buffer,condition,responder,reply,timedOut=false,done=false,entry,errorText,serial,node;
            try {
                buffer=Buffer.alloc(server,frames,2);server.sync;
                if(closed){Error("Instrument closed during capture").throw};
                serial=takeSerial=takeSerial+1;node=nodes[index+1];condition=Condition.new;
                responder=OSCFunc({|msg|
                    if(msg[1]==node.nodeID and:{msg[3]==serial}){reply=msg;done=true;condition.unhang};
                },'/ubp/take',server.addr);
                SystemClock.sched((frames/server.sampleRate/8)+2,{if(done.not){timedOut=true;condition.unhang};nil});
                node.set(\takeBuffer,buffer.bufnum,\takeFrames,frames,\takeSerial,serial,
                    \takeGeneration,if(gesture.notNil){gesture[\generation]}{-1});condition.hang;
                if(timedOut){
                    // Keep the buffer alive until the writer acknowledges cancellation.
                    condition=Condition.new;abortSerial=abortSerial+1;node.set(\takeAbort,abortSerial);
                    SystemClock.sched(2,{if(done.not){condition.unhang};nil});condition.hang;
                    if(done.not){
                        // Only this cell is paused on a failed/unresponsive capture path.
                        node.run(false);server.sync;
                    };
                    Error("Take snapshot timed out; cell may require resume").throw;
                };
                if(reply[4]!=frames){Error("Take snapshot cancelled or rejected").throw};
                entry=this.pool.commit(ticket,buffer,(sourceCell:config[\cells][index][\id],sourceStartFrame:reply[5],
                    sourceGesture:if(gesture.notNil){gesture[\generation]}{nil}));
                buffer=nil;server.sync;
            }{|error|errorText=error;this.pool.cancel(ticket)};
            responder.tryPerform(\free);if(buffer.notNil){buffer.free;server.sync};capturePending=false;
            action.value(entry,errorText);
        }).play(SystemClock);
    }
    playTake { |id,period,gain=0.4|
        var lease,entry,player;
        if(closed or:{group.isNil}){Error("Instrument unavailable").throw};
        entry=this.pool.find(id);if(entry.isNil){Error("Unknown take").throw};
        period=period ? entry[\repeatSeconds];
        // OSC float32 rounding may differ by much less than one sample.
        this.class.check(period,(entry[\validFrames]-0.5)/entry[\sampleRate],1024,"take repeat period");
        period=period.max(entry[\validFrames]/entry[\sampleRate]);
        this.class.check(gain,0,1,"take gain");
        if(takePlayers[id].notNil){
            takePlayers[id][\node].set(\period,period,\gain,gain);takePlayers[id][\period]=period;^this;
        };
        lease=this.pool.acquire(id,"direct loop");
        if(takeBus.isNil){takeBus=this.own(Bus.audio(server,2),\audioBus);audioBuses.add(takeBus);nodes.last.set(\takes,takeBus.index,\takeGain,1)};
        this.class.takeDef.send(server);
        // /d_recv completion creates the player only once its definition is ready.
        // Called from a Routine in the command bridge.
        playerPending=playerPending+1;
        try {
            server.sync;
            if(closed){Error("UnifiedBuffer: closed during player construction").throw};
            player=this.own(Synth.before(nodes.last,\ubpTakePlayer,[\bufnum,lease.buffer.bufnum,\out,takeBus.index,
                \validFrames,entry[\validFrames],\period,period,\gain,gain]),\synth);
            takePlayers[id]=(node:player,lease:lease,period:period);
        }{|error|playerPending=playerPending-1;lease.release;error.throw};
        playerPending=playerPending-1;^this;
    }
    stopTake { |id|
        var player;
        player=takePlayers.tryPerform(\removeAt,id);
        if(player.notNil){player[\node].free;server.sync;this.disown(player[\node]);player[\lease].release};^this;
    }
    free { |action|
        if(retirementFinished){action.value(retirementError);^this};
        if(action.notNil){closeActions.add(action)};
        closed=true;
        if(starting or:{retiring}){^this};
        retiring=true;
        gestureResponder.tryPerform(\free);gestureResponder=nil;
        if(group.isNil){this.finishRetirement;^this};
        ^Routine({
            var error;
            try {
            // A retained Buffer cannot be freed while the native copy is active.
            // A pending player must release or register its lease first too.
            while({capturePending or:{playerPending>0}},{0.01.wait});
            takePlayers.tryPerform(\keysValuesDo,{|id,player|player[\node].free});
            params.values.do{|param|param.free};
            group.free;server.sync;
            takePlayers.tryPerform(\values).tryPerform(\do,{|player|this.disown(player[\node]);player[\lease].release});
            takePlayers.tryPerform(\clear);takePool.tryPerform(\close);
            nodes.do{|node|this.disown(node)};this.disown(group);
            regions.do{|id|this.waitCommand('unified_view_free',id)};regions.clear;
            buffers.do{|buffer|buffer.free;this.disown(buffer)};server.sync;
            audioBuses.do{|bus|bus.free;this.disown(bus)};buffers.clear;nodes.clear;audioBuses.clear;params.clear;
            }{|failure|error=failure};
            this.finishRetirement(error);
        }).play(SystemClock);
    }
    finishRetirement { |error|
        var actions;
        retirementError=error;retired=error.isNil;retiring=false;retirementFinished=true;
        actions=closeActions.copy;closeActions.clear;
        actions.do{|action|try{action.value(error)}{|failure|failure.reportError}};^this;
    }
}
