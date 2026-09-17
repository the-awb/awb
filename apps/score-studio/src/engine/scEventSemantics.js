export const SC_EVENT_RESERVED_KEYS = Object.freeze( [
  'type', 'def', 'instrument', 'target', 'dur', 'delta', 'sustain', 'legato',
  'addAction', 'group', 'args'
] );
const RESERVED = new Set( SC_EVENT_RESERVED_KEYS );

export const SC_REF_TAG = '$sc.ref';

export function scRef( values ) {
  if ( !Array.isArray( values ) || values.length === 0 ) {
    throw new Error( 'Ref requires a non-empty array.' );
  }
  return Object.freeze( { [ SC_REF_TAG ]: Object.freeze( [ ...values ] ) } );
}

export function isScRef( value ) {
  return Boolean( value && Object.getPrototypeOf( value ) === Object.prototype
    && Object.keys( value ).length === 1 && Array.isArray( value[ SC_REF_TAG ] ) );
}

export function unwrapScRef( value ) {
  return isScRef( value ) ? value[ SC_REF_TAG ] : value;
}

function scalar( value, key ) {
  if ( typeof value === 'boolean' ) return value ? 1 : 0;
  if ( typeof value === 'number' && Number.isFinite( value ) ) return value;
  if ( typeof value === 'string' ) return value;
  throw new Error( `Standalone event control ${ key } must be a finite number, string or boolean.` );
}

export function expandScEventParams( event, { includeReserved = [], literalControls = [] } = {} ) {
  const allowedReserved = new Set( includeReserved );
  const literals = new Set( literalControls );
  const controls = Object.entries( event ).filter( ( [ key, value ] ) =>
    ( !RESERVED.has( key ) || allowedReserved.has( key ) ) && value !== undefined );
  const arrayLengths = controls.map( ( [ key, value ] ) => (
    Array.isArray( value ) && !literals.has( key ) ? value.length : 1
  ) );
  if ( arrayLengths.some( ( length ) => length === 0 ) ) throw new Error( 'Standalone event control arrays cannot be empty.' );
  const count = Math.max( 1, ...arrayLengths );
  return Array.from( { length: count }, ( _, index ) => Object.fromEntries( controls.map( ( [ key, value ] ) => [
    key, isScRef( value ) || literals.has( key )
      ? unwrapScRef( value )
      : scalar( Array.isArray( value ) ? value[ index % value.length ] : value, key )
  ] ) ) );
}
