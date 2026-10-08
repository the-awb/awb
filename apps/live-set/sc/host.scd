// Fixed installed live-set entry point, available only in a shell-owned host.
// No arbitrary evaluation or renderer-supplied file paths.
(
var root = PathName(thisProcess.nowExecutingPath.dirname).parentPath;
var token = "AWB_HEADLESS_TOKEN".getenv ? "", sessionID, view, starting=false, waiters=List.new;
var reply, fail, close;
root = PathName(root).parentPath; root = PathName(root).parentPath;
reply = { |address,request|
    address.sendMsg('/awb/live-set/host/result', token, request, "ready", sessionID,
        thisProcess.pid, NetAddr.langPort, ~liveBase.instance.instanceID,
        view.instanceID, ~awb52.rack.instance.instanceID, ~awb52.rack.config[\libraryID].asString);
};
fail = { |error|
    starting=false; sessionID=nil;
    waiters.do { |pair| pair[0].sendMsg('/awb/live-set/host/error',token,pair[1],error.errorString) };waiters.clear;
};
close = {
    ~awbLiveClose.value; view=nil; starting=false; sessionID=nil;
    ~awbLiveOnReady=nil; ~awbLiveOnError=nil; ~awbLiveOpenGUI=nil;
};
if(token.notEmpty) {
    OSCdef(\awbLiveSetHost, { |msg,time,address|
        var operation,request,id;
        if(address.ip=="127.0.0.1" and:{msg.size==5} and:{msg[1].asString==token}) {
            operation=msg[3].asString;request=msg[2].asString;id=msg[4].asString;
            try {
                if(request.size>64 or:{id.size>64}){Error("Invalid live set request").throw};
                switch(operation,
                    "open", {
                        if(sessionID.notNil and:{sessionID!=id}){Error("A live set is already owned by another session").throw};
                        if(view.notNil and:{view.status!=\closed}){reply.value(address,request)}{
                            waiters.add([address,request]);
                            if(starting.not) {
                                sessionID=id;starting=true;~awbLiveOpenGUI=false;
                                ~awbLiveOnReady={ |base,openedView|
                                    view=openedView;starting=false;
                                    waiters.do { |pair| reply.value(pair[0],pair[1]) };waiters.clear;
                                };
                                ~awbLiveOnError=fail;
                                try { (root +/+ "apps/live-set/open.scd").load } { |error| fail.value(error) };
                            };
                        };
                    },
                    "close", {
                        if(sessionID.notNil and:{sessionID!=id}){Error("Stale live set close request").throw};
                        waiters.do { |pair| pair[0].sendMsg('/awb/live-set/host/error',token,pair[1],"Live set launch cancelled") };waiters.clear;
                        close.value;address.sendMsg('/awb/live-set/host/result',token,request,"closed",id);
                    }, { Error("Unknown live set host command").throw }
                );
            } { |error| address.sendMsg('/awb/live-set/host/error',token,request,error.errorString) };
        };
    },'/awb/live-set/host');
};
)
