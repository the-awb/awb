import { hashScoreDocument } from '@awb/score';
import { createPlaybackReadiness } from '@awb/sc-runtime';
import { buildSynthDefInterface, parseSynthDef, synthDefFingerprint } from '@awb/synthdef-interface';

const EMPTY_SYNTHDEF_CONTEXT = Object.freeze( {
  status: 'disconnected', protocolVersion: null, generation: 0, inventory: null,
  definitions: Object.freeze( {} ), error: ''
} );

const EMPTY_AUDITION = Object.freeze( {
  status: 'disconnected', protocolVersion: null, sessionID: '',
  realizations: Object.freeze( [] ), error: ''
} );

const EMPTY_STATE = Object.freeze( {
  status: 'disconnected', protocolVersion: null, error: '', scoreID: null,
  remoteRevision: null, transport: null, realizations: [], clockOffset: null,
  liveInstruments: Object.freeze( {} ),
  audition: EMPTY_AUDITION,
  readiness: createPlaybackReadiness( { hostKind: 'desktop' } ),
  synthDefContext: EMPTY_SYNTHDEF_CONTEXT
} );

const numericString = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;
const nowSeconds = () => performance.now() / 1000;
const requestID = ( prefix ) => `${ prefix }-${ crypto.randomUUID() }`;
const normalizeHash = ( hash ) => `${ hash }`.replace( /^sha256:/, '' );

function assertJsonlibSafe( value, path ) {
  if ( typeof value === 'string' && numericString.test( value ) ) {
    throw new Error( `${ path } is a numeric-looking string; protocol v1 requires a non-numeric prefix` );
  }
  if ( Array.isArray( value ) ) value.forEach( ( item, index ) => assertJsonlibSafe( item, `${ path }[${ index }]` ) );
  else if ( value && typeof value === 'object' ) {
    Object.entries( value ).forEach( ( [ key, item ] ) => assertJsonlibSafe( item, `${ path }.${ key }` ) );
  }
}

function resultFromArgs( args ) {
  return {
    clientID: args[ 0 ], requestID: args[ 1 ], ok: Boolean( args[ 2 ] ), action: args[ 3 ],
    scoreID: args[ 4 ], revision: args[ 5 ], code: args[ 6 ], detail: args[ 7 ]
  };
}

export class HostedProtocolError extends Error {
  constructor( result ) {
    super( `${ result.code }: ${ result.detail }` );
    this.name = 'HostedProtocolError';
    this.result = result;
  }
}

export class HostedScoreClient {
  constructor( {
    clientID = `score-web-${ crypto.randomUUID() }`, WebSocketImpl = globalThis.WebSocket,
    toolSessionID = '',
    requestingToolID = 'score-studio', viewID = '',
    requestTimeoutMs = 1500, maxProjectionCharacters = 4 * 1024 * 1024,
    maxProjectionChunks = 4096
  } = {} ) {
    this.clientID = clientID;
    this.toolSessionID = toolSessionID;
    this.requestingToolID = requestingToolID;
    this.viewID = viewID || clientID;
    this.WebSocketImpl = WebSocketImpl;
    this.requestTimeoutMs = requestTimeoutMs;
    this.maxProjectionCharacters = maxProjectionCharacters;
    this.maxProjectionChunks = maxProjectionChunks;
    this.state = EMPTY_STATE;
    this.listeners = new Set();
    this.pending = new Map();
    this.synthDefPending = new Map();
    this.synthDefGeneration = 0;
    this.pings = new Map();
    this.nonce = 1;
    this.replyPort = null;
    this.socket = null;
    this.connectPromise = null;
    this.heartbeat = null;
    this.subscribe = ( listener ) => { this.listeners.add( listener ); return () => this.listeners.delete( listener ); };
    this.getState = () => this.state;
  }

  publish( patch ) {
    const next = Object.freeze( { ...this.state, ...patch } );
    if ( Object.keys( patch ).every( ( key ) => Object.is( next[ key ], this.state[ key ] ) ) ) return;
    this.state = next;
    this.listeners.forEach( ( listener ) => listener() );
  }

  async connect( endpoint ) {
    this.disconnect();
    this.publish( { ...EMPTY_STATE, status: 'connecting' } );
    const socket = new this.WebSocketImpl( endpoint );
    this.socket = socket;
    this.connectPromise = new Promise( ( resolve, reject ) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
    } );
    socket.addEventListener( 'message', ( event ) => this.onMessage( event.data ) );
    socket.addEventListener( 'error', () => {
      const error = new Error( 'WebSocket connection failed' );
      this.publish( { status: 'error', error: error.message } );
      this.rejectConnect?.( error );
    } );
    socket.addEventListener( 'close', () => {
      if ( this.socket !== socket ) return;
      const error = new Error( 'Hosted bridge disconnected' );
      this.rejectConnect?.( error );
      this.rejectConnect = null;
      this.resolveConnect = null;
      this.clearPending( error );
      clearInterval( this.heartbeat );
      this.publish( { status: 'disconnected' } );
    } );
    const timeout = setTimeout( () => this.rejectConnect?.( new Error( 'Timed out connecting to hosted bridge' ) ), 5000 );
    try {
      await this.connectPromise;
      clearTimeout( timeout );
      this.heartbeat = setInterval( () => this.ping(), 2000 );
      this.ping();
    } catch ( error ) {
      clearTimeout( timeout );
      this.disconnect();
      throw error;
    }
  }

  disconnect() {
    clearInterval( this.heartbeat );
    this.heartbeat = null;
    this.clearPending( new Error( 'Hosted bridge disconnected' ) );
    if ( this.socket ) {
      const socket = this.socket;
      this.socket = null;
      socket.close();
    }
    this.publish( { ...EMPTY_STATE } );
  }

  clearPending( error ) {
    for ( const pending of this.pending.values() ) {
      clearTimeout( pending.timer );
      pending.reject( error );
    }
    this.pending.clear();
    this.clearSynthDefPending( error );
  }

  clearSynthDefPending( error ) {
    for ( const pending of this.synthDefPending.values() ) {
      clearTimeout( pending.timer );
      pending.reject( error );
    }
    this.synthDefPending.clear();
  }

  send( address, args ) {
    if ( !this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN ) {
      throw new Error( 'Hosted bridge is not connected' );
    }
    this.socket.send( JSON.stringify( { address, args } ) );
  }

  onMessage( data ) {
    let frame;
    try { frame = JSON.parse( typeof data === 'string' ? data : data.toString() ); }
    catch { this.publish( { error: 'Hosted bridge sent invalid JSON' } ); return; }
    const { address, args = [] } = frame;
    if ( address === '/awb/bridge/ready' ) {
      this.replyPort = args[ 0 ];
      this.send( '/awb/timeline/hello', [ this.clientID, this.replyPort, this.toolSessionID ] );
      this.send( '/awb/synthdef/hello', [ this.clientID, this.replyPort ] );
      this.send( '/awb/audition/hello', [ this.clientID, this.replyPort,
        this.requestingToolID, this.viewID, this.toolSessionID ] );
    } else if ( address === '/awb/bridge/error' ) {
      this.publish( { error: `${ args[ 0 ] }: ${ args[ 1 ] }` } );
    } else if ( address === '/awb/timeline/connected' && args[ 0 ] === this.clientID ) {
      this.publish( { status: 'connected', protocolVersion: args[ 1 ], error: '' } );
      this.resolveConnect?.();
      this.resolveConnect = null;
      this.rejectConnect = null;
    } else if ( address === '/awb/synthdef/connected' && args[ 0 ] === this.clientID ) {
      this.clearSynthDefPending( new Error( 'SynthDef context generation changed' ) );
      this.synthDefGeneration += 1;
      this.publishSynthDefContext( {
        status: 'connected', protocolVersion: args[ 1 ], generation: this.synthDefGeneration,
        inventory: null, definitions: Object.freeze( {} ), error: ''
      } );
    } else if ( address === '/awb/audition/connected' && args[ 0 ] === this.clientID ) {
      this.publish( { audition: Object.freeze( { ...this.state.audition,
        status: 'connected', protocolVersion: args[ 1 ], sessionID: `${ args[ 2 ] }`, error: '' } ) } );
    } else if ( address === '/awb/audition/result' && args[ 0 ] === this.clientID ) {
      const result = { clientID: args[ 0 ], requestID: args[ 1 ], ok: Boolean( args[ 2 ] ),
        action: args[ 3 ], realizationID: args[ 4 ], code: args[ 5 ], detail: args[ 6 ] };
      const pending = this.pending.get( result.requestID );
      if ( pending ) {
        clearTimeout( pending.timer ); this.pending.delete( result.requestID );
        if ( result.ok ) pending.resolve( result );
        else pending.reject( new HostedProtocolError( result ) );
      }
    } else if ( address === '/awb/audition/state' && args[ 0 ] === this.clientID ) {
      const previous = this.state.audition.realizations.find(
        ( item ) => item.realizationID === `${ args[ 1 ] }`
      );
      const realization = Object.freeze( { ...previous,
        realizationID: `${ args[ 1 ] }`, state: `${ args[ 2 ] }`, definition: `${ args[ 3 ] }`,
        contextID: `${ args[ 4 ] }`, draftID: `${ args[ 5 ] }`, runID: `${ args[ 6 ] }`,
        mode: 'hosted', nodeIDs: Object.freeze( args.slice( 8, 8 + Number( args[ 7 ] ) ) )
      } );
      const realizations = Object.freeze( [
        ...this.state.audition.realizations.filter( ( item ) => item.realizationID !== realization.realizationID ),
        realization
      ].slice( -200 ) );
      this.publish( { audition: Object.freeze( { ...this.state.audition, realizations } ) } );
    } else if ( address.startsWith( '/awb/synthdef/' ) && args[ 0 ] === this.clientID ) {
      this.receiveSynthDefFrame( address, args );
    } else if ( address === '/awb/timeline/runtime' && args[ 0 ] === this.clientID ) {
      const missingCount = Number( args[ 6 ] ) || 0;
      this.publish( { readiness: createPlaybackReadiness( {
        hostKind: 'desktop', engine: args[ 1 ], audio: args[ 2 ], score: args[ 3 ],
        definitions: args[ 4 ], detail: args[ 5 ],
        missingDefinitions: args.slice( 7, 7 + missingCount )
      } ) } );
    } else if ( address === '/awb/timeline/result' && args[ 0 ] === this.clientID ) {
      const result = resultFromArgs( args );
      const pending = this.pending.get( result.requestID );
      if ( pending ) {
        if ( result.ok && pending.projection ) {
          pending.result = result;
          this.maybeResolveProjection( result.requestID );
        } else {
          clearTimeout( pending.timer );
          this.pending.delete( result.requestID );
          if ( result.ok ) pending.resolve( result );
          else pending.reject( new HostedProtocolError( result ) );
        }
      }
    } else if ( address === '/awb/timeline/projection/begin' && args[ 0 ] === this.clientID ) {
      this.receiveProjectionBegin( args );
    } else if ( address === '/awb/timeline/projection/chunk' && args[ 0 ] === this.clientID ) {
      this.receiveProjectionChunk( args );
    } else if ( address === '/awb/timeline/projection/end' && args[ 0 ] === this.clientID ) {
      this.receiveProjectionEnd( args );
    } else if ( address === '/awb/timeline/transport' && args[ 0 ] === this.clientID ) {
      const transport = Object.freeze( {
        scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], state: args[ 4 ],
        scorePosition: args[ 5 ], hostMonotonicTime: args[ 6 ], rate: args[ 7 ], currentIndex: args[ 8 ],
        clockClass: args[ 9 ] ?? null, scheduledStartHostTime: args[ 10 ] ?? -1
      } );
      this.publish( { scoreID: transport.scoreID, remoteRevision: transport.revision, transport } );
    } else if ( address === '/awb/timeline/realization' && args[ 0 ] === this.clientID ) {
      const previous = this.state.realizations.find(
        ( item ) => item.realizationID === `${ args[ 5 ] }`
      );
      const realization = Object.freeze( { ...previous,
        scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], entryID: args[ 4 ],
        realizationID: args[ 5 ], state: args[ 6 ], scoreIndex: args[ 7 ], scoreTime: args[ 8 ],
        nodeIDs: Object.freeze( args.slice( 10, 10 + args[ 9 ] ) )
      } );
      const realizations = [ ...this.state.realizations.filter( ( item ) => item.realizationID !== realization.realizationID ), realization ].slice( -100 );
      this.publish( { realizations: Object.freeze( realizations ) } );
    } else if ( address === '/awb/timeline/instrument/state' && args[ 0 ] === this.clientID ) {
      const instrumentID = `${ args[ 1 ] }`;
      const state = `${ args[ 2 ] }`;
      const liveInstruments = { ...this.state.liveInstruments };
      if ( state === 'ended' ) delete liveInstruments[ instrumentID ];
      else liveInstruments[ instrumentID ] = Object.freeze( {
        instrumentID, state, nodeID: Number( args[ 3 ] )
      } );
      this.publish( { liveInstruments: Object.freeze( liveInstruments ) } );
    } else if ( address === '/awb/timeline/pong' && args[ 0 ] === this.clientID ) {
      const sent = this.pings.get( args[ 1 ] );
      if ( sent !== undefined ) {
        this.pings.delete( args[ 1 ] );
        const sample = args[ 2 ] - ( sent + nowSeconds() ) / 2;
        const clockOffset = this.state.clockOffset === null ? sample : this.state.clockOffset * 0.8 + sample * 0.2;
        this.publish( { clockOffset } );
      }
    }
  }

  publishSynthDefContext( patch ) {
    this.publish( { synthDefContext: Object.freeze( { ...this.state.synthDefContext, ...patch } ) } );
  }

  receiveSynthDefFrame( address, args ) {
    const id = args[ 1 ];
    const pending = this.synthDefPending.get( id );
    if ( !pending ) return;
    if ( pending.generation !== this.state.synthDefContext.generation ) {
      this.rejectSynthDefRequest( id, 'context generation changed' );
      return;
    }
    if ( address === '/awb/synthdef/error' ) {
      this.rejectSynthDefRequest( id, `${ args[ 2 ] }: ${ args[ 3 ] }` );
      return;
    }
    if ( pending.kind === 'list' ) this.receiveSynthDefListFrame( address, args, pending );
    else if ( pending.kind === 'description' ) this.receiveSynthDefDescriptionFrame( address, args, pending );
  }

  receiveSynthDefListFrame( address, args, pending ) {
    if ( address === '/awb/synthdef/list/begin' ) {
      if ( !Number.isInteger( args[ 2 ] ) || args[ 2 ] < 0 || args[ 2 ] > 65536 ) {
        this.rejectSynthDefRequest( args[ 1 ], 'invalid inventory bound' );
      } else pending.count = args[ 2 ];
    } else if ( address === '/awb/synthdef/list/item' ) {
      if ( !Number.isInteger( args[ 2 ] ) || args[ 2 ] < 0 || typeof args[ 3 ] !== 'string' ) {
        this.rejectSynthDefRequest( args[ 1 ], 'invalid inventory item' );
      } else pending.items.set( args[ 2 ], args[ 3 ] );
    } else if ( address === '/awb/synthdef/list/end' ) {
      if ( pending.count === null || args[ 2 ] !== pending.count || pending.items.size !== pending.count ) {
        this.rejectSynthDefRequest( args[ 1 ], 'incomplete inventory' );
        return;
      }
      const inventory = Object.freeze( Array.from( { length: pending.count }, ( _, index ) => pending.items.get( index ) ) );
      if ( inventory.some( ( name ) => typeof name !== 'string' ) ) {
        this.rejectSynthDefRequest( args[ 1 ], 'inventory indexes are not contiguous' );
        return;
      }
      const available = new Set( inventory );
      const definitions = Object.freeze( Object.fromEntries(
        Object.entries( this.state.synthDefContext.definitions )
          .filter( ( [ name ] ) => available.has( name ) )
      ) );
      this.resolveSynthDefRequest( args[ 1 ], inventory );
      this.publishSynthDefContext( { inventory, definitions, error: '' } );
    }
  }

  receiveSynthDefDescriptionFrame( address, args, pending ) {
    const id = args[ 1 ];
    if ( address === '/awb/synthdef/description/begin' ) {
      const begin = { name: args[ 2 ], byteCount: args[ 3 ], chunkCount: args[ 4 ], specCount: args[ 5 ] };
      if ( begin.name !== pending.name || !Number.isInteger( begin.byteCount ) || begin.byteCount < 1
        || begin.byteCount > 4 * 1024 * 1024 || !Number.isInteger( begin.chunkCount )
        || begin.chunkCount < 1 || begin.chunkCount > 8192 || !Number.isInteger( begin.specCount )
        || begin.specCount < 0 || begin.specCount > 65536 ) {
        this.rejectSynthDefRequest( id, 'invalid description bounds or identity' );
      } else pending.begin = begin;
    } else if ( address === '/awb/synthdef/description/chunk' ) {
      if ( !Number.isInteger( args[ 2 ] ) || args[ 2 ] < 0 || typeof args[ 3 ] !== 'string'
        || args[ 3 ].length > 4096 || args[ 3 ].length % 2 !== 0 || !/^[0-9a-f]*$/i.test( args[ 3 ] ) ) {
        this.rejectSynthDefRequest( id, 'invalid graph chunk' );
      } else pending.chunks.set( args[ 2 ], args[ 3 ] );
    } else if ( address === '/awb/synthdef/description/spec' ) {
      if ( typeof args[ 2 ] !== 'string' || ![ 'named', 'curve' ].includes( args[ 5 ] ) ) {
        this.rejectSynthDefRequest( id, 'invalid ControlSpec' );
      } else pending.specs.set( args[ 2 ], Object.freeze( {
        min: args[ 3 ], max: args[ 4 ], warp: args[ 5 ] === 'named' ? args[ 6 ] : Number( args[ 6 ] ),
        step: args[ 7 ], default: args[ 8 ], unit: args[ 9 ]
      } ) );
    } else if ( address === '/awb/synthdef/description/end' ) {
      if ( !pending.begin || args[ 2 ] !== pending.begin.name || args[ 3 ] !== pending.begin.byteCount
        || args[ 4 ] !== pending.begin.chunkCount || args[ 5 ] !== pending.begin.specCount
        || pending.chunks.size !== pending.begin.chunkCount || pending.specs.size !== pending.begin.specCount ) {
        this.rejectSynthDefRequest( id, 'incomplete or mismatched description' );
        return;
      }
      this.finishSynthDefDescription( id, pending );
    }
  }

  async finishSynthDefDescription( id, pending ) {
    try {
      if ( pending.generation !== this.state.synthDefContext.generation ) {
        throw new Error( 'context generation changed' );
      }
      const hex = Array.from( { length: pending.begin.chunkCount }, ( _, index ) => pending.chunks.get( index ) );
      if ( hex.some( ( chunk ) => typeof chunk !== 'string' ) ) throw new Error( 'graph indexes are not contiguous' );
      const bytes = Uint8Array.from( hex.join( '' ).match( /.{2}/g ) ?? [], ( pair ) => Number.parseInt( pair, 16 ) );
      if ( bytes.byteLength !== pending.begin.byteCount ) throw new Error( 'graph byte count does not match framing' );
      const parsed = parseSynthDef( bytes );
      const definition = parsed.definitions.find( ( item ) => item.name === pending.name );
      if ( !definition ) throw new Error( 'compiled graph did not contain the requested definition' );
      const interfaceModel = buildSynthDefInterface( definition, {
        specs: Object.fromEntries( pending.specs )
      } );
      const result = Object.freeze( {
        name: pending.name, fingerprint: await synthDefFingerprint( bytes ),
        contextGeneration: pending.generation, interface: interfaceModel
      } );
      if ( pending.generation !== this.state.synthDefContext.generation ) {
        throw new Error( 'context generation changed' );
      }
      this.resolveSynthDefRequest( id, result );
      this.publishSynthDefContext( {
        definitions: Object.freeze( { ...this.state.synthDefContext.definitions, [ pending.name ]: result } ),
        error: ''
      } );
    } catch ( error ) {
      this.rejectSynthDefRequest( id, error.message );
    }
  }

  resolveSynthDefRequest( id, value ) {
    const pending = this.synthDefPending.get( id );
    if ( !pending ) return;
    clearTimeout( pending.timer );
    this.synthDefPending.delete( id );
    pending.resolve( value );
  }

  rejectSynthDefRequest( id, message ) {
    const pending = this.synthDefPending.get( id );
    if ( !pending ) return;
    clearTimeout( pending.timer );
    this.synthDefPending.delete( id );
    const error = new Error( `SynthDef context: ${ message }` );
    this.publishSynthDefContext( { error: error.message } );
    pending.reject( error );
  }

  synthDefRequest( address, args, pending ) {
    return new Promise( ( resolve, reject ) => {
      const id = args[ 1 ];
      pending.resolve = resolve;
      pending.reject = reject;
      pending.timer = setTimeout( () => {
        this.synthDefPending.delete( id );
        const error = new Error( `Timed out waiting for ${ id }` );
        this.publishSynthDefContext( { error: error.message } );
        reject( error );
      }, this.requestTimeoutMs );
      this.synthDefPending.set( id, pending );
      try { this.send( address, args ); }
      catch ( error ) { clearTimeout( pending.timer ); this.synthDefPending.delete( id ); reject( error ); }
    } );
  }

  listSynthDefs() {
    const id = requestID( 'synthdefs' );
    return this.synthDefRequest( '/awb/synthdef/list', [ this.clientID, id ], {
      kind: 'list', generation: this.state.synthDefContext.generation, count: null, items: new Map()
    } );
  }

  describeSynthDef( name ) {
    const id = requestID( 'synthdef' );
    return this.synthDefRequest( '/awb/synthdef/describe', [ this.clientID, id, name ], {
      kind: 'description', generation: this.state.synthDefContext.generation,
      name, begin: null, chunks: new Map(), specs: new Map()
    } );
  }

  async loadSynthDefContext( names = [] ) {
    const inventory = await this.listSynthDefs();
    const available = new Set( inventory );
    const requested = [ ...new Set( names ) ];
    await Promise.all( requested.filter( ( name ) => available.has( name ) )
      .map( ( name ) => this.describeSynthDef( name ) ) );
    return Object.freeze( {
      inventory,
      definitions: this.state.synthDefContext.definitions,
      missing: Object.freeze( requested.filter( ( name ) => !available.has( name ) ) )
    } );
  }

  rejectProjection( id, message ) {
    const pending = this.pending.get( id );
    if ( !pending ) return;
    clearTimeout( pending.timer );
    this.pending.delete( id );
    pending.reject( new Error( `Invalid projection response: ${ message }` ) );
  }

  receiveProjectionBegin( args ) {
    const id = args[ 1 ];
    const pending = this.pending.get( id );
    if ( !pending?.projection ) return;
    const begin = {
      scoreID: args[ 2 ], revision: args[ 3 ], contentHash: args[ 4 ], kind: args[ 5 ],
      chunkCount: args[ 6 ], characterCount: args[ 7 ]
    };
    const expected = pending.projection.expected;
    if ( begin.scoreID !== expected.scoreID || begin.revision !== expected.revision
      || normalizeHash( begin.contentHash ) !== normalizeHash( expected.contentHash )
      || begin.kind !== expected.kind || !Number.isInteger( begin.chunkCount ) || begin.chunkCount < 1
      || begin.chunkCount > this.maxProjectionChunks
      || !Number.isInteger( begin.characterCount ) || begin.characterCount < 0
      || begin.characterCount > this.maxProjectionCharacters ) {
      this.rejectProjection( id, 'begin identity or bounds do not match the request' );
      return;
    }
    const previous = pending.projection.begin;
    if ( previous && JSON.stringify( previous ) !== JSON.stringify( begin ) ) {
      this.rejectProjection( id, 'repeated begin metadata changed' );
      return;
    }
    pending.projection.begin = begin;
    this.maybeResolveProjection( id );
  }

  receiveProjectionChunk( args ) {
    const id = args[ 1 ];
    const pending = this.pending.get( id );
    if ( !pending?.projection ) return;
    const index = args[ 2 ];
    const value = args[ 3 ];
    if ( !Number.isInteger( index ) || index < 0 || typeof value !== 'string'
      || new TextEncoder().encode( value ).length > 2048 ) {
      this.rejectProjection( id, 'chunk index or text is invalid' );
      return;
    }
    const previous = pending.projection.chunks.get( index );
    if ( previous !== undefined && previous !== value ) {
      this.rejectProjection( id, `repeated chunk ${ index } changed` );
      return;
    }
    pending.projection.chunks.set( index, value );
    this.maybeResolveProjection( id );
  }

  receiveProjectionEnd( args ) {
    const id = args[ 1 ];
    const pending = this.pending.get( id );
    if ( !pending?.projection ) return;
    pending.projection.end = {
      scoreID: args[ 2 ], revision: args[ 3 ], contentHash: args[ 4 ], kind: args[ 5 ], chunkCount: args[ 6 ]
    };
    this.maybeResolveProjection( id );
  }

  maybeResolveProjection( id ) {
    const pending = this.pending.get( id );
    const projection = pending?.projection;
    if ( !projection?.begin || !projection.end || !pending.result ) return;
    const { begin, end } = projection;
    if ( end.scoreID !== begin.scoreID || end.revision !== begin.revision
      || normalizeHash( end.contentHash ) !== normalizeHash( begin.contentHash )
      || end.kind !== begin.kind || end.chunkCount !== begin.chunkCount ) {
      this.rejectProjection( id, 'end metadata does not match begin' );
      return;
    }
    const chunks = [];
    for ( let index = 0; index < begin.chunkCount; index += 1 ) {
      if ( !projection.chunks.has( index ) ) return;
      chunks.push( projection.chunks.get( index ) );
    }
    if ( projection.chunks.size !== begin.chunkCount ) {
      this.rejectProjection( id, 'received an out-of-range chunk' );
      return;
    }
    const text = chunks.join( '' );
    if ( [ ...text ].length !== begin.characterCount ) {
      this.rejectProjection( id, 'concatenated character count does not match begin' );
      return;
    }
    clearTimeout( pending.timer );
    this.pending.delete( id );
    pending.resolve( Object.freeze( {
      scoreID: begin.scoreID, revision: begin.revision, contentHash: begin.contentHash,
      kind: begin.kind, text
    } ) );
  }

  request( address, args, id, retries = 1, projection = null ) {
    return new Promise( ( resolve, reject ) => {
      let attempts = 0;
      const transmit = () => {
        attempts += 1;
        try { this.send( address, args ); }
        catch ( error ) { this.pending.delete( id ); reject( error ); return; }
        const pending = this.pending.get( id );
        pending.timer = setTimeout( () => {
          if ( attempts <= retries ) transmit();
          else {
            this.pending.delete( id );
            reject( new Error( `Timed out waiting for ${ id }` ) );
          }
        }, this.requestTimeoutMs );
      };
      this.pending.set( id, { resolve, reject, timer: null, projection, result: null } );
      transmit();
    } );
  }

  async loadDocument( document, { expectedRevision = -1, maxChunkBytes = 24000 } = {} ) {
    document.entries.forEach( ( entry, index ) => assertJsonlibSafe( entry, `entries[${ index }]` ) );
    const encoded = document.entries.map( ( entry ) => JSON.stringify( entry ) );
    const chunks = [];
    let chunk = [];
    let bytes = 0;
    for ( const entry of encoded ) {
      const size = new TextEncoder().encode( entry ).length + 8;
      if ( size > maxChunkBytes ) throw new Error( 'One score entry exceeds the OSC chunk limit' );
      if ( chunk.length && bytes + size > maxChunkBytes ) { chunks.push( chunk ); chunk = []; bytes = 0; }
      chunk.push( entry );
      bytes += size;
    }
    if ( chunk.length || !encoded.length ) chunks.push( chunk );
    const contentHash = `sha256:${ await hashScoreDocument( document ) }`;

    for ( let recovery = 0; recovery < 2; recovery += 1 ) {
      const snapshotID = requestID( 'snapshot' );
      const beginID = requestID( 'begin' );
      await this.request( '/awb/timeline/snapshot/begin', [
        this.clientID, beginID, snapshotID, document.scoreID, document.revision,
        expectedRevision, document.entries.length, contentHash
      ], beginID );
      for ( let index = 0; index < chunks.length; index += 1 ) {
        const id = requestID( 'chunk' );
        await this.request( '/awb/timeline/snapshot/chunk', [ this.clientID, id, snapshotID, index, ...chunks[ index ] ], id );
      }
      const endID = requestID( 'end' );
      try {
        const result = await this.request( '/awb/timeline/snapshot/end', [ this.clientID, endID, snapshotID, chunks.length ], endID );
        this.publish( { scoreID: document.scoreID, remoteRevision: document.revision, error: '' } );
        return result;
      } catch ( error ) {
        if ( recovery === 0 && [ 'missingChunks', 'unknownSnapshot' ].includes( error.result?.code ) ) continue;
        this.publish( { error: error.message } );
        throw error;
      }
    }
  }

  command( document, command, argument = 0, expectedRevision = document.revision ) {
    const id = requestID( command );
    return this.request( '/awb/timeline/command', [
      this.clientID, id, document.scoreID, expectedRevision, command, argument
    ], id ).catch( ( error ) => { this.publish( { error: error.message } ); throw error; } );
  }

  realizationCommand( document, realization, action ) {
    if ( ![ 'pause', 'resume', 'release', 'free' ].includes( action ) ) {
      throw new Error( `Unknown score realization command: ${ action }` );
    }
    if ( !realization?.realizationID || !realization.runID ) {
      throw new Error( 'Score realization command requires run and realization identities' );
    }
    const id = requestID( `realization-${ action }` );
    return this.request( '/awb/timeline/realization/command', [
      this.clientID, id, document.scoreID, document.revision,
      realization.runID, realization.realizationID, action, 0
    ], id ).catch( ( error ) => { this.publish( { error: error.message } ); throw error; } );
  }

  realizationSet( document, realization, control, value, controlWidth = 1 ) {
    const values = Array.isArray( value ) ? value : [ value ];
    if ( !realization?.realizationID || !realization.runID
      || typeof control !== 'string' || !control.length
      || !Number.isInteger( controlWidth ) || controlWidth < 1 || controlWidth > 256
      || values.length < 1 || values.length > 256
      || values.some( ( item ) => !Number.isFinite( item ) ) ) {
      throw new Error( 'Invalid live score control update' );
    }
    const id = requestID( 'realization-set' );
    return this.request( '/awb/timeline/realization/set', [
      this.clientID, id, document.scoreID, document.revision,
      realization.runID, realization.realizationID, control, controlWidth,
      values.length, ...values
    ], id ).then( ( result ) => {
      const realizations = this.state.realizations.map( ( item ) => item.realizationID === realization.realizationID
        ? Object.freeze( { ...item, params: Object.freeze( { ...( item.params ?? {} ), [ control ]: value } ) } ) : item );
      this.publish( { realizations: Object.freeze( realizations ) } );
      return result;
    } ).catch( ( error ) => { this.publish( { error: error.message } ); throw error; } );
  }

  instrumentCommand( command, instrumentID, definition = '', params = {} ) {
    if ( ![ 'start', 'set', 'pause', 'resume', 'release', 'free' ].includes( command ) ) {
      throw new Error( `Unknown hosted instrument command: ${ command }` );
    }
    if ( typeof instrumentID !== 'string' || !instrumentID.length ) {
      throw new Error( 'Hosted instrument command requires an instrument ID' );
    }
    const controls = Object.entries( params ).flatMap( ( [ name, value ] ) => {
      if ( typeof value !== 'number' || !Number.isFinite( value ) ) {
        throw new Error( `Hosted instrument control ${ name } must be numeric` );
      }
      return [ name, value ];
    } );
    const id = requestID( `instrument-${ command }` );
    return this.request( '/awb/timeline/instrument', [
      this.clientID, id, command, instrumentID, definition, ...controls
    ], id ).catch( ( error ) => { this.publish( { error: error.message } ); throw error; } );
  }

  instrumentArrayCommand( instrumentID, definition, control, values ) {
    if ( typeof instrumentID !== 'string' || !instrumentID.length
      || typeof control !== 'string' || !control.length || !Array.isArray( values )
      || values.length < 1 || values.length > 256
      || values.some( ( value ) => typeof value !== 'number' || !Number.isFinite( value ) ) ) {
      throw new Error( 'Hosted instrument array command requires bounded finite numeric values' );
    }
    const id = requestID( 'instrument-setn' );
    return this.request( '/awb/timeline/instrument', [
      this.clientID, id, 'setn', instrumentID, definition, control, values.length, ...values
    ], id ).catch( ( error ) => { this.publish( { error: error.message } ); throw error; } );
  }

  auditionPlay( { realizationID, definition, contextID, draftID, runID, voices,
    contextGeneration = 0, fingerprint = '' } ) {
    if ( this.state.audition.status !== 'connected' ) {
      return Promise.reject( new Error( 'Hosted audition service is not connected.' ) );
    }
    assertJsonlibSafe( voices, 'audition.voices' );
    const payload = JSON.stringify( voices );
    if ( new TextEncoder().encode( payload ).length > 48 * 1024 ) {
      return Promise.reject( new Error( 'Audition payload exceeds the safe OSC frame size.' ) );
    }
    const id = requestID( 'audition-play' );
    return this.request( '/awb/audition/play', [ this.clientID, id, realizationID,
      definition, contextID, draftID, runID, contextGeneration, fingerprint, payload ], id, 0 );
  }

  auditionCommand( realizationID, action ) {
    if ( ![ 'pause', 'resume', 'release', 'free' ].includes( action ) ) {
      throw new Error( `Unknown audition command: ${ action }` );
    }
    const id = requestID( `audition-${ action }` );
    return this.request( '/awb/audition/command', [ this.clientID, id, action, realizationID ], id, 0 );
  }

  auditionSet( realizationID, control, value, controlWidth = 1 ) {
    const values = Array.isArray( value ) ? value : [ value ];
    if ( !realizationID || typeof control !== 'string' || !control.length
      || !Number.isInteger( controlWidth ) || controlWidth < 1 || controlWidth > 256
      || values.length < 1 || values.length > 256
      || values.some( ( item ) => !Number.isFinite( item ) ) ) {
      throw new Error( 'Invalid live audition control update' );
    }
    const id = requestID( 'audition-set' );
    return this.request( '/awb/audition/set', [ this.clientID, id, realizationID,
      control, controlWidth, values.length, ...values ], id, 0 );
  }

  async installDocument( document, options = {} ) {
    let expectedRevision = -1;
    if ( this.state.scoreID === document.scoreID && Number.isInteger( this.state.remoteRevision ) ) {
      expectedRevision = this.state.remoteRevision;
    } else {
      try {
        const remote = await this.command( document, 'state', 0, -1 );
        expectedRevision = remote.revision;
      } catch ( error ) {
        if ( error.result?.code !== 'unknownScore' ) throw error;
      }
    }
    return this.loadDocument( document, { ...options, expectedRevision } );
  }

  requestProjection( { scoreID, revision, contentHash, kind = 'timeline' } ) {
    const id = requestID( 'projection' );
    const wireHash = `sha256:${ normalizeHash( contentHash ) }`;
    const projection = {
      expected: { scoreID, revision, contentHash: wireHash, kind },
      begin: null, end: null, chunks: new Map()
    };
    return this.request( '/awb/timeline/projection/request', [
      this.clientID, id, scoreID, revision, wireHash, kind
    ], id, 1, projection ).catch( ( error ) => {
      this.publish( { error: error.message } );
      throw error;
    } );
  }

  ping() {
    if ( this.state.status !== 'connected' ) return;
    const nonce = this.nonce++;
    if ( this.pings.size >= 10 ) this.pings.delete( this.pings.keys().next().value );
    this.pings.set( nonce, nowSeconds() );
    this.send( '/awb/timeline/ping', [ this.clientID, nonce ] );
  }

  estimateScorePosition( browserTime = nowSeconds() ) {
    const anchor = this.state.transport;
    if ( !anchor ) return 0;
    if ( anchor.state !== 'playing' || this.state.clockOffset === null ) return anchor.scorePosition;
    return Math.max( 0, anchor.scorePosition + ( browserTime + this.state.clockOffset - anchor.hostMonotonicTime ) * anchor.rate );
  }
}
