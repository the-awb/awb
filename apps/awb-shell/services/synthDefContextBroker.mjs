import crypto from 'node:crypto';

const PREFIX = '/awb/synthdef/';
const MAX_DEFINITION_BYTES = 4 * 1024 * 1024;
const MAX_CHUNKS = 8192;
const MAX_SPECS = 4096;

function safeCount( value, maximum, label ) {
  if ( !Number.isInteger( value ) || value < 0 || value > maximum ) throw new Error( `Invalid ${ label }.` );
  return value;
}

export class SynthDefContextBroker {
  constructor( { sendOsc, sendClient, requestTimeoutMs = 1200, maxRetries = 1,
    clientID = `awb-shell-synthdef-${ crypto.randomUUID() }`, onChange = () => {} } ) {
    this.sendOsc = sendOsc; this.sendClient = sendClient; this.requestTimeoutMs = requestTimeoutMs;
    this.maxRetries = maxRetries; this.clientID = clientID; this.onChange = onChange; this.clients = new Map();
    this.status = 'unavailable'; this.generation = 0; this.nonce = 0;
    this.inventory = Object.freeze( [] ); this.nameFingerprints = new Map();
    this.descriptions = new Map(); this.flights = new Map(); this.connected = false;
  }

  snapshot() {
    return Object.freeze( { status: this.status, generation: this.generation,
      inventoryCount: this.inventory.length, cachedDescriptions: this.descriptions.size } );
  }

  attach( clientKey, rendererClientID ) {
    this.clients.set( clientKey, rendererClientID );
    if ( this.connected ) this.sendClient( clientKey, '/awb/synthdef/connected', [ rendererClientID, 1 ] );
    else this.connect();
  }

  detach( clientKey ) { this.clients.delete( clientKey ); }

  connect() {
    if ( this.status === 'connecting' ) return;
    this.status = 'connecting'; this.onChange( this.snapshot() ); this.sendOsc( '/awb/synthdef/hello', [ this.clientID ] );
  }

  markUnavailable( detail = 'connection-lost' ) {
    this.connected = false; this.status = 'stale'; this.generation += 1;
    this.inventory = Object.freeze( [] ); this.nameFingerprints.clear(); this.descriptions.clear();
    for ( const flight of this.flights.values() ) this.failFlight( flight, 'contextUnavailable', detail );
    this.onChange( this.snapshot() );
  }

  handleFrame( clientKey, frame ) {
    if ( typeof frame?.address !== 'string' || !frame.address.startsWith( PREFIX ) ) return false;
    const rendererClientID = frame.args?.[ 0 ];
    if ( frame.address === '/awb/synthdef/hello' ) {
      if ( typeof rendererClientID !== 'string' || !rendererClientID ) throw new Error( 'invalidSynthDefClientID' );
      this.attach( clientKey, rendererClientID ); return true;
    }
    if ( frame.address === '/awb/synthdef/disconnect' ) { this.detach( clientKey ); return true; }
    if ( this.clients.get( clientKey ) !== rendererClientID ) throw new Error( 'unauthorizedSynthDefClient' );
    if ( frame.address === '/awb/synthdef/list' ) {
      this.requestInventory( clientKey, frame.args?.[ 1 ] ); return true;
    }
    if ( frame.address === '/awb/synthdef/describe' ) {
      this.requestDescription( clientKey, frame.args?.[ 1 ], frame.args?.[ 2 ] ); return true;
    }
    throw new Error( 'unsupportedSynthDefOperation' );
  }

  requestInventory( clientKey, requestID ) {
    if ( typeof requestID !== 'string' || !requestID ) throw new Error( 'invalidSynthDefRequestID' );
    const existing = this.flights.get( 'inventory' );
    if ( existing ) { existing.waiters.push( { clientKey, requestID } ); return; }
    const flight = this.newFlight( 'inventory', null, { clientKey, requestID } );
    this.flights.set( 'inventory', flight ); this.transmit( flight );
  }

  requestDescription( clientKey, requestID, name ) {
    if ( typeof requestID !== 'string' || !requestID || typeof name !== 'string' || !name ) throw new Error( 'invalidSynthDefDescriptionRequest' );
    const fingerprint = this.nameFingerprints.get( name );
    if ( fingerprint && this.descriptions.has( fingerprint ) ) {
      this.replayDescription( { clientKey, requestID }, this.descriptions.get( fingerprint ) ); return;
    }
    const key = `description:${ name }`; const existing = this.flights.get( key );
    if ( existing ) { existing.waiters.push( { clientKey, requestID } ); return; }
    const flight = this.newFlight( key, name, { clientKey, requestID } );
    this.flights.set( key, flight ); this.transmit( flight );
  }

  newFlight( key, name, waiter ) {
    return { key, name, generation: this.generation, internalID: `shell-${ this.generation }-${ ++this.nonce }`,
      waiters: [ waiter ], attempts: 0, timer: null, begin: null, items: new Map(), chunks: new Map(), specs: [], end: null };
  }

  transmit( flight ) {
    flight.attempts += 1;
    const address = flight.key === 'inventory' ? '/awb/synthdef/list' : '/awb/synthdef/describe';
    const args = [ this.clientID, flight.internalID, ...( flight.name ? [ flight.name ] : [] ) ];
    this.sendOsc( address, args ); clearTimeout( flight.timer );
    flight.timer = setTimeout( () => {
      if ( this.flights.get( flight.key ) !== flight ) return;
      if ( flight.attempts <= this.maxRetries ) this.transmit( flight );
      else this.failFlight( flight, 'incompleteTransfer', flight.name ?? 'inventory' );
    }, this.requestTimeoutMs );
    flight.timer.unref?.();
  }

  receive( message ) {
    const { address, args = [] } = message;
    if ( !address.startsWith( PREFIX ) || args[ 0 ] !== this.clientID ) return false;
    if ( address === '/awb/synthdef/connected' ) {
      this.connected = true; this.status = 'ready';
      for ( const [ clientKey, rendererClientID ] of this.clients ) this.sendClient( clientKey, address, [ rendererClientID, args[ 1 ] ] );
      this.onChange( this.snapshot() ); return true;
    }
    const flight = [ ...this.flights.values() ].find( ( item ) => item.internalID === args[ 1 ] );
    if ( !flight || flight.generation !== this.generation ) return true;
    try {
      if ( address === '/awb/synthdef/error' ) this.failFlight( flight, args[ 2 ], args[ 3 ] );
      else if ( flight.key === 'inventory' ) this.receiveInventory( flight, address, args );
      else this.receiveDescription( flight, address, args );
    } catch ( error ) { this.failFlight( flight, 'invalidTransfer', error.message ); }
    return true;
  }

  receiveInventory( flight, address, args ) {
    if ( address === '/awb/synthdef/list/begin' ) flight.begin = safeCount( args[ 2 ], 65536, 'inventory count' );
    else if ( address === '/awb/synthdef/list/item' ) {
      const index = safeCount( args[ 2 ], 65535, 'inventory index' );
      if ( typeof args[ 3 ] !== 'string' || !args[ 3 ] ) throw new Error( 'Invalid SynthDef name.' );
      flight.items.set( index, args[ 3 ] );
    } else if ( address === '/awb/synthdef/list/end' ) {
      const count = safeCount( args[ 2 ], 65536, 'inventory count' );
      if ( count !== flight.begin || flight.items.size !== count ) return;
      const inventory = [];
      for ( let index = 0; index < count; index += 1 ) {
        if ( !flight.items.has( index ) ) return; inventory.push( flight.items.get( index ) );
      }
      for ( const pending of [ ...this.flights.values() ] ) {
        if ( pending !== flight ) this.failFlight( pending, 'contextRefreshed', 'Retry against the current inventory.' );
      }
      this.generation += 1; this.inventory = Object.freeze( inventory );
      this.nameFingerprints.clear(); this.descriptions.clear(); this.completeInventory( flight ); this.onChange( this.snapshot() );
    }
  }

  receiveDescription( flight, address, args ) {
    if ( address === '/awb/synthdef/description/begin' ) {
      if ( args[ 2 ] !== flight.name ) throw new Error( 'Description name mismatch.' );
      flight.begin = { name: args[ 2 ], bytes: safeCount( args[ 3 ], MAX_DEFINITION_BYTES, 'definition size' ),
        chunks: safeCount( args[ 4 ], MAX_CHUNKS, 'chunk count' ), specs: safeCount( args[ 5 ], MAX_SPECS, 'spec count' ) };
    } else if ( address === '/awb/synthdef/description/chunk' ) {
      const index = safeCount( args[ 2 ], MAX_CHUNKS - 1, 'chunk index' );
      if ( typeof args[ 3 ] !== 'string' || !/^[0-9a-f]*$/i.test( args[ 3 ] ) ) throw new Error( 'Invalid definition chunk.' );
      flight.chunks.set( index, args[ 3 ] );
    } else if ( address === '/awb/synthdef/description/spec' ) flight.specs.push( args.slice( 2 ) );
    else if ( address === '/awb/synthdef/description/end' ) {
      flight.end = { name: args[ 2 ], bytes: args[ 3 ], chunks: args[ 4 ], specs: args[ 5 ] };
      this.maybeCompleteDescription( flight );
    }
  }

  maybeCompleteDescription( flight ) {
    const { begin, end } = flight; if ( !begin || !end ) return;
    if ( JSON.stringify( begin ) !== JSON.stringify( end ) || flight.chunks.size !== begin.chunks || flight.specs.length !== begin.specs ) return;
    const chunks = [];
    for ( let index = 0; index < begin.chunks; index += 1 ) { if ( !flight.chunks.has( index ) ) return; chunks.push( flight.chunks.get( index ) ); }
    const bytes = Buffer.from( chunks.join( '' ), 'hex' ); if ( bytes.length !== begin.bytes ) throw new Error( 'Definition byte count mismatch.' );
    const fingerprint = crypto.createHash( 'sha256' ).update( bytes ).digest( 'hex' );
    const description = Object.freeze( { ...begin, chunks: Object.freeze( chunks ), specs: Object.freeze( flight.specs.map( Object.freeze ) ), fingerprint } );
    this.nameFingerprints.set( begin.name, fingerprint ); this.descriptions.set( fingerprint, description );
    clearTimeout( flight.timer ); this.flights.delete( flight.key );
    for ( const waiter of flight.waiters ) this.replayDescription( waiter, description );
    this.onChange( this.snapshot() );
  }

  completeInventory( flight ) {
    clearTimeout( flight.timer ); this.flights.delete( flight.key );
    for ( const waiter of flight.waiters ) {
      const rendererID = this.clients.get( waiter.clientKey ); if ( !rendererID ) continue;
      this.sendClient( waiter.clientKey, '/awb/synthdef/list/begin', [ rendererID, waiter.requestID, this.inventory.length ] );
      this.inventory.forEach( ( name, index ) => this.sendClient( waiter.clientKey, '/awb/synthdef/list/item', [ rendererID, waiter.requestID, index, name ] ) );
      this.sendClient( waiter.clientKey, '/awb/synthdef/list/end', [ rendererID, waiter.requestID, this.inventory.length ] );
    }
  }

  replayDescription( waiter, description ) {
    const rendererID = this.clients.get( waiter.clientKey ); if ( !rendererID ) return;
    const prefix = [ rendererID, waiter.requestID ];
    this.sendClient( waiter.clientKey, '/awb/synthdef/description/begin', [ ...prefix, description.name, description.bytes, description.chunks.length, description.specs.length ] );
    description.chunks.forEach( ( chunk, index ) => this.sendClient( waiter.clientKey, '/awb/synthdef/description/chunk', [ ...prefix, index, chunk ] ) );
    description.specs.forEach( ( spec ) => this.sendClient( waiter.clientKey, '/awb/synthdef/description/spec', [ ...prefix, ...spec ] ) );
    this.sendClient( waiter.clientKey, '/awb/synthdef/description/end', [ ...prefix, description.name, description.bytes, description.chunks.length, description.specs.length ] );
  }

  failFlight( flight, code, detail ) {
    clearTimeout( flight.timer ); this.flights.delete( flight.key );
    for ( const waiter of flight.waiters ) {
      const rendererID = this.clients.get( waiter.clientKey );
      if ( rendererID ) this.sendClient( waiter.clientKey, '/awb/synthdef/error', [ rendererID, waiter.requestID, `${ code }`, `${ detail }` ] );
    }
  }

  close() {
    for ( const flight of this.flights.values() ) clearTimeout( flight.timer );
    this.flights.clear();
    if ( this.connected ) this.sendOsc( '/awb/synthdef/disconnect', [ this.clientID ] );
    this.connected = false; this.status = 'unavailable'; this.clients.clear();
  }
}
