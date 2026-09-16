const RATE_NAMES = Object.freeze( [ 'scalar', 'control', 'audio', 'demand' ] );
const CONTROL_UGENS = new Set( [ 'Control', 'AudioControl', 'TrigControl', 'LagControl' ] );

function dataView( input ) {
  if ( input instanceof DataView ) return input;
  if ( input instanceof ArrayBuffer ) return new DataView( input );
  if ( ArrayBuffer.isView( input ) ) {
    return new DataView( input.buffer, input.byteOffset, input.byteLength );
  }
  throw new TypeError( 'parseSynthDef: expected an ArrayBuffer or typed-array view' );
}

class Reader {
  constructor( input ) {
    this.view = dataView( input );
    this.offset = 0;
    this.decoder = new TextDecoder();
  }

  require( count ) {
    if ( this.offset + count > this.view.byteLength ) {
      throw new Error( `SynthDef ended at byte ${ this.offset }; needed ${ count } more byte(s)` );
    }
  }

  int8() { this.require( 1 ); return this.view.getInt8( this.offset++ ); }
  uint8() { this.require( 1 ); return this.view.getUint8( this.offset++ ); }
  int16() { this.require( 2 ); const value = this.view.getInt16( this.offset, false ); this.offset += 2; return value; }
  int32() { this.require( 4 ); const value = this.view.getInt32( this.offset, false ); this.offset += 4; return value; }
  float32() { this.require( 4 ); const value = this.view.getFloat32( this.offset, false ); this.offset += 4; return value; }

  bytes( count ) {
    this.require( count );
    const result = new Uint8Array( this.view.buffer, this.view.byteOffset + this.offset, count );
    this.offset += count;
    return result;
  }

  pstring() {
    const count = this.uint8();
    return this.decoder.decode( this.bytes( count ) );
  }
}

function countReader( reader, wide ) {
  return wide ? () => reader.int32() : () => reader.int16();
}

function parseDefinition( reader, version ) {
  const wide = version === 2;
  const count = countReader( reader, wide );
  const name = reader.pstring();
  const constants = Array.from( { length: count() }, () => reader.float32() );
  const parameterValues = Array.from( { length: count() }, () => reader.float32() );
  const parameterNames = Array.from( { length: count() }, () => ( {
    name: reader.pstring(), index: count()
  } ) );
  const ugens = Array.from( { length: count() }, ( _, index ) => {
    const className = reader.pstring();
    const rateIndex = reader.int8();
    const inputCount = count();
    const outputCount = count();
    const specialIndex = reader.int16();
    const inputs = Array.from( { length: inputCount }, () => {
      const ugenIndex = count();
      const outputIndex = count();
      return ugenIndex < 0
        ? { kind: 'constant', index: outputIndex, value: constants[ outputIndex ] }
        : { kind: 'ugen', ugenIndex, outputIndex };
    } );
    const outputs = Array.from( { length: outputCount }, ( __, outputIndex ) => {
      const outputRateIndex = reader.int8();
      return { index: outputIndex, rate: RATE_NAMES[ outputRateIndex ] ?? `unknown-${ outputRateIndex }` };
    } );
    return { index, className, rate: RATE_NAMES[ rateIndex ] ?? `unknown-${ rateIndex }`, specialIndex, inputs, outputs };
  } );
  const variantCount = reader.int16();
  const variants = Array.from( { length: variantCount }, () => ( {
    name: reader.pstring(), values: Array.from( { length: parameterValues.length }, () => reader.float32() )
  } ) );

  const outputRates = new Map();
  for ( const ugen of ugens ) {
    if ( !CONTROL_UGENS.has( ugen.className ) ) continue;
    for ( const output of ugen.outputs ) outputRates.set( ugen.specialIndex + output.index, output.rate );
  }
  const sortedNames = [ ...parameterNames ].sort( ( left, right ) => left.index - right.index );
  const controls = sortedNames.map( ( parameter, position ) => {
    const nextIndex = sortedNames[ position + 1 ]?.index ?? parameterValues.length;
    const numChannels = Math.max( 1, nextIndex - parameter.index );
    const defaults = parameterValues.slice( parameter.index, parameter.index + numChannels );
    return {
      name: parameter.name,
      index: parameter.index,
      numChannels,
      default: numChannels === 1 ? defaults[ 0 ] : defaults,
      rate: outputRates.get( parameter.index ) ?? 'scalar'
    };
  } );

  return { name, constants, parameterValues, parameterNames, controls, ugens, variants };
}

export function parseSynthDef( input ) {
  const reader = new Reader( input );
  const magic = new TextDecoder().decode( reader.bytes( 4 ) );
  if ( magic !== 'SCgf' ) throw new Error( `parseSynthDef: invalid magic ${ JSON.stringify( magic ) }` );
  const version = reader.int32();
  if ( version !== 1 && version !== 2 ) throw new Error( `parseSynthDef: unsupported version ${ version }` );
  const definitionCount = reader.int16();
  const definitions = Array.from( { length: definitionCount }, () => parseDefinition( reader, version ) );
  if ( reader.offset !== reader.view.byteLength ) {
    throw new Error( `parseSynthDef: ${ reader.view.byteLength - reader.offset } trailing byte(s)` );
  }
  return { format: 'scsyndef', version, definitions };
}

export async function synthDefFingerprint( input ) {
  const view = dataView( input );
  const bytes = new Uint8Array( view.buffer, view.byteOffset, view.byteLength );
  const digest = await globalThis.crypto.subtle.digest( 'SHA-256', bytes );
  const hex = [ ...new Uint8Array( digest ) ].map( ( byte ) => byte.toString( 16 ).padStart( 2, '0' ) ).join( '' );
  return `sha256:${ hex }`;
}
