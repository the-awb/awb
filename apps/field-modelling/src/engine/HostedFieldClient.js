const EMPTY = Object.freeze( { status: 'disconnected', error: '', transport: null,
  realizations: Object.freeze( [] ), discarded: 0, clockOffset: null,
  phaseStatus: 'idle', phaseSnapshot: null } );

const nowSeconds = () => performance.now() / 1000;
const LIVE_STATES = new Set( [ 'started', 'released' ] );

export class HostedFieldClient {
  constructor( { WebSocketImpl = globalThis.WebSocket, clientID = `field-web-${ crypto.randomUUID() }`,
    heartbeatMs = 2000, observationMs = 500 } = {} ) {
    this.WebSocketImpl = WebSocketImpl; this.clientID = clientID; this.heartbeatMs = heartbeatMs;
    this.observationMs = observationMs; this.listeners = new Set(); this.state = EMPTY;
    this.nonce = 0; this.phaseNonce = 0; this.socket = null; this.pings = new Map();
    this.phasePending = new Map(); this.observedNodeIDs = Object.freeze( [] );
  }
  subscribe = ( listener ) => { this.listeners.add( listener ); return () => this.listeners.delete( listener ); };
  getState = () => this.state;
  publish( patch ) { this.state = Object.freeze( { ...this.state, ...patch } ); this.listeners.forEach( ( listener ) => listener() ); }
  send( address, args ) {
    if ( this.socket?.readyState !== this.WebSocketImpl.OPEN ) throw new Error( 'Hosted Field bridge is not connected.' );
    this.socket.send( JSON.stringify( { address, args } ) );
  }
  connect( endpoint, { scoreID, revision, runID } ) {
    this.disconnect(); this.binding = Object.freeze( { scoreID, revision, runID } );
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
      this.send( '/awb/timeline/hello', [ this.clientID, args[ 0 ], '' ] );
    } else if ( address === '/awb/timeline/connected' && args[ 0 ] === this.clientID ) {
      this.observeID = `observe-${ crypto.randomUUID() }`;
      this.send( '/awb/timeline/observe', [ this.clientID, this.observeID,
        this.binding.scoreID, this.binding.revision ] );
      clearInterval( this.heartbeat );
      this.heartbeat = setInterval( () => {
        if ( this.socket?.readyState === this.WebSocketImpl.OPEN ) this.ping();
      }, this.heartbeatMs );
      this.ping();
    } else if ( address === '/awb/timeline/result' && args[ 0 ] === this.clientID && args[ 1 ] === this.observeID ) {
      this.publish( args[ 2 ] ? { status: 'observing', error: '' }
        : { status: 'error', error: `${ args[ 6 ] }: ${ args[ 7 ] }` } );
      if ( args[ 2 ] ) this.startObservingPhase();
    } else if ( address === '/awb/timeline/transport' && args[ 0 ] === this.clientID ) {
      const transport = { scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], state: args[ 4 ],
        scorePosition: args[ 5 ], hostMonotonicTime: args[ 6 ], rate: args[ 7 ], currentIndex: args[ 8 ] };
      if ( !this.accepts( transport ) ) { this.publish( { discarded: this.state.discarded + 1 } ); return; }
      this.publish( { transport: Object.freeze( transport ) } );
    } else if ( address === '/awb/timeline/realization' && args[ 0 ] === this.clientID ) {
      const realization = { scoreID: args[ 1 ], revision: args[ 2 ], runID: args[ 3 ], entryID: args[ 4 ],
        realizationID: args[ 5 ], state: args[ 6 ], scoreIndex: args[ 7 ], scoreTime: args[ 8 ],
        nodeIDs: Object.freeze( args.slice( 10, 10 + args[ 9 ] ) ) };
      if ( !this.accepts( realization ) ) { this.publish( { discarded: this.state.discarded + 1 } ); return; }
      this.publish( { realizations: Object.freeze( [ ...this.state.realizations.filter(
        ( item ) => item.realizationID !== realization.realizationID ), Object.freeze( realization ) ].slice( -256 ) ) } );
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
    const requestID = `field-${ ++this.phaseNonce }`;
    this.phasePending.set( requestID, { requestID, components: new Map(), expected: null } );
    this.send( '/awb/field/observe', [ this.clientID, requestID,
      this.binding.scoreID, this.binding.revision, this.binding.runID,
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
  accepts( message ) { return message.scoreID === this.binding.scoreID
    && message.revision === this.binding.revision && message.runID === this.binding.runID; }
  disconnect() {
    clearInterval( this.heartbeat ); this.heartbeat = null;
    clearInterval( this.phaseTimer ); this.phaseTimer = null;
    this.pings.clear(); this.phasePending.clear(); this.observedNodeIDs = Object.freeze( [] );
    if ( this.socket ) { const socket = this.socket; this.socket = null; socket.close(); }
    this.state = EMPTY;
  }
}
