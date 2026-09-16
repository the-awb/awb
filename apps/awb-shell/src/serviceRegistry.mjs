export class ServiceRegistry {
  #services = new Map();
  constructor( createService ) { this.createService = createService; }
  async acquire( configuration ) {
    const key = JSON.stringify( configuration, Object.keys( configuration ).sort() );
    let record = this.#services.get( key );
    if ( !record ) { record = { service: await this.createService( configuration ), references: 0 }; this.#services.set( key, record ); }
    record.references += 1; let released = false;
    return { service: record.service, release: async () => {
      if ( released ) return; released = true; record.references -= 1;
      if ( record.references === 0 ) { this.#services.delete( key ); await record.service.close(); }
    } };
  }
  snapshot() { return [ ...this.#services.values() ].map( ( record ) => ( { port: record.service.port, references: record.references } ) ); }
}
