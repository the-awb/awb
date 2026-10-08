// Open the editable class-backed live set; ~awbLiveClose.value retires only this set.
(
var root=PathName(PathName(thisProcess.nowExecutingPath).pathOnly).parentPath;
var folder,required,missing;
root=PathName(root).parentPath;
folder=~awbLiveSetDirectory ? "/Volumes/ARMED WITH SOUND/SuperCollider/live sets/ live set sc migration";
if(File.exists(folder+/+"BaseLaunch with efKR.scd").not){folder=root+/+"apps/live-set/LiveSet"};
required=["apps/live-set/.build/UnifiedTape.scx","apps/live-set/.build/unifiedview.node",
    "apps/live-set/dist/index.html","apps/live-set/.build/delay-widgets/delay-widgets.js","apps/rack/dist/index.html"];
missing=required.select{|file|File.exists(root+/+file).not};
if(missing.notEmpty){Error("Live set needs built files: "++missing.join(", ")).throw};
if("AWB_LIVE_CHECK_ONLY".getenv=="1"){
    "AWB_LIVE_OPENER_PREFLIGHT=PASS".postln;
    ("LiveSet: "++folder).postln;
}{
    if(~awbLiveStarting ? false){"AWB LiveSet is already starting".postln}{
        if(~awbSet.notNil and:{~awbSet.closed.not}){
            if(~awbSet.ready.not){Error("Existing set is incomplete; close it before relaunching").throw};
            ~liveView.tryPerform(\close);
            ~liveView=~awbSet.base.gui((shellRoot:root,launch:~awbLiveOpenGUI ? true));
            ~awbLiveOnReady.value(~awbSet.base,~liveView);
        }{
            ~awbLiveClose={
                ~liveView.tryPerform(\close);~liveView=nil;
                ~awbSet.tryPerform(\close);~awbLiveStarting=false;
                ~liveBase=nil;~liveBaseInstance=nil;~awb52=nil;
            };
            ~awbLiveStarting=true;
            try{(folder+/+"BaseLaunch with efKR.scd").load}{|error|~awbLiveStarting=false;~awbLiveOnError.value(error);error.throw};
        };
    };
};
)
