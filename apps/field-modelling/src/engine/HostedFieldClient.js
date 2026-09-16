const EMPTY = Object.freeze( { status: 'disconnected', error: '', transport: null,
  realizations: Object.freeze( [] ), discarded: 0 } );

export class HostedFieldClient {
  constructor( { WebSocketImpl = globalThis.WebSocket, clientID = `field-web-${ crypto.randomUUID() }`,
    heartbeatMs = 2000 } = {} ) {
    this.WebSocketImpl = WebSocketImpl; this.clientID = clientID; this.heartbeatMs = heartbeatMs;
    this.listeners = new Set(); this.state = EMPTY; this.nonce = 0; this.socket = null;
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
        if ( this.socket?.readyState === this.WebSocketImpl.OPEN ) {
          this.send( '/awb/timeline/ping', [ this.clientID, ++this.nonce ] );
        }
      }, this.heartbeatMs );
    } else if ( address === '/awb/timeline/result' && args[ 0 ] === this.clientID && args[ 1 ] === this.observeID ) {
      this.publish( args[ 2 ] ? { status: 'observing', error: '' }
        : { status: 'error', error: `${ args[ 6 ] }: ${ args[ 7 ] }` } );
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
    } else if ( address === '/awb/bridge/error' ) this.publish( { error: `${ args[ 0 ] }: ${ args[ 1 ] }` } );
  }
  accepts( message ) { return message.scoreID === this.binding.scoreID
    && message.revision === this.binding.revision && message.runID === this.binding.runID; }
  disconnect() {
    clearInterval( this.heartbeat ); this.heartbeat = null;
    if ( this.socket ) { const socket = this.socket; this.socket = null; socket.close(); }
    this.state = EMPTY;
  }
}
