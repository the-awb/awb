// sclang, running in the page next to the scsynth that is already playing.
//
// No React and no app imports, deliberately: this module owns the portable engine/bridge contract,
// not an application's shell, policy or authored content. The broader sharing boundary is
// responsibility rather than framework; common editor machinery may use React without belonging
// here. Everything below is "two wasm modules talking to each other" and knows nothing about a
// field or instrument.
//
// THE SHAPE OF THE PROBLEM. scsynth is already booted and audible before sclang exists, because
// the app boots it on the first play. sclang's own model is the opposite - it boots the server and
// registers with it - so attaching means walking its state machine forward by hand without ever
// letting it do the two things that would kill the engine:
//
//   1. A SECOND /notify from an already-registered client crashes the audio worker outright
//      ("Uncaught 15426688", worker gone, nothing in the log). The app sent /notify at boot, so
//      sclang's ServerStatusWatcher sending its own is exactly the fatal thing. It is intercepted
//      here and answered with a synthesised reply instead.
//   2. Server.boot calls prPingApp FIRST, which sends /sync and, if the server ANSWERS, does
//      `this.quit; this.boot`. Our server answers. So `s.boot` would /quit the running engine.
//      See "What this does not do" at the bottom - the prelude drives the status watcher directly
//      and never goes near Server.boot.
//
// See HANDOVER-sclang-spike.md for the contract, FINDINGS-osc-runtime.md for where each of these
// came from, and tools/verify/sclang-handshake.mjs for the assertions that make them facts rather
// than readings.

// The reply we hand sclang in place of the one the server would have sent.
//
// Both numbers are load-bearing and neither is a guess:
//   clientID 1  - partitions the node id space (NodeIDAllocator does `temp | (user << 26)`), so
//                 sclang's synths cannot collide with the ones the app allocates from 2000 up.
//   maxLogins 2 - NOT 1: ServerOptions defaults maxLogins to 1 and clientID_ refuses
//                 `val >= maxNumClients`, so a reply of 1 leaves clientID at 0 with only a warning
//                 and the partition silently does not happen. NOT 64 either, even though that is
//                 scsynth's own C++ default: prHandleClientLoginInfoFromServer assigns through
//                 maxLogins_, which THROWS above 32, and it throws inside doneOSCFunc so
//                 prFinalizeBoot never runs and `notified` never goes true - the exact hang this
//                 whole mechanism exists to prevent. 2 is also the cheapest legal value: buses and
//                 buffers are divided per client, so a larger number just shrinks sclang's share.
const SYNTHESISED_CLIENT_ID = 1;
const SYNTHESISED_MAX_LOGINS = 2;

// app option name -> the ServerOptions instance variable sclang spells it with. Taken from the
// wasm build's own prOptionsString overwrite, which is the mapping sclang uses in the other
// direction when it asks JavaScript to boot a server.
const OPTION_TO_SCLANG = {
  numInputBusChannels: 'numInputBusChannels',
  numOutputBusChannels: 'numOutputBusChannels',
  realTimeMemorySize: 'memSize',
  bufLength: 'blockSize',
  maxWireBufs: 'numWireBufs',
  numBuffers: 'numBuffers',
  maxNodes: 'maxNodes',
  maxGraphDefs: 'maxSynthDefs',
  numAudioBusChannels: 'numAudioBusChannels',
  numControlBusChannels: 'numControlBusChannels',
  verbosity: 'verbosity'
};

// The OSC address of a message, without decoding the rest of it. A message begins with its
// address as a null-terminated string, so this is the whole of the parse we need to decide whether
// to forward or intercept - and doing it here rather than via scsynth's parser keeps the bridge
// honest about only looking at the envelope.
//
// One quirk to know about: scsynth also accepts NUMERIC command ids in place of an address, and
// sclang uses them in places (RootNode.freeAll sends 24, not "/g_freeAll"). Those read as an empty
// string here, since the first byte is a zero. That is harmless - they fall through to the forward
// path, which is what they want - but it means you cannot match on an address alone for any
// command sclang might send numerically. /notify and /quit are both sent as strings.
function oscAddress( bytes ) {
  let end = 0;
  while ( end < bytes.length && bytes[ end ] !== 0 ) end++;
  let out = '';
  for ( let i = 0; i < end; i++ ) out += String.fromCharCode( bytes[ i ] );
  return out;
}

export function createScLangBridge( {
  // GETTERS, not values. A reboot replaces the emscripten module instance outright - emscripten
  // offers no way to revive one - so a module captured at attach time is a dead object the moment
  // sclang reboots the server, and every message after that goes into a corpse without erroring.
  // Same for the options, which are only known once a boot has happened.
  getScsynthModule,     // () => the current module. The bridge calls .sendOsc and .OscMessage on it
  getBootOptions,       // () => what the app ACTUALLY booted scsynth with, this time
  subscribeOscReply,    // (fn) => unsubscribe. NOT an assignment to onOscReply: one slot, two consumers
  onPrint,              // (line) => void
  onServerQuit,         // () => Promise. sclang asked for the server to go; tear the app's side down
  onBootRequest,        // (optionsFromSclang) => Promise<module|null>. sclang wants a server back
  // () => Promise<module>. The HOST imports sclang.js: a bundler rewrites import(expr) relative to
  // the importing file, and this file lives outside any consuming app. See README, "Asset location".
  importSclang,
  // (file) => url, passed to emscripten so it can find sclang's 1.9MB .data package. NOT optional:
  // emscripten resolves that package against the PAGE's path, not the module's, so without it the
  // loader fetches /sclang.data, gets the dev server's index page with a 200, and fails somewhere
  // much less obvious than a 404.
  locateFile,
  // Install window.__sclang* readback globals. The verify harnesses drive sclang through these,
  // so dev builds must pass true. Default false.
  exposeDevGlobals = false
} = {} ) {
  let sclang = null;
  let attached = false;
  let attachPromise = null;
  let unsubscribeOsc = null;
  let previousBootServer;
  let notifyIntercepts = 0;
  let handshakeOk = false;

  // Quit and boot arrive as two separate messages a fraction of a second apart (sclang sends
  // /quit, waits out prPingApp's 0.25s timeout, then asks for a boot), and both are asynchronous
  // on our side. One chain so the boot can never start before the teardown has finished - without
  // it a reboot races, and the winner decides whether you get an engine or a corpse.
  let lifecycle = Promise.resolve();
  const queueLifecycle = ( step ) => {
    lifecycle = lifecycle.then( step ).catch( ( e ) => print( `bridge: ${ e.message }` ) );
    return lifecycle;
  };

  const lines = [];
  const print = ( line ) => {
    lines.push( line );
    if ( lines.length > 2000 ) lines.splice( 0, 1000 );
    try { onPrint?.( line ); } catch { /* the consumer's problem, not the bridge's */ }
  };

  const waitFor = async ( test, timeoutMs, step = 250 ) => {
    const deadline = Date.now() + timeoutMs;
    while ( Date.now() < deadline ) {
      if ( test() ) return true;
      await new Promise( ( r ) => setTimeout( r, step ) );
    }
    return false;
  };

  // sclang's JS surface comes from embind, and this build is a CI artifact from an unmerged PR
  // rather than anything published - getWorkletNode() is missing from the scsynth half of the same
  // artifact, so "the demo calls it" is not evidence a method exists. Fail with the actual list.
  const methodOf = ( obj, names ) => {
    for ( const n of names ) if ( typeof obj?.[ n ] === 'function' ) return obj[ n ].bind( obj );
    const have = obj ? Object.keys( obj ).filter( ( k ) => typeof obj[ k ] === 'function' ).sort() : [];
    throw new Error( `sclang has none of ${ names.join( '/' ) }. It has: ${ have.join( ' ' ) || '(nothing callable)' }` );
  };

  let runCodeFn = null;
  const runCode = ( code ) => {
    if ( !runCodeFn ) throw new Error( 'sclang is not attached' );
    return runCodeFn( code );
  };

  // What sclang must be told before it registers.
  //
  // sclang allocates buses and buffers from its OWN ServerOptions, divided by maxNumClients, and
  // nothing reconciles those against the engine. They agree today (1024 / 16384 / 1024 on both
  // sides, checked) so this is a guard rather than a fix - but it is the guard that stops a future
  // change to the app's boot options from handing sclang a private bus range that does not exist.
  //
  // Then startAliveThread, and NOT Server.boot. That is the whole trick: the alive thread polls
  // /status, the reply sets hasBooted, the next reply sends /notify (prSendNotifyRequest returns
  // early while hasBooted is false, so the order matters), we answer it, and prFinalizeBoot runs
  // ServerBoot / initTree / notified = true. Same end state as a boot, without prPingApp getting
  // the chance to quit the engine we are attaching to.
  const prelude = () => {
    const opts = getBootOptions?.() || {};
    const sets = Object.entries( OPTION_TO_SCLANG )
      .filter( ( [ key ] ) => typeof opts[ key ] === 'number' )
      .map( ( [ key, sc ] ) => `Server.default.options.${ sc } = ${ opts[ key ] };` );
    return [
      's = Server.default;',
      ...sets,
      // firstPrivateBus is derived from the two channel counts, so mirroring them fixes the one
      // divergence that was actually live (sclang started private buses at 4, the engine at 2).
      'Server.default.statusWatcher.startAliveThread;'
    ].join( '\n' );
  };

  const attach = async () => {
    if ( attachPromise ) return attachPromise;
    attachPromise = ( async () => {
      if ( typeof getScsynthModule !== 'function' || !getScsynthModule() ) {
        throw new Error( 'scsynth is not booted - start the engine first' );
      }
      if ( typeof subscribeOscReply !== 'function' ) {
        throw new Error( 'subscribeOscReply is required: assigning scsynth.onOscReply would break /sync' );
      }

      if ( typeof importSclang !== 'function' || typeof locateFile !== 'function' ) {
        throw new Error( 'createScLangBridge: importSclang and locateFile are both required.' );
      }
      const mod = await importSclang();
      // locateFile is not optional here, unlike for scsynth. sclang ships a 1.9MB .data package
      // (the class library) and emscripten's package loader resolves it against the PAGE's path,
      // not the module's - so without this it fetches /sclang.data, gets the dev server's index
      // page with a 200, and fails somewhere much less obvious than a 404.
      sclang = await mod.default( { locateFile } );

      sclang.printCallback = print;
      sclang.printErrCallback = print;

      // sclang -> scsynth, with two addresses pulled out on the way past.
      sclang.onOsc = ( osc ) => {
        const bytes = osc instanceof Uint8Array ? osc : new Uint8Array( osc );
        const address = oscAddress( bytes );

        if ( address === '/notify' ) {
          // Do not forward, and do not answer synchronously either: this is running inside the
          // interpreter's own send, and sendOsc from here re-enters it.
          notifyIntercepts++;
          const reply = buildNotifyReply();
          queueMicrotask( () => { try { sclang?.sendOsc( reply ); } catch ( e ) { print( `bridge: ${ e.message }` ); } } );
          return;
        }

        if ( address === '/quit' ) {
          // Forwarded, NOT swallowed. sclang is allowed to quit the server - rebooting mid-session
          // is a reasonable thing to want, and blocking it would only half-work anyway, since
          // Server.quit tears sclang's own state down whether or not the message arrives. What the
          // bridge adds is telling the app, which otherwise sits there believing in an engine that
          // has gone.
          const engine = getScsynthModule?.();
          if ( engine ) engine.sendOsc( new Uint8Array( bytes ) );

          // And answering for it. `Server.reboot` passes the re-boot as quit's ONCOMPLETE, and
          // watchQuit only runs that once it has seen /done ['/quit'] come back; on the timeout it
          // runs onFailure instead and `this.boot` is never reached. The app's teardown closes the
          // AudioContext before scsynth can answer, so left alone this is a race that decides
          // whether s.reboot reboots or just quits - measured, it lost about half the time.
          // Built now, while the engine is still alive, and sent after Server.quit has returned:
          // watchQuit registers its responder AFTER sending /quit, so a synchronous reply would
          // arrive before anything was listening for it.
          const reply = engine ? buildDoneReply( '/quit' ) : null;
          if ( reply ) queueMicrotask( () => { try { sclang?.sendOsc( reply ); } catch { /* gone */ } } );

          print( 'bridge: sclang quit the server' );
          queueLifecycle( () => onServerQuit?.() );
          return;
        }

        // A copy, because the buffer sclang handed over is freed as soon as this returns.
        const engine = getScsynthModule?.();
        if ( !engine ) { print( `bridge: dropped ${ address } - no server` ); return; }
        engine.sendOsc( new Uint8Array( bytes ) );
      };

      // scsynth -> sclang. A subscription, never an assignment: useSuperCollider.js is still using
      // that slot for /synced, /n_end and /fail.
      unsubscribeOsc = subscribeOscReply( ( message ) => {
        try { sclang?.sendOsc( message instanceof Uint8Array ? message : new Uint8Array( message ) ); }
        catch ( e ) { print( `bridge: ${ e.message }` ); }
      } );

      installBootServer();

      // Resolved before use rather than assumed: the demo calls runCode(), but the demo also calls
      // getWorkletNode(), which this artifact does not export.
      runCodeFn = methodOf( sclang, [ 'runCode', 'interpret', 'evaluate' ] );
      methodOf( sclang, [ 'bootInterpreter' ] )();

      // The class library is 1.9MB of source and compiling it takes tens of seconds. WAIT FOR IT
      // TO FINISH before evaluating anything: sclang is single-threaded, and calling runCode
      // during the compile re-enters the interpreter and wedges it - measured, the compile simply
      // stops printing and never comes back. So the printed completion line is the gate, and the
      // evaluated probe below only confirms it.
      const compiled = await waitFor(
        () => lines.some( ( l ) => /compile done|Welcome to SuperCollider/i.test( l ) ), 180000 );
      if ( !compiled ) throw new Error( 'sclang never finished compiling its class library' );

      const token = `SCLANG-BRIDGE-READY-${ Date.now() }`;
      const ready = await waitFor( () => {
        try { runCode( `"${ token }".postln;` ); } catch { /* not up yet */ }
        return lines.some( ( l ) => String( l ).includes( token ) );
      }, 30000, 1000 );
      if ( !ready ) throw new Error( 'sclang compiled but never answered an evaluated expression' );

      attached = true;
      runCode( prelude() );

      // Wait for the handshake to settle before saying we are attached. The alive thread polls
      // every 0.7s and the chain is /status -> hasBooted -> /notify -> our reply -> prFinalizeBoot
      // -> a real /sync round trip -> notified, so it takes a second or two, and until it has
      // finished s.serverRunning is legitimately false. Polled by evaluation because printed
      // output is the only channel back out of sclang.
      const settled = `SCLANG-BRIDGE-RUNNING-${ Date.now() }`;
      handshakeOk = await waitFor( () => {
        try { runCode( `if(Server.default.serverRunning) { "${ settled }".postln };` ); } catch { /* mid-compile */ }
        return lines.some( ( l ) => String( l ).includes( settled ) );
      }, 20000, 500 );

      // Installed either way. A failed handshake must show up as assertion 1 reporting false, not
      // as the harness erroring out one layer above the thing it is trying to measure.
      installDevGlobals();
      if ( !handshakeOk ) print( 'bridge: attached, but s.serverRunning is still false after 20s' );
      return handshakeOk;
    } )().catch( ( e ) => {
      attachPromise = null;
      detach();
      throw e;
    } );
    return attachPromise;
  };

  // /done ['/notify', clientID, maxLogins], built with scsynth's own OSC writer so the bytes are
  // exactly what the engine would have produced. sclang matches it with argTemplate
  // ['/notify', nil], reads msg[2] as the clientID and msg[3] as maxLogins.
  function buildNotifyReply() {
    return buildDoneReply( '/notify', SYNTHESISED_CLIENT_ID, SYNTHESISED_MAX_LOGINS );
  }

  // /done [command, ...ints], built with scsynth's own OSC writer so the bytes are exactly what
  // the engine would have produced.
  function buildDoneReply( command, ...ints ) {
    const msg = new ( getScsynthModule() ).OscMessage();
    try {
      let m = msg.beginMessage( '/done' ).addString( command );
      for ( const i of ints ) m = m.addInt( i );
      return new Uint8Array( m.endMessage().getData() );   // copy: the view dies with the message
    } finally {
      msg.delete();
    }
  }

  // sclang's wasm overwrites replace Server.bootServerApp with JS.runCode("bootServer(...)"), so
  // this global is how sclang asks for a server.
  //
  // The upstream reference boots unconditionally on a 100ms timer, which double-boots when
  // JavaScript booted first. This is idempotent instead: **the app owns the boot either way**, and
  // the only question is whether there is anything to do.
  //
  //   engine up   -> decline, and say so; loudly if sclang's options differ from the app's real
  //                  ones, because that divergence is silent everywhere else
  //   engine down -> ask the app to boot, for real
  //
  // The second case is what makes `s.reboot` work. It has to go through the app rather than
  // calling scsynth.boot() here, because the Proxy around the AudioWorkletNode constructor is the
  // only way to get the output node out of this build - boot it from anywhere else and you get a
  // running engine with no tap, no monitoring and no visualiser input.
  function installBootServer() {
    previousBootServer = window.bootServer;
    window.bootServer = ( options ) => {
      const asked = typeof options === 'string' ? JSON.parse( options ) : ( options || {} );
      queueLifecycle( async () => {
        if ( getScsynthModule?.() ) {
          const current = getBootOptions?.() || {};
          const differences = Object.keys( OPTION_TO_SCLANG )
            .filter( ( key ) => key in asked && key in current && asked[ key ] !== current[ key ] )
            .map( ( key ) => `${ key } ${ asked[ key ] } != ${ current[ key ] }` );
          print( differences.length
            ? `bridge: server already running; not booting again. Options differ: ${ differences.join( ', ' ) }`
            : 'bridge: server already running; not booting again.' );
          return;
        }
        if ( !onBootRequest ) { print( 'bridge: sclang asked for a server and nothing can boot one.' ); return; }
        print( 'bridge: sclang asked for a server - booting.' );
        // The app boots and puts its own SynthDefs back. sclang restores itself from here without
        // help: bootServerApp's onComplete starts the alive thread, and the handshake runs again
        // exactly as it did on first attach.
        const engine = await onBootRequest( asked );
        print( engine ? 'bridge: server back up.' : 'bridge: boot failed.' );
      } );
      return true;
    };
  }

  // Dev-only readback. Printed output is the only channel out of sclang, so the harness asks
  // questions by evaluating code that prints a delimited marker and reading the log.
  //
  // Gated by an injected flag rather than import.meta.env.DEV, which is a Vite-specific global a
  // package must not read. The app passes import.meta.env.DEV; a non-Vite host passes whatever it
  // uses. Default false, so a production host that forgets exposes nothing.
  function installDevGlobals() {
    if ( !exposeDevGlobals ) return;
    window.__sclangLog = lines;
    window.__sclangEval = ( code ) => runCode( code );
    window.__sclang = sclang;
    // A getter, so that after a reboot this reports the options of the engine that is running now
    // rather than the one that was running when sclang first attached.
    Object.defineProperty( window, '__scBootOptions', {
      configurable: true,
      get: () => getBootOptions?.() || null
    } );
  }

  function detach() {
    try { unsubscribeOsc?.(); } catch { /* already gone */ }
    unsubscribeOsc = null;
    if ( sclang ) sclang.onOsc = null;
    runCodeFn = null;
    if ( previousBootServer === undefined ) delete window.bootServer;
    else window.bootServer = previousBootServer;
    previousBootServer = undefined;
    attached = false;
    attachPromise = null;
    // sclang itself is NOT torn down: emscripten offers no teardown for a module instance, the
    // same limitation useSuperCollider.shutdown() documents for scsynth. Detaching stops it
    // talking to the engine; it does not reclaim the heap.
  }

  return {
    attach,
    detach,
    runCode,
    get isAttached() { return attached; },
    get handshakeOk() { return handshakeOk; },
    get log() { return lines; },
    get notifyIntercepts() { return notifyIntercepts; }
  };
}

// What this does NOT do, on purpose:
//
//   * Server.boot is still a trap. It calls prPingApp before anything else, which sends /sync and
//     treats an answer as "a stale server is already there" - `this.quit; this.boot`. Our engine
//     answers, so typing `s.boot` sends /quit to the audio worker and then hangs, because the
//     re-boot goes through window.bootServer, which correctly declines to boot a server it still
//     believes is running. Intercepting /quit is phase 03 proper; this spike only has to not do
//     it, which is why the prelude drives the status watcher instead.
//   * CmdPeriod is unscoped: it would free the app's synths as well as sclang's.
//   * No console, no editor, no .scd mode. Those are phase 03 and none of them can be designed
//     honestly until the six assertions in tools/verify/sclang-handshake.mjs are green.
