// Continuous triangular poles. One fixed-width writer, one contiguous KR bus.
// Position is normalized 0..1. basePole=true reserves position zero for no pole.
AWSelectN {
    classvar definitions;
    var <server,<group,<synth,<outputBus,<count,<basePole,<closed=false,options,hook,quitHook;
    *initClass { definitions=Dictionary.new }
    *validateCount { |n|if(n.isInteger.not or:{n<2} or:{n>32}){Error("AWSelectN: count must be 2..32").throw};^n }
    *weightsAt { |position,count=4,basePole=true|
        this.validateCount(count);AWParam.finite(position,"selector position");
        if([true,false].includes(basePole).not){Error("AWSelectN: basePole must be Boolean").throw};
        ^Array.fill(count,{|i|(1-(position.clip(0,1)*if(basePole){count}{count-1}-(i+basePole.asInteger)).abs).max(0)});
    }
    *signals { |position,count,basePole|
        var p=position.clip(0,1)*(count-1+basePole);
        ^Array.fill(count,{|i|(1-(p-i-basePole).abs).max(0)});
    }
    *synthDef { |count=4|
        this.validateCount(count);
        ^definitions[count] ?? {var def=SynthDef(("awSelectN_"++count).asSymbol,{|position=0,out=0,basePole=1|
            ReplaceOut.kr(out,AWSelectN.signals(position,count,basePole));
        });definitions[count]=def;def};
    }
    *prepare { |server,count=4|var def=this.synthDef(count);SynthDescLib.global.add(def.asSynthDesc);def.send(server ? Server.default);^this }
    *new { |count=4,basePole=true,target,server,options|^super.new.init(count,basePole,target,server,options) }
    init { |n,baseline,target,s,opts|
        var def;count=this.class.validateCount(n);basePole=baseline;options=(opts ? ()).copy;
        this.class.weightsAt(0,count,basePole);server=s ? target.tryPerform(\server) ? Server.default;
        target=target ? server.defaultGroup;
        if(target.isKindOf(Group).not or:{target.server!==server}){Error("AWSelectN: target must be a Group on this server").throw};
        if(options[\sendFunction].isNil and:{server.serverRunning.not}){Error("AWSelectN: boot and prepare before creating").throw};
        def=this.class.synthDef(count);SynthDescLib.global.add(def.asSynthDesc);
        try {
            if(options[\sendFunction].notNil){this.dispatch([\d_recv,def.asBytes])};
            outputBus=Bus.control(server,count);if(outputBus.index.isNil){Error("AWSelectN: bus allocation exhausted").throw};
            group=Group.basicNew(server);synth=Synth.basicNew(def.name,server);
            this.dispatch(group.newMsg(target,\addToTail));this.dispatch(synth.newMsg(group,[\out,outputBus.index,\basePole,basePole.asInteger],\addToTail));
            [group,synth].do{|node|options[\ownFunction].value(node,if(node.isKindOf(Group)){\container}{\synth},(name:"Select-"++count,parent:node.group))};
            quitHook={this.free(false)};ServerQuit.add(quitHook,server);
            if(options[\sendFunction].isNil){hook={|node,what|if(what==\n_end){this.free(false)}};group.register;group.addDependant(hook)};
        }{|error|this.free;error.throw};^this;
    }
    dispatch { |msg|if(options[\sendFunction].notNil){options[\sendFunction].value(msg)}{server.sendMsg(*msg)};^this }
    busAt { |index|
        if(closed or:{index.isInteger.not} or:{index<0} or:{index>=count}){Error("AWSelectN: invalid/closed output").throw};
        // Borrowed view: never free this view; outputBus owns the whole allocation.
        ^Bus.new(\control,outputBus.index+index,1,server);
    }
    setPosition { |value|if(closed){Error("AWSelectN is closed").throw};AWParam.finite(value,"selector position");if(value<0 or:{value>1}){Error("AWSelectN: position must be 0..1").throw};this.dispatch(synth.setMsg(\position,value));^this }
    free { |send=true|
        var bus;if(closed){^this};closed=true;ServerQuit.remove(quitHook,server);
        if(hook.notNil){group.removeDependant(hook);group.unregister};
        if(send and:{group.notNil}){this.dispatch(group.freeMsg)};
        [synth,group].reject(_.isNil).do{|n|options[\disownFunction].value(n)};
        bus=outputBus;if(bus.notNil and:{bus.index.notNil}){
            if(options[\sendFunction].notNil or:{server.serverRunning.not}){bus.free}{Routine({server.sync;if(bus.index.notNil){bus.free}}).play(SystemClock)};
        };^this;
    }
}
