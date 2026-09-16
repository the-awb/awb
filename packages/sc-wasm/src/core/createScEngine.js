// scsynth, running in the page as WebAssembly.
//
// A fourth audio source alongside file playback, live input and the test signal - and the only one
// that generates its own sound rather than loading or capturing it. The engine is the matched
// scsynth/sclang artifact from SuperCollider PR #7440, vendored by the host.
//
// Two things make this integrate cleanly rather than needing a parallel pipeline:
//
//   1. The engine's output is an ordinary AudioWorkletNode in the page's own Web Audio graph, so
//      it can simply be connected to. No serialization, no message protocol, no iframe - which is
//      exactly why the plan rejected iframe isolation: a Web Audio graph can't span JS realms.
//      (Getting hold of that node is the awkward part - see the constructor capture in boot().)
//   2. We tap it into the SAME "new samples since last tick" contract live input and file playback
//      already use (see ARCHITECTURE.md), so everything downstream - the patterns, the persistence
//      buffer, recording - is unchanged and doesn't know where the audio came from.
//
// Requires cross-origin isolation (COOP/COEP): scsynth uses pthreads, which need SharedArrayBuffer.
// Set in vite.config.js for dev and netlify.toml for production.

const EMPTY = new Float32Array( 0 );
const MAX_PENDING_SECONDS = 2;

// Samples per tap callback. 512 rather than a larger, "cheaper" block because this figure decides
// how SMOOTHLY the visuals move, not how much CPU the tap costs.
//
// The draw loop runs at 60fps and consumes whatever has arrived since the last frame. At 48kHz,
// 2048 delivers 23.4 chunks a second against 60 frames - measured: 61% of frames received NO new
// audio at all, then one big lump landed. The curve froze for a frame or two and jumped, which
// reads as jank even though the frame rate never moved off a solid 60. At 512 it is 93.75 chunks a
// second, so most frames get one or two and the motion is continuous.
//
// This is the same value the original app's live-input path uses (AUDIO_BUFFER_SIZE in
// useAudioInput.js), which is why that source always looked smoother than this one.
const TAP_BUFFER_SIZE = 512;

// importScsynth: () => Promise<module>. The HOST performs the import, not this package.
//
// It is not enough to pass a URL. A bundler rewrites `import(expr)` according to where the file
// doing the importing lives, and this file lives outside any consuming app - Vite serves it over
// /@fs/ and wraps the argument in __vite__injectQuery(..., 'import') EVEN WITH /* @vite-ignore */,
// which turns a static public/ asset into a module request the dev server answers with a 500.
// Measured 14 September 2026; see vite.config.js in react-app.
//
// Handing the host a function instead means the import statement is compiled by the app's own
// bundler, in the app's own directory, exactly as it was before extraction. It is also the honest
// boundary: how a module is loaded is a build concern, and this package has no build.
export function createScEngine( { importScsynth } = {} ) {
  let state = Object.freeze( {
    isBooted: false,
    status: 'idle', // idle | loading | booting | ready | failed
    audioContextState: 'unavailable',
    error: null,
    log: Object.freeze( [] ),
    nodes: Object.freeze( {} )
  } );
  let scEngine = null;
  let audioContext = null;
  let audioContextStateHandler = null;
  let bootPromise = null;
  let pendingChunks = [];
  let tapNode = null;
  let caughtAudio = null;
  const syncWaiters = new Map();
  let syncId = 1;
  let bootOptionsState = null;
  const loadedDefs = new Map();
  let nextNodeId = 2000;
  let disposed = false;
  let disposePromise = null;

  const stateSubscribers = new Set();
  const publish = ( patch ) => {
    if ( !Object.entries( patch ).some( ( [ key, value ] ) => state[ key ] !== value ) ) return;
    state = Object.freeze( { ...state, ...patch } );
    for ( const fn of stateSubscribers ) {
      try { fn(); } catch { /* one observer must not break the others */ }
    }
  };
  const setIsBooted = ( isBooted ) => publish( { isBooted } );
  const setStatus = ( status ) => publish( { status } );
  const setError = ( error ) => publish( { error } );

  // The engine gives ONE slot for OSC replies and ONE for printed lines, and this hook already
  // owns both - onOscReply for /synced, /n_end and /fail, onPrint for the log. A second consumer
  // (sclang, attached through scLangBridge.js) cannot simply assign over them: doing so
  // makes /sync never resolve and loadSynthDef hang forever, with the engine running perfectly and
  // nothing at all in the log. So the slots are fanned out here instead, and everyone else
  // subscribes. Held outside React so the closure installed in boot() sees subscribers added later.
  const oscSubscribers = new Set();
  const printSubscribers = new Set();
  const subscribeOscReply = ( fn ) => {
    if ( disposed ) return () => {};
    oscSubscribers.add( fn );
    return () => oscSubscribers.delete( fn );
  };
  const subscribePrint = ( fn ) => {
    if ( disposed ) return () => {};
    printSubscribers.add( fn );
    return () => printSubscribers.delete( fn );
  };
  const subscribe = ( fn ) => {
    if ( disposed ) return () => {};
    stateSubscribers.add( fn );
    return () => stateSubscribers.delete( fn );
  };
  const getState = () => state;
  const getEngine = () => scEngine;
  const getBootOptions = () => bootOptionsState;

  // Exactly what the engine was booted with, kept for anyone who has to agree with it. sclang
  // keeps its OWN ServerOptions and divides buses and buffers by its own numbers; nothing
  // reconciles the two, so the bridge mirrors these into s.options before the handshake.
  // What's currently playing, by def name: { id, paused }. It lives in the external-store snapshot
  // so the OSC handler and node methods can read it without depending on React render order.
  const setNodes = ( updater ) => {
    const nodes = typeof updater === 'function' ? updater( state.nodes ) : updater;
    if ( nodes !== state.nodes ) {
      const frozenNodes = Object.fromEntries(
        Object.entries( nodes ).map( ( [ name, node ] ) => [ name, Object.freeze( node ) ] )
      );
      publish( { nodes: Object.freeze( frozenNodes ) } );
    }
  };

  const appendLog = ( line ) => {
    publish( { log: Object.freeze( [ ...state.log.slice( -199 ), line ] ) } );
  };

  // Same swap-and-clear contract as useAudioInput.drainNewSamples: a read empties the queue, so
  // every sample is delivered exactly once and nothing is double-counted.
  const drainNewSamples = () => {
    const chunks = pendingChunks;
    if ( chunks.length === 0 ) return { x: EMPTY, y: EMPTY };
    pendingChunks = [];

    let total = 0;
    for ( const c of chunks ) total += c.x.length;
    const x = new Float32Array( total );
    const y = new Float32Array( total );
    let offset = 0;
    for ( const c of chunks ) {
      x.set( c.x, offset );
      y.set( c.y, offset );
      offset += c.x.length;
    }
    return { x, y };
  };

  // A NON-DESTRUCTIVE read of the most recent `seconds` of engine output.
  //
  // Deliberately not drainNewSamples. That one empties the queue, which is right for a display that
  // must see every sample exactly once and wrong for a measurement: measuring is not consuming, and
  // a measurement that stole the samples would break any display sharing the tap. Two readers, two
  // contracts.
  //
  // What this is for: phase. It cannot be got out of scsynth over OSC - replies are plain messages
  // with no timetag, /status.reply has no clock, and phase is not a control so no query returns it.
  // But the audio path has no OSC in it at all. This tap is the actual waveform at a fixed rate, and
  // The host's phaseFit.js recovers the phase of known components from it directly.
  //
  // The backlog is bounded at MAX_PENDING_SECONDS, so asking for more than that returns what exists
  // rather than failing - the caller checks the window it actually got, because a window too short
  // for the frequencies in it must be refused rather than answered.
  const readRecentSamples = ( seconds ) => {
    const chunks = pendingChunks;
    if ( chunks.length === 0 ) return null;
    const sampleRate = caughtAudio?.nodes?.[ 0 ]?.context?.sampleRate ?? 48000;
    const want = Math.max( 1, Math.round( seconds * sampleRate ) );
    let first = chunks.length, have = 0;
    while ( first > 0 && have < want ) { first--; have += chunks[ first ].x.length; }
    const x = new Float32Array( have );
    const y = new Float32Array( have );
    let off = 0;
    for ( let i = first; i < chunks.length; i++ ) {
      x.set( chunks[ i ].x, off ); y.set( chunks[ i ].y, off ); off += chunks[ i ].x.length;
    }
    return { x, y, sampleRate, seconds: have / sampleRate };
  };

  // --- OSC -----------------------------------------------------------------------------------
  // scsynth's own embind OSC builder, so these are in-process calls rather than anything network.
  // Every OscMessage must be .delete()d - it's a C++ object, not garbage collected.
  const sendOsc = ( address, args = [] ) => {
    const sc = scEngine;
    if ( !sc ) return false;
    const msg = new sc.OscMessage();
    try {
      let m = msg.beginMessage( address );
      for ( const arg of args ) {
        if ( arg instanceof Uint8Array ) m = m.addBlob( arg );
        else if ( typeof arg === 'string' ) m = m.addString( arg );
        else if ( Number.isInteger( arg ) ) m = m.addInt( arg );
        else m = m.addFloat( arg );
      }
      sc.sendOsc( m.endMessage().getData() );
      return true;
    } finally {
      msg.delete();
    }
  };

  // The demo in the upstream artifact sleeps 500ms after /d_recv and calls that good enough,
  // noting the proper answer is left "as an exercise to the reader". A magic delay is exactly the
  // kind of thing that works on the machine it was written on and fails on a slow one, so this
  // does the real handshake: /sync carries an id, scsynth answers /synced with it when everything
  // queued before it has actually been processed.
  const sync = ( timeoutMs = 20000 ) => {
    const sc = scEngine;
    if ( !sc ) return Promise.reject( new Error( 'scsynth not booted' ) );
    const id = syncId++;
    return new Promise( ( resolve, reject ) => {
      const timer = setTimeout( () => {
        syncWaiters.delete( id );
        reject( new Error( `/sync ${ id } timed out after ${ timeoutMs }ms` ) );
      }, timeoutMs );
      syncWaiters.set( id, {
        timer,
        reject,
        resolve: () => {
          clearTimeout( timer );
          syncWaiters.delete( id );
          resolve();
        }
      } );
      sendOsc( '/sync', [ id ] );
    } );
  };

  // Every SynthDef this session has sent, so a server that comes back can be given them again.
  //
  // A rebooted server is a FRESH server - it has no defs, no nodes and no groups - and /s_new
  // against a def it doesn't have fails in the quietest possible way: a /fail nobody is looking at,
  // and silence. Keyed rather than appended because playing a def re-sends it each time, and
  // re-sending the same bytes twenty times on a reboot is just slow.
  const defKey = ( bytes ) => `${ bytes.length }:${ Array.from( bytes.subarray( 0, 24 ) ).join( ',' ) }`;

  // SynthDefs are sent as compiled .scsyndef bytes, not source. The host owns where those bytes
  // come from. Waits for the definition to actually be registered before returning, so a
  // caller can /s_new immediately afterwards without guessing.
  const loadSynthDef = async ( bytes, key ) => {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array( bytes );
    loadedDefs.set( key ?? defKey( data ), data );
    sendOsc( '/d_recv', [ data ] );
    await sync();
  };

  // Put them all back. Called after a boot that wasn't the first one - see scLangBridge.js, where
  // sclang can ask for a reboot mid-session. One /sync for the lot rather than one each: /d_recv is
  // ordered, so the last sync covers everything queued before it.
  const reloadSynthDefs = async () => {
    const defs = [ ...loadedDefs.values() ];
    if ( defs.length === 0 ) return 0;
    for ( const bytes of defs ) sendOsc( '/d_recv', [ bytes ] );
    await sync();
    appendLog( `reloaded ${ defs.length } SynthDef${ defs.length > 1 ? 's' : '' }` );
    return defs.length;
  };

  // Node ids are allocated here rather than left to scsynth, which is what sclang does too.
  // Passing -1 lets the server pick, but then the id is never reported back and the synth can only
  // ever be addressed en masse - no pausing or freeing one thing. Starting well above 0 keeps
  // clear of the root group.
  const playSynth = ( name, params = {} ) => {
    // nodeID, addAction 1 (addToTail), target 0 (the ROOT group).
    //
    // Not group 1. Every SuperCollider tutorial targets group 1 because sclang creates a "default
    // group" on boot - but a bare scsynth has no such thing, so targeting it fails with "Node 1
    // not found" and the synth simply never sounds. Verified: targeting group 1 gave silence,
    // targeting the root group gave the expected amplitude.
    const nodeId = nextNodeId++;
    const args = [ name, nodeId, 1, 0 ];
    for ( const [ key, value ] of Object.entries( params ) ) args.push( key, value );
    sendOsc( '/s_new', args );
    setNodes( ( prev ) => ( { ...prev, [ name ]: { id: nodeId, paused: false } } ) );
    return nodeId;
  };

  // A real pause, not a stop: /n_run 0 leaves the synth alive with its state intact and simply
  // stops it being processed, so resuming carries on where it left off. Freeing it would lose the
  // envelope position and any accumulated state.
  const pauseSynth = ( name ) => {
    const node = state.nodes[ name ];
    if ( !node ) return false;
    sendOsc( '/n_run', [ node.id, 0 ] );
    setNodes( ( prev ) => ( { ...prev, [ name ]: { ...prev[ name ], paused: true } } ) );
    return true;
  };

  const resumeSynth = ( name ) => {
    const node = state.nodes[ name ];
    if ( !node ) return false;
    sendOsc( '/n_run', [ node.id, 1 ] );
    setNodes( ( prev ) => ( { ...prev, [ name ]: { ...prev[ name ], paused: false } } ) );
    return true;
  };

  const freeSynth = ( name ) => {
    const node = state.nodes[ name ];
    if ( !node ) return false;
    sendOsc( '/n_free', [ node.id ] );
    setNodes( ( prev ) => { const next = { ...prev }; delete next[ name ]; return next; } );
    return true;
  };

  const freeAll = () => {
    sendOsc( '/g_freeAll', [ 0 ] );
    setNodes( {} );
  };

  // Poll until scsynth answers. See the note in boot() for why a single /sync isn't enough.
  const waitUntilServerReady = async ( timeoutMs = 30000 ) => {
    const deadline = Date.now() + timeoutMs;
    while ( Date.now() < deadline ) {
      try {
        await sync( 400 );
        return true;
      } catch {
        await new Promise( ( r ) => setTimeout( r, 150 ) );
      }
    }
    return false;
  };

  // --- boot ----------------------------------------------------------------------------------
  const boot = ( { numOutputBusChannels = 2 } = {} ) => {
    if ( disposed ) return Promise.reject( new Error( 'createScEngine: engine is disposed' ) );
    // Hand every caller the SAME in-flight promise. Returning scEngine instead meant a caller
    // arriving during boot got null - the ref isn't populated until the engine has loaded - and
    // treated a perfectly healthy boot as a failure, which is what made playing a def flaky.
    if ( bootPromise ) return bootPromise;
    bootPromise = ( async () => {
    setStatus( 'loading' );
    setError( null );

    try {
      if ( !window.crossOriginIsolated ) {
        throw new Error( 'Not cross-origin isolated - scsynth needs COOP/COEP headers (SharedArrayBuffer)' );
      }

      // Capture the audio objects Emscripten builds, BEFORE booting.
      //
      // scsynth.js exposes getWorkletNode() as `EmAudio[Module._getScsynthWorkletNode()]`, but the
      // published CI artifact never exports that function - its only wasm exports are _free,
      // _malloc and _webOscBindingAnchor - so getWorkletNode() throws and getAudioContext() hands
      // back a bare Emscripten handle (the number 1) rather than a context. Both are unusable.
      //
      // Emscripten constructs the real AudioContext and AudioWorkletNodes in main-thread JS
      // though, so wrapping the constructors gets us the genuine objects. Restored immediately
      // after boot so nothing else in the app sees a patched constructor.
      const caught = { contexts: [], nodes: [] };
      let serverReady = false;
      const OrigCtx = window.AudioContext;
      const OrigNode = window.AudioWorkletNode;
      window.AudioContext = new Proxy( OrigCtx, {
        construct( target, args ) { const i = new target( ...args ); caught.contexts.push( i ); return i; }
      } );
      window.AudioWorkletNode = new Proxy( OrigNode, {
        construct( target, args ) { const i = new target( ...args ); caught.nodes.push( i ); return i; }
      } );

      // Dynamic import so the 1.5MB engine is only fetched when someone actually starts it,
      // the same reasoning as the lazily-loaded ffmpeg core.
      let sc;
      try {
        if ( typeof importScsynth !== 'function' ) {
          throw new Error( 'createScEngine: importScsynth is required - the host must perform the import.' );
        }
        const mod = await importScsynth();
        sc = await mod.default();
        scEngine = sc;
        sc.onPrint = ( line ) => {
          appendLog( line );
          for ( const fn of printSubscribers ) {
            try { fn( line ); } catch { /* a subscriber must not break the log */ }
          }
        };

        setStatus( 'booting' );
        // Every option spelled out rather than left to scsynth.js's defaults, because sclang has
        // to be told these same numbers and a default that only exists inside the glue code can't
        // be handed to it. The values ARE scsynth.js's defaults - this is making them legible, not
        // changing them. 0 inputs: a generative source never asks for a microphone.
        const bootOptions = {
          numInputBusChannels: 0,
          numOutputBusChannels,
          realTimeMemorySize: 8192,
          bufLength: 64,
          maxWireBufs: 64,
          numBuffers: 1024,
          maxNodes: 1024,
          maxGraphDefs: 1024,
          numAudioBusChannels: 1024,
          numControlBusChannels: 16384,
          verbosity: 0
        };
        bootOptionsState = bootOptions;
        sc.boot( bootOptions );

        // The nodes are built during boot, not during import, so the proxies have to stay
        // installed across it. Emscripten gives no ready callback (its own demo sleeps a second
        // and leaves a "@todo signal isReady" note), so poll for the construction instead.
        let waited = 0;
        while ( caught.nodes.length === 0 && waited < 20000 ) {
          await new Promise( ( r ) => setTimeout( r, 50 ) );
          waited += 50;
        }
        if ( caught.nodes.length === 0 ) throw new Error( 'scsynth never created an AudioWorkletNode' );

        // The engine has to be AUDIBLE before it will answer anything.
        //
        // scsynth processes OSC on its audio thread, so while the AudioContext is suspended or its
        // output is connected to nothing, no message is ever handled - /sync just times out
        // forever. So resume and connect to the destination first, and only then wait for the
        // server. (Waiting before this was my own bug: the engine sat silent and boot never
        // completed, while a stale trail left on the canvas made it look like it had.)
        const ctxEarly = caught.nodes[ 0 ].context;
        if ( ctxEarly.state === 'suspended' ) await ctxEarly.resume();
        for ( const node of caught.nodes ) { node.connect( ctxEarly.destination ); node.__scDestConnected = true; }

        // Install the OSC reply handler before syncing, but AFTER boot() - assigned any earlier and
        // replies are silently dropped, so /sync never resolves even with the engine running.
        sc.onOscReply = ( message ) => {
          const parsed = sc.parseOscMessage( message );
          if ( parsed.address === '/synced' ) {
            syncWaiters.get( Number( parsed.arguments[ 0 ] ) )?.resolve();
          } else if ( parsed.address === '/n_end' ) {
            // A synth that freed itself (doneAction: 2, or a finished envelope) - drop it so its
            // button goes back to ▶ instead of offering to pause something already gone.
            const endedId = Number( parsed.arguments[ 0 ] );
            setNodes( ( prev ) => {
              const name = Object.keys( prev ).find( ( k ) => prev[ k ].id === endedId );
              if ( !name ) return prev;
              const next = { ...prev }; delete next[ name ]; return next;
            } );
          } else if ( parsed.address === '/fail' ) {
            appendLog( `FAIL ${ parsed.arguments.join( ' ' ) }` );
          }
          // Everyone else gets the RAW bytes, not the parse: sclang wants to decode it itself.
          // Guarded so a throwing subscriber can't take /synced down with it.
          for ( const fn of oscSubscribers ) {
            try { fn( message ); } catch ( err ) { appendLog( `osc subscriber threw: ${ err.message }` ); }
          }
        };

        // Now wait for the server to accept commands, with the constructor proxies STILL installed.
        //
        // scsynth logs "scsynthSendOsc: server not ready" and DROPS anything sent before its world
        // exists; it does not queue. It also builds its worklet nodes across that same window, and
        // only one of them carries the output. Bailing out of the capture as soon as the FIRST node
        // appeared meant that on a slow boot we connected the silent one and restored the
        // constructors before the real one existed - the engine ran, /d_recv returned /done, and
        // the tap read pure silence. Staying installed until the server answers catches them all.
        serverReady = await waitUntilServerReady( 30000 );
        // Subscribe to node lifecycle messages (/n_go, /n_end, ...). Without this scsynth never
        // tells us a synth has ended, so a one-shot would sit in the UI looking playable forever.
        if ( serverReady ) sendOsc( '/notify', [ 1 ] );
      } finally {
        window.AudioContext = OrigCtx;
        window.AudioWorkletNode = OrigNode;
      }
      if ( !serverReady ) throw new Error( 'scsynth never answered /sync' );

      caughtAudio = caught;
      const ctx = caught.nodes[ 0 ].context;

      // Tap the engine's output into the sample contract, and separately let it be heard.
      // ScriptProcessorNode rather than a custom AudioWorklet purely for consistency with
      // useAudioInput, which already does exactly this - worth migrating both together, not one.
      const tap = ctx.createScriptProcessor( TAP_BUFFER_SIZE, 2, 2 );
      tap.onaudioprocess = ( event ) => {
        const input = event.inputBuffer;
        const chunk = {
          x: input.getChannelData( 0 ).slice(),
          y: input.getChannelData( input.numberOfChannels > 1 ? 1 : 0 ).slice()
        };
        pendingChunks.push( chunk );
        // Bound the backlog exactly as live input does - a backgrounded tab that stops draining
        // must not grow memory without limit.
        const maxChunks = Math.ceil( ( MAX_PENDING_SECONDS * ctx.sampleRate ) / TAP_BUFFER_SIZE );
        while ( pendingChunks.length > maxChunks ) pendingChunks.shift();
      };

      // Emscripten builds more than one worklet node and only one of them carries scsynth's
      // output (measured: the first was silent, the second had the signal). Rather than guess an
      // index that could change between builds, connect every one of them - the silent ones
      // contribute nothing to the sum.
      for ( const node of caught.nodes ) {
        node.connect( tap );
        if ( !node.__scDestConnected ) { node.connect( ctx.destination ); node.__scDestConnected = true; }
      }
      tap.connect( ctx.destination );    // a ScriptProcessor only runs while connected downstream

      tapNode = tap;
      audioContext = ctx;
      audioContextStateHandler = () => publish( { audioContextState: ctx.state } );
      ctx.addEventListener( 'statechange', audioContextStateHandler );
      audioContextStateHandler();

      // Ready as soon as the graph is connected - deliberately NOT gated on a handshake.
      //
      // The first /sync after boot can be very slow, because scsynth only starts processing OSC
      // once its audio thread is properly up, and on a loaded machine that took longer than any
      // sensible timeout. Blocking here made booting appear to fail (or hang for 20s) when the
      // engine was demonstrably fine. It's fired off in the background purely as a liveness note;
      // anything that actually depends on ordering (loadSynthDef) does its own sync.
      setIsBooted( true );
      setStatus( 'ready' );
      appendLog( `engine responding (${ caught.nodes.length } worklet nodes)` );
      appendLog( `scsynth booted (${ numOutputBusChannels }ch out, ${ ctx.sampleRate }Hz)` );
      return sc;
    } catch ( e ) {
      console.error( 'scsynth boot failed:', e );
      setError( e.message || String( e ) );
      setStatus( 'failed' );
      bootPromise = null; // let the user retry
      return null;
    }
    } )();
    return bootPromise;
  };

  // Browsers may suspend an already booted AudioContext when the page loses its user-activation
  // grant. Resuming that graph is not a second scsynth boot and must remain a user gesture.
  const resumeAudio = async () => {
    if ( !audioContext ) return boot();
    if ( audioContext.state === 'suspended' || audioContext.state === 'interrupted' ) {
      await audioContext.resume();
      publish( { audioContextState: audioContext.state } );
    }
    return scEngine;
  };

  const stop = () => {
    freeAll();
    pendingChunks = [];
  };

  // Take the tap out of the graph whenever scsynth isn't the selected source.
  //
  // The tap is a ScriptProcessorNode, so it hops to the MAIN thread once per TAP_BUFFER_SIZE
  // frames - the same thread running the WebGL draw. Leaving it connected while nothing reads from it spends
  // frame budget on samples that are thrown away, which is a large part of why a booted engine
  // made the visuals feel heavy even when it wasn't the source. The engine itself is untouched:
  // this is monitoring, not playback, and reconnecting costs nothing.
  //
  // Reconnecting an existing connection is a no-op per the Web Audio spec, so this is safe to
  // call repeatedly.
  const setMonitoring = ( active ) => {
    const tap = tapNode;
    const caught = caughtAudio;
    if ( !tap || !caught ) return;
    if ( active ) {
      for ( const node of caught.nodes ) node.connect( tap );
      tap.connect( tap.context.destination );   // a ScriptProcessor only runs while connected on
    } else {                                    // both sides, so this is what actually stops it
      for ( const node of caught.nodes ) {
        try { node.disconnect( tap ); } catch { /* wasn't connected to it */ }
      }
      try { tap.disconnect(); } catch { /* already out of the graph */ }
      pendingChunks = [];
    }
  };

  // Quit the server - the desktop's cmd-period-then-quit, not a pause.
  //
  // Freeing the synths is NOT enough to make a booted engine cheap: scsynth's audio worklet runs
  // its graph every quantum whether or not anything is playing, and its pthreads stay resident.
  // Closing the AudioContext is what actually stops that work, which is why this exists as
  // something the user can reach rather than only happening on page unload.
  //
  // The honest limitation: Emscripten offers no teardown for a module instance, so the wasm heap
  // this one allocated is not handed back. boot() afterwards constructs a FRESH module rather than
  // reviving this one - which works, and is why every ref is dropped below - but it means a
  // boot/quit cycle isn't free. It doesn't grow during normal use; it just doesn't shrink.
  const shutdown = async () => {
    if ( scEngine ) {
      try { freeAll(); } catch { /* engine may already be past listening */ }
    }

    const tap = tapNode;
    if ( tap ) {
      tap.onaudioprocess = null;
      try { tap.disconnect(); } catch { /* already out */ }
    }
    for ( const node of caughtAudio?.nodes || [] ) {
      try { node.disconnect(); } catch { /* already out */ }
    }
    const ctx = audioContext;
    if ( ctx && audioContextStateHandler ) ctx.removeEventListener( 'statechange', audioContextStateHandler );
    if ( ctx && ctx.state !== 'closed' ) {
      try { await ctx.close(); } catch { /* already closing */ }
    }

    // Drop everything, so the next boot() builds a new engine instead of handing back a dead one.
    // bootPromise in particular: it's the memo that makes concurrent callers share one boot, and
    // leaving it set would resolve future callers to the instance we just closed.
    scEngine = null;
    tapNode = null;
    audioContext = null;
    audioContextStateHandler = null;
    caughtAudio = null;
    bootPromise = null;
    bootOptionsState = null;
    pendingChunks = [];
    setNodes( {} );
    setIsBooted( false );
    publish( { status: 'idle', audioContextState: 'unavailable' } );
    setError( null );
    appendLog( 'server quit' );
  };

  // Permanent teardown for a non-React owner. Unlike shutdown(), this instance cannot boot again:
  // its cache and observers are released as well as the browser audio graph. Idempotent, including
  // while a boot is in flight.
  const dispose = () => {
    if ( disposePromise ) return disposePromise;
    disposed = true;
    disposePromise = ( async () => {
      if ( bootPromise ) {
        try { await bootPromise; } catch { /* boot reports its own failure state */ }
      }
      await shutdown();
      loadedDefs.clear();
      for ( const waiter of syncWaiters.values() ) {
        clearTimeout( waiter.timer );
        waiter.reject( new Error( 'createScEngine: engine disposed before /synced' ) );
      }
      syncWaiters.clear();
      oscSubscribers.clear();
      printSubscribers.clear();
      stateSubscribers.clear();
    } )();
    return disposePromise;
  };

  return {
    boot, resumeAudio, stop, shutdown, dispose, setMonitoring,
    drainNewSamples, readRecentSamples, sendOsc, sync, loadSynthDef, reloadSynthDefs,
    playSynth, pauseSynth, resumeSynth, freeSynth, freeAll,
    subscribeOscReply, subscribePrint, subscribe, getState, getEngine, getBootOptions
  };
}
