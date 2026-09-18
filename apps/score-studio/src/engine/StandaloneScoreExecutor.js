import { assertScoreDocument, checkScore, defineRenderer, describeCheck, sortScore } from '@awb/score';
import {
  instrumentControls, instrumentNoteLifecycle, instrumentType, typeForSynthDef
} from '@awb/instruments';
import { createNodeRegistry } from '@awb/sc-runtime';
import { expandScEventParams } from './scEventSemantics.js';

const HANDLES = Object.freeze( {
  note: { required: [ 'def' ] },
  set: { required: [ 'target' ] },
  release: { required: [ 'target' ] },
  free: { required: [ 'target' ] }
} );
const RENDERER = defineRenderer( { name: 'standalone-scsynth', handles: HANDLES } );
const EPSILON = 0.002;

function validateDocument( document ) {
  assertScoreDocument( document );
  const report = checkScore( document.entries, [ RENDERER ] );
  if ( !report.complete ) throw new Error( describeCheck( report ) || 'The score contains unsupported standalone events.' );
  for ( const entry of document.entries ) {
    if ( entry.event?.type !== 'note' ) continue;
    const value = entry.event.dur;
    if ( value === undefined ) throw new Error( `Standalone note ${ entry.id } must declare a finite dur or "inf".` );
    if ( value !== 'inf' && ( !Number.isFinite( Number( value ) ) || Number( value ) < 0 ) ) {
      throw new Error( `Standalone note ${ entry.id } has an invalid duration.` );
    }
  }
}

function finalFrontier( entry ) {
  if ( !entry ) return 0;
  const duration = entry.event?.dur === 'inf' ? 1 : Number( entry.event?.delta ?? entry.event?.dur ?? 0 );
  return entry.time + ( Number.isFinite( duration ) ? Math.max( 0, duration ) : 0 );
}

function executionEntries( document, generation ) {
  const sorted = sortScore( document.entries );
  return sorted.map( ( entry, index ) => Object.freeze( {
    ...entry,
    __sourceRevision: document.revision,
    __executionGeneration: generation,
    __nextFrontier: sorted[ index + 1 ]?.time ?? finalFrontier( entry )
  } ) );
}

function executionConflict( code, message, detail = {} ) {
  const error = new Error( message );
  error.code = code;
  Object.assign( error, detail );
  return error;
}

function freezeState( state ) {
  return Object.freeze( {
    ...state,
    realizations: Object.freeze( state.realizations.map( ( item ) => Object.freeze( { ...item } ) ) )
  } );
}

function controlArgs( params ) {
  return Object.entries( params ).flatMap( ( [ key, value ] ) => [ key, value ] );
}

function instrumentFor( definition ) {
  return typeForSynthDef( definition ) ?? ( instrumentType( definition )
    ? { key: definition }
    : null );
}

function noteParams( event, definition ) {
  const instrument = instrumentFor( definition );
  const synthControls = instrument ? instrumentControls( instrument.key ).map( ( control ) => control.name ) : [];
  return expandScEventParams( event, { includeReserved: synthControls } );
}

export function createStandaloneScoreExecutor( {
  sendOsc,
  subscribeOscReply = () => () => {},
  parseOsc = () => null,
  now = () => performance.now(),
  setTimer = ( fn, delay ) => setTimeout( fn, delay ),
  clearTimer = ( timer ) => clearTimeout( timer ),
  nodeIDStart = 2_000_000,
  nodeRegistry = null,
  registryOwnerID = 'score-studio'
} = {} ) {
  if ( typeof sendOsc !== 'function' ) throw new Error( 'createStandaloneScoreExecutor: sendOsc is required' );
  let document = null;
  let canonicalEntries = [];
  let entries = [];
  let cursor = 0;
  let timer = null;
  let anchorWall = 0;
  let anchorScore = 0;
  let nextNodeID = nodeIDStart;
  let nextRunID = 1;
  let executionGeneration = 0;
  let pendingSeekPlan = null;
  let scoreContainerID = null;
  let runContainerID = null;
  const live = nodeRegistry ?? createNodeRegistry();
  const ownedNodes = () => [ ...live.values() ].filter( ( node ) => node.ownerID === registryOwnerID );
  const ownedNodeCount = () => ownedNodes().length;
  const listeners = new Set();
  let state = freezeState( {
    status: 'empty', scoreID: null, revision: null, runID: null,
    position: 0, committedFrontier: 0, executionGeneration: 0,
    liveCount: 0, realizations: [], seekReport: null, error: null
  } );

  const publish = ( patch ) => {
    const next = freezeState( { ...state, ...patch } );
    if ( Object.keys( patch ).every( ( key ) => next[ key ] === state[ key ] ) ) return;
    state = next;
    for ( const listener of listeners ) listener();
  };
  const estimatePosition = () => state.status === 'playing'
    ? anchorScore + ( now() - anchorWall ) / 1000
    : state.position;
  const clearWake = () => {
    if ( timer !== null ) clearTimer( timer );
    timer = null;
  };
  const applyRegistryChange = ( change ) => {
    if ( change.type === 'snapshot' || !Object.hasOwn( change.record ?? {}, 'nodeID' )
      || change.record.ownerID !== registryOwnerID ) return;
    const record = change.record;
    const index = state.realizations.findIndex( ( item ) => item.nodeID === record.nodeID );
    const realizations = [ ...state.realizations ];
    if ( index < 0 ) realizations.push( record );
    else realizations[ index ] = record;
    publish( { realizations: realizations.slice( -200 ), liveCount: ownedNodeCount() } );
  };
  const offRegistry = live.subscribe( applyRegistryChange );
  const removeRunContainer = () => {
    if ( runContainerID !== null ) live.removeContainer( runContainerID );
    runContainerID = null;
  };
  const removeScoreContainer = () => {
    removeRunContainer();
    if ( scoreContainerID !== null ) live.removeContainer( scoreContainerID );
    scoreContainerID = null;
  };
  const ensureScoreContainer = () => {
    scoreContainerID = `score:${ registryOwnerID }:${ document.scoreID }`;
    live.upsertContainer( {
      containerID: scoreContainerID, kind: 'score', name: document.title ?? document.scoreID,
      ownerID: registryOwnerID, metadata: { scoreID: document.scoreID }
    } );
  };
  const ensureRunContainer = () => {
    if ( !state.runID ) return;
    runContainerID = `scoreRun:${ registryOwnerID }:${ state.runID }`;
    live.upsertContainer( {
      containerID: runContainerID, kind: 'scoreRun', name: state.runID,
      ownerID: registryOwnerID, parentID: scoreContainerID,
      metadata: { scoreID: document.scoreID, runID: state.runID }
    } );
  };
  const dropNode = ( nodeID, reason = 'ended' ) => {
    const node = live.get( nodeID );
    return node?.ownerID === registryOwnerID && live.end( nodeID, reason ) !== null;
  };
  const hardFreeAll = () => {
    for ( const node of ownedNodes() ) {
      sendOsc( '/n_free', [ node.nodeID ] );
      live.end( node.nodeID, 'freed' );
    }
  };
  const targetsFor = ( target ) => {
    const owned = ownedNodes();
    if ( target === '@all' ) return owned;
    if ( target === '@prev' ) return owned.slice( -1 );
    const targets = Array.isArray( target ) ? new Set( target.map( String ) ) : new Set( [ String( target ) ] );
    return owned.filter( ( node ) => targets.has( node.entryID ) || targets.has( String( node.nodeID ) ) );
  };

  const execute = ( entry, reconstruction = null ) => {
    if ( entry.__frontierOnly ) return;
    const event = entry.event;
    if ( event.type === 'note' ) {
      const definition = event.def ?? event.instrument;
      if ( typeof definition !== 'string' || !definition.length ) throw new Error( `Standalone note ${ entry.id } has no valid SynthDef name.` );
      const addAction = Number.isInteger( event.addAction ) ? event.addAction : 1;
      const group = Number.isInteger( event.group ) ? event.group : 0;
      const instrument = instrumentFor( definition );
      if ( event.dur === undefined ) {
        throw new Error( `Standalone note ${ entry.id } must declare a finite dur or "inf".` );
      }
      const openEnded = event.dur === 'inf';
      const lifecycle = instrument && !openEnded ? instrumentNoteLifecycle( instrument.key, event ) : null;
      if ( !openEnded && ( !Number.isFinite( Number( event.dur ) ) || Number( event.dur ) < 0 ) ) {
        throw new Error( `Standalone note ${ entry.id } has an invalid duration.` );
      }
      for ( const params of noteParams( event, definition ) ) {
        const nodeID = nextNodeID++;
        sendOsc( '/s_new', [ definition, nodeID, addAction, group, ...controlArgs( params ) ] );
        live.register( {
          nodeID, entryID: entry.id, released: false,
          releaseAt: lifecycle === null ? null : entry.time + lifecycle.gateDuration,
          realizationID: `${ state.runID }:${ entry.id }:${ nodeID }`,
          runID: state.runID, ownerID: registryOwnerID, definition,
          memberships: [ scoreContainerID, runContainerID ].filter( Boolean ),
          params: Object.freeze( { ...params } ), state: 'started',
          sourceRevision: entry.__sourceRevision ?? document.revision,
          executionGeneration: entry.__executionGeneration ?? executionGeneration,
          ...( reconstruction ? {
            reconstructionQuality: reconstruction.quality,
            reconstructionPhase: reconstruction.phase,
            sourceTime: reconstruction.sourceTime,
            voiceIndex: reconstruction.voiceIndex
          } : {} )
        } );
      }
      return;
    }

    const targets = targetsFor( event.target );
    if ( event.type === 'set' ) {
      const params = expandScEventParams( event );
      if ( params.length !== 1 ) throw new Error( 'Standalone set events do not accept array-expanded controls.' );
      for ( const node of targets ) sendOsc( '/n_set', [ node.nodeID, ...controlArgs( params[ 0 ] ) ] );
    } else if ( event.type === 'release' ) {
      for ( const node of targets ) {
        sendOsc( '/n_set', [ node.nodeID, 'gate', 0 ] );
        live.transition( node.nodeID, 'released', { released: true } );
      }
    } else if ( event.type === 'free' ) {
      for ( const node of targets ) {
        sendOsc( '/n_free', [ node.nodeID ] );
        dropNode( node.nodeID, 'freed' );
      }
    }
  };

  const executeReconstructionPlan = ( plan ) => {
    for ( const reconstruction of plan.reconstructions ) {
      const before = new Set( ownedNodes().map( ( node ) => node.nodeID ) );
      execute( { id: reconstruction.entryID, time: plan.target, event: reconstruction.event }, reconstruction );
      if ( reconstruction.phase === 'release' ) {
        for ( const node of ownedNodes() ) {
          if ( before.has( node.nodeID ) ) continue;
          sendOsc( '/n_set', [ node.nodeID, 'gate', 0 ] );
          live.transition( node.nodeID, 'released', { released: true, releaseAt: null } );
        }
      }
    }
  };

  const releaseDue = ( position ) => {
    for ( const node of ownedNodes() ) {
      if ( node.released || node.releaseAt === null || node.releaseAt > position + EPSILON ) continue;
      sendOsc( '/n_set', [ node.nodeID, 'gate', 0 ] );
      live.transition( node.nodeID, 'released', { released: true } );
    }
  };
  const nextBoundary = () => {
    let next = entries[ cursor ]?.time ?? Infinity;
    for ( const node of ownedNodes() ) {
      if ( !node.released && node.releaseAt !== null ) next = Math.min( next, node.releaseAt );
    }
    return next;
  };
  const schedule = () => {
    clearWake();
    if ( state.status !== 'playing' ) return;
    const boundary = nextBoundary();
    if ( boundary === Infinity ) {
      if ( ownedNodeCount() === 0 ) {
        publish( { status: 'ended', position: entries.at( -1 )?.time ?? state.position } );
        removeRunContainer();
      }
      return;
    }
    const delay = Math.max( 0, ( boundary - estimatePosition() ) * 1000 );
    timer = setTimer( wake, delay );
  };
  const wake = () => {
    timer = null;
    if ( state.status !== 'playing' ) return;
    const position = estimatePosition();
    try {
      let lastCommitted = null;
      while ( cursor < entries.length && entries[ cursor ].time <= position + EPSILON ) {
        lastCommitted = entries[ cursor++ ];
        execute( lastCommitted );
      }
      releaseDue( position );
      publish( {
        position,
        ...( lastCommitted ? { committedFrontier: lastCommitted.__nextFrontier } : {} )
      } );
      schedule();
    } catch ( error ) {
      clearWake();
      hardFreeAll();
      publish( { status: 'failed', position, error: error.message } );
    }
  };

  const load = ( nextDocument ) => {
    validateDocument( nextDocument );
    clearWake();
    hardFreeAll();
    removeScoreContainer();
    document = nextDocument;
    pendingSeekPlan = null;
    executionGeneration += 1;
    canonicalEntries = executionEntries( nextDocument, executionGeneration );
    entries = canonicalEntries;
    cursor = 0;
    ensureScoreContainer();
    publish( {
      status: 'ready', scoreID: document.scoreID, revision: document.revision, runID: null,
      position: 0, committedFrontier: entries[ 0 ]?.time ?? 0,
      executionGeneration, realizations: [], seekReport: null, error: null
    } );
  };
  const replaceFuture = ( nextDocument, {
    expectedGeneration = state.executionGeneration,
    expectedFrontier = state.committedFrontier
  } = {} ) => {
    validateDocument( nextDocument );
    if ( !document ) { load( nextDocument ); return Object.freeze( { code: 'loaded' } ); }
    if ( nextDocument.scoreID !== document.scoreID ) {
      throw executionConflict( 'scoreConflict', 'Future replacement belongs to a different score.' );
    }
    if ( nextDocument.revision < document.revision ) {
      throw executionConflict( 'staleRevision', 'An older score revision cannot replace the active future.' );
    }
    if ( nextDocument.revision === document.revision ) {
      return Object.freeze( {
        code: 'alreadyCurrent', revision: document.revision,
        executionGeneration, committedFrontier: state.committedFrontier
      } );
    }
    if ( expectedGeneration !== executionGeneration ) {
      throw executionConflict( 'generationConflict', 'The executor generation changed before the future replacement.', {
        expectedGeneration, actualGeneration: executionGeneration
      } );
    }
    if ( Math.abs( Number( expectedFrontier ) - Number( state.committedFrontier ) ) > 1e-6 ) {
      throw executionConflict( 'frontierConflict', 'The committed frontier moved before the future replacement.', {
        expectedFrontier, actualFrontier: state.committedFrontier
      } );
    }
    if ( ![ 'playing', 'paused' ].includes( state.status ) ) {
      load( nextDocument );
      return Object.freeze( { code: 'loaded', revision: nextDocument.revision } );
    }

    const frontier = state.committedFrontier;
    const previousRevision = document.revision;
    executionGeneration += 1;
    document = nextDocument;
    canonicalEntries = executionEntries( nextDocument, executionGeneration );
    const future = Number.isFinite( frontier )
      ? canonicalEntries.filter( ( entry ) => entry.time >= frontier - 1e-6 )
      : [];
    const deferredPastCount = canonicalEntries.length - future.length;
    const firstTime = future[ 0 ]?.time;
    const gap = Number.isFinite( frontier )
      && ( firstTime === undefined || firstTime > frontier + 1e-6 )
      ? [ Object.freeze( {
        id: `__frontier-${ executionGeneration }`, time: frontier,
        event: Object.freeze( { type: 'rest' } ), __frontierOnly: true,
        __sourceRevision: nextDocument.revision, __executionGeneration: executionGeneration,
        __nextFrontier: firstTime ?? frontier
      } ) ] : [];
    entries = [ ...gap, ...future ];
    cursor = 0;
    clearWake();
    publish( {
      revision: nextDocument.revision, executionGeneration,
      committedFrontier: frontier, error: null
    } );
    if ( state.status === 'playing' ) schedule();
    return Object.freeze( {
      code: 'futureReplaced', previousRevision, revision: nextDocument.revision,
      executionGeneration, committedFrontier: frontier, deferredPastCount
    } );
  };
  const seek = ( seconds ) => {
    if ( !document ) throw new Error( 'Load a score before seeking.' );
    const position = Math.max( 0, Number( seconds ) || 0 );
    const playing = state.status === 'playing';
    clearWake();
    hardFreeAll();
    pendingSeekPlan = null;
    entries = canonicalEntries;
    cursor = entries.findIndex( ( entry ) => entry.time >= position );
    if ( cursor < 0 ) cursor = entries.length;
    anchorScore = position;
    anchorWall = now();
    const nextStatus = playing ? 'playing' : 'stopped';
    publish( {
      position, status: nextStatus,
      committedFrontier: entries[ cursor ]?.time ?? finalFrontier( entries.at( -1 ) ),
      seekReport: null, error: null
    } );
    if ( playing ) { wake(); }
  };
  const smartSeek = ( plan ) => {
    if ( !document ) throw new Error( 'Load a score before seeking.' );
    if ( !plan || plan.version !== 1 || plan.scoreID !== document.scoreID
      || plan.revision !== document.revision || !Number.isFinite( plan.target ) ) {
      throw new Error( 'Smart-seek plan does not match the loaded score revision.' );
    }
    const playing = state.status === 'playing';
    clearWake();
    hardFreeAll();
    entries = canonicalEntries;
    cursor = entries.findIndex( ( entry ) => entry.time >= plan.target );
    if ( cursor < 0 ) cursor = entries.length;
    anchorScore = plan.target;
    anchorWall = now();
    const seekReport = Object.freeze( {
      mode: 'smart', target: plan.target,
      reconstructed: plan.reconstructions.length,
      skipped: plan.skipped.length,
      skippedEntries: plan.skipped
    } );
    pendingSeekPlan = playing ? null : plan;
    publish( {
      position: plan.target,
      status: playing ? 'playing' : 'stopped',
      runID: playing ? `browser-run-${ nextRunID++ }` : null,
      committedFrontier: entries[ cursor ]?.time ?? finalFrontier( entries.at( -1 ) ),
      seekReport,
      error: null
    } );
    if ( playing ) {
      executeReconstructionPlan( plan );
      wake();
    }
  };
  const play = () => {
    if ( !document ) throw new Error( 'Load a score before playing.' );
    if ( state.status === 'paused' ) {
      for ( const node of ownedNodes() ) {
        sendOsc( '/n_run', [ node.nodeID, 1 ] );
        live.transition( node.nodeID, 'running' );
      }
    } else if ( state.status === 'ended' ) {
      seek( 0 );
    }
    if ( state.status === 'playing' ) return;
    anchorScore = state.position;
    anchorWall = now();
    publish( {
      status: 'playing', runID: state.status === 'paused' ? state.runID : `browser-run-${ nextRunID++ }`,
      error: null
    } );
    ensureRunContainer();
    if ( pendingSeekPlan ) {
      const plan = pendingSeekPlan;
      pendingSeekPlan = null;
      executeReconstructionPlan( plan );
    }
    wake();
  };
  const pause = () => {
    if ( state.status !== 'playing' ) return false;
    const position = estimatePosition();
    clearWake();
    for ( const node of ownedNodes() ) {
      sendOsc( '/n_run', [ node.nodeID, 0 ] );
      live.transition( node.nodeID, 'paused' );
    }
    publish( { status: 'paused', position } );
    return true;
  };
  const commandRealization = ( nodeID, action ) => {
    const id = Number( nodeID );
    const node = live.get( id );
    if ( !node || node.ownerID !== registryOwnerID
      || ![ 'pause', 'resume', 'release', 'free' ].includes( action ) ) return false;
    if ( action === 'pause' ) {
      sendOsc( '/n_run', [ id, 0 ] ); live.transition( id, 'paused' );
    } else if ( action === 'resume' ) {
      sendOsc( '/n_run', [ id, 1 ] ); live.transition( id, 'running' );
    } else if ( action === 'release' ) {
      sendOsc( '/n_set', [ id, 'gate', 0 ] ); live.transition( id, 'released', { released: true } );
    } else {
      sendOsc( '/n_free', [ id ] ); dropNode( id, 'freed' );
    }
    return true;
  };
  const setRealization = ( nodeID, control, value, controlWidth = 1 ) => {
    const id = Number( nodeID );
    const node = live.get( id );
    if ( !node || node.ownerID !== registryOwnerID || typeof control !== 'string' || !control.length ) return false;
    const values = Array.isArray( value ) ? value : [ value ];
    if ( controlWidth > 1 ) {
      if ( values.length !== controlWidth ) return false;
      sendOsc( '/n_setn', [ id, control, values.length, ...values ] );
    } else sendOsc( '/n_set', [ id, control, values[ 0 ] ] );
    live.update( id, { params: Object.freeze( {
      ...( node.params ?? {} ), [ control ]: value
    } ) }, 'set' );
    return true;
  };
  const stop = () => {
    const position = estimatePosition();
    clearWake();
    hardFreeAll();
    removeRunContainer();
    entries = canonicalEntries;
    cursor = entries.findIndex( ( entry ) => entry.time >= position );
    if ( cursor < 0 ) cursor = entries.length;
    publish( {
      status: document ? 'stopped' : 'empty', position, runID: null,
      committedFrontier: entries[ cursor ]?.time ?? finalFrontier( entries.at( -1 ) ),
      error: null
    } );
  };
  const offOsc = subscribeOscReply( ( bytes ) => {
    const message = parseOsc( bytes );
    if ( message?.address !== '/n_end' ) return;
    const nodeID = Number( message.arguments[ 0 ] );
    if ( !dropNode( nodeID, 'ended' ) ) return;
    if ( cursor >= entries.length && ownedNodeCount() === 0 && state.status === 'playing' ) {
      clearWake();
      publish( { status: 'ended', position: estimatePosition() } );
      removeRunContainer();
    }
  } );

  return {
    load, replaceFuture, play, pause, stop, seek, smartSeek,
    commandRealization, setRealization, estimatePosition,
    subscribe: ( listener ) => { listeners.add( listener ); return () => listeners.delete( listener ); },
    getState: () => state,
    nodeRegistry: live,
    dispose: () => { stop(); removeScoreContainer(); offOsc(); offRegistry(); listeners.clear(); }
  };
}
