if(\AutoBuffer.asClass.isNil){Error("Autobuffers require the existing awbCollider buffers.sc library").throw};
// Routine(	{
	a = Dictionary.new;


	~hyb =      PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/FORREST FLOOR");
	~fire =     PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/FIRE");
	~drips =    PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/Hits/Water drips");
	~girders =  PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/GIRDERS");
	~barkl =    PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/BARK/LO");
	~barkm =    PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/BARK/MED");
	~barkh =    PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/BARK/HI");
	~barkbase = PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/BARK/INTRO");
	~barkfx =   PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/BARK/FX");
	~wetting =  PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/Texture/Wetting and draining soil in the summer");
	~emwave1 =  PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/EM/WAVE 1");
	~emwave2 =  PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/EM/WAVE 2");
	~emlong =   PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/EM/WAVE LONG");
	~soil =     PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/SOIL");
	~froggies = PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/FROGGIES");
	~crickets = PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/INEFFIBLE/CRICKETS");

	~shocks = PathName.new("/Volumes/ARMED WITH SOUND/Samples/ARMEDWITHARCHIVE/Hits/shocks");




	a.put(\emwave1,   \AutoBuffer.asClass.new(\emwave1, ~emwave1,   0, b.b[\1],    1.0, 1.2, a:0.0, r:0.0,     base: b, out:~out));
	a.put(\emwave2,   \AutoBuffer.asClass.new(\emwave2, ~emwave2,   0, b.b[\1],    1.0, 1.2, a:0.0, r:0.0,     base: b, out:~out));
	a.put(\emlong,   \AutoBuffer.asClass.new(\emlong, ~emlong,   0, b.b[\c1s],   1.0, 1.2, a:0.0, r:0.0,     base: b, out:~out));
	a.put(\drips,     \AutoBuffer.asClass.new(\drips, ~drips,    0, b.b[\1],    5,   5.5, r:0.1 ,     base: b, out:~out));
	a.put(\girders,   \AutoBuffer.asClass.new(\girders, ~girders,  0, b.b[\1],    0.5, 0.7, r:0.1 ,     base: b, out:~out));
	a.put(\soil,      \AutoBuffer.asClass.new(\soil, ~soil,     0, b.b[\1],    0.5, 0.6, a:4.0, r:5.0,     base: b, out:~out));
	a.put(\barkbase,  \AutoBuffer.asClass.new(\barkbase, ~barkbase, 0, b.b[\1],    1.2, 1.3, r:0.0,     base: b, out:~out));
	a.put(\barkfx,    \AutoBuffer.asClass.new(\barkfx, ~barkfx,   0, b.b[\1],    0.7, 1.0, r:0.0,     base: b, out:~out));
	a.put(\hyb,       \AutoBuffer.asClass.new(\hyb, ~hyb,      0, b.b[\c1m],  0.3, 0.5, a:1.5, r:2, amp:0.8, freeP:0.7,     base: b, out:~out));
	a.put(\barkl,     \AutoBuffer.asClass.new(\barkl, ~barkl,    0, b.b[\c1m],  0.7, 0.8, r:0.1, amp:0.8,     base: b, out:~out));
	a.put(\barkm,     \AutoBuffer.asClass.new(\barkm, ~barkm,    0, b.b[\f_b1], 0.5, 0.8, r:0.1, amp:0.8,     base: b, out:~out));
	a.put(\barkh,     \AutoBuffer.asClass.new(\barkh, ~barkh,    0, b.b[\f_b1], 0.5, 0.8, r:0.1, amp:1.0,     base: b, out:~out));
	a.put(\froggies,  \AutoBuffer.asClass.new(\froggies, ~froggies, 0, b.b[\1],    0.5, 0.6, a:0.5, r:4.5,     base: b, out:~out));
	a.put(\fire,      \AutoBuffer.asClass.new(\fire, ~fire,     0, b.b[\c1s],  0.1, 0.2, a:15,  r:15,     base: b, out:~out));
	a.put(\crickets,  \AutoBuffer.asClass.new(\crickets, ~crickets, 0, b.b[\c1l],  0.1, 0.2, a:15,  r:15,     base: b, out:~out));

	a.put(\shocks,   \AutoBuffer.asClass.new(\shocks, ~shocks,   0, b.b[\1],    1.0, 1.2, a:0.0, r:0.0,     base: b, out:~out));



// });