const STATES = new Set( [ 'requested', 'loading', 'ready', 'disconnected', 'reconnecting', 'closing', 'closed', 'failed' ] );

export class ViewRegistry {
  #views = new Map();
  #instances = new Map();
  #listeners = new Set();

  instanceKey( toolID, toolInstanceID ) {
    return toolInstanceID ? `${ toolID }\u0000${ toolInstanceID }` : null;
  }

  add( record ) {
    if ( this.#views.has( record.viewID ) ) throw new Error( `Duplicate viewID: ${ record.viewID }.` );
    const key = this.instanceKey( record.toolID, record.toolInstanceID );
    if ( key && this.#instances.has( key ) ) throw new Error( 'ToolInstance already has a view.' );
    const view = Object.freeze( { ...record, lifecycle: record.lifecycle ?? 'requested', sessionState: null, detailedState: null } );
    this.#views.set( view.viewID, view );
    if ( key ) this.#instances.set( key, view.viewID );
    this.#emit();
    return view;
  }

  get( viewID ) { return this.#views.get( viewID ) ?? null; }
  findInstance( toolID, toolInstanceID ) {
    const key = this.instanceKey( toolID, toolInstanceID );
    return key ? this.get( this.#instances.get( key ) ) : null;
  }

  update( viewID, patch ) {
    const current = this.get( viewID );
    if ( !current ) throw new Error( `Unknown viewID: ${ viewID }.` );
    if ( patch.lifecycle && !STATES.has( patch.lifecycle ) ) throw new Error( `Unknown lifecycle state: ${ patch.lifecycle }.` );
    const next = Object.freeze( { ...current, ...patch, viewID: current.viewID, toolID: current.toolID, toolInstanceID: current.toolInstanceID } );
    this.#views.set( viewID, next );
    this.#emit();
    return next;
  }

  remove( viewID ) {
    const current = this.get( viewID );
    if ( !current ) return false;
    const key = this.instanceKey( current.toolID, current.toolInstanceID );
    if ( key ) this.#instances.delete( key );
    this.#views.delete( viewID );
    this.#emit();
    return true;
  }

  list() { return [ ...this.#views.values() ]; }
  subscribe( listener ) { this.#listeners.add( listener ); return () => this.#listeners.delete( listener ); }
  #emit() { const snapshot = this.list(); for ( const listener of this.#listeners ) listener( snapshot ); }
}

export { STATES as VIEW_LIFECYCLE_STATES };
