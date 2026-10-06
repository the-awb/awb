// Test-only adapter. Monolithic mode uses the actual production Rack definition.
// Split mode keeps the same post-fader signal and per-send Lag/gain/Out operations.
(
var defs,make,update,close;
defs=[
 SynthDef(\sendLayoutHead,{|in=0,post=0,level=1,enabled=1,fade=0.02|
  ReplaceOut.ar(post,In.ar(in,2)*Lag.kr(level*enabled,fade));
 }),
 SynthDef(\sendLayoutRoute,{|in=0,out=0,gain=0,fade=0.02|
  Out.ar(out,In.ar(in,2)*Lag.kr(gain,fade));
 }),
 SynthDef(\sendLayoutSource,{|out=0,index=0|
  Out.ar(out,SinOsc.ar([173+(index*29),229+(index*37)],0,0.005+(index*0.001)));
 })
];
make={|server,size,layout,options|
 var instance,rack,routes=IdentityDictionary.new,state,names;
 instance=AWBSendRackTool.open((name:"Send layout fixture",width:2,
  channels:Array.fill(8,{|i|("c"++i).asSymbol}),
  fixedFX:Array.fill(size,{|i|("s"++i).asSymbol}),dynamicFX:0,
  fixedFollowers:[],spareFollowers:0,cleanSlot:false,masterLimit:false,out:0),
  (options ? ()).copy.put(\server,server).put(\track,false));
 rack=instance.tool;while{rack.ready.not}{0.01.wait};
 names=defs.collect{|def|var copy=def.copy.name_((def.name.asString++rack.rootGroup.nodeID).asSymbol);rack.installDef(copy.name,copy);copy.name};
 if((options ? ())[\sendFunction].isNil){server.sync};
 if(layout==\split){
  rack.channels.keys.asArray.sort.do{|id|
   var channel=rack.channelAt(id),old=channel[\node],node=Synth.basicNew(names[0],server);
   rack.dispatch(node.newMsg(old,[\in,channel[\input].index,\post,channel[\post].index,
    \fade,rack.config[\fade]],\addReplace));
   instance.disown(old);rack.own(node,\synth,(name:"Split head",parent:old.group));channel[\node]=node;
   routes[id]=rack.slotIDs.collect{|send|rack.synth(names[1],
    [\in,channel[\post].index,\out,rack.destinationFor(send).index,\fade,rack.config[\fade]],
    node.group,"Split send")};
  };
 };
 rack.channels.keys.asArray.sort.do{|id,i|rack.synth(names[2],
  [\out,rack.inputFor(id).index,\index,i],rack.sourceGroup,"Matched source")};
 state=(instance:instance,rack:rack,size:size,layout:layout,routes:routes);state;
};
update={|state,profile,phase=0|
 var rack=state[\rack],messages=List.new,size=state[\size];
 rack.channels.keys.asArray.sort.do{|id,c|
  var channel=rack.channelAt(id),gains;
  gains=Array.fill(size,{|j|switch(profile,
   \zero,{0},\full,{1},\sparse,{if(j<(state[\activeCount] ? 4)){0.5+(c/32)}{0}},
   \moving,{((phase+(c*0.17)+(j*0.23)).sin+1)*0.5},
   {Error("Unknown layout profile").throw})});
  channel[\gains]=gains;
  if(state[\layout]==\split){state[\routes][id].do{|node,j|messages.add(node.setMsg(\gain,gains[j]));if(state[\pauseZero] ? false){messages.add(node.runMsg(gains[j]>0))}}}
  {messages.add([\n_setn,channel[\node].nodeID,\sendGains,size]++gains)};
 };
 rack.dispatchBundle(messages.asArray);messages.size;
};
close={|state|state[\instance].close};
(definitions:defs,make:make,update:update,close:close)
)
