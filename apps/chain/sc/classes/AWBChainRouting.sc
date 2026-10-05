// Serial connections with explicit channel matrices. Equal-width edges borrow
// the predecessor's bus directly; a matrix allocates one routing Synth.
AWBChainRouting {
    var <chain,records,definitions;
    *new { |chain|^super.new.init(chain)}
    init { |owner|chain=owner;records=IdentityDictionary.new;definitions=IdentityDictionary.new;^this}
    *matrix { |value,sourceWidth,targetWidth|
        if(value.isNil){if(sourceWidth!=targetWidth){Error("Channel widths differ: supply an explicit routing matrix").throw};^nil};
        if(value.isArray.not or:{value.size!=targetWidth} or:{value.any{|row|row.isArray.not or:{row.size!=sourceWidth}}}){Error("Routing matrix dimensions do not match the ports").throw};
        if(value.flat.any{|v|v.isNumber.not or:{v.isNaN} or:{v.abs>16}}){Error("Routing matrix gains must be finite and within -16..16").throw};^value.deepCopy;
    }
    *plan { |specs,width,routes|
        var previous=width,plan=List.new,cells=0,ids=specs.collect{|s|s[\id].asSymbol};routes=routes ? ();
        if(specs.size>32 or:{ids.includes(\output)} or:{ids.as(Set).size!=ids.size}){Error("Chain needs up to 32 uniquely named stages").throw};
        routes.keys.do{|key|if((ids++[\output]).includes(key.asSymbol).not){Error("Unknown routing target").throw}};
        specs.do{|spec|
            var definition=AWBChain.stageDefinition(spec[\factory]);
            plan.add((target:spec[\id].asSymbol,sourceWidth:previous,targetWidth:definition[\inputWidth],matrix:this.matrix(routes[spec[\id].asSymbol],previous,definition[\inputWidth])));
            if(routes[spec[\id].asSymbol].notNil){cells=cells+(previous*definition[\inputWidth])};previous=definition[\outputWidth];
        };
        if(routes[\output].notNil){cells=cells+(previous*width)};if(cells>4096){Error("Chain routing supports up to 4096 matrix coefficients").throw};
        plan.add((target:\output,sourceWidth:previous,targetWidth:width,matrix:this.matrix(routes[\output],previous,width)));^plan.asArray;
    }
    ensureDefinition { |sourceWidth,targetWidth|
        var key=(sourceWidth.asString++"_"++targetWidth).asSymbol,def=definitions[key];
        if(def.isNil){def=SynthDef(("awbChainRoute_"++key).asSymbol,{
            var in=NamedControl.kr(\in,0),out=NamedControl.kr(\out,0),matrix=NamedControl.kr(\matrix,Array.fill(sourceWidth*targetWidth,0));
            var signal=In.ar(in,sourceWidth),result=Array.fill(targetWidth,{|row|(signal*matrix.copyRange(row*sourceWidth,(row+1)*sourceWidth-1)).sum});
            Out.ar(out,result);
        });definitions[key]=def;SynthDescLib.global.add(def.asSynthDesc);chain.dispatch([\d_recv,def.asBytes]);};^def;
    }
    prepare { |plan|plan.do{|edge|if(edge[\target]==\output or:{edge[\matrix].notNil}){this.ensureDefinition(edge[\sourceWidth],edge[\targetWidth])}};^this}
    apply { |plan|
        var messages=List.new,previous=chain.input,live=IdentitySet.new,old=List.new;
        plan.do{|edge|
            var key=edge[\target],stage=if(key==\output){nil}{chain.stageAt(key)},out,node,record=records[key],matrix=edge[\matrix];
            live.add(key);
            if(stage.notNil and:{matrix.isNil}){
                if(record.notNil){old.add(record[\node]);records.removeAt(key)};
                messages.addAll(stage.inputMessages(previous));
            }{
                out=if(stage.isNil){chain.output}{stage.matrixInput};
                matrix=matrix ?? {Array.fill(edge[\targetWidth],{|row|Array.fill(edge[\sourceWidth],{|col|if(row==col){1}{0}})})};
                if(record.isNil or:{record[\sourceWidth]!=edge[\sourceWidth]} or:{record[\targetWidth]!=edge[\targetWidth]}){
                    var def=this.ensureDefinition(edge[\sourceWidth],edge[\targetWidth]);
                    if(record.notNil){old.add(record[\node])};node=Synth.basicNew(def.name,chain.server);
                    messages.add(node.newMsg(chain.group,[\in,previous.index,\out,out.index],\addToTail));
                    chain.own(node,\synth,(name:"Route "++key,defName:def.name,parent:chain.group));
                    records[key]=(node:node,sourceWidth:edge[\sourceWidth],targetWidth:edge[\targetWidth]);
                }{node=record[\node];messages.add(node.setMsg(\in,previous.index,\out,out.index))};
                messages.add(node.setnMsg(\matrix,matrix.flat));
                if(stage.notNil){messages.addAll(stage.inputMessages(out))};
            };
            if(stage.notNil){messages.add(stage.group.moveToTailMsg(chain.group));if(records[key].notNil){messages.add(records[key][\node].moveBeforeMsg(stage.group))};messages.add(stage.group.runMsg(true));previous=stage.output};
        };
        records.keys.copy.do{|key|if(live.includes(key).not){old.add(records.removeAt(key)[\node])}};
        if(records[\output].notNil){messages.add(records[\output][\node].moveToTailMsg(chain.group))};
        old.do{|node|messages.add(node.freeMsg);chain.disownNode(node)};
        chain.dispatchBundle(messages.asArray);^this;
    }
    snapshot { |plan|^plan.collect{|edge|edge.copy}}
}
