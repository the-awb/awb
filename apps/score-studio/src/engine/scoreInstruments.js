import { instrumentControls, instrumentType, typeForSynthDef } from '@awb/instruments';

const EVENT_KEYS = new Set( [ 'type', 'def', 'instrument', 'target', 'delta' ] );

function resolveInstrument( reference ) {
  const byDefinition = typeForSynthDef( reference );
  if ( byDefinition ) return byDefinition;
  const descriptor = instrumentType( reference );
  return descriptor ? { key: reference, descriptor } : null;
}

function uniqueSorted( values ) {
  return [ ...new Set( values ) ].sort( ( a, b ) => a.localeCompare( b ) );
}

// The panel is a projection of the canonical score. It does not add an instrument list to the
// document or make the catalog authoritative over arbitrary SynthDefs used by a score.
export function scoreInstruments( document ) {
  const byDefinition = new Map();
  for ( const entry of document?.entries ?? [] ) {
    const event = entry?.event;
    if ( !event || typeof event !== 'object' || Array.isArray( event ) ) continue;
    const reference = event.def ?? event.instrument;
    if ( typeof reference !== 'string' || !reference.length ) continue;
    const catalog = resolveInstrument( reference );
    const definition = catalog?.descriptor.synthDef ?? reference;
    let usage = byDefinition.get( definition );
    if ( !usage ) {
      usage = {
        definition,
        references: [],
        entryIDs: [],
        paths: [],
        authoredControls: [],
        firstTime: entry.time,
        lastTime: entry.time,
        noteCount: 0,
        catalogKey: catalog?.key ?? null,
        descriptor: catalog?.descriptor ?? null
      };
      byDefinition.set( definition, usage );
    }
    usage.references.push( reference );
    usage.entryIDs.push( entry.id );
    if ( entry.path?.length ) usage.paths.push( entry.path.join( '/' ) );
    usage.authoredControls.push( ...Object.keys( event ).filter( ( key ) => !EVENT_KEYS.has( key ) ) );
    usage.firstTime = Math.min( usage.firstTime, entry.time );
    usage.lastTime = Math.max( usage.lastTime, entry.time );
    if ( ( event.type ?? 'note' ) === 'note' ) usage.noteCount += 1;
  }

  return Object.freeze( [ ...byDefinition.values() ].map( ( usage ) => Object.freeze( {
    definition: usage.definition,
    references: Object.freeze( uniqueSorted( usage.references ) ),
    entryIDs: Object.freeze( [ ...usage.entryIDs ] ),
    paths: Object.freeze( uniqueSorted( usage.paths ) ),
    authoredControls: Object.freeze( uniqueSorted( usage.authoredControls ) ),
    knownControls: Object.freeze( usage.catalogKey
      ? instrumentControls( usage.catalogKey ).map( ( control ) => control.name ) : [] ),
    envelopes: Object.freeze( ( usage.descriptor?.envelopes ?? [] ).map( ( envelope ) => Object.freeze( {
      id: envelope.id,
      label: envelope.label,
      role: envelope.role,
      target: envelope.target,
      completionAction: envelope.completionAction ?? null
    } ) ) ),
    firstTime: usage.firstTime,
    lastTime: usage.lastTime,
    noteCount: usage.noteCount,
    entryCount: usage.entryIDs.length,
    catalogKey: usage.catalogKey,
    label: usage.descriptor?.label ?? usage.definition,
    note: usage.descriptor?.note ?? ''
  } ) ) );
}
