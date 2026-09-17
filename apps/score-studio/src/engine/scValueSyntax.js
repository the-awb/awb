import { isScRef, scRef, unwrapScRef } from './scEventSemantics.js';

export function formatScSymbol( value ) {
  return `\\${ `${ value ?? '' }`.replace( /^\\+/, '' ) }`;
}

export function formatScValue( value ) {
  if ( isScRef( value ) ) return `Ref(${ JSON.stringify( unwrapScRef( value ) ) })`;
  return JSON.stringify( value );
}

export function parseScValue( source ) {
  const text = `${ source }`.trim();
  const match = /^Ref\s*\(([\s\S]*)\)$/.exec( text );
  if ( match ) {
    const value = JSON.parse( match[ 1 ] );
    if ( !Array.isArray( value ) ) throw new Error( 'Ref(...) must contain an array.' );
    return scRef( value );
  }
  return JSON.parse( text );
}
