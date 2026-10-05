(
var instance,rack,server,dir,responder;
dir=thisProcess.nowExecutingPath.dirname;
try {
    server=Server(\rackOrigin,NetAddr("127.0.0.1",59997),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(8));
    instance=AWBSendRackTool.open((width:1,channels:Array.fill(8,{|i|("c"++i).asSymbol}),
        fixedFX:Array.fill(32,{|i|("fx"++i).asSymbol}),dynamicFX:0,fixedFollowers:[],spareFollowers:0,
        cleanSlot:false,libraryID:"origin-test"),(server:server,sendFunction:{|msg|nil},track:true));
    rack=instance.tool;
    rack.fxIDs.do{|id|rack.setFX(id,\pass,(tail:0,limiter:false))};
    responder=OSCFunc({|msg|
        if(msg[1].asString==instance.instanceID){
            if(msg[2].asString=="external-level"){rack.setLevel(\c1,msg[3])}{
                responder.free;instance.close;"AWB_RACK_ORIGIN_FINISHED=PASS".postln;0.exit;
            };
        };
    },'/awb/rack/origin-test');
    File.use(dir+/+"origin-ready.json","w",{|file|
        file.write("{\"port\":%,\"instanceID\":\"%\",\"libraryID\":\"origin-test\"}".format(NetAddr.langPort,instance.instanceID));
    });
    SystemClock.sched(120,{instance.close;1.exit;nil});
}{|error|error.reportError;1.exit};
)
