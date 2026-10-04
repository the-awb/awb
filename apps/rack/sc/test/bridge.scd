(
var instance,rack,server,dir,file,responder,messages=List.new;
dir=thisProcess.nowExecutingPath.dirname;
try {
    server=Server(\rackBridge,NetAddr("127.0.0.1",59998),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(8));
    instance=AWBSendRackTool.open((width:1,channels:[\a,\b],fixedFX:[\mast],dynamicFX:1,fixedFollowers:[\env],spareFollowers:1,libraryID:"bridge-test"),
        (server:server,sendFunction:{|msg|messages.add(msg)},track:true));
    rack=instance.tool;
    responder=OSCFunc({|msg,time,address|
        if(address.ip=="127.0.0.1" and:{msg[1].asString==instance.instanceID}){
            if(msg[2].asString=="external"){
                100.do{|i|rack.setSend(\a,\mast,i/160)};
                rack.setSend(\a,\mast,0.625);rack.setLevel(\a,0.512);
            }{if(msg[2].asString=="gui-external"){rack.setSend(\a,\mast,msg[3])}{if(msg[2].asString=="external-fx"){rack.registerProcessor(\externaltest,{|ctx|nil});rack.setFX(\fx1,\externaltest)}{
            if(msg[2].asString=="close"){instance.close}{
                responder.free;instance.close;
                ["AWB_RACK_BRIDGE_MESSAGES",messages.size].postln;
                "AWB_RACK_BRIDGE_FINISHED=PASS".postln;0.exit;
            };};};};
        };
    },'/awb/rack/test');
    file=File(dir+/+"bridge-ready.json","w");
    file.write("{\"port\":%,\"instanceID\":\"%\",\"libraryID\":\"bridge-test\"}".format(NetAddr.langPort,instance.instanceID));file.close;
    "AWB_RACK_BRIDGE_READY=PASS".postln;
    SystemClock.sched(120,{instance.close;1.exit;nil});
}{|error|error.reportError;1.exit};
)
