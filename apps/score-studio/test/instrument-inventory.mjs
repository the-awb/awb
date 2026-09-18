#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildInstrumentInventory, isHostedSynthDefFocusStale, mergeSynthDefNames,
  shouldRefreshHostedSynthDefFocus, synthDefSignalKind
} from '../src/engine/instrumentInventory.js';

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
assert.deepEqual( mergeSynthDefNames( 'catalogued', [ 'loadedLater', 'catalogued' ] ),
  [ 'catalogued', 'loadedLater' ], 'event pickers include the live host inventory' );

const description = ( rates ) => ( { interface: {
  outputs: rates.map( ( _, ugenIndex ) => ( { ugenIndex } ) ),
  ugens: rates.map( ( rate ) => ( { rate } ) )
} } );
assert.equal( synthDefSignalKind( description( [ 'audio' ] ) ), 'audio' );
assert.equal( synthDefSignalKind( description( [ 'control' ] ) ), 'control' );
assert.equal( synthDefSignalKind( description( [] ) ), 'utility' );
assert.equal( synthDefSignalKind( null ), 'unknown' );

const hostedFocus = {
  kind: 'synthDef', name: 'shared', source: 'hosted context', contextGeneration: 1
};
assert.equal( isHostedSynthDefFocusStale( hostedFocus, 'hosted', 1 ), false );
assert.equal( isHostedSynthDefFocusStale( hostedFocus, 'hosted', 2 ), true );
assert.equal( isHostedSynthDefFocusStale( hostedFocus, 'standalone', 2 ), false );
assert.equal( shouldRefreshHostedSynthDefFocus( {
  focusedName: 'shared', focusedSource: 'hosted context', focusedContextGeneration: 1,
  hostedContext: { status: 'connected', generation: 2, inventory: [ 'shared' ] }
} ), true );
assert.equal( shouldRefreshHostedSynthDefFocus( {
  focusedName: 'shared', focusedSource: 'hosted context', focusedContextGeneration: 2,
  hostedContext: { status: 'connected', generation: 2, inventory: [ 'shared' ] }
} ), false );
assert.equal( shouldRefreshHostedSynthDefFocus( {
  focusedName: 'shared', focusedSource: 'hosted context', focusedContextGeneration: 1,
  hostedContext: { status: 'connected', generation: 2, inventory: null }
} ), false );

console.log( 'instrument-inventory: pass' );
