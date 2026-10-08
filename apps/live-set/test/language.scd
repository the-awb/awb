// Private language fixture: server commands are captured, no engine is booted.
(
var server,instance,base,p,view,sceneNotes;
server=AWBLiveLanguageTestServer(\liveLanguage,NetAddr("127.0.0.1",59994));
instance=AWBaseTool.open((params:[(id:\shape,base:0.2)]),(server:server,sendFunction:{|msg|if(p.notNil and:{msg[0]==15} and:{msg[1]==p.synth.nodeID} and:{msg.includes(\baseLag)}){("AWB_LIVE_BASE_LAG="++msg[msg.indexOf(\baseLag)+1]++"|dur="++msg[msg.indexOf(\baseDur)+1]).postln}},track:false));
base=instance.tool;p=base.param(\shape);base.track(\deci).add(\deciShaper,p,"Shape",(channel:3,cc:13,pickup:true));
base.createScene(\silentA,0).def({base.log("Silent A start");0.12.wait}, {}, {});
base.createScene(\silentB,1).def({base.log("Silent B start")}, {}, {});
sceneNotes="AWB_SCENE_TEST_NOTES".getenv.split($,).collect(_.asInteger);
(2..9).do{|i|base.createScene(("silent"++i).asSymbol,i).def({base.log("Silent "++i++" start")}, {}, {})};
base.bindSceneMidi(12345,nil,sceneNotes);
fork {try {base.bindSceneMidi(nil,nil,sceneNotes);"AWB_SCENE_SOURCE_REQUIRED=FAIL".postln;1.exit} {
    |error|if(error.errorString.find("specific source UID").isNil){error.throw};"AWB_SCENE_SOURCE_REQUIRED=PASS".postln
}};
159.do{|i|var id=("extra"++i).asSymbol;var extra=base.createParam(id,0.2);base.track(\extra).add(id,extra)};
base.log("Language bridge ready");view=base.gui((launch:false));
OSCdef(\liveFixture,{|msg|
    switch(msg[1].asString,"log",{base.log(msg[2].asString,\warn)},"note",{MIDIIn.doNoteOnAction((msg[5]?12345).asInteger,(msg[3]?3).asInteger,msg[2].asInteger,(msg[4]?100).asInteger)},"add-scene",{base.createScene(\lateScene,42).def({}, {}, {})},"pickup",{p.changed(msg[2].asSymbol,msg[3].asSymbol)},"close",{instance.close},"exit",{0.exit})
},'/awb/live-fixture');
("AWB_LIVE_LANGUAGE_READY|"++instance.instanceID++"|"++view.instanceID++"|"++NetAddr.langPort).postln;
)
