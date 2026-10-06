// A native Chain ToolInstance; borrows its input/output audio ports. Its profile,
// processors and internal buses are owned by the Chain, independently of Rack.
AWBSharedFXChain {
    var <instance,<chain,<profile,<controllers,<ready=false,<closed=false,options,server,spec,dependant,chainDependant,factoryID;
    *open { |specification,input,output,target,before,opts|^super.new.init(specification,input,output,target,before,opts ? ()) }
    init { |specification,input,output,target,before,opts|
        var controls,chainOptions;
        spec=specification;options=opts;server=input.server;controllers=IdentityDictionary.new;
        factoryID=("awb52Shared"++UniqueID.next).asSymbol;
        controls=AWBFXMixProfile.controls(\um).collect{|id|
            var maximum=if(id==\level){4}{if(id.asString.beginsWith("amount")){2}{1}};
            (id:id,label:id.asString,min:0,max:maximum,default:(spec[\sharedFX][\defaults] ? ())[id] ? if(id==\level){1}{0},section:"UM / Scheps",step:0.001)
        };
        AWBChain.registerFactory(factoryID,{|owner|this.build(owner)});
        chainOptions=options.copy.putAll((server:server,input:input,output:output,target:target,gui:false));
        try {
            instance=AWBChain.open((name:"UM / stereo Scheps",factory:factoryID,width:2,controls:controls),chainOptions);chain=instance.tool;
            if(before.notNil){chain.dispatch(chain.group.moveBeforeMsg(before))};
            dependant=SimpleController(instance).put(\closed,{this.closedByInstance});
            chainDependant=SimpleController(chain).put(\ready,{this.finishReady});
            if(chain.ready){this.finishReady};
        }{|e|AWBChain.unregisterFactory(factoryID);this.close;e.throw};^this;
    }
    build { |owner|
        var profileOptions=options.copy,defs=options[\definitions],umNode,schepsNode,middle=owner.bus;
        profileOptions[\definition]=defs[\profile];profileOptions[\ownFunction]={|n,type,metadata|owner.own(n,type,metadata)};profileOptions[\disownFunction]={|n|owner.disownNode(n)};
        profile=AWBFXMixProfile(\um,owner.group,owner.server,spec[\sharedFX],profileOptions);
        owner.ownResource(profile,{|p|p.free(false)});
        umNode=owner.addSynth(\um,defs[\um].name,[\in,owner.input.index,\out,middle.index]);
        schepsNode=owner.addSynth(\scheps,defs[\scheps].name,[\in,middle.index,\out,owner.output.index,\profileBus,profile.outputBus.index]);
        profile.params.keys.do{|id|owner.bindSetter(id,{|value|profile.param(id).set(value)},(kind:\awParam,param:id))};
        [[\um,umNode],[\stereoScheps,schepsNode]].do{|entry|
            var role=entry[0],item=spec[\components][role],controller=VSTPluginController.collect(entry[1])[role];
            controllers[role]=controller;
            if(options[\sendFunction].notNil){
                owner.dispatch(controller.openMsg(item[\key] ? item[\path],editor:false,mode:item[\mode]));owner.dispatch(controller.setMsg(*item[\params]));
                if(role==\um){this.bindUM(owner,controller)};
            }{
                owner.holdReady;
                controller.open(item[\key] ? item[\path],editor:false,mode:item[\mode],action:{|vst,ok|
                    if(owner.closed.not){
                        if(ok){owner.dispatch(vst.setMsg(*item[\params]));if(role==\um){this.bindUM(owner,vst)};owner.releaseReady}{owner.fail(Error("Shared plugin failed to open: "++item[\name]));options[\onError].value(Error("Shared plugin failed: "++role),this)};
                    };
                });
            };
        };^this;
    }
    bindUM { |owner,controller|
        var names=spec[\components][\um][\parameterNames],args=List.new;
        [\Mix,\mix,\Depth,\depth,\DetuneDepth,\detuneDepth,\DetuneRate,\detuneRate,\VibratoDepth,\vibratoDepth,\VibratoRate,\vibratoRate,\DriveInGain,\driveInGain,\DriveNoiseGain,\driveNoiseGain,\DiffEnable,\diffEnable,\Diffusion,\diffusion,\DiffSize,\diffSize,\Delay,\delay,\Feedback,\feedback,\OverMod,\overMod].clump(2).do{|pair|
            var index=names.indexOfEqual(pair[0].asString);if(index.isNil){Error("UM plugin parameter missing: "++pair[0]).throw};args.add(index).add(profile.bus(pair[1]));
        };
        controller.mapMsg(*args.asArray).do{|message|owner.dispatch(message)};^this;
    }
    finishReady {if(closed.not and:{ready.not}){ready=true;options[\onReady].value(this)};^this}
    plugin { |role|^controllers[role.asSymbol] }
    gui { |opts|if(ready.not){Error("Wait for shared Chain readiness").throw};^chain.gui(opts) }
    closedByInstance {
        if(closed.not){closed=true;ready=false;dependant.tryPerform(\remove);dependant=nil;chainDependant.tryPerform(\remove);chainDependant=nil;AWBChain.unregisterFactory(factoryID);options[\onClosed].value(this)};^this;
    }
    close {if(closed){^this};instance.tryPerform(\close);if(instance.isNil){this.closedByInstance};^this}
    free {^this.close}
}
