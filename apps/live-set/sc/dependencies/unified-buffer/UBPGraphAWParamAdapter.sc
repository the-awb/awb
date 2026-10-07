// Optional binding helper. Never creates, owns or frees an AWParam or its buses.
// External parameter processors must execute BEFORE their instrument targets.
UBPGraphAWParamAdapter {
    var <controller,bindings,closed=false;
    *new { |controller| ^super.new.init(controller) }
    init { |graph| controller=graph;bindings=List.new;^this }
    bind { |target,param|
        if(closed){Error("UBPGraph AWParam adapter closed").throw};
        controller.checkTarget(target);
        if(param.server!==controller.server){Error("UBPGraph AWParam must use the graph server").throw};
        param.mapTo(target[\synth],target[\control]);
        bindings.add((param:param,synth:target[\synth],control:target[\control]));^this;
    }
    bindCell { |id,field,param| ^this.bind(controller.cellTarget(id,field),param) }
    bindRoute { |id,param| ^this.bind(controller.routeTarget(id),param) }
    bindHead { |id,headID,field,param,portID,channel=0| ^this.bind(controller.headTarget(id,headID,field,portID,channel),param) }
    free {
        if(closed){^this};closed=true;
        bindings.do{|binding|binding[\param].unmapFrom(binding[\synth],binding[\control])};
        bindings.clear;^this;
    }
}
