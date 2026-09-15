import { sortScore } from '@awb/score';
import { instrumentEnvelopeLengths, instrumentType, typeForSynthDef } from '@awb/instruments';
import { expandScEventParams, scoreEventSustain } from './scEventSemantics.js';

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
  if ( params.sustain === undefined ) {
    const sustain = scoreEventSustain( createEvent );
    if ( sustain !== null ) params.sustain = sustain;
  }
  for ( const marker of lane.events ) {
    if ( marker.time > time || marker.role !== 'set' ) continue;
    Object.assign( params, marker.entry.event );
  }
  return params;
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
      let projectionError = null;
      try { expansionCount = expandScEventParams( event ).length; }
      catch ( error ) { projectionError = error.message; }
      const lane = {
        id: entry.id,
        definition: event.def ?? event.instrument ?? 'unnamed',
        path: entry.path,
        expansionCount,
        projectionError,
        instrument: instrumentFor( event.def ?? event.instrument ),
        events: [ { entry, role: 'create', time: entry.time, synthetic: false } ]
      };
      const sustain = scoreEventSustain( event );
      if ( sustain !== null && sustain >= 0 ) {
        lane.events.push( {
          entry, role: 'auto-release', time: entry.time + sustain, synthetic: true
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
    const releaseMarker = terminal.find( ( marker ) => [ 'release', 'auto-release' ].includes( marker.role ) );
    const freeTime = terminal.find( ( marker ) => marker.role === 'free' )?.time ?? null;
    const createParams = effectiveParamsAt( { ...lane, events }, startTime );
    const initialEnvelope = lane.instrument
      ? instrumentEnvelopeLengths( lane.instrument.key, createParams )
      : null;
    const releaseEnvelope = releaseMarker && lane.instrument
      ? instrumentEnvelopeLengths( lane.instrument.key, effectiveParamsAt( { ...lane, events }, releaseMarker.time ) )
      : null;
    const naturalEnd = releaseMarker ? releaseMarker.time + ( releaseEnvelope?.release ?? 0 ) : null;
    const endTime = freeTime === null ? naturalEnd
      : naturalEnd === null ? freeTime : Math.min( freeTime, naturalEnd );
    const gateReleaseTime = releaseMarker && ( freeTime === null || releaseMarker.time < freeTime )
      ? releaseMarker.time : null;
    const envelopeSpec = lane.instrument?.descriptor.amplitudeEnvelope ?? null;
    return {
      ...lane, events, startTime, endTime, gateReleaseTime, freeTime,
      envelope: initialEnvelope && {
        attack: initialEnvelope.attack,
        release: releaseEnvelope?.release ?? initialEnvelope.release,
        attackControl: envelopeSpec?.attack?.kind === 'control' ? envelopeSpec.attack.name : null,
        releaseControl: envelopeSpec?.release?.kind === 'control' ? envelopeSpec.release.name : null,
        derived: envelopeSpec?.attack?.kind !== 'control' || envelopeSpec?.release?.kind !== 'control'
      }
    };
  } );
}
