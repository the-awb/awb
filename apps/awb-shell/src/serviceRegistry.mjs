export class ServiceRegistry {
  #services = new Map();
  constructor( createService ) { this.createService = createService; }
  async ensure( configuration ) {
    const key = stableStringify( configuration );
    let record = this.#services.get( key );
    if ( !record ) {
      record = { service: null, pending: null, references: 0, configuration: Object.freeze( { ...configuration } ) };
      this.#services.set( key, record );
      record.pending = Promise.resolve().then( () => this.createService( configuration ) ).then( ( service ) => {
        record.service = service; return service;
      } );
    }
    try { return record.service ?? await record.pending; }
    catch ( error ) { if ( this.#services.get( key ) === record ) this.#services.delete( key ); throw error; }
  }
  async acquire( configuration, policy ) {
    const key = stableStringify( configuration );
    const service = await this.ensure( configuration ); const record = this.#services.get( key );
    const grant = service.grant ? service.grant( policy ) : { endpoint: service.endpoint, release: () => {} };
    record.references += 1; let released = false;
    return { service, endpoint: grant.endpoint, release: async () => {
      if ( released ) return; released = true; grant.release?.(); record.references -= 1;
    } };
  }
  snapshot() { return [ ...this.#services.values() ].map( ( record ) => ( {
    port: record.service?.port ?? null, references: record.references,
    host: record.service?.hostSnapshot?.() ?? null
  } ) ); }
  projectionForBinding( binding ) {
    for ( const record of this.#services.values() ) {
      const projection = record.service?.nodeManagerView?.( binding );
      if ( projection && ( projection.containers.length || projection.entries.length ) ) return projection;
    }
    return { containers: [], entries: [] };
  }
  firstService( predicate = () => true ) {
    for ( const record of this.#services.values() ) if ( record.service && predicate( record.service, record.configuration ) ) return record.service;
    return null;
  }
  async closeAll() {
    const records = [ ...this.#services.values() ]; this.#services.clear();
    await Promise.allSettled( records.map( async ( record ) => ( record.service ?? await record.pending )?.close() ) );
  }
}

function stableStringify( value ) {
  if ( Array.isArray( value ) ) return `[${ value.map( stableStringify ).join( ',' ) }]`;
  if ( value && typeof value === 'object' ) return `{${ Object.keys( value ).sort().map( ( key ) => `${ JSON.stringify( key ) }:${ stableStringify( value[ key ] ) }` ).join( ',' ) }`;
  return JSON.stringify( value );
}
