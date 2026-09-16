export class ServiceRegistry {
  #services = new Map();
  constructor( createService ) { this.createService = createService; }
  async acquire( configuration ) {
    const key = stableStringify( configuration );
    let record = this.#services.get( key );
    if ( !record ) { record = { service: await this.createService( configuration ), references: 0 }; this.#services.set( key, record ); }
    record.references += 1; let released = false;
    return { service: record.service, release: async () => {
      if ( released ) return; released = true; record.references -= 1;
      if ( record.references === 0 ) { this.#services.delete( key ); await record.service.close(); }
    } };
  }
  snapshot() { return [ ...this.#services.values() ].map( ( record ) => ( {
    port: record.service.port, references: record.references,
    host: record.service.hostSnapshot?.() ?? null
  } ) ); }
  projectionForBinding( binding ) {
    for ( const record of this.#services.values() ) {
      const projection = record.service.nodeManagerView?.( binding );
      if ( projection && ( projection.containers.length || projection.entries.length ) ) return projection;
    }
    return { containers: [], entries: [] };
  }
}

function stableStringify( value ) {
  if ( Array.isArray( value ) ) return `[${ value.map( stableStringify ).join( ',' ) }]`;
  if ( value && typeof value === 'object' ) return `{${ Object.keys( value ).sort().map( ( key ) => `${ JSON.stringify( key ) }:${ stableStringify( value[ key ] ) }` ).join( ',' ) }`;
  return JSON.stringify( value );
}
