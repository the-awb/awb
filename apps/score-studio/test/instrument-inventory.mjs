#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildInstrumentInventory, synthDefSignalKind } from '../src/engine/instrumentInventory.js';

const rows = buildInstrumentInventory( {
  scoreDefinitions: [ 'scoreOnly', 'shared' ],
  admittedDefinitions: {
    shared: { fingerprint: 'sha256:shared' },
    systemLoaded: { fingerprint: 'sha256:system' }
  },
  availableNames: [ 'systemAvailable', 'systemLoaded', 'shared' ]
} );

assert.deepEqual( rows.map( ( row ) => [ row.name, row.category ] ), [
  [ 'scoreOnly', 'score' ], [ 'shared', 'score' ],
  [ 'systemLoaded', 'loaded' ], [ 'systemAvailable', 'available' ]
] );
assert.equal( rows.find( ( row ) => row.name === 'scoreOnly' ).available, false );
assert.equal( rows.find( ( row ) => row.name === 'systemLoaded' ).modelled, true );
assert.equal( rows.find( ( row ) => row.name === 'systemLoaded' ).fingerprint, 'sha256:system' );
assert.ok( Object.isFrozen( rows ) && rows.every( Object.isFrozen ) );

const description = ( rates ) => ( { interface: {
  outputs: rates.map( ( _, ugenIndex ) => ( { ugenIndex } ) ),
  ugens: rates.map( ( rate ) => ( { rate } ) )
} } );
assert.equal( synthDefSignalKind( description( [ 'audio' ] ) ), 'audio' );
assert.equal( synthDefSignalKind( description( [ 'control' ] ) ), 'control' );
assert.equal( synthDefSignalKind( description( [] ) ), 'utility' );
assert.equal( synthDefSignalKind( null ), 'unknown' );

console.log( 'instrument-inventory: pass' );
