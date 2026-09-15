export const SC_EVENT_RESERVED_KEYS = Object.freeze( [
  'type', 'def', 'instrument', 'target', 'dur', 'delta', 'sustain', 'legato',
  'addAction', 'group', 'args'
] );
const RESERVED = new Set( SC_EVENT_RESERVED_KEYS );

function scalar( value, key ) {
  if ( typeof value === 'boolean' ) return value ? 1 : 0;
  if ( typeof value === 'number' && Number.isFinite( value ) ) return value;
  if ( typeof value === 'string' ) return value;
  throw new Error( `Standalone event control ${ key } must be a finite number, string or boolean.` );
}

export function expandScEventParams( event ) {
  const controls = Object.entries( event ).filter( ( [ key, value ] ) => !RESERVED.has( key ) && value !== undefined );
  const arrayLengths = controls.map( ( [ , value ] ) => Array.isArray( value ) ? value.length : 1 );
  if ( arrayLengths.some( ( length ) => length === 0 ) ) throw new Error( 'Standalone event control arrays cannot be empty.' );
  const count = Math.max( 1, ...arrayLengths );
  return Array.from( { length: count }, ( _, index ) => Object.fromEntries( controls.map( ( [ key, value ] ) => [
    key, scalar( Array.isArray( value ) ? value[ index % value.length ] : value, key )
  ] ) ) );
}

export function scoreEventSustain( event ) {
  const sustain = Number( event.sustain ?? ( Number( event.dur ) * Number( event.legato ?? 0.8 ) ) );
  return Number.isFinite( sustain ) ? sustain : null;
}
