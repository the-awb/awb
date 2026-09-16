import { defaultFieldChannels } from '@awb/field-engine';
import { instrumentDefaultParams, typeForSynthDef } from '@awb/instruments';

const LIVE_STATES = new Set( [ 'started', 'released' ] );
const RESERVED = new Set( [ 'type', 'def', 'instrument', 'target', 'dur', 'delta', 'sustain',
  'legato', 'addAction', 'group', 'args' ] );

function expandedControls( event ) {
  const controls = Object.entries( event ).filter( ( [ key, value ] ) =>
    !RESERVED.has( key ) && value !== undefined );
  const lengths = controls.map( ( [ , value ] ) => Array.isArray( value ) ? value.length : 1 );
  if ( lengths.some( ( length ) => length === 0 ) ) return [];
  const count = Math.max( 1, ...lengths );
  return Array.from( { length: count }, ( _, index ) => Object.fromEntries( controls.map( ( [ key, value ] ) => [
    key, Array.isArray( value ) ? value[ index % value.length ] : value
  ] ) ) );
}

function projectedInstrument( entry, realization, nodeID, controls, speakers ) {
  const known = typeForSynthDef( entry.event.def ?? entry.event.instrument );
  if ( !known ) return null;
  const params = instrumentDefaultParams( known.key, speakers );
  for ( const [ key, value ] of Object.entries( controls ) ) {
    if ( Object.hasOwn( params, key ) && ( typeof value === 'number' || typeof value === 'boolean' ) ) params[ key ] = value;
  }
  return Object.freeze( {
    id: `score:${ realization.realizationID }:${ nodeID }`, type: known.key,
    external: true, nodeId: nodeID, defName: known.descriptor.synthDef,
    entryID: entry.id, realizationID: realization.realizationID,
    playing: true, mute: false, solo: false,
    amp: typeof controls[ known.descriptor.gainControl ] === 'number'
      ? controls[ known.descriptor.gainControl ] : 1,
    lActive: true, rActive: true, params,
    channels: defaultFieldChannels( known.key ), routeClassification: 'master-only'
  } );
}

export function projectScoreRealizations( document, runtime, speakers ) {
  const entries = new Map( ( document?.entries ?? [] ).map( ( entry ) => [ entry.id, entry ] ) );
  const instruments = []; const unsupported = [];
  for ( const realization of runtime?.realizations ?? [] ) {
    if ( !LIVE_STATES.has( realization.state ) ) continue;
    const entry = entries.get( realization.entryID );
    if ( !entry || entry.event?.type !== 'note' ) continue;
    const controls = expandedControls( entry.event );
    const nodeIDs = realization.nodeIDs?.length ? realization.nodeIDs : [ `pending-${ realization.realizationID }` ];
    nodeIDs.forEach( ( nodeID, index ) => {
      const instrument = projectedInstrument( entry, realization, nodeID,
        controls[ index % Math.max( controls.length, 1 ) ] ?? {}, speakers );
      if ( instrument ) instruments.push( instrument );
      else unsupported.push( Object.freeze( { entryID: entry.id,
        realizationID: realization.realizationID, nodeID,
        synthDefName: `${ entry.event.def ?? entry.event.instrument ?? '' }`,
        routeClassification: 'unsupported' } ) );
    } );
  }
  return Object.freeze( { instruments: Object.freeze( instruments ), unsupported: Object.freeze( unsupported ) } );
}
