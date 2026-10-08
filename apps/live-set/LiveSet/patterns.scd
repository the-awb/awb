{PdefAllGui.new;}.defer;
	//////////////////////////////////////////////////////////////////////////////
	//-=-=-=-=-=-=-=-=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	//-=-=-=-=-=-=-=-=-=-=-=-=-   P A T T E R N S -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	//-=-=-=-=-=-=-=-=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	//////////////////////////////////////////////////////////////////////////////


	// - - -  S E Q U E N T I A - - - //

	~timemod = 1.75;
	Pdef(\sequentia, Pseq([

		//C444 - 33.333, 66.666, 99.999, 133.333
		(instrument: \resonantBassEnv2, args: #[], freq:100/3,  amp:0.8,    beat:[0.15,0.1], dur: 210 * ~timemod, delta:150 * ~timemod, out:~out, modFreqRatio:[3,5], sinMod:0), // [37] D444


		//G444 - 100 | 150
		(instrument: \resonantBassEnv2, args: #[], freq:50,   amp:0.8,  beat:[0.15,0.1], dur: 180 * ~timemod, delta:150 * ~timemod, out:~out, modFreqRatio:[3,5], sinMod:0), // [2,5] G444


		//D444 - 37 | 74 | 111 | 148
		(instrument: \resonantBassEnv2, args: #[], freq:37,  amp:0.8,    beat:[0.15,0.1], dur: 180 * ~timemod, delta:150 * ~timemod, out:~out, modFreqRatio:[3,5], sinMod:0), // [37] D444


		//A444 - 55.5 | 111 | 165.5 |
		(instrument: \resonantBassEnv2, args: #[], freq:52,  amp:0.8,    beat:[0.15,0.1], dur: 420 * ~timemod, delta:120 * ~timemod, out:~out, modFreqRatio:[3,5], sinMod:0, difF:3.5, difFTime:350), // [37, 1.5] A444

		//B432 60 | 120 | 180
		(instrument: \resonantBassEnv2, args: #[], freq:60,  amp:0.8,    beat:0.25, dur: 360 * ~timemod, delta:60 * ~timemod, out:~out, modFreqRatio:3, sinMod:0, phaseEnvRatio:0.25), // [37] B432


		//G432 - 48 | 96 | 144
		(instrument: \resonantBassEnv2, args: #[], freq:96,   amp:0.8,  beat:(1/3), dur: 180 * ~timemod, delta:120 * ~timemod, out:~out, modFreqRatio:3, phaseEnvRatio:0.35), // [2,3] G432



		//G432 - 48 | 96 | 144
		(instrument: \resonantBassEnv2, args: #[], freq:48,   amp:0.8,  beat:(1/3), dur: 480 * ~timemod, delta:180 * ~timemod, out:~out, modFreqRatio:3, phaseEnvRatio:0.35), // [2,3] G432


		//E432 - 40 | 80 | 120 | 160
		(instrument: \resonantBassEnv2, args: #[], freq:40,  amp:0.8,    beat:0.1, dur: 120 * ~timemod, delta:30 * ~timemod, out:~out, modFreqRatio:1.5, sinMod:0) // [2,3] E432

	])
	);

	//16 breath coherence
	Pdef(\attuningBreaths, Pbind(\instrument, \resonantBassEnv2,
		\args, #[],
		//c - f - quarter tone sharp
		\freq, Pseq([177,133],inf),
		\beat, 0,
		\pmAmp,0,
		\beatEnvMod, 0.5,
		\sinMod, 0,
		\phaseMod, Pseq([1.3,2.1],inf) * Pdup(2,Pseq([1,1.1,1.25,1.5,1.65, 1.8, 2.0, 2.3].mirror2,1)),
		\dur, (60/5.5)+2,
		\delta,  60/11,

	));

	~dur_mod = 1.75;
	//PSequencePlayer([	//cohere
	Pdef(\closingRinse, Pseq([
		(instrument: \resonantBassEnv2,	args: #[],	freq:144, dur: 300 * ~dur_mod, sinMod: 0.3,	amp: 0.7, phaseR:0.6,	ampEnvRatio: 0.8,	phaseEnvRatio: 0.5,	modFreqRatio: 4, phaseMod: 1.3, beat: 0, delta: 60 * ~dur_mod),
		(instrument: \substrate, args: #[], freqA:144*5,  freqQ:0.05,   amp:0.5,    beat:(1/3), dur: 145 * ~dur_mod, delta:60 * ~dur_mod, attackT: 50, releaseT: 50), // heart head coherence?
		(instrument: \substrate, args: #[], freqA:144*5*4,  freqQ:0.05,   amp:0.02,    beat:(1/3), dur: 65 * ~dur_mod, delta:40 * ~dur_mod, attackT: 25, releaseT: 35, tremF:36,tremAmt:0.5,tremA:20,tremR:20), // heart head coherence?

		(instrument: \resonantBassEnv2, args: #[], freq:144/4,  freqQ:0.05,   amp:1.1,    beat:(1/3), dur: 180 * ~dur_mod, delta:60 * ~dur_mod, attackT: 30,releaseT: 24),   // the expander // can let this come out for a gentler version

		//align
		// (instrument: \resonantBassEnv2,	args: #[],	freq:144, dur: 80 * ~dur_mod, sinMod: 0.3,	amp: 0.3, phaseR:0.6,	ampEnvRatio: 0.8,	phaseEnvRatio: 0.5,	modFreqRatio: 4, phaseMod: 1.3, beat: 0, delta: 20 * ~dur_mod),
		(instrument: \substrate, args: #[], freqA:144*[4,5,6,7],  freqQ:0.05,   amp:0.3,    beat:6, dur: 140 * ~dur_mod, delta:25 * ~dur_mod, beatEnvARatio:1.5, attackT: 40, releaseT: 30), // 200 / 155
		(instrument: \substrate, args: #[], freqA:144*5*2,  freqQ:0.05,   amp:0.15,    beat:(1/3), dur: 100 * ~dur_mod, delta:15 * ~dur_mod, attackT: 25, releaseT: 60, tremF:15,tremAmt:0.7,tremA:10), // heart head coherence?
		(instrument: \substrate, args: #[], freqA:144*7*2,  freqQ:0.05,   amp:0.08,    beat:(1/3), dur: 30, delta:15 * ~dur_mod, attackT: 15 * ~dur_mod, releaseT: 10, tremF:18,tremAmt:0.7), // heart head coherence?
		(instrument: \substrate, args: #[], freqA:144*6*2,  freqQ:0.05,   amp:0.1,    beat:(1/3), dur: 30, delta:10 * ~dur_mod, attackT: 15 * ~dur_mod, releaseT: 10, tremF:18,tremAmt:0.7), // heart head coherence?
		(instrument: \substrate, args: #[], freqA:144*[5,6,7,8],  freqQ:0.05, movement:0.3,  amp:0.33,    beat:5, dur: 100 * ~dur_mod, delta:45 * ~dur_mod, beatEnvARatio:1.5,beatEnvRRatio:1, attackT: 30,releaseT: 40)  // 155 --- 55
	]));




	Pdef(\leveller, Pseq([
		//420s - 7m
		(instrument: \substrate, args: #[], freqA:[40, 68, 133, 166, 199],  freqQ:0.05,   amp:1.3, attackT: 30, releaseT: 30,    beat:3/11, dur: 420, delta:45),


		//delicious and soft 2! //C
		(	instrument: \resonantBassEnv2,
			args: #[],
			freq:133,
			// dur: 40,
			sinMod: 0.2,
			amp: 0.9,
			ampEnvRatio: 0.3,
			phaseEnvRatio: 0.5,
			modFreqRatio:1.9,
			pmFreq:7,
			// modFreqRatio: 5*[9,12,16],   // 2nd, 5th, 8ct
			phaseMod: 1.4,
			pmAmp:0.4,
			//pmAmp: Pseg([0,1,0.4,1,0],[6,60,60,60]), // also with Segments / Envelope
			// beat: [-11,11],
			beat:0.25,
			dur:255, delta:60
		),
		// platonic timbales ~ original and best?! really nice top texture , especially towards end
		(	instrument: \resonantBassEnv2,
			args: #[],
			freq:133,
			// dur: 40,
			sinMod: 0.2,
			amp: 0.6,
			ampEnvRatio: 0.3,
			phaseEnvRatio: 0.5,
			modFreqRatio:2.2,
			pmFreq:7,
			phaseMod: 1.4,
			pmAmp:0.7,
			beat: [-11,11],
			dur:155, delta:70
		)
	],1));