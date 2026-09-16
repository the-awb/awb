#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  SC_ENV_CURVES,
  SC_ENV_SCHEMA,
  assertScEnv,
  createScEnv,
  normalizeScEnv,
  scEnvAsArray,
  scEnvDuration,
  scEnvFromArray,
  scEnvReleaseDuration,
  scEnvValueAt,
  validateScEnv
} from '../src/index.js';

const close = ( actual, expected, label ) => assert.ok(
  Math.abs( actual - expected ) < 1e-7,
  `${ label }: expected ${ expected }, got ${ actual }`
);

const mixed = normalizeScEnv( {
  levels: [ 0, 1, 0.25, 0 ], times: [ 0.1, 0.2, 0.3 ],
  curves: [ 'linear', '\\sine', -4 ], releaseNode: 2
} );
assert.equal( mixed.schema, SC_ENV_SCHEMA );
assert.deepEqual( mixed.curves, [ 'lin', 'sin', -4 ] );
assert.ok( Object.isFrozen( mixed ) && Object.isFrozen( mixed.levels ) );
assert.doesNotThrow( () => JSON.stringify( mixed ) );

// Captured from SuperCollider 3.12.2 Env#asArray.
const mixedArray = [ 0, 3, 2, -99, 1, 0.1, 1, 0, 0.25, 0.2, 3, 0, 0, 0.3, 5, -4 ];
assert.deepEqual( scEnvAsArray( mixed ), mixedArray );
assert.deepEqual( scEnvFromArray( mixedArray ), mixed );
close( scEnvDuration( mixed ), 0.6, 'duration' );
close( scEnvReleaseDuration( mixed ), 0.3, 'release duration' );

const sampleTimes = [ 0, 0.025, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6 ];
const scSamples = [ 0, 0.25, 0.5, 1, 0.625, 0.25, 0.029800730505529, 0 ];
sampleTimes.forEach( ( time, index ) => close(
  scEnvValueAt( mixed, time ), scSamples[ index ], `mixed sample ${ time }`
) );

const wrapped = normalizeScEnv( {
  levels: [ 0.01, 1, 0.25, 0.01 ], times: [ 0.5 ], curves: [ 'welch', 'exponential' ]
} );
assert.deepEqual( wrapped.times, [ 0.5, 0.5, 0.5 ] );
assert.deepEqual( wrapped.curves, [ 'wel', 'exp', 'wel' ] );
assert.deepEqual( scEnvAsArray( wrapped ), [
  0.01, 3, -99, -99,
  1, 0.5, 4, 0,
  0.25, 0.5, 2, 0,
  0.01, 0.5, 4, 0
] );

const curves = [ 'step', 'hold', 'lin', 'exp', 'sin', 'wel', 'sqr', 'cub', -4, 4 ];
const scMidpoints = [
  1, 0.01, 0.505, 0.1, 0.505, 0.71003571337468,
  0.3025, 0.22444727732364, 0.8819891071981, 0.1280108928019
];
curves.forEach( ( curve, index ) => close(
  scEnvValueAt( normalizeScEnv( { levels: [ 0.01, 1 ], times: 1, curves: curve } ), 0.5 ),
  scMidpoints[ index ], `curve ${ curve }`
) );

const step = normalizeScEnv( { levels: [ 0.01, 1 ], times: 1, curves: 'step' } );
const hold = normalizeScEnv( { levels: [ 0.01, 1 ], times: 1, curves: 'hold' } );
assert.equal( scEnvValueAt( step, 0 ), 1, 'step jumps at the segment start' );
assert.equal( scEnvValueAt( hold, 0 ), 0.01, 'hold retains the initial value' );
assert.equal( scEnvValueAt( hold, 1 ), 1, 'hold jumps at the segment end' );
const zeroTime = normalizeScEnv( { levels: [ 0, 1, 0 ], times: [ 0, 1 ], curves: 'lin' } );
assert.equal( scEnvValueAt( zeroTime, 0 ), 1, 'zero-time segments complete immediately' );

assert.deepEqual( SC_ENV_CURVES, [ 'step', 'lin', 'exp', 'sin', 'wel', 'sqr', 'cub', 'hold' ] );
assert.deepEqual( createScEnv(), normalizeScEnv( {
  levels: [ 0, 1, 0 ], times: [ 1, 1 ], curves: 'lin'
} ) );
assert.equal( validateScEnv( { ...mixed, schema: 'wrong' } ).ok, false );
assert.throws( () => assertScEnv( { ...mixed, times: [ -1, 1, 1 ] } ), /non-negative/ );
assert.throws( () => normalizeScEnv( {
  levels: [ 0, 1 ], times: 1, curves: 'exp'
} ), /exp requires non-zero levels/ );
assert.throws( () => normalizeScEnv( {
  levels: [ 0, 1, 0 ], times: 1, curves: 'lin', loopNode: 0
} ), /loopNode requires releaseNode/ );
assert.throws( () => normalizeScEnv( {
  levels: [ -1, -0.25 ], times: 1, curves: 'sqr'
} ), /requires non-negative levels/ );

console.log( 'sc-envelope: pass (SuperCollider 3.12.2 conformance fixtures)' );
