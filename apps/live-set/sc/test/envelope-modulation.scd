// Actual engine functional matrix. All hardware output is muted; no scenes run.
{|base,view|
    Routine({
        var set=base.resourceAt(\firstPassSet),rack=base.rack,checks=0,failures=0,check,near,read,readPlugin,query,serial=0;
        var oracle,edges=List.new,rows,sourceNames,parameters,probe,definition,root=~awbSet.root;
        var profileFor,maps,freeze,outputBefore,outputAfter,profiles,headRecords,verbProbes,verbTone;
        check={|ok,label,actual,expected|
            checks=checks+1;if(ok.not){failures=failures+1};
            ("ENV_CHECK|"++if(ok){"PASS"}{"FAIL"}++"|"++label++"|"++actual.asString++"|"++expected.asString).postln;
        };
        near={|actual,expected,tolerance=0.0001|(actual-expected).abs<tolerance};
        read={|bus|
            var value,done=false,limit=Main.elapsedTime+2;
            bus.getn(bus.numChannels,{|v|value=v;done=true});
            while{done.not and:{Main.elapsedTime<limit}}{0.002.wait};
            if(done.not){Error("Bus read timed out: "++bus.index).throw};if(value.size==1){value[0]}{value};
        };
        readPlugin={|controller,index|
            var value,done=false,limit=Main.elapsedTime+2;
            controller.get(index,{|v|value=v;done=true});
            while{done.not and:{Main.elapsedTime<limit}}{0.002.wait};
            if(done.not){Error("Plugin read timed out").throw};value;
        };
        // Query one synth's real mapping on the installed server. A temporary
        // one-child group occupies exactly that synth's former position, then
        // restores it. Read the returned c-bus; do not substitute language cache.
        query={|target|
            var node=target[\synth],group=Group.before(node),done=false,value,responder;
            var limit=Main.elapsedTime+2,raw,index,bus;
            node.moveToHead(group);rack.server.sync;
            responder=OSCFunc({|msg|raw=msg;done=true},'/g_queryTree.reply',rack.server.addr,argTemplate:[1,group.nodeID]);
            rack.server.sendMsg(\g_queryTree,group.nodeID,1);
            while{done.not and:{Main.elapsedTime<limit}}{0.002.wait};responder.free;
            node.moveBefore(group);group.free;NodeManager.forget(group);rack.server.sync;
            if(done.not){Error("Native mapping query timed out: "++target[\control]).throw};
            index=raw.detectIndex{|v|v.asString==target[\control].asString};
            if(index.isNil){raw.postln;target.postln;Error("Control absent from native mapping reply").throw};
            bus=raw[index+1];
            if((bus.isString or:{bus.isKindOf(Symbol)}) and:{bus.asString.beginsWith("c")}){value=read.value(Bus.new(\control,bus.asString.drop(1).asInteger,1,rack.server));[0,0,0,0,0,value,1]}{[0,0,0,0,0,bus,0]};
        };
        profileFor={|kind|if(kind==\um){set.sharedMix}{set.fxMix(kind)}};
        try {
            rack.masterGroup.set(\level,0);rack.server.sync;
            oracle=(root+/+"apps/live-set/sc/test/envelope-blender-oracle.scd").load;
            check.value(base.blenders.size==oracle.size,"all original active blenders represented",base.blenders.size,oracle.size);
            definition=SynthDef(\awbEnvelopeMatrixTone,{|out=0,level=0,width=2|Out.ar(out,DC.ar(level));Out.ar(out+1,DC.ar(level)*(width-1))});definition.send(rack.server);rack.server.sync;
            probe=Synth.head(rack.sourceGroup,definition.name,[\out,rack.inputFor(\vc).index,\level,0.05]);
            // Every send separately reaches its own short detector, without crosstalk.
            AWBControlSendProfile.sendIDs.do{|id|
                AWBControlSendProfile.sendIDs.do{|other|rack.setSend(\vc,other,(other==id).asInteger)};
                rack.server.sync;0.20.wait;
                check.value(read.value(rack.measurementFor(id))>0.03,"audio send reaches detector "++id);
                AWBControlSendProfile.sendIDs.reject{|other|other==id}.do{|other|
                    check.value(read.value(rack.measurementFor(other))<0.001,"detector isolation "++id++" / "++other);
                };
            };
            AWBControlSendProfile.sendIDs.do{|id|rack.setSend(\vc,id,1)};rack.server.sync;6.wait;
            // Every ENV fader scales its own detector and leaves the others on.
            AWBControlSendProfile.sendIDs.do{|id|
                var p=rack.slotAt(id)[\amountParam],reference=read.value(rack.measurementFor(id));
                p.setBase(0);rack.server.sync;0.15.wait;
                check.value(read.value(rack.measurementFor(id))<0.001,"envelope fader zero "++id);
                check.value(AWBControlSendProfile.sendIDs.reject{|other|other==id}.every{|other|read.value(rack.measurementFor(other))>0.03},"envelope fader isolation "++id);
                p.setBase(0.5);rack.server.sync;0.10.wait;
                {var actual=read.value(rack.measurementFor(id));check.value(near.value(actual,reference*0.5,0.001),"envelope fader half "++id,actual,reference*0.5)}.value;
                p.setBase(1);rack.server.sync;0.10.wait;
            };
            base.followers.keys.asArray.sort.do{|id|
                var value=read.value(base.followers[id].bus);
                check.value(if(id==\f_stut){value.abs<0.0001}{if([\vcaf,\p2af,\micaf].includes(id)){value.abs<0.0001}{value>0.0001}},"follower response or intentional zero "++id,value);
            };
            // Independent instrument bus feeds, with input VC already covered.
            [\vc,\pro2,\mic].do{|id|
                var instrument=Synth.head(rack.sourceGroup,definition.name,[\out,if(id==\vc){set.celloInputBus.index}{rack.inputFor(id).index},\level,0.02,\width,if(id==\vc){1}{2}]);
                0.5.wait;check.value(read.value(base.followers[if(id==\vc){\vcaf}{if(id==\pro2){\p2af}{\micaf}}].bus)>0.01,"instrument follower "++id);instrument.free;NodeManager.forget(instrument);
            };
            probe.free;NodeManager.forget(probe);probe=nil;0.3.wait;
            base.followers.values.do{|sig|sig.controller.run(false)};
            base.blenders.values.do{|sig|sig.controller.run(false)};rack.server.sync;
            // Full graph scheduling, with one independent envelope active at a
            // time. Expected values recurse through the original graph oracle.
            base.blenders.values.do{|sig|sig.controller.run(true)};
            base.followers.keys.asArray.sort.do{|input|
                var expected=IdentityDictionary.new;
                base.followers.keys.do{|id|expected[id]=if(id==input){0.4}{0};base.b[id].set(expected[id])};
                expected[\1]=1;expected[\0]=0;expected[\n1]= -1;base.b[\1].set(1);base.b[\0].set(0);base.b[\n1].set(-1);
                oracle.do{|r|expected[r[0]]=r[3]*expected[r[7]]*((expected[r[1]]*(1-r[5]))+(expected[r[2]]*r[5]))};
                rack.server.sync;0.05.wait;
                oracle.do{|r|
                    var actual=read.value(base.b[r[0]]);
                    check.value(near.value(actual,expected[r[0]]),"full graph isolated envelope "++input++" -> "++r[0],actual,expected[r[0]]);
                };
            };
            // Simultaneous envelopes establish the multiplication path as well.
            {
                var expected=IdentityDictionary.new;
                base.followers.keys.asArray.sort.do{|id,i|expected[id]=0.1+(i*0.013);base.b[id].set(expected[id])};
                expected[\1]=1;expected[\0]=0;expected[\n1]= -1;base.b[\1].set(1);base.b[\0].set(0);base.b[\n1].set(-1);
                oracle.do{|r|expected[r[0]]=r[3]*expected[r[7]]*((expected[r[1]]*(1-r[5]))+(expected[r[2]]*r[5]))};
                rack.server.sync;0.05.wait;
                oracle.do{|r|var actual=read.value(base.b[r[0]]);check.value(near.value(actual,expected[r[0]]),"full graph simultaneous envelopes -> "++r[0],actual,expected[r[0]])};
            }.value;
            base.blenders.values.do{|sig|sig.controller.run(false)};
            // All eight binary input combinations, then the live blend extremes.
            oracle.do{|row|
                var sig=base.blenders[row[0]],blend=row[5],scale=row[3];
                sig.controller.set(\blend,blend,\staticScalar,scale,\offset,0,\scalarMod,1,\bus1Polarity,1,\bus2Polarity,1);
                sig.controller.run(true);
                8.do{|mask|
                    var a=if(mask.bitAnd(1)>0){0.23}{0},b=if(mask.bitAnd(2)>0){0.61}{0},scalar=if(mask.bitAnd(4)>0){0.47}{0},actual,expected;
                    base.b[row[1]].set(a);base.b[row[2]].set(b);base.b[row[7]].set(scalar);base.b[row[8]].set(0);rack.server.sync;0.025.wait;
                    actual=read.value(sig.bus);expected=scale*scalar*((a*(1-blend))+(b*blend));
                    check.value(near.value(actual,expected),"blender "++row[0]++" combination "++mask,actual,expected);
                };
                [0,1].do{|b|
                    var actual,expected;
                    sig.setBlend(b);base.b[row[1]].set(0.23);base.b[row[2]].set(0.61);base.b[row[7]].set(0.47);rack.server.sync;0.025.wait;
                    actual=read.value(sig.bus);expected=scale*0.47*if(b==0){0.23}{0.61};
                    check.value(near.value(actual,expected),"blender endpoint "++row[0]++" "++b,actual,expected);
                };
                sig.setBlend(blend);sig.setScale(0);rack.server.sync;0.025.wait;
                check.value(read.value(sig.bus).abs<0.0001,"blender scale zero "++row[0]);
                sig.setScale(scale);sig.setOffset(0.1);rack.server.sync;0.025.wait;
                check.value(near.value(read.value(sig.bus),0.1+(scale*0.47*((0.23*(1-blend))+(0.61*blend)))),"blender offset setter "++row[0]);
                sig.setOffset(0);sig.controller.run(false);
            };
            // Explicit intended output destinations, independent of registry traversal.
            [\b1,\a2,\b2,\a1].do{|id|[["in",\inOf,\inputGain],["fx",\fxOf,\effectLevel],["fb",\fbOf,\feedback],["t",\sliOf,\seconds]].do{|r|
                edges.add((source:(id.asString++"_"++r[0]).asSymbol,param:base.t[id].p[r[1]],native:base.liveDelays.graph.cellTarget(id.asString.toUpper,r[2]),label:id.asString++"/"++r[1]));
            }};
            edges.add((source:\verb_sSC,param:set.verbMix.selector,label:"verb/selector"));
            [[\spark,\f_spark,\aSpark],[\spark,\spk_1,\aShape],[\spark,\spk_2,\aTail],[\spark,\spk_3,\aPitch],[\spark,\spk_4,\aTailShape],
             [\deci,\deci_1,\depth],[\deci,\deci_2,\folding],[\deci,\deci_3,\a],
             [\fuzz,\fuzz_shp,\aFuzz],[\um,\um_nz,\aDrive],[\um,\um_nz,\aNoise],[\um,\um_r8,\aRate],[\um,\um_dep,\aDepth],[\um,\um_wnk,\aWonk],[\um,\f_um,\aMix],[\um,\fuzz_schrt2,\aSchertler]].do{|r|edges.add((source:r[1],param:profileFor.value(r[0]).param(r[2]),depth:if(r[1]==\deci_1){0.2}{if(r[1]==\deci_2){0.53}{1}},label:r[0].asString++"/"++r[2]))};
            check.value(edges.size==33,"explicit intended envelope destinations",edges.size,33);
            parameters=edges.collect{|edge|edge[\param]};sourceNames=edges.collect{|edge|edge[\source]}.as(Set);
            sourceNames.do{|id|base.b[id].set(0)};
            parameters.do{|param|param.setBase(param.spec.map(0.25));param.setAmount(0.5);param.setModCurve(0)};rack.server.sync;0.06.wait;
            edges.do{|edge|
                var param=edge[\param],source=edge[\source],record=param.modulationConnections[source],actual,expected;
                check.value(record.notNil and:{record[\source]===base.modulationRegistry.sources[source]},"registered intended edge "++source++" -> "++edge[\label]);
                [0,0.3].do{|x|
                    sourceNames.do{|id|base.b[id].set(if(id==source){x}{0})};rack.server.sync;0.04.wait;
                    parameters.do{|candidate,i|
                        var belongs=edges[i][\source]==source,value=read.value(candidate.outputBus),e=candidate.spec.map(0.25+if(belongs){x*0.5*(edges[i][\depth] ? 1)}{0});
                        check.value(near.value(value,e),"route isolation "++source++" "++x++" -> "++edges[i][\label],value,e);
                    };
                    if(edge[\native].notNil){
                        actual=query.value(edge[\native]);expected=read.value(param.outputBus);
                        check.value(near.value(actual[5],expected) and:{actual[6]==1},"actual mapped delay control "++edge[\label]++" "++x,actual[5],expected);
                    };
                };
                if(param.polarity==\bipolar){
                    param.setAmount(-0.5);base.b[source].set(0.3);rack.server.sync;0.04.wait;actual=read.value(param.outputBus);expected=param.spec.map(0.25-(0.15*(edge[\depth] ? 1)));
                    check.value(near.value(actual,expected),"negative envelope amount "++edge[\label],actual,expected);param.setAmount(0.5);
                };
            };
            // All destinations reject accidental modulation when amount is zero,
            // and apply the authored curve before mapping their native range.
            edges.do{|edge|
                var param=edge[\param],depth=edge[\depth] ? 1,actual,expected;
                sourceNames.do{|id|base.b[id].set(if(id==edge[\source]){0.3}{0})};
                param.setBase(param.spec.map(0.25));param.setAmount(0);rack.server.sync;0.035.wait;
                actual=read.value(param.outputBus);expected=param.spec.map(0.25);
                check.value(near.value(actual,expected),"zero amount holds baseline "++edge[\label],actual,expected);
                param.setAmount(0.5);
                [-4,0,4].do{|curve|
                    var shaped=if(curve==0){0.3*depth}{(((0.3*depth*curve).exp)-1)/(curve.exp-1)};
                    param.setModCurve(curve);rack.server.sync;0.035.wait;actual=read.value(param.outputBus);expected=param.spec.map(0.25+(0.5*shaped));
                    check.value(near.value(actual,expected),"modulation curve "++curve++" "++edge[\label],actual,expected);
                };
                param.setModCurve(0);param.setBase(param.spec.maxval);base.b[edge[\source]].set(1);rack.server.sync;0.035.wait;
                actual=read.value(param.outputBus);check.value(near.value(actual,param.spec.maxval),"upper clipping "++edge[\label],actual,param.spec.maxval);
                if(param.polarity==\bipolar){param.setBase(param.spec.minval);param.setAmount(-0.5);rack.server.sync;0.035.wait;actual=read.value(param.outputBus);check.value(near.value(actual,param.spec.minval),"lower clipping "++edge[\label],actual,param.spec.minval)};
                param.setAmount(0.5);param.setBase(param.spec.map(0.25));
            };
            // Check the actual Deci amount pair, not just the auxiliary input parameter.
            [\depth,\folding].do{|name,i|
                var profile=set.fxMix(\deci),source=[\deci_1,\deci_2][i],p=profile.param(name),zero,positive,negative;
                profile.param(\lfoAmount).setBase(0);profile.param(\shape).setBase(0);base.b[\deci_3].set(0);profile.param(\a).setBase(0);
                p.setBase(0.5);p.setAmount(0);base.b[source].set(0.3);rack.server.sync;0.05.wait;zero=read.value(profile.bus(name));
                p.setAmount(0.5);rack.server.sync;0.05.wait;positive=read.value(profile.bus(name));
                check.value(near.value(read.value(p.outputBus),positive),"Deci positive AWParam output matches plugin bus "++name,read.value(p.outputBus),positive);
                p.setAmount(-0.5);rack.server.sync;0.05.wait;negative=read.value(profile.bus(name));
                check.value(positive>(zero+0.005) and:{negative<(zero-0.005)},"Deci signed amount reaches plugin bus "++name,[zero,positive,negative]);
                check.value((read.value(p.outputBus)-negative).abs<0.0001,"Deci AWParam output is the effective envelope control "++name,read.value(p.outputBus),negative);
            };
            // Verb envelope drives selector, all poles, all five branch controls.
            // Observe the real branch ingress audio, including captured volume
            // taper and gain. All physical output remains muted.
            verbProbes=IdentityDictionary.new;
            SynthDef(\awbEnvelopeIngressProbe,{|in=0,out=0|ReplaceOut.kr(out,A2K.kr(In.ar(in,2)[0]))}).send(rack.server);rack.server.sync;
            set.verbMix.inputGain.setBase(1);
            verbTone=Synth.head(rack.sourceGroup,definition.name,[\out,rack.destinationFor(\verb).index,\level,0.001]);
            [[\earth,2.5,0],[\composite,-0.4,-8.4],[\texture,0,0],[\shimmer,0,0],[\echo,0,-20]].do{|row|
                var gate=set.verbBranch(row[0]),bus=Bus.control(rack.server,1),node,mixIndex,gain,wet;
                mixIndex=query.value((synth:gate.ingress,control:\mixBus));gain=query.value((synth:gate.ingress,control:\gain));wet=query.value((synth:gate.returnNode,control:\wetGain));
                check.value(mixIndex[5]==set.verbMix.branch(row[0]).outputBus.index,"Verb native branch mix bus "++row[0]);
                check.value(near.value(gain[5],row[1].dbamp),"Verb captured branch gain "++row[0],gain[5],row[1].dbamp);
                check.value(near.value(wet[5],row[2].dbamp),"Verb captured wet gain "++row[0],wet[5],row[2].dbamp);
                node=Synth.tail(gate.group,\awbEnvelopeIngressProbe,[\in,gate.inputBus.index,\out,bus.index]);
                verbProbes[row[0]]=(bus:bus,node:node,gain:row[1].dbamp);
            };

            sourceNames.do{|id|base.b[id].set(0)};
            [0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1].do{|position|
                var config=set.verbMix.configuration,weights=4.collect{|i|(1-((position*4)-(i+1)).abs).clip(0,1)};
                set.verbMix.selector.setBase(position);set.verbMix.selector.setAmount(0);rack.server.sync;0.15.wait;
                AWBVerbMixProfile.branchIDs.do{|id,i|
                    var expected=(config[\bases][i]+4.collect{|j|weights[j]*config[\profiles][j][i]}.sum).clip(0,1),actual=read.value(set.verbMix.branch(id).outputBus);
                    check.value(near.value(actual,expected),"Verb pole/interpolation "++position++"/"++id,actual,expected);
                    {var amplitude=read.value(verbProbes[id][\bus]),target=0.001*((expected*2).pow(3))*verbProbes[id][\gain];check.value(near.value(amplitude,target,0.000002),"Verb actual tapered ingress "++position++"/"++id,amplitude,target)}.value;
                };
            };
            [-0.5,0,0.5].do{|amount|
                var config=set.verbMix.configuration,position=0.2+(amount*0.3),weights=4.collect{|i|(1-((position*4)-(i+1)).abs).clip(0,1)};
                set.verbMix.selector.setBase(0.2);set.verbMix.selector.setAmount(amount);base.b[\verb_sSC].set(0.3);rack.server.sync;0.05.wait;
                AWBVerbMixProfile.branchIDs.do{|id,i|
                    var expected=(config[\bases][i]+4.collect{|j|weights[j]*config[\profiles][j][i]}.sum).clip(0,1),actual=read.value(set.verbMix.branch(id).outputBus);
                    check.value(near.value(actual,expected),"Verb signed envelope "++amount++"/"++id,actual,expected);
                };
            };
            verbTone.free;NodeManager.forget(verbTone);verbTone=nil;
            verbProbes.values.do{|item|item[\node].free;NodeManager.forget(item[\node]);item[\bus].free};verbProbes=nil;
            // Each FX envelope must change its audible profile outputs. Exercise
            // baseline and four selector poles; zero control input remains zero.
            [[\spark,\f_spark,#[pitchMix,math]], [\spark,\spk_1,#[spiralWet,delayWet]],
             [\spark,\spk_2,#[tailMix,position]], [\spark,\spk_3,#[upperWet,lowerWet]],
             [\spark,\spk_4,#[delayFeedback]], [\deci,\deci_3,#[math,wet]],
             [\fuzz,\fuzz_shp,#[mix,gain]], [\um,\um_nz,#[driveInGain,driveNoiseGain]],
             [\um,\um_r8,#[rateMath,vibratoRate]], [\um,\um_dep,#[depthMath,vibratoDepth]],
             [\um,\um_wnk,#[wonkMath,delay]], [\um,\f_um,#[mixMath,mix]],
             [\um,\fuzz_schrt2,#[schepsMix]]].do{|r|
                var profile=profileFor.value(r[0]);
                profile.params.values.do{|p|if(p.isKindOf(AWParam)){p.setBase(p.spec.minval);p.setAmount(1)}};
                if(r[0]==\um){profile.param(\schertlerMix).setBase(1)};
                [0,0.25,0.5,0.75,1].do{|pole|
                    var before,after;
                    sourceNames.do{|id|base.b[id].set(0)};
                    switch(r[0],\spark,{profile.param(\tailMix).setBase(pole);profile.param(\pitchSelect).setBase(0);profile.param(\tailShape).setBase(0);profile.param(\delaySC).setBase(0.5);profile.param(\aDelayFeedback).setBase(0.3)},
                        \deci,{profile.param(\shape).setBase(pole);profile.param(\lfoRate).setBase(0.04)},
                        \fuzz,{profile.param(\shape).setBase(pole);profile.param(\lfoRate).setBase(0.04)},
                        \um,{profile.param(\shape).setBase(pole);profile.param(\earth).setBase(pole);profile.param(\main).setBase(pole);profile.param(\wonk).setBase(0.4)});
                    rack.server.sync;0.15.wait;before=r[2].collect{|id|read.value(profile.bus(id))};
                    base.b[r[1]].set(if(r[1]==\spk_3){0.8}{0.15});rack.server.sync;0.15.wait;after=r[2].collect{|id|read.value(profile.bus(id))};
                    r[2].do{|id,i|
                        // Empty-pole amounts and selector clipping can intentionally
                        // produce no change. Check these as declared zero cases.
                        var zero=(pole==0 and:{[\um_nz,\um_r8,\um_dep,\f_um].includes(r[1])})
                            or:{r[1]==\spk_3 and:{pole<=0.25 or:{id==\lowerWet and:{pole<=0.5}}}}
                            or:{pole==0 and:{[\f_spark,\spk_1,\spk_2,\spk_4,\deci_3].includes(r[1])}};
                        check.value(if(zero){near.value(after[i],before[i])}{((after[i]-before[i]).abs>0.00001) or:{before[i]==1 and:{after[i]==1}}},"FX envelope influence "++r[0]++"/"++r[1]++" -> "++id++" pole "++pole,after[i],before[i]);
                    };
                };
            };
            // All 24 erosion/position edges reach the actual tape-head controls.
            ["B1","A2","B2","A1"].do{|id|
                var cell=base.liveDelays.state[\cells].detect{|c|c[\id]==id};
                cell[\heads].do{|head,i|
                    [["amount",\level,(id++head[\id]++"Erosion").asSymbol]].do{|r|
                        var param=base.liveDelays.params[id++"/"++head[\id]++"/"++r[0]],src=base.modulationRegistry.sources[r[2]],target=base.liveDelays.graph.headTarget(id,head[\id],r[1]),actual;
                        src.producer.run(false);src.bus.set(0);param.setBase(0.7);param.setAmount(1);rack.server.sync;0.04.wait;
                        actual=query.value(target);check.value(near.value(actual[5],0.7) and:{actual[6]==1},"head zero erosion "++r[2],actual[5],0.7);
                        src.bus.set(-0.2);rack.server.sync;0.04.wait;actual=query.value(target);check.value(near.value(actual[5],0.5),"head erosion reaches head "++r[2],actual[5],0.5);
                    };
                    if([1,3].includes(i)){
                        var param=base.liveDelays.params[id++"/"++head[\id]++"/time"],src=base.modulationRegistry.sources[(id++head[\id]++"Position").asSymbol],target=base.liveDelays.graph.headTarget(id,head[\id],\time),actual;
                        param.setBase(2);param.setAmount(1);[-0.1,0,0.1].do{|delta|
                            src.bus.set(delta);rack.server.sync;0.04.wait;actual=query.value(target);
                            check.value(near.value(actual[5],2+delta),"head position reaches head "++id++"/"++head[\id]++" "++delta,actual[5],2+delta);
                        };
                    };
                };
            };
            // Run the actual seven delay-envelope presets and compare their
            // amounts AND actual mapped outputs with the original preset values.
            {
                var presetOracle=(root+/+"apps/live-set/sc/test/envelope-preset-oracle.scd").load;
                presetOracle.do{|row|
                    var expected=IdentityDictionary.new;
                    p[\dmod][\reset].run(0);0.08.wait;
                    [\b1,\a2,\b2,\a1].do{|id|[\inOf,\fxOf,\fbOf,\sliOf].do{|key|var param=base.t[id].p[key];param.setBase(param.spec.map(0.25));param.setModCurve(0);expected[(id.asString++"/"++key).asSymbol]=0}};
                    row[1].do{|r|var key=switch(r[1],\inSc,\inOf,\fxSc,\fxOf,\fbSc,\fbOf,\sliSc,\sliOf);expected[(r[0].asString++"/"++key).asSymbol]=r[2]};
                    edges.select{|edge|edge[\native].notNil}.do{|edge|base.b[edge[\source]].set(0.3)};
                    p[\dmod][row[0]].run(0);0.1.wait;rack.server.sync;
                    edges.select{|edge|edge[\native].notNil}.do{|edge|
                        var param=edge[\param],amount=expected[edge[\label].asSymbol],value=query.value(edge[\native]),target=param.spec.map((0.25+(0.3*amount)).clip(0,1));
                        check.value(near.value(param.amountTarget,amount),"original delay envelope preset amount "++row[0]++"/"++edge[\label],param.amountTarget,amount);
                        check.value(near.value(value[5],target),"original delay envelope preset output "++row[0]++"/"++edge[\label],value[5],target);
                    };
                };
            }.value;
            // Every existing VST map is checked by actual plugin readback against
            // its canonical direct setter, allowing the plugin's own quantization.
            maps=[
                [\deci,\depth,\depth],[\deci,\folding,\folding],
                [\spiral,\wetdry,\spiralWet],
                [\upper,\wetdry,\upperWet],[\upper,\octave,\upperOctave],[\upper,\pitchshift,\upperPitch],[\upper,\feedback,\upperFeedback],[\upper,\cents,\upperCents],[\upper,\time,\upperTime],
                [\lower,\wetdry,\lowerWet],[\lower,\octave,\lowerOctave],[\lower,\pitchshift,\lowerPitch],[\lower,\feedback,\lowerFeedback],
                [\delay,\wetdry,\delayWet],[\delay,\feedback,\delayFeedback],[\delay,\envmodulate,\delayAuto],[\delay,\time,\delayTime],
                [\tailDeci,\depth,\tailDepth],[\tailDeci,\folding,\tailFolding],
                [\fuzz,\Mix,\mix],[\fuzz,\Gain,\gain],[\fuzz,\Output,\output],[\fuzz,\Input,\input],[\fuzz,'Low-Mid Gain',\lowMidGain],[\fuzz,'High-Mid Gain',\highMidGain]
            ];
            [[\Mix,\mix],[\Depth,\depth],[\DetuneDepth,\detuneDepth],[\DetuneRate,\detuneRate],[\VibratoDepth,\vibratoDepth],[\VibratoRate,\vibratoRate],[\DriveInGain,\driveInGain],[\DriveNoiseGain,\driveNoiseGain],[\DiffEnable,\diffEnable],[\Diffusion,\diffusion],[\DiffSize,\diffSize],[\Delay,\delay],[\Feedback,\feedback],[\OverMod,\overMod]].do{|r|maps=maps.add([\um,r[0],r[1]])};
            profiles=[set.fxMix(\deci),set.fxMix(\spark),set.fxMix(\fuzz),set.sharedMix];
            [0.1,0.55].do{|x|
                sourceNames.do{|id|base.b[id].set(x)};rack.server.sync;0.10.wait;
                profiles.do{|profile|profile.node.run(false)};rack.server.sync;
                maps.do{|row|
                    var role=row[0],profile=profileFor.value(if(role==\um){\um}{if(role==\deci){\deci}{if(role==\fuzz){\fuzz}{\spark}}});
                    var controller=set.plugin(role),bus=profile.bus(row[2]),index=controller.info.findParamIndex(row[1].asString),expected=read.value(bus),actual,direct;
                    actual=readPlugin.value(controller,index);controller.unmap(index);controller.set(index,expected);rack.server.sync;0.025.wait;direct=readPlugin.value(controller,index);controller.map(index,bus);rack.server.sync;
                    check.value(near.value(actual,direct,0.00002),"actual VST mapping "++role++"/"++row[1]++" envelope "++x,actual,direct);
                };
                profiles.do{|profile|profile.node.run(true)};
            };
            ~awbLiveClose.value;1.wait;check.value(base.closed,"envelope fixture closes the owning set");
            ("AWB_ENVELOPE_MATRIX_RESULT="++if(failures==0){"PASS"}{"FAIL"}++" checks="++checks++" failures="++failures).postln;
            ("AWB_MIGRATION_FUNCTIONAL_RESULT="++if(failures==0){"PASS"}{"FAIL"}++" checks="++checks).postln;
            rack.server.quit;1.wait;if(failures==0){0.exit}{1.exit};
        }{|error|error.reportError;probe.tryPerform(\free);if(probe.notNil){base.instance.disown(probe)};~awbLiveClose.value;rack.server.quit;1.wait;1.exit};
    }).play(SystemClock);
}
