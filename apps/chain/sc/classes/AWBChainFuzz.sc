// A small native example, following the first-pass live set's Fuzz algorithm.
AWBChainFuzz {
    *definitions {
        ^[
            SynthDef(\awbChainFuzzInput,{|in=0,out=0,highpass=40|
                Out.ar(out,HPF.ar(In.ar(in,2),Lag.kr(highpass,0.02)));
            }),
            SynthDef(\awbChainFuzzShape,{|in=0,out=0,drive=8,bias=0|
                var signal=In.ar(in,2),offset=Lag.kr(bias,0.02);
                Out.ar(out,LeakDC.ar((signal*Lag.kr(drive,0.02)+offset).tanh-offset.tanh));
            }),
            SynthDef(\awbChainFuzzOutput,{|in=0,out=0,lowpass=12000,level=1|
                Out.ar(out,LPF.ar(In.ar(in,2),Lag.kr(lowpass,0.02))*Lag.kr(level,0.02));
            })
        ];
    }
    *register { |server,sendDefinitions=true|
        server=server ? Server.default;
        this.definitions.do{|def|SynthDescLib.global.add(def.asSynthDesc);if(sendDefinitions){def.send(server)}};
        AWBChain.registerStageFactory(\fuzzInput,(name:"High pass",controls:[this.config[\controls][2]]),{|stage|
            stage.addSynth(\process,\awbChainFuzzInput,[\in,stage.input.index,\out,stage.output.index]);stage.bindInput(\process);stage.bind(\highpass,\process,\highpass);
        });
        AWBChain.registerStageFactory(\fuzzShape,(name:"Fuzz",controls:this.config[\controls].copyRange(0,1)),{|stage|
            stage.addSynth(\process,\awbChainFuzzShape,[\in,stage.input.index,\out,stage.output.index]);stage.bindInput(\process);stage.bind(\drive,\process,\drive);stage.bind(\bias,\process,\bias);
        });
        AWBChain.registerStageFactory(\fuzzTone,(name:"Low pass / level",controls:this.config[\controls].copyRange(3,4)),{|stage|
            stage.addSynth(\process,\awbChainFuzzOutput,[\in,stage.input.index,\out,stage.output.index]);stage.bindInput(\process);stage.bind(\lowpass,\process,\lowpass);stage.bind(\level,\process,\level);
        });
        AWBChain.registerFactory(\nativeFuzz,{|chain|
            var pre,post;
            if(chain.config[\width]!=2){Error("nativeFuzz needs stereo ports").throw};
            pre=chain.bus;post=chain.bus;
            chain.addSynth(\input,\awbChainFuzzInput,[\in,chain.input.index,\out,pre.index]);
            chain.addSynth(\shape,\awbChainFuzzShape,[\in,pre.index,\out,post.index]);
            chain.addSynth(\output,\awbChainFuzzOutput,[\in,post.index,\out,chain.output.index]);
            chain.bind(\highpass,\input,\highpass);chain.bind(\drive,\shape,\drive);
            chain.bind(\bias,\shape,\bias);chain.bind(\lowpass,\output,\lowpass);chain.bind(\level,\output,\level);
        });^this;
    }
    *managedConfig {
        ^(name:"Fuzz",factory:\serial,width:2,stages:[(id:\filter,factory:\fuzzInput),(id:\shape,factory:\fuzzShape),(id:\tone,factory:\fuzzTone)],
            aliases:(drive:'shape/drive',bias:'shape/bias',highpass:'filter/highpass',lowpass:'tone/lowpass',level:'tone/level'));
    }
    *config {
        ^(name:"Fuzz",factory:\nativeFuzz,width:2,controls:[
            (id:\drive,label:"Drive",min:1,max:32,default:8,step:0.01,curve:\log,section:"Shape"),
            (id:\bias,label:"Bias",min: -1,max:1,default:0,step:0.001,section:"Shape"),
            (id:\highpass,label:"High pass",min:20,max:2000,default:40,step:1,curve:\log,unit:"Hz",section:"Tone"),
            (id:\lowpass,label:"Low pass",min:100,max:20000,default:12000,step:1,curve:\log,unit:"Hz",section:"Tone"),
            (id:\level,label:"Output",min:0,max:2,default:1,step:0.001,section:"Level")
        ]);
    }
}
