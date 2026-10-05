// Optional BaseLaunch control-send bank. Audio routing is always explicit.
AWBControlSendProfile {
    *sendIDs {
        ^[\c1,\c2,\c3,\c4,'mod-b1','mod-b2','mod-a2','mod-a1','mod-stut',
          'mod-splut','mod-um','mod-spark','mod-deci','mod-fuzz','mod-verb','mod-mast'];
    }
    *inputMap {
        ^(ef_m0:\c1,ef_m1:\c2,ef_m2:\c3,ef_m3:\c4,
          ef_b1:'mod-b1',ef_b2:'mod-b2',ef_a2:'mod-a2',ef_a1:'mod-a1',
          ef_mast2:'mod-stut',ef_splut:'mod-splut',ef_mast1:'mod-um',
          ef_spark:'mod-spark',ef_deci:'mod-deci',ef_fuzz:'mod-fuzz',
          ef_verb:'mod-verb',ef_mast0:'mod-mast');
    }
    *baseLaunchBuses { |rack|
        var buses=IdentityDictionary.new;
        this.inputMap.keysValuesDo{|source,id|buses[source]=rack.measurementFor(id)};
        ^buses;
    }
    *configure { |configuration|
        var config=(configuration ? AWBSendRackTool.defaults).deepCopy;
        config[\fixedFollowers]=this.sendIDs.collect{|id|(id:id,label:id.asString.toUpper)};
        ^config;
    }
    *presets {
        var result=List.new;
        [\c1,\c2,\c3,\c4].do{|id|
            result.add((send:id,id:\short,settings:(attack:0.2,release:0.4,blend:0.66,scale:1)));
            result.add((send:id,id:\medium,settings:(attack:1.2,release:2.4,blend:0.66,scale:2)));
            result.add((send:id,id:\long,settings:(attack:8,release:9,blend:0.66,scale:2.5)));
        };
        [
            ['mod-b1',\f_b1,1.35,6.6,0.2,4.55],
            ['mod-b2',\f_b2,1.35,6.6,0.2,4.55],
            ['mod-a2',\f_a2,0.8,2.2,0.7,4.55],
            ['mod-a1',\f_a1,0.4,5.1,0.7,3],
            ['mod-stut',\f_stut,0.65,1.2,0.2,0],
            ['mod-stut',\f_stut_vc,0.65,1.2,0.2,1.4],
            ['mod-splut',\f_splut,1.75,4,0.67,1.85],
            ['mod-um',\f_um,1.5,2,0.5,2.2],
            ['mod-spark',\f_spark,7.3,7,0.67,1.75],
            ['mod-deci',\f_deci,5,4.5,0.45,2.2],
            ['mod-fuzz',\f_fuzz,3.25,3.8,0.5,1.5],
            ['mod-verb',\f_verb,11,15.5,0.75,2],
            ['mod-mast',\f_mast,7.5,11.5,0.75,2.5]
        ].do{|row|result.add((send:row[0],id:row[1],settings:(attack:row[2],release:row[3],blend:row[4],scale:row[5])))};
        ^result.asArray;
    }
    *install { |rack|
        rack.requireOpen;
        this.sendIDs.do{|id|rack.measurementFor(id)};
        if(\EnvDetect3.asClass.isNil){Error("BaseLaunch followers require EnvDetect3").throw};
        this.sendIDs.do{|id|rack.setDetector(id,(mode:\peak,gainDb:14.4,rise:0.00562,fall:0.0234))};
        this.presets.do{|preset|rack.setControlFollower(preset[\send],preset[\id],preset[\settings])};
        ^rack;
    }
}
