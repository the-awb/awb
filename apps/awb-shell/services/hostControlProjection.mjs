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
        this.markUnavailable(); this.onChange( this.snapshot() );
      }
      this.sendHello();
    }, this.healthIntervalMs ); this.healthTimer.unref?.();
  }

  markUnavailable() {
    this.status='unavailable'; this.mode=null; this.processID=null;
    this.scsynth='unavailable'; this.nodeManager='unknown'; this.nodeManagerPolicy='unknown';
    this.audio=null; this.audioLifecycle=false; this.qtStation=false;
  }

  sendHello() { if ( !this.closed ) this.sendOsc( '/awb/host/hello', [ this.clientID, this.token ] ); }

  receive( { address, args = [] } ) {
    if ( !address.startsWith( '/awb/host/' ) || args[ 0 ] !== this.clientID ) return false;
    if ( address === '/awb/host/status' ) {
      clearTimeout( this.connectTimer ); this.status = 'ready'; this.lastStatusAt = Date.now();
      this.protocolVersion = args[ 2 ]; this.mode = `${ args[ 3 ] }`; this.nodeManager = `${ args[ 4 ] }`;
      this.nodeManagerPolicy = `${ args[ 5 ] }`; this.scsynth = `${ args[ 6 ] }`;
      const processID=Number.isInteger(args[7])?args[7]:null;
      if(this.processID!==processID)this.audio=null;
      this.processID=processID;this.audioLifecycle=args[9]==='audio-lifecycle';
      this.qtStation = args[ 8 ] === 'qt-station';
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) { clearTimeout( pending.timer ); this.pending.delete( requestID ); pending.resolve( this.snapshot() ); }
      this.onChange( this.snapshot() ); return true;
    }
    if(address==='/awb/host/server/status'){
      const requestID=args[1],pending=this.pending.get(requestID);
      try{const audio=JSON.parse(args[2]);this.audio=audio;
        if(pending){clearTimeout(pending.timer);this.pending.delete(requestID);audio.error?pending.reject(Error(audio.error)):pending.resolve(audio);}
        this.onChange(this.snapshot());
      }catch(e){if(pending){clearTimeout(pending.timer);this.pending.delete(requestID);pending.reject(e);}}
      return true;
    }
    if ( address === '/awb/host/shutting-down' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) { clearTimeout( pending.timer ); this.pending.delete( requestID ); pending.resolve( { status: 'shutting-down' } ); }
      this.markUnavailable(); this.onChange(this.snapshot());
      return true;
    }
    if ( address === '/awb/host/qt-station/status' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) {
        clearTimeout( pending.timer ); this.pending.delete( requestID );
        pending.resolve( Object.freeze( { status: `${ args[ 2 ] }` } ) );
      }
      return true;
    }
    if ( address === '/awb/host/tool/status' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) {
        clearTimeout( pending.timer ); this.pending.delete( requestID );
        pending.resolve( Object.freeze( { status: `${ args[ 2 ] }`, toolID: `${ args[ 3 ] }`, instanceID: `${ args[ 4 ] }` } ) );
      }
      return true;
    }
    if ( address === '/awb/host/score/synthdefs/status' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) {
        clearTimeout( pending.timer ); this.pending.delete( requestID );
        pending.resolve( Object.freeze( { status: `${ args[ 2 ] }`, instanceID: `${ args[ 3 ] }`,
          sourceName: `${ args[ 4 ] }`, previousSourcePath: `${ args[ 5 ] ?? '' }` } ) );
      }
      return true;
    }
    if ( address === '/awb/host/audio/probe/status' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) {
        clearTimeout( pending.timer ); this.pending.delete( requestID );
        pending.resolve( Object.freeze( { status: `${ args[ 2 ] }`, frequency: Number( args[ 3 ] ),
          duration: Number( args[ 4 ] ), amplitude: Number( args[ 5 ] ), server: `${ args[ 6 ] }` } ) );
      }
      return true;
    }
    if ( address === '/awb/host/error' ) {
      const requestID = `${ args[ 1 ] ?? '' }`; const pending = this.pending.get( requestID );
      if ( pending ) { clearTimeout( pending.timer ); this.pending.delete( requestID ); pending.reject( new Error( `${ args[ 2 ] }` ) ); }
      return true;
    }
    return true;
  }

  request( address, args, timeoutMs = 2500 ) {
    if ( this.status !== 'ready' ) return Promise.reject( new Error( 'SuperCollider host control is unavailable.' ) );
    const requestID = crypto.randomUUID();
    return new Promise( ( resolve, reject ) => {
      const timer = setTimeout( () => { this.pending.delete( requestID ); reject( new Error( 'SuperCollider host control timed out.' ) ); }, timeoutMs );
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

  serverAction(action,settings={}){
    if(!['status','configure','start','stop','restart'].includes(action))return Promise.reject(Error('Unknown audio server action.'));
    return this.request('/awb/host/server',[action,JSON.stringify(settings)],40000);
  }
  shutdown() { return this.request( '/awb/host/shutdown', [] ); }

  openQtToolStation() {
    if ( !this.qtStation ) return Promise.reject( new Error( 'This SuperCollider host needs the Qt Tool Station update. Recompile its class library first.' ) );
    return this.request( '/awb/host/qt-station/open', [] );
  }

  openToolInstance( toolID, instanceID ) {
    return this.request( '/awb/host/tool/open', [ toolID, instanceID ] );
  }

  closeToolInstance( toolID, instanceID ) {
    return this.request( '/awb/host/tool/close', [ toolID, instanceID ] );
  }

  loadScoreSynthDefs( instanceID, sourcePath, allowOverride = false ) {
    return this.request( '/awb/host/score/synthdefs', [ instanceID, sourcePath, allowOverride ? 1 : 0 ], 15000 );
  }

  audioProbe( { frequency = 440, duration = 0.35, amplitude = 0.08 } = {} ) {
    return this.request( '/awb/host/audio/probe', [ frequency, duration, amplitude ] );
  }

  snapshot() {
    return Object.freeze( { status: this.status, protocolVersion: this.protocolVersion,
      mode: this.mode, nodeManager: this.nodeManager, nodeManagerPolicy: this.nodeManagerPolicy,
      scsynth: this.scsynth, processID: this.processID, ...(this.audio?{audio:this.audio}:{}), ...(this.audioLifecycle?{audioLifecycle:true}:{}), ...( this.qtStation ? { qtStation: true } : {} ) } );
  }

  close() {
    this.closed = true; clearTimeout( this.connectTimer ); clearInterval( this.healthTimer );
    for ( const pending of this.pending.values() ) { clearTimeout( pending.timer ); pending.reject( new Error( 'Host control closed.' ) ); }
    this.pending.clear(); this.markUnavailable();
  }
}
