import { hashScoreDocument } from '@awb/score';

const EMPTY_STATE = Object.freeze( {
  status: 'disconnected', protocolVersion: null, error: '', scoreID: null,
  remoteRevision: null, transport: null, realizations: [], clockOffset: null
} );

const numericString = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;
const nowSeconds = () => performance.now() / 1000;
const requestID = ( prefix ) => `${ prefix }-${ crypto.randomUUID() }`;

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
    requestTimeoutMs = 1500
  } = {} ) {
    this.clientID = clientID;
    this.WebSocketImpl = WebSocketImpl;
    this.requestTimeoutMs = requestTimeoutMs;
    this.state = EMPTY_STATE;
    this.listeners = new Set();
    this.pending = new Map();
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
      this.send( '/awb/timeline/hello', [ this.clientID, this.replyPort ] );
    } else if ( address === '/awb/bridge/error' ) {
      this.publish( { error: `${ args[ 0 ] }: ${ args[ 1 ] }` } );
    } else if ( address === '/awb/timeline/connected' && args[ 0 ] === this.clientID ) {
      this.publish( { status: 'connected', protocolVersion: args[ 1 ], error: '' } );
      this.resolveConnect?.();
      this.resolveConnect = null;
      this.rejectConnect = null;
    } else if ( address === '/awb/timeline/result' && args[ 0 ] === this.clientID ) {
      const result = resultFromArgs( args );
      const pending = this.pending.get( result.requestID );
      if ( pending ) {
        clearTimeout( pending.timer );
        this.pending.delete( result.requestID );
        if ( result.ok ) pending.resolve( result );
        else pending.reject( new HostedProtocolError( result ) );
      }
    } else if ( address === '/awb/timeline/transport' && args[ 0 ] === this.clientID ) {
      const transport = Object.freeze( {
        scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], state: args[ 4 ],
        scorePosition: args[ 5 ], hostMonotonicTime: args[ 6 ], rate: args[ 7 ], currentIndex: args[ 8 ]
      } );
      this.publish( { scoreID: transport.scoreID, remoteRevision: transport.revision, transport } );
    } else if ( address === '/awb/timeline/realization' && args[ 0 ] === this.clientID ) {
      const realization = Object.freeze( {
        scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], entryID: args[ 4 ],
        realizationID: args[ 5 ], state: args[ 6 ], scoreIndex: args[ 7 ], scoreTime: args[ 8 ],
        nodeIDs: Object.freeze( args.slice( 10, 10 + args[ 9 ] ) )
      } );
      const realizations = [ ...this.state.realizations.filter( ( item ) => item.realizationID !== realization.realizationID ), realization ].slice( -100 );
      this.publish( { realizations: Object.freeze( realizations ) } );
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

  request( address, args, id, retries = 1 ) {
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
      this.pending.set( id, { resolve, reject, timer: null } );
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

  command( document, command, argument = 0 ) {
    const id = requestID( command );
    return this.request( '/awb/timeline/command', [
      this.clientID, id, document.scoreID, document.revision, command, argument
    ], id ).catch( ( error ) => { this.publish( { error: error.message } ); throw error; } );
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
