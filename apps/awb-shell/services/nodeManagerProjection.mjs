import crypto from 'node:crypto';

export class NodeManagerProjection {
  constructor( { sendOsc, clientID = `awb-shell-nm-${ crypto.randomUUID() }`, onChange = () => {},
    connectTimeoutMs = 1500, healthIntervalMs = 2000, healthTimeoutMs = 5000,
    reconnectBaseMs = 250, reconnectMaxMs = 4000 } ) {
    this.sendOsc = sendOsc; this.clientID = clientID; this.onChange = onChange;
    this.connectTimeoutMs = connectTimeoutMs; this.healthIntervalMs = healthIntervalMs; this.healthTimeoutMs = healthTimeoutMs;
    this.reconnectBaseMs = reconnectBaseMs; this.reconnectMaxMs = reconnectMaxMs;
    this.status = 'unavailable'; this.protocolVersion = null; this.highWater = 0;
    this.containers = new Map(); this.entries = new Map(); this.staging = null; this.batch = null;
    this.retryAttempt = 0; this.lastPongAt = 0; this.pingNonce = 0; this.closed = false; this.hostDisabled = false;
  }

  connect() {
    if ( this.closed || this.hostDisabled ) return;
    clearTimeout( this.reconnectTimer ); clearTimeout( this.connectTimer ); clearInterval( this.healthTimer );
    this.status = this.retryAttempt ? 'reconnecting' : 'connecting';
    this.sendOsc( '/awb/nm/subscribe', [ this.clientID, 'all', '', 'summary', 'coalesced', 0.016 ] );
    this.connectTimer = setTimeout( () => {
      if ( [ 'connecting', 'reconnecting' ].includes( this.status ) ) this.markUnavailable( 'subscribe-timeout' );
    }, this.connectTimeoutMs );
    this.connectTimer.unref?.();
    this.onChange( this.snapshot() );
  }

  scheduleReconnect() {
    if ( this.closed || this.hostDisabled || this.reconnectTimer ) return;
    const delay = Math.min( this.reconnectMaxMs, this.reconnectBaseMs * ( 2 ** this.retryAttempt ) ); this.retryAttempt += 1;
    this.reconnectTimer = setTimeout( () => { this.reconnectTimer = null; this.connect(); }, delay ); this.reconnectTimer.unref?.();
  }

  startHealthChecks() {
    clearInterval( this.healthTimer );
    this.healthTimer = setInterval( () => {
      if ( Date.now() - this.lastPongAt > this.healthTimeoutMs ) { this.markUnavailable( 'health-timeout' ); return; }
      this.sendOsc( '/awb/nm/ping', [ this.clientID, ++this.pingNonce ] );
    }, this.healthIntervalMs ); this.healthTimer.unref?.();
  }

  markUnavailable() {
    if ( this.closed || this.hostDisabled ) return;
    clearTimeout( this.connectTimer ); clearInterval( this.healthTimer );
    this.status = 'reconnecting'; this.protocolVersion = null; this.highWater = 0;
    this.containers.clear(); this.entries.clear(); this.staging = null; this.batch = null;
    this.onChange( this.snapshot() ); this.scheduleReconnect();
  }

  receive( { address, args = [] } ) {
    if ( !address.startsWith( '/awb/nm/' ) || args[ 0 ] !== this.clientID ) return false;
    if ( address === '/awb/nm/subscribed' ) {
      clearTimeout( this.connectTimer ); clearTimeout( this.reconnectTimer ); this.reconnectTimer = null;
      this.retryAttempt = 0; this.status = 'ready'; this.protocolVersion = args[ 1 ];
      this.lastPongAt = Date.now(); this.startHealthChecks(); this.onChange( this.snapshot() ); return true;
    }
    if ( address === '/awb/nm/pong' ) { this.lastPongAt = Date.now(); return true; }
    if ( address === '/awb/nm/error' ) { this.markUnavailable( args[ 1 ] ); return true; }
    if ( address === '/awb/nm/snapshot/begin' ) {
      this.batch = null; this.staging = { sequence: args[ 1 ], containers: new Map(), entries: new Map() }; return true;
    }
    if ( address === '/awb/nm/snapshot/end' ) {
      if ( this.staging?.sequence === args[ 1 ] ) {
        this.containers = this.staging.containers; this.entries = this.staging.entries;
        this.highWater = args[ 1 ]; this.staging = null; this.status = 'ready'; this.onChange( this.snapshot() );
      } else { this.staging = null; this.recover(); }
      return true;
    }
    if ( address === '/awb/nm/batch/begin' ) {
      if ( this.highWater && Number.isInteger( args[ 1 ] ) && args[ 1 ] > this.highWater + 1 ) { this.recover(); return true; }
      this.batch = { first: args[ 1 ], through: args[ 2 ], containers: new Map( this.containers ), entries: new Map( this.entries ) }; return true;
    }
    if ( address === '/awb/nm/batch/end' ) {
      if ( this.batch && args[ 1 ] === this.batch.first && args[ 2 ] === this.batch.through ) {
        this.containers = this.batch.containers; this.entries = this.batch.entries;
        this.highWater = this.batch.through; this.batch = null; this.onChange( this.snapshot() );
      } else { this.batch = null; this.recover(); }
      return true;
    }
    const sequence = args[ 1 ];
    if ( this.batch && ( !Number.isInteger( sequence ) || sequence < this.batch.first || sequence > this.batch.through ) ) {
      this.batch = null; this.recover(); return true;
    }
    if ( Number.isInteger( sequence ) && !this.staging && !this.batch && this.highWater && sequence > this.highWater + 1 ) {
      this.recover(); return true;
    }
    const containers = this.staging?.containers ?? this.batch?.containers ?? this.containers;
    const entries = this.staging?.entries ?? this.batch?.entries ?? this.entries;
    if ( address === '/awb/nm/container/upsert' ) {
      containers.set( args[ 2 ], Object.freeze( { entryID: args[ 2 ], key: `${ args[ 3 ] }`, name: `${ args[ 4 ] }`, childCount: args[ 5 ], sequence } ) );
    } else if ( address === '/awb/nm/entry/upsert' ) {
      const previous = entries.get( args[ 2 ] );
      entries.set( args[ 2 ], Object.freeze( { entryID: args[ 2 ], type: `${ args[ 3 ] }`, className: `${ args[ 4 ] }`,
        name: `${ args[ 5 ] }`, active: Boolean( args[ 6 ] ), serverName: `${ args[ 7 ] }`, toolSource: `${ args[ 8 ] }`,
        presetName: `${ args[ 9 ] }`, synthDefName: `${ args[ 10 ] }`, memberships: previous?.memberships ?? Object.freeze( [] ), sequence } ) );
    } else if ( address === '/awb/nm/entry/memberships/clear' ) {
      const entry = entries.get( args[ 2 ] ); if ( entry ) entries.set( args[ 2 ], Object.freeze( { ...entry, memberships: Object.freeze( [] ) } ) );
    } else if ( address === '/awb/nm/membership/upsert' ) {
      const entry = entries.get( args[ 2 ] );
      if ( entry ) entries.set( args[ 2 ], Object.freeze( { ...entry, memberships: Object.freeze( [ ...entry.memberships.filter( ( item ) => item.containerID !== args[ 3 ] ),
        Object.freeze( { containerID: args[ 3 ], key: `${ args[ 4 ] }` } ) ] ) } ) );
    } else if ( address === '/awb/nm/entry/remove' ) {
      entries.delete( args[ 2 ] ); containers.delete( args[ 2 ] );
      for ( const [ entryID, entry ] of entries ) {
        if ( entry.memberships.some( ( membership ) => membership.containerID === args[ 2 ] ) ) {
          entries.set( entryID, Object.freeze( { ...entry,
            memberships: Object.freeze( entry.memberships.filter( ( membership ) => membership.containerID !== args[ 2 ] ) ) } ) );
        }
      }
    }
    if ( Number.isInteger( sequence ) && !this.staging && !this.batch ) { this.highWater = Math.max( this.highWater, sequence ); this.onChange( this.snapshot() ); }
    return true;
  }

  recover() { this.status = 'reconnecting'; this.sendOsc( '/awb/nm/snapshot', [ this.clientID ] ); this.onChange( this.snapshot() ); }

  setHostStatus( status ) {
    const disabled = status === 'disabled';
    if ( disabled === this.hostDisabled ) return;
    this.hostDisabled = disabled;
    if ( disabled ) {
      clearTimeout( this.connectTimer ); clearTimeout( this.reconnectTimer ); clearInterval( this.healthTimer );
      this.reconnectTimer = null; this.status = 'disabled'; this.protocolVersion = null; this.highWater = 0;
      this.containers.clear(); this.entries.clear(); this.staging = null; this.batch = null;
      this.onChange( this.snapshot() );
    } else this.connect();
  }

  viewForBinding( { toolSource, toolInstance } ) {
    const key = `toolSession_${ toolSource }_${ toolInstance }`;
    const containers = [ ...this.containers.values() ].filter( ( container ) => container.key === key );
    const containerIDs = new Set( containers.map( ( item ) => item.entryID ) );
    return Object.freeze( { containers: Object.freeze( containers ), entries: Object.freeze( [ ...this.entries.values() ].filter( ( entry ) => (
      entry.toolSource === toolSource && entry.memberships.some( ( membership ) => containerIDs.has( membership.containerID ) )
    ) ) ) } );
  }

  snapshot() {
    return Object.freeze( { status: this.status, protocolVersion: this.protocolVersion, highWater: this.highWater,
      containers: Object.freeze( [ ...this.containers.values() ] ), entryCount: this.entries.size } );
  }

  close() {
    this.closed = true; clearTimeout( this.connectTimer ); clearTimeout( this.reconnectTimer ); clearInterval( this.healthTimer );
    if ( this.status !== 'unavailable' ) this.sendOsc( '/awb/nm/unsubscribe', [ this.clientID ] );
    this.status = 'unavailable'; this.containers.clear(); this.entries.clear(); this.staging = null; this.batch = null;
  }
}
