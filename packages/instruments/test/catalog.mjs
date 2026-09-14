import assert from 'node:assert/strict';
import {
  INSTRUMENT_CATALOG,
  INSTRUMENT_TYPE_KEYS,
  instrumentBooleanFields,
  instrumentControls,
  instrumentDefaultParams,
  instrumentFields,
  instrumentFrequencyControls,
  instrumentMainFrequency,
  instrumentType,
  typeForSynthDef
} from '../src/index.js';

const speakers = [ { id: 'L', label: 'Left' }, { id: 'R', label: 'Right' } ];
const checks = [];
const check = ( label ) => checks.push( `  PASS  ${ label }` );

assert.deepEqual( INSTRUMENT_TYPE_KEYS, [ 'basic', 'substrate', 'substrate2', 'resobass2' ] );
assert.equal( instrumentType( 'substrate' ).synthDef, 'substrate' );
assert.equal( instrumentType( 'missing' ), null );
check( 'stable type and SynthDef identities' );

assert.doesNotThrow( () => JSON.stringify( INSTRUMENT_CATALOG ) );
assert.ok( Object.isFrozen( INSTRUMENT_CATALOG.substrate.controls.freqA ) );
const assertDataOnly = ( value ) => {
  assert.notEqual( typeof value, 'function' );
  if ( value && typeof value === 'object' ) {
    for ( const child of Object.values( value ) ) assertDataOnly( child );
  }
};
for ( const descriptor of Object.values( INSTRUMENT_CATALOG ) ) {
  assertDataOnly( descriptor );
}
check( 'catalog descriptors are deeply frozen JSON-compatible data' );

assert.deepEqual( instrumentDefaultParams( 'substrate', speakers ), {
  freqA: 60, beat: 4, freqQ: 0.066, movement: 0
} );
assert.deepEqual( instrumentDefaultParams( 'basic', speakers ), {
  freqL: 60, ampL: 1, freqR: 60.1, ampR: 1
} );
check( 'static and speaker-dependent defaults materialise' );

assert.deepEqual(
  instrumentFields( 'basic', speakers ).map( ( field ) => [ field.path[ 0 ], field.label ] ),
  [ [ 'freqL', 'Left freq' ], [ 'ampL', 'Left amp' ], [ 'freqR', 'Right freq' ], [ 'ampR', 'Right amp' ] ]
);
assert.deepEqual(
  instrumentFields( 'substrate2' ).map( ( field ) => field.path[ 0 ] ),
  [ 'freq', 'beat', 'slowBeat', 'slowBeatBlend', 'beatBlend', 'freqQ', 'movement' ]
);
assert.deepEqual( instrumentBooleanFields( 'substrate2' ).map( ( field ) => field.path[ 0 ] ), [ 'flip' ] );
check( 'numeric and boolean editor metadata materialises without UI code' );

assert.deepEqual(
  instrumentFrequencyControls( 'substrate2' ),
  [ 'freq', 'beat', 'slowBeat', 'freqQ', 'tremF', 'difF' ]
);
assert.equal( instrumentControls( 'resobass2' ).find( ( control ) => control.name === 'modFreqRatio' ).role, 'frequencyRatio' );
check( 'frequency roles distinguish scalable values from ratios' );

assert.equal( instrumentMainFrequency( 'basic', { freqL: 44 }, speakers ), 44 );
assert.equal( instrumentMainFrequency( 'resobass2', { freq: 52 } ), 52 );
check( 'primary frequency is descriptor-driven' );

assert.deepEqual( typeForSynthDef( 'resonantBassEnv2' ), {
  key: 'resobass2', descriptor: INSTRUMENT_CATALOG.resobass2
} );
assert.equal( typeForSynthDef( 'temp__0' ), null );
check( 'SynthDef lookup recognises only catalogued instruments' );

console.log( `\n${ checks.join( '\n' ) }\n\n${ checks.length }/${ checks.length } passed.` );
