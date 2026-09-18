import { expandScEventParams } from './scEventSemantics.js';

const ACTIVE_STATES = new Set( [ 'running', 'paused', 'releasing', 'ending' ] );
const freezeSnapshot = ( value ) => {
  if ( Array.isArray( value ) ) return Object.freeze( value.map( freezeSnapshot ) );
  if ( value && typeof value === 'object' ) return Object.freeze( Object.fromEntries(
    Object.entries( value ).map( ( [ key, item ] ) => [ key, freezeSnapshot( item ) ] )
  ) );
  return value;
};
const freezeRealization = ( value ) => Object.freeze( {
  ...value, nodeIDs: Object.freeze( [ ...( value.nodeIDs ?? [] ) ] )
} );

function literalControlsFor( model ) {
  return ( model?.controls ?? [] ).filter( ( control ) => control.numChannels > 1 )
    .map( ( control ) => control.name );
}

export function createAuditionController( { hostedClient, standaloneAdapter } ) {
  let serial = 1;
  let state = Object.freeze( { realizations: Object.freeze( [] ), error: '' } );
  const listeners = new Set();
  const publish = ( patch ) => {
    state = Object.freeze( { ...state, ...patch } );
    listeners.forEach( ( listener ) => listener() );
  };
  const merge = ( realization ) => {
    if ( realization.state === 'ended' ) {
      publish( { realizations: Object.freeze( state.realizations.filter(
        ( item ) => item.realizationID !== realization.realizationID
      ) ), error: '' } );
      return;
    }
    const previous = state.realizations.find( ( item ) => item.realizationID === realization.realizationID );
    const next = freezeRealization( { ...previous, ...realization } );
    publish( { realizations: Object.freeze( [
      ...state.realizations.filter( ( item ) => item.realizationID !== next.realizationID ), next
    ].slice( -200 ) ), error: '' } );
  };
  const syncHosted = () => {
    for ( const realization of hostedClient.getState().audition.realizations ) merge( realization );
  };
  const offHosted = hostedClient.subscribe( syncHosted );
  const offStandalone = standaloneAdapter.subscribe( ( realization ) => merge( realization ) );

  async function play( { mode, definition, params, model, contextID, draftID,
    contextGeneration = 0, fingerprint = '', description = null, signalKind = 'audio' } ) {
    const realizationID = `audition-${ crypto.randomUUID() }`;
    const runID = `audition-run-${ serial++ }`;
    const voices = expandScEventParams( params, { literalControls: literalControlsFor( model ) } );
    const request = { realizationID, runID, definition, contextID, draftID,
      params: freezeSnapshot( params ), voices,
      contextGeneration, fingerprint, description, signalKind };
    merge( { ...request, mode, state: 'starting', nodeIDs: [] } );
    try {
      const result = mode === 'hosted'
        ? await hostedClient.auditionPlay( request )
        : await standaloneAdapter.play( request );
      if ( mode !== 'hosted' ) merge( { ...request, ...result, mode, state: result.state ?? 'running' } );
      return result;
    } catch ( error ) {
      merge( { ...request, mode, state: 'failed', nodeIDs: [], error: error.message } );
      publish( { error: error.message } );
      throw error;
    }
  }

  async function command( realizationID, action ) {
    const realization = state.realizations.find( ( item ) => item.realizationID === realizationID );
    if ( !realization || !ACTIVE_STATES.has( realization.state ) ) return false;
    try {
      if ( realization.mode === 'hosted' ) await hostedClient.auditionCommand( realizationID, action );
      else await standaloneAdapter.command( realizationID, action );
      return true;
    } catch ( error ) {
      publish( { error: error.message } ); throw error;
    }
  }

  async function setControl( realizationID, control, value, controlWidth = 1 ) {
    const realization = state.realizations.find( ( item ) => item.realizationID === realizationID );
    if ( !realization || !ACTIVE_STATES.has( realization.state ) ) return false;
    try {
      if ( realization.mode === 'hosted' ) {
        await hostedClient.auditionSet( realizationID, control, value, controlWidth );
      } else await standaloneAdapter.setControl( realizationID, control, value, controlWidth );
      merge( { ...realization, params: freezeSnapshot( {
        ...( realization.params ?? {} ), [ control ]: value
      } ) } );
      return true;
    } catch ( error ) {
      publish( { error: error.message } ); throw error;
    }
  }

  async function stopDraft( draftID ) {
    const owned = state.realizations.filter( ( item ) => item.draftID === draftID && ACTIVE_STATES.has( item.state ) );
    await Promise.all( owned.map( ( item ) => command( item.realizationID, 'free' ) ) );
    return owned.length;
  }

  return {
    play, command, setControl, stopDraft,
    subscribe: ( listener ) => { listeners.add( listener ); return () => listeners.delete( listener ); },
    getState: () => state,
    dispose: () => { offHosted(); offStandalone(); standaloneAdapter.dispose(); listeners.clear(); }
  };
}

export function createStandaloneAuditionAdapter( {
  sendOsc, subscribeOscReply = () => () => {}, parseOsc = () => null, nodeIDStart = 3_000_000
} ) {
  let nextNodeID = nodeIDStart;
  const records = new Map();
  const nodeOwners = new Map();
  const listeners = new Set();
  const emit = ( record ) => listeners.forEach( ( listener ) => listener( freezeRealization( record ) ) );
  const scalarArgs = ( voice ) => Object.entries( voice ).filter( ( [ , value ] ) => !Array.isArray( value ) )
    .flatMap( ( [ name, value ] ) => [ name, value ] );

  async function play( request ) {
    const nodeIDs = [];
    for ( const voice of request.voices ) {
      const nodeID = nextNodeID++;
      const arrays = Object.entries( voice ).filter( ( [ , value ] ) => Array.isArray( value ) );
      const args = scalarArgs( voice );
      const gateIndex = args.findIndex( ( value, index ) => index % 2 === 0 && value === 'gate' );
      const desiredGate = gateIndex >= 0 ? args[ gateIndex + 1 ] : 1;
      if ( arrays.length && gateIndex >= 0 ) args[ gateIndex + 1 ] = 0;
      sendOsc( '/s_new', [ request.definition, nodeID, 1, 0, ...args ] );
      arrays.forEach( ( [ name, values ] ) => sendOsc( '/n_setn', [ nodeID, name, values.length, ...values ] ) );
      if ( arrays.length && gateIndex >= 0 ) sendOsc( '/n_set', [ nodeID, 'gate', desiredGate ] );
      nodeIDs.push( nodeID ); nodeOwners.set( nodeID, request.realizationID );
    }
    const record = { ...request, mode: 'standalone', state: 'running', nodeIDs };
    records.set( request.realizationID, record ); emit( record );
    return record;
  }

  async function command( realizationID, action ) {
    const record = records.get( realizationID );
    if ( !record ) throw new Error( `Unknown audition realization: ${ realizationID }` );
    const address = action === 'pause' || action === 'resume' ? '/n_run'
      : action === 'release' ? '/n_set' : action === 'free' ? '/n_free' : null;
    if ( !address ) throw new Error( `Unknown audition command: ${ action }` );
    for ( const nodeID of record.nodeIDs ) {
      if ( action === 'pause' ) sendOsc( address, [ nodeID, 0 ] );
      else if ( action === 'resume' ) sendOsc( address, [ nodeID, 1 ] );
      else if ( action === 'release' ) sendOsc( address, [ nodeID, 'gate', 0 ] );
      else sendOsc( address, [ nodeID ] );
    }
    record.state = action === 'pause' ? 'paused' : action === 'resume' ? 'running'
      : action === 'release' ? 'releasing' : 'ending';
    emit( record ); return record;
  }

  async function setControl( realizationID, control, value, controlWidth = 1 ) {
    const record = records.get( realizationID );
    if ( !record ) throw new Error( `Unknown audition realization: ${ realizationID }` );
    const values = Array.isArray( value ) ? value : [ value ];
    if ( controlWidth > 1 ) {
      if ( values.length !== controlWidth ) throw new Error( `${ control } requires ${ controlWidth } values` );
      record.nodeIDs.forEach( ( nodeID ) => sendOsc( '/n_setn', [ nodeID, control, values.length, ...values ] ) );
    } else {
      record.nodeIDs.forEach( ( nodeID, index ) => sendOsc( '/n_set', [ nodeID, control, values[ index % values.length ] ] ) );
    }
    record.params = { ...( record.params ?? {} ), [ control ]: value };
    emit( record ); return record;
  }

  const offOsc = subscribeOscReply( ( bytes ) => {
    const message = parseOsc( bytes );
    if ( message?.address !== '/n_end' ) return;
    const nodeID = Number( message.arguments[ 0 ] );
    const realizationID = nodeOwners.get( nodeID );
    if ( !realizationID ) return;
    nodeOwners.delete( nodeID );
    const record = records.get( realizationID );
    if ( !record ) return;
    record.nodeIDs = record.nodeIDs.filter( ( id ) => id !== nodeID );
    record.state = record.nodeIDs.length ? record.state : 'ended';
    emit( record );
  } );

  return {
    play, command, setControl,
    subscribe: ( listener ) => { listeners.add( listener ); return () => listeners.delete( listener ); },
    dispose: () => {
      for ( const record of records.values() ) if ( ACTIVE_STATES.has( record.state ) ) {
        record.nodeIDs.forEach( ( nodeID ) => sendOsc( '/n_free', [ nodeID ] ) );
      }
      offOsc(); listeners.clear(); records.clear(); nodeOwners.clear();
    }
  };
}
