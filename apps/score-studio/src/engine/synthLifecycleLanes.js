import { sortScore } from '@awb/score';
import { instrumentEnvelopes, instrumentNoteLifecycle, instrumentType, typeForSynthDef } from '@awb/instruments';
import { expandScEventParams } from './scEventSemantics.js';

function targets( target ) {
  return ( Array.isArray( target ) ? target : [ target ] ).filter( ( value ) => value !== undefined );
}

function instrumentFor( definition ) {
  return typeForSynthDef( definition ) ?? ( instrumentType( definition )
    ? { key: definition, descriptor: instrumentType( definition ) }
    : null );
}

function effectiveParamsAt( lane, time ) {
  const createEvent = lane.events.find( ( marker ) => marker.role === 'create' )?.entry.event ?? {};
  const params = { ...createEvent };
  for ( const marker of lane.events ) {
    if ( marker.time > time || marker.role !== 'set' ) continue;
    Object.assign( params, marker.entry.event );
  }
  return params;
}

function envelopeSignature( envelope ) {
  return JSON.stringify( [
    envelope.attack, envelope.release, envelope.duration, envelope.shape,
    envelope.gateControl, envelope.completionAction
  ] );
}

function expressionControls( value, names = new Set() ) {
  if ( Array.isArray( value ) ) value.forEach( ( item ) => expressionControls( item, names ) );
  else if ( value && typeof value === 'object' ) {
    if ( value.kind === 'control' && value.name ) names.add( value.name );
    Object.values( value ).forEach( ( item ) => expressionControls( item, names ) );
  }
  return names;
}

function projectVoiceEnvelopes( instrument, voices = [], params ) {
  if ( !instrument ) return {
    representative: [], shared: [], byVoice: voices.map( () => [] ), allByVoice: voices.map( () => [] )
  };
  let expanded = voices.length ? voices : [ {} ];
  try { expanded = expandScEventParams( params ); } catch { /* retain the known create expansion */ }
  const projected = expanded.map( ( voice ) => instrumentEnvelopes( instrument.key, { ...params, ...voice } ) );
  const representative = projected[ 0 ] ?? [];
  const multichannelIDs = new Set( ( instrument.descriptor?.envelopes ?? [] )
    .filter( ( envelope ) => [ ...expressionControls( envelope ) ]
      .some( ( control ) => Array.isArray( params[ control ] ) && params[ control ].length > 1 ) )
    .map( ( envelope ) => envelope.id ) );
  const sharedIDs = new Set( representative.filter( ( envelope, index ) =>
    !multichannelIDs.has( envelope.id ) && projected.every( ( items ) => items[ index ]
      && envelopeSignature( items[ index ] ) === envelopeSignature( envelope ) )
  ).map( ( envelope ) => envelope.id ) );
  return {
    representative,
    shared: representative.filter( ( envelope ) => sharedIDs.has( envelope.id ) ),
    byVoice: projected.map( ( items ) => items.filter( ( envelope ) => !sharedIDs.has( envelope.id ) ) ),
    allByVoice: projected
  };
}

export function projectSynthLifecycleLanes( score ) {
  const entries = sortScore( score );
  const lanes = [];
  const byEntryID = new Map();
  const live = [];
  const unassigned = [];

  for ( const entry of entries ) {
    const event = entry.event ?? {};
    if ( event.type === 'note' ) {
      let expansionCount = 1;
      let voices = [];
      let projectionError = null;
      try {
        voices = expandScEventParams( event );
        expansionCount = voices.length;
      }
      catch ( error ) { projectionError = error.message; }
      const lane = {
        id: entry.id,
        definition: event.def ?? event.instrument ?? 'unnamed',
        path: entry.path,
        expansionCount, voices,
        projectionError,
        instrument: instrumentFor( event.def ?? event.instrument ),
        events: [ { entry, role: 'create', time: entry.time, synthetic: false } ]
      };
      lane.voiceLifecycles = lane.instrument ? ( voices.length ? voices : [ {} ] ).map( ( voice ) =>
        instrumentNoteLifecycle( lane.instrument.key, { ...event, ...voice } )
      ) : [];
      const gateDurations = lane.voiceLifecycles.map( ( lifecycle ) => lifecycle?.gateDuration ?? null );
      const sharedGate = gateDurations.length && gateDurations.every( ( value ) => value !== null
        && value === gateDurations[ 0 ] );
      if ( sharedGate ) {
        lane.events.push( { entry, role: 'auto-release', time: entry.time + gateDurations[ 0 ],
          voiceIndex: null, synthetic: true } );
      } else {
        gateDurations.forEach( ( gateDuration, voiceIndex ) => {
          if ( gateDuration !== null ) lane.events.push( {
            entry, role: 'auto-release', time: entry.time + gateDuration, voiceIndex, synthetic: true
          } );
        } );
      }
      lanes.push( lane );
      byEntryID.set( entry.id, lane );
      live.push( lane );
      continue;
    }

    if ( ![ 'set', 'release', 'free' ].includes( event.type ) ) {
      unassigned.push( { entry, role: event.type ?? 'untyped', time: entry.time, synthetic: false } );
      continue;
    }

    const requested = targets( event.target );
    const matched = new Set();
    for ( const target of requested ) {
      if ( target === '@all' ) live.forEach( ( lane ) => matched.add( lane ) );
      else if ( target === '@prev' ) {
        const previous = live.at( -1 );
        if ( previous ) matched.add( previous );
      } else {
        const lane = byEntryID.get( String( target ) );
        if ( lane ) matched.add( lane );
      }
    }
    if ( !matched.size ) {
      unassigned.push( { entry, role: event.type, time: entry.time, synthetic: false } );
      continue;
    }
    for ( const lane of matched ) lane.events.push( {
      entry, role: event.type, time: entry.time, synthetic: false
    } );
    if ( event.type === 'free' ) {
      for ( const lane of matched ) {
        const index = live.indexOf( lane );
        if ( index >= 0 ) live.splice( index, 1 );
      }
    }
  }

  if ( unassigned.length ) lanes.push( {
    id: '__unassigned__', definition: 'unassigned', path: [], expansionCount: 0,
    projectionError: null, events: unassigned
  } );
  return lanes.map( ( lane ) => {
    const events = lane.events.sort( ( a, b ) => a.time - b.time );
    const startTime = events.find( ( event ) => event.role === 'create' )?.time ?? events[ 0 ]?.time ?? 0;
    const terminal = events.filter( ( event ) => [ 'release', 'free', 'auto-release' ].includes( event.role )
      && event.time >= startTime );
    const explicitRelease = terminal.find( ( marker ) => marker.role === 'release' );
    const releaseMarker = explicitRelease ?? terminal.find( ( marker ) => marker.role === 'auto-release' );
    const freeTime = terminal.find( ( marker ) => marker.role === 'free' )?.time ?? null;
    const createParams = effectiveParamsAt( { ...lane, events }, startTime );
    const initialProjection = projectVoiceEnvelopes( lane.instrument, lane.voices, createParams );
    const initialEnvelopes = initialProjection.representative;
    const noteLifecycle = lane.voiceLifecycles?.[ 0 ]
      ?? ( lane.instrument ? instrumentNoteLifecycle( lane.instrument.key, createParams ) : null );
    const releaseParams = releaseMarker ? effectiveParamsAt( { ...lane, events }, releaseMarker.time ) : null;
    const releaseProjection = releaseParams
      ? projectVoiceEnvelopes( lane.instrument, lane.voices, releaseParams )
      : {
        representative: [], shared: [],
        byVoice: ( lane.voices ?? [] ).map( () => [] ),
        allByVoice: ( lane.voices ?? [] ).map( () => [] )
      };
    const releaseEnvelopes = releaseProjection.representative;
    const voiceGateReleaseTimes = ( lane.voices?.length ? lane.voices : [ {} ] ).map( ( _, voiceIndex ) => {
      const marker = explicitRelease ?? terminal.find( ( item ) => item.role === 'auto-release'
        && ( item.voiceIndex === null || item.voiceIndex === voiceIndex ) );
      return marker && ( freeTime === null || marker.time < freeTime ) ? marker.time : null;
    } );
    const naturalVoiceEnds = voiceGateReleaseTimes.map( ( gateTime, voiceIndex ) => {
      if ( gateTime === null ) return null;
      const completionEnvelope = releaseProjection.allByVoice[ voiceIndex ]
        ?.find( ( envelope ) => envelope.completionAction === 'freeNode' );
      return completionEnvelope && completionEnvelope.release !== null
        ? gateTime + completionEnvelope.release : null;
    } );
    const finiteNaturalEnds = naturalVoiceEnds.filter( Number.isFinite );
    const naturalEnd = finiteNaturalEnds.length === naturalVoiceEnds.length && finiteNaturalEnds.length
      ? Math.max( ...finiteNaturalEnds ) : null;
    const endTime = freeTime === null ? naturalEnd
      : naturalEnd === null ? freeTime : Math.min( freeTime, naturalEnd );
    const gateReleaseTime = voiceGateReleaseTimes.length
      && voiceGateReleaseTimes.every( ( value ) => value === voiceGateReleaseTimes[ 0 ] )
      ? voiceGateReleaseTimes[ 0 ] : null;
    const authoredDuration = Number( createParams.dur );
    const durationTime = Number.isFinite( authoredDuration ) && authoredDuration >= 0
      ? startTime + authoredDuration : null;
    const envelopes = initialEnvelopes.map( ( envelope ) => {
      const atRelease = releaseEnvelopes.find( ( item ) => item.id === envelope.id );
      return { ...envelope, release: atRelease?.release ?? envelope.release };
    } );
    const sharedEnvelopes = initialProjection.shared.map( ( envelope ) => {
      const atRelease = releaseProjection.shared.find( ( item ) => item.id === envelope.id );
      return { ...envelope, release: atRelease?.release ?? envelope.release };
    } );
    const voiceEnvelopes = initialProjection.byVoice.map( ( items, voiceIndex ) => items.map( ( envelope ) => {
      const atRelease = releaseProjection.byVoice[ voiceIndex ]?.find( ( item ) => item.id === envelope.id );
      return { ...envelope, release: atRelease?.release ?? envelope.release };
    } ) );
    const amplitudeEnvelope = envelopes.find( ( envelope ) => envelope.role === 'amplitude' ) ?? null;
    const openEnded = createParams.dur === 'inf' && releaseMarker === undefined && freeTime === null;
    return {
      ...lane, events, startTime, endTime, gateReleaseTime, voiceGateReleaseTimes,
      gateMarker: releaseMarker ?? null, freeTime,
      durationTime, durationControl: durationTime === null ? null : 'dur', noteLifecycle,
      openEnded, envelopes, envelope: amplitudeEnvelope, sharedEnvelopes, voiceEnvelopes
    };
  } );
}

export function lifecycleDefinitionsForEntry( score, entryID ) {
  return [ ...new Set( projectSynthLifecycleLanes( score )
    .filter( ( lane ) => lane.id !== '__unassigned__'
      && lane.events.some( ( marker ) => marker.entry.id === entryID ) )
    .map( ( lane ) => lane.definition ) ) ];
}

function sameValue( left, right ) {
  if ( Object.is( left, right ) ) return true;
  if ( left === undefined || right === undefined ) return false;
  try { return JSON.stringify( left ) === JSON.stringify( right ); }
  catch { return false; }
}

export function lifecycleInheritedValuesForEntry( score, entryID ) {
  const parentStates = projectSynthLifecycleLanes( score )
    .filter( ( lane ) => lane.id !== '__unassigned__'
      && lane.events.some( ( marker ) => marker.entry.id === entryID && marker.role === 'set' ) )
    .map( ( lane ) => {
      const state = {};
      for ( const marker of lane.events ) {
        if ( marker.entry.id === entryID && marker.role === 'set' ) break;
        if ( marker.role === 'create' || marker.role === 'set' ) {
          for ( const [ name, value ] of Object.entries( marker.entry.event ) ) {
            if ( ![ 'type', 'target', 'def', 'instrument' ].includes( name ) ) state[ name ] = value;
          }
        }
      }
      return state;
    } );
  if ( !parentStates.length ) return null;
  const shared = { ...parentStates[ 0 ] };
  for ( const name of Object.keys( shared ) ) {
    if ( !parentStates.every( ( state ) => sameValue( state[ name ], shared[ name ] ) ) ) delete shared[ name ];
  }
  return Object.freeze( shared );
}
