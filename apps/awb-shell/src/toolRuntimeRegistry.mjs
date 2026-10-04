import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function localRuntimeURL( value ) {
  const url = new URL( value );
  if ( url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password ) {
    throw new Error( 'Tool runtime must serve HTTP on 127.0.0.1.' );
  }
  return url.href;
}

// These are trusted installed artifact entry points, never renderer-supplied paths.
export class ToolRuntimeRegistry {
  #records = new Map();
  constructor( { runtimeRoot, runtimeContext = async () => ( {} ), load = ( entry ) => import( pathToFileURL( entry ).href ) } ) {
    this.runtimeRoot = runtimeRoot;
    this.load = load;
    this.runtimeContext = runtimeContext;
  }
  async start( viewID, tool ) {
    if ( !tool.runtime ) return null;
    if ( this.#records.has( viewID ) ) throw new Error( 'View already has a tool runtime.' );
    const record = { pending: null, release: null, toolID: tool.id };
    this.#records.set( viewID, record );
    record.pending = ( async () => {
      const module = await this.load( tool.runtime.entryPath );
      if ( typeof module.startRuntime !== 'function' ) throw new Error( 'Tool runtime needs startRuntime().' );
      const runtime = await module.startRuntime( {
        ...await this.runtimeContext( { viewID, tool } ),
        runtimeDirectory: path.join( this.runtimeRoot, viewID )
      } );
      try {
        if ( typeof runtime?.stop !== 'function' ) throw new Error( 'Tool runtime needs stop().' );
        return { runtime, url: localRuntimeURL( runtime.url ) };
      } catch ( error ) { await runtime?.stop?.(); throw error; }
    } )();
    try {
      const { url } = await record.pending;
      if ( record.release ) throw new Error( 'Tool runtime closed during startup.' );
      return url;
    }
    catch ( error ) { this.#records.delete( viewID ); throw error; }
  }
  async release( viewID ) {
    const record = this.#records.get( viewID );
    if ( !record ) return;
    if ( !record.release ) record.release = ( async () => {
      try { const { runtime } = await record.pending; await runtime.stop(); }
      finally { this.#records.delete( viewID ); }
    } )();
    return record.release;
  }
  has( toolID ) { return [ ...this.#records.values() ].some( ( record ) => record.toolID === toolID ); }
  async closeAll() {
    const results = await Promise.allSettled( [ ...this.#records.keys() ].map( ( id ) => this.release( id ) ) );
    const errors = results.filter( ( result ) => result.status === 'rejected' ).map( ( result ) => result.reason );
    if ( errors.length ) throw new AggregateError( errors, 'Tool runtime shutdown failed.' );
  }
}
