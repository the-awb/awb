// Add apps/core/sc/classes + apps/param/sc/classes to a PRIVATE language config
// alongside the existing Tool framework. No live library installation required.
// Use system audio settings: do not force a device, sample rate or hardware block.
(
s.waitForBoot {
    Routine {
        AWParam.prepare(s);
        SynthDef(\paramDemoLFO,{|out=0,rate=0.7|Out.kr(out,SinOsc.kr(rate))}).add;
        SynthDef(\paramDemoWriter,{|out=0,rate=2,depth=0.15|Out.kr(out,LFNoise1.kr(rate)*depth)}).add;
        SynthDef(\paramDemoTone,{|out=0,freq=220,gain=0.03|Out.ar(out,SinOsc.ar(freq)!2*gain)}).add;
        s.sync;
        ~paramDemoCore=AWBCoreTool.open((name:"Parameter demo",params:[
            (id:\frequency,min:60,max:1800,warp:\exp,base:220,amount:0.2),
            (id:\gain,min:0,max:0.15,warp:\lin,base:0.04,amount:-0.3),
            (id:\depth,base:0.5,amount:2)
        ]),(server:s));
        ~paramDemoCore.tool.whenReady {|core|
            var bus=core.createBus(\lfo),plain=core.createBus(\plain),producer=core.addSynth(\lfo,\paramDemoLFO,[\out,bus.index],\detectors),source;
            core.addSynth(\plain,\paramDemoLFO,[\out,plain.index,\rate,2.1],\detectors);
            source=core.registerModulationSource(\slowLFO,bus,producer);
            core.param(\frequency).addModulation(\slow,source,0.4,0,\sameBlock);
            core.param(\gain).addModulation(\slow,source,-0.2,-3,\sameBlock);
            core.param(\depth).addModulation(\borrowed,plain,0.3,2);
            core.param(\depth).createModulationWriter(\custom,\paramDemoWriter);
            core.param(\depth).declareModulationWriterControls(\custom,[(id:\rate,min:0.1,max:20),(id:\depth,min:0,max:1)]);
            core.param(\frequency).mapTo(core.addSynth(\tone,\paramDemoTone,[\out,0],\output),\freq);
            core.param(\gain).mapTo(core.resourceAt(\tone),\gain);
            // One inspector panel borrows several params; no Tool per knob.
            ~paramDemoView=core.paramGUI([\frequency,\gain,\depth]);
        };
    }.play(SystemClock);
};
)
// Test interrupted ramps: display reads current server values throughout.
~paramDemoCore.tool.param(\frequency).setBase(900,3,-3);
~paramDemoCore.tool.param(\frequency).setBase(180,2,3);
~paramDemoCore.tool.param(\depth).setAmount(-2,3,-2);
// Bare amount polarity changes its normalized multiplier range.
~paramDemoCore.tool.param(\depth).setPolarity(\bipolar).setNormalized(-0.25);
// Explicit frequency specs retain native Hz; zero is the normalized midpoint.
~paramDemoCore.tool.param(\frequency).setPolarity(\bipolar);
// Standalone one-param inspector: closing this does NOT free the parameter.
~paramSingleView=~paramDemoCore.tool.param(\depth).gui;
// Cleanup only this example's owned resources.
~paramSingleView.close;~paramDemoView.close;~paramDemoCore.close;
