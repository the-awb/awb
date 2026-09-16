import crypto from 'node:crypto';

export class HostControlProjection {
  constructor( { sendOsc, token = '', clientID = `awb-shell-host-${ crypto.randomUUID() }`,
    onChange = () => {}, connectTimeoutMs = 1500, healthIntervalMs = 2000,
    healthTimeoutMs = 5000 } ) {
    this.sendOsc = sendOsc; this.token = token; this.clientID = clientID; this.onChange = onChange;
    this.connectTimeoutMs = connectTimeoutMs; this.healthIntervalMs = healthIntervalMs;
    this.healthTimeoutMs = healthTimeoutMs; this.status = 'unavailable'; this.mode = null;
    this.nodeManager = 'unknown'; this.nodeManagerPolicy = 'unknown'; this.scsynth = 'unavailable';
    this.processID = null; this.protocolVersion = null; this.lastStatusAt = 0;
    this.pending = new Map(); this.closed = false;
  }

  connect() {
    if ( this.closed ) return;
    this.status = 'connecting'; this.sendHello(); this.onChange( this.snapshot() );
    clearTimeout( this.connectTimer );
    this.connectTimer = setTimeout( () => {
      if ( this.status === 'connecting' ) { this.status = 'unavailable'; this.onChange( this.snapshot() ); }
    }, this.connectTimeoutMs ); this.connectTimer.unref?.();
    clearInterval( this.healthTimer );
    this.healthTimer = setInterval( () => {
      if ( this.status === 'ready' && Date.now() - this.lastStatusAt > this.healthTimeoutMs ) {
        this.status = 'unavailable'; this.mode = null; this.processID = null; this.onChange( this.snapshot() );
      }
      this.sendHello();
    }, this.healthIntervalMs ); this.healthTimer.unref?.();
  }

  sendHello() { if ( !this.closed ) this.sendOsc( '/awb/host/hello', [ this.clientID, this.token ] ); }

  receive( { address, args = [] } ) {
    if ( !address.startsWith( '/awb/host/' ) || args[ 0 ] !== this.clientID ) return false;
    if ( address === '/awb/host/status' ) {
      clearTimeout( this.connectTimer ); this.status = 'ready'; this.lastStatusAt = Date.now();
      this.protocolVersion = args[ 2 ]; this.mode = `${ args[ 3 ] }`; this.nodeManager = `${ args[ 4 ] }`;
      this.nodeManagerPolicy = `${ args[ 5 ] }`; this.scsynth = `${ args[ 6 ] }`;
      this.processID = Number.isInteger( args[ 7 ] ) ? args[ 7 ] : null;
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) { clearTimeout( pending.timer ); this.pending.delete( requestID ); pending.resolve( this.snapshot() ); }
      this.onChange( this.snapshot() ); return true;
    }
    if ( address === '/awb/host/shutting-down' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) { clearTimeout( pending.timer ); this.pending.delete( requestID ); pending.resolve( { status: 'shutting-down' } ); }
      return true;
    }
    if ( address === '/awb/host/error' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) { clearTimeout( pending.timer ); this.pending.delete( requestID ); pending.reject( new Error( `${ args[ 2 ] }` ) ); }
      return true;
    }
    return true;
  }

  request( address, args ) {
    if ( this.status !== 'ready' ) return Promise.reject( new Error( 'SuperCollider host control is unavailable.' ) );
    const requestID = crypto.randomUUID();
    return new Promise( ( resolve, reject ) => {
      const timer = setTimeout( () => { this.pending.delete( requestID ); reject( new Error( 'SuperCollider host control timed out.' ) ); }, 2500 );
      timer.unref?.(); this.pending.set( requestID, { resolve, reject, timer } );
      this.sendOsc( address, [ this.clientID, requestID, ...args, this.token ] );
    } );
  }

  setNodeManager( action ) {
    if ( ![ 'enable', 'disable', 'always', 'whenNeeded', 'manual', 'status' ].includes( action ) ) {
      return Promise.reject( new Error( 'Unknown NodeManager host action.' ) );
    }
    return this.request( '/awb/host/nodemanager', [ action ] );
  }

  shutdown() { return this.request( '/awb/host/shutdown', [] ); }

  snapshot() {
    return Object.freeze( { status: this.status, protocolVersion: this.protocolVersion,
      mode: this.mode, nodeManager: this.nodeManager, nodeManagerPolicy: this.nodeManagerPolicy,
      scsynth: this.scsynth, processID: this.processID } );
  }

  close() {
    this.closed = true; clearTimeout( this.connectTimer ); clearInterval( this.healthTimer );
    for ( const pending of this.pending.values() ) { clearTimeout( pending.timer ); pending.reject( new Error( 'Host control closed.' ) ); }
    this.pending.clear(); this.status = 'unavailable';
  }
}
