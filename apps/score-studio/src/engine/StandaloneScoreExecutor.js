import { assertScoreDocument, checkScore, defineRenderer, describeCheck, sortScore } from '@awb/score';
import { expandScEventParams, scoreEventSustain } from './scEventSemantics.js';

const HANDLES = Object.freeze( {
  note: { required: [ 'def' ] },
  set: { required: [ 'target' ] },
  release: { required: [ 'target' ] },
  free: { required: [ 'target' ] }
} );
const RENDERER = defineRenderer( { name: 'standalone-scsynth', handles: HANDLES } );
const EPSILON = 0.002;

function freezeState( state ) {
  return Object.freeze( {
    ...state,
    realizations: Object.freeze( state.realizations.map( ( item ) => Object.freeze( { ...item } ) ) )
  } );
}

function controlArgs( params ) {
  return Object.entries( params ).flatMap( ( [ key, value ] ) => [ key, value ] );
}

export function createStandaloneScoreExecutor( {
  sendOsc,
  subscribeOscReply = () => () => {},
  parseOsc = () => null,
  now = () => performance.now(),
  setTimer = ( fn, delay ) => setTimeout( fn, delay ),
  clearTimer = ( timer ) => clearTimeout( timer ),
  nodeIDStart = 2_000_000
} = {} ) {
  if ( typeof sendOsc !== 'function' ) throw new Error( 'createStandaloneScoreExecutor: sendOsc is required' );
  let document = null;
  let entries = [];
  let cursor = 0;
  let timer = null;
  let anchorWall = 0;
  let anchorScore = 0;
  let nextNodeID = nodeIDStart;
  let nextRunID = 1;
  const live = new Map();
  const listeners = new Set();
  let state = freezeState( {
    status: 'empty', scoreID: null, revision: null, runID: null,
    position: 0, liveCount: 0, realizations: [], error: null
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
  const realization = ( nodeID, patch ) => {
    publish( { realizations: state.realizations.map( ( item ) => item.nodeID === nodeID ? { ...item, ...patch } : item ) } );
  };
  const dropNode = ( nodeID, ended = false ) => {
    if ( !live.has( nodeID ) ) return false;
    live.delete( nodeID );
    if ( ended ) realization( nodeID, { state: 'ended' } );
    publish( { liveCount: live.size } );
    return true;
  };
  const hardFreeAll = () => {
    for ( const node of live.values() ) sendOsc( '/n_free', [ node.nodeID ] );
    for ( const nodeID of live.keys() ) realization( nodeID, { state: 'ended' } );
    live.clear();
    publish( { liveCount: 0 } );
  };
  const targetsFor = ( target ) => {
    if ( target === '@all' ) return [ ...live.values() ];
    if ( target === '@prev' ) return [ ...live.values() ].slice( -1 );
    const targets = Array.isArray( target ) ? new Set( target.map( String ) ) : new Set( [ String( target ) ] );
    return [ ...live.values() ].filter( ( node ) => targets.has( node.entryID ) || targets.has( String( node.nodeID ) ) );
  };

  const execute = ( entry ) => {
    const event = entry.event;
    if ( event.type === 'note' ) {
      const definition = event.def ?? event.instrument;
      if ( typeof definition !== 'string' || !definition.length ) throw new Error( `Standalone note ${ entry.id } has no valid SynthDef name.` );
      const addAction = Number.isInteger( event.addAction ) ? event.addAction : 1;
      const group = Number.isInteger( event.group ) ? event.group : 0;
      const duration = scoreEventSustain( event );
      if ( duration !== null && duration < 0 ) throw new Error( `Standalone note ${ entry.id } has a negative sustain.` );
      const created = [];
      for ( const params of expandScEventParams( event ) ) {
        const nodeID = nextNodeID++;
        sendOsc( '/s_new', [ definition, nodeID, addAction, group, ...controlArgs( params ) ] );
        const node = {
          nodeID, entryID: entry.id, released: false,
          releaseAt: duration === null ? null : entry.time + duration
        };
        live.set( nodeID, node );
        created.push( Object.freeze( { entryID: entry.id, nodeID, state: 'started' } ) );
      }
      publish( { realizations: [ ...state.realizations, ...created ].slice( -200 ), liveCount: live.size } );
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
        node.released = true;
        realization( node.nodeID, { state: 'released' } );
      }
    } else if ( event.type === 'free' ) {
      for ( const node of targets ) {
        sendOsc( '/n_free', [ node.nodeID ] );
        dropNode( node.nodeID, true );
      }
    }
  };

  const releaseDue = ( position ) => {
    for ( const node of live.values() ) {
      if ( node.released || node.releaseAt === null || node.releaseAt > position + EPSILON ) continue;
      sendOsc( '/n_set', [ node.nodeID, 'gate', 0 ] );
      node.released = true;
      realization( node.nodeID, { state: 'released' } );
    }
  };
  const nextBoundary = () => {
    let next = entries[ cursor ]?.time ?? Infinity;
    for ( const node of live.values() ) {
      if ( !node.released && node.releaseAt !== null ) next = Math.min( next, node.releaseAt );
    }
    return next;
  };
  const schedule = () => {
    clearWake();
    if ( state.status !== 'playing' ) return;
    const boundary = nextBoundary();
    if ( boundary === Infinity ) {
      if ( live.size === 0 ) publish( { status: 'ended', position: entries.at( -1 )?.time ?? state.position } );
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
      while ( cursor < entries.length && entries[ cursor ].time <= position + EPSILON ) execute( entries[ cursor++ ] );
      releaseDue( position );
      publish( { position } );
      schedule();
    } catch ( error ) {
      clearWake();
      hardFreeAll();
      publish( { status: 'failed', position, error: error.message } );
    }
  };

  const load = ( nextDocument ) => {
    assertScoreDocument( nextDocument );
    const report = checkScore( nextDocument.entries, [ RENDERER ] );
    if ( !report.complete ) throw new Error( describeCheck( report ) || 'The score contains unsupported standalone events.' );
    clearWake();
    hardFreeAll();
    document = nextDocument;
    entries = sortScore( nextDocument.entries );
    cursor = 0;
    publish( {
      status: 'ready', scoreID: document.scoreID, revision: document.revision, runID: null,
      position: 0, realizations: [], error: null
    } );
  };
  const seek = ( seconds ) => {
    if ( !document ) throw new Error( 'Load a score before seeking.' );
    const position = Math.max( 0, Number( seconds ) || 0 );
    const playing = state.status === 'playing';
    clearWake();
    hardFreeAll();
    cursor = entries.findIndex( ( entry ) => entry.time >= position );
    if ( cursor < 0 ) cursor = entries.length;
    anchorScore = position;
    anchorWall = now();
    const nextStatus = playing ? 'playing' : state.status === 'paused' ? 'paused' : 'stopped';
    publish( { position, status: nextStatus, error: null } );
    if ( playing ) { wake(); }
  };
  const play = () => {
    if ( !document ) throw new Error( 'Load a score before playing.' );
    if ( state.status === 'paused' ) {
      for ( const node of live.values() ) sendOsc( '/n_run', [ node.nodeID, 1 ] );
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
    wake();
  };
  const pause = () => {
    if ( state.status !== 'playing' ) return false;
    const position = estimatePosition();
    clearWake();
    for ( const node of live.values() ) sendOsc( '/n_run', [ node.nodeID, 0 ] );
    publish( { status: 'paused', position } );
    return true;
  };
  const stop = () => {
    clearWake();
    hardFreeAll();
    cursor = 0;
    publish( { status: document ? 'stopped' : 'empty', position: 0, runID: null, error: null } );
  };
  const offOsc = subscribeOscReply( ( bytes ) => {
    const message = parseOsc( bytes );
    if ( message?.address !== '/n_end' ) return;
    const nodeID = Number( message.arguments[ 0 ] );
    if ( !dropNode( nodeID, true ) ) return;
    if ( cursor >= entries.length && live.size === 0 && state.status === 'playing' ) {
      clearWake();
      publish( { status: 'ended', position: estimatePosition() } );
    }
  } );

  return {
    load, play, pause, stop, seek, estimatePosition,
    subscribe: ( listener ) => { listeners.add( listener ); return () => listeners.delete( listener ); },
    getState: () => state,
    dispose: () => { stop(); offOsc(); listeners.clear(); }
  };
}
