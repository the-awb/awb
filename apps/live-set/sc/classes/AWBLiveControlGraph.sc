// Rack detectors/followers are borrowed. This graph owns only new blenders.
// Audio -> envelope -> FX/Delay is a deliberate previous-block feedback edge.
AWBLiveControlGraph {
    var <base,<set,<group,<closed=false,definition,registered,observer,ownedDefinitions,ownedNodes;
    *new { |base,set|^super.newCopyArgs(base,set).init}
    *blenderDef {^SynthDef(\awbLiveBlender,{|out=0,inputA=0,inputB=0,scalarD=0,offsetD=0,blend=0.5,staticScalar=1,offset=0,scalarMod=1,bus1Polarity=1,bus2Polarity=1|
        ReplaceOut.kr(out,offset+In.kr(offsetD)+(staticScalar*scalarMod*In.kr(scalarD)*((In.kr(inputA)*(1-blend)*bus1Polarity)+(In.kr(inputB)*blend*bus2Polarity))));
    })}
    init {
        registered=List.new;ownedDefinitions=List.new;ownedNodes=List.new;definition=this.class.blenderDef;definition.send(base.server);
        group=Group.after(set.rack.followerGroup);base.instance.own(group,\container,(name:"BaseLaunch control graph",lifetime:\explicit));
        base.attachControlGraph(this);base.g.putAll(base.groups);base.g[\flow]=group;base.g[\audio]=base.groupAt(\voices);base.g[\interactive]=base.groupAt(\routing);base.g[\util]=base.groupAt(\output);
        AWBControlSendProfile.inputMap.keysValuesDo{|id,send|base.b[id]=set.rack.measurementFor(send)};
        ^this;
    }
    follower { |id,send,settings,consumerID|
        var item,bus,node,signal;
        consumerID=consumerID ? id;item=set.rack.setControlFollower(send,consumerID,settings);bus=item[\bus];node=item[\node];
        signal=AWBLiveSignal(base,id,bus,node,settings,{|change|set.rack.setControlFollower(send,consumerID,change)});
        base.followers[id]=signal;base.b[id]=bus;registered.add(id);^signal;
    }
    audioFollower { |id,bus,settings|
        var def,out,node,signal;
        if(bus.isKindOf(Bus).not or:{bus.rate!=\audio}){Error("Audio follower needs an audio Bus").throw};
        def=SynthDef(("awbAudioFollower"++UniqueID.next).asSymbol,{|out=0,in=0,attack=0.1,release=0.2,blend=0.66,scale=1|
            var signal=A2K.kr(EnvDetect3.ar((Mix(In.ar(in,bus.numChannels))/bus.numChannels)*scale*35,attack,release));
            ReplaceOut.kr(out,(blend*signal)+((1-blend)*signal.sqrt));
        });ownedDefinitions.add(def.name);def.send(base.server);base.server.sync;out=base.makeBus(id);
        node=Synth.tail(group,def.name,[\out,out.index,\in,bus.index,\attack,settings[\attack],\release,settings[\release],\blend,settings[\blend],\scale,settings[\scale]]);
        ownedNodes.add(node);base.instance.own(node,\synth,(name:id.asString,parent:group));signal=AWBLiveSignal(base,id,out,node,settings,{|change|node.set(*change.asKeyValuePairs)});
        base.followers[id]=signal;base.b[id]=out;registered.add(id);^signal;
    }
    blender { |id,a,b,scale=1,offset=0,blend=0.5,mode=0,scalar=\1,offsetSource=\0,blendSource=\1,label|
        var bus,node,signal;
        if(mode!=0){Error("Migration blender currently supports proportional mode only").throw};
        [a,b,scalar,offsetSource].do{|key|if(base.b[key].isNil){Error("Missing blender input: "++key).throw}};
        bus=base.makeBus(id);node=Synth.tail(group,definition.name,[\out,bus.index,\inputA,base.b[a].index,\inputB,base.b[b].index,\scalarD,base.b[scalar].index,\offsetD,base.b[offsetSource].index,\staticScalar,scale,\offset,offset,\blend,blend]);
        ownedNodes.add(node);base.instance.own(node,\synth,(name:label ? id.asString,parent:group));
        signal=AWBLiveSignal(base,id,bus,node,(scale:scale,offset:offset,blend:blend));base.blenders[id]=signal;base.b[id]=bus;registered.add(id);^signal;
    }
    bind { |signal,param,depth=1|base.blenders[signal].connect(param,depth);^param}
    bindFollower { |signal,param,depth=1|base.followers[signal].connect(param,depth);^param}
    finish {^this}
    close {if(closed){^this};closed=true;registered.do{|id|base.unregisterModulationSource(id)};registered.clear;group.free;ownedNodes.do{|node|base.instance.disown(node)};ownedNodes.clear;ownedDefinitions.do{|name|base.server.sendMsg(\d_free,name)};ownedDefinitions.clear;base.instance.disown(group);^this}
}
