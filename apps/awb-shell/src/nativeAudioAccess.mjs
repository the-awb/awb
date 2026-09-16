export class NativeAudioAccess {
  #captures = new Map();
  constructor( broker ) { this.broker = broker; }
  listDevices() { return this.broker.listDevices(); }
  async start( viewID, configuration ) {
    await this.stop( viewID );
    const capture = await this.broker.acquire( configuration );
    this.#captures.set( viewID, capture );
    return Object.freeze( { endpoint: capture.endpoint, status: capture.status() } );
  }
  status( viewID ) { return this.#captures.get( viewID )?.status() ?? Object.freeze( { running: false, error: null, events: [] } ); }
  async stop( viewID ) {
    const capture = this.#captures.get( viewID );
    if ( !capture ) return false;
    this.#captures.delete( viewID ); await capture.release(); return true;
  }
  releaseView( viewID ) { return this.stop( viewID ); }
  async close() { this.#captures.clear(); await this.broker.close(); }
}
