import { expandScEventParams } from './scEventSemantics.js';
import { createNodeRegistry } from '@awb/sc-runtime';

const ACTIVE_STATES = new Set( [ 'running', 'paused', 'releasing', 'ending' ] );
const freezeSnapshot = ( value ) => {
  if ( Array.isArray( value ) ) return Object.freeze( value.map( freezeSnapshot ) );
  if ( value && typeof value === 'object' ) return Object.freeze( Object.fromEntries(
    Object.entries( value ).map( ( [ key, item ] ) => [ key, freezeSnapshot( item ) ] )
  ) );
  return value;
};
const freezeRealization = ( value ) => Object.freeze( {
  ...value, nodeIDs: Object.freeze( [ ...( value.nodeIDs ?? [] ) ] ),
  voices: Object.freeze( [ ...( value.voices ?? [] ) ].map( freezeSnapshot ) ),
  voiceStates: freezeSnapshot( value.voiceStates ?? {} ),
  voiceParams: freezeSnapshot( value.voiceParams ?? {} )
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
    const index = state.realizations.findIndex( ( item ) => item.realizationID === next.realizationID );
    const realizations = [ ...state.realizations ];
    if ( index < 0 ) realizations.push( next );
    else realizations[ index ] = next;
    publish( { realizations: Object.freeze( realizations.slice( -200 ) ), error: '' } );
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

  async function playEvent( { mode, event, contextID, draftID,
    contextGeneration = 0, fingerprint = '', description = null, signalKind = 'audio' } ) {
    if ( mode !== 'hosted' ) {
      throw new Error( 'Native Event audition requires hosted sclang.' );
    }
    const definition = event?.def ?? event?.instrument;
    if ( event?.type !== 'note' || typeof definition !== 'string' || !definition.length ) {
      throw new Error( 'Event audition requires a note event with a SynthDef.' );
    }
    const realizationID = `audition-${ crypto.randomUUID() }`;
    const runID = `audition-run-${ serial++ }`;
    const request = { realizationID, runID, definition, contextID, draftID,
      params: freezeSnapshot( event ), event: freezeSnapshot( event ),
      contextGeneration, fingerprint, description, signalKind, kind: 'event' };
    merge( { ...request, mode, state: 'starting', nodeIDs: [], voices: [] } );
    try {
      const result = await hostedClient.auditionEvent( request );
      return result;
    } catch ( error ) {
      merge( { ...request, mode, state: 'failed', nodeIDs: [], error: error.message } );
      publish( { error: error.message } );
      throw error;
    }
  }

  async function command( realizationID, action, nodeID = null ) {
    const realization = state.realizations.find( ( item ) => item.realizationID === realizationID );
    if ( !realization || !ACTIVE_STATES.has( realization.state ) ) return false;
    try {
      if ( realization.mode === 'hosted' ) await hostedClient.auditionCommand( realizationID, action, nodeID );
      else await standaloneAdapter.command( realizationID, action, nodeID );
      if ( nodeID !== null && action !== 'free' ) {
        merge( { ...realization, voiceStates: { ...( realization.voiceStates ?? {} ),
          [ nodeID ]: action === 'pause' ? 'paused' : action === 'resume' ? 'running'
            : action === 'release' ? 'releasing' : 'ending' } } );
      }
      return true;
    } catch ( error ) {
      publish( { error: error.message } ); throw error;
    }
  }

  async function setControl( realizationID, control, value, controlWidth = 1, nodeID = null ) {
    const realization = state.realizations.find( ( item ) => item.realizationID === realizationID );
    if ( !realization || !ACTIVE_STATES.has( realization.state ) ) return false;
    try {
      if ( realization.mode === 'hosted' ) {
        await hostedClient.auditionSet( realizationID, control, value, controlWidth, nodeID );
      } else await standaloneAdapter.setControl( realizationID, control, value, controlWidth, nodeID );
      const voiceParams = nodeID === null ? realization.voiceParams : {
        ...( realization.voiceParams ?? {} ),
        [ nodeID ]: { ...( realization.voiceParams?.[ nodeID ] ?? {} ), [ control ]: value }
      };
      merge( { ...realization,
        params: nodeID === null ? freezeSnapshot( { ...( realization.params ?? {} ), [ control ]: value } ) : realization.params,
        voiceParams } );
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
    play, playEvent, command, setControl, stopDraft,
    subscribe: ( listener ) => { listeners.add( listener ); return () => listeners.delete( listener ); },
    getState: () => state,
    dispose: () => { offHosted(); offStandalone(); standaloneAdapter.dispose(); listeners.clear(); }
  };
}

export function createStandaloneAuditionAdapter( {
  sendOsc, subscribeOscReply = () => () => {}, parseOsc = () => null, nodeIDStart = 3_000_000,
  nodeRegistry = null, registryOwnerID = 'score-studio-audition'
} ) {
  let nextNodeID = nodeIDStart;
  const records = new Map();
  const live = nodeRegistry ?? createNodeRegistry();
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
      nodeIDs.push( nodeID );
    }
    const record = { ...request, mode: 'standalone', state: 'running', nodeIDs,
      containerID: `audition:${ registryOwnerID }:${ request.realizationID }`,
      voiceStates: Object.fromEntries( nodeIDs.map( ( nodeID ) => [ nodeID, 'running' ] ) ), voiceParams: {} };
    records.set( request.realizationID, record );
    live.upsertContainer( {
      containerID: record.containerID, kind: 'auditionRealization', name: request.definition,
      ownerID: registryOwnerID,
      metadata: { realizationID: request.realizationID, runID: request.runID, draftID: request.draftID }
    } );
    nodeIDs.forEach( ( nodeID, voiceIndex ) => live.register( {
      nodeID, realizationID: request.realizationID, runID: request.runID,
      ownerID: registryOwnerID, sourceID: request.draftID,
      memberships: [ record.containerID ], definition: request.definition, voiceIndex,
      params: request.voices[ voiceIndex ], state: 'running'
    } ) );
    emit( record );
    return record;
  }

  async function command( realizationID, action, targetNodeID = null ) {
    const record = records.get( realizationID );
    if ( !record ) throw new Error( `Unknown audition realization: ${ realizationID }` );
    const address = action === 'pause' || action === 'resume' ? '/n_run'
      : action === 'release' ? '/n_set' : action === 'free' ? '/n_free' : null;
    if ( !address ) throw new Error( `Unknown audition command: ${ action }` );
    const targets = ( targetNodeID === null ? record.nodeIDs
      : record.nodeIDs.filter( ( id ) => id === Number( targetNodeID ) ) ).filter( ( id ) => live.has( id ) );
    if ( !targets.length ) throw new Error( `Unknown audition node: ${ targetNodeID }` );
    for ( const nodeID of targets ) {
      if ( action === 'pause' ) sendOsc( address, [ nodeID, 0 ] );
      else if ( action === 'resume' ) sendOsc( address, [ nodeID, 1 ] );
      else if ( action === 'release' ) sendOsc( address, [ nodeID, 'gate', 0 ] );
      else sendOsc( address, [ nodeID ] );
      const state = action === 'pause' ? 'paused' : action === 'resume' ? 'running'
        : action === 'release' ? 'releasing' : 'ending';
      live.transition( nodeID, state );
      record.voiceStates[ nodeID ] = state;
    }
    if ( targetNodeID === null ) record.state = action === 'pause' ? 'paused' : action === 'resume' ? 'running'
      : action === 'release' ? 'releasing' : 'ending';
    emit( record ); return record;
  }

  async function setControl( realizationID, control, value, controlWidth = 1, targetNodeID = null ) {
    const record = records.get( realizationID );
    if ( !record ) throw new Error( `Unknown audition realization: ${ realizationID }` );
    const values = Array.isArray( value ) ? value : [ value ];
    const targets = ( targetNodeID === null ? record.nodeIDs
      : record.nodeIDs.filter( ( id ) => id === Number( targetNodeID ) ) ).filter( ( id ) => live.has( id ) );
    if ( !targets.length ) throw new Error( `Unknown audition node: ${ targetNodeID }` );
    if ( controlWidth > 1 ) {
      if ( values.length !== controlWidth ) throw new Error( `${ control } requires ${ controlWidth } values` );
      targets.forEach( ( nodeID ) => {
        sendOsc( '/n_setn', [ nodeID, control, values.length, ...values ] );
        const node = live.get( nodeID );
        live.update( nodeID, { params: { ...( node.params ?? {} ), [ control ]: value } }, 'set' );
      } );
    } else {
      targets.forEach( ( nodeID, index ) => {
        const applied = values[ index % values.length ];
        sendOsc( '/n_set', [ nodeID, control, applied ] );
        const node = live.get( nodeID );
        live.update( nodeID, { params: { ...( node.params ?? {} ), [ control ]: applied } }, 'set' );
      } );
    }
    if ( targetNodeID === null ) record.params = { ...( record.params ?? {} ), [ control ]: value };
    else record.voiceParams[ targetNodeID ] = { ...( record.voiceParams[ targetNodeID ] ?? {} ), [ control ]: value };
    emit( record ); return record;
  }

  const offOsc = subscribeOscReply( ( bytes ) => {
    const message = parseOsc( bytes );
    if ( message?.address !== '/n_end' ) return;
    const nodeID = Number( message.arguments[ 0 ] );
    const node = live.get( nodeID );
    if ( !node ) return;
    const realizationID = node.realizationID;
    live.end( nodeID, 'ended' );
    const record = records.get( realizationID );
    if ( !record ) return;
    record.nodeIDs = record.nodeIDs.filter( ( id ) => id !== nodeID );
    delete record.voiceStates[ nodeID ];
    delete record.voiceParams[ nodeID ];
    record.state = record.nodeIDs.length ? record.state : 'ended';
    if ( record.state === 'ended' ) live.removeContainer( record.containerID );
    emit( record );
  } );

  return {
    play, command, setControl,
    subscribe: ( listener ) => { listeners.add( listener ); return () => listeners.delete( listener ); },
    dispose: () => {
      for ( const record of records.values() ) if ( ACTIVE_STATES.has( record.state ) ) {
        record.nodeIDs.forEach( ( nodeID ) => {
          const node = live.get( nodeID );
          if ( node?.ownerID === registryOwnerID ) {
            sendOsc( '/n_free', [ nodeID ] );
            live.end( nodeID, 'disposed' );
          }
        } );
        live.removeContainer( record.containerID );
      }
      offOsc(); listeners.clear(); records.clear();
    },
    nodeRegistry: live
  };
}
