const EMPTY = Object.freeze( { status: 'disconnected', error: '', transport: null,
  realizations: Object.freeze( [] ), discarded: 0, clockOffset: null,
  phaseStatus: 'idle', phaseSnapshot: null, liveInstruments: Object.freeze( {} ) } );

const nowSeconds = () => performance.now() / 1000;
const LIVE_STATES = new Set( [ 'started', 'released' ] );

export class HostedFieldClient {
  constructor( { WebSocketImpl = globalThis.WebSocket, clientID = `field-web-${ crypto.randomUUID() }`,
    heartbeatMs = 2000, observationMs = 500 } = {} ) {
    this.WebSocketImpl = WebSocketImpl; this.clientID = clientID; this.heartbeatMs = heartbeatMs;
    this.observationMs = observationMs; this.listeners = new Set(); this.state = EMPTY;
    this.nonce = 0; this.phaseNonce = 0; this.socket = null; this.pings = new Map();
    this.phasePending = new Map(); this.pending = new Map();
    this.observedNodeIDs = Object.freeze( [] );
  }
  subscribe = ( listener ) => { this.listeners.add( listener ); return () => this.listeners.delete( listener ); };
  getState = () => this.state;
  publish( patch ) { this.state = Object.freeze( { ...this.state, ...patch } ); this.listeners.forEach( ( listener ) => listener() ); }
  send( address, args ) {
    if ( this.socket?.readyState !== this.WebSocketImpl.OPEN ) throw new Error( 'Hosted Field bridge is not connected.' );
    this.socket.send( JSON.stringify( { address, args } ) );
  }
  connect( endpoint, { scoreID = null, revision = null, runID = null,
    followRuns = false, toolInstanceID = '' } = {} ) {
    this.disconnect(); this.binding = Object.freeze( { scoreID, revision, runID, followRuns, toolInstanceID } );
    this.publish( { ...EMPTY, status: 'connecting' } );
    const socket = new this.WebSocketImpl( endpoint ); this.socket = socket;
    socket.addEventListener( 'message', ( event ) => this.receive( event.data ) );
    socket.addEventListener( 'error', () => this.publish( { status: 'error', error: 'Hosted Field bridge failed.' } ) );
    socket.addEventListener( 'close', () => {
      if ( this.socket !== socket ) return;
      clearInterval( this.heartbeat ); this.heartbeat = null; this.socket = null;
      this.publish( { status: 'disconnected' } );
    } );
  }
  receive( data ) {
    let frame;
    try { frame = JSON.parse( typeof data === 'string' ? data : data.toString() ); }
    catch { this.publish( { error: 'Hosted Field bridge sent invalid JSON.' } ); return; }
    const { address, args = [] } = frame;
    if ( address === '/awb/bridge/ready' ) {
      this.send( '/awb/timeline/hello', [ this.clientID, args[ 0 ], this.binding.toolInstanceID ] );
    } else if ( address === '/awb/timeline/connected' && args[ 0 ] === this.clientID ) {
      if ( this.binding.scoreID ) {
        this.observeID = `observe-${ crypto.randomUUID() }`;
        this.send( '/awb/timeline/observe', [ this.clientID, this.observeID,
          this.binding.scoreID, this.binding.revision ] );
      } else this.publish( { status: 'connected', error: '' } );
      clearInterval( this.heartbeat );
      this.heartbeat = setInterval( () => {
        if ( this.socket?.readyState === this.WebSocketImpl.OPEN ) this.ping();
      }, this.heartbeatMs );
      this.ping();
    } else if ( address === '/awb/timeline/result' && args[ 0 ] === this.clientID ) {
      if ( args[ 1 ] === this.observeID ) {
        this.publish( args[ 2 ] ? { status: 'observing', error: '' }
          : { status: 'error', error: `${ args[ 6 ] }: ${ args[ 7 ] }` } );
        if ( args[ 2 ] ) this.startObservingPhase();
      }
      const pending = this.pending.get( `${ args[ 1 ] }` );
      if ( pending ) {
        clearTimeout( pending.timer ); this.pending.delete( `${ args[ 1 ] }` );
        if ( args[ 2 ] ) pending.resolve( Object.freeze( { action: args[ 3 ], code: args[ 6 ] } ) );
        else pending.reject( new Error( `${ args[ 6 ] }: ${ args[ 7 ] }` ) );
      }
    } else if ( address === '/awb/timeline/transport' && args[ 0 ] === this.clientID ) {
      const transport = { scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], state: args[ 4 ],
        scorePosition: args[ 5 ], hostMonotonicTime: args[ 6 ], rate: args[ 7 ], currentIndex: args[ 8 ] };
      if ( !this.acceptsTransport( transport ) ) { this.publish( { discarded: this.state.discarded + 1 } ); return; }
      const changedRun = this.binding.followRuns && this.state.transport?.runID !== transport.runID;
      if ( changedRun ) this.phasePending.clear();
      this.publish( { transport: Object.freeze( transport ),
        ...( changedRun ? { realizations: Object.freeze( [] ), phaseStatus: 'idle', phaseSnapshot: null } : {} ) } );
    } else if ( address === '/awb/timeline/realization' && args[ 0 ] === this.clientID ) {
      const realization = { scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], entryID: args[ 4 ],
        realizationID: args[ 5 ], state: args[ 6 ], scoreIndex: args[ 7 ], scoreTime: args[ 8 ],
        nodeIDs: Object.freeze( args.slice( 10, 10 + args[ 9 ] ) ) };
      if ( !this.accepts( realization ) ) { this.publish( { discarded: this.state.discarded + 1 } ); return; }
      this.publish( { realizations: Object.freeze( [ ...this.state.realizations.filter(
        ( item ) => item.realizationID !== realization.realizationID ), Object.freeze( realization ) ].slice( -256 ) ) } );
    } else if ( address === '/awb/timeline/instrument/state' && args[ 0 ] === this.clientID ) {
      const instrumentID = `${ args[ 1 ] }`; const state = `${ args[ 2 ] }`;
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
        const clockOffset = this.state.clockOffset === null ? sample
          : this.state.clockOffset * 0.8 + sample * 0.2;
        this.publish( { clockOffset } );
        this.startObservingPhase();
      }
    } else if ( address === '/awb/field/result' && args[ 0 ] === this.clientID ) {
      const pending = this.phasePending.get( `${ args[ 1 ] }` );
      if ( !pending ) return;
      if ( args[ 2 ] ) {
        pending.observationHostTime = args[ 5 ]; pending.expected = args[ 6 ];
        this.publish( { phaseStatus: 'scheduled' } );
      } else {
        this.phasePending.delete( pending.requestID );
        this.publish( { phaseStatus: `${ args[ 3 ] }: ${ args[ 4 ] }` } );
      }
    } else if ( address === '/awb/field/snapshot/begin' && args[ 0 ] === this.clientID ) {
      const pending = this.phasePending.get( `${ args[ 1 ] }` );
      const identity = { scoreID: args[ 2 ], revision: args[ 3 ], runID: args[ 4 ] };
      if ( !pending || !this.accepts( identity ) ) return;
      Object.assign( pending, { observationHostTime: args[ 5 ], referenceNodeID: args[ 6 ],
        referenceComponentIndex: args[ 7 ], referenceFrequency: args[ 8 ], expected: args[ 9 ] } );
    } else if ( address === '/awb/field/snapshot/component' && args[ 0 ] === this.clientID ) {
      const pending = this.phasePending.get( `${ args[ 1 ] }` );
      if ( !pending ) return;
      pending.components.set( `${ args[ 2 ] }:${ args[ 3 ] }`, Object.freeze( {
        nodeID: args[ 2 ], componentIndex: args[ 3 ], frequency: args[ 4 ],
        relativePhase: args[ 5 ], amplitude: args[ 6 ], valid: args[ 7 ] === 1
      } ) );
    } else if ( address === '/awb/field/snapshot/end' && args[ 0 ] === this.clientID ) {
      this.completePhaseSnapshot( `${ args[ 1 ] }`, args[ 2 ] );
    } else if ( address === '/awb/bridge/error' ) this.publish( { error: `${ args[ 0 ] }: ${ args[ 1 ] }` } );
  }
  ping() {
    const nonce = ++this.nonce; this.pings.set( nonce, nowSeconds() );
    this.send( '/awb/timeline/ping', [ this.clientID, nonce ] );
  }
  setObservedNodeIDs( nodeIDs ) {
    this.observedNodeIDs = Object.freeze( [ ...new Set( nodeIDs.map( Number ).filter( Number.isInteger ) ) ] );
  }
  startObservingPhase() {
    if ( this.phaseTimer || this.state.clockOffset === null ) return;
    const observe = () => this.requestPhaseSnapshot();
    this.phaseTimer = setInterval( observe, this.observationMs ); observe();
  }
  requestPhaseSnapshot() {
    if ( this.state.status !== 'observing' || !this.observedNodeIDs.length || this.phasePending.size ) return;
    const runID = this.state.transport?.runID || this.binding.runID;
    if ( !runID ) return;
    const requestID = `field-${ ++this.phaseNonce }`;
    this.phasePending.set( requestID, { requestID, components: new Map(), expected: null } );
    this.send( '/awb/field/observe', [ this.clientID, requestID,
      this.binding.scoreID, this.binding.revision, runID,
      this.observedNodeIDs.length, ...this.observedNodeIDs ] );
  }
  completePhaseSnapshot( requestID, reportedCount ) {
    const pending = this.phasePending.get( requestID );
    if ( !pending ) return;
    this.phasePending.delete( requestID );
    if ( pending.expected !== reportedCount || pending.components.size !== pending.expected
      || [ ...pending.components.values() ].some( ( component ) => !component.valid )
      || this.state.clockOffset === null ) {
      this.publish( { phaseStatus: 'invalid snapshot' } ); return;
    }
    const observationBrowserTime = pending.observationHostTime - this.state.clockOffset;
    this.publish( { phaseStatus: 'locked', phaseSnapshot: Object.freeze( {
      id: requestID, observationBrowserTime,
      referenceNodeID: pending.referenceNodeID,
      referenceComponentIndex: pending.referenceComponentIndex,
      referenceFrequency: pending.referenceFrequency,
      components: Object.freeze( [ ...pending.components.values() ] )
    } ) } );
  }
  accepts( message ) {
    if ( message.scoreID !== this.binding.scoreID || message.revision !== this.binding.revision ) return false;
    const runID = this.binding.followRuns ? this.state.transport?.runID : this.binding.runID;
    return !runID || message.runID === runID;
  }
  acceptsTransport( message ) {
    if ( message.scoreID !== this.binding.scoreID || message.revision !== this.binding.revision ) return false;
    return this.binding.followRuns || !this.binding.runID || message.runID === this.binding.runID;
  }
  request( address, args, requestID ) {
    return new Promise( ( resolve, reject ) => {
      const timer = setTimeout( () => {
        this.pending.delete( requestID ); reject( new Error( `Timed out waiting for ${ requestID }` ) );
      }, 1500 );
      this.pending.set( requestID, { resolve, reject, timer } );
      try { this.send( address, args ); }
      catch ( error ) { clearTimeout( timer ); this.pending.delete( requestID ); reject( error ); }
    } );
  }
  instrumentCommand( command, instrumentID, definition = '', params = {} ) {
    if ( ![ 'start', 'set', 'pause', 'resume', 'release', 'free' ].includes( command ) ) {
      throw new Error( `Unknown hosted instrument command: ${ command }` );
    }
    const controls = Object.entries( params ).flatMap( ( [ name, value ] ) => {
      const numeric = typeof value === 'boolean' ? ( value ? 1 : 0 ) : value;
      if ( typeof numeric !== 'number' || !Number.isFinite( numeric ) ) {
        throw new Error( `Hosted instrument control ${ name } must be numeric` );
      }
      return [ name, numeric ];
    } );
    const requestID = `instrument-${ command }-${ crypto.randomUUID() }`;
    return this.request( '/awb/timeline/instrument', [ this.clientID, requestID,
      command, instrumentID, definition, ...controls ], requestID );
  }
  disconnect() {
    clearInterval( this.heartbeat ); this.heartbeat = null;
    clearInterval( this.phaseTimer ); this.phaseTimer = null;
    this.pings.clear(); this.phasePending.clear(); this.observedNodeIDs = Object.freeze( [] );
    for ( const pending of this.pending.values() ) {
      clearTimeout( pending.timer ); pending.reject( new Error( 'Hosted Field bridge disconnected.' ) );
    }
    this.pending.clear();
    if ( this.socket ) { const socket = this.socket; this.socket = null; socket.close(); }
    this.state = EMPTY;
  }
}
