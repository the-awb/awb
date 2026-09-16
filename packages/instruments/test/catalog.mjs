import assert from 'node:assert/strict';
import {
  INSTRUMENT_CATALOG,
  INSTRUMENT_TYPE_KEYS,
  instrumentBooleanFields,
  instrumentControls,
  instrumentDefaultParams,
  instrumentFields,
  instrumentFrequencyControls,
  instrumentEnvelopeLengths,
  instrumentEnvelopes,
  instrumentNoteLifecycle,
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
  [
    [ 'attackT', 'Attack' ], [ 'releaseT', 'Release' ],
    [ 'freqL', 'Left freq' ], [ 'ampL', 'Left amp' ], [ 'freqR', 'Right freq' ], [ 'ampR', 'Right amp' ]
  ]
);
assert.deepEqual(
  instrumentFields( 'substrate2' ).map( ( field ) => field.path[ 0 ] ),
  [ 'freq', 'beat', 'slowBeat', 'slowBeatBlend', 'beatBlend', 'freqQ', 'movement', 'attackT', 'releaseT' ]
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

assert.deepEqual( instrumentEnvelopeLengths( 'substrate', { attackT: 20, releaseT: 24 } ), {
  attack: 20, release: 24
} );
assert.deepEqual( instrumentEnvelopeLengths( 'resobass2', { sustain: 160 } ), {
  attack: 80, release: 80
} );
assert.equal( instrumentEnvelopeLengths( 'missing' ), null );
check( 'amplitude-envelope lengths follow declared SynthDef controls' );

const resonantBassEnvelopes = instrumentEnvelopes( 'resobass2', {
  dur: 20, sustain: 4, ampEnvRatio: 0.25, phaseEnvRatio: 0.4
} );
assert.deepEqual( resonantBassEnvelopes.map( ( envelope ) => [
  envelope.id, envelope.role, envelope.shape, envelope.attack, envelope.release, envelope.duration,
  envelope.completionAction
] ), [
  [ 'amplitude', 'amplitude', 'gatedAsr', 1, 1, 2, 'freeNode' ],
  [ 'frequency-motion', 'modulation', 'triangle', null, null, 20, null ],
  [ 'phase-modulation', 'modulation', 'perc', 8, 12, 20, null ]
] );
assert.equal( instrumentEnvelopes( 'substrate' ).length, 3 );
assert.deepEqual(
  instrumentEnvelopes( 'substrate', { releaseT: 12, beatEnvRRatio: 2, tremR: 0 } )
    .map( ( envelope ) => envelope.release ),
  [ 12, 24, 24 ],
  'release tails reproduce the three actual delay expressions instead of flattening them'
);
check( 'plural envelopes retain role, target, shape and lifecycle authority' );

assert.deepEqual( instrumentNoteLifecycle( 'substrate', { dur: 300, attackT: 20, releaseT: 24 } ), {
  duration: 300, totalDuration: 300, gateDuration: 276,
  gateSource: 'instrument', attack: 20, release: 24
} );
assert.equal( instrumentNoteLifecycle( 'resobass2', { dur: 20, sustain: 4 } ), null );
assert.equal( instrumentNoteLifecycle( 'missing', { dur: 10 } ), null );
check( 'only an explicit instrument contract derives note lifecycle' );

assert.deepEqual( typeForSynthDef( 'resonantBassEnv2' ), {
  key: 'resobass2', descriptor: INSTRUMENT_CATALOG.resobass2
} );
assert.equal( typeForSynthDef( 'temp__0' ), null );
check( 'SynthDef lookup recognises only catalogued instruments' );

console.log( `\n${ checks.join( '\n' ) }\n\n${ checks.length }/${ checks.length } passed.` );
