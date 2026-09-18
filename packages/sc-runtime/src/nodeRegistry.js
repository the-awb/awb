const terminalStates = new Set( [ 'ended', 'failed' ] );

function freezeRecord( record ) {
  return Object.freeze( {
    ...record,
    memberships: Object.freeze( [ ...( record.memberships ?? [] ) ] ),
    ...( record.params ? { params: Object.freeze( { ...record.params } ) } : {} )
  } );
}

function freezeContainer( container ) {
  return Object.freeze( {
    ...container,
    metadata: Object.freeze( { ...( container.metadata ?? {} ) } )
  } );
}

function requireNodeID( nodeID ) {
  if ( nodeID === null || nodeID === undefined || nodeID === '' ) {
    throw new Error( 'A runtime node record requires nodeID.' );
  }
  return nodeID;
}

// Minimal host-neutral lifecycle authority for an engine owned directly by JS.
// Desktop sclang uses NodeManager instead; it is expected to expose equivalent
// pushed changes and recovery snapshots, not to share this implementation.
export function createNodeRegistry() {
  const nodes = new Map();
  const containers = new Map();
  const listeners = new Set();
  let sequence = 0;

  const publish = ( type, record ) => {
    sequence += 1;
    const frozen = Object.hasOwn( record, 'nodeID' ) ? freezeRecord( record ) : freezeContainer( record );
    const change = Object.freeze( { sequence, type, record: frozen } );
    for ( const listener of listeners ) listener( change );
    return change;
  };

  const api = {
    get size() { return nodes.size; },
    get containerCount() { return containers.size; },
    get sequence() { return sequence; },
    has: ( nodeID ) => nodes.has( nodeID ),
    get: ( nodeID ) => nodes.get( nodeID ),
    values: () => nodes.values(),
    keys: () => nodes.keys(),
    container: ( containerID ) => containers.get( containerID ),
    containers: () => containers.values(),

    upsertContainer( container ) {
      const containerID = container?.containerID;
      if ( containerID === null || containerID === undefined || containerID === '' ) {
        throw new Error( 'A runtime container requires containerID.' );
      }
      const next = freezeContainer( { ...containers.get( containerID ), ...container, containerID } );
      containers.set( containerID, next );
      publish( 'containerUpserted', next );
      return next;
    },

    removeContainer( containerID ) {
      const container = containers.get( containerID );
      if ( !container ) return false;
      containers.delete( containerID );
      for ( const [ nodeID, record ] of nodes ) {
        if ( !record.memberships.includes( containerID ) ) continue;
        api.update( nodeID, {
          memberships: record.memberships.filter( ( item ) => item !== containerID )
        }, 'membershipRemoved' );
      }
      publish( 'containerRemoved', container );
      return true;
    },

    register( record ) {
      const nodeID = requireNodeID( record?.nodeID );
      if ( nodes.has( nodeID ) ) throw new Error( `Runtime node ${ nodeID } is already registered.` );
      if ( terminalStates.has( record.state ) ) {
        throw new Error( `Runtime node ${ nodeID } cannot start in terminal state ${ record.state }.` );
      }
      for ( const containerID of record.memberships ?? [] ) {
        if ( !containers.has( containerID ) ) {
          throw new Error( `Runtime node ${ nodeID } references unknown container ${ containerID }.` );
        }
      }
      const next = freezeRecord( { state: 'running', ...record, nodeID } );
      nodes.set( nodeID, next );
      publish( 'started', next );
      return next;
    },

    update( nodeID, patch = {}, type = 'updated' ) {
      const record = nodes.get( nodeID );
      if ( !record ) return null;
      const next = freezeRecord( { ...record, ...patch, nodeID } );
      nodes.set( nodeID, next );
      publish( type, next );
      return next;
    },

    transition( nodeID, state, patch = {} ) {
      if ( terminalStates.has( state ) ) return api.end( nodeID, state, patch );
      return api.update( nodeID, { ...patch, state }, state );
    },

    addMembership( nodeID, containerID ) {
      const record = nodes.get( nodeID );
      if ( !record ) return null;
      if ( !containers.has( containerID ) ) throw new Error( `Unknown runtime container ${ containerID }.` );
      if ( record.memberships.includes( containerID ) ) return record;
      return api.update( nodeID, {
        memberships: [ ...record.memberships, containerID ]
      }, 'membershipAdded' );
    },

    removeMembership( nodeID, containerID ) {
      const record = nodes.get( nodeID );
      if ( !record || !record.memberships.includes( containerID ) ) return record ?? null;
      return api.update( nodeID, {
        memberships: record.memberships.filter( ( item ) => item !== containerID )
      }, 'membershipRemoved' );
    },

    end( nodeID, reason = 'ended', patch = {} ) {
      const record = nodes.get( nodeID );
      if ( !record ) return null;
      const state = terminalStates.has( reason ) ? reason : 'ended';
      const terminal = freezeRecord( { ...record, ...patch, nodeID, state, endReason: reason } );
      nodes.delete( nodeID );
      publish( reason, terminal );
      return terminal;
    },

    clear( reason = 'ended' ) {
      const nodeIDs = [ ...nodes.keys() ];
      for ( const nodeID of nodeIDs ) api.end( nodeID, reason );
      return nodeIDs.length;
    },

    snapshot() {
      return Object.freeze( {
        sequence,
        records: Object.freeze( [ ...nodes.values() ].map( freezeRecord ) ),
        containers: Object.freeze( [ ...containers.values() ].map( freezeContainer ) )
      } );
    },

    subscribe( listener, { emitSnapshot = false } = {} ) {
      if ( typeof listener !== 'function' ) throw new Error( 'Node registry listener must be a function.' );
      listeners.add( listener );
      if ( emitSnapshot ) listener( Object.freeze( {
        sequence, type: 'snapshot', snapshot: api.snapshot()
      } ) );
      return () => listeners.delete( listener );
    }
  };

  return Object.freeze( api );
}
