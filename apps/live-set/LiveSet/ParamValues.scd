// Preserved preset names and musical routines. Technical boot lives in BaseLaunch.
(
// {
	p = Dictionary[
		\time -> Dictionary.new,
		\dmod -> Dictionary.new,
		\lctrl -> Dictionary.new,
		\th -> Dictionary.new,
		\routing -> Dictionary.new,
		\fx -> Dictionary.new
	];

	//HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
	//################################################################
	//VVVVVVVVVVVVVVVVVVVVVVVVVV    T A P E H E A D S    VVVVVVVVVVVVVVVVV
	//YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
	//WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
	//IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII


	//      0: Quad
	//      1: Duo
	//      2: All MAX

	p[\th].put(\classicP, Routine({ |t=0|
		b.log("Tape Heads: classic");
		if(t.isNil, t = 0);

		~b1.p[\thP].setM(1,  t);
		~b2.p[\thP].setM(1,  t);
		~a2.p[\thP].setM(0,  t);
		~a1.p[\thP].setM(0,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\all4s, Routine({ |t=0|
		b.log("Tape Heads: classic");
		if(t.isNil, t = 0);

		~b1.p[\thP].setM(0,  t);
		~b2.p[\thP].setM(0,  t);
		~a2.p[\thP].setM(0,  t);
		~a1.p[\thP].setM(0,  t);

		0.yieldAndReset;
	}));
	//      0: A pair
	//      1: B pair
	//      2: All
	//      3: All var

	p[\th].put(\classicM, Routine({ |t=0|
		b.log("Tape Heads: classic");
		if(t.isNil, t = 0);

		~b1.p[\thM].setM(1,  t);
		~b2.p[\thM].setM(1,  t);
		~a2.p[\thM].setM(2,  t);
		~a1.p[\thM].setM(2,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\quads, Routine({ |t=0|
		b.log("Tape Heads: classic");
		if(t.isNil, t = 0);

		~b1.p[\thM].setM(0,  t);
		~b2.p[\thM].setM(0,  t);
		~a2.p[\thM].setM(0,  t);
		~a1.p[\thM].setM(0,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\thMod0, Routine({ |t=0|
		b.log("Tape Heads: All mods 0");
		if(t.isNil, t = 0);

		~b1.p[\thPMod].setI(0,  t);
		~b2.p[\thPMod].setI(0,  t);
		~a2.p[\thPMod].setI(0,  t);
		~a1.p[\thPMod].setI(0,  t);

		~b1.p[\thAMod].setI(0,  t);
		~b2.p[\thAMod].setI(0,  t);
		~a2.p[\thAMod].setI(0,  t);
		~a1.p[\thAMod].setI(0,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\gentleModA, Routine({ |t=0|
		b.log("Tape Heads: Gentle AMod A dels");
		if(t.isNil, t = 0);

		/*~b1.p[\thPMod].setM(0,  t);
		~b2.p[\thPMod].setM(0,  t);
		~a2.p[\thPMod].setM(0,  t);
		~a1.p[\thPMod].setM(0,  t);*/

		~b1.p[\thAMod].setI(0,  t);
		~b2.p[\thAMod].setI(0,  t);
		~a2.p[\thAMod].setI(0.3,  t);
		~a1.p[\thAMod].setI(0.3,  t);

		0.yieldAndReset;
	}));


	p[\th].put(\aModAll, Routine({ |t=0|
		b.log("Tape Heads: Gentle AMod all");
		if(t.isNil, t = 0);

		/*~b1.p[\thPMod].setM(0,  t);
		~b2.p[\thPMod].setM(0,  t);
		~a2.p[\thPMod].setM(0,  t);
		~a1.p[\thPMod].setM(0,  t);*/

		~b1.p[\thAMod].setI(0.5,  t);
		~b2.p[\thAMod].setI(0.5,  t);
		~a2.p[\thAMod].setI(0.5,  t);
		~a1.p[\thAMod].setI(0.5,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\aModNone, Routine({ |t=0|
		b.log("Tape Heads: AMod none");
		if(t.isNil, t = 0);

		/*~b1.p[\thPMod].setM(0,  t);
		~b2.p[\thPMod].setM(0,  t);
		~a2.p[\thPMod].setM(0,  t);
		~a1.p[\thPMod].setM(0,  t);*/

		~b1.p[\thPMod].setI(0.0,  t);
		~b2.p[\thPMod].setI(0.0,  t);
		~a2.p[\thPMod].setI(0.0,  t);
		~a1.p[\thPMod].setI(0.0,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\pModA12, Routine({ |t=0|
		b.log("Tape Heads: Gentle PMod A dels");
		if(t.isNil, t = 0);

		/*~b1.p[\thPMod].setM(0,  t);
		~b2.p[\thPMod].setM(0,  t);
		~a2.p[\thPMod].setM(0,  t);
		~a1.p[\thPMod].setM(0,  t);*/

		~b1.p[\thPMod].setI(0.0,  t);
		~b2.p[\thPMod].setI(0.0,  t);
		~a2.p[\thPMod].setI(0.3,  t);
		~a1.p[\thpMod].setI(0.4,  t);

		0.yieldAndReset;
	}));



	p[\th].put(\pModAll, Routine({ |t=0|
		b.log("Tape Heads: PMod all");
		if(t.isNil, t = 0);

		/*~b1.p[\thPMod].setM(0,  t);
		~b2.p[\thPMod].setM(0,  t);
		~a2.p[\thPMod].setM(0,  t);
		~a1.p[\thPMod].setM(0,  t);*/

		~b1.p[\thPMod].setI(0.1,  t);
		~b2.p[\thPMod].setI(0.8,  t);
		~a2.p[\thPMod].setI(0.3,  t);
		~a1.p[\thPMod].setI(0.6,  t);

		0.yieldAndReset;
	}));

	p[\th].put(\pModNone, Routine({ |t=0|
		b.log("Tape Heads: PMod none");
		if(t.isNil, t = 0);

		/*~b1.p[\thPMod].setM(0,  t);
		~b2.p[\thPMod].setM(0,  t);
		~a2.p[\thPMod].setM(0,  t);
		~a1.p[\thPMod].setM(0,  t);*/

		~b1.p[\thPMod].setI(0.0,  t);
		~b2.p[\thPMod].setI(0.0,  t);
		~a2.p[\thPMod].setI(0.0,  t);
		~a1.p[\thPMod].setI(0.0,  t);

		0.yieldAndReset;
	}));


	//**********************************************************************
	//§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`    C O R E
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`
	//§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§
	//**********************************************************************

	p[\lctrl].put(\b1solo, Routine({
		b.log("dctrl: B1 loop root - A2 + B2 closed");
		// ~b1.p[\thM].setI
		~b1.setLoopControl(2);
		// ~b1.p[\fxOf].setI(0);


		~b2.setLoopControl(0);
		// ~b2.p[\fxOf].setI(0.75);

		~a2.setLoopControl(0);
		// ~a2.p[\fxOf].setI(0.75);

		// ~a1.p[\inOf].setI(0.5);
		0.yieldAndReset;
	}));

	p[\lctrl].put(\b1root, Routine({
		b.log("dctrl: B1 loop root - A2 + B2 open");
		// ~b1.p[\thM].setI
		~b1.setLoopControl(2);
		// ~b1.p[\fxOf].setI(0);


		~b2.setLoopControl(1);
		// ~b2.p[\fxOf].setI(0.75);

		~a2.setLoopControl(1);
		// ~a2.p[\fxOf].setI(0.75);

		// ~a1.p[\inOf].setI(0.5);
		0.yieldAndReset;
	}));

	p[\lctrl].put(\allIn, Routine({
		b.log("dctrl: all in");
		// ~b1.p[\thM].setI
		~b1.setLoopControl(1);
		// ~b1.p[\fxOf].setI(0);


		~b2.setLoopControl(1);
		// ~b2.p[\fxOf].setI(0.75);

		~a2.setLoopControl(1);
		// ~a2.p[\fxOf].setI(0.75);

		// ~a1.p[\inOf].setI(0.5);
		0.yieldAndReset;
	}));

	p[\lctrl].put(\bbLoopIn, Routine({
		b.log("dctrl: all in");
		// ~b1.p[\thM].setI
		~b1.setLoopControl(2);
		// ~b1.p[\fxOf].setI(0);


		~b2.setLoopControl(2);
		// ~b2.p[\fxOf].setI(0.75);

		~a2.setLoopControl(0);
		// ~a2.p[\fxOf].setI(0.75);

		// ~a1.p[\inOf].setI(0.5);
		0.yieldAndReset;
	}));

	p[\lctrl].put(\allClosed, Routine({
		b.log("dctrl: all closed loop");
		// ~b1.p[\thM].setI
		~b1.setLoopControl(3);
		// ~b1.p[\fxOf].setI(0);


		~b2.setLoopControl(3);
		// ~b2.p[\fxOf].setI(0.75);

		~a2.setLoopControl(3);
		// ~a2.p[\fxOf].setI(0.75);

		// ~a1.p[\inOf].setI(0.5);
		0.yieldAndReset;
	}));

	//80180180180180180180180180180180180180180180180
	//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	//-@-@-@-@____@-@-@-@____@-@-@-@____                     @-@-@-@____
	/////////////\\\\\\\\\\\\\\\\\\\\\\\\    R O U T I N G  /////////////
	//o~o~o~o~o~o~o~o~o~o~o~o~o~o~o~o~o~o~\                ///////
	//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	///~~-@-@-@-@____@-@-@-@____@-@-@-@____@-@-@-@____@

	p[\routing].put(\allOff, Routine({ |t = 0|
		if(t.isNil, t = 0);
		b.log("Routing: all off");
		~b1.p[\vcIn].setI( 0, t );

		~b2.p[\vcIn].setI( 0, t );
		~b2.p[\b1In].setI( 0 ,  t);
		~b2.p[\a2In].setI( 0 ,  t);

		~a2.p[\vcIn].setI( 0 ,  t);
		~a2.p[\b1In].setI( 0 ,  t);

		~a1.p[\vcIn].setI( 0 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\allDirect, Routine({ |t = 0|
		b.log("Routing: all direct");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 1 ,  t);
		~b2.p[\b1In].setI( 0 ,  t);
		~b2.p[\a2In].setI( 0 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0 ,  t);

		~a1.p[\vcIn].setI( 1 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\ABPar, Routine({ |t = 0| //B1 > B2 // A2 > A1
		b.log("Routing: AB Parallel");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 1 ,  t);
		~b2.p[\a2In].setI( 0 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0 ,  t);

		~a1.p[\vcIn].setI( 0 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 1 ,  t);
		~a1.p[\b2In].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\cloudPar, Routine({ |t = 0| //B1 > B2 // A2 > A1
		b.log("Routing: cloudPar - ABPar + a1 cloud");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 1 ,  t);
		~b2.p[\a2In].setI( 0 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0.6 ,  t);

		~a1.p[\vcIn].setI( 0.75 ,  t);
		~a1.p[\b1In].setI( 0.6 ,  t);
		~a1.p[\a2In].setI( 1 ,  t);
		~a1.p[\b2In].setI( 0.6 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\BABA, Routine({ |t = 0| //B1 > A2 > B2 > A1  - long chain
		b.log("Routing: BABA sequencial");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 0 ,  t);
		~b2.p[\a2In].setI( 1 ,  t);

		~a2.p[\vcIn].setI( 0 ,  t);
		~a2.p[\b1In].setI( 1 ,  t);

		~a1.p[\vcIn].setI( 0 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\cloud1, Routine({ |t = 0| //dense, long
		b.log("Routing: cloud 1");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 1 ,  t);
		~b2.p[\a2In].setI( 1 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 1 ,  t);

		~a1.p[\vcIn].setI( 1 ,  t);
		~a1.p[\b1In].setI( 1 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\cloud2, Routine({ |t = 0| // med density, quite long
		b.log("Routing: cloud 2");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 1 ,  t);
		~b2.p[\b1In].setI( 0 ,  t);
		~b2.p[\a2In].setI( 0.75 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0.66 ,  t);

		~a1.p[\vcIn].setI( 0.5 ,  t);
		~a1.p[\b1In].setI( 0.66 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\cloud3, Routine({ |t = 0| // sparse cloud, shorter
		b.log("Routing: cloud 3");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 0 ,  t);
		~b2.p[\a2In].setI( 1 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0 ,  t);

		~a1.p[\vcIn].setI( 0.66 ,  t);
		~a1.p[\b1In].setI( 0.75 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\b1Branch, Routine({ |t = 0| //B1 > ( A2 | B2 ) // BAB > A1  - for patterns using A2 & B2 as juxtaposing irregular rhythms
		b.log("Routing: b1 Branch");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 1 ,  t);
		~b2.p[\a2In].setI( 0 ,  t);

		~a2.p[\vcIn].setI( 0 ,  t);
		~a2.p[\b1In].setI( 1 ,  t);

		~a1.p[\vcIn].setI( 0 ,  t);
		~a1.p[\b1In].setI( 1 ,  t);
		~a1.p[\a2In].setI( 1 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);
		0.yieldAndReset;
	}));

	p[\routing].put(\b2CollectorA, Routine({ |t = 0| // ( B1 | A2 ) > B2
		b.log("Routing: b2 collector with [b1|a2] par");
		if(t.isNil, t = 0);

		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 1 ,  t);
		~b2.p[\a2In].setI( 1 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0 ,  t);

		/*~a1.p[\vcIn].setI( 0 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);*/
		0.yieldAndReset;
	}));

	p[\routing].put(\b2CollectorB, Routine({ |t = 0| // ( (vc > B1) > A2 - ) > B2
		b.log("Routing: b2 collector with b1 root");
		if(t.isNil, t = 0);
		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 1 ,  t);
		~b2.p[\a2In].setI( 1 ,  t);

		~a2.p[\vcIn].setI( 0 ,  t);
		~a2.p[\b1In].setI( 1 ,  t);

		/*~a1.p[\vcIn].setI( 0 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 0 ,  t);
		~a1.p[\b2In].setI( 1 ,  t);*/
		0.yieldAndReset;
	}));

	p[\routing].put(\b1SoloVCloud, Routine({  |t = 0| // ( B1 | A2 ) > B2
		b.log("Routing: b1 solo vs cloud");
		if(t.isNil, t = 0);
		"Routing: b1 solo vs cloud".postln;
		~b1.p[\vcIn].setI( 1 ,  t);

		~b2.p[\vcIn].setI( 0 ,  t);
		~b2.p[\b1In].setI( 0 ,  t);
		~b2.p[\a2In].setI( 1 ,  t);

		~a2.p[\vcIn].setI( 1 ,  t);
		~a2.p[\b1In].setI( 0 ,  t);

		~a1.p[\vcIn].setI( 1 ,  t);
		~a1.p[\b1In].setI( 0 ,  t);
		~a1.p[\a2In].setI( 0.75 ,  t);
		~a1.p[\b2In].setI( 0.75 ,  t);
		0.yieldAndReset;
	}));


	//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	//_________________________________________________________________||
	//                                                                      \
	//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>/     T I M E     ||
	//../////////////.////////////////////...////////////////.///                   >
	//\\\\\\\.\\\\\\\\\\\\\\\\..\\\\\\\\\\\\\\\\....\\\\\\\\\\\\\.../       ==
	///////.\\\\\\\\.//////////////////.\\\\\\\\\\\\\\.////////..../    ~
	//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

	p[\time].put(\classicLong, Routine({
		b.log("Time: classic long");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 32 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 32 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 12 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setI( 0.01 );
		~a1.p[\sliMax].setI( 0.028 );

		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.110 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.90 );
		0.yieldAndReset;
	}));

	p[\time].put(\longMedium, Routine({
		b.log("Time: b1:long(32) b2:medium(16)");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 32 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 16 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 12 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setI( 0.01 );
		~a1.p[\sliMax].setI( 0.028 );

		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.110 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.90 );
		0.yieldAndReset;
	}));

	p[\time].put(\shortGridLoopers, Routine({
		b.log("Time: short grid loopers");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 8 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 8 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 4 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 8 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stackedLengths, Routine({
		b.log("Time: stacked lengths");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 8 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 16 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 4 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 8 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stacked25, Routine({
		b.log("Time: stacked 25 on 4");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 8 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 25 );
		~b2.p[\tDiv].setM( 4 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 25 );
		~a2.p[\tDiv].setM( 4 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stacked3_12, Routine({
		b.log("Time: stacked 12 on 3");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 12 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 6 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 12 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stacked3_20, Routine({
		b.log("Time: stacked 20 on 3");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 12 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 20 );
		~b2.p[\tDiv].setM( 3 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 20 );
		~a2.p[\tDiv].setM( 3 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stacked3_28, Routine({
		b.log("Time: stacked 28 on 3");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 12 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 28 );
		~b2.p[\tDiv].setM( 3 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 28 );
		~a2.p[\tDiv].setM( 3 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\mirror3, Routine({
		b.log("Time: mirror 3");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 12 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 40 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 36 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );


		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stacked4_20, Routine({
		b.log("Time: stacked 20 on 4");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 8 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 10 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 10 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\stacked4_911, Routine({
		b.log("Time: 9 / 11 branch on 4");
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 8 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b1.p[\sliMin].setM( 20 );
		// ~b1.p[\sliMax].setM( 127 );

		~b2.p[\beats].setM( 22 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~b2.p[\sliMin].setM( 20 );
		// ~b2.p[\sliMax].setM( 127 );

		~a2.p[\beats].setM( 18 );
		~a2.p[\tDiv].setM( 2 );
		~a2.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a2.p[\sliMin].setM( 10 );
		// ~a2.p[\sliMax].setM( 40 );

		~a1.p[\beats].setM( 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );
		// ~b1.p[\tSli].setI(  ),
		// ~a1.p[\sliMin].setI( 0.1 );
		// ~a1.p[\sliMax].setI( 0.2 );
		0.yieldAndReset;
	}));

	p[\time].put(\freeCloud1, Routine({
		b.log("Time: free cloud 1");
		~b1.p[\host].setI( 0 );
		~b2.p[\host].setI( 0 );
		~a2.p[\host].setI( 0 );
		~a1.p[\host].setI( 0 );

		// ~b1.p[\beats].setM( 8 );
		// ~b1.p[\tDiv].setM( 2 );
		// ~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 40 );

		// ~b2.p[\beats].setM( 22 );
		// ~b2.p[\tDiv].setM( 2 );
		// ~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 40 );

		// ~a2.p[\beats].setM( 18 );
		// ~a2.p[\tDiv].setM( 2 );
		// ~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 90 );

		// ~a1.p[\beats].setM( 4 );
		// ~a1.p[\tDiv].setM( 4 );
		// ~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setM( 10 );
		~a1.p[\sliMax].setM( 50 );
		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.110 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.90 );
		0.yieldAndReset;
	}));

	p[\time].put(\freeCloud2, Routine({
		b.log("Time: free cloud 2");
		~b1.p[\host].setI( 0 );
		~b2.p[\host].setI( 0 );
		~a2.p[\host].setI( 0 );
		~a1.p[\host].setI( 0 );

		// ~b1.p[\beats].setM( 8 );
		// ~b1.p[\tDiv].setM( 2 );
		// ~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 40 );

		// ~b2.p[\beats].setM( 22 );
		// ~b2.p[\tDiv].setM( 2 );
		// ~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 40 );

		// ~a2.p[\beats].setM( 18 );
		// ~a2.p[\tDiv].setM( 2 );
		// ~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 90 );

		// ~a1.p[\beats].setM( 4 );
		// ~a1.p[\tDiv].setM( 4 );
		// ~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setM( 10 );
		~a1.p[\sliMax].setM( 50 );
		0.5.yield;
		~b1.p[\tSli].setI( 0.40 ); //1.8
		~b2.p[\tSli].setI( 0.4 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.30 );
		0.yieldAndReset;
	}));

	p[\time].put(\freeCloud3, Routine({
		b.log("Time: free cloud 3");
		~b1.p[\host].setI( 0 );
		~b2.p[\host].setI( 0 );
		~a2.p[\host].setI( 0 );
		~a1.p[\host].setI( 0 );

		// ~b1.p[\beats].setM( 8 );
		// ~b1.p[\tDiv].setM( 2 );
		// ~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 60 );

		// ~b2.p[\beats].setM( 22 );
		// ~b2.p[\tDiv].setM( 2 );
		// ~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 60 );

		// ~a2.p[\beats].setM( 18 );
		// ~a2.p[\tDiv].setM( 2 );
		// ~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 30 );
		~a2.p[\sliMax].setM( 50 );

		// ~a1.p[\beats].setM( 4 );
		// ~a1.p[\tDiv].setM( 4 );
		// ~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setM( 10 );
		~a1.p[\sliMax].setM( 30 );
		0.5.yield;
		~b1.p[\tSli].setI( 0.5 ); //1.8
		~b2.p[\tSli].setI( 0.5 ); //1.8
		~a2.p[\tSli].setI( 0.5 ); //6.4
		~a1.p[\tSli].setI( 0.5 );
		0.yieldAndReset;
	}));


	p[\time].put(\shortShimmer1, Routine({
		b.log("Time: short shimmer 1");
		~b1.p[\host].setI( 0 );
		~b2.p[\host].setI( 0 );
		~a2.p[\host].setI( 0 );
		~a1.p[\host].setI( 0 );

		// ~b1.p[\beats].setM( 8 );
		// ~b1.p[\tDiv].setM( 2 );
		// ~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 10 );
		~b1.p[\sliMax].setM( 30 );

		// ~b2.p[\beats].setM( 22 );
		// ~b2.p[\tDiv].setM( 2 );
		// ~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 10 );
		~b2.p[\sliMax].setM( 30 );

		// ~a2.p[\beats].setM( 18 );
		// ~a2.p[\tDiv].setM( 2 );
		// ~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 1 );
		~a2.p[\sliMax].setM( 10 );

		// ~a1.p[\beats].setM( 4 );
		// ~a1.p[\tDiv].setM( 4 );
		// ~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setM( 1 );
		~a1.p[\sliMax].setM( 10 );

		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.40 ); //1.8
		~a2.p[\tSli].setI( 0.40 ); //6.4
		~a1.p[\tSli].setI( 0.20 );
		0.yieldAndReset;
	}));

	p[\time].put(\shortShimmer2, Routine({|t = 0|
		b.log("Time: short shimmer 2");
		~b1.p[\host].setI( 0 );
		~b2.p[\host].setI( 0 );
		~a2.p[\host].setI( 0 );
		~a1.p[\host].setI( 0 );

		// ~b1.p[\beats].setM( 8 );
		// ~b1.p[\tDiv].setM( 2 );
		// ~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 10 );
		~b1.p[\sliMax].setM( 30 );

		// ~b2.p[\beats].setM( 22 );
		// ~b2.p[\tDiv].setM( 2 );
		// ~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 10 );
		~b2.p[\sliMax].setM( 30 );

		// ~a2.p[\beats].setM( 18 );
		// ~a2.p[\tDiv].setM( 2 );
		// ~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 1 );
		~a2.p[\sliMax].setM( 10 );

		// ~a1.p[\beats].setM( 4 );
		// ~a1.p[\tDiv].setM( 4 );
		// ~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setM( 1 );
		~a1.p[\sliMax].setM( 10 );

		0.5.yield;
		~b1.p[\tSli].setI( 1 ); //1.8
		~b2.p[\tSli].setI( 0.40 ); //1.8
		~a2.p[\tSli].setI( 0.10 ); //6.4
		~a1.p[\tSli].setI( 0.00 );
		0.yieldAndReset;
	}));

	///////////////V/////////V////////V/////////////
	//   . .    .   . .. .    . .. FREQ~TIME SYNC . ..
	//      .      .       .      .      .      .      .
	//                                              ~

	p[\time].put(\sync30_5, Routine({
		/*
		30bpm   << THIS
		0.1: 5/4
		0.125: 4/4
		0.25: 2/4
		1.0: 1/8
		3.0: 2/16T (1/6)
		6.0: 1/32T (1/12)
		8.0: 1/64
		*/
		b.log("Time: sync:30bpm ~ 0.1Hz, 0.25Hz, 1Hz, 3Hz");
		b.clock.tempo = 0.5; //30bpm
		// 0.1Hz : 5/4
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 5  * 2 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 127 );

		// 0.25Hz: 2/4

		~b2.p[\beats].setM( 2 * 2 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 127 );
		//1.0Hz: 1/8
		~a2.p[\beats].setM( 1  * 4 );
		~a2.p[\tDiv].setM( 3 );
		~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 40 );
		// 3 Hz: 2/16T (1/6)
		~a1.p[\beats].setM( 2 * 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 1 );

		~a1.p[\sliMin].setI( 0.01 );
		~a1.p[\sliMax].setI( 0.028 );

		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.110 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.90 );
		0.yieldAndReset;
	}));

	p[\time].put(\sync72_12, Routine({
		/*
		72bpm   << THIS
		0.1: 12/4
		0.24: 5/4
		7.2: 1/16T (1/6)
		10.8: 1.5/32T (1/9)
		38.4: 1/128
		*/
		// 1/32*4 = 1/128


		b.log("Time: sync:72bpm ~ 0.1Hz, 0.25Hz, 7.2Hz, 10.8Hz");
		b.clock.tempo = 72/60; //30bpm
		// 0.1Hz : 5/4
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 12  * 2 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 127 );

		// 0.24Hz: 2/4

		~b2.p[\beats].setM( 5 * 2 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 127 );
		//7.2Hz: 1/16T (1/6)
		~a2.p[\beats].setM( 1  * 4 );
		~a2.p[\tDiv].setM( 4 );
		~a2.p[\trip].setI( 1 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 40 );
		// 10.8 Hz: 10.8: 1.5/32T (1/9)
		~a1.p[\beats].setM( 1.5 * 4 );
		~a1.p[\tDiv].setM( 5 );
		~a1.p[\trip].setI( 1 );

		~a1.p[\sliMin].setI( 0.01 );
		~a1.p[\sliMax].setI( 0.028 );

		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.110 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.90 );
		0.yieldAndReset;
	}));


	p.[\time].put(\sync90_15, Routine({
		/*
		90bpm   << THIS
		0.1: 15/4
		0.125: 12/4
		0.25: 6/4
		3.0: 1/8
		6.0: 1/16
		12: 1/32
		*/



		b.log("Time: sync:90bpm ~ 0.1Hz, 0.25Hz, 3Hz, 6Hz");
		b.clock.tempo = 90/60; //30bpm
		// 0.1Hz : 15/4
		~b1.p[\host].setI( 1 );
		~b2.p[\host].setI( 1 );
		~a2.p[\host].setI( 1 );
		~a1.p[\host].setI( 1 );

		~b1.p[\beats].setM( 15  * 2 );
		~b1.p[\tDiv].setM( 2 );
		~b1.p[\trip].setI( 0 );

		~b1.p[\sliMin].setM( 20 );
		~b1.p[\sliMax].setM( 127 );

		// 0.25Hz: 6/4

		~b2.p[\beats].setM( 6 * 2 );
		~b2.p[\tDiv].setM( 2 );
		~b2.p[\trip].setI( 0 );

		~b2.p[\sliMin].setM( 20 );
		~b2.p[\sliMax].setM( 127 );
		//3.0Hz: 1/8
		~a2.p[\beats].setM( 1  * 4 );
		~a2.p[\tDiv].setM( 3 );
		~a2.p[\trip].setI( 0 );

		~a2.p[\sliMin].setM( 10 );
		~a2.p[\sliMax].setM( 40 );
		// 3 Hz: 2/16T (1/6)
		~a1.p[\beats].setM( 1.0 * 4 );
		~a1.p[\tDiv].setM( 4 );
		~a1.p[\trip].setI( 0 );

		~a1.p[\sliMin].setI( 0.01 );
		~a1.p[\sliMax].setI( 0.028 );

		0.5.yield;
		~b1.p[\tSli].setI( 0.20 ); //1.8
		~b2.p[\tSli].setI( 0.110 ); //1.8
		~a2.p[\tSli].setI( 0.80 ); //6.4
		~a1.p[\tSli].setI( 0.90 );
		0.yieldAndReset;
	}));

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~~(<>)~
	//dpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpddpdpdpdpddpdpddpdpdpdp
	//ooooooooooooooooooooooooooooooooooooo              oooooooooooooooooooo
	//ooooooooooooooooooooooooooooooooooooo      DMOD     oooooooooooooooooooo
	//ooooooooooooooooooooooooooooooooooooo                oooooooooooooooooooo
	//dpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpdpddpdpdpdpddpdpddpdpdpdp

	/*p[\dmod].put(\reset_T, Routine({ |t = 1|

	b.log("Delay Mod: reset");
	if(t.isNil, t = 0);
	~b1.p[\thPMod].setITransition( 0, t );
	~b1.p[\thAMod].setITransition( 0, t );


	~b1.p[\inSc].setBiPolar.setI( 0, t );
	~b1.p[\fbSc].setITransition( 0, t );
	~b1.p[\fxSc].setITransition( 0, t );
	~b1.p[\sliSc].setITransition( 0, t );

	~b2.p[\thPMod].setITransition( 0, t );
	~b2.p[\thAMod].setITransition( 0, t );


	~b2.p[\inSc].setITransition( 0, t );
	~b2.p[\fbSc].setITransition( 0, t );
	~b2.p[\fxSc].setITransition( 0, t );
	~b2.p[\sliSc].setITransition( 0, t );

	~a2.p[\thPMod].setITransition( 0, t );
	~a2.p[\thAMod].setITransition( 0, t );


	~a2.p[\inSc].setITransition( 0, t );
	~a2.p[\fbSc].setITransition( 0, t );
	~a2.p[\fxSc].setITransition( 0, t );
	~a2.p[\sliSc].setITransition( 0, t );

	~a1.p[\thPMod].setITransition( 0, t );
	~a1.p[\thAMod].setITransition( 0, t );


	~a1.p[\inSc].setITransition( 0, t );
	~a1.p[\fbSc].setITransition( 0, t );
	~a1.p[\fxSc].setITransition( 0, t );
	~a1.p[\sliSc].setITransition( 0, t );
	0.yieldAndReset;
	}));*/

	p[\dmod].put(\reset, Routine({|t = 0|
		b.log("Delay Mod: reset");
		if(t.isNil, t = 0);
		~b1.p[\thPMod].setI( 0 ,  t);
		~b1.p[\thAMod].setI( 0 ,  t);


		~b1.p[\inSc].setBiPolar.setI( 0 ,  t);
		~b1.p[\fbSc].setI( 0 ,  t);
		~b1.p[\fxSc].setI( 0 ,  t);
		~b1.p[\sliSc].setI( 0 ,  t);

		~b2.p[\thPMod].setI( 0 ,  t);
		~b2.p[\thAMod].setI( 0 ,  t);


		~b2.p[\inSc].setI( 0 ,  t);
		~b2.p[\fbSc].setI( 0 ,  t);
		~b2.p[\fxSc].setI( 0 ,  t);
		~b2.p[\sliSc].setI( 0 ,  t);

		~a2.p[\thPMod].setI( 0 ,  t);
		~a2.p[\thAMod].setI( 0 ,  t);


		~a2.p[\inSc].setI( 0 ,  t);
		~a2.p[\fbSc].setI( 0 ,  t);
		~a2.p[\fxSc].setI( 0 ,  t);
		~a2.p[\sliSc].setI( 0 ,  t);

		~a1.p[\thPMod].setI( 0 ,  t);
		~a1.p[\thAMod].setI( 0 ,  t);


		~a1.p[\inSc].setI( 0 ,  t);
		~a1.p[\fbSc].setI( 0 ,  t);
		~a1.p[\fxSc].setI( 0 ,  t);
		~a1.p[\sliSc].setI( 0 ,  t);
		0.yieldAndReset;
	}));


	p[\dmod].put(\mod1, Routine({|t = 0|
		b.log("Delay Mod: mod1 - opening hourglass");
		if(t.isNil, t = 0);
		// ~b1.p[\thPMod].setI( 0.2 ,  t);
		// ~b1.p[\thAMod].setI( 0.2 ,  t);

		// ++IN / --FB // ++ FX
		//----- TRANSLUCENT REPLACE WITH INPUT
		~b1.p[\inSc].setI( 1 ,  t);
		~b1.p[\fbSc].setI( -0.2 ,  t);
		~b1.p[\fxSc].setI( 1 ,  t);
		~b1.p[\sliSc].setI( 0 ,  t);

		// ~b2.p[\thPMod].setI( 0.2 ,  t);
		// ~b2.p[\thAMod].setI( 0.2 ,  t);

		// --FB / ++FX
		//------ OPEN SOUND, ERASE MEMORY
		~b2.p[\inSc].setI( 0 ,  t);
		~b2.p[\fbSc].setI( -0.2 ,  t);
		~b2.p[\fxSc].setI( 1 ,  t);
		~b2.p[\sliSc].setI( 0 ,  t);



		// ~a2.p[\thPMod].setI( 0.15 ,  t);
		// ~a2.p[\thAMod].setI( 0.4 ,  t);

		// ++IN / --FB / +FX
		//--------
		~a2.p[\inSc].setI( 1 ,  t);
		~a2.p[\fbSc].setI( -0.5 ,  t);
		~a2.p[\fxSc].setI( 0.5 ,  t);
		~a2.p[\sliSc].setI( 0 ,  t);

		// ~a1.p[\thPMod].setI( 0.25 ,  t);
		// ~a1.p[\thAMod].setI( 0.25 ,  t);

		// ALL GROW
		~a1.p[\inSc].setI( 1 ,  t);
		~a1.p[\fbSc].setI( 1 ,  t);
		~a1.p[\fxSc].setI( 0.5 ,  t);
		~a1.p[\sliSc].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	// p[\dmod].put(\mod1_T, Routine({| t = 1|
	//
	// 	b.log("Delay Mod: mod1 - opening hourglass");
	// 	// ~b1.p[\thPMod].setI( 0.2 );
	// 	// ~b1.p[\thAMod].setI( 0.2 );
	//
	// 	// ++IN / --FB // ++ FX
	// 	//----- TRANSLUCENT REPLACE WITH INPUT
	// 	~b1.p[\inSc].setITransition( 1 ,  t);
	// 	~b1.p[\fbSc].setITransition( -0.2 ,  t);
	// 	~b1.p[\fxSc].setITransition( 1 ,  t);
	// 	~b1.p[\sliSc].setITransition( 0 ,  t);
	//
	// 	// ~b2.p[\thPMod].setI( 0.2 ,  t);
	// 	// ~b2.p[\thAMod].setI( 0.2 ,  t);
	//
	// 	// --FB / ++FX
	// 	//------ OPEN SOUND, ERASE MEMORY
	// 	~b2.p[\inSc].setITransition( 0 ,  t);
	// 	~b2.p[\fbSc].setITransition( -0.2 ,  t);
	// 	~b2.p[\fxSc].setITransition( 1 ,  t);
	// 	~b2.p[\sliSc].setITransition( 0 ,  t);
	//
	//
	//
	// 	// ~a2.p[\thPMod].setITransition( 0.15 ,  t);
	// 	// ~a2.p[\thAMod].setITransition( 0.4 ,  t);
	//
	// 	// ++IN / --FB / +FX
	// 	//--------
	// 	~a2.p[\inSc].setITransition( 1 ,  t);
	// 	~a2.p[\fbSc].setITransition( -0.5 ,  t);
	// 	~a2.p[\fxSc].setITransition( 0.5 ,  t);
	// 	~a2.p[\sliSc].setITransition( 0 ,  t);
	//
	// 	// ~a1.p[\thPMod].setITransition( 0.25 ,  t);
	// 	// ~a1.p[\thAMod].setITransition( 0.25 ,  t);
	//
	// 	// ALL GROW
	// 	~a1.p[\inSc].setITransition( 1 ,  t);
	// 	~a1.p[\fbSc].setITransition( 1 ,  t);
	// 	~a1.p[\fxSc].setITransition( 0.5 ,  t);
	// 	~a1.p[\sliSc].setITransition( 0 ,  t);
	// 	0.yieldAndReset;
	// }));



	p[\dmod].put(\allIn, Routine({|t = 0|
		b.log("Delay Mod: all In");
		if(t.isNil, t = 0);
		// ~b1.p[\thPMod].setI( 0.2 ,  t);
		// ~b1.p[\thAMod].setI( 0.2 ,  t);

		// ++IN
		~b1.p[\inSc].setI( 1 ,  t);
		~b1.p[\fbSc].setI( 0 ,  t);
		~b1.p[\fxSc].setI( 0 ,  t);
		~b1.p[\sliSc].setI( 0 ,  t);

		// ~b2.p[\thPMod].setI( 0.2 ,  t);
		// ~b2.p[\thAMod].setI( 0.2 ,  t);

		// ++IN
		~b2.p[\inSc].setI( 1 ,  t);
		~b2.p[\fbSc].setI( 0 ,  t);
		~b2.p[\fxSc].setI( 0 ,  t);
		~b2.p[\sliSc].setI( 0 ,  t);

		// ~a2.p[\thPMod].setI( 0.15 ,  t);
		// ~a2.p[\thAMod].setI( 0.4 ,  t);

		// ++IN
		~a2.p[\inSc].setI( 1 ,  t);
		~a2.p[\fbSc].setI( 0 ,  t);
		~a2.p[\fxSc].setI( 0 ,  t);
		~a2.p[\sliSc].setI( 0 ,  t);

		// ~a1.p[\thPMod].setI( 0.25 ,  t);
		// ~a1.p[\thAMod].setI( 0.25 ,  t);

		// ++IN
		~a1.p[\inSc].setI( 1 ,  t);
		~a1.p[\fbSc].setI( 0 ,  t);
		~a1.p[\fxSc].setI( 0 ,  t);
		~a1.p[\sliSc].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\dmod].put(\allGrow, Routine({|t = 0|
		b.log("Delay Mod: all grow");
		if(t.isNil, t = 0);
		// ~b1.p[\thPMod].setI( 0.2 ,  t);
		// ~b1.p[\thAMod].setI( 0.2 ,  t);

		// ++IN
		~b1.p[\inSc].setI( 1 ,  t);
		~b1.p[\fbSc].setI( 0.6 ,  t);
		~b1.p[\fxSc].setI( 1 ,  t);
		~b1.p[\sliSc].setI( 0 ,  t);

		// ~b2.p[\thPMod].setI( 0.2 ,  t);
		// ~b2.p[\thAMod].setI( 0.2 ,  t);

		// ++IN
		~b2.p[\inSc].setI( 1 ,  t);
		~b2.p[\fbSc].setI( 0.6 ,  t);
		~b2.p[\fxSc].setI( 1 ,  t);
		~b2.p[\sliSc].setI( 0 ,  t);

		// ~a2.p[\thPMod].setI( 0.15 ,  t);
		// ~a2.p[\thAMod].setI( 0.4 ,  t);

		// ++IN
		~a2.p[\inSc].setI( 1 ,  t);
		~a2.p[\fbSc].setI( 1 ,  t);
		~a2.p[\fxSc].setI( 1 ,  t);
		~a2.p[\sliSc].setI( 0 ,  t);

		// ~a1.p[\thPMod].setI( 0.25 ,  t);
		// ~a1.p[\thAMod].setI( 0.25 ,  t);

		// ++IN
		~a1.p[\inSc].setI( 1 ,  t);
		~a1.p[\fbSc].setI( 1 ,  t);
		~a1.p[\fxSc].setI( 1 ,  t);
		~a1.p[\sliSc].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\dmod].put(\switchIn, Routine({ |t = 0|     // B: closes / A:opens
		b.log("Delay Mod: switch in (B close, A opens)");
		if(t.isNil, t = 0);
		// ~b1.p[\thPMod].setI( 0.2 ,  t);
		// ~b1.p[\thAMod].setI( 0.2 ,  t);

		// --IN
		~b1.p[\inSc].setI( -1 ,  t);
		~b1.p[\fbSc].setI( 0 ,  t);
		~b1.p[\fxSc].setI( 0 ,  t);
		~b1.p[\sliSc].setI( 0 ,  t);

		// ~b2.p[\thPMod].setI( 0.2 ,  t);
		// ~b2.p[\thAMod].setI( 0.2 ,  t);

		// --IN
		~b2.p[\inSc].setI( 0 ,  t);
		~b2.p[\fbSc].setI( 0 ,  t);
		~b2.p[\fxSc].setI( 0 ,  t);
		~b2.p[\sliSc].setI( 0 ,  t);

		// ~a2.p[\thPMod].setI( 0.15 ,  t);
		// ~a2.p[\thAMod].setI( 0.4 ,  t);

		// ++IN
		~a2.p[\inSc].setI( 1 ,  t);
		~a2.p[\fbSc].setI( 0 ,  t);
		~a2.p[\fxSc].setI( 0 ,  t);
		~a2.p[\sliSc].setI( 0 ,  t);

		// ~a1.p[\thPMod].setI( 0.25 ,  t);
		// ~a1.p[\thAMod].setI( 0.25 ,  t);

		// ++IN
		~a1.p[\inSc].setI( 1 ,  t);
		~a1.p[\fbSc].setI( 0 ,  t);
		~a1.p[\fxSc].setI( 0 ,  t);
		~a1.p[\sliSc].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\dmod].put(\condenserAB, Routine({ |t = 0| // B: closes and increases fb / A: opens and decreases fb
		b.log("Delay Mod: condenser - B: closes and increases fb / A: opens and decreases fb");
		if(t.isNil, t = 0);
		// ~b1.p[\thPMod].setI( 0.2 ,  t);
		// ~b1.p[\thAMod].setI( 0.2 ,  t);

		// ++IN / --FB // ++ FX
		~b1.p[\inSc].setI( -1 ,  t);
		~b1.p[\fbSc].setI( 1 ,  t);
		~b1.p[\fxSc].setI( 0 ,  t);
		~b1.p[\sliSc].setI( 0 ,  t);

		// ~b2.p[\thPMod].setI( 0.2 ,  t);
		// ~b2.p[\thAMod].setI( 0.2 ,  t);

		// --FB / ++FX
		~b2.p[\inSc].setI( -1 ,  t);
		~b2.p[\fbSc].setI( 1 ,  t);
		~b2.p[\fxSc].setI( 0 ,  t);
		~b2.p[\sliSc].setI( 0 ,  t);

		// ~a2.p[\thPMod].setI( 0.15 ,  t);
		// ~a2.p[\thAMod].setI( 0.4 ,  t);

		// ++IN / --FB / +FX
		~a2.p[\inSc].setI( 1 ,  t);
		~a2.p[\fbSc].setI( -0.6 ,  t);
		~a2.p[\fxSc].setI( 0 ,  t);
		~a2.p[\sliSc].setI( 0 ,  t);

		// ~a1.p[\thPMod].setI( 0.25 ,  t);
		// ~a1.p[\thAMod].setI( 0.25 ,  t);

		// ALL GROW
		~a1.p[\inSc].setI( 1 ,  t);
		~a1.p[\fbSc].setI( -0.6 ,  t);
		~a1.p[\fxSc].setI( 0 ,  t);
		~a1.p[\sliSc].setI( 0 ,  t);
		0.yieldAndReset;
	}));

	p[\dmod].put(\bBalancer, Routine({  |t = 0| // B1: closes and increases fb / B2: opens and decreases fb
		b.log("Delay Mod: b balancer - B1: closes and increases fb / B2: opens and decreases fb");
		if(t.isNil, t = 0);
		// ~b1.p[\thPMod].setI( 0.2 ,  t);
		// ~b1.p[\thAMod].setI( 0.2 ,  t);

		// ++IN / --FB // ++ FX
		~b1.p[\inSc].setI( -1 ,  t);
		~b1.p[\fbSc].setI( 1 ,  t);


		// --FB / ++FX
		~b2.p[\inSc].setI( 1 ,  t);
		~b2.p[\fbSc].setI( -1 ,  t);

		0.yieldAndReset;

	}));

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//{}\|<>|/{}\|<>|/{}\|<>|/{}\|<>|/{}\|<>|/{}\|<>|/{}\|<>|/{}\|<>|/{}\|<> \
	//ooooooooooooooooooooooooooooooooooooooooo       ooooooooooooooooooooo    \
	//ooooooooooooooooooooooooooooooooooooo      FX     oooooooooooooooooooo    \
	//oooooooooooooooooooooooooooooooooooooooo       ooooooooooooooooooooo       \
	//mnmnmnmnmnmmnmnmmnmnmnmmnmnmnmmmnmnmnmnmnmnmnmnmnmnmnmnmmnmmnmmnmmn     %       ~
	//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      xxxxxxx

	p[\fx].put(\delFxOff, Routine({ |t=0|
		b.log("fx: delay fx off");
		if(t.isNil, t = 0);
		~b1.p[\fxOf].setI(0);
		~b2.p[\fxOf].setI(0);
		~a2.p[\fxOf].setI(0);
		~a1.p[\fxOf].setI(0);
		0.yieldAndReset;
	});
	);


	p[\fx].put(\allOff, Routine({ |t=0|
		b.log("fx: all off");
		if(t.isNil, t = 0);


		//~~~~~~~~~~~~~~~~~~~~          ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////   VCFX    \\\\\\\\\\\\\\\\\\\

		// Not migrated: ~vcfx.p[\submarine].setI( 0 );
		~vcfx.p[\stut1AMT].setI( 0 ,  t);

		//~~~~~~~~~~~~~~~~~~~~           ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////   SPLUT   \\\\\\\\\\\\\\\\\\\
		// // Not migrated: ~splut.p[\splut1].setI(  ,  t);
		// ~splut.p[\splutSteps].setI(  ,  t);
		// // Not migrated: ~splut.p[\splutDiv].setI(  ,  t);
		// ~splut.p[\splutG8].setI(  ,  t);
		// // Not migrated: ~splut.p[\splut2].setI(  ,  t);
		// // Not migrated: ~splut.p[\splutenvMod].setI(  ,  t);


		//~~~~~~~~~~~~~~~~~~~~           ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////   SPARK    \\\\\\\\\\\\\\\\\\\
		~spark.p[\sparkleShaper ].setI( 0 ,  t);
		~spark.p[\spark         ].setI( 0 ,  t);
		~spark.p[\sparkTailMix  ].setI( 0 ,  t);
		~spark.p[\sparkPD       ].setI( 0 ,  t);
		~spark.p[\sparkTailShapr].setI( 0 ,  t);


		//~~~~~~~~~~~~~~~~~~~~           ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    DECI    \\\\\\\\\\\\\\\\\\\
		~deci.p[\deciShaper     ].setI( 0 ,  t);
		~deci.p[\depthOf        ].setI( 0 ,  t);
		~deci.p[\foldOf         ].setI( 0 ,  t);
		~deci.p[\depthSc        ].setI( 0 ,  t);
		~deci.p[\foldSc         ].setI( 0 ,  t);



		//~~~~~~~~~~~~~~~~~~~~            ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    FUZZ    \\\\\\\\\\\\\\\\\\\
		~fuzz.p[\fuzzShaper     ].setI( 0 ,  t);


		//~~~~~~~~~~~~~~~~~~~~            ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    VERB    \\\\\\\\\\\\\\\\\\\
		~verb.p[\verbIn         ].setI( 0 ,  t);
		~verb.p[\verbSelect     ].setI( 0 ,  t);
		~verb.p[\verbSelectMod  ].setI( 0 ,  t);

		//~~~~~~~~~~~~~~~~~~~~          ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    UM    \\\\\\\\\\\\\\\\\\\
		~mast.p[\umShaper       ].setI( 0 ,  t);
		~mast.p[\umMix          ].setI( 0 ,  t);
		~mast.p[\umMainControl  ].setI( 0 ,  t);
		~mast.p[\umEarth        ].setI( 0 ,  t);
		~mast.p[\umDiffusion    ].setI( 0 ,  t);
		~mast.p[\umInnerDep     ].setI( 0 ,  t);
		~mast.p[\umInnerR8      ].setI( 0 ,  t);
		~mast.p[\umwonkSC       ].setI( 0 ,  t);
		~mast.p[\umOverMod      ].setI( 0 ,  t);


		//~~~~~~~~~~~~~~~~~~~~            ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    MAST    \\\\\\\\\\\\\\\\\\\
		// Not migrated: ~mast.p[\mastEQShaper].setI( 0 ,  t);
		~mast.p[\schertlerMix   ].setI( 0 ,  t);
		// Not migrated: ~mast.p[\stut2AMT].setI( 0 ,  t);

		0.yieldAndReset;
	});
	);


	p[\fx].put(\basic1, Routine({ | t=0 |
		b.log("fx: basic1");
		if(t.isNil, t = 0);
		//~~~~~~~~~~~~~~~~~~~~          ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////   VCFX    \\\\\\\\\\\\\\\\\\\

		// Not migrated: ~vcfx.p[\submarine].setI( 0 );
		~vcfx.p[\stut1AMT].setI( 0 ,  t);

		//~~~~~~~~~~~~~~~~~~~~           ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////   SPLUT   \\\\\\\\\\\\\\\\\\\
		// // Not migrated: ~splut.p[\splut1].setI(  ,  t);
		// ~splut.p[\splutSteps].setI(  ,  t);
		// // Not migrated: ~splut.p[\splutDiv].setI(  ,  t);
		// ~splut.p[\splutG8].setI(  ,  t);
		// // Not migrated: ~splut.p[\splut2].setI(  ,  t);
		// // Not migrated: ~splut.p[\splutenvMod].setI(  ,  t);


		//~~~~~~~~~~~~~~~~~~~~           ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////   SPARK    \\\\\\\\\\\\\\\\\\\
		~spark.p[\sparkleShaper ].setI( 0.2 ,  t);
		~spark.p[\spark         ].setI( 0.36 ,  t);
		~spark.p[\sparkTailMix  ].setI( 0.2 ,  t);
		~spark.p[\sparkPD       ].setI( 0.6 ,  t);
		~spark.p[\sparkTailShapr].setI( 0.5 ,  t);


		//~~~~~~~~~~~~~~~~~~~~           ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    DECI    \\\\\\\\\\\\\\\\\\\
		~deci.p[\deciShaper     ].setI( 0.3 ,  t);
		~deci.p[\depthOf        ].setI( 0.2 ,  t);
		~deci.p[\foldOf         ].setI( 0.3 ,  t);
		~deci.p[\depthSc        ].setI( 0 ,  t);
		~deci.p[\foldSc         ].setI( 0 ,  t);



		//~~~~~~~~~~~~~~~~~~~~            ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    FUZZ    \\\\\\\\\\\\\\\\\\\
		~fuzz.p[\fuzzShaper     ].setI( 0.3 ,  t);


		//~~~~~~~~~~~~~~~~~~~~            ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    VERB    \\\\\\\\\\\\\\\\\\\
		~verb.p[\verbIn         ].setI( 0.5 ,  t);
		~verb.p[\verbSelect     ].setI( 0.8 ,  t);
		~verb.p[\verbSelectMod  ].setI( -0.5 ,  t);

		//~~~~~~~~~~~~~~~~~~~~          ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    UM    \\\\\\\\\\\\\\\\\\\
		~mast.p[\umShaper       ].setI( 0.133 ,  t);
		~mast.p[\umMix          ].setI( 0 ,  t);
		~mast.p[\umMainControl  ].setI( 0 ,  t);
		~mast.p[\umEarth        ].setI( 0.26 ,  t);
		~mast.p[\umDiffusion    ].setI( 0.116 ,  t);
		~mast.p[\umInnerDep     ].setI( 0.135 ,  t);
		~mast.p[\umInnerR8      ].setI( 0.17 ,  t);
		~mast.p[\umwonkSC       ].setI( 0 ,  t);
		~mast.p[\umOverMod      ].setI( 0 ,  t);


		//~~~~~~~~~~~~~~~~~~~~            ~~~~~~~~~~~~~~~~~~~~~
		//////////////////////    MAST    \\\\\\\\\\\\\\\\\\\
		// Not migrated: ~mast.p[\mastEQShaper].setI( 0 ,  t);
		~mast.p[\schertlerMix   ].setI( 0 ,  t);
		// Not migrated: ~mast.p[\stut2AMT].setI( 0 ,  t);
		0.yieldAndReset;
	});
	);
	/*)

	~verb.p[\verbSelectMod].setI( -1 );

	// Initial presets are explicit, never launched when definitions load.
	p[\dmod].keys
	

	//MIDMIDMIDMIDMIDMIDMIDIMIDMIDMIDMIDMIDMIDMIDIMDMIDMIDMIDMIDMIDMIDMIDMIDMIDM
	//IDMIDMIDMIDMIDMIDMIDIMIDMIDMIDMIDMI            MIDMIDMIDMIDMIDMIDMIDMIDMIDI
	//DMIDMIDMIDMIDMIDMIDIMIDMIDMIDMIDMI  M   DMIDIMDMIDMIDMIDMIDMIDMIDMIDMIDMIDMID
	//IDMIDMIDMIDMIDMIDIMIDMIDMIDMIDMIDMID I    I  MIDMIDMIDMIDMIDMIDMIDMIDMIDMID
	//MIDMIDMIDMIDMIDMIDMIDIMIDMIDMIDMIDMIDM  D  IDIMDMIDMIDMIDMIDMIDMIDMIDMI
	//MIDMIDMIDMIDMIDMIDMIDIMIDMIDMIDMIDMIDMIDMIDIMDMIDMIDMIDMIDMIDMIDMI
	(*/


)
