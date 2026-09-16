const STATES = new Set( [ 'requested', 'loading', 'ready', 'disconnected', 'reconnecting', 'closing', 'closed', 'failed' ] );

export class ViewRegistry {
  #views = new Map();
  #sessions = new Map();
  #listeners = new Set();

  sessionKey( toolID, toolSessionID ) {
    return toolSessionID ? `${ toolID }\u0000${ toolSessionID }` : null;
  }

  add( record ) {
    if ( this.#views.has( record.viewID ) ) throw new Error( `Duplicate viewID: ${ record.viewID }.` );
    const key = this.sessionKey( record.toolID, record.toolSessionID );
    if ( key && this.#sessions.has( key ) ) throw new Error( 'ToolSession already has a view.' );
    const view = Object.freeze( { ...record, lifecycle: record.lifecycle ?? 'requested', sessionState: null, detailedState: null } );
    this.#views.set( view.viewID, view );
    if ( key ) this.#sessions.set( key, view.viewID );
    this.#emit();
    return view;
  }

  get( viewID ) { return this.#views.get( viewID ) ?? null; }
  findSession( toolID, toolSessionID ) {
    const key = this.sessionKey( toolID, toolSessionID );
    return key ? this.get( this.#sessions.get( key ) ) : null;
  }

  update( viewID, patch ) {
    const current = this.get( viewID );
    if ( !current ) throw new Error( `Unknown viewID: ${ viewID }.` );
    if ( patch.lifecycle && !STATES.has( patch.lifecycle ) ) throw new Error( `Unknown lifecycle state: ${ patch.lifecycle }.` );
    const next = Object.freeze( { ...current, ...patch, viewID: current.viewID, toolID: current.toolID, toolSessionID: current.toolSessionID } );
    this.#views.set( viewID, next );
    this.#emit();
    return next;
  }

  remove( viewID ) {
    const current = this.get( viewID );
    if ( !current ) return false;
    const key = this.sessionKey( current.toolID, current.toolSessionID );
    if ( key ) this.#sessions.delete( key );
    this.#views.delete( viewID );
    this.#emit();
    return true;
  }

  list() { return [ ...this.#views.values() ]; }
  subscribe( listener ) { this.#listeners.add( listener ); return () => this.#listeners.delete( listener ); }
  #emit() { const snapshot = this.list(); for ( const listener of this.#listeners ) listener( snapshot ); }
}

export { STATES as VIEW_LIFECYCLE_STATES };
