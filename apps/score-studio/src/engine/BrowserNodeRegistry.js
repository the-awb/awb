function frozenRecord( record ) {
  return Object.freeze( { ...record } );
}

// Engine-local implementation of the realization registry contract used by
// standalone scsynth.wasm execution. It deliberately does not imitate
// NodeManager's containers or GUI; it owns node membership and pushes changes.
export function createBrowserNodeRegistry() {
  const nodes = new Map();
  const listeners = new Set();
  const publish = ( type, record ) => {
    const change = Object.freeze( { type, record: frozenRecord( record ) } );
    for ( const listener of listeners ) listener( change );
  };

  return Object.freeze( {
    get size() { return nodes.size; },
    has: ( nodeID ) => nodes.has( nodeID ),
    get: ( nodeID ) => nodes.get( nodeID ),
    values: () => nodes.values(),
    keys: () => nodes.keys(),
    set( nodeID, record ) {
      const next = { ...record, nodeID };
      nodes.set( nodeID, next );
      publish( 'started', next );
      return this;
    },
    update( nodeID, patch, type = 'updated' ) {
      const record = nodes.get( nodeID );
      if ( !record ) return null;
      const next = { ...record, ...patch, nodeID };
      nodes.set( nodeID, next );
      publish( type, next );
      return next;
    },
    delete( nodeID, reason = 'ended' ) {
      const record = nodes.get( nodeID );
      if ( !record ) return false;
      nodes.delete( nodeID );
      publish( reason, record );
      return true;
    },
    clear( reason = 'ended' ) {
      const records = [ ...nodes.values() ];
      nodes.clear();
      for ( const record of records ) publish( reason, record );
    },
    snapshot: () => Object.freeze( [ ...nodes.values() ].map( frozenRecord ) ),
    subscribe( listener ) {
      listeners.add( listener );
      return () => listeners.delete( listener );
    }
  } );
}
