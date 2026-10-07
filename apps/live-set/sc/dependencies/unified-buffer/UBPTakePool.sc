// Ordinary Buffers plus versioned metadata. No capture or analysis is implicit.
UBPTakePool {
    var <server, <limit, <maxSeconds, <policy, <closed=false, <poolID;
    var entries, retired, leases, reservation, serial=0, leaseSerial=0, ownFunction, disownFunction;
    *new { |server, limit=8, maxSeconds=128, policy="stop", ownFunction, disownFunction|
        ^super.new.init(server,limit,maxSeconds,policy,ownFunction,disownFunction)
    }
    init { |aServer,aLimit,seconds,aPolicy,own,disown|
        server=aServer;poolID=thisProcess.pid.asString++":"++UniqueID.next;entries=List.new;retired=List.new;leases=Dictionary.new;
        ownFunction=own;disownFunction=disown;this.configure(aLimit,seconds,aPolicy);^this;
    }
    configure { |count,seconds,aPolicy|
        if(closed){Error("Take pool closed").throw};
        if(count.isInteger.not or:{count<1} or:{count>64}){Error("Take count must be 1..64").throw};
        UnifiedBufferController.check(seconds,0.01,1024,"take pool seconds");
        if(["stop","push"].includesEqual(aPolicy).not){Error("Unknown take admission policy").throw};
        if(reservation.notNil or:{(entries.size+retired.size)>count} or:{this.storedSeconds>seconds}){
            Error("New limits exclude stored or pending audio").throw;
        };
        limit=count;maxSeconds=seconds;policy=aPolicy;^this;
    }
    storedSeconds { ^(entries++retired).sum{|entry|entry[\validFrames]/entry[\sampleRate]} }
    find { |id| ^entries.detect{|entry|entry[\id]==id} }
    describe { |entry|
        var result;
        result=entry.copy;result.removeAt(\buffer);result.removeAt(\pins);
        result[\poolID]=poolID;result[\bufnum]=entry[\buffer].tryPerform(\bufnum);result[\readers]=entry[\pins];result[\analysis]=entry[\analysis].deepCopy;^result;
    }
    state { ^(limit:limit,maxSeconds:maxSeconds,policy:policy,closed:closed,
        storedSeconds:this.storedSeconds,retiredCount:retired.size,pending:reservation.notNil,
        takes:entries.collect{|entry|this.describe(entry)}.asArray) }
    reserve { |frames,sampleRate|
        var seconds,total,count,evictions,index=0,entry;
        if(closed or:{reservation.notNil}){Error("Take pool closed or capture pending").throw};
        if(frames.isInteger.not or:{frames<1}){Error("Invalid take extent").throw};
        UnifiedBufferController.check(sampleRate,1,768000,"take sample rate");
        seconds=frames/sampleRate;
        if(seconds>maxSeconds){Error("Take exceeds pool duration limit").throw};
        total=this.storedSeconds+seconds;count=entries.size+retired.size+1;evictions=List.new;
        while({(count>limit) or:{total>maxSeconds}},{
            if(policy=="stop" or:{index>=entries.size}){Error("Take pool full").throw};
            entry=entries[index];
            if(entry[\pins]>0){Error("Oldest take is in use; release it before pushing").throw};
            evictions.add(entry);index=index+1;count=count-1;total=total-(entry[\validFrames]/entry[\sampleRate]);
        });
        reservation=(frames:frames,sampleRate:sampleRate,evictions:evictions);^reservation;
    }
    cancel { |ticket| if(reservation===ticket){reservation=nil};^this }
    commit { |ticket,buffer,metadata|
        var entry;
        if(closed or:{reservation!==ticket}){Error("Stale take reservation").throw};
        if(buffer.numChannels!=2 or:{buffer.numFrames<ticket[\frames]}){Error("Take needs a complete stereo Buffer").throw};
        // A reader may have acquired an eviction candidate while copying ran.
        if(ticket[\evictions].any{|item|item[\pins]>0}){Error("Eviction candidate acquired during capture").throw};
        serial=serial+1;
        entry=(id:"take-"++serial,generation:serial,audioRevision:1,buffer:buffer,
            validFrames:ticket[\frames],sampleRate:ticket[\sampleRate],
            repeatSeconds:ticket[\frames]/ticket[\sampleRate],sourceCell:metadata[\sourceCell],
            sourceStartFrame:metadata[\sourceStartFrame],sourceGesture:metadata[\sourceGesture],onsetSeconds:nil,pins:0,analysis:nil);
        ticket[\evictions].do{|old|entries.remove(old);this.destroy(old)};
        entries.add(entry);reservation=nil;ownFunction.value(buffer,\buffer);^entry;
    }
    destroy { |entry| entry[\buffer].free;disownFunction.value(entry[\buffer]);^this }
    acquire { |id,consumer="reader"|
        var entry,token;
        if(closed){Error("Take pool closed").throw};
        entry=this.find(id);if(entry.isNil){Error("Unknown take").throw};
        leaseSerial=leaseSerial+1;token=leaseSerial;entry[\pins]=entry[\pins]+1;
        leases[token]=entry;^UBPTakeLease(this,token,entry[\buffer],this.describe(entry),consumer);
    }
    release { |token|
        var entry;
        entry=leases.removeAt(token);
        if(entry.notNil){entry[\pins]=entry[\pins]-1;
            if(entry[\pins]==0 and:{retired.includes(entry)}){retired.remove(entry);this.destroy(entry)};
        };^this;
    }
    remove { |id|
        var entry;
        if(reservation.notNil){Error("Capture pending").throw};
        entry=this.find(id);if(entry.isNil){Error("Unknown take").throw};
        entries.remove(entry);if(entry[\pins]>0){retired.add(entry)}{this.destroy(entry)};^this;
    }
    beginAnalysis { |id,method|
        var lease,job,entry;
        if(method.isString.not or:{method.isEmpty}){Error("Analysis method required").throw};
        lease=this.acquire(id,"analysis:"++method);
        job=(lease:lease,poolID:poolID,id:id,jobToken:leaseSerial,generation:lease.metadata[\generation],audioRevision:lease.metadata[\audioRevision],
            validFrames:lease.metadata[\validFrames],method:method,status:"pending");
        entry=this.find(id);entry[\analysis]=job.copy;entry[\analysis].removeAt(\lease);
        this.changed(\analysis,id,entry[\analysis].deepCopy);^job;
    }
    finishAnalysis { |job,result|
        var entry,accepted=false,measurements;
        if(job[\status]!="pending"){Error("Analysis already completed").throw};
        if(job[\poolID]!=poolID){Error("Analysis belongs to another pool").throw};
        try {
            measurements=result[\measurements];
            if(measurements.isArray.not or:{measurements.size>4096}){Error("Invalid measurements").throw};
            measurements.do{|m|
                UnifiedBufferController.check(m[\hz],0.001,100000,"measured frequency");
                UnifiedBufferController.check(m[\confidence],0,1,"measurement confidence");
                UnifiedBufferController.check(m[\frame],0,job[\validFrames]-1,"measurement frame");
            };
            entry=this.find(job[\id]);
            if(entry.notNil and:{job[\poolID]==poolID} and:{entry[\generation]==job[\generation]} and:{entry[\audioRevision]==job[\audioRevision]}
                and:{entry[\analysis][\jobToken]==job[\jobToken]}){
                entry[\analysis]=(method:job[\method],poolID:poolID,jobToken:job[\jobToken],generation:job[\generation],audioRevision:job[\audioRevision],
                    validFrames:job[\validFrames],status:"ready",measurements:measurements.deepCopy);accepted=true;
                this.changed(\analysis,job[\id],entry[\analysis].deepCopy);
            };
            job[\status]=if(accepted){"ready"}{"stale"};
        }{|error|
            job[\status]="failed";entry=this.find(job[\id]);
            if(entry.notNil and:{job[\poolID]==poolID} and:{entry[\analysis][\jobToken]==job[\jobToken]}){
                entry[\analysis][\status]="failed";entry[\analysis][\error]=error.errorString;
                this.changed(\analysis,job[\id],entry[\analysis].deepCopy);
            };
            job[\lease].release;error.throw;
        };
        job[\lease].release;^accepted;
    }
    cancelAnalysis { |job|
        var entry;
        if(job[\status]=="pending"){
            job[\status]="cancelled";entry=this.find(job[\id]);
            if(entry.notNil and:{job[\poolID]==poolID} and:{entry[\analysis][\jobToken]==job[\jobToken]}){
                entry[\analysis][\status]="cancelled";this.changed(\analysis,job[\id],entry[\analysis].deepCopy);
            };
            job[\lease].release;
        };^this;
    }
    close {
        if(closed){^this};closed=true;reservation=nil;
        entries.copy.do{|entry|if(entry[\pins]>0){retired.add(entry)}{this.destroy(entry)}};entries.clear;^this;
    }
}

UBPTakeLease {
    var pool,token,<buffer,<metadata,<consumer,<closed=false;
    *new { |pool,token,buffer,metadata,consumer| ^super.newCopyArgs(pool,token,buffer,metadata,consumer) }
    release { if(closed.not){closed=true;pool.release(token)};^this }
}
