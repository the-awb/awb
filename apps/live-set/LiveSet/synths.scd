// VVVVVVvvvvvVvVvVVVVVvvvvVVVVVVvvvvvVVVVVVvvvvvVVVVVVvvvvvVVVVVvvvvvVVVVVVvvvvvVVVVVVvvvvVVVVVVV
	// ######################################### SYNTHS DEF ##########################################
	// vvvvvVvVvVVVVVvvvvVVVVVVvvvvvVVVVVVvvvvvVVVVVVvvvvvVVVVVvvvvvVVVVVVvvvvvVVVVVVvvvvVVVVVVvvvvvvv


//"|"|"|"|""|"""||"|"|"|"      util::       ""|"|"|"|"""|||"""|"|"


SynthDef(\insert, { |bus, gate=1, wet=0.5, attackT=5, releaseT=5|
	var env = EnvGen.kr(Env.asr(attackT,1, releaseT),gate,); //,doneAction:Done.freeSelf);
	var sig = XFade2.ar(In.ar(bus, 2),VSTPlugin.ar(In.ar(bus, 2), 2),wet.linlin(0,1,-1,1)*env);
	ReplaceOut.ar(bus, env* sig);
}).add;

	SynthDef(\accelBusser, { | out, in, offset=0.015 |
		Out.kr(out, ( In.kr(in) - DelayN.kr(In.kr(in), maxdelaytime: offset, delaytime: offset) ) );
	}).add;


	SynthDef(\accelBusserPos, { | out, in, offset=0.015 |
		Out.kr(out, (( In.kr(in) - DelayN.kr(In.kr(in), maxdelaytime: offset, delaytime: offset) ).abs) );
	}).add;



// ()O)(O()O)(L()L)(L)(QO()P)(((()(()()O()L()L()(L()O)))))  resonantBass



	SynthDef(\resonantBassEnv, {  |out = 0 gate=1, freq=50, sinMod = 1, phaseMod = 1.8, attack=1, decay=0.1,release = 2, phaseA=1, phaseD=0.5, phaseR = 1 |
		var sig = PMOsc.ar([freq-EnvGen.kr(Env.triangle(2,sinMod),gate), freq+1], freq, EnvGen.kr(Env.adsr(phaseA,phaseD, 1, phaseR,phaseMod),gate) , 0, 0.08);
		var env = EnvGen.kr(Env.adsr(attack, decay, 0.75, release), gate, doneAction: Done.freeSelf);
		Out.ar(out, env * sig)
	}).add; // modulate  /// this is nice

	/*
	\beat = fixed detuing
	\sinMod = sinVariable detuning

	*/

	SynthDef(\resonantBass, {  |out = 0 gate=1, freq=50, beat = 0.25, sinMod = 0, sinModF=0.13,modFreq = 50, phaseModF = 0.005, phaseMod = 1, attack=1, decay=0.1,release = 2 |
		//sinMod = amount of
		var sig = PMOsc.ar([freq-SinOsc.kr(sinModF,0,sinMod), freq + beat], modFreq, SinOsc.kr(phaseModF, -1, 2, 1.8) * phaseMod , 0, 0.08);
		var env = EnvGen.kr(Env.adsr(attack, decay, 0.8, release), gate, doneAction: Done.freeSelf);
		Out.ar(out, env * sig)
	}).add; // modulate  /// this is nice



	SynthDef(\resonantBassEnv2, {  |out = 0, gate=1, freq=50, sinMod = 0.5, phaseMod = 1.8, beat=0.5, beatEnvMod=0,ampEnvRatio=0.5, phaseEnvRatio = 0.5, dur=10, sustain=5, modFreqRatio=1, amp=1 |
		var triEnv = EnvGen.kr(Env.triangle(dur), gate);
		var ampEnv = EnvGen.kr(Env.asr( sustain * ampEnvRatio, 1,sustain * ampEnvRatio, curve:2),gate,0.5*amp, doneAction:2);//
		// var ampEnv = EnvGen.kr(Env.triangle(2),doneAction: Done.freeSelf),
		var phaseEnv = EnvGen.kr(Env.perc(dur * phaseEnvRatio, dur * (1-phaseEnvRatio), curve:2)) * phaseMod;

		var sig = PMOsc.ar([freq-(triEnv *sinMod), freq+(LinXFade2.kr(beat, triEnv*beat, beatEnvMod.linlin(0,1,-1,1)))], freq*modFreqRatio, phaseEnv , 0, 0.1) * ampEnv;
		Out.ar(out, sig)
	}).add;


// #'`€ # @ £'\@*  % * 3_'  \'#  # # '    '#    # ~ ! §  "#'  '%&*"      	dust_and_noise   .    . ..    ..   ..  .


SynthDef(\pinkNoise,{ |amp=1, out=0, gate=1, attackT=12, releaseT=20, pan=0|
		var env  = EnvGen.kr(Env.asr(attackT,1,releaseT,curve:-12),gate,doneAction:2);
		Out.ar(out, Pan2.ar(PinkNoise.ar(amp*env * 0.003),pan))
	}).add;


	SynthDef(\pinkNoiseWaveSquare, { | out=0, amp=0.0013, freq=0.04, mod=1, panMod=0.5, gate=1, attackT=60, releaseT=60,phaseStart= -0.5,pulseWidth= 0.5|
		var env = EnvGen.kr(Env.asr(attackT,1,releaseT,curve:-12),gate,doneAction:2);
		var wave = LFPulse.kr(freq,phaseStart,pulseWidth,mod);
		Out.ar(out, env * amp * Pan2.ar(PinkNoise.ar(wave), SinOsc.kr(freq,0,panMod)))
	}).add;

	SynthDef(\brownNoiseWaveSquare, { | out=0, amp=0.0013, freq=0.04, mod=1, panMod=0.5, gate=1, attackT=60, releaseT=60,phaseStart= -0.5,pulseWidth= 0.5|
		var env = EnvGen.kr(Env.asr(attackT,1,releaseT,curve:-12),gate,doneAction:2);
		var wave = LFPulse.kr(freq,phaseStart,pulseWidth,mod);
		Out.ar(out, env * amp * Pan2.ar(BrownNoise.ar(wave), SinOsc.kr(freq,0,panMod)))
	}).add;

	SynthDef(\grayNoiseWaveSquare, { | out=0, amp=0.0013, freq=0.04, mod=1, panMod=0.5, gate=1, attackT=60, releaseT=60,phaseStart= -0.5,pulseWidth= 0.5|
		var env = EnvGen.kr(Env.asr(attackT,1,releaseT,curve:-12),gate,doneAction:2);
		var wave = LFPulse.kr(freq,phaseStart,pulseWidth,mod);
		Out.ar(out, env * amp * Pan2.ar(GrayNoise.ar(wave), SinOsc.kr(freq,0,panMod)))
	}).add;




	SynthDef(\bpNoiseGrain, { | out=0, attack=0.05, release=0.1, amp=1, bw=0.5, freq=10000, curve= -6, timeScale=1, pan=0.0 |
		var env = Env.perc(attack, release,curve:curve);
		var bandWidth = bw * EnvGen.kr(env,levelScale:10, timeScale:timeScale);
		var gate = EnvGen.kr(env, levelScale:amp );
		var sig = gate * BBandPass.ar(
			PinkNoise.ar,
			freq,//  MouseX.kr(20, 20000, \exponential),
			bandWidth,//  MouseY.kr(0.0, 10.0, \linear), // bw
			0.05); // mul
		FreeSelf.kr(1- ((sig + bandWidth)>0));
		Out.ar(out, Pan2.ar(sig, pan))
	}).add;


	SynthDef(\bpNoiseTrig, { | out=0, attackT=0.05, releaseT=0.1, level=1, bw=0.5, freq=10000, curve= -6, timeScale=1 |
		var env = Env.perc(attackT, releaseT,curve:curve);

		var sig = EnvGen.kr(env, levelScale:level, doneAction:Done.freeSelf) * BBandPass.ar(
			PinkNoise.ar ! 2,
			freq,//  MouseX.kr(20, 20000, \exponential),
			bw * EnvGen.kr(env,levelScale:10, timeScale:timeScale),//  MouseY.kr(0.0, 10.0, \linear), // bw
			0.05); // mul

		Out.ar(out, sig)
	}).add;


	SynthDef("grain", { |freq=12000, busMod, release|
		Out.ar(0, Pan2.ar(busMod.clip * EnvGen.kr(Env.perc(0.01, release),levelScale:0.1,  doneAction: Done.freeSelf) * FSinOsc.ar(freq) * busMod, Rand(-1.0,1.0)))
	}).send(s);


	SynthDef(\impGrain, {|out=0, amp=1| Out.ar(out, FreeSelf.kr(Impulse.ar(0,mul:amp*0.5)) ) }).add;

	SynthDef(\dustGrain, { |out=0, in=0|
		var level = \level.kr(1);
		var mix = \mix.kr(0);
		var amp = \amp.kr(1);
		var pan = \pan.kr(0);
		// var env = Env([0,1,0], [10,10],releaseNode: 1);
		var sig = Impulse.ar(0,mul:amp*0.5);
		Out.ar(out, Pan2.ar(FreeSelf.kr(XFade2.ar(Formlet.ar(sig, [8000,10000], 0.05, 0.1), sig, LinLin.kr(mix,0,1,-1,1),level)),pan) )
	}).add;


	SynthDef(\dust, { |out=0, gate = 1, level = 1, basefreq=1, freqMod=0, phaseMod1=0.5, phaseMod2=0.5, mix=0.5, modMaster=0, levelMod=0 |
		var env = Env([0,1,0], [10,10],releaseNode: 1);
		var sig = Impulse.ar(basefreq+(6*(freqMod)), [0, (phaseMod1 * modMaster)-(phaseMod2* modMaster)], 0.05);

		Out.ar(out, XFade2.ar(sig, Formlet.ar(sig, [8000,10000], 0.05, 0.1), LinLin.kr(mix,0,1,-1,1), EnvGen.kr(env,gate:gate) * (level + (levelMod * modMaster)) ) )
	}).add;


SynthDef(\noiseBg, { |out=0, amp=1, base=0.5, mod1= 0, mod2=0, modAmp=1, mix=0|
	Out.ar(out, PinkNoise.ar(0.004 * amp * (LinXFade2.kr(mod1,mod2,mix,modAmp) + base)) )
}).add;

// d.put(\dust, { |gate=0|
// 	var env = Env([0,1,0], [10,10],releaseNode: 1);
// 	var sig = Impulse.ar(1+(6*(b.b[\c1m].kr)), [0, (b.b[\c2m].kr)-(b.b[\vcAcc].kr)], 0.05);
// EnvGen.kr(env,gate,b.b[\c1l].kr) * XFade2.ar(Formlet.ar(sig, [8000,10000], 0.05, 0.1), sig, LinLin.kr(b.b[\vcaf].kr,0,1,-1,1),b.b[\c2l].kr) };);



//                ~*(<+~&      other features      %>?|'`~§!)'~




	SynthDef(\swirleySaw, { |out=0, sigF=220, sigModF=0.1, sigModAmp = 0.6, sigWMod = 0.5, amp=1, phaseF=0.09, phaseMul = 2800, phaseAdd= 3200, qModF = 0.08, qModAmount = 1,attackT=4, decayT = 4, releaseT = 8, gate=1, loI = 500, loA = 4 |
	// var freqs = NamedControl.kr(\freqs, [220, 220]);
	var sig = VarSaw.ar([sigF, sigF + LFTri.ar(sigModF,0,sigModAmp)], iphase: 0.0, width: [0.5,sigWMod], mul: 0.08*amp, add: 0.0);
	var phase = SinOsc.kr(phaseF,0,phaseMul,phaseAdd);
	var resQ = SinOsc.kr(qModF,0,0.45*qModAmount,0.5);
	// var filterFreq = MouseX.kr(5,8000,1);
	var filterFreq = EnvGen.kr(Env([loI,8000,5],[loA,8], \exp));
	var env = EnvGen.kr(Env.adsr(attackT, decayT, 1, releaseT, curve: \sin), gate, doneAction:Done.freeSelf);
	Out.ar(out, env * BHiPass4.ar(RLPF.ar(sig, phase,resQ) , filterFreq))
}).add;




	SynthDef(\stresonFX, { | out=0, in, mod=0.5, flutterwonk=0, flutter=0 |
	var sig;
	var audioIn = In.ar(in);
	flutterwonk.clip(0, 1);
	flutter.clip(0, 1);
	sig = audioIn;
	//
	//
	 sig = LinXFade2.ar(audioIn, Mix.new([
	 	\Streson.asClass.ar(audioIn,
	 		LinExp.kr(
	 			LFCub.kr(0.05+(mod*0.007), 0.5*pi),
	 			-1,
	 			1,
	 			144-LinLin.kr(flutterwonk,0,1,0,100),
	 			277+LinLin.kr(flutterwonk,0,1,0,150)
	 	).reciprocal,0.9,0.5),

	 	\Streson.asClass.ar(audioIn,
	 		LinExp.kr(
	 			LFCub.kr(0.03+(mod*0.01), 0.5*pi),
	 			-1,
	 			1,
	 			180-mod,
	 			277
	 	).reciprocal,0.7, 0.6)
	 	]),LinLin.kr(flutter,0,1,-1,1)
	 );

	Out.ar(out,sig)
}).add;


	SynthDef(\aaia,{|out=0, freqA=165, freqK=0.75, freqL=0.5, modIn=0, progress=1,gate = 0, f0Level=0, modMix=1, mastLevel=0, fTime=2, mastGate=1|
		var mod = (modMix*modIn.clip(0, 1))+0.1;
		var p = SinOsc.kr(freqK)*mod;
		var p3 = SinOsc.kr(freqK,SinOsc.kr(freqK))*mod;
		var p2 = SinOsc.kr(freqK/2)*mod;
		var p4 = SinOsc.kr(freqL, p3)*mod;
		var p5 = SinOsc.kr(freqK/4)*mod;

		var freqAl = VarLag.kr(freqA,fTime,2);
		var freqAr = VarLag.kr(freqA,fTime+0.5,4);
		var f0 = [SinOsc.ar(freqAl/2), SinOsc.ar((freqAr/2) + (2*mod) )]*(0.077 * f0Level.clip(0, 1));
		var o0 = [SinOsc.ar(freqAl),SinOsc.ar(freqAr+(p4*2),(p3*0.5))]*0.3*(p2+0.5);
		var o1 = [SinOsc.ar(freqAl * 2,p),SinOsc.ar(freqAr * 2+(p*0.25),(p*0.5))]*0.2*(p2);
		var o2 = [SinOsc.ar(freqAl * 4/3,p4),SinOsc.ar(freqAr * 4/3+((p+p4)*2),(p2*0.5))]*(p3+(p4/2))*0.2;
		var o3 = [SinOsc.ar(freqAl * 4,p3),SinOsc.ar(freqAr * 4+(p3*1),(p*0.5))]*0.2*(p4+p3+p5);
		var o4 = [SinOsc.ar(freqAl * 8,p),SinOsc.ar(freqAr * -4+(p2),(p2*0.5))]*0.1*(p5+0.2);
		var clean = Mix.new([o0,o1,o2,o3,o4]);


		var env = Env([0,1,0], [2,12],releaseNode: 1);
		var masterEnv = Env([0,1,0], [4,12],releaseNode: 1);

		progress.clip(0, 8);
		// flutterwonk.clip(0, 1);
		// flutter.clip(0, 1);

		mastLevel.clip(0, 1);
		modMix.clip(0, 1);
		clean = clean *0.07*progress;

		clean = [clean,f0].sum;

		Out.ar(out,clean * mastLevel)

	}).add;


	// ######################################### SYNTHS END ##########################################