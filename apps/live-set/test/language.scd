// Private language fixture: server commands are captured, no engine is booted.
(
var server,instance,base,p,view;
server=AWBLiveLanguageTestServer(\liveLanguage,NetAddr("127.0.0.1",59994));
instance=AWBaseTool.open((params:[(id:\shape,base:0.2)]),(server:server,sendFunction:{},track:false));
base=instance.tool;p=base.param(\shape);base.track(\deci).add(\deciShaper,p,"Shape",(channel:3,cc:13,pickup:true));
base.log("Language bridge ready");view=base.gui((launch:false));
OSCdef(\liveFixture,{|msg|
    switch(msg[1].asString,"log",{base.log(msg[2].asString,\warn)},"close",{instance.close},"exit",{0.exit})
},'/awb/live-fixture');
("AWB_LIVE_LANGUAGE_READY|"++instance.instanceID++"|"++view.instanceID++"|"++NetAddr.langPort).postln;
)
